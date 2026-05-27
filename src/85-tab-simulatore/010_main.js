// ── #10 SIMULATORE WHAT-IF ────────────────────────────────────────────────
"use strict";

// ── Parametri slider mensile ──────────────────────────────────────────────
var SIM_PARAM_DEFS=[
  {k:"bdg100",    label:"Soglia BDG 100%",         min:0.90, max:1.05, step:0.001,  suffix:"",  decimals:3, group:"BDG"},
  {k:"bdg60",     label:"Soglia BDG ridotto",      min:0.80, max:1.00, step:0.001,  suffix:"",  decimals:3, group:"BDG"},
  {k:"bdg60mult", label:"Molt. BDG ridotto",       min:0.30, max:0.90, step:0.05,   suffix:"",  decimals:2, group:"BDG"},
  {k:"workgamePct",label:"% Workgame",             min:0.00, max:0.50, step:0.01,   suffix:"",  decimals:2, group:"BDG"},
  {k:"digPct",    label:"% Digital",               min:0.10, max:0.60, step:0.01,   suffix:"",  decimals:2, group:"KPI"},
  {k:"syPct",     label:"% Shopper Yield",         min:0.01, max:0.10, step:0.005,  suffix:"",  decimals:3, group:"KPI"},
  {k:"privPct",   label:"% Privilege",             min:0.00, max:0.10, step:0.005,  suffix:"",  decimals:3, group:"KPI"},
  {k:"qtyPct",    label:"% QTY",                   min:0.10, max:1.00, step:0.05,   suffix:"",  decimals:2, group:"KPI"},
  {k:"artPct",    label:"% Articoli",              min:0.10, max:0.60, step:0.01,   suffix:"",  decimals:2, group:"KPI"},
  {k:"sasRate",   label:"SAS rate (€/SAS)",        min:0.5,  max:5.0,  step:0.1,    suffix:"€", decimals:1, group:"SAS/DCC"},
  {k:"sasMax",    label:"SAS max (€)",             min:50,   max:500,  step:10,     suffix:"€", decimals:0, group:"SAS/DCC"},
  {k:"dccRate",   label:"DCC rate (%)",            min:0.001,max:0.01, step:0.0005, suffix:"",  decimals:4, group:"SAS/DCC"},
  {k:"dccMax",    label:"DCC max (€)",             min:25,   max:300,  step:5,      suffix:"€", decimals:0, group:"SAS/DCC"}
];

// ── Parametri slider FC+VM ────────────────────────────────────────────────
var SIM_FCVM_PARAM_DEFS=[
  {k:"soglia100", label:"Soglia premio pieno (%)",   min:0.85, max:1.00, step:0.005, suffix:"%", decimals:1, group:"Soglie", scale:100},
  {k:"soglia60",  label:"Soglia premio ridotto (%)", min:0.80, max:1.00, step:0.005, suffix:"%", decimals:1, group:"Soglie", scale:100},
  {k:"pct60",     label:"% premio ridotto",          min:0.30, max:0.90, step:0.05,  suffix:"%", decimals:0, group:"Soglie", scale:100}
];

var _SIM_ORIG_PARAMS=null, _SIM_CURRENT=null;
var _SIM_FCVM_ORIG=null,   _SIM_FCVM_CUR=null;
var _SIM_DEBOUNCE_TIMER=null;

