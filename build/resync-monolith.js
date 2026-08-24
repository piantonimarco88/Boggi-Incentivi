// resync-monolith.js — strumento UNA TANTUM per riallineare src/_monolith/app.html
// e i moduli src/<dirname>/ all'app.html reale (v9.40) attuale, dopo che 44 versioni
// di modifiche sono state applicate solo ad app.html direttamente.
//
// NON e` parte della build normale. Uso:
//   node build/resync-monolith.js            -> dry-run, stampa report, non scrive nulla
//   node build/resync-monolith.js --write     -> applica le scritture risolte con sicurezza
//
// Vedi commento lungo in cima alla conversazione/commit per il metodo esatto.

"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const MONOLITH_PATH = path.join(SRC_DIR, "_monolith", "app.html");
const TARGET_PATH = path.join(ROOT, "app.html.orig"); // copia intoccata di HEAD, creata prima di ogni build.js

const INSERT_RE = /(?:<!--BUNDLE_INSERT:([A-Za-z0-9_\-]+)-->|\/\*BUNDLE_INSERT:([A-Za-z0-9_\-]+)\*\/)/g;

const WRITE = process.argv.includes("--write");

function splitByMarkers(text) {
  const literals = [];
  const markers = []; // {name, raw}
  let last = 0;
  INSERT_RE.lastIndex = 0;
  let m;
  while ((m = INSERT_RE.exec(text)) !== null) {
    literals.push(text.slice(last, m.index));
    markers.push({ name: (m[1] || m[2]).trim(), raw: m[0] });
    last = m.index + m[0].length;
  }
  literals.push(text.slice(last));
  return { literals, markers };
}

function dirFilePath(dirName) {
  return path.join(SRC_DIR, dirName, "010_main.js");
}

function uniqueIndexesOf(haystack, needle, from) {
  const out = [];
  let idx = haystack.indexOf(needle, from);
  while (idx !== -1 && out.length < 3) {
    out.push(idx);
    idx = haystack.indexOf(needle, idx + 1);
  }
  return out;
}

function findUniqueSlice(text, len, fromEnd, targetText, cursor) {
  for (const l of [150, 100, 60, 35]) {
    if (len < l) continue;
    const piece = fromEnd ? text.slice(-l) : text.slice(0, l);
    const idxs = uniqueIndexesOf(targetText, piece, cursor);
    if (idxs.length === 1) return { len: l, idx: idxs[0] };
  }
  return null;
}

// Trova l'estensione (start,end) di `lit` dentro `targetText` a partire da `cursor`.
// isFirst: questo letterale e` il PRIMISSIMO segmento del container (nessun marker
//   prima) — quindi il suo `start` e` per costruzione = cursor (di solito 0), non va
//   "cercato": e` un vincolo strutturale, non un'ipotesi.
// isLast: questo letterale e` l'ULTIMO segmento del container (nessun marker dopo)
//   — quindi il suo `end` e` per costruzione = targetText.length.
// Per un letterale INTERNO forte (non primo ne` ultimo) che e` cambiato "in mezzo",
// serve un'ancora di TESTA (per lo start, cioe` la fine del marker precedente) E
// un'ancora di CODA (per l'end, cioe` l'inizio del marker successivo) — usare solo
// una delle due e assumere l'altro estremo = cursor sarebbe come indovinare quanto
// e` grande tutto cio` che precede, esattamente il bug che questo script deve evitare.
// mode: 'empty' | 'full' | 'patched' | 'fail'
function findAnchor(lit, cursor, targetText, isFirst, isLast) {
  if (lit.length === 0) {
    if (isFirst || isLast) return { mode: "empty", start: cursor, end: cursor };
    return { mode: "fail" }; // non dovrebbe mai capitare (letterali vuoti sono "deboli", gestiti altrove)
  }
  const idx = targetText.indexOf(lit, cursor);
  if (idx >= 0) return { mode: "full", start: idx, end: idx + lit.length };

  // Contenuto cambiato "in mezzo": determina start e end separatamente.
  let start = null, end = null, headLen = null, tailLen = null;
  if (isFirst) {
    start = cursor;
  } else {
    const h = findUniqueSlice(lit, lit.length, false, targetText, cursor);
    if (h) { start = h.idx; headLen = h.len; }
  }
  if (isLast) {
    end = targetText.length;
  } else {
    const t = findUniqueSlice(lit, lit.length, true, targetText, cursor);
    if (t) { end = t.idx + t.len; tailLen = t.len; }
  }
  if (start !== null && end !== null && end >= start) {
    return { mode: "patched", start, end, headLen, tailLen };
  }
  return { mode: "fail" };
}

