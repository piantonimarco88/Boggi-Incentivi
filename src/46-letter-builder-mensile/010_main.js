function buildLetterUSA(e){
  var cu=e.cu||"USD",sid=String(e.si),tg=D.t[sid]||{},cn=D.c[sid]||{};
  var isP=MODE==="preventivo";
  var ud=(D.usa||{})[e.m]||{};
  var cm=ud.cm||0;
  var job=e.f||e.j||"";
  var rp=USA_P[job]||{noTargetMult:0.4,targetMult:1.0,useStore:false};
  var usaDept=ud.isDept||(STORE_FLAGS[sid]&&STORE_FLAGS[sid].usaDept);
  var useStoreSales=rp.useStore||usaDept;
  var tPct=(rp.targetMult*100).toFixed(0),ntPct=(rp.noTargetMult*100).toFixed(0);
  var baseType=useStoreSales?"STORE SALES":"PERSONAL SALES";
  var lang="INGLESE"; // USA always English
  var gr="Hi";
  var mN=getMonthName(lang);

  var h='<div class="lt"><div class="lt-top"><div class="lt-logo">'+getBrandLogoImg(e.si)+'</div>';
  h+='<div style="text-align:right"><div class="lt-date">'+mN+" "+CFG_YEAR+"</div>";
  if(isP)h+='<div style="font-size:9px;color:#c9a96e;font-weight:700">FORECAST</div>';
  h+='</div></div><div class="lt-body"><div class="lt-greeting">'+gr+" "+esc(e.n.toUpperCase())+',</div>';

  // Info grid — NO salary for USA
  h+='<div class="lt-info">';
  [["SERIAL NUMBER",e.m],["MONTH YEAR",(mN+" "+CFG_YEAR).toUpperCase()],["STORE",e.s.toUpperCase()],["NAME",e.n.toUpperCase()],["SURNAME",e.c.toUpperCase()],["FUNCTION",job.toUpperCase()]].forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(String(p[1]))+"</div></div>"});
  h+="</div>";

  if(isP){
    // PREVENTIVO USA: logica + store sales target (senza cifre individuali)
    h+='<div style="background:#fff3cd;border:1px solid #c9a96e;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:11px;color:#856404"><b>COMMISSION INCENTIVE PLAN — '+mN.toUpperCase()+' '+CFG_YEAR+'</b></div>';
    h+='<div class="lt-kpi">';
    h+='<div class="lt-kpi-head"><span>INCENTIVE STRUCTURE</span><span style="text-align:right">DETAILS</span></div>';
    h+='<div class="lt-kpi-row"><span>Commission Base</span><span style="text-align:right;font-weight:700">'+(cm*100).toFixed(2)+'% of '+baseType+'</span></div>';
    h+='<div class="lt-kpi-row" style="background:#faf9f7"><span>Store on Target</span><span style="text-align:right;font-weight:700;color:#2d7a3a">'+tPct+'% multiplier</span></div>';
    h+='<div class="lt-kpi-row"><span>Store below Target</span><span style="text-align:right;font-weight:700;color:#cf5b5b">'+ntPct+'% multiplier</span></div>';

    // Store sales target
    var storeTo=tg.to||0;
    if(storeTo>0)h+='<div class="lt-kpi-row"><span>Store Sales Target</span><span style="text-align:right;font-weight:700;color:#2c2925">'+fc(storeTo,cu)+'</span></div>';
    h+='</div>';
    h+='<div style="margin-top:14px;padding:12px 16px;background:#f5f4f1;border-radius:6px;font-size:10px;color:#6b6560">Prize calculated at month-end on actual results. No fixed salary component included in this incentive.</div>';
  } else {
    // CONSUNTIVO USA (esubero mese precedente incluso nel check target da luglio 2026)
    var storeHit=false;
    var storePct=tg.to>0?((cn.sc||0)+(sasNewActive()?cn.esP||0:0))/tg.to:0;
    if(tg.to>0&&cn.sc)storeHit=storePct>=PARAMS.bdg100;
    else storeHit=ud.sb===1;
    if(e.ov_b100==="SI")storeHit=true;
    var base=useStoreSales?(cn.sc||0):(ud.ps||0);
    var mult=storeHit?rp.targetMult:rp.noTargetMult;
    var prize=Math.round(base*cm*mult*100)/100;

    h+='<div class="lt-kpi">';
    h+='<div class="lt-kpi-head"><span>COMMISSION INCENTIVE</span><span style="text-align:right">VALUE</span></div>';
    h+='<div class="lt-kpi-row"><span>Commission Rate</span><span style="text-align:right;font-weight:700">'+(cm*100).toFixed(2)+'%</span></div>';
    // Store sales target se disponibile
    var storeTo=tg.to||0;
    if(storeTo>0)h+='<div class="lt-kpi-row" style="background:#f5f4f1"><span>Store Sales Target</span><span style="text-align:right;font-weight:600">'+fc(storeTo,cu)+'</span></div>';
    h+='<div class="lt-kpi-row" style="background:#faf9f7"><span>'+baseType+' (Actual)</span><span style="text-align:right;font-weight:700">'+fc(base,cu)+'</span></div>';
    if((cn.esP||0)>0)h+='<div class="lt-kpi-row" style="background:#fff8ee"><span>Surplus Prev. Month</span><span style="text-align:right;font-weight:700;color:#a07d2c">'+fc(cn.esP,cu)+'</span></div>';
    // Vendite personali: mostra solo per chi ha premio su personal sales (non useStoreSales)
    if(!useStoreSales&&(ud.ps||0)>0)h+='<div class="lt-kpi-row"><span>Personal Sales</span><span style="text-align:right;font-weight:700">'+fc(ud.ps,cu)+'</span></div>';
    h+='<div class="lt-kpi-row"><span>Store Performance</span><span style="text-align:right;font-weight:700;color:'+(storeHit?"#2d7a3a":"#cf5b5b")+'">'+(storeHit?"ON TARGET ✓":"BELOW TARGET ✗")+(tg.to>0?' ('+Math.round(storePct*100)+'% of target, incl. surplus)':'')+'</span></div>';
    h+='<div class="lt-kpi-row" style="background:#faf9f7"><span>Multiplier Applied</span><span style="text-align:right;font-weight:700">'+(mult*100).toFixed(0)+'% ('+( storeHit?tPct+" — target hit":ntPct+" — target not hit")+')</span></div>';
    h+='</div>';

    var at=aggTotal(e.m);
    if(at>0){
      h+='<div class="lt-kpi" style="margin-top:10px"><div class="lt-kpi-head"><span>ADJUSTMENTS</span><span style="text-align:right">VALUE</span></div>';
      var a=AGG[e.m];AGG_KEYS.forEach(function(ak){if(a[ak.k]>0)h+='<div class="lt-kpi-row"><span>'+ak.l+'</span><span style="text-align:right">'+fc(a[ak.k],cu)+'</span></div>';});
      h+='</div>';
    }

    h+='</div>';
    h+='<div class="lt-total"><div><div class="lt-total-label">COMMISSION EARNED</div></div><div class="lt-total-val">'+fc(prize+(at||0),cu)+'</div></div>';
  }

  h+='<div class="lt-footer"><div style="white-space:pre-wrap">'+esc(getDiscl(e)||DISCL["INGLESE"])+'</div></div></div>';
  return h;
}

