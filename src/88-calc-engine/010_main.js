// === USA CONFIG ===
var USA_STORES=D.us||[1321,1322,1323];
function isUSA(si,e){if(e&&e.cu==="USD")return true;return USA_STORES.indexOf(Number(si))>=0}
// USA_DATA rimosso: usare D.usa direttamente per evitare riferimento stale dopo reset/localStorage
// USA params per role: noTargetMult=% when target NOT hit, useStore=toggle store vs personal
var USA_P={
  "SM":{noTargetMult:0.4,targetMult:1.0,useStore:true},"VSM":{noTargetMult:0.4,targetMult:1.0,useStore:true},
  "SSAP":{noTargetMult:0.4,targetMult:1.0,useStore:false},"SSA":{noTargetMult:0.4,targetMult:1.0,useStore:false},
  "SA":{noTargetMult:0.4,targetMult:1.0,useStore:false},"JSA":{noTargetMult:0.4,targetMult:1.0,useStore:false},
  "SCS":{noTargetMult:0.4,targetMult:1.0,useStore:false},"STK":{noTargetMult:0.4,targetMult:1.0,useStore:true}
};

// calcUSA: commission% from anagrafica (ud.cm). Base from role toggle (store or personal).
// Target hit -> 100% commission. Not hit -> noTargetMult%. No esubero for USA.
function calcUSA(e){
  var ud=(D.usa||{})[e.m];if(!ud)return 0;
  var sid=String(e.si),tg=D.t[sid],cn=D.c[sid];
  var cm=ud.cm||0;

  var storeHit=false;
  if(MODE==="preventivo"){storeHit=true}
  else if(tg&&cn){var _esP=sasNewActive()?(cn.esP||0):0;var pct=tg.to>0?(cn.sc+_esP)/tg.to:0;storeHit=pct>=PARAMS.bdg100}
  else{storeHit=ud.sb===1}
  if(MODE==="consuntivo"&&e.ov_b100==="SI")storeHit=true;

  var job=e.f||e.j||"";
  var rp=USA_P[job]||{noTargetMult:0.4,targetMult:1.0,useStore:false};
  // USA Dept Stores: forza store sales a prescindere dal job title
  var usaDept=ud.isDept||(STORE_FLAGS[String(e.si)]&&STORE_FLAGS[String(e.si)].usaDept);
  var useStoreSales=rp.useStore||usaDept;

  var base;
  if(useStoreSales){
    base=MODE==="preventivo"?(tg?tg.to:ud.st||0):(cn?cn.sc:ud.st||0);
  }else{
    base=ud.ps||0;
    if(MODE==="preventivo"&&base===0){base=0} // preventivo USA: non stimiamo
  }

  var mult=storeHit?rp.targetMult:rp.noTargetMult;
  return Math.round(base*cm*mult*100)/100;
}

// === VISUAL IN STORE LIST ===
// VL: matricola -> amount. Employee gets this amount if their store hits turnover target.
var VL=D.vl||{};// loaded from JSON, editable

var KM={"rb":"BDG","rd":"Digital","rs":"SY","rp":"Privilege","rsa":"SAS","rdc":"DCC","rcs":"CS","ra":"Articoli","vi":"Visual","pq":"QTY Dept"};
function isOn(j,k){
  var kn=KM[k];if(!kn)return true;
  // Regole SAS da luglio 2026 (mensile + FC+VM): il vecchio premio SAS
  // individuale è ritirato per tutti; agli SCS si accende SY per compensare.
  // Override basato su data → robusto rispetto a TC salvato in sessione.
  if(sasNewActive()){
    if(kn==="SAS")return false;
    if(kn==="SY"&&j&&j.indexOf("SCS")>=0&&j.indexOf("NO SY")<0)return true;
  }
  // Direct lookup
  if(TC[j])return TC[j][kn]!==false;
  // Legacy fallback: "SM VSM" -> try "SM" then "VSM"
  if(j&&j.indexOf("SM VSM")>=0){
    var alt=j.replace("SM VSM","SM");
    if(TC[alt])return TC[alt][kn]!==false;
  }
  return true;
}
function sickMult(ml){ml=ml||0;if(MODE==="preventivo")return 1;if(ml>=SICK_0)return 0;if(ml>=SICK_50)return 0.5;return 1}
// === SAS → fatturato (mensile) ============================================
// Info SAS riconosciuto/riserva per un negozio. In LC (come fatturato e target).
// Quando sasNewActive è false (o negozio USA) ritorna il numeratore classico.
function storeSasInfo(sid){
  var tg=D.t[sid]||{},cn=D.c[sid]||{};
  var to=tg.to||0,base=(cn.sc||0)+(cn.es||0);
  if(!sasNewActive()||USA_STORES.indexOf(Number(sid))>=0){
    return {active:false,base:base,to:to,recognized:0,reserveIn:0,avail:0,used:0,reserveOut:0,gap:Math.max(0,to-base),num:base,pct:to>0?base/to:0,pctMatrix:null,acc:cn.sa,vel:cn.vel,sasv:cn.sasv||0};
  }
  var recognized=sasRecognizedValue(cn.sa,cn.vel,cn.sasv||0);
  var r=sasReserveCalc(base,to,recognized,cn.sasr||0);
  return {active:true,base:base,to:to,recognized:recognized,reserveIn:cn.sasr||0,avail:r.avail,used:r.used,reserveOut:r.reserveOut,gap:r.gap,num:r.num,pct:to>0?r.num/to:0,pctMatrix:sasMatrixPct(cn.sa,cn.vel),acc:cn.sa,vel:cn.vel,sasv:cn.sasv||0};
}
// % verso target, SAS incluso (cap 100%). Unico punto di verità per il BDG mensile.
function storePctOf(sid){return storeSasInfo(sid).pct;}

