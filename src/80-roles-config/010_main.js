var RL=[
  "SM","VSM","SSA","SSAP","SA","JSA","SCS",
  "SM DEPT","VSM DEPT","SSA DEPT","SSAP DEPT","SA DEPT","JSA DEPT","SCS DEPT",
  "SM NO SAS","VSM NO SAS","SSA NO SAS","SSAP NO SAS","SA NO SAS","JSA NO SAS","SCS NO SAS",
  "SM NO DIGITAL","VSM NO DIGITAL","SSA NO DIGITAL","SSAP NO DIGITAL","SA NO DIGITAL","JSA NO DIGITAL","SCS NO DIGITAL",
  "SCS NO SAS NO DIGITAL",
  "SM NO DIGITAL NO SY NO PRIVILEGE","VSM NO DIGITAL NO SY NO PRIVILEGE","SSA NO DIGITAL NO SY NO PRIVILEGE","SSAP NO DIGITAL NO SY NO PRIVILEGE","SA NO DIGITAL NO SY NO PRIVILEGE","JSA NO DIGITAL NO SY NO PRIVILEGE",
  "SCS NO DIGITAL NO PRIVILEGE"
];
var KP=["BDG","Digital","SY","Privilege","SAS","DCC","CS","Articoli","Visual","QTY Dept"];
var TC={};
// Motore condiviso (v9.116): KPI predefiniti per ruolo e migrazioni dei vecchi salvataggi in
// UN solo posto. Prima la tabella era ricopiata 4 volte (qui, ripristino automatico, Carica
// sessione, Carica configurazione) e le migrazioni erano diverse nei tre ripristini.
function tcDefault(r,k){
  var isSCS=r.indexOf("SCS")>=0,isDept=r.indexOf("DEPT")>=0,isNoSas=r.indexOf("NO SAS")>=0,isNoDig=r.indexOf("NO DIGITAL")>=0,isNoSY=r.indexOf("NO SY")>=0,isNoPriv=r.indexOf("NO PRIVILEGE")>=0;
  if(k==="BDG")return true;
  if(k==="Digital")return !isNoDig&&!isDept;
  if(k==="SY")return !isSCS&&!isDept&&!isNoSY;
  if(k==="Privilege")return !isDept&&!isNoPriv;
  if(k==="SAS")return isSCS&&!isNoSas;
  if(k==="DCC")return isSCS;
  if(k==="CS")return false;
  if(k==="Articoli")return true;
  if(k==="Visual")return false;
  if(k==="QTY Dept")return isDept;
}
function initTC(){RL.forEach(function(r){TC[r]={};KP.forEach(function(k){TC[r][k]=tcDefault(r,k);});});}
// Ruoli che mancano in TC (salvataggi vecchi): aggiunti con i KPI predefiniti
function tcFillMissing(){RL.forEach(function(r){if(!TC[r]){TC[r]={};KP.forEach(function(k){TC[r][k]=tcDefault(r,k);});}});}
// Ruoli storici "SM VSM ..." -> "SM ..." e "VSM ..." separati (prima solo in Carica configurazione)
function tcMigrateLegacy(tc){
  if(!tc)return tc;
  [["SM VSM","SM","VSM"],["SM VSM NO DIGITAL","SM NO DIGITAL","VSM NO DIGITAL"],["SM VSM DEPT","SM DEPT","VSM DEPT"]].forEach(function(m){
    if(tc[m[0]]&&!tc[m[1]]){tc[m[1]]=JSON.parse(JSON.stringify(tc[m[0]]));tc[m[2]]=JSON.parse(JSON.stringify(tc[m[0]]));}
  });
  return tc;
}
// Parametri storici: digMin unico -> digMinClassic / digMinMobility (+2 punti)
function paramsMigrate(p){
  if(p&&p.digMin!==undefined&&p.digMinClassic===undefined){p.digMinClassic=p.digMin;p.digMinMobility=p.digMin+0.02;}
  return p;
}
initTC();
