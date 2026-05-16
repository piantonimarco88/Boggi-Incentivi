function rC(){
  applyStoreFlags();
  rebuildFilters();
  if(PRIZE_MODE==="fcvm"){rCFcvm();return;}
  if(PRIZE_MODE==="seasonal"){rCSeasonal();return;}
  var mL=MODE==="preventivo"?'<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">\u26a0 PREVENTIVO</span>':'';
  mL+=' <button class="exp-btn" onclick="exportExcel()" style="font-size:10px;padding:4px 12px">&#128202; Export Excel</button>';
  if(MODE==="consuntivo")mL+=' <button class="exp-btn" onclick="saveMonitorSnap()" style="font-size:10px;padding:4px 12px;border-color:#5bb98c;color:#2d7a3a">&#128229; Salva per Monitor</button>';
  if(REGION==="international"&&MODE==="consuntivo")mL+=' <button class="exp-btn" onclick="exportExcelUSA()" style="font-size:10px;padding:4px 12px;border-color:#c9a96e;color:#c9a96e">&#127482;&#127480; Export Excel USA</button>';
  var fl=E.filter(function(e){if(cF.j!=="ALL"&&e.j!==cF.j)return false;if(cF.s!=="ALL"&&e.s!==cF.s)return false;
    if(cF.q){var q=cF.q.toLowerCase();return(e.c&&e.c.toLowerCase().indexOf(q)>=0)||(e.n&&e.n.toLowerCase().indexOf(q)>=0)||(e.m&&e.m.toLowerCase().indexOf(q)>=0)||(e.s&&e.s.toLowerCase().indexOf(q)>=0)}return true});
  fl.sort(function(a,b){var va,vb,col=cSort.col;
    if(col==="si_m"){var sa=Number(a.si)||0,sb=Number(b.si)||0;if(sa!==sb)return(sa-sb)*cSort.dir;va=(a.m||"").toLowerCase();vb=(b.m||"").toLowerCase();return va<vb?-1:va>vb?1:0}
    if(col==="tl"){va=calcE(a);vb=calcE(b)}else if(col==="ml"){va=a.ml||0;vb=b.ml||0}else if("cnsmj".indexOf(col)>=0&&col.length<=2){va=(a[col]||"").toLowerCase();vb=(b[col]||"").toLowerCase();return va<vb?-cSort.dir:va>vb?cSort.dir:0}
    else{va=getVal(a,col)*sickMult(a.ml);vb=getVal(b,col)*sickMult(b.ml)}return(va-vb)*cSort.dir});
  var tot=0;fl.forEach(function(e){tot+=calcEUR(e)});
  var h=mL+'<div class="flt"><input placeholder="Cerca..." id="cq" value="'+esc(cF.q)+'">';
  h+='<select id="cj">';uJ.forEach(function(j){h+='<option value="'+esc(j)+'"'+(cF.j===j?" selected":"")+">"+(j==="ALL"?"Tutti i ruoli":esc(j))+"</option>"});h+="</select>";
  h+='<select id="cs">';uS.forEach(function(s){h+='<option value="'+esc(s)+'"'+(cF.s===s?" selected":"")+">"+(s==="ALL"?"Tutti i negozi":esc(s))+"</option>"});h+="</select>";
  h+='<span style="font-size:11px;color:#8a8680">'+fl.length+" dip. \u00b7 Tot: "+fc(tot,"EUR")+"</span></div>";
  function thS(col,label){var ar=cSort.col===col?(cSort.dir>0?"\u25b2":"\u25bc"):"\u25b4";return'<th data-col="'+col+'"'+(cSort.col===col?' class="sorted"':"")+">"+label+' <span class="arrow">'+ar+"</span></th>"}
  h+='<div class="scroll-wrap"><table id="ctbl"><thead><tr>'+thS("m","Matr.")+thS("c","Cognome")+thS("n","Nome")+thS("si_m","Negozio")+thS("j","Ruolo")+'<th>Val.</th>'+thS("ml","Mal.")+'<th style="cursor:default;color:#c9a96e" title="Premio BDG moltiplicatore ridotto ('+Math.round(PARAMS.bdg60mult*100)+'%)">Rid.</th>';
  IT.forEach(function(it){if(it.k==="ra"&&!PARAMS.artEnabled)return;h+=thS(it.k,it.l)});h+='<th>Agg.</th>'+thS("tl","TOTALE")+(MODE==="consuntivo"?'<th style="cursor:default;font-size:9px;text-align:center" title="Riconosci premio BDG al 100%">100%</th><th style="cursor:default;font-size:9px;text-align:center" title="Riconosci Molt. ridotto ('+Math.round(PARAMS.bdg60mult*100)+'%)">B60</th><th style="cursor:default;font-size:9px;text-align:center" title="Riconosci Workgame ('+Math.round((PARAMS.workgamePct||0)*100)+'% BDG)">WG</th>':'')+' <th style="cursor:default">PS</th>'+(REGION!=="italia"?'<th style="cursor:default">&#128231;</th>':'')+"</tr></thead><tbody>";
  fl.forEach(function(e){var t=calcE(e),cu=e.cu||"EUR",ml=e.ml||0,sm=sickMult(ml),at=aggTotal(e.m);
    var mlc=ml===0?"ml-0":ml<SICK_50?"ml-0":ml<SICK_0?"ml-low":"ml-high";
    var psOn=e.ps==="SI";
    var sf=STORE_FLAGS[String(e.si)]||{};
    var uUp=e.cu==="USD";
    h+='<tr class="ck" data-m="'+esc(e.m)+'"><td class="mn">'+esc(e.m)+"</td><td>"+(uUp?esc(e.c).toUpperCase():esc(e.c))+"</td><td>"+(uUp?esc(e.n).toUpperCase():esc(e.n))+'</td><td style="font-size:10px;color:#8a8680">'+(uUp?esc(e.s).toUpperCase():esc(e.s))+'</td><td><span class="bg '+(sf.dept?"bg-d":"bg-n")+'" title="'+esc(e.j)+'">'+esc(e.f||e.j)+"</span></td>";
    h+='<td style="font-size:9px;color:#a09a92">'+cu+'</td><td style="text-align:center"><span class="ml-dot '+mlc+'"></span>'+ml+"</td>";
    var ridotto=!psOn&&t>0&&isRidotto(e)&&isOn(e.j,"rb");
    h+='<td style="text-align:center;font-size:13px" title="'+(ridotto?"Premio BDG ridotto ("+Math.round(PARAMS.bdg60mult*100)+"%)":"—")+'">'+(ridotto?'<span style="color:#c9a96e">&#11044;</span>':'—')+"</td>";
    IT.forEach(function(it){if(it.k==="ra"&&!PARAMS.artEnabled)return;var on=it.k==="vi"?true:isOn(e.j,it.k),raw=getVal(e,it.k),val=on?raw*sm:0;
      h+='<td class="r mn '+(val>0&&!psOn?"g":"gy")+'"'+(on?"":" style=\"text-decoration:line-through;opacity:.3\"")+">"+(val>0?fc(psOn?0:val,cu):"\u2014")+"</td>"});
    h+='<td class="r mn" style="color:'+(at>0?"#c9a96e":"#d5d0c8")+'">'+(at>0?fc(psOn?0:at,cu):"\u2014")+"</td>";
    h+='<td class="r mn b" style="color:'+(t>0&&!psOn?"#2c2925":"#b0a99f")+'">'+fc(psOn?0:t,cu)+"</td>";
    if(MODE==="consuntivo"){h+='<td style="text-align:center"><button class="tb '+(e.ov_b100==="SI"?"x":"o")+'" data-ov-b100="'+esc(e.m)+'" style="width:28px;height:16px" title="BDG 100%" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';h+='<td style="text-align:center"><button class="tb '+(e.ov_rid==="SI"?"x":"o")+'" data-ov-rid="'+esc(e.m)+'" style="width:28px;height:16px" title="BDG ridotto" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';h+='<td style="text-align:center"><button class="tb '+(e.ov_wg==="SI"?"x":"o")+'" data-ov-wg="'+esc(e.m)+'" style="width:28px;height:16px" title="Workgame" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';}
    h+='<td style="text-align:center"><button class="tb '+(psOn?"x":"o")+'" data-ps="'+esc(e.m)+'" style="width:28px;height:16px" onclick="event.stopPropagation()"><span class="tk" style="width:10px;height:10px;top:3px"></span></button></td>';
    if(REGION!=="italia")h+='<td style="text-align:center;padding:1px">'+(e.mp&&e.mp.indexOf("@")>0?'<button class="exp-btn" onclick="event.stopPropagation();sendOneEmployeeMail(\''+esc(e.m)+'\')" style="padding:2px 7px;font-size:11px;min-width:0" title="Apri email per '+esc(e.n)+'">&#128231;</button>':'<span style="color:#6b6560;font-size:10px">—</span>')+'</td>';
    h+="</tr>"});
  h+="</tbody></table></div><div id='cd'></div>";
  document.getElementById("p0").innerHTML=h;
  document.getElementById("cq").oninput=function(){cF.q=this.value;var el=this,pos=el.selectionStart;rC();var el2=document.getElementById("cq");if(el2){el2.focus();el2.selectionStart=el2.selectionEnd=pos}};
  document.getElementById("cj").onchange=function(){cF.j=this.value;rC()};
  document.getElementById("cs").onchange=function(){cF.s=this.value;rC()};
  document.querySelectorAll("#ctbl th[data-col]").forEach(function(th){th.onclick=function(){var c=th.getAttribute("data-col");if(cSort.col===c)cSort.dir*=-1;else{cSort.col=c;cSort.dir=c==="si_m"?1:-1}rC()}});
  document.querySelectorAll("#p0 tr.ck").forEach(function(row){row.onclick=function(){
    var mm=row.getAttribute("data-m"),emp;for(var j=0;j<E.length;j++){if(E[j].m===mm){emp=E[j];break}}if(!emp)return;
    var rr=gR(emp),cu=emp.cu||"EUR",d='<div class="dp"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div><div style="font-size:16px;font-weight:700;color:#2c2925">'+esc(emp.n)+" "+esc(emp.c)+'</div><div style="font-size:12px;color:#8a8680">'+esc(emp.m)+" \u00b7 "+esc(emp.s)+" \u00b7 "+esc(emp.f||emp.j)+'</div></div><button style="background:none;border:none;font-size:18px;cursor:pointer;color:#b0a99f" onclick="document.getElementById(\'cd\').innerHTML=\'\'">&#10005;</button></div>';
    rr.forEach(function(r){d+='<div class="rs"><span class="'+(r.t==="success"?"bg-s":r.t==="fail"?"bg-f":r.t==="warn"?"bg-w":"bg-i")+'">'+(r.t==="success"?"\u2713":r.t==="fail"?"\u2717":"!")+'</span><span style="font-size:12px;line-height:1.4">'+r.x+"</span></div>"});
    d+='<div style="margin-top:12px;padding:14px;background:#2c2925;border-radius:6px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:9px;color:#a09a92;text-transform:uppercase;letter-spacing:2px">Totale</div><div style="font-size:22px;font-weight:800;color:#c9a96e">'+fc(calcE(emp),cu)+"</div></div></div>";
    document.getElementById("cd").innerHTML=d}});
  // PS toggle bindings - preserve scroll position
  document.querySelectorAll("button[data-ps]").forEach(function(btn){btn.onclick=function(ev){
    ev.stopPropagation();var m=btn.getAttribute("data-ps");
    var sw=document.querySelector(".scroll-wrap");var scrollTop=sw?sw.scrollTop:0;
    for(var j=0;j<E.length;j++){if(E[j].m===m){E[j].ps=E[j].ps==="SI"?"NO":"SI";break}}
    rC();rA();
    var sw2=document.querySelector(".scroll-wrap");if(sw2)sw2.scrollTop=scrollTop}});
  function _ovToggle(attr,prop){document.querySelectorAll("button["+attr+"]").forEach(function(btn){btn.onclick=function(ev){ev.stopPropagation();var m=btn.getAttribute(attr);var sw=document.querySelector(".scroll-wrap");var scrollTop=sw?sw.scrollTop:0;for(var j=0;j<E.length;j++){if(E[j].m===m){E[j][prop]=E[j][prop]==="SI"?"NO":"SI";break}}rC();rA();var sw2=document.querySelector(".scroll-wrap");if(sw2)sw2.scrollTop=scrollTop}});}
  _ovToggle("data-ov-b100","ov_b100");
  _ovToggle("data-ov-rid","ov_rid");
  _ovToggle("data-ov-wg","ov_wg");
}
rC();
updateAggiunteTabVisibility();

