// Test inserimento manuale dipendente (src/36-manual-employee): validazioni, struttura riga E / FC_EMP+FC_MAP,
// rimozione e riapplicazione dopo un re-import.
//
// Esecuzione:  node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "36-manual-employee", "010_main.js"), "utf8");
const NUM = fs.readFileSync(path.join(__dirname, "..", "src", "32-import-xlsx", "010_main.js"), "utf8");
const parseNumSrc = NUM.slice(NUM.indexOf("function parseNum"), NUM.indexOf("// === LOAD ANAGRAFICA FROM EXCEL"));

function ctx(g, fields) {
  const dom = {};
  Object.keys(fields || {}).forEach(k => { dom[k] = { value: fields[k], setAttribute() {}, getAttribute() { return null; } }; });
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "mensile", REGION: "italia", SEASON_PERIOD: "semestrale",
    E: [], D: { t: {}, s: {}, e: null, vl: {} }, VL: {}, AGG: {}, AGG_FCVM: {},
    FC_EMP: {}, FC_MAP: {}, ENTE_FC: {}, SEAS_TARGETS: {},
    ENTE_CU: { "209": { cu: "CHF", ex: 1.3756 }, "213": { cu: "EUR", ex: 1 } },
    isD: () => false, esc: s => String(s == null ? "" : s), sanitizeCF: s => String(s || "").toUpperCase(),
    syncFcExRates() {}, updateHeaderCount() {},
    document: { getElementById: id => dom[id] || null },
  }, g));
  vm.runInContext(parseNumSrc, c);
  vm.runInContext(SRC, c);
  c.__dom = dom;
  return c;
}

test("Italia: aggiunge riga E con i campi dell'import", () => {
  const c = ctx({}, { manM: "12345", manC: "rossi", manN: "mario", manJ: "SA", manSi: "1201", manS: "MILANO CORSO", manIb: "2.500,00", manRl: "", manMp: "m.r@boggi.com", manCf: "rssmra80a01h501z" });
  c.D.t["1201"] = { nm: "x" };
  assert.strictEqual(vm.runInContext("_manSaveE()", c), true);
  const e = c.E[0];
  assert.strictEqual(e.m, "0012345");
  assert.strictEqual(e.s, "1201 MILANO CORSO");
  assert.strictEqual(e.c, "ROSSI");
  assert.strictEqual(e.ib, 2500);
  assert.strictEqual(e.en, 210);
  assert.strictEqual(e.cu, "EUR");
  assert.strictEqual(e.man, 1);
  assert.ok(c.D.s["1201"]);
});

test("matricola duplicata e store sconosciuto senza nome vengono rifiutati", () => {
  const c = ctx({}, { manM: "12345", manC: "A", manN: "B", manJ: "SA", manSi: "1201", manS: "", manIb: "100" });
  assert.strictEqual(vm.runInContext("_manSaveE()", c), false); // store sconosciuto, nome mancante
  c.__dom.manS.value = "NEGOZIO";
  assert.notStrictEqual(vm.runInContext("_manSaveE()", c), false);
  assert.strictEqual(vm.runInContext("_manSaveE()", c), false); // duplicata
});

test("senza target caricato restituisce l'avviso", () => {
  const c = ctx({}, { manM: "1", manC: "A", manN: "B", manJ: "SA", manSi: "1201", manS: "N", manIb: "100" });
  const r = vm.runInContext("_manSaveE()", c);
  assert.strictEqual(typeof r, "string");
  assert.match(r, /target/);
});

test("Internazionale: richiede ente e stipendio, applica valuta", () => {
  const f = { manM: "ABC1", manC: "A", manN: "B", manJ: "SM", manSi: "55", manS: "ZURICH", manEn: "", manRl: "5000", manIb: "300" };
  const c = ctx({ REGION: "international" }, f);
  assert.strictEqual(vm.runInContext("_manSaveE()", c), false);
  c.__dom.manEn.value = "209";
  assert.notStrictEqual(vm.runInContext("_manSaveE()", c), false);
  assert.strictEqual(c.E[0].cu, "CHF");
  assert.strictEqual(c.E[0].ex, 1.3756);
  assert.strictEqual(c.E[0].m, "ABC1");
});

test("Seasonal: store > 4999 escluso in Italia", () => {
  const c = ctx({ PRIZE_MODE: "seasonal" }, { manM: "1", manC: "A", manN: "B", manJ: "SM", manSi: "5200", manS: "N", manIb: "100" });
  assert.strictEqual(vm.runInContext("_manSaveE()", c), false);
});

test("FC+VM: AREA su più store, rimozione e riapplicazione dopo re-import", () => {
  const c = ctx({ PRIZE_MODE: "fcvm", FC_MAP: { "10": { fc: ["X1"], vm: [], s: "DIECI", tipo: "AREA" } }, FC_EMP: { X1: { m: "X1", c: "C", n: "N", j: "FC" } } },
    { manM: "F9", manC: "bianchi", manN: "anna", manJ: "FC", manTipo: "AREA", manStores: "10, 11 11", manIb: "1500", manCu: "EUR", manMp: "A@B.COM" });
  vm.runInContext("_manSaveFcvm()", c);
  assert.strictEqual(c.FC_EMP.F9.ib, 1500);
  assert.deepStrictEqual(Array.from(c.FC_MAP["10"].fc), ["X1", "F9"]);
  assert.deepStrictEqual(Array.from(c.FC_MAP["11"].fc), ["F9"]);
  // re-import: FC_EMP/FC_MAP azzerati, il manuale viene riapplicato
  const manual = [c.FC_EMP.F9];
  c.FC_EMP = {}; c.FC_MAP = {};
  assert.strictEqual(vm.runInContext("manEmpReapplyFcvm", c)(manual), 1);
  assert.deepStrictEqual(Array.from(c.FC_MAP["11"].fc), ["F9"]);
  // rimozione
  c.confirm = () => true; c.rC = c.rA = c.rSources = c.rT = c.autoSave = () => {};
  vm.runInContext("manEmpRemove('F9')", c);
  assert.strictEqual(c.FC_EMP.F9, undefined);
  assert.deepStrictEqual(Array.from(c.FC_MAP["11"].fc), []);
});

test("FC+VM: BDG usa il premio per ogni store e non valorizza ib d'area", () => {
  const c = ctx({ PRIZE_MODE: "fcvm" }, { manM: "F8", manC: "A", manN: "B", manJ: "VM", manTipo: "BDG", manStores: "30,31", manIb: "400", manCu: "EUR" });
  vm.runInContext("_manSaveFcvm()", c);
  assert.strictEqual(c.FC_EMP.F8.ib, 0);
  assert.strictEqual(c.FC_EMP.F8.bdg_stores.length, 2);
  assert.strictEqual(c.FC_EMP.F8.bdg_stores[0].ib, 400);
  assert.strictEqual(c.FC_MAP["30"].tipo, "BDG");
});

test("E: re-import mantiene i manuali la cui matricola non è nel file", () => {
  const c = ctx({});
  c.E.push({ m: "NEW", si: 7, man: 1 }, { m: "DUP", si: 7, man: 1 });
  const manual = c.E.filter(e => e.man);
  c.E.length = 0;
  c.E.push({ m: "DUP", si: 7 });
  assert.strictEqual(vm.runInContext("manEmpReapplyE", c)(manual), 1);
  assert.strictEqual(c.E.length, 2);
});
