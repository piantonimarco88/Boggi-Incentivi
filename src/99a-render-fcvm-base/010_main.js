function rCFcvm(){
  var isP=MODE==="preventivo";
  var pool=getFcVmPool();

  // Barra azioni (stile identico a rC mensile)
  var mL=isP?'<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">\u26a0 PREVENTIVO</span>':'';
  mL+=' <button class="exp-btn" onclick="exportFcVmExcel()" style="font-size:10px;padding:4px 12px">&#128196; Export Excel</button>';
  if(MODE==="consuntivo")mL+=' <button class="exp-btn btn-lgreen" onclick="saveMonitorSnap()" style="font-size:10px;padding:4px 12px">&#128229; Salva per Monitor</button>';
  if(MODE==="consuntivo"&&typeof sasNewActive==='function'&&sasNewActive())mL+=' <button class="exp-btn btn-violet" onclick="exportSasJsonFcvm()" style="font-size:10px;padding:4px 12px" title="JSON con target/consuntivo/SAS per area FC/VM, per import in statistiche">&#128202; Esporta SAS Field Coach (JSON)</button>';
  if(MODE==="consuntivo"&&typeof sasNewActive==='function'&&sasNewActive())mL+=' <button class="exp-btn" onclick="exportSasReserveFcvm()" style="font-size:10px;padding:4px 12px" title="Excel con la riserva SAS non utilizzata questo mese, da ricaricare il mese prossimo (SAS Area Field Coach)">&#128230; Esporta Riserva SAS Field Coach</button>';
  mL+=' <button class="exp-btn" onclick="screenshotFcvmTable(this)" style="font-size:10px;padding:4px 12px" title="Cattura l\'intera tabella Calcolo Premi come immagine, comprese le righe/colonne fuori dallo scroll">&#128247; Screenshot Tabella</button>';

  if(!pool.length){
    var h=mL+'<div class="wg" style="text-align:center;padding:40px;color:#a09a92">';
    h+='<div style="font-size:32px;margin-bottom:12px">&#128084;</div>';
    h+='<div style="font-weight:700;font-size:14px;margin-bottom:8px">Nessun dato FC+VM caricato</div>';
    h+='<div style="font-size:11px">Vai al tab <b>Fonti Dati</b> per caricare l\'anagrafica FC+VM.</div></div>';
    document.getElementById("p0").innerHTML=h;
    return;
  }

  // Filtri
  var _fcvmF=window._fcvmF||{j:'ALL',q:''};window._fcvmF=_fcvmF;
  var uJ=['ALL','FC','VM'];
  var fl=pool.filter(function(e){
    if(_fcvmF.j!=='ALL'&&e.j!==_fcvmF.j)return false;
    if(_fcvmF.q){var q=_fcvmF.q.toLowerCase();
      return(e.c&&e.c.toLowerCase().indexOf(q)>=0)||(e.n&&e.n.toLowerCase().indexOf(q)>=0)||(e.m&&e.m.toLowerCase().indexOf(q)>=0);}
    return true;
  });
  fl.sort(function(a,b){return(a.j+a.c).localeCompare(b.j+b.c);});

  var totEur=0;
  fl.forEach(function(emp){totEur+=calcFcVmPremio(emp.m).premio_eur;});

  var h=mL+'<div class="flt"><input placeholder="Cerca..." id="fcvmQ" value="'+esc(_fcvmF.q||'')+'">';
  h+='<select id="fcvmJ">';
  uJ.forEach(function(j){h+='<option value="'+j+'"'+(_fcvmF.j===j?' selected':'')+'>'+( j==='ALL'?'FC + VM':j)+'</option>';});
  h+='</select>';
  h+='<span style="margin-left:auto;font-size:10px;color:#8a8680">'+fl.length+' dip. \u00b7 Tot: '+fc(Math.round(totEur),'EUR')+'</span></div>';

  // Tabella — intestazioni abbreviate + title col nome esteso per risparmiare
  // larghezza (26 colonne con SAS attivo: senza compressione supera 1920px).
  function thS(label,full){return'<th'+(full?' title="'+esc(full)+'"':'')+'>'+label+'</th>';}
  h+='<div class="scroll-wrap"><table id="ctbl"><thead><tr>';
  h+=thS('Matr.')+thS('Cogn.','Cognome')+thS('Nome')+thS('Ruolo')+thS('Val.','Valuta')+thS('N.Store');
  var _fcSasCols=!isP&&typeof sasNewActive==='function'&&sasNewActive();
  h+=thS('Target','Target EUR')+thS('Max Pr.','Max Premio')+(!isP?thS('Consunt.','Consuntivo EUR'):'')+(!isP?thS('Esub.','Esubero'):'')+(_fcSasCols?thS('SAS','Valore SAS')+thS('% Ricon.')+thS('Ricon.','Valore Ricon.'):'')+(!isP?thS('Cons. Tot.'):'')+thS('% Area')+thS('SY LY')+thS('SY CY')+thS('Pr. LC','Premio LC')+thS('Pr. EUR','Premio EUR')+thS('BDG')+thS('Esito')+(!isP?'<th style="text-align:center;background:#e8f5e9;color:#2d7a3a;cursor:default;padding:4px 3px">100%</th>':'')+(!isP?'<th style="text-align:center;background:#fff3e0;color:#cf8b4e;cursor:default;padding:4px 3px">60%</th>':'')+'<th style="padding:4px 3px" title="Lingua">Ling.</th>'+(!isP?'<th style="text-align:center;cursor:default;min-width:40px">Mal.</th>':'')+'<th style="text-align:center;cursor:default;min-width:36px">Sosp.</th>';
  h+='</tr></thead><tbody>';

  fl.forEach(function(emp,i){
    var r=calcFcVmPremio(emp.m);
    var psOn=emp.ps==="SI";
    var ml=emp.ml||0;
    var mlc=ml===0?"ml-0":ml<SICK_50?"ml-0":ml<SICK_0?"ml-low":"ml-high";
    // partial_nosy = soglia 60% raggiunta ma SY LY non disponibile -> premio 0,
    // stesso esito economico di "none": deve leggersi come non raggiunto (rosso),
    // con etichetta distinta solo per motivare il perch\u00e9 a chi legge la tabella.
    var ec={full:'#2d7a3a',partial:'#cf8b4e',partial_nosy:'#cf5b5b',none:'#cf5b5b',preventivo:'#c9a96e',no_data:'#a09a92',no_stores:'#cf5b5b',sospeso:'#b0a99f'}[r.esito]||'#a09a92';
    var el={full:'\u2713 Pieno',partial:fPct(FCVM_PARAMS.pct60),partial_nosy:'\u2717 (no SY)',none:'\u2717',preventivo:'\u2014',no_data:'\u2014',no_stores:'Nessun negozio',sospeso:'Sosp.'}[r.esito]||r.esito;
    var nStores=Object.keys(FC_MAP).filter(function(sid){
      var mp=FC_MAP[sid];if(mp.tipo==='BDG')return false;
      var arr=Array.isArray(emp.j==='FC'?mp.fc:mp.vm)?(emp.j==='FC'?mp.fc:mp.vm):[(emp.j==='FC'?mp.fc:mp.vm)];
      return arr.indexOf(emp.m)>=0;
    }).length;
    var pc=r.totTarget>0?r.pct:null;
    h+='<tr class="ck" data-m="'+esc(emp.m)+'"'+(psOn?' style="opacity:.45"':'')+'>';
    h+='<td class="mn">'+esc(emp.m)+'</td>';
    h+='<td>'+esc(emp.c)+'</td>';
    h+='<td>'+esc(emp.n)+'</td>';
    h+='<td><span class="bg" style="background:'+(emp.j==='FC'?'#5b6abf':'#5bb98c')+';color:#fff">'+esc(emp.j)+'</span></td>';
    h+='<td style="font-size:9px;color:#a09a92">'+esc(emp.cu||'EUR')+'</td>';
    h+='<td style="text-align:center;color:#8a8680">'+nStores+'</td>';
    h+='<td style="text-align:right">'+fc(r.totTarget,'EUR')+'</td>';
    var maxBdg=(emp.bdg_stores||[]).reduce(function(s,b){return s+b.ib;},0);
    var maxTot=emp.ib+maxBdg;
    var aggFcvm=AGG_FCVM[emp.m]||0;
    h+='<td style="text-align:right;font-weight:700;color:#c9a96e">'+fc(maxTot,emp.cu||'EUR')+(aggFcvm>0?'<span style="font-size:8px;color:#c9a96e;margin-left:2px">+'+fc(aggFcvm,emp.cu||'EUR')+'</span>':'')+'</td>';
    if(!isP)h+='<td style="text-align:right">'+fc(Math.round(r.totConsPreSas!=null?r.totConsPreSas:r.totCons),'EUR')+'</td>';
    if(!isP){
      h+='<td style="text-align:right;color:#5b6abf;font-size:10px">'+(r.totEsubero>0?'+'+fc(Math.round(r.totEsubero),'EUR'):'\u2014')+'</td>';
    }
    // Colonne SAS (da luglio 2026): valore grezzo, % riconosciuta da matrice, valore
    // applicato al fatturato (quello che compone il Cons. Tot. insieme a Consuntivo+Esubero)
    if(_fcSasCols){
      var _sasRawV=r.sasAreaValRaw||0;
      h+='<td style="text-align:right;color:#8a8680">'+(_sasRawV>0?fc(Math.round(_sasRawV),'EUR'):'\u2014')+'</td>';
      h+='<td style="text-align:center;color:#8a8680">'+(r.sasAreaPctMatrix!=null?Math.round(r.sasAreaPctMatrix*100)+'%':'\u2014')+'</td>';
      // Riserva mese prec. consumata PRIMA per colmare il gap (vedi sasReserveCalc):
      // quanto ne \u00e8 stato usato si ricava cos\u00ec, coerente col box SAS in lettera.
      var _resInUsedFc=Math.min(r.totSasReserveIn||0,r.totSasUsed||0);
      var _resInExpFc=(r.totSasReserveIn||0)-_resInUsedFc;
      var _tipFcSas='Riconosciuto da matrice: '+fc(Math.round(r.totSasRec||0),'EUR')+' \u2014 Applicato al fatturato: '+fc(Math.round(r.totSasUsed||0),'EUR')+((r.totSasReserveIn||0)>0?(' \u2014 Riserva mese prec.: '+fc(Math.round(r.totSasReserveIn),'EUR')+' (usata '+fc(Math.round(_resInUsedFc),'EUR')+(_resInExpFc>0?(', scaduta '+fc(Math.round(_resInExpFc),'EUR')):'')+')'):'')+((r.totSasReserveOut||0)>0?(' \u2014 Riserva riportata: '+fc(Math.round(r.totSasReserveOut),'EUR')):'');
      h+='<td style="text-align:right;font-weight:700;color:#a07d2c" title="'+esc(_tipFcSas)+'">'+((r.totSasUsed||0)>0?fc(Math.round(r.totSasUsed),'EUR'):'\u2014')+'</td>';
    }
    if(!isP){
      var consCol=r.totConsWithEsub>0?'#2c2925':'#b0a99f';
      h+='<td style="text-align:right;font-weight:700;color:'+consCol+'">'+fc(Math.round(r.totConsWithEsub),'EUR')+'</td>';
    }
    h+='<td style="text-align:right;font-weight:700;color:'+(pc===null?'#a09a92':pc>=FCVM_PARAMS.soglia100?'#2d7a3a':pc>=FCVM_PARAMS.soglia60?'#cf8b4e':'#cf5b5b')+'">'+(pc===null?'\u2014':fPct(pc))+'</td>';
    // SY LY (aggregato area da FC_SYLY)
    var syLyDisp=r.syLyArea!=null?fDec(r.syLyArea,2):'\u2014';
    // SY CY (aggregato area da FC_RESULTS in consuntivo)
    var syCyOk=r.syAreaCy!=null&&r.syLyArea!=null&&r.syAreaCy>r.syLyArea;
    var syCyColor=r.syAreaCy==null?'#a09a92':(syCyOk?'#2d7a3a':'#cf5b5b');
    var syCyDisp=isP?'\u2014':(r.syAreaCy!=null?('<span style="color:'+syCyColor+';font-weight:700">'+fDec(r.syAreaCy,2)+'</span>'):'\u2014');
    h+='<td style="text-align:center;font-size:10px;color:#6b6560">'+syLyDisp+'</td>';
    h+='<td style="text-align:center;font-size:10px">'+syCyDisp+'</td>';
    var showTotal=r.hasBdg&&r.bdgPrize>0;
    var aggFcvmEur=Math.round((AGG_FCVM[emp.m]||0)*getFcVmExRate(emp.cu)*100)/100;
    var finalLC=(showTotal?r.totalPremioLC:r.premio)+(AGG_FCVM[emp.m]||0);
    var finalEur=(showTotal?r.totalPremioEur:r.premio_eur)+aggFcvmEur;
    h+='<td style="text-align:right;font-weight:700;color:'+ec+'">'+fc(finalLC,emp.cu||'EUR')+'</td>';
    h+='<td style="text-align:right;font-weight:700;color:'+ec+'">'+fc(finalEur,'EUR')+'</td>';
    // Colonna BDG: somma premi singoli negozi
    if(r.hasBdg){
      var nBdgEarned=isP?r.bdgDetail.length:r.bdgDetail.filter(function(b){return b.earned;}).length;
      h+='<td style="text-align:center;font-size:9px;color:#5b6abf">'+nBdgEarned+'/'+r.bdgDetail.length+'<br><span style="font-weight:700">'+fc(r.bdgPrize,emp.cu||'EUR')+'</span></td>';
    } else {
      h+='<td style="text-align:center;color:#a09a92">—</td>';
    }
    h+='<td style="text-align:center;font-weight:700;color:'+ec+'">'+el+'</td>';
    // Toggle override manuale 100% / 60% (solo consuntivo)
    if(!isP){
      var ov100=FC_OVERRIDES[emp.m]==='100',ov60=FC_OVERRIDES[emp.m]==='60';
      h+='<td style="text-align:center;padding:4px 3px" onclick="event.stopPropagation()"><button onclick="setFcVmOverride(\''+esc(emp.m)+'\',\'100\')" style="padding:1px 4px;font-size:8px;font-weight:700;border-radius:4px;border:2px solid '+(ov100?'#2d7a3a':'#d5d0c8')+';background:'+(ov100?'#2d7a3a':'#fff')+';color:'+(ov100?'#fff':'#8a8680')+';cursor:pointer">100%</button></td>';
      h+='<td style="text-align:center;padding:4px 3px" onclick="event.stopPropagation()"><button onclick="setFcVmOverride(\''+esc(emp.m)+'\',\'60\')" style="padding:1px 4px;font-size:8px;font-weight:700;border-radius:4px;border:2px solid '+(ov60?'#cf8b4e':'#d5d0c8')+';background:'+(ov60?'#cf8b4e':'#fff')+';color:'+(ov60?'#fff':'#8a8680')+';cursor:pointer">60%</button></td>';
    }
    // Selezione lingua
    if(REGION==="italia"){
      if(!emp.lang||emp.lang!=="ITALIANO"){emp.lang="ITALIANO";}
      h+='<td style="text-align:center;font-size:9px;font-weight:700;color:#4e4b48;padding:4px 3px">ITA</td>';
    }else{
      h+='<td style="padding:4px 3px" onclick="event.stopPropagation()"><select style="font-size:8px;padding:1px 2px;border:1px solid #d5d0c8;border-radius:3px;font-family:inherit" data-fcmatr="'+esc(emp.m)+'" onchange="setFcVmLang(this);event.stopPropagation()">';
      ['ITALIANO','INGLESE','FRANCESE','TEDESCO','SPAGNOLO'].forEach(function(l){
        h+='<option value="'+l+'"'+(emp.lang===l?' selected':'')+'>'+l.substring(0,3)+'</option>';
      });
      h+='</select></td>';
    }
    // Malattia (solo consuntivo)
    if(!isP)h+='<td style="text-align:center" onclick="event.stopPropagation()"><span class="ml-dot '+mlc+'"></span>'+ml+'</td>';
    // Sospendi premio
    h+='<td style="text-align:center" onclick="event.stopPropagation()"><button class="tb '+(psOn?"x":"o")+'" data-fcvm-ps="'+esc(emp.m)+'" style="width:28px;height:16px" title="Sospendi premio" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div><div id="fcvmDetail"></div>';

  updateHeaderCount();
  updateHeaderCount();
  document.getElementById("p0").innerHTML=h;

  // Bindings
  document.querySelectorAll('.fcvm-row').forEach(function(tr){
    tr.onclick=function(){sLFcvm(this.getAttribute('data-m'));};
  });
  // Usa event delegation sulla tabella per click su righe ck
  var tbl=document.getElementById('ctbl');
  if(tbl){tbl.onclick=function(ev){var tr=ev.target.closest('tr.ck');if(tr){var m=tr.getAttribute('data-m');if(m)sLFcvm(m);}};}

  var qEl=document.getElementById('fcvmQ');
  if(qEl){qEl.oninput=function(){_fcvmF.q=this.value;var pos=this.selectionStart;rCFcvm();var el2=document.getElementById('fcvmQ');if(el2){el2.focus();el2.selectionStart=el2.selectionEnd=pos;}};}
  var jEl=document.getElementById('fcvmJ');
  if(jEl){jEl.onchange=function(){_fcvmF.j=this.value;rCFcvm();};}
  document.querySelectorAll("button[data-fcvm-ps]").forEach(function(btn){btn.onclick=function(ev){
    ev.stopPropagation();var m=btn.getAttribute("data-fcvm-ps");
    var sw=document.querySelector(".scroll-wrap");var scrollTop=sw?sw.scrollTop:0;
    if(FC_EMP[m])FC_EMP[m].ps=FC_EMP[m].ps==="SI"?"NO":"SI";
    autoSave();rCFcvm();if(typeof rAFcvm==='function')rAFcvm();
    var sw2=document.querySelector(".scroll-wrap");if(sw2)sw2.scrollTop=scrollTop;
  };});
}

// Cattura l'intera tabella #ctbl come PNG, righe e colonne comprese anche
// quelle fuori dallo scroll di .scroll-wrap (che clippa solo a video, non
// il contenuto reale della tabella). Clona il nodo fuori schermo perché
// l'header sticky (position:sticky nel CSS globale di thead tr) darebbe
// artefatti se catturato dentro il suo scroll container originale.
function screenshotFcvmTable(btn){
  var tbl=document.getElementById('ctbl');
  if(!tbl){alert('Tabella non trovata.');return;}
  if(typeof html2canvas!=='function'){alert('Libreria screenshot (html2canvas) non disponibile.');return;}
  var oldTxt=btn?btn.innerHTML:null;
  if(btn){btn.disabled=true;btn.innerHTML='⏳ Cattura...';}
  var clone=tbl.cloneNode(true);
  var stickyRow=clone.querySelector('thead tr');
  if(stickyRow)stickyRow.style.position='static';
  var wrap=document.createElement('div');
  wrap.style.cssText='position:fixed;top:0;left:-99999px;background:#fff;padding:12px;';
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  function cleanup(){document.body.removeChild(wrap);if(btn){btn.disabled=false;btn.innerHTML=oldTxt;}}
  html2canvas(wrap,{scale:2,backgroundColor:'#ffffff',useCORS:true}).then(function(canvas){
    canvas.toBlob(function(blob){
      if(!blob){cleanup();alert('Screenshot fallito: immagine vuota.');return;}
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='calcolo_premi_'+(typeof getPdfSubfolder==='function'?getPdfSubfolder().fileBase:('fcvm_'+CFG_MONTH+'_'+CFG_YEAR))+'.png';
      a.click();
      URL.revokeObjectURL(a.href);
      cleanup();
    },'image/png');
  }).catch(function(err){
    cleanup();
    alert('Errore durante lo screenshot: '+(err&&err.message?err.message:err));
  });
}

function setFcVmLang(sel){
  var m=sel.getAttribute('data-fcmatr');
  if(FC_EMP[m])FC_EMP[m].lang=sel.value;
  autoSave();
}
function setFcVmOverride(matr,pct){
  if(FC_OVERRIDES[matr]===pct)delete FC_OVERRIDES[matr];
  else FC_OVERRIDES[matr]=pct;
  autoSave();
  rCFcvm();
  if(typeof rAFcvm==='function')rAFcvm();
}

// ── Tab Lettera ───────────────────────────────────────────────
function rLFcvm(){
  var h='<div class="exp-bar no-print">';
  h+='<button class="exp-btn primary" onclick="printLetterOnly()">&#128424; Stampa / PDF</button>';
  h+='<button class="exp-btn btn-green" onclick="saveAllPDFsFolder()" title="Salva PDF in cartella (Chrome/Edge)">&#128194; Salva in Cartella PC</button>';
  h+='<button class="exp-btn btn-blue" onclick="saveAllPDFsZip()">&#128230; Scarica ZIP</button>';
  h+='</div>';
  h+='<input placeholder="Cerca FC/VM..." id="lq" style="width:100%;padding:10px 14px;border-radius:6px;border:1px solid #d5d0c8;font-size:13px;font-family:inherit;background:#fff;margin-bottom:6px" class="no-print">';
  h+='<div id="lr" class="no-print"></div><div id="lc"></div>';
  document.getElementById("p1").innerHTML=h;
  // Render lista iniziale (tutti)
  _renderFcVmList('');
  // Binding ricerca
  var inp=document.getElementById('lq');
  if(inp){
    inp.oninput=function(){_renderFcVmList(this.value);};
    inp.focus();
  }
}

// Funzione globale — accessibile dall'event handler anche dopo che rLFcvm() è uscita dallo scope
function _renderFcVmList(filter){
  var pool=getFcVmPool();
  pool.sort(function(a,b){return(a.j+a.c).localeCompare(b.j+b.c);});
  var q=String(filter||'').toLowerCase().trim();
  var filtered=pool.filter(function(emp){
    if(!q)return true;
    var c=String(emp.c||'').toLowerCase();
    var n=String(emp.n||'').toLowerCase();
    var m=String(emp.m||'').toLowerCase();
    return c.indexOf(q)>=0||n.indexOf(q)>=0||m.indexOf(q)>=0;
  });
  var h2='';
  filtered.forEach(function(emp){
    h2+='<div class="ck" data-m="'+esc(String(emp.m))+'" style="display:flex;align-items:center;gap:10px;padding:6px 12px;cursor:pointer;border-radius:4px;margin-bottom:2px;background:#fff;border:1px solid #e5e1db">';
    h2+='<span style="font-family:monospace;font-size:10px;color:#8a8680">'+esc(String(emp.m))+'</span>';
    h2+='<span class="bg" style="background:'+(emp.j==='FC'?'#5b6abf':'#5bb98c')+';color:#fff">'+esc(emp.j)+'</span>';
    h2+='<span style="font-size:12px;font-weight:600">'+esc(emp.c)+' '+esc(emp.n)+'</span>';
    h2+='</div>';
  });
  if(!filtered.length)h2='<div style="padding:12px;color:#a09a92;font-size:11px">Nessun risultato</div>';
  var lr=document.getElementById('lr');
  if(lr){
    lr.innerHTML=h2;
    // Bind click su ogni riga
    lr.querySelectorAll('.ck[data-m]').forEach(function(el){
      el.onclick=function(){
        var m=this.getAttribute('data-m');
        var lc=document.getElementById('lc');
        if(lc&&FC_EMP[m])lc.innerHTML=buildFcVmLetter(FC_EMP[m]);
      };
    });
  }
}

function sLFcvm(matr){
  // Se siamo nel tab Calcolo Premi, mostra preview lettera in fcvmDetail
  var det=document.getElementById('fcvmDetail');
  if(det&&FC_EMP[matr]){det.innerHTML=buildFcVmLetter(FC_EMP[matr]);det.scrollIntoView({behavior:'smooth',block:'start'});return;}
  // Altrimenti tab Lettera
  var lc=document.getElementById('lc');
  if(lc&&FC_EMP[matr])lc.innerHTML=buildFcVmLetter(FC_EMP[matr]);
}