// === EXPORT EXCEL (matching TESTATA template) ===
function exportExcel(){
  var headers=["MONTH","STORE ID","DESCR FILIALE","MATRICOLA DIPENDENTE","COGNOME","NOME","TIPO CONTRATTO","JOB","RML","CONCATENA","IMPORTO BDG","IMPORTO BDG1","BDG","FIELD COACH","FIELD","STORE ID2","DESCR FILIALE2","CF","TOTALE STIPENDIO COSTO AZIENDA","TOTALE INCENTIVO LORDO","TOTALE INCENTIVO COSTO AZIENDA","RISULTATO PREMIO BDG (LORDO)","RISULTATO PREMIO BDG (NETTO)","RISULTATO PREMIO DIGITAL","RISULTATO SHOPPER YIELD","RISULTATO NUOVE PRIVILEGE","RISULTATO SAS","RISULTATO DCC","RISULTATO CUSTOMER SERVICE","RISULTATO ARTICOLI INCENTIVATI","MALATTIE","VISUAL IN STORE","TOTALE INCENTIVO LORDO","TOTALE INCENTIVO NETTO","TOTALE INCENTIVO COSTO AZIENDA","TARGET TOP SA","FATTURATO PERSONALE CY TOP SA","INCENTIVO TOP SALES ADVISOR","INCENTIVO SEMESTRALE","TOTALE INCENTIVO EROGATO (LC)","TOTALE INCENTIVO EROGATO (EURO)","TOTALE COSTO AZIENDA","TOP SALES ADVISOR","ENTE","RML EURO","RISULTATO PREMIO BDG (LORDO) EURO","RISULTATO PREMIO BDG (NETTO) EURO","RISULTATO PREMIO DIGITAL EURO","RISULTATO SHOPPER YIELD EURO","RISULTATO NUOVE PRIVILEGE EURO","RISULTATO SAS EURO","RISULTATO DCC EURO","RISULTATO CUSTOMER SERVICE EURO","RISULTATO ARTICOLI INCENTIVATI EURO","VISUAL IN STORE EURO","MALATTIE","DOPPIO BDG","DOPPIO BDG LC","DOPPIO BDG EURO","TOP SALES ADVISOR EURO","SEMESTRALE EURO"];
  var rows=[headers];
  E.forEach(function(e){
    if(e.ps==="SI")return;
    var sm=sickMult(e.ml),ex=e.ex||1;
    var rbn=0;
    var rb=isOn(e.j,"rb")?getVal(e,"rb")*sm:0;
    var rd=isOn(e.j,"rd")?getVal(e,"rd")*sm:0;
    var rs=isOn(e.j,"rs")?getVal(e,"rs")*sm:0;
    var rp=isOn(e.j,"rp")?getVal(e,"rp")*sm:0;
    var rsa=isOn(e.j,"rsa")?getVal(e,"rsa")*sm:0;
    var rdc=isOn(e.j,"rdc")?getVal(e,"rdc")*sm:0;
    var rcs=isOn(e.j,"rcs")?(getVal(e,"rcs")||0)*sm:0;
    var ra=PARAMS.artEnabled&&isOn(e.j,"ra")?getVal(e,"ra")*sm:0;
    var vi=(getVal(e,"vi")||0)*sm,pq=isOn(e.j,"pq")?(getVal(e,"pq")||0)*sm:0;
    var wg=(MODE==="consuntivo"&&e.ov_wg==="SI"&&isOn(e.j,"rb"))?Math.round(e.ib*(PARAMS.workgamePct||0)*100)/100:0;
    var at=aggTotal(e.m);
    // Add aggiunte per-KPI
    var ag=AGG[e.m]||{};
    rb+=(ag.rb||0);rbn+=(ag.rbn||0);rd+=(ag.rd||0);rs+=(ag.rs||0);rp+=(ag.rp||0);rsa+=(ag.rsa||0);rdc+=(ag.rdc||0);rcs+=(ag.rcs||0);ra+=(ag.ra||0);
    var totLordo=rb+rbn+rd+rs+rp+rsa+rdc+rcs+ra+vi+pq+wg;
    var totLC=totLordo;var totEUR=totLC*ex;
    var r=[
      CFG_MONTH,                 // MONTH
      e.si,                     // STORE ID
      e.s,                      // DESCR FILIALE
      e.m,                      // MATRICOLA
      e.c,                      // COGNOME
      e.n,                      // NOME
      e.j,                      // TIPO CONTRATTO (using job as proxy)
      e.f||e.j,                 // JOB
      e.rl,                     // RML
      e.si+"_"+e.m,             // CONCATENA
      e.ib,                     // IMPORTO BDG
      e.ib,                     // IMPORTO BDG1
      e.ib,                     // BDG
      e.fc,                     // FIELD COACH
      "",                       // FIELD
      e.si,                     // STORE ID2
      e.s,                      // DESCR FILIALE2
      "",                       // CF
      0,                        // TOT STIPENDIO COSTO AZIENDA
      totLordo,                 // TOT INCENTIVO LORDO
      0,                        // TOT INCENTIVO COSTO AZIENDA
      rb,                       // RISULTATO BDG LORDO
      rbn,                      // RISULTATO BDG NETTO
      rd,                       // RISULTATO DIGITAL
      rs,                       // RISULTATO SY
      rp,                       // RISULTATO PRIVILEGE
      rsa,                      // RISULTATO SAS
      rdc,                      // RISULTATO DCC
      rcs,                      // RISULTATO CS
      ra,                       // RISULTATO ARTICOLI
      e.ml||0,                  // MALATTIE
      vi,                       // VISUAL IN STORE
      totLordo,                 // TOT INCENTIVO LORDO (repeat)
      0,                        // TOT INCENTIVO NETTO
      0,                        // TOT INCENTIVO COSTO AZIENDA
      0,                        // TARGET TOP SA
      0,                        // FATTURATO PERSONALE CY
      0,                        // INCENTIVO TOP SA
      0,                        // INCENTIVO SEMESTRALE
      totLC,                    // TOT EROGATO LC
      totEUR,                   // TOT EROGATO EURO
      0,                        // TOT COSTO AZIENDA
      0,                        // TOP SALES ADVISOR
      e.en||210,                // ENTE
      e.rl*ex,                  // RML EURO
      rb*ex,                    // BDG LORDO EURO
      rbn*ex,                   // BDG NETTO EURO
      rd*ex,                    // DIGITAL EURO
      rs*ex,                    // SY EURO
      rp*ex,                    // PRIVILEGE EURO
      rsa*ex,                   // SAS EURO
      rdc*ex,                   // DCC EURO
      rcs*ex,                   // CS EURO
      ra*ex,                    // ARTICOLI EURO
      vi*ex,                    // VISUAL EURO
      e.ml||0,                  // MALATTIE (repeat)
      0,                        // DOPPIO BDG
      0,                        // DOPPIO BDG LC
      0,                        // DOPPIO BDG EURO
      0,                        // TOP SA EURO
      0                         // SEMESTRALE EURO
    ];
    rows.push(r);
  });
  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Consuntivo");
  XLSX.writeFile(wb,"Incentivi_"+MODE+"_"+getPdfSubfolder().base+".xlsx");
}

