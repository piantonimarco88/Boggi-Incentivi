function rC(){
  applyStoreFlags();
  rebuildFilters();
  if(PRIZE_MODE==="fcvm"){rCFcvm();return;}
  if(PRIZE_MODE==="seasonal"){rCSeasonal();return;}
  var mL=MODE==="preventivo"?'<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">\u26a0 PREVENTIVO</span>':'';
  mL+=' <button class="exp-btn" onclick="exportExcel()" style="font-size:10px;padding:4px 12px">&#128202; Export Excel</button>';
  if(MODE==="consuntivo")mL+=' <button class="exp-btn btn-lgreen" onclick="saveMonitorSnap()" style="font-size:10px;padding:4px 12px">&#128229; Salva per Monitor</button>';
  if(REGION==="italia"&&MODE==="consuntivo")mL+=' <button class="exp-btn btn-blue" onclick="exportExcelConsuntivoIT()" style="font-size:10px;padding:4px 12px">&#128202; Export Consuntivo IT</button>';
  if(REGION==="international"&&MODE==="consuntivo")mL+=' <button class="exp-btn btn-amber" onclick="exportExcelUSA()" style="font-size:10px;padding:4px 12px">&#127482;&#127480; Export Excel USA</button>';
  if(MODE==="consuntivo"&&typeof sasNewActive==='function'&&sasNewActive())mL+=' <button class="exp-btn btn-violet" onclick="exportSasJsonStores()" style="font-size:10px;padding:4px 12px" title="JSON con target/consuntivo/SAS per negozio, per import in statistiche">&#128202; Esporta SAS Negozi (JSON)</button>';
  if(MODE==="consuntivo"&&typeof sasNewActive==='function'&&sasNewActive())mL+=' <button class="exp-btn" onclick="exportSasReserveStores()" style="font-size:10px;padding:4px 12px" title="Excel con la riserva SAS non utilizzata questo mese, da ricaricare il mese prossimo (Carica Excel Results)">&#128230; Esporta Riserva SAS Negozi</button>';
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
    var _negCell;
    if(_storeEditMatr===e.m){
      var _stOpts='';_allStoresList().forEach(function(st){_stOpts+='<option value="'+esc(String(st.si))+'"'+(String(st.si)===String(e.si)?' selected':'')+'>'+esc(st.s)+'</option>'});
      _negCell='<select onclick="event.stopPropagation()" onchange="event.stopPropagation();changeEmployeeStore(\''+esc(e.m)+'\',this.value)" style="font-size:9px;padding:2px 4px;border:1px solid #d5d0c8;border-radius:3px;max-width:150px;font-family:inherit">'+_stOpts+'</select><button onclick="event.stopPropagation();cancelEditStore()" style="background:none;border:none;color:#a09a92;cursor:pointer;font-size:11px;margin-left:2px;padding:0" title="Annulla">&#10005;</button>';
    }else{
      _negCell=(uUp?esc(e.s).toUpperCase():esc(e.s))+'<button onclick="event.stopPropagation();startEditStore(\''+esc(e.m)+'\')" style="background:none;border:none;color:#a09a92;cursor:pointer;font-size:10px;margin-left:4px;padding:0" title="Cambia negozio">&#9998;</button>';
    }
    h+='<tr class="ck" data-m="'+esc(e.m)+'"><td class="mn">'+esc(e.m)+"</td><td>"+(uUp?esc(e.c).toUpperCase():esc(e.c))+"</td><td>"+(uUp?esc(e.n).toUpperCase():esc(e.n))+'</td><td style="font-size:10px;color:#8a8680;white-space:nowrap">'+_negCell+'</td><td><span class="bg '+(sf.dept?"bg-d":"bg-n")+'" title="'+esc(e.j)+'">'+esc(e.f||e.j)+"</span></td>";
    h+='<td style="font-size:9px;color:#a09a92">'+cu+'</td><td style="text-align:center"><span class="ml-dot '+mlc+'"></span>'+ml+"</td>";
    var ridotto=!psOn&&t>0&&isRidotto(e)&&isOn(e.j,"rb");
    h+='<td style="text-align:center;font-size:13px" title="'+(ridotto?"Premio BDG ridotto ("+Math.round(PARAMS.bdg60mult*100)+"%)":"—")+'">'+(ridotto?'<span style="color:#c9a96e">&#11044;</span>':'—')+"</td>";
    IT.forEach(function(it){if(it.k==="ra"&&!PARAMS.artEnabled)return;var on=it.k==="vi"?true:isOn(e.j,it.k),raw=getVal(e,it.k),val=on?raw*sm:0;
      // SAS azzerato per soglia % accettati non raggiunta \u2192 mostra "0" in rosso con tooltip
      if(it.k==="rsa"&&on&&!psOn&&sasZeroByAcc(e)){
        var cnSA=(D.c[String(e.si)]||{}).sa;
        var saTxt=(cnSA==null)?"n/d":((cnSA*100).toFixed(0)+"%");
        var tipSA="SAS azzerato: % accettati ("+saTxt+") sotto soglia "+Math.round(PARAMS.sasMinAccPct*100)+"%";
        h+='<td class="r mn b" style="color:#cf5b5b" title="'+esc(tipSA)+'">0</td>';
        return;
      }
      var _cellVal=val>0?fc(psOn?0:val,cu):"\u2014";
      if(it.k==="rb"&&e.ibFromAY&&val>0&&!psOn)_cellVal+='<sup style="font-size:7px;color:#c9a96e;font-weight:700;margin-left:2px" title="BDG NETTO \u2014 pagato come TRASFERTE (cod. 380)">N</sup>';
      // Indicatore SAS sul BDG (da luglio 2026): SAS applicato al fatturato verso il target
      if(it.k==="rb"&&!psOn&&typeof storeSasInfo==='function'&&sasNewActive()){
        var _siC=storeSasInfo(String(e.si));
        if(_siC&&_siC.active&&(_siC.used>0||(_siC.reserveIn||0)>0)){
          // Riserva mese prec. consumata PRIMA per colmare il gap (vedi sasReserveCalc):
          // quanto ne \u00e8 stato usato si ricava cos\u00ec, coerente col box SAS in lettera.
          var _resInUsedC=Math.min(_siC.reserveIn||0,_siC.used||0);
          var _resInExpC=(_siC.reserveIn||0)-_resInUsedC;
          var _tipS="SAS applicato al fatturato: "+fc(_siC.used,cu)+(_siC.pctMatrix!=null?(" \u2014 "+Math.round(_siC.pctMatrix*100)+"% di "+fc(_siC.sasv,cu)):"");
          if((_siC.reserveIn||0)>0)_tipS+=" \u2014 Riserva mese prec.: "+fc(_siC.reserveIn,cu)+" (usata "+fc(_resInUsedC,cu)+(_resInExpC>0?(", scaduta "+fc(_resInExpC,cu)):"")+")";
          if(_siC.reserveOut>0)_tipS+=" \u2014 Riserva riportata: "+fc(_siC.reserveOut,cu);
          _cellVal+='<sup style="font-size:7px;color:#a07d2c;font-weight:700;margin-left:2px" title="'+esc(_tipS)+'">S</sup>';
        }
      }
      h+='<td class="r mn '+(val>0&&!psOn?"g":"gy")+'"'+(on?"":" style=\"text-decoration:line-through;opacity:.3\"")+">"+_cellVal+"</td>"});
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
try{ rC(); }catch(_e){ try{setTimeout(rC,0)}catch(_e2){} }
try{ updateAggiunteTabVisibility(); }catch(_e){ try{setTimeout(updateAggiunteTabVisibility,0)}catch(_e2){} }

// === EXPORT EXCEL (matching TESTATA template) ===
function exportExcel(){
  var headers=["MONTH","STORE ID","DESCR FILIALE","MATRICOLA DIPENDENTE","COGNOME","NOME","TIPO CONTRATTO","JOB","RML","CONCATENA","IMPORTO BDG","IMPORTO BDG1","BDG","FIELD COACH","FIELD","STORE ID2","DESCR FILIALE2","CF","TOTALE STIPENDIO COSTO AZIENDA","TOTALE INCENTIVO LORDO","TOTALE INCENTIVO COSTO AZIENDA","RISULTATO PREMIO BDG (LORDO)","RISULTATO PREMIO BDG (NETTO)","RISULTATO PREMIO DIGITAL","RISULTATO SHOPPER YIELD","RISULTATO NUOVE PRIVILEGE","RISULTATO SAS","RISULTATO DCC","RISULTATO CUSTOMER SERVICE","RISULTATO ARTICOLI INCENTIVATI","MALATTIE","VISUAL IN STORE","TOTALE INCENTIVO LORDO","TOTALE INCENTIVO NETTO","TOTALE INCENTIVO COSTO AZIENDA","TARGET TOP SA","FATTURATO PERSONALE CY TOP SA","INCENTIVO TOP SALES ADVISOR","INCENTIVO SEMESTRALE","TOTALE INCENTIVO EROGATO (LC)","TOTALE INCENTIVO EROGATO (EURO)","TOTALE COSTO AZIENDA","TOP SALES ADVISOR","ENTE","RML EURO","RISULTATO PREMIO BDG (LORDO) EURO","RISULTATO PREMIO BDG (NETTO) EURO","RISULTATO PREMIO DIGITAL EURO","RISULTATO SHOPPER YIELD EURO","RISULTATO NUOVE PRIVILEGE EURO","RISULTATO SAS EURO","RISULTATO DCC EURO","RISULTATO CUSTOMER SERVICE EURO","RISULTATO ARTICOLI INCENTIVATI EURO","VISUAL IN STORE EURO","MALATTIE","DOPPIO BDG","DOPPIO BDG LC","DOPPIO BDG EURO","TOP SALES ADVISOR EURO","SEMESTRALE EURO",
    // Massimali erogabili (premio se tutti i target raggiunti al 100%, senza riduzione malattia)
    "MASSIMALE BDG","MASSIMALE DIGITAL","MASSIMALE SHOPPER YIELD","MASSIMALE NUOVE PRIVILEGE","MASSIMALE SAS","MASSIMALE DCC","MASSIMALE CUSTOMER SERVICE","MASSIMALE ARTICOLI INCENTIVATI","MASSIMALE VISUAL IN STORE","MASSIMALE TOTALE",
    "MASSIMALE BDG EURO","MASSIMALE DIGITAL EURO","MASSIMALE SHOPPER YIELD EURO","MASSIMALE NUOVE PRIVILEGE EURO","MASSIMALE SAS EURO","MASSIMALE DCC EURO","MASSIMALE CUSTOMER SERVICE EURO","MASSIMALE ARTICOLI INCENTIVATI EURO","MASSIMALE VISUAL IN STORE EURO","MASSIMALE TOTALE EURO"
  ];
  var rows=[headers];
  E.forEach(function(e){
    if(e.ps==="SI")return;
    var sm=sickMult(e.ml),ex=e.ex||1;
    var rbCalc=isOn(e.j,"rb")?getVal(e,"rb")*sm:0;
    var rb=e.ibFromAY?0:rbCalc;
    var rbn=e.ibFromAY?rbCalc:0;
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
    // ── Massimali: ogni KPI calcolato in preventivo (target=100%, sm=1) ─────
    var _savedMode=MODE;
    var mRb=0,mRd=0,mRs=0,mRp=0,mRsa=0,mRdc=0,mRcs=0,mRa=0,mVi=0;
    try{
      MODE="preventivo";
      mRb=isOn(e.j,"rb")&&!e.ibFromAY?getVal(e,"rb"):0;
      mRd=isOn(e.j,"rd")?getVal(e,"rd"):0;
      mRs=isOn(e.j,"rs")?getVal(e,"rs"):0;
      mRp=isOn(e.j,"rp")?getVal(e,"rp"):0;
      mRsa=isOn(e.j,"rsa")?getVal(e,"rsa"):0;
      mRdc=isOn(e.j,"rdc")?getVal(e,"rdc"):0;
      mRcs=isOn(e.j,"rcs")?(getVal(e,"rcs")||0):0;
      mRa=PARAMS.artEnabled&&isOn(e.j,"ra")?getVal(e,"ra"):0;
      mVi=getVal(e,"vi")||0;
    }catch(ex2){}finally{MODE=_savedMode;}
    var mTot=mRb+mRd+mRs+mRp+mRsa+mRdc+mRcs+mRa+mVi;
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
      0,                        // SEMESTRALE EURO
      // Massimali LC
      mRb, mRd, mRs, mRp, mRsa, mRdc, mRcs, mRa, mVi, mTot,
      // Massimali EURO
      mRb*ex, mRd*ex, mRs*ex, mRp*ex, mRsa*ex, mRdc*ex, mRcs*ex, mRa*ex, mVi*ex, mTot*ex
    ];
    rows.push(r);
  });
  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Consuntivo");
  XLSX.writeFile(wb,"Incentivi_"+MODE+"_"+getPdfSubfolder().fileBase+".xlsx");
}

