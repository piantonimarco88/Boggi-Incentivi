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
// Coefficiente Inventari negozio: solo SM/VSM, mai per i negozi/dipendenti USA (regola a parte, calcUSA).
function demoltAppliesStore(e){
  if(!demoltActive()||!e||!e.j||e.j.indexOf("SM")<0)return false;
  return !(typeof isUSA==="function"&&isUSA(e.si,e));
}
// Allineamento fasce FC (da novembre 2026): le fasce «% DCC eseguiti» (completamento, asse orizzontale
// della matrice FC) diventano quelle del «% DCC eseguiti» del negozio (asse verticale della matrice
// negozio, bpA). Prima di quel mese resta la fascia salvata in DEMOLT_MATRIX_FC.bpB. Le fasce «% invio»
// e i valori della griglia FC non cambiano. Data modificabile in Configurazione (rule_cfg.demoltFc).
var DEMOLT_FCALIGN_YEAR=2026,DEMOLT_FCALIGN_MONTH=11;
function demoltFcAligned(){return (CFG_YEAR>DEMOLT_FCALIGN_YEAR)||(CFG_YEAR===DEMOLT_FCALIGN_YEAR&&CFG_MONTH>=DEMOLT_FCALIGN_MONTH);}
// Matrice FC effettivamente in uso nel mese configurato: UNICO punto di lettura (import, lettera, Configurazione).
function demoltMatrixFc(){
  if(!demoltFcAligned())return DEMOLT_MATRIX_FC;
  return {bpA:DEMOLT_MATRIX_FC.bpA,bpB:DEMOLT_MATRIX_STORE.bpA.slice(),grid:DEMOLT_MATRIX_FC.grid};
}
function demoltBandIdx(v,bp){if(v==null)return null;return v<bp[0]?0:(v<bp[1]?1:2);}
function demoltPct(matrix,valA,valB){var ai=demoltBandIdx(valA,matrix.bpA),bi=demoltBandIdx(valB,matrix.bpB);if(ai==null||bi==null)return null;return matrix.grid[ai][bi];}
function demoltBandLbl(bp,k){return k===0?"<"+Math.round(bp[0]*100)+"%":(k===2?"≥"+Math.round(bp[1]*100)+"%":Math.round(bp[0]*100)+"-"+Math.round(bp[1]*100)+"%");}

var DEMOLT_RESULT_STORE={}; // storeId(string) -> {pct, compl, acc}
var DEMOLT_RESULT_FC={};    // matricola FC -> {pct, invio, compl}

var DEMOLT_CHECK=null; // report dell'ultimo import: {file,ts,items:[{lvl,sc,t,d,list}]} — lvl ok|warn|err, sc s|f|b (negozi/FC/entrambi)

function _demoltNorm(s){return String(s==null?"":s).replace(/\s+/g," ").trim().toLowerCase();}
// Colonna per nome: prima match esatto (nell'ordine dei candidati), poi "contiene" — evita che
// "sended tasks" catturi "Sended tasks WIC corretti".
function _demoltCol(header,names){
  var hs=header.map(_demoltNorm),j,i;
  for(j=0;j<names.length;j++){i=hs.indexOf(names[j]);if(i>=0)return i;}
  for(j=0;j<names.length;j++)for(i=0;i<hs.length;i++)if(hs[i]&&hs[i].indexOf(names[j])>=0)return i;
  return -1;
}
// Valori cella senza interpretare gli errori Excel (#DIV/0! ecc.) come numeri: t==='e' -> "#ERR".
function _demoltSheetRows(ws){
  var rg=XLSX.utils.decode_range(ws["!ref"]||"A1"),rows=[],r,c;
  for(r=rg.s.r;r<=rg.e.r;r++){
    var row=[];
    for(c=rg.s.c;c<=rg.e.c;c++){var cell=ws[XLSX.utils.encode_cell({r:r,c:c})];row.push(cell?(cell.t==="e"?"#ERR":(cell.v==null?null:cell.v)):null);}
    rows.push(row);
  }
  return rows;
}
function _demoltNum(v){return (typeof v==="number"&&isFinite(v))?v:null;}
function _demoltFcKey(s){return String(s==null?"":s).toUpperCase().replace(/_\d+$/,"").replace(/\s+/g," ").trim().split(" ").sort().join(" ");}
function _demoltPctStr(v){return v==null?"—":(Math.round(v*1000)/10)+"%";}

// Percentuale già mostrata nel file (cella numerica; se espressa 0-100 si riporta a 0-1). Errori Excel/testo → null.
function _demoltPctVal(v){var n=_demoltNum(v);if(n==null)return null;return n>1?n/100:n;}
// Chiave nome FC che conserva il suffisso area («_2»): distingue le aree separate dello stesso FC.
function _demoltFcKeyX(s){return String(s==null?"":s).toUpperCase().replace(/\s+/g," ").trim().split(" ").sort().join(" ");}

