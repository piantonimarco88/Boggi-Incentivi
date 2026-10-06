// === INSERIMENTO MANUALE DIPENDENTE (dopo l'import anagrafica) ===
// Aggiunge una riga a E (Mensile/Seasonal) oppure a FC_EMP+FC_MAP (FC+VM) senza reimportare l'anagrafica.
// I dipendenti inseriti qui hanno il flag man:1: restano elencati in Fonti Dati (con ✕ per rimuoverli)
// e sopravvivono a un successivo re-import dell'anagrafica (se la matricola non e' gia' nel file).
var MAN_ROLES=["SM","VSM","SSA","SSAP","SA","JSA","SCS"];
var MAN_INP='width:100%;padding:6px 8px;border:1px solid #d5d0c8;border-radius:4px;font-size:12px;font-family:inherit;box-sizing:border-box';

function _manV(id){var el=document.getElementById(id);return el?String(el.value||"").trim():""}
function _manFld(label,inner,flex){return '<div style="flex:'+(flex||1)+';min-width:130px"><label style="font-size:10px;color:#6b6560;display:block;margin-bottom:3px">'+label+'</label>'+inner+'</div>'}
function _manIn(id,ph,type,extra){return '<input id="'+id+'" type="'+(type||'text')+'" placeholder="'+(ph||'')+'" style="'+MAN_INP+'" '+(extra||'')+'>'}
function _manSel(id,opts,extra){return '<select id="'+id+'" style="'+MAN_INP+'" '+(extra||'')+'>'+opts.map(function(o){return '<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>'}).join('')+'</select>'}
function _manNum(s){return parseNum(String(s||"").replace(/\s/g,""))}

// Nome negozio noto per uno store ID (da dipendenti gia' presenti, FC_MAP o target), "" se sconosciuto
function _manStoreName(sid){
  sid=String(sid);
  for(var i=0;i<E.length;i++){if(String(E[i].si)===sid&&E[i].s)return E[i].s}
  if(FC_MAP[sid]&&FC_MAP[sid].s&&FC_MAP[sid].s!==sid)return FC_MAP[sid].s;
  var tg=D.t&&D.t[sid];if(tg&&tg.nm)return(sid+" "+tg.nm).toUpperCase();
  return "";
}
function manEmpStoreHint(){
  var sid=_manV("manSi"),sn=document.getElementById("manS"),hint=document.getElementById("manSiHint");
  if(!sid||!sn)return;
  var nm=_manStoreName(sid);
  if(nm&&!sn.getAttribute("data-edited"))sn.value=nm;
  if(hint)hint.innerHTML=nm?'<span style="color:#2d7a3a">Negozio già presente</span>':'<span style="color:#cf5b5b">Negozio non presente in anagrafica: indica il nome</span>';
}

function manEmpClose(){var ov=document.getElementById("manEmpOv");if(ov&&ov.parentNode)ov.parentNode.removeChild(ov)}

