// Test sul BUNDLE COMPILATO (web/app.html): l'app finita, caricata come la usa l'exe.
//
// 1. Caricamento: tutti gli script del bundle si eseguono senza errori.
// 2. Calcolo premi mensile: uno scenario fisso di negozi/dipendenti FINTI copre i rami
//    principali (BDG 100%/60%/0, Digital, SY, Privilege, SAS, DCC, Articoli, Visual, QTY Dept,
//    malattia, sospesi, override 100%/60%, Workgame, aggiunte, Coefficiente Inventari, USA)
//    in preventivo e consuntivo, prima e dopo le date di attivazione SAS (lug-2026) e
//    inventari (ott-2026). Alcuni casi sono verificati a mano; tutti i risultati sono
//    confrontati con test/fixtures/calc-golden.json ("premi congelati").
//
// Se una modifica cambia VOLUTAMENTE un premio, rigenera i premi attesi e controlla il diff:
//     UPDATE_GOLDEN=1 node --test test/bundle-calc.test.js
//     git diff test/fixtures/calc-golden.json
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { loadBundle } = require("../build/bundle-harness");

const GOLDEN = path.join(__dirname, "fixtures", "calc-golden.json");

// Scenario: negozi e dipendenti inventati (nessun dato reale).
const SCENARIO = `
PRIZE_MODE="mensile"; REGION="italia";
STORE_FLAGS={}; initStoreFlags();
D.t={
  "1201":{to:100000,sy:0.30,pr:40,qt:0},
  "1202":{to:100000,sy:0.30,pr:40,qt:0},
  "1203":{to:100000,sy:0.30,pr:40,qt:0},
  "1204":{to:100000,sy:0.30,pr:40,qt:0},
  "1187":{to:200000,sy:0.30,pr:40,qt:500}
};
D.c={
  // 105%: tutti i KPI centrati
  "1201":{sc:105000,es:0,sy:0.32,nf:45,pd:0.06,s4:50,dv:20000,ac:2,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  // 97% con SY in crescita sul LY -> BDG ridotto 60%
  "1202":{sc:97000,es:0,sy:0.31,nf:30,pd:0.02,s4:120,dv:80000,ac:0,qc:0,sa:0.80,vel:0.70,sasv:1500,sasr:0},
  // 97% senza crescita SY -> niente BDG
  "1203":{sc:97000,es:0,sy:0.25,nf:41,pd:0.07,s4:10,dv:1000,ac:1,qc:0,sa:0.60,vel:0.50,sasv:0,sasr:0},
  // 80%: nessun premio di negozio
  "1204":{sc:80000,es:0,sy:0.40,nf:50,pd:0.10,s4:0,dv:0,ac:0,qc:0,sa:0.95,vel:0.99,sasv:0,sasr:0},
  // negozio DEPT al 97% con QTY a target -> BDG ridotto + QTY Dept
  "1187":{sc:194000,es:0,sy:0.31,nf:42,pd:0.05,s4:30,dv:5000,ac:0,qc:520,sa:0.90,vel:0.90,sasv:0,sasr:0}
};
D.cs={};D.v={};D.s={};
MONTHLY_SYLY={"1201":0.29,"1202":0.29,"1203":0.29,"1204":0.29,"1187":0.29};
var mk=function(m,j,si,ib,x){var e={m:m,c:"TEST"+m,n:"NOME",f:j.split(" ")[0],j:j,si:si,s:si+" NEGOZIO TEST",ib:ib,rl:ib,en:210,cu:"EUR",ex:1,ml:0,ps:"NO",l:"ITALIANO"};for(var k in (x||{}))e[k]=x[k];return e;};
E=[
  mk("T001","SM",1201,1000),
  mk("T002","SA",1201,500),
  mk("T003","SCS",1201,400),
  mk("T004","SM",1202,1000),
  mk("T005","SA",1202,500),
  mk("T006","SA",1203,500),
  mk("T007","SA",1204,500),
  mk("T008","SA DEPT",1187,600),
  mk("T009","SM DEPT",1187,1200),
  mk("T010","SA",1201,500,{ml:1}),           // malattia: 50%
  mk("T011","SA",1201,500,{ml:2}),           // malattia: 0
  mk("T012","SA",1201,500,{ps:"SI"}),        // premio sospeso
  mk("T013","SA",1204,500,{ov_b100:"SI"}),   // override 100% su negozio all'80%
  mk("T014","SA",1201,500,{ov_rid:"SI"}),    // override 60% su negozio al 105%
  mk("T015","SA",1201,500,{ov_wg:"SI"}),     // Workgame
  mk("T016","SA NO DIGITAL",1201,500),
  mk("T017","VSM",1201,800),
  mk("T018","SA",1321,700,{cu:"USD",ex:0.9}), // USA
  mk("T019","SA",1201,500)                   // gemello di T002 senza aggiunte
];
VL={"T001":[{sid:"1201",amt:150},{sid:"1204",amt:100}],"T004":[{sid:"1202",amt:150}]};
AGG={"T002":{rb:25},"T007":{rb:40}};
DEMOLT_RESULT_STORE={"1201":{pct:0.8},"1202":{pct:0.5}};
`;

