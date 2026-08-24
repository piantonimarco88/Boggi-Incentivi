function rT(){try{
  // FC+VM mode: show only FCVM parameters + Periodo/Output
  if(PRIZE_MODE==="fcvm"){
    var h='<div style="font-size:12px;color:#6b6560;margin-bottom:14px"><b>Modifiche immediate.</b> Salva per esportare.</div>';
    h+='<div style="margin-bottom:16px"><button class="exp-btn primary" onclick="saveConfig()" style="margin-right:8px">&#128190; Salva Configurazione</button><label class="exp-btn" style="cursor:pointer;display:inline-block">&#128194; Carica Configurazione<input type="file" accept=".json" onchange="loadConfig(event)" style="display:none"></label></div>';
    // Periodo e Output
    h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">&#128197; Periodo e Output</div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Mese</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><select id="cfgMonth2" class="cfg-input" style="width:130px;padding:4px 6px">';
    for(var mm=1;mm<=12;mm++){h+='<option value="'+mm+'"'+(CFG_MONTH===mm?' selected':'')+'>'+MONTH_NAMES.IT[mm]+'</option>';}
    h+='</select></div></div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Anno</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="cfgYearFcvm" value="'+CFG_YEAR+'" min="2024" max="2030" step="1"></div></div>';
    h+='<div class="cfg-row" style="border-top:1px solid #e5e1db;padding-top:8px;margin-top:4px"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Percorso base PDF</span><span style="font-size:9px;color:#a09a92">I PDF verranno salvati in: percorso/'+getPdfSubfolder().prev+'/ e /'+getPdfSubfolder().cons+'/</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:260px" type="text" id="cfgPdfPathFcvm" value="'+esc(CFG_PDF_PATH)+'" placeholder="C:\\Boggi\\Incentivi\\"></div></div></div>';
    // Parametri FC+VM
    h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">&#128084; FC + VM &mdash; Parametri Calcolo Premio</div>';
    h+='<div style="font-size:10px;color:#8a8680;margin-bottom:12px">Soglie e percentuali per il calcolo del premio FC e VM. Il fatturato area è sempre in EUR.</div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Soglia premio pieno</span><span style="font-size:9px;color:#a09a92">% minima del target area per erogare il 100% del premio massimale (default 99,5%)</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="fcvm_soglia100" value="'+(FCVM_PARAMS.soglia100*100).toFixed(1)+'" step="0.1" min="50" max="100"><span style="font-size:10px;color:#8a8680">%</span></div></div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Soglia premio ridotto</span><span style="font-size:9px;color:#a09a92">% minima per erogare il premio ridotto (richiede SY CY > SY LY, default 95%)</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="fcvm_soglia60" value="'+(FCVM_PARAMS.soglia60*100).toFixed(1)+'" step="0.1" min="50" max="99"><span style="font-size:10px;color:#8a8680">%</span></div></div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">% Premio ridotto</span><span style="font-size:9px;color:#a09a92">Percentuale del massimale erogata quando si raggiunge solo la soglia ridotta (default 60%)</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="fcvm_pct60" value="'+(FCVM_PARAMS.pct60*100).toFixed(1)+'" step="1" min="1" max="99"><span style="font-size:10px;color:#8a8680">%</span></div></div>';
    h+='<div style="font-size:10px;color:#8a8680;margin-top:12px;padding:8px 12px;background:#faf9f7;border-radius:5px;border:1px solid #e5e1db">';
    h+='<b>Logica premio:</b><br>';
    h+='&#9679; Area ≥ '+fPct(FCVM_PARAMS.soglia100)+' del target → <b>Premio pieno (100% del massimale)</b><br>';
    h+='&#9679; Area ≥ '+fPct(FCVM_PARAMS.soglia60)+' + SY CY > SY LY → <b>Premio ridotto ('+fPct(FCVM_PARAMS.pct60)+' del massimale)</b><br>';
    h+='&#9679; Altrimenti → <b>Nessun premio</b>';
    h+='</div></div>';
    // SAS — condivide SAS_MATRIX col mensile (usata sia per l'area FC/VM che per i bdg_stores)
    if(sasNewActive()){
      h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">&#128202; SAS &mdash; FC + VM</div>';
      h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">Stessa matrice usata in modalità Mensile. % del valore SAS del negozio riconosciuta nel fatturato verso il target (area e negozi BDG). Fino al 100% del target; l\'avanzo diventa riserva SAS riportata al mese dopo.</div>';
      h+='<div class="cfg-row"><span class="cfg-label">Etichetta velocità</span><input class="cfg-input" id="sasVelLabel" type="text" value="'+esc(SAS_MATRIX.velLabel)+'" style="width:170px"></div>';
      var _ab=SAS_MATRIX.accBands,_vb=SAS_MATRIX.velBands;
      var _bandLbl=function(b,k){return k===0?'<'+Math.round(b[0]*100)+'%':(k===3?'≥'+Math.round(b[2]*100)+'%':Math.round(b[k-1]*100)+'-'+Math.round(b[k]*100)+'%');};
      h+='<div style="font-size:10px;font-weight:700;color:#6b6560;text-align:center;margin:12px 0 2px">VELOCITÀ (asse orizzontale) — '+esc(SAS_MATRIX.velLabel)+' →</div>';
      h+='<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 8px"><thead><tr><th style="width:130px;font-size:9px;font-weight:700;color:#6b6560;padding:3px 8px;text-align:right;white-space:nowrap;vertical-align:bottom">% ACCETTAZIONE<br>(asse verticale) ↓</th>';
      for(var _c=0;_c<4;_c++)h+='<th style="font-size:9px;font-weight:700;color:#8a8680;padding:3px 8px;text-align:center">'+_bandLbl(_vb,_c)+'</th>';
      h+='</tr></thead><tbody>';
      [3,2,1,0].forEach(function(_ai){
        h+='<tr><td style="font-size:9px;color:#6b6560;font-weight:700;padding:3px 8px;text-align:right;white-space:nowrap">'+_bandLbl(_ab,_ai)+'</td>';
        for(var _c2=0;_c2<4;_c2++)h+='<td style="padding:2px;text-align:center"><input class="cfg-input sas-cell" type="number" data-sasr="'+_ai+'" data-sasc="'+_c2+'" value="'+Math.round(SAS_MATRIX.grid[_ai][_c2]*100)+'" step="1" min="0" max="100" style="width:62px;text-align:center"></td>';
        h+='</tr>';
      });
      h+='</tbody></table>';
      h+='<div style="font-size:10px;color:#8a8680;margin:2px 0">Soglie fasce <b>accettazione</b> (%, bassa→alta)</div><div style="display:flex;gap:6px;margin-bottom:6px">';
      for(var _i=0;_i<3;_i++)h+='<input class="cfg-input sas-accband" type="number" data-i="'+_i+'" value="'+Math.round(_ab[_i]*100)+'" step="1" min="0" max="100" style="width:56px;text-align:center">';
      h+='</div>';
      h+='<div style="font-size:10px;color:#8a8680;margin:2px 0">Soglie fasce <b>velocità</b> (%, bassa→alta)</div><div style="display:flex;gap:6px;margin-bottom:8px">';
      for(var _i2=0;_i2<3;_i2++)h+='<input class="cfg-input sas-velband" type="number" data-i="'+_i2+'" value="'+Math.round(_vb[_i2]*100)+'" step="1" min="0" max="100" style="width:56px;text-align:center">';
      h+='</div></div>';
    }
    // Malattia FC+VM
    h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">&#129298; Malattia &mdash; FC + VM (Consuntivo)</div>';
    h+='<div style="font-size:10px;color:#8a8680;margin-bottom:12px">Soglie giorni assenza per riduzione premio. Stessi parametri del mensile.</div>';
    h+='<div class="cfg-row"><span class="cfg-label">Giorni per 50%</span><input class="cfg-input" type="number" id="sick50_fcvm" value="'+SICK_50+'" min="1" max="30"></div>';
    h+='<div class="cfg-row"><span class="cfg-label">Giorni per 0%</span><input class="cfg-input" type="number" id="sick0_fcvm" value="'+SICK_0+'" min="1" max="31"></div>';
    h+='<div style="font-size:10px;color:#8a8680;margin-top:8px;padding:8px 12px;background:#faf9f7;border-radius:5px;border:1px solid #e5e1db">Assenze &ge; <b>'+SICK_50+'gg</b> → 50% del premio &nbsp;&#183;&nbsp; Assenze &ge; <b>'+SICK_0+'gg</b> → 0%</div></div>';
    document.getElementById("p3").innerHTML=h;
    // Bindings
    var selM=document.getElementById("cfgMonth2");
    if(selM)selM.onchange=function(){CFG_MONTH=parseInt(this.value);markDirty();updateHeader();rC();rA();rT();};
    var inpY=document.getElementById("cfgYearFcvm");
    if(inpY)inpY.onchange=function(){CFG_YEAR=parseInt(this.value)||2026;markDirty();updateHeader();rT();};
    var inpPdf=document.getElementById("cfgPdfPathFcvm");
    if(inpPdf)inpPdf.onchange=function(){CFG_PDF_PATH=this.value.trim();markDirty();};
    var inp100=document.getElementById("fcvm_soglia100");
    if(inp100)inp100.onchange=function(){FCVM_PARAMS.soglia100=Math.max(0.5,Math.min(1,parseFloat(this.value)/100));markDirty();rC();rT();};
    var inp60=document.getElementById("fcvm_soglia60");
    if(inp60)inp60.onchange=function(){FCVM_PARAMS.soglia60=Math.max(0.5,Math.min(0.999,parseFloat(this.value)/100));markDirty();rC();rT();};
    var inpPct=document.getElementById("fcvm_pct60");
    if(inpPct)inpPct.onchange=function(){FCVM_PARAMS.pct60=Math.max(0.01,Math.min(0.99,parseFloat(this.value)/100));markDirty();rC();rT();};
    var inpS50f=document.getElementById("sick50_fcvm");
    if(inpS50f)inpS50f.onchange=function(){SICK_50=parseInt(this.value)||1;markDirty();rC();rA();rT();};
    var inpS0f=document.getElementById("sick0_fcvm");
    if(inpS0f)inpS0f.onchange=function(){SICK_0=parseInt(this.value)||2;markDirty();rC();rA();rT();};
    // SAS matrix bindings (celle + soglie fasce + etichetta velocità) — condivisi col mensile
    var _svlF=document.getElementById("sasVelLabel");if(_svlF)_svlF.onchange=function(){SAS_MATRIX.velLabel=this.value;markDirty();};
    document.querySelectorAll(".sas-cell").forEach(function(inp){inp.onchange=function(){
      var r=parseInt(inp.getAttribute("data-sasr")),c=parseInt(inp.getAttribute("data-sasc")),v=parseFloat(inp.value);
      if(isNaN(v))return;SAS_MATRIX.grid[r][c]=Math.max(0,Math.min(1,v/100));markDirty();rC();rA();}});
    document.querySelectorAll(".sas-accband").forEach(function(inp){inp.onchange=function(){
      var i=parseInt(inp.getAttribute("data-i")),v=parseFloat(inp.value);
      if(isNaN(v))return;SAS_MATRIX.accBands[i]=v/100;markDirty();rC();rA();}});
    document.querySelectorAll(".sas-velband").forEach(function(inp){inp.onchange=function(){
      var i=parseInt(inp.getAttribute("data-i")),v=parseFloat(inp.value);
      if(isNaN(v))return;SAS_MATRIX.velBands[i]=v/100;markDirty();rC();rA();}});
    return;
  }
  // In seasonal mode, show only Periodo/Output + Seasonal Config
  if(PRIZE_MODE==="seasonal"){
    var h='<div style="font-size:12px;color:#6b6560;margin-bottom:14px"><b>Modifiche immediate.</b> Salva per esportare.</div>';
    h+='<div style="margin-bottom:16px"><button class="exp-btn primary" onclick="saveConfig()" style="margin-right:8px">&#128190; Salva Configurazione</button><label class="exp-btn" style="cursor:pointer;display:inline-block">&#128194; Carica Configurazione<input type="file" accept=".json" onchange="loadConfig(event)" style="display:none"></label></div>';
    // Periodo e Output (always needed)
    h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83d\udcc5 Periodo e Output</div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Stagione</span><span style="font-size:9px;color:#a09a92">Stagione di riferimento per lettere, export e PDF</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><select id="cfgSeason" class="cfg-input" style="width:130px;padding:4px 6px">';
    h+='<option value="SS"'+(CFG_SEASON==="SS"?" selected":"")+'>SS \u2014 Spring/Summer</option>';
    h+='<option value="FW"'+(CFG_SEASON==="FW"?" selected":"")+'>FW \u2014 Fall/Winter</option>';
    h+='</select></div></div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Anno</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="cfgYear" value="'+CFG_YEAR+'" min="2024" max="2030" step="1"></div></div>';
    h+='<div class="cfg-row" style="border-top:1px solid #e5e1db;padding-top:8px;margin-top:4px"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Percorso base PDF</span><span style="font-size:9px;color:#a09a92">I PDF verranno salvati in: percorso/'+getPdfSubfolder().prev+'/ e /'+getPdfSubfolder().cons+'/</span></div>';
    h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:260px" type="text" id="cfgPdfPath" value="'+esc(CFG_PDF_PATH)+'" placeholder="C:\\Boggi\\Incentivi\\"></div></div>';
    h+='<div style="font-size:10px;color:#a09a92;margin-top:6px">Stagione attiva: <b style="color:#4e4b48">'+getMonthYearLabel()+'</b> \u2014 Cartelle: <b style="color:#4e4b48">'+getPdfSubfolder().prev+'/ &nbsp;|&nbsp; '+getPdfSubfolder().cons+'/</b></div></div>';
  // === SEASONAL CONFIG SECTION ===
  h+='<div class="wg" style="margin-bottom:20px;margin-top:24px"><div class="wg-title">\ud83c\udfc6 Seasonal Bonus &mdash; Configurazione</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:12px">Parametri per il calcolo dell\u2019incentivo semestrale SM/VSM. La somma dei pesi KPI deve essere 100%.</div>';

  // Base %
  h+='<div style="font-size:11px;font-weight:700;color:#c9a96e;margin:8px 0 6px;text-transform:uppercase;letter-spacing:1px">Base</div>';
  h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">% Retrib. semestrale (base)</span><span style="font-size:9px;color:#a09a92">Default 20% &mdash; massimo raggiungibile 30%</span></div>';
  h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="seas_basePct" value="'+(SEAS_CFG.basePct*100).toFixed(1)+'" step="0.5" min="1" max="50"><span style="font-size:10px;color:#8a8680">%</span></div></div>';

  // KPI weights + thresholds
  h+='<div style="font-size:11px;font-weight:700;color:#5b6abf;margin:14px 0 6px;text-transform:uppercase;letter-spacing:1px">KPI &mdash; Pesi e Soglie</div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed"><colgroup><col style="width:40%"><col style="width:18%"><col style="width:28%"><col style="width:14%"></colgroup><thead><tr style="background:#f5f2ee">';
  h+='<th style="text-align:left;padding:6px 10px;font-weight:700;color:#6b6560">KPI</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Peso (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Soglia raggiungimento (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Peso attuale</th>';
  h+='</tr></thead><tbody>';
  var seasWeightSum=0;
  SEAS_CFG.kpi.forEach(function(kdef,ki){
    seasWeightSum+=kdef.weight;
    h+='<tr style="background:'+(ki%2?"#faf9f7":"#fff")+'">';
    h+='<td style="padding:6px 10px;font-weight:600">'+esc(kdef.label)+'</td>';
    h+='<td style="padding:4px 6px;text-align:center"><input class="cfg-input seas-kw" style="width:65px;text-align:center" type="number" data-ki="'+ki+'" data-kfield="weight" value="'+(kdef.weight*100).toFixed(1)+'" step="0.5" min="0" max="100"></td>';
    h+='<td style="padding:4px 6px;text-align:center"><input class="cfg-input seas-ks" style="width:65px;text-align:center" type="number" data-ki="'+ki+'" data-kfield="threshold" value="'+(kdef.threshold*100).toFixed(1)+'" step="0.5" min="0" max="100"></td>';
    h+='<td style="padding:6px 10px;text-align:center;font-weight:700;color:#5b6abf" id="seas_kw_disp_'+ki+'">'+(kdef.weight*100).toFixed(0)+'%</td>';
    h+='</tr>';
  });
  var wSumPct=Math.round(seasWeightSum*100);
  h+='<tr style="background:#f0ece8"><td style="padding:6px 10px;font-weight:700">TOTALE</td><td colspan="2"></td>';
  h+='<td style="padding:6px 10px;text-align:center;font-weight:800;color:'+(wSumPct===100?'#2d7a3a':'#c0392b')+'" id="seas_wsum">'+wSumPct+'%</td></tr>';
  h+='</tbody></table></div>';

  // KPI No SAS section
  h+='<div style="font-size:11px;font-weight:700;color:#5b6abf;margin:18px 0 6px;text-transform:uppercase;letter-spacing:1px">KPI &mdash; Pesi e Soglie NO SAS</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:6px">Configurazione alternativa per store con flag <b>No SAS</b> attivo. Il peso SAS viene ridistribuito tra gli altri KPI.</div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed"><colgroup><col style="width:40%"><col style="width:18%"><col style="width:28%"><col style="width:14%"></colgroup><thead><tr style="background:#f5f2ee">';
  h+='<th style="text-align:left;padding:6px 10px;font-weight:700;color:#6b6560">KPI</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Peso (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Soglia raggiungimento (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Peso attuale</th>';
  h+='</tr></thead><tbody>';
  var seasNsWeightSum=0;
  SEAS_CFG.kpi_nosas.forEach(function(kdef,ki){
    seasNsWeightSum+=kdef.weight;
    var isSas=kdef.k==="sas";
    h+='<tr style="background:'+(ki%2?'#faf9f7':'#fff')+';opacity:'+(isSas?'0.35':'1')+'">';
    h+='<td style="padding:6px 10px;font-weight:600">'+esc(kdef.label)+(isSas?' <span style="font-size:9px;color:#a09a92">(disattivato)</span>':'')+'</td>';
    h+='<td style="padding:4px 6px;text-align:center"><input class="cfg-input seas-kw-ns" style="width:65px;text-align:center" type="number" data-ki="'+ki+'" data-kfield="weight" value="'+(kdef.weight*100).toFixed(1)+'" step="0.5" min="0" max="100"'+(isSas?' disabled':'')+' ></td>';
    h+='<td style="padding:4px 6px;text-align:center"><input class="cfg-input seas-ks-ns" style="width:65px;text-align:center" type="number" data-ki="'+ki+'" data-kfield="threshold" value="'+(kdef.threshold*100).toFixed(1)+'" step="0.5" min="0" max="100"'+(isSas?' disabled':'')+' ></td>';
    h+='<td style="padding:6px 10px;text-align:center;font-weight:700;color:#5b6abf" id="seas_kw_disp_ns_'+ki+'">'+(kdef.weight*100).toFixed(0)+'%</td>';
    h+='</tr>';
  });
  var nsWSum=Math.round(seasNsWeightSum*100);
  h+='<tr style="background:#f0ece8"><td style="padding:6px 10px;font-weight:700">TOTALE</td><td colspan="2"></td>';
  h+='<td style="padding:6px 10px;text-align:center;font-weight:800;color:'+(nsWSum===100?'#2d7a3a':'#c0392b')+'" id="seas_wsum_ns">'+nsWSum+'%</td></tr>';
  h+='</tbody></table></div>';

  // KPI No Accuracy section
  h+='<div style="font-size:11px;font-weight:700;color:#5b6abf;margin:18px 0 6px;text-transform:uppercase;letter-spacing:1px">KPI &mdash; Pesi e Soglie NO ACCURACY</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:6px">Configurazione alternativa per store con flag <b>No Accuracy</b> attivo. Il peso Accuracy (disattivato) non viene ridistribuito automaticamente.</div>';
  h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed"><colgroup><col style="width:40%"><col style="width:18%"><col style="width:28%"><col style="width:14%"></colgroup><thead><tr style="background:#f5f2ee">';
  h+='<th style="text-align:left;padding:6px 10px;font-weight:700;color:#6b6560">KPI</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Peso (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Soglia raggiungimento (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Peso attuale</th>';
  h+='</tr></thead><tbody>';
  var seasNaWeightSum=0;
  SEAS_CFG.kpi_noacc.forEach(function(kdef,ki){
    seasNaWeightSum+=kdef.weight;
    var isAcc=kdef.k==="acc";
    h+='<tr style="background:'+(ki%2?'#faf9f7':'#fff')+';opacity:'+(isAcc?'0.35':'1')+'">';
    h+='<td style="padding:6px 10px;font-weight:600">'+esc(kdef.label)+(isAcc?' <span style="font-size:9px;color:#a09a92">(disattivato)</span>':'')+'</td>';
    h+='<td style="padding:4px 6px;text-align:center"><input class="cfg-input seas-kw-na" style="width:65px;text-align:center" type="number" data-ki="'+ki+'" data-kfield="weight" value="'+(kdef.weight*100).toFixed(1)+'" step="0.5" min="0" max="100"'+(isAcc?' disabled':'')+' ></td>';
    h+='<td style="padding:4px 6px;text-align:center"><input class="cfg-input seas-ks-na" style="width:65px;text-align:center" type="number" data-ki="'+ki+'" data-kfield="threshold" value="'+(kdef.threshold*100).toFixed(1)+'" step="0.5" min="0" max="100"'+(isAcc?' disabled':'')+' ></td>';
    h+='<td style="padding:6px 10px;text-align:center;font-weight:700;color:#5b6abf" id="seas_kw_disp_na_'+ki+'">'+(kdef.weight*100).toFixed(0)+'%</td>';
    h+='</tr>';
  });
  var naWSum=Math.round(seasNaWeightSum*100);
  h+='<tr style="background:#f0ece8"><td style="padding:6px 10px;font-weight:700">TOTALE</td><td colspan="2"></td>';
  h+='<td style="padding:6px 10px;text-align:center;font-weight:800;color:'+(naWSum===100?'#2d7a3a':'#c0392b')+'" id="seas_wsum_na">'+naWSum+'%</td></tr>';
  h+='</tbody></table></div>';

  // Molt Turnover table
  h+='<div style="font-size:11px;font-weight:700;color:#cf8b4e;margin:18px 0 6px;text-transform:uppercase;letter-spacing:1px">Molt. Turnover &mdash; scostamento fatturato (%)</div>';
  h+='<div style="font-size:9px;color:#a09a92;margin-bottom:6px">Scostamento = (Consuntivo &minus; Budget) / Budget &times; 100</div>';
  h+=_seasMoltTable('turnover', SEAS_CFG.molt_turnover);

  // Molt Inventario table
  h+='<div style="font-size:11px;font-weight:700;color:#5ba4cf;margin:18px 0 6px;text-transform:uppercase;letter-spacing:1px">Molt. Inventario &mdash; incidenza differenza negativa inventariale (%)</div>';
  h+='<div style="font-size:9px;color:#a09a92;margin-bottom:6px">Valore = Difference on Cogs dal file Inventory Monitor. Negativo = merce mancante. Positivo = eccedenza (&rarr; coeff 1).</div>';
  h+=_seasMoltTable('inventario', SEAS_CFG.molt_inventario);
  h+='</div>';


  // --- Close seasonal early-return path ---
  document.getElementById("p3").innerHTML=h;
  // Seasonal-only bindings
  var seasBase2=document.getElementById("seas_basePct");
  if(seasBase2)seasBase2.onchange=function(){SEAS_CFG.basePct=parseFloat(this.value)/100||0.2;markDirty();autoSave();rC();rA();};
  document.querySelectorAll(".seas-kw").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi[ki])return;
    SEAS_CFG.kpi[ki].weight=parseFloat(inp.value)/100||0;
    markDirty();autoSave();
    var sum=0;SEAS_CFG.kpi.forEach(function(k){sum+=k.weight;});
    var sp=Math.round(sum*100);
    var el=document.getElementById("seas_wsum");
    if(el){el.textContent=sp+"%";el.style.color=sp===100?"#2d7a3a":"#c0392b";}
    var disp=document.getElementById("seas_kw_disp_"+ki);
    if(disp)disp.textContent=(SEAS_CFG.kpi[ki].weight*100).toFixed(0)+"%";
    rC();rA();
  };});
  document.querySelectorAll(".seas-kw-ns").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi_nosas[ki])return;
    SEAS_CFG.kpi_nosas[ki].weight=parseFloat(inp.value)/100||0;
    markDirty();autoSave();
    var sum=0;SEAS_CFG.kpi_nosas.forEach(function(k){sum+=k.weight;});
    var sp=Math.round(sum*100);
    var el=document.getElementById("seas_wsum_ns");
    if(el){el.textContent=sp+"%";el.style.color=sp===100?"#2d7a3a":"#c0392b";}
    var disp=document.getElementById("seas_kw_disp_ns_"+ki);
    if(disp)disp.textContent=(SEAS_CFG.kpi_nosas[ki].weight*100).toFixed(0)+"%";
    rC();rA();
  };});
  document.querySelectorAll(".seas-ks").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi[ki])return;
    SEAS_CFG.kpi[ki].threshold=parseFloat(inp.value)/100||0.995;
    markDirty();autoSave();rC();rA();
  };});
  document.querySelectorAll(".seas-ks-ns").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi_nosas[ki])return;
    SEAS_CFG.kpi_nosas[ki].threshold=parseFloat(inp.value)/100||0.995;
    markDirty();autoSave();rC();rA();
  };});
  document.querySelectorAll(".seas-kw-na").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi_noacc[ki])return;
    SEAS_CFG.kpi_noacc[ki].weight=parseFloat(inp.value)/100||0;
    markDirty();autoSave();
    var sum=0;SEAS_CFG.kpi_noacc.forEach(function(k){sum+=k.weight;});
    var sp=Math.round(sum*100);
    var el=document.getElementById("seas_wsum_na");
    if(el){el.textContent=sp+"%";el.style.color=sp===100?"#2d7a3a":"#c0392b";}
    var disp=document.getElementById("seas_kw_disp_na_"+ki);
    if(disp)disp.textContent=(SEAS_CFG.kpi_noacc[ki].weight*100).toFixed(0)+"%";
    rC();rA();
  };});
  document.querySelectorAll(".seas-ks-na").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi_noacc[ki])return;
    SEAS_CFG.kpi_noacc[ki].threshold=parseFloat(inp.value)/100||0.995;
    markDirty();autoSave();rC();rA();
  };});
  document.querySelectorAll(".seas-molt-coeff").forEach(function(inp){inp.onchange=function(){
    var tbl=inp.getAttribute("data-tbl"),idx=parseInt(inp.getAttribute("data-idx"));
    var t=tbl==="turnover"?SEAS_CFG.molt_turnover:SEAS_CFG.molt_inventario;
    if(t[idx])t[idx].coeff=parseFloat(inp.value)||0;
    markDirty();autoSave();rC();
  };});
  document.querySelectorAll(".seas-molt-from,.seas-molt-to").forEach(function(inp){inp.onchange=function(){
    var tbl=inp.getAttribute("data-tbl"),idx=parseInt(inp.getAttribute("data-idx")),fld=inp.getAttribute("data-fld");
    var t=tbl==="turnover"?SEAS_CFG.molt_turnover:SEAS_CFG.molt_inventario;
    if(t[idx]){
      var v=parseFloat(inp.value);
      if(!isNaN(v)){
        // Per inventario: l'input è in % (es. -0.50), salviamo raw (/100 → -0.005)
        t[idx][fld]=(tbl==="inventario")?v/100:v;
      }
      t[idx].label=_seasRangeLabel(t[idx]);
    }
    markDirty();autoSave();
  };});
  var selSeas=document.getElementById("cfgSeason");if(selSeas)selSeas.onchange=function(){CFG_SEASON=this.value;markDirty();updateHeader();rC();rA();rT();};
  var selM2=document.getElementById("cfgMonth");if(selM2)selM2.onchange=function(){CFG_MONTH=parseInt(this.value);markDirty();updateHeader();rC();rA();rT();};
  var inpY2=document.getElementById("cfgYear");if(inpY2)inpY2.onchange=function(){CFG_YEAR=parseInt(this.value)||2026;markDirty();updateHeader();rT();};
  var inpP2=document.getElementById("cfgPdfPath");if(inpP2)inpP2.onchange=function(){CFG_PDF_PATH=this.value.trim();markDirty();rT();};
  return; // end seasonal early path
  }

  var h='<div style="font-size:12px;color:#6b6560;margin-bottom:14px"><b>Modifiche immediate.</b> Salva per esportare.</div>';
  h+='<div style="margin-bottom:16px"><button class="exp-btn primary" onclick="saveConfig()" style="margin-right:8px">&#128190; Salva Configurazione</button><label class="exp-btn" style="cursor:pointer;display:inline-block">&#128194; Carica Configurazione<input type="file" accept=".json" onchange="loadConfig(event)" style="display:none"></label></div>';
  // === PERIODO E PERCORSO PDF ===
  h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83d\udcc5 Periodo e Output</div>';
  h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Mese</span><span style="font-size:9px;color:#a09a92">Mese di riferimento per lettere, export e PDF</span></div>';
  h+='<div style="display:flex;align-items:center;gap:4px"><select id="cfgMonth" class="cfg-input" style="width:130px;padding:4px 6px">';
  for(var mi=1;mi<=12;mi++){h+='<option value="'+mi+'"'+(mi===CFG_MONTH?' selected':'')+'>'+mi+' - '+MONTH_NAMES.IT[mi]+'</option>'}
  h+='</select></div></div>';
  h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Anno</span></div>';
  h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" id="cfgYear" value="'+CFG_YEAR+'" min="2024" max="2030" step="1"></div></div>';
  h+='<div class="cfg-row" style="border-top:1px solid #e5e1db;padding-top:8px;margin-top:4px"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">Percorso base PDF</span><span style="font-size:9px;color:#a09a92">Es: C:\\Boggi\\Incentivi\\ \u2014 i PDF verranno salvati in: percorso/'+getPdfSubfolder().base+'/Preventivo/ e /Consuntivo/</span></div>';
  h+='<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:260px" type="text" id="cfgPdfPath" value="'+esc(CFG_PDF_PATH)+'" placeholder="C:\\Boggi\\Incentivi\\"></div></div>';
  h+='<div style="font-size:10px;color:#a09a92;margin-top:6px">Periodo attivo: <b style="color:#4e4b48">'+getMonthYearLabel()+'</b> \u2014 Cartella: <b style="color:#4e4b48">'+getPdfSubfolder().base+'/</b></div></div>';

  h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83d\udcca Parametri di Calcolo</div>';
  h+='<div style="font-size:11px;font-weight:700;color:#c9a96e;margin:8px 0 6px;text-transform:uppercase;letter-spacing:1px">Budget</div>';
  h+=pRow("bdg100","Soglia 100% Store","Soglia % fatturato negozio per riconoscere il premio BDG pieno",PARAMS.bdg100*100,"%",0.01)+pRow("kpi100","Soglia 100% KPI","Soglia per riconoscere raggiunto il target di SY, Privilege e QTY (es. 99,5% = accetta 99,5% del target)",PARAMS.kpi100*100,"%",0.01)+pRow("bdg60","Soglia ridotto","Paracadute: % minima fatturato per erogare il premio ridotto (store normali: richiede SY CY > SY LY; Dept Store: richiede QTY target raggiunto)",PARAMS.bdg60*100,"%",0.01)+pRow("bdg60mult","Molt. ridotto","Paracadute — % del massimale erogata: prima linea se SY CY > SY LY, Dept Store se target QTY raggiunto",PARAMS.bdg60mult*100,"%",0.01)+pRow("workgamePct","Workgame (% BDG)","Bonus manuale come % del premio BDG personale",(PARAMS.workgamePct||0)*100,"%",0.1);
  h+='<div style="font-size:11px;font-weight:700;color:#8b7ec8;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">Digital</div>';
  h+=pRow("digMinClassic","% min Digital Classico","Soglia digitale per store classici",PARAMS.digMinClassic*100,"%",0.01)+pRow("digMinMobility","% min Digital Mobilit\u00e0","Soglia digitale per store mobilit\u00e0",PARAMS.digMinMobility*100,"%",0.01)+pRow("digPct","Premio (% BDG)","",PARAMS.digPct*100,"%",0.01);
  // Sezione negozi mobilità con % target per-store
  var mobStores=Object.keys(STORE_FLAGS).filter(function(sid){return STORE_FLAGS[sid]&&STORE_FLAGS[sid].digType==="mobility";});
  if(mobStores.length>0){
    h+='<div style="margin-top:10px;border:1px solid #e5e1db;border-radius:6px;overflow:hidden">';
    h+='<div id="digMobHdr" style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#f5f2ee;cursor:pointer" onclick="toggleDigMob()">';
    h+='<span style="font-size:11px;font-weight:700;color:#8b7ec8">% Target Digital Mobilità per Negozio</span>';
    h+='<span id="digMobArr" style="color:#8b7ec8;font-size:12px">▾</span></div>';
    h+='<div id="digMobBody" style="display:block;padding:10px 14px">';
    h+=''; // aperto di default per visibilità immediata
    var MOB_STD=0.10;
    h+='<div style="font-size:10px;color:#8a8680;margin-bottom:10px">Soglia % digitale individuale per negozio. Se non impostata usa il valore globale Mobilit\u00e0 ('+fPct(PARAMS.digMinMobility)+').</div>';
    mobStores.sort().forEach(function(sid){
      var sf=STORE_FLAGS[sid];
      var storeName=function(){var n="";E.forEach(function(e){if(String(e.si)===sid&&e.s){n=e.s;}}); return n||("Store "+sid);}();
      var curVal=sf.digMinMob!=null?sf.digMinMob*100:null;
      var isStd=curVal!=null&&Math.abs(curVal-10)<0.01;
      h+='<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0ece8">';
      var cleanName=storeName.replace(new RegExp('^'+sid+'\\s*'),'').trim();
      h+='<div style="flex:1;font-size:11px;color:#4e4b48;font-weight:600">'+esc(sid)+' '+esc(cleanName)+'</div>';
      h+='<div style="display:flex;align-items:center;gap:6px">';
      h+='<input type="number" data-digmob="'+sid+'" value="'+(curVal!=null?curVal.toFixed(2):"")+'" placeholder="'+fPct(PARAMS.digMinMobility)+'" min="0" max="100" step="0.5" style="width:90px;padding:4px 8px;border:1px solid '+(curVal!=null?(isStd?'#8b7ec8':'#2d7a3a'):'#d5d0c8')+';border-radius:4px;font-size:11px;text-align:right;font-family:inherit;background:'+(curVal!=null?(isStd?'#f5f0ff':'#f0faf2'):'#fff')+'">';
      h+='<span style="font-size:11px;color:#6b6560">%</span>';
      h+='<button onclick="resetDigMob(\''+sid+'\')" style="font-size:10px;color:#cf5b5b;border:none;background:none;cursor:pointer;padding:2px 4px" title="Ripristina valore globale">\u2715</button>';
      h+='</div></div>';
    });
    h+='</div></div>';
  }
  h+='<div style="font-size:11px;font-weight:700;color:#5ba4cf;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">SY</div>';
  h+=pRow("syPct","% RLM","",PARAMS.syPct*100,"%",0.01);
  h+='<div style="font-size:11px;font-weight:700;color:#5bb98c;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">Privilege</div>';
  h+=pRow("privPct","% RLM","",PARAMS.privPct*100,"%",0.01);
  h+='<div style="font-size:11px;font-weight:700;color:#d4a94e;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">SAS</div>';
  if(sasNewActive()){
    // NUOVA logica (da Luglio 2026): matrice accettazione (verticale) \u00d7 velocit\u00e0 (orizzontale)
    h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">% del valore SAS del negozio riconosciuta nel fatturato verso il target BDG. Fino al 100% del target; l\'avanzo diventa riserva SAS riportata al mese dopo.</div>';
    h+='<div class="cfg-row"><span class="cfg-label">Etichetta velocit\u00e0</span><input class="cfg-input" id="sasVelLabel" type="text" value="'+esc(SAS_MATRIX.velLabel)+'" style="width:170px"></div>';
    var _ab=SAS_MATRIX.accBands,_vb=SAS_MATRIX.velBands;
    var _bandLbl=function(b,k){return k===0?'<'+Math.round(b[0]*100)+'%':(k===3?'\u2265'+Math.round(b[2]*100)+'%':Math.round(b[k-1]*100)+'-'+Math.round(b[k]*100)+'%');};
    h+='<div style="font-size:10px;font-weight:700;color:#6b6560;text-align:center;margin:12px 0 2px">VELOCIT\u00c0 (asse orizzontale) \u2014 '+esc(SAS_MATRIX.velLabel)+' \u2192</div>';
    h+='<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 8px"><thead><tr><th style="width:130px;font-size:9px;font-weight:700;color:#6b6560;padding:3px 8px;text-align:right;white-space:nowrap;vertical-align:bottom">% ACCETTAZIONE<br>(asse verticale) \u2193</th>';
    for(var _c=0;_c<4;_c++)h+='<th style="font-size:9px;font-weight:700;color:#8a8680;padding:3px 8px;text-align:center">'+_bandLbl(_vb,_c)+'</th>';
    h+='</tr></thead><tbody>';
    [3,2,1,0].forEach(function(_ai){
      h+='<tr><td style="font-size:9px;color:#6b6560;font-weight:700;padding:3px 8px;text-align:right;white-space:nowrap">'+_bandLbl(_ab,_ai)+'</td>';
      for(var _c2=0;_c2<4;_c2++)h+='<td style="padding:2px;text-align:center"><input class="cfg-input sas-cell" type="number" data-sasr="'+_ai+'" data-sasc="'+_c2+'" value="'+Math.round(SAS_MATRIX.grid[_ai][_c2]*100)+'" step="1" min="0" max="100" style="width:62px;text-align:center"></td>';
      h+='</tr>';
    });
    h+='</tbody></table>';
    h+='<div style="font-size:10px;color:#8a8680;margin:2px 0">Soglie fasce <b>accettazione</b> (%, bassa\u2192alta)</div><div style="display:flex;gap:6px;margin-bottom:6px">';
    for(var _i=0;_i<3;_i++)h+='<input class="cfg-input sas-accband" type="number" data-i="'+_i+'" value="'+Math.round(_ab[_i]*100)+'" step="1" min="0" max="100" style="width:56px;text-align:center">';
    h+='</div>';
    h+='<div style="font-size:10px;color:#8a8680;margin:2px 0">Soglie fasce <b>velocit\u00e0</b> (%, bassa\u2192alta)</div><div style="display:flex;gap:6px;margin-bottom:8px">';
    for(var _i2=0;_i2<3;_i2++)h+='<input class="cfg-input sas-velband" type="number" data-i="'+_i2+'" value="'+Math.round(_vb[_i2]*100)+'" step="1" min="0" max="100" style="width:56px;text-align:center">';
    h+='</div>';
  } else {
    // VECCHIA logica (fino a Giugno 2026): premio SAS individuale SCS
    h+='<div style="font-size:10px;color:#8a8680;margin-bottom:6px">Premio SAS individuale (SCS): \u20ac/SAS \u00d7 n. SAS on target, fino al massimale.</div>';
    h+=pRow("sasRate","\u20ac/SAS","",PARAMS.sasRate,"\u20ac",0.5)+pRow("sasMax","Max","",PARAMS.sasMax,"\u20ac",10);
  }
  h+='<div style="font-size:11px;font-weight:700;color:#cf5b5b;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">DCC</div>';
  h+=pRow("dccRate","Aliquota","",PARAMS.dccRate*100,"%",0.01)+pRow("dccMax","Max","",PARAMS.dccMax,"\u20ac",10);
  h+='<div style="font-size:11px;font-weight:700;color:#cf8b4e;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;justify-content:space-between">Articoli Incentivati<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:10px;font-weight:400;color:#6b6560;text-transform:none;letter-spacing:0"><input type="checkbox" id="artEnabled"'+(PARAMS.artEnabled?' checked':'')+' style="accent-color:#cf8b4e;width:14px;height:14px;cursor:pointer"> Attivo</label></div>';
  h+='<div id="artEnabledWrap"'+(PARAMS.artEnabled?'':' style="display:none"')+'>'+pRow("artPct","% BDG per categoria","Premio = % x BDG nominale x n. categorie raggiunte",PARAMS.artPct*100,"%",0.01)+'</div>';
  h+='<div style="font-size:11px;font-weight:700;color:#9b6ec9;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">QTY</div>';
  h+=pRow("qtyPct","% BDG","",PARAMS.qtyPct*100,"%",0.01)+"</div>";
  h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title">\ud83e\ude7a Malattia</div>';
  h+='<div class="cfg-row"><span class="cfg-label">Giorni per 50%</span><input class="cfg-input" type="number" id="sick50" value="'+SICK_50+'" min="1" max="30"></div>';
  h+='<div class="cfg-row"><span class="cfg-label">Giorni per 0%</span><input class="cfg-input" type="number" id="sick0" value="'+SICK_0+'" min="1" max="31"></div></div>';
  h+='<div class="wg" style="margin-bottom:20px"><div class="wg-title" style="display:flex;justify-content:space-between;align-items:center">\ud83d\udd00 KPI per Ruolo<button id="toggleKPI" style="font-size:9px;padding:3px 10px;border:1px solid #d5d0c8;border-radius:4px;background:#faf9f7;color:#6b6560;cursor:pointer">Mostra varianti \u25bc</button></div><div style="overflow-x:auto"><table><thead class="tg-h"><tr><th>RUOLO</th>';
  KP.forEach(function(k){if(k==="Visual")return;h+="<th>"+k+"</th>"});h+="</tr></thead><tbody>";
  var baseRoles=["SM","VSM","SSA","SSAP","SA","JSA","SCS"];
  RL.forEach(function(r,ri){
    var isBase=baseRoles.indexOf(r)>=0;
    h+='<tr class="tg-d'+(isBase?'':' kpi-variant')+'" style="background:'+(ri%2?"#faf9f7":"#fff")+';'+(isBase?'':'display:none')+'"><td'+(isBase?' style="font-weight:700"':' style="padding-left:18px;color:#6b6560"')+'>'+esc(r)+"</td>";
    KP.forEach(function(k){if(k==="Visual")return;
      var on=TC[r]?TC[r][k]:false,locked=false;
      // Da Luglio 2026: vecchio SAS ritirato (off per tutti), SCS prende SY. Speculare a isOn().
      if(sasNewActive()){
        if(k==="SAS"){on=false;locked=true;}
        else if(k==="SY"&&r.indexOf("SCS")>=0&&r.indexOf("NO SY")<0){on=true;locked=true;}
      }
      h+='<td><button class="tb '+(on?"x":"o")+'" data-r="'+esc(r)+'" data-k="'+k+'"'+(locked?' disabled title="Forzato da Luglio 2026 — SCS: SAS off, SY on" style="opacity:.55;cursor:not-allowed"':'')+'><span class="tk"></span></button></td>'});h+="</tr>"});
  h+="</tbody></table></div></div>";

  // === USA CONFIG section (hidden for Italia) ===
  if(REGION!=="italia"){
  h+='<div class="wg" style="margin-bottom:20px;margin-top:24px"><div class="wg-title">\ud83c\uddfa\ud83c\uddf8 Configurazione Premi USA</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:12px">Commission% individuale da anagrafica. Per ogni ruolo: toggle per scegliere sottostante (fatturato negozio o personale), % se target raggiunto e % se NON raggiunto. No esubero per negozi USA.</div>';
  var usaColors={"SM":"#c9a96e","SSAP":"#cf8b4e","VSM":"#8b7ec8","SSA":"#5ba4cf","SA":"#5bb98c","JSA":"#d4a94e","SCS":"#cf5b5b","STK":"#9b6ec9"};
  var usaRoleLabels={"SM":"Store Manager","VSM":"Vice Store Manager","SSA":"Senior Sales Advisor","SSAP":"Sr. Sales Advisor Plus","SA":"Sales Advisor","JSA":"Junior Sales Advisor","SCS":"Customer Service","STK":"Stock Associate / Runner"};
  Object.keys(USA_P).forEach(function(r){
    var rp=USA_P[r],col=usaColors[r]||"#8a8680";
    var ntPct=(rp.noTargetMult*100).toFixed(0),tPct=((rp.targetMult||1)*100).toFixed(0);
    var baseLabel=rp.useStore?"fatturato negozio":"vendite personali";
    h+='<div style="font-size:11px;font-weight:700;color:'+col+';margin:14px 0 6px;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;justify-content:space-between">'+(usaRoleLabels[r]||esc(r));
    // Toggle: ball LEFT (class o) = useStore=true (Fatt.Negozio), ball RIGHT (class x) = useStore=false (Fatt.Personale)
    h+='<span style="font-size:9px;font-weight:400;text-transform:none;letter-spacing:0;display:flex;align-items:center;gap:6px">';
    h+='<span style="color:'+(rp.useStore?"#2d7a3a":"#a09a92")+'">Fatt. Negozio</span>';
    h+='<button class="tb '+(rp.useStore?"o":"x")+'" data-ust="'+esc(r)+'" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button>';
    h+='<span style="color:'+(rp.useStore?"#a09a92":"#2d7a3a")+'">Fatt. Personale</span></span></div>';
    h+='<div style="font-size:9px;color:#a09a92;margin-bottom:4px">Sottostante attivo: <b style="color:#4e4b48">'+baseLabel+'</b> \u00d7 commission% individuale</div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">% se target raggiunto</span><span style="font-size:9px;color:#a09a92">Attualmente: '+tPct+'% della commission</span></div><div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" data-ur="'+esc(r)+'" data-uk="targetMult" value="'+tPct+'" step="1" min="0" max="200"><span style="font-size:10px;color:#8a8680">%</span></div></div>';
    h+='<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">% se target NON raggiunto</span><span style="font-size:9px;color:#a09a92">Attualmente: '+ntPct+'% della commission</span></div><div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" data-ur="'+esc(r)+'" data-uk="noTargetMult" value="'+ntPct+'" step="1" min="0" max="100"><span style="font-size:10px;color:#8a8680">%</span></div></div>';
  });
  h+='<div style="margin-top:12px;font-size:10px;color:#8a8680">Preventivo: si applica sempre la % con target raggiunto. La commission% individuale viene dall\u2019anagrafica.</div></div>';
  }// end USA config hide for Italia


  h+='<div class="wb"><div style="font-size:11px;font-weight:700;color:#856404;margin-bottom:4px">\u26a0</div><div style="font-size:11px;color:#856404;line-height:1.5">Le modifiche ai parametri e toggle si applicano immediatamente ai calcoli e alle lettere.</div></div>';

  document.getElementById("p3").innerHTML=h;
  document.getElementById("sick50").onchange=function(){SICK_50=parseInt(this.value)||1;markDirty();rC();rA();rT()};
  // KPI variants toggle
  var togKPI=document.getElementById("toggleKPI");if(togKPI)togKPI.onclick=function(){var rows=document.querySelectorAll(".kpi-variant");var show=rows.length>0&&rows[0].style.display==="none";rows.forEach(function(r){r.style.display=show?"":"none"});togKPI.textContent=show?"Nascondi varianti \u25b2":"Mostra varianti \u25bc"};
  document.getElementById("sick0").onchange=function(){SICK_0=parseInt(this.value)||2;markDirty();rC();rA();rT()};
  // Binding % digital mobilità per-store
  document.querySelectorAll("input[data-digmob]").forEach(function(inp){
    inp.onchange=function(){
      var sid=inp.getAttribute("data-digmob");
      var v=parseFloat(inp.value);
      if(!STORE_FLAGS[sid])STORE_FLAGS[sid]={digType:"mobility"};
      if(!isNaN(v)&&v>0){
        STORE_FLAGS[sid].digMinMob=Math.round(v*100)/10000;
        inp.style.borderColor="#2d7a3a";
      } else {
        delete STORE_FLAGS[sid].digMinMob;
        inp.style.borderColor="#d5d0c8";
      }
      markDirty();autoSave();rC();rA();rL();
    };
  });

  document.querySelectorAll("input[data-pk]").forEach(function(inp){inp.onchange=function(){
    var pk=inp.getAttribute("data-pk"),v=parseFloat(inp.value);if(isNaN(v))return;
    if(["bdg100","kpi100","bdg60","bdg60mult","digMinClassic","digMinMobility","digPct","syPct","privPct","dccRate","qtyPct","workgamePct"].indexOf(pk)>=0)v=v/100;
    PARAMS[pk]=v;markDirty();rC();rA()}});
  // SAS matrix bindings (celle + soglie fasce + etichetta velocità)
  var _svl=document.getElementById("sasVelLabel");if(_svl)_svl.onchange=function(){SAS_MATRIX.velLabel=this.value;markDirty();};
  document.querySelectorAll(".sas-cell").forEach(function(inp){inp.onchange=function(){
    var r=parseInt(inp.getAttribute("data-sasr")),c=parseInt(inp.getAttribute("data-sasc")),v=parseFloat(inp.value);
    if(isNaN(v))return;SAS_MATRIX.grid[r][c]=Math.max(0,Math.min(1,v/100));markDirty();rC();rA();}});
  document.querySelectorAll(".sas-accband").forEach(function(inp){inp.onchange=function(){
    var i=parseInt(inp.getAttribute("data-i")),v=parseFloat(inp.value);
    if(isNaN(v))return;SAS_MATRIX.accBands[i]=v/100;markDirty();rC();rA();}});
  document.querySelectorAll(".sas-velband").forEach(function(inp){inp.onchange=function(){
    var i=parseInt(inp.getAttribute("data-i")),v=parseFloat(inp.value);
    if(isNaN(v))return;SAS_MATRIX.velBands[i]=v/100;markDirty();rC();rA();}});
  var artEnabledCb=document.getElementById("artEnabled");if(artEnabledCb)artEnabledCb.onchange=function(){PARAMS.artEnabled=this.checked;var wrap=document.getElementById("artEnabledWrap");if(wrap)wrap.style.display=this.checked?"":"none";markDirty();rC();rA()};
  document.querySelectorAll(".tb").forEach(function(b){
    if(b.getAttribute("data-r")){b.onclick=function(){var r=b.getAttribute("data-r"),k=b.getAttribute("data-k");if(!TC[r]){TC[r]={};KP.forEach(function(kk){TC[r][kk]=false})}TC[r][k]=!TC[r][k];markDirty();rC();rA();rT()}}
    if(b.getAttribute("data-ust")){b.onclick=function(){var r=b.getAttribute("data-ust");USA_P[r].useStore=!USA_P[r].useStore;markDirty();rC();rA();rT()}}
  });
  document.querySelectorAll("input[data-ur]").forEach(function(inp){inp.onchange=function(){
    var r=inp.getAttribute("data-ur"),k=inp.getAttribute("data-uk"),v=parseFloat(inp.value);
    if(isNaN(v))return;
    if(k==="noTargetMult")USA_P[r].noTargetMult=v/100;
    if(k==="targetMult")USA_P[r].targetMult=v/100;
    markDirty();rC();rA();rT()}});
  // Period & PDF path bindings
  var selM=document.getElementById("cfgMonth");if(selM)selM.onchange=function(){CFG_MONTH=parseInt(this.value);markDirty();updateHeader();rC();rA();rT()};
  var inpY=document.getElementById("cfgYear");if(inpY)inpY.onchange=function(){CFG_YEAR=parseInt(this.value)||2026;markDirty();updateHeader();rT()};
  var inpP=document.getElementById("cfgPdfPath");if(inpP)inpP.onchange=function(){CFG_PDF_PATH=this.value.trim();markDirty();rT();};
  // Seasonal config bindings
  var seasBase=document.getElementById("seas_basePct");
  if(seasBase)seasBase.onchange=function(){SEAS_CFG.basePct=parseFloat(this.value)/100||0.2;markDirty();autoSave();rC();rA();};
  document.querySelectorAll(".seas-kw").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi[ki])return;
    SEAS_CFG.kpi[ki].weight=parseFloat(inp.value)/100||0;
    markDirty();autoSave();
    // Update sum display
    var sum=0;SEAS_CFG.kpi.forEach(function(k){sum+=k.weight;});
    var sp=Math.round(sum*100);
    var el=document.getElementById("seas_wsum");
    if(el){el.textContent=sp+"%";el.style.color=sp===100?"#2d7a3a":"#c0392b";}
    var disp=document.getElementById("seas_kw_disp_"+ki);
    if(disp)disp.textContent=(SEAS_CFG.kpi[ki].weight*100).toFixed(0)+"%";
    rC();rA();
  };});
  document.querySelectorAll(".seas-ks").forEach(function(inp){inp.onchange=function(){
    var ki=parseInt(inp.getAttribute("data-ki"));
    if(!SEAS_CFG.kpi[ki])return;
    SEAS_CFG.kpi[ki].threshold=parseFloat(inp.value)/100||0.995;
    markDirty();autoSave();rC();rA();
  };});
  // Molt table cell bindings
  document.querySelectorAll(".seas-molt-coeff").forEach(function(inp){inp.onchange=function(){
    var tbl=inp.getAttribute("data-tbl"),idx=parseInt(inp.getAttribute("data-idx"));
    var t=tbl==="turnover"?SEAS_CFG.molt_turnover:SEAS_CFG.molt_inventario;
    if(t[idx])t[idx].coeff=parseFloat(inp.value)||0;
    markDirty();autoSave();rC();
  };});
}catch(ex){console.error("rT error:",ex);document.getElementById("p3").innerHTML='<div style="padding:20px;color:#cf5b5b">Errore rendering Configurazione: '+ex.message+'</div>'}}
function _seasMoltTable(tblKey, rows){
  // Per inventario: valori interni raw (es. -0.005), input mostra/salva in % (×100 = -0.50%)
  // Stessa grafica del turnover — celle editabili per from, to e coeff.
  var isInv=(tblKey==="inventario");
  var h='<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:11px;min-width:440px"><thead><tr style="background:#f5f2ee">';
  h+='<th style="text-align:center;padding:6px 8px;font-weight:700;color:#6b6560">Da (%)</th>';
  h+='<th style="text-align:center;padding:6px 8px;font-weight:700;color:#6b6560">A (%)</th>';
  h+='<th style="text-align:center;padding:6px 10px;font-weight:700;color:#6b6560">Coefficiente</th>';
  h+='</tr></thead><tbody>';
  rows.forEach(function(r,idx){
    var isInfLow=(r.from==null||r.from<=-9999||r.from===-Infinity);
    var isInfHi=(r.to==null||r.to>=9999||r.to===Infinity);
    h+='<tr style="background:'+(idx%2?'#faf9f7':'#fff')+'">';
    // From cell
    if(isInfLow){
      h+='<td style="padding:4px 8px;text-align:center;color:#a09a92;font-style:italic">&minus;&infin;</td>';
    }else{
      // Inventario: converti raw→% per il display nell'input (es. -0.005 → -0.50)
      var fVal=isInv?Math.round(r.from*10000)/100:r.from;
      h+='<td style="padding:3px 6px;text-align:center"><input class="cfg-input seas-molt-from" style="width:68px;text-align:center" type="number" data-tbl="'+tblKey+'" data-idx="'+idx+'" data-fld="from" value="'+fVal+'" step="'+(isInv?'0.01':'0.1')+'"></td>';
    }
    // To cell
    if(isInfHi){
      h+='<td style="padding:4px 8px;text-align:center;color:#a09a92;font-style:italic">+&infin;</td>';
    }else{
      var tVal=isInv?Math.round(r.to*10000)/100:r.to;
      h+='<td style="padding:3px 6px;text-align:center"><input class="cfg-input seas-molt-to" style="width:68px;text-align:center" type="number" data-tbl="'+tblKey+'" data-idx="'+idx+'" data-fld="to" value="'+tVal+'" step="'+(isInv?'0.01':'0.1')+'"></td>';
    }
    h+='<td style="padding:4px 10px;text-align:center"><input class="cfg-input seas-molt-coeff" style="width:65px;text-align:center;font-weight:700;color:'+(r.coeff===0?'#c0392b':r.coeff>=1.3?'#2d7a3a':'#2c2925')+'" type="number" data-tbl="'+tblKey+'" data-idx="'+idx+'" value="'+r.coeff+'" step="0.05" min="0" max="3"></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
}

// === rCSeasMid: Calcolo Premi Mid-Season ===
/*BUNDLE_INSERT:91-render-seasonal*/
function seasLiveUpdate(m){
  // Not called by editable inputs anymore (removed in consuntivo auto mode).
  // Kept for potential future use — simply re-renders the seasonal tab.
  rCSeasonal();
}

function pRow(pk,l,d,dv,u,step){return'<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">'+esc(l)+"</span>"+(d?'<span style="font-size:9px;color:#a09a92">'+esc(d)+"</span>":"")+"</div>"+'<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" data-pk="'+pk+'" value="'+dv+'" step="'+(step||1)+'" min="0"><span style="font-size:10px;color:#8a8680">'+u+"</span></div></div>"}
function usaRow(role,key,l,d,dv,u,step){return'<div class="cfg-row"><div style="flex:1"><span class="cfg-label" style="width:auto;display:block">'+esc(l)+"</span>"+(d?'<span style="font-size:9px;color:#a09a92">'+esc(d)+"</span>":"")+"</div>"+'<div style="display:flex;align-items:center;gap:4px"><input class="cfg-input" style="width:75px" type="number" data-ur="'+esc(role)+'" data-uk="'+key+'" value="'+dv+'" step="'+(step||1)+'" min="0"><span style="font-size:10px;color:#8a8680">'+u+"</span></div></div>"}
// Defer per evitare race con funzioni definite in <script> successivi (vedi nota in 93-render-analisi).
try{ rT(); }catch(_e){ try{setTimeout(rT,0)}catch(_e2){} }
try{ updateHeader(); }catch(_e){ try{setTimeout(updateHeader,0)}catch(_e2){} }
