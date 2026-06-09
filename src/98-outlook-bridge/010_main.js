// Helper condiviso: genera EML con PDF (blob) allegato e lo scarica
function _downloadEmlWithPdf(e, pdfBlob, pdfName){
  var isP=MODE==="preventivo";
  var period=getPeriodLabelEn();
  var typeLabel=isP?"FORECAST":"FINAL";
  var subj="BOGGI INCENTIVE PROGRAM - "+period+" - "+typeLabel;
  var bodyTxt=isP
    ?("Hi "+e.n+",\r\n\r\nPlease find attached your FORECAST incentive letter for "+period+".\r\nThis document shows your projected bonus based on current targets - final amounts will be confirmed at month end.\r\n\r\nBest regards")
    :("Hi "+e.n+",\r\n\r\nPlease find attached your FINAL incentive letter for "+period+".\r\nThis document confirms the bonus amount that will be included in your payslip.\r\n\r\nBest regards");
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
  };
  reader.readAsDataURL(pdfBlob);
}

// Genera PDF + EML per un singolo dipendente (bottone 📧 per riga)
function sendOneEmployeeMail(matr){
  var e=E.filter(function(x){return x.m===matr;})[0];
  if(!e||!e.mp||e.mp.indexOf("@")<0){alert("Email non disponibile per questo dipendente.");return;}
  var mm=String(CFG_MONTH).padStart(2,"0");
  var isSeasonal=PRIZE_MODE==="seasonal";
  var pdfName=isSeasonal?(e.m+"_"+CFG_SEASON+String(CFG_YEAR).slice(-2)+(SEASON_PERIOD==="mid"?"_MID":"")+".pdf"):(e.m+"_"+mm+"_"+CFG_YEAR+".pdf");
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

// Genera EML per tutti i dipendenti con email (batch con progress overlay)
function sendMailEmployees(){
  var miss=canProduceLetter();
  if(miss.length>0){alert("Dati mancanti:\n• "+miss.join("\n• "));return;}
  var isSeasonal=PRIZE_MODE==="seasonal";
  var isFcvm=PRIZE_MODE==="fcvm";
  var pool=isSeasonal?E.filter(function(e){return isSMVSM(e);}):isFcvm?Object.values(FC_EMP):E;
  var targets=pool.filter(function(e){return e.mp&&e.mp.indexOf("@")>0;});
  if(!targets.length){alert("Nessun dipendente con email trovato.");return;}
  var mm=String(CFG_MONTH).padStart(2,"0");
  var total=targets.length,done=0;
  var PAGE_W_PX=794,SCALE=2,PAGE_W_MM=210,PAGE_H_MM=297,MARGIN_MM=8,CONT_W_MM=PAGE_W_MM-MARGIN_MM*2;
  var PX_PER_MM=(PAGE_W_PX/PAGE_W_MM)*SCALE;
  var PAGE_H_PX_SCALED=Math.round(PAGE_H_MM*PX_PER_MM),MARGIN_PX_SCALED=Math.round(MARGIN_MM*PX_PER_MM),CONT_H_PX_SCALED=PAGE_H_PX_SCALED-MARGIN_PX_SCALED*2;
  var css=document.querySelector("style").textContent;
  var wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;left:-900px;top:0;width:800px;overflow:visible;z-index:1;background:#fff";
  document.body.appendChild(wrap);
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1714;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif";
  var _resumeState={i:0,folder:null};
  ov.innerHTML='<div style="background:#2c2925;border:1px solid #55504a;border-radius:14px;padding:36px 48px;text-align:center;min-width:420px">'+
    '<div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:10px">Boggi Milano</div>'+
    '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:18px">&#128231; Invio Email</div>'+
    '<div style="width:100%;height:6px;background:#3d3a36;border-radius:3px;overflow:hidden;margin-bottom:12px"><div id="emlBar" style="width:0%;height:100%;background:#c9a96e;border-radius:3px;transition:width .2s"></div></div>'+
    '<div id="emlCount" style="font-size:13px;color:#e0dbd4;font-weight:600;margin-bottom:6px">0 / '+total+'</div>'+
    '<div id="emlLabel" style="font-size:10px;color:#8a8680;margin-bottom:16px">&nbsp;</div>'+
    '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px">'+
      '<button id="emlStopBtn" onclick="window._emlPaused=true;this.disabled=true;this.style.opacity=\'0.35\';var rb=document.getElementById(\'emlResumeBtn\');if(rb)rb.style.display=\'inline-block\'" style="padding:7px 24px;border:1px solid #cf5b5b;border-radius:6px;background:transparent;color:#cf5b5b;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&#9209; Ferma</button>'+
      '<button id="emlResumeBtn" onclick="window._emlResume&&window._emlResume()" style="display:none;padding:7px 24px;border:1px solid #5bb98c;border-radius:6px;background:transparent;color:#5bb98c;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&#9654; Riprendi</button>'+
    '</div>'+
    '<div style="font-size:10px;color:#a09a92">Le email vengono inviate direttamente via Outlook</div></div>';
  document.body.appendChild(ov);
  window._emlCancelled=false;
  window._emlPaused=false;
  var _emlCallback=null;
  var _emlWvHandler=null;
  if(window.chrome&&window.chrome.webview){
    _emlWvHandler=function(ev){if(ev.data==='mailDone'&&_emlCallback){var cb=_emlCallback;_emlCallback=null;cb();}};
    window.chrome.webview.addEventListener('message',_emlWvHandler);
  }
  function _emlCleanup(){
    window._emlResume=null;
    if(_emlWvHandler)window.chrome.webview.removeEventListener('message',_emlWvHandler);
    if(document.body.contains(wrap))document.body.removeChild(wrap);
    if(document.body.contains(ov))document.body.removeChild(ov);
  }
  window._emlResume=function(){
    window._emlPaused=false;
    var rb=document.getElementById('emlResumeBtn');if(rb)rb.style.display='none';
    var sb=document.getElementById('emlStopBtn');if(sb){sb.disabled=false;sb.style.opacity='1';}
    genNext(_resumeState.i,_resumeState.folder);
  };
  function genNext(i,pdfFolder){
    if(window._emlCancelled){_emlCleanup();return;}
    if(window._emlPaused){_resumeState={i:i,folder:pdfFolder};return;}
    if(i>=targets.length){_emlCleanup();alert("✅ "+done+" email inviate su "+total+".");return;}
    var e=targets[i];
    var isP=MODE==="preventivo";
    var period=getPeriodLabelEn();
    var typeLabel=isP?"FORECAST":"FINAL";
    var pdfName=isSeasonal?(e.m+"_"+CFG_SEASON+String(CFG_YEAR).slice(-2)+(SEASON_PERIOD==="mid"?"_MID":"")+".pdf"):isFcvm?(e.m+"_FCVM_"+mm+"_"+CFG_YEAR+".pdf"):(e.m+"_"+mm+"_"+CFG_YEAR+".pdf");
    document.getElementById("emlLabel").textContent=e.c+" "+e.n+" → "+e.mp;
    if(window.chrome&&window.chrome.webview){
      var subj="BOGGI INCENTIVE PROGRAM - "+period+" - "+typeLabel;
      var bodyTxt=isP
        ?("Hi "+e.n+",\n\nPlease find attached your FORECAST incentive letter for "+period+".\nThis document shows your projected bonus based on current targets - final amounts will be confirmed at month end.\n\nBest regards")
        :("Hi "+e.n+",\n\nPlease find attached your FINAL incentive letter for "+period+".\nThis document confirms the bonus amount that will be included in your payslip.\n\nBest regards");
      _emlCallback=function(){
        done++;
        document.getElementById("emlBar").style.width=Math.round(done/total*100)+"%";
        document.getElementById("emlCount").textContent=done+" / "+total;
        genNext(i+1,pdfFolder);
      };
      window.chrome.webview.postMessage({type:"sendOutlookMailDirect",to:e.mp||"",subject:subj,body:bodyTxt,pdfFolder:pdfFolder,pdfName:pdfName});
      return;
    }
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
        document.getElementById("emlBar").style.width=Math.round(done/total*100)+"%";
        document.getElementById("emlCount").textContent=done+" / "+total;
        genNext(i+1,null);
      });
    },150);});
  }
  if(window.chrome&&window.chrome.webview){
    // Se CFG_PDF_PATH è configurato, deriva il path automaticamente come fa exportPowerShell()
    // evitando che l'utente selezioni la cartella sbagliata
    if(CFG_PDF_PATH){
      var _psf=getPdfSubfolder();
      var _autoFolder=CFG_PDF_PATH.replace(/[\/\\]$/,"")+"\\"+_psf.cons.replace(/\//g,"\\");
      genNext(0,_autoFolder);
    } else {
      var _folderHandler=null;
      _folderHandler=function(ev){
        if(typeof ev.data==='string'){
          if(ev.data.startsWith('folderSelected:')){
            window.chrome.webview.removeEventListener('message',_folderHandler);
            genNext(0,ev.data.slice('folderSelected:'.length));
          } else if(ev.data==='folderCancelled'){
            window.chrome.webview.removeEventListener('message',_folderHandler);
            _emlCleanup();
          }
        }
      };
      window.chrome.webview.addEventListener('message',_folderHandler);
      window.chrome.webview.postMessage({type:"selectPdfFolder"});
    }
  } else {
    genNext(0,null);
  }
}