const CONFIGS = [
  { k: "giu2026-prev", mode: "preventivo", y: 2026, m: 6 },
  { k: "giu2026-cons", mode: "consuntivo", y: 2026, m: 6 },
  { k: "ago2026-cons", mode: "consuntivo", y: 2026, m: 8 },
  { k: "nov2026-prev", mode: "preventivo", y: 2026, m: 11 },
  { k: "nov2026-cons", mode: "consuntivo", y: 2026, m: 11 },
];
const KPI = ["rb", "rd", "rs", "rp", "rsa", "rdc", "rcs", "ra", "vi", "pq"];

function compute(app, cfg) {
  app.run('MODE="' + cfg.mode + '";CFG_YEAR=' + cfg.y + ";CFG_MONTH=" + cfg.m + ";");
  return JSON.parse(app.run(`JSON.stringify(E.map(function(e){
    var k={};${JSON.stringify(KPI)}.forEach(function(x){k[x]=getVal(e,x)});
    return {m:e.m,tot:calcE(e),eur:Math.round(calcEUR(e)*100)/100,kpi:k};
  }))`));
}

function freshApp() {
  const app = loadBundle();
  app.run(SCENARIO);
  return app;
}

test("il bundle si carica senza errori negli script", () => {
  const app = loadBundle();
  assert.deepStrictEqual(app.errors, []);
  for (const fn of ["calcE", "getVal", "parseNum", "parseRatio", "saveSession", "loadSession", "getLetterHtmlForPrint"])
    assert.strictEqual(app.run("typeof " + fn), "function", fn);
});

test("parseNum / parseRatio nel bundle", () => {
  const app = loadBundle();
  assert.strictEqual(app.run('parseNum("1.500")'), 1500);
  assert.strictEqual(app.run('parseNum("0,125")'), 0.125);
  assert.strictEqual(app.run('parseNum("1.234,56")'), 1234.56);
  assert.strictEqual(app.run('parseRatio("1.856")'), 1.856);
});

test("casi verificati a mano (consuntivo giugno 2026, prima della nuova policy SAS)", () => {
  const app = freshApp();
  const r = Object.fromEntries(compute(app, CONFIGS[1]).map(x => [x.m, x]));
  // negozio al 105%: BDG pieno
  assert.strictEqual(r.T002.kpi.rb, 500);
  // negozio al 97% con SY in crescita: BDG ridotto al 60%
  assert.strictEqual(r.T005.kpi.rb, 300);
  // negozio al 97% senza crescita SY e negozio all'80%: niente BDG
  assert.strictEqual(r.T006.kpi.rb, 0);
  assert.strictEqual(r.T007.kpi.rb, 0);
  // override 100% su negozio all'80% e override 60% su negozio al 105%
  assert.strictEqual(r.T013.kpi.rb, 500);
  assert.strictEqual(r.T014.kpi.rb, 300);
  // DEPT al 97% con QTY a target: BDG 60% + QTY Dept (50% del BDG)
  assert.strictEqual(r.T008.kpi.rb, 360);
  assert.strictEqual(r.T008.kpi.pq, 300);
  // malattia (T010, ml=1): 50% del gemello T019; ml=2 e sospeso: 0
  assert.strictEqual(r.T010.tot, Math.round(r.T019.tot * 0.5 * 100) / 100);
  assert.strictEqual(r.T011.tot, 0);
  assert.strictEqual(r.T012.tot, 0);
  // aggiunte: T002 = gemello T019 + 25
  assert.strictEqual(Math.round((r.T002.tot - r.T019.tot) * 100) / 100, 25);
  // Workgame: +30% del BDG (500)
  assert.strictEqual(Math.round((r.T015.tot - r.T019.tot) * 100) / 100, 150);
  // negozio all'80%: il totale e` la somma dei KPI individuali + aggiunta (40)
  const k7 = r.T007.kpi;
  assert.strictEqual(r.T007.tot, Math.round((k7.rb + k7.rd + k7.rs + k7.rp + k7.rsa + k7.rdc + k7.rcs + k7.ra + k7.vi + k7.pq) * 100) / 100 + 40);
});

