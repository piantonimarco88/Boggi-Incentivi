// ── #12 VALIDAZIONE INPUT (anagrafica + configurazione) ───────────────────
// Modulo standalone di controlli proattivi sui dati caricati.
// Non blocca gli import (e` informativo): segnala incoerenze in un modal
// strutturato in Errori (critici) / Avvisi (controllo umano) / Info (stats).
//
// Entry point principale: runValidationsAndReport(title)
//   - Esegue tutte le validazioni
//   - Apre un modal con i risultati (se ci sono issues) o un sommario info
//   - Ritorna il risultato {errors, warnings, info}

"use strict";

// ─────────────────────────────────────────────────────────────────────────
// VALIDAZIONI
// ─────────────────────────────────────────────────────────────────────────

// Anagrafica dipendenti (array E):
//   - Matricole duplicate
//   - Cognome/nome entrambi vuoti
//   - Currency mancante o sconosciuta per REGION=international
//   - Store_id non presente nell'anagrafica negozi
//   - Ruolo non in RL (lista ruoli noti)
//   - Stipendio lordo (ib) mancante o non numerico
function validateAnagrafica(){
  var issues={errors:[],warnings:[],info:[]};
  if(!Array.isArray(E)||E.length===0){
    issues.warnings.push("Anagrafica vuota — nessun dipendente caricato.");
    return issues;
  }

  // 1. Matricole duplicate
  var matrIdx={};
  E.forEach(function(e,i){
    if(!e.m)return;
    var k=String(e.m);
    if(!matrIdx[k])matrIdx[k]=[];
    matrIdx[k].push({i:i,c:e.c,n:e.n});
  });
  Object.keys(matrIdx).forEach(function(m){
    if(matrIdx[m].length>1){
      var who=matrIdx[m].map(function(r){return (r.c||"?")+" "+(r.n||"")}).join(" / ");
      issues.errors.push("Matricola duplicata: "+m+" ("+matrIdx[m].length+" righe: "+who+")");
    }
  });

  // 2. Cognome/nome entrambi vuoti
  E.forEach(function(e){
    if(!e.c&&!e.n)issues.warnings.push("Matr. "+(e.m||"?")+": cognome E nome entrambi vuoti");
  });

  // 3. Currency mancante/sconosciuta (per international)
  if(typeof REGION!=="undefined"&&REGION==="international"){
    E.forEach(function(e){
      if(!e.cu){
        issues.errors.push("Matr. "+e.m+" ("+(e.c||"?")+"): currency mancante (region=international)");
      } else if(typeof CS!=="undefined"&&!CS[e.cu]){
        issues.errors.push("Matr. "+e.m+" ("+(e.c||"?")+"): currency \""+e.cu+"\" sconosciuta");
      }
    });
  }

  // Helper: dipendente USA (commission-based, anagrafica separata in D.usa)
  function _isUSA(e){
    try{
      if(typeof isUSA==="function")return isUSA(e.si,e);
    }catch(ex){}
    if(e&&e.cu==="USD")return true;
    if(typeof D!=="undefined"&&D&&Array.isArray(D.us)&&e&&D.us.indexOf(Number(e.si))>=0)return true;
    return false;
  }

  // 4. Store_id non in anagrafica negozi (esclude store USA noti in D.us)
  if(typeof D!=="undefined"&&D&&D.s){
    var stores=D.s;
    var usStoresSet={};
    if(D&&Array.isArray(D.us))D.us.forEach(function(s){usStoresSet[String(s)]=true});
    E.forEach(function(e){
      if(!e.si)return;
      if(_isUSA(e))return; // skip US: hanno anagrafica separata
      var k1=String(e.si), k2=e.si;
      if(!stores[k1]&&!stores[k2]&&!usStoresSet[k1]){
        issues.warnings.push("Matr. "+e.m+" ("+(e.c||"?")+"): store_id "+e.si+" non in anagrafica negozi");
      }
    });
  }

  // 5. Ruolo non in RL (lista ruoli ufficiali) — skip dipendenti USA
  //    (i ruoli USA come STK, etc. non sono in RL standard)
  if(typeof RL!=="undefined"&&Array.isArray(RL)){
    var unknownJobs={};
    E.forEach(function(e){
      if(!e.j)return;
      if(_isUSA(e))return;
      if(RL.indexOf(e.j)<0){
        if(!unknownJobs[e.j])unknownJobs[e.j]=0;
        unknownJobs[e.j]++;
      }
    });
    Object.keys(unknownJobs).forEach(function(j){
      issues.warnings.push("Ruolo \""+j+"\" non in lista ufficiale (presente in "+unknownJobs[j]+" righe non-USA)");
    });
  }

  // 6. Stipendio lordo — skip dipendenti USA (usano commission in D.usa[e.m].cm)
  var nNoSalary=0, nUsaNoCommission=0;
  E.forEach(function(e){
    if(_isUSA(e)){
      // Per USA verifica commission in D.usa
      var ud=(typeof D!=="undefined"&&D&&D.usa)?(D.usa[e.m]||{}):{};
      if(typeof ud.cm!=="number"||ud.cm<=0)nUsaNoCommission++;
      return;
    }
    if(typeof e.ib!=="number"||e.ib<=0)nNoSalary++;
  });
  if(nNoSalary>0){
    issues.warnings.push(nNoSalary+" dipendenti (non-USA) con stipendio lordo (ib) mancante o non valido");
  }
  if(nUsaNoCommission>0){
    issues.warnings.push(nUsaNoCommission+" dipendenti USA con commission% mancante o non valida in D.usa");
  }

  // 6b. USA trimestrale (nuova logica da set-2026): dati mensili mancanti nel mese di chiusura trimestre
  try{
    if(typeof usaNewActive==="function"&&usaNewActive()&&MODE==="consuntivo"&&usaQuarterMonths(CFG_YEAR,CFG_MONTH)){
      var qMiss={};
      E.forEach(function(e){
        var u=(D.usa||{})[e.m];
        if(!_isUSA(e)||!u||u.nw!==1||!(u.qb>0))return;
        var qi=usaQuarterInfo(e.si);
        if(qi&&qi.missing.length)qMiss[e.si]=qi.missing.join(", ");
      });
      var qk=Object.keys(qMiss);
      if(qk.length)issues.warnings.push("Trimestrale USA: fatturato/target mancanti per "+qk.length+" negozi (es. "+qk[0]+": "+qMiss[qk[0]]+") — completa in Configurazione");
    }
  }catch(exq){}

  // 7. Info / stats
  issues.info.push("Totale dipendenti: "+E.length);
  if(typeof D!=="undefined"&&D&&D.s)issues.info.push("Negozi noti in anagrafica: "+Object.keys(D.s).length);
  // Conta per currency
  var byCur={};
  E.forEach(function(e){var c=e.cu||"(nessuna)";byCur[c]=(byCur[c]||0)+1;});
  var curSummary=Object.keys(byCur).map(function(c){return c+":"+byCur[c]}).join(", ");
  if(curSummary)issues.info.push("Distribuzione valuta: "+curSummary);
  // USA breakdown
  var nUsa=0;E.forEach(function(e){if(_isUSA(e))nUsa++});
  if(nUsa>0)issues.info.push("Dipendenti USA: "+nUsa+" (anagrafica separata, controlli store/ruolo/stipendio dedicati)");

  return issues;
}

