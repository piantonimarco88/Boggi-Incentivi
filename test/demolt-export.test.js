// Export «Dati per Statistiche» (schemaVersion 3): campi del Coefficiente Inventari.
// Esecuzione:  node --test

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = (d) => fs.readFileSync(path.join(__dirname, "..", "src", d, "010_main.js"), "utf8");

function ctx(globals) {
  let out = null;
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "fcvm", CFG_YEAR: 2026, CFG_MONTH: 10, MODE: "consuntivo", REGION: "international",
    FC_EMP: {}, FC_MAP: {}, FC_TARGETS: {}, FC_RESULTS: {}, FC_SYLY: {},
    FC_STORE_FLAGS: {}, FC_PREV_RESULTS: {}, FC_OVERRIDES: {}, FC_AREA_SAS: {}, ENTE_CU: {}, VL: {}, D: { t: {}, c: {}, vl: {} },
    FCVM_PARAMS: { soglia100: 0.995, soglia60: 0.95, pct60: 0.60 },
    sickMult: () => 1, E: [], MONTHLY_SYLY: {},
    isUSA: () => false, isD: () => false, isRidottoStore: () => false,
    getMonthYearLabel: () => "OTTOBRE 2026", _sessionFileTag: () => "t",
    // _downloadJson è definita in 92-render-calcolo: si intercetta il JSON passato al Blob.
    Blob: function (parts) { out = JSON.parse(parts[0]); },
    URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
    document: { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } },
    setTimeout: () => {}, JSON: JSON, alert: () => {},
    Math: Math, Object: Object, Array: Array, String: String, isNaN: isNaN, Date: Date,
  }, globals));
  vm.runInContext(src("50-params"), c);
  vm.runInContext(src("33-demolt-import"), c);
  vm.runInContext(src("70-fcvm-calc"), c);
  vm.runInContext(src("92-render-calcolo"), c);
  c.__out = () => out;
  return c;
}

test("FC: export con coefficiente applicato (premio area prima/dopo), VM = na", () => {
  const c = ctx({});
  c.FC_EMP = {
    F1: { m: "F1", n: "ANNA", c: "ROSSI", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] },
    V1: { m: "V1", n: "LUCA", c: "BIANCHI", j: "VM", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] },
  };
  c.FC_MAP = { "500": { fc: ["F1"], vm: ["V1"] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 105000 } };
  c.DEMOLT_RESULT_FC = { F1: { pct: 0.75, invio: 0.9, compl: 0.85 } };
  c.exportStatsJsonFcvm();
  const p = c.__out();
  assert.strictEqual(p.meta.schemaVersion, 3);
  const f = p.rows.find((r) => r.role === "FC"), v = p.rows.find((r) => r.role === "VM");
  assert.strictEqual(f.demoltStatus, "applied");
  assert.strictEqual(f.demoltPct, 0.75);
  assert.strictEqual(f.premioAreaPre, 1000);
  assert.strictEqual(f.premioAreaPost, 750);
  assert.strictEqual(v.demoltStatus, "na");
  assert.strictEqual(v.demoltPct, null);
});

test("FC: senza risultato inventari = nodata; prima di ottobre 2026 = null", () => {
  const c = ctx({});
  c.FC_EMP = { F1: { m: "F1", n: "ANNA", c: "ROSSI", j: "FC", ib: 1000, cu: "EUR", ex: 1, ps: "NO", ml: 0, bdg_stores: [] } };
  c.FC_MAP = { "500": { fc: ["F1"], vm: [] } };
  c.FC_TARGETS = { "500": { to_eur: 100000 } };
  c.FC_RESULTS = { "500": { sc_eur: 105000 } };
  c.exportStatsJsonFcvm();
  assert.strictEqual(c.__out().rows[0].demoltStatus, "nodata");
  c.CFG_MONTH = 9;
  c.exportStatsJsonFcvm();
  assert.strictEqual(c.__out().rows[0].demoltStatus, null);
});

test("Negozi: applied (SM/VSM con risultato), nodata (SM senza risultato), na (nessun SM/VSM)", () => {
  const info = { active: true, to: 1000, base: 900, pct: 0.9, sasv: 0, recognized: 0, used: 0, reserveIn: 0, reserveOut: 0, pctMatrix: null };
  const c = ctx({
    PRIZE_MODE: "mensile", storeSasInfo: () => info, PARAMS: { bdg100: 1 }, isD: () => false,
    E: [
      { si: "1001", s: "A", j: "SM", ex: 1 },
      { si: "1002", s: "B", j: "VSM", ex: 1 },
      { si: "1003", s: "C", j: "SSA", ex: 1 },
    ],
  });
  c.DEMOLT_RESULT_STORE = { "1001": { pct: 0.8, compl: 0.91, acc: 0.97 }, "1003": { pct: 0.5, compl: 0.5, acc: 0.5 } };
  c.exportStatsJsonStores();
  const p = c.__out();
  assert.strictEqual(p.meta.schemaVersion, 3);
  const by = (sid) => p.rows.find((r) => r.sid === sid);
  assert.strictEqual(by("1001").demoltStatus, "applied");
  assert.strictEqual(by("1001").demoltPct, 0.8);
  assert.strictEqual(by("1001").demoltAcc, 0.97);
  assert.strictEqual(by("1002").demoltStatus, "nodata");
  assert.strictEqual(by("1002").demoltPct, null);
  assert.strictEqual(by("1003").demoltStatus, "na"); // SSA: il coefficiente non si applica
  assert.strictEqual(by("1003").demoltPct, null);
});
