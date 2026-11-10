// ============================================================
// Barra a passi (v9.114): Import -> Verifica -> Calcolo -> PDF -> Invio
// Sta sopra i tab (che restano invariati) e mostra lo stato di ogni passo; cliccando un
// passo si apre il dettaglio con le cose da fare e un pulsante che porta al tab giusto.
// Nessuna logica nuova: ogni stato viene da funzioni che l'app ha gia`:
//  - Import   -> checklist «Completezza» di Fonti Dati (SRC_CHECKS, scritta da rSources)
//  - Verifica -> controlli dopo l'import (importChecks, 35-validation)
//  - Calcolo  -> pool delle lettere e premi (getLetterPool / calcEUR)
//  - PDF      -> ora dell'ultimo «Salva tutti i PDF» (_pdfBatchTs) vs ultima modifica dati
//  - Invio    -> log invii email del periodo (MAIL_LOG)
// ============================================================
// window.SRC_CHECKS: {checks:[{l,ok,v}]} — scritto da rSources/rSourcesFcvm
// window._lastChangeTs: ultima modifica dei dati (ogni autoSave non «silenzioso», 84-state-restore)
// (proprieta` di window: assegnate anche da blocchi <script> strict o caricati prima di questo)
if(typeof window.SRC_CHECKS==="undefined")window.SRC_CHECKS=null;
if(typeof window._lastChangeTs==="undefined")window._lastChangeTs=null;
var _stepSel=null;        // passo aperto nel dettaglio (indice) o null
var _stepTimer=null;

function _stepGoTab(k){
  try{
    var i=-1;for(var j=0;j<TD.length;j++)if(TD[j].k===k){i=j;break;}
    var b=document.querySelectorAll(".tab")[i];if(b)b.click();
  }catch(_e){}
}
function _stepTime(d){return d?d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):"";}
function _stepPeriod(){try{return getPdfSubfolder().fileBase;}catch(_e){return "";}}

