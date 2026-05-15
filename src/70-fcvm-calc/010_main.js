function calcFcVmPremio(matr){
  var emp=FC_EMP[matr];
  if(!emp)return{premio:0,premio_eur:0,esito:"no_data",stores:[],totTarget:0,totCons:0,pct:0,syOk:false,totSyCy:0,totSyLy:0};
  var isCons=MODE==="consuntivo";
  var stores=[];
  Object.keys(FC_MAP).forEach(function(sid){
    var mp=FC_MAP[sid];
    if(mp.tipo==='BDG')return; // negozi BDG non entrano nel calcolo area
    var fcArr=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);
    var vmArr=Array.isArray(mp.vm)?mp.vm:(mp.vm?[mp.vm]:[]);
    if(emp.j==="FC"&&fcArr.indexOf(matr)>=0)stores.push(sid);
    if(emp.j==="VM"&&vmArr.indexOf(matr)>=0)stores.push(sid);
  });
  if(!stores.length&&!(emp.bdg_stores&&emp.bdg_stores.length))return{premio:0,premio_eur:0,esito:"no_stores",stores:[],totTarget:0,totCons:0,pct:0,syOk:false,totSyCy:0,totSyLy:0};
  var totTarget=0,totCons=0,detail=[];
  // Aggregati SY LY (da FC_SYLY)
  var totSalesLy=0,totFootfallLy=0,hasSyLy=false;
  // Aggregati SY CY (da FC_RESULTS in consuntivo)
  var totSalesCy=0,totFootfallCy=0,hasSyCy=false;
  stores.forEach(function(sid){
    var tg=FC_TARGETS[sid]||{};
    var cn=isCons?(FC_RESULTS[sid]||{}):{};
    var ly=FC_SYLY[sid]||{};
    var flg=FC_STORE_FLAGS[sid]||{};
    var to=(!flg.excl_fatt)?(tg.to_eur||0):0;
    var sc=(!flg.excl_fatt)?(isCons?(cn.sc_eur||0):to):0;
    totTarget+=to; totCons+=sc;
    // SY LY aggregata (esclusa se excl_sy)
    if(!flg.excl_sy&&ly.sales_ly!=null&&ly.footfall_ly!=null&&ly.footfall_ly>0){
      totSalesLy+=ly.sales_ly; totFootfallLy+=ly.footfall_ly; hasSyLy=true;
    }
    // SY CY aggregata (esclusa se excl_sy)
    if(!flg.excl_sy&&isCons&&cn.sc_eur!=null&&cn.footfall_cy!=null&&cn.footfall_cy>0){
      totSalesCy+=cn.sc_eur; totFootfallCy+=cn.footfall_cy; hasSyCy=true;
    }
    detail.push({sid:sid,to:to,sc:sc,exclFatt:!!flg.excl_fatt,exclSy:!!flg.excl_sy});
  });
  // ── Esubero mese precedente (area) ───────────────────────────────────────
  var totEsubero=0;
  if(isCons&&Object.keys(FC_PREV_RESULTS).length){
    detail.forEach(function(d){
      var prev=FC_PREV_RESULTS[String(d.sid)]||{};
      if((prev.to_eur||0)>0)totEsubero+=Math.max(0,(prev.sc_eur||0)-(prev.to_eur||0));
    });
  }
  var totConsWithEsub=totCons+totEsubero;
  var pct=totTarget>0?totConsWithEsub/totTarget:0;
  // SY LY area = totSalesLy/totFootfallLy
  var syLyArea=hasSyLy&&totFootfallLy>0?Math.round(totSalesLy/totFootfallLy*1000)/1000:null;
  // SY CY area = totSalesCy/totFootfallCy
  var syAreaCy=hasSyCy&&totFootfallCy>0?Math.round(totSalesCy/totFootfallCy*1000)/1000:null;
  var syAreaAvg=null;
  // syOk: null se LY mancante, altrimenti confronto CY vs LY
  var syOk=null;
  if(syLyArea!=null&&syAreaCy!=null){syOk=syAreaCy>syLyArea;}
  var esito,premioLC=0;
  if(isCons){
    if(pct>=FCVM_PARAMS.soglia100){esito="full";premioLC=emp.ib;}
    else if(pct>=FCVM_PARAMS.soglia60&&syOk===true){esito="partial";premioLC=Math.round(emp.ib*FCVM_PARAMS.pct60*100)/100;}
    else if(pct>=FCVM_PARAMS.soglia60&&syOk===null){esito="partial_nosy";premioLC=0;}
    else{esito="none";premioLC=0;}
  }else{esito="preventivo";premioLC=emp.ib;}
  // ── Override manuale esito (solo consuntivo) ─────────────────────────────
  var ov=FC_OVERRIDES[matr];
  if(isCons&&ov==='100'){esito='full';premioLC=emp.ib;}
  else if(isCons&&ov==='60'){esito='partial';premioLC=Math.round(emp.ib*FCVM_PARAMS.pct60*100)/100;}
  var exRate=(emp.ex&&emp.ex!==1&&emp.ex>0)?emp.ex:getFcVmExRate(emp.cu);
  // ── Premi BDG singoli negozi ─────────────────────────────────────────────
  var bdgPrize=0,bdgPrizeEur=0,bdgDetail=[];
  if(emp.bdg_stores&&emp.bdg_stores.length){
    emp.bdg_stores.forEach(function(b){
      var tg=FC_TARGETS[b.sid]||{};
      var cn=isCons?(FC_RESULTS[b.sid]||{}):{};
      var to=tg.to_eur||0;
      var sc=isCons?(cn.sc_eur||0):0;
      var prevBdg=FC_PREV_RESULTS[String(b.sid)]||{};
      var esubBdg=isCons&&(prevBdg.to_eur||0)>0?Math.max(0,(prevBdg.sc_eur||0)-(prevBdg.to_eur||0)):0;
      var scTotBdg=sc+esubBdg;
      var earned=isCons?(scTotBdg>to&&to>0):false;
      var prize=isCons?(earned?b.ib:0):b.ib;
      var prizeEur=Math.round(prize*exRate*100)/100;
      bdgPrize+=prize; bdgPrizeEur+=prizeEur;
      bdgDetail.push({sid:b.sid,s:b.s,to:to,sc:sc,esubero:esubBdg,scTotale:scTotBdg,ib:b.ib,earned:earned,prize:prize,prizeEur:prizeEur});
    });
  }
  var premioEur=Math.round(premioLC*exRate*100)/100;
  var totalPremioLC=premioLC+bdgPrize;
  var totalPremioEur=Math.round(totalPremioLC*exRate*100)/100;
  return{premio:premioLC,premio_eur:premioEur,esito:esito,pct:pct,totTarget:totTarget,totCons:totCons,totEsubero:totEsubero,totConsWithEsub:totConsWithEsub,syOk:syOk,syLyArea:syLyArea,syAreaCy:syAreaCy,hasSyLy:hasSyLy,hasSyCy:hasSyCy,syAreaAvg:syAreaAvg,stores:detail,bdgPrize:bdgPrize,bdgPrizeEur:bdgPrizeEur,bdgDetail:bdgDetail,totalPremioLC:totalPremioLC,totalPremioEur:totalPremioEur,hasBdg:bdgDetail.length>0};
}
function getFcVmPool(){return Object.values(FC_EMP);}