// === Blocco SAS per le lettere (mensile + FC+VM), da Luglio 2026 =============
// info: {acc, vel, pctMatrix, recognized, used, reserveIn, reserveOut, sasv} oppure null.
// Mostra la matrice (logica) in prev+cons; il risultato puntuale solo in cons.
var _SAS_LT={
  ITALIANO:{title:"VALORE SAS → FATTURATO",logic:"Quota del valore SAS del negozio riconosciuta nel fatturato verso il target (in base ad accettazione e velocità). Fino al 100%; l'avanzo è riserva riportata al mese successivo.",vel:"Velocità",velLabel:"% gestiti entro 4h",acc:"Accettazione",recPct:"% riconosciuta",sasVal:"Valore SAS negozio",recVal:"Valore SAS riconosciuto",applied:"Applicato al fatturato",resIn:"Riserva mese prec.",reserve:"Riserva riportata",nodata:"Dato SAS non disponibile per questo negozio.",towardTarget:"Fatturato + SAS verso target",reached:"target raggiunto",below:"sotto target",withoutSas:"Senza SAS",logicArea:"Quota del valore SAS dell'area riconosciuta nel fatturato verso il target (in base ad accettazione e velocità aggregate dell'area). Fino al 100%; l'avanzo è riserva riportata al mese successivo.",sasValArea:"Valore SAS area",nodataArea:"Dato SAS non disponibile per quest'area."},
  INGLESE:{title:"SAS VALUE → TURNOVER",logic:"Share of the store's SAS value recognised toward the turnover target (based on acceptance and speed). Up to 100%; the surplus is a reserve carried to next month.",vel:"Speed",velLabel:"% handled within 4h",acc:"Acceptance",recPct:"Recognised %",sasVal:"Store SAS value",recVal:"Recognised SAS value",applied:"Applied to turnover",resIn:"Previous month reserve",reserve:"Reserve carried over",nodata:"SAS data not available for this store.",towardTarget:"Turnover + SAS toward target",reached:"target reached",below:"below target",withoutSas:"Without SAS",logicArea:"Share of the area's SAS value recognised toward the turnover target (based on the area's aggregate acceptance and speed). Up to 100%; the surplus is a reserve carried to next month.",sasValArea:"Area SAS value",nodataArea:"SAS data not available for this area."},
  FRANCESE:{title:"VALEUR SAS → CA",logic:"Part de la valeur SAS du magasin reconnue dans le CA vers l'objectif (selon acceptation et rapidité). Jusqu'à 100% ; l'excédent est une réserve reportée au mois suivant.",vel:"Rapidité",velLabel:"% traités sous 4h",acc:"Acceptation",recPct:"% reconnue",sasVal:"Valeur SAS magasin",recVal:"Valeur SAS reconnue",applied:"Appliqué au CA",resIn:"Réserve mois préc.",reserve:"Réserve reportée",nodata:"Donnée SAS non disponible pour ce magasin.",towardTarget:"CA + SAS vers l'objectif",reached:"objectif atteint",below:"sous l'objectif",withoutSas:"Sans SAS",logicArea:"Part de la valeur SAS de la zone reconnue dans le CA vers l'objectif (selon l'acceptation et la rapidité agrégées de la zone). Jusqu'à 100% ; l'excédent est une réserve reportée au mois suivant.",sasValArea:"Valeur SAS zone",nodataArea:"Donnée SAS non disponible pour cette zone."},
  TEDESCO:{title:"SAS-WERT → UMSATZ",logic:"Anteil des SAS-Werts des Stores, der auf das Umsatzziel angerechnet wird (nach Annahme und Geschwindigkeit). Bis 100%; der Überschuss ist eine in den Folgemonat übertragene Reserve.",vel:"Geschwindigkeit",velLabel:"% innerhalb 4h bearbeitet",acc:"Annahme",recPct:"Anerkannt %",sasVal:"SAS-Wert Store",recVal:"Anerkannter SAS-Wert",applied:"Auf Umsatz angerechnet",resIn:"Reserve Vormonat",reserve:"Übertragene Reserve",nodata:"SAS-Daten für diesen Store nicht verfügbar.",towardTarget:"Umsatz + SAS zum Ziel",reached:"Ziel erreicht",below:"unter Ziel",withoutSas:"Ohne SAS",logicArea:"Anteil des SAS-Werts des Bereichs, der auf das Umsatzziel angerechnet wird (nach aggregierter Annahme und Geschwindigkeit des Bereichs). Bis 100%; der Überschuss ist eine in den Folgemonat übertragene Reserve.",sasValArea:"SAS-Wert Bereich",nodataArea:"SAS-Daten für diesen Bereich nicht verfügbar."},
  SPAGNOLO:{title:"VALOR SAS → FACTURACIÓN",logic:"Parte del valor SAS de la tienda reconocida en la facturación hacia el objetivo (según aceptación y velocidad). Hasta el 100%; el excedente es reserva trasladada al mes siguiente.",vel:"Velocidad",velLabel:"% gestionados en 4h",acc:"Aceptación",recPct:"% reconocido",sasVal:"Valor SAS tienda",recVal:"Valor SAS reconocido",applied:"Aplicado a facturación",resIn:"Reserva mes ant.",reserve:"Reserva trasladada",nodata:"Dato SAS no disponible para esta tienda.",towardTarget:"Facturación + SAS hacia objetivo",reached:"objetivo alcanzado",below:"bajo objetivo",withoutSas:"Sin SAS",logicArea:"Parte del valor SAS de la zona reconocida en la facturación hacia el objetivo (según aceptación y velocidad agregadas de la zona). Hasta el 100%; el excedente es reserva trasladada al mes siguiente.",sasValArea:"Valor SAS zona",nodataArea:"Dato SAS no disponible para esta zona."}
};
function _sasBandLbl(b,k){return k===0?'<'+Math.round(b[0]*100)+'%':(k===3?'≥'+Math.round(b[2]*100)+'%':Math.round(b[k-1]*100)+'-'+Math.round(b[k]*100)+'%');}
function sasLetterBlock(lang,info,isP,cu,thPct,isArea){
  if(typeof sasNewActive!=='function'||!sasNewActive())return '';
  if(info&&info.active===false)return ''; // negozio USA: niente SAS
  var T=_SAS_LT[lang]||_SAS_LT.INGLESE;
  var _logicTxt=isArea?(T.logicArea||T.logic):T.logic;
  var _sasValLbl=isArea?(T.sasValArea||T.sasVal):T.sasVal;
  var _nodataTxt=isArea?(T.nodataArea||T.nodata):T.nodata;
  var ab=SAS_MATRIX.accBands,vb=SAS_MATRIX.velBands;
  var hasData=info&&info.acc!=null&&info.vel!=null;
  var aIdx=hasData?sasAccBandIdx(info.acc):-1,vIdx=hasData?sasVelBandIdx(info.vel):-1;
  var h='<div style="margin-top:10px;padding:11px 14px;background:#faf8f4;border:1px solid #ece7df;border-radius:7px">';
  h+='<div style="font-size:12px;font-weight:700;color:#a07d2c;margin-bottom:4px">'+esc(T.title)+'</div>';
  h+='<div style="font-size:10px;color:#8a8680;line-height:1.45;margin-bottom:8px">'+esc(_logicTxt)+'</div>';
  h+='<div style="font-size:10px;font-weight:700;color:#8a8680;text-align:center;margin-bottom:3px">'+esc(T.vel)+' — '+esc(T.velLabel)+' →</div>';
  h+='<table style="border-collapse:collapse;font-size:11px;margin:0 auto '+(isP?'0':'9px')+'"><thead><tr><th style="padding:3px 9px;color:#a09a92;text-align:right;font-weight:700">↓ '+esc(T.acc)+'</th>';
  for(var c=0;c<4;c++)h+='<th style="padding:3px 11px;color:#8a8680;font-weight:700">'+_sasBandLbl(vb,c)+'</th>';
  h+='</tr></thead><tbody>';
  [3,2,1,0].forEach(function(ai){
    h+='<tr><td style="padding:3px 9px;color:#6b6560;font-weight:700;text-align:right">'+_sasBandLbl(ab,ai)+'</td>';
    for(var c2=0;c2<4;c2++){var hit=(!isP&&ai===aIdx&&c2===vIdx);h+='<td style="padding:3px 11px;text-align:center;'+(hit?'background:#c9a96e;color:#fff;font-weight:700;border-radius:3px':'color:#9a958d')+'">'+Math.round(SAS_MATRIX.grid[ai][c2]*100)+'</td>';}
    h+='</tr>';
  });
  h+='</tbody></table>';
  if(!isP){
    if(!hasData||info.pctMatrix==null){h+='<div style="font-size:10.5px;color:#a09a92;font-style:italic">'+esc(_nodataTxt)+'</div>';}
    else{
      var row=function(l,v){return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#8a8680">'+esc(l)+'</span><span style="font-weight:600;color:#2c2925">'+v+'</span></div>';};
      // separatore migliaia manuale: toLocaleString("it-IT") nel WebView2 non raggruppa i numeri sotto le 5 cifre
      var eur=function(v){return '<span class="lt-row-cur">'+cu+'</span>'+Math.round(v||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,".");};
      h+=row(T.acc,Math.round(info.acc*100)+'% ('+_sasBandLbl(ab,aIdx)+')');
      h+=row(T.vel,Math.round(info.vel*100)+'% ('+_sasBandLbl(vb,vIdx)+')');
      h+=row(T.recPct,Math.round(info.pctMatrix*100)+'%');
      h+=row(_sasValLbl,eur(info.sasv));
      h+=row(T.recVal,eur(info.recognized));
      h+=row(T.applied,eur(info.used));
      if((info.reserveIn||0)>0)h+=row(T.resIn,eur(info.reserveIn));
      h+=row(T.reserve,eur(info.reserveOut));
      // Riassunto: fatturato + SAS verso target, esito, e confronto senza SAS
      if(info.to>0){
        var _reached=info.pct>=(thPct||PARAMS.bdg100),_pctWo=info.base/info.to;
        h+='<div style="border-top:1px dashed #e0d9cd;margin-top:6px;padding-top:5px">';
        h+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#8a8680;font-weight:600">'+esc(T.towardTarget)+'</span><span style="font-weight:700;color:#2c2925">'+eur(info.num)+' / '+eur(info.to)+'</span></div>';
        h+='<div style="font-size:10.5px;font-weight:700;color:'+(_reached?'#2d7a3a':'#a07d2c')+'">'+(info.pct*100).toFixed(1)+'% — '+esc(_reached?T.reached:T.below)+(_reached?' ✓':'')+'</div>';
        if((info.used||0)>0)h+='<div style="font-size:10px;color:#a09a92;font-style:italic;margin-top:1px">'+esc(T.withoutSas)+': '+(_pctWo*100).toFixed(1)+'% ('+eur(info.base)+')</div>';
        h+='</div>';
      }
    }
  }
  h+='</div>';
  return h;
}

function buildLetter(e){
  var cu=e.cu||"EUR",sid=String(e.si),tg=D.t[sid]||{},cn=D.c[sid]||{},tc=calcE(e),sm=sickMult(e.ml),dp=isD(e.si);
  var _rlLt=e.rl||e.ib||0;var pctSal=_rlLt>0?((tc/_rlLt)*100).toFixed(2):"0";var lang=trLang(e);
  var mN=getMonthName(lang);
  var gr=({"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"})[lang]||"Hi";
  var _ssiL=(typeof storeSasInfo==='function')?storeSasInfo(String(e.si)):null;
  var isP=MODE==="preventivo",pctStore=(_ssiL&&_ssiL.active&&tg.to>0)?(_ssiL.pct*100).toFixed(1):(tg.to>0&&cn.sc?((cn.sc+(cn.es||0))/tg.to*100).toFixed(1):"100.0"),surplus=(cn.es||0);
  var mtL=({"ITALIANO":"IT","INGLESE":"EN","FRANCESE":"FR","TEDESCO":"DE","SPAGNOLO":"ES"})[lang]||"EN";
  var modeTag=isP?{IT:" (PREVENTIVO)",EN:" (FORECAST)",FR:" (PR\u00c9VISIONNEL)",DE:" (PROGNOSE)",ES:" (PREVISI\u00d3N)"}:{IT:"",EN:"",FR:"",DE:"",ES:""};

  var h='<div class="lt"><div class="lt-top"><div class="lt-logo">'+getBrandLogoImg(e.si)+'</div><div style="text-align:right"><div class="lt-date">'+mN+" "+CFG_YEAR+"</div>";
  if(isP)h+='<div style="font-size:9px;color:#c9a96e;font-weight:700">'+modeTag[mtL]+"</div>";
  h+="</div></div><div class=\"lt-body\"><div class=\"lt-greeting\">"+gr+" "+esc(e.n)+",</div>";
  h+='<div class="lt-info">';
  [[tr(e,"serial","SERIAL NUMBER"),e.m],[tr(e,"month","MONTH YEAR"),mN+" "+CFG_YEAR],[tr(e,"store","STORE"),e.s],[tr(e,"name","NAME"),e.n],[tr(e,"surname","SURNAME"),e.c],[tr(e,"func","FUNCTION"),e.f||e.j],[tr(e,"salary","MONTHLY GROSS SALARY"),fc(e.rl||e.ib||0,cu)]].forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(String(p[1]))+"</div></div>"});h+="</div>";

  // KPI Sprint (consuntivo only)
  if(!isP){var vv=D.v[e.m]||{};
    if(tg.sy){h+='<div class="lt-kpi"><div class="lt-kpi-head"><span>KPI SPRINT</span><span style="text-align:right">TARGET</span><span style="text-align:right">PY</span><span style="text-align:right">RESULT</span><span></span></div>';
      if(tg.sy){var syLyPY=MONTHLY_SYLY[String(e.si)];h+='<div class="lt-kpi-row"><span>SY</span><span style="text-align:right">'+fDec(tg.sy)+'</span><span style="text-align:right;color:#b0a99f">'+(syLyPY!=null?fDec(syLyPY):'\u2014')+'</span><span style="text-align:right;font-weight:600">'+fDec(cn.sy)+"</span><span>"+((cn.sy||0)>=(tg.sy||0)&&tg.sy>0?"\u2705":"\u274c")+"</span></div>";}
      h+="</div>"}}

  if(isP){var prevT={"ITALIANO":"Di seguito il premio massimo potenziale per ","INGLESE":"Below is the maximum potential bonus for ","FRANCESE":"Ci-dessous le bonus potentiel maximum pour ","TEDESCO":"Nachfolgend der maximale potenzielle Bonus f\u00fcr ","SPAGNOLO":"A continuaci\u00f3n el bono potencial m\u00e1ximo para "};
    h+='<div style="font-size:12px;font-weight:700;color:#856404;margin-bottom:16px;background:#fff3cd;padding:10px 14px;border-radius:6px">'+(prevT[lang]||prevT.INGLESE)+mN+" 2026</div>"}
  else h+='<div style="font-size:12px;font-weight:700;color:#2c2925;margin-bottom:16px">'+esc(tr(e,"results",mN))+" "+mN+" 2026 "+esc(tr(e,"and_inc",""))+"</div>";

  var sN=0;var pdLabel=isP?"INCENTIVE MAX":tr(e,"inc_paid","INCENTIVE PAID");
  if(isOn(e.j,"rb")){sN++;var val=getVal(e,"rb"),p=val>0,vS=Math.round(val*sm);h+=secHd(sN,tr(e,"turnover","TURNOVER TARGET"),p,isP);
    if(!isP||tg.to)h+=ltRow(tr(e,"target","TARGET"),'<span class="lt-row-cur">'+cu+"</span>"+Math.round(tg.to||0).toLocaleString("it-IT"));
    h+=ltRow(dp?"INCENTIVE MAX":tr(e,"incentive","INCENTIVE"),'<span class="lt-row-cur">'+cu+"</span>"+e.ib);
    if(!isP){h+=ltRow(tr(e,"balance","FINAL BALANCE"),'<span class="lt-row-cur">'+cu+"</span>"+Math.round(cn.sc+(cn.es||0)).toLocaleString("it-IT"));
      if(surplus>0)h+='<div style="font-size:9px;color:#a09a92;padding:2px 0;font-style:italic">Surplus (+'+Math.round(surplus).toLocaleString("it-IT")+")</div>"}
    h+=secPd(pdLabel,vS,cu,p);
    if(!isP){
      var _ovLang=trLang(e);
      if(e.ov_b100==="SI"){
        // Override 100%: premio pieno riconosciuto manualmente (blu)
        var ov100L={"ITALIANO":"Override 100% applicato manualmente — premio pieno riconosciuto (negozio: "+pctStore+"%)","INGLESE":"100% override manually applied — full prize granted (store: "+pctStore+"%)","FRANCESE":"Override 100% appliqué manuellement — prime complète accordée (magasin : "+pctStore+"%)","TEDESCO":"100 %-Override manuell angewendet — voller Bonus gewährt (Store: "+pctStore+"%)","SPAGNOLO":"Override 100% aplicado manualmente — premio completo reconocido (tienda: "+pctStore+"%)"};
        h+='<div style="font-size:9px;margin-top:6px;padding:4px 8px;background:#e8f0fe;border-left:3px solid #5b6abf;color:#1a3a7a;border-radius:0 4px 4px 0;font-weight:600">🔓 '+esc(ov100L[_ovLang]||ov100L["INGLESE"])+'</div>';
      } else if(e.ov_rid==="SI"){
        // Override ridotto: moltiplicatore ridotto forzato manualmente (blu)
        var ovRidL={"ITALIANO":"Override ridotto applicato manualmente — premio al "+Math.round(PARAMS.bdg60mult*100)+"% riconosciuto (negozio: "+pctStore+"%)","INGLESE":"Reduced override manually applied — "+Math.round(PARAMS.bdg60mult*100)+"% prize granted (store: "+pctStore+"%)","FRANCESE":"Override réduit appliqué manuellement — prime à "+Math.round(PARAMS.bdg60mult*100)+"% accordée (magasin : "+pctStore+"%)","TEDESCO":"Reduzierter Override manuell angewendet — "+Math.round(PARAMS.bdg60mult*100)+" %-Bonus gewährt (Store: "+pctStore+"%)","SPAGNOLO":"Override reducido aplicado manualmente — premio al "+Math.round(PARAMS.bdg60mult*100)+"% reconocido (tienda: "+pctStore+"%)"};
        h+='<div style="font-size:9px;margin-top:6px;padding:4px 8px;background:#e8f0fe;border-left:3px solid #5b6abf;color:#1a3a7a;border-radius:0 4px 4px 0;font-weight:600">🔓 '+esc(ovRidL[_ovLang]||ovRidL["INGLESE"])+'</div>';
      } else if(isRidotto(e)){
        // Paracadute automatico: moltiplicatore ridotto calcolato (ambra, invariato)
        var rdLbls={"ITALIANO":"Moltiplicatore ridotto al "+Math.round(PARAMS.bdg60mult*100)+"% applicato — negozio tra "+Math.round(PARAMS.bdg60*100)+"% e "+Math.round(PARAMS.bdg100*100)+"% del target"+(isD(e.si)?"":" (SY migliorata)"),"INGLESE":"Reduced multiplier at "+Math.round(PARAMS.bdg60mult*100)+"% applied — store between "+Math.round(PARAMS.bdg60*100)+"% and "+Math.round(PARAMS.bdg100*100)+"% of target"+(isD(e.si)?"":" (improved SY)"),"FRANCESE":"Multiplicateur réduit à "+Math.round(PARAMS.bdg60mult*100)+"% appliqué — magasin entre "+Math.round(PARAMS.bdg60*100)+"% et "+Math.round(PARAMS.bdg100*100)+"% de l'objectif"+(isD(e.si)?"":" (SY améliorée)"),"TEDESCO":"Reduzierter Multiplikator ("+Math.round(PARAMS.bdg60mult*100)+"%) angewendet — Store zwischen "+Math.round(PARAMS.bdg60*100)+"% und "+Math.round(PARAMS.bdg100*100)+"% des Ziels"+(isD(e.si)?"":" (SY verbessert)"),"SPAGNOLO":"Multiplicador reducido al "+Math.round(PARAMS.bdg60mult*100)+"% aplicado — tienda entre "+Math.round(PARAMS.bdg60*100)+"% y "+Math.round(PARAMS.bdg100*100)+"% del objetivo"+(isD(e.si)?"":" (SY mejorada)")};
        h+='<div style="font-size:9px;margin-top:6px;padding:4px 8px;background:#fff3e0;border-left:3px solid #c9a96e;color:#856404;border-radius:0 4px 4px 0">⚡ '+esc(rdLbls[_ovLang]||rdLbls["INGLESE"])+'</div>';
      }
    }if(e.ibFromAY)h+='<div style="font-size:9px;margin-top:6px;padding:4px 8px;background:#fff8ee;border-left:3px solid #c9a96e;color:#856404;border-radius:0 4px 4px 0">BDG NETTO — pagato in busta paga come TRASFERTE (cod. 380)</div>';if(!(STORE_FLAGS[String(e.si)]&&STORE_FLAGS[String(e.si)].noSas))h+=sasLetterBlock(lang,_ssiL,isP,cu);if(!isP)h+='<div style="font-size:9px;color:#8a8680;margin-top:4px">Store: '+pctStore+"%</div>";h+="</div></div>"}
  if(isOn(e.j,"pq")){sN++;var val=getVal(e,"pq"),p=val>0,vS=Math.round(val*sm);h+=secHd(sN,"QTY",p,isP);if(!isP||tg.qt){h+=ltRow("TARGET","QTY "+(tg.qt||0));}h+=ltRow("MAX",'<span class="lt-row-cur">'+cu+"</span>"+Math.round(e.ib*PARAMS.qtyPct));if(!isP)h+=ltRow("RESULT","QTY "+(cn.qc||0));h+=secPd(pdLabel,vS,cu,p);h+="</div></div>"}
  if(isOn(e.j,"rd")){sN++;var val=getVal(e,"rd"),p=val>0,vS=Math.round(val*sm);var digThr=getDigMin(e.si);h+=secHd(sN,tr(e,"digital","DIGITAL TARGET"),p,isP);h+=ltRow("TARGET",fPct(digThr));h+=ltRow("INCENTIVE MAX",'<span class="lt-row-cur">'+cu+"</span>"+Math.round(e.ib*PARAMS.digPct));if(!isP)h+=ltRow("RESULT",fPct(cn.pd));h+=secPd(pdLabel,vS,cu,p);h+="</div></div>"}
  if(isOn(e.j,"rp")){sN++;var val=getVal(e,"rp"),p=val>0,vS=Math.round(val*sm);var _rlP=e.rl||e.ib||0;h+=secHd(sN,tr(e,"privilege","PRIVILEGE"),p,isP);if(!isP||tg.pr){h+=ltRow("TARGET",fPct(tg.pr));}h+=ltRow("FORMULA",(PARAMS.privPct*100)+"% RLM");h+=ltRow("INCENTIVE MAX",'<span class="lt-row-cur">'+cu+"</span>"+Math.round(_rlP*PARAMS.privPct));if(!isP)h+=ltRow("RESULT",fPct(cn.nf));h+=secPd(pdLabel,vS,cu,p);h+="</div></div>"}
  if(isOn(e.j,"rs")){sN++;var val=getVal(e,"rs"),p=val>0,vS=Math.round(val*sm);var _rlS=e.rl||e.ib||0;h+=secHd(sN,"SY TARGET",p,isP);if(!isP||tg.sy){h+=ltRow("TARGET",fDec(tg.sy));}h+=ltRow("FORMULA",(PARAMS.syPct*100)+"% RLM");h+=ltRow("INCENTIVE MAX",'<span class="lt-row-cur">'+cu+"</span>"+Math.round(_rlS*PARAMS.syPct));if(!isP)h+=ltRow("RESULT",fDec(cn.sy));h+=secPd(pdLabel,vS,cu,p);h+="</div></div>"}
  if(isOn(e.j,"rsa")){sN++;var val=getVal(e,"rsa"),p=val>0,vS=Math.round(val*sm);h+=secHd(sN,"SAS TARGET",p,isP);h+=ltRow("FORMULA","\u20ac"+PARAMS.sasRate+"/SAS, max \u20ac"+PARAMS.sasMax);
    // SAS accepted % threshold (mensile only, da Giugno 2026)
    var sasAccLang=trLang(e);
    var SAS_ACC_T={
      "ITALIANO":{thr:"SOGLIA % SAS ACCETTATI",acc:"% SAS ACCETTATI",zeroed:"Premio SAS azzerato: % SAS accettati sotto la soglia minima."},
      "INGLESE":{thr:"ACCEPTED SAS % THRESHOLD",acc:"ACCEPTED SAS %",zeroed:"SAS prize zeroed: accepted SAS % below minimum threshold."},
      "FRANCESE":{thr:"SEUIL % SAS ACCEPT\u00c9S",acc:"% SAS ACCEPT\u00c9S",zeroed:"Prime SAS annul\u00e9e : % SAS accept\u00e9s en dessous du seuil minimum."},
      "TEDESCO":{thr:"SCHWELLE % AKZEPTIERTE SAS",acc:"% AKZEPTIERTE SAS",zeroed:"SAS-Pr\u00e4mie auf null gesetzt: % akzeptierte SAS unter Mindestschwelle."},
      "SPAGNOLO":{thr:"UMBRAL % SAS ACEPTADOS",acc:"% SAS ACEPTADOS",zeroed:"Premio SAS anulado: % SAS aceptados por debajo del umbral m\u00ednimo."}
    };
    var sasT=SAS_ACC_T[sasAccLang]||SAS_ACC_T["INGLESE"];
    if(sasAccActive()){
      h+=ltRow(sasT.thr,(PARAMS.sasMinAccPct*100).toFixed(0)+"%");
      if(!isP){
        var saV=(cn.sa!=null)?((cn.sa*100).toFixed(0)+"%"):"\u2014";
        var saOk=cn.sa!=null&&cn.sa>=PARAMS.sasMinAccPct;
        h+=ltRow(sasT.acc,'<span style="color:'+(cn.sa==null?"#a09a92":(saOk?"#2d7a3a":"#cf5b5b"))+';font-weight:700">'+saV+(cn.sa!=null?(saOk?" \u2713":" \u2717"):"")+'</span>');
      }
    }
    if(!isP)h+=ltRow("SAS ON TARGET",String(cn.s4||0));
    // Mostra paid (vS) o, se azzerato per soglia, evidenzia il motivo
    if(!isP&&sasZeroByAcc(e)){
      h+='<div class="lt-row" style="background:#fdecea;border-left:3px solid #cf5b5b;padding:6px 10px;margin-top:4px;border-radius:0 4px 4px 0"><span style="font-size:10px;color:#a02d2d;font-weight:600">\u26a0 '+esc(sasT.zeroed)+'</span></div>';
      h+=secPd(pdLabel,0,cu,false);
    } else {
      h+=secPd(pdLabel,vS,cu,p);
    }
    h+="</div></div>"}
  if(PARAMS.artEnabled&&isOn(e.j,"ra")){sN++;var val=getVal(e,"ra"),p=val>0,vS=Math.round(val*sm);var acCnt=cn.ac||0;h+=secHd(sN,tr(e,"articles","ITEMS"),isP?true:p,isP);h+=ltRow("FORMULA",(PARAMS.artPct*100)+"% "+tr(e,"turnover","BDG")+" x N. "+tr(e,"items","CAT"));if(isP){/* nessuna stima in preventivo */}else{if(acCnt>0)h+=ltRow(tr(e,"items","CATEGORIES")+" ON TARGET",String(acCnt));if(acCnt>0)h+=ltRow("INCENTIVE MAX",'<span class="lt-row-cur">'+cu+"</span>"+Math.round(e.ib*PARAMS.artPct*acCnt));h+=secPd(pdLabel,vS,cu,p)}h+="</div></div>"}
  if(isOn(e.j,"rdc")){sN++;var val=getVal(e,"rdc"),p=val>0,vS=Math.round(val*sm);h+=secHd(sN,"DCC TARGET",p,isP);h+=ltRow("FORMULA",(PARAMS.dccRate*100).toFixed(1)+"% max \u20ac"+PARAMS.dccMax);if(!isP)h+=ltRow("DCC VALUE",'<span class="lt-row-cur">'+cu+"</span>"+(cn.dv||0).toLocaleString("it-IT"));h+=secPd(pdLabel,vS,cu,p);h+="</div></div>"}
  var _vlei=VL[e.m];var viVal=getVal(e,"vi");var _hasVI=viVal>0||(!isP&&Array.isArray(_vlei)&&_vlei.length>0);if(_hasVI){sN++;var _vLng=trLang(e);var _vLS={"ITALIANO":"NEGOZIO","INGLESE":"STORE","FRANCESE":"MAGASIN","TEDESCO":"STORE","SPAGNOLO":"TIENDA"};var _vLT={"ITALIANO":"TARGET FATTURATO","INGLESE":"TURNOVER TARGET","FRANCESE":"OBJECTIF CA","TEDESCO":"UMSATZZIEL","SPAGNOLO":"OBJETIVO"};var _vLA={"ITALIANO":"CONSUNTIVO","INGLESE":"ACTUAL","FRANCESE":"RÉEL","TEDESCO":"IST","SPAGNOLO":"REAL"};var _vLP={"ITALIANO":"PREMIO","INGLESE":"INCENTIVE","FRANCESE":"PRIME","TEDESCO":"PRÄMIE","SPAGNOLO":"INCENTIVO"};var _vLN={"ITALIANO":"Obiettivo non raggiunto","INGLESE":"Target not reached","FRANCESE":"Objectif non atteint","TEDESCO":"Ziel nicht erreicht","SPAGNOLO":"Objetivo no alcanzado"};var _vLR={"ITALIANO":"Premio ridotto ("+Math.round(PARAMS.bdg60mult*100)+"%)","INGLESE":"Reduced prize ("+Math.round(PARAMS.bdg60mult*100)+"%)","FRANCESE":"Prime réduite ("+Math.round(PARAMS.bdg60mult*100)+"%)","TEDESCO":"Reduzierte Prämie ("+Math.round(PARAMS.bdg60mult*100)+"%)","SPAGNOLO":"Premio reducido ("+Math.round(PARAMS.bdg60mult*100)+"%)"};h+=secHd(sN,"EXTRA BDG VISUAL IN STORE",viVal>0,isP);if(!isP){if(!Array.isArray(_vlei)){h+=ltRow('','<span style="color:#a09a92;font-size:10px;font-style:italic">Ricarica il file Visual In Store per visualizzare il dettaglio per negozio</span>');}else if(_vlei.length>0){var _nEmptyD=_vlei.filter(function(x){return !String(x.sid||'').trim();}).length;var _allEmpty=_nEmptyD===_vlei.length&&_vlei.length>1;if(_allEmpty){h+=ltRow('','<span style="color:#a09a92;font-size:10px;font-style:italic">Colonna Store ID non rilevata nel file Visual — ricaricarlo per il dettaglio per negozio</span>');}else{var _vOvB100=e.ov_b100==="SI",_vOvRid=e.ov_rid==="SI";_vlei.forEach(function(entry){var _vsid=String(entry.sid||'').trim();if(_vsid){var _pi=parseInt(_vsid);if(!isNaN(_pi))_vsid=String(_pi);}var _ridSid=_vsid||sid;var _vtg=D.t[_ridSid]||{};var _vcn=D.c[_ridSid]||{};var _vpct=storePctOf(_ridSid);var _vtier=_vOvB100?'full':_vOvRid?'rid':(_vpct>=PARAMS.bdg100?'full':(isRidottoStore(_ridSid)?'rid':'none'));var _vprz=_vtier==='full'?Math.round((entry.amt||0)*sm):(_vtier==='rid'?Math.round((entry.amt||0)*PARAMS.bdg60mult*sm*100)/100:0);var _vname=(function(){var n='';E.forEach(function(emp){if(String(emp.si)===_vsid&&emp.s){n=emp.s;}});return n;}());var _vlbl=(_vLS[_vLng]||'STORE')+' '+(_vsid||String(e.si));if(_vname)_vlbl+='—'+_vname;var _vIcon=_vtier==='full'?'✅':(_vtier==='rid'?'🟡':'❌');h+=ltRow(_vlbl,_vIcon+' '+fPct(_vpct));if((_vtg.to||0)>0){h+=ltRow(_vLT[_vLng]||'TARGET','<span class="lt-row-cur">'+cu+'</span>'+(_vtg.to).toLocaleString('it-IT'));h+=ltRow(_vLA[_vLng]||'ACTUAL','<span class="lt-row-cur">'+cu+'</span>'+Math.round((_vcn.sc||0)+(_vcn.es||0)).toLocaleString('it-IT'));}h+=ltRow(_vLP[_vLng]||'INCENTIVE',_vtier==='full'?('<span class="lt-row-cur">'+cu+'</span>'+_vprz):(_vtier==='rid'?('<span class="lt-row-cur">'+cu+'</span>'+_vprz+' <span style="color:#c9a96e;font-size:9px">('+esc(_vLR[_vLng]||_vLR["INGLESE"])+')</span>'):('<span style="color:#cf5b5b;font-style:italic">'+esc(_vLN[_vLng]||'Target not reached')+'</span>')));});}}}if(viVal>0)h+=secPd(pdLabel,Math.round(viVal*sm),cu,true);h+="</div></div>"}

  // AGGIUNTE section in letter (if any)
  var at=aggTotal(e.m);
  if(at>0){sN++;h+=secHd(sN,"AGGIUNTE / MANUAL ADJUSTMENTS",true,isP);
    var a=AGG[e.m];AGG_KEYS.forEach(function(ak){if(a[ak.k]>0)h+=ltRow(ak.l,'<span class="lt-row-cur">'+cu+"</span>"+a[ak.k])});
    h+=secPd("TOTAL ADJUSTMENTS",Math.round(at),cu,true);h+="</div></div>"}

  // WORKGAME section
  if(MODE==="consuntivo"&&e.ov_wg==="SI"&&isOn(e.j,"rb")){
    var wgAmt=Math.round(e.ib*(PARAMS.workgamePct||0));
    var wgLbls={"ITALIANO":"WORKGAME - BONUS AGGIUNTIVO","INGLESE":"WORKGAME - ADDITIONAL BONUS","FRANCESE":"WORKGAME - BONUS SUPPLEMENTAIRE","TEDESCO":"WORKGAME - ZUSATZBONUS","SPAGNOLO":"WORKGAME - BONO ADICIONAL"};
    var wgDesc={"ITALIANO":"Hai raggiunto l'obiettivo Workgame del mese. Il bonus corrisponde al "+Math.round((PARAMS.workgamePct||0)*100)+"% del tuo premio BDG nominale.","INGLESE":"You have achieved the Workgame target for the month. The bonus corresponds to "+Math.round((PARAMS.workgamePct||0)*100)+"% of your personal BDG prize.","FRANCESE":"Vous avez atteint l'objectif Workgame du mois. Le bonus correspond a "+Math.round((PARAMS.workgamePct||0)*100)+"% de votre prime BDG personnelle.","TEDESCO":"Sie haben das Workgame-Ziel des Monats erreicht. Der Bonus entspricht "+Math.round((PARAMS.workgamePct||0)*100)+"% Ihrer personlichen BDG-Pramie.","SPAGNOLO":"Has alcanzado el objetivo Workgame del mes. El bono corresponde al "+Math.round((PARAMS.workgamePct||0)*100)+"% de tu premio BDG personal."};
    var wgLang=trLang(e);
    sN++;h+=secHd(sN,wgLbls[wgLang]||wgLbls["INGLESE"],true,isP);
    h+=ltRow(wgDesc[wgLang]||wgDesc["INGLESE"],"");
    h+=secPd(pdLabel,wgAmt,cu,true);h+="</div></div>";
  }

  if(!isP&&e.ml>0&&sm<1)h+='<div style="background:#fff3cd;border:1px solid #c9a96e;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#856404"><b>'+e.ml+" gg</b> \u2192 "+(sm*100)+"%</div>";
  h+="</div>";

  var totalLabel=isP?(lang==="ITALIANO"?"MASSIMO PREMIO POTENZIALE":"MAXIMUM POTENTIAL BONUS"):esc(tr(e,"earned","THIS MONTH YOU HAVE EARNED THE"));
  if(tc>0){h+='<div class="lt-total"><div><div class="lt-total-label">'+totalLabel+'</div><div class="lt-total-pct">'+pctSal+esc(tr(e,"over_sal","% OVER SALARY"))+"</div></div><div class=\"lt-total-val\">"+fc(tc,cu)+"</div></div>"}
  else{h+='<div class="lt-total"><div><div class="lt-total-label" style="color:#cf5b5b">NO INCENTIVE</div></div><div class="lt-total-val" style="color:#6b6560">'+fc(0,cu)+"</div></div>"}
  h+='<div class="lt-footer"><div style="font-weight:600;margin-bottom:6px">'+esc(tr(e,"rules","THE DELIVERED INCENTIVES FOLLOW THE RULE"))+'</div><div style="white-space:pre-wrap">'+esc(getDiscl(e))+"</div></div></div>";
  return h}

