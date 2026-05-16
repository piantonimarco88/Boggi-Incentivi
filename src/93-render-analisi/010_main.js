function rA(){
  if(PRIZE_MODE==="fcvm"){rAFcvm();return;}
  if(PRIZE_MODE==="seasonal"){rASeasonal();return;}
  var gr={},kpiStats={};IT.forEach(function(it){if(it.k==="ra"&&!PARAMS.artEnabled)return;kpiStats[it.k]={eligible:0,achieved:0,total:0}});
  var totalMl=0,mlCount=0,ml50=0,ml0=0;
  E.forEach(function(e){
    if(aG==="usa"&&!isUSA(e.si,e))return; // skip non-USA in USA view
    var k;if(aG==="role")k=gRC(e.j,e.f);else if(aG==="fc")k=e.fc||"N/A";else if(aG==="store")k=e.s;else if(aG==="usa"){var ud2=(D.usa||{})[e.m]||{};var isDeptUSA=ud2.isDept||(STORE_FLAGS[String(e.si)]&&STORE_FLAGS[String(e.si)].usaDept);k=isDeptUSA?"USA Dept Stores":"USA Boggi Street";}else k=isD(e.si)?"Dept Store":"Regular Store";
    if(!gr[k])gr[k]={n:0,t:0,b:0,d:0,sy:0,p:0,sa:0,ar:0,vi:0,ml:0,ag:0,wg:0};
    var g=gr[k],ex=e.ex||1,sm=sickMult(e.ml);g.n++;g.t+=calcEUR(e);g.ml+=(e.ml||0);g.ag+=aggTotal(e.m)*ex;
    IT.forEach(function(it){
      if(it.k==="ra"&&!PARAMS.artEnabled)return;
      var isVi=it.k==="vi";
      if(!isVi&&!isOn(e.j,it.k))return;
      var raw=getVal(e,it.k);
      if(isVi){if(VL[e.m]){kpiStats[it.k].eligible++;if(raw>0){kpiStats[it.k].achieved++;kpiStats[it.k].total+=raw*sm*ex}}}
      else{kpiStats[it.k].eligible++;if(raw>0){kpiStats[it.k].achieved++;kpiStats[it.k].total+=raw*sm*ex}}
    });
    if(isOn(e.j,"rb"))g.b+=getVal(e,"rb")*sm*ex;if(isOn(e.j,"rd"))g.d+=getVal(e,"rd")*sm*ex;
    if(isOn(e.j,"rs"))g.sy+=getVal(e,"rs")*sm*ex;if(isOn(e.j,"rp"))g.p+=getVal(e,"rp")*sm*ex;
    if(isOn(e.j,"rsa"))g.sa+=getVal(e,"rsa")*sm*ex;if(PARAMS.artEnabled&&isOn(e.j,"ra"))g.ar+=getVal(e,"ra")*sm*ex;
    g.vi+=getVal(e,"vi")*sm*ex;
    if(MODE==="consuntivo"&&e.ov_wg==="SI"&&isOn(e.j,"rb"))g.wg+=Math.round(e.ib*(PARAMS.workgamePct||0)*100)/100*ex;
    var ml=e.ml||0;totalMl+=ml;if(ml>0)mlCount++;if(ml>=SICK_50&&ml<SICK_0)ml50++;if(ml>=SICK_0)ml0++});
  var arr=[];for(var k in gr){var v=gr[k];arr.push({nm:k,n:v.n,t:v.t,b:v.b,d:v.d,sy:v.sy,p:v.p,sa:v.sa,ar:v.ar,vi:v.vi,ag:v.ag,wg:v.wg,av:v.n>0?v.t/v.n:0,ml:v.n>0?v.ml/v.n:0})}
  arr.sort(function(a,b){var va=a[aSort.col]||0,vb=b[aSort.col]||0;if(typeof va==="string")return va.toLowerCase()<vb.toLowerCase()?-aSort.dir:aSort.dir;return(va-vb)*aSort.dir});
  var mx=1;arr.forEach(function(a){if(a.t>mx)mx=a.t});var ta=0,wi=0,ridCount=0;E.forEach(function(e){var ct=calcEUR(e);ta+=ct;if(ct>0)wi++;if(ct>0&&isRidotto(e))ridCount++;});
  var hasUSAEmps=E.some(function(e){return e.cu==="USD";});
  var h='<div class="gb">';
  var aGroups=[{k:"role",l:"Per Ruolo"},{k:"fc",l:"Per Field Coach"},{k:"store",l:"Per Negozio"},{k:"type",l:"Regular vs Dept"}];
  if(hasUSAEmps)aGroups.push({k:"usa",l:"\ud83c\uddfa\ud83c\uddf8 USA"});
  aGroups.forEach(function(g){h+='<button class="gbtn'+(aG===g.k?" on":"")+'" data-g="'+g.k+'">'+g.l+"</button>"});h+="</div>";
  h+='<div class="cg">';[{l:"Totale Erogato",v:fcEUR(ta),c:"#2c2925"},{l:"Dipendenti",v:E.length,c:"#5ba4cf"},{l:"Con Incentivo",v:wi,c:"#2d7a3a"},{l:"Senza Incentivo",v:E.length-wi,c:"#cf5b5b"},{l:"Media/Dip",v:fcEUR(ta/E.length),c:"#9b6ec9"},{l:"Gg Malattia",v:totalMl,c:"#d4a94e"},{l:"Premio 50%",v:ml50,c:"#856404"},{l:"Premio 0%",v:ml0,c:"#721c24"},{l:"BDG Ridotto ("+Math.round(PARAMS.bdg60mult*100)+"%)",v:ridCount,c:"#c9a96e"}].forEach(function(c){
    h+='<div class="cd"><div style="font-size:9px;color:#a09a92;font-weight:600;text-transform:uppercase;letter-spacing:1px">'+c.l+'</div><div style="font-size:18px;font-weight:800;margin-top:3px;color:'+c.c+'">'+c.v+"</div></div>"});h+="</div>";
  h+='<div class="wg"><div class="wg-title">% Raggiungimento KPI \u2014 EUR</div><div class="wg-grid">';
  IT.forEach(function(it){if(it.k==="ra"&&!PARAMS.artEnabled)return;var s=kpiStats[it.k];if(!s||s.eligible===0)return;var pct=Math.round(s.achieved/s.eligible*100);
    h+='<div class="wg-item"><div class="wg-val" style="color:'+it.c+'">'+pct+'%</div><div class="wg-label">'+it.l+" ("+s.achieved+"/"+s.eligible+')</div><div class="wg-bar"><div class="wg-bar-fill" style="width:'+pct+"%;background:"+it.c+'"></div></div><div style="font-size:9px;color:#a09a92;margin-top:2px">'+fcEUR(s.total)+"</div></div>"});h+="</div></div>";
  function thS(c,l){var ar=aSort.col===c?(aSort.dir>0?"\u25b2":"\u25bc"):"\u25b4";return'<th data-ac="'+c+'"'+(aSort.col===c?' class="sorted"':"")+">"+l+' <span class="arrow">'+ar+"</span></th>"}
  var showWG=MODE==="consuntivo";
  h+='<div style="overflow-x:auto"><table id="atbl"><thead><tr>'+thS("nm","Gruppo")+thS("n","N")+thS("t","Tot \u20ac")+"<th></th>"+thS("av","Media")+thS("b","BDG")+thS("d","Dig")+thS("sy","SY")+thS("p","Priv")+thS("sa","SAS")+(PARAMS.artEnabled?thS("ar","Art"):"")+thS("vi","Vis")+thS("ag","Agg")+(showWG?thS("wg","WG"):"")+thS("ml","Mal\u00d8")+"</tr></thead><tbody>";
  arr.forEach(function(a){var pc=Math.min(a.t/mx*100,100);h+='<tr><td style="font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(a.nm)+'</td><td style="color:#8a8680">'+a.n+'</td><td class="mn b">'+fcEUR(a.t)+'</td><td><div class="mb"><div class="mf" style="width:'+pc+'%;background:#c9a96e"></div></div></td><td class="mn" style="color:#8a8680">'+fcEUR(a.av)+"</td>";
    var kpiCols=PARAMS.artEnabled?[a.b,a.d,a.sy,a.p,a.sa,a.ar,a.vi,a.ag]:[a.b,a.d,a.sy,a.p,a.sa,a.vi,a.ag];
    if(showWG)kpiCols=kpiCols.concat([a.wg]);
    kpiCols.forEach(function(v){h+='<td class="mn" style="color:'+(v>0?"#2d7a3a":"#d5d0c8")+'">'+fcEUR(v)+"</td>"});
    h+='<td class="mn" style="color:'+(a.ml>0?"#856404":"#d5d0c8")+'">'+a.ml.toFixed(1)+"</td></tr>"});
  h+="</tbody></table></div>";
  // USA section: summary widget after table
  if(aG==="usa"&&hasUSAEmps){
    var usaEmps=E.filter(function(e){return isUSA(e.si,e);});
    var usaTot=0,usaDeptCount=0,usaBSCount=0;
    usaEmps.forEach(function(e){
      var ud3=(D.usa||{})[e.m]||{};
      var isDeptUSA3=ud3.isDept||(STORE_FLAGS[String(e.si)]&&STORE_FLAGS[String(e.si)].usaDept);
      if(isDeptUSA3)usaDeptCount++;else usaBSCount++;
      usaTot+=calcEUR(e);
    });
    var storeMap={};
    usaEmps.forEach(function(e){var s=String(e.si);if(!storeMap[s]){storeMap[s]={name:e.s,n:0,tot:0,cm:[]};} storeMap[s].n++;storeMap[s].tot+=calcEUR(e);var ud3=(D.usa||{})[e.m]||{};if(ud3.cm)storeMap[s].cm.push((ud3.cm*100).toFixed(2)+"%");});
    h+='<div class="wg" style="margin-top:16px"><div class="wg-title">&#127482;&#127480; Riepilogo USA</div><div class="cg">';
    [{l:"Dipendenti USA",v:usaEmps.length,c:"#c9a96e"},{l:"Boggi Street",v:usaBSCount,c:"#5ba4cf"},{l:"Dept Stores",v:usaDeptCount,c:"#2d7a3a"},{l:"Tot Commissioni (EUR)",v:MODE==="preventivo"?"n/d":fcEUR(usaTot),c:"#9b6ec9"}].forEach(function(c){
      h+='<div class="cd"><div style="font-size:9px;color:#a09a92;font-weight:600;text-transform:uppercase;letter-spacing:1px">'+c.l+'</div><div style="font-size:18px;font-weight:800;margin-top:3px;color:'+c.c+'">'+c.v+"</div></div>";
    });
    h+='</div>';
    h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:10px"><thead><tr style="background:#2c2925;color:#c9a96e"><th style="padding:6px 10px;text-align:left">Negozio</th><th style="text-align:center;padding:6px 8px">Dip.</th><th style="text-align:center;padding:6px 8px">Tipo</th><th style="text-align:right;padding:6px 10px">Commissioni (EUR)</th></tr></thead><tbody>';
    Object.keys(storeMap).sort().forEach(function(sid){
      var st=storeMap[sid];
      var isDeptSt=STORE_FLAGS[sid]&&STORE_FLAGS[sid].usaDept;
      h+='<tr style="border-bottom:1px solid #f0ece8"><td style="padding:5px 10px;font-weight:600">'+esc(st.name)+'</td><td style="text-align:center;padding:5px 8px;color:#8a8680">'+st.n+'</td><td style="text-align:center;padding:5px 8px"><span style="font-size:10px;background:'+(isDeptSt?"#d4edda":"#e8f4fd")+';color:'+(isDeptSt?"#155724":"#1a4f6e")+';padding:2px 6px;border-radius:3px">'+(isDeptSt?"DEPT":"BOGGI ST.")+'</span></td><td style="text-align:right;padding:5px 10px;font-weight:700">'+(MODE==="preventivo"?'<span style="color:#a09a92;font-size:10px">calcolato a cons.</span>':fcEUR(st.tot))+'</td></tr>';
    });
    h+='</tbody></table>';
    if(MODE==="preventivo")h+='<div style="margin-top:10px;padding:10px;background:#fff3cd;border-radius:5px;font-size:10px;color:#856404">&#9888; Premio USA calcolato a consuntivo. In preventivo non è possibile stimare il fatturato individuale/negozio.</div>';
    h+='</div>';
  }

  document.getElementById("p2").innerHTML=h+renderMonitorSection();
  document.querySelectorAll(".gbtn[data-g]").forEach(function(b){b.onclick=function(){aG=b.getAttribute("data-g");rA()}});
  document.querySelectorAll("#atbl th[data-ac]").forEach(function(th){th.onclick=function(){var c=th.getAttribute("data-ac");if(aSort.col===c)aSort.dir*=-1;else{aSort.col=c;aSort.dir=-1}rA()}});
}
rA();
