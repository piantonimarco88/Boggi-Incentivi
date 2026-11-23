// BoggiIncentivi — ricalcolo premi con i dati inventari CORRETTI dall'Audit (file «Incentivi <Mese>.xlsx»)
// ============================================================
// Il file dell'Audit ha i fogli «RANKING NEGOZI» (Accuracy e % DCC Executed corretta per negozio) e
// «RANKING FC» (% DCC Sent e % DCC Executed corrette per Field Coach/area). Lo strumento:
//   1. porta quei dati nello stesso formato dell'import «Inventari + Accuracy» dell'app e li passa a
//      demoltProcessInventari (la funzione dell'app: stesse matrici, stesse regole di assenza/USA/WIC);
//   2. ricalcola i premi con le funzioni dell'app (calcE / calcFcVmPremio), nella sessione mensile e in
//      quella FC+VM del mese, e confronta con i premi calcolati con i dati inventari precedenti;
//   3. scrive un Excel con le differenze (positive e negative) e, per ognuno dei due ambiti, un file
//      «Aggiunte» con le sole differenze positive, importabile nell'app («Importa aggiunte (Excel)»).
//
// AREE DIVISE (stesso FC su due aree, es. Teoman Ozgultekin 1/2, Gianni Zanella UK/FR): il file Audit ha
// una riga per area con lo stesso nome. Ogni riga è assegnata all'area dell'app (matricola e matricola_2)
// confrontando i task inviati/completati: somma dei negozi dell'area (FC_MAP) = valori della riga.
// Il numero d'area dell'Audit NON coincide per forza con il suffisso dell'app (Teoman: «1» = _2).
//
// Dept stores: il coefficiente vale da dicembre 2026 (rule_cfg.demoltDept) quindi sono fuori dal confronto;
// la loro differenza di ottobre è nel file AGGIUNTE_DEPT_DIFF_INVENTARI_<mese>.xlsx (diff-aggiunte.js).
// Regola 99,5% dei VM con negozi singoli (v9.122): se cambia il premio di un VM per quella regola, è in
// colonna a parte («Regola 99,5% VM»), perché dipende da quale regola era in vigore quando è stato pagato.
//
// Uso:
//   node build/audit-ricalcolo.js --audit "Incentivi Ottobre.xlsx" --mensile sessione_mensile.json \
//        --fcvm sessione_fcvm.json --out-dir <cartella> [--pagato "Incentivi_consuntivo_<mese>.xlsx"] [--tag OTTOBRE_2026] //        [--periodo "Ottobre 2026"] [--pagamento "Novembre 2026"]
//   --pagato (facoltativo): file «Incentivi consuntivo» realmente consegnato/pagato (colonna «TOTALE INCENTIVO EROGATO (LC)»).
//   Serve a verificare che la sessione di partenza dia gli stessi premi: dove un override manuale 100%/60% della sessione
//   non c'è più nel pagato, viene tolto (come nel pagato) prima del confronto; le altre differenze di base sono elencate
//   nel foglio «Controlli» (non toccano il confronto, che misura solo l'effetto dei dati inventari).
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { openSession, itemsOf, round2, AGG_COLS, NON_IMPORT, diffRows, buildWorkbook } = require("./diff-aggiunte");

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { const k = argv[i].slice(2), n = argv[i + 1]; if (n === undefined || n.startsWith("--")) a[k] = true; else { a[k] = n; i++; } }
  }
  return a;
}
const norm = s => String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase();
const nameKey = s => String(s == null ? "" : s).toUpperCase().replace(/_\d+$/, "").replace(/\s+/g, " ").trim().split(" ").sort().join(" ");

function loadXlsxLib() {
  const ctx = { Buffer }; ctx.self = ctx; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "vendor-xlsx", "010_xlsx.full.min.js"), "utf8"), ctx);
  return ctx.XLSX;
}
// Come _demoltSheetRows dell'app: gli errori Excel (#DIV/0!) non diventano numeri ("#ERR")
function sheetRows(X, ws) {
  const rg = X.utils.decode_range(ws["!ref"] || "A1"), rows = [];
  for (let r = rg.s.r; r <= rg.e.r; r++) {
    const row = [];
    for (let c = rg.s.c; c <= rg.e.c; c++) { const cell = ws[X.utils.encode_cell({ r, c })]; row.push(cell ? (cell.t === "e" ? "#ERR" : (cell.v == null ? null : cell.v)) : null); }
    rows.push(row);
  }
  return rows;
}
const colBy = (hdr, re) => hdr.findIndex(h => re.test(norm(h)));