// === SEASONAL LETTER ===
// Helper: toFixed with comma decimal separator (Italian/EU style)
function fDec(n,d){return Number(n).toFixed(d===undefined?2:d).replace('.',',');}
// === SEASONAL LETTER TRANSLATIONS ===
var SEAS_TR={
  "ITALIANO":{
    forecast:"PREVENTIVO",
    season_label:"STAGIONE",
    serial:"MATRICOLA",
    store:"STORE",
    name:"NOME",
    surname:"COGNOME",
    func:"FUNZIONE",
    salary:"RETRIBUZIONE LORDA MENSILE",
    kpi_incidence:"INCIDENZA INCENTIVO KPI (MAX)",
    kpi_max:"INCENTIVO KPI RAGGIUNGIBILE (MAX)",
    boost_max:"BOOST MAX",
    seas_max:"INCENTIVO SEASONAL (MAX)",
    mid_label:"MID SEASON CHECKPOINT (MAX)",
    kpi_section:"SEZIONE KPI'S",
    target:"TARGET",
    weight:"PESO",
    result:"RISULTATO",
    var_pct:"VAR.%",
    incentive:"INCENTIVO",
    kpi_total:"INCENTIVO RAGGIUNGIBILE PER KPI'S",
    kpi_total_prev:"INCENTIVO KPI MASSIMO POTENZIALE",
    boost_section:"SEZIONE BOOST",
    store_budget:"Store Budget",
    inventory:"Inventory",
    boost_mult:"MOLTIPLICATORE SEZIONE BOOST",
    seas_earned:"INCENTIVO SEASONAL RAGGIUNGIBILE",
    mid_max:"MAX EROGABILE AL MID SEASON CHECKPOINT",
    mid_potential:"INCENTIVO MID-SEASON RAGGIUNGIBILE",
    mid_earned:"INCENTIVO MID-SEASON MATURATO",
    tab_from:"DA",tab_to:"A",tab_mult:"MOLT",tab_band:"FASCIA",
    sy_label:"MASSIMIZZA / Shopper Yield",
    sr_label:"FIDELIZZA / Subscription Rate",
    sas_label:"OTTIMIZZA / Seek & Send",
    acc_label:"ACCURACY",
    tab_turnover:"TABELLA MOLTIPLICATORE STORE BUDGET",
    tab_inventory:"TABELLA MOLTIPLICATORE INVENTORY",
    bdg_monthly:"BUDGET INDIVIDUALE (MENSILE)",
    period_mult:"MOLTIPLICATORE PERIODO",
    qty_formula:"50% BDG × 6",
    qty_target:"TARGET QTY",
    qty_result:"RISULTATO QTY",
    max_bonus:"MASSIMO BONUS POTENZIALE",
    max_seas:"MASSIMO INCENTIVO RAGGIUNGIBILE",
    seas_bonus:"BONUS SEASONAL MATURATO",
    pct_salary:"% sulla retribuzione mensile",
    incentive_paid:"INCENTIVO EROGATO",
    incentive_max:"INCENTIVO MAX",
    forecast_intro:"Di seguito il bonus massimo potenziale per ",
    mid_deducted:"MID-SEASON GIÀ EROGATO",
    seas_net:"SALDO DA EROGARE A FINE STAGIONE",
    sas_turnover_label:"SAS APPLICATO AL FATTURATO",
    sas_turnover_note:"Il valore SAS gestito dal negozio confluirà nel fatturato verso il target a consuntivo.",
    greeting:{"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"}
  },
  "INGLESE":{
    forecast:"FORECAST",
    season_label:"SEASON",
    serial:"SERIAL NUMBER",
    store:"STORE",
    name:"NAME",
    surname:"SURNAME",
    func:"FUNCTION",
    salary:"MONTHLY GROSS SALARY",
    kpi_incidence:"KPI INCENTIVE WEIGHT (MAX)",
    kpi_max:"MAX KPI INCENTIVE",
    boost_max:"MAX BOOST",
    seas_max:"MAX SEASONAL INCENTIVE",
    mid_label:"MID SEASON CHECKPOINT (MAX)",
    kpi_section:"KPI SECTION",
    target:"TARGET",
    weight:"WEIGHT",
    result:"RESULT",
    var_pct:"VAR.%",
    incentive:"INCENTIVE",
    kpi_total:"KPI INCENTIVE ACHIEVED",
    kpi_total_prev:"MAXIMUM POTENTIAL KPI INCENTIVE",
    boost_section:"BOOST SECTION",
    store_budget:"Store Budget",
    inventory:"Inventory",
    boost_mult:"BOOST MULTIPLIER",
    seas_earned:"SEASONAL INCENTIVE EARNED",
    mid_max:"MAX PAYABLE AT MID SEASON CHECKPOINT",
    mid_potential:"MID-SEASON POTENTIAL INCENTIVE",
    mid_earned:"MID-SEASON INCENTIVE EARNED",
    tab_from:"FROM",tab_to:"TO",tab_mult:"MULT",tab_band:"BAND",
    sy_label:"MAXIMISE / Shopper Yield",
    sr_label:"LOYALTY / Subscription Rate",
    sas_label:"OPTIMISE / Seek & Send",
    acc_label:"ACCURACY",
    tab_turnover:"STORE BUDGET MULTIPLIER TABLE",
    tab_inventory:"INVENTORY MULTIPLIER TABLE",
    bdg_monthly:"INDIVIDUAL BUDGET (MONTHLY)",
    period_mult:"PERIOD MULTIPLIER",
    qty_formula:"50% BDG × 6",
    qty_target:"QTY TARGET",
    qty_result:"QTY RESULT",
    max_bonus:"MAXIMUM POTENTIAL BONUS",
    max_seas:"MAXIMUM ACHIEVABLE INCENTIVE",
    seas_bonus:"SEASONAL BONUS EARNED",
    pct_salary:"% of monthly salary",
    incentive_paid:"INCENTIVE PAID",
    incentive_max:"INCENTIVE MAX",
    forecast_intro:"Below is the maximum potential bonus for ",
    mid_deducted:"MID-SEASON ALREADY PAID",
    seas_net:"BALANCE DUE AT SEASON END",
    sas_turnover_label:"SAS APPLIED TO TURNOVER",
    sas_turnover_note:"The store's managed SAS value will be added to turnover toward the target at year-end.",
    greeting:{"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"}
  },
  "FRANCESE":{
    forecast:"PRÉVISIONNEL",
    season_label:"SAISON",
    serial:"MATRICULE",
    store:"MAGASIN",
    name:"NOM",
    surname:"SURNOM",
    func:"FONCTION",
    salary:"SALAIRE BRUT MENSUEL",
    kpi_incidence:"INCIDENCE INCENTIVE KPI (MAX)",
    kpi_max:"INCENTIVE KPI MAX ATTEIGNABLE",
    boost_max:"BOOST MAX",
    seas_max:"INCENTIVE SEASONAL (MAX)",
    mid_label:"MID SEASON CHECKPOINT (MAX)",
    kpi_section:"SECTION KPI'S",
    target:"OBJECTIF",
    weight:"POIDS",
    result:"RÉSULTAT",
    var_pct:"VAR.%",
    incentive:"INCITATION",
    kpi_total:"INCITATION KPI ATTEIGNABLE",
    kpi_total_prev:"INCITATION KPI POTENTIEL MAXIMUM",
    boost_section:"SECTION BOOST",
    store_budget:"Budget Magasin",
    inventory:"Inventaire",
    boost_mult:"MULTIPLICATEUR SECTION BOOST",
    seas_earned:"INCITATION SEASONAL ATTEIGNABLE",
    mid_max:"MAX PAYABLE AU MID SEASON CHECKPOINT",
    mid_potential:"INCITATION MID-SEASON POTENTIELLE",
    mid_earned:"INCITATION MID-SEASON ACQUISE",
    tab_from:"DE",tab_to:"À",tab_mult:"MULT",tab_band:"TRANCHE",
    sy_label:"MAXIMISER / Shopper Yield",
    sr_label:"FIDÉLISER / Subscription Rate",
    sas_label:"OPTIMISER / Seek & Send",
    acc_label:"ACCURACY",
    tab_turnover:"TABLE MULTIPLICATEUR BUDGET MAGASIN",
    tab_inventory:"TABLE MULTIPLICATEUR INVENTAIRE",
    bdg_monthly:"BUDGET INDIVIDUEL (MENSUEL)",
    period_mult:"MULTIPLICATEUR PÉRIODE",
    qty_formula:"50% BDG × 6",
    qty_target:"OBJECTIF QTY",
    qty_result:"RÉSULTAT QTY",
    max_bonus:"BONUS POTENTIEL MAXIMUM",
    max_seas:"INCITATION MAXIMALE ATTEIGNABLE",
    seas_bonus:"BONUS SEASONAL ACQUIS",
    pct_salary:"% du salaire mensuel",
    incentive_paid:"INCITATION ACCORDÉE",
    incentive_max:"INCITATION MAX",
    forecast_intro:"Ci-dessous le bonus potentiel maximum pour ",
    mid_deducted:"MID-SEASON DÉJÀ VERSÉ",
    seas_net:"SOLDE À VERSER EN FIN DE SAISON",
    sas_turnover_label:"SAS APPLIQUÉ AU CHIFFRE D'AFFAIRES",
    sas_turnover_note:"La valeur SAS gérée par le magasin sera ajoutée au chiffre d'affaires vers l'objectif au bilan final.",
    greeting:{"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"}
  },
  "TEDESCO":{
    forecast:"PROGNOSE",
    season_label:"SAISON",
    serial:"MATRIKEL",
    store:"STORE",
    name:"VORNAME",
    surname:"NACHNAME",
    func:"FUNKTION",
    salary:"BRUTTOMONATSGEHALT",
    kpi_incidence:"KPI-ANREIZGEWICHTUNG (MAX)",
    kpi_max:"MAX ERREICHBARER KPI-ANREIZ",
    boost_max:"MAX BOOST",
    seas_max:"MAX SAISONALER ANREIZ",
    mid_label:"MID SEASON CHECKPOINT (MAX)",
    kpi_section:"KPI-ABSCHNITT",
    target:"TARGET",
    weight:"GEWICHT",
    result:"ERGEBNIS",
    var_pct:"VAR.%",
    incentive:"ANREIZ",
    kpi_total:"ERREICHTER KPI-ANREIZ",
    kpi_total_prev:"MAXIMALER KPI-ANREIZ",
    boost_section:"BOOST-ABSCHNITT",
    store_budget:"Store Budget",
    inventory:"Inventar",
    boost_mult:"BOOST-MULTIPLIKATOR",
    seas_earned:"ERREICHTER SAISONALER ANREIZ",
    mid_max:"MAX ZAHLBAR BEI MID SEASON CHECKPOINT",
    mid_potential:"POTENZIELLE MID-SEASON-PRÄMIE",
    mid_earned:"VERDIENTE MID-SEASON-PRÄMIE",
    tab_from:"VON",tab_to:"BIS",tab_mult:"MULT",tab_band:"STUFE",
    sy_label:"MAXIMIEREN / Shopper Yield",
    sr_label:"BINDEN / Subscription Rate",
    sas_label:"OPTIMIEREN / Seek & Send",
    acc_label:"ACCURACY",
    tab_turnover:"MULTIPLIKATORTABELLE STORE BUDGET",
    tab_inventory:"MULTIPLIKATORTABELLE INVENTAR",
    bdg_monthly:"INDIVIDUELLES BUDGET (MONATLICH)",
    period_mult:"PERIODEN-MULTIPLIKATOR",
    qty_formula:"50% BDG × 6",
    qty_target:"QTY ZIEL",
    qty_result:"QTY ERGEBNIS",
    max_bonus:"MAXIMALER BONUS",
    max_seas:"MAXIMAL ERREICHBARER ANREIZ",
    seas_bonus:"VERDIENTER SAISONALER BONUS",
    pct_salary:"% des Monatsgehalts",
    incentive_paid:"BEZAHLTER ANREIZ",
    incentive_max:"MAX ANREIZ",
    forecast_intro:"Nachfolgend der maximale potenzielle Bonus für ",
    mid_deducted:"MID-SEASON BEREITS AUSGEZAHLT",
    seas_net:"RESTBETRAG ZUM SAISONENDE",
    sas_turnover_label:"SAS AUF DEN UMSATZ ANGERECHNET",
    sas_turnover_note:"Der vom Store verwaltete SAS-Wert wird bei der Endabrechnung dem Umsatz in Richtung Zielvorgabe hinzugerechnet.",
    greeting:{"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"}
  },
  "SPAGNOLO":{
    forecast:"PREVISIÓN",
    season_label:"TEMPORADA",
    serial:"MATRÍCULA",
    store:"TIENDA",
    name:"NOMBRE",
    surname:"APELLIDOS",
    func:"FUNCIÓN",
    salary:"SALARIO BRUTO MENSUAL",
    kpi_incidence:"PONDERACIÓN INCENTIVO KPI (MÁX)",
    kpi_max:"INCENTIVO KPI MÁX ALCANZABLE",
    boost_max:"BOOST MÁX",
    seas_max:"INCENTIVO SEASONAL (MÁX)",
    mid_label:"MID SEASON CHECKPOINT (MÁX)",
    kpi_section:"SECCIÓN KPI'S",
    target:"OBJETIVO",
    weight:"PESO",
    result:"RESULTADO",
    var_pct:"VAR.%",
    incentive:"INCENTIVO",
    kpi_total:"INCENTIVO KPI ALCANZABLE",
    kpi_total_prev:"INCENTIVO KPI POTENCIAL MÁXIMO",
    boost_section:"SECCIÓN BOOST",
    store_budget:"Presupuesto Tienda",
    inventory:"Inventario",
    boost_mult:"MULTIPLICADOR SECCIÓN BOOST",
    seas_earned:"INCENTIVO SEASONAL ALCANZABLE",
    mid_max:"MÁX PAGABLE EN MID SEASON CHECKPOINT",
    mid_potential:"INCENTIVO MID-SEASON POTENCIAL",
    mid_earned:"INCENTIVO MID-SEASON OBTENIDO",
    tab_from:"DESDE",tab_to:"HASTA",tab_mult:"MULT",tab_band:"TRAMO",
    sy_label:"MAXIMIZAR / Shopper Yield",
    sr_label:"FIDELIZAR / Subscription Rate",
    sas_label:"OPTIMIZAR / Seek & Send",
    acc_label:"ACCURACY",
    tab_turnover:"TABLA MULTIPLICADOR PRESUPUESTO TIENDA",
    tab_inventory:"TABLA MULTIPLICADOR INVENTARIO",
    bdg_monthly:"PRESUPUESTO INDIVIDUAL (MENSUAL)",
    period_mult:"MULTIPLICADOR PERÍODO",
    qty_formula:"50% BDG × 6",
    qty_target:"OBJETIVO QTY",
    qty_result:"RESULTADO QTY",
    max_bonus:"BONO POTENCIAL MÁXIMO",
    max_seas:"INCENTIVO MÁXIMO ALCANZABLE",
    seas_bonus:"BONO SEASONAL OBTENIDO",
    pct_salary:"% sobre salario mensual",
    incentive_paid:"INCENTIVO PAGADO",
    incentive_max:"INCENTIVO MÁX",
    forecast_intro:"A continuación el bono potencial máximo para ",
    mid_deducted:"MID-SEASON YA PAGADO",
    seas_net:"SALDO A PAGAR AL FINAL DE TEMPORADA",
    sas_turnover_label:"SAS APLICADO A LA FACTURACIÓN",
    sas_turnover_note:"El valor SAS gestionado por la tienda se sumará a la facturación hacia el objetivo en el balance final.",
    greeting:{"ITALIANO":"Ciao","INGLESE":"Hi","FRANCESE":"Bonjour","TEDESCO":"Hallo","SPAGNOLO":"Hola"}
  }
};
// Helper: get seasonal translation by lang key
function tSeas(e, key, fb){
  var lang=trLang(e);
  var t=SEAS_TR[lang]||SEAS_TR["INGLESE"];
  return t[key]!==undefined?t[key]:(fb||key);
}