// Elaborazione pura (testabile): sh={negozi:rows, fc:rows|null}. Sostituisce DEMOLT_RESULT_* e restituisce
// {items,nStore,nFc}. Nessun ricalcolo: si usano le % già presenti nel file (decisione 09/11/2026).
//  - Negozio: Completamento = colonna «% DCC Executed corretta», Accuracy = colonna «Accuracy» (Matrice negozi).
//  - FC: % Invio = colonna «% DCC Sent corretta», % Completamento = colonna «% DCC Executed» (Matrice FC).
function demoltProcessInventari(sh){
  var items=[];
  function add(lvl,sc,t,d,list){items.push({lvl:lvl,sc:sc,t:t,d:d||"",list:list||[]});}
  var rows=sh.negozi,h=rows[0]||[];
  var cId=_demoltCol(h,["store id"]),cName=_demoltCol(h,["store description"]),cCc=_demoltCol(h,["cyclecounttype"]);
  var cAcc=_demoltCol(h,["accuracy","% accuracy","accuracy %"]),cU=_demoltCol(h,["% dcc executed corretta"]);
  if(cId<0||cU<0){return {error:"colonne obbligatorie non trovate (Store Id, % DCC Executed corretta)"};}
  // ── Negozi ──
  var byStore={},dup=[],usa=[],noCompl=[],noAcc=[],accOdd=[],nRows=0,nWic=0;
  for(var r=1;r<rows.length;r++){
    var row=rows[r];if(!row||row[cId]==null||row[cId]==="")continue;
    nRows++;
    var sid=String(row[cId]).trim(),nm=cName>=0?String(row[cName]||""):"";
    if(byStore[sid])dup.push(sid);
    var cc=cCc>=0?String(row[cCc]||"").trim().toUpperCase():"";
    var acc=cAcc>=0?_demoltPctVal(row[cAcc]):null;
    var compl=_demoltPctVal(row[cU]);
    var s={sid:sid,nm:nm,cc:cc,acc:acc,compl:compl};
    byStore[sid]=s;
    if(cc==="WIC")nWic++;
    var lbl=sid+" "+nm;
    if(typeof storeIsUSA==="function"?storeIsUSA(sid):(typeof isUSA==="function"&&isUSA(sid))){s.usa=true;usa.push(lbl);continue;}
    if(compl==null)noCompl.push(lbl+" ("+(cc||"—")+")");
    if(acc==null){if(compl!=null)noAcc.push(lbl+" (completamento "+_demoltPctStr(compl)+")");}
    else if(acc<0.5)accOdd.push(lbl+": "+_demoltPctStr(acc));
  }
  if(dup.length)add("err","s","Store Id duplicati nel file",dup.length+" righe duplicate: l'ultima sovrascrive le precedenti.",dup);
  // ── Risultato per negozio ──
  DEMOLT_RESULT_STORE={};DEMOLT_RESULT_FC={};
  var nStore=0;
  Object.keys(byStore).forEach(function(sid){
    var s=byStore[sid];if(s.usa)return;
    var pct=demoltPct(DEMOLT_MATRIX_STORE,s.compl,s.acc);
    if(pct==null)return;
    DEMOLT_RESULT_STORE[sid]={pct:pct,compl:s.compl,acc:s.acc};nStore++;
  });
  add(nStore>0?"ok":"err","s","Negozi valorizzati: "+nStore+" su "+nRows+" righe","Percentuali lette direttamente dal file, senza ricalcoli: Completamento = «% DCC Executed corretta», Accuracy = «Accuracy» della scheda Matrice negozi ("+nWic+" negozi WIC).");
  if(usa.length)add("ok","s","Negozi USA esclusi: "+usa.length,"Hanno la loro regola (calcUSA): non ricevono il Coefficiente Inventari.",usa);
  if(noCompl.length)add("ok","s","Negozi senza «% DCC Executed corretta» ("+noCompl.length+")","Valore assente o errore nel file (es. #DIV/0!): non valorizzati, nessuna riduzione del premio.",noCompl);
  if(noAcc.length)add("ok","s","Negozi senza Accuracy («-»): "+noAcc.length,"Regola confermata: non valorizzati, nessuna riduzione del premio anche se il completamento è basso.",noAcc);
  if(accOdd.length)add("warn","s","Accuracy anomala (<50%): "+accOdd.length,"",accOdd);
  // ── Field Coach: % lette dalla scheda «Matrice FC» ──
  // Un'area FC riceve il coefficiente solo se ha almeno un negozio non USA (area interamente USA → nessun coefficiente).
  var haveMap=typeof FC_MAP!=="undefined"&&typeof FC_EMP!=="undefined"&&Object.keys(FC_MAP).length>0&&Object.keys(FC_EMP).length>0;
  var areaFc={};
  if(haveMap){
    Object.keys(FC_MAP).forEach(function(sid){
      var s=byStore[sid];if(!s||s.usa)return;
      var mp=FC_MAP[sid],fcArr=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);
      fcArr.forEach(function(matr){var emp=FC_EMP[matr];if(emp&&emp.j==="FC")areaFc[matr]=true;});
    });
  }else add("warn","f","Mappa negozi→FC non caricata","Importare l'anagrafica FC+VM prima del file inventari: senza di essa non si sa quali Field Coach hanno negozi non USA.");
  var nFc=0;
  if(sh.fc&&sh.fc.length){
    var fh=sh.fc[0],fN=_demoltCol(fh,["field coach"]),fM=_demoltCol(fh,["% dcc executed"]),fQ=_demoltCol(fh,["% dcc sent corretta"]);
    if(fN<0||fM<0||fQ<0)add("err","f","Scheda «Matrice FC»: colonne non trovate","Servono «Field Coach», «% DCC Executed» e «% DCC Sent corretta».");
    else{
      var rowEx={},rowLoose={};
      for(var k2=1;k2<sh.fc.length;k2++){var fr=sh.fc[k2];if(!fr||!fr[fN])continue;rowEx[_demoltFcKeyX(fr[fN])]=fr;if(!rowLoose[_demoltFcKey(fr[fN])])rowLoose[_demoltFcKey(fr[fN])]=fr;}
      var fcNoRow=[],fcNoVal=[];
      Object.keys(areaFc).forEach(function(matr){
        var emp=FC_EMP[matr],full=emp.n+" "+emp.c;
        var frw=rowEx[_demoltFcKeyX(full)]||rowLoose[_demoltFcKey(full)];
        if(!frw){fcNoRow.push(full);return;}
        var cm=_demoltPctVal(frw[fM]),iv=_demoltPctVal(frw[fQ]);
        if(cm==null||iv==null){fcNoVal.push(full+" (Invio "+_demoltPctStr(iv)+", Completamento "+_demoltPctStr(cm)+")");return;}
        var pct=demoltPct(demoltMatrixFc(),iv,cm);
        if(pct==null)return;
        DEMOLT_RESULT_FC[matr]={pct:pct,invio:iv,compl:cm};nFc++;
      });
      if(haveMap)add(nFc>0?"ok":"err","f","Field Coach valorizzati: "+nFc,"Percentuali lette direttamente dalla scheda Matrice FC, senza ricalcoli: Invio = «% DCC Sent corretta», Completamento = «% DCC Executed». Aree interamente USA escluse.");
      if(fcNoRow.length)add("warn","f","Field Coach non trovati nella Matrice FC: "+fcNoRow.length,"Nessuna riga con lo stesso nome: il premio d'area non viene ridotto.",fcNoRow);
      if(fcNoVal.length)add("warn","f","Field Coach con % mancante nella Matrice FC: "+fcNoVal.length,"Valore assente o errore nel file: il premio d'area non viene ridotto.",fcNoVal);
    }
  }else add("warn","f","Scheda «Matrice FC» non trovata","Senza la scheda nessun Field Coach riceve il Coefficiente Inventari.");
  return {items:items,nStore:nStore,nFc:nFc};
}

