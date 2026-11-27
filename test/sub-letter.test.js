// Lettere mensili della nuova logica (da gennaio 2027): una sezione per passaggio, 5 lingue, preventivo e consuntivo.
//   node build/build.js && node --test test/sub-letter.test.js
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const { loadBundle } = require("../build/bundle-harness");

// Stesso scenario dei test della matrice (negozi 1201.. non Dept; 1387 Dept; 1321 USA)
const src = fs.readFileSync(require("path").join(__dirname, "sub-matrix.test.js"), "utf8");
const SCENARIO = src.split("const SCENARIO = `")[1].split("`;")[0];

function app_(y, m, mode, lang) {
  const app = loadBundle();
  app.run(SCENARIO);
  app.run('MODE="' + (mode || "consuntivo") + '";CFG_YEAR=' + y + ";CFG_MONTH=" + m + ";");
  if (lang) app.run('D.tr["210"]=Object.assign({},D.tr["210"]||{},{l:"' + lang + '"});');
  return app;
}
const letter = (app, matr) => app.run('buildLetter(E.filter(function(e){return e.m==="' + matr + '"})[0])');
const text = html => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

test("consuntivo 2027: cascata BDG -> Subscription -> altri premi -> malattia, senza Digital/SY/Privilege", () => {
  const app = app_(2027, 1);
  const html = letter(app, "S01");                 // SA, Subscription 94,2% -> 60%, Articoli 1 categoria
  const t = text(html);
  assert.deepStrictEqual(app.errors, []);
  assert.ok(t.includes("MATRICE SUBSCRIPTION"));
  assert.ok(t.includes("PREMIO BDG A QUESTO PASSAGGIO"));
  assert.ok(t.includes("ALTRI PREMI"));
  assert.ok(t.includes("MALATTIA"));
  assert.ok(!/DIGITAL TARGET|PRIVILEGE|SY TARGET/.test(t), "sezioni ritirate");
  // ordine delle sezioni dall'alto in basso
  const order = ["MATRICE SUBSCRIPTION", "ALTRI PREMI", "MALATTIA"].map(k => t.indexOf(k));
  assert.ok(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), "ordine: " + order);
  // 500 -> 300 (Subscription 60%) + Articoli 150 = 450
  assert.ok(/450/.test(t));
  const tot = app.run('calcE(E[0])');
  assert.strictEqual(tot, 450);
});

test("paracadute: sezione visibile se il negozio non e' al 100% (applicato) e non per negozio al 105%", () => {
  const app = app_(2027, 1);
  const tPara = text(letter(app, "S06"));          // 97% con SY in crescita
  assert.ok(tPara.includes("PARACADUTE"));
  assert.ok(tPara.includes("paracadute applicabile"));
  assert.ok(!text(letter(app, "S02")).includes("PARACADUTE"), "negozio al 105%: nessuna sezione paracadute");
  const app2 = app_(2027, 1);
  app2.run('D.c["1206"].sy=0.20;');
  assert.ok(text(letter(app2, "S06")).includes("non è soddisfatta"), "SY non in crescita: paracadute non applicabile");
  app2.run('D.c["1206"].sc=90000;');
  assert.ok(text(letter(app2, "S06")).includes("non applicabile"), "sotto il 95%");
});

test("il box Malattia e' sempre presente nel consuntivo per tutti i ruoli, Dept compresi; mai in preventivo", () => {
  const app = app_(2027, 1);
  for (const m of ["S01", "S02", "S07", "S10", "S13"]) assert.ok(text(letter(app, m)).includes("MALATTIA"), m);
  const t11 = text(letter(app, "S11"));            // 1 giorno di malattia -> 50%
  assert.ok(t11.includes("50%"));
  const p = app_(2027, 1, "preventivo");
  for (const m of ["S01", "S07", "S10"]) assert.ok(!text(letter(p, m)).includes("MALATTIA"), "prev " + m);
});

test("Dept store: nessuna matrice Subscription, QTY tra gli altri premi", () => {
  const app = app_(2027, 1);
  const t = text(letter(app, "S07"));
  assert.ok(!t.includes("MATRICE SUBSCRIPTION"));
  assert.ok(t.includes("ALTRI PREMI"));
});