function buildSeasonalLetter(e){
  var cu=e.cu||"EUR";
  var isP=MODE==="preventivo";
  var rlSem=(e.rl||0)*6;
  var base=rlSem*SEAS_CFG.basePct;
  var kpiSet=seasGetKpiSet(e);
  var auto=isP?null:seasAutoData(e);
  var lang=trLang(e);
  var T=SEAS_TR[lang]||SEAS_TR["INGLESE"];
  var gr=(T.greeting||{})[lang]||"Hi";

  // In preventivo: tutti i KPI come raggiunti, moltiplicatori al massimo
  var scost=isP?3.01:(auto?auto.scost:0);
  var inv=isP?0:(auto?auto.inv:0);
  var m1=seasMoltTurnover(scost);
  var m2=seasMoltInventarioV(inv);
  var maxM1=seasMoltTurnover(3.01);
  var maxM2=seasMoltInventarioV(0);
  var boostMax=Math.round(maxM1*maxM2*100)/100;

  // KPI score usando auto data in consuntivo
  var kpiScore=0;
  var kpiScoreMax=0;
  kpiSet.forEach(function(kdef){
    if(!seasKpiActive(kdef.k,e))return;
    var pct=isP?100:(auto[kdef.k+"_pct"]||0);
    var achieved=isP||seasIsKpiAchieved(kdef,auto);
    kpiScore+=kdef.weight*(achieved?1:0);
    kpiScoreMax+=kdef.weight;
  });

  var kpiIncentive=Math.round(base*kpiScore*100)/100;
  var kpiIncentiveMax=Math.round(base*kpiScoreMax*100)/100;
  var seasonal=Math.round(kpiIncentive*m1*m2*100)/100;
  var seasonalMax=Math.round(kpiIncentiveMax*maxM1*maxM2*100)/100;

  // MID SEASON values: 30% of max
  var midPct=0.30;
  var midMax=Math.round(kpiIncentiveMax*midPct*100)/100;
  // Importo realmente erogato a mid-season (importato da loadMidSeasonPaidExcel), da detrarre a saldo.
  // seasonalNet usa calcSeasonal() come unica fonte di verità (stessa cifra di tab/export:
  // evita un possibile scarto di arrotondamento tra il calcolo locale qui sopra e quello centralizzato).
  var midPaid=(!isP&&SEAS[e.m]&&SEAS[e.m].midPaid>0)?SEAS[e.m].midPaid:0;
  var seasonalNet=calcSeasonal(e);

  var stagione=CFG_SEASON+String(CFG_YEAR).slice(-2); // e.g. FW26 or SS26
  var h='<div class="lt">';

  // Header
  h+='<div class="lt-top"><div class="lt-logo">'+getBrandLogoImg(e.si)+'</div>';
  h+='<div style="text-align:right"><div style="font-size:13px;color:#c9a96e;font-weight:700;letter-spacing:2px">SEASONAL TARGET INCENTIVE</div>';
  if(isP)h+='<div style="font-size:9px;color:#c9a96e;font-weight:700;margin-top:2px">'+T.forecast+'</div>';
  h+='</div></div>';

  // Body
  h+='<div class="lt-body">';
  h+='<div class="lt-greeting">'+gr+' '+esc(e.n)+',</div>';

  // Info grid
  h+='<div class="lt-info" style="grid-template-columns:1fr 1fr 1fr;">';
  var infoFields=[
    [T.serial, e.m],
    [T.season_label, stagione],
    [T.store, e.s],
    [T.name, e.n],
    [T.surname, e.c],
    [T.func, e.f||e.j],
    [T.salary, fc(e.rl||0,cu)],
    [T.kpi_incidence, "20%"],
    [T.kpi_max, fc(e.rl||0,cu)+" \u00d7 6 \u00d7 20% = "+fc(kpiIncentiveMax,cu)]
  ];
  infoFields.forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(String(p[1]))+'</div></div>';
  });
  h+='<div class="lt-info-item"><div class="lt-info-label">'+T.boost_max+'</div><div class="lt-info-val">'+fDec(boostMax,1)+'</div></div>';
  h+='<div class="lt-info-item"><div class="lt-info-label">'+T.seas_max+'</div><div class="lt-info-val" style="color:#c9a96e;font-weight:800">'+fc(kpiIncentiveMax,cu)+' \u00d7 '+fDec(boostMax,1)+' = '+fc(seasonalMax,cu)+'</div></div>';
  h+='<div class="lt-info-item"><div class="lt-info-label">'+T.mid_label+'</div><div class="lt-info-val">'+fc(kpiIncentiveMax,cu)+' \u00d7 30% = '+fc(midMax,cu)+'</div></div>';
  h+='</div>';

  // ── SEZIONE KPI ──
  var kpiCols=isP?'1fr 80px 80px 90px':'1fr 80px 80px 80px 80px 90px';
  h+='<div class="lt-kpi" style="margin-top:20px">';
  h+='<div class="lt-kpi-head" style="background:#2c2925;color:#c9a96e;grid-template-columns:'+kpiCols+';padding:8px 14px">'+
     '<span>'+T.kpi_section+'</span><span style="text-align:right">'+T.target+'</span><span style="text-align:right">'+T.weight+'</span>'+
     (isP?'':'<span style="text-align:right">'+T.result+'</span><span style="text-align:right">'+T.var_pct+'</span>')+
     '<span style="text-align:right">'+T.incentive+'</span></div>';

  kpiSet.forEach(function(kdef){
    if(kdef.weight===0)return;
    var pct=isP?100:(auto[kdef.k+"_pct"]||0);
    var achieved=isP||seasIsKpiAchieved(kdef,auto);
    var kpiAmt=Math.round(base*kdef.weight*100)/100;
    var earnedAmt=achieved?kpiAmt:0;
    var kpiLabel=({sy:T.sy_label,sr:T.sr_label,sas:T.sas_label,acc:T.acc_label})[kdef.k]||kdef.label;
    var sid=String(e.si);
    var cn=D.cs&&D.cs[sid]?D.cs[sid]:{};
    var sid=String(e.si);
    var stgLet=SEAS_TARGETS&&SEAS_TARGETS[sid]?SEAS_TARGETS[sid]:{};
    // In preventivo leggi target da SEAS_TARGETS; in consuntivo usa auto
    var seas_sy=auto?auto.seas_sy:(stgLet.sy||0);
    var seas_pr=auto?auto.seas_pr:(stgLet.pr||0);
    var seas_sas=auto?auto.seas_sas:(stgLet.sas||SEAS_CFG.sasMaxHours||4);
    var risultatoStr="—", varPctStr="—";
    if(!isP){
      if(kdef.k==="sy"){var r=cn.sy!==undefined?fDec(cn.sy,2):"—";risultatoStr=r;varPctStr=seas_sy>0?fDec(((cn.sy||0)/seas_sy-1)*100,1)+"%":"—";}
      else if(kdef.k==="sr"){var r=cn.nf!==undefined?fDec((cn.nf*100),2)+"%":"—";risultatoStr=r;varPctStr=seas_pr>0?fDec(((cn.nf||0)/seas_pr-1)*100,1)+"%":"—";}
      else if(kdef.k==="sas"){var sasH=cn.s4!==undefined?cn.s4:null;risultatoStr=sasH!==null?fDec(sasH,1)+'h':'—';varPctStr=sasH!==null?(sasH<seas_sas?'✓':'✗'):'—';}
      else if(kdef.k==="acc"){var r=cn.av!==undefined&&cn.av!==null?fDec((cn.av*100),2)+"%":"—";var seas_acc_v=auto?auto.seas_acc:0.99;risultatoStr=r;varPctStr=cn.av!=null?fDec((cn.av/seas_acc_v-1)*100,1)+"%":"—";}
    }
    h+='<div class="lt-kpi-row" style="grid-template-columns:'+kpiCols+';background:'+(achieved?"#f0fbf5":"#fff")+'">';
    h+='<span style="font-weight:600;color:#2c2925">'+esc(kpiLabel)+'</span>';
    h+='<span style="text-align:right;font-size:10px;color:#6b6560">'+(({sy:(seas_sy>0?fDec(seas_sy,2):"\u2014"),sr:(seas_pr>0?fDec(seas_pr*100,2)+"%":"\u2014"),sas:"< "+fDec(seas_sas,0)+"h",acc:"99%"})[kdef.k]||"\u2014")+'</span>';
    h+='<span style="text-align:right;color:#5b6abf;font-weight:700">'+fDec((kdef.weight*100),0)+'%</span>';
    if(!isP){
      h+='<span style="text-align:right;font-weight:600;color:#2c2925">'+esc(risultatoStr)+'</span>';
      h+='<span style="text-align:right;font-weight:600;color:'+(achieved?'#2d7a3a':'#cf5b5b')+'">'+esc(varPctStr)+'</span>';
    }
    h+='<span style="text-align:right;font-weight:800;color:'+(achieved?"#2d7a3a":"#b0a99f")+'">'+fc(earnedAmt,cu)+'</span>';
    h+='</div>';
  });

  // KPI total row
  h+='<div style="padding:8px 14px;background:#2c2925;display:flex;justify-content:space-between;align-items:center">';
  h+='<span style="font-size:10px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:1px">'+(isP?(T.kpi_total_prev||T.kpi_total):T.kpi_total)+'</span>';
  h+='<span style="font-size:16px;font-weight:800;color:#c9a96e">'+fc(kpiIncentive,cu)+'</span>';
  h+='</div>';
  h+='</div>';

  // ── SEZIONE BOOST ──
  h+='<div class="lt-kpi" style="margin-top:16px">';
  var boostCols=isP?'1fr 100px 100px':'1fr 100px 100px 80px 100px';
  h+='<div class="lt-kpi-head" style="background:#2c2925;color:#c9a96e;grid-template-columns:'+boostCols+';padding:8px 14px">'+
     '<span>'+T.boost_section+'</span><span style="text-align:right">'+T.target+'</span>'+
     (isP?'':'<span style="text-align:right">'+T.result+'</span><span style="text-align:right">'+T.var_pct+'</span>')+
     '<span style="text-align:right">BOOST</span></div>';

  // Store budget row
  var sid2=String(e.si);
  var tg2=D.t&&D.t[sid2]?D.t[sid2]:{};
  var stg2=SEAS_TARGETS&&SEAS_TARGETS[sid2]?SEAS_TARGETS[sid2]:{};
  var cn2=D.cs&&D.cs[sid2]?D.cs[sid2]:{};
  var storeTgt=stg2.to||tg2.to||0;
  // Contributo SAS→fatturato (da SS26) già esposto da seasAutoData: unica fonte di verità,
  // nessun ricalcolo locale (coerente con storeCons usato per storeVarPct/m1 qui sotto).
  var sasAddonLetter=(!isP&&auto&&auto.sasAddon!==undefined)?auto.sasAddon:0;
  var storeCons=(cn2.sc||0)+(cn2.es||0)+sasAddonLetter;
  var storeVarPct=storeTgt>0?((storeCons/storeTgt-1)*100):0;
  // In preventivo mostra il target fatturato importato (se disponibile)
  var storeTgtDisplay=isP?(storeTgt>0?fc(storeTgt,cu):T.target):(fc(storeTgt,cu));
  h+='<div class="lt-kpi-row" style="grid-template-columns:'+boostCols+'">';
  h+='<span style="font-weight:600">'+T.store_budget+'</span>';
  h+='<span style="text-align:right;font-size:10px;color:#6b6560">'+storeTgtDisplay+'</span>';
  if(!isP){
    h+='<span style="text-align:right;font-size:10px;color:#2c2925">'+fc(storeCons,cu)+'</span>';
    h+='<span style="text-align:right;font-size:10px;font-weight:700;color:'+(storeVarPct>=0?'#2d7a3a':'#cf5b5b')+'">'+fDec(storeVarPct,2)+'%</span>';
  }
  h+='<span style="text-align:right;font-weight:800;color:'+(m1>=1?'#2d7a3a':'#c0392b')+'">'+fDec(m1,2)+'</span>';
  h+='</div>';

  // SAS → fatturato (da SS26): riga separata solo dove pertinente — in consuntivo
  // mostra l'importo solo se effettivamente presente, in preventivo mostra una nota
  // informativa (nessun importo, il dato reale non esiste ancora) solo per i negozi
  // dove il KPI seasonal SAS è attivo (Dept Store esclusi a monte).
  if(!isP&&sasAddonLetter>0){
    h+='<div class="lt-kpi-row" style="grid-template-columns:'+boostCols+';background:#fdf8ee">';
    h+='<span style="font-weight:600;color:#a07d2c">'+T.sas_turnover_label+'</span>';
    h+='<span style="text-align:right;font-size:10px;color:#6b6560">—</span>';
    h+='<span style="text-align:right;font-size:10px;color:#2c2925">'+fc(sasAddonLetter,cu)+'</span>';
    h+='<span></span>';
    h+='<span></span>';
    h+='</div>';
  } else if(isP&&seasSasEligible(sid2)){
    h+='<div style="padding:6px 14px;font-size:9px;color:#a07d2c;font-style:italic;background:#fdf8ee">'+T.sas_turnover_note+'</div>';
  }

  // Inventory row
  var invPctRaw;
  if(cn2.iv!==undefined&&cn2.iv!==null){
    invPctRaw=cn2.iv;
  } else {
    var esub=cn2.es||0; var fat=cn2.sc||0;
    invPctRaw=fat>0?(esub/fat*100):null;
  }
  // Soglia inventario: prendi il valore "from" della riga con coeff=1 dalla tabella molt_inventario
  var invThr=null;
  if(SEAS_CFG&&SEAS_CFG.molt_inventario){
    var invBdgRows=SEAS_CFG.molt_inventario.filter(function(r){return r.coeff===1&&isFinite(r.from);});
    if(invBdgRows.length>0){
      // Prendi il valore from più basso tra le righe con coeff=1 (soglia minima per ottenere coeff 1)
      invThr=invBdgRows.reduce(function(min,r){return r.from<min?r.from:min;},invBdgRows[0].from);
    }
  }
  var invThrDisplay=isP?(invThr!==null?("\u2265 "+fDec(invThr*100,2)+"%"):T.target):"\u2264 -0,15%";
  h+='<div class="lt-kpi-row" style="grid-template-columns:'+boostCols+';background:#faf9f7">';
  h+='<span style="font-weight:600">'+T.inventory+'</span>';
  h+='<span style="text-align:right;font-size:10px;color:#6b6560">'+invThrDisplay+'</span>';
  if(!isP){
    var invDisplay=invPctRaw!==null?fDec(invPctRaw*100,2)+"%":"—";
    var invOk=invPctRaw!==null&&invPctRaw>=-0.0015;
    h+='<span style="text-align:right;font-size:10px;color:#2c2925">'+invDisplay+'</span>';
    h+='<span style="text-align:right;font-size:10px;font-weight:700;color:'+(invOk?'#2d7a3a':'#cf5b5b')+'">'+(invPctRaw!==null?(invOk?'✓':'✗'):'—')+'</span>';
  }
  h+='<span style="text-align:right;font-weight:800;color:'+(m2>=1?'#2d7a3a':'#c0392b')+'">'+fDec(m2,2)+'</span>';
  h+='</div>';

  // Boost total
  var boostCombined=Math.round(m1*m2*100)/100;
  h+='<div style="padding:6px 14px;background:#f5f2ee;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e1db">';
  h+='<span style="font-size:10px;font-weight:700;color:#8a8680;text-transform:uppercase;letter-spacing:1px">'+T.boost_mult+'</span>';
  h+='<span style="font-size:14px;font-weight:800;color:#cf8b4e">'+fDec(boostCombined,2)+'</span>';
  h+='</div>';
  h+='</div>';

  // Tabelle moltiplicatori
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;font-size:10px">';

  // Tabella Store Budget
  h+='<div>';
  h+='<div style="font-size:9px;font-weight:700;color:#8a8680;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+T.tab_turnover+'</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:9px"><thead><tr style="background:#2c2925;color:#f5f4f1"><th style="padding:4px 6px;text-align:left">'+T.tab_from+'</th><th style="padding:4px 6px;text-align:left">'+T.tab_to+'</th><th style="padding:4px 6px;text-align:center">'+T.tab_mult+'</th><th style="padding:4px 6px;text-align:left">'+T.tab_band+'</th></tr></thead><tbody>';
  var fasceTurnover=[
    {da:"<",a:"-1%",molt:"0",fascia:"no bdg"},
    {da:"-1%",a:"0",molt:"0,8",fascia:"near bdg"},
    {da:"0",a:"0,50%",molt:"1",fascia:"bdg"},
    {da:"0,5%",a:"1,50%",molt:"1,3",fascia:"better"},
    {da:"1,5%",a:"2,99%",molt:"1,4",fascia:"over"},
    {da:">",a:"2,99%",molt:"1,5",fascia:"top"}
  ];
  fasceTurnover.forEach(function(f,i){
    var active=!isP&&(
      (i===0&&scost<=-1)||(i===1&&scost>-1&&scost<=0)||
      (i===2&&scost>0&&scost<=0.5)||(i===3&&scost>0.5&&scost<=1.5)||
      (i===4&&scost>1.5&&scost<=3)||(i===5&&scost>3)
    );
    h+='<tr style="background:'+(active?"#fff3cd":"")+'"><td style="padding:3px 6px;border-bottom:1px solid #e5e1db">'+f.da+'</td><td style="padding:3px 6px;border-bottom:1px solid #e5e1db">'+f.a+'</td><td style="padding:3px 6px;text-align:center;font-weight:700;border-bottom:1px solid #e5e1db">'+f.molt+'</td><td style="padding:3px 6px;border-bottom:1px solid #e5e1db;color:#6b6560">'+f.fascia+'</td></tr>';
  });
  h+='</tbody></table></div>';

  // Tabella Inventory
  h+='<div>';
  h+='<div style="font-size:9px;font-weight:700;color:#8a8680;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+T.tab_inventory+'</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:9px"><thead><tr style="background:#2c2925;color:#f5f4f1"><th style="padding:4px 6px;text-align:left">'+T.tab_from+'</th><th style="padding:4px 6px;text-align:left">'+T.tab_to+'</th><th style="padding:4px 6px;text-align:center">'+T.tab_mult+'</th><th style="padding:4px 6px;text-align:left">'+T.tab_band+'</th></tr></thead><tbody>';
  var fasceInv=[
    {da:"-\u221e",a:"-0,50%",molt:"0",fascia:"no bdg"},
    {da:"-0,50%",a:"-0,20%",molt:"0,5",fascia:"half bdg"},
    {da:"-0,20%",a:"-0,15%",molt:"0,8",fascia:"near bdg"},
    {da:"-0,15%",a:"+\u221e",molt:"1",fascia:"bdg"}
  ];
  fasceInv.forEach(function(f,i){
    var active=!isP&&inv!==undefined&&(
      (i===0&&inv<-0.005)||(i===1&&inv>=-0.005&&inv<-0.002)||
      (i===2&&inv>=-0.002&&inv<-0.0015)||(i===3&&inv>=-0.0015)
    );
    h+='<tr style="background:'+(active?"#fff3cd":"")+'"><td style="padding:3px 6px;border-bottom:1px solid #e5e1db">'+f.da+'</td><td style="padding:3px 6px;border-bottom:1px solid #e5e1db">'+f.a+'</td><td style="padding:3px 6px;text-align:center;font-weight:700;border-bottom:1px solid #e5e1db">'+f.molt+'</td><td style="padding:3px 6px;border-bottom:1px solid #e5e1db;color:#6b6560">'+f.fascia+'</td></tr>';
  });
  h+='</tbody></table></div>';
  h+='</div>'; // close grid tabelle

  h+='</div>'; // close lt-body

  // Total bar
  h+='<div class="lt-total">';
  h+='<div><div class="lt-total-label">'+(isP?(T.max_seas||T.max_bonus):T.seas_earned)+'</div>';
  h+='<div class="lt-total-pct">'+fc(kpiIncentive,cu)+' \u00d7 '+fDec(boostCombined,2)+' = '+fc(seasonal,cu)+'</div></div>';
  h+='<div class="lt-total-val">'+fc(seasonal,cu)+'</div>';
  h+='</div>';

  // MID SEASON bar \u2014 preventivo: potenziale al checkpoint; consuntivo: importo gi\u00e0 erogato (dedotto dal saldo)
  h+='<div style="background:#3d3a36;padding:12px 32px;display:flex;justify-content:space-between;align-items:center">';
  h+='<div><div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#a09a92">'+(isP?T.mid_max:(T.mid_deducted||T.mid_max))+'</div>';
  h+='<div style="font-size:10px;color:#a09a92;margin-top:2px">'+(isP?fc(kpiIncentive,cu)+' \u00d7 30%':'')+'</div></div>';
  h+='<div style="font-size:18px;font-weight:800;color:#a09a92">'+(isP?fc(midMax,cu):(midPaid>0?'\u2212'+fc(midPaid,cu):fc(0,cu)))+'</div>';
  h+='</div>';

  // SALDO (netto da erogare) \u2014 solo in consuntivo, dopo la detrazione del mid-season
  if(!isP){
    h+='<div style="background:#2d7a3a;padding:14px 32px;display:flex;justify-content:space-between;align-items:center">';
    h+='<div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#eafaf0;font-weight:700">'+(T.seas_net||T.seas_earned)+'</div>';
    h+='<div style="font-size:20px;font-weight:800;color:#fff">'+fc(seasonalNet,cu)+'</div>';
    h+='</div>';
  }

  // Footer
  h+='<div class="lt-footer">'+esc(getDiscl(e))+'</div>';
  h+='</div>'; // close .lt
  return h;
}

