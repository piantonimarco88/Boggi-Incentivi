// ── #9 STORICO: snapshot builder + tab UI ─────────────────────────────────
// Salva snapshot dei calcoli correnti quando l'utente esegue "Salva Tutti i PDF".
// Visualizza il trend per matricola nel tab "📈 Storico".
//
// Persistenza: %LOCALAPPDATA%\BoggiIncentivi\snapshots\snapshot_<ts>_<mode>_<prize>.json
// Bridge: postMessage(listSnapshots) -> "snapshotsList:<json>"
//         postMessage(readSnapshot)  -> "snapshotData:<filename>:<json>"
//
// Chiamato dal wrapper C# (BtnSaveAllPDF_Click) dopo che almeno un PDF e` stato salvato.
// Ritorna stringa JSON con meta + array employees con dettagli calcolo.
function buildSnapshotForHistory(){
  try{
    var snap={
      schema_version:1,
      saved_at:new Date().toISOString(),
      app_version:(typeof APP_VERSION!=="undefined"?APP_VERSION:""),
      mode:MODE,
      region:REGION,
      prize_mode:PRIZE_MODE,
      season_period:SEASON_PERIOD,
      period:{
        month:CFG_MONTH,
        year:CFG_YEAR,
        season:(typeof CFG_SEASON!=="undefined"?CFG_SEASON:null)
      },
      params:JSON.parse(JSON.stringify(PARAMS||{})),
      n_employees:(E||[]).length,
      employees:[]
    };
    (E||[]).forEach(function(e){
      var t=0;try{t=calcE(e)||0}catch(ex){}
      var t_eur=0;try{t_eur=(typeof calcEUR==="function"?calcEUR(e):t)||0}catch(ex){t_eur=t;}
      var emp={
        m:e.m, c:e.c, n:e.n,
        s:e.s, si:e.si,
        j:e.j, f:e.f,
        cu:e.cu||"EUR",
        ex:(typeof e.ex==="number"?e.ex:1),
        ml:e.ml||0,
        ps:e.ps==="SI",
        tl:t,
        tl_eur:t_eur,
        agg:(typeof aggTotal==="function"?aggTotal(e.m):0)
      };
      // KPI breakdown (solo valori non-zero, per compattezza)
      var kpi={};
      if(typeof IT!=="undefined" && Array.isArray(IT)){
        IT.forEach(function(it){
          if(it.k==="vi")return;
          try{
            var raw=(typeof getVal==="function")?getVal(e,it.k):0;
            if(raw)kpi[it.k]={v:raw,on:(typeof isOn==="function"?isOn(e.j,it.k):true)};
          }catch(ex){}
        });
      }
      emp.kpi=kpi;
      snap.employees.push(emp);
    });
    return JSON.stringify(snap);
  }catch(ex){
    console.error("buildSnapshotForHistory:",ex);
    return null;
  }
}

// Costruisce una label compatta per il periodo dello snapshot.
// Formati:
//   mensile/fcvm: "MM/YYYY (Cons)" | "MM/YYYY (Prev)" | "MM/YYYY (FCC)" ...
//   seasonal:     "SS26 (Cons)" ecc.
function makePeriodKey(snap){
  var mode=snap.mode==="consuntivo"?"C":"P";
  if(snap.prize_mode==="seasonal"){
    var sn=(snap.period && snap.period.season) || "SEAS";
    return sn+" "+(snap.period && snap.period.year || "")+" ("+mode+")";
  }
  var mm=String((snap.period && snap.period.month)||"").padStart(2,"0");
  var yy=(snap.period && snap.period.year)||"";
  var tag=snap.prize_mode==="fcvm"?("FC"+mode):mode;
  return mm+"/"+yy+" ("+tag+")";
}

// Render del tab Storico. Asincrono: postMessage al C# -> handler -> render finale.
function rStorico(){
  var p8=document.getElementById("p8");
  if(!p8)return;
  if(!window.chrome||!window.chrome.webview){
    p8.innerHTML='<div style="padding:24px;color:#a09a92">Lo storico e` disponibile solo dentro l\'app Windows (richiede il wrapper C#).</div>';
    return;
  }
  p8.innerHTML='<div style="padding:24px;color:#a09a92">Caricamento storico...</div>';

  var pending=0, snapshots={};
  function onMsg(ev){
    if(typeof ev.data!=="string")return;
    if(ev.data.indexOf("snapshotsList:")===0){
      var list;
      try{list=JSON.parse(ev.data.slice("snapshotsList:".length));}
      catch(ex){list=[];}
      if(!list.length){
        window.chrome.webview.removeEventListener("message",onMsg);
        p8.innerHTML='<div style="padding:24px;color:#a09a92">Nessuno snapshot salvato.<br><br>Lo storico si popola automaticamente dopo ogni "Salva Tutti i PDF". Esegui la generazione PDF per il mese corrente e torna qui.</div>';
        return;
      }
      pending=list.length;
      list.forEach(function(meta){
        window.chrome.webview.postMessage({type:"readSnapshot",filename:meta.filename});
      });
    } else if(ev.data.indexOf("snapshotData:")===0){
      var rest=ev.data.slice("snapshotData:".length);
      var sep=rest.indexOf(":");
      if(sep<0){pending--;}
      else{
        var fn=rest.slice(0,sep), js=rest.slice(sep+1);
        try{snapshots[fn]=JSON.parse(js);}catch(ex){}
        pending--;
      }
      if(pending<=0){window.chrome.webview.removeEventListener("message",onMsg);renderStoricoTable(p8,snapshots);}
    } else if(ev.data.indexOf("snapshotError:")===0){
      pending--;
      if(pending<=0){window.chrome.webview.removeEventListener("message",onMsg);renderStoricoTable(p8,snapshots);}
    }
  }
  window.chrome.webview.addEventListener("message",onMsg);
  window.chrome.webview.postMessage({type:"listSnapshots"});
}

