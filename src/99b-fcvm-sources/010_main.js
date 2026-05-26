function rSourcesFcvm(){
  var isP=MODE==="preventivo";
  var hasAnag=Object.keys(FC_EMP).length>0;
  var hasMap=Object.keys(FC_MAP).length>0;
  var hasTarget=Object.keys(FC_TARGETS).length>0;
  var hasResults=Object.keys(FC_RESULTS).length>0;
  var h='<div class="wg" style="margin-bottom:20px"><div class="wg-title">&#128229; Carica Dati FC + VM</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">Modalità <b>FC + VM — '+(isP?'PREVENTIVO':'CONSUNTIVO')+'</b></div>';
  h+='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
  h+='<label class="exp-btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;border-color:#5b6abf;color:#5b6abf">&#128101; Anagrafica FC/VM<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-fcvmsrc="fcvm_anag" style="display:none" onchange="loadFcVmFile(this)"></label>';
  // Mapping negozi: derivato automaticamente dall'anagrafica FC+VM
  h+='<label class="exp-btn primary" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">&#127919; Target Fatturato<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-fcvmsrc="fcvm_target" style="display:none" onchange="loadFcVmFile(this)"></label>';
  h+='<label class="exp-btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;border-color:#9b6ec9;color:#9b6ec9">&#128200; SY LY (Fatt.+Traffico LY)<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-fcvmsrc="fcvm_syly" style="display:none" onchange="loadFcVmFile(this)"></label>';
  h+='<label class="exp-btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;border-color:#2d7a3a;color:#2d7a3a">&#128200; Risultati (Fatt.+Traffico CY)<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-fcvmsrc="fcvm_results" style="display:none" onchange="loadFcVmFile(this)"></label>';
  h+='<label class="exp-btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;border-color:#5b6abf;color:#5b6abf">&#128194; Risultati Mese Precedente<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-fcvmsrc="fcvm_prev" style="display:none" onchange="loadFcVmFile(this)"></label>';
  h+='<button onclick="clearFcVmData()" class="exp-btn" style="border-color:#cf5b5b;color:#cf5b5b">&#128465; Reset Dati</button>';
  h+='</div>';
  h+='<div style="font-size:9px;color:#a09a92;margin-top:8px;line-height:1.6">';
  h+='<b>Anagrafica FC/VM:</b> store_id, nome store, matricola, nome, cognome, ruolo (FC/VM), valuta, premio massimale &mdash; una riga per store/dipendente. Il mapping negozi viene derivato automaticamente. &nbsp;&#183;&nbsp; ';
  h+='<b>Target/Risultati:</b> store_id, fatturato EUR, SY CY, SY LY</div></div>';
  // Completezza
  var hasSyLyData=Object.keys(FC_SYLY).length>0;
  var hasPrevResults=Object.keys(FC_PREV_RESULTS).length>0;
  var checks=[
    {label:'Anagrafica FC/VM',ok:hasAnag},
    {label:'Target Fatturato',ok:hasTarget},
    {label:'SY LY (Fatt.+Traffico)',ok:hasSyLyData}
  ];
  if(!isP)checks=checks.concat([
    {label:'Risultati (Fatt.+Traffico CY)',ok:hasResults},
    {label:'SY CY calcolata',ok:hasResults&&Object.values(FC_RESULTS).some(function(r){return r.sy_cy!=null;})},
    {label:'Risultati Mese Precedente (opt.)',ok:hasPrevResults}
  ]);
  var nOk=checks.filter(function(c){return c.ok;}).length;
  var pct=Math.round(nOk/checks.length*100);
  var barColor=pct===100?'#2d7a3a':pct>=50?'#c9a96e':'#cf5b5b';
  h+='<div class="wg"><div class="wg-title">&#9989; Completezza — FC + VM — '+(isP?'PREVENTIVO':'CONSUNTIVO')+'</div>';
  h+='<div style="height:8px;background:#e5e1db;border-radius:4px;overflow:hidden;margin-bottom:12px">';
  h+='<div style="height:100%;width:'+pct+'%;background:'+barColor+';border-radius:4px;transition:width .3s"></div></div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
  checks.forEach(function(c){
    h+='<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:'+(c.ok?'#f0faf2':'#fef6f0')+';border-radius:5px;border:1px solid '+(c.ok?'#d4edda':'#f8d7da')+'">';
    h+='<span style="font-size:12px">'+(c.ok?'\u2705':'\u274c')+'</span>';
    h+='<span style="font-size:10px;font-weight:600">'+c.label+'</span></div>';
  });
  h+='</div></div>';
  // Stato
  if(hasAnag||hasMap||hasTarget||hasResults){
    h+='<div class="wg"><div class="wg-title">Dati in memoria</div>';
    [{icon:'&#128101;',label:'FC/VM caricati',v:Object.keys(FC_EMP).length,ok:hasAnag},
     {icon:'&#128205;',label:'Negozi mappati (auto)',v:Object.keys(FC_MAP).length,ok:Object.keys(FC_MAP).length>0},
     {icon:'&#127919;',label:'Store con target fatt.',v:Object.keys(FC_TARGETS).length,ok:hasTarget},
     {icon:'&#128200;',label:'Store con SY LY',v:Object.keys(FC_SYLY).length,ok:hasSyLyData},
     {icon:'&#128200;',label:'Store con risultati',v:Object.keys(FC_RESULTS).length,ok:hasResults},
     {icon:'&#128194;',label:'Store prev. mese',v:Object.keys(FC_PREV_RESULTS).length,ok:hasPrevResults}
    ].forEach(function(s){
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f0ece8;font-size:11px">';
      h+='<span>'+s.icon+' '+s.label+'</span><b style="color:'+(s.ok?'#2d7a3a':'#a09a92')+'">'+s.v+'</b></div>';
    });
    h+='</div>';
  }
    h+='<div id="scanResults"></div>';
    h+='<div id="scanResults" style="margin-top:8px"></div>';
  return h;
}

// ── Import Anagrafica FC+VM ────────────────────────────────────
function loadFcVmFile(input){
  var srcId=input.getAttribute('data-fcvmsrc');
  var file=input.files[0];if(!file)return;
  input.value='';
  if(srcId==='fcvm_anag'){loadFcVmAnagrafica(file);return;}
  if(srcId==='fcvm_target'){loadFcVmTarget(file);return;}
  if(srcId==='fcvm_syly'){loadFcVmSyLy(file);return;}
  if(srcId==='fcvm_results'){loadFcVmResults(file);return;}
  if(srcId==='fcvm_prev'){loadFcVmPrevResults(file);return;}
  alert('Sorgente non riconosciuta: '+srcId);
}

