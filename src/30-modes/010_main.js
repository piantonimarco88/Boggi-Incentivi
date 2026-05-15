// === MODE ===
var MODE="consuntivo";
var REGION="international";// "international" or "italia"
function setMode(m){MODE=m;document.getElementById("modeP").className="gbtn"+(m==="preventivo"?" on":"");document.getElementById("modeC").className="gbtn"+(m==="consuntivo"?" on":"");rC();rA();rSources();if(typeof rDist==="function")rDist();autoSave()}
function setRegion(r){REGION=r;document.getElementById("regInt").className="gbtn"+(r==="international"?" on":"");document.getElementById("regIt").className="gbtn"+(r==="italia"?" on":"");rC();rA();rSources();rT();if(typeof rDist==="function")rDist();autoSave()}
var PRIZE_MODE="mensile"; // mensile | fcvm | seasonal
var SEASON_PERIOD="semestrale";  // mid | semestrale

function setPrizeMode(m){
  PRIZE_MODE=m;
  // Update button styles
  var modes=["mensile","fcvm","seasonal"];
  var ids=["modeMensile","modeFcVm","modeSeasonal"];
  ids.forEach(function(id,i){
    var btn=document.getElementById(id);
    if(!btn)return;
    var active=modes[i]===m;
    btn.style.background=active?"#c9a96e":"transparent";
    btn.style.color=active?"#2c2925":"#6b6560";
    btn.style.borderColor=active?"#c9a96e":"#4e4b48";
    btn.style.fontWeight=active?"700":"600";
    btn.disabled=false;
    btn.style.opacity="1";
    btn.style.cursor="pointer";
  });
  // Show/hide seasonal period toggle
  var periodRow = document.getElementById("seasonPeriodRow");
  if(periodRow) periodRow.style.display = (m === "seasonal") ? "flex" : "none";
  // Refresh all affected tabs
  rC();
  if(typeof rA==="function")rA();
  rT();
  rSources();
  if(typeof rStores==="function")rStores();
  rL();
  updateAggiunteTabVisibility();
  autoSave();
}

function setSeasonPeriod(p){
  SEASON_PERIOD=p;
  var btnTotale=document.getElementById("seasonTotale");
  var btnMid=document.getElementById("seasonMidSeason");
  if(btnTotale) btnTotale.className="gbtn"+(p==="semestrale"?" on":"");
  if(btnMid)    btnMid.className="gbtn"+(p==="mid"?" on":"");
  // Refresh seasonal view + sources (completeness checks change between mid/totale)
  if(PRIZE_MODE==="seasonal"){ rC(); rSources(); }
  autoSave();
}
