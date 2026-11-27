// Nuova logica premi mensili da gennaio 2027: niente Digital/SY/Privilege a se', matrice Subscription sul BDG,
// poi altri premi, poi Coefficiente Inventari su tutte le voci, poi malattia. Test sul bundle compilato (web/app.html).
//   node build/build.js && node --test test/sub-matrix.test.js
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

// Negozi e dipendenti inventati. Subscription: target 25%, risultato diverso per negozio.
const SCENARIO = `
PRIZE_MODE="mensile"; REGION="italia";
STORE_FLAGS={}; initStoreFlags();
D.t={
  "1201":{to:100000,sy:0.30,pr:0.25,qt:0},   // Subscription 23,55/25 = 94,2% -> fascia 90-95 -> 60%
  "1202":{to:100000,sy:0.30,pr:0.25,qt:0},   // 25/25 = 100% -> 100%
  "1203":{to:100000,sy:0.30,pr:0.25,qt:0},   // 24,5/25 = 98% -> 80%
  "1204":{to:100000,sy:0.30,pr:0.25,qt:0},   // 21/25 = 84% -> 40%
  "1205":{to:100000,sy:0.30,pr:0,qt:0},      // nessun target Subscription -> 100%
  "1206":{to:100000,sy:0.30,pr:0.25,qt:0},   // 97% con SY in crescita: paracadute 60% poi Subscription 80%
  "1387":{to:200000,sy:0.30,pr:0.25,qt:500}  // Dept: mai matrice Subscription
};
D.c={
  "1201":{sc:105000,es:0,sy:0.32,nf:0.2355,pd:0.06,s4:50,dv:20000,ac:1,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  "1202":{sc:105000,es:0,sy:0.32,nf:0.25,pd:0.06,s4:50,dv:20000,ac:1,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  "1203":{sc:105000,es:0,sy:0.32,nf:0.245,pd:0.06,s4:50,dv:20000,ac:0,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  "1204":{sc:105000,es:0,sy:0.32,nf:0.21,pd:0.06,s4:50,dv:20000,ac:0,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  "1205":{sc:105000,es:0,sy:0.32,nf:0.10,pd:0.06,s4:50,dv:20000,ac:0,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  "1206":{sc:97000,es:0,sy:0.31,nf:0.245,pd:0.06,s4:50,dv:20000,ac:0,qc:0,sa:0.92,vel:0.95,sasv:0,sasr:0},
  "1387":{sc:194000,es:0,sy:0.31,nf:0.10,pd:0.05,s4:30,dv:5000,ac:0,qc:520,sa:0.90,vel:0.90,sasv:0,sasr:0}
};
D.cs={};D.v={};D.s={};
MONTHLY_SYLY={"1201":0.29,"1202":0.29,"1203":0.29,"1204":0.29,"1205":0.29,"1206":0.29,"1387":0.29};
var mk=function(m,j,si,ib,x){var e={m:m,c:"TEST"+m,n:"NOME",f:j.split(" ")[0],j:j,si:si,s:si+" NEGOZIO TEST",ib:ib,rl:ib*4,en:210,cu:"EUR",ex:1,ml:0,ps:"NO",l:"ITALIANO"};for(var k in (x||{}))e[k]=x[k];return e;};
E=[
  mk("S01","SA",1201,500),
  mk("S02","SA",1202,500),
  mk("S03","SA",1203,500),
  mk("S04","SA",1204,500),
  mk("S05","SA",1205,500),
  mk("S06","SA",1206,500),
  mk("S07","SA DEPT",1387,600),
  mk("S08","SA",1201,500,{ov_b100:"SI"}),
  mk("S09","SA",1206,500,{ov_rid:"SI"}),
  mk("S10","SM",1201,1000),
  mk("S11","SA",1201,500,{ml:1}),
  mk("S12","SA NO DIGITAL NO SY NO PRIVILEGE",1201,500),
  mk("S13","SCS",1201,400),
  mk("S14","SA",1321,700,{cu:"USD",ex:0.9})
];
VL={}; AGG={}; DEMOLT_RESULT_STORE={};
`;

