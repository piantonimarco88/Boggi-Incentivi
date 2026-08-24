// Cartella base PDF memorizzata dopo "Salva Tutti i PDF" (C# BtnSaveAllPDF_Click)
// evita che l'utente debba riselezionare la cartella ogni volta
var _pdfSaveBaseFolder=null;
if(window.chrome&&window.chrome.webview){
  window.chrome.webview.addEventListener('message',function(ev){
    if(typeof ev.data==='string'&&ev.data.startsWith('pdfBaseFolderSet:')){
      _pdfSaveBaseFolder=ev.data.slice('pdfBaseFolderSet:'.length);
    }
  });
}

// Oggetto e corpo email dipendente: definiti UNA volta, usati da tutti i flussi
function _empSubject(){
  return "BOGGI INCENTIVE PROGRAM - "+getPeriodLabelEn()+" - "+(MODE==="preventivo"?"FORECAST":"FINAL");
}
function _empBody(e,crlf){
  var nl=crlf?"\r\n":"\n";
  var period=getPeriodLabelEn();
  return MODE==="preventivo"
    ?("Hi "+e.n+","+nl+nl+"Please find attached your FORECAST incentive letter for "+period+"."+nl+"This document shows your projected bonus based on current targets - final amounts will be confirmed at month end."+nl+nl+"Best regards")
    :("Hi "+e.n+","+nl+nl+"Please find attached your FINAL incentive letter for "+period+"."+nl+"This document confirms the bonus amount that will be included in your payslip."+nl+nl+"Best regards");
}

// Helper condiviso: genera EML con PDF (blob) allegato e lo scarica
function _downloadEmlWithPdf(e, pdfBlob, pdfName){
  var subj=_empSubject();
  var bodyTxt=_empBody(e,true);
  var reader=new FileReader();
  reader.onload=function(ev){
    var b64=ev.target.result.split(",")[1];
    // Se siamo nell'exe (WebView2): apri direttamente in Outlook via C# COM
    if(window.chrome&&window.chrome.webview){
      window.chrome.webview.postMessage({
        type:"openOutlookMail",
        to:e.mp||"",
        subject:subj,
        body:bodyTxt.replace(/\r\n/g,"\n"),
        pdfBase64:b64,
        pdfName:pdfName
      });
      logMailSent(e.m,e.mp,'prepared');
      return;
    }
    // Fallback browser: scarica .eml
    var boundary="boggi_"+Date.now();
    var eml="To: "+e.mp+"\r\nSubject: "+subj+"\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\""+boundary+"\"\r\n\r\n";
    eml+="--"+boundary+"\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"+bodyTxt+"\r\n\r\n";
    eml+="--"+boundary+"\r\nContent-Type: application/pdf; name=\""+pdfName+"\"\r\nContent-Disposition: attachment; filename=\""+pdfName+"\"\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    eml+=(b64.match(/.{1,76}/g)||[]).join("\r\n")+"\r\n\r\n--"+boundary+"--\r\n";
    var emlBlob=new Blob([eml],{type:"message/rfc822"});
    var a=document.createElement("a");a.href=URL.createObjectURL(emlBlob);a.download=pdfName.replace(".pdf",".eml");
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
    logMailSent(e.m,e.mp,'prepared');
  };
  reader.readAsDataURL(pdfBlob);
}