function exportExcelConsuntivoIT(){
  var headers=["MONTH","STORE ID","DESCR FILIALE","MATRICOLA DIPENDENTE","COGNOME","NOME","JOB","RML","IMPORTO BDG","IMPORTO BDG1","BDG","RISULTATO PREMIO BDG (LORDO)","RISULTATO PREMIO BDG (NETTO)","RISULTATO PREMIO DIGITAL","RISULTATO SHOPPER YIELD","RISULTATO NUOVE PRIVILEGE","RISULTATO SAS","RISULTATO DCC","RISULTATO CUSTOMER SERVICE","RISULTATO ARTICOLI INCENTIVATI","MALATTIE","VISUAL IN STORE"];
  var rows=[headers];
  E.forEach(function(e){
    if(e.ps==="SI")return;
    var sm=sickMult(e.ml);
    var rbCalc=isOn(e.j,"rb")?getVal(e,"rb")*sm:0;
    var rb=e.ibFromAY?0:rbCalc;
    var rbn=e.ibFromAY?rbCalc:0;
    // Workgame: nessun codice payroll dedicato — confluisce nel cod. 225 (PREMIO DI RISULTATO),
    // stessa logica di exportTracciatoPagamenti(). Qui non c'è colonna TOTALE che lo raccolga.
    if(!e.ibFromAY&&MODE==="consuntivo"&&e.ov_wg==="SI"&&isOn(e.j,"rb"))rb+=Math.round(e.ib*(PARAMS.workgamePct||0)*100)/100;
    var rd=isOn(e.j,"rd")?getVal(e,"rd")*sm:0;
    var rs=isOn(e.j,"rs")?getVal(e,"rs")*sm:0;
    var rp=isOn(e.j,"rp")?getVal(e,"rp")*sm:0;
    var rsa=isOn(e.j,"rsa")?getVal(e,"rsa")*sm:0;
    var rdc=isOn(e.j,"rdc")?getVal(e,"rdc")*sm:0;
    var rcs=isOn(e.j,"rcs")?(getVal(e,"rcs")||0)*sm:0;
    var ra=PARAMS.artEnabled&&isOn(e.j,"ra")?getVal(e,"ra")*sm:0;
    var vi=(getVal(e,"vi")||0)*sm;
    var ag=AGG[e.m]||{};
    rb+=(ag.rb||0);rbn+=(ag.rbn||0);rd+=(ag.rd||0);rs+=(ag.rs||0);rp+=(ag.rp||0);rsa+=(ag.rsa||0);rdc+=(ag.rdc||0);rcs+=(ag.rcs||0);ra+=(ag.ra||0);
    rows.push([CFG_MONTH,e.si,e.s,e.m,e.c,e.n,e.f||e.j,e.rl,e.ib,e.ib,e.ib,rb,rbn,rd,rs,rp,rsa,rdc,rcs,ra,e.ml||0,vi]);
  });
  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Consuntivo");
  XLSX.writeFile(wb,"Incentivi_consuntivo_"+getPdfSubfolder().fileBase+".xlsx");
}

