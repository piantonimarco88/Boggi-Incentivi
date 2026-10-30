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

// Elaborazione pura (testabile): sh={negozi:rows, fc:rows|null, ecc:rows|null}. Sostituisce DEMOLT_RESULT_*
// e restituisce {items,nStore,nFc}. KPI attesi: negozio = Completamento (completed/sended, WIC: /4, max 100%)
// + Accuracy; FC = %Invio area (Σsended/Σ(working days − eccezioni), max 100%) + %Completamento (Σcompleted/Σsended).
function demoltProcessInventari(sh){
  var items=[];
  function add(lvl,sc,t,d,list){items.push({lvl:lvl,sc:sc,t:t,d:d||"",list:list||[]});}
  var rows=sh.negozi,h=rows[0]||[];
  var cId=_demoltCol(h,["store id"]),cName=_demoltCol(h,["store description"]),cFc=_demoltCol(h,["field coach"]),cCc=_demoltCol(h,["cyclecounttype"]);
  var cWd=_demoltCol(h,["working days"]),cSent=_demoltCol(h,["sended tasks","sended task"]),cComp=_demoltCol(h,["completed tasks","completed task"]);
  var cAcc=_demoltCol(h,["accuracy","% accuracy","accuracy %"]),cU=_demoltCol(h,["% dcc executed corretta"]);
  if(cId<0||cWd<0||cSent<0||cComp<0){return {error:"colonne obbligatorie non trovate (Store Id, Working days, Sended tasks, Completed tasks)"};}
  // ── Eccezioni FC (giorni senza DCC dovuto), esclusi gli END OF SEASON RETURNS ──
  var excStore={},excFc={},hasEcc=false;
  if(sh.ecc&&sh.ecc.length){
    var eh=sh.ecc[0],eS=_demoltCol(eh,["store id"]),eF=_demoltCol(eh,["field coach"]),eR=_demoltCol(eh,["inventory reason"]);
    if(eS>=0&&eR>=0){hasEcc=true;
      for(var q=1;q<sh.ecc.length;q++){var er=sh.ecc[q];if(!er||er[eS]==null||er[eS]==="")continue;
        if(_demoltNorm(er[eR])==="end of season returns")continue;
        var es=String(er[eS]).trim();excStore[es]=(excStore[es]||0)+1;
        if(eF>=0){var ek=_demoltFcKey(er[eF]);excFc[ek]=(excFc[ek]||0)+1;}}
    }
  }
  if(!hasEcc)add("warn","f","Scheda «Eccezioni FC» non trovata","I giorni di eccezione non vengono sottratti ai working days: % Invio area potrebbe risultare sottostimata.");
  // ── Negozi ──
  var byStore={},dup=[],usa=[],noSent=[],noAcc=[],wicZero=[],uMis=[],accOdd=[],nRows=0,nWic=0;
  for(var r=1;r<rows.length;r++){
    var row=rows[r];if(!row||row[cId]==null||row[cId]==="")continue;
    nRows++;
    var sid=String(row[cId]).trim(),nm=cName>=0?String(row[cName]||""):"";
    if(byStore[sid])dup.push(sid);
    var cc=cCc>=0?String(row[cCc]||"").trim().toUpperCase():"";
    var wd=_demoltNum(row[cWd])||0,sent=_demoltNum(row[cSent])||0,comp=_demoltNum(row[cComp])||0;
    var acc=cAcc>=0?_demoltNum(row[cAcc]):null;
    if(acc!=null&&acc>1)acc=acc/100;
    var denom=cc==="WIC"?4:sent;
    var compl=denom>0?Math.min(1,comp/denom):null;
    var s={sid:sid,nm:nm,fc:cFc>=0?String(row[cFc]||"").trim():"",cc:cc,wd:wd,sent:sent,comp:comp,acc:acc,compl:compl};
    byStore[sid]=s;
    if(cc==="WIC")nWic++;
    var lbl=sid+" "+nm;
    if(typeof isUSA==="function"&&isUSA(sid)){s.usa=true;usa.push(lbl);continue;}
    if(cU>=0){var fu=row[cU];
      if(compl!=null&&(typeof fu!=="number"||Math.abs(fu-compl)>0.0005))uMis.push(lbl+": file "+(typeof fu==="number"?_demoltPctStr(fu):fu)+" → ricalcolo "+_demoltPctStr(compl));}
    if(compl==null){noSent.push(lbl+" ("+(cc||"—")+")");}
    else if(cc==="WIC"&&sent===0){wicZero.push(lbl+" → completamento "+_demoltPctStr(compl));}
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
  add(nStore>0?"ok":"err","s","Negozi valorizzati: "+nStore+" su "+nRows+" righe","Completamento = Completed / Sended (WIC: Completed / 4, max 100%) e Accuracy — colonne «% DCC Executed corretta» e «Accuracy» della scheda Matrice negozi ("+nWic+" negozi WIC).");
  if(cU>=0)add(uMis.length?"err":"ok","s","Colonna «% DCC Executed corretta» verificata",uMis.length?uMis.length+" negozi con valore del file diverso dal ricalcolo (l'import usa il ricalcolo).":"Il valore del file coincide con il ricalcolo per tutti i negozi con task inviati.",uMis);
  else add("warn","s","Colonna «% DCC Executed corretta» assente","Completamento ricalcolato dalle colonne grezze (Sended/Completed/CycleCountType).");
  if(usa.length)add("ok","s","Negozi USA esclusi: "+usa.length,"Hanno la loro regola (calcUSA): non ricevono il Coefficiente Inventari.",usa);
  if(noSent.length)add("warn","s","Negozi senza task inviati: "+noSent.length,"Il file dà #DIV/0! — non valorizzati: nessuna riduzione del premio.",noSent);
  if(wicZero.length)add("warn","s","Negozi WIC con 0 task inviati: "+wicZero.length,"Per la formula del file (Completed / 4) risultano a 0% di completamento → fascia più bassa del demoltiplicatore. Verificare se il task non è mai stato inviato.",wicZero);
  if(noAcc.length)add("warn","s","Negozi senza Accuracy («-»): "+noAcc.length,"Non valorizzati: nessuna riduzione del premio, anche se il completamento è basso.",noAcc);
  if(accOdd.length)add("warn","s","Accuracy anomala (<50%): "+accOdd.length,"",accOdd);
  // ── Aggregato per Field Coach (assegnazione negozio→FC dell'anagrafica app) ──
  var fcDiff=[],haveMap=typeof FC_MAP!=="undefined"&&typeof FC_EMP!=="undefined"&&Object.keys(FC_MAP).length>0&&Object.keys(FC_EMP).length>0;
  var byFc={};
  if(haveMap){
    Object.keys(FC_MAP).forEach(function(sid){
      var s=byStore[sid];if(!s)return;
      var mp=FC_MAP[sid],fcArr=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);
      fcArr.forEach(function(matr){
        var emp=FC_EMP[matr];if(!emp||emp.j!=="FC")return;
        if(s.usa)return;
        if(s.fc&&_demoltFcKey(emp.n+" "+emp.c)!==_demoltFcKey(s.fc))fcDiff.push(sid+" "+s.nm+": file "+s.fc+" → app "+emp.n+" "+emp.c);
        if(!byFc[matr])byFc[matr]={wd:0,sent:0,comp:0,exc:0};
        var g=byFc[matr];g.wd+=s.wd;g.sent+=s.sent;g.comp+=s.comp;g.exc+=(excStore[sid]||0);
      });
    });
    var unm=Object.keys(byStore).filter(function(k){return !byStore[k].usa&&!FC_MAP[k];});
    if(unm.length)add("warn","f","Negozi del file non mappati a un FC nell'app: "+unm.length,"Non entrano nell'aggregato d'area.",unm.map(function(k){return k+" "+byStore[k].nm;}));
    if(fcDiff.length)add("warn","f","Negozi assegnati a un FC diverso nel file: "+fcDiff.length,"L'import segue l'assegnazione dell'app (FC_MAP), non quella del file.",fcDiff);
  }else add("warn","f","Mappa negozi→FC non caricata","Importare l'anagrafica FC+VM prima del file inventari: senza di essa non si calcola l'aggregato per Field Coach.");
  var nFc=0;
  Object.keys(byFc).forEach(function(matr){
    var g=byFc[matr],den=g.wd-g.exc;
    var invio=den>0?Math.min(1,g.sent/den):(g.sent>0?1:null);
    var compl=g.sent>0?g.comp/g.sent:null;
    var pct=demoltPct(DEMOLT_MATRIX_FC,invio,compl);
    if(pct==null)return;
    DEMOLT_RESULT_FC[matr]={pct:pct,invio:invio,compl:compl};nFc++;
  });
  if(haveMap)add(nFc>0?"ok":"err","f","Field Coach valorizzati: "+nFc,"% Invio area = Σ Sended / Σ (Working days − Eccezioni FC), max 100%; % Completamento = Σ Completed / Σ Sended — aggregati per negozio (le aree «_2» restano distinte, i negozi USA esclusi).");
  // ── Verifica incrociata con la scheda «Matrice FC» ──
  if(sh.fc&&sh.fc.length){
    var fh=sh.fc[0],fN=_demoltCol(fh,["field coach"]),fWd=_demoltCol(fh,["working days"]),fS=_demoltCol(fh,["sended tasks"]),fC=_demoltCol(fh,["completed tasks"]);
    var fM=_demoltCol(fh,["% dcc executed"]),fO=_demoltCol(fh,["eccezioni fc senza end of season returns"]),fQ=_demoltCol(fh,["% dcc sent corretta"]);
    var agg={};
    Object.keys(byStore).forEach(function(k){var s=byStore[k],key=_demoltFcKey(s.fc);if(!agg[key])agg[key]={wd:0,sent:0,comp:0};agg[key].wd+=s.wd;agg[key].sent+=s.sent;agg[key].comp+=s.comp;});
    var sumMis=[],mMis=[],oMis=[],qMis=[],nF=0;
    for(var k2=1;k2<sh.fc.length;k2++){
      var fr=sh.fc[k2];if(!fr||!fr[fN])continue;nF++;
      var key2=_demoltFcKey(fr[fN]),a=agg[key2],nmF=String(fr[fN]);
      if(!a){sumMis.push(nmF+": assente nella scheda Matrice negozi");continue;}
      var wdF=_demoltNum(fr[fWd])||0,sF=_demoltNum(fr[fS])||0,cF=_demoltNum(fr[fC])||0;
      if(wdF!==a.wd||sF!==a.sent||cF!==a.comp)sumMis.push(nmF+": FC "+wdF+"/"+sF+"/"+cF+" ≠ Σ negozi "+a.wd+"/"+a.sent+"/"+a.comp+" (working days/sended/completed)");
      var mv=fM>=0?_demoltNum(fr[fM]):null,mExp=sF>0?cF/sF:null;
      if(mv!=null&&mExp!=null&&Math.abs(mv-mExp)>0.0005)mMis.push(nmF+": file "+_demoltPctStr(mv)+" → atteso "+_demoltPctStr(mExp));
      var oV=fO>=0?(_demoltNum(fr[fO])||0):null,oExp=excFc[key2]||0;
      if(hasEcc&&oV!=null&&oV!==oExp)oMis.push(nmF+": colonna eccezioni "+oV+" ≠ conteggio scheda Eccezioni "+oExp);
      var qv=fQ>=0?_demoltNum(fr[fQ]):null,dd=wdF-oExp,qExp=dd>0?Math.min(1,sF/dd):(sF>0?1:null);
      if(qv!=null&&qExp!=null&&Math.abs(qv-qExp)>0.0005)qMis.push(nmF+": file "+_demoltPctStr(qv)+" → corretto "+_demoltPctStr(qExp)+" ("+sF+" inviati / ("+wdF+" − "+oExp+" eccezioni))");
    }
    add(sumMis.length?"err":"ok","f","Scheda Matrice FC: totali = somma dei negozi",sumMis.length?sumMis.length+" FC con totali diversi dalla somma della Matrice negozi.":nF+" FC: Working days, Sended e Completed coincidono con la somma dei rispettivi negozi.",sumMis);
    if(fM>=0)add(mMis.length?"err":"ok","f","Colonna «% DCC Executed» (FC)",mMis.length?mMis.length+" FC con valore diverso da Completed/Sended.":"Coincide con Completed / Sended per tutti i FC (è il KPI di completamento usato).",mMis);
    if(fO>=0&&hasEcc)add(oMis.length?"warn":"ok","f","Colonna eccezioni FC (senza END OF SEASON RETURNS)",oMis.length?oMis.length+" FC con conteggio diverso dalla scheda Eccezioni (tabella pivot non aggiornata?).":"Coincide col conteggio riga-per-riga della scheda Eccezioni FC per tutti i FC.",oMis);
    if(fQ>=0)add(qMis.length?"warn":"ok","f","Colonna «% DCC Sent corretta» (FC)",qMis.length?qMis.length+" FC con valore del file errato: «Working days corretti» è calcolato come Eccezioni + Sended invece di Working days − Eccezioni (con 0 eccezioni dà sempre 100%). L'import NON usa il valore del file ma il ricalcolo.":"Coincide col ricalcolo Sended / (Working days − Eccezioni).",qMis);
  }else add("warn","f","Scheda «Matrice FC» non trovata","Nessuna verifica incrociata dei totali per Field Coach.");
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
    alert("Inventari + Accuracy: "+res.nStore+" negozi"+(res.nFc>0?", "+res.nFc+" Field Coach":"")+" valorizzati.\n"+(nE+nW>0?"⚠ "+nE+" errori, "+nW+" avvisi: vedi il pannello «Controllo Inventari + Accuracy» in Fonti Dati.":"Controlli di coerenza: tutti superati."));
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
    live.push({lvl:mf.length?"warn":"ok",sc:"f",t:"Field Coach senza risultato inventari: "+mf.length,d:mf.length?"Il premio d'area non viene ridotto (area interamente USA, negozi non mappati o senza task).":"Tutti i Field Coach hanno un risultato.",list:mf});
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