function app_(y, m, mode) {
  const app = loadBundle();
  app.run(SCENARIO);
  app.run('MODE="' + (mode || "consuntivo") + '";CFG_YEAR=' + y + ";CFG_MONTH=" + m + ";");
  return app;
}
const val = (app, matr, k) => app.run('getVal(E.filter(function(e){return e.m==="' + matr + '"})[0],"' + k + '")');
const tot = (app, matr) => app.run('calcE(E.filter(function(e){return e.m==="' + matr + '"})[0])');

test("fino a dicembre 2026 nulla cambia: Digital, SY e Privilege pagano ancora, nessuna matrice", () => {
  const a = app_(2026, 12);
  assert.strictEqual(a.run("subNewActive()"), false);
  assert.strictEqual(val(a, "S01", "rb"), 500);          // nessun coefficiente
  assert.ok(val(a, "S01", "rd") > 0);
  assert.ok(val(a, "S01", "rs") > 0);
  assert.ok(val(a, "S02", "rp") > 0);
});

test("da gennaio 2027 Digital, SY e Privilege valgono 0 in calcolo, anche se il TC li attiva", () => {
  const a = app_(2027, 1);
  assert.strictEqual(a.run("subNewActive()"), true);
  for (const m of ["S01", "S02", "S10"]) for (const k of ["rd", "rs", "rp"]) assert.strictEqual(val(a, m, k), 0, m + " " + k);
  assert.strictEqual(a.run('isOn("SA","rd")||isOn("SA","rs")||isOn("SA","rp")'), false);
  // anche in preventivo
  const p = app_(2027, 1, "preventivo");
  assert.strictEqual(val(p, "S02", "rd"), 0);
  assert.strictEqual(val(p, "S02", "rs"), 0);
  assert.strictEqual(val(p, "S02", "rp"), 0);
});

test("solo il mensile: seasonal e FC+VM non sono toccati", () => {
  const a = app_(2027, 1);
  a.run('PRIZE_MODE="seasonal"');
  assert.strictEqual(a.run("subNewActive()"), false);
  a.run('PRIZE_MODE="fcvm"');
  assert.strictEqual(a.run("subNewActive()"), false);
});

test("matrice Subscription: fasce 100/80/60/40 sul BDG (risultato / target del negozio)", () => {
  const a = app_(2027, 1);
  assert.strictEqual(val(a, "S02", "rb"), 500);   // 100%  -> x1
  assert.strictEqual(val(a, "S03", "rb"), 400);   // 98%   -> x0,8
  assert.strictEqual(val(a, "S01", "rb"), 300);   // 94,2% -> x0,6
  assert.strictEqual(val(a, "S04", "rb"), 200);   // 84%   -> x0,4
  assert.strictEqual(a.run('subInfo("1201").idx'), 2);
  assert.strictEqual(a.run('subInfo("1202").coeff'), 1);
});

test("bordi delle fasce: 99,5% e' la soglia della fascia piena", () => {
  const a = app_(2027, 1);
  assert.strictEqual(a.run("subBandIdx(0.995)"), 0);
  assert.strictEqual(a.run("subBandIdx(0.9949)"), 1);
  assert.strictEqual(a.run("subBandIdx(0.95)"), 1);
  assert.strictEqual(a.run("subBandIdx(0.9499)"), 2);
  assert.strictEqual(a.run("subBandIdx(0.90)"), 2);
  assert.strictEqual(a.run("subBandIdx(0.5)"), 3);
  assert.strictEqual(a.run("subBandIdx(0.2488/0.25)"), 0); // 99,52% -> pieno (nessun errore di virgola mobile sul bordo)
});

