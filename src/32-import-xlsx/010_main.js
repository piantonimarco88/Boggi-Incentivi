// === CURRENCY & FC LOOKUP BY ENTE ===
var ENTE_CU={"209":{cu:"CHF",ex:1.3756},"211":{cu:"GBP",ex:1.1692},"213":{cu:"EUR",ex:1},"215":{cu:"EUR",ex:1},"216":{cu:"EUR",ex:1},"217":{cu:"EUR",ex:1},"219":{cu:"EUR",ex:1},"220":{cu:"HKD",ex:0.11764},"221":{cu:"EUR",ex:1},"222":{cu:"EUR",ex:1},"223":{cu:"SGD",ex:0.68603},"224":{cu:"SEK",ex:0.08836},"226":{cu:"HUF",ex:0.00253},"228":{cu:"EUR",ex:1},"230":{cu:"EUR",ex:1},"231":{cu:"EUR",ex:1},"240":{cu:"DKK",ex:1},"241":{cu:"USD",ex:0.9},"245":{cu:"USD",ex:0.9},"900":{cu:"EUR",ex:1}};
var ENTE_FC={};

// === JOB TITLE PARSER: take first recognized role from cell ===
function normalizeJob(raw){
  if(!raw)return{j:"SA",f:"SA"};
  var s=String(raw).toUpperCase().trim();
  // Match roles in priority order (longest first to avoid partial matches)
  var roles=["SSAP","SSA","SCS","VSM","SM","JSA","SA"];
  var f="SA";
  for(var i=0;i<roles.length;i++){
    // Match as whole word or at start: "SCS/SA" -> SCS, "SM / Visual" -> SM
    var rx=new RegExp("\\b"+roles[i]+"\\b");
    if(rx.test(s)){f=roles[i];break}
  }
  // j = f (modifiers DEPT/NO SAS/NO DIGITAL are applied by store settings)
  return{j:f,f:f};
}

// Parse number from string, handling thousand separators (1,234.56 or 1.234,56)
function parseNum(s){
  if(typeof s==="number")return s;
  s=String(s||"0").trim().replace(/[^\d.,\-]/g,"");
  if(!s||s==="0")return 0;
  // If both . and , present: last one is decimal separator
  var lastDot=s.lastIndexOf("."),lastComma=s.lastIndexOf(",");
  if(lastDot>=0&&lastComma>=0){
    if(lastComma>lastDot){s=s.replace(/\./g,"").replace(",",".")}// 1.234,56 -> 1234.56
    else{s=s.replace(/,/g,"")}// 1,234.56 -> 1234.56
  }else if(lastComma>=0){
    // Only comma: check if it's thousands (1,000) or decimal (1,5)
    var parts=s.split(",");
    if(parts.length===2&&parts[1].length===3)s=s.replace(",","");// 2,900 -> 2900
    else s=s.replace(",",".");// 1,5 -> 1.5
  }
  return parseFloat(s)||0;
}