// Genera PDF + EML per un singolo dipendente (bottone 📧 per riga)
function sendOneEmployeeMail(matr){
  var e=E.filter(function(x){return x.m===matr;})[0];
  if(!e||!e.mp||e.mp.indexOf("@")<0){alert("Email non disponibile per questo dipendente.");return;}
  var isSeasonal=PRIZE_MODE==="seasonal";
  var pdfName=getEmpPdfFilename(e);
  var PAGE_W_PX=794,SCALE=2,PAGE_W_MM=210,PAGE_H_MM=297,MARGIN_MM=8,CONT_W_MM=PAGE_W_MM-MARGIN_MM*2;
  var PX_PER_MM=(PAGE_W_PX/PAGE_W_MM)*SCALE;
  var PAGE_H_PX_SCALED=Math.round(PAGE_H_MM*PX_PER_MM),MARGIN_PX_SCALED=Math.round(MARGIN_MM*PX_PER_MM),CONT_H_PX_SCALED=PAGE_H_PX_SCALED-MARGIN_PX_SCALED*2;
  var css=document.querySelector("style").textContent;
  var wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;left:-900px;top:0;width:800px;overflow:visible;z-index:1;background:#fff";
  document.body.appendChild(wrap);
  wrap.innerHTML='<style>'+css+'</style><style>*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body,div{font-family:"DM Sans",sans-serif;font-size:13px}.lt{max-width:800px;width:800px;box-shadow:none;border:none}</style>'+(isSeasonal?buildSeasonalLetterAuto(e):(isUSA(e.si,e)?buildLetterUSA(e):buildLetter(e)));
  document.fonts.ready.then(function(){setTimeout(function(){
    var target=wrap.querySelector(".lt")||wrap;
    var fullH=target.scrollHeight||1200,fullHScaled=Math.round(fullH*SCALE);
    var numPages=Math.max(1,Math.ceil((fullHScaled-MARGIN_PX_SCALED*2)/CONT_H_PX_SCALED));
    html2canvas(target,{scale:SCALE,useCORS:true,allowTaint:true,backgroundColor:"#ffffff",width:PAGE_W_PX,height:fullH,windowWidth:PAGE_W_PX}).then(function(canvas){
      var pdf=new jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      for(var p=0;p<numPages;p++){
        if(p>0)pdf.addPage();
        var srcY=MARGIN_PX_SCALED+p*CONT_H_PX_SCALED,sliceH=Math.min(CONT_H_PX_SCALED,fullHScaled-srcY);
        if(sliceH<=0)break;
        var sc=document.createElement("canvas");sc.width=canvas.width;sc.height=sliceH;
        sc.getContext("2d").drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,canvas.width,sliceH);
        pdf.addImage(sc.toDataURL("image/jpeg",0.92),"JPEG",MARGIN_MM,MARGIN_MM,CONT_W_MM,sliceH/PX_PER_MM);
      }
      document.body.removeChild(wrap);
      _downloadEmlWithPdf(e,pdf.output("blob"),pdfName);
    });
  },200);});
}

// === Invio batch ai dipendenti: pre-flight → invio → esito =================
// Flusso WebView2: risolvi cartella → checkPdfFiles (C#) → pannello verifica
// → loop invio con esito per destinatario → tabella risultati con retry.
// Flusso browser: fallback EML come prima (nessun pre-flight possibile).

// Shell overlay scuro condiviso (stile app)
function _empOverlay(innerHtml,minW){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1714;z-index:99999;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif";
  ov.innerHTML='<div style="background:#2c2925;border:1px solid #55504a;border-radius:14px;padding:30px 38px;min-width:'+(minW||440)+'px;max-width:660px;box-shadow:0 8px 40px rgba(0,0,0,.7);text-align:center">'+
    '<div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:10px">Boggi Milano</div>'+innerHtml+'</div>';
  document.body.appendChild(ov);
  return ov;
}
var _EMP_BTN='padding:8px 22px;border-radius:6px;border:1px solid #6b6560;background:transparent;color:#e0dbd4;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit';
var _EMP_BTN_GOLD='padding:8px 22px;border-radius:6px;border:1px solid #c9a96e;background:transparent;color:#c9a96e;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit';

