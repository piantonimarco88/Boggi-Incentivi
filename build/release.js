// BoggiIncentivi — rilascio, rollback e annullamento in un comando
// ============================================================
// L'exe si aggiorna SOLO se trova un APP_VERSION piu` alto di quello
// installato e non sa nulla del contenuto. Quindi anche il rollback si
// fa senza toccare l'exe: si ripubblica codice vecchio con un numero
// di versione nuovo.
//
// RILASCIO NORMALE
//   node build/release.js "messaggio commit"
//     1. incrementa APP_VERSION        2. build (con guardia encoding)
//     3. TEST: node --test + statistiche/_tests.js — se falliscono il
//        rilascio si ferma e la versione torna com'era
//     4. copia in AppData   5. commit "vX.Y — messaggio" + tag vX.Y   6. push
//
// ROLLBACK A UNA VERSIONE (torna in blocco a come era la vX.Y)
//   node build/release.js --rollback 9.106
//     ripristina src/ e test/ della v9.106, gli assegna la versione
//     successiva all'attuale (es. 9.110) e pubblica
//     «v9.110 — ROLLBACK a v9.106».
//
// ANNULLA UNA SOLA VERSIONE (toglie le modifiche della vX.Y, tiene le altre)
//   node build/release.js --revert 9.107
//     annulla le modifiche a src/ e test/ fatte dalla v9.107; se le
//     versioni successive hanno toccato le stesse righe si ferma senza
//     cambiare nulla e lo dice.
//
// OPZIONI
//   --no-git    nessun commit/push: build + test + copia in AppData, per
//               provare SOLO sul proprio PC. Per rollback/annulla le
//               modifiche restano nei file: per scartarle
//               git checkout -- src test app.html web/app.html
//   --no-push   commit e tag locali, senza push
//   --no-bump   (solo rilascio normale) non incrementa APP_VERSION
//   --force     (solo rollback/annulla) prosegue anche se i test della
//               versione ripristinata falliscono o se cambia AUTO_VERSION
//   --tag-history  crea in locale i tag vX.Y mancanti per i rilasci passati
//               (dal messaggio di commit) e termina
//
// Il messaggio NON deve includere il prefisso versione: viene
// aggiunto automaticamente ("v8.75 — <messaggio>").
// ============================================================

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MONOLITH = path.join(ROOT, "src", "_monolith", "app.html");
const MONOLITH_REL = "src/_monolith/app.html";
const BOOTSTRAP_REL = "src/00-bootstrap/010_main.js";
const WEB_OUT = path.join(ROOT, "web", "app.html");
const STATS_TESTS = path.join(ROOT, "statistiche", "_tests.js");
const VERSION_RE = /var APP_VERSION='(\d+)\.(\d+)';/;
const AUTO_VERSION_RE = /var AUTO_VERSION=(\d+)/;
const CHANGELOG_OPEN = "var APP_CHANGELOG=[";
// Percorsi che compongono l'app: sono gli unici toccati da rollback/annulla
const APP_PATHS = ["src", "test"];
// Percorsi messi nel commit di rilascio
const COMMIT_PATHS = ["src", "app.html", "web/app.html", "build", "test", "MainWindow.xaml.cs", ".gitignore"];
// Riga co-autore del commit (sovrascrivibile: CO_AUTHOR="Nome <email>" node build/release.js ...)
const COAUTHOR = "Co-Authored-By: " + (process.env.CO_AUTHOR || "Claude <noreply@anthropic.com>");

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024 }, opts));
  if (r.status !== 0) {
    console.error((r.stdout || "") + (r.stderr || ""));
    throw new Error(cmd + " " + args.join(" ") + " fallito (exit " + r.status + ")");
  }
  return r.stdout || "";
}
function tryRun(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: "utf8", shell: false, maxBuffer: 64 * 1024 * 1024 }, opts));
  return { ok: r.status === 0, out: (r.stdout || "") + (r.stderr || "") };
}
function fail(msg) { console.error("\n✖ " + msg + "\n"); process.exit(1); }

