// === SESSION SAVE / LOAD (file-based) ===
// Flush pending input[data-digmob] values to STORE_FLAGS before any save.
// Needed because those inputs use onchange (fires on blur), so if the user types
// a value and immediately clicks Save without leaving the field the edit would be lost.
function _flushDigMobInputs(){
  document.querySelectorAll("input[data-digmob]").forEach(function(inp){
    var sid=inp.getAttribute("data-digmob");
    var v=parseFloat(inp.value);
    if(!STORE_FLAGS[sid])STORE_FLAGS[sid]={digType:"mobility"};
    if(!isNaN(v)&&v>0){STORE_FLAGS[sid].digMinMob=Math.round(v*100)/10000;}
    else{delete STORE_FLAGS[sid].digMinMob;}
  });
}
function saveSession(){
  try{
    _flushDigMobInputs();
    var state={
      _type:"boggi_session",v:AUTO_VERSION,
      D:{e:E,t:D.t,c:D.c,cs:D.cs,s:D.s,v:D.v,tr:D.tr,usa:D.usa,us:D.us,d:D.d,vl:D.vl,ur:D.ur},
      tc:TC,sick50:SICK_50,sick0:SICK_0,params:PARAMS,mode:MODE,region:REGION,prize_mode:PRIZE_MODE,season_period:SEASON_PERIOD,
      seas:SEAS,seas_cfg:SEAS_CFG,seas_targets:SEAS_TARGETS,sas_matrix:SAS_MATRIX,
      agg:AGG,vl:VL,usa_p:USA_P,store_flags:STORE_FLAGS,
      cfg_month:CFG_MONTH,cfg_year:CFG_YEAR,cfg_pdf_path:CFG_PDF_PATH,cfg_season:CFG_SEASON,
      monthly_syly:MONTHLY_SYLY,
      fc_emp:FC_EMP,fc_map:FC_MAP,fc_targets:FC_TARGETS,fc_results:FC_RESULTS,
      fc_syly:FC_SYLY,fc_store_flags:FC_STORE_FLAGS,agg_fcvm:AGG_FCVM,
      fc_overrides:FC_OVERRIDES,fc_prev_results:FC_PREV_RESULTS,
      monitor_snaps:MONITOR_SNAPS,
      ts:new Date().toISOString()
    };
    var json=JSON.stringify(state);
    var blob=new Blob([json],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    var d=new Date(),pad=function(n){return n<10?"0"+n:String(n)};
    a.download="Boggi_Sessione_"+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"_"+pad(d.getHours())+pad(d.getMinutes())+".json";
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(a.href);
  }catch(ex){alert("Errore nel salvataggio: "+ex.message)}
}
function loadSession(input){
  var f=input.files[0];if(!f)return;input.value="";
  var reader=new FileReader();reader.onload=function(ev){try{
    var state=JSON.parse(ev.target.result);
    if(state._type!=="boggi_session"){alert("Il file selezionato non è una sessione Boggi valida.");return}
    var ts=state.ts?new Date(state.ts).toLocaleString("it-IT"):"sconosciuto";
    if(!confirm("Caricare la sessione salvata il "+ts+"?\n\nTutti i dati attuali verranno sostituiti."))return;
    // Restore data
    if(state.D){
      if(state.D.e){E=state.D.e;
        E.forEach(function(emp){if(emp.cf)emp.cf=sanitizeCF(emp.cf);});
      }
      if(state.D.t)D.t=state.D.t;if(state.D.c)D.c=state.D.c;if(state.D.cs)D.cs=state.D.cs;if(state.D.s)D.s=state.D.s;
      if(state.D.v)D.v=state.D.v;if(state.D.tr)D.tr=state.D.tr;
      if(state.D.usa)D.usa=state.D.usa;if(state.D.us)D.us=state.D.us;
      if(state.D.d)D.d=state.D.d;if(state.D.vl)D.vl=state.D.vl;if(state.D.ur)D.ur=state.D.ur;
    }
    if(state.tc){TC=state.tc;RL.forEach(function(r){if(!TC[r]){TC[r]={};KP.forEach(function(k){
      var isSCS=r.indexOf("SCS")>=0,isDept=r.indexOf("DEPT")>=0,isNoSas=r.indexOf("NO SAS")>=0,isNoDig=r.indexOf("NO DIGITAL")>=0,isNoSY=r.indexOf("NO SY")>=0,isNoPriv=r.indexOf("NO PRIVILEGE")>=0;
      if(k==="BDG")TC[r][k]=true;else if(k==="Digital")TC[r][k]=!isNoDig&&!isDept;
      else if(k==="SY")TC[r][k]=!isSCS&&!isDept&&!isNoSY;else if(k==="Privilege")TC[r][k]=!isDept&&!isNoPriv;
      else if(k==="SAS")TC[r][k]=isSCS&&!isNoSas;else if(k==="DCC")TC[r][k]=isSCS;
      else if(k==="CS")TC[r][k]=false;else if(k==="Articoli")TC[r][k]=true;else if(k==="Visual")TC[r][k]=false;
      else if(k==="QTY Dept")TC[r][k]=isDept})}})}
    if(state.sick50!==undefined)SICK_50=state.sick50;if(state.sick0!==undefined)SICK_0=state.sick0;
    if(state.params){if(state.params.digMin!==undefined&&state.params.digMinClassic===undefined){state.params.digMinClassic=state.params.digMin;state.params.digMinMobility=state.params.digMin+0.02}for(var k in state.params)if(PARAMS.hasOwnProperty(k))PARAMS[k]=state.params[k]}
    if(state.agg)AGG=state.agg;if(state.vl)VL=state.vl;if(state.usa_p){for(var r in state.usa_p)USA_P[r]=state.usa_p[r]}
    if(state.cfg_month)CFG_MONTH=state.cfg_month;if(state.cfg_year)CFG_YEAR=state.cfg_year;if(state.cfg_pdf_path!==undefined)CFG_PDF_PATH=state.cfg_pdf_path;if(state.cfg_season)CFG_SEASON=state.cfg_season;
    if(state.store_flags){STORE_FLAGS={};for(var sid in state.store_flags)STORE_FLAGS[sid]=state.store_flags[sid]}
    initStoreFlags(); // risemina DEPT stores mancanti (per sessioni salvate prima dell'aggiunta dei flag)
    if(state.seas){SEAS=state.seas;}
    if(state.seas_targets){for(var sk in state.seas_targets)SEAS_TARGETS[sk]=state.seas_targets[sk];}
    if(state.monthly_syly)MONTHLY_SYLY=state.monthly_syly;
    if(state.seas_cfg){
      if(state.seas_cfg.basePct!==undefined)SEAS_CFG.basePct=state.seas_cfg.basePct;
      if(state.seas_cfg.kpi)SEAS_CFG.kpi=state.seas_cfg.kpi;
      if(state.seas_cfg.kpi_nosas)SEAS_CFG.kpi_nosas=state.seas_cfg.kpi_nosas;
      if(state.seas_cfg.kpi_noacc)SEAS_CFG.kpi_noacc=state.seas_cfg.kpi_noacc;
      if(state.seas_cfg.molt_turnover){
        SEAS_CFG.molt_turnover=state.seas_cfg.molt_turnover.map(function(r){
          return{from:r.from===null?-Infinity:r.from,to:r.to===null?Infinity:r.to,coeff:r.coeff,label:r.label||""};
        });
      }
      if(state.seas_cfg.molt_inventario){
        SEAS_CFG.molt_inventario=state.seas_cfg.molt_inventario.map(function(r){
          return{from:r.from===null?-Infinity:r.from,to:r.to===null?Infinity:r.to,coeff:r.coeff,label:r.label||""};
        });
      }
    }
    if(state.sas_matrix){
      if(state.sas_matrix.grid)SAS_MATRIX.grid=state.sas_matrix.grid;
      if(state.sas_matrix.accBands)SAS_MATRIX.accBands=state.sas_matrix.accBands;
      if(state.sas_matrix.velBands)SAS_MATRIX.velBands=state.sas_matrix.velBands;
      if(state.sas_matrix.velLabel!==undefined)SAS_MATRIX.velLabel=state.sas_matrix.velLabel;
    }
    // Ripristina FC+VM prima di setPrizeMode: rAFcvm() gira con i dati già pronti (inclusa lang)
    if(state.fc_emp)FC_EMP=state.fc_emp;
    if(state.fc_map)FC_MAP=state.fc_map;
    if(state.fc_targets)FC_TARGETS=state.fc_targets;
    if(state.fc_results)FC_RESULTS=state.fc_results;
    if(state.fc_syly)FC_SYLY=state.fc_syly;
    if(state.fc_store_flags)FC_STORE_FLAGS=state.fc_store_flags;
    if(state.agg_fcvm)AGG_FCVM=state.agg_fcvm;
    if(state.fc_overrides)FC_OVERRIDES=state.fc_overrides;
    if(state.fc_prev_results)FC_PREV_RESULTS=state.fc_prev_results;
    if(state.mode)MODE=state.mode;if(state.region)REGION=state.region;if(state.prize_mode){PRIZE_MODE=state.prize_mode;setPrizeMode(PRIZE_MODE);}if(state.season_period){SEASON_PERIOD=state.season_period;setSeasonPeriod(SEASON_PERIOD);}
    document.getElementById("modeP").className="gbtn"+(MODE==="preventivo"?" on":"");document.getElementById("modeC").className="gbtn"+(MODE==="consuntivo"?" on":"");
    document.getElementById("regInt").className="gbtn"+(REGION==="international"?" on":"");document.getElementById("regIt").className="gbtn"+(REGION==="italia"?" on":"");
    updateHeader();updateHeaderCount();
    _origTC=JSON.stringify(TC);_origS50=SICK_50;_origS0=SICK_0;_origP=JSON.stringify(PARAMS);_origUSA=JSON.stringify(USA_P);_origMonth=CFG_MONTH;_origYear=CFG_YEAR;_origPdfPath=CFG_PDF_PATH;_origSeason=CFG_SEASON;_origSF=JSON.stringify(STORE_FLAGS);_origSeasCfg=JSON.stringify(SEAS_CFG);_origPrizeMode=PRIZE_MODE;_origSeasonPeriod=SEASON_PERIOD;_origSasMatrix=JSON.stringify(SAS_MATRIX);
    var loadMsg;
    if(PRIZE_MODE==="fcvm"){
      var fcvmCount=Object.keys(FC_EMP).length;
      loadMsg="Sessione FC+VM caricata con successo!\n\n"+fcvmCount+" dipendenti FC+VM ripristinati.";
    }else if(PRIZE_MODE==="seasonal"){
      var seasStoreCount=Object.keys(SEAS_TARGETS).filter(function(k){return SEAS_TARGETS[k]&&SEAS_TARGETS[k].to>0;}).length;
      loadMsg="Sessione Seasonal Bonus caricata con successo!\n\n"+E.length+" dipendenti · "+seasStoreCount+" negozi con target seasonal ripristinati.";
    }else{
      loadMsg="Sessione caricata con successo!\n\n"+E.length+" dipendenti ripristinati.";
    }
    alert(loadMsg);
  }catch(ex){alert("Errore nel caricamento: "+ex.message)}};reader.readAsText(f);
}

// Save/Dirty
var _origTC=JSON.stringify(TC),_origS50=SICK_50,_origS0=SICK_0,_origP=JSON.stringify(PARAMS),_origUSA=JSON.stringify(USA_P),_origMonth=CFG_MONTH,_origYear=CFG_YEAR,_origPdfPath=CFG_PDF_PATH,_origSeason=CFG_SEASON,_origSF=JSON.stringify(STORE_FLAGS),_origSeasCfg=JSON.stringify(SEAS_CFG),_origPrizeMode=PRIZE_MODE,_origSeasonPeriod=SEASON_PERIOD,_origSasMatrix=JSON.stringify(SAS_MATRIX);
function markDirty(){var dirty=JSON.stringify(TC)!==_origTC||SICK_50!==_origS50||SICK_0!==_origS0||JSON.stringify(PARAMS)!==_origP||JSON.stringify(USA_P)!==_origUSA||CFG_MONTH!==_origMonth||CFG_YEAR!==_origYear||CFG_PDF_PATH!==_origPdfPath||CFG_SEASON!==_origSeason||JSON.stringify(STORE_FLAGS)!==_origSF||JSON.stringify(SEAS_CFG)!==_origSeasCfg||JSON.stringify(SAS_MATRIX)!==_origSasMatrix||PRIZE_MODE!==_origPrizeMode||SEASON_PERIOD!==_origSeasonPeriod;document.getElementById("saveBar").className="save-bar"+(dirty?" show":"");var cnt=document.querySelector(".cnt");if(cnt)cnt.style.paddingBottom=dirty?"60px":""}
function saveConfig(){
  _flushDigMobInputs();
  var cfg={tc:TC,sick50:SICK_50,sick0:SICK_0,params:PARAMS,mode:MODE,region:REGION,prize_mode:PRIZE_MODE,season_period:SEASON_PERIOD,seas_cfg:SEAS_CFG,sas_matrix:SAS_MATRIX,agg:AGG,vl:VL,usa_p:USA_P,store_flags:STORE_FLAGS,cfg_month:CFG_MONTH,cfg_year:CFG_YEAR,cfg_pdf_path:CFG_PDF_PATH,cfg_season:CFG_SEASON,saved:new Date().toISOString()};
  var blob=new Blob([JSON.stringify(cfg,null,2)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="boggi_config_"+getPdfSubfolder().fileBase+".json";a.click();
  _origTC=JSON.stringify(TC);_origS50=SICK_50;_origS0=SICK_0;_origP=JSON.stringify(PARAMS);_origUSA=JSON.stringify(USA_P);_origMonth=CFG_MONTH;_origYear=CFG_YEAR;_origPdfPath=CFG_PDF_PATH;_origSeason=CFG_SEASON;_origSF=JSON.stringify(STORE_FLAGS);_origSeasCfg=JSON.stringify(SEAS_CFG);_origPrizeMode=PRIZE_MODE;_origSeasonPeriod=SEASON_PERIOD;_origSasMatrix=JSON.stringify(SAS_MATRIX);document.getElementById("saveBar").className="save-bar";autoSave()}
function discardChanges(){TC=JSON.parse(_origTC);SICK_50=_origS50;SICK_0=_origS0;PARAMS=JSON.parse(_origP);USA_P=JSON.parse(_origUSA);CFG_MONTH=_origMonth;CFG_YEAR=_origYear;CFG_PDF_PATH=_origPdfPath;CFG_SEASON=_origSeason;STORE_FLAGS=JSON.parse(_origSF);SEAS_CFG=JSON.parse(_origSeasCfg);SAS_MATRIX=JSON.parse(_origSasMatrix);PRIZE_MODE=_origPrizeMode;SEASON_PERIOD=_origSeasonPeriod;document.getElementById("saveBar").className="save-bar";setPrizeMode(PRIZE_MODE);setSeasonPeriod(SEASON_PERIOD);rT();rC()}
function loadConfig(evt){var f=evt.target.files[0];if(!f)return;var reader=new FileReader();
  reader.onload=function(ev){try{
    var txt=ev.target.result;
    // Strip BOM and whitespace
    if(txt.charCodeAt(0)===0xFEFF)txt=txt.slice(1);
    txt=txt.trim();
    var cfg=JSON.parse(txt);
    if(cfg.tc){
      // Migrate legacy "SM VSM" to individual SM/VSM
      if(cfg.tc["SM VSM"]&&!cfg.tc["SM"]){cfg.tc["SM"]=JSON.parse(JSON.stringify(cfg.tc["SM VSM"]));cfg.tc["VSM"]=JSON.parse(JSON.stringify(cfg.tc["SM VSM"]))}
      if(cfg.tc["SM VSM NO DIGITAL"]&&!cfg.tc["SM NO DIGITAL"]){cfg.tc["SM NO DIGITAL"]=JSON.parse(JSON.stringify(cfg.tc["SM VSM NO DIGITAL"]));cfg.tc["VSM NO DIGITAL"]=JSON.parse(JSON.stringify(cfg.tc["SM VSM NO DIGITAL"]))}
      if(cfg.tc["SM VSM DEPT"]&&!cfg.tc["SM DEPT"]){cfg.tc["SM DEPT"]=JSON.parse(JSON.stringify(cfg.tc["SM VSM DEPT"]));cfg.tc["VSM DEPT"]=JSON.parse(JSON.stringify(cfg.tc["SM VSM DEPT"]))}
      TC=cfg.tc;
      // Ensure all RL roles exist in TC
      RL.forEach(function(r){if(!TC[r]){TC[r]={};KP.forEach(function(k){
        var isSCS=r.indexOf("SCS")>=0,isDept=r.indexOf("DEPT")>=0,isNoSas=r.indexOf("NO SAS")>=0,isNoDig=r.indexOf("NO DIGITAL")>=0,isNoSY=r.indexOf("NO SY")>=0,isNoPriv=r.indexOf("NO PRIVILEGE")>=0;
        if(k==="BDG")TC[r][k]=true;else if(k==="Digital")TC[r][k]=!isNoDig&&!isDept;
        else if(k==="SY")TC[r][k]=!isSCS&&!isDept&&!isNoSY;else if(k==="Privilege")TC[r][k]=!isDept&&!isNoPriv;
        else if(k==="SAS")TC[r][k]=isSCS&&!isNoSas;else if(k==="DCC")TC[r][k]=isSCS;
        else if(k==="CS")TC[r][k]=false;else if(k==="Articoli")TC[r][k]=true;else if(k==="Visual")TC[r][k]=false;
        else if(k==="QTY Dept")TC[r][k]=isDept})}})
    }if(cfg.sick50!==undefined)SICK_50=cfg.sick50;if(cfg.sick0!==undefined)SICK_0=cfg.sick0;
    if(cfg.params){
      // Migrate legacy digMin to digMinClassic/digMinMobility
      if(cfg.params.digMin!==undefined&&cfg.params.digMinClassic===undefined){cfg.params.digMinClassic=cfg.params.digMin;cfg.params.digMinMobility=cfg.params.digMin+0.02}
      for(var k in cfg.params)if(PARAMS.hasOwnProperty(k))PARAMS[k]=cfg.params[k]
    }
    if(cfg.agg)AGG=cfg.agg;if(cfg.vl)VL=cfg.vl;if(cfg.usa_p){for(var r in cfg.usa_p)USA_P[r]=cfg.usa_p[r]}
    if(cfg.cfg_month)CFG_MONTH=cfg.cfg_month;if(cfg.cfg_year)CFG_YEAR=cfg.cfg_year;if(cfg.cfg_pdf_path!==undefined)CFG_PDF_PATH=cfg.cfg_pdf_path;if(cfg.cfg_season)CFG_SEASON=cfg.cfg_season;
    if(cfg.store_flags){STORE_FLAGS={};for(var sid in cfg.store_flags)STORE_FLAGS[sid]=cfg.store_flags[sid]}
    initStoreFlags(); // risemina DEPT stores mancanti
    if(cfg.seas_cfg){
      if(cfg.seas_cfg.basePct!==undefined)SEAS_CFG.basePct=cfg.seas_cfg.basePct;
      if(cfg.seas_cfg.kpi)SEAS_CFG.kpi=cfg.seas_cfg.kpi;
      if(cfg.seas_cfg.kpi_nosas)SEAS_CFG.kpi_nosas=cfg.seas_cfg.kpi_nosas;
      if(cfg.seas_cfg.kpi_noacc)SEAS_CFG.kpi_noacc=cfg.seas_cfg.kpi_noacc;
      if(cfg.seas_cfg.molt_turnover){
        SEAS_CFG.molt_turnover=cfg.seas_cfg.molt_turnover.map(function(r){
          return{from:r.from===null?-Infinity:r.from,to:r.to===null?Infinity:r.to,coeff:r.coeff,label:r.label||""};
        });
      }
      if(cfg.seas_cfg.molt_inventario){
        SEAS_CFG.molt_inventario=cfg.seas_cfg.molt_inventario.map(function(r){
          return{from:r.from===null?-Infinity:r.from,to:r.to===null?Infinity:r.to,coeff:r.coeff,label:r.label||""};
        });
      }
    }
    if(cfg.region)setRegion(cfg.region);
    if(cfg.mode)MODE=cfg.mode;  // set MODE before setPrizeMode (which calls rC/rT/rSources)
    if(cfg.prize_mode){PRIZE_MODE=cfg.prize_mode;setPrizeMode(PRIZE_MODE);}
    else setMode(cfg.mode||MODE);  // fallback: update buttons via setMode if no prize_mode saved
    if(cfg.season_period){SEASON_PERIOD=cfg.season_period;setSeasonPeriod(SEASON_PERIOD);}
    // Always sync preventivo/consuntivo buttons
    if(cfg.mode){document.getElementById("modeP").className="gbtn"+(cfg.mode==="preventivo"?" on":"");document.getElementById("modeC").className="gbtn"+(cfg.mode==="consuntivo"?" on":"");}
    _origTC=JSON.stringify(TC);_origS50=SICK_50;_origS0=SICK_0;_origP=JSON.stringify(PARAMS);_origUSA=JSON.stringify(USA_P);_origMonth=CFG_MONTH;_origYear=CFG_YEAR;_origPdfPath=CFG_PDF_PATH;_origSeason=CFG_SEASON;_origSF=JSON.stringify(STORE_FLAGS);_origSeasCfg=JSON.stringify(SEAS_CFG);_origPrizeMode=PRIZE_MODE;_origSeasonPeriod=SEASON_PERIOD;
    document.getElementById("saveBar").className="save-bar";updateHeader();rT();rC();rA();rSources();rAgg();if(typeof rStores==="function")rStores();autoSave();alert("Configurazione caricata!");
  }catch(ex){alert("Errore nel file: "+ex.message)}};reader.readAsText(f)}

