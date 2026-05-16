function rASeasonal(){
  var isP=MODE==="preventivo";
  var smvsm=E.filter(function(e){return isSMVSM(e)&&!(SEAS[e.m]&&SEAS[e.m].excluded);});

  // ── Statistiche KPI (tutti i KPI incluso acc, weight=0 incluso per mostrarlo) ──
  var allKpiKeys=["sy","sr","sas","acc"];
  var kpiColors={sy:"#5ba4cf",sr:"#5bb98c",sas:"#d4a94e",acc:"#9b6ec9"};
  var kpiStats={};
  allKpiKeys.forEach(function(k){kpiStats[k]={eligible:0,achieved:0};});

  // Calcolo per ogni SM/VSM
  // In preventivo: tutti KPI come raggiunti, molt max
  function calcSeasonalForAnalysis(e){
    // Dept stores: BDG×6 + QTY (50%), nessun boost
    if(isD(e.si)){
      var bdg6=Math.round((e.ib||0)*6*100)/100;
      return Math.round((bdg6+bdg6*0.5)*100)/100;
    }
    var rlSem=(e.rl||0)*6;
    var base=rlSem*SEAS_CFG.basePct;
    var kpiSet=seasGetKpiSet(e);
    var kpiScore=0;
    var auto=isP?null:seasAutoData(e);
    if(isP){
      kpiSet.forEach(function(kdef){
        if(!seasKpiActive(kdef.k,e))return;
        kpiScore+=kdef.weight;
      });
    } else {
      kpiSet.forEach(function(kdef){
        if(!seasKpiActive(kdef.k,e))return;
        if(seasIsKpiAchieved(kdef,auto)) kpiScore+=kdef.weight;
      });
    }
    var m1=isP?seasMoltTurnover(3.01):seasMoltTurnover(auto?auto.scost:0);
    var m2=isP?seasMoltInventarioV(0):seasMoltInventarioV(auto?auto.inv:0);
    return Math.round(base*kpiScore*m1*m2*100)/100;
  }

  var grandTotal=0,withIncentive=0;
  var m1Dist={no:0,near:0,bdg:0,better:0,over:0,top:0};
  var m2Dist={noBdg:0,halfBdg:0,nearBdg:0,bdg:0};

  smvsm.forEach(function(e){
    var auto=isP?null:seasAutoData(e);
    var ex=e.ex||1;
    var kpiSet=seasGetKpiSet(e);

    // KPI stats
    allKpiKeys.forEach(function(k){
      if(!seasKpiActive(k,e))return;
      var hasKpi=kpiSet.some(function(kd){return kd.k===k;});
      if(!hasKpi)return;
      kpiStats[k].eligible++;
      var achieved=isP||(seasIsKpiAchieved( SEAS_CFG.kpi.find(function(kd){return kd.k===k;})||{k:k,threshold:0.995,weight:0}, auto));
      if(achieved) kpiStats[k].achieved++;
    });

    // Moltiplicatori (solo consuntivo per distribuzione; preventivo tutti top)
    var scost=isP?3.01:(auto?auto.scost:0);
    var inv=isP?0:(auto?auto.inv:0);
    var m1=seasMoltTurnover(scost),m2=seasMoltInventarioV(inv);
    if(m1===0)m1Dist.no++;
    else if(m1===0.8)m1Dist.near++;
    else if(m1===1.0)m1Dist.bdg++;
    else if(m1===1.3)m1Dist.better++;
    else if(m1===1.4)m1Dist.over++;
    else m1Dist.top++;
    if(m2===0)m2Dist.noBdg++;
    else if(m2===0.5)m2Dist.halfBdg++;
    else if(m2===0.8)m2Dist.nearBdg++;
    else m2Dist.bdg++;

    var tot=calcSeasonalForAnalysis(e)*ex;
    grandTotal+=tot;
    if(tot>0)withIncentive++;
  });

  // ── Raggruppamento per negozio o field coach ──
  var aGseas=aG==="fc"?"fc":"store";
  var grp={};
  // Per l'ordinamento per store id, teniamo traccia del si minimo per gruppo
  var grpSi={};
  smvsm.forEach(function(e){
    var auto=isP?null:seasAutoData(e);
    var ex=e.ex||1;
    var key=aGseas==="fc"?(e.fc||"N/A"):e.s;
    var si=Number(e.si)||0;
    if(!grp[key]){
      grp[key]={n:0,tot:0,kpi:{},si:si};
      allKpiKeys.forEach(function(k){grp[key].kpi[k]={ach:0,elig:0};});
    }
    // track min si for this group for sorting
    if(si<grp[key].si)grp[key].si=si;
    grp[key].n++;
    grp[key].tot+=calcSeasonalForAnalysis(e)*ex;
    var kpiSet=seasGetKpiSet(e);
    allKpiKeys.forEach(function(k){
      if(!seasKpiActive(k,e))return;
      var hasKpi=kpiSet.some(function(kd){return kd.k===k;});
      if(!hasKpi)return;
      grp[key].kpi[k].elig++;
      var kdef=SEAS_CFG.kpi.find(function(kd){return kd.k===k;})||{k:k,threshold:0.995,weight:0};
      var achieved=isP||seasIsKpiAchieved(kdef,auto);
      if(achieved) grp[key].kpi[k].ach++;
    });
  });

  var grpArr=[];
  for(var k in grp){grpArr.push({nm:k,n:grp[k].n,tot:grp[k].tot,kpi:grp[k].kpi,av:grp[k].n>0?grp[k].tot/grp[k].n:0,si:grp[k].si});}
  // Ordina per store id crescente (negozio) o alfabetico (fc)
  if(aGseas==="store"){
    grpArr.sort(function(a,b){return a.si-b.si;});
  } else {
    grpArr.sort(function(a,b){return a.nm.toLowerCase()<b.nm.toLowerCase()?-1:1;});
  }
  var mx=1;grpArr.forEach(function(a){if(a.tot>mx)mx=a.tot;});

  // ── Build HTML ──
  var h='<div class="gb">';
  [{k:"store",l:"Per Negozio"},{k:"fc",l:"Per Field Coach"}].forEach(function(g){
    h+='<button class="gbtn'+(aGseas===g.k?" on":"")+'" data-gseas="'+g.k+'">'+g.l+"</button>";
  });

  h+="</div>";

  // Summary cards
  h+='<div class="cg">';
  [{l:"Tot Seasonal"+(isP?" (Max)":""),v:fcEUR(grandTotal),c:"#c9a96e"},
   {l:"SM/VSM",v:smvsm.length,c:"#5ba4cf"},
   {l:"Con Incentivo",v:withIncentive,c:"#2d7a3a"},
   {l:"Senza Incentivo",v:smvsm.length-withIncentive,c:"#cf5b5b"},
   {l:"Media per SM/VSM",v:fcEUR(smvsm.length?grandTotal/smvsm.length:0),c:"#9b6ec9"}
  ].forEach(function(c){
    h+='<div class="cd"><div style="font-size:9px;color:#a09a92;font-weight:600;text-transform:uppercase;letter-spacing:1px">'+c.l+'</div><div style="font-size:18px;font-weight:800;margin-top:3px;color:'+c.c+'">'+c.v+"</div></div>";
  });
  h+="</div>";

  // KPI achievement widget (tutti i KPI, incluso acc)
  h+='<div class="wg"><div class="wg-title">&#127942; '+(isP?"KPI Seasonal — Preventivo (tutti a target)":"Raggiungimento KPI Seasonal")+'</div><div class="wg-grid">';
  allKpiKeys.forEach(function(k){
    var st=kpiStats[k];if(!st||st.eligible===0)return;
    var pct=isP?100:Math.round(st.achieved/st.eligible*100);
    var col=kpiColors[k]||"#8a8680";
    var kdef=SEAS_CFG.kpi.find(function(kd){return kd.k===k;})||{label:k,weight:0};
    h+='<div class="wg-item">';
    h+='<div class="wg-val" style="color:'+col+'">'+pct+'%</div>';
    h+='<div class="wg-label">'+esc(kdef.label||k)+(kdef.weight>0?' ('+st.achieved+'/'+st.eligible+')':'')+'</div>';
    h+='<div style="font-size:9px;color:#a09a92;margin-top:1px">Peso '+Math.round((kdef.weight||0)*100)+'%</div>';
    h+='<div class="wg-bar"><div class="wg-bar-fill" style="width:'+pct+'%;background:'+col+'"></div></div>';
    h+='</div>';
  });
  h+="</div></div>";

  // Boost distribution (solo in consuntivo)
  if(!isP){
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
    var totSm=smvsm.length||1;

    h+='<div class="wg"><div class="wg-title">&#128200; Moltiplicatore Turnover</div>';
    [{l:"No Bdg (0×)",n:m1Dist.no,c:"#cf5b5b"},{l:"Near Bdg (0.8×)",n:m1Dist.near,c:"#d4a94e"},
     {l:"Bdg (1×)",n:m1Dist.bdg,c:"#8a8680"},{l:"Better (1.3×)",n:m1Dist.better,c:"#5ba4cf"},
     {l:"Over (1.4×)",n:m1Dist.over,c:"#5bb98c"},{l:"Top (1.5×)",n:m1Dist.top,c:"#2d7a3a"}
    ].forEach(function(d){
      if(d.n===0)return;
      var pct=Math.round(d.n/totSm*100);
      h+='<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"><span style="color:#6b6560">'+d.l+'</span><span style="font-weight:700;color:'+d.c+'">'+d.n+' ('+pct+'%)</span></div>';
      h+='<div style="height:4px;background:#e5e1db;border-radius:2px"><div style="height:4px;width:'+pct+'%;background:'+d.c+';border-radius:2px"></div></div></div>';
    });
    h+='</div>';

    h+='<div class="wg"><div class="wg-title">&#128202; Moltiplicatore Inventario</div>';
    [{l:"No Bdg (0×)",n:m2Dist.noBdg,c:"#cf5b5b"},{l:"Half Bdg (0.5×)",n:m2Dist.halfBdg,c:"#d4a94e"},
     {l:"Near Bdg (0.8×)",n:m2Dist.nearBdg,c:"#8a8680"},{l:"Bdg (1×)",n:m2Dist.bdg,c:"#2d7a3a"}
    ].forEach(function(d){
      if(d.n===0)return;
      var pct=Math.round(d.n/totSm*100);
      h+='<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"><span style="color:#6b6560">'+d.l+'</span><span style="font-weight:700;color:'+d.c+'">'+d.n+' ('+pct+'%)</span></div>';
      h+='<div style="height:4px;background:#e5e1db;border-radius:2px"><div style="height:4px;width:'+pct+'%;background:'+d.c+';border-radius:2px"></div></div></div>';
    });
    h+='</div>';
    h+='</div>';
  }

  // Breakdown table — tutti i KPI incluso acc
  h+='<div style="overflow-x:auto"><table id="atbl" style="font-size:11px"><thead><tr>';
  h+='<th style="text-align:left;padding:7px 10px;cursor:default">'+(aGseas==="fc"?"Field Coach":"Negozio")+'</th>';
  h+='<th style="text-align:center;padding:7px 8px;cursor:default">N</th>';
  allKpiKeys.forEach(function(k){
    var kdef=SEAS_CFG.kpi.find(function(kd){return kd.k===k;})||{label:k,weight:0};
    var col=kpiColors[k]||"#5b6abf";
    h+='<th style="text-align:center;padding:7px 8px;cursor:default;color:'+col+'">'+esc((kdef.label||k).split(' ')[0])+'<br><span style="font-size:9px;font-weight:400">'+Math.round((kdef.weight||0)*100)+'%</span></th>';
  });
  h+='<th style="text-align:right;padding:7px 10px;cursor:default">Media</th>';
  h+='<th style="text-align:right;padding:7px 10px;cursor:default">Totale'+(isP?" Max":"")+'</th>';
  h+='<th style="cursor:default"></th>';
  h+='</tr></thead><tbody>';

  grpArr.forEach(function(a){
    var pc=Math.min(a.tot/mx*100,100);
    h+='<tr style="border-bottom:1px solid #f0ece8">';
    h+='<td style="padding:6px 10px;font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(a.nm)+'</td>';
    h+='<td style="padding:6px 8px;text-align:center;color:#8a8680">'+a.n+'</td>';
    allKpiKeys.forEach(function(k){
      var st=a.kpi[k]||{ach:0,elig:0};
      var pct=st.elig>0?(isP?100:Math.round(st.ach/st.elig*100)):null;
      var col=pct===null?"#d5d0c8":pct>=80?"#2d7a3a":pct>=50?"#d4a94e":"#cf5b5b";
      h+='<td style="padding:6px 8px;text-align:center;font-weight:700;color:'+col+'">'+(pct===null?"—":pct+"%")+'</td>';
    });
    h+='<td style="padding:6px 10px;text-align:right;color:#8a8680">'+fcEUR(a.av)+'</td>';
    h+='<td style="padding:6px 10px;text-align:right;font-weight:700;color:'+(a.tot>0?"#2c2925":"#b0a99f")+'">'+fcEUR(a.tot)+'</td>';
    h+='<td style="padding:6px 8px;min-width:80px"><div class="mb"><div class="mf" style="width:'+pc+'%;background:#c9a96e"></div></div></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';

  document.getElementById("p2").innerHTML=h+renderMonitorSection();
  document.querySelectorAll(".gbtn[data-gseas]").forEach(function(b){
    b.onclick=function(){aG=b.getAttribute("data-gseas");rA();};
  });
}
