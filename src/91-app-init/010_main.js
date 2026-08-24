var E=D.e;
// Migrate legacy "SM VSM" jobs to individual SM/VSM based on e.f
// Also uppercase store names and employee names
E.forEach(function(e){
  if(e.j&&e.j.indexOf("SM VSM")>=0){
    var mods=e.j.replace("SM VSM","").trim();
    e.j=(e.f==="VSM"?"VSM":"SM")+(mods?" "+mods:"");
  }
  if(e.s)e.s=e.s.toUpperCase();
  if(e.c)e.c=e.c.toUpperCase();
  if(e.n)e.n=e.n.toUpperCase();
});
document.getElementById("hs").textContent=E.length+" dipendenti \u00b7 "+Object.keys(D.s).length+" negozi";
document.getElementById("modeP").onclick=function(){setMode("preventivo")};
document.getElementById("modeC").onclick=function(){setMode("consuntivo")};
document.getElementById("regInt").onclick=function(){setRegion("international")};
document.getElementById("regIt").onclick=function(){setRegion("italia")};
// Restore visual mode + region state
document.getElementById("modeP").className="gbtn"+(MODE==="preventivo"?" on":"");
document.getElementById("modeC").className="gbtn"+(MODE==="consuntivo"?" on":"");
document.getElementById("regInt").className="gbtn"+(REGION==="international"?" on":"");
document.getElementById("regIt").className="gbtn"+(REGION==="italia"?" on":"");

// 11 TABS (k=8 #9b Storico, k=9 #15 Confronto, k=10 #10 Simulatore what-if)
var TD=[{k:"0",l:"\ud83d\udcca Calcolo Premi"},{k:"1",l:"\ud83d\udcc4 Lettera"},{k:"2",l:"\ud83d\udcc8 Analisi"},{k:"5",l:"\u270f\ufe0f Aggiunte"},{k:"7",l:"\ud83c\udfea Negozi"},{k:"6",l:"\ud83d\udce7 Distribuzione"},{k:"8",l:"\ud83d\uddd3\ufe0f Storico"},{k:"9",l:"\u2696\ufe0f Confronto"},{k:"10",l:"\ud83c\udf9a\ufe0f Simulatore"},{k:"3",l:"\u2699\ufe0f Configurazione"},{k:"4",l:"\ud83d\uddc2\ufe0f Fonti Dati"}];
var tbE=document.getElementById("tabs");
TD.forEach(function(td,i){var b=document.createElement("button");b.className="tab"+(i===0?" on":"");b.textContent=td.l;
  if(td.k==="5")b.id="tab-aggiunte";
  b.onclick=function(){document.querySelectorAll(".tab").forEach(function(t){t.className="tab"});b.className="tab on";
    document.querySelectorAll(".pnl").forEach(function(p){p.className="pnl"});document.getElementById("p"+td.k).className="pnl on";
    if(td.k==="0")rC();if(td.k==="2")rA();if(td.k==="3")rT();if(td.k==="4")rSources();if(td.k==="5")rAgg();if(td.k==="6")rDist();if(td.k==="7")rStores();if(td.k==="8")rStorico();if(td.k==="9")rConfronto();if(td.k==="10")rSimulatore()};tbE.appendChild(b)});
function updateAggiunteTabVisibility(){
  var t=document.getElementById("tab-aggiunte");
  if(!t)return;
  t.style.display=PRIZE_MODE==="seasonal"?"none":"";
  // If currently on Aggiunte tab and switching to seasonal, go to tab 0
  if(PRIZE_MODE==="seasonal"&&t.classList&&t.classList.contains("on")){
    document.querySelectorAll(".tab").forEach(function(tb){tb.className="tab"});
    document.querySelector(".tab").className="tab on";
    document.querySelectorAll(".pnl").forEach(function(p){p.className="pnl"});
    document.getElementById("p0").className="pnl on";
    rC();
  }
}
var cF={q:"",j:"ALL",s:"ALL"},cSort={col:"si_m",dir:1};
var cFS={q:"",s:"ALL"}; // seasonal filter state
function rebuildFilters(){
  var jS={},sS={};uJ=["ALL"];uS=["ALL"];
  E.forEach(function(e){if(e.j&&!jS[e.j]){jS[e.j]=1;uJ.push(e.j)}if(e.s&&!sS[e.s]){sS[e.s]=1;uS.push(e.s)}});
  uJ.sort();uS.sort();
}
var uJ=["ALL"],uS=["ALL"];
rebuildFilters();

// ── Riassegnazione manuale negozio (tab Calcolo Premi, mensile) ──────────────
// Elenco unico {si,s} derivato dagli stessi dipendenti (nessuna anagrafica negozi
// separata in questo formato): un negozio "esiste" se almeno un dipendente ci è assegnato.
var _storeEditMatr=null;
function _allStoresList(){
  var seen={},list=[];
  E.forEach(function(e){var sid=String(e.si);if(e.si!=null&&!seen[sid]){seen[sid]=1;list.push({si:e.si,s:e.s||sid});}});
  list.sort(function(a,b){return(Number(a.si)||0)-(Number(b.si)||0);});
  return list;
}
function startEditStore(matr){_storeEditMatr=matr;rC();}
function cancelEditStore(){_storeEditMatr=null;rC();}
function changeEmployeeStore(matr,newSi){
  var emp=null;for(var i=0;i<E.length;i++){if(E[i].m===matr){emp=E[i];break;}}
  if(!emp)return;
  var target=null,stores=_allStoresList();
  for(var j=0;j<stores.length;j++){if(String(stores[j].si)===String(newSi)){target=stores[j];break;}}
  if(!target)return;
  emp.si=target.si;emp.s=target.s;
  if(!D.s[String(target.si)])D.s[String(target.si)]={l:"",f:0,s:0,e:0,r:0};
  // Riallinea l'email del Field Coach (usata per distribuzione/invio PDF raggruppato per FC):
  // altrimenti resterebbe quella del negozio precedente, perché _distMf() preferisce
  // e.mf se già valorizzata e non la ricalcola da sola.
  var _mp=FC_MAP[String(target.si)],_newMf="";
  if(_mp){var _fa=Array.isArray(_mp.fc)?_mp.fc[0]:_mp.fc;if(_fa&&FC_EMP[_fa]){var _fe=FC_EMP[_fa];_newMf=(_fe.n+" "+_fe.c).toLowerCase().replace(/ /g,".")+"@boggi.com";}}
  emp.mf=_newMf;
  _storeEditMatr=null;
  rebuildFilters();autoSave();rC();rA();rSources();
}

// Store flags: modifiers applied to all employees in a store
var STORE_FLAGS={}; // {storeId: {dept:bool, noSas:bool, noDig:bool, digType:"classic"|"mobility"}}
initStoreFlags(); // seed from DEPT list