// Aggrega gli snapshot caricati per matricola e renderizza una tabella
// dipendenti x periodi, con delta % rispetto al periodo precedente.
function renderStoricoTable(container, snapshots){
  // Aggregazione
  var byMatr={};
  var periodKeys=[];
  var seen={};
  // Ordino i filename: piu` vecchi a sinistra (filename inizia con data ordinabile)
  var fileNames=Object.keys(snapshots).sort();
  fileNames.forEach(function(fn){
    var s=snapshots[fn];
    if(!s||!s.employees)return;
    var pk=makePeriodKey(s);
    if(!seen[pk]){seen[pk]=true;periodKeys.push(pk);}
    s.employees.forEach(function(emp){
      if(!byMatr[emp.m]){
        byMatr[emp.m]={m:emp.m,c:emp.c||"",n:emp.n||"",j:emp.j||"",s:emp.s||"",cu:emp.cu||"EUR",periods:{}};
      }
      byMatr[emp.m].periods[pk]={tl:emp.tl||0,ml:emp.ml||0,ps:!!emp.ps,cu:emp.cu||"EUR"};
    });
  });

  var rows=Object.keys(byMatr).map(function(k){return byMatr[k];})
    .sort(function(a,b){return (a.c||"").localeCompare(b.c||"");});

  // Render
  var h='<div style="padding:12px">';
  h+='<div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
  h+='<input id="storicoSearch" placeholder="Cerca matricola / cognome / nome..." style="padding:6px 10px;flex:1;min-width:240px;background:#1e1c1a;color:#f5f4f1;border:1px solid #555;border-radius:4px;font-size:12px">';
  h+='<span style="font-size:11px;color:#8a8680;white-space:nowrap">'+rows.length+' dipendenti · '+periodKeys.length+' periodi · '+fileNames.length+' snapshot</span>';
  h+='</div>';
  if(periodKeys.length===0){
    h+='<div style="padding:20px;color:#a09a92">Nessun periodo disponibile.</div></div>';
    container.innerHTML=h;return;
  }
  h+='<div style="overflow:auto;max-height:calc(100vh - 220px);border:1px solid #2c2925;border-radius:4px">';
  h+='<table style="border-collapse:collapse;font-size:11px;width:100%;min-width:900px">';
  h+='<thead><tr style="background:#2c2925;color:#c9a96e;position:sticky;top:0;z-index:1">';
  ["Matr.","Cognome","Nome","Ruolo","Store"].forEach(function(c){
    h+='<th style="padding:6px 8px;text-align:left;border:1px solid #444;white-space:nowrap">'+c+'</th>';
  });
  periodKeys.forEach(function(p){
    h+='<th style="padding:6px 8px;text-align:right;border:1px solid #444;white-space:nowrap;font-family:monospace;font-weight:600">'+esc(p)+'</th>';
  });
  h+='</tr></thead><tbody id="storicoTbody">';
  rows.forEach(function(r){
    var search=((r.m||"")+" "+(r.c||"")+" "+(r.n||"")).toLowerCase();
    h+='<tr class="storico-row" data-search="'+esc(search)+'" style="background:#1a1816">';
    h+='<td style="padding:5px 8px;border:1px solid #2c2925;font-family:monospace;color:#a09a92">'+esc(r.m)+'</td>';
    h+='<td style="padding:5px 8px;border:1px solid #2c2925;color:#f5f4f1">'+esc(r.c)+'</td>';
    h+='<td style="padding:5px 8px;border:1px solid #2c2925;color:#f5f4f1">'+esc(r.n)+'</td>';
    h+='<td style="padding:5px 8px;border:1px solid #2c2925;color:#8a8680;font-size:10px">'+esc(r.j)+'</td>';
    h+='<td style="padding:5px 8px;border:1px solid #2c2925;color:#8a8680;font-size:10px">'+esc(r.s)+'</td>';
    var prevVal=null;
    periodKeys.forEach(function(p){
      var pd=r.periods[p];
      if(!pd){
        h+='<td style="padding:5px 8px;border:1px solid #2c2925;text-align:right;color:#4a4744">—</td>';
        prevVal=null;
      } else {
        var v=pd.tl||0;
        var deltaHtml="";
        if(prevVal!==null && prevVal>0){
          var diff=(v-prevVal)/prevVal;
          var c2=diff>0.001?"#5bb98c":(diff<-0.001?"#cf5b5b":"#8a8680");
          var sign=diff>0?"+":"";
          deltaHtml='<br><span style="font-size:9px;color:'+c2+'">'+sign+(diff*100).toFixed(0)+'%</span>';
        }
        var color=v>0?"#c9a96e":"#6b6560";
        h+='<td style="padding:5px 8px;border:1px solid #2c2925;text-align:right;font-family:monospace;color:'+color+'">'+fc(v,pd.cu||r.cu)+deltaHtml+'</td>';
        prevVal=v;
      }
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';
  container.innerHTML=h;

  // Filtro testuale live
  var inp=document.getElementById("storicoSearch");
  if(inp){
    inp.oninput=function(){
      var q=this.value.toLowerCase().trim();
      document.querySelectorAll(".storico-row").forEach(function(tr){
        var s=tr.getAttribute("data-search")||"";
        tr.style.display=(!q || s.indexOf(q)>=0)?"":"none";
      });
    };
  }
}
