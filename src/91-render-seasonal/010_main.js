function rCSeasMid(){
  var isP=MODE==="preventivo";
  var smvsm=E.filter(function(e){return isSMVSM(e);});
  smvsm.sort(function(a,b){
    var sa=Number(a.si)||0,sb=Number(b.si)||0;
    if(sa!==sb)return sa-sb;
    return (a.m||'').localeCompare(b.m||'');
  });

  // Apply filters
  var fl=smvsm.filter(function(e){
    if(_seasF.s!=='ALL'&&e.s!==_seasF.s)return false;
    if(_seasF.j!=='ALL'&&(e.f||e.j)!==_seasF.j)return false;
    if(_seasF.q){var q=_seasF.q.toLowerCase();
      return(e.c&&e.c.toLowerCase().indexOf(q)>=0)||(e.n&&e.n.toLowerCase().indexOf(q)>=0)||(e.m&&e.m.toLowerCase().indexOf(q)>=0)||(e.s&&e.s.toLowerCase().indexOf(q)>=0);}
    return true;
  });

  var grandTotal=0;
  smvsm.forEach(function(e){
    if(SEAS[e.m]&&SEAS[e.m].excluded)return;
    grandTotal+=calcMidSeason(e)*(e.ex||1);
  });

  var uSeas=['ALL'],uSeasJ=['ALL'];
  smvsm.forEach(function(e){
    if(uSeas.indexOf(e.s)<0)uSeas.push(e.s);
    var jj=e.f||e.j;if(uSeasJ.indexOf(jj)<0)uSeasJ.push(jj);
  });

  var h='<button class="exp-btn" onclick="exportMidSeasonExcel()" style="font-size:10px;padding:4px 12px;margin-bottom:8px">&#128202; Export Excel</button>';
  h+='<div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;margin-left:8px;padding:5px 12px;background:#fff3cd;border:1px solid #c9a96e;border-radius:6px;font-size:10px;color:#856404;font-weight:600">&#128197; MID-SEASON &mdash; Premio anticipato 3 mesi &mdash; 30% max KPI &mdash; Nessun boost inventario</div>';

  h+='<div class="flt"><input placeholder="Cerca..." id="seasQ" value="'+esc(_seasF.q)+'">';
  h+='<select id="seasJ">';
  uSeasJ.forEach(function(j){h+='<option value="'+esc(j)+'"'+(_seasF.j===j?' selected':'')+'>'+(j==='ALL'?'Tutti i ruoli':esc(j))+'</option>';});
  h+='</select><select id="seasS">';
  uSeas.forEach(function(s){h+='<option value="'+esc(s)+'"'+(_seasF.s===s?' selected':'')+'>'+(s==='ALL'?'Tutti i negozi':esc(s))+'</option>';});
  h+='</select>';
  h+='<span style="font-size:11px;color:#8a8680">'+fl.length+' SM/VSM &middot; Tot mid-season: <b style="color:#c9a96e">'+fc(grandTotal,'EUR')+'</b></span></div>';

  // KPI set (senza inventario — acc non escluso per ora)
  var kpiCols=SEAS_CFG.kpi.filter(function(kd){return kd.weight>0;});

  h+='<div class="scroll-wrap"><table id="stbl"><thead><tr>';
  h+='<th data-col="m">Matr.</th>';
  h+='<th data-col="c">Cognome</th>';
  h+='<th data-col="n">Nome</th>';
  h+='<th data-col="s">Negozio</th>';
  h+='<th style="text-align:center">Ruolo</th>';
  // Sbarramento columns
  h+='<th style="text-align:center;white-space:nowrap;color:#c9a96e">Sbarra.<br><span style="font-weight:400;font-size:9px">Fat+CR</span></th>';
  // KPI columns
  kpiCols.forEach(function(kdef){
    h+='<th style="text-align:center;white-space:nowrap">'+esc(kdef.label.split(' ')[0])+'<br><span style="font-weight:400;font-size:9px">'+Math.round(kdef.weight*100)+'%</span></th>';
  });
  h+='<th class="r" style="white-space:nowrap">MAX 30%<br><span style="font-weight:400;font-size:9px">no boost</span></th>';
  h+='<th class="r" style="color:#c9a96e">MID-SEASON</th>';
  h+='<th class="r" style="color:#5b6abf">TOT &euro;</th>';
  h+='<th style="cursor:default">Escl.</th>';
  h+='</tr></thead><tbody>';

  fl.forEach(function(e){
    var s=SEAS[e.m]||{};
    var cu=e.cu||'EUR',ex=e.ex||1;
    var excl=s.excluded||false;
    var sf=STORE_FLAGS[String(e.si)]||{};

    var midVal=excl?0:calcMidSeason(e);
    var midMax=(function(){
      // max preventivo per questa riga
      var rlSem=(e.rl||0)*6;
      var base=rlSem*SEAS_CFG.basePct;
      var kpiSet=seasGetKpiSet(e);
      var w=0;kpiSet.forEach(function(kd){if(seasKpiActive(kd.k,e))w+=kd.weight;});
      return Math.round(base*0.30*w*100)/100;
    })();

    // Sbarramento info (solo consuntivo)
    var sbarOk=true, sbarTxt='';
    if(!isP){
      var auto=seasAutoData(e);
      var fatOk=auto.scost>=0;
      var crOk2=true;
      var crT=auto.cr_target, crA=auto.cr_actual;
      if(crT!==null&&crA!==null) crOk2=(crA>=crT);
      sbarOk=fatOk&&crOk2;
      sbarTxt=(fatOk?'&#10003;':'&#10007;')+' Fat &nbsp;'+(crOk2?'&#10003;':'&#10007;')+' CR';
    }

    h+='<tr class="ck" style="opacity:'+(excl?'0.4':'1')+'" data-sm="'+esc(e.m)+'">';
    h+='<td class="mn">'+esc(e.m)+'</td>';
    h+='<td>'+esc(e.c)+'</td>';
    h+='<td>'+esc(e.n)+'</td>';
    h+='<td style="font-size:10px;color:#8a8680">'+esc(e.s)+'</td>';
    h+='<td style="text-align:center"><span class="bg '+(sf.dept?'bg-d':'bg-n')+'" title="'+esc(e.j)+'">'+esc(e.f||e.j)+'</span></td>';

    // Sbarramento cell
    if(isP){
      h+='<td style="text-align:center;font-size:10px;color:#a09a92">— prev.</td>';
    } else {
      h+='<td style="text-align:center;font-size:10px;font-weight:700;color:'+(sbarOk?'#2d7a3a':'#cf5b5b')+'">'+sbarTxt+'</td>';
    }

    // KPI cells
    var auto2=isP?null:seasAutoData(e);
    kpiCols.forEach(function(kdef){
      var active=seasKpiActive(kdef.k,e);
      if(!active){h+='<td class="r mn gy">&mdash;</td>';return;}
      if(isP){h+='<td style="text-align:center" class="g b">&#10003;</td>';return;}
      var achieved=sbarOk&&seasIsKpiAchieved(kdef,auto2);
      var pctVal=(auto2&&auto2[kdef.k+'_pct']!==undefined)?auto2[kdef.k+'_pct']:0;
      h+='<td style="text-align:center">';
      h+='<div class="b" style="color:'+(achieved?'#2d7a3a':'#cf5b5b')+'">'+(achieved?'&#10003;':'&#10007;')+'</div>';
      h+='<div style="font-size:9px;color:#8a8680">'+pctVal.toFixed(1)+'%</div>';
      h+='</td>';
    });

    h+='<td class="r mn gy">'+fc(midMax,cu)+'</td>';
    h+='<td class="r mn b" style="color:'+(midVal>0?'#2c2925':'#b0a99f')+'">'+fc(midVal,cu)+'</td>';
    h+='<td class="r mn" style="color:#5b6abf">'+fc(Math.round(midVal*ex*100)/100,'EUR')+'</td>';
    h+='<td style="text-align:center"><button class="tb '+(excl?'x':'o')+' seas-excl" data-sm="'+esc(e.m)+'" style="width:28px;height:16px" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    h+='</tr>';
  });

  h+='</tbody></table></div>';
  h+='<div style="margin-top:12px;padding:12px 16px;background:#2c2925;border-radius:6px;display:flex;justify-content:space-between;align-items:center">';
  h+='<div style="font-size:9px;color:#a09a92;text-transform:uppercase;letter-spacing:2px">Totale Mid-Season'+(isP?' (Max)':'')+'</div>';
  h+='<div style="font-size:20px;font-weight:800;color:#c9a96e">'+fc(grandTotal,'EUR')+'</div>';
  h+='</div>';

  document.getElementById('p0').innerHTML=h;

  var qEl=document.getElementById('seasQ');
  if(qEl){qEl.oninput=function(){_seasF.q=this.value;var pos=this.selectionStart;rCSeasMid();var el2=document.getElementById('seasQ');if(el2){el2.focus();el2.selectionStart=el2.selectionEnd=pos;}};}
  var jEl=document.getElementById('seasJ');if(jEl){jEl.onchange=function(){_seasF.j=this.value;rCSeasMid();};}
  var sEl=document.getElementById('seasS');if(sEl){sEl.onchange=function(){_seasF.s=this.value;rCSeasMid();};}

  document.querySelectorAll('.seas-excl').forEach(function(btn){
    btn.onclick=function(ev){
      ev.stopPropagation();
      var m=btn.getAttribute('data-sm');
      if(!SEAS[m])SEAS[m]={};
      SEAS[m].excluded=!SEAS[m].excluded;
      autoSave();
      // Preserva posizione scroll
      var sw=document.querySelector(".scroll-wrap");
      var st=sw?sw.scrollTop:0;
      rCSeasMid();
      var sw2=document.querySelector(".scroll-wrap");
      if(sw2)sw2.scrollTop=st;
    };
  });
}