function manEmpOpen(){
  manEmpClose();
  var fcvm=PRIZE_MODE==="fcvm",seas=PRIZE_MODE==="seasonal",isIT=REGION==="italia";
  var body='';
  if(fcvm){
    body+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
    body+=_manFld('Matricola *',_manIn('manM','es. 123456'));
    body+=_manFld('Cognome *',_manIn('manC'));
    body+=_manFld('Nome *',_manIn('manN'));
    body+='</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
    body+=_manFld('Ruolo *',_manSel('manJ',[["FC","FC (Field Coach)"],["VM","VM (Visual Merchandiser)"]]));
    body+=_manFld('Tipo premio *',_manSel('manTipo',[["AREA","AREA (premio d'area)"],["BDG","BDG (negozio singolo)"]]));
    body+=_manFld('Premio massimale *',_manIn('manIb','es. 1500','text'));
    body+=_manFld('Valuta',_manIn('manCu','EUR','text','value="EUR" list="manCuList"')+'<datalist id="manCuList">'+Object.keys(ENTE_CU).map(function(k){return ENTE_CU[k].cu}).filter(function(v,i,a){return a.indexOf(v)===i}).map(function(c){return '<option value="'+c+'">'}).join('')+'</datalist>');
    body+='</div><div style="margin-bottom:10px">';
    body+=_manFld('Store ID * <span style="color:#a09a92">(uno o più, separati da virgola o spazio)</span>',_manIn('manStores','es. 1201, 1202, 1215'));
    body+='</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px">';
    body+=_manFld('Email',_manIn('manMp','nome.cognome@boggi.com'),2);
    if(isIT)body+=_manFld('Codice fiscale',_manIn('manCf'));
    body+='</div>';
    body+='<div style="font-size:10px;color:#8a8680;margin-top:8px">AREA: il dipendente viene associato a tutti gli store indicati (premio d\'area). BDG: il premio massimale vale per ciascuno store indicato come negozio singolo.</div>';
  }else{
    var roles=seas?["SM","VSM"]:MAN_ROLES;
    body+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
    body+=_manFld('Matricola *',_manIn('manM',isIT?'es. 0012345':'ID dipendente'));
    body+=_manFld('Cognome *',_manIn('manC'));
    body+=_manFld('Nome *',_manIn('manN'));
    body+='</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
    body+=_manFld('Store ID *',_manIn('manSi','es. 1201','number','oninput="manEmpStoreHint()"')+'<div id="manSiHint" style="font-size:9px;margin-top:2px"></div>');
    body+=_manFld('Nome negozio',_manIn('manS','verrà composto come "ID NOME"','text','oninput="this.setAttribute(\'data-edited\',1)"'),2);
    body+=_manFld('Ruolo *',_manSel('manJ',roles.map(function(r){return[r,r]})));
    body+='</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
    if(isIT){
      body+=_manFld('BDG lordo (€)',_manIn('manIb','es. 2500'));
      body+=_manFld('Gross salary (€)',_manIn('manRl','facoltativo'));
    }else{
      body+=_manFld('Ente / valuta *',_manSel('manEn',[["","— scegli —"]].concat(Object.keys(ENTE_CU).map(function(k){return[k,k+" — "+ENTE_CU[k].cu]}))));
      body+=_manFld('Stipendio lordo * (valuta locale)',_manIn('manRl','es. 1800'));
      body+=_manFld('Budget (BDG)',_manIn('manIb','es. 2500'));
    }
    body+='</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px">';
    body+=_manFld('Email',_manIn('manMp','nome.cognome@boggi.com'),2);
    body+=_manFld('Email FC <span style="color:#a09a92">(vuoto = automatica)</span>',_manIn('manMf'),2);
    if(isIT)body+=_manFld('Codice fiscale',_manIn('manCf'));
    body+='</div>';
    body+='<div style="font-size:10px;color:#8a8680;margin-top:8px">Per inserire lo stesso dipendente in un secondo negozio usa la matricola con suffisso <b>_2</b>. Target e consuntivo del negozio restano quelli già caricati.</div>';
  }
  var title=fcvm?'Aggiungi FC / VM':'Aggiungi dipendente';
  var h='<div id="manEmpOv" style="position:fixed;inset:0;background:rgba(44,41,37,.55);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px">';
  h+='<div style="background:#faf8f4;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.4);width:640px;max-width:100%;max-height:92vh;overflow:auto;padding:18px 20px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:15px;font-weight:700;color:#2c2925">&#10133; '+title+'</div><button onclick="manEmpClose()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#8a8680">&#10005;</button></div>';
  h+='<div style="font-size:10px;color:#8a8680;margin-bottom:12px">Modalità <b>'+(fcvm?'FC + VM':seas?'SEASONAL BONUS':'MENSILE')+'</b> — '+(isIT?'Italia':'Internazionale')+'. Inserimento manuale dei dati minimi, senza reimportare l\'anagrafica.</div>';
  h+=body;
  h+='<div id="manErr" style="margin-top:10px;font-size:11px;color:#cf5b5b;font-weight:600"></div>';
  h+='<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="exp-btn" onclick="manEmpClose()">Annulla</button><button class="exp-btn primary" onclick="manEmpSave()">&#10004; Aggiungi</button></div>';
  h+='</div></div>';
  var d=document.createElement("div");d.innerHTML=h;document.body.appendChild(d.firstChild);
  var f=document.getElementById("manM");if(f)f.focus();
}

