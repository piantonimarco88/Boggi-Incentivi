// Test d'integrazione: iniezione SAS nel motore FC+VM (calcFcVmPremio).
// Verifica che il valore SAS riconosciuto del negozio concorra al fatturato
// verso il target (area aggregata e BDG singolo negozio), con cap al 100%.
//
// Esecuzione:  node --test

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PARAMS_SRC = fs.readFileSync(path.join(__dirname, "..", "src", "50-params", "010_main.js"), "utf8");
const FCVM_SRC = fs.readFileSync(path.join(__dirname, "..", "src", "70-fcvm-calc", "010_main.js"), "utf8");

// Contesto isolato con i globali FC+VM stubbati.
function fcCtx(globals) {
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "fcvm", CFG_YEAR: 2026, CFG_MONTH: 7, MODE: "consuntivo",
    FC_EMP: {}, FC_MAP: {}, FC_TARGETS: {}, FC_RESULTS: {}, FC_SYLY: {},
    FC_STORE_FLAGS: {}, FC_PREV_RESULTS: {}, FC_OVERRIDES: {}, FC_AREA_SAS: {}, ENTE_CU: {}, VL: {}, D: {},
    FCVM_PARAMS: { soglia100: 0.995, soglia60: 0.95, pct60: 0.60 },
    sickMult: function () { return 1; },
    Math: Math, Object: Object, Array: Array, String: String, isNaN: isNaN,
  }, globals));
  vm.runInContext(PARAMS_SRC, c);
  vm.runInContext(FCVM_SRC, c);
  return c;
}

// === Area aggregata =========================================

test("area: SAS colma il gap e porta a target → premio pieno", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 96000 } };
  // Dato SAS aggregato per l'AREA del field coach vive in FC_AREA_SAS[matricola],
  // non in FC_RESULTS[negozio] (quello è per-negozio, usato solo dai bdg_stores extra).
  // acc 0.85 × vel 0.75 → 65% di 10.000 = 6.500 riconosciuti; gap 4.000 → usa 4.000
  c.FC_AREA_SAS = { F1: { acc: 0.85, vel: 0.75, sasv_eur: 10000 } };
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.totSasUsed, 4000);
  assert.strictEqual(r.totCons, 100000);
  assert.strictEqual(r.pct, 1);
  assert.strictEqual(r.esito, "full");
  assert.strictEqual(r.premio, 1000);
  assert.strictEqual(r.totSasReserveOut, 2500); // 6500 - 4000
});

test("area: prima di luglio nessun SAS (gating)", () => {
  const c = fcCtx({ CFG_MONTH: 6 });
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 96000 } };
  c.FC_AREA_SAS = { F1: { acc: 0.85, vel: 0.75, sasv_eur: 10000 } };
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.totSasUsed, 0);
  assert.strictEqual(r.totCons, 96000);
  assert.strictEqual(Math.round(r.pct * 100) / 100, 0.96);
});

test("area: SAS non spinge oltre il 100% (avanzo tutto a riserva)", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 100000 } };
  // area già a target: tutto il SAS riconosciuto (100% di 8000) si accantona
  c.FC_AREA_SAS = { F1: { acc: 0.95, vel: 0.95, sasv_eur: 8000 } };
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.totSasUsed, 0);
  assert.strictEqual(r.totCons, 100000);
  assert.strictEqual(r.totSasReserveOut, 8000);
});

test("area: la riserva del mese precedente copre il gap e scade, non si accumula", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 96000 } };
  // gap 4.000: la riserva del mese prima (7.000) lo copre da sola -> used=4.000 da reserveIn.
  // Il riconosciuto di quest'area (3.000) resta intatto e diventa l'intero riporto,
  // i 3.000 di riserva vecchia residua NON si riportano: scadono.
  c.FC_AREA_SAS = { F1: { acc: 0.85, vel: 0.75, sasv_eur: 3000 / 0.65, sasr_eur: 7000 } };
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(Math.round(r.totSasRec), 3000);
  assert.strictEqual(r.totSasUsed, 4000);
  assert.strictEqual(r.totCons, 100000);
  assert.strictEqual(r.totSasReserveOut, 3000);
});