// ── Dashboard SAS → Fatturato (HTML scaricabile, standalone) ────────────────
// Template generico condiviso tra la versione Negozi e la versione FC+VM:
// riceve colonne/righe già pronte e produce un file .html autosufficiente,
// filtrabile e ordinabile, senza dipendenze esterne (apribile offline).
// ── Export SAS → Fatturato (JSON, per import nel progetto statistiche) ────
// La dashboard filtrabile vive ora in statistiche; qui produciamo solo il
// JSON con lo schema concordato (meta + columns + rows).
function _downloadJson(payload,filename){
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
}

// Export SAS → Fatturato per negozio (mensile, consuntivo, da luglio 2026)
function exportSasJsonStores(){
  var storeNames={},storeEx={};
  E.forEach(function(e){if(e.si){if(!storeNames[e.si])storeNames[e.si]=e.s||String(e.si);if(storeEx[e.si]===undefined)storeEx[e.si]=e.ex||1;}});
  var sids=Object.keys(storeNames).filter(function(sid){
    if(isUSA(sid,{si:sid,cu:''}))return false; // USA non usa la matrice SAS
    var info=storeSasInfo(sid);
    return info.active&&(info.to>0||info.base>0);
  });
  if(!sids.length){alert("Nessun negozio con dati SAS+fatturato disponibili.\nCarica Target, Risultati BDG e SAS dal tab Fonti Dati.");return;}
  var rows=sids.map(function(sid){
    var info=storeSasInfo(sid);
    var tg=D.t[sid]||{},cn=D.c[sid]||{};
    var ex=storeEx[sid]||1; // conversione in EUR: i dati grezzi (D.t/D.c) sono nella valuta del negozio
    var pctBase=info.to>0?info.base/info.to:0; // include l'esubero fatturato (solo il SAS resta escluso), NON tocca actual
    var pctFinal=info.pct;
    var determinante=pctBase<PARAMS.bdg100&&pctFinal>=PARAMS.bdg100;
    var esito=pctFinal>=PARAMS.bdg100?"full":(isRidottoStore(sid)?"ridotto":"none");
    var esitoLabel=esito==="full"?"Pieno":(esito==="ridotto"?"Ridotto 60%":"Nessuno");
    // Riserva SAS mese prec. consumata PRIMA per colmare il gap (vedi sasReserveCalc):
    // quanto ne è stato usato si ricava così, stessa formula delle lettere (v9.45+).
    var resInUsed=Math.min(info.reserveIn||0,info.used||0);
    return{sid:sid,name:storeNames[sid],target:Math.round(info.to*ex),
      // actual = consuntivo PURO (esubero escluso, coerente con l'export fcvm): invariante
      // pctFinal*target = actual+esubero+applied (arrotondamenti a parte).
      actual:Math.round((cn.sc||0)*ex),pctBase:pctBase,
      esubero:Math.round((cn.es||0)*ex),targetSY:tg.sy!=null?Math.round(tg.sy*ex*100)/100:null,resultSY:cn.sy!=null?Math.round(cn.sy*ex*100)/100:null,
      sasValue:Math.round((info.sasv||0)*ex),recPct:info.pctMatrix!=null?Math.round(info.pctMatrix*100):null,
      recValue:Math.round((info.recognized||0)*ex),applied:Math.round((info.used||0)*ex),
      esuberoSasPrec:Math.round((info.reserveIn||0)*ex),esuberoSasPrecUsed:Math.round(resInUsed*ex),
      sasReserveNext:Math.round((info.reserveOut||0)*ex),pctFinal:pctFinal,
      esito:esito,esitoLabel:esitoLabel,determinante:determinante};
  });
  var columns=[
    {key:"sid",label:"Store ID",type:"mono"},
    {key:"name",label:"Negozio",type:"text"},
    {key:"target",label:"Target",type:"eur"},
    {key:"actual",label:"Consuntivo",type:"eur"},
    {key:"esubero",label:"Esub. prec.",type:"eur-dash0"},
    {key:"targetSY",label:"Target SY",type:"dec1"},
    {key:"resultSY",label:"Risultato SY",type:"dec1"},
    {key:"pctBase",label:"% senza SAS",type:"pctbar"},
    {key:"sasValue",label:"Valore SAS",type:"eur-muted"},
    {key:"recPct",label:"Riconosciuto",type:"pct0"},
    {key:"recValue",label:"Valore ricon.",type:"eur-muted-dash0"},
    {key:"applied",label:"Applicato",type:"eur-dash0"},
    {key:"esuberoSasPrec",label:"Riserva SAS prec.",type:"eur-dash0"},
    {key:"esuberoSasPrecUsed",label:"Riserva SAS prec. usata",type:"eur-dash0"},
    {key:"sasReserveNext",label:"Riserva SAS riportata",type:"eur-dash0"},
    {key:"pctFinal",label:"% finale",type:"pctbar-badge"},
    {key:"esito",label:"Esito",type:"esitochip"}
  ];
  var payload={
    meta:{kind:"negozi",title:"SAS → Fatturato",
      subtitle:"Negozi "+(REGION==="italia"?"Italia":"International")+" — Consuntivo "+getMonthYearLabel(),
      generatedAt:new Date().toISOString(),source:"BoggiIncentivi",schemaVersion:2},
    columns:columns,
    rows:rows
  };
  _downloadJson(payload,"sas_negozi_"+_sessionFileTag()+".json");
}