// ── Calc mensile ──────────────────────────────────────────────────────────
function _simComputePayout(simParams){
  if(typeof PARAMS==="undefined"||!Array.isArray(E))return null;
  var orig=PARAMS; try{ PARAMS=simParams;
    var tot=0,n=0,byR={};
    E.forEach(function(e){
      var v=0;try{v=(typeof calcEUR==="function")?(calcEUR(e)||0):0;}catch(ex){}
      tot+=v;if(v>0.01)n++;
      var r=e.j||"(altro)";if(!byR[r])byR[r]={tot:0,n:0};byR[r].tot+=v;byR[r].n++;
    });
    return{totEur:tot,nWithPremio:n,byRole:byR};
  }finally{PARAMS=orig;}
}
function _simCountChanges(origP,simP){
  if(typeof PARAMS==="undefined"||!Array.isArray(E))return 0;
  var orig=PARAMS;try{
    PARAMS=origP;var o=E.map(function(e){try{return calcEUR(e)||0}catch(ex){return 0}});
    PARAMS=simP; var s=E.map(function(e){try{return calcEUR(e)||0}catch(ex){return 0}});
    var n=0;for(var i=0;i<o.length;i++){if(Math.abs(s[i]-o[i])>0.01)n++;}return n;
  }finally{PARAMS=orig;}
}

// ── Calc FC+VM ────────────────────────────────────────────────────────────
function _simComputePayoutFcvm(simFcvmP){
  if(typeof FCVM_PARAMS==="undefined")return null;
  var pool=Object.values(FC_EMP||{});
  if(!pool.length)return null;
  var orig=FCVM_PARAMS;try{FCVM_PARAMS=simFcvmP;
    var tot=0,n=0,byR={};
    pool.forEach(function(emp){
      var r=calcFcVmPremio(emp.m);
      var exR=getFcVmExRate(emp.cu);
      var v=(r.hasBdg?r.totalPremioEur:r.premio_eur)+Math.round((AGG_FCVM[emp.m]||0)*exR*100)/100;
      tot+=v;if(v>0.01)n++;
      var role=emp.j||"(altro)";if(!byR[role])byR[role]={tot:0,n:0};byR[role].tot+=v;byR[role].n++;
    });
    return{totEur:tot,nWithPremio:n,byRole:byR};
  }finally{FCVM_PARAMS=orig;}
}
function _simCountChangesFcvm(origP,simP){
  if(typeof FCVM_PARAMS==="undefined")return 0;
  var pool=Object.values(FC_EMP||{});
  var orig=FCVM_PARAMS;try{
    FCVM_PARAMS=origP;var o=pool.map(function(emp){var r=calcFcVmPremio(emp.m);return r.hasBdg?r.totalPremioEur:r.premio_eur;});
    FCVM_PARAMS=simP; var s=pool.map(function(emp){var r=calcFcVmPremio(emp.m);return r.hasBdg?r.totalPremioEur:r.premio_eur;});
    var n=0;for(var i=0;i<o.length;i++){if(Math.abs(s[i]-o[i])>0.01)n++;}return n;
  }finally{FCVM_PARAMS=orig;}
}