function exportExcelUSA(){
  // Solo dipendenti USD (USA)
  var usaEmps=E.filter(function(e){return e.cu==="USD";});
  if(!usaEmps.length){alert("Nessun dipendente USA presente.");return;}

  var headers=[
    "EMPLOYEE ID",
    "FIRST NAME",
    "LAST NAME",
    "ROLE",
    "STORE SALES TARGET (USD)",
    "STORE SALES ACTUAL (USD)",
    "PERSONAL SALES (USD)",
    "COMMISSION RATE (%)",
    "COMMISSION MULTIPLIER (%)",
    "COMMISSION EARNED (USD)"
  ];
  var rows=[headers];

  usaEmps.forEach(function(e){
    if(e.ps==="SI")return;
    var sid=String(e.si);
    var tg=D.t[sid]||{};
    var cn=D.c[sid]||{};
    var ud=(D.usa||{})[e.m]||{};
    var job=e.f||e.j||"";
    var rp=USA_P[job]||{noTargetMult:0.4,targetMult:1.0,useStore:false};
    var usaDept=ud.isDept||(STORE_FLAGS[sid]&&STORE_FLAGS[sid].usaDept);
    var useStoreSales=rp.useStore||usaDept;

    // Store hit logic
    var storePct=tg.to>0?(cn.sc||0)/tg.to:0;
    var storeHit=(tg.to>0&&cn.sc)?storePct>=PARAMS.bdg100:(ud.sb===1);
    var mult=storeHit?rp.targetMult:rp.noTargetMult;

    // Base for calculation
    var base=useStoreSales?(cn.sc||0):(ud.ps||0);
    var prize=Math.round(base*(ud.cm||0)*mult*100)/100;

    // Personal sales: present only if premio on personal sales
    var personalSales=(!useStoreSales&&(ud.ps||0)>0)?ud.ps:"";

    rows.push([
      e.m,                                  // EMPLOYEE ID (matricola sintetica)
      (e.n||"").toUpperCase(),              // FIRST NAME
      (e.c||"").toUpperCase(),              // LAST NAME
      (e.f||e.j||"").toUpperCase(),         // ROLE
      tg.to||0,                             // STORE SALES TARGET
      cn.sc||0,                             // STORE SALES ACTUAL
      personalSales,                        // PERSONAL SALES (solo se usato per il premio)
      Math.round((ud.cm||0)*10000)/100,     // COMMISSION RATE %
      Math.round(mult*10000)/100,           // COMMISSION MULTIPLIER %
      prize                                 // COMMISSION EARNED USD
    ]);
  });

  var ws=XLSX.utils.aoa_to_sheet(rows);
  // Colonne numeriche: larghezza
  ws['!cols']=[{wch:22},{wch:16},{wch:16},{wch:10},{wch:22},{wch:22},{wch:18},{wch:18},{wch:22},{wch:20}];
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"USA Commissions");
  XLSX.writeFile(wb,"USA_Commissions_"+getPdfSubfolder().base+".xlsx");
}
