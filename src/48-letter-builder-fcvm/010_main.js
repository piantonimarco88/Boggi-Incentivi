function buildFcVmLetter(emp){
  var isP=MODE==="preventivo";
  var cu=emp.cu||'EUR';
  var lang=emp.lang||'INGLESE';
  var r=calcFcVmPremio(emp.m);
  var TR={
    ITALIANO:{g:'Ciao',role:'FUNZIONE',matr:'MATRICOLA',cogn:'COGNOME',nome:'NOME',max:'PREMIO MASSIMALE',bdg_title:'PREMI SINGOLI NEGOZI (BDG)',bdg_store:'NEGOZIO',bdg_tgt:'TARGET EUR',bdg_cons:'CONSUNTIVO EUR',bdg_prize:'PREMIO',bdg_total:'TOTALE INCENTIVO',area:'LA TUA AREA',store:'NEGOZIO',tgt:'TARGET EUR',tot:'TOTALE AREA',sycy:'SY ANNO CORRENTE',syly:'SY ANNO PRECEDENTE',cons:'CONSUNTIVO EUR',pct_lbl:'% AREA',why_full:'Obiettivo pieno raggiunto: area ≥',why_partial:'Obiettivo ridotto: area ≥',why_partial_nosy:'Soglia raggiunta ma SY LY non disponibile',why_none:'Obiettivo non raggiunto: area <',esub_prev:'Esubero fatturato mese prec.',cons_tot:'Consuntivo totale',carry_over_title:'CARRY-OVER MESE PRECEDENTE',agg_manuale:'AGGIUNTA MANUALE',bdg_esub_col:'+Esub.',bdg_tot_col:'Tot.',prize:'INCENTIVO',full:'OBIETTIVO RAGGIUNTO',partial:'OBIETTIVO PARZIALMENTE RAGGIUNTO',none:'OBIETTIVO NON RAGGIUNTO',prev:'MASSIMO INCENTIVO RAGGIUNGIBILE',r1:'Premio pieno: area \u2265'+fPct(FCVM_PARAMS.soglia100)+' del target',r2:'Premio ridotto ('+fPct(FCVM_PARAMS.pct60)+'): area \u2265'+fPct(FCVM_PARAMS.soglia60)+' e SY anno corrente > anno precedente',discl:DISCL.ITALIANO||''},
    INGLESE:{g:'Hi',role:'FUNCTION',matr:'ID',cogn:'SURNAME',nome:'FIRST NAME',max:'MAXIMUM INCENTIVE',bdg_title:'INDIVIDUAL STORE INCENTIVE (BDG)',bdg_store:'STORE',bdg_tgt:'TARGET EUR',bdg_cons:'ACTUAL EUR',bdg_prize:'INCENTIVE',bdg_total:'TOTAL INCENTIVE',area:'YOUR AREA',store:'STORE',tgt:'TARGET EUR',tot:'AREA TOTAL',sycy:'SY CURRENT YEAR',syly:'SY LAST YEAR',cons:'ACTUAL EUR',pct_lbl:'% AREA',why_full:'Full target achieved: area ≥',why_partial:'Partial target: area ≥',why_partial_nosy:'Threshold reached but SY LY unavailable',why_none:'Target not achieved: area <',esub_prev:'Turnover carry-over prev. month',cons_tot:'Total Actual',carry_over_title:'CARRY-OVER PREVIOUS MONTH',agg_manuale:'MANUAL ADDITION',bdg_esub_col:'+Carry-over',bdg_tot_col:'Total',prize:'INCENTIVE',full:'TARGET ACHIEVED',partial:'TARGET PARTIALLY ACHIEVED',none:'TARGET NOT ACHIEVED',prev:'MAXIMUM ACHIEVABLE INCENTIVE',r1:'Full incentive: area \u2265'+fPct(FCVM_PARAMS.soglia100)+' of target',r2:'Partial incentive ('+fPct(FCVM_PARAMS.pct60)+'): area \u2265'+fPct(FCVM_PARAMS.soglia60)+' and SY improving vs prior year',discl:DISCL.INGLESE||''},
    FRANCESE:{g:'Bonjour',role:'FONCTION',matr:'MATRICULE',cogn:'NOM',nome:'PR\u00c9NOM',max:'PRIME MAXIMUM',bdg_title:'PRIMES MAGASINS INDIVIDUELS (BDG)',bdg_store:'MAGASIN',bdg_tgt:'OBJECTIF EUR',bdg_cons:'R\u00c9EL EUR',bdg_prize:'PRIME',bdg_total:'INCITATION TOTALE',area:'VOTRE ZONE',store:'MAGASIN',tgt:'OBJECTIF EUR',tot:'TOTAL ZONE',sycy:'SY ANN\u00c9E EN COURS',syly:'SY ANN\u00c9E DERNI\u00c8RE',cons:'RÉEL EUR',pct_lbl:'% ZONE',why_full:'Objectif atteint: zone ≥',why_partial:'Objectif partiel: zone ≥',why_partial_nosy:'Seuil atteint mais SY LY indisponible',why_none:'Objectif non atteint: zone <',esub_prev:'Report CA mois précédent',cons_tot:'Total Réel',carry_over_title:'REPORT MOIS PRÉCÉDENT',agg_manuale:'AJOUT MANUEL',bdg_esub_col:'+Report',bdg_tot_col:'Total',prize:'INCITATION',full:'OBJECTIF ATTEINT',partial:'OBJECTIF PARTIELLEMENT ATTEINT',none:'OBJECTIF NON ATTEINT',prev:'INCITATION MAXIMALE ATTEIGNABLE',r1:'Prime compl\u00e8te: zone \u2265'+fPct(FCVM_PARAMS.soglia100)+' de l\'objectif',r2:'Prime partielle ('+fPct(FCVM_PARAMS.pct60)+'): zone \u2265'+fPct(FCVM_PARAMS.soglia60)+' et SY en am\u00e9lioration',discl:DISCL.FRANCESE||''},
    TEDESCO:{g:'Hallo',role:'FUNKTION',matr:'PERSONALNR.',cogn:'NACHNAME',nome:'VORNAME',max:'MAXIMALER ANREIZ',bdg_title:'EINZELNE STORE-PR\u00c4MIEN (BDG)',bdg_store:'STORE',bdg_tgt:'ZIEL EUR',bdg_cons:'IST EUR',bdg_prize:'PR\u00c4MIE',bdg_total:'GESAMTANREIZ',area:'DEIN BEREICH',store:'STORE',tgt:'ZIEL EUR',tot:'BEREICH GESAMT',sycy:'SY AKTUELLES JAHR',syly:'SY VORJAHR',cons:'IST EUR',pct_lbl:'% BEREICH',why_full:'Ziel erreicht: Bereich ≥',why_partial:'Teilziel: Bereich ≥',why_partial_nosy:'Schwelle erreicht, SY Vorjahr nicht verf\u00fcgbar',why_none:'Ziel nicht erreicht: Bereich <',esub_prev:'Umsatz-\u00dcbertrag Vormonat',cons_tot:'Gesamt Ist',carry_over_title:'\u00dcBERTRAG VORMONAT',agg_manuale:'MANUELLER ZUSCHLAG',bdg_esub_col:'+\u00dcbertrag',bdg_tot_col:'Ges.',prize:'PR\u00c4MIE',full:'ZIEL ERREICHT',partial:'ZIEL TEILWEISE ERREICHT',none:'ZIEL NICHT ERREICHT',prev:'MAXIMAL ERREICHBARE PR\u00c4MIE',r1:'Voller Anreiz: Bereich \u2265'+fPct(FCVM_PARAMS.soglia100)+' des Ziels',r2:'Teilweiser Anreiz ('+fPct(FCVM_PARAMS.pct60)+'): Bereich \u2265'+fPct(FCVM_PARAMS.soglia60)+' und SY steigend',discl:DISCL.TEDESCO||''},
    SPAGNOLO:{g:'Hola',role:'FUNCI\u00d3N',matr:'MATR\u00cdCULA',cogn:'APELLIDO',nome:'NOMBRE',max:'INCENTIVO M\u00c1XIMO',bdg_title:'INCENTIVOS TIENDAS INDIVIDUALES (BDG)',bdg_store:'TIENDA',bdg_tgt:'OBJETIVO EUR',bdg_cons:'REAL EUR',bdg_prize:'INCENTIVO',bdg_total:'INCENTIVO TOTAL',area:'TU ZONA',store:'TIENDA',tgt:'OBJETIVO EUR',tot:'TOTAL ZONA',sycy:'SY A\u00d1O ACTUAL',syly:'SY A\u00d1O ANTERIOR',cons:'REAL EUR',pct_lbl:'% ZONA',why_full:'Objetivo alcanzado: zona ≥',why_partial:'Objetivo parcial: zona ≥',why_partial_nosy:'Umbral alcanzado, SY LY no disponible',why_none:'Objetivo no alcanzado: zona <',esub_prev:'Arrastre facturación mes anterior',cons_tot:'Total Real',carry_over_title:'ARRASTRE MES ANTERIOR',agg_manuale:'ADICI\u00d3N MANUAL',bdg_esub_col:'+Arrastre',bdg_tot_col:'Total',prize:'INCENTIVO',full:'OBJETIVO ALCANZADO',partial:'OBJETIVO PARCIALMENTE ALCANZADO',none:'OBJETIVO NO ALCANZADO',prev:'M\u00c1XIMO INCENTIVO ALCANZABLE',r1:'Premio completo: zona \u2265'+fPct(FCVM_PARAMS.soglia100)+' del objetivo',r2:'Premio parcial ('+fPct(FCVM_PARAMS.pct60)+'): zona \u2265'+fPct(FCVM_PARAMS.soglia60)+' y SY mejorando',discl:DISCL.SPAGNOLO||''}
  };
  var T=TR[lang]||TR.INGLESE;
  var ec={full:'#2d7a3a',partial:'#cf8b4e',none:'#cf5b5b',preventivo:'#c9a96e'}[r.esito]||'#6b6560';
  // partial_nosy (soglia raggiunta ma SY LY assente, premio 0) deve leggersi come
  // non raggiunto: riusa T.none \u2014 il box esito sotto resta comunque ambra (non rosso
  // pieno) e mostra il motivo specifico (whyStr), quindi il "perch\u00e9" non si perde.
  var el=isP?T.prev:({full:T.full,partial:T.partial,partial_nosy:T.none,none:T.none}[r.esito]||'\u2014');

  var h='<div class="lt">';

  // Header
  h+='<div class="lt-top"><div class="lt-logo">'+getBrandLogoImgFcvm(emp)+'</div>';
  h+='<div style="text-align:right"><div style="font-size:13px;color:#c9a96e;font-weight:700;letter-spacing:2px">FC + VM INCENTIVE PLAN</div>';
  h+='<div style="font-size:11px;color:#8a8680">'+MONTH_NAMES.IT[CFG_MONTH]+' '+CFG_YEAR+(isP?' \u2014 PREVENTIVO':'')+'</div></div></div>';

  // Greeting + info box
  h+='<div class="lt-body">';
  h+='<div class="lt-greeting">'+T.g+' '+esc(emp.n)+',</div>';
  h+='<div class="lt-info" style="grid-template-columns:1fr 1fr 1fr">';
  var maxBdgLetter=(emp.bdg_stores||[]).reduce(function(s,b){return s+b.ib;},0);
  var maxTotLetter=emp.ib+maxBdgLetter;
  [[T.matr||'MATRICOLA',String(emp.m)],[T.cogn||'COGNOME',emp.c],[T.nome||'NOME',emp.n],[T.role,emp.j==='FC'?'Field Coach':'Visual Merchandiser'],[T.max,fc(maxTotLetter,cu)]].forEach(function(p){
    h+='<div class="lt-info-item"><div class="lt-info-label">'+esc(p[0])+'</div><div class="lt-info-val">'+esc(p[1])+'</div></div>';
  });
  h+='</div>';

  // Regole incentivo
  h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:10px;color:#4e4b48">';
  h+='<div style="font-weight:700;color:#2c2925;margin-bottom:6px;font-size:11px">INCENTIVE RULES</div>';
  h+='<div style="margin-bottom:3px">\u2022 '+esc(T.r1)+'</div>';
  h+='<div>\u2022 '+esc(T.r2)+'</div></div>';

  // \u2500\u2500 SAS \u2192 fatturato (da Luglio 2026): stesso blocco del negozio mensile
  // (sasLetterBlock), con evidenza cella matrice + acc/vel/valore grezzo,
  // ma soglia "raggiunto" propria di FC+VM (soglia100, non quella BDG mensile) \u2500\u2500
  if(typeof sasNewActive==='function'&&sasNewActive()){
    var _areaInfo=null;
    if(!isP){
      _areaInfo={
        active:true,
        base:(r.totConsPreSas||0)+(r.totEsubero||0),
        to:r.totTarget,
        recognized:r.totSasRec||0,
        reserveIn:r.totSasReserveIn||0,
        used:r.totSasUsed||0,
        reserveOut:r.totSasReserveOut||0,
        num:r.totConsWithEsub,
        pct:r.totTarget>0?r.totConsWithEsub/r.totTarget:0,
        pctMatrix:r.sasAreaPctMatrix,
        acc:r.sasAreaAcc,
        vel:r.sasAreaVel,
        sasv:r.sasAreaValRaw||0
      };
    }
    h+=sasLetterBlock(lang,_areaInfo,isP,'EUR',FCVM_PARAMS.soglia100,true);
  }

  var syLyVal=r.syLyArea;
  if(syLyVal!==null||(!isP&&r.syAreaCy!=null)||isP){
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">';
    // SY CY — in preventivo mostra —, in consuntivo mostra valore reale
    var syCyVal=isP?null:r.syAreaCy;
    var syCyColor=syCyVal==null?'#a09a92':(r.syOk===true?'#2d7a3a':'#cf5b5b');
    h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:6px;padding:12px 16px">';
    h+='<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a09a92;margin-bottom:4px">'+T.sycy+'</div>';
    h+='<div style="font-size:20px;font-weight:800;color:'+syCyColor+'">'+(syCyVal!=null?fDec(syCyVal,2):'\u2014')+'</div>';
    h+='</div>';
    // SY LY — dato reale da FC_SYLY (sales_ly/footfall_ly aggregato area)
    h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:6px;padding:12px 16px">';
    h+='<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a09a92;margin-bottom:4px">'+T.syly+'</div>';
    h+='<div style="font-size:20px;font-weight:800;color:#2c2925">'+(syLyVal!=null?fDec(syLyVal,2):'\u2014')+'</div>';
    h+='</div></div>';
  }
  // ── TABELLA NEGOZI (store_id + nome store + target EUR) ──────────────────
  if(r.stores&&r.stores.length>0){
  h+='<div class="lt-kpi" style="margin-top:16px">';
  var gridCols=isP?'80px 1fr 140px':'80px 1fr 140px 140px 80px';
  h+='<div class="lt-kpi-head" style="background:#2c2925;color:#c9a96e;grid-template-columns:'+gridCols+';padding:8px 14px">';
  h+='<span>STORE ID</span><span>'+T.store+'</span><span style="text-align:right">'+T.tgt+'</span>';
  if(!isP)h+='<span style="text-align:right">'+(T.cons||'ACTUAL EUR')+'</span><span style="text-align:right">'+(T.pct_lbl||'%')+'</span>';
  h+='</div>';

  r.stores.forEach(function(s,i){
    var sid=String(s.sid);
    var mapEntry=FC_MAP[sid]||{};
    var sname=mapEntry.s||sid;
    var bg=i%2===0?'#fff':'#faf9f7';
    var stCn=isP?s.to:(FC_RESULTS[sid]?FC_RESULTS[sid].sc_eur||0:0); // SAS ora è a livello area, non più per-negozio (vedi box area sotto)
    var stPct=s.to>0?stCn/s.to:null;
    var stPctColor=stPct===null?'#a09a92':stPct>=FCVM_PARAMS.soglia100?'#2d7a3a':stPct>=FCVM_PARAMS.soglia60?'#c9a96e':'#cf5b5b';
    h+='<div class="lt-kpi-row" style="grid-template-columns:'+gridCols+';background:'+bg+'">';
    h+='<span style="font-size:10px;color:#8a8680;font-family:monospace">'+esc(sid)+'</span>';
    h+='<span style="font-size:10px;font-weight:600">'+esc(sname)+'</span>';
    h+='<span style="text-align:right;font-size:10px">'+fc(s.to,'EUR')+'</span>';
    if(!isP){
      h+='<span style="text-align:right;font-size:10px;font-weight:600">'+fc(stCn,'EUR')+'</span>';
      h+='<span style="text-align:right;font-size:10px;font-weight:700;color:'+stPctColor+'">'+(stPct!==null?fPct(stPct):'—')+'</span>';
    }
    h+='</div>';
  });

  // Riga totale area
  h+='<div style="padding:8px 14px;background:#3d3a36;display:grid;grid-template-columns:'+gridCols+';align-items:center">';
  h+='<span></span>';
  h+='<span style="font-size:10px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:1px">'+T.tot+'</span>';
  h+='<span style="text-align:right;font-size:12px;font-weight:800;color:#c9a96e">'+fc(r.totTarget,'EUR')+'</span>';
  if(!isP){
    var areaPct=r.totTarget>0?r.totCons/r.totTarget:null;
    var areaPctColor=areaPct===null?'#a09a92':areaPct>=FCVM_PARAMS.soglia100?'#5bb98c':areaPct>=FCVM_PARAMS.soglia60?'#c9a96e':'#e07b4e';
    h+='<span style="text-align:right;font-size:12px;font-weight:800;color:#f5f4f1">'+fc(r.totCons,'EUR')+'</span>';
    h+='<span style="text-align:right;font-size:13px;font-weight:800;color:'+areaPctColor+'">'+(areaPct!==null?fPct(areaPct):'—')+'</span>';
  }
  h+='</div></div>';
  } // end if(r.stores.length>0)

  // ── Carry-over mese precedente (area): fatturato E SAS insieme, così il
  // lettore vede entrambi gli "avanzi" riportati nello stesso posto invece
  // di doverli cercare in due box separati della lettera ──────────────────
  var _hasSasResIn=(r.totSasReserveIn||0)>0;
  if(!isP&&r.stores&&r.stores.length>0&&(r.totEsubero>0||_hasSasResIn)){
    h+='<div style="margin-top:10px;border:1px solid #c7d2fe;border-radius:6px;overflow:hidden">';
    h+='<div style="background:#3d4a6b;padding:6px 14px"><span style="font-size:9px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px">'+(T.carry_over_title||'CARRY-OVER PREVIOUS MONTH')+'</span></div>';
    h+='<div style="padding:8px 14px;background:#f8f9ff">';
    if(r.totEsubero>0)h+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:#8a8680">'+(T.esub_prev||'Carry-over prev. month')+'</span><span style="font-weight:600;color:#5b6abf">+'+fc(Math.round(r.totEsubero),'EUR')+'</span></div>';
    if(_hasSasResIn){
      var _slt=(typeof _SAS_LT!=='undefined'?(_SAS_LT[lang]||_SAS_LT.INGLESE):null);
      var _resInUsedCo=Math.min(r.totSasReserveIn||0,r.totSasUsed||0);
      var _resInExpCo=(r.totSasReserveIn||0)-_resInUsedCo;
      h+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:#8a8680">'+esc(_slt?_slt.resIn:'SAS reserve prev. month')+'</span><span style="font-weight:600;color:#a07d2c">'+fc(Math.round(r.totSasReserveIn),'EUR')+'</span></div>';
      if(_resInUsedCo>0)h+='<div style="display:flex;justify-content:space-between;font-size:10px;padding-left:10px;margin-bottom:2px"><span style="color:#a09a92">'+esc(_slt?_slt.resInUsed:'— of which used')+'</span><span style="color:#2d7a3a;font-weight:600">'+fc(Math.round(_resInUsedCo),'EUR')+'</span></div>';
      if(_resInExpCo>0)h+='<div style="display:flex;justify-content:space-between;font-size:10px;padding-left:10px;margin-bottom:4px"><span style="color:#a09a92">'+esc(_slt?_slt.resInExpired:'— of which expired')+'</span><span style="color:#cf5b5b;font-weight:600">'+fc(Math.round(_resInExpCo),'EUR')+'</span></div>';
    }
    h+='<div style="display:flex;justify-content:space-between;font-size:11px;border-top:1px solid #e5e1db;padding-top:4px"><span style="color:#2c2925;font-weight:700">'+(T.cons_tot||'Total Actual')+'</span><span style="font-weight:800;color:#2c2925">'+fc(Math.round(r.totConsWithEsub),'EUR')+'</span></div>';
    h+='</div></div>';
  }

  // ── SY BOX (dato reale aggregato — no medie) ──────────────────────────────
  // syLyArea = totSalesLy/totFootfallLy aggregato sull'area (da FC_SYLY)
  // ── Box esito (solo consuntivo) ────────────────────────────────────────
  if(!isP&&r.stores&&r.stores.length>0){
    var esitoColor={full:'#2d7a3a',partial:'#cf8b4e',partial_nosy:'#856404',none:'#cf5b5b'}[r.esito]||'#6b6560';
    var pctStr=r.totTarget>0?fPct(r.pct):'—';
    var whyStr='';
    // Le stringhe why_* finiscono già con il simbolo (≥/<) — niente da riaggiungere
    // qui, altrimenti si duplica (bug visto in test: "area < < 95,00%").
    if(r.esito==='full'){
      whyStr=esc((T.why_full||'Full target ≥')+fPct(FCVM_PARAMS.soglia100)+' ('+pctStr+')');
    } else if(r.esito==='partial'){
      var syLyStr=r.syLyArea!=null?fDec(r.syLyArea,2):'—';
      var syCyStr=r.syAreaCy!=null?fDec(r.syAreaCy,2):'—';
      whyStr=esc((T.why_partial||'Partial target ≥')+fPct(FCVM_PARAMS.soglia60)+' ('+pctStr+') — SY CY ('+syCyStr+') > SY LY ('+syLyStr+')');
    } else if(r.esito==='partial_nosy'){
      whyStr=esc((T.why_partial_nosy||'Threshold reached, SY LY unavailable')+' ('+pctStr+')');
    } else if(r.esito==='none'){
      whyStr=esc((T.why_none||'Target not achieved <')+fPct(FCVM_PARAMS.soglia60)+' ('+pctStr+')');
    }
    var pctPremio=r.esito==='full'?'100%':r.esito==='partial'?fPct(FCVM_PARAMS.pct60):r.esito==='partial_nosy'?'0%':'0%';
    h+='<div style="margin-top:14px;border:1px solid '+esitoColor+';border-radius:6px;overflow:hidden">';
    h+='<div style="background:'+esitoColor+';padding:8px 16px;display:flex;justify-content:space-between;align-items:center">';
    h+='<span style="font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px">'+el+'</span>';
    h+='<span style="font-size:13px;font-weight:800;color:#fff">'+pctPremio+' '+fc(r.premio,cu)+'</span>';
    h+='</div>';
    if(whyStr)h+='<div style="padding:8px 16px;font-size:10px;color:#4e4b48;background:#faf9f7;line-height:1.6">'+whyStr+'</div>';
    h+='</div>';
  }

  // ── Sezione BDG (solo se VM con negozi singoli) ──────────────────
  if(r.hasBdg){
    var hasBdgEsub=!isP&&r.bdgDetail.some(function(b){return b.esubero>0;});
    var gridBdg=isP?'1fr 120px 100px':(hasBdgEsub?'1fr 110px 90px 80px 80px 100px':'1fr 120px 120px 80px 100px');
    h+='<div style="margin-top:14px;border:1px solid #c7d2fe;border-radius:6px;overflow:hidden">';
    h+='<div style="background:#3d4a6b;padding:8px 14px"><span style="font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px">'+(T.bdg_title||'INDIVIDUAL STORE INCENTIVE')+'</span></div>';
    h+='<div style="padding:0">';
    // Header
    h+='<div style="display:grid;grid-template-columns:'+gridBdg+';background:#5b6abf;padding:6px 14px">';
    h+='<span style="font-size:9px;font-weight:700;color:#fff">'+(T.bdg_store||'STORE')+'</span>';
    h+='<span style="text-align:right;font-size:9px;font-weight:700;color:#fff">'+(T.bdg_tgt||'TARGET EUR')+'</span>';
    if(!isP){
      h+='<span style="text-align:right;font-size:9px;font-weight:700;color:#fff">'+(T.bdg_cons||'ACTUAL EUR')+'</span>';
      if(hasBdgEsub)h+='<span style="text-align:right;font-size:9px;font-weight:700;color:#c7d2fe">'+(T.bdg_esub_col||'+Esub.')+'</span><span style="text-align:right;font-size:9px;font-weight:700;color:#c7d2fe">'+(T.bdg_tot_col||'Tot.')+'</span>';
      h+='<span style="text-align:center;font-size:9px;font-weight:700;color:#fff">OK?</span>';
    }
    h+='<span style="text-align:right;font-size:9px;font-weight:700;color:#fff">'+(T.bdg_prize||'INCENTIVE')+'</span>';
    h+='</div>';
    // Righe negozi BDG
    r.bdgDetail.forEach(function(b,i){
      var bg=i%2===0?'#f8f9ff':'#fff';
      var earnedColor=isP?'#5b6abf':(b.earned?'#2d7a3a':'#cf5b5b');
      h+='<div style="display:grid;grid-template-columns:'+gridBdg+';padding:5px 14px;background:'+bg+';border-bottom:1px solid #e5e1db">';
      h+='<span style="font-size:10px;font-weight:600">'+esc(b.s||b.sid)+'</span>';
      h+='<span style="text-align:right;font-size:10px">'+fc(b.to,'EUR')+'</span>';
      if(!isP){
        h+='<span style="text-align:right;font-size:10px">'+fc(b.sc,'EUR')+'</span>';
        if(hasBdgEsub){
          h+='<span style="text-align:right;font-size:10px;color:#5b6abf">'+(b.esubero>0?'+'+fc(Math.round(b.esubero),'EUR'):'—')+'</span>';
          h+='<span style="text-align:right;font-size:10px;font-weight:700">'+fc(Math.round(b.scTotale),'EUR')+'</span>';
        }
        h+='<span style="text-align:center;font-size:12px">'+(b.earned?'<span style="color:#2d7a3a">&#10003;</span>':'<span style="color:#cf5b5b">&#10005;</span>')+'</span>';
      }
      h+='<span style="text-align:right;font-size:10px;font-weight:700;color:'+earnedColor+'">'+fc(b.prize,cu)+'</span>';
      h+='</div>';
    });
    // Totale BDG
    h+='<div style="display:grid;grid-template-columns:'+gridBdg+';padding:6px 14px;background:#3d4a6b">';
    h+='<span style="font-size:10px;font-weight:700;color:#c7d2fe">SUBTOTAL BDG</span>';
    h+='<span></span>';
    if(!isP)h+='<span></span><span></span>';
    h+='<span style="text-align:right;font-size:11px;font-weight:800;color:#fff">'+fc(r.bdgPrize,cu)+'</span>';
    h+='</div></div></div>';
  }
  h+='</div>'; // close lt-body

  // ── BARRA FINALE: una sola riga premio ───────────────────────────────────
    // Aggiunta manuale
  var aggManuale=AGG_FCVM[emp.m]||0;
  if(aggManuale>0){
    h+='<div style="padding:8px 32px;display:flex;justify-content:space-between;align-items:center;background:#fef9ef;border-top:1px solid #e5d9b6">';
    h+='<span style="font-size:10px;color:#856404;font-weight:600">'+(T.agg_manuale||'MANUAL ADDITION')+'</span>';
    h+='<span style="font-size:12px;font-weight:700;color:#c9a96e">+'+fc(aggManuale,cu)+'</span>';
    h+='</div>';
  }
h+='<div class="lt-total">';
  h+='<div class="lt-total-label">'+(isP?(T.max||'MAXIMUM INCENTIVE'):(r.hasBdg?(T.bdg_total||'TOTAL INCENTIVE'):T.prize))+'</div>';
  h+='<div class="lt-total-val" style="color:#c9a96e">'+fc(isP?maxTotLetter+aggManuale:(r.hasBdg?r.totalPremioLC:r.premio)+aggManuale,cu)+'</div>';
  h+='</div>';

  // Footer disclaimer
  h+='<div class="lt-footer">'+esc(T.discl)+'</div>';
  h+='</div>'; // close .lt
  return h;
}

// ── Tab Analisi ───────────────────────────────────────────────