function exportMidSeasonExcel(){
  var isP=MODE==="preventivo";
  var smvsm=E.filter(function(e){return isSMVSM(e);});
  var stagione=CFG_SEASON+String(CFG_YEAR).slice(-2);
  var kpiCols=SEAS_CFG.kpi.filter(function(kd){return kd.weight>0;});

  // Build header
  var headers=["STAGIONE","STORE ID","NEGOZIO","MATRICOLA","COGNOME","NOME","RUOLO","VALUTA",
    "RML","RML x6","BASE PREMIO (RML×6×"+Math.round(SEAS_CFG.basePct*100)+"%)",
    "MAX MID-SEASON (30%)"];
  if(!isP){
    headers.push("SBARRAMENTO FAT OK","SCOSTAMENTO FAT%","SBARRAMENTO CR OK","CR CONSUNTIVO","CR TARGET");
  }
  kpiCols.forEach(function(kd){
    headers.push(kd.label.toUpperCase()+" (PESO "+Math.round(kd.weight*100)+"%)");
    if(!isP)headers.push(kd.label.toUpperCase()+" % RAGGIUNTO");
  });
  headers.push("KPI SCORE","MID-SEASON LC","MID-SEASON EUR","ESCLUSO");

  var rows=[headers];
  smvsm.forEach(function(e){
    var rlSem=(e.rl||0)*6;
    var base=Math.round(rlSem*SEAS_CFG.basePct*100)/100;
    var kpiSet=seasGetKpiSet(e);
    var w=0;kpiSet.forEach(function(kd){if(seasKpiActive(kd.k,e))w+=kd.weight;});
    var midMax=Math.round(base*0.30*w*100)/100;
    var midEarned=calcMidSeason(e);
    var excl=(SEAS[e.m]&&SEAS[e.m].excluded);
    var totLC=excl?0:midEarned;
    var totEUR=Math.round(totLC*(e.ex||1)*100)/100;
    var auto=isP?null:seasAutoData(e);

    var r=[stagione,e.si,e.s,e.m,e.c,e.n,e.f||e.j,e.cu||'EUR',
      e.rl,rlSem,base,midMax];

    if(!isP){
      var fatOk=auto&&auto.scost>=0;
      var crT=auto?auto.cr_target:null, crA=auto?auto.cr_actual:null;
      var crOk=(crT===null||crA===null)?true:(crA>=crT);
      r.push(fatOk?'SI':'NO', auto?Math.round(auto.scost*100)/100:0,
             crOk?'SI':'NO', crA!==null?crA:'', crT!==null?crT:'');
    }

    var kpiScore=0;
    kpiCols.forEach(function(kd){
      var active=seasKpiActive(kd.k,e);
      var inSet=kpiSet.some(function(x){return x.k===kd.k&&x.weight>0;});
      if(!active||!inSet){r.push('N/A');if(!isP)r.push('');}
      else if(isP){
        r.push('SI (preventivo)');
        kpiScore+=kd.weight;
      } else {
        var sbarOk=(auto&&auto.scost>=0);
        var achieved=sbarOk&&seasIsKpiAchieved(kd,auto);
        if(achieved)kpiScore+=kd.weight;
        r.push(achieved?'SI':'NO');
        // pct value
        var pct=auto&&auto[kd.k+'_pct']!==undefined?Math.round(auto[kd.k+'_pct']*100)/100:0;
        r.push(pct);
      }
    });

    r.push(Math.round(kpiScore*100)/100, totLC, totEUR, excl?'SI':'NO');
    rows.push(r);
  });

  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Mid-Season");
  XLSX.writeFile(wb,"Incentivi_MidSeason_"+stagione+".xlsx");
}

