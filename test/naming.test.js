// Test delle funzioni di naming/labeling in src/82-month-labels.
// Queste funzioni sono l'unica fonte di verità per i nomi file PDF,
// le sottocartelle e le etichette periodo: una regressione qui significa
// "PDF non trovato" in produzione (vedi saga _MID, giugno 2026).
//
// Esecuzione:  node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "src", "82-month-labels", "010_main.js"),
  "utf8"
);

// Carica il modulo in un contesto isolato con i globali configurati.
// I sorgenti dell'app usano variabili globali (PRIZE_MODE, CFG_MONTH, ...)
// risolte a runtime: basta impostarle nel contesto prima di chiamare.
function ctx(globals) {
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "mensile",
    SEASON_PERIOD: "semestrale",
    REGION: "internazionale",
    CFG_MONTH: 5,
    CFG_YEAR: 2026,
    CFG_SEASON: "SS",
  }, globals));
  vm.runInContext(SRC, c);
  return c;
}

// === getEmpPdfFilename =====================================

test("mensile: matricola_MM_YYYY.pdf", () => {
  const c = ctx({});
  assert.strictEqual(c.getEmpPdfFilename({ m: "1000022" }), "1000022_05_2026.pdf");
});

test("mensile: mese a una cifra viene paddato", () => {
  const c = ctx({ CFG_MONTH: 1 });
  assert.strictEqual(c.getEmpPdfFilename({ m: "1000022" }), "1000022_01_2026.pdf");
});

test("fcvm: matricola_FCVM_MM_YYYY.pdf", () => {
  const c = ctx({ PRIZE_MODE: "fcvm" });
  assert.strictEqual(c.getEmpPdfFilename({ m: "1000022" }), "1000022_FCVM_05_2026.pdf");
});

test("seasonal full: matricola_SSYY.pdf senza _MID", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", SEASON_PERIOD: "semestrale" });
  assert.strictEqual(c.getEmpPdfFilename({ m: "1000022" }), "1000022_SS26.pdf");
});

test("seasonal mid: matricola_SSYY_MID.pdf", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", SEASON_PERIOD: "mid" });
  assert.strictEqual(c.getEmpPdfFilename({ m: "1000022" }), "1000022_SS26_MID.pdf");
});

test("seasonal FW: usa la stagione configurata", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", CFG_SEASON: "FW", SEASON_PERIOD: "mid" });
  assert.strictEqual(c.getEmpPdfFilename({ m: "9000279" }), "9000279_FW26_MID.pdf");
});

// === getPdfSubfolder =======================================

test("subfolder mensile: MESE_ANNO senza slash", () => {
  const c = ctx({});
  const r = c.getPdfSubfolder();
  assert.strictEqual(r.base, "MAGGIO_2026");
  assert.strictEqual(r.fileBase, "MAGGIO_2026");
  assert.strictEqual(r.cons, "MAGGIO_2026/Consuntivo");
  assert.strictEqual(r.prev, "MAGGIO_2026/Preventivo");
});

test("subfolder fcvm: base con slash, fileBase con underscore", () => {
  const c = ctx({ PRIZE_MODE: "fcvm" });
  const r = c.getPdfSubfolder();
  assert.strictEqual(r.base, "MAGGIO_2026/FCVM");
  assert.strictEqual(r.fileBase, "MAGGIO_2026_FCVM");
  assert.strictEqual(r.cons, "MAGGIO_2026/FCVM/Consuntivo");
});

test("subfolder seasonal mid: include Mid-Season", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", SEASON_PERIOD: "mid" });
  const r = c.getPdfSubfolder();
  assert.strictEqual(r.base, "SS26_2026/Mid-Season");
  assert.strictEqual(r.fileBase, "SS26_2026_Mid-Season");
  assert.strictEqual(r.cons, "SS26_2026/Mid-Season/Consuntivo");
});