// Configurazione globale: mese/anno, modalita`, parametri.
function validateConfiguration(){
  var issues={errors:[],warnings:[],info:[]};
  if(typeof CFG_MONTH!=="undefined"){
    if(CFG_MONTH<1||CFG_MONTH>12)issues.errors.push("CFG_MONTH fuori range (1-12): "+CFG_MONTH);
  }
  if(typeof CFG_YEAR!=="undefined"){
    if(CFG_YEAR<2020||CFG_YEAR>2050)issues.warnings.push("CFG_YEAR insolito (atteso 2020-2050): "+CFG_YEAR);
  }
  if(typeof PARAMS!=="undefined"&&PARAMS){
    if(PARAMS.bdg100<=0||PARAMS.bdg100>1)issues.errors.push("PARAMS.bdg100 fuori range (0,1]: "+PARAMS.bdg100);
    if(PARAMS.bdg60<=0||PARAMS.bdg60>1)issues.errors.push("PARAMS.bdg60 fuori range (0,1]: "+PARAMS.bdg60);
    if(PARAMS.bdg60>=PARAMS.bdg100)issues.warnings.push("PARAMS.bdg60 ("+PARAMS.bdg60+") >= bdg100 ("+PARAMS.bdg100+"): le soglie sono invertite o uguali");
  }
  return issues;
}