test("area: l'esubero fatturato colma il gap PRIMA del SAS — se basta da solo, il SAS non si tocca", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 90000 } };
  // esubero mese prec. dell'area: 15000 (surplus del negozio 500 sul mese prima) — da solo
  // già colma il gap di 10000 verso il target di questo mese, il SAS non dovrebbe servire.
  c.FC_PREV_RESULTS = { "500": { to_eur: 80000, sc_eur: 95000 } }; // surplus = 95000-80000 = 15000
  c.FC_AREA_SAS = { F1: { acc: 0.95, vel: 0.95, sasv_eur: 8000 } }; // recognized 8000, tutto disponibile
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.totEsubero, 15000);
  assert.strictEqual(r.totSasUsed, 0); // SAS NON consumato: l'esubero da solo bastava
  assert.strictEqual(r.totSasReserveOut, 8000); // tutto il riconosciuto preservato per il mese dopo
  assert.strictEqual(r.totConsWithEsub, 105000); // 90000 (invariato, +0 SAS) + 15000 esubero
  assert.strictEqual(Math.round(r.pct * 1000) / 1000, 1.05);
});

test("area: se l'esubero non basta, il SAS colma solo il gap residuo", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 90000 } };
  // esubero 4000: non basta da solo (gap 10000) — il SAS deve colmare il resto (6000)
  c.FC_PREV_RESULTS = { "500": { to_eur: 80000, sc_eur: 84000 } }; // surplus = 4000
  c.FC_AREA_SAS = { F1: { acc: 0.95, vel: 0.95, sasv_eur: 8000 } }; // recognized 8000
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.totEsubero, 4000);
  assert.strictEqual(r.totSasUsed, 6000); // gap residuo dopo l'esubero (10000-4000)
  assert.strictEqual(r.totSasReserveOut, 2000); // 8000 riconosciuto - 6000 usato
  assert.strictEqual(r.totConsWithEsub, 100000); // target raggiunto esatto
});

// === BDG singolo negozio ====================================

test("bdg negozio: SAS porta a 100% → premio BDG erogato (≥ da luglio)", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 0, cu: "EUR", ex: 1, ps: "NO", ml: 0,
    bdg_stores: [{ sid: "600", s: "Store X", ib: 500 }] } };
  c.FC_MAP = {};
  c.FC_TARGETS = { "600": { to_eur: 50000 } };
  // acc 0.95 × vel 0.95 → 100% di 5000 = 5000; gap 2000 → usa 2000 → scTot 50000 = target
  c.FC_RESULTS = { "600": { sc_eur: 48000, acc: 0.95, vel: 0.95, sasv_eur: 5000 } };
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.bdgDetail.length, 1);
  assert.strictEqual(r.bdgDetail[0].sasUsed, 2000);
  assert.strictEqual(r.bdgDetail[0].scTotale, 50000);
  assert.strictEqual(r.bdgDetail[0].earned, true);
  assert.strictEqual(r.bdgPrize, 500);
});

test("bdg negozio: senza SAS sufficiente resta sotto target → niente premio", () => {
  const c = fcCtx({});
  c.FC_EMP = { F1: { m: "F1", j: "FC", ib: 0, cu: "EUR", ex: 1, ps: "NO", ml: 0,
    bdg_stores: [{ sid: "600", s: "Store X", ib: 500 }] } };
  c.FC_MAP = {};
  c.FC_TARGETS = { "600": { to_eur: 50000 } };
  // acc 0.50 × vel 0.50 → 0% riconosciuto; resta a 45.000
  c.FC_RESULTS = { "600": { sc_eur: 45000, acc: 0.50, vel: 0.50, sasv_eur: 5000 } };
  const r = c.calcFcVmPremio("F1");
  assert.strictEqual(r.bdgDetail[0].sasUsed, 0);
  assert.strictEqual(r.bdgDetail[0].earned, false);
  assert.strictEqual(r.bdgPrize, 0);
});