// ── Helpers render comuni ─────────────────────────────────────────────────
function _simFmt(v,p){
  if(typeof v!=="number")return String(v);
  var disp=(p.scale?v*p.scale:v);
  return disp.toFixed(p.decimals).replace(".",",")+(p.suffix?(" "+p.suffix):"");
}
function _simCard(label,val,color,sub){
  return '<div class="cd" style="text-align:left">'
    +'<div style="font-size:10px;color:#8a8680;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">'+esc(label)+'</div>'
    +'<div style="font-size:20px;font-weight:700;color:'+(color||"#2c2925")+';margin-top:4px;font-family:\'DM Sans\',monospace">'+val+'</div>'
    +(sub?'<div style="font-size:10px;color:#8a8680;margin-top:2px">'+sub+'</div>':'')
    +'</div>';
}
function _simRenderImpact(origData,simData,nChanged,poolLen){
  var dE=simData.totEur-origData.totEur;
  var dP=origData.totEur>0?dE/origData.totEur:0;
  var dc=dE>0.5?"#2d7a3a":(dE<-0.5?"#c0392b":"#8a8680");
  var ih='<div class="cg" style="margin-bottom:16px">';
  ih+=_simCard("Payout Originale","€"+Math.round(origData.totEur).toLocaleString("it-IT"),"#c9a96e",origData.nWithPremio+" dip. con premio");
  ih+=_simCard("Payout Simulato","€"+Math.round(simData.totEur).toLocaleString("it-IT"),"#2d7a3a",simData.nWithPremio+" dip. con premio");
  ih+=_simCard("Delta €",(dE>=0?"+":"")+"€"+Math.round(dE).toLocaleString("it-IT"),dc);
  ih+=_simCard("Delta %",(dP>=0?"+":"")+(dP*100).toFixed(2)+"%",dc);
  ih+=_simCard("Dip. con cambio",nChanged+"/"+poolLen,"#c9a96e",(poolLen>0?(nChanged/poolLen*100).toFixed(1)+"% del totale":""));
  ih+='</div>';
  document.getElementById("simImpactCards").innerHTML=ih;

  var roles=Object.keys(origData.byRole).sort(function(a,b){return (origData.byRole[b].tot||0)-(origData.byRole[a].tot||0);});
  var bh='<div style="background:#fff;border:1px solid #e5e1db;border-radius:6px;padding:14px;margin-bottom:16px">';
  bh+='<div style="font-size:11px;color:#6b6560;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Impatto per ruolo</div>';
  bh+='<div class="scroll-wrap" style="max-height:340px;border:none"><table style="font-size:11px">';
  bh+='<thead><tr><th style="cursor:default">Ruolo</th><th style="cursor:default;text-align:center">N</th>';
  bh+='<th style="cursor:default;text-align:right">Orig €</th><th style="cursor:default;text-align:right">Sim €</th>';
  bh+='<th style="cursor:default;text-align:right">Δ €</th><th style="cursor:default;text-align:right">Δ %</th></tr></thead><tbody>';
  roles.forEach(function(r){
    var or=origData.byRole[r],sr=simData.byRole[r]||{tot:0,n:or.n};
    var dEr=sr.tot-or.tot,dPr=or.tot>0?dEr/or.tot:0;
    var dCr=dEr>0.5?"#2d7a3a":(dEr<-0.5?"#c0392b":"#8a8680");
    bh+='<tr><td style="font-weight:600">'+esc(r)+'</td><td style="text-align:center;color:#8a8680">'+or.n+'</td>';
    bh+='<td class="r mn" style="color:#c9a96e">€'+Math.round(or.tot).toLocaleString("it-IT")+'</td>';
    bh+='<td class="r mn" style="color:#2d7a3a">€'+Math.round(sr.tot).toLocaleString("it-IT")+'</td>';
    bh+='<td class="r mn" style="color:'+dCr+';font-weight:600">'+(dEr>=0?"+":"")+'€'+Math.round(dEr).toLocaleString("it-IT")+'</td>';
    bh+='<td class="r mn" style="color:'+dCr+';font-weight:600">'+(dPr>=0?"+":"")+(dPr*100).toFixed(1)+'%</td></tr>';
  });
  bh+='</tbody></table></div></div>';
  document.getElementById("simRoleBreakdown").innerHTML=bh;
}

