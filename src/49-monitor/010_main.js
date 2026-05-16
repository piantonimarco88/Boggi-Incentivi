function saveMonitorSnap(){
  if(MODE!=="consuntivo"){alert("Il Monitor salva solo dati consuntivo.");return;}
  var snap;
  if(PRIZE_MODE==="mensile")snap=_buildMensileSnap();
  else if(PRIZE_MODE==="fcvm")snap=_buildFcvmSnap();
  else if(PRIZE_MODE==="seasonal")snap=_buildSeasonalSnap();
  else{alert("Modalità non supportata.");return;}
  if(!snap||!snap.employees.length){alert("Nessun dipendente da salvare.");return;}
  var existIdx=-1;
  for(var i=0;i<MONITOR_SNAPS.length;i++){
    var s=MONITOR_SNAPS[i];
    if(s.type===snap.type&&s.year===snap.year&&s.month===snap.month&&(snap.type!=="seasonal"||s.season===snap.season)){existIdx=i;break;}
  }
  if(existIdx>=0){
    if(!confirm("Esiste già uno snapshot «"+MONITOR_SNAPS[existIdx].label+"». Sovrascrivere?"))return;
    MONITOR_SNAPS.splice(existIdx,1,snap);
  }else{
    MONITOR_SNAPS.push(snap);
  }
  autoSave();
  alert("Snapshot salvato: "+snap.label+" ("+snap.employees.length+" dipendenti)");
  rA();
}

function _buildMensileSnap(){
  var oldMode=MODE;
  var employees=[];
  E.forEach(function(e){
    if(e.ps==="SI")return;
    var ex=e.ex||1,sm=sickMult(e.ml);
    var vi,rd,rp,rs,ra,rsa,rdc;
    if(isUSA(e.si,e)){
      // USA: single aggregate prize (no individual KPI breakdown)
      vi=calcUSA(e)+aggTotal(e.m);
      rd=0;rp=0;rs=0;ra=0;rsa=0;rdc=0;
    }else{
      vi=isOn(e.j,"vi")?(getVal(e,"vi")||0)*sm:0;
      rd=isOn(e.j,"rd")?getVal(e,"rd")*sm:0;
      rp=isOn(e.j,"rp")?getVal(e,"rp")*sm:0;
      rs=isOn(e.j,"rs")?getVal(e,"rs")*sm:0;
      ra=PARAMS.artEnabled&&isOn(e.j,"ra")?getVal(e,"ra")*sm:0;
      rsa=isOn(e.j,"rsa")?getVal(e,"rsa")*sm:0;
      rdc=isOn(e.j,"rdc")?getVal(e,"rdc")*sm:0;
      var ag=AGG[e.m]||{};
      vi+=(ag.vi||0);rd+=(ag.rd||0);rp+=(ag.rp||0);rs+=(ag.rs||0);
      ra+=(ag.ra||0);rsa+=(ag.rsa||0);rdc+=(ag.rdc||0);
    }
    MODE="preventivo";
    var mass=Math.round(calcE(e)*ex*100)/100;
    MODE=oldMode;
    employees.push({
      matricola:e.m,cognome:e.c||"",nome:e.n||"",ente:e.en||210,
      store_id:String(e.si||""),store_name:e.s||"",job:e.j||"",
      gross_salary_eur:Math.round((e.rl||0)*ex*100)/100,
      massimale_eur:mass,fcvm_massimale_eur:0,
      vi_eur:Math.round(vi*ex*100)/100,rd_eur:Math.round(rd*ex*100)/100,
      rp_eur:Math.round(rp*ex*100)/100,rs_eur:Math.round(rs*ex*100)/100,
      ra_eur:Math.round(ra*ex*100)/100,rsa_eur:Math.round(rsa*ex*100)/100,
      rdc_eur:Math.round(rdc*ex*100)/100,fcvm_actual_eur:0,seasonal_eur:0
    });
  });
  MODE=oldMode;
  return{id:"snap_m_"+CFG_YEAR+"_"+CFG_MONTH+"_"+Date.now(),type:"mensile",
    year:CFG_YEAR,month:CFG_MONTH,season:null,
    created_at:new Date().toISOString(),
    label:"Mensile – "+_MMONTHS[CFG_MONTH]+" "+CFG_YEAR,
    employees:employees};
}

