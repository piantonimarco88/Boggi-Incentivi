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
// Walk ricorsivo di src/, ritorna i percorsi in ordine alfabetico
// stabile (case-sensitive lexicographic). I prefissi numerici
// (00-, 010_, ...) garantiscono ordine di esecuzione deterministico.
function collectSources(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSources(p));
    } else if (entry.isFile()) {
      out.push(p);
    }
  }
  return out;
}

// === Fase passthrough ======================================
// Finche` non iniziamo l'estrazione, esiste un solo file in
// src/_monolith/app.html. Lo scriviamo verbatim.
// Quando avremo piu` file, questa funzione concatenera`
// shell/head + <script> con tutti i .js + shell/mid + <body>
// markup + shell/tail.
function buildPassthrough() {
  const sources = collectSources(SRC_DIR);
  if (sources.length === 0) {
    throw new Error("Nessun file trovato in src/. Aggiungere almeno src/_monolith/app.html");
  }
  if (sources.length === 1 && sources[0].endsWith("app.html")) {
    return fs.readFileSync(sources[0]);
  }
  // Quando avro` piu` di un file, lancio errore: significa che ho
  // iniziato l'estrazione modulare e devo aggiornare il bundler.
  throw new Error(
    "Bundler in modalita` passthrough ma trovati " + sources.length +
    " file. Aggiornare build/build.js per gestire la concatenazione modulare:\n" +
    sources.map(s => "  " + path.relative(ROOT, s)).join("\n")
  );
}

// === Main ==================================================
function main() {
  const args = process.argv.slice(2);
  const verifyIdx = args.indexOf("--verify");
  const expectedSha = verifyIdx >= 0 ? args[verifyIdx + 1] : null;

  const content = buildPassthrough();
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