// ── versione ────────────────────────────────────────────────
function readVersion(text) {
  const m = (text || "").match(VERSION_RE);
  if (!m) throw new Error("APP_VERSION non trovata in " + MONOLITH_REL);
  return { major: m[1], minor: parseInt(m[2], 10), str: m[1] + "." + m[2] };
}
function setVersion(text, v) { return text.replace(VERSION_RE, "var APP_VERSION='" + v + "';"); }
function nextVersion(v) { return v.major + "." + (v.minor + 1); }
function cmpVer(a, b) { return (parseInt(a.major, 10) - parseInt(b.major, 10)) || (a.minor - b.minor); }
function addChangelog(text, line) {
  const i = text.indexOf(CHANGELOG_OPEN);
  if (i < 0) return text;
  const at = i + CHANGELOG_OPEN.length;
  const nl = text.indexOf("\n", at) >= 0 && text.slice(at, at + 2) === "\r\n" ? "\r\n" : "\n";
  return text.slice(0, at) + nl + "  " + JSON.stringify(line) + "," + text.slice(at).replace(/^\r?\n/, nl);
}
// Blocco APP_VERSION + APP_CHANGELOG (fino alla chiusura dell'array): cambia a ogni rilascio
function versionBlock(text) {
  const a = text.search(VERSION_RE);
  const c = text.indexOf(CHANGELOG_OPEN, a);
  if (a < 0 || c < 0) return null;
  const end = text.indexOf("\n];", c);
  if (end < 0) return null;
  return { start: a, end: end + 3, text: text.slice(a, end + 3) };
}
function withVersionBlockOf(text, source) {
  const b = versionBlock(text), s = versionBlock(source);
  if (!b || !s) return text;
  return text.slice(0, b.start) + s.text + text.slice(b.end);
}

// ── git: versione -> commit ─────────────────────────────────
function commitOfVersion(ver) {
  const tag = tryRun("git", ["rev-parse", "-q", "--verify", "refs/tags/v" + ver + "^{commit}"]);
  if (tag.ok) return tag.out.trim();
  // dal messaggio: l'ultimo commit «vX.Y — ...»
  const log = run("git", ["log", "--format=%H %s", "HEAD"]).split("\n");
  for (const l of log) {
    const sp = l.indexOf(" ");
    const subj = l.slice(sp + 1);
    if (subj.startsWith("v" + ver + " ") || subj === "v" + ver) return l.slice(0, sp);
  }
  return null;
}
function lf(s) { return s == null ? null : s.replace(/\r\n/g, "\n"); }
function fileAt(commit, rel) {
  const r = tryRun("git", ["show", commit + ":" + rel]);
  return r.ok ? r.out : null;
}
function tagExists(t) { return tryRun("git", ["rev-parse", "-q", "--verify", "refs/tags/" + t]).ok; }
function ensureCleanApp() {
  const st = run("git", ["status", "--porcelain", "--", ...APP_PATHS, "app.html", "web/app.html"]).trim();
  if (st) fail("Ci sono modifiche non committate in src/, test/ o app.html:\n" + st + "\nCommittale o scartale prima del rollback/annullamento.");
}

// ── fasi comuni ─────────────────────────────────────────────
function build() { console.log(run(process.execPath, [path.join(ROOT, "build", "build.js")]).trim()); }

function runTests(opts) {
  opts = opts || {};
  console.log("\nTest app (node --test)...");
  const t = tryRun(process.execPath, ["--test"]);
  const sum = (t.out.match(/^ℹ (tests|pass|fail) \d+/gm) || []).join(" · ");
  if (!t.ok) {
    const failed = (t.out.match(/^✖ .*$/gm) || []).slice(0, 15).join("\n");
    return { ok: false, msg: "Test dell'app FALLITI (" + sum + "):\n" + failed };
  }
  console.log("  OK " + sum);
  if (opts.stats !== false) {
    if (!fs.existsSync(STATS_TESTS)) return { ok: false, msg: "Manca statistiche/_tests.js (suite locale, non in git): impossibile verificare statistiche.html." };
    console.log("Test statistiche (statistiche/_tests.js)...");
    const s = tryRun(process.execPath, [STATS_TESTS]);
    const last = s.out.trim().split("\n").slice(-1)[0];
    if (!s.ok) return { ok: false, msg: "Test delle statistiche FALLITI:\n" + s.out.trim().split("\n").slice(-12).join("\n") };
    console.log("  " + last);
  }
  return { ok: true };
}