// Legge il contenuto GREZZO (non espanso) del file del marker — per il matching
// "clump" (marker adiacenti senza letterale in mezzo) usiamo il vecchio contenuto
// come ancora testuale.
function readMarkerRawFile(dirName) {
  const fp = dirFilePath(dirName);
  return fs.readFileSync(fp, "utf8");
}

const report = [];

// Risolve un "container" (testo che puo` contenere 0+ marker) contro lo span
// di app.html che deve rappresentare. Ritorna {ok, newOwnContent, writes}.
// Soglia "ancora forte" (v. istruzioni: < ~30 caratteri non ci si fida ciecamente).
// Un letterale piu` corto di questa soglia NON viene mai usato per far avanzare il
// cursore di ricerca: sarebbe troppo comune/corto e rischierebbe di agganciarsi alla
// prima occorrenza sbagliata, corrompendo il cursore per tutte le ancore successive.
// Fanno eccezione i due letterali di BORDO del container (il primissimo e l'ultimo):
// la loro posizione e` comunque vincolata dai confini esterni (inizio/fine di
// targetText), quindi vengono sempre cercati e la posizione trovata deve combaciare
// esattamente con quel confine, altrimenti e` un hard-fail (non un'ipotesi debole).
const STRONG_MIN = 30;

function resolveInto(oldText, targetText, label) {
  const { literals, markers } = splitByMarkers(oldText);
  const n = markers.length;

  const anchorStart = new Array(literals.length).fill(null);
  const anchorEnd = new Array(literals.length).fill(null);
  let cursor = 0;
  let hardFail = false;

  for (let i = 0; i < literals.length; i++) {
    const lit = literals[i];
    const isBoundary = (i === 0 || i === literals.length - 1);
    if (!isBoundary && lit.length < STRONG_MIN) {
      // Letterale debole interno: non lo si cerca qui (contaminerebbe il cursore).
      // Verra` risolto dalla logica di gruppo/clump piu` sotto, sempre come testo
      // vecchio invariato.
      continue;
    }
    const isFirst = (i === 0);
    const isLast = (i === literals.length - 1);
    const res = findAnchor(lit, cursor, targetText, isFirst, isLast);
    const misaligned = (isFirst && res.start !== 0) || (isLast && res.end !== targetText.length);
    if (res.mode === "fail" || misaligned) {
      report.push({
        label, issue: "anchor-fail" + (misaligned ? "-disallineato" : ""), literalIndex: i,
        literalPreviewStart: lit.slice(0, 100), literalPreviewEnd: lit.slice(-100),
        literalLength: lit.length, cursorAt: cursor
      });
      hardFail = true;
      anchorStart[i] = cursor; anchorEnd[i] = cursor;
      continue;
    }
    anchorStart[i] = res.start;
    anchorEnd[i] = res.end;
    if (res.mode === "patched") {
      report.push({ label, issue: "anchor-patched (letterale aggiornato in mezzo, testa+coda usate per delimitarlo)", literalIndex: i, headLen: res.headLen, tailLen: res.tailLen });
    }
    cursor = anchorEnd[i];
  }
  if (hardFail) return { ok: false };

  const groups = [];
  let gs = 0;
  for (let i = 1; i < n; i++) {
    if (literals[i].length >= STRONG_MIN) {
      groups.push([gs, i - 1]);
      gs = i;
    }
  }
  if (n > 0) groups.push([gs, n - 1]);

  const markerTarget = new Array(n).fill(null);
  // Contenuto "risolto" di ciascun letterale per la ricostruzione del container.
  // Default: letterale originale invariato (usato quando il gruppo che lo contiene
  // resta irrisolto — cosi` la porzione ambigua resta byte-per-byte come prima,
  // isolando il problema invece di propagarlo).
  const literalResolved = literals.slice();
  // Per i letterali "forti" usati come ancora, il contenuto risolto e` quello preso
  // da targetText (puo` differire dal vecchio se e` scattato il fallback "tail").
  for (let i = 0; i < literals.length; i++) {
    if (literals[i].length >= STRONG_MIN || i === 0 || i === literals.length - 1) {
      // i===0/last possono essere anche vuoti ma comunque anchorati direttamente
      if (anchorStart[i] !== null) literalResolved[i] = targetText.slice(anchorStart[i], anchorEnd[i]);
    }
  }

  for (const [a, b] of groups) {
    if (process.env.RESYNC_DEBUG) console.error("DEBUG group", label, a, b, markers.slice(a,b+1).map(m=>m.name));
    const spanStart = anchorEnd[a];
    const spanEnd = anchorStart[b + 1];
    if (spanEnd < spanStart) {
      report.push({ label, issue: "negative-span", markers: markers.slice(a, b + 1).map(m => m.name) });
      continue;
    }
    const span = targetText.slice(spanStart, spanEnd);
    if (process.env.RESYNC_DEBUG) console.error("  DEBUG span", spanStart, spanEnd, span.length);
    if (a === b) {
      markerTarget[a] = span;
      continue;
    }
    // Clump: piu` marker adiacenti senza un'ancora forte tra loro. Per ciascun
    // marker cerchiamo il suo VECCHIO contenuto per intero, in ordine, dentro lo
    // span. I letterali interni (deboli per definizione: sono nel gruppo proprio
    // perche` < STRONG_MIN) restano SEMPRE testo vecchio invariato — sono
    // separatori di formattazione tra moduli, non oggetto di modifiche funzionali,
    // quindi non li verifichiamo via indexOf (eviterebbe comunque falsi match corti).
    // Un marker il cui vecchio contenuto non si trova piu` per intero (perche` e`
    // stato modificato) resta "pending": se e` l'UNICO pending tra due marker
    // risolti con successo, gli si attribuisce l'intero spazio residuo (al netto
    // dei letterali vecchi adiacenti). Se PIU` marker consecutivi sono pending
    // (impossibile distinguerli senza ancora), il gruppo viene segnalato come
    // ambiguo SOLO per quel sotto-tratto — il resto del gruppo puo` comunque
    // risolversi.
    const L = b - a + 1;
    const oldContents = [];
    for (let k = a; k <= b; k++) oldContents.push(readMarkerRawFile(markers[k].name));
    const oldLiterals = []; // oldLiterals[k] = letterale vecchio prima del content k (k=1..L-1)
    for (let k = a + 1; k <= b; k++) oldLiterals.push(literals[k]);

    const resolvedStart = new Array(L).fill(null);
    const resolvedEnd = new Array(L).fill(null);
    let pos = 0;
    let pendingRun = []; // indici k in attesa
    let lastResolvedEnd = 0;
    let clumpAmbiguous = false;

    function flushPending(gapEnd) {
      if (pendingRun.length === 0) return;
      if (pendingRun.length === 1) {
        const k = pendingRun[0];
        const litBefore = k > 0 ? oldLiterals[k - 1] : "";
        const litAfter = k < L - 1 ? oldLiterals[k] : "";
        const contentStart = lastResolvedEnd + litBefore.length;
        const contentEnd = gapEnd - litAfter.length;
        if (contentEnd >= contentStart) {
          resolvedStart[k] = contentStart; resolvedEnd[k] = contentEnd;
          report.push({ label, issue: "marker-risolto-per-esclusione-nel-clump", marker: markers[a + k].name });
        } else {
          clumpAmbiguous = true;
          report.push({ label, issue: "AMBIGUOUS-MARKER (spazio negativo) — richiede revisione manuale", marker: markers[a + k].name });
        }
      } else {
        // Piu` di un marker consecutivo con contenuto vecchio cambiato per intero:
        // niente full-match per distinguerli. Ultimo tentativo prima di arrendersi:
        // magari l'INIZIO di ciascun modulo (firma di funzione, commento d'intestazione)
        // e` rimasto stabile anche se il corpo e` cambiato — prova un'ancora di sola
        // TESTA per ciascuno, in ordine, dentro il gap. Se OGNUNO trova un'unica
        // occorrenza in ordine crescente, i confini sono: fine modulo i = inizio
        // modulo i+1 meno il letterale vecchio che li separa (stesso principio usato
        // per l'esclusione singola, generalizzato alla catena).
        const chain = tryHeadChain(pendingRun, lastResolvedEnd, gapEnd);
        if (chain) {
          for (const { k, start, end } of chain) { resolvedStart[k] = start; resolvedEnd[k] = end; }
          report.push({ label, issue: "clump-risolto-via-catena-di-teste (" + pendingRun.length + " marker, corpo cambiato ma firma/intestazione stabile)", markers: pendingRun.map(k => markers[a + k].name) });
        } else {
          clumpAmbiguous = true;
          report.push({
            label, issue: "AMBIGUOUS-RUN — richiede revisione manuale (" + pendingRun.length + " marker consecutivi modificati, nessuna ancora per distinguerli)",
            markers: pendingRun.map(k => markers[a + k].name),
            spanPreviewStart: targetText.slice(spanStart + lastResolvedEnd, spanStart + lastResolvedEnd + 200),
            spanPreviewEnd: targetText.slice(spanStart + gapEnd - 200, spanStart + gapEnd),
            spanLength: gapEnd - lastResolvedEnd
          });
        }
      }
      pendingRun = [];
    }

    // Prova ad ancorare in sequenza la TESTA (primi ~150/100/60/35 caratteri, cercando
    // la lunghezza piu` lunga che risulti unica) di ciascun modulo pending dentro
    // span[gapStart:gapEnd]. Richiede successo per TUTTI i pending del gruppo passato,
    // posizioni strettamente crescenti e dentro i limiti — altrimenti ritorna null
    // (nessuna scrittura parziale: o la catena intera o niente, per sicurezza).
    function tryHeadChain(pendingIdxs, gapStart, gapEnd) {
      const starts = [];
      let floor = gapStart + (pendingIdxs[0] > 0 ? oldLiterals[pendingIdxs[0] - 1].length : 0);
      for (const k of pendingIdxs) {
        const text = oldContents[k];
        if (text.length === 0) return null;
        const h = findUniqueSlice(text, text.length, false, span, floor);
        if (!h || h.idx < floor || h.idx >= gapEnd) return null;
        starts.push({ k, idx: h.idx });
        floor = h.idx + 1;
      }
      const out = [];
      for (let i = 0; i < starts.length; i++) {
        const { k, idx } = starts[i];
        const isLastInChain = i === starts.length - 1;
        const nextStart = isLastInChain ? gapEnd : starts[i + 1].idx;
        const litAfter = k < L - 1 ? oldLiterals[k] : "";
        const end = isLastInChain ? gapEnd - litAfter.length : nextStart - litAfter.length;
        if (end < idx) return null;
        out.push({ k, start: idx, end });
      }
      return out;
    }

    for (let k = 0; k < L; k++) {
      const text = oldContents[k];
      if (text.length === 0) { pendingRun.push(k); continue; }
      const idx = span.indexOf(text, pos);
      if (process.env.RESYNC_DEBUG) console.error("  DEBUG piece", markers[a+k].name, "pos=",pos,"idx=",idx,"len=",text.length);
      // Il gruppo dovrebbe iniziare esattamente al bordo forte precedente: se il
      // primo marker non matcha li`, e` cambiato anche lui — trattalo come pending.
      if (idx === -1 || (k === 0 && idx !== 0)) {
        pendingRun.push(k);
        continue;
      }
      // gapEnd = idx: flushPending sottrae da solo la lunghezza del letterale vecchio
      // immediatamente precedente k (oldLiterals[k-1]) dal contenuto dell'ultimo pending.
      flushPending(idx);
      pos = idx + text.length;
      resolvedStart[k] = idx; resolvedEnd[k] = pos;
      lastResolvedEnd = pos;
    }
    flushPending(span.length);

    for (let k = 0; k < L; k++) {
      if (resolvedStart[k] !== null) {
        markerTarget[a + k] = span.slice(resolvedStart[k], resolvedEnd[k]);
      }
      if (k > 0) {
        // il letterale tra k-1 e k: se ENTRAMBI i content adiacenti sono risolti in modo
        // "diretto" (non per esclusione — in quel caso il letterale e` gia` stato consumato
        // dentro contentStart/contentEnd), il letterale resta vecchio testo invariato.
        // Per semplicita` e sicurezza lo lasciamo SEMPRE al vecchio testo: se il marker
        // adiacente e` stato risolto per esclusione, il suo bordo ha gia` sottratto la
        // lunghezza del letterale, quindi il letterale vecchio combacia comunque.
        literalResolved[a + k] = oldLiterals[k - 1];
      }
    }
    if (!clumpAmbiguous) {
      report.push({ label, issue: "clump-risolto", markers: markers.slice(a, b + 1).map(m => m.name) });
    }
  }

  // Costruisci il nuovo contenuto del container + ricorri sui marker risolti.
  // Un marker con markerTarget===null resta INTOCCATO (file non scritto, direttiva
  // preservata) — cosi` una porzione ambigua non blocca tutto il resto.
  let newOwnContent = "";
  const writes = [];
  let anyUnresolved = false;
  for (let i = 0; i <= n; i++) {
    newOwnContent += literalResolved[i];
    if (i < n) {
      newOwnContent += markers[i].raw; // direttiva preservata verbatim
      const tgt = markerTarget[i];
      if (tgt == null) {
        report.push({ label, issue: "marker-skipped-non-risolto", marker: markers[i].name });
        anyUnresolved = true;
        continue;
      }
      const sub = resolveMarker(markers[i].name, tgt, label + " > " + markers[i].name);
      writes.push(...sub.writes);
      if (!sub.ok) anyUnresolved = true;
    }
  }

  return { ok: !anyUnresolved, newOwnContent, writes };
}