// === rCSeasonal: Calcolo Premi in modalit\u00e0 Seasonal ===
var _seasF={q:'',s:'ALL',j:'ALL'};
function rCSeasonal(){
  if(SEASON_PERIOD==="mid"){rCSeasMid();return;}
  var isP=MODE==="preventivo";
  var smvsm=E.filter(function(e){return isSMVSM(e);});
  smvsm.sort(function(a,b){
    var sa=Number(a.si)||0,sb=Number(b.si)||0;
    if(sa!==sb)return sa-sb;
    return (a.m||'').localeCompare(b.m||'');
  });

  function calcSeasonalRow(e){
    // Dept stores internazionali: BDG×6 + QTY (50% di BDG×6) — no mid-season per i dept
    if(isD(e.si)){
      var bdg6=Math.round((e.ib||0)*6*100)/100;
      var qty6=Math.round(bdg6*0.5*100)/100;
      var grossD=Math.round((bdg6+qty6)*100)/100;
      return {isDept:true,bdg6:bdg6,qty6:qty6,gross:grossD,midPaid:0,val:calcSeasonal(e),kpiScore:1,m1:1,m2:1,auto:null};
    }
    var rlSem=(e.rl||0)*6;
    var base=rlSem*SEAS_CFG.basePct;
    var kpiSet=seasGetKpiSet(e);
    var kpiScore=0;
    var auto=(!isP)?seasAutoData(e):null;
    if(isP){kpiSet.forEach(function(kdef){if(!seasKpiActive(kdef.k,e))return;kpiScore+=kdef.weight;});}
    else{kpiSet.forEach(function(kdef){if(!seasKpiActive(kdef.k,e))return;if(seasIsKpiAchieved(kdef,auto))kpiScore+=kdef.weight;});}
    var m1=isP?seasMoltTurnover(3.01):seasMoltTurnover(auto?auto.scost:0);
    var m2=isP?seasMoltInventarioV(0):seasMoltInventarioV(auto?auto.inv:0);
    var gross=Math.round(base*kpiScore*m1*m2*100)/100;
    var midPaid=(!isP&&SEAS[e.m]&&SEAS[e.m].midPaid>0)?SEAS[e.m].midPaid:0;
    // val (netto) usa calcSeasonal come unica fonte di verità: stessa cifra di lettere/export
    return {isDept:false,kpiScore:kpiScore,m1:m1,m2:m2,auto:auto,gross:gross,midPaid:midPaid,val:calcSeasonal(e)};
  }

  var grandTotal=0;
  smvsm.forEach(function(e){
    if(SEAS[e.m]&&SEAS[e.m].excluded)return;
    grandTotal+=calcSeasonalRow(e).val*(e.ex||1);
  });

  // Build unique store/role lists for filters
  var uSeas=['ALL'],uSeasJ=['ALL'];
  smvsm.forEach(function(e){
    if(uSeas.indexOf(e.s)<0)uSeas.push(e.s);
    var jj=e.f||e.j;if(uSeasJ.indexOf(jj)<0)uSeasJ.push(jj);
  });

  // Apply filters
  var fl=smvsm.filter(function(e){
    if(_seasF.s!=='ALL'&&e.s!==_seasF.s)return false;
    if(_seasF.j!=='ALL'&&(e.f||e.j)!==_seasF.j)return false;
    if(_seasF.q){var q=_seasF.q.toLowerCase();
      return(e.c&&e.c.toLowerCase().indexOf(q)>=0)||(e.n&&e.n.toLowerCase().indexOf(q)>=0)||(e.m&&e.m.toLowerCase().indexOf(q)>=0)||(e.s&&e.s.toLowerCase().indexOf(q)>=0);}
    return true;
  });

  var h='<button class="exp-btn" onclick="exportSeasonalExcel()" style="font-size:10px;padding:4px 12px;margin-bottom:8px">&#128202; Export Excel</button>';
  if(MODE==="consuntivo")h+='<button class="exp-btn btn-lgreen" onclick="saveMonitorSnap()" style="font-size:10px;padding:4px 12px;margin-bottom:8px">&#128229; Salva per Monitor</button>';
  h+='<div class="flt"><input placeholder="Cerca..." id="seasQ" value="'+esc(_seasF.q)+'">';
  h+='<select id="seasJ">';
  uSeasJ.forEach(function(j){h+='<option value="'+esc(j)+'"'+(_seasF.j===j?' selected':'')+'>'+(j==='ALL'?'Tutti i ruoli':esc(j))+'</option>';});
  h+='</select><select id="seasS">';
  uSeas.forEach(function(s){h+='<option value="'+esc(s)+'"'+(_seasF.s===s?' selected':'')+'>'+(s==='ALL'?'Tutti i negozi':esc(s))+'</option>';});
  h+='</select>';
  h+='<span style="font-size:11px;color:#8a8680">'+fl.length+' SM/VSM &middot; Tot stima: <b style="color:#c9a96e">'+fc(grandTotal,'EUR')+'</b></span></div>';

  h+='<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;padding:8px 12px;background:#f5f2ee;border-radius:6px;font-size:10px;color:#6b6560">';
  SEAS_CFG.kpi.forEach(function(kdef){h+='<span><b>'+esc(kdef.label)+'</b>: peso '+Math.round(kdef.weight*100)+'%</span>';});
  h+='</div>';



  var kpiCols=SEAS_CFG.kpi;
  h+='<div class="scroll-wrap"><table id="stbl"><thead><tr>';
  h+='<th data-col="m">Matr. <span class="arrow">&#9652;</span></th>';
  h+='<th data-col="c">Cognome <span class="arrow">&#9652;</span></th>';
  h+='<th data-col="n">Nome <span class="arrow">&#9652;</span></th>';
  h+='<th data-col="s">Negozio <span class="arrow">&#9652;</span></th>';
  h+='<th data-col="j" style="text-align:center">Ruolo</th>';
  h+='<th class="r" style="white-space:nowrap">MAX Premio<br><span style="font-weight:400;font-size:9px">RML&times;6&times;'+fDec(SEAS_CFG.basePct*100,0)+'%&times;'+fDec(Math.round(seasMoltTurnover(3.01)*seasMoltInventarioV(0)*100)/100,2)+'</span></th>';
  kpiCols.forEach(function(kdef){
    h+='<th style="text-align:center;white-space:nowrap">'+esc(kdef.label.split(' ')[0])+'<br><span style="font-weight:400;font-size:9px">'+Math.round(kdef.weight*100)+'%</span></th>';
  });
  if(isP){
    h+='<th style="text-align:center;white-space:nowrap">M.Turn.<br><span style="font-weight:400;font-size:9px">(max)</span></th>';
    h+='<th style="text-align:center;white-space:nowrap">M.Inv.<br><span style="font-weight:400;font-size:9px">(max)</span></th>';
  } else {
    h+='<th style="text-align:center;white-space:nowrap">Scost.%<br><span style="font-weight:400;font-size:9px">Turnover</span></th>';
    h+='<th style="text-align:center;white-space:nowrap">M.Turn.</th>';
    h+='<th style="text-align:center;white-space:nowrap">M.Inv.</th>';
  }
  h+='<th class="r" style="white-space:nowrap;color:#cf8b4e">SAS&rarr;Fatt.<br><span style="font-weight:400;font-size:9px">al fatturato</span></th>';
  h+='<th style="text-align:center;white-space:nowrap">BOOST<br><span style="font-weight:400;font-size:9px">T&times;I</span></th>';
  h+='<th class="r" style="color:#8a8680">LORDO</th>';
  if(!isP)h+='<th class="r" style="color:#cf8b4e">MID-SEASON<br><span style="font-weight:400;font-size:9px">gi&agrave; erogato</span></th>';
  h+='<th class="r">TOTALE'+(!isP?' NETTO':'')+'</th>';
  h+='<th class="r" style="color:#5b6abf">TOT &euro;</th>';
  h+='<th style="cursor:default">Escl.</th>';
  h+='</tr></thead><tbody>';

  fl.forEach(function(e){
    var s=SEAS[e.m]||{};
    var cu=e.cu||'EUR',ex=e.ex||1;
    var excl=s.excluded||false;
    var rlSem=(e.rl||0)*6;
    var base=Math.round(rlSem*SEAS_CFG.basePct*100)/100;
    var maxM1=seasMoltTurnover(3.01);
    var maxM2=seasMoltInventarioV(0);
    var maxBoost=Math.round(maxM1*maxM2*100)/100;
    var maxPremio=Math.round(base*maxBoost*100)/100;
    var sf=STORE_FLAGS[String(e.si)]||{};
    var row=calcSeasonalRow(e);
    var tot=excl?0:row.val; // row.val è già in valuta locale
    var boostTot=Math.round(row.m1*row.m2*100)/100;

    h+='<tr class="ck" style="opacity:'+(excl?'0.4':'1')+'" data-sm="'+esc(e.m)+'">';
    h+='<td class="mn">'+esc(e.m)+'</td>';
    h+='<td>'+esc(e.c)+'</td>';
    h+='<td>'+esc(e.n)+'</td>';
    h+='<td style="font-size:10px;color:#8a8680">'+esc(e.s)+'</td>';
    h+='<td style="text-align:center"><span class="bg '+(sf.dept?'bg-d':'bg-n')+'" title="'+esc(e.j)+'">'+esc(e.f||e.j)+'</span></td>';
    h+='<td class="r mn gy">'+fc(row.isDept?Math.round((e.ib||0)*6*1.5*100)/100:maxPremio,cu)+'</td>';

    if(row.isDept){
      // Dept stores: mostra BDG×6 e QTY come info, resto —
      var nKpi=kpiCols.length;
      h+='<td class="r" style="text-align:center;color:#6b3fa0;font-size:9px" colspan="'+nKpi+'">BDG×6: '+fc(row.bdg6,cu)+'<br>QTY: '+fc(row.qty6,cu)+'</td>';
      // colonne M.Turn / M.Inv / Scost / BOOST
      if(isP){
        h+='<td class="r mn gy">&mdash;</td><td class="r mn gy">&mdash;</td>';
      } else {
        h+='<td class="r mn gy">&mdash;</td><td class="r mn gy">&mdash;</td><td class="r mn gy">&mdash;</td>';
      }
      h+='<td class="r mn gy">&mdash;</td>'; // SAS→Fatt.: Dept Store esclusi (formula fissa, no gap fatturato/target)
      h+='<td class="r mn gy">&mdash;</td>';
    } else {
      var kpiSet=seasGetKpiSet(e);
      kpiCols.forEach(function(kdef){
        var active=seasKpiActive(kdef.k,e);
        var inSet=kpiSet.some(function(kd){return kd.k===kdef.k&&kd.weight>0;});
        if(!active||!inSet){
          h+='<td class="r mn gy">&mdash;</td>';
        } else if(isP){
          h+='<td style="text-align:center" class="g b">&#10003;</td>';
        } else {
          var auto=row.auto||{};
          var pctVal=auto[kdef.k+'_pct']!==undefined?auto[kdef.k+'_pct']:0;
          var achieved=seasIsKpiAchieved(kdef,auto);
          h+='<td style="text-align:center">';
          if(kdef.k==='sas'){
            var sid2=String(e.si);
            var cn2=D.cs&&D.cs[sid2]?D.cs[sid2]:{}; // SAS da consuntivi seasonal
            var sasHours=cn2.s4!==undefined?cn2.s4:null;
            var sasAchieved=sasHours!==null&&sasHours<(SEAS_CFG.sasMaxHours||4);
            h+='<div class="b" style="color:'+(sasAchieved?'#2d7a3a':'#cf5b5b')+'">'+(sasAchieved?'&#10003;':'&#10007;')+'</div>';
            h+='<div style="font-size:9px;color:#8a8680">'+(sasHours!==null?sasHours.toFixed(1)+'h':'—')+'</div>';
          } else {
            h+='<div class="b" style="color:'+(achieved?'#2d7a3a':'#cf5b5b')+'">'+(achieved?'&#10003;':'&#10007;')+'</div>';
            h+='<div style="font-size:9px;color:#8a8680">'+pctVal.toFixed(1)+'%</div>';
          }
          h+='</td>';
        }
      });

      if(isP){
        h+='<td class="r mn" style="color:#cf8b4e">'+row.m1.toFixed(2)+'</td>';
        h+='<td class="r mn" style="color:#5ba4cf">'+row.m2.toFixed(2)+'</td>';
      } else {
        var auto2=row.auto||{};
        var scost=auto2.scost||0,inv=auto2.inv||0;
        h+='<td class="r mn b" style="color:'+(scost>0?'#2d7a3a':scost<-1?'#c0392b':'#c9a96e')+'">'+scost.toFixed(2)+'%</td>';
        h+='<td class="r mn b" style="color:'+(row.m1===0?'#c0392b':row.m1>=1.3?'#2d7a3a':'#2c2925')+'">'+row.m1.toFixed(2)+'</td>';
        h+='<td class="r mn b" style="color:'+(row.m2===0?'#c0392b':row.m2>=1?'#2d7a3a':'#2c2925')+'">'+row.m2.toFixed(2)+'</td>';
      }
      var sasAddonVal=(!isP&&row.auto&&row.auto.sasAddon!==undefined)?row.auto.sasAddon:0;
      h+='<td class="r mn" style="color:'+(sasAddonVal>0?'#2d7a3a':'#b0a99f')+'">'+(sasAddonVal>0?fc(sasAddonVal,cu):'&mdash;')+'</td>';
      h+='<td class="r mn b" style="color:'+(boostTot>=1.3?'#2d7a3a':boostTot===0?'#c0392b':'#cf8b4e')+'">'+boostTot.toFixed(2)+'</td>';
    } // end else (non-dept)
    h+='<td class="r mn gy">'+fc(row.gross,cu)+'</td>';
    if(!isP)h+='<td class="r mn" style="color:'+(row.midPaid>0?'#cf8b4e':'#b0a99f')+'">'+(row.midPaid>0?'&minus;'+fc(row.midPaid,cu):'&mdash;')+'</td>';
    h+='<td class="r mn b seas-tot-'+esc(e.m)+'" style="color:'+(tot>0?'#2c2925':'#b0a99f')+'">'+fc(tot,cu)+'</td>';
    h+='<td class="r mn" style="color:#5b6abf">'+fc(Math.round(tot*(e.ex||1)*100)/100,'EUR')+'</td>';
    h+='<td style="text-align:center"><button class="tb '+(excl?'x':'o')+' seas-excl" data-sm="'+esc(e.m)+'" style="width:28px;height:16px" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    h+='</tr>';
  });

  h+='</tbody></table></div>';
  h+='<div style="margin-top:12px;padding:12px 16px;background:#2c2925;border-radius:6px;display:flex;justify-content:space-between;align-items:center">';
  h+='<div style="font-size:9px;color:#a09a92;text-transform:uppercase;letter-spacing:2px">Totale Seasonal Bonus'+(isP?' (Max)':'')+'</div>';
  h+='<div style="font-size:20px;font-weight:800;color:#c9a96e" id="seasGrandTotal">'+fc(grandTotal,'EUR')+'</div>';
  h+='</div>';

  document.getElementById('p0').innerHTML=h;

  var qEl=document.getElementById('seasQ');
  if(qEl){qEl.oninput=function(){_seasF.q=this.value;var pos=this.selectionStart;rCSeasonal();var el2=document.getElementById('seasQ');if(el2){el2.focus();el2.selectionStart=el2.selectionEnd=pos;}};}
  var jEl=document.getElementById('seasJ');if(jEl){jEl.onchange=function(){_seasF.j=this.value;rCSeasonal();};}
  var sEl=document.getElementById('seasS');if(sEl){sEl.onchange=function(){_seasF.s=this.value;rCSeasonal();};}

  document.querySelectorAll('.seas-excl').forEach(function(btn){
    btn.onclick=function(ev){
      ev.stopPropagation();
      var m=btn.getAttribute('data-sm');
      if(!SEAS[m])SEAS[m]={};
      SEAS[m].excluded=!SEAS[m].excluded;
      autoSave();
      // Preserva posizione scroll
      var sw=document.querySelector(".scroll-wrap");
      var st=sw?sw.scrollTop:0;
      rCSeasonal();
      var sw2=document.querySelector(".scroll-wrap");
      if(sw2)sw2.scrollTop=st;
    };
  });
}

