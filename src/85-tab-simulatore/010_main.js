// ── #10 SIMULATORE WHAT-IF ────────────────────────────────────────────────
// Tab che permette di muovere live i PARAMS principali e vedere l'impatto
// immediato sul payout totale, suddiviso anche per ruolo.
//
// Strategia: i calcoli (calcE, calcEUR) leggono PARAMS come variabile
// globale. Per simulare:
//   1. Backup PARAMS originale in _SIM_ORIG_PARAMS
//   2. Sostituisco PARAMS con la copia modificata dagli slider
//   3. Itero E con calcEUR(e) -> aggregati
//   4. Ripristino PARAMS al valore originale prima di restituire il render
// I calcoli sono sincroni quindi lo swap e` safe.

"use strict";

// Parametri esposti nello slider — ordine = visualizzazione.
// Ogni entry: {k, label, min, max, step, suffix, decimals, group}
var SIM_PARAM_DEFS=[
  {k:"bdg100",        label:"Soglia BDG 100%",      min:0.90, max:1.05, step:0.001, suffix:"",     decimals:3, group:"BDG"},
  {k:"bdg60",         label:"Soglia BDG ridotto",   min:0.80, max:1.00, step:0.001, suffix:"",     decimals:3, group:"BDG"},
  {k:"bdg60mult",     label:"Moltiplicatore BDG ridotto", min:0.30, max:0.90, step:0.05, suffix:"", decimals:2, group:"BDG"},
  {k:"workgamePct",   label:"% Workgame",           min:0.00, max:0.50, step:0.01, suffix:"",     decimals:2, group:"BDG"},
  {k:"digPct",        label:"% Digital",            min:0.10, max:0.60, step:0.01, suffix:"",     decimals:2, group:"KPI"},
  {k:"syPct",         label:"% Shopper Yield",      min:0.01, max:0.10, step:0.005, suffix:"",    decimals:3, group:"KPI"},
  {k:"privPct",       label:"% Privilege",          min:0.00, max:0.10, step:0.005, suffix:"",    decimals:3, group:"KPI"},
  {k:"qtyPct",        label:"% QTY",                min:0.10, max:1.00, step:0.05, suffix:"",     decimals:2, group:"KPI"},
  {k:"artPct",        label:"% Articoli",           min:0.10, max:0.60, step:0.01, suffix:"",     decimals:2, group:"KPI"},
  {k:"sasRate",       label:"SAS rate (€/SAS)",     min:0.5,  max:5.0,  step:0.1,  suffix:"€",   decimals:1, group:"SAS/DCC"},
  {k:"sasMax",        label:"SAS max (€)",          min:50,   max:500,  step:10,   suffix:"€",   decimals:0, group:"SAS/DCC"},
  {k:"dccRate",       label:"DCC rate (%)",         min:0.001,max:0.01, step:0.0005,suffix:"",  decimals:4, group:"SAS/DCC"},
  {k:"dccMax",        label:"DCC max (€)",          min:25,   max:300,  step:5,    suffix:"€",   decimals:0, group:"SAS/DCC"}
];

// Backup dei PARAMS originali ad ogni apertura tab (assicura ripristino corretto)
var _SIM_ORIG_PARAMS=null;
var _SIM_CURRENT=null;   // copia in mutazione (cio` che mostrano gli slider)
var _SIM_DEBOUNCE_TIMER=null;

// Calcola il payout totale in EUR + breakdown per ruolo CON i params dati.
// SWAP atomico di PARAMS: backup -> set -> compute -> restore.
function _simComputePayout(simParams){
  if(typeof PARAMS==="undefined"||!Array.isArray(E))return null;
  var origRef=PARAMS;
  try{
    PARAMS=simParams;
    var totEur=0, nWithPremio=0;
    var byRole={};
    E.forEach(function(e){
      var v=0;
      try{v=(typeof calcEUR==="function")?(calcEUR(e)||0):0;}catch(ex){v=0}
      totEur+=v;
      if(v>0.01)nWithPremio++;
      var r=e.j||"(altro)";
      if(!byRole[r])byRole[r]={tot:0,n:0};
      byRole[r].tot+=v;
      byRole[r].n++;
    });
    return {totEur:totEur,nWithPremio:nWithPremio,byRole:byRole};
  } finally {
    PARAMS=origRef;
  }
}

// Conta dipendenti il cui payout EUR cambia tra orig e sim (oltre soglia)
function _simCountChanges(origParams,simParams){
  if(typeof PARAMS==="undefined"||!Array.isArray(E))return 0;
  var saveRef=PARAMS;
  try{
    // Compute orig values
    PARAMS=origParams;
    var orig=E.map(function(e){try{return calcEUR(e)||0}catch(ex){return 0}});
    // Compute sim values
    PARAMS=simParams;
    var sim=E.map(function(e){try{return calcEUR(e)||0}catch(ex){return 0}});
    var n=0;
    for(var i=0;i<orig.length;i++){
      if(Math.abs(sim[i]-orig[i])>0.01)n++;
    }
    return n;
  } finally {
    PARAMS=saveRef;
  }
}