test("Coefficiente Inventari: da ottobre 2026 riduce le voci SM/VSM in consuntivo", () => {
  const app = freshApp();
  const ago = Object.fromEntries(compute(app, CONFIGS[2]).map(x => [x.m, x]));
  const nov = Object.fromEntries(compute(app, CONFIGS[4]).map(x => [x.m, x]));
  assert.strictEqual(nov.T001.kpi.rb, Math.round(ago.T001.kpi.rb * 0.8 * 100) / 100);
  // gli SA non sono toccati dal coefficiente
  assert.strictEqual(nov.T002.kpi.rb, ago.T002.kpi.rb);
});

test("Workgame: stesso importo in calcolo, analisi, export e tracciato; con BDG in TRASFERTE va nel cod. 380", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";REGION="italia";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;
    STORE_FLAGS={};initStoreFlags();D.t={"1201":{to:100000}};D.c={"1201":{sc:105000}};MONTHLY_SYLY={};
    DEMOLT_RESULT_STORE={};VL={};AGG={};PARAMS.workgamePct=0.3;
    E=[{m:"7000001",c:"A",n:"A",f:"SA",j:"SA",si:1201,s:"1201 T",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO",ov_wg:"SI"},
       {m:"7000002",c:"B",n:"B",f:"SA",j:"SA",si:1201,s:"1201 T",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO",ov_wg:"SI",ibFromAY:true},
       {m:"7000003",c:"C",n:"C",f:"SA",j:"SA",si:1201,s:"1201 T",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"}];`);
  assert.strictEqual(app.run("workgameAmt(E[0])"), 150);
  assert.strictEqual(app.run("workgameAmt(E[2])"), 0);
  assert.strictEqual(app.run("workgameAmt(E[0],'preventivo')"), 0);
  // totale: chi ha il Workgame prende 150 in piu` del collega identico senza
  assert.strictEqual(app.run("Math.round((calcE(E[0])-calcE(E[2]))*100)/100"), 150);
  assert.strictEqual(app.run("Math.round((calcE(E[1])-calcE(E[2]))*100)/100"), 150);
  // tracciato pagamenti Zucchetti: BDG+Workgame nel 225, oppure nel 380 per chi ha il BDG in TRASFERTE
  app.run("exportTracciatoPagamenti()");
  const lines = app.lastBlobText().split("\n").map(l => l.split(";"));
  const bdgOf = (m, cod) => lines.filter(r => r[1] === m && r[6] === String(cod)).map(r => parseInt(r[7], 10) / 100);
  const base = bdgOf("7000003", 225)[0];
  assert.deepStrictEqual(bdgOf("7000001", 225), [base + 150]);
  assert.deepStrictEqual(bdgOf("7000002", 225), [], "BDG in TRASFERTE: niente nel 225");
  assert.deepStrictEqual(bdgOf("7000002", 380), [base + 150], "Workgame pagato nel 380 insieme al BDG (prima mancava)");
  // export Excel consuntivo IT: colonna BDG LORDO (11) o BDG NETTO (12)
  app.run(`var __rows=null;XLSX={utils:{aoa_to_sheet:function(r){__rows=r;return {}},book_new:function(){return {}},book_append_sheet:function(){}},writeFile:function(){}};
    exportExcelConsuntivoIT();`);
  const rows = JSON.parse(app.run("JSON.stringify(__rows)"));
  const r = m => rows.find(x => x[3] === m);
  assert.strictEqual(r("7000001")[11] - r("7000003")[11], 150);
  assert.strictEqual(r("7000002")[11], 0);
  assert.strictEqual(r("7000002")[12], base + 150);
});

test("premi congelati: tutti gli scenari coincidono con test/fixtures/calc-golden.json", () => {
  const app = freshApp();
  const out = {};
  for (const cfg of CONFIGS) out[cfg.k] = compute(app, cfg);
  if (process.env.UPDATE_GOLDEN) {
    fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fs.writeFileSync(GOLDEN, JSON.stringify(out, null, 1) + "\n", "utf8");
  }
  const exp = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  for (const cfg of CONFIGS) {
    const byM = Object.fromEntries(exp[cfg.k].map(x => [x.m, x]));
    for (const r of out[cfg.k]) assert.deepStrictEqual(r, byM[r.m], cfg.k + " / " + r.m);
    assert.strictEqual(out[cfg.k].length, exp[cfg.k].length, cfg.k + ": numero dipendenti");
  }
});
