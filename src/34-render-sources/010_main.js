function rSources(){try{
  if(PRIZE_MODE==="fcvm"){document.getElementById("p4").innerHTML=rSourcesFcvm();return;}
  var isP=MODE==="preventivo",sh="";
  var isSeasonal=PRIZE_MODE==="seasonal";

  // === DATA LOADER ===
  sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83d\udce5 Carica Dati da File Excel</div>';
  sh+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">';
  if(isSeasonal){
    if(isP)sh+='Modalit\u00e0 <b>SEASONAL BONUS — PREVENTIVO</b>: carica i file con i <b>dati base semestrali</b> — anagrafica, cambi valuta, target fatturato, SY, Privilege, Accuracy.';
    else sh+='Modalit\u00e0 <b>SEASONAL BONUS — CONSUNTIVO</b>: carica i file con i <b>risultati semestrali</b>: consuntivo fatturato, SY, Privilege, Accuracy, risultato inventariale, SAS.';
  } else {
    if(isP)sh+='Modalit\u00e0 <b>MENSILE — PREVENTIVO</b>: carica il file con i <b>target e dati base</b> (anagrafica, budget, cambi, target digitale/SY/CR/Privilege/QTY, fatturato).';
    else sh+='Modalit\u00e0 <b>MENSILE — CONSUNTIVO</b>: i dati P+C sono gi\u00e0 caricati. Carica il file con i dati <b>solo consuntivo</b>: SAS, DCC'+(PARAMS.artEnabled?', articoli incentivati':'')+', malattie, esubero, visual in store, fatturato personale USA.';
  }
  sh+='</div>';
  sh+='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
  sh+='<label class="exp-btn btn-green" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">&#128101; Carica Anagrafica Excel<input type="file" accept=".xlsx,.xlsm,.xls" id="loadAnagrafica" style="display:none"></label>';
  if(REGION==="international"&&PRIZE_MODE==="mensile")sh+='<label class="exp-btn btn-amber" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">&#127482;&#127480; Carica Anagrafica USA Excel<input type="file" accept=".xlsx,.xlsm,.xls" id="loadAnagraficaUSA" style="display:none"></label>';
  if(REGION==="international"&&(PRIZE_MODE==="mensile"||PRIZE_MODE==="seasonal"))sh+='<label class="exp-btn btn-blue" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px" title="Stessa anagrafica FC+VM — estrae solo il mapping Store→FC per popolare le email FC dei dipendenti">&#128101; Mapping FC (xlsx)<input type="file" accept=".xlsx,.xlsm,.xls" id="loadFcMapping" style="display:none"></label>';
  sh+='<label class="exp-btn primary" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">&#128194; Carica Excel Target<input type="file" accept=".xlsx,.xlsm,.xls,.csv" id="loadTarget" style="display:none"></label>';
  sh+='<label class="exp-btn btn-purple" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">&#128202; Carica Excel Results<input type="file" accept=".xlsx,.xlsm,.xls,.csv" id="loadCons" style="display:none"></label>';
  sh+='<button class="exp-btn btn-green" onclick="runValidationsAndReport(\'Verifica dati caricati\')" title="Esegue controlli di coerenza su anagrafica e configurazione: matricole duplicate, currency mancanti, store sconosciuti, ruoli non validi, ecc.">&#128269; Verifica Dati</button>';
  sh+='<button class="exp-btn btn-red" onclick="resetAllData()">&#128465; Reset Dati</button>';
  sh+='</div>';
  sh+='<div style="font-size:9px;color:#a09a92;margin-top:6px">Anagrafica: carica il file con matricola, cognome, nome, negozio, ruolo, stipendio. Auto-scan: cerca i dati necessari in tutti i fogli.<br>🇺🇸 Anagrafica USA: formato Estrazione_Piantoni — col. A=StoreID, B=Store, C=Nome, D=Cognome, E=Job, G=Commission%, I=Tipo negozio. Righe con 0% escluse automaticamente.</div>';
  sh+='<div id="scanResults"></div></div>';

  // Shared checks used in both seasonal and mensile blocks
  var hasNonEUR=E.some(function(e){return e.cu&&e.cu!=="EUR"});
  // cambiOk: true se nessun non-EUR, oppure almeno un non-EUR ha ex != 1
  // USD dipendenti hanno ex=0.9 → check passa automaticamente anche senza file cambi esterni
  var cambiOk=!hasNonEUR||E.filter(function(e){return e.cu!=="EUR"}).some(function(e){return e.ex&&e.ex!==1});
  var isIT=REGION==="italia";
  var checks=[];

  var isMid=isSeasonal&&SEASON_PERIOD==="mid";
  if(isSeasonal){
    // Intestazione descrittiva
    sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\u2705 Completezza \u2014 '+(isMid?"MID-SEASON":"SEASONAL BONUS")+' — '+(isP?"PREVENTIVO":"CONSUNTIVO")+"</div>";
    var stKeys=Object.keys(SEAS_TARGETS||{});
    var hasSeaTo=stKeys.some(function(k){return(SEAS_TARGETS[k].to||0)>0});
    var hasSeaSY=stKeys.some(function(k){return SEAS_TARGETS[k].sy!=null&&SEAS_TARGETS[k].sy>0});
    var hasSeaPr=stKeys.some(function(k){return SEAS_TARGETS[k].pr!=null&&SEAS_TARGETS[k].pr>0});
    var hasSeaCR=stKeys.some(function(k){return SEAS_TARGETS[k].cr!=null&&SEAS_TARGETS[k].cr>0});
    var hasDeptInt=REGION==="international"&&E.some(function(e){return isD(e.si)});
    var hasSeaQt=!hasDeptInt||stKeys.some(function(k){return(SEAS_TARGETS[k].qt||0)>0});

    if(isMid){
      // Mid-season: richiede fatturato + CR (sbarramento), SY, sub. — NO inventario
      checks=[
        {l:"Anagrafica",ok:E.length>0,v:E.length+" dip."},
        {l:"Cambi Valuta",ok:cambiOk,v:cambiOk?"OK":"Da caricare"},
        {l:"Target Fatturato",ok:hasSeaTo,v:hasSeaTo?stKeys.length+" neg.":"Da caricare"},
        {l:"Target CR (sbarramento)",ok:hasSeaCR,v:hasSeaCR?"OK":"⚠ Richiesto per sbarramento"},
        {l:"Target SY",ok:hasSeaSY,v:hasSeaSY?"OK":"Da caricare"},
        {l:"Target Subscription Rate",ok:hasSeaPr,v:hasSeaPr?"OK":"Da caricare"}
      ];
      if(!isP){
        var cKeys=Object.keys(D.cs||{});
        var hasSC=cKeys.some(function(k){return(D.cs[k].sc||0)>0});
        var hasSY=cKeys.some(function(k){return(D.cs[k].sy||0)>0});
        var hasNF=cKeys.some(function(k){return(D.cs[k].nf||0)>0});
        var hasCR=cKeys.some(function(k){return D.cs[k].cr!=null&&D.cs[k].cr>0});
        var hasSAS=cKeys.some(function(k){return(D.cs[k].s4||0)>0});
        var hasAV=cKeys.some(function(k){return D.cs[k].av!=null&&D.cs[k].av>0});
        checks.push({l:"Consuntivo Fatturato",ok:hasSC,v:hasSC?cKeys.length+" neg.":"Da caricare"});
        checks.push({l:"Consuntivo CR (sbarramento)",ok:hasCR,v:hasCR?"OK":"⚠ Richiesto per sbarramento"});
        checks.push({l:"Consuntivo SY",ok:hasSY,v:hasSY?"OK":"Da caricare"});
        checks.push({l:"Consuntivo Subscription Rate",ok:hasNF,v:hasNF?"OK":"Da caricare"});
        checks.push({l:"Consuntivo SAS",ok:hasSAS,v:hasSAS?"OK":"Da caricare"});
        checks.push({l:"Consuntivo Accuracy",ok:hasAV,v:hasAV?"OK":"Da caricare"});
        // Inventario NON richiesto in mid-season
        checks.push({l:"Inventario",ok:true,v:"Non richiesto (mid-season)"});
      }
    } else {
      // Totale seasonal: logica originale
      checks=[
        {l:"Anagrafica",ok:E.length>0,v:E.length+" dip."},
        {l:"Cambi Valuta",ok:cambiOk,v:cambiOk?"OK":"Da caricare"},
        {l:"Target Fatturato",ok:hasSeaTo,v:hasSeaTo?stKeys.length+" neg.":"Da caricare"},
        {l:"Target SY",ok:hasSeaSY,v:hasSeaSY?"OK":"Da caricare"},
        {l:"Target Privilege",ok:hasSeaPr,v:hasSeaPr?"OK":"Da caricare"}
      ];
      if(hasDeptInt) checks.push({l:"Target QTY Dept",ok:hasSeaQt,v:hasSeaQt?stKeys.filter(function(k){return(SEAS_TARGETS[k].qt||0)>0}).length+" neg.":"Da caricare"});
      if(!isP){
        var cKeys=Object.keys(D.cs||{});
        var hasCons=cKeys.length>0;
        var hasSC=hasCons&&cKeys.some(function(k){return(D.cs[k].sc||0)>0});
        var hasSY=hasCons&&cKeys.some(function(k){return(D.cs[k].sy||0)>0});
        var hasNF=hasCons&&cKeys.some(function(k){return(D.cs[k].nf||0)>0});
        var hasAV=hasCons&&cKeys.some(function(k){return D.cs[k].av!=null&&D.cs[k].av>0});
        var hasIV=hasCons&&cKeys.some(function(k){return D.cs[k].iv!=null});
        var hasES=hasCons&&cKeys.some(function(k){return(D.cs[k].es||0)>0});
        var hasSAS=hasCons&&cKeys.some(function(k){return(D.cs[k].s4||0)>0});
        var hasQC=!hasDeptInt||cKeys.some(function(k){return(D.cs[k].qc||0)>0});
        checks.push({l:"Consuntivo Fatturato",ok:hasSC,v:hasSC?cKeys.length+" neg.":"Da caricare"});
        checks.push({l:"Consuntivo SY",ok:hasSY,v:hasSY?"OK":"Da caricare"});
        checks.push({l:"Consuntivo Privilege",ok:hasNF,v:hasNF?"OK":"Da caricare"});
        checks.push({l:"Consuntivo Accuracy",ok:hasAV,v:hasAV?"OK":"Da caricare"});
        checks.push({l:"Risultato Inventariale",ok:hasIV||hasES,v:(hasIV||hasES)?"OK":"Da caricare"});
        checks.push({l:"SAS",ok:hasSAS,v:hasSAS?"OK":"Da caricare"});
        var hasSeasSasTurn=hasCons&&cKeys.some(function(k){return seasSasFullFileActive()?((D.cs[k].sasSeasFull||0)>0):(((D.cs[k].sasSeasJulRec||0)>0)||((D.cs[k].sasSeasAugRec||0)>0));});
        checks.push({l:"SAS → Fatturato",ok:hasSeasSasTurn,v:hasSeasSasTurn?"OK":"Da caricare (se nessun negozio gestisce SAS, opzionale)"});
        if(hasDeptInt) checks.push({l:"Consuntivo QTY Dept",ok:hasQC,v:hasQC?cKeys.filter(function(k){return(D.cs[k].qc||0)>0}).length+" neg.":"Da caricare"});
      }
    }
  } else {
    // Completeness - Premi mensili
    sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\u2705 Completezza \u2014 MENSILE — '+(isP?"PREVENTIVO":"CONSUNTIVO")+"</div>";
    // Premi mensili
    var tradOk=Object.keys(D.tr||{}).length>0;
    checks=[
      {l:"Anagrafica",ok:E.length>0,v:E.length+" dip."},
      {l:"Target Fatturato",ok:Object.keys(D.t||{}).length>0,v:Object.keys(D.t||{}).length+" neg."},
      {l:"Cambi Valuta",ok:cambiOk,v:cambiOk?"OK":"Da caricare"},
      {l:"Traduzioni",ok:tradOk,v:tradOk?(Object.keys(D.tr).length+" lingue"):"Da caricare"},
      {l:"Target SY",ok:Object.keys(D.t||{}).some(function(k){return(D.t[k].sy||0)>0}),v:"OK"},
      {l:"Target CR",ok:Object.keys(D.t||{}).some(function(k){return(D.t[k].cr||0)>0}),v:"OK"},
      {l:"Target Privilege",ok:Object.keys(D.t||{}).some(function(k){return(D.t[k].pr||0)>0}),v:"OK"},
      {l:"SY LY Last Year",ok:Object.keys(MONTHLY_SYLY).length>0,v:Object.keys(MONTHLY_SYLY).length>0?(Object.keys(MONTHLY_SYLY).length+" store"):"Da caricare"}
    ];
    if(!isIT)checks.push({l:"Target QTY",ok:Object.keys(D.t||{}).some(function(k){return(D.t[k].qt||0)>0}),v:"OK"});
    // Anagrafica USA: visibile sia in preventivo che consuntivo (solo internazionale)
    if(!isIT){
      var hasUSAAnag=E.some(function(e){return e.cu==="USD"&&D.usa&&D.usa[e.m]&&(D.usa[e.m].cm||0)>0});
      checks.push({l:"\ud83c\uddfa\ud83c\uddf8 Anagrafica USA",ok:hasUSAAnag,v:hasUSAAnag?(E.filter(function(e){return e.cu==="USD";}).length+" dip. USA"):"Da caricare"});
    }
    // Visual In Store: sempre visibile P+C; obbligatorio solo per internazionale
    var hasVL=Object.keys(VL).length>0;
    checks.push({l:"\ud83c\udfa8 Visual In Store",ok:isIT?true:hasVL,v:hasVL?Object.keys(VL).length+" dip.":(isIT?"Opzionale":"Da caricare")});
    if(!isP){
      var hasCons=Object.keys(D.c).length>0;
      var hasSC=hasCons&&Object.keys(D.c).some(function(k){return(D.c[k].sc||0)>0});
      // SAS: da luglio 2026 si controlla il NUOVO dato (accettazione/velocità/valore),
      // prima il vecchio conteggio "SAS on target" (s4).
      var _sasNew=typeof sasNewActive==='function'&&sasNewActive();
      var hasSAS=hasCons&&Object.keys(D.c).some(function(k){return _sasNew?(D.c[k].sasv!=null||D.c[k].vel!=null||D.c[k].sa!=null):((D.c[k].s4||0)>0);});
      var hasMal=E.some(function(e){return(e.ml||0)>0});
      var hasDigC=hasCons&&Object.keys(D.c).some(function(k){return(D.c[k].pd||0)>0});
      checks.push({l:"Risultati BDG",ok:hasSC,v:hasSC?Object.keys(D.c).length+" neg.":"Da caricare"});
      checks.push({l:_sasNew?"SAS (valore→fatturato)":"SAS",ok:hasSAS,v:hasSAS?"OK":"Da caricare"});
      checks.push({l:"Malattie",ok:hasMal,v:hasMal?"OK":"Da caricare"});
      checks.push({l:"% Digital (cons.)",ok:hasDigC,v:hasDigC?"OK":"Da caricare"});
      checks.push({l:"Esubero",ok:hasCons&&Object.keys(D.c).some(function(k){return(D.c[k].es||0)>0}),v:"OK"});
      var hasDCC=hasCons&&Object.keys(D.c).some(function(k){return(D.c[k].dv||0)>0});
      var hasArt=hasCons&&Object.keys(D.c).some(function(k){return(D.c[k].ac||0)>0});
      checks.push({l:"DCC",ok:hasDCC,v:hasDCC?"OK":"Da caricare"});
      if(PARAMS.artEnabled)checks.push({l:"Articoli Incentivati",ok:hasArt,v:hasArt?"OK":"Da caricare"});
      if(!isIT){
        var hasUSAps=Object.keys(D.usa||{}).length>0&&Object.keys(D.usa).some(function(k){return(D.usa[k].ps||0)>0});
        checks.push({l:"Fatt. Personale USA",ok:hasUSAps,v:hasUSAps?"OK":"Da caricare"});
      }
    }
  }
  var ld=0;checks.forEach(function(ck){if(ck.ok)ld++});var pO=Math.round(ld/checks.length*100);
  sh+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><div style="flex:1;height:8px;background:#e5e1db;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pO+'%;background:'+(pO===100?"#2d7a3a":"#c9a96e")+';border-radius:4px"></div></div><span style="font-size:12px;font-weight:700">'+pO+"%</span></div>";
  sh+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px">';
  checks.forEach(function(ck){sh+='<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:'+(ck.ok?"#f0faf2":"#fef6f0")+';border-radius:5px;border:1px solid '+(ck.ok?"#d4edda":"#f8d7da")+'"><span style="font-size:12px">'+(ck.ok?"\u2705":"\u274c")+'</span><span style="font-size:10px;font-weight:600">'+ck.l+"</span></div>"});
  sh+="</div></div>";

  // === SEASONAL: import Mid-Season gi\u00e0 erogato (solo semestrale, consuntivo) ===
  if(isSeasonal&&!isMid&&!isP){
    var midCount=0;E.forEach(function(e){if(isSMVSM(e)&&SEAS[e.m]&&SEAS[e.m].midPaid>0)midCount++;});
    sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83e\uddfe Mid-Season gi\u00e0 erogato</div>';
    sh+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">Importa gli importi realmente erogati a met\u00e0 stagione, per matricola (es. lo stesso file esportato dal tab Mid-Season, colonna <b>MID-SEASON LC</b>). Vengono detratti automaticamente dal premio di fine stagione, in tab calcoli, export e lettere.</div>';
    sh+='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
    sh+='<label class="exp-btn btn-amber" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">\ud83d\udcc2 Carica Mid-Season Erogato (.xlsx)<input type="file" accept=".xlsx,.xls,.csv" onchange="loadMidSeasonPaidExcel(this)" style="display:none"></label>';
    if(midCount>0)sh+='<span style="font-size:10px;color:#2d7a3a;font-weight:600">\u2705 '+midCount+' dipendenti con acconto registrato</span>';
    else sh+='<span style="font-size:10px;color:#a09a92">Nessun acconto registrato</span>';
    sh+='</div></div>';
  }

  // === SEASONAL: import SAS \u2192 Fatturato (solo semestrale, consuntivo, da SS26) ===
  if(isSeasonal&&!isMid&&!isP&&seasSasPeriodActive()){
    var sasSeasCount=Object.keys(D.cs||{}).filter(function(k){
      return seasSasFullFileActive()?((D.cs[k].sasSeasFull||0)>0):(((D.cs[k].sasSeasJulRec||0)>0)||((D.cs[k].sasSeasAugRec||0)>0));
    }).length;
    sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83d\udcb0 SAS \u2192 Fatturato (stagionale)</div>';
    if(seasSasFullFileActive()){
      sh+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">Importa il file con il valore SAS <b>gi\u00e0 calcolato</b> dal tool esterno per l\'intero periodo. Si somma direttamente al fatturato verso il target, senza cap n\u00e9 riserva. Vale solo per SM/VSM nei negozi dove il KPI SAS \u00e8 attivo (Dept Store esclusi).</div>';
      sh+='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
      sh+='<label class="exp-btn btn-amber" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">\ud83d\udcc2 Carica SAS Stagione (.xlsx)<input type="file" accept=".xlsx,.xls,.csv" onchange="loadSeasonalSasFullExcel(this)" style="display:none"></label>';
    } else {
      sh+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">Importa i due file mensili di coda stagione (stesso formato dell\'import SAS mensile: store id, % accettati, % gestiti entro 4h, valore SAS). L\'app applica la matrice di riconoscimento e somma i due valori riconosciuti al fatturato verso il target, senza cap n\u00e9 riserva. Vale solo per SM/VSM nei negozi dove il KPI SAS \u00e8 attivo (Dept Store esclusi).</div>';
      sh+='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
      sh+='<label class="exp-btn btn-amber" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">\ud83d\udcc2 Carica SAS Luglio (.xlsx)<input type="file" accept=".xlsx,.xls,.csv" onchange="loadSeasonalSasJulExcel(this)" style="display:none"></label>';
      sh+='<label class="exp-btn btn-amber" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">\ud83d\udcc2 Carica SAS Agosto (.xlsx)<input type="file" accept=".xlsx,.xls,.csv" onchange="loadSeasonalSasAugExcel(this)" style="display:none"></label>';
    }
    if(sasSeasCount>0)sh+='<span style="font-size:10px;color:#2d7a3a;font-weight:600">\u2705 '+sasSeasCount+' negozi con valore SAS caricato</span>';
    else sh+='<span style="font-size:10px;color:#a09a92">Nessun dato caricato</span>';
    sh+='</div></div>';
  }

  // === VISUAL IN STORE: import diretto (solo mensile, P+C) ===
  if(!isSeasonal){
    var vlCount=Object.keys(VL).length;
    sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">🎨 Visual In Store</div>';
    sh+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">Importa il file Excel con i premi Visual In Store. Colonne attese: MATRICOLA, STORE ID, BDG (una riga per negozio per dipendente; importi sommati per matricola).'+(isIT?' <span style="color:#c9a96e">Opzionale per Italia.</span>':'')+'</div>';
    sh+='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
    sh+='<label class="exp-btn btn-purple" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">📂 Carica Visual In Store (.xlsx)<input type="file" accept=".xlsx,.xls,.csv" onchange="loadVisualExcel(this)" style="display:none"></label>';
    if(vlCount>0)sh+='<span style="font-size:10px;color:#2d7a3a;font-weight:600">✅ '+vlCount+' dipendenti caricati</span>';
    else sh+='<span style="font-size:10px;color:#a09a92">Nessun dato caricato</span>';
    sh+='</div></div>';
  }

  // Connectors (collapsed by default)
  sh+='<div class="wg" style="margin-bottom:20px"><div class="wg-title" style="display:flex;justify-content:space-between;align-items:center">\ud83d\udd0c Connettori Dati<button id="toggleConn" style="font-size:9px;padding:3px 10px;border:1px solid #d5d0c8;border-radius:4px;background:#faf9f7;color:#6b6560;cursor:pointer">Espandi \u25bc</button></div>';
  sh+='<div id="connBody" style="display:none">';
  sh+='<div style="overflow-x:auto"><table style="font-size:10px"><thead><tr style="background:#eae7e1"><th style="padding:6px;cursor:default">Dato</th><th style="padding:6px;cursor:default">Fase</th><th style="padding:6px;cursor:default">Tipo</th><th style="padding:6px;cursor:default">Percorso/URL</th><th style="padding:6px;cursor:default">Foglio</th><th style="padding:6px;cursor:default">\u2714</th><th style="padding:6px;cursor:default">Azione</th></tr></thead><tbody>';
  (DATA_REQS||[]).forEach(function(dr,i){
    // Filter rows by prize mode: show "both" mode always, else show matching mode
    var modeMatch=(dr.mode==="both")||(dr.mode===PRIZE_MODE)||(PRIZE_MODE==="seasonal"&&SEASON_PERIOD==="mid"&&dr.mode==="mid");
    if(!modeMatch)return;
    if(dr.id==="articles"&&!PARAMS.artEnabled)return;
    var needed=(dr.need==="both")||(dr.need==="cons"&&!isP);
    var phaseLabel=dr.need==="both"?"P+C":"C";
    sh+='<tr style="background:'+(i%2?"#faf9f7":"#fff")+';opacity:'+(needed?"1":"0.4")+'">';
    sh+='<td style="padding:5px"><b>'+dr.label+'</b><br><span style="font-size:9px;color:#a09a92">'+dr.desc+"</span></td>";
    sh+='<td style="padding:5px;font-size:9px">'+phaseLabel+"</td>";
    sh+='<td style="padding:5px"><select data-dr="'+dr.id+'" data-field="type" style="padding:2px 4px;border:1px solid #d5d0c8;border-radius:3px;font-size:9px;width:110px"><option value="">--</option>';
    (SRC_TYPES||[]).forEach(function(st){sh+='<option value="'+st.k+'"'+(dr.srcType===st.k?" selected":"")+">"+st.icon+" "+st.l+"</option>"});
    sh+="</select></td>";
    sh+='<td style="padding:5px"><input data-dr="'+dr.id+'" data-field="path" type="text" placeholder="percorso..." value="'+esc(dr.srcPath||"")+'" style="padding:2px 4px;border:1px solid #d5d0c8;border-radius:3px;font-size:9px;width:100%;min-width:140px"></td>';
    sh+='<td style="padding:5px"><input data-dr="'+dr.id+'" data-field="sheet" type="text" placeholder="foglio" value="'+esc(dr.src||"")+'" style="padding:2px 4px;border:1px solid #d5d0c8;border-radius:3px;font-size:9px;width:80px"></td>';
    var scanR=LOAD_RESULTS[dr.id];
    var statusIcon=scanR?(scanR.found?"\u2705":"\u274c"):(dr.srcType&&dr.srcPath&&dr.srcType!=="excel_local"?'<button class="conn-verify" data-vid="'+dr.id+'" style="font-size:8px;padding:2px 6px;border:1px solid #d5d0c8;border-radius:3px;cursor:pointer;background:#faf9f7">Verifica</button>':(dr.srcType&&dr.srcPath?"\u2705":"\u2014"));
    sh+='<td style="padding:5px;text-align:center">'+statusIcon+"</td>";
    sh+='<td style="padding:5px"><label style="cursor:pointer;display:inline-flex;align-items:center;gap:2px;padding:2px 8px;border:1px solid #d5d0c8;border-radius:3px;font-size:9px;background:#faf9f7;color:#4e4b48" class="conn-load">\ud83d\udcc2<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-load-id="'+dr.id+'" style="display:none"></label></td>';
    sh+="</tr>"});
  sh+="</tbody></table></div></div></div>";

  // Rules — dynamic based on PRIZE_MODE
  sh+='<div class="nb"><div style="font-size:12px;font-weight:700;margin-bottom:8px">Regole Attive &mdash; '+(isSeasonal?("&#127942; Seasonal Bonus &nbsp;<span style=\"font-size:10px;font-weight:400;color:#8a8680\">"+CFG_SEASON+" "+CFG_YEAR+"</span>"):("&#128197; Mensile &nbsp;<span style=\"font-size:10px;font-weight:400;color:#8a8680\">"+getMonthYearLabel()+"</span>"))+'</div>';
  if(isSeasonal){
    // Seasonal rules summary
    sh+='<div style="font-size:10px;color:#6b6560;line-height:1.8">';
    sh+='<b>Base incentivo:</b> '+Math.round(SEAS_CFG.basePct*100)+'% della retribuzione semestrale lorda';
    sh+=' &nbsp;&#183;&nbsp; <b>Max (100% KPI × moltiplicatori):</b> 30%';
    sh+='<br>';
    // KPI weights standard
    sh+='<b>KPI Standard:</b> ';
    var kpiParts=[];
    (SEAS_CFG.kpi||[]).forEach(function(k){if(k.weight>0)kpiParts.push(k.label+' '+Math.round(k.weight*100)+'% (soglia '+Math.round(k.threshold*100)+'%)')});
    sh+=kpiParts.join(' &nbsp;&#183;&nbsp; ');
    sh+='<br>';
    // KPI No SAS
    var noSasParts=[];
    (SEAS_CFG.kpi_nosas||[]).forEach(function(k){if(k.weight>0)noSasParts.push(k.label+' '+Math.round(k.weight*100)+'% (soglia '+Math.round(k.threshold*100)+'%)')});
    if(noSasParts.length)sh+='<b>KPI No SAS:</b> '+noSasParts.join(' &nbsp;&#183;&nbsp; ')+'<br>';
    // KPI No Accuracy
    var noAccParts=[];
    (SEAS_CFG.kpi_noacc||[]).forEach(function(k){if(k.weight>0)noAccParts.push(k.label+' '+Math.round(k.weight*100)+'% (soglia '+Math.round(k.threshold*100)+'%)')});
    if(noAccParts.length)sh+='<b>KPI No Accuracy:</b> '+noAccParts.join(' &nbsp;&#183;&nbsp; ')+'<br>';
        // Moltiplicatore fatturato
    sh+='<b>Molt. Fatturato:</b> ';
    var moltParts=[];
    (SEAS_CFG.molt_turnover||[]).forEach(function(m){if(isFinite(m.from)||isFinite(m.to))moltParts.push(m.label+' → ×'+m.coeff.toFixed(2))});
    sh+=moltParts.join(' &nbsp;&#183;&nbsp; ')+'<br>';
    // Moltiplicatore inventario
    sh+='<b>Molt. Inventario (&Delta; su COGS):</b> ';
    var invParts=[];
    (SEAS_CFG.molt_inventario||[]).forEach(function(m){invParts.push(m.label+' \u2192 \u00d7'+m.coeff.toFixed(2))});
    sh+=invParts.join(' &nbsp;&#183;&nbsp; ');
    sh+='</div>';
  } else {
    // Mensile rules summary
    sh+='<div style="font-size:10px;color:#6b6560;line-height:1.8">';
    sh+="<b>BDG:</b> 100% a &ge;"+(PARAMS.bdg100*100)+"% store | "+(PARAMS.bdg60mult*100)+"% a &ge;"+(PARAMS.bdg60*100)+"% &nbsp;&#183;&nbsp; <b>Soglia KPI (SY/Priv/QTY):</b> &ge;"+(PARAMS.kpi100*100)+"%";
    sh+=" &nbsp;&#183;&nbsp; <b>Digital:</b> "+(PARAMS.digPct*100)+"% BDG se &ge;"+(PARAMS.digMinClassic*100)+"% (classico) / "+(PARAMS.digMinMobility*100)+"% (mobility)";var mobCount=Object.keys(STORE_FLAGS).filter(function(s){return STORE_FLAGS[s]&&STORE_FLAGS[s].digType==="mobility"&&STORE_FLAGS[s].digMinMob>0;}).length;if(mobCount>0)sh+=" <span style='color:#8b7ec8'>("+mobCount+" store con % personalizzata)</span>";
    sh+=" &nbsp;&#183;&nbsp; <b>SY:</b> "+(PARAMS.syPct*100)+"%";
    sh+=" &nbsp;&#183;&nbsp; <b>Privilege:</b> "+(PARAMS.privPct*100)+"%<br>";
    sh+="<b>SAS:</b> &euro;"+PARAMS.sasRate+" max &euro;"+PARAMS.sasMax;
    sh+=" &nbsp;&#183;&nbsp; <b>DCC:</b> "+(PARAMS.dccRate*100).toFixed(1)+"% max &euro;"+PARAMS.dccMax;
    if(PARAMS.artEnabled)sh+=" &nbsp;&#183;&nbsp; <b>Art.Inc:</b> "+(PARAMS.artPct*100)+"% BDG/cat";
    sh+=" &nbsp;&#183;&nbsp; <b>QTY:</b> "+(PARAMS.qtyPct*100)+"%";
    sh+=" &nbsp;&#183;&nbsp; <b>Malattia:</b> "+SICK_50+"gg=50%, "+SICK_0+"gg=0%";
    sh+='</div>';
  }
  sh+='</div>';
  document.getElementById("p4").innerHTML=sh;
  // Connectors toggle
  var togC=document.getElementById("toggleConn");if(togC)togC.onclick=function(){var bd=document.getElementById("connBody");if(bd){var vis=bd.style.display==="none";bd.style.display=vis?"":"none";togC.textContent=vis?"Comprimi \u25b2":"Espandi \u25bc"}};

  // Bind file loaders
  var loadAnag=document.getElementById("loadAnagrafica");
  if(loadAnag)loadAnag.onchange=function(){if(this.files[0]){var f=this.files[0];this.value="";loadAnagraficaExcel(f)}};
  var loadAnagUSA=document.getElementById("loadAnagraficaUSA");
  if(loadAnagUSA)loadAnagUSA.onchange=function(){if(this.files[0]){var f=this.files[0];this.value="";loadAnagraficaUSA(f)}};
  var loadFcMapping=document.getElementById("loadFcMapping");
  if(loadFcMapping)loadFcMapping.onchange=function(){if(this.files[0]){var f=this.files[0];this.value="";loadFcMappingForMensile(f)}};
  var loadTarget=document.getElementById("loadTarget");
  if(loadTarget)loadTarget.onchange=function(){if(this.files[0]){var f=this.files[0];this.value="";scanExcelFile(f,"target")}};
  var loadCons=document.getElementById("loadCons");
  if(loadCons)loadCons.onchange=function(){if(this.files[0]){var f=this.files[0];this.value="";scanExcelFile(f,"cons")}};


  // Bind connector row load buttons
  document.querySelectorAll("input[data-load-id]").forEach(function(inp){
    inp.onchange=function(){
      if(!this.files[0])return;
      var id=inp.getAttribute("data-load-id");
      if(id==="employees"){loadAnagraficaExcel(this.files[0]);return}
      scanExcelFile(this.files[0],id==="sas"||id==="dcc"||id==="articles"||id==="sickness"||id==="surplus"||id==="visual"||id==="personal_sales"?"cons":"target");
    };
  });

  // Verify buttons for non-local connectors
  document.querySelectorAll("button.conn-verify").forEach(function(btn){btn.onclick=function(){
    var id=btn.getAttribute("data-vid");
    var dr;DATA_REQS.forEach(function(d){if(d.id===id)dr=d});
    if(!dr||!dr.srcPath){alert("Inserisci un percorso/URL prima di verificare.");return}
    alert("Verifica connessione per: "+dr.label+"\nTipo: "+(dr.srcType||"non impostato")+"\nPercorso: "+dr.srcPath+"\n\nQuesta funzionalit\u00e0 richiede l'app desktop WPF per accedere a risorse di rete, API o database.");
  }});

  // Bind connectors
  document.querySelectorAll("select[data-dr]").forEach(function(sel){sel.onchange=function(){var id=sel.getAttribute("data-dr");DATA_REQS.forEach(function(d){if(d.id===id)d.srcType=sel.value||null});markDirty();rSources()}});
  document.querySelectorAll("input[data-dr]").forEach(function(inp){inp.onchange=function(){var id=inp.getAttribute("data-dr"),f=inp.getAttribute("data-field");DATA_REQS.forEach(function(d){if(d.id===id){if(f==="path")d.srcPath=inp.value||null;else if(f==="sheet")d.src=inp.value||null}});markDirty()}});
}catch(ex){console.error("rSources error:",ex);var _p4=document.getElementById("p4");if(_p4)_p4.innerHTML='<div style="padding:20px;color:#cf5b5b">Errore rendering Fonti Dati: '+ex.message+(ex.stack?'<br><details style="margin-top:8px"><summary style="cursor:pointer;font-size:10px">Dettagli tecnici</summary><pre style="font-size:9px;white-space:pre-wrap;color:#a09a92">'+ex.stack+'</pre></details>':'')+'</div>';}}
try{ rSources(); }catch(_e){ try{setTimeout(rSources,0)}catch(_e2){} }