// Render del tab
function rSimulatore(){
  var p10=document.getElementById("p10");
  if(!p10)return;
  if(typeof PARAMS==="undefined"||!Array.isArray(E)||E.length===0){
    p10.innerHTML='<div style="padding:24px;color:#8a8680">Caricare prima l\'anagrafica dipendenti (tab Fonti Dati).</div>';
    return;
  }

  // Ad ogni apertura del tab, ri-prendo i PARAMS attuali come baseline
  _SIM_ORIG_PARAMS=JSON.parse(JSON.stringify(PARAMS));
  _SIM_CURRENT=JSON.parse(JSON.stringify(PARAMS));

  // Render container
  var h='<div style="padding:12px">';

  // Intro + bottoni globali
  h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#6b6560;line-height:1.5">';
  h+='<b style="color:#2c2925">Simulatore What-If.</b> Muovi gli slider per vedere come cambiano il payout totale e la distribuzione per ruolo. ';
  h+='<b>Le modifiche sono solo di anteprima</b> — non vengono salvate nei PARAMS. Per applicarle definitivamente, copiali a mano dal tab Configurazione.';
  h+='</div>';

  // Impatto live (card)
  h+='<div id="simImpactCards"></div>';

  // Slider per parametri (raggruppati)
  h+='<div style="background:#fff;border:1px solid #e5e1db;border-radius:6px;padding:16px;margin-bottom:16px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h+='<div style="font-size:11px;color:#6b6560;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Parametri (anteprima)</div>';
  h+='<button id="simResetBtn" class="exp-btn" style="border-color:#8a8680;color:#8a8680;padding:4px 12px;font-size:11px">↺ Reset ai default</button>';
  h+='</div>';
  // Toggle artEnabled
  h+='<div style="margin-bottom:14px;display:flex;align-items:center;gap:8px">';
  h+='<input type="checkbox" id="sim_artEnabled" '+(PARAMS.artEnabled?'checked':'')+'>';
  h+='<label for="sim_artEnabled" style="font-size:12px;color:#4e4b48;cursor:pointer">Articoli incentivati abilitati</label>';
  h+='</div>';
  // Gruppi slider
  var groups={};
  SIM_PARAM_DEFS.forEach(function(p){if(!groups[p.group])groups[p.group]=[];groups[p.group].push(p)});
  Object.keys(groups).forEach(function(g){
    h+='<div style="margin-bottom:14px"><div style="font-size:10px;color:#8a8680;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">'+esc(g)+'</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">';
    groups[g].forEach(function(p){
      var v=PARAMS[p.k];
      h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:4px;padding:8px 10px">';
      h+='<div style="display:flex;justify-content:space-between;font-size:11px;color:#6b6560;margin-bottom:4px">';
      h+='<span>'+esc(p.label)+'</span>';
      h+='<span id="simVal_'+p.k+'" style="font-family:\'DM Sans\',monospace;color:#2c2925;font-weight:600">'+_simFmt(v,p)+'</span>';
      h+='</div>';
      h+='<input type="range" id="simRng_'+p.k+'" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+v+'" style="width:100%;accent-color:#c9a96e">';
      h+='</div>';
    });
    h+='</div></div>';
  });
  h+='</div>';

  // Breakdown per ruolo
  h+='<div id="simRoleBreakdown"></div>';

  h+='</div>';
  p10.innerHTML=h;

  // Hook listeners
  SIM_PARAM_DEFS.forEach(function(p){
    var el=document.getElementById("simRng_"+p.k);
    if(!el)return;
    el.oninput=function(){
      var v=parseFloat(this.value);
      _SIM_CURRENT[p.k]=v;
      var lab=document.getElementById("simVal_"+p.k);
      if(lab)lab.textContent=_simFmt(v,p);
      _simScheduleRecalc();
    };
  });
  var cb=document.getElementById("sim_artEnabled");
  if(cb)cb.onchange=function(){_SIM_CURRENT.artEnabled=this.checked;_simScheduleRecalc()};
  document.getElementById("simResetBtn").onclick=function(){
    _SIM_CURRENT=JSON.parse(JSON.stringify(_SIM_ORIG_PARAMS));
    // Aggiorna UI slider+label
    SIM_PARAM_DEFS.forEach(function(p){
      var el=document.getElementById("simRng_"+p.k);
      var lab=document.getElementById("simVal_"+p.k);
      var v=_SIM_CURRENT[p.k];
      if(el)el.value=v;
      if(lab)lab.textContent=_simFmt(v,p);
    });
    var cb2=document.getElementById("sim_artEnabled");
    if(cb2)cb2.checked=!!_SIM_CURRENT.artEnabled;
    _simRecalc();
  };

  // Primo render
  _simRecalc();
}