function loadFcVmAnagrafica(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:'array'});
    // Trova il foglio migliore
    var sheet=wb.SheetNames[0];
    wb.SheetNames.forEach(function(sn){
      var snl=sn.toLowerCase();
      if(snl.indexOf('anag')>=0||snl.indexOf('fc')>=0||snl.indexOf('vm')>=0||snl.indexOf('testata')>=0)sheet=sn;
    });
    var ws=wb.Sheets[sheet];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
    if(json.length<2){alert('Foglio vuoto o non riconosciuto.');return;}

    // Trova riga header
    var hdrRow=0;
    var hdr={sid:-1,sname:-1,matr:-1,nome:-1,cogn:-1,ruolo:-1,valuta:-1,cambio:-1,premio:-1,tipo:-1,mail:-1,cf:-1};
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var row=json[ri];if(!row)continue;
      var rowStr=row.map(function(c){return String(c||'').toLowerCase().trim();});
      var found=false;
      rowStr.forEach(function(h,ci){
        if(h.indexOf('store id')>=0||h==='store_id'||h==='storeid'){hdr.sid=ci;found=true;}
        else if(h.indexOf('nome store')>=0||h.indexOf('store name')>=0||h.indexOf('nome_store')>=0){hdr.sname=ci;}
        else if(h==='matricola'||h.indexOf('matr')>=0){hdr.matr=ci;}
        else if(h==='nome'||h==='nome '||h==='name'||h==='first name'){hdr.nome=ci;}
        else if(h==='cognome'||h==='surname'||h==='last name'){hdr.cogn=ci;}
        else if(h==='ruolo'||h==='role'||h==='funzione'){hdr.ruolo=ci;}
        else if(h==='valuta'||h==='currency'){hdr.valuta=ci;}
        else if(h==='cambio'||h==='rate'||h==='exchange rate'||h.indexOf('tasso')>=0||h.indexOf('fx')>=0){hdr.cambio=ci;}
        else if(h.indexOf('premio')>=0||h.indexOf('max')>=0||h.indexOf('bonus')>=0||h.indexOf('incentiv')>=0){hdr.premio=ci;}
        else if(h==='tipo'||h==='type'||h==='logica'||h==='logic'){hdr.tipo=ci;}
        else if(h==='mail'||h==='email'||h==='e-mail'||h==='e_mail'){hdr.mail=ci;}
        else if(h==='cf'||h.indexOf('codice fiscale')>=0||h.indexOf('cod.fisc')>=0||h.indexOf('codfis')>=0||h.indexOf('fiscal code')>=0){hdr.cf=ci;}
      });
      if(found){hdrRow=ri;break;}
    }
    if(hdr.sid<0||hdr.matr<0){
      alert('Colonne non riconosciute.\nCerco: Store ID, Matricola, Nome, Cognome, Ruolo, Valuta, Premio Max.');
      return;
    }
    // Per Italia: se il CF non è stato trovato per nome, usa automaticamente l'ultima colonna
    if(hdr.cf<0&&REGION==="italia"){
      var _knownCols=[hdr.sid,hdr.sname,hdr.matr,hdr.nome,hdr.cogn,hdr.ruolo,hdr.valuta,hdr.cambio,hdr.premio,hdr.tipo,hdr.mail].filter(function(x){return x>=0;});
      var _maxKnown=_knownCols.length?Math.max.apply(null,_knownCols):-1;
      if(json[hdrRow]){var _lastCol=json[hdrRow].length-1;if(_lastCol>_maxKnown)hdr.cf=_lastCol;}
    }

    // Resetta strutture FC+VM
    FC_EMP={};FC_MAP={};

    var imported=0,errors=[],importedList=[];
    var vl=VL||{};

    for(var ri=hdrRow+1;ri<json.length;ri++){
      var row=json[ri];if(!row)continue;

      // Store ID
      var rawSid=row[hdr.sid];
      if(rawSid==null||String(rawSid).trim()==='')continue;
      var sid=String(parseInt(rawSid));
      if(sid==='NaN')continue;

      // Matricola
      var rawMatr=row[hdr.matr];
      if(rawMatr==null||String(rawMatr).trim()==='')continue;
      var matr=String(rawMatr).trim();

      // Nome/Cognome
      var nome=hdr.nome>=0?String(row[hdr.nome]||'').trim().toUpperCase():'';
      var cogn=hdr.cogn>=0?String(row[hdr.cogn]||'').trim().toUpperCase():'';

      // Ruolo
      var ruolo=hdr.ruolo>=0?String(row[hdr.ruolo]||'').trim().toUpperCase():'FC';
      if(ruolo!=='FC'&&ruolo!=='VM'){
        errors.push('Riga '+(ri+1)+': ruolo "'+ruolo+'" non valido (FC o VM attesi)');
        continue;
      }

      // Valuta e cambio
      var cu=hdr.valuta>=0?String(row[hdr.valuta]||'EUR').trim().toUpperCase():'EUR';
      var ex=1;
      if(cu!=='EUR'){
        // 1. Colonna cambio diretta nel file (es. 0.232)
        if(hdr.cambio>=0&&row[hdr.cambio]){var _rc=parseFloat(String(row[hdr.cambio]).replace(',','.'));if(_rc>0&&_rc!==1)ex=_rc;}
        // 2. Cerca il cambio in VL (stessa struttura degli altri import)
        if(ex===1)Object.keys(vl).forEach(function(k){if(vl[k]&&vl[k].cu===cu)ex=vl[k].ex||1;});
        // 3. Fallback: cerca per codice valuta direttamente in D.vl
        if(ex===1&&D&&D.vl){Object.keys(D.vl).forEach(function(k){if(D.vl[k]&&D.vl[k].cu===cu)ex=D.vl[k].ex||1;});}
        // 4. Fallback: cerca in ENTE_CU per codice valuta
        if(ex===1)Object.values(ENTE_CU||{}).forEach(function(v){if(v&&v.cu===cu&&v.ex)ex=v.ex;});
      }

      // Premio massimale — preso solo alla prima occorrenza della matricola
      var premio=hdr.premio>=0?parseFloat(String(row[hdr.premio]||'0').replace(/[^0-9.,]/g,'').replace(',','.'))||0:0;

      // Store name
      var sname=hdr.sname>=0?String(row[hdr.sname]||'').trim().toUpperCase():(sid);

      // Tipo negozio: AREA (default) o BDG (singolo negozio)
      var tipo=hdr.tipo>=0?String(row[hdr.tipo]||'AREA').trim().toUpperCase():'AREA';
      if(tipo!=='BDG')tipo='AREA';

      // Registra dipendente (solo prima volta per AREA — premio non si somma)
      if(!FC_EMP[matr]){
        var mailVal=hdr.mail>=0?String(row[hdr.mail]||'').trim().toLowerCase():'';
        var cfVal=hdr.cf>=0?String(row[hdr.cf]||'').trim().toUpperCase():'';
        var empObj={m:matr,c:cogn,n:nome,j:ruolo,cu:cu,ex:ex,ib:0,lang:'INGLESE',bdg_stores:[],mp:mailVal,mf:'',cf:cfVal};
        FC_EMP[matr]=empObj;
        importedList.push(empObj);
        imported++;
      }
      // Premio AREA: preso dalla prima riga AREA (non sommato)
      if(tipo==='AREA'&&FC_EMP[matr].ib===0&&premio>0){
        FC_EMP[matr].ib=premio;
      }
      // Premio BDG: aggiunto come entry separata per singolo store
      if(tipo==='BDG'){
        var already=FC_EMP[matr].bdg_stores.some(function(b){return b.sid===sid;});
        if(!already&&premio>0)FC_EMP[matr].bdg_stores.push({sid:sid,ib:premio,s:sname});
      }

      // Mapping negozio → FC/VM — array per supportare più persone per ruolo
      if(tipo==='AREA'){
        if(!FC_MAP[sid])FC_MAP[sid]={fc:[],vm:[],s:sname,tipo:'AREA'};
        else FC_MAP[sid].tipo='AREA'; // promuove da BDG ad AREA: uno store con dipendenti AREA deve rientrare nel calcolo area
        if(ruolo==='FC'&&FC_MAP[sid].fc.indexOf(matr)<0)FC_MAP[sid].fc.push(matr);
        else if(ruolo==='VM'&&FC_MAP[sid].vm.indexOf(matr)<0)FC_MAP[sid].vm.push(matr);
      } else {
        // Negozio BDG: crea l'entry solo se non esiste ancora.
        // NON sovrascrive tipo='AREA' — il premio BDG è calcolato tramite bdg_stores, non da FC_MAP.
        if(!FC_MAP[sid])FC_MAP[sid]={fc:[],vm:[],s:sname,tipo:'BDG'};
      }
    }

    // Report
    var nFC=Object.values(FC_EMP).filter(function(e){return e.j==='FC';}).length;
    var nVM=Object.values(FC_EMP).filter(function(e){return e.j==='VM';}).length;
    var nStores=Object.keys(FC_MAP).length;
    // Salva pending per conferma
    window._pendingFcVmEmp=FC_EMP;
    window._pendingFcVmMap=FC_MAP;
    window._pendingFcVmFile=file.name;
    window._pendingFcVmErrors=errors;
    window._pendingFcVmImportedList=importedList;

    showFcVmImportReport(importedList, errors, file.name, nFC, nVM, nStores);
  }catch(ex){alert('Errore lettura file:\n'+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}

function showFcVmImportReport(importedList, errors, filename, nFC, nVM, nStores){
  var h='<div class="wg" style="margin-top:16px"><div class="wg-title">&#128202; Report Importazione Anagrafica FC+VM</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">File: <b>'+esc(filename)+'</b></div>';
  h+='<div style="display:flex;gap:16px;margin-bottom:12px">';
  h+='<div style="background:#f0faf2;border:1px solid #d4edda;border-radius:6px;padding:10px 16px;flex:1;text-align:center"><div style="font-size:24px;font-weight:800;color:#2d7a3a">'+importedList.length+'</div><div style="font-size:10px;color:#6b6560">Importabili ('+nFC+' FC, '+nVM+' VM)</div></div>';
  h+='<div style="background:'+(errors.length?'#fef6f0':'#f0faf2')+';border:1px solid '+(errors.length?'#f8d7da':'#d4edda')+';border-radius:6px;padding:10px 16px;flex:1;text-align:center"><div style="font-size:24px;font-weight:800;color:'+(errors.length?'#cf5b5b':'#2d7a3a')+'">'+errors.length+'</div><div style="font-size:10px;color:#6b6560">Righe escluse</div></div>';
  h+='<div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:6px;padding:10px 16px;flex:1;text-align:center"><div style="font-size:24px;font-weight:800;color:#5b6abf">'+nStores+'</div><div style="font-size:10px;color:#6b6560">Negozi mappati (auto)</div></div>';
  h+='</div>';
  if(errors.length){
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#856404;margin-bottom:4px">Dettaglio esclusi:</div>';
    h+='<div class="scroll-wrap" style="max-height:160px"><table style="font-size:9px;width:100%"><thead><tr style="background:#fef6f0"><th style="padding:4px">Riga</th><th style="padding:4px">Motivo</th></tr></thead><tbody>';
    errors.forEach(function(er){h+='<tr><td style="padding:3px">'+esc(er.row)+'</td><td style="padding:3px;color:#cf5b5b">'+esc(er.reason)+'</td></tr>';});
    h+='</tbody></table></div></div>';
  }
  if(importedList.length>0){
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#2d7a3a;margin-bottom:4px">Anteprima (primi '+Math.min(20,importedList.length)+' di '+importedList.length+'):</div>';
    var hasCf=REGION==='italia'&&importedList.some(function(e){return e.cf;});
    var nCols=hasCf?8:7;
    h+='<div class="scroll-wrap" style="max-height:200px"><table style="font-size:9px;width:100%"><thead><tr style="background:#f0faf2">';
    h+='<th style="padding:4px">Matricola</th><th style="padding:4px">Cognome</th><th style="padding:4px">Nome</th><th style="padding:4px">Ruolo</th><th style="padding:4px">Valuta</th><th style="padding:4px">Premio Max</th><th style="padding:4px">N.Store</th>';
    if(hasCf)h+='<th style="padding:4px">Cod.Fiscale</th>';
    h+='</tr></thead><tbody>';
    importedList.slice(0,20).forEach(function(e){
      var nS=Object.keys(window._pendingFcVmMap||{}).filter(function(sid){
        var mp=(window._pendingFcVmMap||{})[sid];if(!mp||mp.tipo==='BDG')return false;
        var arrR=Array.isArray(e.j==='FC'?mp.fc:mp.vm)?(e.j==='FC'?mp.fc:mp.vm):[(e.j==='FC'?mp.fc:mp.vm)];
        return arrR.indexOf(e.m)>=0;
      }).length;
      h+='<tr><td style="padding:3px;font-family:monospace">'+esc(String(e.m))+'</td><td style="padding:3px">'+esc(e.c)+'</td><td style="padding:3px">'+esc(e.n)+'</td>';
      h+='<td style="padding:3px"><span class="bg" style="background:'+(e.j==='FC'?'#5b6abf':'#5bb98c')+';color:#fff">'+e.j+'</span></td>';
      h+='<td style="padding:3px">'+esc(e.cu)+'</td><td style="padding:3px;text-align:right;font-weight:700">'+fc(e.ib,e.cu)+'</td><td style="padding:3px;text-align:center">'+nS+'</td>';
      if(hasCf)h+='<td style="padding:3px;font-family:monospace;font-size:8px">'+esc(e.cf||'')+'</td>';
      h+='</tr>';
    });
    if(importedList.length>20)h+='<tr><td colspan="'+nCols+'" style="padding:4px;text-align:center;color:#8a8680;font-style:italic">... e altri '+(importedList.length-20)+' dipendenti</td></tr>';
    h+='</tbody></table></div></div>';
    h+='<div style="display:flex;gap:8px;margin-bottom:8px">';
    h+='<button class="exp-btn primary" onclick="applyFcVmAnagrafica()">&#10004; Applica '+importedList.length+' dipendenti</button>';
    h+='<button class="exp-btn" onclick="downloadFcVmImportLog()">&#128190; Scarica Report</button>';
    h+='</div>';
  }
  h+='</div>';
  var el=document.getElementById('scanResults');
  if(el)el.innerHTML=h;
}

function applyFcVmAnagrafica(){
  var list=window._pendingFcVmImportedList||[];
  var map=window._pendingFcVmMap||{};
  if(!list.length){alert('Nessun dato da applicare.');return;}
  // Preserva FC_TARGETS e FC_RESULTS se già importati (potrebbero contenere cambi valuta derivati)
  FC_EMP={};FC_MAP={};
  list.forEach(function(e){FC_EMP[e.m]=e;});
  Object.keys(map).forEach(function(sid){FC_MAP[sid]=map[sid];});
  // Propaga i cambi da FC_TARGETS (se già importato prima dell'anagrafica)
  syncFcExRates();
  // Aggiorna header contatore
  updateHeaderCount();
  rC();rA();rSources();autoSave();
  alert('✅ Anagrafica FC+VM applicata: '+list.length+' dipendenti, '+Object.keys(FC_MAP).length+' negozi.');
}

function downloadFcVmImportLog(){
  var list=window._pendingFcVmImportedList||[];
  var errs=window._pendingFcVmErrors||[];
  var hasCf=REGION==='italia'&&list.some(function(e){return e.cf;});
  var hdrCols='MATRICOLA;COGNOME;NOME;RUOLO;VALUTA;PREMIO_MAX'+(hasCf?';CODICE_FISCALE':'');
  var lines=['REPORT IMPORTAZIONE ANAGRAFICA FC+VM','File: '+(window._pendingFcVmFile||''),'','IMPORTATI: '+list.length,'ESCLUSI: '+errs.length,'','=== IMPORTATI ===',hdrCols];
  list.forEach(function(e){var row=[e.m,e.c,e.n,e.j,e.cu,e.ib];if(hasCf)row.push(e.cf||'');lines.push(row.join(';'));});
  if(errs.length){lines.push('','=== ESCLUSI ===','RIGA;MOTIVO');errs.forEach(function(er){lines.push(er.row+';'+er.reason);});}
  var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='report_import_fcvm_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// ── Reset dati ────────────────────────────────────────────────
function loadFcVmTarget(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:'array'});
    var sheet=wb.SheetNames[0];
    wb.SheetNames.forEach(function(sn){var snl=sn.toLowerCase();if(snl.indexOf('target')>=0||snl.indexOf('aprile')>=0||snl.indexOf('marzo')>=0||snl.indexOf('maggio')>=0)sheet=sn;});
    var ws=wb.Sheets[sheet];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert('Foglio vuoto.');return;}

    // Trova header
    var hdrRow=0,hdr={sid:-1,sales:-1,salesLC:-1};
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var row=json[ri];if(!row)continue;
      var rowStr=row.map(function(c){return String(c||'').toLowerCase().trim();});
      var found=false;
      rowStr.forEach(function(h,ci){
        if(h==='store_id'||h==='store id'||h==='storeid'||h==='etichette di riga'){hdr.sid=ci;found=true;}
        // Gross sales EUR (NON _LC)
        if((h==='gross_sales'||h==='gross sales'||h==='somma di gross_sales')&&h.indexOf('_lc')<0){hdr.sales=ci;}
        if(h==='gross_sales_lc'||h==='somma di gross_sales_lc'){hdr.salesLC=ci;}
      });
      if(found){hdrRow=ri;break;}
    }
    if(hdr.sid<0){alert('Colonna Store ID non trovata. Colonne: '+(json[hdrRow]||[]).join(', '));return;}
    // Usa EUR, fallback LC
    var useFallback=hdr.sales<0&&hdr.salesLC>=0;
    if(useFallback)hdr.sales=hdr.salesLC;
    if(hdr.sales<0){alert('Colonna Gross Sales non trovata.');return;}

    var imported=0,ratesFound=0;
    // colonna LC separata (anche quando useFallback, la teniamo per derivare il cambio)
    var lcCol=useFallback?-1:hdr.salesLC;
    for(var ri=hdrRow+1;ri<json.length;ri++){
      var row=json[ri];if(!row)continue;
      var rawSid=row[hdr.sid];if(rawSid==null)continue;
      var sid=String(parseInt(rawSid));
      if(sid==='NaN'||sid==='0'||isNaN(parseInt(rawSid)))continue;
      var sales=parseFloat(row[hdr.sales])||0;
      if(sales<=0)continue;
      if(!FC_TARGETS[sid])FC_TARGETS[sid]={to_eur:0};
      FC_TARGETS[sid].to_eur=Math.round(sales*100)/100;
      // Deriva tasso di cambio dal rapporto EUR / LC
      if(lcCol>=0){
        var salesLC=parseFloat(row[lcCol])||0;
        if(salesLC>0&&Math.abs(sales-salesLC)>0.01){
          var ratio=Math.round(sales/salesLC*100000)/100000;
          if(ratio>0&&ratio!==1){FC_TARGETS[sid].ex=ratio;ratesFound++;}
        }
      }
      imported++;
    }
    // Propaga i cambi derivati a FC_EMP (se già importati)
    syncFcExRates();
    var msg='✅ Target FC+VM importato:\n• '+imported+' store caricati';
    if(ratesFound>0)msg+='\n• '+ratesFound+' cambi valuta derivati da EUR/LC';
    if(useFallback)msg+='\n⚠ Usata colonna LC come fallback (cambi non derivabili)';
    rC();rA();rSources();autoSave();
    alert(msg);
  }catch(ex){alert('Errore: '+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}

// ── Import SY LY Mensile — SY Gross VAT After Returns per store ────────────
function loadMonthlySyLyExcel(file){
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws,{defval:null});
      if(!rows.length){alert('File SY LY vuoto o non leggibile.');return;}
      // Rileva colonna Store Id e SY Gross VAT After Returns in LC
      var sampleKeys=Object.keys(rows[0]);
      var storeCol=sampleKeys.find(function(k){return /store.?id/i.test(k)||/store.?code/i.test(k);})||null;
      var syCol=sampleKeys.find(function(k){return /sy.gross/i.test(k)||/shopper.yield/i.test(k)||/sy.*vat/i.test(k)||/sy.*return/i.test(k);})
               ||sampleKeys.find(function(k){return /^sy/i.test(k)&&k!==storeCol;})||null;
      if(!storeCol||!syCol){
        alert('Colonne non trovate nel file SY LY.\nColonne rilevate: '+sampleKeys.join(', '));return;
      }
      MONTHLY_SYLY={};
      var imported=0;
      rows.forEach(function(r){
        var sid=String(r[storeCol]||'').trim();
        var val=parseFloat(r[syCol]);
        if(sid&&!isNaN(val)){MONTHLY_SYLY[sid]=val;imported++;}
      });
      alert('\u2705 SY LY mensile importata:\n\u2022 '+imported+' store caricati\n\u2022 Colonna: '+syCol);
      rSources();rC();rA();
    }catch(ex){alert('Errore lettura file SY LY: '+ex.message);}
  };
  reader.readAsArrayBuffer(file);
}