// ── Render principale ─────────────────────────────────────────────────────
function rSimulatore(){
  var p10=document.getElementById("p10");
  if(!p10)return;

  // Dispatcher per modalità
  if(PRIZE_MODE==="fcvm"){
    _rSimulatoreFcvm(p10);return;
  }

  // Mensile / Seasonal
  if(typeof PARAMS==="undefined"||!Array.isArray(E)||E.length===0){
    p10.innerHTML='<div style="padding:24px;color:#8a8680">Caricare prima l\'anagrafica dipendenti (tab Fonti Dati).</div>';
    return;
  }
  _SIM_ORIG_PARAMS=JSON.parse(JSON.stringify(PARAMS));
  _SIM_CURRENT=JSON.parse(JSON.stringify(PARAMS));

  var h='<div style="padding:12px">';
  h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#6b6560;line-height:1.5">';
  h+='<b style="color:#2c2925">Simulatore What-If — Mensile.</b> Muovi gli slider per vedere come cambiano il payout totale e la distribuzione per ruolo. ';
  h+='<b>Le modifiche sono solo di anteprima</b> — non vengono salvate nei PARAMS.';
  h+='</div>';
  h+='<div id="simImpactCards"></div>';
  h+='<div style="background:#fff;border:1px solid #e5e1db;border-radius:6px;padding:16px;margin-bottom:16px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h+='<div style="font-size:11px;color:#6b6560;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Parametri (anteprima)</div>';
  h+='<button id="simResetBtn" class="exp-btn" style="border-color:#8a8680;color:#8a8680;padding:4px 12px;font-size:11px">↺ Reset</button>';
  h+='</div>';
  h+='<div style="margin-bottom:14px;display:flex;align-items:center;gap:8px">';
  h+='<input type="checkbox" id="sim_artEnabled" '+(PARAMS.artEnabled?'checked':'')+'>';
  h+='<label for="sim_artEnabled" style="font-size:12px;color:#4e4b48;cursor:pointer">Articoli incentivati abilitati</label>';
  h+='</div>';
  var groups={};
  SIM_PARAM_DEFS.forEach(function(p){if(!groups[p.group])groups[p.group]=[];groups[p.group].push(p);});
  Object.keys(groups).forEach(function(g){
    h+='<div style="margin-bottom:14px"><div style="font-size:10px;color:#8a8680;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">'+esc(g)+'</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">';
    groups[g].forEach(function(p){
      var v=PARAMS[p.k];
      h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:4px;padding:8px 10px">';
      h+='<div style="display:flex;justify-content:space-between;font-size:11px;color:#6b6560;margin-bottom:4px">';
      h+='<span>'+esc(p.label)+'</span><span id="simVal_'+p.k+'" style="font-family:\'DM Sans\',monospace;color:#2c2925;font-weight:600">'+_simFmt(v,p)+'</span></div>';
      h+='<input type="range" id="simRng_'+p.k+'" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+v+'" style="width:100%;accent-color:#c9a96e"></div>';
    });
    h+='</div></div>';
  });
  h+='</div><div id="simRoleBreakdown"></div></div>';
  p10.innerHTML=h;

  SIM_PARAM_DEFS.forEach(function(p){
    var el=document.getElementById("simRng_"+p.k);if(!el)return;
    el.oninput=function(){var v=parseFloat(this.value);_SIM_CURRENT[p.k]=v;var lab=document.getElementById("simVal_"+p.k);if(lab)lab.textContent=_simFmt(v,p);_simScheduleRecalc();};
  });
  var cb=document.getElementById("sim_artEnabled");
  if(cb)cb.onchange=function(){_SIM_CURRENT.artEnabled=this.checked;_simScheduleRecalc();};
  document.getElementById("simResetBtn").onclick=function(){
    _SIM_CURRENT=JSON.parse(JSON.stringify(_SIM_ORIG_PARAMS));
    SIM_PARAM_DEFS.forEach(function(p){var el=document.getElementById("simRng_"+p.k);var lab=document.getElementById("simVal_"+p.k);var v=_SIM_CURRENT[p.k];if(el)el.value=v;if(lab)lab.textContent=_simFmt(v,p);});
    var cb2=document.getElementById("sim_artEnabled");if(cb2)cb2.checked=!!_SIM_CURRENT.artEnabled;
    _simRecalc();
  };
  _simRecalc();
}

