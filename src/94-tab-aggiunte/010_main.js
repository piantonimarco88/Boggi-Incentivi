function rAgg(){
  if(PRIZE_MODE==="fcvm"){rAggFcvm();return;}
  var h='<div style="font-size:12px;color:#6b6560;margin-bottom:14px"><b>Aggiunte manuali</b> \u2014 Importi inseriti qui si <b>sommano</b> ai premi calcolati e <b>non risentono</b> di regole, policy o malattia.</div>';
  h+='<div class="flt" style="margin-bottom:12px"><input placeholder="Cerca matricola, nome..." id="aggQ" value="'+esc(aggFilter)+'" style="padding:8px 12px;border-radius:6px;border:1px solid #d5d0c8;font-size:12px;flex:1;min-width:200px"></div>';
  
  // Use same sort order as Calcolo Premi (cSort)
  var sorted=E.slice();
  sorted.sort(function(a,b){
    var sa=Number(a.si)||0,sb=Number(b.si)||0;
    if(sa!==sb)return sa-sb;
    var ma=(a.m||"").toLowerCase(),mb=(b.m||"").toLowerCase();
    return ma<mb?-1:ma>mb?1:0;
  });
  
  if(aggFilter){var q=aggFilter.toLowerCase();sorted=sorted.filter(function(e){return(e.m&&e.m.toLowerCase().indexOf(q)>=0)||(e.c&&e.c.toLowerCase().indexOf(q)>=0)||(e.n&&e.n.toLowerCase().indexOf(q)>=0)||(e.s&&e.s.toLowerCase().indexOf(q)>=0)})}
  
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">'+Object.keys(AGG).length+" dipendenti con aggiunte attive \u00b7 "+sorted.length+" mostrati</div>";
  h+='<div class="scroll-wrap"><table style="font-size:10px"><thead><tr style="background:#eae7e1"><th style="padding:6px;cursor:default">Matr.</th><th style="padding:6px;cursor:default">Cognome</th><th style="padding:6px;cursor:default">Nome</th><th style="padding:6px;cursor:default">Negozio</th><th style="padding:6px;cursor:default">Ruolo</th>';
  AGG_KEYS.forEach(function(ak){h+='<th style="padding:6px;text-align:center;cursor:default;min-width:70px">'+ak.l+"</th>"});
  h+='<th style="padding:6px;text-align:right;cursor:default">Totale</th></tr></thead><tbody>';
  
  sorted.slice(0,500).forEach(function(e,i){
    var a=AGG[e.m]||{};var at=aggTotal(e.m);
    h+='<tr style="background:'+(at>0?"#fef9ef":i%2?"#faf9f7":"#fff")+'">';
    var uA=e.cu==="USD";
    h+='<td style="padding:4px 6px;font-family:monospace;font-size:10px">'+esc(e.m)+'</td><td style="padding:4px 6px">'+(uA?esc(e.c).toUpperCase():esc(e.c))+'</td><td style="padding:4px 6px">'+(uA?esc(e.n).toUpperCase():esc(e.n))+'</td><td style="padding:4px 6px;font-size:9px;color:#8a8680">'+(uA?esc(e.s).toUpperCase():esc(e.s))+'</td><td style="padding:4px 6px;font-size:9px">'+(uA?esc(e.f||e.j).toUpperCase():esc(e.f||e.j))+"</td>";
    AGG_KEYS.forEach(function(ak){
      var val=a[ak.k]||0;
      h+='<td style="padding:2px"><input type="number" data-m="'+esc(e.m)+'" data-k="'+ak.k+'" value="'+(val||"")+'" step="1" min="0" style="width:100%;padding:3px;border:1px solid '+(val>0?"#c9a96e":"#e5e1db")+';border-radius:3px;font-size:10px;text-align:right;font-family:inherit;background:'+(val>0?"#fef9ef":"#fff")+'"></td>'});
    h+='<td style="padding:4px 6px;text-align:right;font-weight:700;color:'+(at>0?"#c9a96e":"#d5d0c8")+'">'+fc(at,e.cu||"EUR")+"</td></tr>"});
  
  if(sorted.length>500)h+='<tr><td colspan="'+(5+AGG_KEYS.length+1)+'" style="padding:8px;text-align:center;color:#a09a92;font-size:11px">Mostrando 500 su '+sorted.length+'. Usa la ricerca per filtrare.</td></tr>';
  h+="</tbody></table></div>";
  h+='<div class="wb" style="margin-top:16px"><div style="font-size:11px;font-weight:700;color:#856404;margin-bottom:4px">\u2139 Come funzionano le Aggiunte</div><div style="font-size:11px;color:#856404;line-height:1.5">I valori inseriti qui vengono <b>sommati</b> ai premi calcolati normalmente. Non sono soggetti a regole di policy, soglie di fatturato, n\u00e9 al moltiplicatore malattia. Compaiono nella lettera come sezione separata "Aggiunte / Manual Adjustments". Le aggiunte vengono salvate nel file di configurazione JSON.</div></div>';
  document.getElementById("p5").innerHTML=h;
  
  document.getElementById("aggQ").oninput=function(){aggFilter=this.value;var pos=this.selectionStart;rAgg();var el=document.getElementById("aggQ");if(el){el.focus();el.selectionStart=el.selectionEnd=pos}};
  // Bind all input changes
  document.querySelectorAll("#p5 input[data-m]").forEach(function(inp){
    inp.onchange=function(){
      var m=inp.getAttribute("data-m"),k=inp.getAttribute("data-k"),v=parseFloat(inp.value)||0;
      if(v>0){if(!AGG[m])AGG[m]={};AGG[m][k]=v}
      else{if(AGG[m]){delete AGG[m][k];if(Object.keys(AGG[m]).length===0||(Object.keys(AGG[m]).every(function(kk){return!AGG[m][kk]})))delete AGG[m]}}
      rAgg()};
  });

}

