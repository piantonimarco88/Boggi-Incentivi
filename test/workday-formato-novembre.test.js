// Test sul BUNDLE COMPILATO: import anagrafica Workday estero, formato di novembre 2026
// (riga 1 = banner "Salary Plan Assignments", intestazioni alla riga 2, "Cost Center - ID" + "Cost Center - Name").
// Dati inventati (nessun dato reale).
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
const { loadBundle } = require("../build/bundle-harness");

const HDR = ["Employee ID", "Worker", "First Name", "Last Name", "Primary Job Title", "Company", "Cost Center - ID", "Cost Center - Name",
  "Time Type", "FTE", "Hire Date", "Termination Date - All", "Emails", "Prorated Monthly Salary", "Currency", "Frequency",
  "Budget Amount", "Budget Currency", "Budget Frequency"];
const row = (id, last, first, job, cc, ccName) => [id, first + " " + last, first, last, job, "BOGGI FRANCE SARL", cc, ccName,
  "Full time", 1, "2020-01-10", null, first.toLowerCase() + "@example.com (" + first + ")", 2000, "EUR", "Monthly", 300, "EUR", "Monthly"];

function importa(aoa, header1) {
  const app = loadBundle({ manualTimers: true });
  const dir = path.join(__dirname, "..", "src", "vendor-xlsx");
  app.run(fs.readFileSync(path.join(dir, fs.readdirSync(dir).filter(f => /^010_/.test(f))[0]), "utf8"));
  app.run(`PRIZE_MODE="mensile";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;REGION="international";
    var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(${JSON.stringify(aoa)}),"Worker Job Details");
    var __buf=XLSX.write(wb,{type:"array",bookType:"xlsx"});`);
  app.nextFileText = app.run("__buf");
  app.run("loadAnagraficaExcel({name:'estero.xlsx'})");
  app.flushTimers();
  return {
    app,
    imp: JSON.parse(app.run("JSON.stringify(window._pendingImport||[])")),
    err: JSON.parse(app.run("JSON.stringify(window._pendingErrors||[])")),
  };
}

test("Workday novembre: banner alla riga 1 e Cost Center - ID/Name -> si importa", () => {
  const { app, imp, err } = importa([
    ["", "", "Salary Plan Assignments"], HDR,
    row("6000001", "Rossi", "Anna", "SM", "1103", "CRANS"),
    row("6000002", "Bianchi", "Luca", "ASM", "1104", "GENEVA"),
    row("6000003", "Verdi", "Gina", "SSA", "D001-09", "DEPT"),          // centro di costo non di negozio
    row("6000004", "Neri", "Pia", "VISUAL MERCHANDISER", "1103", "CRANS"), // ruolo non di negozio
  ]);
  assert.deepStrictEqual(app.alerts, []);
  assert.deepStrictEqual(imp.map(e => [e.m, e.si, e.j, e.en]), [["6000001", 1103, "SM", 215], ["6000002", 1104, "VSM", 215]]);
  assert.strictEqual(imp[0].s, "1103 CRANS");
  assert.strictEqual(err.length, 2);
});

test("Workday ottobre: intestazione alla riga 1 e Cost Center unico continua a funzionare", () => {
  const hdr = HDR.filter(h => h !== "Cost Center - Name").map(h => h === "Cost Center - ID" ? "Cost Center" : h);
  const r = row("6000001", "Rossi", "Anna", "SM", "1103 CRANS", "");
  r.splice(7, 1);
  const { imp } = importa([hdr, r]);
  assert.strictEqual(imp.length, 1);
  assert.strictEqual(imp[0].si, 1103);
  assert.strictEqual(imp[0].s, "1103 CRANS");
});
