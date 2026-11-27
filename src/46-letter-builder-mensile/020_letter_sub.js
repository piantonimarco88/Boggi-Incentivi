// ============================================================
// LETTERA MENSILE — NUOVA LOGICA PREMI (da gennaio 2027, mensile ITA+INT)
// Una sezione per passaggio, dall'alto in basso:
//   BDG + SAS -> paracadute (se non al 100%) -> matrice Subscription -> altri premi (DCC, Visual, Articoli, QTY)
//   = premio maturato -> Coefficiente Inventari (tutte le voci) -> malattia -> aggiunte/Workgame -> totale.
// Usa le stesse funzioni di calcolo di calcE (premioSteps): nessuna formula duplicata. Richiamata da buildLetter()
// quando subNewActive(); prima di gennaio 2027 la lettera resta quella storica.
// ============================================================
var _SUB_LT={
  ITALIANO:{
    subTitle:"MATRICE SUBSCRIPTION",subLogic:"Il premio BDG viene confermato o ridotto in base al risultato Subscription rate del negozio rispetto al target.",
    colRate:"Subscription rate ÷ target",colPct:"% BDG riconosciuta",rTarget:"Subscription rate — target",rRes:"Subscription rate — risultato",rRatio:"% raggiungimento target",rCoeff:"% BDG riconosciuta",
    subNoData:"Dato Subscription non disponibile per questo negozio: nessuna riduzione del premio BDG.",subNoBdg:"Nessun premio BDG su cui applicare la matrice.",subPreTarget:"Target Subscription rate del negozio",
    paraTitle:"PARACADUTE",paraWin:"Negozio tra {a}% e {b}% del target → paracadute applicabile",paraSY:"SY risultato {r} > SY anno precedente {p} ✓",paraQty:"QTY risultato {r} ≥ target {t} ✓",paraMult:"Moltiplicatore ridotto al {m}%",
    paraNoLow:"Negozio sotto il {a}% del target → paracadute non applicabile",paraNoCond:"Negozio tra {a}% e {b}% del target, ma la condizione non è soddisfatta ({c}) → nessun BDG",condSY:"SY non superiore a quella dell'anno precedente",condQty:"QTY sotto il target",
    paraInfoSY:"Se il negozio chiude tra il {a}% e il {b}% del target e la SY supera quella dell'anno precedente, il BDG viene riconosciuto al {m}%.",paraInfoQty:"Se il negozio chiude tra il {a}% e il {b}% del target e raggiunge il target pezzi (QTY), il BDG viene riconosciuto al {m}%.",
    ovRid:"Override ridotto applicato manualmente — BDG riconosciuto al {m}% (negozio: {s}%)",ov100:"Override 100% applicato manualmente — BDG pieno riconosciuto (negozio: {s}%)",
    stepBdg:"PREMIO BDG A QUESTO PASSAGGIO",bdgFull:"INCENTIVO BDG PIENO",bdgMax:"INCENTIVO BDG MAX",bdgX:"BDG {x} × {p}%",
    altriTitle:"ALTRI PREMI",altriTot:"TOTALE ALTRI PREMI",artRow:"ARTICOLI INCENTIVATI — {n} cat. × {p}% BDG",artInd:"ARTICOLI INCENTIVATI (individuale)",visRow:"EXTRA BDG VISUAL IN STORE",dccRow:"DCC — {p}% × {v} (max {m})",qtyRow:"QTY — target {t}, risultato {r}",csRow:"CUSTOMER SERVICE",sasRow:"SAS",
    malTitle:"MALATTIA",malBefore:"Premio prima della malattia",malDays:"Giorni di malattia nel mese",malNone:"nessuna riduzione",malAfter:"PREMIO DOPO MALATTIA",afterInv:"Premio dopo Inventari",
    preMax:"INCENTIVO MAX PREVISTO",preCat:"Max per categoria",preCatN:"Categorie incentivate previste",preTbd:"da comunicare",preArtNote:"Premio per ogni categoria incentivata: {p}% del BDG. Le categorie incentivate nel mese vengono comunicate con il file Articoli incentivati.",preFormula:"FORMULA",preVisNote:"EXTRA BDG VISUAL IN STORE",preBdgNote:"Il valore dei SAS riconosciuto contribuisce al raggiungimento del target (con riserva).",
    prevBanner:"Di seguito il premio massimo potenziale per {m} e come verrà calcolato",storeLbl:"Negozio"},
  INGLESE:{
    subTitle:"SUBSCRIPTION MATRIX",subLogic:"The BDG prize is confirmed or reduced based on the store's Subscription rate result against its target.",
    colRate:"Subscription rate ÷ target",colPct:"% BDG recognised",rTarget:"Subscription rate — target",rRes:"Subscription rate — result",rRatio:"% of target reached",rCoeff:"% BDG recognised",
    subNoData:"Subscription data not available for this store: no reduction of the BDG prize.",subNoBdg:"No BDG prize to apply the matrix to.",subPreTarget:"Store Subscription rate target",
    paraTitle:"SAFETY NET",paraWin:"Store between {a}% and {b}% of target → safety net applicable",paraSY:"SY result {r} > previous-year SY {p} ✓",paraQty:"QTY result {r} ≥ target {t} ✓",paraMult:"Reduced multiplier at {m}%",
    paraNoLow:"Store below {a}% of target → safety net not applicable",paraNoCond:"Store between {a}% and {b}% of target, but the condition is not met ({c}) → no BDG",condSY:"SY not above the previous year",condQty:"QTY below target",
    paraInfoSY:"If the store closes between {a}% and {b}% of target and its SY exceeds the previous year, the BDG is recognised at {m}%.",paraInfoQty:"If the store closes between {a}% and {b}% of target and reaches the QTY target, the BDG is recognised at {m}%.",
    ovRid:"Reduced override manually applied — BDG recognised at {m}% (store: {s}%)",ov100:"100% override manually applied — full BDG granted (store: {s}%)",
    stepBdg:"BDG PRIZE AT THIS STEP",bdgFull:"FULL BDG INCENTIVE",bdgMax:"BDG INCENTIVE MAX",bdgX:"BDG {x} × {p}%",
    altriTitle:"OTHER INCENTIVES",altriTot:"TOTAL OTHER INCENTIVES",artRow:"INCENTIVISED ITEMS — {n} cat. × {p}% BDG",artInd:"INCENTIVISED ITEMS (individual)",visRow:"EXTRA BDG VISUAL IN STORE",dccRow:"DCC — {p}% × {v} (max {m})",qtyRow:"QTY — target {t}, result {r}",csRow:"CUSTOMER SERVICE",sasRow:"SAS",
    malTitle:"SICK LEAVE",malBefore:"Prize before sick leave",malDays:"Sick days in the month",malNone:"no reduction",malAfter:"PRIZE AFTER SICK LEAVE",afterInv:"Prize after Inventory coefficient",
    preMax:"EXPECTED MAX INCENTIVE",preCat:"Max per category",preCatN:"Expected incentivised categories",preTbd:"to be communicated",preArtNote:"Prize for each incentivised category: {p}% of BDG. The categories incentivised in the month are communicated with the incentivised-items file.",preFormula:"FORMULA",preVisNote:"EXTRA BDG VISUAL IN STORE",preBdgNote:"The recognised SAS value contributes to reaching the target (with reserve).",
    prevBanner:"Below is the maximum potential bonus for {m} and how it will be calculated",storeLbl:"Store"},
  FRANCESE:{
    subTitle:"MATRICE SUBSCRIPTION",subLogic:"La prime BDG est confirmée ou réduite selon le résultat du Subscription rate du magasin par rapport à l'objectif.",
    colRate:"Subscription rate ÷ objectif",colPct:"% BDG reconnu",rTarget:"Subscription rate — objectif",rRes:"Subscription rate — résultat",rRatio:"% de l'objectif atteint",rCoeff:"% BDG reconnu",
    subNoData:"Donnée Subscription non disponible pour ce magasin : aucune réduction de la prime BDG.",subNoBdg:"Aucune prime BDG à laquelle appliquer la matrice.",subPreTarget:"Objectif Subscription rate du magasin",
    paraTitle:"FILET DE SÉCURITÉ",paraWin:"Magasin entre {a}% et {b}% de l'objectif → filet de sécurité applicable",paraSY:"SY résultat {r} > SY année précédente {p} ✓",paraQty:"QTY résultat {r} ≥ objectif {t} ✓",paraMult:"Multiplicateur réduit à {m}%",
    paraNoLow:"Magasin sous {a}% de l'objectif → filet de sécurité non applicable",paraNoCond:"Magasin entre {a}% et {b}% de l'objectif, mais la condition n'est pas remplie ({c}) → pas de BDG",condSY:"SY pas supérieure à l'année précédente",condQty:"QTY sous l'objectif",
    paraInfoSY:"Si le magasin termine entre {a}% et {b}% de l'objectif et que sa SY dépasse celle de l'année précédente, le BDG est reconnu à {m}%.",paraInfoQty:"Si le magasin termine entre {a}% et {b}% de l'objectif et atteint l'objectif de pièces (QTY), le BDG est reconnu à {m}%.",
    ovRid:"Override réduit appliqué manuellement — BDG reconnu à {m}% (magasin : {s}%)",ov100:"Override 100% appliqué manuellement — BDG complet accordé (magasin : {s}%)",
    stepBdg:"PRIME BDG À CETTE ÉTAPE",bdgFull:"PRIME BDG COMPLÈTE",bdgMax:"PRIME BDG MAX",bdgX:"BDG {x} × {p}%",
    altriTitle:"AUTRES PRIMES",altriTot:"TOTAL AUTRES PRIMES",artRow:"ARTICLES INCITÉS — {n} cat. × {p}% BDG",artInd:"ARTICLES INCITÉS (individuel)",visRow:"EXTRA BDG VISUAL IN STORE",dccRow:"DCC — {p}% × {v} (max {m})",qtyRow:"QTY — objectif {t}, résultat {r}",csRow:"CUSTOMER SERVICE",sasRow:"SAS",
    malTitle:"MALADIE",malBefore:"Prime avant maladie",malDays:"Jours de maladie dans le mois",malNone:"aucune réduction",malAfter:"PRIME APRÈS MALADIE",afterInv:"Prime après Coefficient Inventaires",
    preMax:"PRIME MAX PRÉVUE",preCat:"Max par catégorie",preCatN:"Catégories incitées prévues",preTbd:"à communiquer",preArtNote:"Prime pour chaque catégorie incitée : {p}% du BDG. Les catégories incitées du mois sont communiquées avec le fichier des articles incités.",preFormula:"FORMULE",preVisNote:"EXTRA BDG VISUAL IN STORE",preBdgNote:"La valeur SAS reconnue contribue à l'atteinte de l'objectif (avec réserve).",
    prevBanner:"Ci-dessous le bonus potentiel maximum pour {m} et son mode de calcul",storeLbl:"Magasin"},
  TEDESCO:{
    subTitle:"SUBSCRIPTION-MATRIX",subLogic:"Die BDG-Prämie wird je nach Subscription-Rate-Ergebnis des Stores im Verhältnis zum Ziel bestätigt oder gekürzt.",
    colRate:"Subscription rate ÷ Ziel",colPct:"% BDG anerkannt",rTarget:"Subscription rate — Ziel",rRes:"Subscription rate — Ergebnis",rRatio:"% Zielerreichung",rCoeff:"% BDG anerkannt",
    subNoData:"Subscription-Daten für diesen Store nicht verfügbar: keine Kürzung der BDG-Prämie.",subNoBdg:"Keine BDG-Prämie, auf die die Matrix angewendet werden kann.",subPreTarget:"Subscription-Rate-Ziel des Stores",
    paraTitle:"SICHERHEITSNETZ",paraWin:"Store zwischen {a}% und {b}% des Ziels → Sicherheitsnetz anwendbar",paraSY:"SY-Ergebnis {r} > SY Vorjahr {p} ✓",paraQty:"QTY-Ergebnis {r} ≥ Ziel {t} ✓",paraMult:"Reduzierter Multiplikator {m}%",
    paraNoLow:"Store unter {a}% des Ziels → Sicherheitsnetz nicht anwendbar",paraNoCond:"Store zwischen {a}% und {b}% des Ziels, aber die Bedingung ist nicht erfüllt ({c}) → kein BDG",condSY:"SY nicht über dem Vorjahr",condQty:"QTY unter dem Ziel",
    paraInfoSY:"Schließt der Store zwischen {a}% und {b}% des Ziels ab und übertrifft seine SY das Vorjahr, wird das BDG zu {m}% anerkannt.",paraInfoQty:"Schließt der Store zwischen {a}% und {b}% des Ziels ab und erreicht das Stückziel (QTY), wird das BDG zu {m}% anerkannt.",
    ovRid:"Reduzierter Override manuell angewendet — BDG zu {m}% anerkannt (Store: {s}%)",ov100:"100 %-Override manuell angewendet — volles BDG gewährt (Store: {s}%)",
    stepBdg:"BDG-PRÄMIE IN DIESEM SCHRITT",bdgFull:"VOLLE BDG-PRÄMIE",bdgMax:"BDG-PRÄMIE MAX",bdgX:"BDG {x} × {p}%",
    altriTitle:"WEITERE PRÄMIEN",altriTot:"SUMME WEITERE PRÄMIEN",artRow:"GEFÖRDERTE ARTIKEL — {n} Kat. × {p}% BDG",artInd:"GEFÖRDERTE ARTIKEL (individuell)",visRow:"EXTRA BDG VISUAL IN STORE",dccRow:"DCC — {p}% × {v} (max {m})",qtyRow:"QTY — Ziel {t}, Ergebnis {r}",csRow:"CUSTOMER SERVICE",sasRow:"SAS",
    malTitle:"KRANKHEIT",malBefore:"Prämie vor Krankheit",malDays:"Krankheitstage im Monat",malNone:"keine Kürzung",malAfter:"PRÄMIE NACH KRANKHEIT",afterInv:"Prämie nach Inventur-Koeffizient",
    preMax:"ERWARTETE MAX-PRÄMIE",preCat:"Max pro Kategorie",preCatN:"Erwartete geförderte Kategorien",preTbd:"wird mitgeteilt",preArtNote:"Prämie je geförderter Kategorie: {p}% des BDG. Die im Monat geförderten Kategorien werden mit der Datei der geförderten Artikel mitgeteilt.",preFormula:"FORMEL",preVisNote:"EXTRA BDG VISUAL IN STORE",preBdgNote:"Der anerkannte SAS-Wert trägt zur Zielerreichung bei (mit Reserve).",
    prevBanner:"Nachfolgend der maximale potenzielle Bonus für {m} und die Berechnung",storeLbl:"Store"},
  SPAGNOLO:{
    subTitle:"MATRIZ SUBSCRIPTION",subLogic:"El premio BDG se confirma o se reduce según el resultado del Subscription rate de la tienda respecto al objetivo.",
    colRate:"Subscription rate ÷ objetivo",colPct:"% BDG reconocido",rTarget:"Subscription rate — objetivo",rRes:"Subscription rate — resultado",rRatio:"% de objetivo alcanzado",rCoeff:"% BDG reconocido",
    subNoData:"Dato Subscription no disponible para esta tienda: sin reducción del premio BDG.",subNoBdg:"Ningún premio BDG al que aplicar la matriz.",subPreTarget:"Objetivo Subscription rate de la tienda",
    paraTitle:"RED DE SEGURIDAD",paraWin:"Tienda entre {a}% y {b}% del objetivo → red de seguridad aplicable",paraSY:"SY resultado {r} > SY año anterior {p} ✓",paraQty:"QTY resultado {r} ≥ objetivo {t} ✓",paraMult:"Multiplicador reducido al {m}%",
    paraNoLow:"Tienda por debajo del {a}% del objetivo → red de seguridad no aplicable",paraNoCond:"Tienda entre {a}% y {b}% del objetivo, pero no se cumple la condición ({c}) → sin BDG",condSY:"SY no superior al año anterior",condQty:"QTY por debajo del objetivo",
    paraInfoSY:"Si la tienda cierra entre el {a}% y el {b}% del objetivo y su SY supera la del año anterior, el BDG se reconoce al {m}%.",paraInfoQty:"Si la tienda cierra entre el {a}% y el {b}% del objetivo y alcanza el objetivo de piezas (QTY), el BDG se reconoce al {m}%.",
    ovRid:"Override reducido aplicado manualmente — BDG reconocido al {m}% (tienda: {s}%)",ov100:"Override 100% aplicado manualmente — BDG completo reconocido (tienda: {s}%)",
    stepBdg:"PREMIO BDG EN ESTE PASO",bdgFull:"INCENTIVO BDG COMPLETO",bdgMax:"INCENTIVO BDG MÁX",bdgX:"BDG {x} × {p}%",
    altriTitle:"OTROS PREMIOS",altriTot:"TOTAL OTROS PREMIOS",artRow:"ARTÍCULOS INCENTIVADOS — {n} cat. × {p}% BDG",artInd:"ARTÍCULOS INCENTIVADOS (individual)",visRow:"EXTRA BDG VISUAL IN STORE",dccRow:"DCC — {p}% × {v} (máx {m})",qtyRow:"QTY — objetivo {t}, resultado {r}",csRow:"CUSTOMER SERVICE",sasRow:"SAS",
    malTitle:"ENFERMEDAD",malBefore:"Premio antes de la enfermedad",malDays:"Días de enfermedad en el mes",malNone:"sin reducción",malAfter:"PREMIO TRAS ENFERMEDAD",afterInv:"Premio tras Coeficiente Inventarios",
    preMax:"INCENTIVO MÁX PREVISTO",preCat:"Máx por categoría",preCatN:"Categorías incentivadas previstas",preTbd:"por comunicar",preArtNote:"Premio por cada categoría incentivada: {p}% del BDG. Las categorías incentivadas del mes se comunican con el archivo de artículos incentivados.",preFormula:"FÓRMULA",preVisNote:"EXTRA BDG VISUAL IN STORE",preBdgNote:"El valor SAS reconocido contribuye a alcanzar el objetivo (con reserva).",
    prevBanner:"A continuación el bono potencial máximo para {m} y cómo se calculará",storeLbl:"Tienda"}
};
function _sf(s,o){return String(s).replace(/\{(\w+)\}/g,function(_,k){return o&&o[k]!=null?o[k]:"";});}
function _lm(v,cu){return '<span class="lt-row-cur">'+cu+'</span>'+Math.round(v||0).toLocaleString("it-IT");}
function _lpct(x){return Math.round((x||0)*1000)/10;}
// Box matrice Subscription (stesso stile dei box SAS e Inventari). info = subInfo(); hit=idx fascia evidenziata (-1 = nessuna)
function subLetterBlock(T,info,hit,showResult){
  var b=PARAMS.subBands||[];
  var h='<div style="margin-top:10px;padding:11px 14px;background:#faf8f4;border:1px solid #ece7df;border-radius:7px">';
  h+='<div style="font-size:12px;font-weight:700;color:#a07d2c;margin-bottom:4px">'+esc(T.subTitle)+'</div>';
  h+='<div style="font-size:10px;color:#8a8680;line-height:1.45;margin-bottom:8px">'+esc(T.subLogic)+'</div>';
  h+='<table style="border-collapse:collapse;font-size:11px;margin:0 auto '+(showResult?'9px':'0')+'"><thead><tr><th style="padding:3px 11px;color:#a09a92;text-align:right">'+esc(T.colRate)+'</th><th style="padding:3px 11px;color:#8a8680">'+esc(T.colPct)+'</th></tr></thead><tbody>';
  b.forEach(function(x,i){var on=(i===hit);h+='<tr><td style="padding:3px 11px;text-align:right;color:#6b6560;font-weight:700">'+esc(subBandLbl(i))+'</td><td style="padding:3px 11px;text-align:center;'+(on?'background:#c9a96e;color:#fff;font-weight:700;border-radius:3px':'color:#9a958d')+'">'+Math.round(x.c*100)+'</td></tr>';});
  h+='</tbody></table>';
  if(showResult)h+=showResult;
  return h+'</div>';
}
function _kv(l,v){return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#8a8680">'+esc(l)+'</span><span style="font-weight:600;color:#2c2925">'+v+'</span></div>';}
function _paraBox(lines){return '<div style="margin-top:8px;padding:9px 12px;background:#fff8ee;border-left:3px solid #c9a96e;border-radius:0 5px 5px 0;font-size:10.5px;color:#856404">'+lines.map(function(x){return '<div style="padding:1px 0">'+esc(x)+'</div>';}).join('')+'</div>';}
function _plain(t){return '<div style="font-size:10.5px;color:#6b6560;line-height:1.5">'+esc(t)+'</div>';}

function buildLetterSub(e){
  var cu=e.cu||"EUR",sid=String(e.si),tg=D.t[sid]||{},cn=D.c[sid]||{},dp=isD(e.si),isP=MODE==="preventivo";
  var lang=trLang(e),T=_SUB_LT[lang]||_SUB_LT.INGLESE,mN=getMonthName(lang);
  var gr=({"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"})[lang]||"Hi";
  var tc=calcE(e),stp=premioSteps(e),sm=stp.sm;
  var _rlLt=e.rl||e.ib||0,pctSal=_rlLt>0?((tc/_rlLt)*100).toFixed(2):"0";
  var ssi=(typeof storeSasInfo==='function')?storeSasInfo(sid):null;
  var storeFrac=(typeof storePctOf==='function')?storePctOf(sid):0;
  var pctStore=(ssi&&ssi.active&&tg.to>0)?(ssi.pct*100).toFixed(1):(tg.to>0&&cn.sc?((cn.sc+(cn.es||0))/tg.to*100).toFixed(1):"100.0");
  var surplus=cn.es||0;
  var demOn=typeof demoltAppliesStore==="function"&&demoltAppliesStore(e);
  var dr=(!isP&&demOn)?DEMOLT_RESULT_STORE[sid]:null;
  var mtL=({"ITALIANO":"IT","INGLESE":"EN","FRANCESE":"FR","TEDESCO":"DE","SPAGNOLO":"ES"})[lang]||"EN";
  var modeTag={IT:" (PREVENTIVO)",EN:" (FORECAST)",FR:" (PRÉVISIONNEL)",DE:" (PROGNOSE)",ES:" (PREVISIÓN)"};
  var sN=0;
  function S(title,p,body,hideB){sN++;return secHd(sN,title,p,hideB||isP)+body+'</div></div>';}
  var bdgFullAmt=stp.bdgPieno,fullStore=!isP&&(e.ov_b100==="SI"||storeFrac>=PARAMS.bdg100);
  var para=PARAMS.bdg60mult;

  var h='<div class="lt"><div class="lt-top"><div class="lt-logo">'+getBrandLogoImg(e.si)+'</div><div style="text-align:right"><div class="lt-date">'+mN+" "+CFG_YEAR+"</div>";
  if(isP)h+='<div style="font-size:9px;color:#c9a96e;font-weight:700">'+modeTag[mtL]+"</div>";
  h+='</div></div><div class="lt-body"><div class="lt-greeting">'+gr+" "+esc(e.n)+",</div>";
  h+='<div class="lt-info">';
  [[tr(e,"serial","SERIAL NUMBER"),e.m],[tr(e,"month","MONTH YEAR"),mN+" "+CFG_YEAR],[tr(e,"store","STORE"),e.s],[tr(e,"name","NAME"),e.n],[tr(e,"surname","SURNAME"),e.c],[tr(e,"func","FUNCTION"),e.f||e.j],[tr(e,"salary","MONTHLY GROSS SALARY"),fc(e.rl||e.ib||0,cu)]].forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(String(p[1]))+"</div></div>"});h+="</div>";
  // KPI SPRINT: la riga SY resta perche' e' la condizione del paracadute
  if(!isP&&tg.sy){var syLyPY=MONTHLY_SYLY[sid];
    h+='<div class="lt-kpi"><div class="lt-kpi-head"><span>KPI SPRINT</span><span style="text-align:right">TARGET</span><span style="text-align:right">PY</span><span style="text-align:right">RESULT</span><span></span></div><div class="lt-kpi-row"><span>SY</span><span style="text-align:right">'+fDec(tg.sy)+'</span><span style="text-align:right;color:#b0a99f">'+(syLyPY!=null?fDec(syLyPY):'—')+'</span><span style="text-align:right;font-weight:600">'+fDec(cn.sy)+"</span><span>"+((cn.sy||0)>=(tg.sy||0)&&tg.sy>0?"✅":"❌")+"</span></div></div>";}
  if(isP)h+='<div style="font-size:12px;font-weight:700;color:#856404;margin-bottom:16px;background:#fff3cd;padding:10px 14px;border-radius:6px">'+esc(_sf(T.prevBanner,{m:mN+" "+CFG_YEAR}))+"</div>";
  else h+='<div style="font-size:12px;font-weight:700;color:#2c2925;margin-bottom:16px">'+esc(tr(e,"results",mN))+" "+mN+" "+CFG_YEAR+" "+esc(tr(e,"and_inc",""))+"</div>";

  // ── 1) BDG: fatturato + SAS ────────────────────────────────────────────
  var b1='';
  if(!isP||tg.to)b1+=ltRow(tr(e,"target","TARGET"),_lm(tg.to||0,cu));
  if(!isP){
    b1+=ltRow(tr(e,"balance","FINAL BALANCE"),_lm((cn.sc||0)+(cn.es||0),cu));
    if(surplus>0){var _tsLbl=(typeof _SAS_LT!=='undefined'?((_SAS_LT[lang]||_SAS_LT.INGLESE).turnoverSurplus):'Turnover surplus');b1+='<div style="font-size:9px;color:#a09a92;padding:2px 0;font-style:italic">'+esc(_tsLbl)+' (+'+Math.round(surplus).toLocaleString("it-IT")+")</div>";}
    var _resIn=(ssi&&ssi.reserveIn)||0;
    if(_resIn>0){
      var _sl=(typeof _SAS_LT!=='undefined'?(_SAS_LT[lang]||_SAS_LT.INGLESE):null);
      var _used=Math.min(_resIn,(ssi&&ssi.used)||0),_exp=_resIn-_used;
      b1+='<div style="font-size:9px;color:#a09a92;padding:2px 0"><span style="font-style:italic">'+esc(_sl?_sl.resIn:'Previous month SAS reserve')+': '+cu+' '+Math.round(_resIn).toLocaleString("it-IT")+'</span>';
      if(_used>0)b1+='<span style="color:#2d7a3a;margin-left:6px">'+esc(_sl?_sl.resInUsed:'used')+': '+cu+' '+Math.round(_used).toLocaleString("it-IT")+'</span>';
      if(_exp>0)b1+='<span style="color:#cf5b5b;margin-left:6px">'+esc(_sl?_sl.resInExpired:'expired')+': '+cu+' '+Math.round(_exp).toLocaleString("it-IT")+'</span>';
      b1+='</div>';
    }
    b1+='<div style="font-size:9px;color:#8a8680;margin-top:4px">Store: '+pctStore+"%</div>";
  }
  if(!(STORE_FLAGS[sid]&&STORE_FLAGS[sid].noSas))b1+=sasLetterBlock(lang,ssi,isP,cu);
  if(e.ibFromAY)b1+='<div style="font-size:9px;margin-top:6px;padding:4px 8px;background:#fff8ee;border-left:3px solid #c9a96e;color:#856404;border-radius:0 4px 4px 0">BDG NETTO — pagato in busta paga come TRASFERTE (cod. 380)</div>';
  b1+=ltRow(isP?T.bdgMax:T.bdgFull,_lm(e.ib||0,cu));
  if(!isP){b1+=secPd(T.stepBdg,Math.round(fullStore?bdgFullAmt:0),cu,fullStore);}
  else b1+=secPd(T.bdgMax,Math.round(bdgFullAmt),cu,true);
  if(isOn(e.j,"rb"))h+=S(tr(e,"turnover","TURNOVER TARGET"),fullStore,b1);

  // ── 2) PARACADUTE (solo se il negozio non e' al 100%) ───────────────────
  if(isOn(e.j,"rb")){
    var pa=Math.round(PARAMS.bdg60*1000)/10,pb=Math.round(PARAMS.bdg100*1000)/10,pm=Math.round(para*100);
    if(isP){
      h+=S(T.paraTitle,null,_plain(_sf(dp?T.paraInfoQty:T.paraInfoSY,{a:pa,b:pb,m:pm})));
    }else if(!fullStore){
      var lines=[],pOk=false;
      if(e.ov_rid==="SI"){lines.push(_sf(T.ovRid,{m:pm,s:pctStore}));pOk=true;}
      else if(isRidotto(e)){
        pOk=true;lines.push(_sf(T.paraWin,{a:pa,b:pb}));
        if(dp)lines.push(_sf(T.paraQty,{r:(cn.qc||0),t:(tg.qt||0)}));
        else lines.push(_sf(T.paraSY,{r:fDec(cn.sy||0),p:fDec(MONTHLY_SYLY[sid]||0)}));
        lines.push(_sf(T.paraMult,{m:pm}));
      }else if(storeFrac<PARAMS.bdg60)lines.push(_sf(T.paraNoLow,{a:pa}));
      else lines.push(_sf(T.paraNoCond,{a:pa,b:pb,c:(dp?T.condQty:T.condSY)}));
      var pb2=_paraBox(lines);
      if(pOk&&e.ov_rid!=="SI")pb2+=ltRow(_sf(T.bdgX,{x:Math.round(bdgFullAmt).toLocaleString("it-IT"),p:pm}),_lm(stp.bdgRaw,cu));
      pb2+=secPd(T.stepBdg,Math.round(stp.bdgRaw),cu,stp.bdgRaw>0);
      h+=S(T.paraTitle,pOk,pb2);
    }else if(e.ov_b100==="SI"){
      h+=S(T.paraTitle,true,_paraBox([_sf(T.ov100,{s:pctStore})]));
    }
  }

  // ── 3) MATRICE SUBSCRIPTION ─────────────────────────────────────────────
  if(subApplies(e)&&isOn(e.j,"rb")){
    var sI=subInfo(sid);
    if(isP){
      var pre='<div style="font-size:10px;color:#8a8680;margin-bottom:2px">'+esc(T.subPreTarget)+': '+(sI.target>0?fPct(sI.target):'—')+'</div>'+subLetterBlock(T,sI,-1,'');
      h+=S(T.subTitle,null,pre);
    }else if(stp.bdgRaw>0){
      var sres='';
      if(sI.has){
        sres=_kv(T.rTarget,fPct(sI.target))+_kv(T.rRes,fPct(sI.rate))+_kv(T.rRatio,esc(fPct(sI.ratio)+' ('+subBandLbl(sI.idx)+')'))+_kv(T.rCoeff,Math.round(sI.coeff*100)+'%');
      }else sres='<div style="font-size:10.5px;color:#a09a92;font-style:italic">'+esc(T.subNoData)+'</div>';
      var sb=subLetterBlock(T,sI,sI.has?sI.idx:-1,sres);
      if(sI.has)sb+=ltRow(_sf(T.bdgX,{x:Math.round(stp.bdgRaw).toLocaleString("it-IT"),p:Math.round(sI.coeff*100)}),_lm(stp.bdgSub,cu));
      sb+=secPd(T.stepBdg,Math.round(stp.bdgSub),cu,stp.bdgSub>0);
      h+=S(T.subTitle,sI.coeff>=1||!sI.has,sb);
    }else{
      h+=S(T.subTitle,null,'<div style="font-size:10.5px;color:#a09a92;font-style:italic">'+esc(T.subNoBdg)+'</div>',true);
    }
  }

  // ── 4) ALTRI PREMI ──────────────────────────────────────────────────────
  var catsBdgPct=Math.round(PARAMS.artPct*100);
  var viewVL=VL[e.m];
  function visualRows(){
    var r='';
    if(Array.isArray(viewVL)&&viewVL.length>0){
      viewVL.forEach(function(en){
        var _s=String(en.sid||'').trim();if(_s){var pi=parseInt(_s);if(!isNaN(pi))_s=String(pi);}
        var rs=_s||sid,pc=storePctOf(rs),so=storeOvTier(rs);
        var tier=e.ov_b100==="SI"?'full':e.ov_rid==="SI"?'rid':(so==='full'?'full':so==='rid'?'rid':(pc>=PARAMS.bdg100?'full':(isRidottoStore(rs)?'rid':'none')));
        var amt=tier==='full'?(en.amt||0):(tier==='rid'?(en.amt||0)*para:0);
        var nm='';E.forEach(function(x){if(String(x.si)===rs&&x.s)nm=x.s;});
        r+=ltRow(T.storeLbl+' '+rs+(nm?' — '+nm:''),(tier==='full'?'✅':(tier==='rid'?'🟡':'❌'))+' '+fPct(pc)+' · '+_lm(amt,cu));
      });
    }
    return r;
  }
  if(!isP){
    var al='',a=stp.altri;
    if(a.ra>0)al+=ltRow((e.ra||0)>0?T.artInd:_sf(T.artRow,{n:(cn.ac||0),p:catsBdgPct}),_lm(a.ra,cu));
    if(a.vi>0||(Array.isArray(viewVL)&&viewVL.length>0)){al+=ltRow(T.visRow,_lm(a.vi,cu));al+=visualRows();}
    if(a.rdc>0)al+=ltRow(_sf(T.dccRow,{p:(PARAMS.dccRate*100).toFixed(1),v:_lm(cn.dv||0,cu),m:(cu==="EUR"?"€":cu+" ")+PARAMS.dccMax}),_lm(a.rdc,cu));
    if(a.pq>0)al+=ltRow(_sf(T.qtyRow,{t:(tg.qt||0),r:(cn.qc||0)}),_lm(a.pq,cu));
    if(a.rcs>0)al+=ltRow(T.csRow,_lm(a.rcs,cu));
    if(a.rsa>0)al+=ltRow(T.sasRow,_lm(a.rsa,cu));
    if(stp.sumAltri>0||al)h+=S(T.altriTitle,true,al+secPd(T.altriTot,Math.round(stp.sumAltri),cu,stp.sumAltri>0));
  }else{
    // Preventivo: box dedicati con il premio MASSIMO previsto (Articoli e Visual sempre mostrati se attivi)
    if(PARAMS.artEnabled&&isOn(e.j,"ra")){
      var mx=Math.round((e.ib||0)*PARAMS.artPct*100)/100,n=cn.ac||0;
      var ab=_plain(_sf(T.preArtNote,{p:catsBdgPct}))+ltRow(T.preFormula,catsBdgPct+'% BDG × N.')+ltRow(T.preCat,_lm(mx,cu))+ltRow(T.preCatN,n>0?String(n):esc(T.preTbd))+secPd(T.preMax,Math.round(stp.altri.ra),cu,true);
      h+=S(tr(e,"articles","ITEMS"),null,ab);
    }
    if(stp.altri.vi>0||(Array.isArray(viewVL)&&viewVL.length>0)){
      var vb='';
      if(Array.isArray(viewVL))viewVL.forEach(function(en){var _s=String(en.sid||'').trim();var pi=parseInt(_s);if(!isNaN(pi))_s=String(pi);var nm='';E.forEach(function(x){if(String(x.si)===(_s||sid)&&x.s)nm=x.s;});vb+=ltRow(T.storeLbl+' '+(_s||sid)+(nm?' — '+nm:''),_lm(en.amt||0,cu));});
      vb+=secPd(T.preMax,Math.round(stp.altri.vi),cu,true);
      h+=S(T.visRow,null,vb);
    }
    if(isOn(e.j,"rdc")&&stp.altri.rdc>0)h+=S("DCC",null,ltRow(T.preFormula,(PARAMS.dccRate*100).toFixed(1)+"% max "+(cu==="EUR"?"€":cu+" ")+PARAMS.dccMax)+secPd(T.preMax,Math.round(stp.altri.rdc),cu,true));
    if(isOn(e.j,"pq")&&stp.altri.pq>0)h+=S("QTY",null,ltRow(T.preFormula,Math.round(PARAMS.qtyPct*100)+"% BDG")+(tg.qt?ltRow(tr(e,"target","TARGET"),"QTY "+tg.qt):"")+secPd(T.preMax,Math.round(stp.altri.pq),cu,true));
  }

  // ── Chiusura: Inventari / malattia / aggiunte / Workgame / totale ───────
  var post='';var postN=function(title,p,body,hideB){return S(title,p,body,hideB);};
  var smTxt=(sm*100)+"%";
  var malBody=function(){return ltRow(T.malBefore,_lm(stp.dopoInv,cu))+ltRow(T.malDays,(e.ml||0)+' → '+(sm<1?smTxt:T.malNone))+secPd(T.malAfter,Math.round(stp.finale),cu,stp.finale>0);};
  var afterSteps=function(){
    var x='';
    if(!isP)x+=postN(T.malTitle,sm>=1,malBody());
    var at=aggTotal(e.m);
    if(at>0){sN++;x+=secHd(sN,"AGGIUNTE / MANUAL ADJUSTMENTS",true,isP);var ag=AGG[e.m];AGG_KEYS.forEach(function(ak){if(ag[ak.k]>0)x+=ltRow(ak.l,'<span class="lt-row-cur">'+cu+"</span>"+ag[ak.k])});x+=secPd("TOTAL ADJUSTMENTS",Math.round(at),cu,true)+"</div></div>";}
    if(workgameOn(e)){
      var wgAmt=Math.round(workgameAmt(e));
      var wgLbls={"ITALIANO":"WORKGAME - BONUS AGGIUNTIVO","INGLESE":"WORKGAME - ADDITIONAL BONUS","FRANCESE":"WORKGAME - BONUS SUPPLEMENTAIRE","TEDESCO":"WORKGAME - ZUSATZBONUS","SPAGNOLO":"WORKGAME - BONO ADICIONAL"};
      var wgDesc={"ITALIANO":"Hai raggiunto l'obiettivo Workgame del mese. Il bonus corrisponde al "+Math.round((PARAMS.workgamePct||0)*100)+"% del tuo premio BDG nominale.","INGLESE":"You have achieved the Workgame target for the month. The bonus corresponds to "+Math.round((PARAMS.workgamePct||0)*100)+"% of your personal BDG prize.","FRANCESE":"Vous avez atteint l'objectif Workgame du mois. Le bonus correspond a "+Math.round((PARAMS.workgamePct||0)*100)+"% de votre prime BDG personnelle.","TEDESCO":"Sie haben das Workgame-Ziel des Monats erreicht. Der Bonus entspricht "+Math.round((PARAMS.workgamePct||0)*100)+"% Ihrer personlichen BDG-Pramie.","SPAGNOLO":"Has alcanzado el objetivo Workgame del mes. El bono corresponde al "+Math.round((PARAMS.workgamePct||0)*100)+"% de tu premio BDG personal."};
      sN++;x+=secHd(sN,wgLbls[lang]||wgLbls["INGLESE"],true,isP);x+=ltRow(wgDesc[lang]||wgDesc["INGLESE"],"");x+=secPd(tr(e,"inc_paid","INCENTIVE PAID"),wgAmt,cu,true)+"</div></div>";
    }
    return x;
  };
  var totalLabel=isP?(lang==="ITALIANO"?"MASSIMO PREMIO POTENZIALE":((SEAS_TR[lang]||{}).max_bonus||"MAXIMUM POTENTIAL BONUS")):esc(tr(e,"earned","THIS MONTH YOU HAVE EARNED THE"));
  var totHtml=tc>0?'<div class="lt-total"><div><div class="lt-total-label">'+totalLabel+'</div><div class="lt-total-pct">'+pctSal+esc(tr(e,"over_sal","% OVER SALARY"))+'</div></div><div class="lt-total-val">'+fc(tc,cu)+'</div></div>'
    :'<div class="lt-total"><div><div class="lt-total-label" style="color:#cf5b5b">NO INCENTIVE</div></div><div class="lt-total-val" style="color:#6b6560">'+fc(0,cu)+'</div></div>';
  var DT=_DEMOLT_LT[lang]||_DEMOLT_LT.INGLESE;
  if(demOn&&isP){
    h+='</div><div style="padding:0 28px;background:#fff">'+demoltLetterBlock(lang,null,true,cu,false)+'</div>'+totHtml;
  }else if(demOn){
    // Coefficiente Inventari su tutte le voci: premio maturato -> matrice -> premio dopo Inventari
    h+='</div>';
    h+='<div class="lt-total" style="opacity:.6"><div><div class="lt-total-label">'+esc(DT.maturato)+'</div></div><div class="lt-total-val">'+fc(stp.maturato,cu)+'</div></div>';
    h+='<div style="padding:0 28px;background:#fff">'+demoltLetterBlock(lang,dr,isP,cu,false);
    if(dr&&dr.pct!=null)h+='<div style="text-align:center;font-size:12px;font-weight:700;color:#a07d2c;margin:8px 0">× '+Math.round(dr.pct*100)+'% →</div>';
    h+='</div>';
    {
      h+='<div class="lt-total" style="opacity:.6"><div><div class="lt-total-label">'+esc(T.afterInv)+'</div></div><div class="lt-total-val">'+fc(stp.dopoInv,cu)+'</div></div>';
      h+='<div style="padding:12px 28px 0;background:#fff">'+afterSteps()+'</div>';
    }
    h+=totHtml;
  }else{
    h+=afterSteps()+'</div>'+totHtml;
  }
  h+='<div class="lt-footer"><div style="font-weight:600;margin-bottom:6px">'+esc(tr(e,"rules","THE DELIVERED INCENTIVES FOLLOW THE RULE"))+'</div><div style="white-space:pre-wrap">'+esc(getDiscl(e))+"</div></div></div>";
  return h;
}