function loadVisualExcel(input){
  var f=input.files[0];if(!f)return;input.value="";
  var reader=new FileReader();reader.onload=function(ev){try{
    var data=new Uint8Array(ev.target.result);
    var wb=XLSX.read(data,{type:"array"});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(json.length<2){alert("File Visual vuoto.");return;}
    // Trova header row
    var hdrRow=0;
    for(var ri=0;ri<Math.min(5,json.length);ri++){
      var rs=(json[ri]||[]).map(function(c){return String(c||'').toLowerCase()}).join('|');
      if(rs.indexOf('matr')>=0||rs.indexOf('id empl')>=0){hdrRow=ri;break;}
    }
    // Rileva colonne MATRICOLA, STORE ID e BDG
    var hdr={matr:-1,sid:-1,bdg:-1};
    (json[hdrRow]||[]).forEach(function(cell,ci){
      var s=String(cell||'').toLowerCase().trim();
      if(hdr.matr<0&&(s.indexOf('matr')>=0||s==='id'||s.indexOf('id empl')>=0))hdr.matr=ci;
      if(hdr.sid<0&&(s==='store id'||s==='storeid'||s==='sid'||s==='store'||
          s.indexOf('store')>=0||s.indexOf('negozio')>=0||s.indexOf('filiale')>=0||
          s.indexOf('id neg')>=0||s.indexOf('cod neg')>=0||s.indexOf('pdv')>=0||
          s.indexOf('punto vendita')>=0||s.indexOf('shop')>=0||s.indexOf('id store')>=0||
          s.indexOf('store_id')>=0||s.indexOf('codice')>=0))hdr.sid=ci;
      if(hdr.bdg<0&&(s==='bdg'||s.indexOf('importo')>=0||s.indexOf('premio')>=0||s.indexOf('amount')>=0))hdr.bdg=ci;
    });
    // Se SID non trovato per nome: cerca colonna con valori numerici che corrispondono a store ID in D.t
    if(hdr.sid<0){
      var _dtKeys=Object.keys(D.t);
      if(_dtKeys.length>0){
        var _colHits={};
        for(var _si=hdrRow+1;_si<Math.min(hdrRow+20,json.length);_si++){
          var _sr=json[_si];if(!_sr)continue;
          _sr.forEach(function(cell,ci){
            if(ci===hdr.matr||ci===hdr.bdg)return;
            var _sv=String(cell||'').trim();
            var _spi=parseInt(_sv);
            if(!isNaN(_spi)&&_dtKeys.indexOf(String(_spi))>=0)_colHits[ci]=(_colHits[ci]||0)+1;
          });
        }
        var _bestSid=-1,_bestHits=0;
        Object.keys(_colHits).forEach(function(ci){if(_colHits[ci]>_bestHits){_bestHits=_colHits[ci];_bestSid=parseInt(ci);}});
        if(_bestHits>0){hdr.sid=_bestSid;}
      }
    }
    if(hdr.matr<0||hdr.bdg<0){alert('Colonne MATRICOLA o BDG non trovate.\n\nColonne rilevate:\n'+(json[hdrRow]||[]).join(', '));return;}
    // Salva per-negozio: VL[matr] = [{sid, amt}, ...]
    VL={};
    var rowCount=0;
    for(var ri=hdrRow+1;ri<json.length;ri++){
      var row=json[ri];if(!row)continue;
      var rawMatr=String(row[hdr.matr]||'').trim().replace(/[^0-9]/g,'');
      if(!rawMatr)continue;
      var matr=rawMatr.padStart(7,'0');
      var bdgAmt=parseFloat(String(row[hdr.bdg]||'0').replace(',','.').replace(/[^0-9.\-]/g,''))||0;
      if(bdgAmt<=0)continue;
      // Normalizza SID: converti a intero per rimuovere zeri iniziali e parti decimali
      var _rawSid=hdr.sid>=0?String(row[hdr.sid]||'').trim():'';
      var storeSid=_rawSid?(function(){var _pi=parseInt(_rawSid);return isNaN(_pi)?_rawSid:String(_pi);}()):'';
      if(!VL[matr])VL[matr]=[];
      VL[matr].push({sid:storeSid,amt:bdgAmt});
      rowCount++;
    }
    var empCount=Object.keys(VL).length;
    var _sidInfo=hdr.sid>=0?('col.'+hdr.sid+' \u2714'):'NON TROVATA \u26a0 (il premio per negozio non sar\u00e0 calcolabile)';
    alert('Visual In Store caricato!\n\n'+empCount+' dipendenti \u00b7 '+rowCount+' righe elaborate\nColonne: MATR=col.'+hdr.matr+' | SID='+_sidInfo+' | BDG=col.'+hdr.bdg);
    autoSave();rSources();rC();
  }catch(ex){alert('Errore lettura Visual: '+ex.message);}};reader.readAsArrayBuffer(f);
}
