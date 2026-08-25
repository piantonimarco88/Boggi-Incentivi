function getEffectiveJob(e){
  var base=e.f||"SA";
  var sf=STORE_FLAGS[String(e.si)];
  if(!sf)return base;
  if(sf.dept)return base+" DEPT";
  var isSCS=base==="SCS";
  if(isSCS){
    // SCS has no SY, so noSy is irrelevant
    if(sf.noSas&&sf.noDig)return"SCS NO SAS NO DIGITAL";
    if(sf.noSas)return"SCS NO SAS";
    // noPriv (with or without noSy) → implies noDig too
    if(sf.noPriv||sf.noSy){var c="SCS NO DIGITAL NO PRIVILEGE";if(TC[c])return c;return"SCS NO DIGITAL"}
    if(sf.noDig)return"SCS NO DIGITAL";
    return base;
  }
  // Non-SCS: noSy or noPriv → full combo "XX NO DIGITAL NO SY NO PRIVILEGE"
  if(sf.noSy||sf.noPriv){
    var combo=base+" NO DIGITAL NO SY NO PRIVILEGE";
    if(TC[combo])return combo;
  }
  if(sf.noDig)return base+" NO DIGITAL";
  return base;
}

// Apply store flags to e.j for all employees
function applyStoreFlags(){
  E.forEach(function(e){e.j=getEffectiveJob(e)});
}
// === SEASONAL BONUS ENGINE ===
function isSMVSM(e){
  var f=e.f||"",j=e.j||"";
  return f==="SM"||f==="VSM"||(j.indexOf("SM")>=0&&j.indexOf("VSM")<0)||(j.indexOf("VSM")>=0);
}

function seasGetMolt(table, val){
  // JSON.stringify converts ±Infinity to null — treat null/>=999999 as +Infinity, null/<=-999999 as -Infinity
  for(var i=0;i<table.length;i++){
    var r=table[i];
    var lo=r.from;var hi=r.to;
    if(lo===null||lo<=-999999)lo=-Infinity;
    if(hi===null||hi>=999999)hi=Infinity;
    if(lo===-Infinity){if(val<=hi)return r.coeff;}
    else if(hi===Infinity){if(val>lo)return r.coeff;}
    else if(val>lo&&val<=hi)return r.coeff;
  }
  return 0;
}

function seasMoltTurnover(scost){
  return seasGetMolt(SEAS_CFG.molt_turnover, scost);
}
function seasMoltInventario(inv){
  // (stessa logica di seasMoltInventarioV — usata in rCSeasonal tabella)
  var tbl2=SEAS_CFG.molt_inventario.slice().sort(function(a,b){
    var fa=(a.from==null||a.from<=-999999)?-Infinity:Number(a.from);
    var fb=(b.from==null||b.from<=-999999)?-Infinity:Number(b.from);
    return fa-fb;
  });
  var coeff2=tbl2[0]?tbl2[0].coeff:0;
  for(var i=0;i<tbl2.length;i++){
    var lo2=(tbl2[i].from==null||tbl2[i].from<=-999999)?-Infinity:Number(tbl2[i].from);
    if(inv>=lo2) coeff2=tbl2[i].coeff;
    else break;
  }
  return coeff2;
}
function seasMoltInventarioV(inv){
  // inv = valore raw di "Difference on Cogs" dal file (es. -0.0066 = -0,66%)
  // Fasce raw: < -0.005 → 0.00 | -0.005…-0.002 → 0.50 | -0.002…-0.0015 → 0.80 | ≥ -0.0015 → 1.00
  // Equivalenti in %:  < -0,50%           | -0,50%…-0,20%              | -0,20%…-0,15%               | ≥ -0,15%
  // Ordina le fasce per 'from' crescente (-Inf → +Inf) e prende il coeff
  // dell'ultima fascia il cui 'from' è ≤ inv
  var tbl=SEAS_CFG.molt_inventario.slice().sort(function(a,b){
    var fa=(a.from==null||a.from<=-999999)?-Infinity:Number(a.from);
    var fb=(b.from==null||b.from<=-999999)?-Infinity:Number(b.from);
    return fa-fb; // crescente
  });
  var coeff=tbl[0]?tbl[0].coeff:0; // default = coeff della fascia più bassa
  for(var i=0;i<tbl.length;i++){
    var lo=(tbl[i].from==null||tbl[i].from<=-999999)?-Infinity:Number(tbl[i].from);
    if(inv>=lo) coeff=tbl[i].coeff;
    else break;
  }
  return coeff;
}