test("SM con Coefficiente Inventari: premio maturato -> matrice -> premio dopo Inventari, applicato a tutte le voci", () => {
  const app = app_(2027, 1);
  app.run('DEMOLT_RESULT_STORE={"1201":{pct:0.5,compl:0.80,acc:0.96}};');
  const t = text(letter(app, "S10"));
  assert.ok(t.includes("COEFFICIENTE INVENTARI"));
  assert.ok(t.includes("Premio maturato") && t.includes("Premio dopo Inventari"));
  assert.ok(t.indexOf("Premio maturato") < t.indexOf("COEFFICIENTE INVENTARI"));
  assert.ok(t.indexOf("Premio dopo Inventari") < t.indexOf("MALATTIA"));
  // totale della lettera = calcE (BDG 600*0,5 + Articoli 300*0,5)
  assert.strictEqual(app.run('calcE(E[9])'), 450);
});

test("preventivo: Articoli incentivati e Visual In Store sempre mostrati con il massimo previsto; matrice come logica", () => {
  const p = app_(2027, 1, "preventivo");
  p.run('VL={"S01":[{sid:"1201",amt:100}]};');
  const t = text(letter(p, "S01"));
  assert.ok(t.includes("MATRICE SUBSCRIPTION"));
  assert.ok(t.includes("ITEMS") || t.includes("ARTICOL"));
  assert.ok(t.includes("EXTRA BDG VISUAL IN STORE"));
  assert.ok(t.includes("INCENTIVO MAX PREVISTO"));
  assert.ok(t.includes("MASSIMO PREMIO POTENZIALE"));
  assert.ok(/750/.test(t), "500 BDG + 150 Articoli + 100 Visual");
  // un negozio senza Visual e senza categorie incentivate: nessun box Visual, Articoli con 'da comunicare'
  const t3 = text(letter(p, "S03"));
  assert.ok(!t3.includes("EXTRA BDG VISUAL IN STORE"));
  assert.ok(t3.includes("da comunicare"));
  // anche un SCS puo' avere il Visual
  p.run('VL={"S13":[{sid:"1201",amt:30}]};');
  assert.ok(text(letter(p, "S13")).includes("EXTRA BDG VISUAL IN STORE"));
});

test("5 lingue: nessun segnaposto non risolto, nessun 'undefined'", () => {
  for (const lang of ["ITALIANO", "INGLESE", "FRANCESE", "TEDESCO", "SPAGNOLO"]) {
    for (const mode of ["consuntivo", "preventivo"]) {
      const app = app_(2027, 1, mode, lang);
      app.run('DEMOLT_RESULT_STORE={"1201":{pct:0.8,compl:0.85,acc:0.96}};VL={"S01":[{sid:"1201",amt:100}],"S10":[{sid:"1201",amt:100}]};');
      for (const m of ["S01", "S06", "S07", "S10", "S13"]) {
        const html = letter(app, m);
        assert.ok(!/\{\w+\}/.test(html.replace(/<style[\s\S]*?<\/style>/g, "")), lang + " " + mode + " " + m + ": segnaposto");
        assert.ok(!/undefined|NaN/.test(html), lang + " " + mode + " " + m + ": undefined/NaN");
      }
      assert.deepStrictEqual(app.errors, [], lang + " " + mode);
    }
  }
});

test("prima di gennaio 2027 la lettera resta quella storica (Digital, SY, Privilege)", () => {
  const app = app_(2026, 12);
  const t = text(letter(app, "S02"));
  assert.ok(/DIGITAL/i.test(t) && /PRIVILEGE/i.test(t) && /SY TARGET/.test(t));
  assert.ok(!t.includes("MATRICE SUBSCRIPTION"));
});

test("lettera 2027 passa dalle funzioni di stampa/PDF (getLetterHtmlForPrint) senza errori", () => {
  const app = app_(2027, 1);
  const out = app.run('getLetterHtmlForEmp(E[0]).length');
  assert.ok(out > 500);
  assert.deepStrictEqual(app.errors, []);
});

test("HTML delle lettere 2027 bilanciato (tag div aperti = chiusi) in tutte le varianti", () => {
  for (const mode of ["consuntivo", "preventivo"]) {
    const app = app_(2027, 1, mode);
    app.run('DEMOLT_RESULT_STORE={"1201":{pct:0.8,compl:0.85,acc:0.96}};VL={"S01":[{sid:"1201",amt:100}],"S13":[{sid:"1201",amt:30}]};AGG={"S01":{rb:20}};E[2].ov_wg="SI";');
    for (const m of ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13"]) {
      const html = letter(app, m);
      const open = (html.match(/<div[\s>]/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
      assert.strictEqual(open, close, mode + " " + m + ": div aperti " + open + " chiusi " + close);
    }
  }
});