// Check if we have enough data to produce letters
function canProduceLetter(){
  var missing=[];
  var isFcvm=PRIZE_MODE==="fcvm";
  var isSeasonal=PRIZE_MODE==="seasonal";

  if(isFcvm){
    // Modalità FC+VM: controlla FC_EMP e FC_TARGETS invece di D.t
    if(!Object.keys(FC_EMP||{}).length)missing.push("Anagrafica FC+VM (nessun dipendente)");
    if(MODE==="preventivo"&&!Object.keys(FC_TARGETS||{}).length)missing.push("Target Fatturato FC+VM (nessun negozio)");
    return missing;
  }

  // Modalità mensile / seasonal: check traduzioni e D.t
  if(Object.keys(D.tr||{}).length===0)missing.push("Traduzioni (nessuna lingua caricata)");
  if(MODE==="preventivo"&&!isSeasonal){
    if(Object.keys(D.t||{}).length===0)missing.push("Target Fatturato (nessun negozio)");
    var tKeys=Object.keys(D.t||{});
    if(tKeys.length>0){
      if(!tKeys.some(function(k){return(D.t[k].sy||0)>0}))missing.push("Target SY (tutti a zero)");
      if(!tKeys.some(function(k){return(D.t[k].cr||0)>0}))missing.push("Target CR (tutti a zero)");
      if(!tKeys.some(function(k){return(D.t[k].pr||0)>0}))missing.push("Target Privilege (tutti a zero)");
    }
  }
  // Cambi valuta: solo per mensile/seasonal con dipendenti non-EUR
  var hasNonEUR=E.some(function(e){return e.cu&&e.cu!=="EUR"});
  if(hasNonEUR){
    var allOne=E.filter(function(e){return e.cu!=="EUR"}).every(function(e){return e.ex===1||!e.ex});
    if(allOne)missing.push("Cambi Valuta (valute non-EUR con cambio a 1)");
  }
  return missing;
}