// === LOAD ANAGRAFICA FROM EXCEL ===
// Fixed columns: A(0)=Id Empl, C(2)=Ente, E(4)=Store, F(5)=Store Name, G(6)=Cognome, H(7)=Nome
// I(8)=Job Title, J(9)=Salary, K(10)=Budget, P(15)=Data inizio rapporto, O(14)=Status, W(22)=Email
function loadAnagraficaExcel(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){
    try{
      var data=new Uint8Array(ev.target.result);
      var wb=XLSX.read(data,{type:"array",cellDates:true});
      // Find best sheet
      var sheet=null;
      var hints=["db","anagrafica","dipendenti","employees","personale","master"];
      wb.SheetNames.forEach(function(sn){
        var snl=sn.toLowerCase();
        if(!sheet){hints.forEach(function(h){if(snl.indexOf(h)>=0)sheet=sn})}
      });
      if(!sheet)sheet=wb.SheetNames[0];

      var ws=wb.Sheets[sheet];
      var json=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
      if(json.length<2){alert("Foglio vuoto.");return}

      // Find header row
      var hdrRow=0;
      for(var ri=0;ri<Math.min(5,json.length);ri++){
        var row=json[ri];if(!row)continue;
        var rowStr=row.map(function(c){return String(c||"").toLowerCase()}).join("|");
        if(rowStr.indexOf("cognome")>=0||rowStr.indexOf("id empl")>=0){hdrRow=ri;break}
      }

      // Hire date cutoff: giorno 5 del mese corrente dei premi
      var cutoffDate=new Date(CFG_YEAR,CFG_MONTH-1,5);
      var cutoffStr=cutoffDate.toISOString().slice(0,10);

      // Parse date from various formats
      function parseHireDate(val){
        if(!val)return null;
        if(val instanceof Date)return val;
        var s=String(val).trim();
        s=s.replace(/\s*tbc\s*/gi,"").replace(/\?+/g,"").replace(/…+/g,"").replace(/\.{3,}/g,"").trim();
        if(!s)return null;
        var m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if(m)return new Date(parseInt(m[1]),parseInt(m[2])-1,parseInt(m[3]));
        m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if(m)return new Date(parseInt(m[3]),parseInt(m[2])-1,parseInt(m[1]));
        m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if(m&&parseInt(m[1])>12)return new Date(parseInt(m[3]),parseInt(m[2])-1,parseInt(m[1]));
        return null;
      }

      // === ITALIA / ZUCCHETTI IMPORT ===
      if(REGION==="italia"){
        // Zucchetti columns (0-based): C(2)=Matricola, D(3)=Cognome, E(4)=Nome, N(13)=Job Title
        // O(14)=Gross Salary, P(15)=BDG lordo, Y(24)=CdC, Z(25)=CdC desc,
        // AY(50)=fallback BDG, CM(90)=Codice Fiscale, DG(110)=Email
        var ZC={matr:2,cogn:3,nome:4,hire:7,term:8,job:13,gross:14,bdg:15,cdc:24,cdcDesc:25,bdgFb:50,cf:90,email:110};
        // Rileva colonna email dall'header row (sovrascrive indice fisso)
        (json[hdrRow]||[]).forEach(function(cell,ci){var s=String(cell||'').toLowerCase().replace(/[\s\n\r]+/g,'');if(s.indexOf('email')>=0||s.indexOf('e-mail')>=0)ZC.email=ci;});
        // Rileva colonna Field Coach dall'header
        var fcColIT=-1;
        (json[hdrRow]||[]).forEach(function(cell,ci){var s=String(cell||'').toLowerCase().replace(/[\s\n\r]+/g,'');if(s==='fc'||s.indexOf('fieldcoach')>=0||s.indexOf('field coach')>=0||s.indexOf('coach')>=0)fcColIT=ci;});
        // Valid base job codes from incentive plan
        var validBaseJobs=PRIZE_MODE==="seasonal"?["SM","VSM"]:["SM","VSM","SSA","SSAP","SA","JSA","SCS"];
        function isValidJob(code){
          if(!code)return false;
          var up=String(code).toUpperCase().trim();
          for(var i=0;i<validBaseJobs.length;i++){if(up===validBaseJobs[i])return true}
          return false;
        }
        var itImported=[],itErrors=[];
        for(var ri=hdrRow+1;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          // Matricola — pad to 7 chars with leading zeros
          var rawMatr=String(row[ZC.matr]||"").trim();
          if(!rawMatr)continue;
          rawMatr=rawMatr.replace(/[^0-9]/g,"");
          if(!rawMatr){itErrors.push({row:ri+1,name:"",reason:"Matricola non valida: "+row[ZC.matr]});continue}
          var matricola=rawMatr.padStart(7,"0");

          var cognome=String(row[ZC.cogn]||"").trim().toUpperCase();
          var nome=String(row[ZC.nome]||"").trim().toUpperCase();
          var fullName=cognome+" "+nome;
          if(!cognome&&!nome)continue;

          // Cessazione (Col I): escludi solo se cessato PRIMA del primo giorno del mese successivo
          // Es. premio aprile → includi se data cessazione >= 1 maggio
          var termRaw=row[ZC.term];
          if(termRaw!=null&&String(termRaw).trim()!==""){
            var termDate=parseHireDate(termRaw);
            if(termDate){
              var nextMonthStart=new Date(CFG_YEAR,CFG_MONTH,1);// 1° giorno mese successivo
              if(termDate<nextMonthStart){
                itErrors.push({row:ri+1,name:fullName,reason:"Cessato/dimesso il "+termDate.toISOString().slice(0,10)+" (cessazione nel mese premi o precedente)"});
                continue;
              }
              // termDate >= nextMonthStart: attivo durante il mese premi, includi
            } else {
              // Data non parsabile: escludi per sicurezza
              itErrors.push({row:ri+1,name:fullName,reason:"Data cessazione non leggibile: "+String(termRaw)});
              continue;
            }
          }

          // Data assunzione (Col H): deve essere <= cutoffDate
          var hireDateRaw=row[ZC.hire];
          var hireDate=parseHireDate(hireDateRaw);
          if(hireDate&&hireDate.toISOString().slice(0,10)>cutoffDate.toISOString().slice(0,10)){
            var hdStr=hireDate.toISOString().slice(0,10);
            itErrors.push({row:ri+1,name:fullName,reason:"Assunto il "+hdStr+" \u2014 dopo il limite "+cutoffStr+" (giorno 5 di "+MONTH_NAMES.IT[CFG_MONTH]+" "+CFG_YEAR+")"});
            continue;
          }
          if(!hireDate&&hireDateRaw){
            itErrors.push({row:ri+1,name:fullName,reason:"Data assunzione non leggibile: "+hireDateRaw});
            continue;
          }

          // Job title — filter: only valid plan jobs
          var rawJob=String(row[ZC.job]||"").trim().toUpperCase();
          if(!isValidJob(rawJob)){
            itErrors.push({row:ri+1,name:fullName,reason:"Job title '"+rawJob+"' non previsto nel piano incentivi (validi: "+validBaseJobs.join(", ")+")"});
            continue;
          }

          // BDG lordo: col P, fallback col AY
          var bdgVal=parseNum(String(row[ZC.bdg]||""));
          var ibFromAY=false;
          if(!bdgVal||bdgVal<=0){bdgVal=parseNum(String(row[ZC.bdgFb]||""));if(bdgVal>0)ibFromAY=true;}

          // Gross Salary (col O) — may be empty
          var grossSal=parseNum(String(row[ZC.gross]||""));

          // Centro di costo — store id: must start with digit and be <= 6500
          var cdcRaw=String(row[ZC.cdc]||"").trim();
          var cdcNum=parseInt(cdcRaw);
          if(!cdcRaw||!/^\d/.test(cdcRaw)||isNaN(cdcNum)){
            itErrors.push({row:ri+1,name:fullName,reason:"Centro di costo '"+cdcRaw+"' non numerico \u2014 escluso (sede/ufficio)"});
            continue;
          }
          if(cdcNum>(PRIZE_MODE==="seasonal"?4999:6500)){
            itErrors.push({row:ri+1,name:fullName,reason:"Centro di costo "+cdcNum+" escluso"+(PRIZE_MODE==="seasonal"?" (seasonal: solo store \u2264 4999)":"")});
            continue;
          }
          var cdcDesc=String(row[ZC.cdcDesc]||"").trim();

          // Codice fiscale
          var cf=String(row[ZC.cf]||"").trim().toUpperCase();

          // Email
          var email=String(row[ZC.email]||"").trim().replace(/[\s\n\r]+/g,"");

          // Validation: must have either BDG or meaningful data
          if(!bdgVal&&!grossSal){
            itErrors.push({row:ri+1,name:fullName,reason:"BDG lordo e Gross Salary entrambi vuoti"});
            continue;
          }

          // Build store name
          var storeName=(!isNaN(cdcNum)?(cdcNum+" "):"")+(cdcDesc||cdcRaw||"N/D");
          storeName=storeName.toUpperCase();

          var emp={
            si:!isNaN(cdcNum)?cdcNum:cdcRaw,
            s:storeName,
            m:matricola,
            c:cognome,n:nome,
            j:rawJob,f:rawJob,
            rl:grossSal||0,ib:bdgVal||0,
            fc:"",en:210,// Italia = ente 210
            rb:0,rbn:0,rd:0,rs:0,rp:0,rsa:0,rdc:0,rcs:0,ra:0,
            ml:0,vi:0,tl:0,tn:0,sc:0,il:0,
            ps:"NO",dv:0,md:0,pq:0,
            cu:"EUR",ex:1,
            mp:email,
            mf:(function(){
              // 1. Colonna FC dall'anagrafica Excel (priorità massima)
              if(fcColIT>=0&&row[fcColIT]){var _fn=String(row[fcColIT]).trim();if(_fn)return _fn.toLowerCase().replace(/ /g,'.')+'@boggi.com';}
              // 2. FC_MAP da import FC+VM
              var _mp=FC_MAP[String(cdcNum)];if(_mp){var _fa=Array.isArray(_mp.fc)?_mp.fc[0]:_mp.fc;if(_fa&&FC_EMP[_fa]){var _fe=FC_EMP[_fa];return (_fe.n+' '+_fe.c).toLowerCase().replace(/ /g,'.')+'@boggi.com';}}
              return '';
            })(),
            cf:cf,// codice fiscale extra field
            ibFromAY:ibFromAY// true se BDG viene da colonna AY (→ trasferta, non premio di risultato)
          };
          itImported.push(emp);
        }
        showImportReport(itImported,itErrors,sheet,file.name,cutoffStr);
        return;
      }
      // === END ITALIA BRANCH ===

      var imported=[],errors=[];
      for(var ri=hdrRow+1;ri<json.length;ri++){
        var row=json[ri];if(!row)continue;
        var cdc=row[4];if(!cdc)continue;// Col E = store
        cdc=parseInt(cdc);if(isNaN(cdc))continue;

        var cognome=String(row[6]||"").trim();// Col G
        var nome=String(row[7]||"").trim();// Col H
        var fullName=cognome+" "+nome;
        if(!cognome&&!nome)continue;

        // Status filter (Col O = 14): only Active (or empty = treat as active for new hires)
        var status=String(row[14]||"").trim().toLowerCase();
        if(status&&status!=="active"){
          errors.push({row:ri+1,name:fullName,reason:"Status non Active: "+row[14]});
          continue;
        }

        // Hire date filter (Col P = 15)
        var hireDateRaw=row[15];
        var hireDate=parseHireDate(hireDateRaw);
        if(hireDate&&hireDate.toISOString().slice(0,10)>cutoffDate.toISOString().slice(0,10)){
          var hdStr=hireDate.toISOString().slice(0,10);
          errors.push({row:ri+1,name:fullName,reason:"Assunto il "+hdStr+" \u2014 dopo il limite "+cutoffStr+" (giorno 5 di "+MONTH_NAMES.IT[CFG_MONTH]+" "+CFG_YEAR+")"});
          continue;
        }
        if(!hireDate&&hireDateRaw){
          // Could not parse date, check if it contains future year/month hints
          var rawStr=String(hireDateRaw);
          // Try to detect if it's clearly in the future
          var possibleDate=rawStr.replace(/[^0-9\/\-]/g,"").trim();
          if(!possibleDate){
            errors.push({row:ri+1,name:fullName,reason:"Data assunzione non leggibile: "+hireDateRaw});
            continue;
          }
        }

        // Matricola (Col A = 0)
        var eid=row[0];
        var matricola;
        if(eid){
          var eidNum=parseInt(String(eid).replace(/[^0-9]/g,""));
          if(!isNaN(eidNum)&&eidNum>0)matricola=String(eid).trim(); // usa matricola originale senza aggiungere A
          else{errors.push({row:ri+1,name:fullName,reason:"ID non valido: "+eid});continue}
        }else{
          matricola="X"+String(ri).padStart(7,"0");
          errors.push({row:ri+1,name:fullName,reason:"ID mancante, matricola temporanea: "+matricola+" (riga importata con warning)"});
          // Don't skip, import with warning
        }

        // Ente (Col C = 2)
        var ente=parseInt(row[2])||210;
        var cuInfo=ENTE_CU[String(ente)]||{cu:"EUR",ex:1};
        // FC per negozio: FC_MAP se disponibile, fallback ENTE_FC[ente]
        var fc="";
        (function(){var _mp=FC_MAP[String(cdc)];if(_mp){var _fa=Array.isArray(_mp.fc)?_mp.fc[0]:_mp.fc;if(_fa&&FC_EMP[_fa]){var _fe=FC_EMP[_fa];fc=_fe.n+' '+_fe.c;return;}}fc=ENTE_FC[String(ente)]||'';})();

        // Job (Col I = 8)
        var rawJob=row[8]?String(row[8]).trim():"SA";
        var nj=normalizeJob(rawJob);

        // Seasonal: solo SM e VSM
        if(PRIZE_MODE==="seasonal"){
          var baseJobUp=nj.f?nj.f.toUpperCase():"";
          if(baseJobUp!=="SM"&&baseJobUp!=="VSM"){
            errors.push({row:ri+1,name:fullName,reason:"Seasonal: ruolo '"+rawJob+"' escluso (solo SM/VSM)"});
            continue;
          }
        }

        // Salary (Col J = 9) — handle thousand separators
        var salStr=String(row[9]||"0").trim();
        var salary=parseNum(salStr);
        if(salary<=0){errors.push({row:ri+1,name:fullName,reason:"Stipendio zero o mancante"});continue}

        // Budget (Col K = 10)
        var bdg=parseNum(String(row[10]||"0").trim());

        // Store name (Col F = 5)
        var storeDesc=String(row[5]||"").trim();
        var storeName=(cdc+" "+(storeDesc||"Store "+cdc)).toUpperCase();

        // Rileva colonna Field Coach dall'header (internazionale)
        var fcColINT=-1;
        (json[hdrRow]||[]).forEach(function(cell,ci){var s=String(cell||"").toLowerCase().replace(/[\s\n\r]+/g,"");if(s==="fc"||s.indexOf("fieldcoach")>=0||s.indexOf("field coach")>=0||s.indexOf("coach")>=0)fcColINT=ci;});
        // Email — rileva colonna dall'header, fallback W(22)
        var emailCol=22;
        (json[hdrRow]||[]).forEach(function(cell,ci){var s=String(cell||"").toLowerCase().replace(/[\s\n\r]+/g,"");if(s.indexOf("email")>=0||s.indexOf("e-mail")>=0)emailCol=ci;});
        var email=String(row[emailCol]||"").trim().replace(/[\s\n\r]+/g,"");

        var emp={
          si:cdc,s:storeName,m:matricola,
          c:cognome.toUpperCase(),n:nome.toUpperCase(),
          j:nj.j,f:nj.f,rl:salary,ib:bdg,
          fc:fc,en:ente,
          rb:0,rbn:0,rd:0,rs:0,rp:0,rsa:0,rdc:0,rcs:0,ra:0,
          ml:0,vi:0,tl:0,tn:0,sc:0,il:0,
          ps:"NO",dv:0,md:0,pq:0,
          cu:cuInfo.cu,ex:cuInfo.ex,
          mp:email,
          mf:(function(){
            // 1. Colonna FC dall'anagrafica Excel (priorità massima)
            if(fcColINT>=0&&row[fcColINT]){var _fn=String(row[fcColINT]).trim();if(_fn)return _fn.toLowerCase().replace(/ /g,'.')+'@boggi.com';}
            // 2. FC_MAP / ENTE_FC fallback
            return fc?fc.toLowerCase().replace(/ /g,'.')+'@boggi.com':'';
          })()
        };
        // Mid-season internazionale: escludi dept store (premio solo a fine stagione)
        if(PRIZE_MODE==="seasonal"&&SEASON_PERIOD==="mid"&&isD(cdc)){
          errors.push({row:ri+1,name:fullName,reason:"Dept store ("+cdc+") escluso dal Mid-Season — premio solo a fine stagione"});
          continue;
        }
        imported.push(emp);
      }

      showImportReport(imported,errors,sheet,file.name,cutoffStr);

    }catch(ex){alert("Errore lettura: "+ex.message)}
  },50)};
  reader.readAsArrayBuffer(file);
}

