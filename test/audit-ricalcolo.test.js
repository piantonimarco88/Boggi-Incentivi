// Strumento build/audit-ricalcolo.js: ricalcolo con i dati inventari corretti dall'Audit (fogli RANKING NEGOZI /
// RANKING FC), aree FC divise assegnate dai task dei negozi (numerazione Audit ≠ suffisso app), differenze con segno,
// file «Aggiunte» con le sole differenze positive.
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { loadBundle } = require("../build/bundle-harness");

const TOOL = path.join(__dirname, "..", "build", "audit-ricalcolo.js");

function xlsxLib() {
  const ctx = { Buffer }; ctx.self = ctx; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "vendor-xlsx", "010_xlsx.full.min.js"), "utf8"), ctx);
  return ctx.XLSX;
}

const MENSILE = `
PRIZE_MODE="mensile"; REGION="international"; MODE="consuntivo"; CFG_YEAR=2026; CFG_MONTH=10;
STORE_FLAGS={}; initStoreFlags();
D.t={"1401":{to:100000,sy:0,pr:0},"1402":{to:100000,sy:0,pr:0}};
D.c={"1401":{sc:101000,es:0,sa:0.9,vel:0.9},"1402":{sc:101000,es:0,sa:0.9,vel:0.9}};
MONTHLY_SYLY={};
E=[{m:"S1",c:"UNO",n:"SM",f:"SM",j:"SM",si:1401,s:"1401 NEGOZIO UNO",ib:400,rl:400,en:230,cu:"EUR",ex:1,ml:0,ps:"NO"},
   {m:"S2",c:"DUE",n:"SM",f:"SM",j:"SM",si:1402,s:"1402 NEGOZIO DUE",ib:400,rl:400,en:230,cu:"EUR",ex:1,ml:0,ps:"NO"}];
VL={};AGG={};
DEMOLT_RESULT_STORE={"1401":{pct:0.7,compl:0.6,acc:0.97},"1402":{pct:1,compl:1,acc:0.99}};
PARAMS.artEnabled=false;
`;
const FCVM = `
PRIZE_MODE="fcvm"; REGION="international"; MODE="consuntivo"; CFG_YEAR=2026; CFG_MONTH=10;
FC_EMP={"F1":{m:"F1",c:"ALFA",n:"ANNA",j:"FC",ib:1000,cu:"EUR",ex:1,ml:0,ps:"NO"},
        "F1_2":{m:"F1_2",c:"ALFA_2",n:"ANNA",j:"FC",ib:800,cu:"EUR",ex:1,ml:0,ps:"NO"}};
FC_MAP={"2001":{fc:["F1"],vm:[],tipo:"AREA",s:"2001 A"},"2002":{fc:["F1_2"],vm:[],tipo:"AREA",s:"2002 B"}};
FC_TARGETS={"2001":{to_eur:100000},"2002":{to_eur:100000}};
FC_RESULTS={"2001":{sc_eur:101000},"2002":{sc_eur:101000}};
FC_SYLY={};FC_STORE_FLAGS={};FC_PREV_RESULTS={};FC_AREA_SAS={};FC_OVERRIDES={};AGG_FCVM={};
FCVM_PARAMS.soglia100=0.995;
DEMOLT_RESULT_FC={"F1":{pct:0.5,invio:0.7,compl:0.7},"F1_2":{pct:0.9,invio:1,compl:0.97}};
`;

// File Audit sintetico. Aree dell'Audit: «1» = store 2002 (task 20/18) e «2» = store 2001 (task 10/9): numerazione opposta all'app.
function auditXlsx(file) {
  const X = xlsxLib(), wb = X.utils.book_new();
  const neg = [["Country Id", "Store Id", "Store Description", "CycleCountType", "ACCURACY", "Sended tasks ", "Completed tasks ", "% DCC EXECUTED CORRETTO"],
    [210, 1401, "NEGOZIO UNO", "DCC", 0.99, 10, 10, 1],       // coefficiente 0,7 -> 1 (+)
    [210, 1402, "NEGOZIO DUE", "DCC", 0.9, 10, 8, 0.8],       // coefficiente 1 -> 0,6 (-)
    [210, 2001, "A", "DCC", 0.99, 10, 9, 0.9],
    [210, 2002, "B", "DCC", 0.99, 20, 18, 0.9]];
  const fc = [["Field Coach", "Area", "Sended tasks ", "Completed tasks ", "% DCC Sent CORRETTO", "%DCC EXECUTED CORRETTO"],
    ["ANNA ALFA", "1", 20, 18, 1, 0.9],     // -> area app F1_2: invio 100%, compl 90% -> 0,85
    ["ANNA ALFA", "2", 10, 9, 0.85, 0.95]];  // -> area app F1: invio 85%, compl 95% -> 0,9
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(neg), "RANKING NEGOZI");
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(fc), "RANKING FC");
  fs.writeFileSync(file, Buffer.from(X.write(wb, { type: "array", bookType: "xlsx" })));
}
const rowsOf = (X, f, name) => Array.from(X.utils.sheet_to_json(X.read(fs.readFileSync(f), { type: "buffer" }).Sheets[name], { header: 1, defval: null, raw: true })).map(r => Array.from(r));