// Funzione usata dal wrapper .exe per generare PDF isolati
// Restituisce HTML completo (con CSS) della lettera del dipendente E[i]
// Pool di dipendenti per cui generare lettere (rispetta i toggle attivi)
// Ritorna il filename PDF esatto per il dipendente i-esimo nel pool
// Deve corrispondere esattamente alla colonna FILENAME del tracciato lettere (.znf)
function getLetterFilename(i){
  var pool=PRIZE_MODE==="fcvm"?getFcVmPool():getLetterPool();
  var e=pool[i];
  if(!e)return null;
  return getEmpPdfFilename(e);
}

function getLetterPool(){
  if(PRIZE_MODE==="fcvm")return getFcVmPool();
  if(PRIZE_MODE==="seasonal")return E.filter(function(e){
    return isSMVSM(e)&&!(SEAS&&SEAS[e.m]&&SEAS[e.m].excluded);
  });
  // Mensile: escludi eventuali sospesi e dipendenti con premio sospeso
  return E.filter(function(e){return !(SEAS&&SEAS[e.m]&&SEAS[e.m].excluded)&&e.ps!=="SI";});
}
function getLetterCount(){return getLetterPool().length;}
function getLetterMatricola(i){var pool=getLetterPool();return pool[i]?pool[i].m:null;}