function getFcVmExRate(cu){
  if(!cu||cu==='EUR')return 1;
  var ex=null;
  // Cerca in ENTE_CU
  Object.values(ENTE_CU||{}).forEach(function(v){if(v&&v.cu===cu&&v.ex)ex=v.ex;});
  if(ex&&ex!==1)return ex;
  // Cerca in VL
  Object.values(VL||{}).forEach(function(v){if(v&&v.cu===cu&&v.ex)ex=v.ex;});
  if(ex&&ex!==1)return ex;
  // Cerca in D.vl
  Object.values((D&&D.vl)||{}).forEach(function(v){if(v&&v.cu===cu&&v.ex)ex=v.ex;});
  if(ex&&ex!==1)return ex;
  // Cerca in FC_EMP (il tasso è stato salvato/sincronizzato al momento dell'import)
  Object.values(FC_EMP||{}).forEach(function(v){if(v&&v.cu===cu&&v.ex&&v.ex!==1)ex=v.ex;});
  if(ex&&ex!==1)return ex;
  // Cerca in FC_TARGETS tramite FC_MAP (tasso derivato da ratio EUR/LC del target)
  Object.keys(FC_MAP||{}).forEach(function(sid){
    if(ex&&ex!==1)return;
    var tg=FC_TARGETS[sid];if(!tg||!tg.ex||tg.ex===1)return;
    var m=FC_MAP[sid];
    var keys=(m.fc||[]).concat(m.vm||[]);
    keys.forEach(function(matr){var emp=FC_EMP[matr];if(emp&&emp.cu===cu)ex=tg.ex;});
  });
  return ex||1;
}
// Propaga i tassi di cambio derivati da FC_TARGETS a FC_EMP (chiamata dopo import target o anagrafica)
function syncFcExRates(){
  Object.keys(FC_MAP||{}).forEach(function(sid){
    var tg=FC_TARGETS[sid];if(!tg||!tg.ex||tg.ex===1)return;
    var m=FC_MAP[sid];
    var keys=(m.fc||[]).concat(m.vm||[]);
    keys.forEach(function(matr){
      var emp=FC_EMP[matr];
      if(emp&&emp.cu&&emp.cu!=='EUR'&&(emp.ex===1||!emp.ex))emp.ex=tg.ex;
    });
  });
}
