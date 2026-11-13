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

// ── Strumento: confronto con esclusione Dept e sessioni FC+VM ───────────────────────────
const TOOL = path.join(__dirname, "..", "build", "diff-aggiunte.js");
function runTool(args) { return execFileSync(process.execPath, [TOOL].concat(args), { stdio: "pipe" }).toString(); }
function readSheet(file, name) {
  const X = loadXlsx();
  const wb = X.read(fs.readFileSync(file), { type: "buffer" });
  return X.utils.sheet_to_json(wb.Sheets[name || "Aggiunte"], { header: 1, defval: null, raw: true });
}
function saveToTmp(app, tmp, name) {
  app.run("saveSession()");
  const p = path.join(tmp, name);
  fs.writeFileSync(p, app.lastBlobText());
  return p;
}

test("diff-aggiunte --confronto --escludi-dept: i Dept già pagati non vengono contati due volte", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diffagg-"));
  const EXTRA = `
    STORE_FLAGS["1401"]={dept:false,noSas:false,noDig:false};
    D.t["1401"]={to:100000,sy:0,pr:0};D.c["1401"]={sc:101000,es:0,sa:0.9,vel:0.9};
    E.push({m:"1000777",c:"NERI",n:"PAOLA",f:"SM",j:"SM",si:1401,s:"1401 STORE NON DEPT",ib:400,rl:400,en:230,cu:"EUR",ex:1,ml:0,ps:"NO"});
    DEMOLT_RESULT_STORE["1401"]={pct:0.7,compl:0.7,acc:0.97};`;
  const A = loadBundle(); A.run(SETUP); A.run(EXTRA);
  const B = loadBundle(); B.run(SETUP); B.run(EXTRA);
  // sessione rivista (Audit): tutti i coefficienti salgono, Dept compresi
  B.run("DEMOLT_RESULT_STORE={\"1301\":{pct:1},\"1302\":{pct:0.9},\"1401\":{pct:0.9}}");
  const a = saveToTmp(A, tmp, "a.json"), b = saveToTmp(B, tmp, "b.json");
  const all = path.join(tmp, "tutti.xlsx"), nodept = path.join(tmp, "nodept.xlsx");
  runTool(["--sessione", a, "--confronto", b, "--out", all]);
  runTool(["--sessione", a, "--confronto", b, "--escludi-dept", "--out", nodept]);
  assert.strictEqual(readSheet(all).length - 1, 4, "senza esclusione: 3 SM/VSM Dept + 1 non Dept");
  const rows = readSheet(nodept);
  assert.strictEqual(rows.length - 1, 1, "con --escludi-dept resta solo il negozio non Dept");
  assert.strictEqual(rows[1][0], "1000777");
  assert.strictEqual(rows[1][6], 80, "BDG (Lordo): 400 x (0,9 - 0,7)");
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("diff-aggiunte su sessioni FC+VM: file «Aggiunta» importabile nel tab FC+VM, premio = premio ricalcolato", () => {
  const SETUP_FC = `
    PRIZE_MODE="fcvm"; REGION="international"; MODE="consuntivo"; CFG_YEAR=2026; CFG_MONTH=10;
    FC_EMP={"F1":{m:"F1",c:"ALFA",n:"ANNA",j:"FC",ib:1000,cu:"EUR",ex:1,ml:0,ps:"NO"},
            "F2":{m:"F2",c:"BETA",n:"BRUNO",j:"FC",ib:800,cu:"GBP",ex:1.15,ml:0,ps:"NO"},
            "V1":{m:"V1",c:"GAMMA",n:"GINO",j:"VM",ib:500,cu:"EUR",ex:1,ml:0,ps:"NO"}};
    FC_MAP={"2001":{fc:"F1",vm:"V1"},"2002":{fc:"F2",vm:"V1"}};
    FC_TARGETS={"2001":{to_eur:100000},"2002":{to_eur:100000}};
    FC_RESULTS={"2001":{sc_eur:101000},"2002":{sc_eur:101000}};
    FC_SYLY={};FC_STORE_FLAGS={};FC_PREV_RESULTS={};FC_AREA_SAS={};FC_OVERRIDES={};AGG_FCVM={};
    FCVM_PARAMS.soglia100=0.98;FCVM_PARAMS.soglia60=0.9;FCVM_PARAMS.pct60=0.6;
    DEMOLT_RESULT_FC={"F1":{pct:0.65,invio:0.9,compl:0.5},"F2":{pct:0.85,invio:0.9,compl:0.8}};`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diffagg-"));
  const A = loadBundle(); A.run(SETUP_FC);
  const B = loadBundle(); B.run(SETUP_FC);
  B.run("DEMOLT_RESULT_FC={\"F1\":{pct:0.85,invio:0.9,compl:0.8},\"F2\":{pct:0.75,invio:0.9,compl:0.7}}"); // F1 sale, F2 scende
  const tot = app => JSON.parse(app.run("JSON.stringify(Object.keys(FC_EMP).map(function(m){return calcFcVmPremio(m).totalPremioLC}))"));
  const ta = tot(A), tb = tot(B);
  assert.deepStrictEqual(ta, [650, 680, 500]);
  assert.deepStrictEqual(tb, [850, 600, 500]);
  const a = saveToTmp(A, tmp, "a.json"), b = saveToTmp(B, tmp, "b.json");
  const out = path.join(tmp, "fc.xlsx");
  runTool(["--sessione", a, "--confronto", b, "--out", out]);
  const rows = readSheet(out);
  assert.deepStrictEqual(Array.from(rows[0]), ["Matricola", "Cognome", "Nome", "Ruolo", "Valuta", "Aggiunta"]);
  assert.strictEqual(rows.length - 1, 1, "solo F1 ha una differenza positiva (F2 scende, ignorata)");
  assert.deepStrictEqual(Array.from(rows[1]), ["F1", "ALFA", "ANNA", "FC", "EUR", 200]);

  // import nel tab Aggiunte FC+VM della sessione di pagamento: aggiunta = differenza, somma alla successiva
  A.ctx._rows = rows;
  A.run("var _p=aggParseRows(_rows,AGG_FCVM_KEYS,_aggResolveFcvm);var _r=aggApplyItemsFcvm(_p.items)");
  assert.deepStrictEqual(JSON.parse(A.run("JSON.stringify(AGG_FCVM)")), { F1: 200 });
  assert.strictEqual(A.run("calcFcVmPremio('F1').totalPremioLC+AGG_FCVM['F1']"), tb[0]);
  A.run("aggApplyItemsFcvm(_p.items)");
  assert.strictEqual(A.run("AGG_FCVM.F1"), 400);
  // matricola non del pool e valuta diversa: scartate
  A.ctx._rows2 = [["Matricola", "Valuta", "Aggiunta"], ["F2", "EUR", 10], ["ZZZ", "EUR", 5]];
  const r2 = JSON.parse(A.run("JSON.stringify(aggApplyItemsFcvm(aggParseRows(_rows2,AGG_FCVM_KEYS,_aggResolveFcvm).items))"));
  assert.strictEqual(r2.n, 0);
  assert.strictEqual(r2.skipped.length, 2);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("diff-aggiunte: opzioni incompatibili e modalità diverse sono rifiutate", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diffagg-"));
  const A = loadBundle(); A.run(SETUP);
  const F = loadBundle(); F.run("PRIZE_MODE=\"fcvm\";MODE=\"consuntivo\";FC_EMP={};");
  const a = saveToTmp(A, tmp, "m.json"), f = saveToTmp(F, tmp, "f.json"), out = path.join(tmp, "x.xlsx");
  assert.throws(() => runTool(["--sessione", a, "--confronto", f, "--out", out]), /modalità diverse/);
  assert.throws(() => runTool(["--sessione", f, "--dept-senza-inventari", "--out", out]), /solo per le sessioni mensili/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