// ── Lettura del file Audit → formato dell'import dell'app ───────────────────────────────
function readAudit(file) {
  const X = loadXlsxLib();
  const wb = X.read(fs.readFileSync(file), { type: "buffer" });
  const find = re => wb.SheetNames.find(n => re.test(norm(n)));
  const nN = find(/^ranking negozi/), nF = find(/^ranking fc/);
  if (!nN || !nF) throw new Error("Fogli «RANKING NEGOZI» e «RANKING FC» non trovati (fogli presenti: " + wb.SheetNames.join(", ") + ")");
  const neg = sheetRows(X, wb.Sheets[nN]), fc = sheetRows(X, wb.Sheets[nF]);
  // negozi: la colonna «% DCC EXECUTED CORRETTO» assume il nome atteso dall'import («% DCC Executed corretta»)
  const nh = neg[0].map(h => /^% ?dcc executed corrett[oa]$/.test(norm(h)) ? "% DCC Executed corretta" : h);
  if (!nh.includes("% DCC Executed corretta")) throw new Error("RANKING NEGOZI: colonna «% DCC EXECUTED CORRETTO» non trovata");
  const negozi = [nh].concat(neg.slice(1));
  const h = fc[0];
  const cN = colBy(h, /^field coach$/), cA = colBy(h, /^area$/), cS = colBy(h, /^sended tasks$/), cC = colBy(h, /^completed tasks$/),
    cSent = colBy(h, /^% ?dcc sent corrett/), cEx = colBy(h, /^% ?dcc executed corrett/);
  if ([cN, cS, cC, cSent, cEx].some(i => i < 0)) throw new Error("RANKING FC: colonne attese non trovate (Field Coach, Sended/Completed tasks, % DCC Sent CORRETTO, %DCC EXECUTED CORRETTO)");
  const fcRows = [];
  for (let r = 1; r < fc.length; r++) {
    const row = fc[r]; if (!row || !row[cN]) continue;
    fcRows.push({ name: String(row[cN]).trim(), area: cA >= 0 ? String(row[cA] == null ? "" : row[cA]).trim() : "", sent: row[cS], comp: row[cC], pSent: row[cSent], pEx: row[cEx] });
  }
  // somme task per negozio (per assegnare le aree divise)
  const hs = negozi[0], iId = colBy(hs, /^store id$/), iS = colBy(hs, /^sended tasks$/), iC = colBy(hs, /^completed tasks$/);
  const taskByStore = {};
  negozi.slice(1).forEach(r => { if (r[iId] != null && r[iId] !== "") taskByStore[String(r[iId]).trim()] = { s: Number(r[iS]) || 0, c: Number(r[iC]) || 0 }; });
  return { negozi, fcRows, taskByStore, sheets: { negozi: nN, fc: nF } };
}

// Righe FC nel formato dell'import: nome (con suffisso _2 per le aree divise), % executed, % sent
function buildFcSheet(audit, fcApp) {
  const log = [], out = [["Field Coach", "% DCC Executed", "% DCC Sent corretta"]];
  const groups = {};
  audit.fcRows.forEach(r => { (groups[nameKey(r.name)] = groups[nameKey(r.name)] || []).push(r); });
  Object.keys(groups).forEach(k => {
    const rows = groups[k], cands = fcApp.filter(e => nameKey(e.full) === k);
    if (rows.length === 1) {
      out.push([rows[0].name, rows[0].pEx, rows[0].pSent]);
      log.push({ name: rows[0].name, area: rows[0].area, to: cands.map(c => c.m).join(" + ") || "(nessuna area nell'app)", how: "riga unica" });
      return;
    }
    // aree divise: confronto task inviati/completati con la somma dei negozi di ogni area dell'app
    const sig = cands.map(c => ({ c, s: c.stores.reduce((t, sid) => t + ((audit.taskByStore[sid] || {}).s || 0), 0), k: c.stores.reduce((t, sid) => t + ((audit.taskByStore[sid] || {}).c || 0), 0) }));
    const used = new Set();
    rows.forEach(r => {
      const hit = sig.filter(x => !used.has(x.c.m) && x.s === Number(r.sent) && x.k === Number(r.comp));
      if (hit.length !== 1) throw new Error("Area divisa di " + r.name + " (" + r.area + "): impossibile assegnarla (task " + r.sent + "/" + r.comp + "; aree app: " + sig.map(x => x.c.m + " " + x.s + "/" + x.k).join(", ") + ")");
      used.add(hit[0].c.m);
      out.push([hit[0].c.full, r.pEx, r.pSent]);
      log.push({ name: r.name, area: r.area, to: hit[0].c.m + " (" + hit[0].c.full + ")", how: "task " + r.sent + "/" + r.comp + " = somma negozi area", pEx: r.pEx, pSent: r.pSent });
    });
  });
  return { rows: out, log };
}

