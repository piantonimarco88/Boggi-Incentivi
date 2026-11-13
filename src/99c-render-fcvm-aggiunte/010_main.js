function rAggFcvm(){
  var pool=getFcVmPool();
  var h='<div style="font-size:12px;color:#6b6560;margin-bottom:14px"><b>Aggiunte manuali FC+VM</b> — Importi inseriti qui si <b>sommano</b> al premio calcolato automaticamente. Non soggetti a soglie o regole.</div>';
  h+='<div style="margin-bottom:12px"><label class="exp-btn btn-amber" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px" title="Importa da Excel: una riga per dipendente (Matricola, Valuta facoltativa, Aggiunta in valuta locale). Gli importi si sommano a quelli presenti.">&#128194; Importa aggiunte (Excel)<input type="file" accept=".xlsx,.xlsm,.xls" onchange="loadAggiunteFcvmExcel(this)" style="display:none"></label></div>';

  if(!pool.length){
    h+='<div class="wg" style="text-align:center;padding:30px;color:#a09a92"><div style="font-size:28px;margin-bottom:10px">&#128084;</div><div>Carica prima l\u2019anagrafica FC+VM.</div></div>';
    document.getElementById("p5").innerHTML=h;
    return;
  }

  pool.sort(function(a,b){return(a.j+a.c).localeCompare(b.j+b.c);});

  var nWithAgg=pool.filter(function(e){return (AGG_FCVM[e.m]||0)>0;}).length;
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">'+nWithAgg+' dipendenti con aggiunta attiva · '+pool.length+' totali</div>';

  h+='<div class="scroll-wrap"><table style="font-size:10px;width:100%;border-collapse:collapse"><thead><tr style="background:#eae7e1">';
  h+='<th style="padding:6px;cursor:default">Matr.</th>';
  h+='<th style="padding:6px;cursor:default">Cognome</th>';
  h+='<th style="padding:6px;cursor:default">Nome</th>';
  h+='<th style="padding:6px;cursor:default">Ruolo</th>';
  h+='<th style="padding:6px;cursor:default">Valuta</th>';
  h+='<th style="padding:6px;text-align:right;cursor:default">Premio Auto</th>';
  h+='<th style="padding:6px;text-align:right;cursor:default;min-width:100px">Aggiunta Manuale</th>';
  h+='<th style="padding:6px;text-align:right;cursor:default">Totale</th>';
  h+='</tr></thead><tbody>';

  pool.forEach(function(emp,i){
    var r=calcFcVmPremio(emp.m);
    var auto_lc=(r.hasBdg?r.totalPremioLC:r.premio);
    var agg=AGG_FCVM[emp.m]||0;
    var tot=auto_lc+agg;
    var cu=emp.cu||'EUR';
    var bg=agg>0?'#fef9ef':(i%2===0?'#fff':'#faf9f7');
    h+='<tr style="background:'+bg+'">';
    h+='<td style="padding:4px 6px;font-family:monospace;font-size:10px">'+esc(String(emp.m))+'</td>';
    h+='<td style="padding:4px 6px">'+esc(emp.c)+'</td>';
    h+='<td style="padding:4px 6px">'+esc(emp.n)+'</td>';
    h+='<td style="padding:4px 6px"><span class="bg" style="background:'+(emp.j==='FC'?'#5b6abf':'#5bb98c')+';color:#fff">'+esc(emp.j)+'</span></td>';
    h+='<td style="padding:4px 6px;font-size:9px;color:#a09a92">'+esc(cu)+'</td>';
    h+='<td style="padding:4px 6px;text-align:right;color:#6b6560">'+fc(auto_lc,cu)+'</td>';
    h+='<td style="padding:2px"><input type="number" data-fcvagg="'+esc(String(emp.m))+'" value="'+(agg||'')+'" step="1" min="0" placeholder="0" style="width:100%;padding:3px;border:1px solid '+(agg>0?'#c9a96e':'#e5e1db')+';border-radius:3px;font-size:10px;text-align:right;font-family:inherit;background:'+(agg>0?'#fef9ef':'#fff')+'"></td>';
    h+='<td style="padding:4px 6px;text-align:right;font-weight:700;color:'+(agg>0?'#c9a96e':'#8a8680')+'">'+fc(tot,cu)+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="wb" style="margin-top:16px"><div style="font-size:11px;font-weight:700;color:#856404;margin-bottom:4px">&#8505; Come funzionano le Aggiunte FC+VM</div><div style="font-size:11px;color:#856404;line-height:1.5">I valori inseriti qui vengono <b>sommati</b> al premio FC+VM calcolato automaticamente (area + eventuali premi BDG). Non sono soggetti a soglie di fatturato o condizioni SY. Compaiono nella lettera come voce separata.</div></div>';

  document.getElementById("p5").innerHTML=h;

  // Bindings
  document.querySelectorAll("#p5 input[data-fcvagg]").forEach(function(inp){
    inp.onchange=function(){
      var m=inp.getAttribute("data-fcvagg");
      var v=parseFloat(inp.value)||0;
      if(v<0){alert("Importo negativo non ammesso nelle aggiunte: valore non salvato.");v=0;}
      if(v>0)AGG_FCVM[m]=v;
      else delete AGG_FCVM[m];
      rAggFcvm();
      autoSave();
    };
  });
}

function clearFcVmData(){
  if(!confirm("Vuoi svuotare TUTTI i dati (tutte le modalità)?\n\nVerranno cancellati:\n• Anagrafica dipendenti\n• Dati mensili, seasonal e FC+VM\n• Stato in localStorage\n\nLa configurazione viene mantenuta.\n\nContinuare?"))return;
  resetEverything();
  // Forza re-render di tutti i pannelli indipendentemente dal tab attivo
  try{rC();}catch(ex){}
  try{rA();}catch(ex){}
  try{rSources();}catch(ex){}
  try{if(typeof rDist==="function")rDist();}catch(ex){}
  try{if(typeof rAgg==="function")rAgg();}catch(ex){}
  try{rT();}catch(ex){}
  try{if(typeof rStores==="function")rStores();}catch(ex){}
  try{rL();}catch(ex){}
  autoSave();
  alert("✅ Tutti i dati svuotati.");
}

// ── Export Excel ──────────────────────────────────────────────
function exportFcVmExcel(){
  var pool=getFcVmPool();
  if(!pool.length){alert('Nessun dato FC+VM.');return;}
  var mm=String(CFG_MONTH).padStart(2,'0');
  var rows=[['MATRICOLA','COGNOME','NOME','RUOLO','VALUTA','CAMBIO','PREMIO MAX LC',
             'N.STORE','TARGET EUR','CONS EUR','ESUBERO PREV','CONS TOT EUR','% AREA','SY CY','SY LY','SY OK',
             'PREMIO AREA LC','PREMIO AREA EUR','PREMIO BDG NEGOZI LC','PREMIO BDG NEGOZI EUR',
             'PREMIO TOTALE LC','PREMIO TOTALE EUR','ESITO','OVERRIDE']];
  pool.forEach(function(emp){
    var r=calcFcVmPremio(emp.m);
    var nS=Object.keys(FC_MAP).filter(function(sid){
      var mp=FC_MAP[sid];if(mp.tipo==='BDG')return false;
      var arrE=Array.isArray(emp.j==='FC'?mp.fc:mp.vm)?(emp.j==='FC'?mp.fc:mp.vm):[(emp.j==='FC'?mp.fc:mp.vm)];
      return arrE.indexOf(emp.m)>=0;
    }).length;
    rows.push([emp.m,emp.c,emp.n,emp.j,emp.cu||'EUR',emp.ex||1,emp.ib,nS,
               Math.round(r.totTarget*100)/100,Math.round(r.totCons*100)/100,
               Math.round((r.totEsubero||0)*100)/100,Math.round((r.totConsWithEsub||r.totCons)*100)/100,
               r.totTarget>0?Math.round(r.pct*10000)/100:0,
               r.totSyCy||0,r.totSyLy||0,r.syOk?'SI':'NO',
               r.premio,r.premio_eur,r.bdgPrize||0,r.bdgPrizeEur||0,
               r.totalPremioLC,r.totalPremioEur,r.esito,FC_OVERRIDES[emp.m]||'']);
  });
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'FC VM');
  XLSX.writeFile(wb,'FCVM_'+mm+'_'+CFG_YEAR+'.xlsx');
}

// ── Incentive Monitor ──────────────────────────────────────────
var _MMONTHS=["","Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

// === IMPORT AGGIUNTE FC+VM DA EXCEL (v9.121) ===============================
// Stesso schema del tab Aggiunte mensile (vedi 94-tab-aggiunte): una riga per dipendente con colonna
// Matricola, «Valuta» facoltativa e UNA colonna importo («Aggiunta»), in valuta locale. Gli importi si
// SOMMANO ad AGG_FCVM (importo unico per dipendente). Foglio «Aggiunte» se esiste, altrimenti il primo.
var AGG_FCVM_KEYS=[{k:"tot",l:"Aggiunta",al:["aggiunta","aggiunte","importo","totale aggiunta"]}];
// Matricola del file -> matricola del pool FC+VM: identica, poi (se univoca) confronto sulle cifre senza zeri iniziali.
function _aggResolveFcvm(raw){
  var s=String(raw==null?"":raw).trim();if(!s)return "";
  var ks=Object.keys(FC_EMP);
  if(FC_EMP[s])return s;
  var d=s.replace(/[^0-9]/g,"").replace(/^0+/,"");if(!d)return s;
  var hit=ks.filter(function(k){return String(k).replace(/[^0-9]/g,"").replace(/^0+/,"")===d;});
  return hit.length===1?hit[0]:s;
}
function aggApplyItemsFcvm(items){
  var res={n:0,tot:{},skipped:[]};
  items.forEach(function(it){
    var e=FC_EMP[it.m];
    if(!e){res.skipped.push("riga "+it.row+" · matr. "+it.raw+": non presente nell'anagrafica FC+VM");return;}
    var cu=e.cu||"EUR";
    if(it.cu&&it.cu!==cu){res.skipped.push("riga "+it.row+" · "+e.c+" "+e.n+" ("+it.raw+"): valuta file "+it.cu+" ≠ valuta dipendente "+cu);return;}
    var v=it.vals.tot||0;if(!(v>0))return;
    AGG_FCVM[it.m]=Math.round(((AGG_FCVM[it.m]||0)+v)*100)/100;
    res.n++;res.tot[cu]=Math.round(((res.tot[cu]||0)+v)*100)/100;
  });
  return res;
}
function loadAggiunteFcvmExcel(input){
  var f=input.files[0];if(!f)return;input.value="";
  var reader=new FileReader();reader.onload=function(ev){try{
    if(!Object.keys(FC_EMP).length){alert("Carica prima l'anagrafica FC+VM.");return;}
    var wb=XLSX.read(new Uint8Array(ev.target.result),{type:"array"});
    var sn=wb.SheetNames.filter(function(n){return _aggNormHdr(n)==="aggiunte";})[0]||wb.SheetNames[0];
    var rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true});
    var p=aggParseRows(rows,AGG_FCVM_KEYS,_aggResolveFcvm);
    if(!p.items.length){alert("Import aggiunte FC+VM: nessuna riga con importi.\n\n"+(p.problems.length?p.problems.join("\n"):"Controlla che il foglio abbia una colonna Matricola e una colonna «Aggiunta»."));return;}
    var prev=IMPORT_STAMPS.aggiunte_fcvm;
    if(prev&&prev.file===f.name&&!confirm("Il file «"+f.name+"» risulta già importato in questa sessione.\n\nLe aggiunte si SOMMANO: importarlo di nuovo le raddoppia.\n\nContinuare lo stesso?"))return;
    var known=p.items.filter(function(it){return FC_EMP[it.m];}).length;
    var already=p.items.filter(function(it){return FC_EMP[it.m]&&AGG_FCVM[it.m]>0;}).length;
    if(!confirm("Importare le aggiunte FC+VM da «"+f.name+"» (foglio «"+sn+"»)?\n\n"+known+" dipendenti riconosciuti su "+p.items.length+" righe con importi."+
      (already?"\n"+already+" hanno già un'aggiunta: gli importi si SOMMANO.":"")+"\n\nMese configurato: "+_monthLbl(CFG_MONTH,CFG_YEAR)+"."))return;
    var r=aggApplyItemsFcvm(p.items);
    IMPORT_STAMPS.aggiunte_fcvm={label:"Aggiunte FC+VM",file:f.name,m:CFG_MONTH,y:CFG_YEAR,fm:0,ts:new Date().toISOString()};
    var tot=Object.keys(r.tot).map(function(c){return c+" "+r.tot[c].toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});}).join(" · ");
    var warn=p.problems.concat(r.skipped);
    rAggFcvm();try{rSources();}catch(_e){}autoSave();
    alert("Aggiunte FC+VM importate: "+r.n+" dipendenti.\nTotale (valuta locale): "+tot+
      (warn.length?"\n\n\u26a0 "+warn.length+" righe non importate o con avvisi:\n\u2022 "+warn.slice(0,15).join("\n\u2022 ")+(warn.length>15?"\n\u2026 e altre "+(warn.length-15):""):""));
  }catch(ex){alert("Errore lettura aggiunte FC+VM: "+ex.message);}};reader.readAsArrayBuffer(f);
}