test("dato mancante (nessun target o risultato Subscription) -> nessuna riduzione", () => {
  const a = app_(2027, 1);
  assert.strictEqual(val(a, "S05", "rb"), 500);
  a.run('D.c["1203"].nf=0;');
  assert.strictEqual(val(a, "S03", "rb"), 500);
  assert.strictEqual(a.run('subInfo("1203").has'), false);
});

test("esclusi: Dept stores, ruoli senza Privilege (NO PRIVILEGE), USA", () => {
  const a = app_(2027, 1);
  assert.strictEqual(a.run('subApplies(E[6])'), false); // Dept
  assert.strictEqual(a.run('subApplies(E[11])'), false); // NO PRIVILEGE
  assert.strictEqual(a.run('subApplies(E[13])'), false); // USA
  assert.strictEqual(val(a, "S12", "rb"), 500);          // BDG intero malgrado Subscription al 94%
  assert.strictEqual(a.run('subApplies(E[0])'), true);
  assert.strictEqual(a.run('subApplies(E[12])'), true);  // SCS: BDG a tutti i ruoli, matrice compresa
});

test("a cascata: paracadute 60% poi Subscription; override manuali valgono prima della matrice", () => {
  const a = app_(2027, 1);
  assert.strictEqual(val(a, "S06", "rb"), 240);   // 500 x 60% (paracadute) = 300, poi x 80% = 240
  assert.strictEqual(val(a, "S08", "rb"), 300);   // override 100%: 500 pieno, poi matrice 60%
  assert.strictEqual(val(a, "S09", "rb"), 240);   // override 60%: 300, poi x 80%
});

test("altri premi: la Subscription non li riduce (Articoli, DCC, Visual)", () => {
  const a = app_(2027, 1);
  assert.strictEqual(val(a, "S01", "ra"), 150);   // 30% BDG x 1 categoria, invariato
  assert.strictEqual(val(a, "S13", "rdc"), 40);   // DCC 0,2% x 20.000 = 40 (max 100)
  a.run('VL={"S01":[{sid:"1201",amt:100}]};');
  assert.strictEqual(val(a, "S01", "vi"), 100);
  // totale = BDG ridotto + Articoli + Visual
  assert.strictEqual(tot(a, "S01"), 300 + 150 + 100);
});

test("Coefficiente Inventari: dopo la Subscription e su TUTTE le voci (come oggi)", () => {
  const a = app_(2027, 1);
  a.run('DEMOLT_RESULT_STORE={"1201":{pct:0.5}};');
  // SM: BDG 1000 -> Subscription 60% = 600 -> Inventari 50% = 300
  assert.strictEqual(val(a, "S10", "rb"), 300);
  // gli Articoli (ac=1: 30% di 1000 = 300) sono ridotti dall'Inventari ma non dalla Subscription
  assert.strictEqual(val(a, "S10", "ra"), 150);
  // un SA dello stesso negozio non e' toccato dall'Inventari (solo SM/VSM): solo la Subscription
  assert.strictEqual(val(a, "S01", "rb"), 300);
});

test("malattia sulla cifra finale (dopo le matrici)", () => {
  const a = app_(2027, 1);
  // S11 ha 1 giorno di malattia -> 50% del totale del gemello S01
  assert.strictEqual(tot(a, "S11"), Math.round(tot(a, "S01") * 0.5 * 100) / 100);
});

test("premioSteps coincide con calcE (nessuna formula duplicata)", () => {
  const a = app_(2027, 1);
  a.run('DEMOLT_RESULT_STORE={"1201":{pct:0.8}};VL={"S10":[{sid:"1201",amt:100}]};');
  for (const m of ["S01", "S03", "S06", "S10", "S11", "S13"]) {
    const st = JSON.parse(a.run('JSON.stringify(premioSteps(E.filter(function(e){return e.m==="' + m + '"})[0]))'));
    assert.strictEqual(st.finale, tot(a, m), m);
    assert.ok(Math.abs(st.maturato - (st.bdgSub + st.sumAltri)) < 0.011, m);
  }
  const s10 = JSON.parse(a.run('JSON.stringify(premioSteps(E[9]))'));
  assert.strictEqual(s10.bdgRaw, 1000);
  assert.strictEqual(s10.subC, 0.6);
  assert.strictEqual(s10.bdgSub, 600);
  assert.strictEqual(s10.invPct, 0.8);
});