function stepState(){
  var isFcvm=PRIZE_MODE==="fcvm",inWebView=!!(window.chrome&&window.chrome.webview);
  var steps=[];
  // 1. Import
  var ch=(window.SRC_CHECKS&&window.SRC_CHECKS.checks)||[];
  // le fonti facoltative («(opt.)», «opzionale») non bloccano il passo
  var isOpt=function(c){return /\(opt|opzional/i.test(String(c.l||"")+" "+String(c.v||""));};
  var req=ch.filter(function(c){return !isOpt(c);});
  var nOk=req.filter(function(c){return c.ok;}).length,missing=req.filter(function(c){return !c.ok;});
  var hasAnag=isFcvm?Object.keys(FC_EMP||{}).length>0:(E||[]).length>0;
  steps.push({k:"import",n:"Import",
    st:!ch.length||!hasAnag?"todo":(missing.length?"warn":"ok"),
    sub:req.length?(nOk+" di "+req.length+" fonti"):"Nessun file",
    d:missing.length?"Mancano "+missing.length+" fonti del mese.":(hasAnag?"Tutte le fonti del mese sono caricate.":"Carica per prima l'anagrafica."),
    rows:ch.map(function(c){return [c.ok?"ok":(isOpt(c)?"todo":"warn"),c.l,c.ok?(c.v||""):(isOpt(c)?"facoltativa":(c.v||""))];}),
    btn:["Apri Fonti Dati",function(){_stepGoTab("4");}]});
  // 2. Verifica
  var chk=[];try{chk=typeof importChecks==="function"?importChecks():[];}catch(_e){}
  var nErr=chk.filter(function(c){return c.lvl==="err";}).length;
  steps.push({k:"verifica",n:"Verifica",
    st:!hasAnag?"todo":(nErr?"err":(chk.length?"warn":"ok")),
    sub:!hasAnag?"In attesa dei dati":(chk.length?chk.length+(chk.length===1?" avviso":" avvisi"):"Nessun avviso"),
    d:chk.length?"Puoi proseguire, ma controlla questi punti prima dei PDF.":"Nessun problema rilevato dai controlli automatici.",
    rows:chk.map(function(c){return [c.lvl==="err"?"err":"warn",c.t,""];}),
    btn:["Verifica dati",function(){if(typeof runValidationsAndReport==="function")runValidationsAndReport();else _stepGoTab("4");}]});
  // 3. Calcolo
  var pool=[];try{pool=getLetterPool();}catch(_e){}
  var rows3=[["ok","Dipendenti con lettera",String(pool.length)]],tot=null;
  if(!isFcvm&&PRIZE_MODE==="mensile"){try{tot=0;var nPos=0;pool.forEach(function(e){var v=calcEUR(e)||0;tot+=v;if(v>0)nPos++;});
    rows3.push(["ok","Totale premi (EUR)","€ "+Math.round(tot).toLocaleString("it-IT")]);rows3.push(["ok","Dipendenti con premio",nPos+" di "+pool.length]);}catch(_e){tot=null;}}
  var impOk=steps[0].st==="ok";
  steps.push({k:"calcolo",n:"Calcolo",
    st:!pool.length?"todo":(impOk?"ok":"warn"),
    sub:!pool.length?"Nessun dipendente":(tot!=null?"€ "+Math.round(tot).toLocaleString("it-IT"):pool.length+" dipendenti"),
    d:!pool.length?"Il calcolo parte quando l'anagrafica è caricata.":(impOk?"Premi calcolati sui dati attuali.":"Premi calcolati, ma alcune fonti mancano: i KPI senza dati valgono 0."),
    rows:rows3,btn:["Apri Calcolo premi",function(){_stepGoTab("0");}]});
  // 4. PDF
  var bt=typeof _pdfBatchTs!=="undefined"?_pdfBatchTs:null;
  var lc=window._lastChangeTs;
  var stale=!!(bt&&lc&&lc>bt);
  steps.push({k:"pdf",n:"PDF",
    st:!pool.length?"todo":(!bt?"todo":(stale?"warn":"ok")),
    sub:!pool.length?"In attesa dei dati":(!bt?"Da generare":(stale?"Da rigenerare":"Generati alle "+_stepTime(bt))),
    d:!bt?"In questa sessione i PDF non sono ancora stati generati."+(inWebView?" Usa «Salva tutti i PDF» nella barra in alto dell'app.":"")
      :(stale?"Hai modificato dati o aggiunte dopo l'ultimo «Salva tutti i PDF» ("+_stepTime(bt)+", modifica alle "+_stepTime(lc)+"): rigenera i PDF prima di inviare.":"PDF generati alle "+_stepTime(bt)+", nessuna modifica successiva."),
    rows:[["ok","PDF da generare",String(pool.length)]].concat(bt?[[stale?"warn":"ok","Ultimo «Salva tutti i PDF»",_stepTime(bt)]]:[]).concat(lc?[["ok","Ultima modifica dei dati",_stepTime(lc)]]:[]),
    btn:inWebView?null:["Salva tutti i PDF (ZIP)",function(){if(typeof saveAllPDFsZip==="function")saveAllPDFsZip();}]});
  // 5. Invio
  var per=_stepPeriod(),log=(typeof MAIL_LOG!=="undefined"?MAIL_LOG:[]).filter(function(l){return l.period===per&&l.docType===MODE&&l.prizeMode===PRIZE_MODE;});
  var last={};log.forEach(function(l){last[l.m]=l.status;});
  var cnt={sent:0,error:0,unconfirmed:0,prepared:0};Object.keys(last).forEach(function(m){cnt[last[m]]=(cnt[last[m]]||0)+1;});
  var withMail=pool.filter(function(e){return e.mp&&e.mp.indexOf("@")>0;}).length;
  var pdfOk=steps[3].st==="ok";
  steps.push({k:"invio",n:"Invio",
    st:!pool.length?"todo":(cnt.error?"err":(!pdfOk&&!cnt.sent?"lock":(cnt.sent>=withMail&&withMail>0?"ok":(cnt.sent||cnt.unconfirmed?"warn":"todo")))),
    sub:cnt.sent||cnt.error||cnt.unconfirmed?(cnt.sent+" inviate"+(cnt.error?" · "+cnt.error+" errori":"")):(!pdfOk?"In attesa dei PDF":"Da inviare"),
    d:!pdfOk&&!cnt.sent?"Prima genera (o rigenera) i PDF.":"Invio email del periodo "+per+(isFcvm?"":" ai dipendenti")+" e ZIP ai Field Coach dal tab Distribuzione.",
    rows:[["ok","Dipendenti con email",String(withMail)],[cnt.sent?"ok":"warn","Inviate",String(cnt.sent)]]
      .concat(cnt.unconfirmed?[["warn","Non confermate",String(cnt.unconfirmed)]]:[]).concat(cnt.error?[["err","Errori",String(cnt.error)]]:[]),
    btn:["Apri Distribuzione",function(){_stepGoTab("6");}]});
  return steps;
}

var _STEP_C={ok:["#e8f0e0","#3b6d11","✓"],warn:["#faeeda","#854f0b","!"],err:["#fcebeb","#a32d2d","✕"],todo:["#f0ede7","#5f5e5a","•"],lock:["#f0ede7","#a09a92","–"]};
function stepBarHtml(steps){
  var h='<div style="display:flex;gap:6px;align-items:stretch;margin:0 0 10px">';
  steps.forEach(function(s,i){var c=_STEP_C[s.st]||_STEP_C.todo,sel=_stepSel===i;
    h+='<button type="button" data-step="'+i+'" style="flex:1;min-width:0;text-align:left;cursor:pointer;padding:8px 10px;border-radius:8px;font-family:inherit;'+
      'border:'+(sel?'1.5px solid #c9a96e':'1px solid #e5e1db')+';background:'+(sel?'#fff':'#faf9f7')+'">'+
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="width:18px;height:18px;border-radius:50%;background:'+c[0]+';color:'+c[1]+';display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+c[2]+'</span>'+
      '<span style="font-size:12px;font-weight:700;color:#2c2925">'+(i+1)+'. '+esc(s.n)+'</span></div>'+
      '<div style="font-size:10px;color:'+c[1]+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(s.sub)+'</div></button>';
    if(i<steps.length-1)h+='<div style="display:flex;align-items:center;color:#c9a96e;font-size:14px">›</div>';
  });
  h+='</div>';
  if(_stepSel!==null&&steps[_stepSel]){var s=steps[_stepSel];
    h+='<div style="background:#fff;border:1px solid #e5e1db;border-radius:8px;padding:10px 14px;margin:0 0 12px">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px"><div><div style="font-size:13px;font-weight:700;color:#2c2925">'+(_stepSel+1)+'. '+esc(s.n)+'</div>'+
      '<div style="font-size:11px;color:#8a8680">'+esc(s.d)+'</div></div>'+
      '<div style="display:flex;gap:6px">'+(s.btn?'<button type="button" class="exp-btn" id="stepBtn">'+esc(s.btn[0])+'</button>':'')+'<button type="button" class="exp-btn" id="stepClose" title="Chiudi">✕</button></div></div>';
    s.rows.slice(0,30).forEach(function(r){var c=_STEP_C[r[0]]||_STEP_C.todo;
      h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #f0ede7;font-size:11px;color:#2c2925">'+
        '<span style="width:16px;height:16px;border-radius:50%;background:'+c[0]+';color:'+c[1]+';display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">'+c[2]+'</span>'+
        '<span style="flex:1">'+esc(r[1])+'</span><span style="color:#8a8680">'+esc(r[2])+'</span></div>';});
    if(s.rows.length>30)h+='<div style="font-size:10px;color:#8a8680;padding-top:4px">… e altri '+(s.rows.length-30)+'</div>';
    h+='</div>';
  }
  return h;
}
function stepBarRender(){
  try{
    var el=document.getElementById("stepBar");if(!el)return;
    var steps=stepState();
    el.innerHTML=stepBarHtml(steps);
    document.querySelectorAll("#stepBar [data-step]").forEach(function(b){b.onclick=function(){
      var i=parseInt(b.getAttribute("data-step"),10);_stepSel=(_stepSel===i?null:i);stepBarRender();};});
    var sb=document.getElementById("stepBtn");if(sb&&_stepSel!==null&&steps[_stepSel].btn)sb.onclick=steps[_stepSel].btn[1];
    var sc=document.getElementById("stepClose");if(sc)sc.onclick=function(){_stepSel=null;stepBarRender();};
  }catch(ex){if(typeof console!=="undefined")console.error("stepBar:",ex);}
}
// aggiornamento raggruppato (dopo salvataggi, import, cambi di tab)
function stepBarSoon(){if(_stepTimer)clearTimeout(_stepTimer);_stepTimer=setTimeout(function(){_stepTimer=null;stepBarRender();},150);}
_afterScripts(function(){
  stepBarRender();
  // ogni cambio di tab ridisegna la barra (gli stati possono essere cambiati nel frattempo)
  try{document.getElementById("tabs").addEventListener("click",stepBarSoon);}catch(_e){}
});