// ─────────────────────────────────────────────────────────────────────────
// UI: REPORT MODALE
// ─────────────────────────────────────────────────────────────────────────

function showValidationReport(title,issues){
  // Costruzione modal
  var existing=document.getElementById("validationModal");
  if(existing)existing.parentNode.removeChild(existing);

  var modal=document.createElement("div");
  modal.id="validationModal";
  modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif";

  var box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:8px;padding:24px;max-width:760px;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3);width:100%";

  var totalIssues=issues.errors.length+issues.warnings.length;
  var statusIcon=issues.errors.length>0?"❌":(issues.warnings.length>0?"⚠":"✓");
  var statusColor=issues.errors.length>0?"#c0392b":(issues.warnings.length>0?"#c9a96e":"#2d7a3a");
  var statusText=issues.errors.length>0?(issues.errors.length+" errore"+(issues.errors.length>1?"i":"")+" critic"+(issues.errors.length>1?"i":"o")):
                 (issues.warnings.length>0?(issues.warnings.length+" avvis"+(issues.warnings.length>1?"i":"o")):"Tutto OK");

  var h='';
  h+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:1px solid #e5e1db;padding-bottom:12px">';
  h+='<div><h2 style="margin:0;color:#2c2925;font-size:16px;font-weight:700">'+esc(title)+'</h2>';
  h+='<div style="margin-top:4px;font-size:12px;color:'+statusColor+';font-weight:600">'+statusIcon+' '+esc(statusText)+'</div></div>';
  h+='<button id="vmClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:#8a8680;padding:0 8px">&times;</button>';
  h+='</div>';

  if(issues.errors.length>0){
    h+='<div style="margin:12px 0"><div style="color:#c0392b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Errori critici</div>';
    h+='<ul style="margin:0;padding-left:20px;font-size:12px;color:#4e4b48;line-height:1.7;background:#fdf2f0;border-radius:4px;padding:10px 10px 10px 30px">';
    issues.errors.forEach(function(e){h+='<li>'+esc(e)+'</li>'});
    h+='</ul></div>';
  }
  if(issues.warnings.length>0){
    h+='<div style="margin:12px 0"><div style="color:#856404;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Avvisi</div>';
    h+='<ul style="margin:0;padding-left:20px;font-size:12px;color:#4e4b48;line-height:1.7;background:#fff8e5;border-radius:4px;padding:10px 10px 10px 30px">';
    issues.warnings.forEach(function(w){h+='<li>'+esc(w)+'</li>'});
    h+='</ul></div>';
  }
  if(issues.info.length>0){
    h+='<div style="margin:12px 0"><div style="color:#2d7a3a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Info</div>';
    h+='<ul style="margin:0;padding-left:20px;font-size:12px;color:#4e4b48;line-height:1.7;background:#f0f7f1;border-radius:4px;padding:10px 10px 10px 30px">';
    issues.info.forEach(function(i){h+='<li>'+esc(i)+'</li>'});
    h+='</ul></div>';
  }
  if(totalIssues===0){
    h+='<div style="padding:16px;text-align:center;color:#2d7a3a;font-size:13px">Nessuna anomalia rilevata. I dati superano tutti i controlli.</div>';
  }

  h+='<div style="margin-top:16px;text-align:right;border-top:1px solid #e5e1db;padding-top:12px">';
  h+='<button id="vmCloseBtn" class="exp-btn primary" style="padding:8px 24px">Chiudi</button>';
  h+='</div>';

  box.innerHTML=h;
  modal.appendChild(box);
  document.body.appendChild(modal);

  function close(){if(modal.parentNode)modal.parentNode.removeChild(modal)}
  document.getElementById("vmClose").onclick=close;
  document.getElementById("vmCloseBtn").onclick=close;
  modal.onclick=function(ev){if(ev.target===modal)close()};
}

