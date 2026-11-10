// Regressione: in FC+VM l'indice i usato dall'exe ("Salva Tutti i PDF") deve puntare allo STESSO
// dipendente per matricola, nome file e contenuto lettera, anche con un premio sospeso in elenco.
//
// Esecuzione:  node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const LETTER = fs.readFileSync(path.join(ROOT, "src", "46-letter-builder-mensile", "010_main.js"), "utf8");
const MONO = fs.readFileSync(path.join(ROOT, "src", "_monolith", "app.html"), "utf8");

// estrae la patch "getLetterHtmlForPrint patch" dal monolite
const start = MONO.indexOf("var _glhfp=getLetterHtmlForPrint;");
const end = MONO.indexOf("return _glhfp(i);\n};", start) + "return _glhfp(i);\n};".length;
assert.ok(start > 0 && end > start, "patch getLetterHtmlForPrint non trovata nel monolite");
const PATCH = MONO.slice(start, end);

// solo le funzioni di pool/filename/html del builder (non lo script intero)
const fnSrc = n => { const a = LETTER.indexOf("function " + n + "("); let d = 0, i = LETTER.indexOf("{", a);
  for (let k = i; k < LETTER.length; k++) { if (LETTER[k] === "{") d++; else if (LETTER[k] === "}" && --d === 0) return LETTER.slice(a, k + 1); } };

const FNS = ["getLetterPool", "getLetterFilename", "getLetterMatricola", "_letterShownEmp", "_letterIsBatchCall", "getLetterHtmlForPrint", "getLetterHtmlForEmp"];

function ctx(over) {
  const emp = (m, c, ps) => ({ m, c, n: "X", j: "FC", ps });
  const FC_EMP = { "001": emp("001", "ROSSI", "NO"), "002": emp("002", "DORIA", "SI"), "003": emp("003", "SACCO", "NO"), "004": emp("004", "ZENATTI", "NO") };
  const lc = { innerHTML: "" };
  const c = vm.createContext(Object.assign({
    PRIZE_MODE: "fcvm", FC_EMP, E: [], SEAS: {},
    document: { querySelector: () => null, getElementById: id => (id === "lc" ? lc : null) },
    getFcVmPool: () => Object.values(FC_EMP),
    buildFcVmLetter: e => "LETTERA:" + e.c + " " + e.m,
    buildLetter: e => "MENSILE:" + e.c + " " + e.m,
    buildLetterUSA: e => "USA:" + e.c,
    buildSeasonalLetterAuto: e => "SEAS:" + e.c,
    isUSA: () => false,
    getEmpPdfFilename: e => e.m + "_FCVM.pdf",
    isSMVSM: () => false,
    _LT_SHOWN_M: null, _LT_BATCH_I: null,
  }, over || {}));
  c.__lc = lc;
  vm.runInContext(FNS.map(fnSrc).join("\n") + "\n" + PATCH, c);
  return c;
}

// Simula il ciclo «Salva tutti i PDF» dell'exe: getLetterMatricola(i) e poi getLetterHtmlForPrint(i)
const batchHtml = (c, i) => { vm.runInContext("getLetterMatricola(" + i + ")", c); return vm.runInContext("getLetterHtmlForPrint(" + i + ")", c); };

test("«Stampa PDF» singolo: stampa il dipendente visualizzato, non l'indice trovato dall'exe", () => {
  const c = ctx();
  c.__lc.innerHTML = "LETTERA:ZENATTI 004";
  c._LT_SHOWN_M = "004";
  // l'exe passa un indice sbagliato (0 = ROSSI) senza chiamare getLetterMatricola
  const html = vm.runInContext("getLetterHtmlForPrint(0)", c);
  assert.ok(html.indexOf("LETTERA:ZENATTI") >= 0, "deve stampare ZENATTI, visualizzato");
});

test("«Stampa PDF» singolo: anche un dipendente fuori dal pool (sospeso) stampa se stesso, non il primo", () => {
  const c = ctx();
  c.__lc.innerHTML = "LETTERA:DORIA 002";
  c._LT_SHOWN_M = "002";
  const html = vm.runInContext("getLetterHtmlForPrint(0)", c);
  assert.ok(html.indexOf("LETTERA:DORIA") >= 0);
});

test("ciclo batch: con un dipendente visualizzato l'indice resta quello del ciclo", () => {
  const c = ctx();
  c.__lc.innerHTML = "LETTERA:ZENATTI 004";
  c._LT_SHOWN_M = "004";
  const expect = ["ROSSI", "SACCO", "ZENATTI"];
  for (let i = 0; i < 3; i++) assert.ok(batchHtml(c, i).indexOf("LETTERA:" + expect[i]) >= 0, "indice " + i);
});

test("«Stampa PDF» singolo: se la lettera visualizzata non e` piu` quella tracciata vale l'indice", () => {
  const c = ctx();
  c.__lc.innerHTML = "";            // tab ridisegnato: nessuna lettera visibile
  c._LT_SHOWN_M = "004";
  const html = vm.runInContext("getLetterHtmlForPrint(1)", c);
  assert.ok(html.indexOf("LETTERA:SACCO") >= 0);
});

test("mensile: «Stampa PDF» singolo con duplicato 12345_2 stampa il duplicato", () => {
  const E = [{ m: "12345", c: "ROSSI", ps: "NO" }, { m: "12345_2", c: "BIANCHI", ps: "NO" }];
  const c = ctx({ PRIZE_MODE: "mensile", E });
  c.__lc.innerHTML = "MENSILE:BIANCHI 12345_2";   // contiene anche "12345": l'exe trova l'indice 0
  c._LT_SHOWN_M = "12345_2";
  const html = vm.runInContext("getLetterHtmlForPrint(0)", c);
  assert.ok(html.indexOf("MENSILE:BIANCHI") >= 0);
  // e il ciclo batch resta per indice
  assert.ok(batchHtml(c, 0).indexOf("MENSILE:ROSSI") >= 0);
  assert.ok(batchHtml(c, 1).indexOf("MENSILE:BIANCHI") >= 0);
});

test("FC+VM con sospeso: matricola, nome file e contenuto lettera dello stesso indice coincidono", () => {
  const c = ctx();
  const n = vm.runInContext("getLetterPool().length", c);
  assert.strictEqual(n, 3); // il sospeso è escluso
  const expect = ["ROSSI", "SACCO", "ZENATTI"];
  for (let i = 0; i < n; i++) {
    const html = vm.runInContext("getLetterHtmlForPrint(" + i + ")", c);
    assert.ok(html.indexOf("LETTERA:" + expect[i]) >= 0, "indice " + i + " deve contenere " + expect[i]);
    assert.strictEqual(vm.runInContext("getLetterMatricola(" + i + ")", c), ["001", "003", "004"][i]);
    assert.strictEqual(vm.runInContext("getLetterFilename(" + i + ")", c), ["001", "003", "004"][i] + "_FCVM.pdf");
  }
});
