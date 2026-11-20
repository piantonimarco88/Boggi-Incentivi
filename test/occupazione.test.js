// Test sul BUNDLE COMPILATO: % di occupazione (full-time / part-time) importata dall'anagrafica
// (Zucchetti: percentuale_ptime; Workday: FTE) e mostrata nel tab Calcolo premi + export Excel.
// Dati inventati (nessun dato reale).
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const J = v => JSON.stringify(v);

test("Zucchetti: percentuale_ptime 0 = full-time, altrimenti part-time con la sua %", () => {
  const app = loadBundle();
  const f = (p, d) => JSON.parse(app.run(`JSON.stringify(occFromZucchetti(${J(p)},${J(d)}))`));
  assert.deepStrictEqual(f(0, "No"), { po: 100, pt: "" });
  assert.deepStrictEqual(f(60, "Verticale"), { po: 60, pt: "Verticale" });
  assert.deepStrictEqual(f(58.536, "Orizzontale"), { po: 58.54, pt: "Orizzontale" });
  assert.deepStrictEqual(f("47,5", "Misto"), { po: 47.5, pt: "Misto" });
  // file ritoccati a mano: frazione (0,857 = 85,71%) e descrizione "si"
  assert.deepStrictEqual(f(0.8571428571428571, "si"), { po: 85.71, pt: "" });
  assert.deepStrictEqual(f(1, "No"), { po: 100, pt: "" });
  // part-time dichiarato ma senza percentuale: dato sconosciuto
  assert.strictEqual(f(0, "Verticale"), null);
  assert.deepStrictEqual(f(null, ""), { po: 100, pt: "" }); // colonna presente ma vuota = full-time
});

test("Workday: FTE (0,8 = 80%) e Time Type", () => {
  const app = loadBundle();
  const f = (fte, t) => JSON.parse(app.run(`JSON.stringify(occFromWorkday(${J(fte)},${J(t)}))`));
  assert.deepStrictEqual(f(1, "Full time"), { po: 100, pt: "" });
  assert.deepStrictEqual(f(0.8, "Part time"), { po: 80, pt: "" });
  assert.deepStrictEqual(f(0.8421, "Part time"), { po: 84.21, pt: "" });
  assert.deepStrictEqual(f(null, "Full time"), { po: 100, pt: "" });
  assert.strictEqual(f(null, "Part time"), null);
  assert.strictEqual(f(null, null), null);
});

test("import Workday: la % arriva sul dipendente; senza colonne FTE/Time Type l'import funziona lo stesso", () => {
  const app = loadBundle();
  const hdrBase = ["Employee ID", "First Name", "Last Name", "Primary Job Title", "Company", "Cost Center",
    "Prorated Monthly Salary", "Currency", "Frequency", "Hire Date", "Termination Date - All", "Emails",
    "Budget Amount", "Budget Currency", "Budget Frequency"];
  const rowBase = ["123456", "Anna", "Rossi", "SA", "BOGGI HISPANIA SL", "1601 MADRID", 1800, "EUR", "Monthly", null, null, "a@b.it", 500, "EUR", "Monthly"];
  const run = (hdr, rows) => JSON.parse(app.run(`
    PRIZE_MODE="mensile";REGION="international";CFG_YEAR=2026;CFG_MONTH=11;FC_MAP={};FC_EMP={};
    var __det=wdDetect(${J(hdr)});
    var __res=__det&&!__det.missing.length?wdParseAnagrafica(${J([hdr].concat(rows))},0,__det.W,{parseHireDate:function(){return null},cutoffDate:new Date(2026,10,5),cutoffStr:"2026-11-05",cutoffMonth:11,cutoffYear:2026}):null;
    JSON.stringify({missing:__det?__det.missing:null,imp:__res?__res.imported.map(function(e){return{m:e.m,po:e.po}}):null,err:__res?__res.errors.length:null});`));
  // con le colonne
  let r = run(hdrBase.concat(["FTE", "Time Type"]), [rowBase.concat([0.6, "Part time"]), rowBase.map((v, i) => i === 0 ? "123457" : v).concat([1, "Full time"])]);
  assert.deepStrictEqual(r.missing, []);
  assert.deepStrictEqual(r.imp, [{ m: "123456", po: 60 }, { m: "123457", po: 100 }]);
  // senza le colonne: nessuna colonna "mancante", nessun errore, po non valorizzata
  r = run(hdrBase, [rowBase]);
  assert.deepStrictEqual(r.missing, []);
  assert.deepStrictEqual(r.imp, [{ m: "123456" }]);
  assert.strictEqual(r.err, 0);
});

test("tab Calcolo premi ed export Excel: colonna occupazione (FT / PT con la %)", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";REGION="italia";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;
    STORE_FLAGS={};initStoreFlags();D.t={"1201":{to:100000}};D.c={"1201":{sc:105000}};MONTHLY_SYLY={};
    DEMOLT_RESULT_STORE={};VL={};AGG={};
    var mk=function(m,x){var e={m:m,c:"C"+m,n:"N",f:"SA",j:"SA",si:1201,s:"1201 T",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO"};for(var k in x)e[k]=x[k];return e;};
    E=[mk("1",{po:100}),mk("2",{po:60,pt:"Verticale"}),mk("3",{po:84.21}),mk("4",{})];`);
  // celle del tab
  assert.match(app.run("occCell(E[0])"), />FT</);
  assert.match(app.run("occCell(E[1])"), /PT 60%/);
  assert.match(app.run("occCell(E[1])"), /Verticale/);
  assert.match(app.run("occCell(E[2])"), /PT 84,21%/);
  assert.match(app.run("occCell(E[3])"), /—/);
  // export Excel: ultima colonna = % numerica (vuota se sconosciuta), sia Consuntivo IT sia export generale
  app.run(`var __rows=null;XLSX={utils:{aoa_to_sheet:function(r){__rows=r;return {}},book_new:function(){return {}},book_append_sheet:function(){}},writeFile:function(){}};`);
  for (const fn of ["exportExcelConsuntivoIT", "exportExcel"]) {
    app.run(`${fn}();`);
    const rows = JSON.parse(app.run("JSON.stringify(__rows)"));
    const h = rows[0], last = h.length - 1;
    assert.strictEqual(h[last], "% OCCUPAZIONE", fn);
    const by = Object.fromEntries(rows.slice(1).map(x => [x[3], x[last]]));
    assert.deepStrictEqual(by, { 1: 100, 2: 60, 3: 84.21, 4: "" }, fn);
    assert.ok(rows.slice(1).every(x => x.length === h.length), fn + ": righe e intestazione allineate");
  }
});

test("export USA: nessuna colonna di occupazione (gli USA non sono toccati)", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";REGION="international";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;
    STORE_FLAGS={};initStoreFlags();D.t={"9001":{to:100000}};D.c={"9001":{sc:105000}};D.usa={};AGG={};
    E=[{m:"U1",c:"A",n:"B",f:"SA",j:"SA",si:9001,s:"9001 NY",ib:0,rl:3000,en:240,cu:"USD",ex:1,ml:0,ps:"NO",po:60}];
    var __rows=null;XLSX={utils:{aoa_to_sheet:function(r){__rows=r;return {}},book_new:function(){return {}},book_append_sheet:function(){}},writeFile:function(){}};
    exportExcelUSA();`);
  const rows = JSON.parse(app.run("JSON.stringify(__rows)"));
  assert.strictEqual(rows[0].length, 14);
  assert.strictEqual(rows[0][13], "COMMISSION EARNED (USD)");
  assert.ok(rows.every(r => r.length === 14));
});
