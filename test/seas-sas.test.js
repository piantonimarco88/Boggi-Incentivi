// Test SAS → fatturato esteso al Seasonal Bonus (da SS26).
// Funzioni pure in src/50-params: seasSasPeriodActive, seasSasFullFileActive,
// seasSasEligible, seasSasAddon. Una regressione qui falsa il fatturato
// stagionale usato per Scost.%/boost, tab Calcolo Premi e lettere.
//
// Esecuzione:  node --test

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "src", "50-params", "010_main.js"),
  "utf8"
);

function ctx(globals) {
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "seasonal", CFG_YEAR: 2026, CFG_SEASON: "SS", MODE: "consuntivo",
    STORE_FLAGS: {}, D: { cs: {} },
  }, globals));
  vm.runInContext(SRC, c);
  return c;
}

// === Gating periodo: da SS26 in poi =========================

test("non attivo: FW25 (prima di SS26)", () => {
  assert.strictEqual(ctx({ CFG_SEASON: "FW", CFG_YEAR: 2025 }).seasSasPeriodActive(), false);
});
test("attivo: SS26 (stagione di transizione)", () => {
  assert.strictEqual(ctx({ CFG_SEASON: "SS", CFG_YEAR: 2026 }).seasSasPeriodActive(), true);
});
test("attivo: FW26 e oltre", () => {
  assert.strictEqual(ctx({ CFG_SEASON: "FW", CFG_YEAR: 2026 }).seasSasPeriodActive(), true);
  assert.strictEqual(ctx({ CFG_SEASON: "SS", CFG_YEAR: 2027 }).seasSasPeriodActive(), true);
});

// === Gating file singolo: da FW26 in poi (SS26 resta a due file) ===========

test("SS26: due file (matrice), non file singolo", () => {
  assert.strictEqual(ctx({ CFG_SEASON: "SS", CFG_YEAR: 2026 }).seasSasFullFileActive(), false);
});
test("FW26: file singolo già calcolato", () => {
  assert.strictEqual(ctx({ CFG_SEASON: "FW", CFG_YEAR: 2026 }).seasSasFullFileActive(), true);
});
test("SS27: file singolo (dopo FW26)", () => {
  assert.strictEqual(ctx({ CFG_SEASON: "SS", CFG_YEAR: 2027 }).seasSasFullFileActive(), true);
});

// === Eleggibilità negozio: solo dove il KPI seasonal SAS è attivo ==========

test("eligible di default (nessun flag)", () => {
  assert.strictEqual(ctx({}).seasSasEligible("1001"), true);
});
test("non eligible: negozio con flag noSas", () => {
  const c = ctx({ STORE_FLAGS: { "1001": { noSas: true } } });
  assert.strictEqual(c.seasSasEligible("1001"), false);
});

// === Addon: somma Luglio+Agosto (SS26) vs valore singolo (FW26+) ===========

test("SS26: somma sasSeasJulRec + sasSeasAugRec, nessun cap", () => {
  const c = ctx({
    CFG_SEASON: "SS", CFG_YEAR: 2026,
    D: { cs: { "1001": { sasSeasJulRec: 500, sasSeasAugRec: 300 } } },
  });
  assert.strictEqual(c.seasSasAddon("1001"), 800);
});
test("SS26: un solo mese caricato → somma parziale", () => {
  const c = ctx({
    CFG_SEASON: "SS", CFG_YEAR: 2026,
    D: { cs: { "1001": { sasSeasJulRec: 500 } } },
  });
  assert.strictEqual(c.seasSasAddon("1001"), 500);
});
test("FW26: usa sasSeasFull (valore già calcolato), ignora Jul/Aug", () => {
  const c = ctx({
    CFG_SEASON: "FW", CFG_YEAR: 2026,
    D: { cs: { "1001": { sasSeasFull: 1200, sasSeasJulRec: 500, sasSeasAugRec: 300 } } },
  });
  assert.strictEqual(c.seasSasAddon("1001"), 1200);
});
test("zero se periodo non attivo (prima di SS26)", () => {
  const c = ctx({
    CFG_SEASON: "FW", CFG_YEAR: 2025,
    D: { cs: { "1001": { sasSeasJulRec: 500, sasSeasAugRec: 300 } } },
  });
  assert.strictEqual(c.seasSasAddon("1001"), 0);
});
test("zero se negozio non eligible (noSas), anche con dati importati", () => {
  const c = ctx({
    CFG_SEASON: "SS", CFG_YEAR: 2026,
    STORE_FLAGS: { "1001": { noSas: true } },
    D: { cs: { "1001": { sasSeasJulRec: 500, sasSeasAugRec: 300 } } },
  });
  assert.strictEqual(c.seasSasAddon("1001"), 0);
});
test("zero se nessun dato importato per il negozio", () => {
  assert.strictEqual(ctx({ D: { cs: {} } }).seasSasAddon("1001"), 0);
});
