// Test sul BUNDLE COMPILATO: «Salva sessione» -> «Carica sessione» restituisce gli stessi
// premi e la stessa configurazione (e` lo strumento di ripristino usato in produzione).
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const SETUP = `
PRIZE_MODE="mensile"; REGION="italia"; MODE="consuntivo"; CFG_YEAR=2026; CFG_MONTH=11;
STORE_FLAGS={}; initStoreFlags();
D.t={"1201":{to:100000,sy:0.30,pr:40},"1202":{to:100000,sy:0.30,pr:40}};
D.c={"1201":{sc:105000,es:0,sy:0.32,nf:45,pd:0.06,s4:50,dv:20000,ac:1,sa:0.92,vel:0.95,sasv:0,sasr:0},
     "1202":{sc:97000,es:0,sy:0.31,nf:30,pd:0.02,s4:120,dv:80000,ac:0,sa:0.80,vel:0.70,sasv:1500,sasr:0}};
MONTHLY_SYLY={"1201":0.29,"1202":0.29};
E=[{m:"S001",c:"PROVA",n:"UNO",f:"SM",j:"SM",si:1201,s:"1201 TEST",ib:1000,rl:1000,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"},
   {m:"S002",c:"PROVA",n:"DUE",f:"SA",j:"SA",si:1202,s:"1202 TEST",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:1,ps:"NO",ov_wg:"SI"}];
VL={"S001":[{sid:"1201",amt:150}]};
AGG={"S002":{rb:30}};
DEMOLT_RESULT_STORE={"1201":{pct:0.8}};
PARAMS.bdg60mult=0.6; PARAMS.workgamePct=0.3;
FCVM_PARAMS.soglia100=0.98; FCVM_PARAMS.pct60=0.55;
`;

const SNAP = `JSON.stringify({
  tot:E.map(function(e){return calcE(e)}),
  month:CFG_MONTH, year:CFG_YEAR, mode:MODE, prize:PRIZE_MODE,
  agg:AGG, vl:VL, fcvm:FCVM_PARAMS, demolt:DEMOLT_RESULT_STORE, params:PARAMS
})`;

test("Salva -> Carica sessione: premi e configurazione identici", () => {
  const app = loadBundle();
  assert.deepStrictEqual(app.errors, []);
  app.run(SETUP);
  const before = JSON.parse(app.run(SNAP));
  assert.ok(before.tot[0] > 0 && before.tot[1] > 0, "scenario con premi non nulli");

  app.run("saveSession()");
  const file = app.lastBlobText();
  assert.ok(file && JSON.parse(file)._type === "boggi_session", "sessione scaricata");

  // l'utente cambia tutto...
  app.run(`E=[];AGG={};VL={};DEMOLT_RESULT_STORE={};CFG_MONTH=1;CFG_YEAR=2025;MODE="preventivo";
           FCVM_PARAMS.soglia100=0.9;FCVM_PARAMS.pct60=0.4;PARAMS.workgamePct=0;`);
  // ...e ricarica la sessione salvata
  app.nextFileText = file;
  app.run("loadSession({files:[{name:'sessione.json'}],value:''})");

  const after = JSON.parse(app.run(SNAP));
  assert.deepStrictEqual(after, before);
  assert.deepStrictEqual(app.alerts.filter(a => /errore/i.test(a)), [], "nessun errore mostrato");
});