// ── Import SY LY — fatturato + traffico LY per store ─────────────────
function loadFcVmSyLy(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:'array'});
    var sheet=wb.SheetNames[0];
    var ws=wb.Sheets[sheet];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert('Foglio vuoto.');return;}

    // Rileva header — supporta formato: Store Id, Gross Sales After Returns YYYY, Traffic Out YYYY
    var hdrRow=0;
    var hdr={sid:-1,sales:-1,footfall:-1};
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var row=json[ri];if(!row)continue;
      var found=false;
      row.forEach(function(cell,ci){
        var h=String(cell||'').toLowerCase().trim();
        // Store ID
        if(h==='store id'||h==='store_id'||h==='storeid'){hdr.sid=ci;found=true;}
        // Fatturato LY — "gross sales after returns YYYY" o varianti
        if((h.indexOf('gross sales')>=0||h.indexOf('gross_sales')>=0||h.indexOf('fatturato')>=0||h.indexOf('sales')>=0)
           &&h.indexOf('traffic')<0&&h.indexOf('traffico')<0&&h.indexOf('lc')<0
           &&hdr.sales<0){hdr.sales=ci;}
        // Traffico LY — "traffic out YYYY" o varianti
        if(h.indexOf('traffic')>=0||h.indexOf('footfall')>=0||h.indexOf('traffico')>=0||h.indexOf('visits')>=0){hdr.footfall=ci;}
      });
      if(found){hdrRow=ri;break;}
    }

    if(hdr.sid<0){alert('Colonna Store ID non trovata. Colonne: '+(json[hdrRow]||[]).join(', '));return;}
    if(hdr.sales<0){alert('Colonna Fatturato LY non trovata.');return;}
    if(hdr.footfall<0){alert('Colonna Traffico LY non trovata.');return;}

    // Aggrega per store_id (possono esserci più mesi)
    var agg={};  // {sid: {sales_ly, footfall_ly}}
    for(var ri=hdrRow+1;ri<json.length;ri++){
      var row=json[ri];if(!row)continue;
      var rawSid=row[hdr.sid];if(rawSid==null)continue;
      var sid=String(parseInt(rawSid));
      if(sid==='NaN'||sid==='0'||isNaN(parseInt(rawSid)))continue;
      var sales=parseFloat(row[hdr.sales])||0;
      var ff=parseFloat(row[hdr.footfall])||0;
      if(sales<=0&&ff<=0)continue;
      if(!agg[sid])agg[sid]={sales_ly:0,footfall_ly:0};
      agg[sid].sales_ly+=sales;
      agg[sid].footfall_ly+=ff;
    }

    // Popola FC_SYLY
    var imported=0,noTraffic=0;
    Object.keys(agg).forEach(function(sid){
      var a=agg[sid];
      FC_SYLY[sid]={
        sales_ly:Math.round(a.sales_ly*100)/100,
        footfall_ly:Math.round(a.footfall_ly),
        sy_ly:a.footfall_ly>0?Math.round(a.sales_ly/a.footfall_ly*1000)/1000:null
      };
      if(a.footfall_ly<=0)noTraffic++;
      imported++;
    });

    var msg='✅ SY LY importata:\n• '+imported+' store caricati\n• SY LY = Fatturato LY / Traffico LY (aggregato per area in calcolo)';
    if(noTraffic>0)msg+='\n⚠ '+noTraffic+' store senza traffico — SY non usata per quelle aree';
    rC();rA();rSources();autoSave();
    alert(msg);
  }catch(ex){alert('Errore: '+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}

function loadFcVmResults(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:'array'});
    var sheet=wb.SheetNames[0];
    var ws=wb.Sheets[sheet];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert('Foglio vuoto.');return;}

    // Rileva header — stesso formato del file SY LY ma anno corrente
    var hdrRow=0,hdr={sid:-1,sales:-1,footfall:-1};
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var row=json[ri];if(!row)continue;
      var found=false;
      row.forEach(function(cell,ci){
        var h=String(cell||'').toLowerCase().trim();
        if(h==='store id'||h==='store_id'||h==='storeid'){hdr.sid=ci;found=true;}
        if((h.indexOf('gross sales')>=0||h.indexOf('gross_sales')>=0||h.indexOf('sales')>=0||h.indexOf('fatturato')>=0)
           &&h.indexOf('traffic')<0&&h.indexOf('lc')<0&&hdr.sales<0){hdr.sales=ci;}
        if(h.indexOf('traffic')>=0||h.indexOf('footfall')>=0||h.indexOf('traffico')>=0){hdr.footfall=ci;}
      });
      if(found){hdrRow=ri;break;}
    }
    if(hdr.sid<0){alert('Colonna Store ID non trovata.');return;}
    if(hdr.sales<0){alert('Colonna Gross Sales non trovata.');return;}
    if(hdr.footfall<0){alert('Colonna Traffico non trovata.');return;}

    // Aggrega per store_id (possono esserci più mesi)
    var agg={};
    for(var ri=hdrRow+1;ri<json.length;ri++){
      var row=json[ri];if(!row)continue;
      var rawSid=row[hdr.sid];if(rawSid==null)continue;
      var sid=String(parseInt(rawSid));
      if(sid==='NaN'||sid==='0'||isNaN(parseInt(rawSid)))continue;
      var sales=parseFloat(row[hdr.sales])||0;
      var ff=parseFloat(row[hdr.footfall])||0;
      if(sales<=0&&ff<=0)continue;
      if(!agg[sid])agg[sid]={sales:0,footfall:0};
      agg[sid].sales+=sales;
      agg[sid].footfall+=ff;
    }

    // Popola FC_RESULTS
    var imported=0,noTraffic=0;
    Object.keys(agg).forEach(function(sid){
      var a=agg[sid];
      var sy_cy=a.footfall>0?Math.round(a.sales/a.footfall*1000)/1000:null;
      FC_RESULTS[sid]={
        sc_eur:Math.round(a.sales*100)/100,
        footfall_cy:Math.round(a.footfall),
        sy_cy:sy_cy
      };
      if(a.footfall<=0)noTraffic++;
      imported++;
    });

    var msg='✅ Risultati FC+VM importati:\n• '+imported+' store caricati\n• SY CY = Gross Sales / Traffico';
    if(noTraffic>0)msg+='\n⚠ '+noTraffic+' store senza traffico';
    rC();rA();rSources();autoSave();
    alert(msg);
  }catch(ex){alert('Errore: '+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}

// ── Import Risultati Mese Precedente FC+VM ─────────────────────────────────
function loadFcVmPrevResults(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:'array'});
    var sheet=wb.SheetNames[0];
    var ws=wb.Sheets[sheet];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert('Foglio vuoto.');return;}

    // Rileva header: STORE ID, TARGET/FCST, CONSUNTIVO/SALES (senza fcst)
    // Priorità: "fcst"/"forecast"/"budget"/"target"/"obiettivo" → colonna target
    //           "sales"/"consuntivo"/"actual"/"fatturato" senza "fcst"/"forecast" → colonna consuntivo
    var hdrRow=0,hdr={sid:-1,to:-1,sc:-1};
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var row=json[ri];if(!row)continue;
      var found=false;
      row.forEach(function(cell,ci){
        var h=String(cell||'').toLowerCase().trim();
        // Store ID
        if(h.indexOf('store id')===0||h==='store_id'||h==='storeid'||h==='store id'){hdr.sid=ci;found=true;}
        // Target: "fcst", "forecast", "budget", "target", "obiettivo"
        else if(hdr.to<0&&(h.indexOf('fcst')>=0||h.indexOf('forecast')>=0||h.indexOf('budget')>=0||h.indexOf('target')>=0||h.indexOf('obiettivo')>=0)){hdr.to=ci;}
        // Consuntivo/Actual: "sales","consuntivo","actual","fatturato" ma NON "fcst"/"forecast"
        else if(hdr.sc<0&&h.indexOf('fcst')<0&&h.indexOf('forecast')<0&&(h.indexOf('sales')>=0||h.indexOf('consuntivo')>=0||h.indexOf('actual')>=0||h.indexOf('fatturato')>=0)){hdr.sc=ci;}
      });
      if(found){hdrRow=ri;break;}
    }
    if(hdr.sid<0){alert('Colonna Store ID non trovata nel file mese precedente.\nIntestazioni attese: Store Id / Store ID / STOREID');return;}
    if(hdr.sc<0){alert('Colonna Consuntivo/Sales non trovata nel file mese precedente.\nIntestazione attesa: "Gross Sales..." (senza "Fcst")');return;}

    FC_PREV_RESULTS={};
    var imported=0;
    for(var ri=hdrRow+1;ri<json.length;ri++){
      var row=json[ri];if(!row)continue;
      var rawSid=row[hdr.sid];if(rawSid==null)continue;
      var sid=String(parseInt(rawSid));
      if(sid==='NaN'||sid==='0'||isNaN(parseInt(rawSid)))continue;
      var sc=parseFloat(row[hdr.sc])||0;
      var to=hdr.to>=0?parseFloat(row[hdr.to])||0:0;
      if(sc<=0&&to<=0)continue;
      if(!FC_PREV_RESULTS[sid])FC_PREV_RESULTS[sid]={to_eur:0,sc_eur:0};
      FC_PREV_RESULTS[sid].sc_eur+=sc;
      FC_PREV_RESULTS[sid].to_eur+=to;
      imported++;
    }
    // Calcola esubero totale per feedback
    var totEsub=0;
    Object.keys(FC_PREV_RESULTS).forEach(function(sid){
      var p=FC_PREV_RESULTS[sid];
      if(p.to_eur>0)totEsub+=Math.max(0,p.sc_eur-p.to_eur);
    });
    rC();rA();rSources();autoSave();
    var nStore=Object.keys(FC_PREV_RESULTS).length;
    var colInfo='Colonne rilevate:\n• Target (col.'+(hdr.to>=0?hdr.to+1:'—')+'): '+(hdr.to>=0?'✓':'non trovata')+'\n• Consuntivo (col.'+(hdr.sc+1)+'): ✓';
    alert('✅ Risultati mese precedente caricati:\n• '+imported+' righe, '+nStore+' store\n• Esubero area totale: € '+Math.round(totEsub).toLocaleString()+'\n\n'+colInfo);
  }catch(ex){alert('Errore: '+ex.message);}},50);};
  reader.readAsArrayBuffer(file);
}

