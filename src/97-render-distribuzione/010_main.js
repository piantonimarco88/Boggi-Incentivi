// Ritorna l'email FC effettiva per un dipendente:
// 1. e.mf se già impostata (da colonna FC nel file anagrafica o da import precedente)
// 2. Fallback dinamico su FC_MAP (se FC+VM è caricato) → non richiede re-import anagrafica
function _distMf(e){
  if(e.mf&&e.mf.indexOf("@")>0)return e.mf;
  var _mp=FC_MAP[String(e.si)];
  if(_mp){var _fa=Array.isArray(_mp.fc)?_mp.fc[0]:_mp.fc;if(_fa&&FC_EMP[_fa]){var _fe=FC_EMP[_fa];return(_fe.n+" "+_fe.c).toLowerCase().replace(/ /g,".")+"@boggi.com";}}
  return "";
}

function rDist(){
  var folder=MODE==="preventivo"?"preventivo":"consuntivo";
  var psf=getPdfSubfolder();var psfFolder=folder==="preventivo"?psf.prev:psf.cons;
  var fullPath=CFG_PDF_PATH?(CFG_PDF_PATH.replace(/[\/\\]$/,"")+"/"+psfFolder+"/"):(psfFolder+"/");
  // Pre-popola e.mf da FC_MAP per dipendenti che non hanno email FC impostata
  // (caso: anagrafica importata prima di caricare i dati FC+VM, o nuovo formato HR senza colonna FC)
  (PRIZE_MODE==='fcvm'?Object.values(FC_EMP):E).forEach(function(e){
    if(!e.mf||e.mf.indexOf("@")<0){var m=_distMf(e);if(m)e.mf=m;}
  });
  var h='<div style="font-size:12px;color:#6b6560;margin-bottom:16px"><b>Distribuzione lettere '+(MODE==="preventivo"?"PREVENTIVO":"CONSUNTIVO")+' \u2014 '+getMonthYearLabel()+'</b><br><span style="font-size:10px">Cartella PDF: <code style="background:#f0ede7;padding:1px 4px;border-radius:3px">'+esc(fullPath)+'</code></span></div>';

  // Note about email source
  h+='<div style="background:#f0ede7;border:1px solid #d5d0c8;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#6b6560">\ud83d\udd17 Le email vengono caricate dall\'anagrafica dipendenti (connettore configurato in Fonti Dati). Puoi modificarle manualmente nelle colonne sottostanti \u2014 le modifiche restano attive fino al ricaricamento della pagina.</div>';

  // Method cards
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:24px">';
  h+='<div class="wg" style="margin:0"><div class="wg-title">\ud83d\udce7 Email (Outlook / SMTP)</div>';
  h+='<div style="font-size:11px;color:#6b6560;line-height:1.5;margin-bottom:10px">Tracciato CSV per mail merge o script. Usa le email dalla tabella sottostante.</div>';
  h+='<button class="exp-btn primary" onclick="exportMailCSV()" style="width:100%">&#128229; Esporta Tracciato Email CSV</button>';
  h+='<button class="exp-btn" onclick="exportMailtoLinks()" style="width:100%;margin-top:6px">&#128231; Genera link mailto:</button></div>';
  h+='<div class="wg" style="margin:0"><div class="wg-title">\ud83c\udfe2 Piattaforma HR / TRM</div>';
  h+='<div style="font-size:11px;color:#6b6560;line-height:1.5;margin-bottom:10px">Tracciati per import in Zucchetti / piattaforma HR.</div>';
  h+='<button class="exp-btn" onclick="exportTracciatoLettere()" style="width:100%">&#128196; Tracciato per Lettere</button>';
  h+='<button class="exp-btn" onclick="exportTracciatoPagamenti()" style="width:100%;margin-top:6px">&#128176; Tracciato per Pagamenti</button></div>';
  if(REGION!=="italia"){h+='<div class="wg" style="margin:0"><div class="wg-title">&#128231; Email Dipendenti</div>';
  h+='<div style="font-size:11px;color:#6b6560;line-height:1.5;margin-bottom:10px">Genera le email con la lettera PDF allegata. Usa il bottone &#128231; per riga nel tab Calcolo Premi per inviarne una alla volta, oppure qui sotto per tutte insieme.</div>';
  h+='<button class="exp-btn" onclick="sendMailEmployees()" style="width:100%">&#128231; Invia mail ai dipendenti</button>';
  h+='</div>';}
  if(PRIZE_MODE!=='fcvm'){
    var fcBlobKeys=Object.keys(_fcZipBlobs);
    h+='<div class="wg" style="margin:0"><div class="wg-title">&#128230; ZIP per Field Coach</div>';
    h+='<div style="font-size:11px;color:#6b6560;line-height:1.5;margin-bottom:10px">Genera uno ZIP per ogni FC con le schede PDF dei propri dipendenti.</div>';
    h+='<button class="exp-btn" onclick="saveZipPerFC()" style="width:100%">&#128230; Crea ZIP per Field Coach</button>';
    h+='<button class="exp-btn" onclick="sendFcZipEmails()" style="width:100%;margin-top:6px">&#128140; Invia mail ai Field Coach</button>';
    if(fcBlobKeys.length>0){
      h+='<div style="margin-top:10px;border-top:1px solid #3d3a36;padding-top:10px">';
      h+='<div style="font-size:10px;font-weight:700;color:#c9a96e;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">&#128140; Email pronte — clicca per aprire in Outlook</div>';
      fcBlobKeys.sort().forEach(function(k){
        var m=_fcZipMetas[k]||{};
        h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">';
        h+='<span style="flex:1;font-size:10px;color:#e0dbd4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(k)+'</span>';
        h+='<button class="exp-btn" onclick="openFcZipEmail(\''+k+'\')" style="font-size:10px;padding:3px 10px;white-space:nowrap">&#128140; Apri email</button>';
        h+='</div>';
      });
      h+='</div>';
    }
    h+='</div>';
  }
  h+="</div>";

  // Stats \u2014 in FC+VM usa FC_EMP, altrimenti E
  var distPool=PRIZE_MODE==='fcvm'?Object.values(FC_EMP):E;
  var withMail=distPool.filter(function(e){return e.mp&&e.mp.indexOf("@")>0}).length;
  var withFC=distPool.filter(function(e){return e.mf&&e.mf.indexOf("@")>0}).length;
  h+='<div class="wg"><div class="wg-title">\ud83d\udcca Riepilogo Distribuzione \u2014 '+folder.toUpperCase()+"</div>";
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">'+distPool.length+" dipendenti \u00b7 <span style=\"color:#2d7a3a\">"+withMail+" con email personale</span> \u00b7 "+withFC+" con email FC \u00b7 <span style=\"color:#cf5b5b\">"+(distPool.length-withMail)+" senza email</span></div>";

  h+='<input placeholder="Cerca matricola, nome..." id="distQ" style="width:100%;padding:6px 10px;border:1px solid #d5d0c8;border-radius:4px;font-size:11px;margin-bottom:8px">';
  h+='<div class="scroll-wrap" style="max-height:50vh"><table style="font-size:10px"><thead><tr style="background:#eae7e1">';
  h+='<th style="padding:5px;cursor:default">Matr.</th><th style="padding:5px;cursor:default">Cognome</th><th style="padding:5px;cursor:default">Nome</th><th style="padding:5px;cursor:default">Ruolo</th><th style="padding:5px;cursor:default;min-width:160px">Email Personale</th>'+(PRIZE_MODE!=='fcvm'?'<th style="padding:5px;cursor:default;min-width:160px">Email FC</th>':'')+'<th style="padding:5px;cursor:default">PDF</th><th style="padding:5px;cursor:default;text-align:right">Totale</th>';
  h+="</tr></thead><tbody id=\"distBody\">";
  distPool.forEach(function(e,i){
    var tc=PRIZE_MODE==='fcvm'?calcFcVmPremio(e.m).totalPremioLC:calcE(e);
    var cu=e.cu||"EUR",pdfName=e.m+"_"+String(CFG_MONTH).padStart(2,"0")+"_"+CFG_YEAR+".pdf";
    var hasEmail=e.mp&&e.mp.indexOf("@")>0;
    h+='<tr style="background:'+(i%2?"#faf9f7":"#fff")+'" data-dm="'+esc(e.m)+'">';
    h+='<td style="padding:3px 5px;font-family:monospace;font-size:9px">'+esc(e.m)+"</td>";
    h+='<td style="padding:3px 5px;font-size:10px">'+esc(e.c)+"</td>";
    h+='<td style="padding:3px 5px;font-size:10px">'+esc(e.n)+"</td>";
    h+='<td style="padding:3px 5px;font-size:9px;color:#8a8680">'+esc(PRIZE_MODE==='fcvm'?(e.j||''):(e.s||''))+"</td>";
    // Editable email fields
    h+='<td style="padding:2px"><input type="email" data-em="'+esc(e.m)+'" data-ek="mp" value="'+esc(e.mp||"")+'" style="width:100%;padding:2px 4px;border:1px solid '+(hasEmail?"#d4edda":"#f8d7da")+';border-radius:3px;font-size:9px;font-family:inherit;background:'+(hasEmail?"#f0faf2":"#fef6f0")+'"></td>';
    if(PRIZE_MODE!=='fcvm')h+='<td style="padding:2px"><input type="email" data-em="'+esc(e.m)+'" data-ek="mf" value="'+esc(e.mf||"")+'" style="width:100%;padding:2px 4px;border:1px solid #e5e1db;border-radius:3px;font-size:9px;font-family:inherit"></td>';
    h+='<td style="padding:3px 5px;font-size:8px;color:#a09a92">'+folder+"/"+pdfName+"</td>";
    h+='<td style="padding:3px 5px;text-align:right;font-weight:600;color:'+(tc>0?"#2c2925":"#b0a99f")+'">'+fc(tc,cu)+"</td></tr>"});
  h+="</tbody></table></div></div>";

  document.getElementById("p6").innerHTML=h;
  // Search
  var distQ=document.getElementById("distQ");
  if(distQ)distQ.oninput=function(){
    var q=this.value.toLowerCase();
    document.querySelectorAll("#distBody tr").forEach(function(tr){
      var txt=tr.textContent.toLowerCase();tr.style.display=txt.indexOf(q)>=0?"":"none"})};
  // Editable email bindings - update employee data + refresh stats live
  document.querySelectorAll("input[data-em]").forEach(function(inp){
    inp.onchange=function(){
      var m=inp.getAttribute("data-em"),k=inp.getAttribute("data-ek"),v=inp.value.trim();
      for(var i=0;i<E.length;i++){if(E[i].m===m){E[i][k]=v;break}}
      // Visual feedback on cell
      if(k==="mp"){var has=v&&v.indexOf("@")>0;inp.style.borderColor=has?"#d4edda":"#f8d7da";inp.style.background=has?"#f0faf2":"#fef6f0"}
      // Refresh stats counter without rebuilding whole tab
      updateDistStats();
    }});
}
function updateDistStats(){
  var distPool=PRIZE_MODE==='fcvm'?Object.values(FC_EMP):E;
  var withMail=distPool.filter(function(e){return e.mp&&e.mp.indexOf("@")>0}).length;
  var withFC=distPool.filter(function(e){return e.mf&&e.mf.indexOf("@")>0}).length;
  var el=document.querySelector("#p6 .wg-title + div");
  if(el)el.innerHTML=distPool.length+' dipendenti \u00b7 <span style="color:#2d7a3a">'+withMail+' con email personale</span> \u00b7 '+withFC+' con email FC \u00b7 <span style="color:#cf5b5b">'+(distPool.length-withMail)+" senza email</span>";
}