test("Carica sessione vecchia (senza alcune chiavi): i dati correnti non si mescolano", () => {
  const app = loadBundle();
  app.run(SETUP);
  // dati "di un altro mese" presenti in memoria prima del caricamento
  app.run(`FC_AREA_SAS={"FC9":{acc:0.9}};MAIL_LOG=[{m:"S001"}];SEAS={"S001":{midPaid:100}};
           SEAS_TARGETS["9999"]={to:1};`);
  const old = { _type: "boggi_session", v: 2, ts: "2026-01-31T10:00:00Z",
    D: { e: [{ m: "V001", c: "VECCHIO", n: "UNO", f: "SA", j: "SA", si: 1201, s: "1201 TEST", ib: 400, rl: 400, en: 210, cu: "EUR", ex: 1, ml: 0, ps: "NO" }],
         t: { "1201": { to: 50000 } }, c: { "1201": { sc: 60000 } } },
    mode: "consuntivo", cfg_month: 1, cfg_year: 2026, seas_targets: { "1201": { to: 123 } } };
  app.nextFileText = JSON.stringify(old);
  app.run("loadSession({files:[{name:'vecchia.json'}],value:''})");
  const s = JSON.parse(app.run(`JSON.stringify({E:E.map(function(e){return e.m}),agg:AGG,vl:VL,demolt:DEMOLT_RESULT_STORE,
    fcsas:FC_AREA_SAS,mail:MAIL_LOG,seas:SEAS,st:Object.keys(SEAS_TARGETS),fcvm:FCVM_PARAMS.soglia100,month:CFG_MONTH})`));
  assert.deepStrictEqual(s.E, ["V001"]);
  assert.deepStrictEqual(s.agg, {});          // prima restava AGG della sessione corrente
  assert.deepStrictEqual(s.vl, {});
  assert.deepStrictEqual(s.demolt, {});       // prima restava il Coefficiente Inventari corrente
  assert.deepStrictEqual(s.fcsas, {});
  assert.deepStrictEqual(s.mail, []);
  assert.deepStrictEqual(s.seas, {});
  assert.deepStrictEqual(s.st, ["1201"]);     // target seasonal sostituiti, non fusi
  assert.strictEqual(s.fcvm, 0.98);           // configurazione assente nel file: resta quella attuale
  assert.strictEqual(s.month, 1);
  const msg = app.alerts[app.alerts.length - 1];
  assert.match(msg, /Non presenti nel file \(mantenuti i valori attuali\):.*soglie FC\+VM/);
});

test("Salva sessione registra la versione dell'app", () => {
  const app = loadBundle();
  app.run(SETUP);
  app.run("saveSession()");
  assert.strictEqual(JSON.parse(app.lastBlobText()).app_version, app.run("APP_VERSION"));
});

test("Carica configurazione: non tocca aggiunte e Visual (dati del mese)", () => {
  const app = loadBundle();
  app.run(SETUP);
  app.run("saveConfig()");
  const cfg = JSON.parse(app.lastBlobText());
  assert.strictEqual(cfg.agg, undefined, "il file di configurazione non contiene piu` le aggiunte");
  assert.strictEqual(cfg.vl, undefined);
  // file di configurazione VECCHIO che contiene ancora agg/vl
  cfg.agg = { ZZZ: { rb: 999 } }; cfg.vl = { ZZZ: [{ sid: "1201", amt: 999 }] };
  app.nextFileText = JSON.stringify(cfg);
  app.run("loadConfig({target:{files:[{name:'config.json'}],value:''}})");
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(AGG)")), { S002: { rb: 30 } });
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(VL)")), { S001: [{ sid: "1201", amt: 150 }] });
});

