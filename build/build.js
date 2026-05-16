// BoggiIncentivi — bundler app.html
// ============================================================
// Zero dependencies. Concatena i sorgenti in src/ producendo
// web/app.html, il file caricato da WebView2 e distribuito
// dall'auto-update.
//
// Strategia di estrazione (fase corrente: PASSTHROUGH):
// ---------------------------------------------------
// Per ora il bundler legge un singolo file monolitico in
// src/_monolith/app.html e lo copia in web/app.html. Lo scopo
// di questa fase e` verificare end-to-end che lo script funziona,
// che il WebView2 carica l'output, e che lo SHA256 dell'output e`
// IDENTICO al baseline pre-refactor.
//
// Fasi successive sostituiranno src/_monolith/app.html con
// piu` file modulari (src/00-bootstrap/, src/10-formatters/,
// src/20-calc/, src/40-ui-render/, src/50-templates/, etc.).
// Il bundler li raccogliera` in ordine alfabetico ricorsivo e
// li concatenera` preservando la struttura HTML attuale.
//
// Uso:
//   node build/build.js                  -> produce web/app.html
//   node build/build.js --verify <sha>   -> fallisce con exit 1
//                                            se l'output non
//                                            matcha l'hash atteso
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_PATH = path.join(ROOT, "web", "app.html");

// === Raccolta sorgenti =====================================
// Walk ricorsivo di una cartella, ritorna i percorsi in ordine
// alfabetico stabile (case-sensitive lexicographic). I prefissi
// numerici (010_, 020_, ...) garantiscono ordine deterministico.
function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(p));
    } else if (entry.isFile()) {
      out.push(p);
    }
  }
  return out;
}

// === Direttive di insert ===================================
// Due forme di marker — equivalenti per il bundler:
//   <!--BUNDLE_INSERT:<dirname>-->   per zone HTML (markup body)
//   /*BUNDLE_INSERT:<dirname>*/      per zone JS (dentro <script>)
//
// Viene sostituito dal contenuto concatenato di tutti i file
// in src/<dirname>/ (walk alfabetico). I file vengono uniti
// SENZA separatori aggiunti: gli "a capo" devono stare dentro
// i file estratti.
//
// Questa strategia permette estrazione incrementale mantenendo
// byte-identity tra build successive: l'estrazione di un blocco
// e` solo "taglia & incolla", il bundler ricostruisce lo stesso
// output. Importante: la regex matcha SOLO la direttiva, non
// eventuali newline circostanti — l'estratto deve includere
// gli stessi newline che aveva nel monolite originale.
const INSERT_RE = /(?:<!--BUNDLE_INSERT:([A-Za-z0-9_\-]+)-->|\/\*BUNDLE_INSERT:([A-Za-z0-9_\-]+)\*\/)/g;

function expandInserts(content) {
  return content.replace(INSERT_RE, (_match, htmlName, jsName) => {
    const dirName = (htmlName || jsName).trim();
    const dir = path.join(SRC_DIR, dirName);
    const files = collectFiles(dir);
    if (files.length === 0) {
      throw new Error("BUNDLE_INSERT:" + dirName + " — nessun file in " + path.relative(ROOT, dir));
    }
    return files.map(f => fs.readFileSync(f, "utf8")).join("");
  });
}

// === Build =================================================
// Strategia: leggi src/_monolith/app.html, espandi le direttive
// BUNDLE_INSERT (se presenti), scrivi web/app.html.
//
// Fase iniziale (step 1): nessuna direttiva nel monolite ->
// output byte-identico al monolite stesso.
// Fasi successive: il monolite viene progressivamente svuotato,
// le righe estratte finiscono in src/<00-..., 10-..., ...>/ e
// vengono rimpiazzate da una direttiva BUNDLE_INSERT.
function build() {
  const monolithPath = path.join(SRC_DIR, "_monolith", "app.html");
  if (!fs.existsSync(monolithPath)) {
    throw new Error("Monolite non trovato: " + path.relative(ROOT, monolithPath));
  }
  // Espansione ricorsiva: ripeti finche` ci sono direttive da espandere.
  // Necessario perche` un modulo estratto puo` contenere a sua volta direttive
  // BUNDLE_INSERT che riferiscono altri moduli (es. quando si estrae un
  // blocco grande che include intervalli gia` estratti in step precedenti).
  // Reset INSERT_RE.lastIndex prima di ogni test (regex globale ha stato).
  let content = fs.readFileSync(monolithPath, "utf8");
  const maxIter = 20;
  for (let iter = 0; iter < maxIter; iter++) {
    INSERT_RE.lastIndex = 0;
    if (!INSERT_RE.test(content)) return Buffer.from(content, "utf8");
    content = expandInserts(content);
  }
  throw new Error("Possibile loop in BUNDLE_INSERT (> " + maxIter + " iterazioni)");
}

// === Main ==================================================
function main() {
  const args = process.argv.slice(2);
  const verifyIdx = args.indexOf("--verify");
  const expectedSha = verifyIdx >= 0 ? args[verifyIdx + 1] : null;

  const content = build();
  fs.writeFileSync(OUT_PATH, content);

  const sha = crypto.createHash("sha256").update(content).digest("hex");
  const sizeKb = (content.length / 1024).toFixed(1);
  console.log("Build OK:");
  console.log("  output: " + path.relative(ROOT, OUT_PATH));
  console.log("  size:   " + content.length + " bytes (" + sizeKb + " KB)");
  console.log("  sha256: " + sha);

  if (expectedSha) {
    if (sha !== expectedSha) {
      console.error("");
      console.error("VERIFY FALLITO: sha256 atteso = " + expectedSha);
      console.error("VERIFY FALLITO: sha256 ottenuto = " + sha);
      process.exit(1);
    }
    console.log("  verify: OK (matcha " + expectedSha.substring(0, 12) + "...)");
  }
}

main();