function copyAppData() {
  const appData = process.env.LOCALAPPDATA;
  if (!appData) { console.log("AppData:  LOCALAPPDATA non definita — copia saltata"); return; }
  const dest = path.join(appData, "BoggiIncentivi", "web", "app.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(WEB_OUT, dest);
  console.log("AppData:  " + dest);
}

function commitTagPush(version, subject, body, flags) {
  if (flags.noGit) {
    console.log("Git: saltato (--no-git)");
    return;
  }
  run("git", ["add", "--", ...COMMIT_PATHS.filter(p => fs.existsSync(path.join(ROOT, p)))]);
  const full = "v" + version + " — " + subject + (body ? "\n\n" + body : "") + "\n\n" + COAUTHOR;
  run("git", ["commit", "-m", full]);
  console.log("Commit:   v" + version + " — " + subject);
  const tag = "v" + version;
  if (!tagExists(tag)) { run("git", ["tag", tag]); console.log("Tag:      " + tag); }
  if (flags.noPush) { console.log("Push:     saltato (--no-push)"); return; }
  run("git", ["push"]);
  run("git", ["push", "origin", "refs/tags/" + tag]);
  console.log("Push:     OK (commit + tag " + tag + ")");
}

// Ripristina i file dell'app com'erano prima di un'operazione fallita
function restoreApp(snapshot) {
  for (const rel of Object.keys(snapshot)) {
    const abs = path.join(ROOT, rel);
    if (snapshot[rel] === null) { if (fs.existsSync(abs)) fs.unlinkSync(abs); }
    else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, snapshot[rel]); }
  }
}

// ── modalita` ───────────────────────────────────────────────
function release(message, flags) {
  let mono = fs.readFileSync(MONOLITH, "utf8");
  const original = mono;
  const v = readVersion(mono);
  let version = v.str;
  if (!flags.noBump) {
    version = nextVersion(v);
    mono = setVersion(mono, version);
    fs.writeFileSync(MONOLITH, mono, "utf8");
    console.log("Versione: " + v.str + " -> " + version);
  } else {
    console.log("Versione: " + version + " (no bump)");
  }
  build();
  const t = runTests();
  if (!t.ok) {
    fs.writeFileSync(MONOLITH, original, "utf8");
    build();
    fail(t.msg + "\n\nRilascio FERMATO: versione riportata a " + v.str + ", niente copiato in AppData, nessun commit.");
  }
  copyAppData();
  commitTagPush(version, message, "", flags);
}

function rollback(target, flags) {
  ensureCleanApp();
  const commit = commitOfVersion(target);
  if (!commit) fail("Versione v" + target + " non trovata (nessun tag v" + target + " e nessun commit «v" + target + " — ...»).");
  const cur = fs.readFileSync(MONOLITH, "utf8");
  const v = readVersion(cur);
  const targetMono = fileAt(commit, MONOLITH_REL);
  if (!targetMono) fail("Il commit " + commit.slice(0, 7) + " non contiene " + MONOLITH_REL + ".");
  if (cmpVer(readVersion(targetMono), v) >= 0)
    fail("v" + target + " non e` precedente alla versione attuale v" + v.str + ".");
  checkAutoVersion(fileAt(commit, BOOTSTRAP_REL), flags, "v" + target);

  const newVer = nextVersion(v);
  console.log("Rollback: v" + v.str + " -> codice di v" + target + " (" + commit.slice(0, 7) + ") pubblicato come v" + newVer);
  run("git", ["restore", "--source=" + commit, "--staged", "--worktree", "--", ...APP_PATHS]);
  let mono = fs.readFileSync(MONOLITH, "utf8");
  mono = setVersion(mono, newVer);
  mono = addChangelog(mono, newVer + ": Ripristinata la versione " + target + " (rollback): le modifiche delle versioni successive fino alla " + v.str + " non sono piu` attive");
  fs.writeFileSync(MONOLITH, mono, "utf8");
  finishRestore(newVer, "ROLLBACK a v" + target, "Codice di src/ e test/ ripristinato da v" + target + " (" + commit.slice(0, 7) + ").", flags, () => {
    run("git", ["restore", "--source=HEAD", "--staged", "--worktree", "--", ...APP_PATHS]);
  });
}

