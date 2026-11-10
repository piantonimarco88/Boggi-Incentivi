// Soglie FC+VM (FCVM_PARAMS) salvate e ricaricate da sessione e file di configurazione
// (src/86-session-io).
//
// Esecuzione:  node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "86-session-io", "010_main.js"), "utf8");
const fnSrc = n => { const a = SRC.indexOf("function " + n + "("); let d = 0, i = SRC.indexOf("{", a);
  for (let k = i; k < SRC.length; k++) { if (SRC[k] === "{") d++; else if (SRC[k] === "}" && --d === 0) return SRC.slice(a, k + 1); } };

function ctx() {
  const c = vm.createContext({ FCVM_PARAMS: { soglia100: 0.995, soglia60: 0.95, pct60: 0.60 } });
  vm.runInContext(fnSrc("_applyFcvmParams"), c);
  return c;
}

test("le soglie FC+VM sono nel file di sessione e di configurazione", () => {
  assert.ok(fnSrc("saveSession").indexOf("fcvm_params:FCVM_PARAMS") >= 0, "saveSession");
  assert.ok(fnSrc("saveConfig").indexOf("fcvm_params:FCVM_PARAMS") >= 0, "saveConfig");
  assert.ok(fnSrc("loadSession").indexOf("_applyFcvmParams(state.fcvm_params)") >= 0, "loadSession");
  assert.ok(fnSrc("loadConfig").indexOf("_applyFcvmParams(cfg.fcvm_params)") >= 0, "loadConfig");
});

test("caricamento: applica le chiavi note e numeriche", () => {
  const c = ctx();
  vm.runInContext("_applyFcvmParams({soglia100:1,soglia60:0.9,pct60:0.5})", c);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.FCVM_PARAMS)), { soglia100: 1, soglia60: 0.9, pct60: 0.5 });
});

test("caricamento: ignora chiavi sconosciute e valori non numerici", () => {
  const c = ctx();
  vm.runInContext("_applyFcvmParams({soglia100:'1',pct60:NaN,altro:5})", c);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.FCVM_PARAMS)), { soglia100: 0.995, soglia60: 0.95, pct60: 0.60 });
});

test("file vecchi senza soglie: valori correnti invariati", () => {
  const c = ctx();
  vm.runInContext("_applyFcvmParams(undefined)", c);
  assert.strictEqual(c.FCVM_PARAMS.soglia100, 0.995);
});
