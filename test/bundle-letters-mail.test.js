// Test sul BUNDLE COMPILATO: testi delle lettere nelle varie lingue, peso del logo,
// verifica prima dell'invio ed esiti reali degli invii email (dipendenti e ZIP Field Coach).
// Dati inventati; l'exe (chrome.webview) e` simulato.
//
// Esecuzione:  node build/build.js && node --test test/

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadBundle } = require("../build/bundle-harness");

const STORE = `STORE_FLAGS={};initStoreFlags();
  D.t={"1201":{to:100000,sy:0.30,pr:40}};D.c={"1201":{sc:105000,es:0,sy:0.32,nf:45,pd:0.06,s4:50,dv:20000,ac:1,sa:0.92,vel:0.95,sasv:0,sasr:0}};
  MONTHLY_SYLY={"1201":0.29};`;
const emp = (m, lang, x) => Object.assign({ m, c: "PROVA", n: "UNO", f: "SA", j: "SA", si: 1201, s: "1201 TEST", ib: 500, rl: 500, en: 210, cu: "EUR", ex: 1, ml: 0, ps: "NO", l: lang }, x || {});

function letterApp(mode, emps) {
  const app = loadBundle();
  app.run(`PRIZE_MODE="mensile";REGION="international";MODE="${mode}";CFG_YEAR=2026;CFG_MONTH=11;${STORE}
    E=${JSON.stringify(emps)};`);
  return app;
}

test("lettera mensile: in preventivo l'etichetta del totale e` nella lingua della lettera", () => {
  const app = letterApp("preventivo", [emp("F1", "FRANCESE"), emp("D1", "TEDESCO"), emp("S1", "SPAGNOLO"), emp("I1", "ITALIANO"), emp("E1", "INGLESE")]);
  // trLang usa la lingua dell'ente: forziamo la lingua per dipendente
  app.run("trLang=function(e){return e.l}");
  const lab = m => app.run(`buildLetter(E.filter(function(e){return e.m==="${m}"})[0])`);
  assert.match(lab("F1"), /BONUS POTENTIEL MAXIMUM/);
  assert.match(lab("D1"), /MAXIMALER BONUS/);
  assert.match(lab("S1"), /BONO POTENCIAL M\u00c1XIMO/);
  assert.match(lab("I1"), /MASSIMO PREMIO POTENZIALE/);
  assert.match(lab("E1"), /MAXIMUM POTENTIAL BONUS/);
  assert.doesNotMatch(lab("F1"), /MAXIMUM POTENTIAL BONUS/);
});

test("disclaimer inglese senza il refuso «participation in will end»", () => {
  const app = loadBundle();
  const all = app.run("JSON.stringify(DISCL)+JSON.stringify(D.tr||{})");
  assert.doesNotMatch(all, /participation in will end/);
  assert.match(all, /Your participation will end if/);
});

test("formula SAS/DCC nella valuta del dipendente (prima \u20ac fisso)", () => {
  const app = letterApp("consuntivo", [emp("G1", "INGLESE", { cu: "GBP", j: "SCS", f: "SCS" })]);
  app.run("CFG_MONTH=6;TC['SCS']=TC['SCS']||{};TC['SCS'].SAS=true;TC['SCS'].DCC=true;");
  const h = app.run("buildLetter(E[0])");
  assert.match(h, /GBP 2\/SAS, max GBP 200/);
  assert.match(h, /max GBP 100/);
  assert.doesNotMatch(h, /\u20ac2\/SAS/);
});