test("preventivo: massimo previsto con Articoli (30% BDG x categorie) e Visual; matrice non applicata", () => {
  const p = app_(2027, 1, "preventivo");
  assert.strictEqual(val(p, "S01", "rb"), 500);        // nessuna matrice in preventivo
  assert.strictEqual(val(p, "S01", "ra"), 150);        // categorie dal file (ac=1)
  assert.strictEqual(val(p, "S03", "ra"), 0);          // nessuna categoria incentivata
  p.run('VL={"S01":[{sid:"1201",amt:100}]};');
  assert.strictEqual(tot(p, "S01"), 500 + 150 + 100);
  // fino a dicembre 2026 il preventivo non stimava gli Articoli
  const old = app_(2026, 12, "preventivo");
  assert.strictEqual(val(old, "S01", "ra"), 0);
});

test("tracciato pagamenti: BDG gia' netto in cod. 225, nessuna riga 244/226/227", () => {
  const a = app_(2027, 1);
  a.run('E=E.filter(function(e){return e.m==="S02"});');
  a.run("exportTracciatoPagamenti()");
  const lines = a.lastBlobText().split("\n").map(l => l.split(";"));
  const cods = lines.map(r => r[6]);
  assert.ok(cods.includes("225"));
  for (const c of ["244", "226", "227"]) assert.ok(!cods.includes(c), "codice " + c + " non deve comparire");
  assert.strictEqual(parseInt(lines.find(r => r[6] === "225")[7], 10), 500 * 100); // S02: Subscription a target -> BDG pieno
  const a2 = app_(2026, 12);
  a2.run('E=E.filter(function(e){return e.m==="S02"});');
  a2.run("exportTracciatoPagamenti()");
  const c2 = a2.lastBlobText().split("\n").map(l => l.split(";")[6]);
  assert.ok(c2.includes("244") && c2.includes("226") && c2.includes("227"), "fino a dic. 2026 i codici restano");
});

test("la matrice si salva e si ricarica con i parametri (sessione/configurazione)", () => {
  const a = app_(2027, 1);
  a.run('PARAMS.subBands=[{f:0.99,c:1},{f:0.9,c:0.5},{f:0,c:0}];');
  assert.strictEqual(a.run("JSON.parse(JSON.stringify(PARAMS)).subBands.length"), 3);
  assert.strictEqual(a.run('subBandIdx(0.95)'), 1);
  assert.strictEqual(val(a, "S01", "rb"), 250);  // 94,2% -> fascia 2 (0,9) -> 50%
});

test("Salva/Carica sessione e configurazione: fasce Subscription e data di attivazione ritornano uguali", () => {
  const app = loadBundle();
  app.run('PRIZE_MODE="mensile";REGION="italia";MODE="consuntivo";CFG_YEAR=2027;CFG_MONTH=1;E=[];');
  const custom = [{ f: 0.99, c: 1 }, { f: 0.9, c: 0.5 }, { f: 0, c: 0.1 }];
  app.run("PARAMS.subBands=" + JSON.stringify(custom) + ";_applyRuleCfg({sub:[2027,3]});");
  for (const how of ["saveSession", "saveConfig"]) {
    app.run(how + "()");
    const file = app.lastBlobText();
    app.run('PARAMS.subBands=[{f:0.995,c:1},{f:0,c:0.4}];_applyRuleCfg({sub:[2027,1]});');
    app.nextFileText = file;
    app.run(how === "saveSession" ? "loadSession({files:[{}],value:''})" : "loadConfig({target:{files:[{}],value:''}})");
    assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(PARAMS.subBands)")), custom, how);
    assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(_ruleCfgGet().sub)")), [2027, 3], how);
  }
});