// ── Estrazione dalle sessioni ───────────────────────────────────────────────────────────
const FC_APP_JS = `(function(){
  var out=[];
  getFcVmPool().forEach(function(emp){
    if(emp.j!=="FC")return;
    var stores=Object.keys(FC_MAP).filter(function(sid){var mp=FC_MAP[sid];if(mp.tipo==="BDG")return false;var a=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);return a.indexOf(emp.m)>=0;});
    out.push({m:emp.m,full:String(emp.n)+" "+String(emp.c),stores:stores});
  });
  return JSON.stringify(out);})()`;
const FC_TOT_JS = `(function(){
  var out={};
  getFcVmPool().forEach(function(emp){
    var r=calcFcVmPremio(emp.m),adj=0;
    (r.bdgDetail||[]).forEach(function(b){if(b.earned&&b.to>0&&b.scTotale/b.to<1)adj+=b.prize;});
    var dr=DEMOLT_RESULT_FC[emp.m]||null;
    out[emp.m]={m:emp.m,c:emp.c,n:emp.n,j:emp.j,cu:emp.cu||"EUR",ex:(emp.ex&&emp.ex!==1&&emp.ex>0)?emp.ex:getFcVmExRate(emp.cu),
      total:r.totalPremioLC||0,area:r.premio||0,bdg:r.bdgPrize||0,adj995:adj,pct:dr?dr.pct:null,invio:dr?dr.invio:null,compl:dr?dr.compl:null};
  });
  return JSON.stringify(out);})()`;
const STORE_RES_JS = "JSON.stringify(DEMOLT_RESULT_STORE)";
const APPLY_JS = `(function(){var r=demoltProcessInventari(_sh);return JSON.stringify({error:r.error||null,nStore:r.nStore,nFc:r.nFc,items:r.items});})()`;

function applyAudit(app, sh) {
  app.ctx._sh = sh;
  const r = JSON.parse(app.run(APPLY_JS));
  if (r.error) throw new Error("Import inventari: " + r.error);
  return r;
}

// ── Base «pagato»: confronto sessione ↔ file consegnato ───────────────────────────────
function readPaid(file) {
  const X = loadXlsxLib();
  const wb = X.read(fs.readFileSync(file), { type: "buffer" });
  const rows = sheetRows(X, wb.Sheets[wb.SheetNames[0]]), h = rows[0];
  const cM = colBy(h, /^matricola dipendente$/), cT = colBy(h, /^totale incentivo erogato \(lc\)$/);
  if (cM < 0 || cT < 0) throw new Error("File pagato: colonne «MATRICOLA DIPENDENTE» / «TOTALE INCENTIVO EROGATO (LC)» non trovate");
  const out = {};
  rows.slice(1).forEach(r => { if (r[cM] != null && r[cM] !== "") out[String(r[cM]).trim()] = Number(r[cT]) || 0; });
  return out;
}
// Totale di ogni dipendente non USA (senza aggiunte manuali) con il coefficiente anche ai Dept, come al momento del pagamento
const PAID_CMP_JS = `(function(){var o={};E.forEach(function(e){if(isUSA(e.si,e))return;o[e.m]={t:calcE(e)-aggTotal(e.m),c:e.c,n:e.n,si:e.si,s:e.s,j:e.j,cu:e.cu||"EUR",ovb:e.ov_b100||"",ovr:e.ov_rid||""};});return JSON.stringify(o);})()`;
function alignToPaid(app, paid) {
  const rule = JSON.parse(app.run("JSON.stringify(_ruleCfgGet())"));
  app.run("_applyRuleCfg({demoltDept:[2020,1]})"); // come pagato: i Dept avevano il coefficiente
  const cmp = () => JSON.parse(app.run(PAID_CMP_JS));
  const base = cmp(), fixed = [], left = [];
  Object.keys(base).forEach(m => {
    const b = base[m], p = paid[m];
    if (p == null) { if (Math.abs(b.t) > 0.005) left.push({ ...b, m, paid: null, why: "assente nel file pagato" }); return; }
    if (Math.abs(b.t - p) <= 0.51) return;
    if (b.ovb === "SI" || b.ovr === "SI") {
      app.run("(function(){var e=E.filter(function(x){return x.m===" + JSON.stringify(m) + "})[0];e.__ob=e.ov_b100;e.__or=e.ov_rid;delete e.ov_b100;delete e.ov_rid;})()");
      const t2 = cmp()[m].t;
      if (Math.abs(t2 - p) <= 0.51) { fixed.push({ ...b, m, paid: p, after: t2 }); return; }
      app.run("(function(){var e=E.filter(function(x){return x.m===" + JSON.stringify(m) + "})[0];if(e.__ob!==undefined)e.ov_b100=e.__ob;if(e.__or!==undefined)e.ov_rid=e.__or;delete e.__ob;delete e.__or;})()");
    }
    left.push({ ...b, m, paid: p, why: "premio sessione diverso dal pagato" });
  });
  app.run("_applyRuleCfg(" + JSON.stringify({ demoltDept: rule.demoltDept }) + ")");
  return { fixed, left, n: Object.keys(base).length };
}

