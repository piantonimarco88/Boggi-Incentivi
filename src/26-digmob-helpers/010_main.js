// Get digital min % for a store (from store flag digType)
function resetDigMob(sid){
  if(STORE_FLAGS[sid])delete STORE_FLAGS[sid].digMinMob;
  var inp=document.querySelector('input[data-digmob="'+sid+'"]');
  if(inp){inp.value='';inp.style.borderColor='#d5d0c8';}
  markDirty();autoSave();rC();rA();
}

function setDigMobStd(sid){
  if(!STORE_FLAGS[sid])STORE_FLAGS[sid]={digType:'mobility'};
  STORE_FLAGS[sid].digMinMob=0.10;
  var inp=document.querySelector('input[data-digmob="'+sid+'"]');
  if(inp){inp.value='10.00';inp.style.borderColor='#8b7ec8';inp.style.background='#f5f0ff';}
  markDirty();autoSave();rC();rA();rT();
}

function toggleDigMob(){
  var b=document.getElementById("digMobBody");
  var a=document.getElementById("digMobArr");
  if(!b||!a)return;
  var show=b.style.display==="none";
  b.style.display=show?"block":"none";
  a.textContent=show?"▾":"▸";
}

function getDigMin(si){
  var sf=STORE_FLAGS[String(si)];
  var dt=(sf&&sf.digType)?sf.digType:"classic";
  if(dt==="mobility"){
    // Usa valore per-store se configurato, altrimenti fallback al globale
    return(sf&&sf.digMinMob!=null&&sf.digMinMob>0)?sf.digMinMob:PARAMS.digMinMobility;
  }
  return PARAMS.digMinClassic;
}