function _manFail(msg){var el=document.getElementById("manErr");if(el)el.textContent=msg;return false}

function manEmpSave(){
  var fcvm=PRIZE_MODE==="fcvm";
  var ok=fcvm?_manSaveFcvm():_manSaveE();
  if(!ok)return;
  manEmpClose();
  updateHeaderCount();
  try{rC()}catch(ex){}try{rA()}catch(ex){}try{rSources()}catch(ex){}
  try{if(typeof rDist==="function")rDist()}catch(ex){}
  try{if(typeof rAgg==="function")rAgg()}catch(ex){}
  try{rT()}catch(ex){}
  autoSave();
  if(typeof ok==="string")alert(ok);
}

function _manSaveE(){
  var seas=PRIZE_MODE==="seasonal",isIT=REGION==="italia";
  var m=_manV("manM"),cogn=_manV("manC").toUpperCase(),nome=_manV("manN").toUpperCase(),job=_manV("manJ");
  var si=parseInt(_manV("manSi"));
  if(!m||!cogn||!nome)return _manFail("Matricola, cognome e nome sono obbligatori.");
  if(isIT){m=m.replace(/[^0-9]/g,"");if(!m)return _manFail("Matricola non valida (solo cifre).");m=m.padStart(7,"0");}
  if(E.some(function(e){return String(e.m)===m}))return _manFail("Matricola "+m+" già presente in anagrafica.");
  if(isNaN(si)||si<=0)return _manFail("Inserisci uno Store ID valido.");
  if(isIT&&si>(seas?4999:6500))return _manFail("Store "+si+" escluso"+(seas?" (seasonal: solo store ≤ 4999).":" (store > 6500, sede/ufficio)."));
  if(seas&&SEASON_PERIOD==="mid"&&REGION==="international"&&isD(si))return _manFail("Dept store ("+si+") escluso dal Mid-Season — premio solo a fine stagione.");
  var sdesc=_manV("manS"),sname=sdesc;
  if(!sname)sname=_manStoreName(si);
  if(!sname)return _manFail("Store "+si+" non presente: indica il nome del negozio.");
  if(sname.indexOf(si+" ")!==0)sname=si+" "+sname;
  sname=sname.toUpperCase();
  var ib=_manNum(_manV("manIb")),rl=_manNum(_manV("manRl"));
  var en,cu,ex;
  if(isIT){
    if(!(ib>0)&&!(rl>0))return _manFail("Indica almeno BDG lordo o Gross salary.");
    en=210;cu="EUR";ex=1;
  }else{
    var enS=_manV("manEn");if(!enS)return _manFail("Seleziona l'ente / valuta.");
    if(!(rl>0))return _manFail("Lo stipendio lordo deve essere maggiore di zero.");
    en=parseInt(enS);cu=ENTE_CU[enS].cu;ex=ENTE_CU[enS].ex;
  }
  var mp=_manV("manMp"),mf=_manV("manMf"),fcName="";
  var _mp=FC_MAP[String(si)];
  if(_mp){var _fa=Array.isArray(_mp.fc)?_mp.fc[0]:_mp.fc;if(_fa&&FC_EMP[_fa])fcName=FC_EMP[_fa].n+' '+FC_EMP[_fa].c;}
  if(!fcName&&!isIT)fcName=ENTE_FC[String(en)]||"";
  if(!mf)mf=fcName?fcName.toLowerCase().replace(/ /g,'.')+'@boggi.com':"";
  var emp={
    si:si,s:sname,m:m,c:cogn,n:nome,j:job,f:job,rl:rl||0,ib:ib||0,
    fc:fcName,en:en,
    rb:0,rbn:0,rd:0,rs:0,rp:0,rsa:0,rdc:0,rcs:0,ra:0,
    ml:0,vi:0,tl:0,tn:0,sc:0,il:0,
    ps:"NO",dv:0,md:0,pq:0,
    cu:cu,ex:ex,mp:mp,mf:mf,
    man:1
  };
  if(isIT){emp.cf=sanitizeCF(_manV("manCf"));emp.ibFromAY=false;}
  E.push(emp);D.e=E;
  var sid=String(si);
  if(!D.s[sid])D.s[sid]={l:"",f:0,s:0,e:0,r:0};
  var noTarget=seas?!(SEAS_TARGETS&&SEAS_TARGETS[sid]&&(SEAS_TARGETS[sid].to||0)>0):!(D.t&&D.t[sid]);
  return noTarget?"Dipendente "+cogn+" "+nome+" aggiunto allo store "+si+".\n\n⚠ Per questo negozio non risulta caricato nessun target: ricarica/integra il file target, altrimenti il premio resta a zero.":true;
}

