// BoggiIncentivi — file «Aggiunte» con le DIFFERENZE POSITIVE di premio tra due calcoli dello stesso mese
// ============================================================
// Serve quando un mese è già stato calcolato/pagato e un ricalcolo successivo dà importi più alti
// (es. Coefficiente Inventari corretto): la differenza si paga nel consuntivo del mese dopo come
// «Aggiunta». Il file prodotto si carica nel tab Aggiunte dell'app con «Importa aggiunte (Excel)».
//
// I calcoli NON sono riscritti qui: si carica il bundle web/app.html (build/bundle-harness.js) e si
// usano le funzioni dell'app (calcolo per voce = getVal/isOn/sickMult, come tab Calcolo e lettere),
// quindi stessi numeri dell'app (regola coerenza agente↔tab).
//
// Uso (da build/ con il bundle aggiornato: node build/build.js):
//   A) Dept stores senza il parametro Inventari (SM/VSM dei negozi Dept, premio pieno al 100%):
//      node build/diff-aggiunte.js --sessione ott.json --dept-senza-inventari --out aggiunte.xlsx
//   B) Confronto tra due sessioni dello stesso mese (vecchia = pagata, nuova = ricalcolata con i dati
//      rivisti, es. inventari corretti da Audit): solo differenze positive per dipendente e voce:
//      node build/diff-aggiunte.js --sessione ott.json --confronto ott_rivista.json --out aggiunte.xlsx
//   Opzioni: --periodo "Ottobre 2026" (testo nel riepilogo), --pagamento "Novembre 2026".
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadBundle } = require("./bundle-harness");

// Voci importabili nel tab Aggiunte (stesse chiavi di AGG_KEYS) e voci che il tab non gestisce
const AGG_COLS = [
  ["rb", "BDG (Lordo)"], ["rbn", "BDG (Netto)"], ["rd", "Digital"], ["rs", "SY"], ["rp", "Privilege"],
  ["rsa", "SAS"], ["rdc", "DCC"], ["rcs", "CS"], ["ra", "Articoli"], ["pq", "QTY Dept"],
];
const NON_IMPORT = { vi: "Visual In Store" };

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const k = t.slice(2);
      const nxt = argv[i + 1];
      if (nxt === undefined || nxt.startsWith("--")) a[k] = true;
      else { a[k] = nxt; i++; }
    } else a._.push(t);
  }
  return a;
}

function openSession(file) {
  const app = loadBundle();
  app.nextFileText = fs.readFileSync(file, "utf8");
  app.run("loadSession({files:[{name:'s.json'}],value:''})");
  const err = app.alerts.filter(x => /errore|non è una sessione/i.test(x));
  if (err.length || app.errors.length) throw new Error("Sessione non caricata: " + err.concat(app.errors).join(" | "));
  return app;
}

// Premio per voce di OGNI dipendente (stessa formula di calcE: voci attive × moltiplicatore malattia).
// Esclude le aggiunte manuali, i premi sospesi e gli USA (calcUSA: nessun coefficiente inventari).
const ITEMS_JS = `(function(){
  var out={};
  E.forEach(function(e){
    if(e.ps==="SI"||isUSA(e.si,e))return;
    var sm=sickMult(e.ml),it={};
    IT.forEach(function(x){
      var k=x.k;
      if(k==="ra"&&!PARAMS.artEnabled)return;
      if(k!=="vi"&&!isOn(e.j,k))return;
      var v=getVal(e,k)*sm;
      if(v)it[k]=v;
    });
    out[e.m]={m:e.m,c:e.c,n:e.n,si:e.si,s:e.s,j:e.f||e.j,cu:e.cu||"EUR",ex:e.ex||1,
      pct:(demoltAppliesStore(e)&&DEMOLT_RESULT_STORE[String(e.si)])?DEMOLT_RESULT_STORE[String(e.si)].pct:null,
      dept:isD(e.si),items:it};
  });
  return JSON.stringify(out);
})()`;
const itemsOf = app => JSON.parse(app.run(ITEMS_JS));

// Toglie il Coefficiente Inventari ai soli negozi Dept (il resto resta com'è)
function stripDeptInventari(app) {
  return JSON.parse(app.run(`(function(){
    var rem=[];
    Object.keys(DEMOLT_RESULT_STORE).forEach(function(sid){
      if(isD(sid)&&!storeIsUSA(sid)){rem.push(sid);delete DEMOLT_RESULT_STORE[sid];}
    });
    return JSON.stringify(rem);
  })()`));
}