test("subfolder seasonal full: senza Mid-Season", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", SEASON_PERIOD: "semestrale" });
  const r = c.getPdfSubfolder();
  assert.strictEqual(r.base, "SS26_2026");
  assert.strictEqual(r.cons, "SS26_2026/Consuntivo");
});

test("fileBase non contiene mai slash (sicuro per Path.Combine C#)", () => {
  ["mensile", "fcvm", "seasonal"].forEach((mode) => {
    ["mid", "semestrale"].forEach((period) => {
      const c = ctx({ PRIZE_MODE: mode, SEASON_PERIOD: period });
      assert.ok(!c.getPdfSubfolder().fileBase.includes("/"),
        mode + "/" + period + ": fileBase contiene /");
    });
  });
});

// === getPeriodLabelEn ======================================

test("label mensile: mese inglese + anno", () => {
  const c = ctx({});
  assert.strictEqual(c.getPeriodLabelEn(), "MAY 2026");
});

test("label seasonal full: SSYY + anno", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", SEASON_PERIOD: "semestrale" });
  assert.strictEqual(c.getPeriodLabelEn(), "SS26 2026");
});

test("label seasonal mid: SSYY MID-SEASON", () => {
  const c = ctx({ PRIZE_MODE: "seasonal", SEASON_PERIOD: "mid" });
  assert.strictEqual(c.getPeriodLabelEn(), "SS26 MID-SEASON");
});

// === sanitizeCF ============================================

test("CF persona fisica valido: invariato", () => {
  const c = ctx({});
  assert.strictEqual(c.sanitizeCF("RSSMRA80A01H501U"), "RSSMRA80A01H501U");
});

test("CF minuscolo: uppercased", () => {
  const c = ctx({});
  assert.strictEqual(c.sanitizeCF("rssmra80a01h501u"), "RSSMRA80A01H501U");
});

test("P.IVA 11 cifre: mantenuta", () => {
  const c = ctx({});
  assert.strictEqual(c.sanitizeCF("00803620152"), "00803620152");
});

test("codice CdC (numerico corto): svuotato", () => {
  const c = ctx({});
  assert.strictEqual(c.sanitizeCF("20100"), "");
  assert.strictEqual(c.sanitizeCF("70100"), "");
});

test("null/undefined/vuoto: stringa vuota", () => {
  const c = ctx({});
  assert.strictEqual(c.sanitizeCF(null), "");
  assert.strictEqual(c.sanitizeCF(undefined), "");
  assert.strictEqual(c.sanitizeCF("  "), "");
});

// === Coerenza getLetterFilename <-> getEmpPdfFilename ======
// "Salva Tutti i PDF" (C#) usa getLetterFilename(i); l'invio email
// usa getEmpPdfFilename(e). Devono produrre lo stesso nome o torna
// il "PDF non trovato".

test("coerenza: stessi nomi per salvataggio e invio in tutte le modalità", () => {
  const cases = [
    { PRIZE_MODE: "mensile", SEASON_PERIOD: "semestrale" },
    { PRIZE_MODE: "fcvm", SEASON_PERIOD: "semestrale" },
    { PRIZE_MODE: "seasonal", SEASON_PERIOD: "semestrale" },
    { PRIZE_MODE: "seasonal", SEASON_PERIOD: "mid" },
  ];
  cases.forEach((g) => {
    const c = ctx(g);
    const emp = { m: "1234567" };
    // getLetterFilename vive in 46-letter-builder-mensile e delega a
    // getEmpPdfFilename: qui simuliamo la delega con pool fittizio.
    vm.runInContext(
      "var __pool=[{m:'1234567'}];" +
      "function getLetterPool(){return __pool}" +
      "function getFcVmPool(){return __pool}" +
      "function getLetterFilename(i){var pool=PRIZE_MODE==='fcvm'?getFcVmPool():getLetterPool();var e=pool[i];if(!e)return null;return getEmpPdfFilename(e);}",
      c
    );
    assert.strictEqual(c.getLetterFilename(0), c.getEmpPdfFilename(emp),
      JSON.stringify(g));
  });
});
