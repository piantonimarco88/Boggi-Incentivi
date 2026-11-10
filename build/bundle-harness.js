// BoggiIncentivi — caricatore del bundle compilato per i test
// ============================================================
// Carica web/app.html (l'app FINITA, come la usano gli utenti) in un contesto
// vm di Node con un DOM finto e permissivo: tutti gli script inline vengono
// eseguiti nell'ordine reale, quindi i test vedono le stesse funzioni e lo
// stesso ordine di inizializzazione del WebView2. Cosi` un errore che nasce
// solo nel bundle (es. una variabile usata prima di essere dichiarata in un
// altro modulo) viene intercettato, cosa impossibile ritagliando i sorgenti.
//
// Sta in build/ e non in test/ perche` `node --test` esegue come test
// qualunque .js dentro test/.
//
// Uso nei test:
//   const { loadBundle } = require("../build/bundle-harness");
//   const app = loadBundle();            // contesto nuovo e isolato
//   app.run("calcE(E[0])");              // esegue codice nel contesto dell'app
//   app.alerts / app.errors              // alert() mostrati / errori degli script
//   loadBundle({manualTimers:true}) + app.flushTimers()  // per i loader che usano setTimeout
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DEFAULT_BUNDLE = path.join(__dirname, "..", "web", "app.html");
const _cache = {};

function readBundle(file) {
  if (!_cache[file]) {
    // i blocchi delle librerie (<script data-lib>) non si eseguono: nei test XLSX/jsPDF sono finti
    const html = fs.readFileSync(file, "utf8").replace(/<script data-lib="[^"]*">[\s\S]*?<\/script>/g, "");
    const jdata = (html.match(/id="jdata">([\s\S]*?)<\/script>/) || [])[1] || "{}";
    // solo gli script inline eseguibili (non i <script src> CDN, non il JSON jdata)
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    _cache[file] = { jdata, scripts };
  }
  return _cache[file];
}

// Oggetto "qualsiasi": assorbe letture, scritture e chiamate senza errori.
// Le proprieta` scritte vengono conservate (innerHTML, value, onclick...).
function anyProxy() {
  const f = function () {};
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => "";
      if (k === "length") return 0;
      if (k === Symbol.iterator) return function* () {};
      if (Object.prototype.hasOwnProperty.call(t, k) && k !== "name") return t[k];
      if (k === "then") return undefined; // non e` una Promise
      return anyProxy();
    },
    set(t, k, v) { t[k] = v; return true; },
    apply() { return anyProxy(); },
    construct() { return anyProxy(); },
  });
}

function loadBundle(opts) {
  opts = opts || {};
  const { jdata, scripts } = readBundle(opts.file || DEFAULT_BUNDLE);
  const els = {};
  function el(id) {
    if (!els[id]) {
      const p = anyProxy();
      p.innerHTML = ""; p.value = ""; p.className = ""; p.style = {};
      p.textContent = id === "jdata" ? jdata : "";
      els[id] = p;
    }
    return els[id];
  }
  const store = {};
  const app = { alerts: [], errors: [], blobs: [], elements: els, _timers: [] };
  const ctx = {
    console: opts.console || { log() {}, warn() {}, error() {}, info() {} },
    document: {
      getElementById: el, querySelectorAll: () => [], querySelector: () => null,
      createElement: () => anyProxy(), addEventListener() {},
      body: anyProxy(), head: anyProxy(), documentElement: anyProxy(),
    },
    localStorage: {
      getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }, key: () => null, length: 0,
    },
    // timer: ignorati, oppure (opts.manualTimers) accodati ed eseguiti da app.flushTimers()
    setTimeout: fn => { if (opts.manualTimers && typeof fn === "function") app._timers.push(fn); return 0; },
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    navigator: { userAgent: "node-test" }, location: { href: "", search: "", hash: "" },
    alert: m => { app.alerts.push(String(m)); },
    confirm: () => (opts.confirm === undefined ? true : opts.confirm),
    prompt: () => null,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    // Blob: conserva il contenuto, cosi` i test leggono cio` che l'app "scarica"
    Blob: function (parts, o) { this.parts = parts; this.type = o && o.type; app.blobs.push(this); },
    // FileReader: i test impostano app.nextFileText prima di chiamare un loadXxx(input)
    FileReader: function () {
      const r = this;
      r.readAsText = r.readAsArrayBuffer = r.readAsBinaryString = r.readAsDataURL = function () {
        r.result = app.nextFileText;
        if (typeof r.onload === "function") r.onload({ target: { result: app.nextFileText } });
      };
    },
    XLSX: anyProxy(), JSZip: function () { return anyProxy(); },
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
    performance: { now: () => Date.now() },
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  scripts.forEach((s, i) => {
    try { vm.runInContext(s, ctx, { filename: "app.html#script" + i }); }
    catch (e) { app.errors.push("script " + i + ": " + e.message); }
  });
  app.ctx = ctx;
  // esegue i setTimeout accodati (anche quelli creati durante l'esecuzione), max 500
  app.flushTimers = () => {
    let n = 0;
    while (app._timers.length && n < 500) {
      const fn = app._timers.shift(); n++;
      try { fn(); } catch (e) { app.errors.push("timer: " + e.message); }
    }
  };
  app.run = code => vm.runInContext(code, ctx);
  // Testo dell'ultimo file "scaricato" dall'app (Blob)
  app.lastBlobText = () => { const b = app.blobs[app.blobs.length - 1]; return b ? b.parts.join("") : null; };
  return app;
}

module.exports = { loadBundle, DEFAULT_BUNDLE };