function getLetterHtmlForPrint(i){
  var pool=getLetterPool();
  var e=pool[i];
  if(!e)return null;
  var isSeasonal=PRIZE_MODE==="seasonal";
  var letterHtml=isSeasonal?buildSeasonalLetterAuto(e):(isUSA(e.si,e)?buildLetterUSA(e):buildLetter(e));
  var css=document.querySelector("style")?document.querySelector("style").textContent:"";
  return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><style>"+
    css+
    "*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}"+
    "html,body{margin:0;padding:0;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px}"+
    "@page{size:A4;margin:10mm}"+
    "</style>"+
    "<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">"+
    "</head><body>"+letterHtml+"</body></html>";
}

function sL(mm){
  var e;for(var i=0;i<E.length;i++){if(E[i].m===mm){e=E[i];break}}if(!e)return;
  if(PRIZE_MODE==="seasonal"){
    document.getElementById("lc").innerHTML=buildSeasonalLetterAuto(e);
    return;
  }
  var miss=canProduceLetter();
  if(miss.length>0){
    alert("Impossibile generare la lettera.\n\nDati mancanti:\n\u2022 "+miss.join("\n\u2022 ")+"\n\nCarica i dati dalla tab Fonti Dati.");
    return;
  }
  document.getElementById("lc").innerHTML=isUSA(e.si,e)?buildLetterUSA(e):buildLetter(e);
}
try{ rL(); }catch(_e){ try{setTimeout(rL,0)}catch(_e2){} }

