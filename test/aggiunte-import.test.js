// Test sul BUNDLE COMPILATO (v9.120):
//  1. Import aggiunte da Excel (aggParseRows / aggApplyItems) + voce «QTY Dept» tra le aggiunte
//  2. Fasce DCC eseguiti dei FC allineate a quelle del negozio da novembre 2026 (demoltMatrixFc)
//  3. Strumento build/diff-aggiunte.js: le aggiunte generate per i Dept stores riportano il premio
//     (con coefficiente inventari) esattamente al premio pieno (senza coefficiente)
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

const SETUP = `
PRIZE_MODE="mensile"; REGION="international"; MODE="consuntivo"; CFG_YEAR=2026; CFG_MONTH=10;
STORE_FLAGS={"1301":{dept:true,noSas:false,noDig:false},"1302":{dept:true,noSas:false,noDig:false}}; initStoreFlags();
D.t={"1301":{to:100000,sy:0,pr:0,qt:100},"1302":{to:100000,sy:0,pr:0,qt:100}};
D.c={"1301":{sc:101000,es:0,qc:120,sa:0.9,vel:0.9},"1302":{sc:100000,es:0,qc:100,sa:0.9,vel:0.9}};
MONTHLY_SYLY={};
E=[{m:"0100205",c:"ROSSI",n:"MARIA",f:"SM",j:"SM DEPT",si:1301,s:"1301 ECI UNO",ib:300,rl:300,en:230,cu:"EUR",ex:1,ml:0,ps:"NO"},
   {m:"7000187",c:"SMITH",n:"JOHN",f:"VSM",j:"VSM DEPT",si:1301,s:"1301 ECI UNO",ib:250,rl:250,en:231,cu:"GBP",ex:1.15,ml:0,ps:"NO"},
   {m:"1000999",c:"VERDI",n:"LUCA",f:"SM",j:"SM DEPT",si:1302,s:"1302 ECI DUE",ib:300,rl:300,en:230,cu:"EUR",ex:1,ml:0,ps:"NO"},
   {m:"1000888",c:"BIANCHI",n:"ANNA",f:"SA",j:"SA DEPT",si:1301,s:"1301 ECI UNO",ib:200,rl:200,en:230,cu:"EUR",ex:1,ml:0,ps:"NO"}];
VL={};AGG={};
DEMOLT_RESULT_STORE={"1301":{pct:0.8,compl:0.8,acc:0.97},"1302":{pct:0.5,compl:0.6,acc:0.9}};
PARAMS.bdg60mult=0.6; PARAMS.qtyPct=0.5; PARAMS.artEnabled=false;
`;

function loadXlsx() {
  const ctx = { Buffer }; ctx.self = ctx; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "vendor-xlsx", "010_xlsx.full.min.js"), "utf8"), ctx);
  return ctx.XLSX;
}

test("aggParseRows/aggApplyItems: colonne per intestazione, matricola con zero iniziale, valuta, negativi", () => {
  const app = loadBundle();
  app.run(SETUP);
  const rows = [
    ["Aggiunte da differenza", null],
    ["Matricola", "Cognome", "Nome", "Valuta", "BDG (Lordo)", "BDG (Netto)", "QTY Dept", "Totale", "Digital"],
    [100205, "ROSSI", "MARIA", "EUR", 60, null, 30, 90, null],        // numero senza zero iniziale -> "0100205"
    ["7000187", "SMITH", "JOHN", "GBP", 45.5, null, null, 45.5, -10], // negativo scartato, resto importato
    ["1000999", "VERDI", "LUCA", "GBP", 10, null, null, 10, null],    // valuta diversa dal dipendente -> scartata
    ["9999999", "IGNOTO", "X", "EUR", 5, null, null, 5, null],        // non in anagrafica
    ["1000888", "BIANCHI", "ANNA", "EUR", null, null, null, null, null], // nessun importo: ignorata
  ];
  app.ctx._rows = rows;
  const p = JSON.parse(app.run("JSON.stringify(aggParseRows(_rows))"));
  assert.deepStrictEqual(p.items.map(i => i.raw), ["100205", "7000187", "1000999", "9999999"]);
  assert.deepStrictEqual(p.items[0].vals, { rb: 60, pq: 30 });
  assert.deepStrictEqual(p.items[1].vals, { rb: 45.5 });
  assert.ok(p.problems.some(x => /negativo/.test(x)), "negativo segnalato");

  app.ctx._items = p.items;
  const r = JSON.parse(app.run("JSON.stringify(aggApplyItems(_items))"));
  assert.strictEqual(r.n, 2);
  assert.strictEqual(r.skipped.length, 2);
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(AGG)")), { "0100205": { rb: 60, pq: 30 }, "7000187": { rb: 45.5 } });
  assert.deepStrictEqual(r.tot, { EUR: 90, GBP: 45.5 });

  // una seconda importazione SOMMA
  app.run("aggApplyItems(_items)");
  assert.strictEqual(app.run("AGG['0100205'].rb"), 120);
  // «QTY Dept» conta nel totale aggiunte e nel premio del dipendente
  assert.strictEqual(app.run("aggTotal('0100205')"), 180);
});

