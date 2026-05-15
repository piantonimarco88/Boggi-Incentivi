// ── #15 CONFRONTO PREVENTIVO ↔ CONSUNTIVO ────────────────────────────────
// Per ogni periodo (mese/anno) con almeno uno snapshot, confronta
// l'ultimo snapshot mode=preventivo con l'ultimo mode=consuntivo.
// Mostra delta per dipendente + aggregati.
//
// Sfrutta gli snapshot prodotti da #9 (buildSnapshotForHistory).
// Bridge identico a #9: postMessage(listSnapshots) / readSnapshot.

function rConfronto(){
  var p9=document.getElementById("p9");
  if(!p9)return;
  if(!window.chrome||!window.chrome.webview){
    p9.innerHTML='<div style="padding:24px;color:#a09a92">Il confronto e` disponibile solo dentro l\'app Windows.</div>';
    return;
  }
  p9.innerHTML='<div style="padding:24px;color:#a09a92">Caricamento snapshot...</div>';

  var pending=0, snapshots={};
  function onMsg(ev){
    if(typeof ev.data!=="string")return;
    if(ev.data.indexOf("snapshotsList:")===0){
      var list;
      try{list=JSON.parse(ev.data.slice("snapshotsList:".length));}catch(ex){list=[];}
      if(!list.length){
        window.chrome.webview.removeEventListener("message",onMsg);
        p9.innerHTML='<div style="padding:24px;color:#a09a92">Nessuno snapshot disponibile.<br><br>Per usare il confronto preventivo/consuntivo serve almeno:<br>• 1 snapshot con MODE=preventivo (genera con Salva Tutti PDF in modalita` Preventivo)<br>• 1 snapshot con MODE=consuntivo (idem in Consuntivo)<br>per lo stesso mese/anno.</div>';
        return;
      }
      pending=list.length;
      list.forEach(function(meta){
        window.chrome.webview.postMessage({type:"readSnapshot",filename:meta.filename});
      });
    } else if(ev.data.indexOf("snapshotData:")===0){
      var rest=ev.data.slice("snapshotData:".length);
      var sep=rest.indexOf(":");
      if(sep>=0){
        var fn=rest.slice(0,sep), js=rest.slice(sep+1);
        try{snapshots[fn]=JSON.parse(js);}catch(ex){}
      }
      pending--;
      if(pending<=0){window.chrome.webview.removeEventListener("message",onMsg);renderConfrontoUI(p9,snapshots);}
    } else if(ev.data.indexOf("snapshotError:")===0){
      pending--;
      if(pending<=0){window.chrome.webview.removeEventListener("message",onMsg);renderConfrontoUI(p9,snapshots);}
    }
  }
  window.chrome.webview.addEventListener("message",onMsg);
  window.chrome.webview.postMessage({type:"listSnapshots"});
}

// Costruisce label periodo "MM/YYYY" (mensile/fcvm) o "SS YYYY" (seasonal).
function _periodLabelConfronto(snap){
  if(snap.prize_mode==="seasonal"){
    return ((snap.period && snap.period.season) || "SEAS")+" "+((snap.period && snap.period.year) || "");
  }
  var mm=String((snap.period && snap.period.month)||"").padStart(2,"0");
  return mm+"/"+((snap.period && snap.period.year) || "");
}
function _periodKeyConfronto(snap){
  // Stesso label per filtraggio (no mode tag)
  return _periodLabelConfronto(snap);
}