function showImportReport(imported,errors,sheet,filename,cutoffStr){
  var isIT=REGION==="italia";
  var h='<div class="wg" style="margin-top:16px"><div class="wg-title">\ud83d\udcca Report Importazione Anagrafica'+(isIT?' <span style="background:#0055a4;color:#fff;font-size:9px;padding:2px 6px;border-radius:3px;margin-left:6px">ITALIA / Zucchetti</span>':'')+'</div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:4px">File: <b>'+esc(filename)+'</b> \u2014 Foglio: <b>'+esc(sheet)+'</b></div>';
  if(isIT)h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">Modalit\u00e0: <b>Italia</b> \u2014 Filtro job title piano incentivi \u2014 Data assunzione limite: <b>\u2264 '+esc(cutoffStr)+'</b></div>';
  else h+='<div style="font-size:10px;color:#8a8680;margin-bottom:8px">Periodo: <b>'+getMonthYearLabel()+'</b> \u2014 Data assunzione limite: <b>\u2264 '+esc(cutoffStr)+'</b> (giorno 5 del mese corrente)</div>';
  // Bottoni in cima
  if(imported.length>0){
    h+='<div style="display:flex;gap:8px;margin-bottom:10px">';
    h+='<button class="exp-btn primary" onclick="applyImportedAnagrafica()">&#10004; Applica '+imported.length+' dipendenti</button>';
    h+='<button class="exp-btn" onclick="window._pendingImport=null;window._pendingErrors=null;var el=document.getElementById(\'scanResults\');if(el)el.innerHTML=\'\'">&#10005; Cancella</button>';
    h+='<button class="exp-btn" onclick="downloadImportLog()" style="margin-left:auto">&#128190; Scarica Report</button>';
    h+='</div>';
    h+='<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:10px;color:#856404">';
    h+='⚠ Cliccando "Applica" l\'anagrafica corrente verrà <b>sostituita</b> e tutti i dati di target/consuntivo verranno <b>azzerati</b>.</div>';
  }
  h+='<div style="display:flex;gap:16px;margin-bottom:12px">';
  h+='<div style="background:#f0faf2;border:1px solid #d4edda;border-radius:6px;padding:10px 16px;flex:1;text-align:center"><div style="font-size:24px;font-weight:800;color:#2d7a3a">'+imported.length+'</div><div style="font-size:10px;color:#6b6560">Importabili</div></div>';
  h+='<div style="background:'+(errors.length?"#fef6f0":"#f0faf2")+';border:1px solid '+(errors.length?"#f8d7da":"#d4edda")+';border-radius:6px;padding:10px 16px;flex:1;text-align:center"><div style="font-size:24px;font-weight:800;color:'+(errors.length?"#cf5b5b":"#2d7a3a")+'">'+errors.length+'</div><div style="font-size:10px;color:#6b6560">Esclusi</div></div></div>';

  if(errors.length){
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#856404;margin-bottom:4px">Dettaglio esclusi:</div>';
    h+='<div class="scroll-wrap" style="max-height:200px"><table style="font-size:9px;width:100%"><thead><tr style="background:#fef6f0"><th style="padding:4px">Riga Excel</th><th style="padding:4px">Dipendente</th><th style="padding:4px">Motivo esclusione</th></tr></thead><tbody>';
    errors.forEach(function(er){h+='<tr><td style="padding:3px">'+er.row+'</td><td style="padding:3px">'+esc(er.name)+'</td><td style="padding:3px;color:#cf5b5b">'+esc(er.reason)+'</td></tr>'});
    h+='</tbody></table></div></div>';
  }

  if(imported.length>0){
    // Preview first 20 imported
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#2d7a3a;margin-bottom:4px">Anteprima importati (primi '+Math.min(20,imported.length)+' di '+imported.length+'):</div>';
    h+='<div class="scroll-wrap" style="max-height:220px"><table style="font-size:9px;width:100%"><thead><tr style="background:#f0faf2">';
    if(isIT)h+='<th style="padding:4px">Matricola</th><th style="padding:4px">Cognome</th><th style="padding:4px">Nome</th><th style="padding:4px">Job</th><th style="padding:4px">CdC</th><th style="padding:4px">CdC Desc</th><th style="padding:4px">BDG\u20ac</th><th style="padding:4px">CF</th><th style="padding:4px">Email</th>';
    else h+='<th style="padding:4px">Matricola</th><th style="padding:4px">Cognome</th><th style="padding:4px">Nome</th><th style="padding:4px">Job</th><th style="padding:4px">Store</th><th style="padding:4px">Salary</th><th style="padding:4px">BDG</th><th style="padding:4px">Valuta</th><th style="padding:4px">Email</th>';
    h+='</tr></thead><tbody>';
    imported.slice(0,20).forEach(function(e){
      h+='<tr>';
      if(isIT)h+='<td style="padding:3px">'+esc(e.m)+'</td><td style="padding:3px">'+esc(e.c)+'</td><td style="padding:3px">'+esc(e.n)+'</td><td style="padding:3px;font-weight:700">'+esc(e.j)+'</td><td style="padding:3px">'+esc(String(e.si))+'</td><td style="padding:3px">'+esc(e.s)+'</td><td style="padding:3px;text-align:right">'+e.ib+'</td><td style="padding:3px;font-family:monospace;font-size:8px">'+esc(e.cf||"")+'</td><td style="padding:3px;font-size:8px">'+esc(e.mp)+'</td>';
      else h+='<td style="padding:3px">'+esc(e.m)+'</td><td style="padding:3px">'+esc(e.c)+'</td><td style="padding:3px">'+esc(e.n)+'</td><td style="padding:3px;font-weight:700">'+esc(e.j)+'</td><td style="padding:3px">'+esc(e.si+" "+e.s)+'</td><td style="padding:3px;text-align:right">'+e.rl+'</td><td style="padding:3px;text-align:right">'+e.ib+'</td><td style="padding:3px">'+esc(e.cu)+'</td><td style="padding:3px;font-size:8px">'+esc(e.mp)+'</td>';
      h+='</tr>';
    });
    if(imported.length>20)h+='<tr><td colspan="9" style="padding:4px;text-align:center;color:#8a8680;font-style:italic">... e altri '+(imported.length-20)+' dipendenti</td></tr>';
    h+='</tbody></table></div></div>';
  }
  h+='</div>';

  window._pendingImport=imported;
  window._pendingErrors=errors;
  window._pendingFile=filename;

  var el=document.getElementById("scanResults");
  if(el)el.innerHTML=h;
}

function applyImportedAnagrafica(){
  if(!window._pendingImport||!window._pendingImport.length){alert("Nessun dato da importare.");return}
  if(!confirm("Sostituire l'anagrafica con "+window._pendingImport.length+" dipendenti?\n\nI dati di target fatturato, consuntivo e KPI verranno azzerati.\nDovrai ricaricarli per "+getMonthYearLabel()+"."))return;

  var oldLen=E.length;
  // Replace E array
  E.length=0;
  window._pendingImport.forEach(function(emp){E.push(emp)});
  D.e=E;

  // Reset target data (D.t) - clear all store targets
  D.t={};
  // Reset consuntivo data (D.c mensile) and D.cs (seasonal) - clear all
  D.c={};D.cs={};
  // Reset store summary (D.s) - rebuild empty from new employees
  D.s={};
  E.forEach(function(emp){
    var sid=String(emp.si);
    if(!D.s[sid])D.s[sid]={l:"",f:0,s:0,e:0,r:0};
  });
  // Reset employee variables (D.v)
  D.v={};
  // Reset USA data
  D.usa={};
  // Reset Visual In Store list
  VL={};
  // Reset Aggiunte
  AGG={};
  // Reset load results
  LOAD_RESULTS={};
  // Note: D.tr (translations) and ENTE_CU (exchange rates) are preserved
  // They can be reloaded separately via Fonti Dati if needed

  // Update header count
  var hs=document.getElementById("hs");
  updateHeaderCount();

  // Rebuild all tabs
  rC();rA();rSources();rDist();rAgg();rT();autoSave();
  alert("Anagrafica aggiornata: "+E.length+" dipendenti (precedenti: "+oldLen+").\n\nTarget, consuntivo e KPI azzerati. Ricarica i dati per "+getMonthYearLabel()+".");
}

