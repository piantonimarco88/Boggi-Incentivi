// Test salvataggio PDF singolo dal Calcolo Premi (src/98-outlook-bridge): risoluzione cartella e messaggio all'exe.
//
// Esecuzione:  node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "98-outlook-bridge", "010_main.js"), "utf8");
const BS = "\\";

function ctx(g) {
  const posted = [], listeners = [], alerts = [];
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "mensile", MODE: "consuntivo", CFG_PDF_PATH: "", CFG_MONTH: 9, CFG_YEAR: 2026, CFG_SEASON: "SS",
    SEASON_PERIOD: "semestrale", E: [{ m: "0012345", n: "MARIO", ps: "NO" }], FC_EMP: {},
    getPdfSubfolder: () => ({ prev: "output/Preventivo", cons: "output/Consuntivo/09_2026" }),
    getEmpPdfFilename: e => e.m + "_09_2026.pdf", canProduceLetter: () => [], esc: s => String(s),
    alert: m => alerts.push(m),
    document: { getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild() {} } },
    setTimeout: () => 0,
    window: { chrome: { webview: { postMessage: m => posted.push(m), addEventListener: (t, f) => listeners.push(f), removeEventListener() {} } } },
  }, g));
  vm.runInContext(SRC, c);
  // il generatore PDF reale usa html2canvas: lo sostituiamo con un blob finto
  c._empLetterPdfBlob = (e, cb) => cb({});
  c.FileReader = function () { this.readAsDataURL = () => this.onload({ target: { result: "data:application/pdf;base64,QUJD" } }); };
  c.__posted = posted; c.__alerts = alerts; c.__listeners = listeners;
  return c;
}

const SUB = ["output", "Consuntivo", "09_2026"].join(BS);

test("con percorso PDF configurato salva nella sottocartella consuntivo", () => {
  const c = ctx({ CFG_PDF_PATH: "C:" + BS + "Boggi" + BS });
  vm.runInContext("saveOneEmployeePdf('0012345')", c);
  const m = c.__posted.find(x => x.type === "saveFileBase64");
  assert.ok(m);
  assert.strictEqual(m.folderPath, "C:" + BS + "Boggi" + BS + SUB);
  assert.strictEqual(m.fileName, "0012345_09_2026.pdf");
  assert.strictEqual(m.fileBase64, "QUJD");
});

test("senza cartella nota chiede la cartella e poi salva", () => {
  const c = ctx({});
  vm.runInContext("saveOneEmployeePdf('0012345')", c);
  assert.strictEqual(c.__posted[0].type, "selectPdfFolder");
  c.__listeners[c.__listeners.length - 1]({ data: "folderSelected:D:" + BS + "PDF" });
  const m = c.__posted.find(x => x.type === "saveFileBase64");
  assert.strictEqual(m.folderPath, "D:" + BS + "PDF" + BS + SUB);
});

test("cartella già usata con Salva Tutti i PDF viene riusata senza chiedere", () => {
  const c = ctx({});
  c._pdfSaveBaseFolder = "E:" + BS + "Out";
  vm.runInContext("saveOneEmployeePdf('0012345')", c);
  assert.strictEqual(c.__posted.filter(x => x.type === "selectPdfFolder").length, 0);
  assert.strictEqual(c.__posted.find(x => x.type === "saveFileBase64").folderPath, "E:" + BS + "Out" + BS + SUB);
});

test("premio sospeso: nessun salvataggio", () => {
  const c = ctx({ E: [{ m: "1", n: "A", ps: "SI" }], CFG_PDF_PATH: "C:" + BS + "X" });
  vm.runInContext("saveOneEmployeePdf('1')", c);
  assert.strictEqual(c.__posted.length, 0);
  assert.strictEqual(c.__alerts.length, 1);
});