test("sessione vecchia senza fasce: restano quelle predefinite", () => {
  const app = loadBundle();
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(PARAMS.subBands)")), [{ f: 0.995, c: 1 }, { f: 0.95, c: 0.8 }, { f: 0.9, c: 0.6 }, { f: 0, c: 0.4 }]);
});

const XLSX_STUB = `var __rows=null;XLSX={utils:{aoa_to_sheet:function(r){__rows=r;return {}},book_new:function(){return {}},book_append_sheet:function(){}},writeFile:function(){}};`;

test("Export Excel consuntivo IT: colonne storiche invariate (Digital/SY/Privilege a 0), nuove colonne Subscription SOLO in coda", () => {
  const a = app_(2027, 1);
  a.run('E=E.filter(function(e){return e.m==="S01"||e.m==="S02"});');
  a.run(XLSX_STUB + "exportExcelConsuntivoIT();");
  const rows = JSON.parse(a.run("JSON.stringify(__rows)"));
  const hdr = rows[0];
  assert.strictEqual(hdr[22], "% OCCUPAZIONE");                       // la colonna storica resta al suo posto
  assert.deepStrictEqual(hdr.slice(23), ["BDG PRE-MATRICE SUBSCRIPTION", "SUBSCRIPTION TARGET", "SUBSCRIPTION RISULTATO", "% RAGG. TARGET SUBSCRIPTION", "COEFF. SUBSCRIPTION", "RIDUZIONE SUBSCRIPTION", "COEFF. INVENTARI"]);
  const r1 = rows.find(r => r[3] === "S01");
  assert.strictEqual(r1[11], 300);                                    // BDG lordo gia' dopo la matrice
  assert.deepStrictEqual([r1[13], r1[14], r1[15]], [0, 0, 0]);        // Digital, SY, Privilege a zero
  assert.strictEqual(r1[23], 500);                                    // BDG pre-matrice
  assert.strictEqual(r1[27], 0.6);                                    // coefficiente
  assert.strictEqual(r1[28], 200);                                    // riduzione = 500 - 300
  // prima di gennaio 2027 il file e' quello di sempre
  const o = app_(2026, 12);
  o.run('E=E.filter(function(e){return e.m==="S01"});');
  o.run(XLSX_STUB + "exportExcelConsuntivoIT();");
  assert.strictEqual(JSON.parse(o.run("JSON.stringify(__rows)"))[0].length, 23);
});

test("Export Excel completo: stesse regole (colonne in coda), massimali Digital/SY/Privilege a 0", () => {
  const a = app_(2027, 1);
  a.run('E=E.filter(function(e){return e.m==="S01"});');
  a.run(XLSX_STUB + "exportExcel();");
  const rows = JSON.parse(a.run("JSON.stringify(__rows)"));
  const hdr = rows[0], r = rows[1];
  const ix = n => hdr.indexOf(n);
  assert.ok(ix("COEFF. SUBSCRIPTION") > ix("% OCCUPAZIONE"));
  assert.strictEqual(r[ix("RISULTATO PREMIO DIGITAL")], 0);
  assert.strictEqual(r[ix("MASSIMALE DIGITAL")], 0);
  assert.strictEqual(r[ix("MASSIMALE SHOPPER YIELD")], 0);
  assert.strictEqual(r[ix("MASSIMALE NUOVE PRIVILEGE")], 0);
  assert.strictEqual(r[ix("MASSIMALE BDG")], 500);
  assert.strictEqual(r[ix("COEFF. SUBSCRIPTION")], 0.6);
});