test("logo Boggi ridotto: ogni lettera porta pochi KB di immagine, non piu` 1,1 MB", () => {
  const app = loadBundle();
  const len = app.run("_BOGGI_LOGO_IMG.length");
  assert.ok(len < 30000, "logo in base64: " + len + " caratteri");
  assert.match(app.run("_BOGGI_LOGO_IMG"), /^<img src="data:image\/jpeg;base64,/);
});

test("lettera FC+VM: mese, «preventivo» e titolo regole nella lingua della lettera", () => {
  const app = loadBundle();
  app.run(`PRIZE_MODE="fcvm";MODE="preventivo";CFG_YEAR=2026;CFG_MONTH=11;
    FC_EMP={"FC1":{m:"FC1",c:"PROVA",n:"UNO",j:"FC",cu:"EUR",lang:"FRANCESE",ib:1000,bdg_stores:[],ps:"NO"},
            "FC2":{m:"FC2",c:"PROVA",n:"DUE",j:"FC",cu:"EUR",lang:"ITALIANO",ib:1000,bdg_stores:[],ps:"NO"}};
    FC_MAP={};`);
  const fr = app.run("buildFcVmLetter(FC_EMP.FC1)");
  assert.match(fr, /NOVEMBRE 2026 \u2014 PR\u00c9VISIONNEL/);
  assert.match(fr, /R\u00c8GLES DE L\u2019INCITATION/);
  const it = app.run("buildFcVmLetter(FC_EMP.FC2)");
  assert.match(it, /NOVEMBRE 2026 \u2014 PREVENTIVO/);
  assert.match(it, /REGOLE INCENTIVO/);
  assert.doesNotMatch(it, />INCENTIVE RULES</);
});

// ── invio email: exe simulato ────────────────────────────────────
function mailApp() {
  const app = loadBundle();
  app.run(`var __ov=[],__posted=[],__h=[];
    var __o=_empOverlay;_empOverlay=function(h,w){__ov.push(h);return __o(h,w)};
    window.chrome={webview:{postMessage:function(m){__posted.push(m)},addEventListener:function(t,f){__h.push(f)},removeEventListener:function(t,f){__h=__h.filter(function(x){return x!==f})}}};
    function __send(msg){__h.slice().forEach(function(f){f({data:msg})})}
    PRIZE_MODE="mensile";REGION="italia";MODE="consuntivo";CFG_YEAR=2026;CFG_MONTH=11;`);
  return app;
}

test("invio ai dipendenti: la verifica mostra l'elenco nome \u2192 email \u2192 PDF e chiede conferma", () => {
  const app = mailApp();
  app.run(`E=[{m:"A1",c:"ROSSI",n:"MARIO",mp:"mario.rossi@example.com",si:1201,ps:"NO",cu:"EUR"},
            {m:"A2",c:"BIANCHI",n:"ANNA",mp:"anna.bianchi@example.com",si:1201,ps:"NO",cu:"EUR"},
            {m:"A3",c:"VERDI",n:"LUCA",mp:"",si:1201,ps:"NO",cu:"EUR"}];
    var t=E.filter(function(e){return e.mp}),ne=E.filter(function(e){return !e.mp});
    _empShowPreflight("C:\\\\PDF",t,ne,{folderExists:true,existing:1,missing:[getEmpPdfFilename(E[1])]});`);
  const h = app.run("__ov[__ov.length-1]");
  assert.match(h, /ROSSI MARIO<\/td><td[^>]*>mario\.rossi@example\.com/);
  assert.match(h, /BIANCHI ANNA.*mancante, non inviata/s);
  assert.match(h, /VERDI LUCA.*senza email/s);
  assert.match(h, /Data dei PDF non nota in questa sessione/);
  assert.match(h, /Confermo e invio 1 email/);
});

test("invio ai dipendenti: esiti reali dall'exe; senza esito = «non confermata», mai «inviata»", () => {
  const app = mailApp();
  app.run(`var q=[{m:"A1",c:"ROSSI",n:"MARIO",mp:"a@example.com"},{m:"A2",c:"BIANCHI",n:"ANNA",mp:"b@example.com"},{m:"A3",c:"VERDI",n:"LUCA",mp:"c@example.com"}];
    _empSendLoop("C:\\\\PDF",q,[]);
    __send("mailResult:ok");__send("mailDone");          // A1 inviata
    __send("mailResult:err:Outlook chiuso");__send("mailDone"); // A2 errore
    __send("mailDone");                                  // A3 nessun esito`);
  const h = app.run("__ov[__ov.length-1]");
  assert.match(h, /Invio completato/);
  assert.match(h, />1<\/div><div[^>]*>Inviate/);
  assert.match(h, />1<\/div><div[^>]*>Non confermate/);
  assert.match(h, />1<\/div><div[^>]*>Errori/);
  assert.match(h, /Outlook chiuso/);
  const log = JSON.parse(app.run("JSON.stringify(MAIL_LOG.map(function(l){return l.m+':'+l.status}))"));
  assert.deepStrictEqual(log, ["A1:sent", "A2:error", "A3:unconfirmed"]);
});

test("ZIP ai Field Coach: elenco da confermare, poi esiti reali (prima: sempre «N inviate»)", () => {
  const app = mailApp();
  app.nextFileText = "data:application/zip;base64,QUJD";
  app.run(`E=[{m:"A1",mf:"fc.uno@example.com",si:1201,ps:"NO"},{m:"A2",mf:"fc.uno@example.com",si:1201,ps:"NO"},{m:"A3",mf:"fc.due@example.com",si:1202,ps:"NO"}];
    _fcZipBlobs={"fc.uno":{},"fc.due":{}};
    sendFcZipEmails();`);
  const pre = app.run("__ov[__ov.length-1]");
  assert.match(pre, /Invia ZIP ai Field Coach/);
  assert.match(pre, /fc\.due<\/td><td[^>]*>fc\.due@example\.com<\/td><td[^>]*>fc\.due_consuntivo_[^<]*\.zip<\/td><td[^>]*>1</);
  assert.match(pre, /fc\.uno@example\.com<\/td><td[^>]*>[^<]*\.zip<\/td><td[^>]*>2</);
  assert.strictEqual(app.run("__posted.length"), 0, "nessun invio prima della conferma");
  // conferma
  app.run("document.getElementById('fcPfSend').onclick()");
  assert.strictEqual(app.run("__posted.length"), 1);
  app.run(`__send("mailDone");                                    // fc.due: exe attuale, nessun esito
           __send("mailResult:err:Destinatario non valido");__send("mailDone"); // fc.uno: errore`);
  const res = app.run("__ov[__ov.length-1]");
  assert.match(res, /Invio email Field Coach/);
  assert.match(res, />0<\/div><div[^>]*>Inviate/);
  assert.match(res, />1<\/div><div[^>]*>Non confermate/);
  assert.match(res, />1<\/div><div[^>]*>Errori/);
  assert.match(res, /Destinatario non valido/);
  assert.doesNotMatch(res, /Riprova/);
});
