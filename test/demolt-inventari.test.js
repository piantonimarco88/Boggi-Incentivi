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

test("negozio: completamento e accuracy letti direttamente dal file (nessun ricalcolo)", () => {
  const c = ctx();
  // completed/sended = 15/15 = 100%, ma il file dice 0.85 → si usa 0.85
  const r = run(c, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 15, 15, 15, 0.85]]) });
  assert.strictEqual(r.nStore, 1);
  const s = get(c, "DEMOLT_RESULT_STORE")["1"];
  assert.strictEqual(s.compl, 0.85);
  assert.strictEqual(s.acc, 0.99);
  assert.strictEqual(s.pct, 0.9); // compl 70-90% x acc ≥98%
});

test("negozio WIC: si usa il valore del file, anche se i task non tornano", () => {
  const c = ctx();
  run(c, { negozi: neg([
    ["1", "A", "MARIO ROSSI", "WIC", 0.99, 4, 3, 3, 0.75],
    ["2", "B", "MARIO ROSSI", "WIC", 0.99, 8, 8, 5, 1],
  ]) });
  const st = get(c, "DEMOLT_RESULT_STORE");
  assert.strictEqual(st["1"].compl, 0.75);
  assert.strictEqual(st["2"].compl, 1);
});

test("negozio con % DCC Executed errore/vuota (#DIV/0!) o senza Accuracy: nessun risultato, segnalato", () => {
  const c = ctx();
  const r = run(c, { negozi: neg([
    ["1", "A", "MARIO ROSSI", "DCC", 0.99, 0, 0, 0, "#ERR"],
    ["2", "B", "MARIO ROSSI", "DCC", "-", 15, 15, 0, 0],
  ]) });
  assert.strictEqual(r.nStore, 0);
  assert.ok(r.items.some((i) => /senza «% DCC Executed corretta»/.test(i.t)));
  assert.ok(r.items.some((i) => /senza Accuracy/.test(i.t)));
});

test("colonna «% DCC Executed corretta» mancante → errore esplicito", () => {
  const c = ctx();
  const r = run(c, { negozi: [["Store Id", "Accuracy"], [1, 0.99]] });
  assert.ok(r.error);
});

test("negozi USA esclusi dal coefficiente", () => {
  const c = ctx();
  run(c, { negozi: neg([
    ["1", "A", "MARIO ROSSI", "DCC", 0.99, 10, 10, 10, 1],
    ["9", "NY", "MARIO ROSSI", "DCC", 0.9, 10, 10, 0, 0],
  ]) });
  assert.ok(!get(c, "DEMOLT_RESULT_STORE")["9"]);
});

test("FC: invio = «% DCC Sent corretta» e completamento = «% DCC Executed» letti dalla Matrice FC", () => {
  const c = ctx();
  const negozi = neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 68, 34, 25, 25 / 34]]);
  // come Scalisi: M = 73,53%, Q = 94,44% (valore del file, preso così com'è)
  const fc = [HF, ["MARIO ROSSI", 68, 34, 25, 0.7353, 2, 0.9444]];
  const r = run(c, { negozi, fc });
  assert.strictEqual(r.nFc, 1);
  const f = get(c, "DEMOLT_RESULT_FC")["M1"];
  assert.strictEqual(f.invio, 0.9444);
  assert.strictEqual(f.compl, 0.7353);
  assert.strictEqual(f.pct, 0.6); // invio 80-95% x completamento <80%
});

test("FC: area interamente USA → nessun coefficiente; FC assente dalla scheda → avviso", () => {
  const c = ctx();
  const negozi = neg([["9", "NY", "MARIO ROSSI", "DCC", 0.9, 10, 10, 10, 1]]);
  const fc = [HF, ["MARIO ROSSI", 10, 10, 10, 1, 0, 1]];
  assert.strictEqual(run(c, { negozi, fc }).nFc, 0);
  const c2 = ctx();
  const r2 = run(c2, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 10, 10, 10, 1]]), fc: [HF, ["ALTRO NOME", 10, 10, 10, 1, 0, 1]] });
  assert.strictEqual(r2.nFc, 0);
  assert.ok(r2.items.some((i) => /non trovati nella Matrice FC/.test(i.t)));
});

test("FC: % mancante/errore nella Matrice FC → nessuna riduzione, segnalato", () => {
  const c = ctx();
  const r = run(c, { negozi: neg([["1", "A", "MARIO ROSSI", "DCC", 0.99, 10, 10, 10, 1]]), fc: [HF, ["MARIO ROSSI", 10, 10, 10, "#ERR", 0, 1]] });
  assert.strictEqual(r.nFc, 0);
  assert.ok(r.items.some((i) => /% mancante/.test(i.t)));
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