test("Export JSON statistiche: campi Subscription per negozio (solo dove la matrice vale)", () => {
  const a = app_(2027, 1);
  a.run('E=E.filter(function(e){return e.m==="S01"||e.m==="S07"});');
  a.run("exportStatsJsonStores()");
  const j = JSON.parse(a.lastBlobText());
  const byS = Object.fromEntries(j.rows.map(r => [r.sid, r]));
  assert.strictEqual(byS["1201"].subStatus, "applied");
  assert.ok(Math.abs(byS["1201"].subCoeff - 0.6) < 1e-9);
  assert.ok(Math.abs(byS["1201"].subRatio - 0.942) < 1e-3);
  assert.strictEqual(byS["1387"].subStatus, null);                    // Dept: matrice non applicabile
  assert.ok(j.columns.some(c => c.key === "subCoeff"));
});

test("Monitor: lo snapshot registra la riduzione Subscription (e Digital/SY/Privilege a 0)", () => {
  const a = app_(2027, 1);
  a.run('E=E.filter(function(e){return e.m==="S01"});');
  const s = JSON.parse(a.run("JSON.stringify(_buildMensileSnap())"));
  const emp = (s.employees || s)[0];
  assert.strictEqual(emp.sub_rid_eur, 200);
  assert.strictEqual(emp.rd_eur, 0);
  assert.strictEqual(emp.rs_eur, 0);
  assert.strictEqual(emp.rp_eur, 0);
});

test("schermate in modalita' 2027 (Calcolo, Dettaglio riga, Configurazione, Negozi, Fonti Dati, Analisi, Simulatore) si disegnano senza errori", () => {
  for (const mode of ["consuntivo", "preventivo"]) {
    const a = app_(2027, 1, mode);
    a.run('DEMOLT_RESULT_STORE={"1201":{pct:0.8}};VL={"S01":[{sid:"1201",amt:100}]};');
    a.run('["rC","rA","rT","rStores","rSources","rSimulatore"].forEach(function(f){try{window[f]&&window[f]()}catch(ex){throw new Error(f+": "+ex.message)}});');
    a.run('E.forEach(function(e){var r=gR(e);if(!Array.isArray(r))throw new Error("gR")});');
    assert.deepStrictEqual(a.errors, [], mode);
  }
  // la colonna Sub. compare solo da gen. 2027 in consuntivo e le colonne Digital/SY/Privilege spariscono
  const c = app_(2027, 1, "consuntivo");
  c.run("rC();");
  const html = c.run('document.getElementById("p0").innerHTML');
  assert.ok(/>Sub\.</.test(html));
  assert.ok(!/data-col="rd"|data-col="rs"|data-col="rp"/.test(html), "colonne ritirate nascoste");
  const old = app_(2026, 12, "consuntivo");
  old.run("rC();");
  const h2 = old.run('document.getElementById("p0").innerHTML');
  assert.ok(/data-col="rd"/.test(h2) && !/>Sub\.</.test(h2));
});

test("Configurazione 2027: card Matrice Subscription con le fasce e modifica fasce normalizzata", () => {
  const a = app_(2027, 1);
  a.run("rT();");
  const html = a.run('document.getElementById("p3").innerHTML');
  assert.ok(html.includes("Matrice Subscription"));
  assert.ok(html.includes('data-subc="0"') && html.includes('data-subf="1"'));
  assert.ok(html.includes("Nuova logica premi mensili"));
  // l'ultima fascia parte sempre da 0 e le fasce restano ordinate
  a.run('PARAMS.subBands=[{f:0.9,c:0.5},{f:0.995,c:1},{f:0.3,c:0.2}];_subNormalize();');
  assert.deepStrictEqual(JSON.parse(a.run("JSON.stringify(PARAMS.subBands)")), [{ f: 0.995, c: 1 }, { f: 0.9, c: 0.5 }, { f: 0, c: 0.2 }]);
});
