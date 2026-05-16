function gR(e){
  var sid=String(e.si),tg=D.t[sid]||{},cn=D.c[sid]||{},dp=isD(e.si),R=[],cu=e.cu||"EUR",sm=sickMult(e.ml);

  // === USA employees: separate reason logic ===
  if(isUSA(e.si,e)){
    var ud=(D.usa||{})[e.m]||{},cm=ud.cm||0,job=e.f||e.j||"";
    var rp=USA_P[job]||{noTargetMult:0.4,targetMult:1.0,useStore:false};
    var usaDept=ud.isDept||(STORE_FLAGS[String(e.si)]&&STORE_FLAGS[String(e.si)].usaDept);
    var useStoreSales=rp.useStore||usaDept;
    var storePct=tg.to>0?cn.sc/tg.to:0,storeHit=MODE==="preventivo"||storePct>=PARAMS.bdg100||(MODE==="consuntivo"&&e.ov_b100==="SI");
    var base,baseLabel;
    if(useStoreSales){base=MODE==="preventivo"?(tg.to||0):(cn.sc||0);baseLabel="fatturato negozio"}
    else{base=ud.ps||0;baseLabel="vendite personali"}
    var mult=storeHit?rp.targetMult:rp.noTargetMult;var prize=Math.round(base*cm*mult*100)/100;
    var tPct=(rp.targetMult*100).toFixed(0),ntPct=(rp.noTargetMult*100).toFixed(0);
    if(MODE==="preventivo"){
      // USA preventivo: mostra solo la logica del premio, non il massimale (non calcolabile)
      var baseDesc=useStoreSales?("Fatturato negozio \u00d7 "+(cm*100).toFixed(2)+"%"): ("Vendite personali \u00d7 "+(cm*100).toFixed(2)+"%");
      R.push({t:"info",x:"Premio: "+baseDesc+". Erogazione: "+tPct+"% se store a target, "+ntPct+"% se non a target. Importo calcolato a consuntivo."});
    }else{
      if(storeHit)R.push({t:"success",x:fc(prize,cu)+" \u2014 Commission "+(cm*100).toFixed(2)+"% \u00d7 "+fc(base,cu)+" ("+baseLabel+") \u00d7 "+tPct+"%. Store "+(storePct*100).toFixed(1)+"% \u2265 target."});
      else R.push({t:"partial",x:fc(prize,cu)+" \u2014 Commission "+(cm*100).toFixed(2)+"% \u00d7 "+fc(base,cu)+" ("+baseLabel+") \u00d7 "+ntPct+"%. Store "+(storePct*100).toFixed(1)+"% < target."});
    }
    var at=aggTotal(e.m);if(at>0)R.push({t:"success",x:fc(at,cu)+" \u2014 Aggiunte."});
    return R;
  }

  // === Normal employees ===
  if(MODE==="preventivo"){IT.forEach(function(it){if(it.k!=="vi"&&!isOn(e.j,it.k))return;if(it.k==="ra"&&!PARAMS.artEnabled)return;var val=getVal(e,it.k);
    if(val>0)R.push({t:"success",x:fc(Math.round(val),cu)+" \u2014 "+it.fl+" (max potenziale)."});
    else{
      // Show formula even when val=0 so user sees which KPIs are active
      var formula="";
      switch(it.k){
        case "rb":formula="BDG \u20ac"+e.ib;break;
        case "rd":formula=PARAMS.digPct*100+"% BDG = \u20ac"+Math.round(e.ib*PARAMS.digPct);break;
        case "rs":formula=PARAMS.syPct*100+"% RLM"+(e.rl?"":" (RAL non caricata)");break;
        case "rp":formula=PARAMS.privPct*100+"% RLM"+(e.rl?"":" (RAL non caricata)");break;
        case "rsa":formula="\u20ac"+PARAMS.sasRate+"/SAS max \u20ac"+PARAMS.sasMax;break;
        case "rdc":formula=PARAMS.dccRate*100+"% max \u20ac"+PARAMS.dccMax;break;
        case "ra":formula=PARAMS.artPct*100+"% BDG/cat (dati pivot non caricati)";break;
        case "pq":formula=PARAMS.qtyPct*100+"% BDG";break;
      }
      if(formula)R.push({t:"info",x:fc(0,cu)+" \u2014 "+it.fl+": "+formula});
    }});
  }else{if(!tg.to&&!cn.sc){R.push({t:"info",x:"Dati store non disponibili."});return R}
    var pct=tg.to>0?(cn.sc+(cn.es||0))/tg.to:0;
    IT.forEach(function(it){if(it.k!=="vi"&&!isOn(e.j,it.k))return;if(it.k==="ra"&&!PARAMS.artEnabled)return;var val=getVal(e,it.k),paid=val>0,vS=Math.round(val*sm);
      switch(it.k){
        case "rb":if(paid){if(pct>=PARAMS.bdg100)R.push({t:"success",x:fc(vS,cu)+" \u2014 "+(pct*100).toFixed(1)+"% 100%."});else R.push({t:"partial",x:fc(vS,cu)+" \u2014 "+(PARAMS.bdg60mult*100)+"%."})}else{R.push({t:"fail",x:fc(0,cu)+" \u2014 BDG: "+(pct*100).toFixed(1)+"%"})}break;
        case "rd":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 Dig. "+(cn.pd*100).toFixed(1)+"%."});else R.push({t:"fail",x:fc(0,cu)+" \u2014 Dig: "+(cn.pd*100).toFixed(1)+"%."});break;
        case "rs":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 SY "+(cn.sy||0)+" \u2265 "+(Math.round((tg.sy||0)*PARAMS.kpi100*10)/10)+" (soglia "+(PARAMS.kpi100*100)+"% di "+tg.sy+")."});else R.push({t:"fail",x:fc(0,cu)+" \u2014 SY "+(cn.sy||0)+" < "+(Math.round((tg.sy||0)*PARAMS.kpi100*10)/10)+" (soglia "+(PARAMS.kpi100*100)+"% di "+(tg.sy||0)+")."});break;
        case "rp":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 Privilege "+fPct(cn.nf)+" \u2265 "+fPct((tg.pr||0)*PARAMS.kpi100)+" (soglia "+(PARAMS.kpi100*100)+"% di "+fPct(tg.pr)+")."});else R.push({t:"fail",x:fc(0,cu)+" \u2014 Privilege "+fPct(cn.nf)+" < "+fPct((tg.pr||0)*PARAMS.kpi100)+" (soglia "+(PARAMS.kpi100*100)+"% di "+fPct(tg.pr||0)+")."});break;
        case "rsa":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 "+(cn.s4||0)+" SAS."});else R.push({t:"fail",x:fc(0,cu)+" \u2014 SAS."});break;
        case "rdc":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 DCC."});else R.push({t:"fail",x:fc(0,cu)+" \u2014 DCC."});break;
        case "ra":if(paid){if((e.ra||0)>0){R.push({t:"success",x:fc(vS,cu)+" \u2014 Articoli incentivati (individuale)."});}else{var acN=cn.ac||0;R.push({t:"success",x:fc(vS,cu)+" \u2014 Articoli incentivati: "+(PARAMS.artPct*100)+"% BDG x "+acN+" categori"+(acN===1?"a":"e")+"."});}}break;
        case "vi":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 Visual."});break;
        case "pq":if(paid)R.push({t:"success",x:fc(vS,cu)+" \u2014 QTY "+(cn.qc||0)+" \u2265 "+(Math.ceil((tg.qt||0)*PARAMS.kpi100))+" (soglia "+(PARAMS.kpi100*100)+"% di "+(tg.qt||0)+")."});else R.push({t:"fail",x:fc(0,cu)+" \u2014 QTY "+(cn.qc||0)+" < "+(Math.ceil((tg.qt||0)*PARAMS.kpi100))+" (soglia "+(PARAMS.kpi100*100)+"% di "+(tg.qt||0)+")."});break;
      }});
    if(sm<1)R.push({t:"warn",x:e.ml+" gg malattia \u2192 "+(sm*100)+"%"})}
  // Aggiunte (always shown if present)
  var at=aggTotal(e.m);
  if(at>0)R.push({t:"success",x:fc(at,cu)+" \u2014 Aggiunte manuali (bypass regole/malattia)."});
  return R}

function tr(e,field,fb){var en=String(e.en||210),t=D.tr[en];if(t&&t[field])return t[field];return fb||""}
function trLang(e){var en=String(e.en||210),t=D.tr[en];return t?t.l:"INGLESE"}
