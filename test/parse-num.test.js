// Test parseNum (src/32-import-xlsx): lettura di numeri scritti come testo negli Excel.
// Regola italiana: punto = migliaia, virgola = decimali; i formati misti usano
// l'ultimo separatore come decimale.
//
// Esecuzione:  node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "32-import-xlsx", "010_main.js"), "utf8");
const parseNumSrc = SRC.slice(SRC.indexOf("function parseNum"), SRC.indexOf("// === LOAD ANAGRAFICA FROM EXCEL"));
const c = vm.createContext({});
vm.runInContext(parseNumSrc, c);
const p = v => vm.runInContext("parseNum(" + JSON.stringify(v) + ")", c);

test("numeri gia` numerici passano invariati", () => {
  assert.strictEqual(p(1234.56), 1234.56);
  assert.strictEqual(p(0), 0);
  assert.strictEqual(p(-5), -5);
});

test("vuoti e testo non numerico = 0", () => {
  assert.strictEqual(p(""), 0);
  assert.strictEqual(p(null), 0);
  assert.strictEqual(p("n.d."), 0);
  assert.strictEqual(p("0"), 0);
});

test("solo punto: migliaia all'italiana", () => {
  assert.strictEqual(p("1.500"), 1500);
  assert.strictEqual(p("1.234.567"), 1234567);
  assert.strictEqual(p("€ 2.500"), 2500);
  assert.strictEqual(p("-1.500"), -1500);
});

test("solo punto: decimale quando non e` un gruppo di migliaia", () => {
  assert.strictEqual(p("12.5"), 12.5);
  assert.strictEqual(p("1.5"), 1.5);
  assert.strictEqual(p("0.125"), 0.125);
  assert.strictEqual(p("0.995"), 0.995);
  assert.strictEqual(p("99.5%"), 99.5);
});

test("solo virgola: decimale all'italiana", () => {
  assert.strictEqual(p("12,5"), 12.5);
  assert.strictEqual(p("0,125"), 0.125);
  assert.strictEqual(p("0,995"), 0.995);
  assert.strictEqual(p("99,5%"), 99.5);
});

test("solo virgola a gruppi di 3: migliaia (formato USA)", () => {
  assert.strictEqual(p("2,900"), 2900);
  assert.strictEqual(p("1,234,567"), 1234567);
});

test("formati misti: l'ultimo separatore e` il decimale", () => {
  assert.strictEqual(p("1.234,56"), 1234.56);
  assert.strictEqual(p("1.234.567,89"), 1234567.89);
  assert.strictEqual(p("1,234.56"), 1234.56);
  assert.strictEqual(p("2.500,00"), 2500);
});

const r = v => vm.runInContext("parseRatio(" + JSON.stringify(v) + ")", c);

test("parseRatio: un solo separatore e` sempre decimale (UPT, CR, %)", () => {
  assert.strictEqual(r("1.856"), 1.856);
  assert.strictEqual(r("1,856"), 1.856);
  assert.strictEqual(r("12.345%"), 12.345);
  assert.strictEqual(r("0,995"), 0.995);
  assert.strictEqual(r("98"), 98);
  assert.strictEqual(r(2.1), 2.1);
  assert.strictEqual(r(""), 0);
  assert.strictEqual(r("1.234,5"), 1234.5);
});

test("formato contabile tra parentesi = negativo", () => {
  assert.strictEqual(p("(1.234,56)"), -1234.56);
  assert.strictEqual(p("(500)"), -500);
});