function sendMailEmployees(){
  var miss=canProduceLetter();
  if(miss.length>0){alert("Dati mancanti:\n• "+miss.join("\n• "));return;}
  var isSeasonal=PRIZE_MODE==="seasonal";
  var isFcvm=PRIZE_MODE==="fcvm";
  var pool=isSeasonal?E.filter(function(e){return isSMVSM(e);}):isFcvm?Object.values(FC_EMP):E;
  var targets=pool.filter(function(e){return e.mp&&e.mp.indexOf("@")>0;});
  var noEmail=pool.filter(function(e){return !(e.mp&&e.mp.indexOf("@")>0);});
  if(!targets.length){alert("Nessun dipendente con email trovato.");return;}
  if(!(window.chrome&&window.chrome.webview)){_empMailBrowser(targets,isSeasonal,isFcvm);return;}
  // Priorità: 1) CFG_PDF_PATH configurato, 2) path memorizzato da "Salva Tutti i PDF", 3) picker
  var baseF=CFG_PDF_PATH?CFG_PDF_PATH.replace(/[\/\\]$/,""):(_pdfSaveBaseFolder||null);
  var pdfSub=MODE==="preventivo"?getPdfSubfolder().prev:getPdfSubfolder().cons;
  if(baseF){
    _empPreflight(baseF+"\\"+pdfSub.replace(/\//g,"\\"),targets,noEmail);
  }else{
    var h=null;
    h=function(ev){
      if(typeof ev.data==='string'){
        if(ev.data.startsWith('folderSelected:')){
          window.chrome.webview.removeEventListener('message',h);
          var sel=ev.data.slice('folderSelected:'.length);
          var sub=pdfSub.replace(/\//g,"\\");
          _pdfSaveBaseFolder=sel.endsWith("\\"+sub)?sel.slice(0,sel.length-sub.length-1):sel;
          _empPreflight(sel,targets,noEmail);
        } else if(ev.data==='folderCancelled'){
          window.chrome.webview.removeEventListener('message',h);
        }
      }
    };
    window.chrome.webview.addEventListener('message',h);
    window.chrome.webview.postMessage({type:"selectPdfFolder",initialPath:_pdfSaveBaseFolder||""});
  }
}

// Chiede al C# quali PDF esistono nella cartella prima di iniziare
function _empPreflight(folder,targets,noEmail){
  var names=targets.map(function(e){return getEmpPdfFilename(e);});
  var h=null;
  h=function(ev){
    if(typeof ev.data==='string'&&ev.data.startsWith('pdfCheckResult:')){
      window.chrome.webview.removeEventListener('message',h);
      var res;
      try{res=JSON.parse(ev.data.slice('pdfCheckResult:'.length));}
      catch(err){res={folderExists:false,existing:0,missing:names};}
      _empShowPreflight(folder,targets,noEmail,res);
    }
  };
  window.chrome.webview.addEventListener('message',h);
  window.chrome.webview.postMessage({type:"checkPdfFiles",folderPath:folder,files:names});
}

// Pannello di verifica: tutto visibile PRIMA che parta qualsiasi invio
function _empShowPreflight(folder,targets,noEmail,res){
  var missingSet={};(res.missing||[]).forEach(function(n){missingSet[n]=1;});
  var sendable=targets.filter(function(e){return !missingSet[getEmpPdfFilename(e)];});
  var skippedPdf=targets.filter(function(e){return missingSet[getEmpPdfFilename(e)];});
  var OK='&#10003;',WARN='&#9888;',ERR='&#10005;';
  function row(icon,color,label,value){
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid #3d3a36;font-size:12px;text-align:left">'+
      '<span style="color:'+color+';width:16px;text-align:center;flex-shrink:0">'+icon+'</span>'+
      '<span style="color:#8a8680;flex:0 0 100px">'+label+'</span>'+
      '<span style="color:#e0dbd4;flex:1;word-break:break-all">'+value+'</span></div>';
  }
  var h='';
  h+='<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:2px">Invia mail ai dipendenti</div>';
  h+='<div style="font-size:11px;color:#a09a92;margin-bottom:14px">Verifica prima dell\'invio</div>';
  h+=row(res.folderExists?OK:ERR,res.folderExists?'#5bb98c':'#cf5b5b','Cartella PDF',esc(folder)+(res.folderExists?'':' — NON TROVATA'));
  h+=row(skippedPdf.length===0?OK:WARN,skippedPdf.length===0?'#5bb98c':'#e8b34b','PDF presenti',
    res.existing+' / '+targets.length+(skippedPdf.length?' — mancanti: '+skippedPdf.slice(0,3).map(function(e){return esc(e.m);}).join(', ')+(skippedPdf.length>3?' +'+(skippedPdf.length-3):''):''));
  h+=row(noEmail.length===0?OK:WARN,noEmail.length===0?'#5bb98c':'#e8b34b','Email',
    targets.length+' valide'+(noEmail.length?' · '+noEmail.length+' senza email (saltati)':''));
  h+=row(OK,'#5bb98c','Oggetto',esc(_empSubject()));
  h+='<div style="background:#1f1c19;border-radius:8px;padding:10px 12px;margin:12px 0;text-align:left">'+
     '<div style="font-size:10px;color:#6b6560;margin-bottom:4px">Anteprima corpo email</div>'+
     '<div style="font-size:11px;color:#a09a92;line-height:1.5">'+esc(_empBody(targets[0],false).substring(0,280)).replace(/\n/g,'<br>')+'</div></div>';
  h+='<div style="display:flex;gap:8px;justify-content:center;margin-top:6px">'+
     '<button id="empPfCancel" style="'+_EMP_BTN+'">Annulla</button>'+
     '<button id="empPfSend" style="'+_EMP_BTN_GOLD+(sendable.length===0?';opacity:.35;cursor:default':'')+'">&#128231; Invia '+sendable.length+' email</button></div>';
  var ov=_empOverlay(h,540);
  var pre=[];
  noEmail.forEach(function(e){pre.push({e:e,ok:false,skipped:true,reason:'Email mancante',retryable:false});});
  skippedPdf.forEach(function(e){pre.push({e:e,ok:false,skipped:true,reason:'PDF non trovato',retryable:false});});
  document.getElementById('empPfCancel').onclick=function(){document.body.removeChild(ov);};
  if(sendable.length>0){
    document.getElementById('empPfSend').onclick=function(){
      document.body.removeChild(ov);
      _empSendLoop(folder,sendable,pre);
    };
  }
}

// Loop di invio con esito per destinatario (mailResult dal C#) e pausa/riprendi
function _empSendLoop(folder,queue,preResults){
  var total=queue.length,done=0;
  var results=preResults.slice();
  var lastOk=true,lastErr='';
  var paused=false,resumeIdx=0;
  var h='';
  h+='<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:16px">&#128231; Invio email</div>';
  h+='<div style="width:100%;height:6px;background:#3d3a36;border-radius:3px;overflow:hidden;margin-bottom:12px"><div id="empBar" style="width:0%;height:100%;background:#c9a96e;border-radius:3px;transition:width .2s"></div></div>';
  h+='<div id="empCount" style="font-size:13px;color:#e0dbd4;font-weight:600;margin-bottom:6px">0 / '+total+'</div>';
  h+='<div id="empLabel" style="font-size:10px;color:#8a8680;margin-bottom:14px">&nbsp;</div>';
  h+='<div style="display:flex;gap:8px;justify-content:center">'+
     '<button id="empStop" style="'+_EMP_BTN.replace('#6b6560','#cf5b5b').replace('#e0dbd4','#cf5b5b')+'">&#9209; Ferma</button>'+
     '<button id="empResume" style="display:none;'+_EMP_BTN.replace('#6b6560','#5bb98c').replace('#e0dbd4','#5bb98c')+'">&#9654; Riprendi</button></div>';
  var ov=_empOverlay(h,440);
  var wv=function(ev){
    if(typeof ev.data!=='string')return;
    if(ev.data.startsWith('mailResult:')){
      var r=ev.data.slice('mailResult:'.length);
      if(r==='ok'){lastOk=true;lastErr='';}
      else{lastOk=false;lastErr=r.indexOf('err:')===0?r.slice(4):r;}
    } else if(ev.data==='mailDone'){
      var e=queue[done];
      if(e){results.push({e:e,ok:lastOk,skipped:false,reason:lastOk?'Inviata':lastErr,retryable:!lastOk});logMailSent(e.m,e.mp,lastOk?'sent':'error');}
      done++;
      var bar=document.getElementById('empBar'),cnt=document.getElementById('empCount');
      if(bar)bar.style.width=Math.round(done/total*100)+'%';
      if(cnt)cnt.textContent=done+' / '+total;
      if(paused){resumeIdx=done;return;}
      next(done);
    }
  };
  window.chrome.webview.addEventListener('message',wv);
  function cleanup(){
    window.chrome.webview.removeEventListener('message',wv);
    if(document.body.contains(ov))document.body.removeChild(ov);
  }
  function next(i){
    if(i>=total){cleanup();_empShowResults(folder,results);return;}
    var e=queue[i];
    lastOk=true;lastErr='';
    var lbl=document.getElementById('empLabel');
    if(lbl)lbl.textContent=e.c+' '+e.n+' → '+e.mp;
    window.chrome.webview.postMessage({type:'sendOutlookMailDirect',to:e.mp||'',subject:_empSubject(),body:_empBody(e,false),pdfFolder:folder,pdfName:getEmpPdfFilename(e)});
  }
  document.getElementById('empStop').onclick=function(){
    paused=true;this.style.display='none';
    document.getElementById('empResume').style.display='inline-block';
  };
  document.getElementById('empResume').onclick=function(){
    paused=false;this.style.display='none';
    document.getElementById('empStop').style.display='inline-block';
    next(resumeIdx);
  };
  next(0);
}

// Tabella esiti: errori in alto, retry mirato sui soli falliti, export CSV
function _empShowResults(folder,results){
  var sent=results.filter(function(r){return r.ok;}).length;
  var failed=results.filter(function(r){return !r.ok&&!r.skipped;});
  var skipped=results.filter(function(r){return r.skipped;});
  function stat(n,label,color){
    return '<div style="background:#1f1c19;border-radius:8px;padding:10px 18px;min-width:72px"><div style="font-size:20px;font-weight:800;color:'+color+'">'+n+'</div><div style="font-size:10px;color:#8a8680">'+label+'</div></div>';
  }
  var sorted=results.slice().sort(function(a,b){
    var ra=a.ok?2:(a.skipped?1:0),rb=b.ok?2:(b.skipped?1:0);
    return ra-rb;
  });
  var rows=sorted.map(function(r){
    var col=r.ok?'#5bb98c':(r.skipped?'#e8b34b':'#cf5b5b');
    var icon=r.ok?'&#10003;':(r.skipped?'&#9888;':'&#10005;');
    return '<tr style="border-top:1px solid #3d3a36">'+
      '<td style="padding:6px 8px;font-size:11px;color:#a09a92;font-family:Consolas,monospace;white-space:nowrap">'+esc(r.e.m)+'</td>'+
      '<td style="padding:6px 8px;font-size:11px;color:#e0dbd4">'+esc((r.e.c||'')+' '+(r.e.n||''))+'</td>'+
      '<td style="padding:6px 8px;font-size:11px;color:'+col+'">'+icon+' '+esc(r.reason||'')+'</td></tr>';
  }).join('');
  var h='';
  h+='<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:14px">Invio completato</div>';
  h+='<div style="display:flex;gap:10px;justify-content:center;margin-bottom:14px">'+
     stat(sent,'Inviate','#5bb98c')+stat(failed.length,'Errori','#cf5b5b')+stat(skipped.length,'Saltate','#e8b34b')+'</div>';
  h+='<div style="max-height:260px;overflow-y:auto;border:1px solid #3d3a36;border-radius:8px"><table style="width:100%;border-collapse:collapse;text-align:left">'+rows+'</table></div>';
  h+='<div style="display:flex;gap:8px;justify-content:center;margin-top:14px">'+
     (failed.length?'<button id="empRetry" style="'+_EMP_BTN_GOLD+'">&#8635; Riprova '+failed.length+' falliti</button>':'')+
     '<button id="empCsv" style="'+_EMP_BTN+'">&#128190; Esporta log CSV</button>'+
     '<button id="empClose" style="'+_EMP_BTN+'">Chiudi</button></div>';
  var ov=_empOverlay(h,560);
  document.getElementById('empClose').onclick=function(){document.body.removeChild(ov);};
  document.getElementById('empCsv').onclick=function(){
    var csv='﻿matricola;cognome;nome;email;esito;dettaglio\n';
    results.forEach(function(r){
      csv+=[r.e.m,r.e.c||'',r.e.n||'',r.e.mp||'',r.ok?'INVIATA':(r.skipped?'SALTATA':'ERRORE'),(r.reason||'').replace(/;/g,',')].join(';')+'\n';
    });
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='log_invio_'+getPdfSubfolder().fileBase+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
  };
  var rb=document.getElementById('empRetry');
  if(rb)rb.onclick=function(){
    document.body.removeChild(ov);
    var keep=results.filter(function(r){return r.ok||r.skipped;});
    _empSendLoop(folder,failed.map(function(r){return r.e;}),keep);
  };
}

// Fallback browser (senza WebView2): genera EML scaricabili, come in passato
function _empMailBrowser(targets,isSeasonal,isFcvm){
  var total=targets.length,done=0;
  var PAGE_W_PX=794,SCALE=2,PAGE_W_MM=210,PAGE_H_MM=297,MARGIN_MM=8,CONT_W_MM=PAGE_W_MM-MARGIN_MM*2;
  var PX_PER_MM=(PAGE_W_PX/PAGE_W_MM)*SCALE;
  var PAGE_H_PX_SCALED=Math.round(PAGE_H_MM*PX_PER_MM),MARGIN_PX_SCALED=Math.round(MARGIN_MM*PX_PER_MM),CONT_H_PX_SCALED=PAGE_H_PX_SCALED-MARGIN_PX_SCALED*2;
  var css=document.querySelector("style").textContent;
  var wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;left:-900px;top:0;width:800px;overflow:visible;z-index:1;background:#fff";
  document.body.appendChild(wrap);
  var h='';
  h+='<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:16px">&#128231; Generazione EML</div>';
  h+='<div style="width:100%;height:6px;background:#3d3a36;border-radius:3px;overflow:hidden;margin-bottom:12px"><div id="empBar" style="width:0%;height:100%;background:#c9a96e;border-radius:3px;transition:width .2s"></div></div>';
  h+='<div id="empCount" style="font-size:13px;color:#e0dbd4;font-weight:600;margin-bottom:6px">0 / '+total+'</div>';
  h+='<div id="empLabel" style="font-size:10px;color:#8a8680">&nbsp;</div>';
  var ov=_empOverlay(h,420);
  function cleanup(){
    if(document.body.contains(wrap))document.body.removeChild(wrap);
    if(document.body.contains(ov))document.body.removeChild(ov);
  }
  function genNext(i){
    if(i>=targets.length){cleanup();alert("✅ "+done+" file .eml generati su "+total+".");return;}
    var e=targets[i];
    var pdfName=getEmpPdfFilename(e);
    document.getElementById("empLabel").textContent=e.c+" "+e.n+" → "+e.mp;
    wrap.innerHTML='<style>'+css+'</style><style>*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body,div{font-family:"DM Sans",sans-serif;font-size:13px}.lt{max-width:800px;width:800px;box-shadow:none;border:none}</style>'+(isSeasonal?buildSeasonalLetterAuto(e):isFcvm?buildFcVmLetter(e):(isUSA(e.si,e)?buildLetterUSA(e):buildLetter(e)));
    document.fonts.ready.then(function(){setTimeout(function(){
      var target=wrap.querySelector(".lt")||wrap;
      var fullH=target.scrollHeight||1200,fullHScaled=Math.round(fullH*SCALE);
      var numPages=Math.max(1,Math.ceil((fullHScaled-MARGIN_PX_SCALED*2)/CONT_H_PX_SCALED));
      html2canvas(target,{scale:SCALE,useCORS:true,allowTaint:true,backgroundColor:"#ffffff",width:PAGE_W_PX,height:fullH,windowWidth:PAGE_W_PX}).then(function(canvas){
        var pdf=new jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
        for(var p=0;p<numPages;p++){
          if(p>0)pdf.addPage();
          var srcY=MARGIN_PX_SCALED+p*CONT_H_PX_SCALED,sliceH=Math.min(CONT_H_PX_SCALED,fullHScaled-srcY);
          if(sliceH<=0)break;
          var sc=document.createElement("canvas");sc.width=canvas.width;sc.height=sliceH;
          sc.getContext("2d").drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,canvas.width,sliceH);
          pdf.addImage(sc.toDataURL("image/jpeg",0.92),"JPEG",MARGIN_MM,MARGIN_MM,CONT_W_MM,sliceH/PX_PER_MM);
        }
        _downloadEmlWithPdf(e,pdf.output("blob"),pdfName);
        done++;
        document.getElementById("empBar").style.width=Math.round(done/total*100)+"%";
        document.getElementById("empCount").textContent=done+" / "+total;
        genNext(i+1);
      });
    },150);});
  }
  genNext(0);
}