function revertVersion(target, flags) {
  ensureCleanApp();
  const commit = commitOfVersion(target);
  if (!commit) fail("Versione v" + target + " non trovata (nessun tag v" + target + " e nessun commit «v" + target + " — ...»).");
  const parent = commit + "^";
  const files = run("git", ["diff", "--name-status", "--no-renames", parent, commit, "--", ...APP_PATHS])
    .split("\n").filter(Boolean).map(l => { const [st, f] = l.split("\t"); return { st, f }; });
  if (!files.length) fail("La v" + target + " non ha modifiche in src/ o test/: niente da annullare.");
  const cur = fs.readFileSync(MONOLITH, "utf8");
  const v = readVersion(cur);
  checkAutoVersion(fileAt(parent, BOOTSTRAP_REL), flags, "prima di v" + target);

  const snapshot = {};
  const conflicts = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boggi-revert-"));
  for (const { f } of files) {
    const abs = path.join(ROOT, f);
    const curRaw = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
    snapshot[f] = curRaw;
    // Fine riga: nel working tree Windows i file sono CRLF, in git LF (autocrlf).
    // Si confronta e si fonde tutto in LF e si riscrive nello stile del file attuale.
    const eol = curRaw && curRaw.indexOf("\r\n") >= 0 ? "\r\n" : "\n";
    const toDisk = s => (eol === "\r\n" ? s.replace(/\n/g, "\r\n") : s);
    const curText = lf(curRaw);
    let after = lf(fileAt(commit, f));   // il file come l'ha lasciato la versione da annullare
    let before = lf(fileAt(parent, f));  // il file prima di quella versione
    if (f === MONOLITH_REL && curText && after && before) {
      // il blocco versione/changelog cambia a ogni rilascio: non fa parte della modifica da annullare
      after = withVersionBlockOf(after, curText);
      before = withVersionBlockOf(before, curText);
    }
    if (curText === after) {                   // nessuno l'ha piu` toccato: si torna a prima
      if (before === null) { if (fs.existsSync(abs)) fs.unlinkSync(abs); }
      else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, toDisk(before)); }
      continue;
    }
    if (curText === null || after === null || before === null) { conflicts.push(f + " (creato/eliminato e poi modificato)"); continue; }
    // merge a 3 vie: applica al file attuale la modifica inversa (after -> before)
    const pc = path.join(tmp, "cur"), pa = path.join(tmp, "after"), pb = path.join(tmp, "before");
    fs.writeFileSync(pc, curText); fs.writeFileSync(pa, after); fs.writeFileSync(pb, before);
    const mf = spawnSync("git", ["merge-file", "-p", pc, pa, pb], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (mf.status !== 0) { conflicts.push(f); continue; }
    fs.writeFileSync(abs, toDisk(mf.stdout));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (conflicts.length) {
    restoreApp(snapshot);
    fail("Impossibile annullare solo la v" + target + ": le versioni successive hanno modificato le stesse righe in:\n  - " +
      conflicts.join("\n  - ") + "\nNessun file e` stato cambiato. Valuta il rollback completo: node build/release.js --rollback <versione>");
  }
  const newVer = nextVersion(v);
  console.log("Annulla:  modifiche di v" + target + " (" + commit.slice(0, 7) + ") tolte, pubblicato come v" + newVer);
  let mono = fs.readFileSync(MONOLITH, "utf8");
  mono = setVersion(mono, newVer);
  mono = addChangelog(mono, newVer + ": Annullate le modifiche della versione " + target + " (le altre versioni restano attive)");
  fs.writeFileSync(MONOLITH, mono, "utf8");
  snapshot[MONOLITH_REL] = snapshot[MONOLITH_REL] === undefined ? cur : snapshot[MONOLITH_REL];
  finishRestore(newVer, "ANNULLA v" + target, "Annullate le modifiche a src/ e test/ di v" + target + " (" + commit.slice(0, 7) + "): " + files.map(x => x.f).join(", ") + ".", flags, () => {
    restoreApp(Object.assign({ [MONOLITH_REL]: cur }, snapshot));
  });
}