// Registra l'associazione store→FC/VM di un dipendente FC+VM (idempotente; usata anche dopo un re-import)
function _manFcvmRegister(emp){
  var sp=emp.manSpec||{tipo:"AREA",stores:[]};
  FC_EMP[emp.m]=emp;
  if(!emp.bdg_stores)emp.bdg_stores=[];
  sp.stores.forEach(function(sid){
    var nm=_manStoreName(sid)||sid;
    if(sp.tipo==="AREA"){
      if(!FC_MAP[sid])FC_MAP[sid]={fc:[],vm:[],s:nm,tipo:"AREA"};
      else FC_MAP[sid].tipo="AREA";
      var key=emp.j==="FC"?"fc":"vm";
      var arr=FC_MAP[sid][key];
      if(!Array.isArray(arr)){arr=arr?[arr]:[];FC_MAP[sid][key]=arr;}
      if(arr.indexOf(emp.m)<0)arr.push(emp.m);
    }else{
      if(!FC_MAP[sid])FC_MAP[sid]={fc:[],vm:[],s:nm,tipo:"BDG"};
      if(!emp.bdg_stores.some(function(b){return b.sid===sid}))emp.bdg_stores.push({sid:sid,ib:sp.premio||0,s:nm});
    }
  });
}

function _manSaveFcvm(){
  var m=_manV("manM"),cogn=_manV("manC").toUpperCase(),nome=_manV("manN").toUpperCase(),ruolo=_manV("manJ"),tipo=_manV("manTipo");
  if(!m||!cogn||!nome)return _manFail("Matricola, cognome e nome sono obbligatori.");
  if(FC_EMP[m])return _manFail("Matricola "+m+" già presente in anagrafica FC+VM.");
  var stores=_manV("manStores").split(/[\s,;]+/).map(function(s){return String(parseInt(s))}).filter(function(s){return s!=="NaN"});
  stores=stores.filter(function(s,i){return stores.indexOf(s)===i});
  if(!stores.length)return _manFail("Indica almeno uno Store ID.");
  var premio=_manNum(_manV("manIb"));
  if(!(premio>0))return _manFail("Indica il premio massimale (maggiore di zero).");
  var cu=(_manV("manCu")||"EUR").toUpperCase(),ex=1,warn="";
  if(cu!=="EUR"){
    ex=0;
    Object.keys(VL||{}).forEach(function(k){if(VL[k]&&VL[k].cu===cu&&VL[k].ex)ex=VL[k].ex});
    if(!ex&&D&&D.vl)Object.keys(D.vl).forEach(function(k){if(D.vl[k]&&D.vl[k].cu===cu&&D.vl[k].ex)ex=D.vl[k].ex});
    if(!ex)Object.keys(ENTE_CU).forEach(function(k){if(ENTE_CU[k].cu===cu&&ENTE_CU[k].ex)ex=ENTE_CU[k].ex});
    if(!ex){ex=1;warn="\n\n⚠ Cambio per "+cu+" non trovato: impostato 1. Si aggiorna con il file Target Fatturato oppure da Configurazione.";}
  }
  var emp={m:m,c:cogn,n:nome,j:ruolo,cu:cu,ex:ex,ib:tipo==="AREA"?premio:0,lang:"INGLESE",bdg_stores:[],
    mp:_manV("manMp").toLowerCase(),mf:"",cf:REGION==="italia"?_manV("manCf").toUpperCase():"",ml:0,ps:"NO",
    man:1,manSpec:{tipo:tipo,stores:stores,premio:premio}};
  _manFcvmRegister(emp);
  try{syncFcExRates()}catch(ex2){}
  return "Dipendente "+cogn+" "+nome+" ("+ruolo+") aggiunto su "+stores.length+" store ("+tipo+")."+warn;
}