function _simFmt(v,p){
  if(typeof v!=="number")return String(v);
  var num=v.toFixed(p.decimals).replace(".",",");
  return num+(p.suffix?(" "+p.suffix):"");
}

function _simScheduleRecalc(){
  if(_SIM_DEBOUNCE_TIMER)clearTimeout(_SIM_DEBOUNCE_TIMER);
  _SIM_DEBOUNCE_TIMER=setTimeout(_simRecalc,150);
}

function _simRecalc(){
  var orig=_simComputePayout(_SIM_ORIG_PARAMS);
  var sim=_simComputePayout(_SIM_CURRENT);
  if(!orig||!sim)return;
  var nChanged=_simCountChanges(_SIM_ORIG_PARAMS,_SIM_CURRENT);

  // Card impatto
  var dE=sim.totEur-orig.totEur;
  var dP=orig.totEur>0?dE/orig.totEur:0;
  var dColor=dE>0.5?"#2d7a3a":(dE<-0.5?"#c0392b":"#8a8680");
  function _card(label,val,color,sub){
    return '<div class="cd" style="text-align:left">'
      +'<div style="font-size:10px;color:#8a8680;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">'+esc(label)+'</div>'
      +'<div style="font-size:20px;font-weight:700;color:'+(color||"#2c2925")+';margin-top:4px;font-family:\'DM Sans\',monospace">'+val+'</div>'
      +(sub?'<div style="font-size:10px;color:#8a8680;margin-top:2px">'+sub+'</div>':'')
      +'</div>';
  }
  var ih='<div class="cg" style="margin-bottom:16px">';
  ih+=_card("Payout Originale","€"+Math.round(orig.totEur).toLocaleString("it-IT"),"#c9a96e",orig.nWithPremio+" dip. con premio");
  ih+=_card("Payout Simulato","€"+Math.round(sim.totEur).toLocaleString("it-IT"),"#2d7a3a",sim.nWithPremio+" dip. con premio");
  ih+=_card("Delta €",(dE>=0?"+":"")+"€"+Math.round(dE).toLocaleString("it-IT"),dColor);
  ih+=_card("Delta %",(dP>=0?"+":"")+(dP*100).toFixed(2)+"%",dColor);
  ih+=_card("Dipendenti con cambio",nChanged+"/"+E.length,"#c9a96e",(E.length>0?(nChanged/E.length*100).toFixed(1)+"% del totale":""));
  ih+='</div>';
  document.getElementById("simImpactCards").innerHTML=ih;

  // Breakdown per ruolo
  var roles=Object.keys(orig.byRole).sort(function(a,b){
    return (orig.byRole[b].tot||0)-(orig.byRole[a].tot||0);
  });
  var bh='<div style="background:#fff;border:1px solid #e5e1db;border-radius:6px;padding:14px;margin-bottom:16px">';
  bh+='<div style="font-size:11px;color:#6b6560;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Impatto per ruolo</div>';
  bh+='<div class="scroll-wrap" style="max-height:340px;border:none">';
  bh+='<table style="font-size:11px">';
  bh+='<thead><tr><th style="cursor:default">Ruolo</th>';
  bh+='<th style="cursor:default;text-align:center">N dip.</th>';
  bh+='<th style="cursor:default;text-align:right">Orig €</th>';
  bh+='<th style="cursor:default;text-align:right">Sim €</th>';
  bh+='<th style="cursor:default;text-align:right">Δ €</th>';
  bh+='<th style="cursor:default;text-align:right">Δ %</th></tr></thead><tbody>';
  roles.forEach(function(r){
    var or=orig.byRole[r], sr=sim.byRole[r]||{tot:0,n:or.n};
    var dEr=sr.tot-or.tot;
    var dPr=or.tot>0?dEr/or.tot:0;
    var dCr=dEr>0.5?"#2d7a3a":(dEr<-0.5?"#c0392b":"#8a8680");
    bh+='<tr>';
    bh+='<td style="font-weight:600">'+esc(r)+'</td>';
    bh+='<td style="text-align:center;color:#8a8680">'+or.n+'</td>';
    bh+='<td class="r mn" style="color:#c9a96e">€'+Math.round(or.tot).toLocaleString("it-IT")+'</td>';
    bh+='<td class="r mn" style="color:#2d7a3a">€'+Math.round(sr.tot).toLocaleString("it-IT")+'</td>';
    bh+='<td class="r mn" style="color:'+dCr+';font-weight:600">'+(dEr>=0?"+":"")+'€'+Math.round(dEr).toLocaleString("it-IT")+'</td>';
    bh+='<td class="r mn" style="color:'+dCr+';font-weight:600">'+(dPr>=0?"+":"")+(dPr*100).toFixed(1)+'%</td>';
    bh+='</tr>';
  });
  bh+='</tbody></table></div></div>';
  document.getElementById("simRoleBreakdown").innerHTML=bh;
}