// Render UI completa del tab confronto.
function renderConfrontoUI(container, snapshots){
  // Raggruppo gli snapshot per periodo. Per ogni periodo trovo l'ultimo
  // (per saved_at) snapshot di mode=preventivo e di mode=consuntivo.
  var byPeriod={};
  Object.keys(snapshots).forEach(function(fn){
    var s=snapshots[fn];
    if(!s||!s.mode||!s.employees)return;
    var pkey=_periodKeyConfronto(s);
    if(!byPeriod[pkey])byPeriod[pkey]={periodLabel:_periodLabelConfronto(s),preventivo:null,consuntivo:null};
    var cur=byPeriod[pkey][s.mode];
    var savedAt=s.saved_at||"1970-01-01";
    if(!cur || (cur.saved_at||"") < savedAt){
      byPeriod[pkey][s.mode]=s;
      byPeriod[pkey][s.mode]._filename=fn;
    }
  });

  // Ordino i periodi (anno-mese decrescente, seasonal alla fine)
  var periods=Object.keys(byPeriod).sort(function(a,b){
    return b.localeCompare(a);
  });

  if(!periods.length){
    container.innerHTML='<div style="padding:24px;color:#a09a92">Snapshot trovati ma nessun periodo valido. Probabile mismatch del formato dati.</div>';
    return;
  }

  // Render: selettore periodo in alto + corpo (stile chiaro coerente)
  var h='<div style="padding:12px">';
  h+='<div class="flt" style="margin-bottom:16px">';
  h+='<label style="color:#6b6560;font-size:12px;font-weight:600;margin-right:4px">Periodo:</label>';
  h+='<select id="cfPeriodSel">';
  periods.forEach(function(pk,i){
    var pd=byPeriod[pk];
    var marker=(pd.preventivo&&pd.consuntivo)?"✓":(pd.preventivo?"P":"C");
    h+='<option value="'+esc(pk)+'"'+(i===0?" selected":"")+'>'+esc(pd.periodLabel)+' ['+marker+']</option>';
  });
  h+='</select>';
  h+='<span style="font-size:11px;color:#8a8680">[✓] entrambi presenti · [P] solo preventivo · [C] solo consuntivo</span>';
  h+='</div>';
  h+='<div id="cfBody"></div>';
  h+='</div>';
  container.innerHTML=h;

  function renderForPeriod(pk){
    var body=document.getElementById("cfBody");
    var pd=byPeriod[pk];
    if(!pd){body.innerHTML='<div style="color:#cf5b5b">Periodo non trovato.</div>';return;}
    var prev=pd.preventivo, cons=pd.consuntivo;
    var html="";
    if(!prev && !cons){
      body.innerHTML='<div style="color:#c0392b;padding:12px">Nessuno snapshot per questo periodo.</div>';return;
    }
    if(!prev){
      html+='<div style="padding:12px 14px;background:#fff3cd;border-left:3px solid #c0392b;margin-bottom:12px;color:#856404;border-radius:4px"><b>Manca lo snapshot di preventivo</b> per '+esc(pd.periodLabel)+'.<br>Per fare il confronto, passa in modalita` Preventivo e fai "Salva Tutti i PDF".</div>';
    } else if(!cons){
      html+='<div style="padding:12px 14px;background:#fff3cd;border-left:3px solid #c9a96e;margin-bottom:12px;color:#856404;border-radius:4px"><b>Manca lo snapshot di consuntivo</b> per '+esc(pd.periodLabel)+'.<br>Quando avrai i dati finali, passa in Consuntivo e fai "Salva Tutti i PDF".</div>';
    }

    // Costruisco la mappa matricola -> {prev, cons}
    var byMatr={};
    function addEmployees(snap, side){
      (snap.employees||[]).forEach(function(e){
        if(!byMatr[e.m])byMatr[e.m]={m:e.m,c:e.c||"",n:e.n||"",j:e.j||"",s:e.s||"",cu:e.cu||"EUR"};
        byMatr[e.m][side]=e;
      });
    }
    if(prev)addEmployees(prev,"prev");
    if(cons)addEmployees(cons,"cons");

    var rows=Object.keys(byMatr).map(function(k){return byMatr[k];})
      .sort(function(a,b){return (a.c||"").localeCompare(b.c||"");});

    // Helper: ritorna il totale in EUR per un employee dello snapshot.
    // Preferisce tl_eur (presente in snapshot v2+); fallback per snapshot
    // vecchi: tl * ex (se ex e` salvato) altrimenti tl raw (con warning visivo).
    function eurOf(emp){
      if(!emp)return null;
      if(typeof emp.tl_eur==="number")return emp.tl_eur;
      if(typeof emp.tl==="number" && typeof emp.ex==="number")return emp.tl*emp.ex;
      if(typeof emp.tl==="number" && (emp.cu==="EUR"||!emp.cu))return emp.tl;
      return null; // impossibile convertire
    }

    // Aggregati in EUR (corretti) e nelle valute miste (legacy, solo per debug).
    var totPrev=0,totCons=0,nWithBoth=0,nOnlyPrev=0,nOnlyCons=0,nUnconverted=0;
    rows.forEach(function(r){
      var pE=eurOf(r.prev), cE=eurOf(r.cons);
      var hasP=pE!==null, hasC=cE!==null;
      if(hasP)totPrev+=pE;
      if(hasC)totCons+=cE;
      if(hasP&&hasC)nWithBoth++;
      else if(hasP)nOnlyPrev++;
      else if(hasC)nOnlyCons++;
      // Conta dipendenti per i quali la conversione e` mancante
      if((r.prev && eurOf(r.prev)===null) || (r.cons && eurOf(r.cons)===null)) nUnconverted++;
    });
    var deltaEur=totCons-totPrev;
    var deltaPct=totPrev>0?(deltaEur/totPrev):0;
    var accuracy=totPrev>0?(1-Math.abs(deltaEur)/totPrev):0;

    // Card riassuntiva — stile chiaro coerente con .cd esistente
    html+='<div class="cg" style="margin-bottom:16px">';
    function card(label,val,color,sub){
      return '<div class="cd" style="text-align:left">'
        +'<div style="font-size:10px;color:#8a8680;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">'+esc(label)+'</div>'
        +'<div style="font-size:20px;font-weight:700;color:'+(color||"#2c2925")+';margin-top:4px;font-family:\'DM Sans\',monospace">'+val+'</div>'
        +(sub?'<div style="font-size:10px;color:#8a8680;margin-top:2px">'+sub+'</div>':'')
        +'</div>';
    }
    html+=card("Totale Preventivo", "€"+Math.round(totPrev).toLocaleString("it-IT"), "#c9a96e", (prev?prev.n_employees+" dip.":"n.d."));
    html+=card("Totale Consuntivo", "€"+Math.round(totCons).toLocaleString("it-IT"), "#2d7a3a", (cons?cons.n_employees+" dip.":"n.d."));
    var dColor=deltaEur>0?"#2d7a3a":(deltaEur<0?"#c0392b":"#8a8680");
    html+=card("Delta €", (deltaEur>=0?"+":"")+"€"+Math.round(deltaEur).toLocaleString("it-IT"), dColor);
    html+=card("Delta %", (deltaPct>=0?"+":"")+(deltaPct*100).toFixed(1)+"%", dColor);
    html+=card("Accuratezza", (accuracy*100).toFixed(1)+"%", "#c9a96e", "100% = previsto perfetto");
    html+='</div>';

    if(nOnlyPrev>0 || nOnlyCons>0 || nUnconverted>0){
      html+='<div style="font-size:11px;color:#8a8680;margin-bottom:8px">'
        +nWithBoth+' dipendenti con dati su entrambi'
        +(nOnlyPrev>0?' · '+nOnlyPrev+' solo preventivo':'')
        +(nOnlyCons>0?' · '+nOnlyCons+' solo consuntivo':'')
        +(nUnconverted>0?' · <span style="color:#c9a96e">'+nUnconverted+' senza tasso di cambio (snapshot pre-v8.25)</span>':'')
        +'</div>';
    }

    // Filtri — stile chiaro coerente
    html+='<div class="flt">';
    html+='<input id="cfSearch" placeholder="Cerca matricola / cognome / nome...">';
    html+='<select id="cfDeltaFilter">';
    html+='<option value="all">Tutti</option>';
    html+='<option value="diff">Solo con varianza</option>';
    html+='<option value="positive">Solo Δ positivi (cons > prev)</option>';
    html+='<option value="negative">Solo Δ negativi (cons < prev)</option>';
    html+='<option value="big">|Δ%| ≥ 20%</option>';
    html+='</select>';
    html+='</div>';

    // Tabella — stile chiaro coerente con Calcolo Premi
    if(prev || cons){
      html+='<div class="scroll-wrap" style="max-height:calc(100vh - 380px)">';
      html+='<table style="min-width:800px">';
      html+='<thead><tr>';
      ["Matr.","Cognome","Nome","Ruolo","Store"].forEach(function(c){
        html+='<th style="cursor:default">'+c+'</th>';
      });
      html+='<th style="cursor:default;text-align:right" title="Premio nella valuta locale del dipendente">Preventivo</th>';
      html+='<th style="cursor:default;text-align:right" title="Premio nella valuta locale del dipendente">Consuntivo</th>';
      html+='<th style="cursor:default;text-align:right" title="Differenza nella valuta locale">Δ loc</th>';
      html+='<th style="cursor:default;text-align:right;background:#dcd6cc" title="Preventivo convertito in EUR">Prev €</th>';
      html+='<th style="cursor:default;text-align:right;background:#dcd6cc" title="Consuntivo convertito in EUR">Cons €</th>';
      html+='<th style="cursor:default;text-align:right;background:#dcd6cc" title="Differenza in EUR (confrontabile cross-valuta)">Δ €</th>';
      html+='<th style="cursor:default;text-align:right">Δ %</th>';
      html+='</tr></thead><tbody id="cfTbody">';
      rows.forEach(function(r){
        // Valori nella valuta locale
        var vp=(r.prev && typeof r.prev.tl==="number")?r.prev.tl:null;
        var vc=(r.cons && typeof r.cons.tl==="number")?r.cons.tl:null;
        var dLoc=null;
        if(vp!==null && vc!==null) dLoc=vc-vp;
        // Valori convertiti in EUR
        var vpE=eurOf(r.prev), vcE=eurOf(r.cons);
        var dE=null, dP=null;
        if(vpE!==null && vcE!==null){ dE=vcE-vpE; dP=vpE>0?(dE/vpE):null; }
        var search=((r.m||"")+" "+(r.c||"")+" "+(r.n||"")).toLowerCase();
        var dEnum=dE!==null?dE:0, dPnum=dP!==null?dP:0;
        var dataAttr='data-search="'+esc(search)+'" data-de="'+dEnum+'" data-dp="'+dPnum+'" data-hasdiff="'+(dE!==null&&Math.abs(dE)>0.01?"1":"0")+'"';
        html+='<tr class="cf-row ck" '+dataAttr+'>';
        html+='<td class="mn">'+esc(r.m)+'</td>';
        html+='<td>'+esc(r.c)+'</td>';
        html+='<td>'+esc(r.n)+'</td>';
        html+='<td style="font-size:10px;color:#8a8680">'+esc(r.j)+'</td>';
        html+='<td style="font-size:10px;color:#8a8680">'+esc(r.s)+'</td>';
        // Colonne valuta locale
        html+='<td class="r mn" style="color:'+(vp!==null && vp>0?"#c9a96e":"#b0a99f")+';font-weight:'+(vp!==null && vp>0?"600":"400")+'">'+(vp===null?"—":fc(vp,r.cu))+'</td>';
        html+='<td class="r mn" style="color:'+(vc!==null && vc>0?"#2d7a3a":"#b0a99f")+';font-weight:'+(vc!==null && vc>0?"600":"400")+'">'+(vc===null?"—":fc(vc,r.cu))+'</td>';
        if(dLoc===null){
          html+='<td class="r mn" style="color:#b0a99f">—</td>';
        } else {
          var dLocColor=dLoc>0.01?"#2d7a3a":(dLoc<-0.01?"#c0392b":"#8a8680");
          html+='<td class="r mn" style="color:'+dLocColor+';font-weight:600">'+(dLoc>0?"+":"")+fc(dLoc,r.cu)+'</td>';
        }
        // Colonne EUR — sfondo beige lievemente piu` evidente
        html+='<td class="r mn" style="background:#f5efe5;color:'+(vpE!==null && vpE>0?"#c9a96e":"#b0a99f")+';font-weight:'+(vpE!==null && vpE>0?"600":"400")+'">'+(vpE===null?"—":fcEUR(vpE))+'</td>';
        html+='<td class="r mn" style="background:#f5efe5;color:'+(vcE!==null && vcE>0?"#2d7a3a":"#b0a99f")+';font-weight:'+(vcE!==null && vcE>0?"600":"400")+'">'+(vcE===null?"—":fcEUR(vcE))+'</td>';
        if(dE===null){
          html+='<td class="r mn" style="background:#f5efe5;color:#b0a99f">—</td>';
          html+='<td class="r mn" style="color:#b0a99f">—</td>';
        } else {
          var dColor2=dE>0.01?"#2d7a3a":(dE<-0.01?"#c0392b":"#8a8680");
          html+='<td class="r mn" style="background:#f5efe5;color:'+dColor2+';font-weight:600">'+(dE>0?"+":"")+fcEUR(dE)+'</td>';
          html+='<td class="r mn" style="color:'+dColor2+';font-weight:600">'+(dP===null?"—":((dP>0?"+":"")+(dP*100).toFixed(1)+"%"))+'</td>';
        }
        html+='</tr>';
      });
      html+='</tbody></table></div>';
    }
    body.innerHTML=html;

    // Hook filtri
    function applyFilters(){
      var q=(document.getElementById("cfSearch").value||"").toLowerCase().trim();
      var df=document.getElementById("cfDeltaFilter").value;
      document.querySelectorAll(".cf-row").forEach(function(tr){
        var s=tr.getAttribute("data-search")||"";
        var de=parseFloat(tr.getAttribute("data-de"))||0;
        var dp=parseFloat(tr.getAttribute("data-dp"))||0;
        var hasdiff=tr.getAttribute("data-hasdiff")==="1";
        var matchQ=!q || s.indexOf(q)>=0;
        var matchD=true;
        if(df==="diff")matchD=hasdiff;
        else if(df==="positive")matchD=de>0.01;
        else if(df==="negative")matchD=de<-0.01;
        else if(df==="big")matchD=Math.abs(dp)>=0.2;
        tr.style.display=(matchQ && matchD)?"":"none";
      });
    }
    var i=document.getElementById("cfSearch"); if(i)i.oninput=applyFilters;
    var f=document.getElementById("cfDeltaFilter"); if(f)f.onchange=applyFilters;
  }

  document.getElementById("cfPeriodSel").onchange=function(){renderForPeriod(this.value);};
  renderForPeriod(periods[0]);
}