// ── Render FC+VM ──────────────────────────────────────────────────────────
function _rSimulatoreFcvm(p10){
  var pool=Object.values(FC_EMP||{});
  if(!pool.length){
    p10.innerHTML='<div style="padding:24px;color:#8a8680">Caricare prima l\'anagrafica FC+VM (tab Fonti Dati).</div>';
    return;
  }
  _SIM_FCVM_ORIG=JSON.parse(JSON.stringify(FCVM_PARAMS));
  _SIM_FCVM_CUR =JSON.parse(JSON.stringify(FCVM_PARAMS));

  var h='<div style="padding:12px">';
  h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#6b6560;line-height:1.5">';
  h+='<b style="color:#2c2925">Simulatore What-If — FC + VM.</b> Muovi le soglie per vedere l\'impatto sul payout area (FC e VM). ';
  h+='<b>Le modifiche sono solo di anteprima</b> — non vengono salvate.';
  h+='</div>';
  h+='<div id="simImpactCards"></div>';
  h+='<div style="background:#fff;border:1px solid #e5e1db;border-radius:6px;padding:16px;margin-bottom:16px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h+='<div style="font-size:11px;color:#6b6560;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Soglie premio (anteprima)</div>';
  h+='<button id="simFcvmResetBtn" class="exp-btn" style="border-color:#8a8680;color:#8a8680;padding:4px 12px;font-size:11px">↺ Reset</button>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">';
  SIM_FCVM_PARAM_DEFS.forEach(function(p){
    var v=FCVM_PARAMS[p.k];
    h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:4px;padding:8px 10px">';
    h+='<div style="display:flex;justify-content:space-between;font-size:11px;color:#6b6560;margin-bottom:4px">';
    h+='<span>'+esc(p.label)+'</span><span id="simFcvmVal_'+p.k+'" style="font-family:\'DM Sans\',monospace;color:#2c2925;font-weight:600">'+_simFmt(v,p)+'</span></div>';
    h+='<input type="range" id="simFcvmRng_'+p.k+'" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+v+'" style="width:100%;accent-color:#5b6abf"></div>';
  });
  h+='</div>';
  // Tabella esito per dipendente
  h+='<div style="margin-top:16px;font-size:10px;color:#8a8680;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">Impatto per dipendente</div>';
  h+='<div id="simFcvmDetail" class="scroll-wrap" style="max-height:320px;border:none"></div>';
  h+='</div>';
  h+='<div id="simRoleBreakdown"></div></div>';
  p10.innerHTML=h;

  SIM_FCVM_PARAM_DEFS.forEach(function(p){
    var el=document.getElementById("simFcvmRng_"+p.k);if(!el)return;
    el.oninput=function(){var v=parseFloat(this.value);_SIM_FCVM_CUR[p.k]=v;var lab=document.getElementById("simFcvmVal_"+p.k);if(lab)lab.textContent=_simFmt(v,p);_simScheduleRecalcFcvm();};
  });
  document.getElementById("simFcvmResetBtn").onclick=function(){
    _SIM_FCVM_CUR=JSON.parse(JSON.stringify(_SIM_FCVM_ORIG));
    SIM_FCVM_PARAM_DEFS.forEach(function(p){var el=document.getElementById("simFcvmRng_"+p.k);var lab=document.getElementById("simFcvmVal_"+p.k);var v=_SIM_FCVM_CUR[p.k];if(el)el.value=v;if(lab)lab.textContent=_simFmt(v,p);});
    _simRecalcFcvm();
  };
  _simRecalcFcvm();
}

function _simScheduleRecalc(){
  if(_SIM_DEBOUNCE_TIMER)clearTimeout(_SIM_DEBOUNCE_TIMER);
  _SIM_DEBOUNCE_TIMER=setTimeout(_simRecalc,150);
}
function _simScheduleRecalcFcvm(){
  if(_SIM_DEBOUNCE_TIMER)clearTimeout(_SIM_DEBOUNCE_TIMER);
  _SIM_DEBOUNCE_TIMER=setTimeout(_simRecalcFcvm,150);
}

function _simRecalc(){
  var orig=_simComputePayout(_SIM_ORIG_PARAMS);
  var sim=_simComputePayout(_SIM_CURRENT);
  if(!orig||!sim)return;
  var nChanged=_simCountChanges(_SIM_ORIG_PARAMS,_SIM_CURRENT);
  _simRenderImpact(orig,sim,nChanged,E.length);
}