test("aggParseRows: senza colonna matricola o senza importi -> nessuna riga e motivo", () => {
  const app = loadBundle();
  app.run(SETUP);
  app.ctx._a = [["Cognome", "Nome", "BDG (Lordo)"], ["ROSSI", "MARIA", 10]];
  assert.ok(JSON.parse(app.run("JSON.stringify(aggParseRows(_a))")).problems[0].includes("Matricola"));
  app.ctx._b = [["Matricola", "Cognome"], ["0100205", "ROSSI"]];
  assert.ok(JSON.parse(app.run("JSON.stringify(aggParseRows(_b))")).problems[0].includes("colonna importo"));
});

test("Fasce DCC eseguiti FC: allineate a quelle del negozio da novembre 2026, ottobre invariato", () => {
  const app = loadBundle();
  app.run(SETUP);
  const mx = () => JSON.parse(app.run("JSON.stringify(demoltMatrixFc())"));
  // Ottobre: fasce FC storiche (completamento = bpB 80/95)
  assert.deepStrictEqual(mx().bpB, [0.8, 0.95]);
  // Novembre: completamento FC = % DCC eseguiti negozio (bpA del negozio 70/90); invio e griglia invariati
  app.run("CFG_MONTH=11");
  const m11 = mx();
  assert.deepStrictEqual(m11.bpB, [0.7, 0.9]);
  assert.deepStrictEqual(m11.bpA, [0.8, 0.95]);
  assert.deepStrictEqual(m11.grid, JSON.parse(app.run("JSON.stringify(DEMOLT_MATRIX_FC.grid)")));
  // Un completamento del 75%: in ottobre fascia bassa, da novembre fascia intermedia
  assert.strictEqual(app.run("demoltPct(demoltMatrixFc(),0.97,0.75)"), 0.85);
  app.run("CFG_MONTH=10");
  assert.strictEqual(app.run("demoltPct(demoltMatrixFc(),0.97,0.75)"), 0.70);
  // segue la matrice negozio se viene modificata
  app.run("CFG_MONTH=11;DEMOLT_MATRIX_STORE.bpA=[0.6,0.85]");
  assert.deepStrictEqual(mx().bpB, [0.6, 0.85]);
  // anno successivo: sempre allineata
  app.run("CFG_YEAR=2027;CFG_MONTH=1");
  assert.deepStrictEqual(mx().bpB, [0.6, 0.85]);
  // la matrice FC salvata non viene toccata (resta quella di ottobre)
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(DEMOLT_MATRIX_FC.bpB)")), [0.8, 0.95]);
});

test("Data di allineamento FC nella configurazione (rule_cfg) e nella sessione", () => {
  const app = loadBundle();
  app.run(SETUP);
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(_ruleCfgGet().demoltFc)")), [2026, 11]);
  app.run("_applyRuleCfg({demoltFc:[2026,12]});CFG_MONTH=11");
  assert.strictEqual(app.run("demoltFcAligned()"), false);
  app.run("CFG_MONTH=12");
  assert.strictEqual(app.run("demoltFcAligned()"), true);
  app.run("_applyRuleCfg({demoltFc:[1999,1]})"); // non valida: ignorata
  assert.deepStrictEqual(JSON.parse(app.run("JSON.stringify(_ruleCfgGet().demoltFc)")), [2026, 12]);
});

test("diff-aggiunte --dept-senza-inventari: con le aggiunte importate il premio = premio pieno", () => {
  const app = loadBundle();
  app.run(SETUP);
  // calcolo di riferimento: premio pieno (senza coefficiente) per ogni dipendente
  const full = JSON.parse(app.run(`(function(){
    var s=JSON.parse(JSON.stringify(DEMOLT_RESULT_STORE));DEMOLT_RESULT_STORE={};
    var r=E.map(function(e){return calcE(e)});DEMOLT_RESULT_STORE=s;return JSON.stringify(r);})()`));
  const withCoef = JSON.parse(app.run("JSON.stringify(E.map(function(e){return calcE(e)}))"));
  assert.ok(full[0] > withCoef[0] && full[2] > withCoef[2], "il coefficiente riduce il premio dei SM/VSM Dept");
  assert.strictEqual(full[3], withCoef[3], "SA Dept: nessun coefficiente");

  app.run("saveSession()");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diffagg-"));
  const sess = path.join(tmp, "sessione.json"), out = path.join(tmp, "aggiunte.xlsx");
  fs.writeFileSync(sess, app.lastBlobText());
  execFileSync(process.execPath, [path.join(__dirname, "..", "build", "diff-aggiunte.js"), "--sessione", sess, "--dept-senza-inventari", "--out", out], { stdio: "pipe" });

  const X = loadXlsx();
  const wb = X.read(fs.readFileSync(out), { type: "buffer" });
  assert.deepStrictEqual(Array.from(wb.SheetNames), ["Aggiunte", "Dettaglio ricalcolo", "Riepilogo"]);
  const rows = X.utils.sheet_to_json(wb.Sheets["Aggiunte"], { header: 1, defval: null, raw: true });
  assert.strictEqual(rows.length - 1, 3, "3 dipendenti con differenza (SM, VSM e SM di un altro Dept; la SA no)");

  // import nel tab Aggiunte -> i totali coincidono col premio pieno
  app.ctx._rows = rows;
  app.run("var _p=aggParseRows(_rows);aggApplyItems(_p.items)");
  const after = JSON.parse(app.run("JSON.stringify(E.map(function(e){return calcE(e)}))"));
  after.forEach((v, i) => assert.ok(Math.abs(v - full[i]) < 0.011, "dipendente " + i + ": " + v + " vs premio pieno " + full[i]));
  fs.rmSync(tmp, { recursive: true, force: true });
});