// Export SAS → Fatturato per area Field Coach/VM (FC+VM, consuntivo, da luglio 2026)
function exportSasJsonFcvm(){
  var pool=getFcVmPool();
  if(!pool.length){alert("Nessun dato FC+VM caricato.");return;}
  var rows=pool.map(function(emp){
    var r=calcFcVmPremio(emp.m);
    var pureCons=(r.totCons||0)-(r.totSasUsed||0);
    var pctBase=r.totTarget>0?(pureCons+(r.totEsubero||0))/r.totTarget:0;
    var pctFinal=r.pct||0;
    var determinante=pctBase<FCVM_PARAMS.soglia100&&pctFinal>=FCVM_PARAMS.soglia100;
    var esitoMap={full:["full","Pieno"],partial:["ridotto","Ridotto 60%"],partial_nosy:["none","Soglia/no SY"],none:["none","Nessuno"],sospeso:["none","Sospeso"],preventivo:["none","—"]};
    var em=esitoMap[r.esito]||["none",r.esito];
    // Riserva SAS mese prec. consumata PRIMA per colmare il gap (vedi sasReserveCalc):
    // quanto ne è stato usato si ricava così, stessa formula delle lettere (v9.45+).
    var resInUsed=Math.min(r.totSasReserveIn||0,r.totSasUsed||0);
    return{name:emp.n+" "+emp.c,role:emp.j,nStores:(r.stores||[]).length,target:Math.round(r.totTarget||0),
      // actual = consuntivo PURO (esubero e SAS esclusi): invariante
      // pctFinal*target = actual+esubero+applied (arrotondamenti a parte).
      actual:Math.round(pureCons),esubero:Math.round(r.totEsubero||0),targetSY:r.syLyArea!=null?r.syLyArea:null,resultSY:r.syAreaCy!=null?r.syAreaCy:null,
      pctBase:pctBase,sasValue:Math.round((FC_AREA_SAS[emp.m]||{}).sasv_eur||0),
      recPct:sasMatrixPct((FC_AREA_SAS[emp.m]||{}).acc,(FC_AREA_SAS[emp.m]||{}).vel)!=null?Math.round(sasMatrixPct((FC_AREA_SAS[emp.m]||{}).acc,(FC_AREA_SAS[emp.m]||{}).vel)*100):null,
      recValue:Math.round(r.totSasRec||0),applied:Math.round(r.totSasUsed||0),
      esuberoSasPrec:Math.round(r.totSasReserveIn||0),esuberoSasPrecUsed:Math.round(resInUsed),
      sasReserveNext:Math.round(r.totSasReserveOut||0),pctFinal:pctFinal,
      esito:em[0],esitoLabel:em[1],determinante:determinante};
  });
  var columns=[
    {key:"name",label:"Nome",type:"text"},
    {key:"role",label:"Ruolo",type:"mono"},
    {key:"nStores",label:"N. Negozi",type:"int"},
    {key:"target",label:"Target Area",type:"eur"},
    {key:"actual",label:"Consuntivo Area",type:"eur"},
    {key:"esubero",label:"Esub. prec.",type:"eur-dash0"},
    {key:"targetSY",label:"SY LY (rif.)",type:"dec1"},
    {key:"resultSY",label:"SY CY",type:"dec1"},
    {key:"pctBase",label:"% senza SAS",type:"pctbar"},
    {key:"sasValue",label:"Valore SAS",type:"eur-muted"},
    {key:"recPct",label:"Riconosciuto",type:"pct0"},
    {key:"recValue",label:"Valore ricon.",type:"eur-muted-dash0"},
    {key:"applied",label:"Applicato",type:"eur-dash0"},
    {key:"esuberoSasPrec",label:"Riserva SAS prec.",type:"eur-dash0"},
    {key:"esuberoSasPrecUsed",label:"Riserva SAS prec. usata",type:"eur-dash0"},
    {key:"sasReserveNext",label:"Riserva SAS riportata",type:"eur-dash0"},
    {key:"pctFinal",label:"% finale",type:"pctbar-badge"},
    {key:"esito",label:"Esito",type:"esitochip"}
  ];
  var payload={
    meta:{kind:"fcvm",title:"SAS → Fatturato",
      subtitle:"Field Coach + VM — Consuntivo "+getMonthYearLabel(),
      generatedAt:new Date().toISOString(),source:"BoggiIncentivi",schemaVersion:2},
    columns:columns,
    rows:rows
  };
  _downloadJson(payload,"sas_fcvm_"+_sessionFileTag()+".json");
}