// ZIP separato per ciascun Field Coach
function saveZipPerFC(){
  if(typeof JSZip==="undefined"){alert("Libreria JSZip non caricata.");return}
  var miss=canProduceLetter();
  if(miss.length>0){alert("Impossibile generare le lettere.\n\nDati mancanti:\n• "+miss.join("\n• ")+"\n\nCarica i dati dalla tab Fonti Dati.");return}
  var isSeasonal=PRIZE_MODE==="seasonal";
  var folderName=MODE==="preventivo"?"preventivo":"consuntivo";
  var mm=String(CFG_MONTH).padStart(2,"0");
  var psf=getPdfSubfolder();
  var pool=isSeasonal?E.filter(function(e){return isSMVSM(e);}):E;

  // Raggruppa per FC → un JSZip per ciascuno
  var fcGroups={};
  pool.forEach(function(e){
    var fcKey=e.mf&&e.mf.indexOf("@")>0?e.mf.split("@")[0]:"senza_fc";
    if(!fcGroups[fcKey])fcGroups[fcKey]=[];
    fcGroups[fcKey].push(e);
  });
  var fcKeys=Object.keys(fcGroups).sort();
  if(!fcKeys.length){alert("Nessun dipendente trovato.");return}

  // Crea un JSZip per ogni FC
  var fcZips={};
  fcKeys.forEach(function(k){fcZips[k]=new JSZip();});

  // Lista piatta di task (fc + emp)
  var tasks=[];
  fcKeys.forEach(function(fcKey){
    fcGroups[fcKey].forEach(function(e){tasks.push({fc:fcKey,e:e});});
  });
  var total=tasks.length,done=0;

  // Cartella di destinazione ZIP
  var _dirHandle=null;
  var _zipSaveFolderPath=null;
  function startWithDir(dirHandle){
    _dirHandle=dirHandle||null;
    _runGeneration();
  }

  if(window.chrome&&window.chrome.webview){
    // WebView2: usa folder picker C# (showDirectoryPicker non funziona su file://)
    var _folderH2=null;
    _folderH2=function(ev){
      if(typeof ev.data==='string'){
        if(ev.data.startsWith('zipFolderSelected:')){
          window.chrome.webview.removeEventListener('message',_folderH2);
          _zipSaveFolderPath=ev.data.slice('zipFolderSelected:'.length);
          startWithDir('__csharp__');
        } else if(ev.data==='zipFolderCancelled'){
          window.chrome.webview.removeEventListener('message',_folderH2);
        }
      }
    };
    window.chrome.webview.addEventListener('message',_folderH2);
    window.chrome.webview.postMessage({type:'selectZipFolder'});
  } else if(window.showDirectoryPicker){
    window.showDirectoryPicker({mode:"readwrite",startIn:"desktop"})
      .then(function(dh){startWithDir(dh);})
      .catch(function(err){
        if(err&&err.name==="AbortError")return;
        startWithDir(null);
      });
  } else {
    startWithDir(null);
  }

  function _runGeneration(){
    window._zipCancelled=false;
    var ov=document.createElement("div");
    ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1714;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif";
    var destLabel=(_dirHandle==='__csharp__'&&_zipSaveFolderPath)?('📁 '+_zipSaveFolderPath.split('\\').pop()):(_dirHandle?('📁 '+_dirHandle.name):'📥 Cartella Download');
    ov.innerHTML='<div style="background:#2c2925;border:1px solid #55504a;border-radius:14px;padding:36px 48px;text-align:center;min-width:400px;box-shadow:0 8px 40px rgba(0,0,0,.7)">'+
      '<div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:10px">Boggi Milano</div>'+
      '<div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px">ZIP per Field Coach</div>'+
      '<div style="font-size:12px;color:#a09a92;margin-bottom:4px">'+fcKeys.length+' Field Coach · '+total+' dipendenti</div>'+
      '<div style="font-size:11px;color:#c9a96e;margin-bottom:18px">'+destLabel+'</div>'+
      '<div style="width:100%;height:6px;background:#3d3a36;border-radius:3px;overflow:hidden;margin-bottom:12px"><div id="zipFcBar" style="width:0%;height:100%;background:#c9a96e;border-radius:3px;transition:width .2s"></div></div>'+
      '<div id="zipFcCount" style="font-size:13px;color:#e0dbd4;font-weight:600;margin-bottom:6px">0 / '+total+'</div>'+
      '<div id="zipFcLabel" style="font-size:10px;color:#8a8680;margin-bottom:20px">&nbsp;</div>'+
      '<button onclick="window._zipCancelled=true" style="padding:9px 28px;border-radius:7px;border:1px solid #6b6560;background:transparent;color:#e0dbd4;font-size:12px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif">✕ Annulla</button>'+
      '</div>';
    document.body.appendChild(ov);

    var css=document.querySelector("style").textContent;
    var wrap=document.createElement("div");
    wrap.style.cssText="position:fixed;left:-900px;top:0;width:800px;overflow:visible;z-index:1;background:#fff";
    document.body.appendChild(wrap);

    var PAGE_W_PX=794,SCALE=2;
    var PAGE_W_MM=210,PAGE_H_MM=297,MARGIN_MM=8;
    var CONT_W_MM=PAGE_W_MM-MARGIN_MM*2;
    var PX_PER_MM=(PAGE_W_PX/PAGE_W_MM)*SCALE;
    var PAGE_H_PX_SCALED=Math.round(PAGE_H_MM*PX_PER_MM);
    var MARGIN_PX_SCALED=Math.round(MARGIN_MM*PX_PER_MM);
    var CONT_H_PX_SCALED=PAGE_H_PX_SCALED-MARGIN_PX_SCALED*2;

    var _period=getPeriodLabelEn();
    var _typeLabel=MODE==="preventivo"?"FORECAST":"FINAL";

    function saveFcZips(fcIdx){
      if(fcIdx>=fcKeys.length){
        document.body.removeChild(wrap);
        document.body.removeChild(ov);
        // Aggiorna UI distribuzione per mostrare i bottoni email
        rA();
        if(_dirHandle==='__csharp__')alert('✅ '+fcKeys.length+' ZIP salvati in:\n📁 '+_zipSaveFolderPath+'\n\nTorna al tab Distribuzione e clicca "📧 Apri email" per ogni FC.');
        else if(_dirHandle)alert('✅ '+fcKeys.length+' ZIP salvati in:\n📁 '+_dirHandle.name+'\n\nTorna al tab Distribuzione e clicca "📧 Apri email" per ogni FC.');
        else alert('✅ '+fcKeys.length+' ZIP scaricati.\n\nTorna al tab Distribuzione e clicca "📧 Apri email" per ogni FC.');
        return;
      }
      var fcKey=fcKeys[fcIdx];
      var fileName=fcKey+"_"+folderName+"_"+psf.fileBase+".zip";
      document.getElementById("zipFcCount").textContent="Salvataggio "+(fcIdx+1)+"/"+fcKeys.length+"...";
      document.getElementById("zipFcLabel").textContent=fileName;
      fcZips[fcKey].generateAsync({type:"blob"}).then(function(blob){
        // Salva blob in memoria per generazione EML
        _fcZipBlobs[fcKey]=blob;
        _fcZipMetas[fcKey]={
          email:(fcGroups[fcKey][0]&&fcGroups[fcKey][0].mf)||"",
          fileName:fileName,
          period:_period,
          typeLabel:_typeLabel
        };
        if(_dirHandle==='__csharp__'&&window.chrome&&window.chrome.webview){
          // WebView2: scrivi file su disco via C# (evita showDirectoryPicker su file://)
          var _saveH=null;
          _saveH=function(msg){
            if(typeof msg.data==='string'&&(msg.data.startsWith('fileSaved:')||msg.data.startsWith('fileSaveError:'))){
              window.chrome.webview.removeEventListener('message',_saveH);
              saveFcZips(fcIdx+1);
            }
          };
          window.chrome.webview.addEventListener('message',_saveH);
          var reader2=new FileReader();
          reader2.onload=function(ev2){
            var b64=ev2.target.result.split(',')[1];
            window.chrome.webview.postMessage({type:'saveFileBase64',folderPath:_zipSaveFolderPath,fileName:fileName,fileBase64:b64});
          };
          reader2.readAsDataURL(blob);
        } else if(_dirHandle&&_dirHandle!=='__csharp__'){
          _dirHandle.getFileHandle(fileName,{create:true}).then(function(fh){
            fh.createWritable().then(function(w){
              w.write(blob).then(function(){w.close().then(function(){saveFcZips(fcIdx+1);});});
            });
          }).catch(function(){_triggerDownload(blob,fileName,function(){saveFcZips(fcIdx+1);});});
        } else {
          _triggerDownload(blob,fileName,function(){saveFcZips(fcIdx+1);});
        }
      });
    }

    function _triggerDownload(blob,name,cb){
      var a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=name;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(a.href);cb();},700);
    }

    function genNextFC(i){
      if(window._zipCancelled){document.body.removeChild(wrap);document.body.removeChild(ov);return;}
      if(i>=total){
        document.getElementById("zipFcCount").textContent="Compressione...";
        document.getElementById("zipFcLabel").textContent="";
        document.getElementById("zipFcBar").style.width="100%";
        setTimeout(function(){saveFcZips(0);},300);
        return;
      }
      var task=tasks[i];
      var e=task.e,fcKey=task.fc;
      var pdfName=getEmpPdfFilename(e);
      document.getElementById("zipFcLabel").textContent=fcKey+" — "+e.c+" "+e.n;
      wrap.innerHTML='<style>'+css+'</style>'+
        '<style>*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body,div{font-family:"DM Sans",sans-serif;font-size:13px;color:#4e4b48}.lt{max-width:800px;width:800px;box-shadow:none;border:none}</style>'+
        (isSeasonal?buildSeasonalLetterAuto(e):(isUSA(e.si,e)?buildLetterUSA(e):buildLetter(e)));
      document.fonts.ready.then(function(){
        setTimeout(function(){
          var target=wrap.querySelector(".lt")||wrap;
          var fullH=target.scrollHeight||target.offsetHeight||1200;
          var fullHScaled=Math.round(fullH*SCALE);
          var numPages=Math.max(1,Math.ceil((fullHScaled-MARGIN_PX_SCALED*2)/CONT_H_PX_SCALED));
          html2canvas(target,{scale:SCALE,useCORS:true,allowTaint:true,backgroundColor:"#ffffff",width:PAGE_W_PX,height:fullH,windowWidth:PAGE_W_PX}).then(function(canvas){
            var pdf=new jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
            for(var p=0;p<numPages;p++){
              if(p>0)pdf.addPage();
              var srcY=MARGIN_PX_SCALED+p*CONT_H_PX_SCALED;
              var sliceH=Math.min(CONT_H_PX_SCALED,fullHScaled-srcY);
              if(sliceH<=0)break;
              var sc=document.createElement("canvas");
              sc.width=canvas.width;sc.height=sliceH;
              sc.getContext("2d").drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,canvas.width,sliceH);
              pdf.addImage(sc.toDataURL("image/jpeg",0.92),"JPEG",MARGIN_MM,MARGIN_MM,CONT_W_MM,sliceH/PX_PER_MM);
            }
            fcZips[fcKey].file(pdfName,pdf.output("arraybuffer"));
            done++;
            document.getElementById("zipFcBar").style.width=Math.round(done/total*100)+"%";
            document.getElementById("zipFcCount").textContent=done+" / "+total;
            setTimeout(function(){genNextFC(i+1);},80);
          }).catch(function(){
            done++;
            document.getElementById("zipFcBar").style.width=Math.round(done/total*100)+"%";
            document.getElementById("zipFcCount").textContent=done+" / "+total+" (errore: "+e.m+")";
            setTimeout(function(){genNextFC(i+1);},80);
          });
        },250);
      });
    }
    genNextFC(0);
  }
}