const KEY_LBL = Object.assign({}, ...AGG_COLS.map(c => ({ [c[0]]: c[1] })), NON_IMPORT);
const KEYS = AGG_COLS.map(c => c[0]);

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.audit || !a.mensile || !a.fcvm || !a["out-dir"]) {
    console.error("Uso: node build/audit-ricalcolo.js --audit <Incentivi Mese.xlsx> --mensile <sessione mensile.json> --fcvm <sessione FC+VM.json> --out-dir <cartella> [--tag OTTOBRE_2026] [--periodo \"Ottobre 2026\"] [--pagamento \"Novembre 2026\"]");
    process.exit(1);
  }
  const tag = a.tag || "RICALCOLO", periodo = a.periodo || "", pagamento = a.pagamento || "";
  const audit = readAudit(a.audit);
  const M = openSession(a.mensile), F = openSession(a.fcvm);
  if (M.run("PRIZE_MODE") === "fcvm" || F.run("PRIZE_MODE") !== "fcvm") throw new Error("Sessioni scambiate: --mensile deve essere una sessione mensile e --fcvm una sessione FC+VM");
  const paidAlign = a.pagato ? alignToPaid(M, readPaid(a.pagato)) : null;

  // ── Negozi (sessione mensile) ──
  const oldStore = JSON.parse(M.run(STORE_RES_JS));
  const oldI = itemsOf(M);
  const fcApp = JSON.parse(F.run(FC_APP_JS));
  const fcSheet = buildFcSheet(audit, fcApp);
  const shM = { negozi: audit.negozi, fc: fcSheet.rows };
  const impM = applyAudit(M, shM);
  const newStore = JSON.parse(M.run(STORE_RES_JS));
  const newI = itemsOf(M);

  // ── FC+VM ──
  const oldFcDr = JSON.parse(F.run("JSON.stringify(DEMOLT_RESULT_FC)"));
  const oldFc = JSON.parse(F.run(FC_TOT_JS));
  const impF = applyAudit(F, shM);
  const newFc = JSON.parse(F.run(FC_TOT_JS));

  // ── Righe negozi: differenze con segno per voce ──
  const sRows = [];
  Object.keys(oldI).forEach(m => {
    const o = oldI[m], n = newI[m]; if (!n) return;
    const d = {}; let to = 0, tn = 0;
    new Set(Object.keys(o.items).concat(Object.keys(n.items))).forEach(k => { const ov = o.items[k] || 0, nv = n.items[k] || 0; to += ov; tn += nv; const df = round2(nv - ov); if (df) d[k] = df; });
    const tot = round2(tn - to);
    const sid = String(o.si), os = oldStore[sid] || {}, ns = newStore[sid] || {};
    const changed = Math.abs(tot) >= 0.005 || (o.pct !== n.pct && (o.pct != null || n.pct != null));
    if (!changed) return;
    sRows.push({ ...o, d, oldTot: round2(to), newTot: round2(tn), tot, pctOld: o.pct, pctNew: n.pct, complOld: os.compl, complNew: ns.compl, accOld: os.acc, accNew: ns.acc });
  });
  sRows.sort((x, y) => (Number(x.si) - Number(y.si)) || String(x.m).localeCompare(String(y.m)));

  // ── Righe FC+VM ──
  const fRows = [];
  Object.keys(newFc).forEach(m => {
    const o = oldFc[m] || { total: 0, area: 0, bdg: 0, adj995: 0 }, n = newFc[m];
    const dInv = round2(n.total - o.total), rule = round2(n.adj995);
    const drOld = oldFcDr[m] || {};
    if (Math.abs(dInv) < 0.005 && Math.abs(rule) < 0.005 && ((drOld.pct == null ? null : drOld.pct) === (n.pct == null ? null : n.pct))) return;
    fRows.push({ ...n, base: String(m).replace(/_\d+$/, ""), oldTotal: o.total, newTotal: n.total, dInv, rule, drOld, tot: round2(dInv + rule) });
  });
  fRows.sort((x, y) => String(x.base).localeCompare(String(y.base)) || String(x.m).localeCompare(String(y.m)));

  // ── Totali ──
  const sum = (rows, f, cu) => round2(rows.filter(r => !cu || r.cu === cu).reduce((t, r) => t + f(r), 0));
  const sumEur = (rows, f) => round2(rows.reduce((t, r) => t + f(r) * r.ex, 0));
  const curr = rows => Array.from(new Set(rows.map(r => r.cu))).sort();
  const pos = f => r => Math.max(0, f(r)), neg = f => r => Math.min(0, f(r));

  // ── Excel principale ──
  const X = loadXlsxLib();
  const wb = X.utils.book_new();
  const mk = (aoa, widths) => { const ws = X.utils.aoa_to_sheet(aoa); ws["!cols"] = widths.map(w => ({ wch: w })); return ws; };
  const pctC = v => (v == null ? null : v);

  const hS = ["Negozio", "Matricola", "Cognome", "Nome", "Ruolo", "Valuta", "Cambio EUR", "Coeff. prima", "Coeff. dopo", "Completam. prima", "Completam. dopo", "Accuracy prima", "Accuracy dopo", "Premio prima", "Premio dopo"]
    .concat(KEYS.map(k => "Diff. " + KEY_LBL[k])).concat(["DIFFERENZA (valuta locale)", "DIFFERENZA (EUR)"]);
  const aS = [hS].concat(sRows.map(r => [r.s, String(r.m), r.c, r.n, r.j, r.cu, r.ex, pctC(r.pctOld), pctC(r.pctNew), pctC(r.complOld), pctC(r.complNew), pctC(r.accOld), pctC(r.accNew), r.oldTot, r.newTot]
    .concat(KEYS.map(k => r.d[k] || null)).concat([r.tot, round2(r.tot * r.ex)])));

  const hF = ["Persona (matr.)", "Matricola area", "Cognome", "Nome", "Valuta", "Cambio EUR", "% Invio prima", "% Invio dopo", "% Compl. prima", "% Compl. dopo", "Coeff. prima", "Coeff. dopo", "Premio prima", "Premio dopo", "Diff. inventari", "Regola 99,5% VM (v9.122)", "TOTALE da erogare (valuta locale)", "TOTALE da erogare (EUR)"];
  const aF = [hF].concat(fRows.map(r => [r.base, String(r.m), r.c, r.n, r.cu, r.ex, pctC(r.drOld.invio), pctC(r.invio), pctC(r.drOld.compl), pctC(r.compl), pctC(r.drOld.pct), pctC(r.pct), r.oldTotal, r.newTotal, r.dInv, r.rule || null, r.tot, round2(r.tot * r.ex)]));

  const sumRows = [["Ricalcolo premi con i dati inventari corretti dall'Audit"], [""],
    ["Periodo di riferimento", periodo], ["Da erogare con il consuntivo di", pagamento], ["File Audit", path.basename(a.audit)],
    ["Sessione mensile", path.basename(a.mensile)], ["Sessione FC+VM", path.basename(a.fcvm)], ["Generato il", new Date().toLocaleString("it-IT")], [""],
    ["NEGOZI (SM/VSM, esclusi Dept e USA)", ""], ["Dipendenti con differenza", sRows.filter(r => Math.abs(r.tot) >= 0.005).length]];
  curr(sRows).forEach(c => sumRows.push(["  " + c + ": positive / negative / saldo", sum(sRows, pos(r => r.tot), c) + " / " + sum(sRows, neg(r => r.tot), c) + " / " + sum(sRows, r => r.tot, c)]));
  sumRows.push(["  Totale convertito in EUR: positive / negative / saldo", sumEur(sRows, pos(r => r.tot)) + " / " + sumEur(sRows, neg(r => r.tot)) + " / " + sumEur(sRows, r => r.tot)], [""], ["FC+VM (aree)", ""], ["Aree con differenza", fRows.length]);
  curr(fRows).forEach(c => sumRows.push(["  " + c + ": positive / negative / saldo", sum(fRows, pos(r => r.dInv), c) + " / " + sum(fRows, neg(r => r.dInv), c) + " / " + sum(fRows, r => r.dInv, c)]));
  sumRows.push(["  Totale convertito in EUR (solo inventari): positive / negative / saldo", sumEur(fRows, pos(r => r.dInv)) + " / " + sumEur(fRows, neg(r => r.dInv)) + " / " + sumEur(fRows, r => r.dInv)]);
  if (fRows.some(r => r.rule)) sumRows.push(["  Regola 99,5% VM (separata, non da inventari)", fRows.filter(r => r.rule).map(r => r.c + " " + r.n + " " + r.cu + " " + r.rule).join("; ")]);
  sumRows.push([""], ["Come leggere: «prima» = premio con i dati inventari già usati per il consuntivo, «dopo» = con i dati dell'Audit; differenza = dopo − prima. Positivo = da erogare in più, negativo = pagato in più."],
    ["Le aggiunte dell'app non possono essere negative: i file «Aggiunte» importabili contengono SOLO le differenze positive; le negative vanno gestite a parte (recupero)."],
    ["Dept stores: fuori da questo confronto (coefficiente da dicembre 2026); la loro differenza di ottobre è nel file AGGIUNTE_DEPT_DIFF_INVENTARI."]);
  // gli avvisi sulla mappa negozi→FC riguardano solo la sessione FC+VM (nella mensile la mappa non c'è)
  const warns = impM.items.filter(i => (i.lvl === "warn" || i.lvl === "err") && i.sc !== "f").concat(impF.items.filter(i => (i.lvl === "warn" || i.lvl === "err") && i.sc !== "s"));
  if (warns.length) { sumRows.push([""], ["AVVISI DELL'IMPORT"]); warns.forEach(i => sumRows.push(["  " + i.t, i.d || ""])); }
  X.utils.book_append_sheet(wb, mk(sumRows, [60, 70]), "Riepilogo");
  X.utils.book_append_sheet(wb, mk(aS, [26, 10, 22, 22, 9, 7, 9, 8, 8, 9, 9, 9, 9, 11, 11].concat(KEYS.map(() => 11)).concat([14, 12])), "Negozi");
  X.utils.book_append_sheet(wb, mk(aF, [11, 13, 18, 18, 7, 9, 9, 9, 9, 9, 8, 8, 11, 11, 11, 13, 14, 12]), "FC+VM");
  const aC = [["Riga Audit (Field Coach)", "Area Audit", "Assegnata a (area app)", "Criterio", "% DCC Executed usata", "% DCC Sent usata"]]
    .concat(fcSheet.log.map(l => [l.name, l.area, l.to, l.how, l.pEx == null ? null : l.pEx, l.pSent == null ? null : l.pSent]));
  X.utils.book_append_sheet(wb, mk(aC, [24, 10, 34, 38, 14, 14]), "Assegnazione aree");
  // ── Foglio Controlli ──
  const aK = [["CONTROLLI"], [""]];
  if (paidAlign) {
    aK.push(["Base «pagato» (" + path.basename(a.pagato) + "): dipendenti non USA confrontati", paidAlign.n],
      ["Override manuale tolto per allinearsi al pagato", paidAlign.fixed.length], ["Differenze di base NON spiegate (non toccano il confronto)", paidAlign.left.length]);
    if (paidAlign.fixed.length) { aK.push([""], ["Override 100%/60% rimosso (nel pagato non c'era più):"]); paidAlign.fixed.forEach(r => aK.push(["  " + r.m + " " + r.c + " " + r.n + " — " + r.s, "sessione " + r.t + " → " + r.after + " = pagato " + r.paid])); }
    if (paidAlign.left.length) { aK.push([""], ["Premio della sessione ≠ file pagato (da verificare; non dipende dagli inventari):"]); paidAlign.left.forEach(r => aK.push(["  " + r.m + " " + r.c + " " + r.n + " — " + r.s + " (" + r.j + ")", "sessione " + round2(r.t) + " · pagato " + (r.paid == null ? "—" : r.paid) + " · " + r.why])); }
  } else aK.push(["Base «pagato»", "non verificata (nessun --pagato)"]);
  // SM/VSM (non Dept) senza risultato inventari dopo l'Audit: nessuna riduzione
  const noRes = {};
  Object.keys(newI).forEach(m => { const n = newI[m], o = oldI[m]; if (n.dept || !/SM/.test(n.j) || n.pct != null) return; const k = String(n.si); noRes[k] = noRes[k] || { s: n.s, old: o ? o.pct : null, n: 0 }; noRes[k].n++; });
  const noResL = Object.keys(noRes).sort((x, y) => Number(x) - Number(y));
  aK.push([""], ["Negozi con SM/VSM senza risultato inventari dopo l'Audit (premio non ridotto): " + noResL.length]);
  noResL.forEach(k => aK.push(["  " + noRes[k].s, noRes[k].old != null ? "prima aveva coefficiente " + Math.round(noRes[k].old * 100) + "%" : "nemmeno prima"]));
  X.utils.book_append_sheet(wb, mk(aK, [70, 70]), "Controlli");
  const mainFile = path.join(a["out-dir"], "RICALCOLO_INVENTARI_AUDIT_" + tag + ".xlsx");
  fs.writeFileSync(mainFile, Buffer.from(X.write(wb, { type: "array", bookType: "xlsx" })));

  // ── File «Aggiunte» importabili (solo differenze positive) ──
  const metaBase = { periodo, pagamento, sessione: path.basename(a.mensile), confronto: path.basename(a.audit), note: ["Dati inventari corretti dall'Audit (" + path.basename(a.audit) + "). Solo differenze positive."] };
  const posM = diffRows(oldI, newI);
  const bM = buildWorkbook(X, posM, { ...metaBase, mode: "mensile", scenario: "Dati inventari corretti dall'Audit — negozi (SM/VSM)" });
  const fileM = path.join(a["out-dir"], "AGGIUNTE_AUDIT_NEGOZI_" + tag + ".xlsx");
  fs.writeFileSync(fileM, Buffer.from(X.write(bM.wb, { type: "array", bookType: "xlsx" })));
  const toItems = o => { const out = {}; Object.keys(o).forEach(m => { const v = o[m]; out[m] = { m: v.m, c: v.c, n: v.n, si: "", s: "", j: v.j, cu: v.cu, ex: v.ex, pct: v.pct, dept: false, items: v.total ? { tot: v.total } : {} }; }); return out; };
  const posF = diffRows(toItems(oldFc), toItems(newFc));
  const bF = buildWorkbook(X, posF, { ...metaBase, mode: "fcvm", sessione: path.basename(a.fcvm), scenario: "Dati inventari corretti dall'Audit — aree FC (esclusa la regola 99,5% VM)" });
  const fileF = path.join(a["out-dir"], "AGGIUNTE_AUDIT_FCVM_" + tag + ".xlsx");
  fs.writeFileSync(fileF, Buffer.from(X.write(bF.wb, { type: "array", bookType: "xlsx" })));

  console.log("Scritti:\n  " + mainFile + "\n  " + fileM + "\n  " + fileF);
  console.log("Negozi valorizzati: " + impM.nStore + " · FC valorizzati: " + impF.nFc);
  console.log("Negozi con differenza: " + sRows.filter(r => Math.abs(r.tot) >= 0.005).length + " (positive " + posM.length + ")");
  console.log("Aree FC con differenza: " + fRows.length + " (positive " + posF.length + ")");
  console.log("Assegnazione aree divise:", JSON.stringify(fcSheet.log.filter(l => l.how !== "riga unica")));
  warns.forEach(i => console.log("AVVISO:", i.lvl, i.t));
}

if (require.main === module) main();
module.exports = { readAudit, buildFcSheet };