function checkAutoVersion(otherBootstrap, flags, label) {
  const now = (fs.readFileSync(path.join(ROOT, BOOTSTRAP_REL), "utf8").match(AUTO_VERSION_RE) || [])[1];
  const then = ((otherBootstrap || "").match(AUTO_VERSION_RE) || [])[1];
  if (now && then && now !== then) {
    const msg = "ATTENZIONE: il formato dello stato salvato cambia (AUTO_VERSION " + now + " -> " + then + " in " + label + ").\n" +
      "Al primo avvio l'app scartera` lo stato salvato in automatico (le sessioni salvate su file restano valide).";
    if (!flags.force) fail(msg + "\nPer procedere comunque aggiungi --force.");
    console.log("⚠ " + msg);
  }
}

function finishRestore(newVer, subject, body, flags, undo) {
  build();
  const t = runTests({ stats: true });
  if (!t.ok) {
    if (!flags.force) {
      undo();
      build();
      fail(t.msg + "\n\nOperazione FERMATA e file ripristinati. Se i test falliscono anche nella versione di origine e vuoi procedere comunque: aggiungi --force.");
    }
    console.log("⚠ Test falliti, si procede per --force:\n" + t.msg);
  }
  copyAppData();
  if (flags.noGit) {
    console.log("\nProva locale pronta (copiata in AppData, nessun commit). Per scartarla:\n  git checkout -- src test app.html web/app.html && node build/build.js");
    return;
  }
  commitTagPush(newVer, subject, body, flags);
}

function tagHistory() {
  const log = run("git", ["log", "--format=%H %s", "HEAD"]).split("\n").filter(Boolean);
  const seen = new Set();
  let created = 0;
  for (const l of log) { // dal piu` recente: per versioni ripetute vince l'ultimo commit
    const sp = l.indexOf(" ");
    const m = l.slice(sp + 1).match(/^v(\d+\.\d+)(\s|$)/);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    if (tagExists("v" + m[1])) continue;
    run("git", ["tag", "v" + m[1], l.slice(0, sp)]);
    created++;
  }
  console.log("Tag creati in locale: " + created + " (versioni trovate: " + seen.size + "). Per pubblicarli: git push origin --tags");
}

function main() {
  const args = process.argv.slice(2);
  const flags = {
    noPush: args.includes("--no-push"), noBump: args.includes("--no-bump"),
    noGit: args.includes("--no-git"), force: args.includes("--force"),
  };
  const valueOf = name => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || "").replace(/^v/, "") : null; };
  if (args.includes("--tag-history")) return tagHistory();
  const rb = valueOf("--rollback"), rv = valueOf("--revert");
  if (rb !== null || rv !== null) {
    const ver = rb !== null ? rb : rv;
    if (!/^\d+\.\d+$/.test(ver)) fail("Versione non valida: «" + ver + "» (formato atteso: 9.106)");
    return rb !== null ? rollback(ver, flags) : revertVersion(ver, flags);
  }
  const skip = new Set(["--rollback", "--revert"]);
  const message = args.filter((a, i) => !a.startsWith("--") && !skip.has(args[i - 1])).join(" ").trim();
  if (!message && !flags.noGit) {
    console.error('Uso: node build/release.js "messaggio commit" [--no-push] [--no-bump] [--no-git]\n' +
      '     node build/release.js --rollback 9.106 [--no-git] [--no-push] [--force]\n' +
      '     node build/release.js --revert 9.107 [--no-git] [--no-push] [--force]\n' +
      '     node build/release.js --tag-history');
    process.exit(1);
  }
  release(message, flags);
}

main();