function round2(x) { return Math.round(x * 100) / 100; }

// Differenze positive per voce tra old e new. Ritorna le righe (solo dipendenti con almeno una differenza > 0).
function diffRows(oldI, newI) {
  const rows = [];
  Object.keys(oldI).forEach(m => {
    const o = oldI[m], n = newI[m];
    if (!n) return;
    const keys = new Set(Object.keys(o.items).concat(Object.keys(n.items)));
    const d = {}, neg = {};
    let totOld = 0, totNew = 0, totPos = 0;
    keys.forEach(k => {
      const ov = o.items[k] || 0, nv = n.items[k] || 0;
      totOld += ov; totNew += nv;
      const df = round2(nv - ov);
      if (df > 0) { d[k] = df; totPos += df; } else if (df < 0) neg[k] = df;
    });
    if (!Object.keys(d).length && !Object.keys(neg).length) return;
    rows.push({ ...o, oldTot: round2(totOld), newTot: round2(totNew), diff: d, neg, totPos: round2(totPos), pctNew: n.pct });
  });
  return rows;
}

function buildWorkbook(XLSX, rows, meta) {
  const imp = rows.filter(r => Object.keys(r.diff).some(k => AGG_COLS.some(c => c[0] === k)));
  const sorted = rows.slice().sort((a, b) => (Number(a.si) - Number(b.si)) || String(a.m).localeCompare(String(b.m)));

  // Foglio 1 — Aggiunte (importabile)
  const h1 = ["Matricola", "Cognome", "Nome", "Negozio", "Ruolo", "Valuta"].concat(AGG_COLS.map(c => c[1]));
  const a1 = [h1];
  sorted.forEach(r => {
    if (!Object.keys(r.diff).some(k => AGG_COLS.some(c => c[0] === k))) return;
    a1.push([String(r.m), r.c, r.n, r.s, r.j, r.cu].concat(AGG_COLS.map(c => r.diff[c[0]] || null)));
  });

  // Foglio 2 — Dettaglio ricalcolo
  const vk = Object.keys(NON_IMPORT);
  const h2 = ["Negozio", "Matricola", "Cognome", "Nome", "Ruolo", "Valuta", "Cambio EUR", "% coeff. inventari applicato", "Premio calcolato (prima)", "Premio ricalcolato (dopo)"]
    .concat(AGG_COLS.map(c => "Diff. " + c[1])).concat(vk.map(k => "Diff. " + NON_IMPORT[k] + " (NON importabile)"))
    .concat(["Totale differenza (valuta locale)", "Totale differenza (EUR)"]);
  const a2 = [h2];
  const totLoc = {};
  let totEur = 0;
  sorted.forEach(r => {
    const eur = round2(r.totPos * r.ex);
    totLoc[r.cu] = round2((totLoc[r.cu] || 0) + r.totPos); totEur = round2(totEur + eur);
    a2.push([r.s, String(r.m), r.c, r.n, r.j, r.cu, r.ex, r.pct == null ? null : r.pct, r.oldTot, r.newTot]
      .concat(AGG_COLS.map(c => r.diff[c[0]] || null)).concat(vk.map(k => r.diff[k] || null)).concat([r.totPos, eur]));
  });
  const nonImp = sorted.filter(r => vk.some(k => r.diff[k]));
  const negRows = sorted.filter(r => Object.keys(r.neg).length);

  // Foglio 3 — Riepilogo
  const a3 = [["Aggiunte da differenza di ricalcolo"], [""],
    ["Scenario", meta.scenario], ["Periodo di riferimento", meta.periodo || ""], ["Da pagare con il consuntivo di", meta.pagamento || ""],
    ["Sessione di partenza", meta.sessione], meta.confronto ? ["Sessione ricalcolata", meta.confronto] : null,
    ["Generato il", new Date().toLocaleString("it-IT")], [""],
    ["Dipendenti con differenza positiva", rows.length]].filter(Boolean);
  Object.keys(totLoc).sort().forEach(c => a3.push(["Totale " + c + " (valuta locale)", totLoc[c]]));
  a3.push(["Totale in EUR (cambi della sessione)", totEur], [""]);
  a3.push(["Come usarlo: nell'app, sessione del mese di pagamento, tab «Aggiunte» → «Importa aggiunte (Excel)» e scegli questo file (foglio «Aggiunte»). Gli importi si SOMMANO alle aggiunte già presenti e NON risentono di regole, policy o malattia."]);
  a3.push(["Importi in valuta locale del dipendente, come nel tab Aggiunte. Non importarlo due volte: raddoppia gli importi."]);
  if (meta.note) meta.note.forEach(t => a3.push([t]));
  if (nonImp.length) a3.push([""], ["ATTENZIONE: differenze su voci che il tab Aggiunte non gestisce (da inserire a mano):"], ...nonImp.map(r => ["  " + r.m + " " + r.c + " " + r.n, vk.map(k => NON_IMPORT[k] + " " + (r.diff[k] || 0)).join("; ")]));
  if (negRows.length) a3.push([""], ["Voci che nel ricalcolo SCENDONO (ignorate, non si recuperano):"], ...negRows.map(r => ["  " + r.m + " " + r.c + " " + r.n, JSON.stringify(r.neg)]));

  const wb = XLSX.utils.book_new();
  const mk = (aoa, widths) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = widths.map(w => ({ wch: w })); return ws; };
  XLSX.utils.book_append_sheet(wb, mk(a1, [11, 24, 24, 28, 10, 8].concat(AGG_COLS.map(() => 12))), "Aggiunte");
  XLSX.utils.book_append_sheet(wb, mk(a2, [28, 11, 24, 24, 10, 8, 10, 12, 14, 14].concat(AGG_COLS.map(() => 12)).concat(vk.map(() => 16)).concat([16, 16])), "Dettaglio ricalcolo");
  XLSX.utils.book_append_sheet(wb, mk(a3, [46, 60]), "Riepilogo");
  return { wb, nImport: a1.length - 1, totLoc, totEur, nonImp, negRows };
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.sessione || !a.out || (!a["dept-senza-inventari"] && !a.confronto)) {
    console.error("Uso: node build/diff-aggiunte.js --sessione <sessione.json> (--dept-senza-inventari | --confronto <sessione_rivista.json>) --out <file.xlsx> [--periodo \"Ottobre 2026\"] [--pagamento \"Novembre 2026\"]");
    process.exit(1);
  }
  const A = openSession(a.sessione);
  const oldI = itemsOf(A);
  let newI, scenario, note = [];
  if (a["dept-senza-inventari"]) {
    const rem = stripDeptInventari(A);
    newI = itemsOf(A);
    scenario = "Negozi Dept: premio SM/VSM senza il parametro Inventari (coefficiente 100%)";
    note.push("Negozi Dept ai quali è stato tolto il coefficiente: " + rem.sort().join(", "));
  } else {
    const B = openSession(a.confronto);
    newI = itemsOf(B);
    scenario = "Confronto tra due sessioni: solo le differenze positive per dipendente e voce";
  }
  const rows = diffRows(oldI, newI);

  // XLSX vendorizzato (SheetJS) caricato in un contesto vm
  const ctx = {}; ctx.self = ctx; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "vendor-xlsx", "010_xlsx.full.min.js"), "utf8"), ctx);
  const meta = { scenario, periodo: a.periodo, pagamento: a.pagamento, sessione: path.basename(a.sessione), confronto: a.confronto ? path.basename(a.confronto) : "", note };
  const r = buildWorkbook(ctx.XLSX, rows, meta);
  const buf = Buffer.from(ctx.XLSX.write(r.wb, { type: "array", bookType: "xlsx" }));
  fs.writeFileSync(a.out, buf);

  // Controllo di coerenza: somma delle differenze per voce = differenza dei premi totali
  let bad = 0;
  rows.forEach(x => { if (Math.abs((x.newTot - x.oldTot) - (x.totPos + Object.keys(x.neg).reduce((s, k) => s + x.neg[k], 0))) > 0.02) bad++; });
  console.log("Scritto: " + a.out);
  console.log("Dipendenti con differenza: " + rows.length + " · importabili: " + r.nImport);
  console.log("Totale per valuta:", JSON.stringify(r.totLoc), "· EUR " + r.totEur);
  if (r.nonImp.length) console.log("ATTENZIONE voci non importabili (Visual) per " + r.nonImp.length + " dipendenti");
  if (r.negRows.length) console.log("Voci in calo ignorate per " + r.negRows.length + " dipendenti");
  if (bad) console.log("ATTENZIONE: " + bad + " righe con scostamento tra somma voci e totale");
}

if (require.main === module) main();
module.exports = { diffRows, AGG_COLS };