// Compute seasonal consuntivo values automatically from D.c / D.t store data
// Returns {scost, inv, sy_pct, sr_pct, sas_pct, acc_pct}
function seasAutoData(e){
  var sid=String(e.si);
  // Usa SEAS_TARGETS per i target seasonal KPI (importati da file dedicato)
  // Fallback su D.t (mensile) se non disponibili
  var stg=SEAS_TARGETS[sid]||{};
  var tg=D.t&&D.t[sid]?D.t[sid]:{};
  // D.cs = consuntivi seasonal (separati da D.c mensile)
  var cn=D.cs&&D.cs[sid]?D.cs[sid]:{};

  // Target seasonal: priorità a SEAS_TARGETS, fallback su D.t mensile
  var seas_to  = stg.to  !== undefined ? stg.to  : (tg.to  || 0);
  var seas_sy  = stg.sy  !== undefined ? stg.sy  : (tg.sy  || 0);
  var seas_pr  = stg.pr  !== undefined ? stg.pr  : (tg.pr  || 0);
  var seas_sas = stg.sas !== undefined ? stg.sas : (SEAS_CFG.sasMaxHours || 4);
  var seas_acc = SEAS_CFG.accTarget; // unico target Accuracy, configurabile — stg.acc è sempre 0.99 statico, mai sovrascritto da import

  // Scostamento fatturato %: usa target seasonal (+ eventuale contributo SAS→fatturato, da SS26)
  var sasAddon=seasSasAddon(sid);
  var scost=0;
  if(seas_to>0&&cn.sc!==undefined){scost=((cn.sc+(cn.es||0)+sasAddon)/seas_to-1)*100;}
  // Incidenza inventariale: usa cn.iv (% diretta da file inventory) se disponibile,
  // altrimenti calcola da esubero assoluto cn.es / fatturato cn.sc
  // inv = valore con segno originale di Difference on Cogs in %
  // Negativo = merce mancante (perdita). Più negativo = peggio.
  // Fasce: < -0.50% → 0.00 | -0.50…-0.20% → 0.50 | -0.20…-0.15% → 0.80 | ≥ -0.15% → 1.00
  // inv = Difference on Cogs dal file, valore raw con segno (es. 0.00558 o -0.00254)
  // Positivo = eccedenza, Negativo = perdita. Confrontato direttamente con soglie in stessa scala.
  var inv=0;
  if(cn.iv!==undefined&&cn.iv!==null){
    inv=cn.iv; // valore grezzo dal file: 0.00558 = 0.558% di eccedenza, -0.00254 = 0.254% di perdita
  } else {
    var stFat=cn.sc!==undefined?cn.sc:0;
    if(stFat>0&&cn.es!==undefined&&cn.es!==0){inv=-(Math.abs(cn.es)/stFat);}
  }

  // KPI % raggiungimento con target seasonal
  // SY: consuntivo SY vs target SY seasonal
  var sy_pct=0;
  if(seas_sy>0&&cn.sy!==undefined){sy_pct=(cn.sy/seas_sy)*100;}
  // SR (Subscription Rate): usa cn.nf (subscription rate consuntivo)
  var sr_pct=0;
  if(seas_pr>0&&cn.nf!==undefined){sr_pct=(cn.nf/seas_pr)*100;}
  // SAS: raggiunto se ore medie < target ore (meno è meglio) → binarizzato 100/0
  var sas_pct=0;
  if(cn.s4!==undefined){sas_pct=cn.s4<seas_sas?100:0;}
  // ACC (Accuracy): usa cn.av (accuracy value da file inventory) se disponibile
  var acc_pct=0;
  if(cn.av!==undefined&&cn.av!==null){
    acc_pct=(cn.av/seas_acc)*100; // cn.av decimale (es. 0.945)
  } else if(seas_acc>0&&cn.nf!==undefined){
    acc_pct=(cn.nf/seas_acc)*100;
  }

  return {
    scost:scost, inv:inv,
    sy_pct:sy_pct, sr_pct:sr_pct, sas_pct:sas_pct, acc_pct:acc_pct,
    // CR per sbarramento mid-season
    cr_actual: cn.cr!==undefined&&cn.cr!==null ? cn.cr : null,
    cr_target: stg.cr!==undefined&&stg.cr!==null ? stg.cr : null,
    // Esponi anche i target usati per il rendering della lettera
    seas_to:seas_to, seas_sy:seas_sy, seas_pr:seas_pr, seas_sas:seas_sas, seas_acc:seas_acc,
    // Contributo SAS→fatturato già incluso in scost sopra — esposto per tab/lettere (unica fonte di verità)
    sasAddon:sasAddon
  };
}