function _buildFcvmSnap(){
  var pool=getFcVmPool();
  if(!pool.length)return null;
  // Pre-build store→ente lookup from main anagrafica
  var storeEnteMap={};
  E.forEach(function(e){if(e.si&&e.en)storeEnteMap[String(e.si)]=e.en;});
  var employees=[];
  pool.forEach(function(emp){
    var matr=emp.m||"";
    var res=calcFcVmPremio(matr);
    // Usa sempre il tasso da ENTE_CU/sistema (più affidabile dell'import); fallback a emp.ex
    var exRate=getFcVmExRate(emp.cu);
    if(exRate===1&&emp.cu&&emp.cu!=='EUR'&&emp.ex&&emp.ex>0)exRate=emp.ex;
    // Determine ente/store: look up managed stores, check if any belongs to ente 210 (Italia)
    var isItalia=false;
    Object.keys(FC_MAP).forEach(function(sid){
      if(isItalia)return;
      var mp=FC_MAP[sid];
      var fcArr=Array.isArray(mp.fc)?mp.fc:(mp.fc?[mp.fc]:[]);
      var vmArr=Array.isArray(mp.vm)?mp.vm:(mp.vm?[mp.vm]:[]);
      if(fcArr.indexOf(matr)>=0||vmArr.indexOf(matr)>=0){
        if(storeEnteMap[sid]==210)isItalia=true;
      }
    });
    if(!isItalia&&emp.bdg_stores&&emp.bdg_stores.length){
      emp.bdg_stores.forEach(function(b){if(storeEnteMap[String(b.sid)]==210)isItalia=true;});
    }
    var enteVal=isItalia?210:209;
    var storeVal=isItalia?"9003":"9600";
    employees.push({
      matricola:matr,cognome:emp.c||"",nome:emp.n||"",ente:enteVal,
      store_id:storeVal,store_name:isItalia?"FC+VM ITALIA":"FC+VM INTERNATIONAL",job:emp.j||"",
      gross_salary_eur:0,
      massimale_eur:0,fcvm_massimale_eur:Math.round((emp.ib||0)*exRate*100)/100,
      vi_eur:0,rd_eur:0,rp_eur:0,rs_eur:0,ra_eur:0,rsa_eur:0,rdc_eur:0,
      fcvm_actual_eur:Math.round((res.totalPremioLC||0)*exRate*100)/100,seasonal_eur:0
    });
  });
  return{id:"snap_f_"+CFG_YEAR+"_"+CFG_MONTH+"_"+Date.now(),type:"fcvm",
    year:CFG_YEAR,month:CFG_MONTH,season:null,
    created_at:new Date().toISOString(),
    label:"FC+VM – "+_MMONTHS[CFG_MONTH]+" "+CFG_YEAR,
    employees:employees};
}

function _buildSeasonalSnap(){
  var smvsm=E.filter(function(e){return isSMVSM(e);});
  if(!smvsm.length)return null;
  var employees=[];
  smvsm.forEach(function(e){
    if(e.ps==="SI")return;
    var ex=e.ex||1;
    var seas=calcSeasonal(e);
    employees.push({
      matricola:e.m,cognome:e.c||"",nome:e.n||"",ente:e.en||210,
      store_id:String(e.si||""),store_name:e.s||"",job:e.j||"",
      gross_salary_eur:Math.round((e.rl||0)*ex*100)/100,
      massimale_eur:0,fcvm_massimale_eur:0,
      vi_eur:0,rd_eur:0,rp_eur:0,rs_eur:0,ra_eur:0,rsa_eur:0,rdc_eur:0,
      fcvm_actual_eur:0,seasonal_eur:Math.round(seas*ex*100)/100
    });
  });
  return{id:"snap_s_"+CFG_YEAR+"_"+CFG_SEASON+"_"+Date.now(),type:"seasonal",
    year:CFG_YEAR,month:CFG_MONTH,season:CFG_SEASON,
    created_at:new Date().toISOString(),
    label:"Seasonal – "+CFG_SEASON+" "+CFG_YEAR+" (erog. "+_MMONTHS[CFG_MONTH]+")",
    employees:employees};
}

function deleteMonitorSnap(id){
  if(!confirm("Eliminare questo snapshot?"))return;
  MONITOR_SNAPS=MONITOR_SNAPS.filter(function(s){return s.id!==id;});
  autoSave();rA();
}

function _mSum(rows,f){return rows.reduce(function(a,r){return a+(r[f]||0);},0);}
function _r2(v){return Math.round((v||0)*100)/100;}