function exportSeasonalExcel(){
  var isP=MODE==="preventivo";
  var smvsm=E.filter(function(e){return isSMVSM(e);});
  var stagione=CFG_SEASON+String(CFG_YEAR).slice(-2);
  var kpiCols=SEAS_CFG.kpi;
  var maxM1=seasMoltTurnover(3.01), maxM2=seasMoltInventarioV(0);

  // ── Header ───────────────────────────────────────────────────
  var headers=["STAGIONE","STORE ID","NEGOZIO","MATRICOLA","COGNOME","NOME","RUOLO","VALUTA",
    "RML","RML x6","BASE PREMIO (RML×6×"+Math.round(SEAS_CFG.basePct*100)+"%)",
    "MAX PREMIO (base×boost_max)","DEPT STORE"];
  // KPI columns
  kpiCols.forEach(function(kd){
    headers.push(kd.label.toUpperCase()+" (PESO "+Math.round(kd.weight*100)+"%)");
    if(!isP)headers.push(kd.label.toUpperCase()+" % RAGGIUNTO");
  });
  // Multiplier columns
  if(!isP)headers.push("SCOSTAMENTO FATTURATO %");
  headers.push("MOLTIPLICATORE TURNOVER");
  if(!isP)headers.push("INC. INVENTARIALE (cogs)");
  headers.push("MOLTIPLICATORE INVENTARIO","BOOST (M.Turn×M.Inv)","KPI SCORE","SAS → FATTURATO LC");
  // Result columns
  headers.push("TOTALE LORDO LC","MID-SEASON GIÀ EROGATO LC","TOTALE NETTO LC",
               "TOTALE NETTO EUR","ESCLUSO");
  // Dept extra
  headers.push("DEPT: BDG MENSILE","DEPT: BDG×6","DEPT: QUOTA QTY (50%)");

  var rows=[headers];

  smvsm.forEach(function(e){
    var cu=e.cu||'EUR', ex=e.ex||1;
    var excl=!!(SEAS[e.m]&&SEAS[e.m].excluded);
    var midPaid=(!isP&&SEAS[e.m]&&SEAS[e.m].midPaid>0)?SEAS[e.m].midPaid:0;
    var isDept=isD(e.si);

    var rlSem=(e.rl||0)*6;
    var base=Math.round(rlSem*SEAS_CFG.basePct*100)/100;
    var maxBoost=Math.round(maxM1*maxM2*100)/100;
    var maxPremio=isDept?Math.round((e.ib||0)*6*1.5*100)/100:Math.round(base*maxBoost*100)/100;

    var kpiSet=seasGetKpiSet(e);
    var auto=isP?null:seasAutoData(e);
    var kpiScore=0;

    var r=[stagione,e.si,e.s,e.m,e.c,e.n,e.f||e.j,cu,
      e.rl,rlSem,isDept?'':base, isDept?'':maxPremio, isDept?'SI':'NO'];

    // KPI per-column
    kpiCols.forEach(function(kd){
      if(isDept){r.push('');if(!isP)r.push('');return;}
      var active=seasKpiActive(kd.k,e);
      var inSet=kpiSet.some(function(x){return x.k===kd.k&&x.weight>0;});
      if(!active||!inSet){r.push('N/A');if(!isP)r.push('');return;}
      if(isP){r.push('SI (preventivo)');kpiScore+=kd.weight;}
      else{
        var achieved=seasIsKpiAchieved(kd,auto);
        if(achieved)kpiScore+=kd.weight;
        r.push(achieved?'SI':'NO');
        var pct=auto&&auto[kd.k+'_pct']!==undefined?Math.round(auto[kd.k+'_pct']*100)/100:0;
        r.push(pct);
      }
    });

    // Multipliers
    var m1,m2,scost=0,inv=0;
    if(isDept){
      m1=1;m2=1;
      if(!isP)r.push('');
      r.push(m1);
      if(!isP)r.push('');
      r.push(m2,1,1);
    } else {
      if(isP){
        m1=maxM1;m2=maxM2;
        r.push(m1);r.push(m2);
      } else {
        m1=seasMoltTurnover(auto?auto.scost:0);
        m2=seasMoltInventarioV(auto?auto.inv:0);
        scost=auto?auto.scost:0;inv=auto?auto.inv:0;
        r.push(Math.round(scost*100)/100);
        r.push(m1);
        r.push(Math.round(inv*10000)/10000);
        r.push(m2);
      }
      r.push(Math.round(m1*m2*100)/100);
      r.push(Math.round(kpiScore*100)/100);
    }
    r.push(isDept?'':(auto&&auto.sasAddon!==undefined?auto.sasAddon:0));

    // Results
    var gross=isDept?Math.round((e.ib||0)*6*1.5*100)/100:Math.round(base*kpiScore*m1*m2*100)/100;
    var net=calcSeasonal(e); // unica fonte di verità: stessa cifra di tab e lettere
    var totLC=excl?0:net;
    var totEUR=Math.round(totLC*ex*100)/100;
    r.push(excl?0:gross, midPaid, totLC, totEUR, excl?'SI':'NO');

    // Dept breakdown (blank for normal stores)
    if(isDept){r.push(e.ib||0,Math.round((e.ib||0)*6*100)/100,Math.round((e.ib||0)*6*0.5*100)/100);}
    else{r.push('','','');}

    rows.push(r);
  });

  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Seasonal");
  XLSX.writeFile(wb,"Incentivi_Seasonal_"+stagione+".xlsx");
}