// ==== TAB 7: NEGOZI (Store Settings) ====
var storeFilter="";
/*BUNDLE_INSERT:96-render-negozi*/
// ==== TAB 6: DISTRIBUZIONE ====
/*BUNDLE_INSERT:97-render-distribuzione*/
/*BUNDLE_INSERT:98-outlook-bridge*/
</script>
<script>
// ═══════════════════════════════════════════════════════════════════════
// FC + VM — UI, lettera, fonti dati
// ═══════════════════════════════════════════════════════════════════════

/*BUNDLE_INSERT:99a-render-fcvm-base*/// ── Builder lettera ───────────────────────────────────────────
/*BUNDLE_INSERT:48-letter-builder-fcvm*/function rAFcvm(){
  var pool=getFcVmPool();
  var isP=MODE==='preventivo';
  if(!pool.length){
    document.getElementById('p2').innerHTML='<div class="wg" style="text-align:center;padding:40px;color:#a09a92"><div style="font-size:32px;margin-bottom:12px">&#128202;</div><div>Carica i dati FC+VM per vedere le analisi.</div></div>'+renderMonitorSection();
    return;
  }
  var totEur=0,nFull=0,nPartial=0,nPartialNosy=0,nNone=0,nPrev=0,nSospesi=0;
  var totTargetEur=0,totConsEur=0,totEsuberoEur=0;
  var fcData=[],vmData=[];
  pool.forEach(function(emp){
    var r=calcFcVmPremio(emp.m);
    var exR=getFcVmExRate(emp.cu);
    var aggFcvmRow=AGG_FCVM[emp.m]||0;var aggFcvmEurRow=Math.round(aggFcvmRow*getFcVmExRate(emp.cu)*100)/100;totEur+=(r.hasBdg?r.totalPremioEur:r.premio_eur)+aggFcvmEurRow;
    totTargetEur+=r.totTarget;
    totConsEur+=(!isP?r.totCons:r.totTarget);
    totEsuberoEur+=(!isP?r.totEsubero:0);
    if(r.esito==='sospeso')nSospesi++;
    else if(r.esito==='full')nFull++;
    else if(r.esito==='partial')nPartial++;
    else if(r.esito==='partial_nosy')nPartialNosy++;
    else if(r.esito==='none')nNone++;
    else nPrev++;
    if(emp.ps!=="SI"&&emp.ml>0&&r.sm<1&&r.esito!=='sospeso'){if(r.esito==='full'||r.esito==='partial')r.esito='malattia';}
    var row={m:emp.m,c:emp.c,n:emp.n,j:emp.j,cu:emp.cu,ib:emp.ib,r:r,exR:exR,ml:emp.ml||0,ps:emp.ps};
    if(emp.j==='FC')fcData.push(row);else vmData.push(row);
  });
  var areaPct=totTargetEur>0?totConsEur/totTargetEur:null;

  var h='<div class="wg" style="margin-bottom:16px"><div class="wg-title">&#128202; FC + VM — Riepilogo '+MONTH_NAMES.IT[CFG_MONTH]+' '+CFG_YEAR+(isP?' — PREVENTIVO':' — CONSUNTIVO')+'</div>';

  // KPI cards
  h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:16px">';
  [{l:'Dipendenti',v:pool.length,c:'#5b6abf'},{l:'Premio pieno',v:nFull,c:'#2d7a3a'},{l:'Premio ridotto',v:nPartial,c:'#cf8b4e'},{l:'Soglia/no SY',v:nPartialNosy,c:'#856404'},{l:'Nessun premio',v:nNone,c:'#cf5b5b'},{l:'Sospesi',v:nSospesi,c:'#b0a99f'}].forEach(function(s){
    h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:8px;padding:12px;text-align:center">';
    h+='<div style="font-size:22px;font-weight:800;color:'+s.c+'">'+s.v+'</div>';
    h+='<div style="font-size:10px;color:#8a8680;margin-top:3px">'+s.l+'</div></div>';
  });
  h+='</div>';

  // Riepilogo SAS → fatturato (da Luglio 2026, consuntivo). Aggregato per negozio.
  if(typeof sasNewActive==='function'&&sasNewActive()&&!isP){
    var _fV=0,_fR=0,_fA=0,_fRes=0,_fN=0;
    Object.keys(FC_RESULTS||{}).forEach(function(sid){
      var cn=FC_RESULTS[sid]||{},tg=FC_TARGETS[sid]||{};
      var rec=sasRecognizedValue(cn.acc,cn.vel,cn.sasv_eur||0);
      if(rec<=0&&!((cn.sasr_eur||0)>0))return;
      var sr=sasReserveCalc(cn.sc_eur||0,tg.to_eur||0,rec,cn.sasr_eur||0);
      _fV+=cn.sasv_eur||0;_fR+=rec;_fA+=sr.used;_fRes+=sr.reserveOut;_fN++;
    });
    if(_fN>0){
      h+='<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#a07d2c;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Valore SAS → Fatturato (EUR) — '+_fN+' negozi</div>';
      h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
      [{l:'Valore SAS negozi',v:_fV,c:'#a07d2c'},{l:'Riconosciuto',v:_fR,c:'#c9a96e'},{l:'Applicato al fatturato',v:_fA,c:'#2d7a3a'},{l:'Riserva riportata',v:_fRes,c:'#5ba4cf'}].forEach(function(s){
        h+='<div style="background:#faf9f7;border:1px solid #e5e1db;border-radius:8px;padding:12px;text-align:center"><div style="font-size:18px;font-weight:800;color:'+s.c+'">'+fc(s.v,"EUR")+'</div><div style="font-size:10px;color:#8a8680;margin-top:3px">'+s.l+'</div></div>';
      });
      h+='</div></div>';
    }
  }

  // Totali fatturato + premi
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">';
  // Target area totale
  h+='<div style="background:#2c2925;border-radius:8px;padding:14px">';
  h+='<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a09a92;margin-bottom:4px">TARGET AREA TOT.</div>';
  h+='<div style="font-size:18px;font-weight:800;color:#c9a96e">'+fc(Math.round(totTargetEur),'EUR')+'</div></div>';
  // Consuntivo (o potenziale)
  h+='<div style="background:#2c2925;border-radius:8px;padding:14px">';
  h+='<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a09a92;margin-bottom:4px">'+(isP?'POTENZIALE':'CONSUNTIVO AREA TOT.')+'</div>';
  var totConsConEsub=totConsEur+totEsuberoEur;
  var areaPctWithEsub=totTargetEur>0?totConsConEsub/totTargetEur:null;
  var consColor=areaPctWithEsub===null?'#a09a92':areaPctWithEsub>=FCVM_PARAMS.soglia100?'#5bb98c':areaPctWithEsub>=FCVM_PARAMS.soglia60?'#c9a96e':'#e07b4e';
  h+='<div style="font-size:18px;font-weight:800;color:'+consColor+'">'+fc(Math.round(totConsEur),'EUR')+(areaPctWithEsub!==null?' <span style="font-size:12px;color:'+consColor+';">('+fPct(areaPctWithEsub)+')</span>':'')+'</div>';
  if(!isP&&totEsuberoEur>0)h+='<div style="font-size:10px;color:#5b6abf;margin-top:2px">+'+fc(Math.round(totEsuberoEur),'EUR')+' esub. → Tot. '+fc(Math.round(totConsConEsub),'EUR')+'</div>';
  h+='</div>';
  // Totale premi
  h+='<div style="background:#2c2925;border-radius:8px;padding:14px">';
  h+='<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a09a92;margin-bottom:4px">TOTALE PREMI EUR</div>';
  h+='<div style="font-size:18px;font-weight:800;color:#c9a96e">'+fc(Math.round(totEur),'EUR')+'</div></div>';
  h+='</div>';
  h+='</div>';

  // Dettaglio per ruolo FC / VM
  [{label:'&#128084; Field Coach',data:fcData},{label:'&#128241; Visual Merchandiser',data:vmData}].forEach(function(group){
    if(!group.data.length)return;
    h+='<div class="wg" style="margin-bottom:16px"><div class="wg-title">'+group.label+'</div>';
    h+='<div class="scroll-wrap"><table style="width:100%;border-collapse:collapse;font-size:10px">';
    h+='<thead><tr style="background:#2c2925;color:#c9a96e">';
    h+='<th style="padding:6px 10px;text-align:left">Matricola</th><th style="text-align:left;padding:6px 8px">Cognome Nome</th>';
    h+='<th style="text-align:right;padding:6px 8px">Target EUR</th>';
    if(!isP)h+='<th style="text-align:right;padding:6px 8px">Cons. EUR</th>';
    if(!isP&&totEsuberoEur>0)h+='<th style="text-align:right;padding:6px 8px;color:#c7d2fe">Esubero</th><th style="text-align:right;padding:6px 8px;color:#c7d2fe">Cons. Tot.</th>';
    h+='<th style="text-align:right;padding:6px 8px">% Area</th>';
    h+='<th style="text-align:right;padding:6px 8px">SY LY</th>';
    if(!isP)h+='<th style="text-align:right;padding:6px 8px">SY CY</th>';
    h+='<th style="text-align:right;padding:6px 8px">Premio LC</th>';
    h+='<th style="text-align:right;padding:6px 8px">Premio EUR</th>';
    h+='<th style="text-align:center;padding:6px 8px">Esito</th>';
    if(!isP)h+='<th style="text-align:center;padding:6px 8px">Mal.</th>';
    h+='</tr></thead><tbody>';
    var totTgt=0,totCns=0,totEsub=0,totPremEur=0;
    group.data.forEach(function(row,i){
      var r=row.r;
      var ec2={full:'#2d7a3a',partial:'#cf8b4e',partial_nosy:'#856404',none:'#cf5b5b',preventivo:'#c9a96e',sospeso:'#b0a99f',malattia:'#c9a96e'}[r.esito]||'#a09a92';
      var el2={full:'✓ Pieno',partial:fPct(FCVM_PARAMS.pct60),partial_nosy:'Soglia/—SY',none:'✗',preventivo:'Max',sospeso:'Sospeso',malattia:'Ridotto'}[r.esito]||r.esito;
      var pc=r.totTarget>0?r.pct:null;
      var bg=i%2===0?'#fff':'#faf9f7';
      var rowOpacity=row.ps==="SI"?'opacity:.45;':'';
      totTgt+=r.totTarget; totCns+=(!isP?r.totCons:r.totTarget); totEsub+=(!isP?r.totEsubero:0); var aggRowEur2=Math.round((AGG_FCVM[row.m]||0)*getFcVmExRate(row.cu)*100)/100;totPremEur+=(r.hasBdg?r.totalPremioEur:r.premio_eur)+aggRowEur2;
      h+='<tr style="background:'+bg+';'+rowOpacity+'">';
      h+='<td style="padding:4px 10px;font-family:monospace;color:#8a8680">'+esc(String(row.m))+'</td>';
      h+='<td style="padding:4px 8px;font-weight:600">'+esc(row.c)+' '+esc(row.n)+'</td>';
      h+='<td style="padding:4px 8px;text-align:right">'+fc(r.totTarget,'EUR')+'</td>';
      if(!isP)h+='<td style="padding:4px 8px;text-align:right">'+fc(r.totCons,'EUR')+'</td>';
      if(!isP&&totEsuberoEur>0){
        h+='<td style="padding:4px 8px;text-align:right;color:#5b6abf">'+(r.totEsubero>0?'+'+fc(Math.round(r.totEsubero),'EUR'):'—')+'</td>';
        h+='<td style="padding:4px 8px;text-align:right;font-weight:600">'+fc(Math.round(r.totConsWithEsub),'EUR')+'</td>';
      }
      h+='<td style="padding:4px 8px;text-align:right;font-weight:700;color:'+(pc===null?'#a09a92':pc>=FCVM_PARAMS.soglia100?'#2d7a3a':pc>=FCVM_PARAMS.soglia60?'#cf8b4e':'#cf5b5b')+'">'+(pc!==null?fPct(pc):'—')+'</td>';
      h+='<td style="padding:4px 8px;text-align:right;color:#6b6560">'+(r.syLyArea!=null?fDec(r.syLyArea,2):'—')+'</td>';
      if(!isP)h+='<td style="padding:4px 8px;text-align:right;font-weight:600;color:'+(r.syAreaCy!=null?(r.syOk?'#2d7a3a':'#cf5b5b'):'#a09a92')+'">'+(r.syAreaCy!=null?fDec(r.syAreaCy,2):'—')+'</td>';
      var finalRowLC=(r.hasBdg?r.totalPremioLC:r.premio)+(AGG_FCVM[row.m]||0);
      var finalRowEur=(r.hasBdg?r.totalPremioEur:r.premio_eur)+Math.round((AGG_FCVM[row.m]||0)*getFcVmExRate(row.cu)*100)/100;
      h+='<td style="padding:4px 8px;text-align:right;font-weight:700;color:'+ec2+'">'+fc(finalRowLC,row.cu||'EUR')+(AGG_FCVM[row.m]?'<span style="font-size:8px;color:#c9a96e"> +'+fc(AGG_FCVM[row.m],row.cu||'EUR')+'</span>':'')+'</td>';
      h+='<td style="padding:4px 8px;text-align:right;font-weight:700;color:'+ec2+'">'+fc(finalRowEur,'EUR')+'</td>';
      h+='<td style="padding:4px 8px;text-align:center;font-weight:700;color:'+ec2+'">'+el2+'</td>';
      if(!isP){var mlA=row.ml||0;var mlcA=mlA===0?'ml-0':mlA<SICK_50?'ml-0':mlA<SICK_0?'ml-low':'ml-high';h+='<td style="padding:4px 8px;text-align:center"><span class="ml-dot '+mlcA+'"></span>'+(mlA>0?mlA:'—')+'</td>';}
      h+='</tr>';
    });
    // Totale gruppo
    h+='<tr style="background:#3d3a36">';
    h+='<td colspan="2" style="padding:5px 10px;font-weight:700;color:#c9a96e;font-size:10px">TOTALE '+group.data.length+' dipendenti</td>';
    h+='<td style="padding:5px 8px;text-align:right;font-weight:700;color:#f5f4f1">'+fc(Math.round(totTgt),'EUR')+'</td>';
    if(!isP)h+='<td style="padding:5px 8px;text-align:right;font-weight:700;color:#f5f4f1">'+fc(Math.round(totCns),'EUR')+'</td>';
    if(!isP&&totEsuberoEur>0)h+='<td style="padding:5px 8px;text-align:right;font-weight:700;color:#c7d2fe">'+fc(Math.round(totEsub),'EUR')+'</td><td style="padding:5px 8px;text-align:right;font-weight:700;color:#c7d2fe">'+fc(Math.round(totCns+totEsub),'EUR')+'</td>';
    h+='<td></td><td></td>';
    if(!isP)h+='<td></td>';
    h+='<td colspan="2" style="padding:5px 8px;text-align:right;font-weight:800;color:#c9a96e">'+fc(Math.round(totPremEur),'EUR')+'</td>';
    h+='<td></td>';
    if(!isP)h+='<td></td>';
    h+='</tr>';
    h+='</tbody></table></div></div>';
  });

  document.getElementById('p2').innerHTML=h+renderMonitorSection();
}