</script>
<script>

// === SEASONAL DEPT LETTER ===
// Per i dept stores internazionali: premio BDG×6 + QTY (50% di BDG×6)
// Struttura coerente con la lettera mensile (buildLetter)
function buildSeasonalDeptLetter(e){
  var cu=e.cu||"EUR",sid=String(e.si);
  var bdg6=Math.round((e.ib||0)*6*100)/100;
  var qty6=Math.round(bdg6*0.5*100)/100;
  var tot=Math.round((bdg6+qty6)*100)/100;
  var isP=MODE==="preventivo";
  var lang=trLang(e);
  var T=SEAS_TR[lang]||SEAS_TR["INGLESE"];
  var gr=(T.greeting||{})[lang]||"Hi";
  var pdLabel=isP?T.incentive_max:T.incentive_paid;

  var h='<div class="lt">';
  // Header
  h+='<div class="lt-top"><div class="lt-logo">'+getBrandLogoImg(e.si)+'</div>';
  h+='<div style="text-align:right"><div style="font-size:13px;color:#c9a96e;font-weight:700;letter-spacing:2px">SEASONAL TARGET INCENTIVE</div>';
  h+='<div style="font-size:11px;color:#8a8680">'+esc(CFG_SEASON+' '+CFG_YEAR)+(isP?' — '+T.forecast:'')+'</div></div></div>';

  // Body
  h+='<div class="lt-body">';
  h+='<div class="lt-greeting">'+gr+' '+esc(e.n)+',</div>';
  h+='<div class="lt-info">';
  [[T.serial,e.m],
   [T.season_label,CFG_SEASON+' '+CFG_YEAR],
   [T.store,e.s],
   [T.name,e.n],
   [T.surname,e.c],
   [T.func,e.f||e.j],
   [T.salary,fc(e.rl||e.ib||0,cu)]
  ].forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(String(p[1]))+'</div></div>';
  });
  h+='</div>';

  var stgDept=SEAS_TARGETS&&SEAS_TARGETS[sid]?SEAS_TARGETS[sid]:{};
  var cnDept=D.cs&&D.cs[sid]?D.cs[sid]:{};

  if(isP){
    h+='<div style="font-size:12px;font-weight:700;color:#856404;margin-bottom:16px;background:#fff3cd;padding:10px 14px;border-radius:6px">'+T.forecast_intro+esc(CFG_SEASON+' '+CFG_YEAR)+'</div>';
  } else {
    h+='<div style="font-size:12px;font-weight:700;color:#2c2925;margin-bottom:16px">'+esc(CFG_SEASON+' '+CFG_YEAR)+'</div>';
  }

  // Sezione 1: BDG × 6
  var sN=0;
  sN++;
  h+=secHd(sN,tr(e,"turnover","TURNOVER TARGET"),true,isP);
  h+=ltRow(T.bdg_monthly,'<span class="lt-row-cur">'+cu+'</span>'+Math.round(e.ib||0).toLocaleString("it-IT"));
  h+=ltRow(T.period_mult,"× 6");
  // In preventivo mostra target fatturato se disponibile
  if(isP&&(stgDept.to||0)>0) h+=ltRow(tr(e,"target","TARGET FATTURATO SEMESTRALE"),'<span class="lt-row-cur">'+cu+'</span>'+Math.round(stgDept.to).toLocaleString("it-IT"));
  h+=secPd(pdLabel,bdg6,cu,true);
  h+="</div></div>";

  // Sezione 2: QTY (50% BDG×6)
  sN++;
  h+=secHd(sN,"QTY",true,isP);
  // In preventivo mostra target QTY se disponibile
  if(isP&&(stgDept.qt||0)>0) h+=ltRow(T.qty_target,""+stgDept.qt.toLocaleString("it-IT"));
  if(!isP&&(stgDept.qt||0)>0) h+=ltRow(T.qty_target,""+stgDept.qt.toLocaleString("it-IT"));
  if(!isP&&(cnDept.qc||0)>0) h+=ltRow(T.qty_result,""+cnDept.qc.toLocaleString("it-IT"));
  h+=ltRow(tr(e,"incentive","FORMULA"),T.qty_formula);
  h+=secPd(pdLabel,qty6,cu,true);
  h+="</div></div>";

  // Totale
  h+='</div>';
  var pctSal=(e.rl||e.ib||0)>0?(tot/(e.rl||e.ib||0)*100).toFixed(2):"0";
  h+='<div class="lt-total"><div>';
  h+='<div class="lt-total-label">'+(isP?T.max_bonus:T.seas_bonus)+'</div>';
  h+='<div class="lt-total-pct">'+pctSal+'% '+T.pct_salary+'</div>';
  h+='</div><div class="lt-total-val">'+fc(tot,cu)+'</div></div>';
  h+='<div class="lt-footer"><div style="white-space:pre-wrap">'+esc(getDiscl(e))+'</div></div>';
  h+='</div>';
  return h;
}