// ── IMPORT ANAGRAFICA USA (formato Estrazione_Piantoni) ─────────────────────
function loadAnagraficaUSA(file){
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var wb=XLSX.read(ev.target.result,{type:"array"});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
      if(!rows||rows.length<2){alert("File USA vuoto o non leggibile.");return;}

      var imported=[],skipped=0,added=0;
      var newStores={}; // si -> store name

      // Rileva colonna Field Coach dall'header (riga 0)
      var fcColUSA=-1;
      (rows[0]||[]).forEach(function(cell,ci){var s=String(cell||'').toLowerCase().replace(/[\s\n\r]+/g,'');if(s==='fc'||s.indexOf('fieldcoach')>=0||s.indexOf('field coach')>=0||s.indexOf('coach')>=0)fcColUSA=ci;});

      for(var i=1;i<rows.length;i++){
        var r=rows[i];
        if(!r||!r[0])continue;

        var si=String(r[0]||"").trim();
        var storeName=String(r[1]||"").trim();
        var nome=String(r[2]||"").trim();
        var cognome=String(r[3]||"").trim();
        var jt=String(r[4]||"").trim();
        var cm=parseFloat(r[6])||0;            // col G (idx 6) = % commissione
        var storeType=String(r[8]||"").trim(); // col I (idx 8) = tipo negozio

        // Escludi righe con commissione 0
        if(!cm||cm<=0){skipped++;continue;}
        // Escludi righe senza store o nome
        if(!si||!nome){skipped++;continue;}

        // Dept Stores: useStore override a prescindere dal job
        var isDept=(storeType.toLowerCase().indexOf("dept")>=0);

        // Matricola sintetica: storeID + cognome + nome (no spazi)
        var matricola="US"+si+"_"+cognome.replace(/\s/g,"").substring(0,6)+"_"+nome.replace(/\s/g,"").substring(0,4);

        // Determina funzione normalizzata
        var fNorm=jt.replace(/\s+/g,"").toUpperCase();
        if(fNorm.indexOf("SM")>=0&&fNorm.indexOf("VSM")<0&&fNorm.indexOf("STOCK")<0&&fNorm.indexOf("ATOCK")<0)fNorm="SM";
        else if(fNorm.indexOf("VSM")>=0&&fNorm.indexOf("STOCK")<0&&fNorm.indexOf("ATOCK")<0)fNorm="VSM";
        else if(fNorm.indexOf("SSAP")>=0)fNorm="SSAP";
        else if(fNorm.indexOf("SSA")>=0)fNorm="SSA";
        else if(fNorm.indexOf("JSA")>=0)fNorm="JSA";
        else if(fNorm.indexOf("SCS")>=0)fNorm="SCS";
        else if(fNorm.indexOf("STOCK")>=0||fNorm.indexOf("ATOCK")>=0)fNorm="STK"; // STOCK/ATOCK → STK
        else if(fNorm.indexOf("SA")>=0)fNorm="SA";
        else fNorm="SA"; // default

        var emp={
          si:Number(si),
          s:(String(si)+" "+(storeName||"STORE "+si)).toUpperCase(),
          m:matricola,
          n:nome,
          c:cognome,
          j:jt,
          f:fNorm,
          rl:0,          // salary non disponibile in questo formato
          ib:0,          // budget non disponibile
          cu:"USD",
          ex:0.9, // 1 USD = 0.90 EUR (fixed rate)
          ml:0,
          vi:0,
          tl:0,
          tn:0,
          ps:"NO",       // USA employees: premio attivo di default
          fc:(fcColUSA>=0&&r[fcColUSA])?String(r[fcColUSA]).trim():"",
          en:241,        // ente USA
          mp:"",
          mf:(function(){var _fn=(fcColUSA>=0&&r[fcColUSA])?String(r[fcColUSA]).trim():"";return _fn?_fn.toLowerCase().replace(/ /g,'.')+'@boggi.com':'';}()),
          rb:0,rbn:0,rd:0,rs:0,rp:0,rsa:0,rdc:0,rcs:0,ra:0,sc:0,il:0,dv:0,md:0,pq:0
        };

        newStores[si]=storeName;

        // Flag dept store in STORE_FLAGS (per la logica USA dept è useStore a prescindere dal job)
        if(isDept){
          if(!STORE_FLAGS[si])STORE_FLAGS[si]={};
          STORE_FLAGS[si].dept=true;
          STORE_FLAGS[si].usaDept=true; // flag distinto per logica USA dept
        }

        // Aggiorna/crea record in D.usa con la commissione
        if(!D.usa)D.usa={};
        D.usa[matricola]={
          cm:cm,
          ps:0,   // personal sales (da caricare a consuntivo)
          st:0,   // store turnover (da caricare)
          sb:0,   // store budget hit
          tp:0,   // total prize
          isDept:isDept  // flag dept store
        };

        // Se Dept Store: forza useStore=true nella configurazione USA_P per questo job
        // (già gestito globalmente dalla configurazione, ma salviamo il flag per riferimento)

        imported.push(emp);
        added++;
      }

      if(!added){
        alert("Nessun dipendente USA importato (tutte le righe hanno commissione 0 o dati mancanti).\nRighe scartate: "+skipped);
        return;
      }

      // Salva pending (NON modifica E ancora — aspetta conferma "Applica")
      window._pendingImportUSA=imported;
      window._pendingNewStoresUSA=newStores;
      window._pendingSkippedUSA=skipped;
      window._pendingFileUSA=file.name;

      // Mostra report nel div scanResults (come anagrafica standard)
      var storeList=Object.keys(newStores).map(function(si){return si+" "+newStores[si];}).join(", ");
      var repH='<div class="wg" style="margin-top:16px"><div class="wg-title">&#127482;&#127480; Report Importazione Anagrafica USA</div>';
      repH+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
      repH+='<span style="background:#d4edda;color:#155724;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:700">✓ '+added+' dipendenti importati</span>';
      if(skipped>0)repH+='<span style="background:#fff3cd;color:#856404;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:700">⚠ '+skipped+' righe escluse (cm=0)</span>';
      repH+='</div>';
      repH+='<div style="font-size:10px;color:#6b6560;margin-bottom:8px">Store USA rilevati: <b>'+storeList+'</b></div>';
      repH+='<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px"><thead><tr style="background:#2c2925;color:#f5f4f1"><th style="padding:4px 8px;text-align:left">Matricola</th><th style="padding:4px 8px;text-align:left">Nome</th><th style="padding:4px 8px;text-align:left">Negozio</th><th style="padding:4px 8px;text-align:left">Ruolo</th><th style="padding:4px 8px;text-align:right">Comm%</th><th style="padding:4px 8px;text-align:center">Dept</th></tr></thead><tbody>';
      imported.forEach(function(emp,i){
        var ud=D.usa&&D.usa[emp.m]||{};
        repH+='<tr style="background:'+(i%2?'#faf9f7':'#fff')+'"><td style="padding:3px 8px;font-family:monospace">'+esc(emp.m)+'</td><td style="padding:3px 8px">'+esc(emp.n)+' '+esc(emp.c)+'</td><td style="padding:3px 8px">'+esc(emp.s)+'</td><td style="padding:3px 8px">'+esc(emp.f)+'</td><td style="padding:3px 8px;text-align:right">'+((ud.cm||0)*100).toFixed(2)+'%</td><td style="padding:3px 8px;text-align:center">'+(ud.isDept?'✓':'—')+'</td></tr>';
      });
      repH+='</tbody></table>';
      repH+='<div style="display:flex;gap:8px"><button class="exp-btn primary" onclick="applyImportedUSAAnagrafica()">✓ Applica '+added+' dipendenti USA</button>';
      repH+='<button class="exp-btn" onclick="downloadUSAImportLog()">⬇ Scarica Log</button></div></div>';
      rSources(); // Ricostruisce il tab (incluso scanResults vuoto)
      var el=document.getElementById("scanResults");
      if(el)el.innerHTML=repH; // Ora mostra il report nel div appena ricreato
    }catch(ex){
      alert("Errore importazione anagrafica USA: "+ex.message);
      console.error(ex);
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyImportedUSAAnagrafica(){
  var imported=window._pendingImportUSA;
  var newStores=window._pendingNewStoresUSA||{};
  if(!imported||!imported.length){alert("Nessun dato da applicare.");return;}
  if(!confirm("Aggiungere/sostituire "+imported.length+" dipendenti USA?\n\nI dipendenti non-USA rimarranno invariati."))return;
  // Applica stores
  Object.keys(newStores).forEach(function(si){var n=Number(si);if(USA_STORES.indexOf(n)<0)USA_STORES.push(n);});
  D.us=USA_STORES.slice();
  // Applica dipendenti
  var nonUSA=E.filter(function(e){return e.cu!=="USD";});
  E.length=0;nonUSA.forEach(function(e){E.push(e);});imported.forEach(function(e){E.push(e);});
  D.e=E;
  updateHeaderCount();
  window._pendingImportUSA=null;
  window._pendingNewStoresUSA=null;
  var el=document.getElementById("scanResults");if(el)el.innerHTML="";
  rC();rA();rSources();rAgg();autoSave();
  alert("\u2705 Anagrafica USA applicata: "+imported.length+" dipendenti USA aggiornati.");
}

function downloadUSAImportLog(){
  var imp=window._pendingImportUSA||[];
  var lines=["REPORT IMPORTAZIONE ANAGRAFICA USA","File: "+(window._pendingFileUSA||""),"","IMPORTATI: "+imp.length,"ESCLUSI (cm=0): "+(window._pendingSkippedUSA||0),"","MATRICOLA;NOME;COGNOME;NEGOZIO;RUOLO;JOB_TITLE;COMMISSION%;DEPT"];
  imp.forEach(function(e){var ud=D.usa&&D.usa[e.m]||{};lines.push([e.m,e.n,e.c,e.s,e.f,e.j,((ud.cm||0)*100).toFixed(2)+"%",ud.isDept?"DEPT":""].join(";"));});
  var blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="import_usa_"+new Date().toISOString().slice(0,10)+".csv";a.click();
}

function downloadImportLog(){
  var imp=window._pendingImport||[];
  var err=window._pendingErrors||[];
  var isIT=REGION==="italia";
  var lines=["REPORT IMPORTAZIONE ANAGRAFICA"+(isIT?" (ITALIA / ZUCCHETTI)":"")+" - "+getMonthYearLabel(),"File: "+(window._pendingFile||""),"","IMPORTATI: "+imp.length,"SCARTATI/WARNING: "+err.length,""];
  lines.push("=== IMPORTATI ===");
  if(isIT){
    lines.push("MATRICOLA;COGNOME;NOME;JOB_TITLE;CDC;CDC_DESC;BDG_LORDO;GROSS_SALARY;CODICE_FISCALE;EMAIL");
    imp.forEach(function(e){lines.push([e.m,e.c,e.n,e.j,e.si,e.s,e.ib,e.rl,e.cf||"",e.mp].join(";"))});
  }else{
    lines.push("MATRICOLA;COGNOME;NOME;STORE;RUOLO_ORIG;FUNZIONE;SALARY;VALUTA;EMAIL");
    imp.forEach(function(e){lines.push([e.m,e.c,e.n,e.si+" "+e.s,e.j,e.f,e.rl,e.cu,e.mp].join(";"))});
  }
  if(err.length){
    lines.push("");lines.push("=== SCARTATI/WARNING ===");
    lines.push("RIGA;DIPENDENTE;MOTIVO");
    err.forEach(function(er){lines.push([er.row,er.name,er.reason].join(";"))});
  }
  var blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="import_report_"+(isIT?"italia_":"")+getPdfSubfolder().base+".csv";a.click();
}

function scanExcelFile(file,phase){
  if(phase==="target"){loadTargetExcel(file)}
  else{loadResultsExcel(file)}
}

// === RESET ALL DATA ===

// ── resetEverything: azzera TUTTI i dati di tutte le modalità ─────────────
function resetEverything(){
  // Mensile / Internazionale
  E.length=0;D.e=E;
  D.s={};D.v={};D.usa={};
  D.t={};D.c={};
  VL={};AGG={};LOAD_RESULTS={};
  // Seasonal
  D.cs={};
  Object.keys(SEAS_TARGETS).forEach(function(k){
    SEAS_TARGETS[k]={to:0,pr:null,sy:null,sas:SEAS_CFG.sasMaxHours||4,acc:0.99,qt:0};
  });
  SEAS={};
  // FC+VM
  FC_EMP={};FC_MAP={};FC_TARGETS={};FC_RESULTS={};FC_SYLY={};FC_STORE_FLAGS={};AGG_FCVM={};FC_OVERRIDES={};FC_PREV_RESULTS={};
  MONTHLY_SYLY={};
  // Svuota DOM di tutti i pannelli immediatamente (evita dati residui visibili)
  ["p0","p1","p2","p3","p4","p5","p6","p7"].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.innerHTML="";
  });
  // Stato UI
  var hs=document.getElementById("hs");
  if(hs)hs.textContent="0 dipendenti · 0 negozi";
  // Reset persistito su entrambi gli storage:
  //  - localStorage per dev/browser puro
  //  - chrome.webview.postMessage per il wrapper C# (cancella state.json in %LOCALAPPDATA%)
  try{localStorage.removeItem("boggi_state");}catch(ex){}
  if(_hasWebMsg){try{chrome.webview.postMessage({type:"resetState"})}catch(ex){}}
  window._pendingImportUSA=null;
  window._pendingNewStoresUSA=null;
}
function resetAllData(){
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
  alert("✅ Tutti i dati svuotati.");
}

