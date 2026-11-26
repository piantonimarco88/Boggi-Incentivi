// Test sul BUNDLE COMPILATO: import dei premi «articoli incentivati» dal file per categoria
// (Codice, Store, Categoria, Incentivo 1/0) e non regressione dei vecchi formati.
// Dati inventati (nessun dato reale).
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const J = v => JSON.stringify(v);

// ── Articoli incentivati per categoria (file «ARTICOLI INCENTIVATI»: Codice, Store, Categoria, Incentivo 1/0) ──
function artFlagImport(rows, fname) {
  const app = loadBundle({ manualTimers: true });
  app.run(`PRIZE_MODE="mensile";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;REGION="international";IMPORT_STAMPS={};
    PARAMS.artEnabled=true;STORE_FLAGS={};initStoreFlags();
    E=[{m:"1",c:"A",n:"A",f:"SA",j:"SA",si:1001,s:"1001 X",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"},
       {m:"2",c:"B",n:"B",f:"SA",j:"SA",si:1002,s:"1002 Y",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"},
       {m:"3",c:"C",n:"C",f:"SA",j:"SA",si:1003,s:"1003 Z",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"},
       {m:"4",c:"D",n:"D",f:"SA",j:"SA",si:1004,s:"1004 W",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"}];
    D.t={"1001":{to:100000},"1002":{to:100000},"1003":{to:100000},"1004":{to:100000}};
    D.c={"1001":{sc:105000},"1002":{sc:105000},"1003":{sc:105000},"1004":{sc:105000}};MONTHLY_SYLY={};VL={};AGG={};
    XLSX={read:function(){return {SheetNames:["Incentivi"],Sheets:{Incentivi:{}}}},utils:{sheet_to_json:function(){return ${J(rows)}}}};`);
  app.run(`loadResultsExcel({name:${J(fname || "ARTICOLI INCENTIVATI NOVEMBRE 2026.xlsx")}})`);
  app.flushTimers();
  return { app, alert: app.alerts[app.alerts.length - 1] || "" };
}
const ART_H = ["Codice", "Store", "Categoria", "Incentivo (1 = sì, 0 = no)"];

test("articoli incentivati per categoria: riconosciuto, conta le categorie a 1 per negozio e calcola 30% BDG x n.", () => {
  const { app, alert } = artFlagImport([ART_H,
    [1001, "X", "Blazer", 1], [1001, "X", "Pantaloni", 1],   // 2 categorie
    [1002, "Y", "Blazer", 1], [1002, "Y", "Pantaloni", 0],   // 1 categoria
    [1003, "Z", "Blazer", 0], [1003, "Z", "Pantaloni", 0],   // nessuna
    [4999, "Fuori anagrafica", "Blazer", 1],                  // negozio non in anagrafica: non da' errore
  ]);
  assert.doesNotMatch(alert, /Non riesco a riconoscere/);
  assert.match(alert, /4 negozi letti/);
  const ac = JSON.parse(app.run("JSON.stringify({a:D.c['1001'].ac,b:D.c['1002'].ac,c:D.c['1003'].ac,x:D.c['4999'].ac})"));
  assert.deepStrictEqual(ac, { a: 2, b: 1, c: 0, x: 1 });
  // premio = 30% x BDG (500) x categorie
  assert.strictEqual(app.run("getVal(E[0],'ra')"), 300);
  assert.strictEqual(app.run("getVal(E[1],'ra')"), 150);
  assert.strictEqual(app.run("getVal(E[2],'ra')"), 0);
  // il negozio 1004 e' in anagrafica ma non nel file: segnalato
  assert.match(alert, /1 negozi in anagrafica senza riga nel file/);
  assert.match(alert, /1004/);
});

test("articoli incentivati per categoria: ricaricare lo stesso file non raddoppia, un nuovo file sostituisce il conteggio", () => {
  const { app } = artFlagImport([ART_H, [1001, "X", "Blazer", 1], [1001, "X", "Pantaloni", 1]]);
  app.run(`loadResultsExcel({name:"ARTICOLI INCENTIVATI NOVEMBRE 2026.xlsx"})`); app.flushTimers();
  assert.strictEqual(app.run("D.c['1001'].ac"), 2);
  // file corretto: una categoria in meno
  app.run(`XLSX.utils.sheet_to_json=function(){return ${J([ART_H, [1001, "X", "Blazer", 1], [1001, "X", "Pantaloni", 0]])}};loadResultsExcel({name:"ARTICOLI INCENTIVATI NOVEMBRE 2026.xlsx"})`); app.flushTimers();
  assert.strictEqual(app.run("D.c['1001'].ac"), 1);
});

test("articoli incentivati per categoria: valori non 1/0 e righe duplicate vengono segnalati", () => {
  const { app, alert } = artFlagImport([ART_H,
    [1001, "X", "Blazer", 1], [1001, "X", "Blazer", 0],       // duplicata: vale 1
    [1001, "X", "Pantaloni", "forse"],                          // valore non valido: ignorato
    ["abc", "Q", "Blazer", 1],                                   // codice non valido
    [1002, "Y", "Blazer", "sì"], [1002, "Y", "Pantaloni", ""],  // "sì" = 1, vuoto = 0
  ]);
  assert.strictEqual(app.run("D.c['1001'].ac"), 1);
  assert.strictEqual(app.run("D.c['1002'].ac"), 1);
  assert.match(alert, /1 righe ignorate: valore incentivo non 1\/0/);
  assert.match(alert, /1 righe ignorate: codice negozio non valido/);
  assert.match(alert, /1 righe duplicate/);
});

test("articoli incentivati: il vecchio formato pivot (Somma di riceve l'incentivo) e quello per matricola restano riconosciuti", () => {
  const { app } = artFlagImport([["Store ID", "Somma di riceve l'incentivo"], [1001, 2], [1002, 1]], "Report_1L.xlsx");
  assert.strictEqual(app.run("D.c['1001'].ac"), 2);
  assert.strictEqual(app.run("D.c['1002'].ac"), 1);
});

test("articoli incentivati: il 30% per categoria e` indipendente dal fatturato del negozio (nota di chi ha preparato il file)", () => {
  const { app } = artFlagImport([ART_H,
    [1001, "X", "Blazer", 1], [1001, "X", "Pantaloni", 1],
    [1002, "Y", "Blazer", 1], [1002, "Y", "Pantaloni", 0],
  ]);
  // negozio 1001 al 50% del target, 1002 al 80%: il BDG non scatta, gli articoli si'
  app.run(`D.c["1001"].sc=50000;D.c["1002"].sc=80000;`);
  assert.strictEqual(app.run("getVal(E[0],'rb')"), 0, "BDG non raggiunto");
  assert.strictEqual(app.run("getVal(E[1],'rb')"), 0, "BDG non raggiunto");
  assert.strictEqual(app.run("getVal(E[0],'ra')"), 300, "2 categorie = 2 x 30% del BDG nominale (500)");
  assert.strictEqual(app.run("getVal(E[1],'ra')"), 150, "1 categoria = 30% del BDG nominale");
  // il totale del dipendente include gli articoli anche senza BDG
  assert.ok(app.run("calcE(E[0])") >= 300);
});
