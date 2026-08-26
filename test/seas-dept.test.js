// Test Dept Store seasonal (Selfridges, KaDeWe, NK, El Corte Inglés...): prima
// (fino a v9.55) calcSeasonal pagava sempre BDG×6×1,5 incondizionato, mai
// confrontato con target/consuntivo (segnalato dall'utente 25/08/2026, esempio
// reale SANGIORGIO EDOARDO). v9.56: paracadute a doppia soglia come il BDG
// mensile. v9.60: rimosso il 60% ridotto su richiesta esplicita — soglia unica
// bianco/nero (PARAMS.bdg100, ≥99,5%), Turnover Target e QTY indipendenti.
//
// Esecuzione:  node --test

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC_PARAMS = fs.readFileSync(path.join(__dirname, "..", "src", "50-params", "010_main.js"), "utf8");
const SRC_SEAS = fs.readFileSync(path.join(__dirname, "..", "src", "41-seas-calc", "010_main.js"), "utf8");

function ctx(globals) {
  const c = vm.createContext({
    MODE: "consuntivo", STORE_FLAGS: {}, CFG_SEASON: "SS", CFG_YEAR: 2026,
  });
  vm.runInContext(SRC_PARAMS, c); // definisce il proprio SEAS_TARGETS di default (200+ negozi reali)
  vm.runInContext(SRC_SEAS, c);
  // Applicati DOPO il caricamento: "var SEAS_TARGETS=..." negli script sovrascriverebbe
  // qualunque valore passato prima (store id di test come "1319" collidono col dataset
  // di default reale — va rimpiazzato in-place, non alla creazione del context).
  Object.assign(c, { MODE: "consuntivo", SEAS_TARGETS: {}, D: { cs: {} } }, globals);
  return c;
}

test("target e QTY entrambi raggiunti (≥99,5%) → premio pieno su entrambe le sezioni", () => {
  const c = ctx({
    SEAS_TARGETS: { "1319": { to: 100000, qt: 1000 } },
    D: { cs: { "1319": { sc: 100500, qc: 1005 } } },
  });
  const info = c.calcSeasonalDeptInfo({ si: "1319", ib: 4000 });
  assert.strictEqual(info.bdg6, 24000);
  assert.strictEqual(info.qty6, 12000);
  assert.strictEqual(info.toMult, 1);
  assert.strictEqual(info.qtyMult, 1);
  assert.strictEqual(info.tot, 36000);
});

test("target fatturato mancato (<95%), QTY raggiunto → solo QTY pagato", () => {
  const c = ctx({
    SEAS_TARGETS: { "1319": { to: 100000, qt: 1000 } },
    D: { cs: { "1319": { sc: 80000, qc: 1000 } } },
  });
  const info = c.calcSeasonalDeptInfo({ si: "1319", ib: 4000 });
  assert.strictEqual(info.toMult, 0);
  assert.strictEqual(info.bdg6Earned, 0);
  assert.strictEqual(info.qtyMult, 1);
  assert.strictEqual(info.qty6Earned, 12000);
  assert.strictEqual(info.tot, 12000);
});

test("target fatturato sotto soglia (95-99,5%, ex fascia paracadute) → zero, non 60% ridotto", () => {
  const c = ctx({
    SEAS_TARGETS: { "1319": { to: 100000, qt: 1000 } },
    D: { cs: { "1319": { sc: 96000, qc: 0 } } },
  });
  const info = c.calcSeasonalDeptInfo({ si: "1319", ib: 4000 });
  assert.strictEqual(info.toPct, 0.96);
  assert.strictEqual(info.toMult, 0); // niente più 60% ridotto: soglia unica bianco/nero
  assert.strictEqual(info.bdg6Earned, 0);
  assert.strictEqual(info.qtyMult, 0); // 0 pezzi su target 1000
});

test("nessun target caricato (0) → nessuna sezione paga (non incondizionato)", () => {
  const c = ctx({
    SEAS_TARGETS: {},
    D: { cs: {} },
  });
  const info = c.calcSeasonalDeptInfo({ si: "9999", ib: 4000 });
  assert.strictEqual(info.toMult, 0);
  assert.strictEqual(info.qtyMult, 0);
  assert.strictEqual(info.tot, 0);
});

test("preventivo: sempre il massimo potenziale (150%), indipendente dal consuntivo", () => {
  const c = ctx({
    MODE: "preventivo",
    SEAS_TARGETS: { "1319": { to: 100000, qt: 1000 } },
    D: { cs: { "1319": { sc: 0, qc: 0 } } },
  });
  const info = c.calcSeasonalDeptInfo({ si: "1319", ib: 4000 });
  assert.strictEqual(info.toMult, 1);
  assert.strictEqual(info.qtyMult, 1);
  assert.strictEqual(info.tot, 36000);
});

test("esubero fatturato mese prec. incluso nel confronto turnover (coerente coi negozi normali)", () => {
  const c = ctx({
    SEAS_TARGETS: { "1319": { to: 100000, qt: 0 } },
    D: { cs: { "1319": { sc: 96000, es: 4000, qc: 0 } } },
  });
  const info = c.calcSeasonalDeptInfo({ si: "1319", ib: 4000 });
  assert.strictEqual(info.toActual, 100000); // 96000 + 4000 esubero
  assert.strictEqual(info.toMult, 1);
  assert.strictEqual(info.bdg6Earned, 24000);
});

test("calcSeasonal(e) per isD delega a calcSeasonalDeptInfo (stessa fonte tabella/lettera)", () => {
  const c = ctx({
    SEAS_TARGETS: { "1319": { to: 100000, qt: 1000 } },
    D: { cs: { "1319": { sc: 100500, qc: 1005 } } },
  });
  c.isD = function (sid) { return String(sid) === "1319"; };
  const val = c.calcSeasonal({ si: "1319", ib: 4000 });
  assert.strictEqual(val, 36000);
});