test("cambi valuta, date di attivazione e coefficienti seasonal: salvati e ricaricati da sessione e configurazione", () => {
  const app = loadBundle();
  app.run(SETUP);
  app.run(`ENTE_CU["211"].ex=1.2;ENTE_CU["211"].from="2026-11-01";
    _applyRuleCfg({sas:[2026,8],usa:[2027,1],demolt:[2026,12]});
    SEAS_CFG.midPct=0.25;SEAS_CFG.semMonths=5;SEAS_CFG.deptQtyPct=0.4;`);
  const snap = () => JSON.parse(app.run(`JSON.stringify({cu:ENTE_CU["211"],r:_ruleCfgGet(),m:[seasMidPct(),seasSemMonths(),seasDeptQtyPct()],sas:sasNewActive()})`));
  const before = snap();
  assert.deepStrictEqual(before.r, { sas: [2026, 8], usa: [2027, 1], demolt: [2026, 12] });
  for (const how of ["saveSession", "saveConfig"]) {
    app.run(how + "()");
    const file = app.lastBlobText();
    app.run(`ENTE_CU["211"]={cu:"GBP",ex:1.1692};_applyRuleCfg({sas:[2026,7],usa:[2026,9],demolt:[2026,10]});
      SEAS_CFG.midPct=0.30;SEAS_CFG.semMonths=6;SEAS_CFG.deptQtyPct=0.5;`);
    app.nextFileText = file;
    app.run(how === "saveSession" ? "loadSession({files:[{}],value:''})" : "loadConfig({target:{files:[{}],value:''}})");
    assert.deepStrictEqual(snap(), before, how);
  }
  // valori non validi ignorati
  app.run(`_applyRuleCfg({sas:[1999,13]});_applyEnteCu({"211":{ex:-1},"209":{ex:"x"}});`);
  assert.deepStrictEqual(snap(), before);
});

test("Configurazione: cambiando un cambio l'app propone di applicarlo ai dipendenti gia` caricati", () => {
  const app = loadBundle({ confirm: true });
  app.run(`PRIZE_MODE="mensile";REGION="international";MODE="consuntivo";
    E=[{m:"G1",en:211,cu:"GBP",ex:1.1692,si:1101,j:"SA",f:"SA",ps:"NO"},{m:"G2",en:211,cu:"GBP",ex:1.1692,si:1101,j:"SA",f:"SA",ps:"NO"},
       {m:"C1",en:209,cu:"CHF",ex:1.3756,si:1001,j:"SA",f:"SA",ps:"NO"}];
    rT();var __in={value:"1.25",getAttribute:function(){return "211"}};
    document.querySelectorAll=function(sel){return sel==="input[data-cu-ex]"?[__in]:[]};cfgRatesBind();__in.onchange();`);
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(E.map(function(e){return e.ex}))")), [1.25, 1.25, 1.3756]);
  assert.strictEqual(app.run("ENTE_CU['211'].ex"), 1.25);
});

test("sessione vecchia con ruolo storico «SM VSM» e digMin: migrati come in Carica configurazione", () => {
  const app = loadBundle();
  app.run(SETUP);
  const tcOld = JSON.parse(app.run("JSON.stringify(TC)"));
  delete tcOld.SM; delete tcOld.VSM;
  tcOld["SM VSM"] = Object.assign({}, tcOld.SA, { Digital: false, SY: false });
  const old = { _type: "boggi_session", v: 2, D: { e: [] }, tc: tcOld, params: { digMin: 0.04 } };
  app.nextFileText = JSON.stringify(old);
  app.run("loadSession({files:[{}],value:''})");
  const r = JSON.parse(app.run("JSON.stringify({sm:TC.SM,vsm:TC.VSM,dc:PARAMS.digMinClassic,dm:PARAMS.digMinMobility})"));
  assert.strictEqual(r.sm.Digital, false, "SM eredita la configurazione di «SM VSM» (prima: valori predefiniti)");
  assert.strictEqual(r.vsm.SY, false);
  assert.strictEqual(r.dc, 0.04);
  assert.strictEqual(Math.round(r.dm * 100) / 100, 0.06);
});

test("Carica sessione: un file che non e` una sessione viene rifiutato senza toccare i dati", () => {
  const app = loadBundle();
  app.run(SETUP);
  const before = app.run(SNAP);
  app.nextFileText = JSON.stringify({ qualcosa: 1 });
  app.run("loadSession({files:[{name:'altro.json'}],value:''})");
  assert.strictEqual(app.run(SNAP), before);
  assert.ok(app.alerts.some(a => /non è una sessione/i.test(a)));
});