// === IMPORT: Mid-Season già erogato ===
// Importa gli importi realmente erogati a metà stagione (per matricola) e li
// scrive in SEAS[matricola].midPaid, in valuta locale (LC). calcSeasonal()
// li detrae automaticamente dal premio di fine stagione (già floor a 0).
// Accetta lo stesso file esportato da exportMidSeasonExcel (colonna "MID-SEASON LC"),
// o qualunque file con colonne MATRICOLA + importo.
function _normMatr(s){
  s=String(s||'').trim().toUpperCase();
  return /^[0-9]+$/.test(s)?String(parseInt(s,10)):s;
}
function loadMidSeasonPaidExcel(input){
  var f=input.files[0];if(!f)return;input.value="";
  var reader=new FileReader();reader.onload=function(ev){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:"array"});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert("File Mid-Season vuoto.");return;}
    // Trova header row
    var hdrRow=0;
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var rs=(json[ri]||[]).map(function(c){return String(c||'').toLowerCase()}).join('|');
      if(rs.indexOf('matr')>=0){hdrRow=ri;break;}
    }
    // Rileva colonne MATRICOLA e importo. Preferisce una colonna "MID-SEASON ... LC"
    // (valuta locale, coerente col resto del calcolo); in mancanza, la prima colonna
    // "mid-season"/"erogat"/"pagat" trovata, escludendo esplicitamente le colonne EUR.
    var hdr={matr:-1,amt:-1,amtIsLC:false};
    (json[hdrRow]||[]).forEach(function(cell,ci){
      var s=String(cell||'').toLowerCase().trim();
      if(hdr.matr<0&&(s.indexOf('matr')>=0||s==='id'))hdr.matr=ci;
      var isMidCol=s.indexOf('mid')>=0||s.indexOf('erogat')>=0||s.indexOf('pagat')>=0||s.indexOf('paid')>=0;
      if(!isMidCol)return;
      var isLC=s.indexOf('lc')>=0&&s.indexOf('eur')<0;
      if(hdr.amt<0||(isLC&&!hdr.amtIsLC)){hdr.amt=ci;hdr.amtIsLC=isLC;}
    });
    if(hdr.matr<0||hdr.amt<0){alert('Colonne MATRICOLA o importo Mid-Season non trovate.\n\nColonne rilevate:\n'+(json[hdrRow]||[]).join(', '));return;}
    if(!hdr.amtIsLC&&!confirm('Attenzione: non ho trovato una colonna esplicitamente "LC" (valuta locale) — userò la colonna "'+(json[hdrRow]||[])[hdr.amt]+'".\nSe è un importo in EUR e non in valuta locale, il calcolo sarà errato.\n\nContinuare?'))return;
    // Lookup matricole esistenti (SM/VSM), normalizzate per tollerare padding/zeri diversi
    var matrLookup={};
    E.forEach(function(e){if(isSMVSM(e))matrLookup[_normMatr(e.m)]=e.m;});
    var matched=0,unmatched=[];
    for(var ri2=hdrRow+1;ri2<json.length;ri2++){
      var row=json[ri2];if(!row)continue;
      var rawMatr=row[hdr.matr];if(rawMatr===null||rawMatr===undefined||String(rawMatr).trim()==='')continue;
      var amt=parseFloat(String(row[hdr.amt]||'0').replace(',','.').replace(/[^0-9.\-]/g,''))||0;
      var key=matrLookup[_normMatr(rawMatr)];
      if(!key){unmatched.push(String(rawMatr));continue;}
      if(!SEAS[key])SEAS[key]={};
      SEAS[key].midPaid=amt;
      matched++;
    }
    var msg='Mid-Season erogato importato!\n\n'+matched+' dipendenti aggiornati.';
    if(unmatched.length)msg+='\n\n'+unmatched.length+' matricole non trovate in anagrafica (ignorate):\n'+unmatched.slice(0,15).join(', ')+(unmatched.length>15?'\n...':'');
    alert(msg);
    autoSave();rSources();rC();
  }catch(ex){alert('Errore lettura Mid-Season: '+ex.message);}};reader.readAsArrayBuffer(f);
}

