// Test sul BUNDLE COMPILATO: barra a passi Import -> Verifica -> Calcolo -> PDF -> Invio.
// Dati inventati.
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const st = app => JSON.parse(app.run("JSON.stringify(stepState().map(function(s){return {k:s.k,st:s.st,sub:s.sub}}))"));
const byK = app => Object.fromEntries(st(app).map(s => [s.k, s]));

const DATA = `PRIZE_MODE="mensile";REGION="italia";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;
  STORE_FLAGS={};initStoreFlags();
  D.t={"1201":{to:100000,sy:0.3,pr:40,cr:0.1}};D.c={"1201":{sc:105000,sy:0.32,nf:45,pd:0.06}};MONTHLY_SYLY={"1201":0.29};
  E=[{m:"A1",c:"ROSSI",n:"MARIO",f:"SA",j:"SA",si:1201,s:"1201 T",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO",mp:"a@example.com"},
     {m:"A2",c:"BIANCHI",n:"ANNA",f:"SA",j:"SA",si:1201,s:"1201 T",ib:500,rl:500,en:210,cu:"EUR",ex:1,ml:0,ps:"NO",mp:"b@example.com"}];
  IMPORT_STAMPS={};MAIL_LOG=[];rSources();`;

test("app vuota: tutti i passi da fare, l'invio aspetta", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";E=[];rSources();`);
  const s = byK(app);
  assert.strictEqual(s.import.st, "todo");
  assert.strictEqual(s.verifica.st, "todo");
  assert.strictEqual(s.calcolo.st, "todo");
  assert.strictEqual(s.pdf.st, "todo");
  assert.strictEqual(s.invio.st, "todo");
});

test("dati caricati: import dalla checklist di Fonti Dati, calcolo con il totale premi", () => {
  const app = loadBundle();
  app.run(DATA);
  const s = byK(app);
  assert.match(s.import.sub, /^\d+ di \d+ fonti$/);
  assert.strictEqual(s.verifica.st, "ok");
  assert.match(s.calcolo.sub, /^€ [\d.]+$/);
  const tot = app.run("Math.round(E.reduce(function(a,e){return a+calcEUR(e)},0))");
  assert.strictEqual(s.calcolo.sub, "€ " + tot.toLocaleString("it-IT"));
  assert.strictEqual(s.pdf.sub, "Da generare");
  assert.strictEqual(s.invio.st, "lock");
});

test("verifica: le matricole duplicate diventano un errore nella barra", () => {
  const app = loadBundle();
  app.run(DATA + `E.push(JSON.parse(JSON.stringify(E[0])));`);
  assert.strictEqual(byK(app).verifica.st, "err");
});

test("PDF: generati -> ok; una modifica dopo -> da rigenerare; un invio email non li rende vecchi", () => {
  const app = loadBundle();
  app.run(DATA);
  app.run("window._lastChangeTs=new Date(Date.now()-60000);_pdfBatchTs=new Date();");
  assert.strictEqual(byK(app).pdf.st, "ok");
  app.run("logMailSent('A1','a@example.com','sent');");   // invio: salvataggio silenzioso
  assert.strictEqual(byK(app).pdf.st, "ok");
  let s = byK(app);
  assert.strictEqual(s.invio.sub, "1 inviate");
  assert.strictEqual(s.invio.st, "warn");
  app.run("logMailSent('A2','b@example.com','sent');");
  assert.strictEqual(byK(app).invio.st, "ok");
  // modifica dei dati dopo i PDF
  app.run("window._lastChangeTs=new Date(Date.now()+1000);");
  s = byK(app);
  assert.strictEqual(s.pdf.st, "warn");
  assert.strictEqual(s.pdf.sub, "Da rigenerare");
});

test("invio: un errore registrato rende rosso il passo", () => {
  const app = loadBundle();
  app.run(DATA + "_pdfBatchTs=new Date(Date.now()+5000);logMailSent('A1','a@example.com','error');");
  const s = byK(app);
  assert.strictEqual(s.invio.st, "err");
  assert.match(s.invio.sub, /1 errori/);
});

test("HTML della barra: 5 passi; cliccando un passo si apre il suo dettaglio con il pulsante", () => {
  const app = loadBundle();
  app.run(DATA);
  const h0 = app.run("_stepSel=null;stepBarHtml(stepState())");
  assert.strictEqual((h0.match(/data-step="/g) || []).length, 5);
  assert.doesNotMatch(h0, /id="stepBtn"/);
  const h1 = app.run("_stepSel=0;stepBarHtml(stepState())");
  assert.match(h1, /1\. Import<\/div>/);
  assert.match(h1, /Apri Fonti Dati/);
  assert.match(h1, /Anagrafica/);
});
