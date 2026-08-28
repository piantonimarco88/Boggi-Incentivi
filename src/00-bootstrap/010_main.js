"use strict";
var D_DEFAULT=JSON.parse(document.getElementById("jdata").textContent);
var AUTO_VERSION=3;// bump this when state format changes

// === STATE PERSISTENCE BRIDGE (v8.22+) ===
// Priorita`:
//   1) window.__BOGGI_STATE__ (iniettato dal wrapper C# da %LOCALAPPDATA%\BoggiIncentivi\state.json)
//   2) localStorage["boggi_state"] (fallback dev/browser puro, e migrazione dal vecchio storage)
// Save:
//   - Se chrome.webview esiste: postMessage({type:"saveState", payload}) -> C# debounce 500ms -> state.json
//   - Altrimenti: localStorage.setItem (dev mode in browser)
var _hasWebMsg=typeof chrome!=="undefined"&&chrome.webview&&typeof chrome.webview.postMessage==="function";
var _needsMigrationFromLS=false;
function _readInitialState(){
  // 1) State iniettato dal wrapper
  if(window.__BOGGI_HAS_STATE__&&window.__BOGGI_STATE__){
    try{return window.__BOGGI_STATE__}catch(e){/* fall through */}
  }
  // 2) localStorage (fallback / vecchia installazione da migrare)
  try{
    var raw=localStorage.getItem("boggi_state");
    if(raw){
      var parsed=JSON.parse(raw);
      // Se siamo dentro al wrapper C# e troviamo dati solo in localStorage -> migra al primo save
      if(_hasWebMsg)_needsMigrationFromLS=true;
      return parsed;
    }
  }catch(e){}
  return null;
}
// Try to restore from persisted state (AppData o localStorage)
var D;
try{
  var st=_readInitialState();
  var _fcvmHasData=st&&st.fc_emp&&Object.keys(st.fc_emp).length>0;
  if(st&&st.v===AUTO_VERSION&&st.D&&(Array.isArray(st.D.e)&&st.D.e.length>0||_fcvmHasData)){
    D=st.D;
    if(!D.t)D.t={};if(!D.c)D.c={};if(!D.s)D.s={};if(!D.v)D.v={};if(!D.tr)D.tr=D_DEFAULT.tr||{};if(!D.usa)D.usa={};if(!D.cs)D.cs={};
    window._autoState=st;
  }else{
    D=D_DEFAULT;
    // Versione/struttura non valida: pulisci entrambi gli storage
    try{localStorage.removeItem("boggi_state")}catch(e2){}
    if(_hasWebMsg){try{chrome.webview.postMessage({type:"resetState"})}catch(e2){}}
  }
}catch(ex){
  D=D_DEFAULT;
  try{localStorage.removeItem("boggi_state")}catch(e2){}
  if(_hasWebMsg){try{chrome.webview.postMessage({type:"resetState"})}catch(e2){}}
}
var DEPT=[1187,1188,1189,1190,1191,1192,1194,1197,1198,1303,1304,1305,1310,1312,1318,1319,1326,1327,1328,1329,1331,1332,1333,1338,1339,1344,1350];