// Export CSV for email merge
function exportMailCSV(){
  var folder=MODE==="preventivo"?"preventivo":"consuntivo";
  var psf=getPdfSubfolder();
  var psfFolder=folder==="preventivo"?psf.prev:psf.cons;
  var pathPrefix=CFG_PDF_PATH?(CFG_PDF_PATH.replace(/[\/\\]$/,"")+"/"+psfFolder):psfFolder;
  var rows=["MATRICOLA;COGNOME;NOME;EMAIL_PERSONALE;EMAIL_FC;NEGOZIO;RUOLO;FILE_PDF;TOTALE_PREMIO;VALUTA"];
  E.forEach(function(e){
    if(e.ps==="SI")return;
    var tc=calcE(e);
    rows.push([e.m,e.c,e.n,e.mp||"",e.mf||"",e.s,e.j,pathPrefix+"/"+e.m+"_"+String(CFG_MONTH).padStart(2,"0")+"_"+CFG_YEAR+".pdf",tc,e.cu||"EUR"].join(";"))});
  var blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="distribuzione_"+folder+"_"+psf.fileBase+".csv";a.click();
}

// Export mailto: links page
function exportMailtoLinks(){
  var isP=MODE==="preventivo";
  var folder=isP?"preventivo":"consuntivo";
  var period=getPeriodLabelEn();
  var typeLabel=isP?"FORECAST":"FINAL";
  var subj=encodeURIComponent("BOGGI INCENTIVE PROGRAM - "+period+" \u2014 "+typeLabel);
  var w=window.open("","_blank");
  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mailto Links</title><style>body{font-family:Segoe UI,sans-serif;padding:20px}a{display:block;padding:6px 8px;color:#2a5a7e;font-size:12px;border-radius:4px}a:hover{background:#f0ede7}.m{color:#8a8680;font-size:10px;margin-left:8px}.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;margin-left:8px;background:'+(isP?"#fff3cd;color:#856404":"#d4edda;color:#155724")+'}</style></head><body>';
  html+='<h3 style="margin-bottom:4px">Click per aprire email in Outlook</h3>';
  html+='<p style="font-size:12px;color:#444;margin-bottom:4px"><b>Periodo:</b> '+period+' &nbsp;\u00b7&nbsp; <b>Tipo:</b> <span style="font-weight:700;color:'+(isP?"#856404":"#155724")+'">'+typeLabel+'</span></p>';
  html+='<p style="font-size:11px;color:#666;margin-bottom:16px">Allega manualmente il PDF prima di inviare.</p>';
  var pool=PRIZE_MODE==='fcvm'?Object.values(FC_EMP):E;
  pool.forEach(function(e){
    if(!e.mp||e.mp.indexOf("@")<0)return;
    if(PRIZE_MODE!=="fcvm"&&e.ps==="SI")return;
    var pdfName=getEmpPdfFilename(e);
    var bodyTxt=isP
      ?("Hi "+e.n+",\n\nPlease find attached your FORECAST incentive letter for "+period+".\nThis document shows your projected bonus based on current targets \u2014 final amounts will be confirmed at month end.\n\nBest regards")
      :("Hi "+e.n+",\n\nPlease find attached your FINAL incentive letter for "+period+".\nThis document confirms the bonus amount that will be included in your payslip.\n\nBest regards");
    var body=encodeURIComponent(bodyTxt);
    html+='<a href="mailto:'+e.mp+"?subject="+subj+"&body="+body+'">'+esc(e.n)+" "+esc(e.c)+'<span class="m">'+esc(e.mp)+" \u2014 "+esc(pdfName)+"</span></a>";
  });
  html+="</body></html>";
  w.document.write(html);w.document.close();
}

// Export Tracciato Lettere for Zucchetti import (no headers)
function exportTracciatoLettere(){
  var isFcvm=PRIZE_MODE==="fcvm";
  var isSeasItalia=PRIZE_MODE==="seasonal"&&REGION==="italia";
  var mm=String(CFG_MONTH).padStart(2,"0");
  var hrzModel=isSeasItalia?"HRZ_MODEL=COMUPER1":"HRZ_MODEL=COMUPERS";
  var lines=[];
  var pool=isFcvm?Object.values(FC_EMP):E;
  pool.forEach(function(e){
    if(!isFcvm&&SEAS&&SEAS[e.m]&&SEAS[e.m].excluded)return;
    if(!isFcvm&&e.ps==="SI")return;
    var matrNum=e.m.replace(/^[A-Za-z]+/,"");
    var filename=getEmpPdfFilename(e);
    var cols=[
      "FILENAME="+filename,
      hrzModel,
      "CFISC=00803620152",
      "IDCOMPANY =0000028",
      "DENAZI=BBB S.P.A.",
      "COFISCD="+(e.cf||""),
      "IDEMPLOY="+matrNum,
      "ANNO="+CFG_YEAR,
      "MESE="+mm
    ];
    lines.push(cols.join(";"));
  });
  // Genera CSV con estensione .znf per Zucchetti
  var csvContent=lines.join("\n");
  var blob=new Blob([csvContent],{type:"text/plain;charset=utf-8"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="attribute_file.znf";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Export Tracciato Pagamenti for Zucchetti import
function exportTracciatoPagamenti(){
  var mm=String(CFG_MONTH).padStart(2,"0");
  var mmaa=mm+String(CFG_YEAR).slice(-2);
  var aaaammgg=String(CFG_YEAR)+mm+"01";
  var isSeasItalia=PRIZE_MODE==="seasonal"&&REGION==="italia";
  var isFcvm=PRIZE_MODE==="fcvm";
  var rows=[];

  if(isFcvm){
    // FC+VM: una riga per dipendente — premio totale (AREA + BDG) cod 225
    var isP=MODE==="preventivo";
    Object.values(FC_EMP).forEach(function(e){
      var r=calcFcVmPremio(e.m);
      var val=isP?e.ib:((r.hasBdg?r.totalPremioEur:r.premio_eur)||0);
      var rounded=Math.round(val);
      if(rounded<=0)return;
      var matrNum=e.m.replace(/^[A-Za-z]+/,"");
      var importo=String(rounded*100);
      while(importo.length<3)importo="0"+importo;
      rows.push(["000001",matrNum,mmaa,aaaammgg,"PAG","PREMIO DI RISULTATO",225,importo]);
    });
    var txtLines=rows.map(function(r){return r.join(";");});
    var blob=new Blob([txtLines.join("\n")],{type:"text/plain;charset=utf-8"});
    var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="tracciato_pagamento_fcvm.txt";a.click();URL.revokeObjectURL(a.href);
    return;
  }

  if(isSeasItalia){
    // Seasonal Italia: una sola riga per dipendente — PREMIO SEMESTRALE cod 695
    E.forEach(function(e){
      // Escludi dipendenti con premio sospeso
      if(SEAS&&SEAS[e.m]&&SEAS[e.m].excluded)return;
      var matrNum=e.m.replace(/^[A-Za-z]+/,"");
      var val=calcSeasonal(e);
      var rounded=Math.round(val);
      if(rounded<=0)return;
      var importo=String(rounded*100);
      while(importo.length<3)importo="0"+importo;
      rows.push([
        "000001",
        matrNum,
        mmaa,
        aaaammgg,
        "PAG",
        "PREMIO SEMESTRALE",
        695,
        importo
      ]);
    });
  } else {
  // KPI to premio code mapping
  var premi=[
    {k:"rb",  cod:225, desc:"PREMIO DI RISULTATO"},
    {k:"rd",  cod:244, desc:"PREMIO DIGITAL"},
    {k:"rs",  cod:226, desc:"PREMIO SHOPPER YIELD"},
    {k:"rp",  cod:227, desc:"PREMIO NUOVE PRIVILEGE"},
    {k:"rsa", cod:228, desc:"PREMIO SAS"},
    {k:"rdc", cod:230, desc:"PREMIO DCC"},
    {k:"rcs", cod:231, desc:"PREMIO PREMIO CUSTOMER SERVICE"},
    {k:"ra",  cod:249, desc:"PREMIO VENDUTO"},
    {k:"vi",  cod:235, desc:"PREMIO VMS"},
    {k:null,  cod:380, desc:"TRASFERTE"}
  ];
  E.forEach(function(e){
    if(e.ps==="SI")return;
    var matrNum=e.m.replace(/^[A-Za-z]+/,"");
    var sm=sickMult(e.ml);
    var _agg=AGG[e.m]||{};
    premi.forEach(function(p){
      var val=0;
      if(p.k==="rb"){
        if(!e.ibFromAY&&isOn(e.j,p.k)){
          val=getVal(e,p.k)*sm;
          if(MODE==="consuntivo"&&e.ov_wg==="SI")
            val+=Math.round(e.ib*(PARAMS.workgamePct||0)*100)/100;
        }
        // Aggiunta manuale BDG Lordo (non ibFromAY: va in BDG; ibFromAY: il BDG va a TRASFERTE)
        if(!e.ibFromAY)val+=(_agg.rb||0);
      } else if(p.k){
        if(p.k==="vi"||isOn(e.j,p.k)){val=getVal(e,p.k)*sm}
        // Aggiunta manuale per questo tipo premio (tutti tranne vi che non ha AGG_KEY)
        if(p.k!=="vi")val+=(_agg[p.k]||0);
      } else if(p.cod===380){
        if(e.ibFromAY){
          val=getVal(e,"rb")*sm;
          val+=(_agg.rb||0); // aggiunta BDG per ibFromAY confluisce in TRASFERTE
        } else {
          val=(e.rbn||0)>0?(e.rbn||0):0;
        }
        val+=(_agg.rbn||0); // aggiunta BDG Netto sempre in TRASFERTE
      }
      var rounded=Math.round(val);
      if(rounded<=0)return;
      var importo=String(rounded*100);
      while(importo.length<3)importo="0"+importo;
      rows.push([
        "000001",
        matrNum,
        mmaa,
        aaaammgg,
        "PAG",
        p.desc,
        p.cod,
        importo
      ]);
    });
  });
  } // end else mensile
  // Genera .txt (tab-separated) per Zucchetti
  var txtLines=rows.map(function(r){return r.join(";");});
  var blob=new Blob([txtLines.join("\n")],{type:"text/plain;charset=utf-8"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="tracciato_pagamento_incentivi.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Generate PowerShell script for Outlook COM sending
function exportPowerShell(){
  var isP=MODE==="preventivo";
  var folder=isP?"preventivo":"consuntivo";
  var psf=getPdfSubfolder();
  var psfFolder=folder==="preventivo"?psf.prev:psf.cons;
  var period=getPeriodLabelEn();
  var typeLabel=isP?"FORECAST":"FINAL";
  var subjTxt="BOGGI INCENTIVE PROGRAM - "+period+" - "+typeLabel;
  var psfSub=psfFolder.replace(/\//g,"\\\\");
  var ps='# Boggi Incentivi - Apertura email Outlook - '+period+' ('+typeLabel+')\n';
  ps+='# Le email vengono aperte in Outlook per revisione: clicca Invia su ognuna.\n';
  ps+='# IMPORTANTE: esegui il file con   .\\prepara_email_'+folder+'_'+psf.fileBase+'.ps1   (non copiare/incollare)\n\n';
  ps+='$outlook = New-Object -ComObject Outlook.Application\n';
  var pdfBase=null;
  if(CFG_PDF_PATH){
    pdfBase=CFG_PDF_PATH.replace(/[\/\\]$/,"")+"\\"+psfFolder.replace(/\//g,"\\");
    ps+='$pdfFolder = "'+pdfBase.replace(/\\/g,"\\\\")+'"\n';
  }else{
    // Chiedi il percorso della cartella PDF
    var inputPdfPath=prompt(
      "Inserisci il percorso completo della cartella dove hai salvato i PDF delle lettere:\n(Es: C:\\Users\\utente\\Desktop\\LETTERE\\MAGGIO_2026\\Preventivo)",
      ""
    );
    if(inputPdfPath===null)return;
    var trimmedPdf=(inputPdfPath||"").trim().replace(/[\/\\]+$/,"");
    if(trimmedPdf){
      pdfBase=trimmedPdf;
      ps+='$pdfFolder = "'+pdfBase.replace(/\\/g,"\\\\")+'"\n';
    }else{
      ps+='$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }\n';
      ps+='$pdfFolder = Join-Path $scriptRoot "'+psfSub.replace(/\\\\/g,"\\")+'"\n';
    }
  }
  ps+='if(!(Test-Path $pdfFolder)){Write-Host "Cartella non trovata: $pdfFolder"; exit}\n\n';
  ps+='$i = 0\n\n';
  var pool=PRIZE_MODE==='fcvm'?Object.values(FC_EMP):E;
  var mm=String(CFG_MONTH).padStart(2,"0");
  pool.forEach(function(e){
    if(!e.mp||e.mp.indexOf("@")<0)return;
    if(PRIZE_MODE!=="fcvm"&&e.ps==="SI")return;
    var pdfName=getEmpPdfFilename(e);
    var bodyTxt=isP
      ?("Hi "+e.n+",`n`nPlease find attached your FORECAST incentive letter for "+period+".`nThis document shows your projected bonus based on current targets - final amounts will be confirmed at month end.`n`nBest regards")
      :("Hi "+e.n+",`n`nPlease find attached your FINAL incentive letter for "+period+".`nThis document confirms the bonus amount that will be included in your payslip.`n`nBest regards");
    ps+='# '+esc(e.n)+" "+esc(e.c)+" ("+e.mp+")\n";
    ps+='$mail = $outlook.CreateItem(0)\n';
    ps+='$mail.To = "'+e.mp+'"\n';
    ps+='$mail.Subject = "'+subjTxt+'"\n';
    ps+='$mail.Body = "'+bodyTxt+'"\n';
    ps+='$pdfPath = Join-Path $pdfFolder "'+pdfName+'"\n';
    ps+='if(Test-Path $pdfPath){ $mail.Attachments.Add($pdfPath) }else{ Write-Host "PDF non trovato: '+pdfName+'" }\n';
    ps+='$mail.Display()\n';
    ps+='$i++\n';
    ps+='Start-Sleep -Milliseconds 1500\n';
    ps+='if($i % 10 -eq 0){ Write-Host "Pausa dopo $i email..."; Start-Sleep -Seconds 5 }\n\n';
  });
  ps+='Write-Host "'+pool.filter(function(e){return e.mp&&e.mp.indexOf("@")>0}).length+' email aperte. Rivedi e invia ognuna da Outlook."\n';
  var filename="prepara_email_"+folder+"_"+psf.fileBase+".ps1";
  var psBlob2=new Blob([ps],{type:"text/plain;charset=utf-8;"});
  if(CFG_PDF_PATH&&window.chrome&&window.chrome.webview){
    var targetFolder=CFG_PDF_PATH.replace(/[\/\\]$/,"")+"\\"+psfFolder.replace(/\//g,"\\");
    window.chrome.webview.postMessage(JSON.stringify({type:"saveFile",path:targetFolder+"\\"+filename,content:ps}));
  } else if(window.showSaveFilePicker){
    window.showSaveFilePicker({
      suggestedName:filename,
      types:[{description:"PowerShell Script",accept:{"text/plain":[".ps1"]}}]
    }).then(function(fh){
      fh.createWritable().then(function(w){w.write(psBlob2).then(function(){w.close();});});
    }).catch(function(err){
      if(err&&err.name==="AbortError")return;
      var a=document.createElement("a");a.href=URL.createObjectURL(psBlob2);a.download=filename;a.click();
    });
  } else {
    var a=document.createElement("a");a.href=URL.createObjectURL(psBlob2);a.download=filename;a.click();
  }
}

// PowerShell script per inviare ZIP agli FC (modalita mensile)
// Genera il contenuto del PS1 per inviare ZIP agli FC.
// basePath: percorso hardcodato (se noto), altrimenti null → usa $PSScriptRoot con fallback
function _buildFcPsContent(basePath){
  var isP=MODE==="preventivo";
  var folder=isP?"preventivo":"consuntivo";
  var psf=getPdfSubfolder();
  var period=getPeriodLabelEn();
  var typeLabel=isP?"FORECAST":"FINAL";
  var fcMap={};
  E.forEach(function(e){
    if(!e.mf||e.mf.indexOf("@")<0)return;
    var fcKey=e.mf.split("@")[0];
    if(!fcMap[fcKey])fcMap[fcKey]={email:e.mf,key:fcKey};
  });
  var fcList=Object.values(fcMap);
  if(!fcList.length)return null;
  var ps='# Boggi Incentivi - Email ZIP a Field Coach - '+period+' ('+typeLabel+')\n';
  ps+='# Esegui da PowerShell (non come Amministratore) con Outlook aperto.\n';
  ps+='# IMPORTANTE: esegui il file con   .\\'+('invia_zip_fc_'+folder+'_'+psf.fileBase+'.ps1')+'   (non copiare/incollare)\n\n';
  ps+='$outlook = New-Object -ComObject Outlook.Application\n';
  if(basePath){
    // Percorso hardcodato (stesso del salvataggio ZIP)
    ps+='$zipFolder = "'+basePath+'"\n';
  } else {
    // Percorso ricavato dallo script stesso — funziona solo eseguendo il .ps1 come file
    ps+='$zipFolder = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }\n';
  }
  ps+='if(!(Test-Path $zipFolder)){Write-Host "Cartella non trovata: $zipFolder"; exit}\n\n';
  ps+='$i = 0\n\n';
  fcList.forEach(function(fc){
    var zipName=fc.key+"_"+folder+"_"+psf.fileBase+".zip";
    ps+='# FC: '+fc.key+' ('+fc.email+')\n';
    ps+='$mail = $outlook.CreateItem(0)\n';
    ps+='$mail.To = "'+fc.email+'"\n';
    ps+='$mail.Subject = "BOGGI INCENTIVE PROGRAM - '+period+' - '+typeLabel+' - Area Letters"\n';
    ps+='$mail.Body = "Dear Field Coach,`n`nPlease find attached the '+typeLabel.toLowerCase()+' incentive letters for your area for '+period+'.`nKindly distribute them to your team members.`n`nBest regards"\n';
    ps+='$zipPath = Join-Path $zipFolder "'+zipName+'"\n';
    ps+='if(Test-Path $zipPath){ $mail.Attachments.Add($zipPath) }else{ Write-Host "ZIP non trovato: '+zipName+'" }\n';
    ps+='$mail.Display()\n';
    ps+='$i++\n';
    ps+='Start-Sleep -Milliseconds 1500\n';
    ps+='if($i % 5 -eq 0){ Write-Host "Pausa..."; Start-Sleep -Seconds 4 }\n\n';
  });
  ps+='Write-Host "'+fcList.length+' email FC aperte. Rivedi e invia ognuna da Outlook."\n';
  return {content:ps,filename:'invia_zip_fc_'+folder+'_'+psf.fileBase+'.ps1',fcList:fcList};
}

function exportPowerShellFC(){
  // Verifica prima che ci siano FC con email
  var res=_buildFcPsContent(null);
  if(!res){alert("Nessun Field Coach con email trovato.");return;}

  function _savePs(dirHandle){
    // Il PS1 usa $PSScriptRoot → funziona se salvato nella stessa cartella degli ZIP
    var psBlob=new Blob([res.content],{type:"text/plain;charset=utf-8;"});
    if(dirHandle){
      dirHandle.getFileHandle(res.filename,{create:true}).then(function(fh){
        fh.createWritable().then(function(w){
          w.write(psBlob).then(function(){
            w.close().then(function(){
              alert('✅ Script salvato in:\n📁 '+dirHandle.name+'\n\nPer aprire le email in Outlook:\n→ Tasto destro su "'+res.filename+'" → "Esegui con PowerShell"\n\nOppure da PowerShell:\n  .\\'+res.filename);
            });
          });
        });
      }).catch(function(){
        // Fallback download se la scrittura fallisce
        var a=document.createElement("a");a.href=URL.createObjectURL(psBlob);a.download=res.filename;a.click();
      });
    } else {
      // Fallback: download classico (Firefox/Safari)
      var a=document.createElement("a");a.href=URL.createObjectURL(psBlob);a.download=res.filename;a.click();
    }
  }

  if(window.showDirectoryPicker){
    // Chiedi di selezionare la cartella dove sono gli ZIP
    window.showDirectoryPicker({mode:"readwrite",startIn:"desktop"})
      .then(function(dh){_savePs(dh);})
      .catch(function(err){if(err&&err.name==="AbortError")return;_savePs(null);});
  } else {
    _savePs(null);
  }
}

// Genera e scarica un file .eml per un FC (con ZIP allegato)
// Il file .eml si apre in Outlook come bozza pronta all'invio
function openFcZipEmail(fcKey){
  var blob=_fcZipBlobs[fcKey];
  var meta=_fcZipMetas[fcKey];
  if(!blob||!meta||!meta.email){
    alert("ZIP non disponibile.\nGenera prima gli ZIP con il bottone 'Crea ZIP per FC'.");
    return;
  }
  var reader=new FileReader();
  reader.onload=function(ev){
    var b64=ev.target.result.split(",")[1];
    var boundary="boggi_"+Date.now();
    var body="Dear Field Coach,\r\n\r\nPlease find attached the "+meta.typeLabel.toLowerCase()+" incentive letters for your area for "+meta.period+".\r\nKindly distribute them to your team members.\r\n\r\nBest regards";
    var subj="BOGGI INCENTIVE PROGRAM - "+meta.period+" - "+meta.typeLabel+" - Area Letters";
    var eml="To: "+meta.email+"\r\n";
    eml+="Subject: "+subj+"\r\n";
    eml+="MIME-Version: 1.0\r\n";
    eml+="Content-Type: multipart/mixed; boundary=\""+boundary+"\"\r\n";
    eml+="\r\n";
    eml+="--"+boundary+"\r\n";
    eml+="Content-Type: text/plain; charset=UTF-8\r\n\r\n";
    eml+=body+"\r\n\r\n";
    eml+="--"+boundary+"\r\n";
    eml+="Content-Type: application/zip; name=\""+meta.fileName+"\"\r\n";
    eml+="Content-Disposition: attachment; filename=\""+meta.fileName+"\"\r\n";
    eml+="Content-Transfer-Encoding: base64\r\n\r\n";
    // Spezza base64 in righe da 76 caratteri (RFC 2045)
    eml+=(b64.match(/.{1,76}/g)||[]).join("\r\n")+"\r\n\r\n";
    eml+="--"+boundary+"--\r\n";
    var emlBlob=new Blob([eml],{type:"message/rfc822"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(emlBlob);
    a.download=meta.fileName.replace(".zip",".eml");
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
  };
  reader.readAsDataURL(blob);
}

// Invia mail ai Field Coach tramite overlay (ZIP gia' salvati su disco)
function sendFcZipEmails(){
  var folderName=MODE==="preventivo"?"preventivo":"consuntivo";
  var psf=getPdfSubfolder();
  var isSeasonal=PRIZE_MODE==="seasonal";
  var pool=isSeasonal?E.filter(function(e){return isSMVSM(e);}):E;
  // Costruisce lista FC unici con email e nome file ZIP atteso
  var fcMap={};
  pool.forEach(function(e){
    if(!e.mf||e.mf.indexOf('@')<0)return;
    var fcKey=e.mf.split('@')[0];
    if(!fcMap[fcKey])fcMap[fcKey]={email:e.mf,fileName:fcKey+"_"+folderName+"_"+psf.fileBase+".zip"};
  });
  var fcKeys=Object.keys(fcMap).sort();
  if(!fcKeys.length){alert("Nessun Field Coach trovato nell'anagrafica.");return;}
  var period=getPeriodLabelEn();
  var typeLabel=MODE==="preventivo"?"FORECAST":"FINAL";
  var subj="BOGGI INCENTIVE PROGRAM - "+period+" - "+typeLabel+" - Area Letters";
  var bodyTxt="Dear Field Coach,\n\nPlease find attached the "+typeLabel.toLowerCase()+" incentive letters for your area for "+period+".\n\nBest regards";
  var total=fcKeys.length,done=0,errors=0;
  // === Overlay ===
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1714;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif";
  var _resumeState={i:0,folder:null,blob:false};
  ov.innerHTML='<div style="background:#2c2925;border:1px solid #55504a;border-radius:14px;padding:36px 48px;text-align:center;min-width:420px">'+
    '<div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:10px">Boggi Milano</div>'+
    '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:18px">&#128140; Invio Email Field Coach</div>'+
    '<div style="width:100%;height:6px;background:#3d3a36;border-radius:3px;overflow:hidden;margin-bottom:12px"><div id="fcEmlBar" style="width:0%;height:100%;background:#c9a96e;border-radius:3px;transition:width .2s"></div></div>'+
    '<div id="fcEmlCount" style="font-size:13px;color:#e0dbd4;font-weight:600;margin-bottom:6px">0 / '+total+'</div>'+
    '<div id="fcEmlLabel" style="font-size:10px;color:#8a8680;margin-bottom:16px">&nbsp;</div>'+
    '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px">'+
      '<button id="fcEmlStopBtn" onclick="window._fcEmlPaused=true;this.disabled=true;this.style.opacity=\'0.35\';var rb=document.getElementById(\'fcEmlResumeBtn\');if(rb)rb.style.display=\'inline-block\'" style="padding:7px 24px;border:1px solid #cf5b5b;border-radius:6px;background:transparent;color:#cf5b5b;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&#9646;&#9646; Ferma</button>'+
      '<button id="fcEmlResumeBtn" onclick="window._fcEmlResume&&window._fcEmlResume()" style="display:none;padding:7px 24px;border:1px solid #5bb98c;border-radius:6px;background:transparent;color:#5bb98c;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&#9654; Riprendi</button>'+
      '<button onclick="window._fcEmlCancelled=true" style="padding:7px 24px;border:1px solid #6b6560;border-radius:6px;background:transparent;color:#a09a92;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&#10005; Annulla</button>'+
    '</div>'+
    '<div style="font-size:10px;color:#a09a92">Le email vengono inviate direttamente via Outlook</div></div>';
  document.body.appendChild(ov);
  window._fcEmlCancelled=false;
  window._fcEmlPaused=false;
  var _fcEmlCallback=null;
  var _fcEmlWvHandler=null;
  if(window.chrome&&window.chrome.webview){
    _fcEmlWvHandler=function(ev){
      if(ev.data==='mailDone'&&_fcEmlCallback){var cb=_fcEmlCallback;_fcEmlCallback=null;cb();}
    };
    window.chrome.webview.addEventListener('message',_fcEmlWvHandler);
  }
  function _fcEmlCleanup(){
    window._fcEmlResume=null;
    if(_fcEmlWvHandler)window.chrome.webview.removeEventListener('message',_fcEmlWvHandler);
    if(document.body.contains(ov))document.body.removeChild(ov);
  }
  window._fcEmlResume=function(){
    window._fcEmlPaused=false;
    var rb=document.getElementById('fcEmlResumeBtn');if(rb)rb.style.display='none';
    var sb=document.getElementById('fcEmlStopBtn');if(sb){sb.disabled=false;sb.style.opacity='1';}
    if(_resumeState.blob)sendNextBlob(_resumeState.i);else sendNext(_resumeState.i,_resumeState.folder);
  };
  // Percorso 1: blob in memoria → base64 → temp file (evita File.Exists su path OneDrive)
  function sendNextBlob(i){
    if(window._fcEmlCancelled){_fcEmlCleanup();alert('Invio annullato. Email inviate: '+done+'/'+total+'.');return;}
    if(window._fcEmlPaused){_resumeState={i:i,folder:null,blob:true};return;}
    if(i>=fcKeys.length){
      _fcEmlCleanup();
      alert('✅ '+done+' email inviate ai Field Coach su '+total+'.'+(errors>0?'\n⚠️ '+errors+' errori. Controlla la barra di stato.':''));
      return;
    }
    var fcKey=fcKeys[i];
    var m=fcMap[fcKey];
    var blob=_fcZipBlobs[fcKey];
    document.getElementById('fcEmlLabel').textContent=fcKey+' → '+m.email;
    if(!blob){errors++;sendNextBlob(i+1);return;}
    _fcEmlCallback=function(){
      done++;
      document.getElementById('fcEmlBar').style.width=Math.round(done/total*100)+'%';
      document.getElementById('fcEmlCount').textContent=done+' / '+total;
      sendNextBlob(i+1);
    };
    var reader=new FileReader();
    reader.onload=function(ev2){
      var b64=ev2.target.result.split(',')[1];
      window.chrome.webview.postMessage({type:'sendOutlookMailBase64',to:m.email,subject:subj,body:bodyTxt,pdfBase64:b64,pdfName:m.fileName});
    };
    reader.readAsDataURL(blob);
  }
  // Percorso 2: fallback da disco (blob non in memoria — sessione precedente)
  function sendNext(i,zipFolder){
    if(window._fcEmlCancelled){_fcEmlCleanup();alert('Invio annullato. Email inviate: '+done+'/'+total+'.');return;}
    if(window._fcEmlPaused){_resumeState={i:i,folder:zipFolder,blob:false};return;}
    if(i>=fcKeys.length){
      _fcEmlCleanup();
      alert('✅ '+done+' email inviate ai Field Coach su '+total+'.'+(errors>0?'\n⚠️ '+errors+' errori (ZIP non trovati o problemi Outlook). Controlla la barra di stato.':''));
      return;
    }
    var fcKey=fcKeys[i];
    var m=fcMap[fcKey];
    document.getElementById('fcEmlLabel').textContent=fcKey+' → '+m.email;
    _fcEmlCallback=function(){
      done++;
      document.getElementById('fcEmlBar').style.width=Math.round(done/total*100)+'%';
      document.getElementById('fcEmlCount').textContent=done+' / '+total;
      sendNext(i+1,zipFolder);
    };
    window.chrome.webview.postMessage({type:'sendOutlookMailDirect',to:m.email,subject:subj,body:bodyTxt,pdfFolder:zipFolder,pdfName:m.fileName});
  }
  // Se i blob sono tutti in memoria: invia direttamente senza selezionare cartella
  var allBlobsAvailable=fcKeys.every(function(k){return !!_fcZipBlobs[k];});
  if(allBlobsAvailable){
    sendNextBlob(0);
  } else {
    // Fallback: chiedi all'utente di selezionare la cartella ZIP su disco
    var _folderH=null;
    _folderH=function(ev){
      if(typeof ev.data==='string'){
        if(ev.data.startsWith('zipFolderSelected:')){
          window.chrome.webview.removeEventListener('message',_folderH);
          sendNext(0,ev.data.slice('zipFolderSelected:'.length));
        } else if(ev.data==='zipFolderCancelled'){
          window.chrome.webview.removeEventListener('message',_folderH);
          _fcEmlCleanup();
        }
      }
    };
    window.chrome.webview.addEventListener('message',_folderH);
    window.chrome.webview.postMessage({type:'selectZipFolder'});
  }
}

// Invia mail FC da ZIP gia' salvati su disco (sessione precedente)
function sendFcZipFromFiles(input){
  var files=Array.from(input.files||[]);
  input.value="";
  if(!files.length)return;
  // Costruisce mappa fcKey -> email FC dall'anagrafica E
  var fcEmailMap={};
  E.forEach(function(e){if(e.mf&&e.mf.indexOf('@')>0){fcEmailMap[e.mf.split('@')[0]]=e.mf;}});
  // Integra con _fcZipMetas della sessione corrente (se presenti)
  for(var k in _fcZipMetas){if(_fcZipMetas[k].email)fcEmailMap[k]=_fcZipMetas[k].email;}
  var period=getPeriodLabelEn();
  var typeLabel=MODE==="preventivo"?"FORECAST":"FINAL";
  var sent=0,missing=[];
  function processNext(idx){
    if(idx>=files.length){
      alert('✅ '+sent+' file .eml generati.\n\nAprili in Outlook per inviare le email ai Field Coach.'+(missing.length?'\n\n⚠️ Email FC non trovata per:\n• '+missing.join('\n• '):''));
      return;
    }
    var file=files[idx];
    var fname=file.name;
    // Estrae fcKey: tutto prima di _(consuntivo|preventivo)_...
    var fcKey=fname.replace(/\.zip$/i,'').replace(/_(consuntivo|preventivo)_.+$/i,'');
    var fcEmail=fcEmailMap[fcKey]||'';
    if(!fcEmail){missing.push(fname+' (FC: '+fcKey+')');processNext(idx+1);return;}
    var subj="BOGGI INCENTIVE PROGRAM - "+period+" - "+typeLabel+" - Area Letters";
    var bodyTxt="Dear Field Coach,\r\n\r\nPlease find attached the "+typeLabel.toLowerCase()+" incentive letters for your area for "+period+".\r\n\r\nBest regards";
    var reader=new FileReader();
    reader.onload=function(ev){
      var b64=ev.target.result.split(',')[1];
      var boundary="boggi_"+Date.now();
      var eml="To: "+fcEmail+"\r\nSubject: "+subj+"\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\""+boundary+"\"\r\n\r\n";
      eml+="--"+boundary+"\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"+bodyTxt+"\r\n\r\n";
      eml+="--"+boundary+"\r\nContent-Type: application/zip; name=\""+fname+"\"\r\nContent-Disposition: attachment; filename=\""+fname+"\"\r\nContent-Transfer-Encoding: base64\r\n\r\n";
      eml+=(b64.match(/.{1,76}/g)||[]).join("\r\n")+"\r\n\r\n--"+boundary+"--\r\n";
      var emlBlob=new Blob([eml],{type:"message/rfc822"});
      var a=document.createElement("a");a.href=URL.createObjectURL(emlBlob);a.download=fname.replace(/\.zip$/i,".eml");
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(a.href);sent++;processNext(idx+1);},700);
    };
    reader.readAsDataURL(file);
  }
  processNext(0);
}