function _mBuildEnteRow(rows,year,month,ente){
  var D=_mSum(rows,'gross_salary_eur'),vi=_mSum(rows,'vi_eur'),rd=_mSum(rows,'rd_eur');
  var rp=_mSum(rows,'rp_eur'),rs=_mSum(rows,'rs_eur'),ra=_mSum(rows,'ra_eur');
  var rsa=_mSum(rows,'rsa_eur'),rdc=_mSum(rows,'rdc_eur');
  var fcvm=_mSum(rows,'fcvm_actual_eur'),seas=_mSum(rows,'seasonal_eur');
  var Ev=Math.round(vi+rd+rp+rs+ra+rsa+rdc+fcvm+seas);
  var G=_mSum(rows,'massimale_eur'),H=_mSum(rows,'fcvm_massimale_eur');
  return[year,month,ente,Math.round(D),Ev,D>0?Ev/D:0,Math.round(G),Math.round(H),0,Math.round(vi),0,Math.round(rd),Math.round(rp),0,0,Math.round(rs),Math.round(ra),0,0,Math.round(rsa),Math.round(rdc),0,0,Math.round(seas)];
}

function _mBuildStoreRow(rows,year,month,ente,sid,sname){
  var D=_mSum(rows,'gross_salary_eur'),vi=_mSum(rows,'vi_eur'),rd=_mSum(rows,'rd_eur');
  var rp=_mSum(rows,'rp_eur'),rs=_mSum(rows,'rs_eur'),ra=_mSum(rows,'ra_eur');
  var rsa=_mSum(rows,'rsa_eur'),rdc=_mSum(rows,'rdc_eur');
  var fcvm=_mSum(rows,'fcvm_actual_eur'),seas=_mSum(rows,'seasonal_eur');
  var Ev=Math.round(vi+rd+rp+rs+ra+rsa+rdc+fcvm+seas);
  var G=_mSum(rows,'massimale_eur'),H=_mSum(rows,'fcvm_massimale_eur');
  return[year,month,ente,sid,sname||"",Math.round(D),Ev,D>0?Ev/D:0,Math.round(G),Math.round(H),0,Math.round(vi),0,Math.round(rd),Math.round(rp),0,0,Math.round(rs),Math.round(ra),0,0,Math.round(rsa),Math.round(rdc),0,0,Math.round(seas)];
}

function _mBuildMatRow(r){
  var Ev=Math.round((r.vi_eur||0)+(r.rd_eur||0)+(r.rp_eur||0)+(r.rs_eur||0)+(r.ra_eur||0)+(r.rsa_eur||0)+(r.rdc_eur||0)+(r.fcvm_actual_eur||0)+(r.seasonal_eur||0));
  var D=r.gross_salary_eur||0;
  return[r.year,r.month,r.ente,r.store_id,r.store_name||"",r.matricola,r.cognome,r.nome,r.job,
    Math.round(D),Ev,D>0?Ev/D:0,Math.round(r.massimale_eur),Math.round(r.fcvm_massimale_eur||0),
    0,Math.round(r.vi_eur),0,Math.round(r.rd_eur),Math.round(r.rp_eur),0,0,Math.round(r.rs_eur),Math.round(r.ra_eur),0,0,Math.round(r.rsa_eur),Math.round(r.rdc_eur),0,0,Math.round(r.seasonal_eur)];
}

