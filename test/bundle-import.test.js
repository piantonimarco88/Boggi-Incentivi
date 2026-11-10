// Test sul BUNDLE COMPILATO: riconoscimento colonne/fogli, mese dei file, riepilogo
// controlli dopo l'import e abbinamento delle vendite personali USA.
// Dati inventati (nessun dato reale).
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const J = v => JSON.stringify(v);

test("hdrFind: i candidati si provano in ordine (il piu` specifico vince anche se piu` a destra)", () => {
  const app = loadBundle();
  // prima: vinceva la prima colonna da sinistra che conteneva un candidato qualsiasi
  assert.strictEqual(app.run(`hdrFind(${J(["digital sales", "% digital"])},["% digital","digital"])`), 1);
  // intestazione identica preferita a quella che la contiene soltanto
  assert.strictEqual(app.run(`hdrFind(${J(["sy target", "sy"])},["sy"])`), 1);
  assert.strictEqual(app.run(`hdrFind(${J(["a", "b"])},["zz"])`), -1);
});

test("hdrFind: con colonne LY e CY affiancate sceglie l'anno configurato", () => {
  const app = loadBundle();
  app.run("CFG_YEAR=2026;HDR_NOTES=[];");
  assert.strictEqual(app.run(`hdrFind(${J(["store id", "cr 2025", "cr 2026"])},["cr 20","cr_20","cr "])`), 2);
  assert.strictEqual(app.run(`hdrFind(${J(["sy gross ly", "sy gross"])},["sy gross"])`), 1);
  assert.strictEqual(app.run(`hdrFind(${J(["sy gross py", "sy gross cy"])},["sy gross"])`), 1);
  assert.strictEqual(app.run("HDR_NOTES.length"), 0);
  // a parita` resta la prima, ma la scelta viene annotata
  assert.strictEqual(app.run(`hdrFind(${J(["tot sales a", "tot sales b"])},["tot sales"])`), 0);
  assert.match(app.run("HDR_NOTES[0]"), /trovate 2 colonne/);
});

test("hdrFind: skip esclude le colonne indicate (es. forecast)", () => {
  const app = loadBundle();
  assert.strictEqual(app.run(`hdrFind(${J(["fcst store id", "store id"])},["store id"],{skip:["fcst"]})`), 1);
});

test("sheetForMonth: nome del mese o numero isolato, mai dentro l'anno", () => {
  const app = loadBundle();
  assert.strictEqual(app.run(`sheetForMonth(${J(["Gennaio 2026", "Febbraio 2026"])},2)`), "Febbraio 2026");
  // prima "02" veniva trovato dentro "2026" e vinceva l'ultimo foglio
  assert.strictEqual(app.run(`sheetForMonth(${J(["Report 2026", "Altro 2026"])},2)`), null);
  assert.strictEqual(app.run(`sheetForMonth(${J(["Dati", "02-2026", "03-2026"])},2)`), "02-2026");
  assert.strictEqual(app.run(`sheetForMonth(${J(["Sheet1", "November"])},11)`), "November");
});

test("monthFromName: mese dal nome del file", () => {
  const app = loadBundle();
  const m = n => app.run(`monthFromName(${J(n)})`);
  assert.strictEqual(m("Incentivi_consuntivo_AGOSTO_2026 ITA.xlsx"), 8);
  assert.strictEqual(m("FCVM_08_2026 INT.xlsx"), 8);
  assert.strictEqual(m("2026.08 TESTATA INCENTIVI FC+VM.xlsx"), 8);
  assert.strictEqual(m("DATI W31-34 + accuracy.xlsx"), 0);
  assert.strictEqual(m("target_2026.xlsx"), 0);
  assert.strictEqual(m("confronto marzo aprile.xlsx"), 0); // ambiguo
});