// ── Tab Negozi FC+VM ─────────────────────────────────────────────────────
function rStoresFcvm(){
  var panel=document.getElementById('p7');
  if(!panel)return;

  var hasAnag=Object.keys(FC_MAP).length>0;
  if(!hasAnag){
    panel.innerHTML='<div class="wg" style="text-align:center;padding:40px;color:#a09a92"><div style="font-size:32px;margin-bottom:12px">&#128205;</div><div>Carica prima l\'anagrafica FC+VM per vedere i negozi.</div></div>';
    return;
  }

  // Costruisci lista negozi con etichetta L4L / NEW
  var stores=Object.keys(FC_MAP).sort(function(a,b){return parseInt(a)-parseInt(b);});

  var h='<div class="wg"><div class="wg-title">&#128205; Negozi FC+VM — Esclusioni Calcolo</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">';
  h+='Usa i toggle per escludere un negozio dal calcolo fatturato e/o SY di area. ';
  h+='<span style="background:#d4edda;color:#155724;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700">L4L</span> = presente sia in LY che CY. ';
  h+='<span style="background:#cce5ff;color:#004085;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700">NEW</span> = solo CY (non in LY).</div>';

  h+='<div class="scroll-wrap"><table style="width:100%;border-collapse:collapse;font-size:10px">';
  h+='<thead><tr style="background:#2c2925;color:#c9a96e">';
  h+='<th style="padding:6px 10px;text-align:center">STORE ID</th>';
  h+='<th style="padding:6px 10px;text-align:left">NOME STORE</th>';
  h+='<th style="padding:6px 10px;text-align:center">FIELD COACH</th>';
  h+='<th style="padding:6px 10px;text-align:center">VISUAL MERCH.</th>';
  h+='<th style="padding:6px 10px;text-align:center">STATO</th>';
  h+='<th style="padding:6px 10px;text-align:center">ESCLUDI FATT.</th>';
  h+='<th style="padding:6px 10px;text-align:center">ESCLUDI SY</th>';
  h+='<th style="padding:6px 10px;text-align:center">ESCLUDI ENTRAMBI</th>';
  h+='</tr></thead><tbody>';

  stores.forEach(function(sid,i){
    var mp=FC_MAP[sid]||{};
    var fcArr=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);
    var vmArr=Array.isArray(mp.vm)?mp.vm:(mp.vm?[mp.vm]:[]);
    // Mantieni retrocompatibilità: fcEmp = primo FC (per display semplice)
    var fcEmp=fcArr.length>0?FC_EMP[fcArr[0]]:null;
    var vmEmp=vmArr.length>0?FC_EMP[vmArr[0]]:null;
    var sname=mp.s||sid;
    var hasLy=!!(FC_SYLY[sid]&&FC_SYLY[sid].sales_ly!=null);
    var hasCy=!!(FC_RESULTS[sid]&&FC_RESULTS[sid].sc_eur!=null)||!!(FC_TARGETS[sid]&&FC_TARGETS[sid].to_eur);
    var label=hasLy?'L4L':'NEW';
    var labelBg=hasLy?'#d4edda':'#cce5ff';
    var labelColor=hasLy?'#155724':'#004085';
    var flg=FC_STORE_FLAGS[sid]||{};
    var bg=i%2===0?'#fff':'#faf9f7';
    var excludedRow=flg.excl_fatt&&flg.excl_sy;

    h+='<tr style="background:'+(excludedRow?'#fef6f0':bg)+';opacity:'+(excludedRow?'0.6':'1')+'">';
    h+='<td style="padding:5px 10px;text-align:center;font-family:monospace;color:#8a8680">'+esc(sid)+'</td>';
    h+='<td style="padding:5px 10px;font-weight:600">'+esc(sname)+'</td>';
    // FC — può essere multiplo
    h+='<td style="padding:5px 10px;text-align:center;font-size:10px;color:#4e4b48">';
    if(fcArr.length>0){
      fcArr.forEach(function(fm,fi){
        var fe=FC_EMP[fm];if(!fe)return;
        if(fi>0)h+='<br>';
        h+=esc(fe.c)+' '+esc(fe.n);
      });
    } else h+='<span style="color:#a09a92">\u2014</span>';
    h+='</td>';
    // VM — può essere multiplo
    h+='<td style="padding:5px 10px;text-align:center;font-size:10px;color:#4e4b48">';
    if(vmArr.length>0){
      vmArr.forEach(function(vm,vi){
        var ve=FC_EMP[vm];if(!ve)return;
        if(vi>0)h+='<br>';
        h+=esc(ve.c)+' '+esc(ve.n);
      });
    } else h+='<span style="color:#a09a92">\u2014</span>';
    h+='</td>';
    // Stato L4L / NEW
    h+='<td style="padding:5px 10px;text-align:center">';
    h+='<span style="background:'+labelBg+';color:'+labelColor+';padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700">'+label+'</span>';
    h+='</td>';
    // Toggle Escludi Fatturato
    h+='<td style="padding:5px 10px;text-align:center">';
    h+='<label class="ps-toggle" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">';
    h+='<input type="checkbox" '+(flg.excl_fatt?'checked':'')+' data-sid="'+esc(sid)+'" data-flag="excl_fatt" onchange="toggleFcVmStoreFlag(this)" style="display:none">';
    h+='<span style="width:32px;height:18px;border-radius:9px;background:'+(flg.excl_fatt?'#2d7a3a':'#d5d0c8')+';position:relative;display:block;transition:background .2s">';
    h+='<span style="width:14px;height:14px;border-radius:7px;background:#fff;position:absolute;top:2px;left:'+(flg.excl_fatt?'16px':'2px')+';transition:left .2s"></span></span></label>';
    h+='</td>';
    // Toggle Escludi SY
    h+='<td style="padding:5px 10px;text-align:center">';
    h+='<label class="ps-toggle" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">';
    h+='<input type="checkbox" '+(flg.excl_sy?'checked':'')+' data-sid="'+esc(sid)+'" data-flag="excl_sy" onchange="toggleFcVmStoreFlag(this)" style="display:none">';
    h+='<span style="width:32px;height:18px;border-radius:9px;background:'+(flg.excl_sy?'#2d7a3a':'#d5d0c8')+';position:relative;display:block;transition:background .2s">';
    h+='<span style="width:14px;height:14px;border-radius:7px;background:#fff;position:absolute;top:2px;left:'+(flg.excl_sy?'16px':'2px')+';transition:left .2s"></span></span></label>';
    h+='</td>';
    // Toggle Escludi Entrambi
    h+='<td style="padding:5px 10px;text-align:center">';
    var bothOn=!!(flg.excl_fatt&&flg.excl_sy);
    h+='<label class="ps-toggle" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">';
    h+='<input type="checkbox" '+(bothOn?'checked':'')+' data-sid="'+esc(sid)+'" data-flag="excl_both" onchange="toggleFcVmStoreFlag(this)" style="display:none">';
    h+='<span style="width:32px;height:18px;border-radius:9px;background:'+(bothOn?'#2d7a3a':'#d5d0c8')+';position:relative;display:block;transition:background .2s">';
    h+='<span style="width:14px;height:14px;border-radius:7px;background:#fff;position:absolute;top:2px;left:'+(bothOn?'16px':'2px')+';transition:left .2s"></span></span></label>';
    h+='</td>';
    h+='</tr>';
  });

  h+='</tbody></table></div></div>';

  // Summary esclusioni attive
  var nExclFatt=Object.values(FC_STORE_FLAGS).filter(function(f){return f.excl_fatt;}).length;
  var nExclSy=Object.values(FC_STORE_FLAGS).filter(function(f){return f.excl_sy;}).length;
  h+='<div class="wg" id="fcvm-excl-summary-wrap"><div class="wg-title">Esclusioni</div><div id="fcvm-excl-summary">';
  if(nExclFatt>0||nExclSy>0){
    h+='<div style="display:flex;gap:10px;flex-wrap:wrap">';
    if(nExclFatt>0)h+='<div style="background:#fef6f0;border:1px solid #f8d7da;border-radius:5px;padding:6px 12px;font-size:10px;font-weight:600;color:#721c24">&#128196; '+nExclFatt+' store esclus'+(nExclFatt===1?'o':'i')+' da fatturato</div>';
    if(nExclSy>0)h+='<div style="background:#fff3e0;border:1px solid #ffe0b2;border-radius:5px;padding:6px 12px;font-size:10px;font-weight:600;color:#e65100">&#128200; '+nExclSy+' store esclus'+(nExclSy===1?'o':'i')+' da SY</div>';
    h+='<button onclick="clearFcVmFlags()" class="exp-btn" style="border-color:#cf5b5b;color:#cf5b5b;font-size:10px">&#8635; Reset esclusioni</button>';
    h+='</div>';
  }
  h+='</div></div>';

  panel.innerHTML=h;
}