function exportMonitorExcel(){
  var selectedIds=[];
  document.querySelectorAll('.mon-snap-cb:checked').forEach(function(cb){selectedIds.push(cb.dataset.sid);});
  if(!selectedIds.length){alert("Seleziona almeno uno snapshot.");return;}
  var snaps=MONITOR_SNAPS.filter(function(s){return selectedIds.indexOf(s.id)>=0;});
  var allRows=[];
  snaps.forEach(function(snap){
    snap.employees.forEach(function(emp){
      var row=Object.assign({},emp);row.year=snap.year;row.month=snap.month;
      row._snapType=snap.type; // tag per filtro region: FC+VM non viene filtrato per ente
      allRows.push(row);
    });
  });
  var yr=CFG_YEAR;
  if(REGION==="italia"){
    allRows=allRows.filter(function(r){return r._snapType==="fcvm"||r.ente==210;});
  }else{
    allRows=allRows.filter(function(r){return r._snapType==="fcvm"||r.ente!=210;});
  }
  var baseHdrs=["Year","Mese","Ente",
    "Gross Salary "+yr,"Total Incentive Cost "+yr,"Weight On Gross Salary % "+yr,
    "Fcst Incentive TOT "+yr,"Fcst Incentive FC & VM "+yr,
    "Boost Incentive "+yr,"VisualInStore Incentive "+yr,"Boost Fc Incentive "+yr,
    "Digital Incentive "+yr,"New Privilege Incentive (Target) "+yr,
    "New Privilege Incentive Boost (1) "+yr,"New Privilege Incentive Boost (2) "+yr,
    "Shopper Yield Incentive "+yr,"Item Incentive "+yr,"Live Connect Incentive "+yr,
    "MTM Incentive "+yr,"Sas Incentive "+yr,"Dcc Incentive "+yr,
    "Customer Incentive "+yr,"Top sales advisor Incentive "+yr,"Seasonal Incentive "+yr];
  var storeHdrs=baseHdrs.slice(0,3).concat(["Store ID","Store Name"]).concat(baseHdrs.slice(3));
  var matHdrs=baseHdrs.slice(0,3).concat(["Store ID","Store Name","Matricola","Cognome","Nome","Job"]).concat(baseHdrs.slice(3));

  var enteMap={};
  allRows.forEach(function(r){
    var k=r.year+"_"+r.month+"_"+r.ente;
    if(!enteMap[k])enteMap[k]={year:r.year,month:r.month,ente:r.ente,rows:[]};
    enteMap[k].rows.push(r);
  });
  var ws1data=[baseHdrs];
  Object.values(enteMap).sort(function(a,b){return a.year!==b.year?a.year-b.year:a.month!==b.month?a.month-b.month:String(a.ente).localeCompare(String(b.ente));}).forEach(function(g){
    ws1data.push(_mBuildEnteRow(g.rows,g.year,g.month,g.ente));
  });

  var storeMap={};
  allRows.forEach(function(r){
    var sid=r.store_id||"(FC+VM)";
    var k=r.year+"_"+r.month+"_"+r.ente+"_"+sid;
    if(!storeMap[k])storeMap[k]={year:r.year,month:r.month,ente:r.ente,store_id:sid,store_name:r.store_name||"",rows:[]};
    storeMap[k].rows.push(r);
  });
  var ws2data=[storeHdrs];
  Object.values(storeMap).sort(function(a,b){return a.year!==b.year?a.year-b.year:a.month!==b.month?a.month-b.month:String(a.ente)!==String(b.ente)?String(a.ente).localeCompare(String(b.ente)):String(a.store_id).localeCompare(String(b.store_id));}).forEach(function(g){
    ws2data.push(_mBuildStoreRow(g.rows,g.year,g.month,g.ente,g.store_id,g.store_name));
  });

  var ws3data=[matHdrs];
  allRows.sort(function(a,b){
    if(a.year!==b.year)return a.year-b.year;
    if(a.month!==b.month)return a.month-b.month;
    var ea=String(a.ente),eb=String(b.ente);if(ea!==eb)return ea.localeCompare(eb);
    var sa=String(a.store_id||""),sb=String(b.store_id||"");if(sa!==sb)return sa.localeCompare(sb);
    return String(a.matricola||"").localeCompare(String(b.matricola||""));
  }).forEach(function(r){ws3data.push(_mBuildMatRow(r));});

  var wb=XLSX.utils.book_new();
  var ws1=XLSX.utils.aoa_to_sheet(ws1data);
  var ws2=XLSX.utils.aoa_to_sheet(ws2data);
  var ws3=XLSX.utils.aoa_to_sheet(ws3data);
  // Apply percentage format (0.00%) to Weight column in each sheet
  // ws1: Weight at col index 5 (F); ws2: col 7 (H); ws3: col 11 (L)
  (function applyPctFmt(ws,col){
    var ref=ws['!ref'];if(!ref)return;
    var range=XLSX.utils.decode_range(ref);
    for(var r=range.s.r+1;r<=range.e.r;r++){
      var a=XLSX.utils.encode_cell({r:r,c:col});
      if(ws[a])ws[a].z='0.00%';
    }
  })(ws1,5);
  (function applyPctFmt(ws,col){
    var ref=ws['!ref'];if(!ref)return;
    var range=XLSX.utils.decode_range(ref);
    for(var r=range.s.r+1;r<=range.e.r;r++){
      var a=XLSX.utils.encode_cell({r:r,c:col});
      if(ws[a])ws[a].z='0.00%';
    }
  })(ws2,7);
  (function applyPctFmt(ws,col){
    var ref=ws['!ref'];if(!ref)return;
    var range=XLSX.utils.decode_range(ref);
    for(var r=range.s.r+1;r<=range.e.r;r++){
      var a=XLSX.utils.encode_cell({r:r,c:col});
      if(ws[a])ws[a].z='0.00%';
    }
  })(ws3,11);
  ws1['!cols']=[{wch:6},{wch:6},{wch:8},{wch:14},{wch:22},{wch:22},{wch:22},{wch:22}];
  ws2['!cols']=[{wch:6},{wch:6},{wch:8},{wch:10},{wch:22},{wch:14},{wch:22},{wch:22}];
  ws3['!cols']=[{wch:6},{wch:6},{wch:8},{wch:10},{wch:22},{wch:12},{wch:14},{wch:14},{wch:8},{wch:14},{wch:22}];
  XLSX.utils.book_append_sheet(wb,ws1,"Per Ente");
  XLSX.utils.book_append_sheet(wb,ws2,"Per Store");
  XLSX.utils.book_append_sheet(wb,ws3,"Per Matricola");
  XLSX.writeFile(wb,"IncentiveMonitor_"+CFG_YEAR+".xlsx");
}