// RECALC ENGINE
function getVal(e,kpiKey){
  if(isUSA(e.si,e))return 0; // USA employees use calcUSA(), not individual KPI
  var sid=String(e.si),tg=D.t[sid]||{},cn=D.c[sid]||{},v=D.v[e.m]||{},dp=isD(e.si);
  if(MODE==="preventivo"){var _rl=e.rl||e.ib||0;switch(kpiKey){
    case "rb":return e.ib;case "rd":return Math.round(e.ib*PARAMS.digPct*100)/100;
    case "rs":return Math.round(_rl*PARAMS.syPct*100)/100;case "rp":return Math.round(_rl*PARAMS.privPct*100)/100;
    case "rsa":return PARAMS.sasMax;case "rdc":return PARAMS.dccMax;case "rcs":return 0;case "ra":return 0;case "vi":{var _vle=VL[e.m];if(!_vle)return 0;if(Array.isArray(_vle)){var _vs=0;_vle.forEach(function(x){_vs+=x.amt||0;});return _vs;}return Number(_vle)||0;}
    case "pq":return dp?Math.round(e.ib*PARAMS.qtyPct*100)/100:0;default:return 0}}
  if(!tg.to&&!cn.sc)return 0;var storePct=storePctOf(sid);
  switch(kpiKey){
    case "rb":if(e.ov_b100==="SI")return e.ib;if(e.ov_rid==="SI")return Math.round(e.ib*PARAMS.bdg60mult*100)/100;if(storePct>=PARAMS.bdg100)return e.ib;if(storePct>=PARAMS.bdg60){if(dp){if((tg.qt||0)>0&&(cn.qc||0)>=(tg.qt||0))return Math.round(e.ib*PARAMS.bdg60mult*100)/100}else{var syLyR=MONTHLY_SYLY[sid]||0;var syUp=(cn.sy||0)>syLyR&&syLyR>0;if(syUp)return Math.round(e.ib*PARAMS.bdg60mult*100)/100}}return 0;
    case "rd":if(storePct>=PARAMS.bdg100&&(cn.pd||0)>=getDigMin(e.si))return Math.round(e.ib*PARAMS.digPct*100)/100;return 0;
    case "rs":if((tg.sy||0)>0&&(cn.sy||0)>=(tg.sy||0)*PARAMS.kpi100){var _rl2=e.rl||e.ib||0;return Math.round(_rl2*PARAMS.syPct*100)/100}return 0;
    case "rp":if((tg.pr||0)>0&&(cn.nf||0)>=(tg.pr||0)*PARAMS.kpi100){var _rl3=e.rl||e.ib||0;return Math.round(_rl3*PARAMS.privPct*100)/100}return 0;
    case "rsa":if(sasZeroByAcc(e))return 0;return Math.min((cn.s4||0)*PARAMS.sasRate,PARAMS.sasMax);
    case "rdc":return Math.round(Math.min((cn.dv||0)*PARAMS.dccRate,PARAMS.dccMax)*100)/100;
    case "rcs":return e.rcs||0;case "ra":if(!PARAMS.artEnabled||isUSA(e.si,e))return 0;if((e.ra||0)>0)return e.ra;var ac=cn.ac||0;return ac>0?Math.round(e.ib*PARAMS.artPct*ac*100)/100:0;
    case "vi":{var _vle2=VL[e.m];if(!_vle2)return 0;
      if(!Array.isArray(_vle2)){
        var _vla=Number(_vle2)||0;if(_vla<=0)return 0;
        if(e.ov_b100==="SI")return _vla;
        if(e.ov_rid==="SI")return Math.round(_vla*PARAMS.bdg60mult*100)/100;
        if(storePct>=PARAMS.bdg100)return _vla;
        if(isRidottoStore(sid))return Math.round(_vla*PARAMS.bdg60mult*100)/100;
        return 0;
      }
      var _vtot=0;var _nEmpty=_vle2.filter(function(x){return !String(x.sid||'').trim();}).length;
      _vle2.forEach(function(entry){
        var _esid=String(entry.sid||'').trim();if(_esid){var _pi=parseInt(_esid);if(!isNaN(_pi))_esid=String(_pi);}
        var _amt=entry.amt||0;if(_amt<=0)return;
        if(e.ov_b100==="SI"){_vtot+=_amt;return;}
        if(e.ov_rid==="SI"){_vtot+=Math.round(_amt*PARAMS.bdg60mult*100)/100;return;}
        if(!_esid&&_nEmpty!==1)return; // store ambiguo, non determinabile → 0 (comportamento invariato)
        var _ridSid=_esid||sid;
        var _spct=storePctOf(_ridSid);
        if(_spct>=PARAMS.bdg100){_vtot+=_amt;}
        else if(isRidottoStore(_ridSid)){_vtot+=Math.round(_amt*PARAMS.bdg60mult*100)/100;}
      });
      return _vtot;}
    case "pq":if((tg.qt||0)>0&&(cn.qc||0)>=(tg.qt||0)*PARAMS.kpi100)return Math.round(e.ib*PARAMS.qtyPct*100)/100;return 0;
    default:return 0}
}
// isRidottoStore: come isRidotto(e) ma per un negozio specifico (sid) invece che per il negozio
// "di casa" del dipendente — serve per premi multi-negozio come Visual In Store, dove ogni riga
// (entry) può appartenere a un negozio diverso e va valutata con i propri dati di target/consuntivo.
function isRidottoStore(sid){
  if(MODE!=="consuntivo")return false;
  var tg=D.t[sid]||{},cn=D.c[sid]||{},dp=isD(sid);
  if(!tg.to)return false;
  var storePct=storePctOf(sid);
  if(storePct>=PARAMS.bdg100||storePct<PARAMS.bdg60)return false;
  if(dp)return (tg.qt||0)>0&&(cn.qc||0)>=(tg.qt||0);
  var syLy=MONTHLY_SYLY[sid]||0;
  return (cn.sy||0)>syLy&&syLy>0;
}
// isRidotto: true se l'employee riceve il premio BDG moltiplicato ridotto (60%)
function isRidotto(e){
  if(isUSA(e.si,e))return false;
  return isRidottoStore(String(e.si));
}
// calcE: normal calc + aggiunte. Returns 0 if premio sospeso in consuntivo
function calcE(e){if(MODE==="consuntivo"&&e.ps==="SI")return 0;if(isUSA(e.si,e)){if(MODE==="preventivo")return 0;return calcUSA(e)+aggTotal(e.m);}var t=0,sm=sickMult(e.ml);IT.forEach(function(it){if(it.k==="vi")return;if(it.k==="ra"&&!PARAMS.artEnabled)return;if(isOn(e.j,it.k))t+=getVal(e,it.k)});t+=getVal(e,"vi");var result=Math.round(t*sm*100)/100+aggTotal(e.m);if(MODE==="consuntivo"&&e.ov_wg==="SI"&&isOn(e.j,"rb"))result+=Math.round(e.ib*(PARAMS.workgamePct||0)*100)/100;return result}
function toEUR(val,e){return(val||0)*(e.ex||1)}
function calcEUR(e){return toEUR(calcE(e),e)}
function gRC(j,f){if(f==="STK"||j==="STK"||(j&&(j.indexOf("STOCK")>=0||j.indexOf("ATOCK")>=0)))return"Stock Associate/Runner";if(f==="SM"||(j&&j.indexOf("SM")>=0&&j.indexOf("VSM")<0))return"Store Manager";if(f==="VSM"||(j&&j.indexOf("VSM")>=0))return"Vice Store Manager";if(f==="SSA"||f==="SSAP")return"Senior Sales Advisor";if(f==="JSA")return"Junior Sales Advisor";if(j&&j.indexOf("SCS")>=0)return"Addetto Cassa";return"Sales Advisor"}