// Esporta la riserva SAS non utilizzata questo mese (round-trip): il file va ricaricato
// il mese successivo tramite "Carica Excel Results" (mensile) — stesso file, stesso import,
// riconosciuto in automatico grazie alla colonna "RISERVA SAS LC" (vedi cSasResCarry).
function exportSasReserveStores(){
  var storeNames={},storeCu={},storeEx={};
  E.forEach(function(e){if(e.si){if(!storeNames[e.si])storeNames[e.si]=e.s||String(e.si);if(storeCu[e.si]===undefined){storeCu[e.si]=e.cu||"EUR";storeEx[e.si]=e.ex||1;}}});
  var rows=[["STORE ID","NEGOZIO","RISERVA SAS LC","VALUTA","CAMBIO","RISERVA SAS EUR"]];
  Object.keys(storeNames).forEach(function(sid){
    var info=storeSasInfo(sid);
    if(!info.active)return;
    var res=info.reserveOut||0;
    if(res<=0)return;
    var ex=storeEx[sid]||1;
    rows.push([sid,storeNames[sid],Math.round(res*100)/100,storeCu[sid]||"EUR",ex,Math.round(res*ex*100)/100]);
  });
  if(rows.length<=1){alert("Nessuna riserva SAS da riportare: tutti i negozi hanno riserva 0 (o dati SAS non caricati).");return;}
  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Riserva SAS");
  XLSX.writeFile(wb,"riserva_sas_negozi_"+getPdfSubfolder().fileBase+".xlsx");
}

