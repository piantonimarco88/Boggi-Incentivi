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

function ctx() {
  const emp = (m, c, ps) => ({ m, c, n: "X", j: "FC", ps });
  const FC_EMP = { a: emp("001", "ROSSI", "NO"), b: emp("002", "DORIA", "SI"), c: emp("003", "SACCO", "NO"), d: emp("004", "ZENATTI", "NO") };
  const c = vm.createContext({
    PRIZE_MODE: "fcvm", FC_EMP, E: [], SEAS: {}, document: { querySelector: () => null },
    getFcVmPool: () => Object.values(FC_EMP),
    buildFcVmLetter: e => "LETTERA:" + e.c,
    getEmpPdfFilename: e => e.m + "_FCVM.pdf",
    isSMVSM: () => false,
  });
  vm.runInContext(["getLetterPool", "getLetterFilename", "getLetterMatricola", "getLetterHtmlForPrint"].map(fnSrc).join("\n") + "\n" + PATCH, c);
  return c;
}

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