// === IMPORT: SAS → fatturato (SEASONAL, da SS26) ===========================
// SS26 (transizione): due import mensili separati (Luglio/Agosto), stesso
// formato colonne del mensile "sas_results" (store id, % accettati, %
// gestiti entro 4h, valore SAS) — la matrice di riconoscimento
// (sasRecognizedValue, già esistente per il mensile) viene applicata qui,
// al momento dell'import, e il risultato salvato per negozio in
// D.cs[sid].sasSeasJulRec / sasSeasAugRec. seasSasAddon() li somma senza
// cap né riserva (il seasonal non ha il concetto di "esubero").
// Da FW26: un unico file con il valore già calcolato dal tool esterno →
// D.cs[sid].sasSeasFull (loadSeasonalSasFullExcel).
// Bottoni dedicati (non auto-scan generico) perché il file mensile non porta
// il mese al suo interno — lo tagga il bottone premuto dall'operatore.
function _seasSasFindCols(headers){
  // "recognised_*" escluso esplicitamente: nei nuovi export QWRT convive con
  // "store_sas_value_*" e potrebbe matchare per errore i pattern value_eur/value_lc
  // (recognised_value_lc contiene "value_lc") — stessa guardia di loadFcVmSasArea.
  function fH(){for(var ci=0;ci<headers.length;ci++){if(!headers[ci]||headers[ci].indexOf("recognised")>=0)continue;for(var i=0;i<arguments.length;i++){if(headers[ci].indexOf(arguments[i])>=0)return ci;}}return-1;}
  // Include le varianti underscore del formato QWRT (pct_speed, store_sas_value_eur/lc)
  // già usate in loadFcVmSasArea — i vecchi pattern con spazi ("processed within",
  // "value eur") non matchano più i nuovi export (bug: import "riuscito" ma acc/vel/
  // valore restavano null → riconosciuto sempre 0, nessun errore visibile).
  var valE=fH("valore eur","value eur","valore sas eur","sas value eur","valore euro","value_eur","sas_value_eur","store_sas_value_eur");
  var valL=fH("valore lc","value lc","valore sas lc","sas value lc","value_lc","sas_value_lc","store_sas_value_lc");
  var valP=fH("valore sas","sas value");
  return {
    sid: fH("store id","store_id"),
    acc: fH("% sas accepted","sas accepted","% accepted","% accettati","accepted %","accepted","% accettazione","accettati %","% acceptance","pct_accepted"),
    vel: fH("% processed within","processed within 4","% within 4","within 4h","% gestiti entro","% sas gestiti","gestiti entro","velocit","velocity","% handled","pct_speed","pct speed"),
    valLc: valL>=0?valL:((valP>=0&&valP!==valE)?valP:-1)
  };
}
function _seasSasFindHeaderRow(json){
  for(var ri=0;ri<Math.min(5,json.length);ri++){
    var r=json[ri];if(!r)continue;
    var hdr=r.map(function(c){return String(c==null?"":c).toLowerCase().trim();});
    if(hdr.some(function(h){return h&&h.indexOf("store")>=0;}))return {idx:ri,headers:hdr};
  }
  return null;
}
function loadSeasonalSasPeriodExcel(input,period){
  var f=input.files[0];if(!f)return;input.value="";
  var label=period==="jul"?"Luglio":"Agosto";
  var reader=new FileReader();reader.onload=function(ev){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:"array",raw:true});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert("File SAS "+label+" vuoto.");return;}
    var hr=_seasSasFindHeaderRow(json);
    if(!hr){alert("Formato file non riconosciuto: nessuna colonna Store ID trovata nelle prime 5 righe.");return;}
    var headers=hr.headers;
    var c=_seasSasFindCols(headers);
    if(c.sid<0){alert("Colonna Store ID non trovata.\n\nColonne rilevate:\n"+headers.join(", "));return;}
    var recField=period==="jul"?"sasSeasJulRec":"sasSeasAugRec";
    var accField=period==="jul"?"sasSeasJulAcc":"sasSeasAugAcc";
    var velField=period==="jul"?"sasSeasJulVel":"sasSeasAugVel";
    var valField=period==="jul"?"sasSeasJulVal":"sasSeasAugVal";
    var imported=0;
    for(var ri2=hr.idx+1;ri2<json.length;ri2++){
      var row=json[ri2];if(!row)continue;
      var sid=row[c.sid];if(!sid)continue;
      sid=String(parseInt(sid));if(sid==="NaN")continue;
      if(!D.cs[sid])D.cs[sid]={sc:0,es:0,sy:0,nf:0,s4:0,iv:null,av:null,qc:0,cr:null};
      var acc=null,vel=null,val=null;
      if(c.acc>=0){var av=parseNum(row[c.acc]);if(!isNaN(av)){if(av>1)av=av/100;if(av<0)av=0;if(av>1)av=1;acc=av;}}
      if(c.vel>=0){var vv=parseNum(row[c.vel]);if(!isNaN(vv)){if(vv>1)vv=vv/100;if(vv<0)vv=0;if(vv>1)vv=1;vel=vv;}}
      if(c.valLc>=0){var sv=parseNum(row[c.valLc]);if(!isNaN(sv))val=sv;}
      D.cs[sid][accField]=acc;D.cs[sid][velField]=vel;D.cs[sid][valField]=val;
      D.cs[sid][recField]=sasRecognizedValue(acc,vel,val);
      imported++;
    }
    alert("SAS "+label+" importato: "+imported+" negozi.");
    autoSave();rSources();rC();
  }catch(ex){alert("Errore lettura SAS "+label+": "+ex.message);}};reader.readAsArrayBuffer(f);
}
function loadSeasonalSasJulExcel(input){loadSeasonalSasPeriodExcel(input,"jul");}
function loadSeasonalSasAugExcel(input){loadSeasonalSasPeriodExcel(input,"aug");}