function manEmpRemove(m){
  var fcvm=PRIZE_MODE==="fcvm";
  if(!confirm("Rimuovere il dipendente inserito manualmente "+m+"?"))return;
  if(fcvm){
    delete FC_EMP[m];
    Object.keys(FC_MAP).forEach(function(sid){
      var mp=FC_MAP[sid];
      ["fc","vm"].forEach(function(k){if(Array.isArray(mp[k])){var i=mp[k].indexOf(m);if(i>=0)mp[k].splice(i,1)}else if(mp[k]===m)mp[k]=[]});
    });
    if(typeof AGG_FCVM!=="undefined")delete AGG_FCVM[m];
  }else{
    for(var i=E.length-1;i>=0;i--){if(E[i].man&&String(E[i].m)===String(m))E.splice(i,1)}
    D.e=E;
    delete AGG[m];if(D.v)delete D.v[m];
  }
  updateHeaderCount();
  try{rC()}catch(ex){}try{rA()}catch(ex){}try{rSources()}catch(ex){}
  try{if(typeof rDist==="function")rDist()}catch(ex){}
  try{if(typeof rAgg==="function")rAgg()}catch(ex){}
  try{rT()}catch(ex){}
  autoSave();
}

// Pulsante + elenco dei dipendenti inseriti a mano, per Fonti Dati
function manEmpButtonHtml(){
  return '<button class="exp-btn btn-green" onclick="manEmpOpen()" title="Aggiunge un dipendente senza reimportare l\'anagrafica">&#10133; Aggiungi dipendente</button>';
}
function manEmpListHtml(){
  var fcvm=PRIZE_MODE==="fcvm";
  var list=fcvm?Object.keys(FC_EMP).map(function(k){return FC_EMP[k]}).filter(function(e){return e&&e.man}):E.filter(function(e){return e.man});
  if(!list.length)return '';
  var h='<div style="margin-top:10px;border:1px solid #d5d0c8;border-radius:6px;padding:8px 10px;background:#faf8f4">';
  h+='<div style="font-size:10px;font-weight:700;color:#6b6560;margin-bottom:4px">&#9998; Inseriti manualmente ('+list.length+') — restano anche dopo un nuovo import anagrafica</div>';
  list.forEach(function(e){
    var where=fcvm?(e.manSpec?e.manSpec.tipo+' · store '+e.manSpec.stores.join(', '):''):('store '+e.si);
    h+='<div style="display:flex;align-items:center;gap:8px;font-size:11px;padding:2px 0"><span style="font-family:monospace;color:#8a8680">'+esc(e.m)+'</span><span>'+esc(e.c)+' '+esc(e.n)+'</span><span style="color:#8a8680">'+esc(e.j)+' · '+esc(where)+'</span>';
    h+='<button onclick="manEmpRemove(\''+esc(String(e.m).replace(/'/g,""))+'\')" title="Rimuovi" style="margin-left:auto;color:#cf5b5b;border:none;background:none;cursor:pointer;font-size:12px">&#10005;</button></div>';
  });
  return h+'</div>';
}

// Dopo un re-import di E: rimette i dipendenti manuali la cui matricola non e' nel nuovo file
function manEmpReapplyE(manual){
  var n=0;
  (manual||[]).forEach(function(me){
    if(E.some(function(e){return String(e.m)===String(me.m)}))return;
    E.push(me);
    var sid=String(me.si);if(!D.s[sid])D.s[sid]={l:"",f:0,s:0,e:0,r:0};
    n++;
  });
  D.e=E;
  return n;
}
// Dopo un re-import FC+VM: rimette i FC/VM manuali (e il loro mapping store)
function manEmpReapplyFcvm(manual){
  var n=0;
  (manual||[]).forEach(function(me){
    if(FC_EMP[me.m]||!me.manSpec)return;
    me.bdg_stores=[];
    _manFcvmRegister(me);n++;
  });
  return n;
}