function _simRecalcFcvm(){
  var orig=_simComputePayoutFcvm(_SIM_FCVM_ORIG);
  var sim=_simComputePayoutFcvm(_SIM_FCVM_CUR);
  if(!orig||!sim)return;
  var pool=Object.values(FC_EMP||{});
  var nChanged=_simCountChangesFcvm(_SIM_FCVM_ORIG,_SIM_FCVM_CUR);
  _simRenderImpact(orig,sim,nChanged,pool.length);

  // Tabella dettaglio per dipendente
  var origRef=FCVM_PARAMS;
  var detH='<table style="font-size:10px;width:100%"><thead><tr style="background:#f0f4ff">';
  detH+='<th style="padding:4px 8px;text-align:left">Matricola</th><th style="padding:4px 8px;text-align:left">Nome</th>';
  detH+='<th style="padding:4px 8px;text-align:center">Ruolo</th><th style="padding:4px 8px;text-align:right">% Area</th>';
  detH+='<th style="padding:4px 8px;text-align:center">Esito orig.</th><th style="padding:4px 8px;text-align:center">Esito sim.</th>';
  detH+='<th style="padding:4px 8px;text-align:right">Premio orig. €</th><th style="padding:4px 8px;text-align:right">Premio sim. €</th>';
  detH+='<th style="padding:4px 8px;text-align:right">Δ €</th></tr></thead><tbody>';
  pool.forEach(function(emp,i){
    FCVM_PARAMS=_SIM_FCVM_ORIG; var rO=calcFcVmPremio(emp.m);
    FCVM_PARAMS=_SIM_FCVM_CUR;  var rS=calcFcVmPremio(emp.m);
    FCVM_PARAMS=origRef;
    var exR=getFcVmExRate(emp.cu);
    var pO=rO.hasBdg?rO.totalPremioEur:rO.premio_eur;
    var pS=rS.hasBdg?rS.totalPremioEur:rS.premio_eur;
    var dE=pS-pO;
    var dc=dE>0.5?"#2d7a3a":(dE<-0.5?"#c0392b":"#8a8680");
    var esitoLabel={"full":"✓ Pieno","partial":"Ridotto","partial_nosy":"Soglia/–SY","none":"✗","preventivo":"Max"};
    var bg=i%2===0?"#fff":"#faf9f7";
    var esitoChanged=rO.esito!==rS.esito;
    detH+='<tr style="background:'+bg+'">';
    detH+='<td style="padding:3px 8px;font-family:monospace;color:#8a8680">'+esc(String(emp.m))+'</td>';
    detH+='<td style="padding:3px 8px;font-weight:600">'+esc(emp.c)+' '+esc(emp.n)+'</td>';
    detH+='<td style="padding:3px 8px;text-align:center"><span class="bg" style="background:'+(emp.j==="FC"?"#5b6abf":"#5bb98c")+';color:#fff">'+esc(emp.j)+'</span></td>';
    detH+='<td style="padding:3px 8px;text-align:right;font-weight:700">'+(rO.totTarget>0?fPct(rO.pct):"—")+'</td>';
    detH+='<td style="padding:3px 8px;text-align:center;font-size:9px;color:'+(esitoChanged?"#c9a96e":"#6b6560")+'">'+(esitoLabel[rO.esito]||rO.esito)+'</td>';
    detH+='<td style="padding:3px 8px;text-align:center;font-size:9px;font-weight:'+(esitoChanged?"700":"400")+';color:'+(esitoChanged?"#2d7a3a":"#6b6560")+'">'+(esitoLabel[rS.esito]||rS.esito)+'</td>';
    detH+='<td style="padding:3px 8px;text-align:right">€'+Math.round(pO).toLocaleString("it-IT")+'</td>';
    detH+='<td style="padding:3px 8px;text-align:right;font-weight:700;color:#2d7a3a">€'+Math.round(pS).toLocaleString("it-IT")+'</td>';
    detH+='<td style="padding:3px 8px;text-align:right;font-weight:700;color:'+dc+'">'+(dE>=0?"+":"")+'€'+Math.round(dE).toLocaleString("it-IT")+'</td>';
    detH+='</tr>';
  });
  detH+='</tbody></table>';
  var el=document.getElementById("simFcvmDetail");
  if(el)el.innerHTML=detH;
}