function renderMonitorSection(){
  var typeBadge={
    mensile:'<span style="background:#e8f4fd;color:#1a6da3;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700">MENSILE</span>',
    fcvm:'<span style="background:#fdf0e8;color:#a34f1a;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700">FC+VM</span>',
    seasonal:'<span style="background:#e8f5e9;color:#2d7a3a;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700">SEASONAL</span>'
  };
  var h='<div class="wg" style="margin-top:16px;border-top:2px solid #c9a96e;padding-top:16px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h+='<div style="font-size:15px;font-weight:700;color:#2c2925">&#128200; Incentive Monitor</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="exp-btn" onclick="document.querySelectorAll(\'.mon-snap-cb\').forEach(function(c){c.checked=true;});exportMonitorExcel();" style="font-size:10px;padding:4px 14px;border-color:#c9a96e;color:#c9a96e">&#9776; Seleziona tutto ed esporta</button>';
  h+='<button class="exp-btn" onclick="exportMonitorExcel()" style="font-size:10px;padding:4px 14px;border-color:#2d7a3a;color:#2d7a3a">&#9989; Genera Excel selezionati</button>';
  h+='</div></div>';
  if(!MONITOR_SNAPS.length){
    h+='<div style="text-align:center;padding:20px;color:#a09a92;font-size:12px">Nessuno snapshot salvato. Usa il pulsante <b>Salva per Monitor</b> nella scheda Calcolo Premi per salvare i dati di ciascuna modalità.</div>';
  }else{
    h+='<table style="width:100%;border-collapse:collapse;font-size:11px">';
    h+='<thead><tr style="background:#f5f2ee">';
    h+='<th style="padding:6px 8px;text-align:center;width:28px"><input type="checkbox" onchange="document.querySelectorAll(\'.mon-snap-cb\').forEach(function(c){c.checked=this.checked;}.bind(this))"></th>';
    h+='<th style="padding:6px 8px;text-align:left">Snapshot</th>';
    h+='<th style="padding:6px 8px;text-align:center">Tipo</th>';
    h+='<th style="padding:6px 8px;text-align:center">Dip.</th>';
    h+='<th style="padding:6px 8px;text-align:right">Totale EUR</th>';
    h+='<th style="padding:6px 8px;text-align:center">Salvato il</th>';
    h+='<th style="padding:6px 8px;text-align:center"></th>';
    h+='</tr></thead><tbody>';
    MONITOR_SNAPS.slice().sort(function(a,b){return a.year!==b.year?a.year-b.year:a.month!==b.month?a.month-b.month:a.created_at<b.created_at?-1:1;}).forEach(function(s){
      var tot=s.employees.reduce(function(acc,e){return acc+(e.vi_eur||0)+(e.rd_eur||0)+(e.rp_eur||0)+(e.rs_eur||0)+(e.ra_eur||0)+(e.rsa_eur||0)+(e.rdc_eur||0)+(e.fcvm_actual_eur||0)+(e.seasonal_eur||0);},0);
      var dt=s.created_at?s.created_at.slice(0,10):"-";
      h+='<tr style="border-bottom:1px solid #e5e1db">';
      h+='<td style="padding:5px 8px;text-align:center"><input type="checkbox" class="mon-snap-cb" data-sid="'+esc(s.id)+'" checked></td>';
      h+='<td style="padding:5px 8px;font-weight:600">'+esc(s.label)+'</td>';
      h+='<td style="padding:5px 8px;text-align:center">'+(typeBadge[s.type]||s.type)+'</td>';
      h+='<td style="padding:5px 8px;text-align:center;color:#5ba4cf">'+s.employees.length+'</td>';
      h+='<td style="padding:5px 8px;text-align:right;font-weight:700;color:#2d7a3a">'+fcEUR(tot)+'</td>';
      h+='<td style="padding:5px 8px;text-align:center;color:#a09a92">'+dt+'</td>';
      h+='<td style="padding:5px 8px;text-align:center"><button onclick="deleteMonitorSnap(\''+esc(s.id)+'\')" style="background:none;border:none;color:#cf5b5b;cursor:pointer;font-size:13px" title="Elimina">&#128465;</button></td>';
      h+='</tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  return h;
}