// === MID-SEASON CALC ===
// Premio anticipato a metà stagione (3 mesi su 6):
// - Sbarramento: fatturato ≥ target AND CR ≥ target CR → se no: 0
// - Preventivo: max erogabile = base * 0.30 * sum(kpi pesi attivi) — senza boost
// - Consuntivo: base * 0.30 * kpi score raggiunto — senza boost
// - KPI inventario (inv / molt_inventario) ESCLUSI (m2 = 1 sempre)
// - Riduce il totale seasonal (viene detratto in calcSeasonal quando SEAS[e.m].midPaid > 0)
function calcMidSeason(e){
  if(isD(e.si)) return 0; // dept store: logica separata, no mid-season
  var rlSem=(e.rl||0)*6;
  var base=rlSem*SEAS_CFG.basePct;
  var kpiSet=seasGetKpiSet(e);
  var isP=MODE==="preventivo";

  // Sbarramento fatturato + CR
  if(!isP){
    var auto=seasAutoData(e);
    var fatOk=(auto.scost>=0); // scost = (cons/target - 1)*100 ≥ 0 → fatturato ≥ target
    var crOk=true; // default: se CR non disponibile, non blocca
    if(auto.cr_target!==null&&auto.cr_actual!==null){
      crOk=(auto.cr_actual>=auto.cr_target);
    }
    if(!fatOk||!crOk) return 0;
    // Calcola KPI score raggiunto (senza inventario, m2=1)
    var kpiScore=0;
    kpiSet.forEach(function(kdef){
      if(!seasKpiActive(kdef.k,e)) return;
      if(seasIsKpiAchieved(kdef,auto)) kpiScore+=kdef.weight;
    });
    return Math.round(base*0.30*kpiScore*100)/100;
  } else {
    // Preventivo: mostra il massimo erogabile (tutti i KPI a target, nessun boost)
    var kpiScoreMax=0;
    kpiSet.forEach(function(kdef){
      if(!seasKpiActive(kdef.k,e)) return;
      kpiScoreMax+=kdef.weight;
    });
    return Math.round(base*0.30*kpiScoreMax*100)/100;
  }
}


function seasGetKpiSet(e){
  var sf=STORE_FLAGS[String(e.si)]||{};
  if(sf.noSas) return SEAS_CFG.kpi_nosas;
  if(sf.noAcc) return SEAS_CFG.kpi_noacc;
  return SEAS_CFG.kpi;
}
function seasKpiActive(kdefKey, e){
  // Returns false if this KPI is disabled for this store
  var sf=STORE_FLAGS[String(e.si)]||{};
  if(kdefKey==="sas" && sf.noSas) return false;
  if(kdefKey==="acc" && sf.noAcc) return false;
  return true;
}
// Centralised seasonal KPI achievement logic:
// SAS: lower is better (result must be < sasMaxHours → already binarised to 100/0 in seasAutoData)
// All other KPIs: result >= target (pct >= threshold*100)
function seasIsKpiAchieved(kdef, auto){
  var pct=(auto[kdef.k+"_pct"]||0);
  // For SAS, sas_pct is already binarised to 100 (achieved) or 0 (not achieved)
  // so the standard >= check works correctly. No special case needed here.
  return pct>=kdef.threshold*100;
}
function calcSeasonal(e){
  if(isD(e.si)){
    var bdg6=Math.round((e.ib||0)*6*100)/100;
    return Math.round((bdg6+bdg6*0.5)*100)/100;
  }
  var rlSem=(e.rl||0)*6;
  var base=rlSem*SEAS_CFG.basePct;
  var kpiScore=0;
  var kpiSet=seasGetKpiSet(e);
  var isP=MODE==="preventivo";
  var auto=isP?null:seasAutoData(e);
  kpiSet.forEach(function(kdef){
    if(!seasKpiActive(kdef.k, e)) return;
    var achieved=isP||seasIsKpiAchieved(kdef,auto);
    kpiScore+=kdef.weight*(achieved?1:0);
  });
  var scost=isP?3.01:(auto?auto.scost:0);
  var inv=isP?0:(auto?auto.inv:0);
  var m1=seasMoltTurnover(scost);
  var m2=seasMoltInventarioV(inv);
  var gross=Math.round(base*kpiScore*m1*m2*100)/100;
  // Deduce il mid-season già erogato (se in consuntivo e midPaid registrato)
  var midPaid=(!isP&&SEAS[e.m]&&SEAS[e.m].midPaid>0)?SEAS[e.m].midPaid:0;
  return Math.max(0, Math.round((gross-midPaid)*100)/100);
}

function seasKpiLabel(k){
  for(var i=0;i<SEAS_CFG.kpi.length;i++){if(SEAS_CFG.kpi[i].k===k)return SEAS_CFG.kpi[i].label;}
  return k;
}
