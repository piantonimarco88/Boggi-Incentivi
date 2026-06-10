// BoggiIncentivi — release in un comando
// ============================================================
// Sostituisce i 4 passi manuali (bump versione, build, copia
// AppData, commit+push) che a ogni fix venivano ripetuti a mano.
//
// Uso:
//   node build/release.js "messaggio commit"
//   node build/release.js "messaggio" --no-push    (commit senza push)
//   node build/release.js "messaggio" --no-bump    (non incrementa APP_VERSION)
//   node build/release.js "messaggio" --no-git     (solo build + AppData)
//
// Il messaggio NON deve includere il prefisso versione: viene
// aggiunto automaticamente ("v8.75 — <messaggio>").
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MONOLITH = path.join(ROOT, "src", "_monolith", "app.html");
const WEB_OUT = path.join(ROOT, "web", "app.html");
const VERSION_RE = /var APP_VERSION='(\d+)\.(\d+)';/;

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ cwd: ROOT, encoding: "utf8", shell: false }, opts));
  if (r.status !== 0) {
    console.error((r.stdout || "") + (r.stderr || ""));
    throw new Error(cmd + " " + args.join(" ") + " fallito (exit " + r.status + ")");
  }
  return r.stdout || "";
}

function main() {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith("--"));
  const message = args.filter(a => !a.startsWith("--")).join(" ").trim();
  const noPush = flags.includes("--no-push");
  const noBump = flags.includes("--no-bump");
  const noGit = flags.includes("--no-git");

  if (!message && !noGit) {
    console.error('Uso: node build/release.js "messaggio commit" [--no-push] [--no-bump] [--no-git]');
    process.exit(1);
  }

  // 1. Bump versione
  let mono = fs.readFileSync(MONOLITH, "utf8");
  const m = mono.match(VERSION_RE);
  if (!m) throw new Error("APP_VERSION non trovata in src/_monolith/app.html");
  let version = m[1] + "." + m[2];
  if (!noBump) {
    version = m[1] + "." + (parseInt(m[2], 10) + 1);
    mono = mono.replace(VERSION_RE, "var APP_VERSION='" + version + "';");
    fs.writeFileSync(MONOLITH, mono, "utf8");
    console.log("Versione: " + m[1] + "." + m[2] + " -> " + version);
  } else {
    console.log("Versione: " + version + " (no bump)");
  }

  // 2. Build (include guardia encoding — fallisce su mojibake)
  console.log(run(process.execPath, [path.join(ROOT, "build", "build.js")]).trim());

  // 3. Copia in AppData (il wrapper .exe carica questa copia preferenzialmente)
  const appData = process.env.LOCALAPPDATA;
  if (appData) {
    const dest = path.join(appData, "BoggiIncentivi", "web", "app.html");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(WEB_OUT, dest);
    console.log("AppData:  " + dest);
  } else {
    console.log("AppData:  LOCALAPPDATA non definita — copia saltata");
  }

  // 4. Commit + push
  if (noGit) { console.log("Git: saltato (--no-git)"); return; }
  run("git", ["add", "src", "app.html", "web/app.html", "build", "test", "MainWindow.xaml.cs"]);
  const full = "v" + version + " — " + message + "\n\nCo-Authored-By: Claude <noreply@anthropic.com>";
  run("git", ["commit", "-m", full]);
  console.log("Commit:   v" + version + " — " + message);
  if (!noPush) {
    run("git", ["push"]);
    console.log("Push:     OK");
  } else {
    console.log("Push:     saltato (--no-push)");
  }
}

main();