// Esporta la riserva SAS Area non utilizzata questo mese (round-trip): il file va ricaricato
// il mese successivo tramite il bottone "SAS Area (Field Coach)" — stesso import, riconosciuto
// in automatico grazie alla colonna "RISERVA SAS EUR" anche senza colonne acc/vel/valore.
function exportSasReserveFcvm(){
  var pool=getFcVmPool();
  if(!pool.length){alert("Nessun dato FC+VM caricato.");return;}
  var rows=[["NOME","RUOLO","RISERVA SAS EUR"]];
  pool.forEach(function(emp){
    var r=calcFcVmPremio(emp.m);
    var res=r.totSasReserveOut||0;
    if(res<=0)return;
    rows.push([emp.n+" "+emp.c,emp.j,Math.round(res*100)/100]);
  });
  if(rows.length<=1){alert("Nessuna riserva SAS da riportare: tutte le aree hanno riserva 0 (o dati SAS non caricati).");return;}
  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Riserva SAS");
  XLSX.writeFile(wb,"riserva_sas_fcvm_"+getPdfSubfolder().fileBase+".xlsx");
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

    // Store hit logic (incl. esubero mese precedente USA da luglio 2026)
    var storePct=tg.to>0?((cn.sc||0)+(sasNewActive()?cn.esP||0:0))/tg.to:0;
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
  XLSX.writeFile(wb,"USA_Commissions_"+getPdfSubfolder().fileBase+".xlsx");
}
