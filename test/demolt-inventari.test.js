// Test dell'import «INVENTARI + ACCURACY» (Coefficiente Inventari, da ottobre 2026):
// KPI negozio (completamento con regola WIC, accuracy), KPI FC (invio area al netto
// delle eccezioni, completamento), verifica incrociata delle schede e check «Q» errata.
// Le funzioni pure vivono in src/33-demolt-import.
//
// Esecuzione:  node --test

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "src", "33-demolt-import", "010_main.js"),
  "utf8"
);

function ctx() {
  const c = vm.createContext({
    CFG_YEAR: 2026, CFG_MONTH: 10, MODE: "consuntivo",
    FC_EMP: { M1: { m: "M1", n: "Mario", c: "Rossi", j: "FC" } },
    FC_MAP: { "1": { fc: "M1" }, "2": { fc: "M1" }, "3": { fc: "M1" }, "9": { fc: "M1" } },
    isUSA: (sid) => String(sid) === "9",
  });
  vm.runInContext(SRC, c);
  return c;
}
const run = (c, sh) => vm.runInContext("demoltProcessInventari", c)(sh);
const get = (c, name) => vm.runInContext(name, c);

const HN = ["Country Id", "Store Id", "Store Description", "Store Type", "Field Coach", "CycleCountType", "Accuracy ",
  "Working days ", "Sended tasks ", "Completed tasks ", "Sended tasks WIC corretti", "% DCC Executed corretta"];
// [store, desc, fc, type, acc, wd, sent, comp, fileU]
const neg = (rows) => [HN].concat(rows.map((r) => [210, r[0], r[1], "Boggi Street", r[2], r[3], r[4], r[5], r[6], r[7], null, r[8]]));
const HF = ["Field Coach", "Working days ", "Sended tasks ", "Completed tasks ", "% DCC Executed ",
  "Eccezioni FC senza END OF SEASON RETURNS", "% DCC Sent corretta"];
const HE = ["Exception Day", "Country Id", "Store Id", "Store Description", "Store Type", "Field Coach", "Inventory Reason"];

test("negozio DCC: completamento = completed/sended, accuracy dal file", () => {
  const c = ctx();
  const r = run(c, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 15, 15, 15, 1]]) });
  assert.strictEqual(r.nStore, 1);
  const s = get(c, "DEMOLT_RESULT_STORE")["1"];
  assert.strictEqual(s.compl, 1);
  assert.strictEqual(s.pct, 1); // ≥90% × ≥98%
});

test("negozio WIC: denominatore fisso 4, tetto al 100%", () => {
  const c = ctx();
  run(c, { negozi: neg([
    ["1", "A", "MARIO ROSSI", "WIC", 0.99, 4, 3, 3, 0.75],   // 3/4
    ["2", "B", "MARIO ROSSI", "WIC", 0.99, 8, 8, 5, 1],      // 5/4 → 100%
  ]) });
  const st = get(c, "DEMOLT_RESULT_STORE");
  assert.strictEqual(st["1"].compl, 0.75);
  assert.strictEqual(st["2"].compl, 1);
});

test("negozio senza task inviati (#DIV/0! nel file) o senza Accuracy: nessun risultato, segnalato", () => {
  const c = ctx();
  const r = run(c, { negozi: neg([
    ["1", "A", "MARIO ROSSI", "DCC", 0.99, 0, 0, 0, "#ERR"],
    ["2", "B", "MARIO ROSSI", "DCC", "-", 15, 15, 0, 0],
  ]) });
  assert.strictEqual(r.nStore, 0);
  assert.ok(r.items.some((i) => /senza task inviati/.test(i.t)));
  assert.ok(r.items.some((i) => /senza Accuracy/.test(i.t)));
});

test("colonna «% DCC Executed corretta» del file diversa dal ricalcolo → errore", () => {
  const c = ctx();
  const r = run(c, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 15, 10, 5, 0.9]]) });
  const it = r.items.find((i) => /Executed corretta/.test(i.t));
  assert.strictEqual(it.lvl, "err");
});

test("negozi USA esclusi dal coefficiente e dall'aggregato FC", () => {
  const c = ctx();
  run(c, { negozi: neg([
    ["1", "A", "MARIO ROSSI", "DCC", 0.99, 10, 10, 10, 1],
    ["9", "NY", "MARIO ROSSI", "DCC", 0.9, 10, 10, 0, 0],
  ]) });
  assert.ok(!get(c, "DEMOLT_RESULT_STORE")["9"]);
  assert.strictEqual(get(c, "DEMOLT_RESULT_FC")["M1"].compl, 1); // 10/10, USA fuori
});

test("FC: invio = sended / (working days − eccezioni), EOS RETURNS non conta, tetto 100%", () => {
  const c = ctx();
  const ecc = [HE,
    ["2026-10-01", 210, 1, "A", "x", "MARIO ROSSI", "STAFF"],
    ["2026-10-02", 210, 1, "A", "x", "MARIO ROSSI", "STAFF"],
    ["2026-10-03", 210, 2, "B", "x", "MARIO ROSSI", "END OF SEASON RETURNS"], // escluso
  ];
  // wd 20, sent 18, eccezioni 2 → 18/18 = 100%; senza sottrazione sarebbe 90%
  run(c, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 10, 9, 9, 1], ["2", "B", "MARIO ROSSI", "DCC", 0.99, 10, 9, 8, 8 / 9]]), ecc });
  const f = get(c, "DEMOLT_RESULT_FC")["M1"];
  assert.strictEqual(f.invio, 1);
  assert.ok(Math.abs(f.compl - 17 / 18) < 1e-9);
});

test("Matrice FC: colonna Q errata (=Sended/(Eccezioni+Sended)) segnalata, totali coerenti", () => {
  const c = ctx();
  const negozi = neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 45, 39, 35, 35 / 39]]);
  // Q del file = 100% con 0 eccezioni, ma 39/45 = 86,7%
  const fc = [HF, ["MARIO ROSSI", 45, 39, 35, 35 / 39, 0, 1]];
  const r = run(c, { negozi, fc, ecc: [HE] });
  assert.strictEqual(r.items.find((i) => /Sent corretta/.test(i.t)).lvl, "warn");
  assert.strictEqual(r.items.find((i) => /totali = somma/.test(i.t)).lvl, "ok");
  assert.ok(Math.abs(get(c, "DEMOLT_RESULT_FC")["M1"].invio - 39 / 45) < 1e-9);
});

test("Matrice FC: totali diversi dalla somma dei negozi → errore", () => {
  const c = ctx();
  const negozi = neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 45, 39, 35, 35 / 39]]);
  const fc = [HF, ["MARIO ROSSI", 45, 40, 35, 35 / 40, 0, 40 / 45]];
  const r = run(c, { negozi, fc, ecc: [HE] });
  assert.strictEqual(r.items.find((i) => /totali = somma/.test(i.t)).lvl, "err");
});

test("un nuovo import sostituisce il precedente", () => {
  const c = ctx();
  run(c, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 10, 10, 10, 1]]) });
  run(c, { negozi: neg([["2", "B", "MARIO ROSSI", "DCC", 0.99, 10, 10, 10, 1]]) });
  assert.deepStrictEqual(Object.keys(get(c, "DEMOLT_RESULT_STORE")), ["2"]);
});

test("colonne obbligatorie mancanti → errore esplicito", () => {
  const c = ctx();
  const r = run(c, { negozi: [["Foo", "Bar"], [1, 2]] });
  assert.ok(r.error);
});