test("riepilogo controlli: file di un altro mese, dati caricati in un mese precedente, duplicati, negozi senza target", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;IMPORT_STAMPS={};
    E=[{m:"A1",si:1201,ps:"NO",cu:"EUR"},{m:"A1",si:1201,ps:"NO",cu:"EUR"},{m:"A2",si:1299,ps:"NO",cu:"EUR"}];
    D.t={"1201":{to:100}};D.c={"1201":{sc:90}};`);
  // inventari caricati a ottobre e mai ricaricati
  app.run(`importDone("inventari","Inventari + Accuracy","DATI W31-34.xlsx","ok");CFG_MONTH=11;IMPORT_STAMPS.inventari.m=10;`);
  // consuntivo con il nome di agosto mentre il mese configurato e` novembre
  const msg = app.run(`importDone("cons_bdg_results","Consuntivo negozi","Incentivi_consuntivo_AGOSTO_2026.xlsx","Consuntivo caricato")`);
  assert.match(msg, /^Consuntivo caricato/);
  assert.match(msg, /sembra di Agosto, il mese configurato è Novembre 2026/);
  assert.match(msg, /«Inventari \+ Accuracy» è stato caricato quando il mese configurato era Ottobre 2026: se è cambiato mese, ricarica il file\./);
  assert.match(msg, /1 matricole duplicate in anagrafica: A1/);
  assert.match(msg, /1 negozi con dipendenti ma senza target di fatturato: 1299/);
  // riquadro in Fonti Dati
  assert.match(app.run("importChecksBoxHtml()"), /Controlli sui dati caricati/);
});

test("riepilogo controlli: nessun avviso se tutto e` coerente", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=8;IMPORT_STAMPS={};
    E=[{m:"A1",si:1201,ps:"NO",cu:"EUR"}];D.t={"1201":{to:100}};D.c={"1201":{sc:90}};`);
  const msg = app.run(`importDone("cons","Consuntivo","Incentivi_consuntivo_AGOSTO_2026.xlsx","ok")`);
  assert.strictEqual(msg, "ok");
  assert.strictEqual(app.run("importChecksBoxHtml()"), "");
});

// Import completo di un file «vendite personali USA» con un workbook finto
function usaImport(rows) {
  const app = loadBundle({ manualTimers: true });
  app.run(`PRIZE_MODE="mensile";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;REGION="international";
    E=[{m:"U1",c:"SMITH",n:"JOHN",si:1321,cu:"USD",ps:"NO"},{m:"U2",c:"SMITH",n:"ANNA",si:1322,cu:"USD",ps:"NO"},
       {m:"U3",c:"BROWN",n:"MARY",si:1321,cu:"USD",ps:"NO"},{m:"U4",c:"DOE",n:"JANE",si:1323,cu:"USD",ps:"NO"}];
    D.usa={};
    XLSX={read:function(){return {SheetNames:["Sales"],Sheets:{Sales:{}}}},utils:{sheet_to_json:function(){return ${J(rows)}}}};`);
  app.run("loadResultsExcel({name:'usa_sales_nov_2026.xlsx'})");
  app.flushTimers();
  return { app, usa: JSON.parse(app.run("JSON.stringify(D.usa)")), alert: app.alerts[app.alerts.length - 1] || "" };
}
const H = ["employee id", "employee last name", "employee first name", "store", "gross sales"];

test("vendite USA: nome diverso + cognome con omonimi nello stesso negozio -> non abbinata e segnalata", () => {
  const { usa, alert } = usaImport([H,
    ["x1", "SMITH", "J.", 1321, "1,234.56"],   // cognome SMITH: U1 a 1321, U2 a 1322 -> unico nel negozio 1321
    ["x2", "SMITH", "A.", 1999, "500"],        // negozio senza SMITH -> nessun abbinamento
    ["x3", "BROWN", "MARY", 1321, "$2,000"],   // esatto
  ]);
  assert.strictEqual(usa.U1.ps, 1234.56, "SMITH unico nel negozio 1321 -> U1, numero in formato USA");
  assert.strictEqual(usa.U3.ps, 2000);
  assert.strictEqual(usa.U2, undefined, "SMITH ANNA (1322) non deve ricevere vendite");
  assert.match(alert, /Vendite Personali USA: 2 dipendenti/);
});

test("vendite USA: senza colonna negozio il cognome deve essere unico tra tutti i dipendenti USA", () => {
  const { usa, alert } = usaImport([["employee id", "employee last name", "employee first name", "gross sales"],
    ["x1", "SMITH", "J.", "100"],   // 2 SMITH in anagrafica -> ambiguo
    ["x2", "DOE", "J.", "300"],     // un solo DOE -> abbinato
  ]);
  assert.strictEqual(usa.U1, undefined);
  assert.strictEqual(usa.U2, undefined);
  assert.strictEqual(usa.U4.ps, 300);
  assert.match(alert, /1 righe NON abbinate perché ambigue.*SMITH J\./s);
});

test("vendite USA: Employee ID uguale alla matricola ha la precedenza", () => {
  const { usa } = usaImport([H, ["U2", "SMITH", "X", 1321, "700"]]);
  assert.strictEqual(usa.U2.ps, 700);
  assert.strictEqual(usa.U1, undefined);
});
