// ============================================================
// Coefficiente Inventari — parametri, cutoff, import
// Riduce il premio (negozio: SM/VSM; FC+VM: solo FC) in base ai KPI
// sugli inventari giornalieri, validati nel tool di test
// demoltiplicatore/kpi_inventari.html. Attivo da DEMOLT_CUTOFF_YEAR/
// MONTH in poi (preventivo ottobre 2026) — stesso pattern del blocco
// SAS (SAS_MATRIX/sasNewActive in 50-params/010_main.js).
// ============================================================
var DEMOLT_MATRIX_STORE={bpA:[0.70,0.90],bpB:[0.95,0.98],grid:[[0.50,0.65,0.80],[0.60,0.75,0.90],[0.70,0.85,1.00]]};
var DEMOLT_MATRIX_FC={bpA:[0.80,0.95],bpB:[0.80,0.95],grid:[[0.50,0.65,0.80],[0.60,0.75,0.90],[0.70,0.85,1.00]]};
var DEMOLT_CUTOFF_YEAR=2026,DEMOLT_CUTOFF_MONTH=10;
function demoltActive(){return (CFG_YEAR>DEMOLT_CUTOFF_YEAR)||(CFG_YEAR===DEMOLT_CUTOFF_YEAR&&CFG_MONTH>=DEMOLT_CUTOFF_MONTH);}
function demoltBandIdx(v,bp){if(v==null)return null;return v<bp[0]?0:(v<bp[1]?1:2);}
function demoltPct(matrix,valA,valB){var ai=demoltBandIdx(valA,matrix.bpA),bi=demoltBandIdx(valB,matrix.bpB);if(ai==null||bi==null)return null;return matrix.grid[ai][bi];}
function demoltBandLbl(bp,k){return k===0?"<"+Math.round(bp[0]*100)+"%":(k===2?"≥"+Math.round(bp[1]*100)+"%":Math.round(bp[0]*100)+"-"+Math.round(bp[1]*100)+"%");}

var DEMOLT_RESULT_STORE={}; // storeId(string) -> {pct, compl, acc}
var DEMOLT_RESULT_FC={};    // matricola FC -> {pct, invio, compl}

function _demoltFindCol(headerRow,candidates){
  for(var i=0;i<headerRow.length;i++){
    var h=String(headerRow[i]==null?"":headerRow[i]).trim().toLowerCase();
    for(var j=0;j<candidates.length;j++){if(h===candidates[j]||h.indexOf(candidates[j])>=0)return i;}
  }
  return -1;
}

// Import Store Id/Working days/Sended tasks/Completed tasks/Accuracy (stesso formato
// del tool di test demoltiplicatore/kpi_inventari.html). Popola DEMOLT_RESULT_STORE
// (per negozio) e — aggregando per Field Coach via FC_MAP, solo ruolo FC — DEMOLT_RESULT_FC.
function loadDemoltInventario(file){
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:"array",raw:true});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
    if(!rows.length){alert("File inventari: nessun dato trovato.");return;}
    var header=rows[0];
    var cId=_demoltFindCol(header,["store id"]);
    var cWd=_demoltFindCol(header,["working days"]);
    var cSended=_demoltFindCol(header,["sended task","sended"]);
    var cCompleted=_demoltFindCol(header,["completed task","completed"]);
    var cAcc=_demoltFindCol(header,["% accuracy","accuracy %","accuracy"]);
    if(cId<0||cWd<0||cSended<0||cCompleted<0){alert("File inventari: colonne obbligatorie non trovate (Store Id, Working days, Sended tasks, Completed tasks).");return;}
    var byStore={};
    for(var r=1;r<rows.length;r++){
      var row=rows[r];
      if(!row||row[cId]==null||row[cId]==="")continue;
      var sid=String(row[cId]).trim();
      var wd=Number(row[cWd])||0,sended=Number(row[cSended])||0,completed=Number(row[cCompleted])||0;
      var acc=null;
      if(cAcc>=0&&row[cAcc]!=null&&row[cAcc]!==""){
        var av=Number(row[cAcc]);
        // Normalizzato a frazione 0-1 (stessa scala di bpA/bpB/grid, coerente con SAS_MATRIX)
        if(!isNaN(av))acc=av<=1?av:av/100;
      }
      byStore[sid]={wd:wd,sended:sended,completed:completed,acc:acc};
    }
    // ── Risultato per negozio ──
    var nStore=0;
    Object.keys(byStore).forEach(function(sid){
      var s=byStore[sid];
      var compl=s.sended>0?(s.completed/s.sended):null; // frazione 0-1
      var pct=demoltPct(DEMOLT_MATRIX_STORE,compl,s.acc);
      if(pct==null)return;
      DEMOLT_RESULT_STORE[sid]={pct:pct,compl:compl,acc:s.acc};
      nStore++;
    });
    // ── Risultato aggregato per Field Coach (via FC_MAP, solo ruolo FC — mai VM) ──
    var nFc=0;
    if(typeof FC_MAP!=="undefined"&&typeof FC_EMP!=="undefined"){
      var byFc={};
      Object.keys(FC_MAP).forEach(function(sid){
        var s=byStore[sid];if(!s)return;
        var mp=FC_MAP[sid];
        var fcArr=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);
        fcArr.forEach(function(matr){
          var emp=FC_EMP[matr];if(!emp||emp.j!=="FC")return;
          if(!byFc[matr])byFc[matr]={wd:0,sended:0,completed:0};
          byFc[matr].wd+=s.wd;byFc[matr].sended+=s.sended;byFc[matr].completed+=s.completed;
        });
      });
      Object.keys(byFc).forEach(function(matr){
        var g=byFc[matr];
        var invio=g.wd>0?(g.sended/g.wd):null; // frazione 0-1
        var compl=g.sended>0?(g.completed/g.sended):null; // frazione 0-1
        var pct=demoltPct(DEMOLT_MATRIX_FC,invio,compl);
        if(pct==null)return;
        DEMOLT_RESULT_FC[matr]={pct:pct,invio:invio,compl:compl};
        nFc++;
      });
    }
    autoSave();
    if(typeof rSources==="function")rSources();
    if(typeof rC==="function")rC();
    if(typeof rA==="function")rA();
    if(typeof PRIZE_MODE!=="undefined"&&PRIZE_MODE==="fcvm"){
      if(typeof rCFcvm==="function")rCFcvm();
      if(typeof rAFcvm==="function")rAFcvm();
    }
    alert("Inventari + Accuracy: "+nStore+" negozi aggiornati"+(nFc>0?", "+nFc+" Field Coach aggregati":"")+".");
  }catch(ex){alert("Errore lettura file inventari:\n"+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}