function setup(tmp) {
  const M = loadBundle(); M.run(MENSILE);
  const F = loadBundle(); F.run(FCVM);
  M.run("saveSession()"); const m = path.join(tmp, "m.json"); fs.writeFileSync(m, M.lastBlobText());
  F.run("saveSession()"); const f = path.join(tmp, "f.json"); fs.writeFileSync(f, F.lastBlobText());
  const audit = path.join(tmp, "audit.xlsx"); auditXlsx(audit);
  return { M, F, m, f, audit };
}

test("audit-ricalcolo: differenze con segno, aree FC divise assegnate dai task, file Aggiunte solo positive", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  const { F, m, f, audit } = setup(tmp);
  const premioF = JSON.parse(F.run("JSON.stringify(['F1','F1_2'].map(function(m){return calcFcVmPremio(m).totalPremioLC}))"));
  assert.deepStrictEqual(premioF, [500, 720], "prima: F1 1000 x 0,5; F1_2 800 x 0,9");

  execFileSync(process.execPath, [TOOL, "--audit", audit, "--mensile", m, "--fcvm", f, "--out-dir", tmp, "--tag", "T"], { stdio: "pipe" });
  const X = xlsxLib();
  const main = path.join(tmp, "RICALCOLO_INVENTARI_AUDIT_T.xlsx");
  assert.deepStrictEqual(Array.from(X.read(fs.readFileSync(main), { type: "buffer" }).SheetNames), ["Riepilogo", "Negozi", "FC+VM", "Assegnazione aree", "Controlli"]);

  // negozi: S1 sale (BDG 400 x 0,3 = +120), S2 scende (coefficiente 1 -> meno)
  const neg = rowsOf(X, main, "Negozi"), h = neg[0];
  const iDiff = h.indexOf("DIFFERENZA (valuta locale)");
  const byM = {}; neg.slice(1).forEach(r => { byM[r[1]] = r; });
  assert.strictEqual(byM.S1[iDiff], 120);
  assert.ok(byM.S2[iDiff] < 0, "S2: differenza negativa");

  // FC: area app F1 (Audit «2», invio 85% compl 95%) -> 0,9: 1000 x 0,9 = 900 (+400); F1_2 (Audit «1», invio 100% compl 90%) -> 0,85: 800 x 0,85 = 680 (-40)
  const fcr = rowsOf(X, main, "FC+VM"), hf = fcr[0], iTot = hf.indexOf("TOTALE da erogare (valuta locale)");
  const byA = {}; fcr.slice(1).forEach(r => { byA[r[1]] = r; });
  assert.strictEqual(byA.F1[iTot], 400);
  assert.strictEqual(byA.F1_2[iTot], -40);
  const ass = rowsOf(X, main, "Assegnazione aree").slice(1);
  assert.ok(ass.some(r => r[1] === "1" && /^F1_2/.test(r[2])) && ass.some(r => r[1] === "2" && /^F1 /.test(r[2])), "area Audit 1 -> F1_2, area Audit 2 -> F1");

  // file Aggiunte: solo positive
  const aN = rowsOf(X, path.join(tmp, "AGGIUNTE_AUDIT_NEGOZI_T.xlsx"), "Aggiunte");
  assert.deepStrictEqual(aN.slice(1).map(r => r[0]), ["S1"]);
  const aF = rowsOf(X, path.join(tmp, "AGGIUNTE_AUDIT_FCVM_T.xlsx"), "Aggiunte");
  assert.deepStrictEqual(aF.slice(1).map(r => [r[0], r[5]]), [["F1", 400]]);

  // importando il file FC+VM nel tab Aggiunte FC+VM, il premio di F1 diventa quello ricalcolato
  F.ctx._rows = aF;
  F.run("var _p=aggParseRows(_rows,AGG_FCVM_KEYS,_aggResolveFcvm);aggApplyItemsFcvm(_p.items)");
  assert.strictEqual(F.run("calcFcVmPremio('F1').totalPremioLC+AGG_FCVM.F1"), 900);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("audit-ricalcolo: area divisa non assegnabile (task che non coincidono) -> errore, nessun file", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  const { m, f, audit } = setup(tmp);
  const X = xlsxLib(), wb = X.read(fs.readFileSync(audit), { type: "buffer" });
  wb.Sheets["RANKING FC"].C2.v = 99; // i task di un'area non corrispondono a nessuna area dell'app
  fs.writeFileSync(audit, Buffer.from(X.write(wb, { type: "array", bookType: "xlsx" })));
  assert.throws(() => execFileSync(process.execPath, [TOOL, "--audit", audit, "--mensile", m, "--fcvm", f, "--out-dir", tmp, "--tag", "T"], { stdio: "pipe" }), /Command failed/);
  assert.ok(!fs.existsSync(path.join(tmp, "RICALCOLO_INVENTARI_AUDIT_T.xlsx")));
  fs.rmSync(tmp, { recursive: true, force: true });
});
