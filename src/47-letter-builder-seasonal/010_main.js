function buildSeasonalLetterAuto(e){
  if(SEASON_PERIOD==="mid") return buildMidSeasonLetter(e);
  return isD(e.si)?buildSeasonalDeptLetter(e):buildSeasonalLetter(e);
}

function buildMidSeasonLetter(e){
  var cu=e.cu||"EUR";
  var isP=MODE==="preventivo";
  var rlSem=(e.rl||0)*6;
  var base=rlSem*SEAS_CFG.basePct;           // RML×6×20%
  var midBase=Math.round(base*0.30*100)/100; // 30% del max KPI semestrale
  var kpiSet=seasGetKpiSet(e);
  var auto=isP?null:seasAutoData(e);
  var lang=trLang(e);
  var T=SEAS_TR[lang]||SEAS_TR["INGLESE"];
  var gr=(T.greeting||{})[lang]||"Hi";
  var stagione=CFG_SEASON+String(CFG_YEAR).slice(-2);

  // KPI score e valori
  var kpiScoreMax=0;
  kpiSet.forEach(function(kdef){
    if(!seasKpiActive(kdef.k,e))return;
    kpiScoreMax+=kdef.weight;
  });
  var midMax=Math.round(base*0.30*kpiScoreMax*100)/100; // max erogabile mid

  // Sbarramento (solo consuntivo)
  var sbarOk=true;
  var fatOk=true, crOk=true;
  var fatScost=0, crActual=null, crTarget=null;
  if(!isP&&auto){
    fatScost=auto.scost||0;
    fatOk=(fatScost>=0);
    crTarget=auto.cr_target;
    crActual=auto.cr_actual;
    var crOk=true;
    if(crTarget!==null&&crActual!==null) crOk=(crActual>=crTarget);
    sbarOk=fatOk&&crOk;
  }

  // KPI earned (solo se sbarramento ok)
  var kpiEarned=0;
  if(isP){
    kpiEarned=midMax; // preventivo = tutto a target
  } else if(sbarOk){
    kpiSet.forEach(function(kdef){
      if(!seasKpiActive(kdef.k,e))return;
      if(seasIsKpiAchieved(kdef,auto)) kpiEarned+=Math.round(base*0.30*kdef.weight*100)/100;
    });
    kpiEarned=Math.round(kpiEarned*100)/100;
  }

  // --- HTML ---
  var h='<div class="lt">';

  // Header
  h+='<div class="lt-top"><div class="lt-logo">'+getBrandLogoImg(e.si)+'</div>';
  h+='<div style="text-align:right">';
  h+='<div style="font-size:13px;color:#c9a96e;font-weight:700;letter-spacing:2px">MID-SEASON INCENTIVE</div>';
  if(isP) h+='<div style="font-size:9px;color:#c9a96e;font-weight:700;margin-top:2px">'+T.forecast+'</div>';
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
    [T.kpi_max, fc(e.rl||0,cu)+' \u00d7 6 \u00d7 20% = '+fc(Math.round(base*100)/100,cu)]
  ];
  infoFields.forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(String(p[1]))+'</div></div>';
  });
  // === Traduzioni mid-season per riga ===
  var MID_TR={
    "ITALIANO":{midMax:"MID-SEASON MAX (30%)",gate:"SBARRAMENTO",status:"STATUS",storeBudget:"Budget Negozio",convRate:"Conversion Rate",passed:"\u2713 SUPERATO \u2014 Premio confermato",failed:"\u2717 NON SUPERATO \u2014 Premio azzerato",checkCons:"Verificato a consuntivo",gateOk:"Sbarramento superato",gateKo:"Sbarramento non superato"},
    "INGLESE":{midMax:"MID-SEASON MAX (30%)",gate:"GATE",status:"STATUS",storeBudget:"Store Budget",convRate:"Conversion Rate",passed:"\u2713 PASSED \u2014 Bonus confirmed",failed:"\u2717 NOT PASSED \u2014 Bonus zeroed",checkCons:"Verified at year-end",gateOk:"Gate passed",gateKo:"Gate not passed"},
    "FRANCESE":{midMax:"MID-SEASON MAX (30%)",gate:"SEUIL",status:"STATUT",storeBudget:"Budget Magasin",convRate:"Taux de Conversion",passed:"\u2713 ATTEINT \u2014 Prime confirm\u00e9e",failed:"\u2717 NON ATTEINT \u2014 Prime annul\u00e9e",checkCons:"V\u00e9rifi\u00e9 au consuntivo",gateOk:"Seuil atteint",gateKo:"Seuil non atteint"},
    "TEDESCO":{midMax:"MID-SEASON MAX (30%)",gate:"SCHWELLE",status:"STATUS",storeBudget:"Store-Budget",convRate:"Conversion Rate",passed:"\u2713 ERREICHT \u2014 Pr\u00e4mie best\u00e4tigt",failed:"\u2717 NICHT ERREICHT \u2014 Pr\u00e4mie auf null",checkCons:"Bei Jahresabschluss gepr\u00fcft",gateOk:"Schwelle erreicht",gateKo:"Schwelle nicht erreicht"},
    "SPAGNOLO":{midMax:"MID-SEASON MAX (30%)",gate:"BARRERA",status:"ESTADO",storeBudget:"Presupuesto Tienda",convRate:"Tasa de Conversi\u00f3n",passed:"\u2713 SUPERADO \u2014 Premio confirmado",failed:"\u2717 NO SUPERADO \u2014 Premio anulado",checkCons:"Verificado en consuntivo",gateOk:"Barrera superada",gateKo:"Barrera no superada"}
  };
  var M=MID_TR[lang]||MID_TR["INGLESE"];
  h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(M.midMax)+'</div>';
  h+='<div class="lt-info-val" style="color:#c9a96e;font-weight:800">'+fc(Math.round(base*100)/100,cu)+' \u00d7 30% = '+fc(midMax,cu)+'</div></div>';
  h+='</div>';

  // ── SEZIONE KPI ──
  var kpiCols=isP?'1fr 80px 80px 90px':'1fr 80px 80px 80px 80px 90px';
  h+='<div class="lt-kpi" style="margin-top:20px">';
  h+='<div class="lt-kpi-head" style="background:#2c2925;color:#c9a96e;grid-template-columns:'+kpiCols+';padding:8px 14px">'+
     '<span>'+T.kpi_section+'</span><span style="text-align:right">'+T.target+'</span><span style="text-align:right">'+T.weight+'</span>'+
     (isP?'':'<span style="text-align:right">'+T.result+'</span><span style="text-align:right">'+T.var_pct+'</span>')+
     '<span style="text-align:right">'+T.incentive+'</span></div>';

  var sid=String(e.si);
  var cn2=D.cs&&D.cs[sid]?D.cs[sid]:{};
  var stg2=SEAS_TARGETS&&SEAS_TARGETS[sid]?SEAS_TARGETS[sid]:{};

  kpiSet.forEach(function(kdef){
    if(kdef.weight===0)return;
    var achieved=isP||(sbarOk&&seasIsKpiAchieved(kdef,auto));
    var kpiAmt=Math.round(base*0.30*kdef.weight*100)/100;
    var earnedAmt=achieved?kpiAmt:0;
    var kpiLabel=({sy:T.sy_label,sr:T.sr_label,sas:T.sas_label,acc:T.acc_label})[kdef.k]||kdef.label;

    var sid=String(e.si);
    var stgLet=SEAS_TARGETS&&SEAS_TARGETS[sid]?SEAS_TARGETS[sid]:{};
    // In preventivo leggi target da SEAS_TARGETS; in consuntivo usa auto
    var seas_sy=auto?auto.seas_sy:(stgLet.sy||0);
    var seas_pr=auto?auto.seas_pr:(stgLet.pr||0);
    var seas_sas=auto?auto.seas_sas:(stgLet.sas||SEAS_CFG.sasMaxHours||4);
    var risultatoStr="—", varPctStr="—";
    if(!isP){
      if(kdef.k==="sy"){var rv=cn2.sy!==undefined?fDec(cn2.sy,2):"—";risultatoStr=rv;varPctStr=seas_sy>0?fDec(((cn2.sy||0)/seas_sy-1)*100,1)+"%":"—";}
      else if(kdef.k==="sr"){var rv=cn2.nf!==undefined?fDec((cn2.nf*100),2)+"%":"—";risultatoStr=rv;varPctStr=seas_pr>0?fDec(((cn2.nf||0)/seas_pr-1)*100,1)+"%":"—";}
      else if(kdef.k==="sas"){var sasH=cn2.s4!==undefined?cn2.s4:null;risultatoStr=sasH!==null?fDec(sasH,1)+'h':'—';varPctStr=sasH!==null?(sasH<seas_sas?'\u2713':'\u2717'):'—';}
      else if(kdef.k==="acc"){var rv=cn2.av!==undefined&&cn2.av!==null?fDec((cn2.av*100),2)+"%":"—";var sacc=auto?auto.seas_acc:0.99;risultatoStr=rv;varPctStr=cn2.av!=null?fDec((cn2.av/sacc-1)*100,1)+"%":"—";}
    }

    var targetStr=({sy:fDec(stg2.sy||0,2),sr:fDec((stg2.pr||0)*100,2)+"%",sas:"< "+fDec(seas_sas,0)+"h",acc:"99%"})[kdef.k]||"—";

    h+='<div class="lt-kpi-row" style="grid-template-columns:'+kpiCols+';background:'+(achieved?"#f0fbf5":"#fff")+'">';
    h+='<span style="font-weight:600;color:#2c2925">'+esc(kpiLabel)+'</span>';
    h+='<span style="text-align:right;font-size:10px;color:#6b6560">'+targetStr+'</span>';
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
  h+='<span style="font-size:16px;font-weight:800;color:#c9a96e">'+fc(kpiEarned,cu)+'</span>';
  h+='</div>';
  h+='</div>'; // close lt-kpi

  // ── SEZIONE SBARRAMENTO ──
  var sbarCols=isP?'1fr 100px 80px':'1fr 100px 100px 60px 80px';
  h+='<div class="lt-kpi" style="margin-top:16px">';
  h+='<div class="lt-kpi-head" style="background:#2c2925;color:#c9a96e;grid-template-columns:'+sbarCols+';padding:8px 14px">'+
     '<span>'+esc(M.gate)+'</span><span style="text-align:right">'+T.target+'</span>'+
     (isP?'':'<span style="text-align:right">'+T.result+'</span><span style="text-align:right">'+T.var_pct+'</span>')+
     '<span style="text-align:right">'+esc(M.status)+'</span></div>';

  // Riga Fatturato
  var storeTgt=stg2.to||0;
  var storeCons=(cn2.sc||0);
  var storeVarPct=storeTgt>0?((storeCons/storeTgt-1)*100):0;
  h+='<div class="lt-kpi-row" style="grid-template-columns:'+sbarCols+'">';
  h+='<span style="font-weight:600">'+esc(M.storeBudget)+'</span>';
  h+='<span style="text-align:right;font-size:10px;color:#6b6560">'+(isP?(storeTgt>0?fc(storeTgt,cu):T.target):fc(storeTgt,cu))+'</span>';
  if(!isP){
    h+='<span style="text-align:right;font-size:10px;color:#2c2925">'+fc(storeCons,cu)+'</span>';
    h+='<span style="text-align:right;font-size:10px;font-weight:700;color:'+(fatOk?'#2d7a3a':'#cf5b5b')+'">'+fDec(storeVarPct,2)+'%</span>';
  }
  h+='<span style="text-align:right;font-size:16px;font-weight:800;color:'+(isP?'#a09a92':fatOk?'#2d7a3a':'#cf5b5b')+'">'+(isP?'—':fatOk?'\u2713':'\u2717')+'</span>';
  h+='</div>';

  // Riga CR
  var crTgt=crTarget!==null?crTarget:(stg2.cr||null);
  var crRes=crActual!==null?crActual:(cn2.cr||null);
  h+='<div class="lt-kpi-row" style="grid-template-columns:'+sbarCols+';background:#faf9f7">';
  h+='<span style="font-weight:600">'+esc(M.convRate)+'</span>';
  h+='<span style="text-align:right;font-size:10px;color:#6b6560">'+(crTgt!==null?fDec(crTgt*100,2)+'%':(isP?T.target:'—'))+'</span>';
  if(!isP){
    h+='<span style="text-align:right;font-size:10px;color:#2c2925">'+(crRes!==null?fDec(crRes*100,2)+'%':'—')+'</span>';
    var crVarPct=(crTgt&&crRes)?fDec((crRes/crTgt-1)*100,2)+'%':'—';
    h+='<span style="text-align:right;font-size:10px;font-weight:700;color:'+(crOk?'#2d7a3a':'#cf5b5b')+'">'+crVarPct+'</span>';
  }
  h+='<span style="text-align:right;font-size:16px;font-weight:800;color:'+(isP?'#a09a92':crOk?'#2d7a3a':'#cf5b5b')+'">'+(isP?'—':crOk?'\u2713':'\u2717')+'</span>';
  h+='</div>';

  h+='</div>';

  // Sbarramento result row
  h+='<div style="padding:8px 14px;background:'+(isP?'#3d3a36':sbarOk?'#2d7a3a':'#c0392b')+';display:flex;justify-content:space-between;align-items:center">';
  h+='<span style="font-size:10px;font-weight:700;color:#f5f4f1;text-transform:uppercase;letter-spacing:1px">'+esc(M.gate)+'</span>';
  if(isP){
    h+='<span style="font-size:12px;color:#a09a92">'+esc(M.checkCons)+'</span>';
  } else {
    h+='<span style="font-size:14px;font-weight:800;color:#fff">'+esc(sbarOk?M.passed:M.failed)+'</span>';
  }
  h+='</div>';
  // (Bugfix v8.39: rimosso un </div> extra che chiudeva prematuramente .lt-body
  //  facendo finire .lt-total e .lt-footer FUORI dal contenitore .lt \u2192 overflow visivo.)

  h+='</div>'; // close lt-body

  // Total bar
  h+='<div class="lt-total">';
  h+='<div><div class="lt-total-label">'+(isP?(T.mid_potential||'MID-SEASON POTENTIAL'):(T.mid_earned||'MID-SEASON EARNED'))+'</div>';
  if(!isP) h+='<div class="lt-total-pct">'+esc(sbarOk?M.gateOk:M.gateKo)+'</div>';
  h+='</div>';
  h+='<div class="lt-total-val">'+fc(kpiEarned,cu)+'</div>';
  h+='</div>';

  // Footer
  h+='<div class="lt-footer"><div style="white-space:pre-wrap;word-wrap:break-word">'+esc(getDiscl(e))+'</div></div>';
  h+='</div>'; // close .lt
  return h;
}