// Import file «INVENTARI + ACCURACY»: schede «Matrice negozi» (obbligatoria; in mancanza la prima scheda,
// formato legacy), «Matrice FC» e «Eccezioni FC» (verifica incrociata + sottrazione eccezioni dai working days).
// Un nuovo import SOSTITUISCE il precedente (il file contiene tutti i negozi).
function loadDemoltInventario(file){
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var wb=XLSX.read(new Uint8Array(ev.target.result),{type:"array",raw:true});
    function sheetBy(re){for(var i=0;i<wb.SheetNames.length;i++)if(re.test(_demoltNorm(wb.SheetNames[i])))return wb.Sheets[wb.SheetNames[i]];return null;}
    var wsN=sheetBy(/matrice negozi/)||wb.Sheets[wb.SheetNames[0]],wsF=sheetBy(/matrice fc/),wsE=sheetBy(/eccezioni/);
    var neg=_demoltSheetRows(wsN);
    if(!neg.length){alert("File inventari: nessun dato trovato.");return;}
    var res=demoltProcessInventari({negozi:neg,fc:wsF?_demoltSheetRows(wsF):null,ecc:wsE?_demoltSheetRows(wsE):null});
    if(res.error){alert("File inventari: "+res.error+".");return;}
    DEMOLT_CHECK={file:file.name,ts:new Date().toISOString(),items:res.items};
    autoSave();
    if(typeof rSources==="function")rSources();
    if(typeof rC==="function")rC();
    if(typeof rA==="function")rA();
    if(typeof PRIZE_MODE!=="undefined"&&PRIZE_MODE==="fcvm"){
      if(typeof rCFcvm==="function")rCFcvm();
      if(typeof rAFcvm==="function")rAFcvm();
    }
    var nW=res.items.filter(function(i){return i.lvl==="warn";}).length,nE=res.items.filter(function(i){return i.lvl==="err";}).length;
    alert(importDone("inventari","Inventari + Accuracy",(file&&file.name),"Inventari + Accuracy: "+res.nStore+" negozi"+(res.nFc>0?", "+res.nFc+" Field Coach":"")+" valorizzati.\n"+(nE+nW>0?"⚠ "+nE+" errori, "+nW+" avvisi: vedi il pannello «Controllo Inventari + Accuracy» in Fonti Dati.":"Controlli di coerenza: tutti superati.")));
  }catch(ex){alert("Errore lettura file inventari:\n"+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}

// Pannello di controllo in Fonti Dati: esito dell'ultimo import + copertura live (chi dovrebbe avere
// il coefficiente e non lo ha). scope: "s" (mensile) | "f" (FC+VM).
function demoltCheckItems(scope){
  var items=DEMOLT_CHECK?DEMOLT_CHECK.items.filter(function(i){return i.sc===scope||i.sc==="b";}):[];
  var live=[];
  if(scope==="s"&&typeof E!=="undefined"){
    var miss={};E.forEach(function(e){if(demoltAppliesStore(e)&&!DEMOLT_RESULT_STORE[String(e.si)])miss[String(e.si)]=e.s||"";});
    var ml=Object.keys(miss).map(function(k){return k+" "+miss[k];});
    live.push({lvl:ml.length?"warn":"ok",sc:"s",t:"Negozi con SM/VSM senza risultato inventari: "+ml.length,d:ml.length?"Il loro premio non viene ridotto (negozio assente dal file, USA, senza task o senza Accuracy).":"Tutti i negozi con SM/VSM hanno un risultato.",list:ml});
  }
  if(scope==="f"&&typeof FC_EMP!=="undefined"){
    var mf=[];Object.keys(FC_EMP).forEach(function(m){var e=FC_EMP[m];if(e.j==="FC"&&!DEMOLT_RESULT_FC[m])mf.push(e.n+" "+e.c);});
    live.push({lvl:mf.length?"warn":"ok",sc:"f",t:"Field Coach senza risultato inventari: "+mf.length,d:mf.length?"Il premio d'area non viene ridotto (area interamente USA — confermato —, negozi non mappati o senza task).":"Tutti i Field Coach hanno un risultato.",list:mf});
  }
  return items.concat(live);
}
// ok = risultati presenti e nessun errore bloccante nello scope; nW = avvisi da guardare
function demoltCheckState(scope){
  var n=scope==="s"?Object.keys(DEMOLT_RESULT_STORE).length:Object.keys(DEMOLT_RESULT_FC).length;
  var its=demoltCheckItems(scope),nE=its.filter(function(i){return i.lvl==="err";}).length,nW=its.filter(function(i){return i.lvl==="warn";}).length;
  return {n:n,nE:nE,nW:nW,ok:n>0&&nE===0};
}
function demoltCheckPanelHtml(scope){
  if(typeof demoltActive!=="function"||!demoltActive()||MODE!=="consuntivo"||!DEMOLT_CHECK)return "";
  var its=demoltCheckItems(scope),ic={ok:"✅",warn:"⚠️",err:"❌"},bg={ok:"#f0faf2",warn:"#fffaf0",err:"#fef6f0"},bd={ok:"#d4edda",warn:"#f3e0b0",err:"#f8d7da"};
  var h='<div class="wg"><div class="wg-title">&#128269; Controllo Inventari + Accuracy</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">File: <b>'+esc(DEMOLT_CHECK.file)+'</b> — importato il '+new Date(DEMOLT_CHECK.ts).toLocaleString("it-IT")+'</div>';
  its.forEach(function(it){
    h+='<div style="padding:6px 10px;margin-bottom:5px;background:'+bg[it.lvl]+';border:1px solid '+bd[it.lvl]+';border-radius:5px;font-size:10px">';
    h+='<div style="font-weight:700">'+ic[it.lvl]+' '+esc(it.t)+'</div>';
    if(it.d)h+='<div style="color:#6b6560;margin-top:2px">'+esc(it.d)+'</div>';
    if(it.list&&it.list.length)h+='<details style="margin-top:3px"><summary style="cursor:pointer;color:#a07d2c">Elenco ('+it.list.length+')</summary><div style="max-height:160px;overflow:auto;margin-top:3px;line-height:1.5">'+it.list.map(esc).join("<br>")+'</div></details>';
    h+='</div>';
  });
  return h+'</div>';
}