function resolveMarker(dirName, targetSpan, label) {
  const filePath = dirFilePath(dirName);
  const oldContent = fs.readFileSync(filePath, "utf8");
  INSERT_RE.lastIndex = 0;
  if (!INSERT_RE.test(oldContent)) {
    // leaf: nessun marker nidificato, lo span e` il nuovo contenuto del file
    return { ok: true, writes: [{ filePath, content: targetSpan, dirName }] };
  }
  const res = resolveInto(oldContent, targetSpan, label);
  if (!res.ok) {
    report.push({ label, issue: "container-parzialmente-risolto", dirName });
  }
  // Anche in caso di risoluzione parziale, scrivi cio` che e` stato risolto:
  // le porzioni ambigue restano intoccate dentro newOwnContent (vedi resolveInto).
  return { ok: res.ok, writes: [...res.writes, { filePath, content: res.newOwnContent, dirName: dirName + (res.ok ? " (container)" : " (container, parziale)") }] };
}

function main() {
  if (!fs.existsSync(TARGET_PATH)) {
    console.error("Manca " + path.relative(ROOT, TARGET_PATH) + " — crea una copia intoccata di app.html HEAD prima di lanciare build.js.");
    process.exit(1);
  }
  const monolithOld = fs.readFileSync(MONOLITH_PATH, "utf8");
  const target = fs.readFileSync(TARGET_PATH, "utf8");

  const result = resolveInto(monolithOld, target, "monolith");
  if (result.newOwnContent === undefined) {
    result.writes = result.writes || [];
    result.newOwnContent = monolithOld; // hard-fail totale: non toccare nulla
    console.error("ATTENZIONE: hard-fail totale nella risoluzione del monolite (vedi report) — nessuna scrittura verra` fatta per esso.");
  }

  console.log("=== REPORT (" + report.length + " voci) ===");
  for (const r of report) {
    console.log(JSON.stringify(r, null, 0));
  }
  console.log("");
  console.log("=== ESITO ===");
  console.log("risolto COMPLETAMENTE (nessun blocco ambiguo residuo): " + result.ok);
  console.log("scritture pianificate (incluso monolite): " + (result.writes.length + 1));

  if (WRITE) {
    // Scrive tutto cio` che e` stato risolto, anche in caso di risoluzione parziale:
    // le porzioni ambigue restano byte-per-byte invariate dentro newOwnContent/i file
    // contenitore (vedi resolveInto), quindi scrivere e` sempre sicuro — isola solo
    // il problema invece di propagarlo.
    for (const w of result.writes) {
      fs.writeFileSync(w.filePath, w.content, "utf8");
      console.log("scritto: " + path.relative(ROOT, w.filePath));
    }
    fs.writeFileSync(MONOLITH_PATH, result.newOwnContent, "utf8");
    console.log("scritto: " + path.relative(ROOT, MONOLITH_PATH));
  } else {
    console.log("");
    console.log("(dry-run: nessun file scritto. Rilancia con --write per applicare.)");
  }
}

main();
