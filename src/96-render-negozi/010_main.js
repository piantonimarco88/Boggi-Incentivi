function rStores(){
  if(PRIZE_MODE==="fcvm"){rStoresFcvm();return;}
  var h='<div style="font-size:12px;color:#6b6560;margin-bottom:14px"><b>Impostazioni Negozi</b> \u2014 I toggle si applicano a <b>tutti i dipendenti</b> dello store e modificano il ruolo effettivo usato nei calcoli.</div>';
  h+='<div style="display:flex;gap:16px;margin-bottom:12px;align-items:center;flex-wrap:wrap">';
  h+='<input placeholder="Cerca store..." id="storeQ" value="'+esc(storeFilter)+'" style="padding:8px 12px;border-radius:6px;border:1px solid #d5d0c8;font-size:12px;flex:1;min-width:200px">';
  // Count summary — only for stores actually present in E (respecting current REGION filter)
  var _activeStoreIds=new Set();
  E.forEach(function(e){
    // Apply region filter: if REGION==='italia', only include EUR stores without country prefix (matricola A0/A4/A5 etc.)
    // Use same logic as rC: italiana = cu===EUR and store id 1001-1099 range, but simplest proxy is checking if
    // the store appears in the current view. Since stores{} is built from E filtered below, just collect all sids from E.
    _activeStoreIds.add(String(e.si));
  });
  // If REGION==='italia', filter to Italian stores only (same as the main calc view)
  if(REGION==='italia'){
    var _itaStores=new Set();
    E.forEach(function(e){if((e.cu||'EUR')==='EUR'&&String(e.si).match(/^(1[0-9]{3})$/)&&Number(e.si)>=1001&&Number(e.si)<=1099)_itaStores.add(String(e.si))});
    _activeStoreIds=_itaStores;
  }
  var deptCount=0,noSasCount=0,noDigCount=0,noSyCount=0,noPrivCount=0;
  _activeStoreIds.forEach(function(sid){var sf=STORE_FLAGS[sid];if(!sf)return;if(sf.dept)deptCount++;if(sf.noSas)noSasCount++;if(sf.noDig)noDigCount++;if(sf.noSy)noSyCount++;if(sf.noPriv)noPrivCount++});
  h+='<span style="font-size:10px;color:#8a8680">Negozi visibili: <b>'+_activeStoreIds.size+'</b> \u00b7 Dept: <b>'+deptCount+'</b> \u00b7 No SAS: <b>'+noSasCount+'</b> \u00b7 No Digital: <b>'+noDigCount+'</b> \u00b7 No SY: <b>'+noSyCount+'</b> \u00b7 No Priv: <b>'+noPrivCount+'</b></span>';
  h+='</div>';

  h+='<div style="background:#f0ede7;border:1px solid #d5d0c8;border-radius:6px;padding:8px 14px;margin-bottom:12px;font-size:10px;color:#6b6560">';
  h+='<b>Legenda:</b> <span class="bg bg-d" style="font-size:9px">DEPT</span> = Dept Store (prioritario: QTY attivo, SY/Digital/Privilege disattivati) \u00b7 ';
  h+='<b>No SAS</b> = SAS disattivato \u00b7 <b>No Digital</b> = Digital disattivato \u00b7 <b>No SY</b> = Shopper Yield disattivato \u00b7 <b>No Privilege</b> = Privilege disattivato \u00b7 ';
  h+='DEPT \u00e8 esclusivo (ignora altri flag).</div>';

  // Build store list from E
  var stores={};// {sid: {name, count, ente, cu}}
  E.forEach(function(e){
    var sid=String(e.si);
    if(!stores[sid])stores[sid]={name:e.s,count:0,ente:e.en,cu:e.cu||"EUR"};
    stores[sid].count++;
  });
  var storeIds=Object.keys(stores).sort(function(a,b){return(Number(a)||0)-(Number(b)||0)});

  if(storeFilter){
    var q=storeFilter.toLowerCase();
    storeIds=storeIds.filter(function(sid){return sid.indexOf(q)>=0||(stores[sid].name||"").toLowerCase().indexOf(q)>=0});
  }

  var isSeasStores=(PRIZE_MODE==="seasonal");
  h+='<div class="scroll-wrap"><table style="font-size:10px"><thead><tr style="background:#eae7e1">';
  h+='<th style="padding:6px;cursor:default">Store ID</th>';
  h+='<th style="padding:6px;cursor:default">Nome Negozio</th>';
  h+='<th style="padding:6px;cursor:default;text-align:center">Dip.</th>';
  h+='<th style="padding:6px;cursor:default">Val.</th>';
  h+='<th style="padding:6px;cursor:default;min-width:160px">KPI Attivi</th>';
  h+='<th style="padding:6px;cursor:default;text-align:center;min-width:80px">Dept Store</th>';
  h+='<th style="padding:6px;cursor:default;text-align:center;min-width:80px">No SAS</th>';
  if(!isSeasStores){h+='<th style="padding:6px;cursor:default;text-align:center;min-width:80px">No Digital</th>';}
  if(!isSeasStores){h+='<th style="padding:6px;cursor:default;text-align:center;min-width:120px">Tipo Digital</th>';}
  if(!isSeasStores){h+='<th style="padding:6px;cursor:default;text-align:center;min-width:70px">No SY</th>';}
  if(!isSeasStores){h+='<th style="padding:6px;cursor:default;text-align:center;min-width:80px">No Priv.</th>';}
  if(isSeasStores){h+='<th style="padding:6px;cursor:default;text-align:center;min-width:90px">No Accuracy</th>';}
  h+='</tr></thead><tbody>';

  storeIds.forEach(function(sid,i){
    var st=stores[sid];
    var sf=STORE_FLAGS[sid]||{dept:false,noSas:false,noDig:false};

    h+='<tr style="background:'+(sf.dept?"#f5f0ff":i%2?"#faf9f7":"#fff")+'">';
    h+='<td style="padding:5px;font-family:monospace;font-weight:700">'+esc(sid)+'</td>';
    h+='<td style="padding:5px">'+esc(st.name)+'</td>';
    h+='<td style="padding:5px;text-align:center;color:#8a8680">'+st.count+'</td>';
    h+='<td style="padding:5px;font-size:9px;color:#a09a92">'+esc(st.cu)+'</td>';

    // KPI attivi: compute from sf flags using same logic as isOn/TC
    var _kpiActive=[];
    var _isDept=sf.dept;
    var _isNoSas=sf.noSas;
    var _isNoDig=sf.noDig;
    var _isNoSy=sf.noSy;
    var _isNoPriv=sf.noPriv;
    if(!isSeasStores){
      _kpiActive.push('<span style="color:#c9a96e;font-weight:700">BDG</span>');
      if(!_isDept&&!_isNoDig)_kpiActive.push('<span style="color:#8b7ec8">Digital</span>');
      if(!_isDept&&!_isNoSy)_kpiActive.push('<span style="color:#5ba4cf">SY</span>');
      if(!_isDept&&!_isNoPriv)_kpiActive.push('<span style="color:#5bb98c">Priv.</span>');
      if(!_isDept)_kpiActive.push('<span style="color:#cf5b5b">DCC</span>');// SCS only but show
      if(!_isNoSas)_kpiActive.push('<span style="color:#d4a94e">SAS</span>');// SCS only
      if(!_isDept)_kpiActive.push('<span style="color:#cf8b4e">Art.</span>');
      if(_isDept)_kpiActive.push('<span style="color:#9b6ec9">QTY</span>');
    }else{
      _kpiActive.push('<span style="color:#5ba4cf">SY</span>');
      _kpiActive.push('<span style="color:#5bb98c">Sub.Rate</span>');
      if(!_isNoSas)_kpiActive.push('<span style="color:#d4a94e">SAS</span>');
      if(!sf.noAcc)_kpiActive.push('<span style="color:#8b7ec8">Acc.</span>');
    }
    h+='<td style="padding:5px;font-size:9px;line-height:1.6">'+_kpiActive.join(' ')+'</td>';

    // Dept toggle
    h+='<td style="padding:5px;text-align:center"><button class="tb '+(sf.dept?"x":"o")+'" data-sf="'+sid+'" data-sk="dept" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    // No SAS toggle
    h+='<td style="padding:5px;text-align:center"><button class="tb '+(sf.noSas?"x":"o")+'" data-sf="'+sid+'" data-sk="noSas" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    if(!isSeasStores){
      // No Digital toggle
      h+='<td style="padding:5px;text-align:center"><button class="tb '+(sf.noDig?"x":"o")+'" data-sf="'+sid+'" data-sk="noDig" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
      // Digital Type toggle: Classico (left/o) vs Mobilità (right/x)
      var isMob=sf.digType==="mobility";
      h+='<td style="padding:5px;text-align:center"><span style="font-size:8px;color:'+(isMob?"#a09a92":"#8b7ec8")+'">Class.</span> ';
      h+='<button class="tb '+(isMob?"x":"o")+'" data-sf="'+sid+'" data-sk="digType" style="width:32px;height:16px;background:'+(isMob?"#8b7ec8":"#d5d0c8")+'"><span class="tk" style="width:10px;height:10px;top:3px"></span></button>';
      h+=' <span style="font-size:8px;color:'+(isMob?"#8b7ec8":"#a09a92")+'">Mob.</span></td>';
      // No SY toggle
      h+='<td style="padding:5px;text-align:center"><button class="tb '+(sf.noSy?"x":"o")+'" data-sf="'+sid+'" data-sk="noSy" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
      // No Privilege toggle
      h+='<td style="padding:5px;text-align:center"><button class="tb '+(sf.noPriv?"x":"o")+'" data-sf="'+sid+'" data-sk="noPriv" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    }
    if(isSeasStores){
      // No Accuracy toggle (seasonal only)
      h+='<td style="padding:5px;text-align:center"><button class="tb '+(sf.noAcc?"x":"o")+'" data-sf="'+sid+'" data-sk="noAcc" style="width:32px;height:16px"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    }
    h+='</tr>';
  });

  h+='</tbody></table></div>';
  document.getElementById("p7").innerHTML=h;

  // Bindings
  document.getElementById("storeQ").oninput=function(){storeFilter=this.value;var pos=this.selectionStart;rStores();var el=document.getElementById("storeQ");if(el){el.focus();el.selectionStart=el.selectionEnd=pos}};

  document.querySelectorAll("button[data-sf]").forEach(function(btn){btn.onclick=function(){
    var sid=btn.getAttribute("data-sf"),sk=btn.getAttribute("data-sk");
    var sw=document.querySelector("#p7 .scroll-wrap");var scrollTop=sw?sw.scrollTop:0;
    if(!STORE_FLAGS[sid])STORE_FLAGS[sid]={dept:false,noSas:false,noDig:false,noSy:false,noPriv:false,digType:"classic"};
    if(sk==="digType"){
      STORE_FLAGS[sid].digType=STORE_FLAGS[sid].digType==="mobility"?"classic":"mobility";
    }else{
      STORE_FLAGS[sid][sk]=!STORE_FLAGS[sid][sk];
    }
    // Clean up: remove entry if all defaults
    var sf=STORE_FLAGS[sid];
    if(!sf.dept&&!sf.noSas&&!sf.noDig&&!sf.noSy&&!sf.noPriv&&(!sf.digType||sf.digType==="classic"))delete STORE_FLAGS[sid];
    markDirty();rStores();rC();rA();rT();autoSave();
    var sw2=document.querySelector("#p7 .scroll-wrap");if(sw2)sw2.scrollTop=scrollTop;
  }});
}