// === TARGET EXCEL LOADER ===
// In modalità mensile: aggiorna D.t (target mensili per negozio)
// In modalità seasonal: aggiorna SEAS_TARGETS (target semestrali per negozio)
// Riconosce: fatturato+SY+CR (target_03/pivot), fidelity/subscription, dept QTY
function loadTargetExcel(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){
    try{
      var data=new Uint8Array(ev.target.result);
      var wb=XLSX.read(data,{type:"array",raw:true});

      var isSeasonal=PRIZE_MODE==="seasonal";

      // ── SEASONAL MODE: gestione separata per file pivot e fidelity ──
      if(isSeasonal){
        var ws0=wb.Sheets[wb.SheetNames[0]];
        var json0=XLSX.utils.sheet_to_json(ws0,{header:1,raw:true,defval:null});

        // Determina formato del file seasonal
        // Formato A - tabella pivot (Store_Kpi_Target): intestazione "Etichette di riga" in prima colonna
        // Formato B - fidelity (target_fidelity): intestazione con store_id, sub_target

        // Cerca riga intestazione
        // Cerca riga header nelle prime 6 righe
        // Criteri: contiene "store id", "store_id", o keywords target
        var hdrRow=-1, headers=[];
        for(var i=0;i<Math.min(6,json0.length);i++){
          var r=json0[i]; if(!r) continue;
          var hdr=r.map(function(c){return String(c==null?"":c).toLowerCase().trim();});
          if(hdr.some(function(h){return h.indexOf("store")>=0||h.indexOf("etichette")>=0||h.indexOf("retail_year")>=0})){
            hdrRow=i; headers=hdr; break;
          }
        }

        if(hdrRow<0){
          alert("Formato file seasonal non riconosciuto: nessuna riga header trovata nelle prime 6 righe.");
          return;
        }

        var imported=0, seasFormat="unknown";

        // Helper: cerca colonna per keyword nel titolo (case-insensitive, substring)
        function fSeasCol(){
          var args=arguments;
          for(var ci=0;ci<headers.length;ci++){
            var h=headers[ci]; if(!h) continue;
            for(var ai=0;ai<args.length;ai++){if(h.indexOf(args[ai])>=0)return ci;}
          }
          return -1;
        }

        // Identifica colonna store ID
        var cSeasSid=fSeasCol("store id","store_id");
        if(cSeasSid<0) cSeasSid=0; // fallback prima colonna

        // Identifica tipo file dalle colonne presenti
        var cSalesCol=fSeasCol("gross_sales","gross sales","sales_lc","sales after");
        var cSyCol=fSeasCol("sy gross","sy_gross","sy vat","shopper yield","sy ");
        var cSubCol=-1;
        // sub_target: match esatto prima, poi fallback a "subscription"
        for(var ci=0;ci<headers.length;ci++){if(headers[ci]==="sub_target"){cSubCol=ci;break;}}
        if(cSubCol<0) cSubCol=fSeasCol("subscription","fidelity");
        var cQtyCol=fSeasCol("target qty","qty 2026","qty","pezzi");
        var cCrCol=fSeasCol("conversion rate","cr_","cr ","_cr","(cr)","\tcr","cr\t","cr,");if(cCrCol<0){for(var ci2=0;ci2<headers.length;ci2++){if(headers[ci2]==="cr"){cCrCol=ci2;break;}}}

        // Determina formato
        if(cSalesCol>=0||cSyCol>=0){
          // ── Formato PIVOT: fatturato + SY ──
          seasFormat="seas_pivot";
          for(var ri=hdrRow+1;ri<json0.length;ri++){
            var row=json0[ri]; if(!row) continue;
            var sid=row[cSeasSid]; if(!sid) continue;
            sid=String(parseInt(sid));
            if(sid==="NaN"||sid==="0") continue;
            // Ignora riga "Totale complessivo" o simili
            if(isNaN(parseInt(row[cSeasSid]))) continue;
            // Mid-season: escludi negozi dept (non hanno premio mid-season)
            if(SEASON_PERIOD==="mid"&&isD(sid)){continue;}
            var bdgTo=cSalesCol>=0?parseFloat(row[cSalesCol]):0;
            var sy=cSyCol>=0&&row[cSyCol]!=null?parseFloat(row[cSyCol]):null;
            var cr=cCrCol>=0&&row[cCrCol]!=null?parseFloat(row[cCrCol]):null;
            if(!SEAS_TARGETS[sid]) SEAS_TARGETS[sid]={to:0,pr:null,sy:null,cr:null,sas:SEAS_CFG.sasMaxHours||4,acc:0.99,qt:0};
            if(bdgTo>0) SEAS_TARGETS[sid].to=Math.round(bdgTo*100)/100;
            if(sy!==null&&!isNaN(sy)) SEAS_TARGETS[sid].sy=Math.round(sy*1000000)/1000000;
            if(cr!==null&&!isNaN(cr)) SEAS_TARGETS[sid].cr=Math.round(cr*1000000)/1000000;
            imported++;
          }
        } else if(cQtyCol>=0){
          // ── Formato QTY dept store ──
          seasFormat="seas_qty_dept";
          for(var ri=hdrRow+1;ri<json0.length;ri++){
            var row=json0[ri]; if(!row) continue;
            var sid=row[cSeasSid]; if(!sid) continue;
            sid=String(parseInt(sid)); if(sid==="NaN"||sid==="0") continue;
            if(SEASON_PERIOD==="mid"&&isD(sid)){continue;}
            var qtVal=parseInt(row[cQtyCol]);
            if(isNaN(qtVal)||qtVal<=0) continue;
            if(!SEAS_TARGETS[sid]) SEAS_TARGETS[sid]={to:0,pr:null,sy:null,sas:SEAS_CFG.sasMaxHours||4,acc:0.99,qt:0};
            SEAS_TARGETS[sid].qt=qtVal;
            imported++;
          }
        } else if(cSubCol>=0){
          // ── Formato FIDELITY: sub_target per store ──
          seasFormat="seas_fidelity";
          var seenStores={};
          for(var ri=hdrRow+1;ri<json0.length;ri++){
            var row=json0[ri]; if(!row) continue;
            var sid=row[cSeasSid]; if(!sid) continue;
            sid=String(parseInt(sid)); if(sid==="NaN"||sid==="0") continue;
            if(seenStores[sid]) continue;
            var subVal=parseFloat(row[cSubCol]);
            if(isNaN(subVal)||subVal<=0) continue;
            if(!SEAS_TARGETS[sid]) SEAS_TARGETS[sid]={to:0,pr:null,sy:null,sas:SEAS_CFG.sasMaxHours||4,acc:0.99,qt:0};
            SEAS_TARGETS[sid].pr=Math.round(subVal*1000000)/1000000;
            seenStores[sid]=true;
            imported++;
          }
        } else {
          var colsFound=headers.filter(function(h){return h;}).join(", ");
          alert("Formato file seasonal non riconosciuto.\n\nColonne trovate: "+colsFound+"\n\nFile supportati:\n• Target KPI: deve avere colonna con 'store' e 'gross_sales' o 'SY'\n• Target QTY: deve avere colonna con 'store' e 'qty'\n• Target Fidelity: deve avere colonne 'store_id' e 'sub_target'");
          return;
        }

        var seasLabel={seas_pivot:"Target KPI Seasonal (Fatturato + SY)",seas_fidelity:"Target Subscription Rate Seasonal",seas_qty_dept:"Target QTY Dept Store Seasonal"}[seasFormat]||"Target Seasonal";
        alert(seasLabel+"\n\nNegozi aggiornati in SEAS_TARGETS: "+imported+"\nNegozi totali in SEAS_TARGETS: "+Object.keys(SEAS_TARGETS).length);
        rC();rA();rSources();autoSave();
        return;
      }

      // ── MODALITÀ MENSILE: logica originale ──

      // Find best sheet: prefer sheet matching current month name, else first with data
      var targetMonth=CFG_MONTH;
      var mNames=["","gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
      var bestSheet=null;
      // Try month-named sheet first
      wb.SheetNames.forEach(function(sn){
        var snl=sn.toLowerCase();
        if(snl.indexOf(mNames[targetMonth])>=0||snl.indexOf(String(targetMonth).padStart(2,"0"))>=0)bestSheet=sn;
      });
      // If file has Sheet1/default with month column, use that
      if(!bestSheet){
        wb.SheetNames.forEach(function(sn){
          if(!bestSheet){
            var ws=wb.Sheets[sn];
            var json=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
            if(json.length>1)bestSheet=sn;
          }
        });
      }
      if(!bestSheet)bestSheet=wb.SheetNames[0];

      var ws=wb.Sheets[bestSheet];
      var json=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
      if(json.length<2){alert("Foglio vuoto.");return}

      var headers=(json[0]||[]).map(function(h){return String(h||"").toLowerCase().trim()});

      // Detect file type by headers
      var type="unknown";
      var colMap={};

      // Type 1: Main target (target_03 style): store_id, gross_sales_LC, sy, cr, forex
      function findH(){for(var i=1;i<arguments.length;i++){var idx=headers.indexOf(arguments[i]);if(idx>=0)return idx;}return-1;}
      function findHPartial(){for(var ci=0;ci<headers.length;ci++){for(var i=1;i<arguments.length;i++){if(headers[ci].indexOf(arguments[i])>=0)return ci}}return-1}

      var cSid=findH(0,"store_id");if(cSid<0)cSid=findHPartial(0,"store id","store_id");
      var cSales=findHPartial(0,"gross_sales_lc","sales_lc","fcst sales","fcst_sales");
      var cSY=findH(0,"sy");if(cSY<0)cSY=findHPartial(0,"shopper","sy");
      var cCR=findH(0,"cr");if(cCR<0)cCR=findHPartial(0,"conversion","cr");
      var cForex=findH(0,"forex");if(cForex<0)cForex=findHPartial(0,"forex","fx");
      var cSub=findH(0,"sub_target");if(cSub<0)cSub=findHPartial(0,"subscription","fidelity");
      var cQTY=findHPartial(0,"target qty","qty");
      var cMonth=findHPartial(0,"retail_month","month");

      if(cSid<0){
        // Try Store ID column
        cSid=findHPartial(0,"store");
        if(cSid<0){alert("Colonna store_id/Store ID non trovata.\nColonne: "+headers.filter(function(h){return h}).join(", "));return}
      }

      // Detect SY LY file: has "sy gross vat" / "sy.*vat.*return" column
      var cSyLy=-1;
      for(var ci=0;ci<headers.length;ci++){if(/sy.*(gross|vat|return)/i.test(headers[ci])){cSyLy=ci;break;}}

      // Determine type — SY LY check first: no sales column and SY col IS the gross vat col
      if(cSyLy>=0&&cSales<0&&cSub<0&&(cSY<0||cSY===cSyLy)){type="sy_ly";}
      else if(cSales>=0&&(cSY>=0||cCR>=0))type="main_target";
      else if(cSub>=0)type="fidelity";
      else if(cQTY>=0)type="dept_qty";
      else if(cSales>=0)type="turnover_only";
      else{alert("Non riesco a riconoscere il tipo di target.\nColonne trovate: "+headers.filter(function(h){return h}).join(", "));return}

      // SY LY file: redirect directly to dedicated loader
      if(type==="sy_ly"){
        MONTHLY_SYLY={};
        var syLyImported=0;
        for(var ri=1;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          var sid=row[cSid];if(!sid)continue;
          sid=String(parseInt(sid));if(sid==="NaN")continue;
          // Filter by month if present
          if(cMonth>=0){var m=parseInt(row[cMonth]);if(m!==targetMonth)continue;}
          var val=parseFloat(row[cSyLy]);
          if(!isNaN(val)){MONTHLY_SYLY[sid]=val;syLyImported++;}
        }
        alert("\u2705 SY LY mensile importata:\n\u2022 "+syLyImported+" store caricati\n\u2022 Colonna: "+headers[cSyLy]);
        rSources();rC();rA();return;
      }

      var imported=0,skipped=0,overwritten=0,newStores=[];

      for(var ri=1;ri<json.length;ri++){
        var row=json[ri];if(!row)continue;
        var sid=row[cSid];if(!sid)continue;
        sid=String(parseInt(sid));if(sid==="NaN")continue;

        // Filter by month if column exists
        if(cMonth>=0){
          var m=parseInt(row[cMonth]);
          if(m!==targetMonth){skipped++;continue}
        }

        // Init D.t entry if needed
        var isNew=!D.t[sid];
        if(isNew){D.t[sid]={to:0,sy:0,pr:0,cr:0,di:0,cs:0,qt:0,fc:"",fl:"",mo:""};newStores.push(sid)}

        if(type==="main_target"||type==="turnover_only"){
          if(cSales>=0){var v=parseNum(row[cSales]);if(v>0)D.t[sid].to=Math.round(v)}
          if(cSY>=0){var v=parseNum(row[cSY]);if(v>0)D.t[sid].sy=v}
          if(cCR>=0){var v=parseNum(row[cCR]);if(v>0)D.t[sid].cr=v}
        }else if(type==="fidelity"){
          if(cSub>=0){var v=parseNum(row[cSub]);if(v>0)D.t[sid].pr=v}
        }else if(type==="dept_qty"){
          if(cSales>=0){var v=parseNum(row[cSales]);if(v>0)D.t[sid].to=Math.round(v)}
          if(cQTY>=0){var v=parseNum(row[cQTY]);if(v>0)D.t[sid].qt=Math.round(v)}
        }
        imported++;
      }

      // Show report
      var typeLabel={"main_target":"Target Fatturato + SY + CR","fidelity":"Target Fidelity/Subscription","dept_qty":"Target QTY Dept Store","turnover_only":"Target Fatturato"}[type];
      var msg="Target caricati: "+typeLabel+"\n\nFoglio: "+bestSheet+"\nRighe importate: "+imported+"\nRighe saltate (mese diverso): "+skipped+"\nNuovi store: "+newStores.length+"\n\nStore totali in D.t: "+Object.keys(D.t).length;

      alert(msg);
      rC();rA();rSources();autoSave();

    }catch(ex){alert("Errore lettura target: "+ex.message)}
  },50)};
  reader.readAsArrayBuffer(file);
}

