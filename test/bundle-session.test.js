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

test("Carica sessione: un file che non e` una sessione viene rifiutato senza toccare i dati", () => {
  const app = loadBundle();
  app.run(SETUP);
  const before = app.run(SNAP);
  app.nextFileText = JSON.stringify({ qualcosa: 1 });
  app.run("loadSession({files:[{name:'altro.json'}],value:''})");
  assert.strictEqual(app.run(SNAP), before);
  assert.ok(app.alerts.some(a => /non è una sessione/i.test(a)));
});
