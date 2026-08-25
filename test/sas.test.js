// Test della nuova logica SAS (da luglio 2026): gating, matrice
// accettazione×velocità, valore riconosciuto, riserva separata col cap-al-100%.
// Le funzioni pure vivono in src/50-params. Una regressione qui falsa i premi BDG.
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
    PRIZE_MODE: "mensile", CFG_YEAR: 2026, CFG_MONTH: 7, MODE: "consuntivo",
  }, globals));
  vm.runInContext(SRC, c);
  return c;
}

// === Gating: solo mensile + FC+VM, da luglio 2026 ==========

test("attivo: mensile luglio 2026", () => {
  assert.strictEqual(ctx({}).sasNewActive(), true);
});
test("non attivo: giugno 2026 (vecchia policy)", () => {
  assert.strictEqual(ctx({ CFG_MONTH: 6 }).sasNewActive(), false);
});
test("attivo: gennaio 2027", () => {
  assert.strictEqual(ctx({ CFG_MONTH: 1, CFG_YEAR: 2027 }).sasNewActive(), true);
});
test("non attivo: seasonal (mai)", () => {
  assert.strictEqual(ctx({ PRIZE_MODE: "seasonal" }).sasNewActive(), false);
});
test("attivo: fcvm luglio 2026", () => {
  assert.strictEqual(ctx({ PRIZE_MODE: "fcvm" }).sasNewActive(), true);
});

// === Il vecchio gate 70% di giugno è stato rimosso =========

test("sasZeroByAcc sempre false (gate giugno rimosso)", () => {
  assert.strictEqual(ctx({}).sasZeroByAcc({ si: 1 }), false);
});
test("sasAccActive sempre false (gate giugno rimosso)", () => {
  assert.strictEqual(ctx({}).sasAccActive(), false);
});

// === Matrice: corrisponde allo screenshot di esempio =======

test("matrice: acc≥90 × vel≥90 = 100%", () => {
  assert.strictEqual(ctx({}).sasMatrixPct(0.95, 0.95), 1.00);
});
test("matrice: acc<70 × vel<70 = 0%", () => {
  assert.strictEqual(ctx({}).sasMatrixPct(0.50, 0.50), 0.00);
});
test("matrice: acc 80-90 × vel 70-80 = 65%", () => {
  assert.strictEqual(ctx({}).sasMatrixPct(0.85, 0.75), 0.65);
});
test("matrice: acc 70-80 × vel ≥90 = 70%", () => {
  assert.strictEqual(ctx({}).sasMatrixPct(0.75, 0.95), 0.70);
});
test("matrice: confine 90% incluso nella fascia alta", () => {
  assert.strictEqual(ctx({}).sasMatrixPct(0.90, 0.90), 1.00);
});
test("matrice: dato mancante → null", () => {
  assert.strictEqual(ctx({}).sasMatrixPct(null, 0.9), null);
  assert.strictEqual(ctx({}).sasMatrixPct(0.9, undefined), null);
});
test("matrice: soglie fasce editabili cambiano il lookup", () => {
  const c = ctx({});
  c.SAS_MATRIX.accBands = [0.75, 0.85, 0.95]; // bassa→alta
  // acc 0.92 ora ricade sotto 0.95 → fascia 2 (80-90); vel 0.95 → colonna 3 → grid[2][3]=0.85
  assert.strictEqual(c.sasMatrixPct(0.92, 0.95), 0.85);
});

// === Valore riconosciuto ====================================

test("riconosciuto: 65% di 10.000 = 6.500", () => {
  assert.strictEqual(ctx({}).sasRecognizedValue(0.85, 0.75, 10000), 6500);
});
test("riconosciuto: valore SAS nullo → 0", () => {
  assert.strictEqual(ctx({}).sasRecognizedValue(0.95, 0.95, 0), 0);
});
test("riconosciuto: dato accettazione mancante → 0", () => {
  assert.strictEqual(ctx({}).sasRecognizedValue(null, 0.95, 10000), 0);
});

// === Riserva separata, cap al 100% del target ===============

test("riserva: gap parziale, avanzo accantonato", () => {
  // target 100k, base 96k, riconosciuto 6k → usa 4k (cap), avanza 2k
  const r = ctx({}).sasReserveCalc(96000, 100000, 6000, 0);
  assert.strictEqual(r.used, 4000);
  assert.strictEqual(r.num, 100000);
  assert.strictEqual(r.reserveOut, 2000);
});
test("riserva: negozio già a target, tutto il SAS si accantona", () => {
  const r = ctx({}).sasReserveCalc(100000, 100000, 6000, 0);
  assert.strictEqual(r.used, 0);
  assert.strictEqual(r.reserveOut, 6000);
  assert.strictEqual(r.num, 100000);
});
test("riserva: SAS insufficiente a colmare il gap, nessun avanzo", () => {
  const r = ctx({}).sasReserveCalc(90000, 100000, 3000, 0);
  assert.strictEqual(r.used, 3000);
  assert.strictEqual(r.reserveOut, 0);
  assert.strictEqual(r.num, 93000);
});
test("riserva: quella del mese precedente copre il gap per prima e scade (non si accumula)", () => {
  // gap 4000: la riserva (5000) lo copre da sola -> used=4000 tutto da reserveIn.
  // Il riconosciuto (1000) resta intatto e diventa l'INTERO riporto al mese dopo,
  // la riserva vecchia residua (1000) non si riporta: scade.
  const r = ctx({}).sasReserveCalc(96000, 100000, 1000, 5000);
  assert.strictEqual(r.avail, 6000);
  assert.strictEqual(r.used, 4000);
  assert.strictEqual(r.reserveOut, 1000);
});
test("riserva: esempio reale Covello (ago 2026) — riporto = solo il riconosciuto non usato", () => {
  // gap 10.574 interamente coperto dalla riserva 23.799 (avanzata) -> reserveOut
  // deve essere il riconosciuto del mese (18.397), non 31.622 come dava la vecchia formula.
  const r = ctx({}).sasReserveCalc(384517, 395091, 18397, 23799);
  assert.strictEqual(r.used, 10574);
  assert.strictEqual(r.reserveOut, 18397);
  assert.strictEqual(r.num, 395091);
});
test("riserva: base oltre target, gap 0, tutto accantonato", () => {
  const r = ctx({}).sasReserveCalc(105000, 100000, 6000, 0);
  assert.strictEqual(r.gap, 0);
  assert.strictEqual(r.used, 0);
  assert.strictEqual(r.reserveOut, 6000);
});