function toggleFcVmStoreFlag(input){
  var sid=input.getAttribute('data-sid');
  var flag=input.getAttribute('data-flag');
  if(!FC_STORE_FLAGS[sid])FC_STORE_FLAGS[sid]={excl_fatt:false,excl_sy:false};
  if(flag==='excl_fatt')FC_STORE_FLAGS[sid].excl_fatt=input.checked;
  else if(flag==='excl_sy')FC_STORE_FLAGS[sid].excl_sy=input.checked;
  else if(flag==='excl_both'){FC_STORE_FLAGS[sid].excl_fatt=input.checked;FC_STORE_FLAGS[sid].excl_sy=input.checked;}

  var flg=FC_STORE_FLAGS[sid]||{};

  // Aggiorna SOLO i toggle della riga toccata — senza ricostruire il DOM
  var row=input.closest('tr');
  if(row){
    // Aggiorna colore riga
    var excludedRow=flg.excl_fatt&&flg.excl_sy;
    row.style.opacity=excludedRow?'0.6':'1';
    row.style.background=excludedRow?'#fef6f0':'';

    // Aggiorna tutti e tre i toggle nella riga
    row.querySelectorAll('input[type="checkbox"][data-flag]').forEach(function(cb){
      var f=cb.getAttribute('data-flag');
      var on=(f==='excl_fatt'&&flg.excl_fatt)||(f==='excl_sy'&&flg.excl_sy)||(f==='excl_both'&&flg.excl_fatt&&flg.excl_sy);
      cb.checked=on;
      // Aggiorna lo span (track del toggle)
      var track=cb.nextElementSibling;
      if(track){
        track.style.background=on?'#2d7a3a':'#d5d0c8';
        var thumb=track.firstElementChild;
        if(thumb)thumb.style.left=on?'16px':'2px';
      }
    });
  }

  // Aggiorna il riepilogo esclusioni in fondo (se esiste)
  var nExclFatt=Object.values(FC_STORE_FLAGS).filter(function(f){return f.excl_fatt;}).length;
  var nExclSy=Object.values(FC_STORE_FLAGS).filter(function(f){return f.excl_sy;}).length;
  var summaryEl=document.getElementById('fcvm-excl-summary');
  if(summaryEl){
    var sh='';
    if(nExclFatt>0||nExclSy>0){
      sh+='<div style="display:flex;gap:10px;flex-wrap:wrap">';
      if(nExclFatt>0)sh+='<div style="background:#fef6f0;border:1px solid #f8d7da;border-radius:5px;padding:6px 12px;font-size:10px;font-weight:600;color:#721c24">&#128196; '+nExclFatt+' store esclus'+(nExclFatt===1?'o':'i')+' da fatturato</div>';
      if(nExclSy>0)sh+='<div style="background:#fff3e0;border:1px solid #ffe0b2;border-radius:5px;padding:6px 12px;font-size:10px;font-weight:600;color:#e65100">&#128200; '+nExclSy+' store esclus'+(nExclSy===1?'o':'i')+' da SY</div>';
      sh+='<button onclick="clearFcVmFlags()" class="exp-btn" style="border-color:#cf5b5b;color:#cf5b5b;font-size:10px">&#8635; Reset esclusioni</button>';
      sh+='</div>';
    }
    summaryEl.innerHTML=sh;
  }

  // Aggiorna calcolo premi e analisi in background (senza toccare il DOM del tab negozi)
  rC();rA();
  autoSave();
}

function clearFcVmFlags(){
  FC_STORE_FLAGS={};
  rC();rA();rStoresFcvm();autoSave();
}