// ─────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────

function runValidationsAndReport(title){
  var combined={errors:[],warnings:[],info:[]};
  try{
    var an=validateAnagrafica();
    combined.errors=combined.errors.concat(an.errors);
    combined.warnings=combined.warnings.concat(an.warnings);
    combined.info=combined.info.concat(an.info);
  }catch(ex){combined.errors.push("Errore in validateAnagrafica: "+ex.message)}
  try{
    var cfg=validateConfiguration();
    combined.errors=combined.errors.concat(cfg.errors);
    combined.warnings=combined.warnings.concat(cfg.warnings);
    combined.info=combined.info.concat(cfg.info);
  }catch(ex){combined.errors.push("Errore in validateConfiguration: "+ex.message)}
  showValidationReport(title||"Verifica dati caricati",combined);
  return combined;
}

// === Riepilogo controlli dopo ogni import (non bloccante) ===================
// Ogni import riuscito registra un «timbro» (IMPORT_STAMPS) con il mese configurato al
// momento dell'import e il mese letto dal nome del file. I controlli segnalano, senza
// bloccare:
//  - file il cui nome indica un mese diverso da quello configurato;
//  - dati importati quando il mese configurato era un altro (es. inventari di ottobre
//    ancora attivi a novembre perche` il file non e` stato ricaricato);
//  - matricole duplicate, negozi con dipendenti senza target, negozi senza consuntivo;
//  - colonne scelte in modo ambiguo o lette da posizione fissa (HDR_NOTES dell'import).
// Il riepilogo e` aggiunto al messaggio di fine import e mostrato in cima a Fonti Dati.
var IMPORT_STAMPS={}; // src -> {label,file,m,y,fm,ts}
function _monthLbl(m,y){var n=(typeof MONTH_NAMES_IT!=="undefined"&&MONTH_NAMES_IT[m])||String(m);return n.charAt(0).toUpperCase()+n.slice(1)+(y?" "+y:"");}
function importChecks(){
  var out=[],k,s;
  for(k in IMPORT_STAMPS){s=IMPORT_STAMPS[k];if(!s)continue;
    if(s.fm&&s.fm!==CFG_MONTH)out.push({lvl:"warn",t:"«"+s.label+"»: il file «"+s.file+"» sembra di "+_monthLbl(s.fm)+", il mese configurato è "+_monthLbl(CFG_MONTH,CFG_YEAR)+"."});
    else if(s.m&&(s.m!==CFG_MONTH||s.y!==CFG_YEAR))out.push({lvl:"warn",t:"«"+s.label+"» è stato caricato quando il mese configurato era "+_monthLbl(s.m,s.y)+": se è cambiato mese, ricarica il file."});
  }
  // Seasonal: negozi con SM/VSM che usano ancora i target incorporati nel codice (stagione
  // precedente) perche il file dei target importato non li conteneva. Solo avviso.
  if(PRIZE_MODE==="seasonal"&&typeof SEAS_TARGETS_DEFAULT!=="undefined"&&typeof E!=="undefined"&&E.length){
    var oldT={};
    E.forEach(function(e){if(e.ps==="SI"||(typeof isSMVSM==="function"&&!isSMVSM(e)))return;var sid=String(e.si),d=SEAS_TARGETS_DEFAULT[sid],t=SEAS_TARGETS[sid];
      if(d&&t&&(t.to||0)>0&&JSON.stringify(t)===JSON.stringify(d))oldT[sid]=1;});
    var ol=Object.keys(oldT).sort();
    if(ol.length)out.push({lvl:"warn",t:ol.length+" negozi usano ancora i target seasonal incorporati nell'app (stagione precedente), non quelli importati: "+ol.slice(0,12).join(", ")+(ol.length>12?"…":"")+". Controlla che il file dei target della stagione li contenga."});
  }
  if(PRIZE_MODE!=="fcvm"&&typeof E!=="undefined"&&E.length){
    var seen={},dup=[];
    E.forEach(function(e){var m=String(e.m);if(seen[m])dup.push(m);seen[m]=1;});
    if(dup.length)out.push({lvl:"err",t:dup.length+" matricole duplicate in anagrafica: "+dup.slice(0,10).join(", ")+(dup.length>10?"…":"")+"."});
    var hasT=Object.keys(D.t||{}).length>0,hasC=Object.keys(D.c||{}).some(function(x){return (D.c[x].sc||0)>0;});
    var sids={};E.forEach(function(e){if(e.ps!=="SI"&&!(typeof isUSA==="function"&&isUSA(e.si,e)))sids[String(e.si)]=1;});
    if(hasT){var noT=Object.keys(sids).filter(function(x){return !(D.t[x]&&D.t[x].to>0);});
      if(noT.length)out.push({lvl:"warn",t:noT.length+" negozi con dipendenti ma senza target di fatturato: "+noT.slice(0,12).join(", ")+(noT.length>12?"…":"")+" (premio di negozio = 0)."});}
    if(MODE==="consuntivo"&&hasC){var noC=Object.keys(sids).filter(function(x){return D.t[x]&&D.t[x].to>0&&!((D.c[x]||{}).sc>0);});
      if(noC.length)out.push({lvl:"warn",t:noC.length+" negozi con target ma senza consuntivo di fatturato: "+noC.slice(0,12).join(", ")+(noC.length>12?"…":"")+"."});}
  }
  return out;
}
// Da chiamare a fine import riuscito: registra il timbro e restituisce il messaggio
// dell'import con in coda le note dell'import (extra + HDR_NOTES) e i controlli generali.
function importDone(src,label,fileName,msg,extra){
  var fname=fileName||"";
  IMPORT_STAMPS[src]={label:label,file:fname,m:CFG_MONTH,y:CFG_YEAR,fm:(typeof monthFromName==="function"?monthFromName(fname):0),ts:new Date().toISOString()};
  var notes=(extra||[]).concat(typeof HDR_NOTES!=="undefined"?HDR_NOTES:[]);
  if(typeof HDR_NOTES!=="undefined")HDR_NOTES=[];
  var chk=importChecks();
  var txt=msg||"";
  if(notes.length)txt+="\n\n\u2139 Note su questo file:\n\u2022 "+notes.slice(0,12).join("\n\u2022 ")+(notes.length>12?"\n\u2026 e altre "+(notes.length-12):"");
  if(chk.length)txt+="\n\n\u26a0 Controlli (non bloccanti):\n\u2022 "+chk.map(function(c){return c.t}).join("\n\u2022 ");
  try{if(typeof rSources==="function")rSources();}catch(_e){}
  return txt;
}
// Riquadro in cima a Fonti Dati
function importChecksBoxHtml(){
  var chk=importChecks();if(!chk.length)return "";
  var h='<div class="wg" style="border-left:4px solid #e0a800;border-radius:0;background:#fffbea;margin-bottom:12px">';
  h+='<div class="wg-title" style="color:#856404">\u26a0 Controlli sui dati caricati <span style="font-weight:400;font-size:10px;color:#8a8680">(non bloccanti)</span></div><ul style="margin:6px 0 0 18px;padding:0;font-size:11px;color:#5c4a00">';
  chk.forEach(function(c){h+='<li style="margin:2px 0'+(c.lvl==="err"?';color:#a32d2d;font-weight:600':'')+'">'+esc(c.t)+'</li>';});
  return h+'</ul></div>';
}
