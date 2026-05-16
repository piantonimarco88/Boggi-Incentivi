// Restore config from autosaved state if available
if(window._autoState){try{
  var as=window._autoState;
  if(as.tc)TC=as.tc;
  if(as.sick50!==undefined)SICK_50=as.sick50;
  if(as.sick0!==undefined)SICK_0=as.sick0;
  if(as.params){for(var k in as.params)if(PARAMS.hasOwnProperty(k))PARAMS[k]=as.params[k]}
  if(as.usa_p){for(var r in as.usa_p)USA_P[r]=as.usa_p[r]}
  if(as.store_flags){STORE_FLAGS={};for(var sid in as.store_flags)STORE_FLAGS[sid]=as.store_flags[sid]}
  if(as.seas_cfg){
    if(as.seas_cfg.basePct!==undefined)SEAS_CFG.basePct=as.seas_cfg.basePct;
    if(as.seas_cfg.kpi)SEAS_CFG.kpi=as.seas_cfg.kpi;
    if(as.seas_cfg.kpi_nosas)SEAS_CFG.kpi_nosas=as.seas_cfg.kpi_nosas;
    if(as.seas_cfg.kpi_noacc)SEAS_CFG.kpi_noacc=as.seas_cfg.kpi_noacc;
    if(as.seas_cfg.molt_turnover){SEAS_CFG.molt_turnover=as.seas_cfg.molt_turnover.map(function(r){return{from:r.from===null?-Infinity:r.from,to:r.to===null?Infinity:r.to,coeff:r.coeff,label:r.label||""};})}
    if(as.seas_cfg.molt_inventario){SEAS_CFG.molt_inventario=as.seas_cfg.molt_inventario.map(function(r){return{from:r.from===null?-Infinity:r.from,to:r.to===null?Infinity:r.to,coeff:r.coeff,label:r.label||""};})}
  }
  if(as.cfg_month)CFG_MONTH=as.cfg_month;
  if(as.cfg_year)CFG_YEAR=as.cfg_year;
  if(as.cfg_pdf_path!==undefined)CFG_PDF_PATH=as.cfg_pdf_path;
  if(as.cfg_season)CFG_SEASON=as.cfg_season;
  if(as.mode)MODE=as.mode;
  if(as.region)REGION=as.region;
  if(as.prize_mode)PRIZE_MODE=as.prize_mode;
  if(as.season_period)SEASON_PERIOD=as.season_period;
  if(as.agg)AGG=as.agg;
  if(as.vl)VL=as.vl;
  if(as.monthly_syly)MONTHLY_SYLY=as.monthly_syly;
  if(as.monitor_snaps)MONITOR_SNAPS=as.monitor_snaps;
  delete window._autoState;
}catch(ex){/* autoState restore failed, use defaults */}}
// Ensure all RL roles exist in TC (runs ALWAYS, even if autoState restore failed)
RL.forEach(function(r){if(!TC[r]){TC[r]={};KP.forEach(function(k){
  var isSCS=r.indexOf("SCS")>=0,isDept=r.indexOf("DEPT")>=0,isNoSas=r.indexOf("NO SAS")>=0,isNoDig=r.indexOf("NO DIGITAL")>=0,isNoSY=r.indexOf("NO SY")>=0,isNoPriv=r.indexOf("NO PRIVILEGE")>=0;
  if(k==="BDG")TC[r][k]=true;else if(k==="Digital")TC[r][k]=!isNoDig&&!isDept;
  else if(k==="SY")TC[r][k]=!isSCS&&!isDept&&!isNoSY;else if(k==="Privilege")TC[r][k]=!isDept&&!isNoPriv;
  else if(k==="SAS")TC[r][k]=isSCS&&!isNoSas;else if(k==="DCC")TC[r][k]=isSCS;
  else if(k==="CS")TC[r][k]=false;else if(k==="Articoli")TC[r][k]=true;else if(k==="Visual")TC[r][k]=false;
  else if(k==="QTY Dept")TC[r][k]=isDept})}});

// AutoSave: persist full state to localStorage
// Aggiorna badge versione con APP_VERSION
(function(){var b=document.getElementById("appVerBadge");if(b&&typeof APP_VERSION!=="undefined")b.textContent="v"+APP_VERSION;})();

function autoSave(){
  try{
    var state={
      v:AUTO_VERSION,
      D:{e:E,t:D.t,c:D.c,cs:D.cs,s:D.s,v:D.v,tr:D.tr,usa:D.usa,us:D.us,d:D.d,vl:D.vl},
      tc:TC,sick50:SICK_50,sick0:SICK_0,params:PARAMS,mode:MODE,region:REGION,prize_mode:PRIZE_MODE,season_period:SEASON_PERIOD,
      seas:SEAS,seas_cfg:SEAS_CFG,seas_targets:SEAS_TARGETS,
      agg:AGG,vl:VL,usa_p:USA_P,store_flags:STORE_FLAGS,
      cfg_month:CFG_MONTH,cfg_year:CFG_YEAR,cfg_pdf_path:CFG_PDF_PATH,cfg_season:CFG_SEASON,
      monthly_syly:MONTHLY_SYLY,
      fc_emp:FC_EMP,fc_map:FC_MAP,fc_targets:FC_TARGETS,fc_results:FC_RESULTS,
      fc_syly:FC_SYLY,fc_store_flags:FC_STORE_FLAGS,agg_fcvm:AGG_FCVM,
      fc_overrides:FC_OVERRIDES,fc_prev_results:FC_PREV_RESULTS,
      monitor_snaps:MONITOR_SNAPS,
      ts:new Date().toISOString()
    };
    var payload=JSON.stringify(state);
    if(_hasWebMsg){
      // Wrapper C# attivo: persist su %LOCALAPPDATA%\BoggiIncentivi\state.json (debounce 500ms)
      try{chrome.webview.postMessage({type:"saveState",payload:payload})}catch(e){}
      // Migrazione one-shot: se c'erano dati solo in localStorage, ora che li abbiamo girati al C# possiamo ripulire
      if(_needsMigrationFromLS){
        try{localStorage.removeItem("boggi_state")}catch(e){}
        _needsMigrationFromLS=false;
      }
    }else{
      // Dev mode / browser puro: fallback su localStorage come prima
      localStorage.setItem("boggi_state",payload);
    }
  }catch(ex){/* quota exceeded or private mode */}
}
