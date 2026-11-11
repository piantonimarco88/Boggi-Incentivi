// BoggiIncentivi — dati demo NON riconducibili a persone per la suite di statistiche
// ============================================================
// statistiche/_demo_data.json (locale, mai in git) ha nomi e matricole gia` finti, ma
// negozi reali + ruolo + mese + importi reali + giorni di malattia: una persona sarebbe
// riconoscibile. Questo script produce statistiche/demo_data_ci.json, pubblicabile:
//  - IMPORTI: tutti i campi in euro/valuta di una persona moltiplicati per un suo fattore
//    casuale (0,85-1,15), uguale su tutte le sue righe -> percentuali e coerenza interna
//    (componenti/erogato/massimale) restano, i valori non sono piu` quelli reali;
//  - MALATTIE: i giorni di malattia sono rimescolati tra le righe dello stesso mese
//    (stessa distribuzione, nessun legame con la persona);
//  - FILE SORGENTE: tolti i nomi dei colleghi ("PER LAURA", ...).
// Deterministico (seme fisso): rilanciandolo si ottiene lo stesso file.
//
// Uso: node build/make-stats-demo.js
// ============================================================

"use strict";
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "statistiche");
const SRC = path.join(DIR, "_demo_data.json");
const OUT = path.join(DIR, "demo_data_ci.json");

const MONEY = ["massimale", "erogato", "_rmlLc", "_rmlEur", "mBdg", "cBdg", "cQty", "cDigital", "cShopper", "cPrivilege",
  "cSas", "cDcc", "cCs", "cArt", "cVisual", "cCrSem", "cSySem", "cUptSem", "cSubSem", "cSasSem", "rml_period"];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const rows = data.rows;

// 1. importi: fattore per matricola
rows.forEach(r => {
  const f = 0.85 + rng(hash("k" + r.matricola))() * 0.30;
  MONEY.forEach(k => { if (typeof r[k] === "number" && r[k] !== 0) r[k] = Math.round(r[k] * f * 100) / 100; });
});
// 2. malattie: rimescolate tra le righe dello stesso mese
const byMonth = {};
rows.forEach((r, i) => { (byMonth[r.monthKey] = byMonth[r.monthKey] || []).push(i); });
const rnd = rng(20261111);
Object.keys(byMonth).forEach(mk => {
  const idx = byMonth[mk], vals = idx.map(i => rows[i].malattie);
  for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = vals[i]; vals[i] = vals[j]; vals[j] = t; }
  idx.forEach((ri, n) => { rows[ri].malattie = vals[n]; });
});
// 3. nomi di colleghi nei nomi dei file sorgente
rows.forEach(r => { if (typeof r._f === "string") r._f = r._f.replace(/\s+PER\s+[A-Z]+(\s+V\d+)?/i, "$1"); });

data.savedAt = "demo-ci";
data.note = "Dati demo per i test: nomi e matricole finti, importi riscalati per persona, malattie rimescolate nel mese. Generato da build/make-stats-demo.js";
fs.writeFileSync(OUT, JSON.stringify(data));
console.log("Scritto " + path.relative(path.join(__dirname, ".."), OUT) + ": " + rows.length + " righe, " + (fs.statSync(OUT).size / 1024 / 1024).toFixed(1) + " MB");