// === RESULTS EXCEL LOADER (consuntivo) ===
// In modalità mensile: aggiorna D.c (consuntivi mensili per negozio/dipendente)
// In modalità seasonal: aggiorna SEAS_TARGETS[sid] con i campi consuntivo (sc, sy, nf, es, s4)
function loadResultsExcel(file){
  var reader=new FileReader();
  reader.onload=function(ev){setTimeout(function(){
    try{
      var data=new Uint8Array(ev.target.result);
      var wb=XLSX.read(data,{type:"array",raw:true});

      // ── SEASONAL MODE: gestione separata per tipo di file consuntivo ──
      if(PRIZE_MODE==="seasonal"){
        var ws0=wb.Sheets[wb.SheetNames[0]];
        var json0=XLSX.utils.sheet_to_json(ws0,{header:1,raw:true,defval:null});

        // Trova riga intestazione (prime 5 righe)
        var hdrRow=-1, headers=[];
        for(var i=0;i<Math.min(5,json0.length);i++){
          var r=json0[i]; if(!r) continue;
          var hdr=r.map(function(c){return String(c==null?"":c).toLowerCase().trim();});
          if(hdr.some(function(h){return h&&(h.indexOf("store")>=0||h.indexOf("store id")>=0||h.indexOf("store_id")>=0)})){
            hdrRow=i; headers=hdr; break;
          }
        }
        if(hdrRow<0){alert("Formato file consuntivo seasonal non riconosciuto:\nnessuna colonna store trovata nelle prime 5 righe.");return;}

        function fHP(){for(var ci=0;ci<headers.length;ci++){if(!headers[ci])continue;for(var i=0;i<arguments.length;i++){if(headers[ci].indexOf(arguments[i])>=0)return ci;}}return-1;}

        // Identifica tipo file dal contenuto delle colonne
        var cSid=fHP("store id","store_id");
        // Consuntivo principale (FW25): gross sales, sy, subscription rate
        var cSales=fHP("gross sales","gross_sales","sales after return");
        var cSY=fHP("sy gross","sy_gross","sy vat","sy gross vat");
        var cSub=fHP("subscription rate","subscription_rate");
        // CR (Conversion Rate) consuntivo: col H (index 7) nel file risultati mid-season
        var cCR=fHP("conversion rate","cr ","cr_","conversion_rate");
        // Inventario: "difference on cogs" = incidenza % inventariale
        var cInvPct=fHP("difference on cogs","diff on cogs","cogs");
        // Accuracy: colonna "accuracy"
        var cAccVal=fHP("accuracy","accuratezza");
        // SAS ore: "ore medie","avg hours","sas hours","media ore", "avg h"
        var cSasH=fHP("ore medie","avg hours","sas hours","media ore","average hours","avg h");
        // Inventario assoluto (esubero in LC): fallback se no cogs
        var cEsub=fHP("esubero","surplus","waste");

        // QTY dept consuntivo: "qty sales","qty_sales","pezzi venduti"
        var cQtySales=fHP("qty sales","qty_sales","pezzi venduti","qty merch","qty after return");

        var seasConsType="unknown";
        if(cSales>=0&&(cSY>=0||cSub>=0)) seasConsType="seas_main";     // fatturato + SY + subscription
        else if(cInvPct>=0||cAccVal>=0)  seasConsType="seas_inv_acc";  // inventario % + accuracy (stesso file)
        else if(cSasH>=0)                seasConsType="seas_sas";       // SAS ore medie
        else if(cEsub>=0)                seasConsType="seas_inv_abs";   // esubero assoluto
        else if(cQtySales>=0)            seasConsType="seas_qty_dept";  // QTY dept stores

        if(seasConsType==="unknown"){
          alert("Formato file consuntivo seasonal non riconosciuto.\nColonne trovate: "+headers.filter(function(h){return h;}).slice(0,15).join(", "));
          return;
        }

        var imported=0, seasLabel="";

        for(var ri=hdrRow+1;ri<json0.length;ri++){
          var row=json0[ri]; if(!row) continue;
          var sid=row[cSid]; if(!sid) continue;
          sid=String(parseInt(sid)); if(sid==="NaN"||sid==="0") continue;
          // Ignora store con ID molto grande (canali digitali, Zalando, ecc.)
          if(parseInt(sid)>99999) continue;

          if(!D.cs[sid]) D.cs[sid]={sc:0,es:0,sy:0,nf:0,s4:0,iv:null,av:null,qc:0,cr:null};

          if(seasConsType==="seas_main"){
            if(cSales>=0){var v=parseNum(row[cSales]);if(!isNaN(v)&&v>0)D.cs[sid].sc=Math.round(v);}
            if(cSY>=0){var v=parseNum(row[cSY]);if(!isNaN(v)&&v>0)D.cs[sid].sy=v;}
            if(cSub>=0){var v=parseNum(row[cSub]);if(!isNaN(v)&&v>0)D.cs[sid].nf=v;}
            // CR: usa colonna trovata per intestazione, altrimenti fallback col H (index 7)
            var crIdx=(cCR>=0)?cCR:7;
            if(row[crIdx]!=null){var cv=parseNum(row[crIdx]);if(!isNaN(cv)&&cv>0)D.cs[sid].cr=cv;}
          } else if(seasConsType==="seas_inv_acc"){
            if(cInvPct>=0){var v=parseNum(row[cInvPct]);if(!isNaN(v))D.cs[sid].iv=v;}
            if(cAccVal>=0){var v=parseNum(row[cAccVal]);if(!isNaN(v)&&v>0)D.cs[sid].av=v;}
          } else if(seasConsType==="seas_sas"){
            if(cSasH>=0){
              var raw=row[cSasH];
              if(raw!==null&&raw!==undefined&&String(raw).trim()!=="-"){
                var v=parseNum(raw);
                if(!isNaN(v)&&v>=0) D.cs[sid].s4=v;
              }
            }
          } else if(seasConsType==="seas_inv_abs"){
            if(cEsub>=0){var v=parseNum(row[cEsub]);if(!isNaN(v))D.cs[sid].es=Math.round(v);}
          } else if(seasConsType==="seas_qty_dept"){
            if(cQtySales>=0){var v=parseInt(row[cQtySales]);if(!isNaN(v)&&v>0)D.cs[sid].qc=v;}
          }
          imported++;
        }

        var seasLabels={"seas_main":"Fatturato + SY + Subscription Rate","seas_inv_acc":"Inventario (% su COGS) + Accuracy","seas_sas":"SAS (ore medie)","seas_inv_abs":"Inventario/Esubero (valore assoluto)","seas_qty_dept":"QTY Dept Store"};
        alert("Consuntivo Seasonal: "+seasLabels[seasConsType]+"\n\nNegozi aggiornati in D.c: "+imported);
        rC();rA();rSources();autoSave();
        return;
      }

      // ── MODALITÀ MENSILE: logica originale ──

      var type="unknown",bestSheet=null,bestJson=null,bestHeaders=null,bestDataStart=1;
      var fnLow=(file.name||"").toLowerCase();
      function findHP(hdrs){return function(){for(var ci=0;ci<hdrs.length;ci++){if(!hdrs[ci])continue;for(var i=0;i<arguments.length;i++){if(hdrs[ci].indexOf(arguments[i])>=0)return ci}}return-1}}

      var isDCC=fnLow.indexOf("dcc")>=0;
      var isArt=fnLow.indexOf("report_w4")>=0||fnLow.indexOf("report_1l")>=0||fnLow.indexOf("report_factory")>=0||fnLow.indexOf("articol")>=0||fnLow.indexOf("incentivo")>=0;

      for(var si=0;si<wb.SheetNames.length;si++){
        var sn=wb.SheetNames[si];
        var ws=wb.Sheets[sn];
        var json=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
        if(json.length<2)continue;

        var headerRow=-1,headers=[];
        for(var hr=0;hr<Math.min(6,json.length);hr++){
          var row=json[hr];if(!row||!Array.isArray(row))continue;
          var hdr=[];for(var hc=0;hc<row.length;hc++){hdr.push(String(row[hc]==null?"":row[hc]).toLowerCase().trim())}
          if(hdr.some(function(h){return h&&(h.indexOf("store")>=0||h.indexOf("etichette")>=0||h.indexOf("row label")>=0||h.indexOf("tot sales")>=0||h.indexOf("processed")>=0||h.indexOf("converted")>=0||h.indexOf("incentivo")>=0||h.indexOf("illness")>=0||h.indexOf("serial")>=0)})){
            headerRow=hr;headers=hdr;break;
          }
        }
        if(headerRow<0){headerRow=0;var r0=json[0]||[];headers=[];for(var hc=0;hc<r0.length;hc++){headers.push(String(r0[hc]==null?"":r0[hc]).toLowerCase().trim())}}
        if(headers.length<2)continue;
        var dStart=headerRow+1;
        var fH=findHP(headers);
        var cSid=fH("store id","store_id");
        var cEtich=fH("etichette di riga","row label");

        var cConv=fH("converted sales amt","converted amount","converted sales");
        if(cConv>=0&&(cSid>=0||cEtich>=0)){
          if(isDCC||type==="unknown"){type="dcc";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;if(isDCC)break;continue}
        }

        var cInc=fH("incentivo merce","riceve l'incentivo","riceve l\u2019incentivo","somma di riceve","incentivo da attribuire","somma di incentivo");
        if(cInc>=0&&(cSid>=0||cEtich>=0)){
          if(isArt||type==="unknown"){type="articoli";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;if(isArt)break;continue}
        }

        var cTotSales=fH("tot sales");
        if(cTotSales>=0&&cSid>=0&&type==="unknown"){type="bdg_results";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;continue}

        var cS4=fH("processed within 4","within 4h");
        if(cS4>=0&&cSid>=0&&type==="unknown"){type="sas_results";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;continue}

        var cIll=fH("illnesses","illness");var cInj=fH("injuries","injury");var cMat=fH("maternity","paternity");
        var cMatr=fH("serial no","matricola");if(cMatr<0)cMatr=headers.indexOf("a");
        if((cIll>=0||cInj>=0||cMat>=0)&&cMatr>=0&&type==="unknown"){type="malattie";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;continue}

        // Italia malattie v2: Matricola Zucchetti + Giorni assenza (formato Zucchetti ITA)
        var cMatrZuc=fH("matricola zucchetti","matr zucchetti","matr. zucchetti");
        var cGiorniAss=fH("giorni assenza","giorni ass");
        if(cMatrZuc>=0&&cGiorniAss>=0&&type==="unknown"){type="malattie_it_matr";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;continue}

        // Italia premi articoli incentivati: Matricola (con prefisso "A") + Importo INCENTIVO (individuale per dipendente)
        var cImportoIncent=fH("importo incentivo","importo inc");
        var cMatrArt=fH("matricola","matr");
        if(cImportoIncent>=0&&cMatrArt>=0&&type==="unknown"){type="articoli_incent";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;continue}

        // Italia malattie v1: cognome + giorni di malattia (no matricola)
        var cGiorni=fH("giorni di malattia","giorni malattia","giorni");
        var cCogn=fH("cognome3","cognome");
        var cNomeIt=-1;if(cCogn>=0){for(var ci=0;ci<headers.length;ci++){if(ci!==cCogn&&headers[ci]&&(headers[ci].indexOf("nome")>=0)){cNomeIt=ci;break}}}
        if(cGiorni>=0&&cCogn>=0&&type==="unknown"){type="malattie_it";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart;continue}

        if(headers.some(function(h){return h&&h.indexOf("cloudfront-is-mobile")>=0})&&type==="unknown"){type="mobile_sales";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart}

        // USA personal sales: "employee id" + "employee last name" + "gross sales"
        var hasEmpId=headers.some(function(h){return h&&h.indexOf("employee id")>=0});
        var hasLastName=headers.some(function(h){return h&&h.indexOf("employee last name")>=0});
        var hasGrossSales2=headers.some(function(h){return h&&h.indexOf("gross sales")>=0});
        if(hasEmpId&&hasLastName&&hasGrossSales2&&type==="unknown"){type="usa_personal_sales";bestSheet=sn;bestJson=json;bestHeaders=headers;bestDataStart=dStart}
      }

      if(type==="unknown"||!bestJson){alert("Non riesco a riconoscere il tipo di file consuntivo.\nFogli: "+wb.SheetNames.join(", "));return}

      var json=bestJson,headers=bestHeaders,dataStart=bestDataStart;
      var fH=findHP(headers);
      var imported=0,report="";

      if(type==="dcc"){
        var cSid=fH("store id","store_id");var cEtich=fH("etichette di riga","row label");
        var cConv=fH("converted sales amt","converted amount","converted sales");
        var sidCol=cSid>=0?cSid:cEtich;
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          var sid=row[sidCol];if(!sid)continue;
          sid=String(parseInt(sid));if(sid==="NaN"||sid==="0")continue;
          if(!D.c[sid])D.c[sid]={sc:0,es:0,pd:0,cr:0,sy:0,nf:0,qc:0,s4:0,dv:0};
          D.c[sid].dv=Math.round(parseNum(row[cConv]));
          imported++;
        }
        report="DCC caricati: "+imported+" negozi (foglio: "+bestSheet+").";
      }

      else if(type==="articoli"){
        var cSid=fH("store id","store_id");var cEtich=fH("etichette di riga","row label");
        var cInc=fH("incentivo merce","riceve l'incentivo","riceve l\u2019incentivo","somma di riceve","incentivo da attribuire","somma di incentivo");
        var sidCol=cSid>=0?cSid:cEtich;
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          var sid=row[sidCol];if(!sid)continue;
          sid=String(parseInt(sid));if(sid==="NaN"||sid==="0")continue;
          var count=Math.round(parseNum(row[cInc]));
          if(!D.c[sid])D.c[sid]={sc:0,es:0,pd:0,cr:0,sy:0,nf:0,qc:0,s4:0,dv:0};
          D.c[sid].ac=(D.c[sid].ac||0)+count;
          imported++;
        }
        report="Articoli incentivati: "+imported+" negozi (foglio: "+bestSheet+").\nI conteggi si sommano se carichi pi\u00f9 file (1L + Factory).";
      }

      else if(type==="bdg_results"){
        var cSid=fH("store id","store_id");var cTotSales=fH("tot sales");
        var cFcst=fH("fcst gross","fcst_gross","forecast");var cEsubero=fH("esubero");
        var cDigital=fH("% digital","digital");var cCR=fH("cr 20","cr_20","cr ");
        var cSY=fH("sy gross","sy_gross","sy ");var cSub=fH("subscription","fidelity");
        var cQty=fH("qty sales","qty_sales","qty ");
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;var sid=row[cSid];if(!sid)continue;
          sid=String(parseInt(sid));if(sid==="NaN")continue;
          if(!D.c[sid])D.c[sid]={sc:0,es:0,pd:0,cr:0,sy:0,nf:0,qc:0,s4:0,dv:0};
          var totSales=cTotSales>=0?parseNum(row[cTotSales]):0;
          var esubero=cEsubero>=0?parseNum(row[cEsubero]):0;
          D.c[sid].sc=Math.round(totSales-esubero);D.c[sid].es=Math.round(esubero);
          if(cDigital>=0){D.c[sid].pd=parseNum(row[cDigital])}
          if(cCR>=0){D.c[sid].cr=parseNum(row[cCR])}
          if(cSY>=0){D.c[sid].sy=parseNum(row[cSY])}
          if(cSub>=0){D.c[sid].nf=parseNum(row[cSub])}
          if(cQty>=0){D.c[sid].qc=Math.round(parseNum(row[cQty]))}
          if(cFcst>=0){var vf=parseNum(row[cFcst]);if(vf>0){if(!D.t[sid])D.t[sid]={to:0,sy:0,pr:0,cr:0,di:0,cs:0,qt:0,fc:"",fl:"",mo:""};D.t[sid].to=Math.round(vf)}}
          imported++;
        }
        report="BDG caricati: "+imported+" negozi.";
      }

      else if(type==="sas_results"){
        var cSid=fH("store id","store_id");var cS4=fH("processed within 4","within 4h");
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;var sid=row[cSid];if(!sid)continue;
          sid=String(parseInt(sid));if(sid==="NaN")continue;
          if(!D.c[sid])D.c[sid]={sc:0,es:0,pd:0,cr:0,sy:0,nf:0,qc:0,s4:0,dv:0};
          D.c[sid].s4=Math.round(parseNum(row[cS4]));imported++;
        }
        report="SAS caricati: "+imported+" negozi.";
      }

      else if(type==="malattie"){
        var cMatr=fH("serial no","matricola");if(cMatr<0)cMatr=headers.indexOf("a");
        var cIll=fH("illnesses","illness");var cInj=fH("injuries","injury");var cMat=fH("maternity","paternity");
        var matched=0,notFound=0;
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;var matr=row[cMatr];if(!matr)continue;
          matr=String(matr).trim().toUpperCase();
          // matr rimane invariata — usa la matricola originale dal file
          var days=0;
          if(cIll>=0)days+=parseNum(row[cIll]);if(cInj>=0)days+=parseNum(row[cInj]);if(cMat>=0)days+=parseNum(row[cMat]);
          days=Math.round(days);var found=false;
          for(var j=0;j<E.length;j++){if(E[j].m===matr){E[j].ml=days;found=true;break}}
          if(found)matched++;else notFound++;imported++;
        }
        report="Malattie: "+imported+" righe, "+matched+" abbinate, "+notFound+" non trovate.";
      }

      else if(type==="malattie_it_matr"){
        // Italia malattie v2: match by Matricola Zucchetti (7 cifre, senza "A")
        var cMatr=fH("matricola zucchetti","matr zucchetti","matr. zucchetti");
        var cGiorni=fH("giorni assenza","giorni ass","giorni");
        var matched=0,notFound=0,skipped=0;
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          // Accetta sia "0002134" che "A0002134" — strips tutto tranne cifre
          var rawMatr=String(row[cMatr]||"").trim().replace(/[^0-9]/g,"");
          if(!rawMatr){skipped++;continue;}
          var matr=rawMatr.padStart(7,"0");
          var days=Math.round(parseNum(String(row[cGiorni]||"0")));
          var found=false;
          for(var j=0;j<E.length;j++){
            if(E[j].m===matr){E[j].ml=days;found=true;break;}
          }
          if(found)matched++;else notFound++;
          imported++;
        }
        report="Malattie Italia: "+imported+" righe elaborate · "+matched+" abbinate · "+(notFound>0?notFound+" non trovate":"tutte abbinate")+(skipped>0?" · "+skipped+" righe vuote ignorate":"")+".\n\nI giorni di assenza aggiornano il moltiplicatore malattia di ciascun dipendente.";
      }

      else if(type==="articoli_incent"){
        // Italia premi articoli incentivati: match per Matricola (strip "A" + pad 7 cifre), salva e.ra
        var cMatrI=fH("matricola","matr");
        var cImportoI=fH("importo incentivo","importo inc");
        var matched=0,notFound=0,skipped=0;
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          var rawMatr=String(row[cMatrI]||"").trim().replace(/[^0-9]/g,"");
          if(!rawMatr){skipped++;continue;}
          var matr=rawMatr.padStart(7,"0");
          var importo=parseNum(String(row[cImportoI]||"0"));
          if(importo<=0){skipped++;continue;}
          var found=false;
          for(var j=0;j<E.length;j++){
            if(E[j].m===matr){E[j].ra=importo;found=true;break;}
          }
          if(found)matched++;else notFound++;
          imported++;
        }
        report="Premi articoli incentivati: "+imported+" righe · "+matched+" abbinate · "+(notFound>0?notFound+" non trovate":"tutte abbinate")+(skipped>0?" · "+skipped+" righe vuote/zero ignorate":"")+".\n\nImporto assegnato individualmente a ciascun dipendente (campo premio articoli).";
      }

      else if(type==="malattie_it"){
        // Italia malattie v1: match by cognome+nome
        var cCogn=fH("cognome3","cognome");
        var cNome=-1;for(var ci=0;ci<headers.length;ci++){if(ci!==cCogn&&headers[ci]&&headers[ci].indexOf("nome")>=0){cNome=ci;break}}
        var cGiorni=fH("giorni di malattia","giorni malattia","giorni");
        var matched=0,notFound=0;
        // Build lookup: "COGNOME|NOME" -> employee index
        var nameLookup={};
        E.forEach(function(emp,idx){
          var key=(emp.c||"").toUpperCase().trim()+"|"+(emp.n||"").toUpperCase().trim();
          nameLookup[key]=idx;
        });
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          var cogn=String(row[cCogn]||"").toUpperCase().trim();
          var nome=cNome>=0?String(row[cNome]||"").toUpperCase().trim():"";
          if(!cogn)continue;
          var days=Math.round(parseNum(row[cGiorni]));
          if(days<=0)continue;
          var key=cogn+"|"+nome;
          var empIdx=nameLookup[key];
          if(empIdx!=null){E[empIdx].ml=days;matched++}
          else notFound++;
          imported++;
        }
        report="Malattie Italia: "+imported+" righe, "+matched+" abbinate, "+notFound+" non trovate.";
      }

      else if(type==="mobile_sales"){
        var currentStore=null,storeData={};
        for(var ri=1;ri<json.length;ri++){
          var row=json[ri];if(!row||!row[0])continue;var label=String(row[0]).trim();
          if(label.indexOf("CloudFront-Is-Mobile")>=0){if(currentStore)storeData[currentStore]=parseNum(row[1])}
          else if(label.indexOf("CloudFront")>=0||label.indexOf("Desktop")>=0){}
          else if(label.indexOf("Etichette")>=0||label.indexOf("Total")>=0||label.indexOf("(Tutto)")>=0||label==="orderDate"){}
          else{currentStore=label.toUpperCase()}
        }
        var storeNameToId={};
        E.forEach(function(e){var name=String(e.s||"").toUpperCase().replace(/^\d+\s*/,"");if(!storeNameToId[name])storeNameToId[name]=String(e.si)});
        for(var sname in storeData){var sid=storeNameToId[sname];if(sid){
          if(!D.c[sid])D.c[sid]={sc:0,es:0,pd:0,cr:0,sy:0,nf:0,qc:0,s4:0,dv:0};
          var sf=STORE_FLAGS[sid];if(sf&&sf.digType==="mobility"){D.c[sid].pd=storeData[sname];imported++}
        }}
        report="Mobile Sales: "+Object.keys(storeData).length+" negozi, "+imported+" applicati (Digital Mobilit\u00e0).";
      }

      else if(type==="usa_personal_sales"){
        // Trova colonne per posizione esatta nell'header (NON indexOf generico per evitare ambiguità)
        var cCogn2=-1,cNome2=-1,cSales2=-1,cEmpId2=-1;
        for(var ci2=0;ci2<headers.length;ci2++){
          var hh2=headers[ci2]||"";
          if(hh2==="employee last name"||hh2==="last name"||hh2==="cognome"||hh2==="surname") cCogn2=ci2;
          else if(hh2==="employee first name"||hh2==="first name"||hh2==="nome"||hh2==="given name") cNome2=ci2;
          else if(hh2.indexOf("gross sales")>=0) cSales2=ci2;
          else if(hh2==="employee id"||hh2==="employee_id"||hh2==="matricola") cEmpId2=ci2;
        }
        // Build lookup multiplo per matching robusto
        // 1. COGNOME|NOME (exact match)
        // 2. COGNOME_NORM (solo cognome normalizzato — fallback)
        var usaLookupExact={},usaLookupCogn={};
        E.forEach(function(emp){
          if(emp.cu!=="USD")return;
          var c=(emp.c||"").toUpperCase().trim();
          var n=(emp.n||"").toUpperCase().trim();
          var cNorm=c.replace(/[\s'\-]/g,"");
          usaLookupExact[c+"|"+n]=emp.m;      // exact cognome+nome
          if(!usaLookupCogn[cNorm])usaLookupCogn[cNorm]=emp.m; // solo cognome normalizzato
        });
        var matched=0,notFound=0,skippedRows=0;
        var notFoundList=[];
        if(!D.usa)D.usa={};
        for(var ri=dataStart;ri<json.length;ri++){
          var row=json[ri];if(!row)continue;
          // Salta righe totale (Employee ID = "-" o vuoto)
          var empIdRaw=row[cEmpId2];
          if(cEmpId2>=0&&(!empIdRaw||String(empIdRaw).trim()==="-"||String(empIdRaw).trim()==="")){skippedRows++;continue;}
          var cogn=cCogn2>=0?String(row[cCogn2]||"").toUpperCase().trim():"";
          var nome=cNome2>=0?String(row[cNome2]||"").toUpperCase().trim():"";
          var salesVal=cSales2>=0?parseFloat(row[cSales2])||0:0;
          if(!cogn){skippedRows++;continue;}
          // Prova match: 1) cognome+nome esatto  2) solo cognome normalizzato
          var matr=usaLookupExact[cogn+"|"+nome];
          if(!matr){var cNorm2=cogn.replace(/[\s'\-]/g,"");matr=usaLookupCogn[cNorm2];}
          if(matr){
            if(!D.usa[matr])D.usa[matr]={cm:0,ps:0,st:0,sb:0,tp:0};
            D.usa[matr].ps=Math.round(salesVal*100)/100;
            matched++;
          } else {
            notFound++;
            if(notFoundList.length<10)notFoundList.push(cogn+(nome?" "+nome:""));
          }
          imported++;
        }
        var notFoundMsg=notFound>0?("\n\u26a0 "+notFound+" righe non abbinate (cognome non trovato in anagrafica):\n  "+notFoundList.join(", ")+(notFound>10?" ...":"")):"";
        report="\u2705 Vendite Personali USA: "+matched+" dipendenti aggiornati su "+(matched+notFound)+" righe."+notFoundMsg+(skippedRows>0?"\n("+skippedRows+" righe totale/vuote ignorate)":"");
      }

      alert(report);
      LOAD_RESULTS._lastCons=type;
      rC();rA();rSources();autoSave();

    }catch(ex){alert("Errore lettura consuntivo: "+ex.message)}
  },50)};
  reader.readAsArrayBuffer(file);
}


