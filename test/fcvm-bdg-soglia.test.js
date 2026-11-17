// VM con premi di negozio singoli (bdg_stores, es. Belmonte): il premio è raggiunto se
// consuntivo >= soglia100 del target (99,5% di default, come l'area FC/VM) — dalla policy SAS
// (luglio 2026); prima resta il criterio legacy (consuntivo > target).
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const SETUP = `
PRIZE_MODE="fcvm"; REGION="international"; MODE="consuntivo"; CFG_YEAR=2026; CFG_MONTH=10;
FC_EMP={"V1":{m:"V1",c:"BELMONTE",n:"VM",j:"VM",ib:0,cu:"EUR",ex:1,ml:0,ps:"NO",
  bdg_stores:[{sid:"3001",ib:300,s:"S1 ESATTO 99,5"},{sid:"3002",ib:300,s:"S2 SOTTO 99,4"},{sid:"3003",ib:300,s:"S3 OLTRE 100"},{sid:"3004",ib:300,s:"S4 ESCLUSO SAS"}]}};
FC_MAP={};FC_SYLY={};FC_PREV_RESULTS={};FC_AREA_SAS={};FC_OVERRIDES={};AGG_FCVM={};
FC_STORE_FLAGS={"3004":{excl_sas:true}};
FC_TARGETS={"3001":{to_eur:100000},"3002":{to_eur:100000},"3003":{to_eur:100000},"3004":{to_eur:100000}};
FC_RESULTS={"3001":{sc_eur:99500},"3002":{sc_eur:99400},"3003":{sc_eur:100500},"3004":{sc_eur:99600}};
FCVM_PARAMS.soglia100=0.995;
`;
const earned = app => JSON.parse(app.run("JSON.stringify(calcFcVmPremio('V1').bdgDetail.map(function(b){return [b.earned,b.prize]}))"));

test("VM con negozi singoli: premio raggiunto da 99,5% del target (anche con «Escludi SAS»)", () => {
  const app = loadBundle(); app.run(SETUP);
  assert.deepStrictEqual(earned(app), [[true, 300], [false, 0], [true, 300], [true, 300]]);
  assert.strictEqual(app.run("calcFcVmPremio('V1').totalPremioLC"), 900);
});

test("VM con negozi singoli: la soglia è quella configurabile dell'area (soglia100)", () => {
  const app = loadBundle(); app.run(SETUP);
  app.run("FCVM_PARAMS.soglia100=0.98");
  assert.deepStrictEqual(earned(app).map(x => x[0]), [true, true, true, true]);
  app.run("FCVM_PARAMS.soglia100=1");
  assert.deepStrictEqual(earned(app).map(x => x[0]), [false, false, true, false]);
});

test("VM con negozi singoli: prima della policy SAS (giugno 2026) resta il criterio legacy (consuntivo > target)", () => {
  const app = loadBundle(); app.run(SETUP);
  app.run("CFG_MONTH=6");
  assert.deepStrictEqual(earned(app).map(x => x[0]), [false, false, true, false]);
});