function loadSeasonalSasFullExcel(input){
  var f=input.files[0];if(!f)return;input.value="";
  var reader=new FileReader();reader.onload=function(ev){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:"array",raw:true});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert("File SAS Stagione vuoto.");return;}
    var hr=_seasSasFindHeaderRow(json);
    if(!hr){alert("Formato file non riconosciuto: nessuna colonna Store ID trovata nelle prime 5 righe.");return;}
    var headers=hr.headers;
    function fH(){for(var ci=0;ci<headers.length;ci++){if(!headers[ci])continue;for(var i=0;i<arguments.length;i++){if(headers[ci].indexOf(arguments[i])>=0)return ci;}}return-1;}
    var cSid=fH("store id","store_id");
    var cValE=fH("valore eur","value eur","valore sas eur","sas value eur","valore euro");
    var cValL=fH("valore lc","value lc","valore sas lc","sas value lc");
    var cValP=fH("valore sas","sas value","valore","value");
    var cVal=cValL>=0?cValL:((cValP>=0&&cValP!==cValE)?cValP:-1);
    if(cSid<0||cVal<0){alert("Colonne Store ID o Valore SAS non trovate.\n\nColonne rilevate:\n"+headers.join(", "));return;}
    var imported=0;
    for(var ri2=hr.idx+1;ri2<json.length;ri2++){
      var row=json[ri2];if(!row)continue;
      var sid=row[cSid];if(!sid)continue;
      sid=String(parseInt(sid));if(sid==="NaN")continue;
      if(!D.cs[sid])D.cs[sid]={sc:0,es:0,sy:0,nf:0,s4:0,iv:null,av:null,qc:0,cr:null};
      var v=parseNum(row[cVal]);if(!isNaN(v)){D.cs[sid].sasSeasFull=v;imported++;}
    }
    alert("SAS Stagione importato: "+imported+" negozi.");
    autoSave();rSources();rC();
  }catch(ex){alert("Errore lettura SAS Stagione: "+ex.message);}};reader.readAsArrayBuffer(f);
}
