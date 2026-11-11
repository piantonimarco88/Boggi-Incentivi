/* Suite di regressione per statistiche.html — garantisce la regola:
 * "l'agente non dà MAI numeri diversi dai tab" + regole frequenza/eleggibilità.
 * Uso:  node statistiche/_tests.js     (da lanciare prima di ogni commit)
 * Dipende da statistiche/demo_data_ci.json (dati demo NON riconducibili a persone, in git;
 * generati da build/make-stats-demo.js a partire da _demo_data.json locale).
 * I valori attesi sono ancorati ai dati demo: se cambi i dati demo, aggiorna i valori.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const DIR=__dirname;
const html=fs.readFileSync(path.join(DIR,'statistiche.html'),'utf8');
const re=/<script>([\s\S]*?)<\/script>/g;let m,best='';while((m=re.exec(html))){if(m[1].length>best.length)best=m[1];}
new vm.Script(best); // throws se la sintassi è rotta
best=best.replace('let allData=[]','var allData=[]').replace("let _malV='naz'","var _malV='naz'")
  .replace('let sasFiles={}','var sasFiles={}').replace("let sasView='negozi'","var sasView='negozi'")
  .replace('let sasRoleSel=new Set()','var sasRoleSel=new Set()')
  .replace('const STORE_ASSIGN_STATIC=','var STORE_ASSIGN_STATIC=')
  .replace('let storeAssignMap=STORE_ASSIGN_STATIC, storeAssignOverrideFiles={};','var storeAssignMap=STORE_ASSIGN_STATIC, storeAssignOverrideFiles={};')
  .replace('const COMP=','var COMP='); // solo per l'harness: rende allData/stato malattia/SAS/COMP/ruolo/assegnazione iniettabili/leggibili dal test

const noop=()=>{};
const el=()=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:'',getContext:()=>({}),dataset:{},remove:noop,parentNode:null});
const _els={}; // elementi persistenti per id: i test possono rileggere ciò che il codice scrive
const document={getElementById:id=>_els[id]||(_els[id]=el()),querySelector:()=>el(),querySelectorAll:()=>[],createElement:()=>el(),createTextNode:t=>({textContent:t}),addEventListener:noop,body:el()};
class _FakeFileReader{readAsText(f){this.onload&&this.onload({target:{result:f._content}});}}
const sb={document,navigator:{},console,Chart:function(){return{destroy:noop};},XLSX:{},localStorage:{getItem:()=>null,setItem:noop},setTimeout:f=>f&&f(),clearTimeout:noop,indexedDB:{open:()=>({})},addEventListener:noop,matchMedia:()=>({matches:false}),TextDecoder,fetch:async()=>({json:async()=>({})}),btoa,unescape,FileReader:_FakeFileReader};
sb.window=sb;sb.globalThis=sb;vm.createContext(sb);vm.runInContext(best,sb);

sb.alert=noop;
const rows=JSON.parse(fs.readFileSync(path.join(DIR,'demo_data_ci.json'),'utf8')).rows;
sb.AgentTools.setData(rows);sb.allData=rows;

let pass=0,fail=0;const bad=[];
function T(name,fn){try{const r=fn();if(r===true){pass++;}else{fail++;bad.push(name+(typeof r==='string'?' — '+r:''));}}catch(e){fail++;bad.push(name+' — EXCEPTION: '+e.message);}}
const asyncTests=[]; // test che devono attendere una Promise (es. flussi con idbLoadSession/await)
function TA(name,fn){asyncTests.push({name,fn});}
const eq=(a,b)=>a===b?true:('atteso '+b+', avuto '+a);
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.05)?true:('atteso ~'+b+', avuto '+a);

// ── 1. struttura ───────────────────────────────────────────────
T('sintassi script principale', ()=>true); // già validata da new vm.Script
T('AgentTools: 29 strumenti (28 + coefficiente_inventari) e ognuno dichiarato in AG_TOOLS', ()=>{const k=Object.keys(sb.AgentTools.TOOLS);if(k.length!==29)return 'attesi 29, trovati '+k.length;const _h=require('fs').readFileSync(require('path').join(__dirname,'statistiche.html'),'utf8');const _ag=_h.slice(_h.indexOf('const AG_TOOLS=['));const decl=new Set([..._ag.matchAll(/\{name:'([a-z_]+)'/g)].map(m=>m[1]));const miss=k.filter(n=>!decl.has(n));return miss.length?'non dichiarati in AG_TOOLS: '+miss.join(', '):true;});

// ── 2. parità agente ↔ tab Confronta (cmpAggByEmp) ────────────
T('analizza_dipendente == cmpAggByEmp (RINALDI 2025)', ()=>{
  const ag=sb.AgentTools.run('analizza_dipendente',{cognome:'RINALDI',anno:2025});
  const er=rows.filter(r=>(r.cognome||'').toUpperCase()==='RINALDI'&&r.monthKey>=202501&&r.monthKey<=202512);
  const nat=sb.cmpAggByEmp(er).sort((a,b)=>b.inc-a.inc)[0];
  if(Math.abs(ag.incidenza_pct-+nat.inc.toFixed(1))>0.05)return 'inc: '+ag.incidenza_pct+' vs '+nat.inc.toFixed(1);
  if(Math.abs(ag.achievement_pct-Math.round(nat.ach))>1)return 'ach: '+ag.achievement_pct+' vs '+nat.ach.toFixed(1);
  return true;});

// ── 3. simulazioni == tab What-if (whatifAgg + decorrenza) ────
T('simula_leva persona BDG→500 da set 2025 (delta 878, dati demo CI)', ()=>{
  const r=sb.AgentTools.run('simula_leva',{ambito:{cognome:'RINALDI',nome:'MARCO'},leva:'bdg_base',nuovo_valore:500,da_mese:'settembre',da_anno:2025});
  return r.delta_eur===878&&r.erogato_prima_eur===1944?true:JSON.stringify(r);});
T('simula_leva ruolo SM BDG→350 anno 2025 (delta 30669, dati demo CI)', ()=>{
  const r=sb.AgentTools.run('simula_leva',{ambito:{ruolo:'SM'},leva:'bdg_base',nuovo_valore:350,anno:2025});
  return eq(r.delta_eur,30669);});
T('simula_leva semestrale → rimanda al tab', ()=>{
  const r=sb.AgentTools.run('simula_leva',{ambito:{ruolo:'SM'},leva:'incidenza_semestrale',nuovo_valore:25});
  return r.errore?true:'doveva dare errore';});
T('whatifAgg: leva SAS senza effetto dal SAS_LEVER_CUTOFF (lug-2026), attiva prima (policy sostituita da SAS→Fatturato)', ()=>{
  const p={base:{SCS:0},sy:0.03,sub:0.02,dig:0.30,sas:10,dcc:0.002}; // simula SAS a 10€/unità invece del default 2€
  const mk=monthKey=>({job:'SCS',matricola:'M1',monthKey,cBdg:0,cSas:100,cDcc:0,cPrivilege:0,cDigital:0,cShopper:0,mBdg:0,rml_period:1000,erogato:100,massimale:200,year:2026});
  const by=sb.whatifAgg([mk(202606),mk(202607)],p,1,'SCS',0);
  const delta=by['2026'].erS-by['2026'].erR;
  // giugno: cSas 100 × (10/2 - 1) = 400 di delta; luglio: nessun effetto (leva disattivata) → totale atteso 400
  return delta===400?true:'delta='+delta+' (atteso 400: solo giugno, luglio non deve contribuire)';});

// ── 4. filtri gruppo (tipo_negozio, liste negozi, pari) ───────
T('confronta_gruppi SM dept vs normali (19/22.1 vs 75/10.9)', ()=>{
  const r=sb.AgentTools.run('confronta_gruppi',{gruppoA:{ruolo:'SM',tipo_negozio:'dept'},gruppoB:{ruolo:'SM',tipo_negozio:'normali'},anno:2025});
  if(r.a.n!==19||r.b.n!==75)return 'n: '+r.a.n+'/'+r.b.n;
  return near(r.a.incidenza_pct,22.1)===true&&near(r.b.incidenza_pct,10.9)===true?true:'inc: '+r.a.incidenza_pct+'/'+r.b.incidenza_pct;});
T('tipo_negozio robusto a testo libero ("dept store")', ()=>{
  const a=sb.AgentTools.run('confronta_gruppi',{gruppoA:{ruolo:'SM',tipo_negozio:'dept store'},gruppoB:{ruolo:'SM',tipo_negozio:'negozio normale'},anno:2025});
  return a.a.n===19&&a.b.n===75?true:'n: '+a.a.n+'/'+a.b.n;});
T('liste negozi (negozi:[…] e stringa con virgole)', ()=>{
  const stores=['1187 ECI POZUELO','1188 ECI AVENIDAS'];
  const a=sb.AgentTools.run('confronta_gruppi',{gruppoA:{ruolo:'SM',negozi:stores},gruppoB:{ruolo:'SM',tipo_negozio:'normali'},anno:2025});
  const b=sb.AgentTools.run('confronta_gruppi',{gruppoA:{ruolo:'SM',negozio:stores.join(', ')},gruppoB:{ruolo:'SM',tipo_negozio:'normali'},anno:2025});
  return a.a.n===2&&b.a.n===2?true:'n: '+a.a.n+'/'+b.a.n;});
T('pari_negozi restringe i pari ruolo (3 pari, media 28.2)', ()=>{
  const stores=['1187 ECI POZUELO','1188 ECI AVENIDAS','1189 ECI PINTOR VALENCIA','1190 ECI DIAGONAL'];
  const r=sb.AgentTools.run('analizza_dipendente',{cognome:'RINALDI',anno:2025,pari_negozi:stores});
  return r.n_pari===3&&near(r.media_ruolo_pct,28.2)===true?true:JSON.stringify({n:r.n_pari,m:r.media_ruolo_pct});});

// ── 5. impatto_malattia: distribuzione mensile ─────────────────
T('impatto_malattia distribuzione (persona di prova 412gg, 17/24, distribuita)', ()=>{
  // Dati demo CI: le malattie sono rimescolate nel mese, quindi nessuna persona reale ha piu`
  // un profilo «distribuito». Si aggiunge per il solo test una persona inventata: le righe di
  // VILLA LUCA (24 mesi) clonate con 412 giorni su 17 mesi, poi si ripristinano i dati.
  const base=rows.filter(r=>r.cognome==='VILLA'&&r.nome==='LUCA').sort((a,b)=>a.monthKey-b.monthKey).slice(-24);
  if(base.length<24)return 'servono 24 mesi di VILLA LUCA, trovati '+base.length;
  const gg=[30,25,24,20,30,22,28,26,18,30,24,20,27,23,29,25,11]; // 17 mesi, totale 412
  const extra=base.map((r,i)=>Object.assign({},r,{cognome:'TESTMAL',nome:'DISTRIBUITA',matricola:'9999999',malattie:i<17?gg[i]:0}));
  sb.AgentTools.setData(rows.concat(extra));
  try{
    const r=sb.AgentTools.run('impatto_malattia',{cognome:'TESTMAL',nome:'DISTRIBUITA',periodo_mesi:24});
    return r.giorni_malattia===412&&r.mesi_con_assenze===17&&r.concentrazione==='distribuita'?true:JSON.stringify({g:r.giorni_malattia,m:r.mesi_con_assenze,c:r.concentrazione});
  }finally{sb.AgentTools.setData(rows);}
});
T('impatto_malattia concentrazione (persona di prova 114gg su 3 mesi, concentrata)', ()=>{
  const r=sb.AgentTools.run('impatto_malattia',{cognome:'BASILE',nome:'MARCO',periodo_mesi:24});
  return r.giorni_malattia===114&&r.mesi_con_assenze===3&&r.concentrazione==='concentrata'?true:JSON.stringify({g:r.giorni_malattia,m:r.mesi_con_assenze,c:r.concentrazione});});

// ── 6. frequenza raggiungimento (eleggibilità per regola) ─────
T('frequenza: ordine BDG…QTY ultimo, SAS mensile esclusa, SAS sem inclusa', ()=>{
  const comps=sb.yoyFreqComps(rows);const ks=comps.map(c=>c.k);
  const mensili=ks.filter(k=>comps.find(c=>c.k===k).tipo==='mensile');
  if(mensili[0]!=='cBdg')return 'primo: '+mensili[0];
  if(mensili[mensili.length-1]!=='cQty')return 'ultimo mensile: '+mensili[mensili.length-1];
  if(ks.includes('cSas')||ks.includes('cDcc')||ks.includes('cArt')||ks.includes('cVisual')||ks.includes('cCs'))return 'esclusi presenti';
  if(!ks.includes('cSasSem'))return 'manca cSasSem';
  return true;});
T('frequenza BDG 2025 = 2891/5095 (tutti eleggibili, 0 inclusi)', ()=>{
  const sub=rows.filter(r=>r.year===2025);
  const it=sb.yoyFreqItems(rows).find(x=>x.c.k==='cBdg');
  const f=sb.yoyItemFreq(it,sub);
  return f.n===2891&&f.N===5095?true:f.n+'/'+f.N;});
T('frequenza QTY 2025 solo dept = 68/484', ()=>{
  const sub=rows.filter(r=>r.year===2025);
  const it=sb.yoyFreqItems(rows).find(x=>x.c.k==='cQty');
  const f=sb.yoyItemFreq(it,sub);
  return f.n===68&&f.N===484?true:f.n+'/'+f.N;});
T('frequenza SAS/DCC: esclusi Svizzera/Asia/aeroporti (430 mesi)', ()=>{
  const sub=rows.filter(r=>r.year===2025);
  const comps=sb.yoySelComps(rows);const c=comps.find(x=>x.k==='cSas');
  const univ=sub.filter(r=>!String(r._tipo||'').includes('semestrale')&&sb.compEligible(c,r));
  return eq(univ.length,430);});
T('semestrali per edizione: UPT presente 2024, assente 2025', ()=>{
  const it=sb.yoyFreqItems(rows).find(x=>x.c.k==='cUptSem'&&x.store==='norm');
  const f24=sb.yoyItemFreq(it,rows.filter(r=>r.year===2024));
  const f25=sb.yoyItemFreq(it,rows.filter(r=>r.year===2025));
  return f24.n===113&&f25.n===0?true:f24.n+'/'+f25.n;});
T('semestrali dept separati (Subscription dept 2025 = 1/19)', ()=>{
  const it=sb.yoyFreqItems(rows).find(x=>x.c.k==='cSubSem'&&x.store==='dept');
  const f=sb.yoyItemFreq(it,rows.filter(r=>r.year===2025));
  return f.n===1&&f.N===19?true:f.n+'/'+f.N;});
T('grafico frequenza si costruisce senza errori', ()=>{
  const cfg=sb.buildYoyCompFreq(rows);
  return cfg&&cfg.type==='bar'&&cfg.data.labels.length>5?true:'cfg nullo o vuoto';});

// ── 7. etichette (rinomine globali) ────────────────────────────
T('rinomine: COMP usa BDG e Subscription', ()=>{
  const lbl=sb.buildYoyCompFreq(rows).data.labels;
  if(lbl.includes('BDG (lordo)')||lbl.some(l=>l.includes('Nuove Privilege')))return 'etichette vecchie presenti';
  return lbl.includes('BDG')&&lbl.includes('Subscription')?true:'mancano nuove etichette';});

// ── 8. chat: markdown, follow-up ───────────────────────────────
T('agMd rende le tabelle markdown', ()=>{
  const h=sb.agMd('| a | b |\n|---|---|\n| 1 | 2 |');
  return h.indexOf('<table')>=0?true:'tabella non resa';});
T('agSplitFollow estrae i suggerimenti', ()=>{
  const sp=sb.agSplitFollow('Testo.\nFOLLOWUP: a? | b? | c?');
  return sp.clean==='Testo.'&&sp.follow.length===3?true:JSON.stringify(sp);});

// ── 9. report sintetico ────────────────────────────────────────
T('asstReport genera tutte le sezioni', ()=>{
  let html='';sb.open=()=>({document:{write:h=>html=h,close:noop,getElementById:()=>null}});sb.agEnabled=false;
  // asstReport è async ma con agEnabled=false la parte sync scrive subito l'HTML
  sb.asstReport();
  const need=['Report premi','Frequenza raggiungimento','Incidenza media per premio','Top negozi','Nazioni'];
  const miss=need.filter(s=>html.indexOf(s)<0);
  return miss.length?('mancano: '+miss.join(', ')):true;});

// ── 10d. diff import ───────────────────────────────────────────
T('diff import: segnala mesi e dipendenti nuovi', ()=>{
  const store={};sb.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}};
  sb.window._freshImport=true;sb.allData=rows.filter(r=>r.year<=2025);sb.importDiff(); // baseline
  sb.window._freshImport=true;sb.allData=rows;sb.importDiff();                          // import nuovo
  const e2=sb.document.getElementById('importDiff');
  if(e2.innerHTML.indexOf('Mesi aggiunti')<0)return 'manca "Mesi aggiunti": '+e2.innerHTML.slice(0,140);
  return true;});

// ── 10c. insight dashboard + sparkline ─────────────────────────
T('insight: serie mensili e sparkline si calcolano', ()=>{
  sb.filteredRaw=rows;sb.filteredAgg=[];
  const {ks,by}=sb._dashMonthly();
  if(ks.length<5)return 'pochi mesi: '+ks.length;
  const svg=sb._sparkSvg(ks.map(k=>by[k].er),'#000');
  if(svg.indexOf('<svg')<0)return 'sparkline vuota';
  sb.renderKpiSparks();sb.renderDashInsight();
  return true;});

// ── 10b. stato filtri nell'URL ─────────────────────────────────
T('hash: hashUpdate serializza tab e filtri', ()=>{
  let u='';sb.history={replaceState:(a,b,x)=>u=x};sb.URLSearchParams=URLSearchParams;
  sb.hashUpdate('yoy');
  return u.indexOf('#t=yoy')===0?true:('url: '+u);});

// ── 10. command palette ────────────────────────────────────────
T('palette: ckpFilter gira con e senza query', ()=>{
  sb.ckpFilter('rinaldi');sb.ckpFilter('1187');sb.ckpFilter('report');sb.ckpFilter('');
  return true;});

// ── 11. pin dipendente ─────────────────────────────────────────
T('pin: pinEmp/unpinEmp e badge', ()=>{
  const store={};sb.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
  sb.pinEmp('ROSSI MARIO');
  if(sb._pinName()!=='ROSSI MARIO')return 'name: '+sb._pinName();
  sb.unpinEmp();
  return sb._pinName()===''?true:'non sganciato';});

// ── 12. stima maggior premio malattia (BDG+Digital) ───────────
T('stima malattia: totale >0, aggregato = somma per-dipendente', ()=>{
  sb.allData=rows;
  const d=sb._malCompute();
  if(!(d.total>0))return 'totale non positivo: '+d.total;
  const sumEmp=Object.values(d.byEmp).reduce((s,e)=>s+e.c,0);
  if(Math.abs(sumEmp-d.total)>1)return 'somma per-dip '+Math.round(sumEmp)+' != totale '+Math.round(d.total);
  const sumNaz=Object.values(d.byNaz).reduce((s,v)=>s+v,0);
  if(Math.abs(sumNaz-d.total)>1)return 'somma per-nazione != totale';
  // solo BDG+Digital ⇒ <= stima 4-KPI; sanity: incidenza plausibile (<20% erogato)
  const erog=rows.filter(r=>!String(r._tipo||'').includes('semestrale')).reduce((s,r)=>s+(r.erogato||0),0);
  if(d.total/erog>0.2)return 'incidenza troppo alta: '+(d.total/erog*100).toFixed(1)+'%';
  return true;});
T('stima malattia: filtri anno partizionano il totale', ()=>{
  sb.allData=rows;const f=(y)=>{sb._malYears=new Set(y||[]);sb._malMonths=new Set();return sb._malCompute().total;};
  const tot=f();const years=[...new Set(rows.map(r=>r.year).filter(Boolean))];
  const sum=years.reduce((s,y)=>s+f([y]),0);
  sb._malYears=new Set();
  return Math.abs(sum-tot)<1?true:('somma anni '+Math.round(sum)+' != totale '+Math.round(tot));});

// ── 13. cross-reference ente mancante (FC/VM senza matricola mappata) ──
T('resolveCrossRefEnte: risolve ente da un\'altra riga della stessa matricola', ()=>{
  const rowA={matricola:'9999999',_ente:224,cambio:0.08836,rml_period:1000,massimale:2000,erogato:500,mBdg:0,cBdg:0}; // mensile, già in EUR
  const rowB={matricola:'9999999',_ente:0,_unknownEnte:true,cambio:1,rml_period:1000/0.08836,massimale:2000/0.08836,erogato:500/0.08836,mBdg:0,cBdg:0}; // FC/VM, ente ignoto, ancora in LC
  sb.allData=[rowA,rowB];
  const fixed=sb.resolveCrossRefEnte();
  if(fixed!==1)return 'fixed='+fixed;
  if(rowB._ente!==224)return 'ente non risolto: '+rowB._ente;
  if(rowB._nazione!=='Svezia')return 'nazione: '+rowB._nazione; // ENTE_PAESE[224] ha priorità sulla valuta ENTE_CAMBI
  sb.applyUniformRates();
  if(rowB._unknownEnte!==false)return '_unknownEnte non azzerato';
  return Math.abs(rowB.rml_period-1000)<1?true:('rml_period non riallineato: '+rowB.rml_period);});
T('resolveCrossRefEnte: maggioranza vince su righe multiple, nessuna riga nota = irrisolto', ()=>{
  const majA={matricola:'8888888',_ente:210,cambio:1,rml_period:100};
  const majB={matricola:'8888888',_ente:210,cambio:1,rml_period:100};
  const majC={matricola:'8888888',_ente:211,cambio:1,rml_period:100}; // minoranza
  const unk={matricola:'8888888',_ente:0,_unknownEnte:true,cambio:1,rml_period:100};
  const orphan={matricola:'7777777',_ente:0,_unknownEnte:true,cambio:1,rml_period:100}; // nessuna riga nota per questa matricola
  sb.allData=[majA,majB,majC,unk,orphan];
  sb.resolveCrossRefEnte();
  if(unk._ente!==210)return 'maggioranza non applicata: '+unk._ente;
  if(orphan._ente!==0)return 'orphan doveva restare irrisolto: '+orphan._ente;
  return true;});

// ── 14. FC/VM: solo premio BDG, trattato come 'mensile' nei filtri ────
T('parseRows: FC/VM → mBdg=massimale, cBdg=erogato, altri componenti a 0', ()=>{
  const raw=[{'Somma di INCENTIVO RIPARTITO CORRETTO':3000,'PREMIO FINALE':1500,'MATRICOLA':'9999998','NOME':'MARIO ROSSI TEST','FUNZIONE':'FC','Somma di RML RIPARTITA':2000,'MALATTIE':0}];
  const parsed=sb.parseRows(raw,'PREMI TEST FC+VM.xlsx',{});
  if(parsed.length!==1)return 'righe uscite dal parser: '+parsed.length;
  const r=parsed[0];
  if(r.mBdg!==r.massimale||r.mBdg!==3000)return 'mBdg='+r.mBdg+' massimale='+r.massimale;
  if(r.cBdg!==r.erogato||r.cBdg!==1500)return 'cBdg='+r.cBdg+' erogato='+r.erogato;
  if(r.cDigital!==0||r.cShopper!==0||r.cPrivilege!==0)return 'altri componenti non a 0';
  return r._tipo==='fc vm'?true:'_tipo='+r._tipo;});
T('parseRows: FC/VM NUOVO formato ("NUOVO PROGRAMMA INCENTIVI") → riconosciuto, mBdg/cBdg corretti, RML=0', ()=>{
  const raw=[{MATRICOLA:'4999901',COGNOME:'FCALFA',NOME:'MARCO',RUOLO:'FC',VALUTA:'CHF',CAMBIO:1.3756,'PREMIO MAX LC':3000,'N.STORE':11,'TARGET EUR':100,'CONS EUR':100,'ESUBERO PREV':0,'CONS TOT EUR':100,'% AREA':100,'SY CY':0,'SY LY':0,'SY OK':'SI','PREMIO LC':3000,'PREMIO EUR':4126.8,ESITO:'full',OVERRIDE:''}];
  const parsed=sb.parseRows(raw,'FCVM_05_2026.xlsx',{});
  if(parsed.length!==1)return 'righe uscite dal parser: '+parsed.length;
  const r=parsed[0];
  if(r._tipo!=='fc vm')return '_tipo='+r._tipo;
  if(r.cognome!=='FCALFA'||r.nome!=='MARCO')return 'cognome/nome: '+r.cognome+'/'+r.nome;
  if(Math.abs(r.massimale-3000*1.3756)>0.01)return 'massimale='+r.massimale;
  if(r.erogato!==4126.8)return 'erogato='+r.erogato; // usa PREMIO EUR diretto, non ricalcolato da LC×cambio
  if(r.mBdg!==r.massimale||r.cBdg!==r.erogato)return 'mBdg/cBdg non allineati a massimale/erogato';
  if(r.rml_period!==0)return 'rml_period doveva essere 0 (colonna non ancora disponibile), avuto '+r.rml_period;
  if(r._unknownEnte!==false)return '_unknownEnte doveva essere false (il file fornisce già un cambio valido)';
  return r.month===5&&r.year===2026?true:'month/year: '+r.month+'/'+r.year;});
T('parseRows: FC/VM nuovo formato con massimale=0 viene scartato come le altre righe', ()=>{
  const diag={tenute:0,scartate:0,motivi:{}};
  const raw=[{MATRICOLA:'9999996',COGNOME:'TEST',NOME:'ZERO',RUOLO:'VM',VALUTA:'EUR',CAMBIO:1,'PREMIO MAX LC':0,'N.STORE':1,'TARGET EUR':0,'CONS EUR':0,'ESUBERO PREV':0,'CONS TOT EUR':0,'% AREA':0,'SY CY':0,'SY LY':0,'SY OK':'NO','PREMIO LC':0,'PREMIO EUR':0,ESITO:'none',OVERRIDE:''}];
  const parsed=sb.parseRows(raw,'FCVM_05_2026.xlsx',diag);
  return (parsed.length===0&&diag.scartate===1&&diag.motivi['Massimale assente o zero']===1)?true:JSON.stringify({parsed:parsed.length,diag});});
T('parseRows: FC/VM nuovo formato variante aprile (PREMIO AREA+BDG NEGOZI=TOTALE, niente PREMIO EUR/LC) → riconosciuto, erogato=TOTALE', ()=>{
  const raw=[{MATRICOLA:'4999902',COGNOME:'VMBETA',NOME:'VITO',RUOLO:'VM',VALUTA:'EUR',CAMBIO:1,'PREMIO MAX LC':1700,'N.STORE':11,'TARGET EUR':100,'CONS EUR':100,'ESUBERO PREV':0,'CONS TOT EUR':100,'% AREA':96.25,'SY CY':0,'SY LY':0,'SY OK':'SI','PREMIO AREA LC':1020,'PREMIO AREA EUR':1020,'PREMIO BDG NEGOZI LC':100,'PREMIO BDG NEGOZI EUR':100,'PREMIO TOTALE LC':1120,'PREMIO TOTALE EUR':1120,ESITO:'partial',OVERRIDE:''}];
  const parsed=sb.parseRows(raw,'FCVM_04_2026.xlsx',{});
  if(parsed.length!==1)return 'righe uscite dal parser: '+parsed.length;
  const r=parsed[0];
  if(r._tipo!=='fc vm')return '_tipo='+r._tipo;
  if(r.massimale!==1700)return 'massimale='+r.massimale;
  if(r.erogato!==1120)return 'erogato='+r.erogato+' (atteso 1120 = PREMIO TOTALE EUR)';
  return r.month===4&&r.year===2026?true:'month/year: '+r.month+'/'+r.year;});
T('parseRows: FC/VM Italia (matricola numerica senza prefisso lettera, es. "0000045") risolve _ente=210/_nazione="Italia" via FC_VM_ENTE — prima del fix (10/09/2026) restava _ente=0/_nazione=null perché quelle matricole non erano nella mappa statica (tutte le altre hanno prefisso "A")', ()=>{
  const raw=[{MATRICOLA:'0000045',COGNOME:'FCGAMMA',NOME:'NINO',RUOLO:'FC',VALUTA:'EUR',CAMBIO:1,'PREMIO MAX LC':1700,'N.STORE':9,'TARGET EUR':481811.44,'CONS EUR':475713.71,'ESUBERO PREV':0,'CONS TOT EUR':475713.71,'% AREA':98.73,'SY CY':0,'SY LY':0,'SY OK':'SI','PREMIO AREA LC':1020,'PREMIO AREA EUR':1020,'PREMIO BDG NEGOZI LC':0,'PREMIO BDG NEGOZI EUR':0,'PREMIO TOTALE LC':1020,'PREMIO TOTALE EUR':1020,ESITO:'partial',OVERRIDE:''}];
  const parsed=sb.parseRows(raw,'FCVM_08_2026_ITA.xlsx',{});
  if(parsed.length!==1)return 'righe uscite dal parser: '+parsed.length;
  const r=parsed[0];
  if(r._ente!==210)return '_ente='+r._ente+' (atteso 210, Italia)';
  if(r._nazione!=='Italia')return '_nazione='+r._nazione;
  return true;});
T('compEligible: FC/VM eleggibile solo per cBdg, non per cDigital/cShopper/cPrivilege', ()=>{
  const r={_tipo:'fc vm',store:'FC',job:'FC'};
  if(sb.compEligible({k:'cBdg'},r)!==true)return 'cBdg non eleggibile';
  if(sb.compEligible({k:'cDigital'},r)!==false)return 'cDigital eleggibile (non dovrebbe)';
  if(sb.compEligible({k:'cShopper'},r)!==false)return 'cShopper eleggibile (non dovrebbe)';
  if(sb.compEligible({k:'cPrivilege'},r)!==false)return 'cPrivilege eleggibile (non dovrebbe)';
  return true;});
T('_tipoIncl: FC/VM incluso sotto "mensile", isolabile a parte, escluso da altri tipi', ()=>{
  if(sb._tipoIncl(['mensile'],'fc vm')!==true)return 'non incluso sotto mensile';
  if(sb._tipoIncl(['fc vm'],'fc vm')!==true)return 'non isolabile da solo';
  if(sb._tipoIncl(['semestrale'],'fc vm')!==false)return 'incluso erroneamente sotto semestrale';
  if(sb._tipoIncl([],'fc vm')!==true)return 'non incluso su "Tutti"';
  return true;});
T('_updateCompOpts: con Tipo Premio=FC/VM il filtro Componente premio mostra solo BDG (stesso predicato usato in produzione)', ()=>{
  const before=rows.map(r=>Object.assign({},r)); // non tocchiamo allData del suite globale
  sb.allData=rows; sb.fixFcVmLegacyRows();
  const selTipi=new Set(['fc vm']);
  const comps=sb.COMP.filter(c=>c.tipo==='mensile').filter(c=>sb.allData.some(r=>r[c.k]>0&&sb._tipoIncl(selTipi,r._tipo)));
  sb.allData=before;
  return (comps.length===1&&comps[0].k==='cBdg')?true:'atteso solo cBdg, avuto '+comps.map(c=>c.k).join(',');});
T('_updateCompOpts: con Tipo Premio=Mensile restano tutti i componenti mensili con valori reali (nessuna regressione)', ()=>{
  sb.allData=rows;
  const selTipi=new Set(['mensile']);
  const comps=sb.COMP.filter(c=>c.tipo==='mensile').filter(c=>sb.allData.some(r=>r[c.k]>0&&sb._tipoIncl(selTipi,r._tipo)));
  return comps.some(c=>c.k==='cDigital')?true:'atteso cDigital tra i componenti disponibili, avuto '+comps.map(c=>c.k).join(',');});

// ── 15. FC/VM: sana anche le righe già caricate (IndexedDB/chip esistenti) ──
T('fixFcVmLegacyRows: sana righe fc-vm già in allData con mBdg/cBdg vecchi (=0)', ()=>{
  const legacyRow={_tipo:'fc vm',_ente:0,store:'FC',job:'FC',cognome:'ROSSI',nome:'MARIO',matricola:'9999997',massimale:3000,erogato:1500,mBdg:0,cBdg:0,cDigital:0,cShopper:0,cPrivilege:0,rml_period:2000,malattie:0};
  sb.allData=[legacyRow];
  const n=sb.fixFcVmLegacyRows();
  if(n!==1)return 'righe corrette: '+n;
  if(legacyRow.mBdg!==3000||legacyRow.cBdg!==1500)return 'mBdg='+legacyRow.mBdg+' cBdg='+legacyRow.cBdg;
  const n2=sb.fixFcVmLegacyRows();
  return n2===0?true:('seconda chiamata non idempotente: '+n2);});

// ── 16. SAS → Fatturato (import JSON esterno + storico BDG) ───
T('sasParsePeriod: estrae mese/anno dal subtitle reale', ()=>{
  const p=sb.sasParsePeriod({subtitle:'Negozi Italia — Consuntivo Luglio 2026 · ESEMPIO · generato 27/07/2026'});
  return (p&&p.month===7&&p.year===2026&&p.monthKey===202607&&p.label==='Luglio 2026')?true:JSON.stringify(p);});
T('sasParsePeriod: subtitle senza mese riconoscibile → null', ()=>{
  return sb.sasParsePeriod({subtitle:'Nessuna data qui'})===null?true:'non ha ritornato null';});
T('sasBdgHist: conta erogato>0 sui mesi mensili nel range, esclude semestrali/fuori-range', ()=>{
  const rs=[
    {_tipo:'mensile',monthKey:202501,cBdg:100},{_tipo:'mensile',monthKey:202502,cBdg:0},
    {_tipo:'mensile',monthKey:202503,cBdg:50},{_tipo:'semestrale',monthKey:202502,cBdg:999}, // esclusa (semestrale)
    {_tipo:'mensile',monthKey:202412,cBdg:100}, // esclusa (fuori range)
  ];
  const h=sb.sasBdgHist(rs,202501,202503);
  return (h.n===2&&h.N===3&&h.pct===67)?true:JSON.stringify(h);});
T('sasBdgHist: nessuna riga nel range → null', ()=>{
  return sb.sasBdgHist([{_tipo:'mensile',monthKey:202001,cBdg:1}],202501,202503)===null?true:'doveva essere null';});
T('sasBdgHist: progressione mese-per-mese (pallini) classifica pieno/parziale/non raggiunto', ()=>{
  const rs=[
    {_tipo:'mensile',monthKey:202501,cBdg:100,mBdg:100}, // pieno
    {_tipo:'mensile',monthKey:202502,cBdg:60,mBdg:100},  // parziale (tier 60%)
    {_tipo:'mensile',monthKey:202503,cBdg:0,mBdg:100},   // non raggiunto
  ];
  const h=sb.sasBdgHist(rs,202501,202503);
  if(!h.months||h.months.length!==3)return 'months: '+JSON.stringify(h.months);
  const [m1,m2,m3]=h.months;
  if(m1.tier!=='full'||m1.label!=='Gennaio 2025')return 'mese1: '+JSON.stringify(m1);
  if(m2.tier!=='partial'||m2.pct!==60)return 'mese2: '+JSON.stringify(m2);
  if(m3.tier!=='none')return 'mese3: '+JSON.stringify(m3);
  return true;});
T('sasBdgHist: mesi con più righe (es. più dipendenti nello stesso negozio) aggregano cBdg/mBdg per il tier del mese', ()=>{
  const rs=[
    {_tipo:'mensile',monthKey:202501,cBdg:100,mBdg:100},{_tipo:'mensile',monthKey:202501,cBdg:0,mBdg:100}, // stesso mese, 2 dipendenti: media 50% → parziale
  ];
  const h=sb.sasBdgHist(rs,202501,202501);
  return (h.months.length===1&&h.months[0].tier==='partial'&&h.months[0].pct===50)?true:JSON.stringify(h.months);});
T('sasBdgHist: "n/N mesi" conta MESI DISTINTI, non righe (negozio con più dipendenti non deve gonfiare N)', ()=>{
  const rs=[];
  [202604,202605,202606,202607].forEach(mk=>{
    for(let i=0;i<10;i++) rs.push({_tipo:'mensile',monthKey:mk,cBdg:i%3===0?0:100,mBdg:100}); // 10 dipendenti/mese
  });
  const h=sb.sasBdgHist(rs,202604,202607);
  return (h.N===4&&h.n===4)?true:'N='+h.N+' n='+h.n+' (attesi N=4 mesi distinti, non 40 righe)';});
T('sasBdgHist: mesi senza dato caricato nel range → tier "missing" (grigio), pallini sempre stessa lunghezza del range', ()=>{
  const rs=[
    {_tipo:'mensile',monthKey:202501,cBdg:100,mBdg:100}, // presente
    // 202502 assente: nessuna riga storica per quel mese
    {_tipo:'mensile',monthKey:202503,cBdg:0,mBdg:100},   // presente
  ];
  const h=sb.sasBdgHist(rs,202501,202503);
  if(h.months.length!==3)return 'attesi 3 mesi (range completo), avuto '+h.months.length;
  if(h.months[1].monthKey!==202502||h.months[1].tier!=='missing')return 'mese2: '+JSON.stringify(h.months[1]);
  return true;});
T('sasMatchFcVmRows: match esatto su cognome, fuzzy su typo, ambiguo→[]', ()=>{
  sb.allData=[
    {_tipo:'fc vm',matricola:'S1',cognome:'ROSSI',nome:'MARCO'},{_tipo:'fc vm',matricola:'S1',cognome:'ROSSI',nome:'MARCO'},
    {_tipo:'fc vm',matricola:'S2',cognome:'BIANCHI',nome:'LUCA'},
    {_tipo:'mensile',matricola:'S3',cognome:'ROSSI',nome:'MARCO'}, // stesso nome ma NON fc-vm: non deve contare
  ];
  const exact=sb.sasMatchFcVmRows('Marco Rossi');
  if(exact.length!==2)return 'match esatto: '+exact.length+' righe (attese 2, solo fc-vm)';
  const fuzzy=sb.sasMatchFcVmRows('Marco Rossy'); // typo, distanza 1 su cognome
  if(fuzzy.length!==2)return 'match fuzzy: '+fuzzy.length+' righe';
  const none=sb.sasMatchFcVmRows('Qualcuno Sconosciutissimo');
  return none.length===0?true:'atteso nessun match, avuto '+none.length;});
T('sasMatchFcVmRows: cognome doppio scritto in modo incoerente tra file (es. "VMDELTA" vecchio formato vs "DOPPIO VMDELTA" nuovo) → unisce entrambi', ()=>{
  sb.allData=[
    {_tipo:'fc vm',matricola:'P1',cognome:'VMDELTA',nome:'ELENA',monthKey:202601}, // vecchio formato
    {_tipo:'fc vm',matricola:'P1',cognome:'VMDELTA',nome:'ELENA',monthKey:202602},
    {_tipo:'fc vm',matricola:'P1',cognome:'DOPPIO VMDELTA',nome:'ELENA',monthKey:202606}, // nuovo formato
    {_tipo:'fc vm',matricola:'P1',cognome:'DOPPIO VMDELTA',nome:'ELENA',monthKey:202607},
    {_tipo:'fc vm',matricola:'S9',cognome:'ROSSI',nome:'MARCO',monthKey:202601}, // altra persona, non deve entrarci
  ];
  const m=sb.sasMatchFcVmRows('Elena Doppio Vmdelta');
  const months=[...new Set(m.map(r=>r.monthKey))].sort();
  return (months.length===4&&months.join(',')==='202601,202602,202606,202607')?true:'mesi trovati: '+months.join(',');});
T('sasMatchFcVmRows: cognome semplice (2 parole) invariato — nessuna regressione dal fix del cognome doppio', ()=>{
  sb.allData=[
    {_tipo:'fc vm',matricola:'S1',cognome:'ROSSI',nome:'MARCO',monthKey:202601},
    {_tipo:'fc vm',matricola:'S2',cognome:'BIANCHI',nome:'LUCA',monthKey:202601},
  ];
  const m=sb.sasMatchFcVmRows('Marco Rossi');
  return m.length===1?true:'righe: '+m.length+' (atteso 1, nessun match spurio dalla ricerca a 2 parole)';});
T('sasPopulateNameFilter: nomi distinti (dedup + null esclusi) dal file/vista corrente', ()=>{
  const file={rows:[{name:'ROSSI MARCO'},{name:'BIANCHI LUCA'},{name:'ROSSI MARCO'},{name:null}]};
  let captured=null;
  const prev=sb.setMsOpts;
  sb.setMsOpts=(id,items)=>{if(id==='sas-name')captured=items.map(i=>i.v);};
  sb.sasPopulateNameFilter(file);
  sb.setMsOpts=prev;
  return (captured&&captured.length===2&&captured.includes('ROSSI MARCO')&&captured.includes('BIANCHI LUCA'))
    ?true:'ottenuto '+JSON.stringify(captured);});
T('renderSas: gira senza eccezioni su un JSON Negozi sintetico + storico demo reale', ()=>{
  sb.allData=rows; // dati demo reali come storico (per il match/BDG storico)
  const negoziMeta={kind:'negozi',subtitle:'Negozi Italia — Consuntivo Luglio 2026',filename:'test_negozi.json'};
  const period=sb.sasParsePeriod(negoziMeta);
  const negoziRows=[{sid:'9999',name:'TEST STORE',target:1000,actual:900,esubero:0,targetSY:80,resultSY:85,pctBase:0.9,sasValue:100,recPct:50,recValue:50,applied:50,pctFinal:0.95,esito:'ridotto',esitoLabel:'Ridotto 60%',determinante:false}];
  sb.sasFiles={'test_negozi.json':{kind:'negozi',period,meta:negoziMeta,rows:negoziRows,fname:'test_negozi.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasMonth:mkEl(String(period.monthKey)),sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),sasFEsito:mkEl(''),sasFRole:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  try{sb.renderSas();}catch(e){sb.document.getElementById=prevGetById;return 'EXCEPTION: '+e.message;}
  sb.document.getElementById=prevGetById;
  return els.sasCountNote.textContent==='(1 di 1)'?true:('countNote inatteso: '+els.sasCountNote.textContent);});
T('renderSas: colonne riserva SAS (Esub. SAS prec./usata, Riserva SAS succ.) nella posizione giusta, con valori corretti; dash se il JSON non le ha ancora (schemaVersion 1)', ()=>{
  const negoziMeta={kind:'negozi',subtitle:'Negozi Italia — Consuntivo Agosto 2026',filename:'test_esubsas.json'};
  const period=sb.sasParsePeriod(negoziMeta);
  const rowNew={sid:'9998',name:'TEST CON RISERVA SAS',target:1000,actual:900,esubero:0,targetSY:80,resultSY:85,pctBase:0.9,sasValue:100,recPct:50,recValue:50,
    esuberoSasPrec:37,esuberoSasPrecUsed:20,applied:87,sasReserveNext:13,pctFinal:0.95,esito:'ridotto',esitoLabel:'Ridotto',determinante:false};
  sb.sasFiles={'test_esubsas.json':{kind:'negozi',period,meta:negoziMeta,rows:[rowNew],fname:'test_esubsas.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); }
  catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  const labels=captured.cols.map(c=>c.label);
  const iRicon=labels.indexOf('Ricon.'), iEsubPrec=labels.indexOf('SAS prec.'), iEsubUsed=labels.indexOf('SAS usata'),
    iApplied=labels.indexOf('Applicato'), iReserveNext=labels.indexOf('SAS succ.'), iFinale=labels.indexOf('% finale');
  const expectedOrder=[iRicon,iEsubPrec,iEsubUsed,iApplied,iReserveNext,iFinale];
  for(let k=0;k<expectedOrder.length;k++) if(expectedOrder[k]<0) return 'colonna mancante, ordine trovato: '+JSON.stringify(expectedOrder)+' su '+JSON.stringify(labels);
  for(let k=1;k<expectedOrder.length;k++) if(expectedOrder[k]!==expectedOrder[k-1]+1) return 'ordine colonne inatteso: '+JSON.stringify(labels);
  const cells=captured.trows[0].cells;
  if(cells[iEsubPrec].val!==37) return 'Esub. SAS prec.: '+JSON.stringify(cells[iEsubPrec]);
  if(cells[iEsubUsed].val!==20) return 'Esub. SAS prec. usata: '+JSON.stringify(cells[iEsubUsed]);
  if(cells[iReserveNext].val!==13) return 'Riserva SAS succ.: '+JSON.stringify(cells[iReserveNext]);
  // JSON vecchio (schemaVersion 1, senza i nuovi campi) → dash, nessuna eccezione
  const rowOld=Object.assign({},rowNew); delete rowOld.esuberoSasPrec; delete rowOld.esuberoSasPrecUsed; delete rowOld.sasReserveNext;
  sb.sasFiles={'test_esubsas.json':{kind:'negozi',period,meta:negoziMeta,rows:[rowOld],fname:'test_esubsas.json'}};
  sb.document.getElementById=id=>els[id]||prevGetById(id); // reinstalla i mock: erano stati ripristinati dopo la prima renderSas()
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); }
  catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION su JSON v1: '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  const cellsOld=captured.trows[0].cells;
  if(cellsOld[iEsubPrec].disp.indexOf('dash')<0||cellsOld[iEsubUsed].disp.indexOf('dash')<0||cellsOld[iReserveNext].disp.indexOf('dash')<0)
    return 'JSON v1 senza i nuovi campi doveva mostrare "—": '+JSON.stringify([cellsOld[iEsubPrec],cellsOld[iEsubUsed],cellsOld[iReserveNext]]);
  return true;});
T('renderSas: valori riserva SAS ancorati a un caso reale (1102 SLOANE, agosto 2026 schemaVersion 2) — verifica anche l\'invariante pctFinale×target = actual+esubero+applied', ()=>{
  const meta={kind:'negozi',subtitle:'Negozi International — Consuntivo AGOSTO 2026',filename:'test_sloane.json'};
  const period=sb.sasParsePeriod(meta);
  // riga reale, dal file rigenerato dal tool esterno dopo la correzione actual/pctBase (25/08/2026)
  const sloane={sid:'1102',name:'1102 SLOANE',target:461940,actual:410650,esubero:38927,targetSY:99.51,resultSY:144.44,
    pctBase:0.9732365455047065,sasValue:21509,recPct:100,recValue:21509,applied:12363,
    esuberoSasPrec:27826,esuberoSasPrecUsed:12363,sasReserveNext:21509,pctFinal:1,
    esito:'full',esitoLabel:'Pieno',determinante:true};
  const invDiff=Math.abs(sloane.pctFinal*sloane.target-(sloane.actual+sloane.esubero+sloane.applied));
  if(invDiff>1)return 'invariante non rispettato nei dati di test: diff='+invDiff;
  sb.sasFiles={'test_sloane.json':{kind:'negozi',period,meta,rows:[sloane],fname:'test_sloane.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); }
  catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  const labels=captured.cols.map(c=>c.label);
  const iEsubPrec=labels.indexOf('SAS prec.'), iEsubUsed=labels.indexOf('SAS usata'), iReserveNext=labels.indexOf('SAS succ.');
  const cells=captured.trows[0].cells;
  if(cells[iEsubPrec].val!==27826)return 'Esub. SAS prec.: '+JSON.stringify(cells[iEsubPrec]);
  if(cells[iEsubUsed].val!==12363)return 'Esub. SAS prec. usata: '+JSON.stringify(cells[iEsubUsed]);
  if(cells[iReserveNext].val!==21509)return 'Riserva SAS succ.: '+JSON.stringify(cells[iReserveNext]);
  return true;});
T('renderSas: KPI "Riserva SAS riportata" somma sasReserveNext (autorevole), NON recValue-applied (sballato dal pool condiviso) — ancorato a un caso reale (Vito Vmbeta, agosto 2026)', ()=>{
  const meta={kind:'fcvm',subtitle:'Field Coach + VM — Consuntivo Agosto 2026',filename:'test_vmbeta.json'};
  const period=sb.sasParsePeriod(meta);
  // riga reale: applied (83.171) proviene TUTTO dalla riserva del mese precedente (esuberoSasPrecUsed),
  // non dal recValue di questo mese — quindi recValue-applied (63.549) sarebbe sbagliato, il vero valore
  // riportato è l'intero recValue (146.720) perché nulla del NUOVO riconosciuto è stato consumato.
  const vmb={name:'VITO VMBETA',role:'VM',nStores:11,target:1772752,actual:1648557,esubero:41024,targetSY:56.154,resultSY:58.458,
    pctBase:0.9530835409592735,sasValue:195626,recPct:75,recValue:146720,applied:83171,
    esuberoSasPrec:107243,esuberoSasPrecUsed:83171,sasReserveNext:146720,pctFinal:1,
    esito:'full',esitoLabel:'Pieno',determinante:true};
  sb.sasFiles={'test_vmbeta.json':{kind:'fcvm',period,meta,rows:[vmb],fname:'test_vmbeta.json'}};
  sb.sasView='fcvm';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById;
  const kpiTxt=els.sasKpiRow.innerHTML;
  if(kpiTxt.indexOf('146.720')<0) return 'KPI Riserva SAS riportata non mostra 146.720 (recValue-applied darebbe 63.549, sbagliato): '+kpiTxt;
  if(kpiTxt.indexOf('41.024')<0) return 'KPI Esubero fatturato non mostra 41.024: '+kpiTxt;
  return true;});
T('renderSas: KPI "Riserva SAS riportata" mostra "—" (non 0) su JSON schemaVersion 1 senza sasReserveNext su nessuna riga', ()=>{
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Luglio 2026',filename:'test_v1.json'};
  const period=sb.sasParsePeriod(meta);
  const rowV1={sid:'1',name:'TEST V1',target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false};
  sb.sasFiles={'test_v1.json':{kind:'negozi',period,meta,rows:[rowV1],fname:'test_v1.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById;
  const kpiTxt=els.sasKpiRow.innerHTML;
  return kpiTxt.indexOf('Riserva SAS riportata')>=0 && /Riserva SAS riportata[\s\S]*?—/.test(kpiTxt) ? true : 'KPI: '+kpiTxt;});
const sidOf=d=>((String(d).match(/sasOpenStore\(decodeURIComponent\('([^']+)'\)\)/)||[])[1]);
T('renderSas: niente colonna ID separata (Negozi: prima colonna "Negozio"; FC+VM: "Nome") e nessuna classe sas-neg-view residua', ()=>{
  sb.allData=[];
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Agosto 2026',filename:'test_idcol.json'};
  const period=sb.sasParsePeriod(meta);
  const mkClsEl=()=>({style:{},classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){if(f===undefined)f=!this._s.has(c);if(f)this._s.add(c);else this._s.delete(c);return f;},contains(c){return this._s.has(c);}},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:'',getContext:()=>({}),dataset:{}});
  sb.sasFiles={'test_idcol.json':{kind:'negozi',period,meta,rows:[{sid:'1',name:'X',target:1,actual:1,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false}],fname:'test_idcol.json'}};
  sb.sasView='negozi';
  const els={sasBdgFrom:Object.assign(mkClsEl(),{value:'202401'}),sasBdgTo:Object.assign(mkClsEl(),{value:'202612'}),sasQ:mkClsEl(),
    'sasFDet-si':Object.assign(mkClsEl(),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkClsEl(),sasKpiRow:mkClsEl(),sasCountNote:mkClsEl(),sasTbl:mkClsEl(),sasChips:mkClsEl()};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  if(captured.cols[0].label!=='Negozio'){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'colonna 0: '+captured.cols[0].label; }
  if(els.sasTbl.classList.contains('sas-neg-view')){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'classe sas-neg-view ancora impostata'; }
  // passa a FC+VM: la classe deve sparire (altrimenti la colonna "Nome" verrebbe ristretta per errore)
  sb.sasFiles['test_fcvm.json']={kind:'fcvm',period,meta:{kind:'fcvm',subtitle:'FC + VM — Consuntivo Agosto 2026'},rows:[{name:'Y',role:'FC',nStores:1,target:1,actual:1,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false}],fname:'test_fcvm.json'};
  sb.sasView='fcvm';
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION (fcvm): '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  return captured.cols[0].label==='Nome'?true:'vista FC+VM, colonna 0: '+captured.cols[0].label;});
T('renderSas: ordine di default Negozi = Store ID crescente (numerico, non lessicografico)', ()=>{
  sb.allData=[];
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Luglio 2026',filename:'test_order_neg.json'};
  const period=sb.sasParsePeriod(meta);
  const mk=sid=>({sid,name:'STORE '+sid,target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false});
  sb.sasFiles={'test_order_neg.json':{kind:'negozi',period,meta,rows:[mk('1200'),mk('99'),mk('1101'),mk('150')],fname:'test_order_neg.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  if(captured.cols[captured.defSort.i].label!=='Negozio'||captured.defSort.dir!==1)return 'defSort: '+JSON.stringify(captured.defSort)+' -> '+captured.cols[captured.defSort.i].label;
  // Store ID è già la prima colonna: il valore numerico serve a garantire l'ordinamento corretto
  // (99 < 150 < 1101 < 1200) anche con lunghezze diverse, non semplicemente alfabetico.
  const vals=captured.trows.map(r=>r.cells[0].val);
  sb.allData=rows; // ripristina lo storico demo condiviso per i test successivi
  return JSON.stringify(vals)===JSON.stringify([1200,99,1101,150])?true:'val Store ID non numerici: '+JSON.stringify(vals);});
T('renderSas: ordine di default FC+VM = Ruolo (FC poi VM), Nome alfabetico dentro ciascun ruolo', ()=>{
  sb.allData=[];
  const meta={kind:'fcvm',subtitle:'FC + VM — Consuntivo Luglio 2026',filename:'test_order_fcvm.json'};
  const period=sb.sasParsePeriod(meta);
  const mk=(name,role)=>({name,role,nStores:1,target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false});
  sb.sasFiles={'test_order_fcvm.json':{kind:'fcvm',period,meta,rows:[mk('Zeta Gianni','VM'),mk('Rossi Marco','FC'),mk('Bianchi Luca','VM'),mk('Alfa Andrea','FC')],fname:'test_order_fcvm.json'}};
  sb.sasView='fcvm';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  if(captured.cols[captured.defSort.i].label!=='Ruolo'||captured.defSort.dir!==1)return 'defSort: '+JSON.stringify(captured.defSort)+' -> '+captured.cols[captured.defSort.i].label;
  // makeSortTable non riordina qui (è mockata): verifichiamo che renderSas passi già le righe
  // pre-ordinate per nome, così l'ordinamento stabile per Ruolo dà "FC alfabetico, poi VM alfabetico".
  const names=captured.trows.map(r=>r.cells[0].val);
  sb.allData=rows; // ripristina lo storico demo condiviso per i test successivi
  return JSON.stringify(names)===JSON.stringify(['Alfa Andrea','Bianchi Luca','Rossi Marco','Zeta Gianni'])
    ?true:'righe non pre-ordinate per nome: '+JSON.stringify(names);});
T('sasPopulateNazFilter + filtro Nazione: nazioni ricavate dallo storico incrociato, filtro funzionante', ()=>{
  sb.allData=[
    {_tipo:'mensile',store:'1101 MILANO',monthKey:202607,_nazione:'Italia'},
    {_tipo:'mensile',store:'1102 PARIGI',monthKey:202607,_nazione:'Francia'},
  ];
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Luglio 2026',filename:'test_naz.json'};
  const period=sb.sasParsePeriod(meta);
  const mk=sid=>({sid,name:'STORE '+sid,target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false});
  sb.sasFiles={'test_naz.json':{kind:'negozi',period,meta,rows:[mk('1101'),mk('1102')],fname:'test_naz.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  if(captured.trows.length!==2){sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'attese 2 righe senza filtro, avute '+captured.trows.length;}
  // ora filtriamo su Nazione = Italia
  const prevGetMsVals=sb.getMsVals;
  sb.getMsVals=id=>id==='sas-naz'?['Italia']:prevGetMsVals(id);
  try{ sb.renderSas(); } catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; sb.getMsVals=prevGetMsVals; return 'EXCEPTION col filtro: '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; sb.getMsVals=prevGetMsVals;
  sb.allData=rows; // ripristina lo storico demo condiviso per i test successivi
  return (captured.trows.length===1&&sidOf(captured.trows[0].cells[0].disp)==='1101')?true:'righe filtrate: '+JSON.stringify(captured.trows.map(r=>r.cells[0].disp));});
T('_looksLikeStoreAssignSheet + parseStoreAssignRows: riconosce la TESTATA INCENTIVI FC+VM e costruisce storeId -> {fc,vm}, con più VM per lo stesso negozio e ruoli non FC/VM ignorati', ()=>{
  const sheetRows=[
    {'STORE ID':1105,'NOME STORE':'1105 Test','MATRICOLA':1,'NOME':'Primo','COGNOME':'Fcepsilon','RUOLO':'FC','VALUTA':'EUR','PREMIO MAX':1,'TIPO':'AREA','MAIL':'','SOCIETA\'':'','SALARIO LORDO ANNUALE':''},
    {'STORE ID':1105,'NOME STORE':'1105 Test','MATRICOLA':2,'NOME':'Elena','COGNOME':'Doppio Vmdelta','RUOLO':'VM','VALUTA':'EUR','PREMIO MAX':1,'TIPO':'AREA','MAIL':'','SOCIETA\'':'','SALARIO LORDO ANNUALE':''},
    {'STORE ID':1105,'NOME STORE':'1105 Test','MATRICOLA':3,'NOME':'Secondo','COGNOME':'Vmzeta','RUOLO':'VM','VALUTA':'EUR','PREMIO MAX':1,'TIPO':'AREA','MAIL':'','SOCIETA\'':'','SALARIO LORDO ANNUALE':''},
    {'STORE ID':1106,'NOME STORE':'1106 Test2','MATRICOLA':1,'NOME':'Primo','COGNOME':'Fcepsilon','RUOLO':'FC','VALUTA':'EUR','PREMIO MAX':1,'TIPO':'AREA','MAIL':'','SOCIETA\'':'','SALARIO LORDO ANNUALE':''},
    {'STORE ID':1107,'NOME STORE':'1107 Test3','MATRICOLA':9,'NOME':'Mario','COGNOME':'Rossi','RUOLO':'AREA MGR','VALUTA':'EUR','PREMIO MAX':1,'TIPO':'AREA','MAIL':'','SOCIETA\'':'','SALARIO LORDO ANNUALE':''},
    // il file HR usa un suffisso "_2" sul cognome per una VERA sotto-area distinta della STESSA
    // persona (visto nel file reale su "Zeta"/"Fciota": gruppi di negozi geograficamente
    // diversi, proprio tier PREMIO MAX) — il collega dell'utente ha chiesto di tenerle separate nel
    // filtro, quindi va marcata come "· area 2", MAI fusa con la sotto-area base.
    {'STORE ID':1108,'NOME STORE':'1108 Test4','MATRICOLA':'1_2','NOME':'Primo','COGNOME':'Fcepsilon_2','RUOLO':'FC','VALUTA':'EUR','PREMIO MAX':1,'TIPO':'AREA','MAIL':'','SOCIETA\'':'','SALARIO LORDO ANNUALE':''},
  ];
  const premiFile=[{'STORE ID':1,'NOME STORE':'x','RUOLO':'FC','PREMIO MAX LC':1}]; // firma di un file premi, non della TESTATA
  if(!sb._looksLikeStoreAssignSheet(sheetRows))return 'TESTATA non riconosciuta';
  if(sb._looksLikeStoreAssignSheet(premiFile))return 'file premi FC/VM riconosciuto per errore come TESTATA';
  const map=sb.parseStoreAssignRows(sheetRows);
  if(JSON.stringify(map['1105'])!==JSON.stringify({fc:['Primo Fcepsilon'],vm:['Elena Doppio Vmdelta','Secondo Vmzeta']}))return '1105: '+JSON.stringify(map['1105']);
  if(JSON.stringify(map['1106'])!==JSON.stringify({fc:['Primo Fcepsilon'],vm:[]}))return '1106: '+JSON.stringify(map['1106']);
  if(map['1107'])return '1107 non doveva comparire (ruolo AREA MGR non FC/VM): '+JSON.stringify(map['1107']);
  if(JSON.stringify(map['1108'])!==JSON.stringify({fc:['Primo Fcepsilon · area 2'],vm:[]}))return '1108 (sotto-area "_2" non tenuta separata): '+JSON.stringify(map['1108']);
  return true;});
T('storeAssignMap: la mappa negozi<->FC/VM è integrata staticamente nell\'app (STORE_ASSIGN_STATIC) — il filtro "FC/VM assegnato" deve funzionare da subito, senza dover caricare nessun file', ()=>{
  if(sb.storeAssignMap!==sb.STORE_ASSIGN_STATIC)return 'storeAssignMap non è (ancora) il default statico — override lasciato da un test precedente?';
  const n=Object.keys(sb.storeAssignMap).length;
  if(n<50)return 'mappa statica sospettosamente piccola/vuota: '+n+' negozi';
  return true;});
T('_recomputeStoreAssignMap: DUE override caricati insieme (es. TESTATA Italia + International, store ID range disgiunti) si UNISCONO sopra il default statico, uno non cancella l\'altro', ()=>{
  const prevOverrides=sb.storeAssignOverrideFiles;
  sb.storeAssignOverrideFiles={
    'testata_ita.xlsx':{'2001':{fc:['Mario Rossi'],vm:['Anna Bianchi']}},
    'testata_intl.xlsx':{'1101':{fc:['Nome Diverso Da Statico'],vm:[]}}, // sovrascrive il default per 1101, non lo cancella
  };
  sb._recomputeStoreAssignMap();
  const map=sb.storeAssignMap;
  const ok1=JSON.stringify(map['2001'])===JSON.stringify({fc:['Mario Rossi'],vm:['Anna Bianchi']}); // Italia presente
  const ok2=JSON.stringify(map['1101'])===JSON.stringify({fc:['Nome Diverso Da Statico'],vm:[]}); // International sovrascritto come atteso
  const ok3=JSON.stringify(map['1105'])===JSON.stringify(sb.STORE_ASSIGN_STATIC['1105']); // altri negozi del default statico restano intatti (non cancellati dal secondo override)
  sb.storeAssignOverrideFiles=prevOverrides; sb._recomputeStoreAssignMap();
  if(!ok1)return 'override Italia (2001) non presente nella mappa unita: '+JSON.stringify(map['2001']);
  if(!ok2)return 'override International (1101) non applicato: '+JSON.stringify(map['1101']);
  if(!ok3)return 'un negozio del default statico (1105, mai toccato dagli override) è stato cancellato invece di restare intatto: '+JSON.stringify(map['1105']);
  return true;});
T('renderSas: filtro "FC/VM assegnato" (vista Negozi) incrocia Store ID con storeAssignMap; ignorato in vista FC+VM', ()=>{
  sb.allData=[];
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Luglio 2026',filename:'test_assign.json'};
  const period=sb.sasParsePeriod(meta);
  const mk=sid=>({sid,name:'STORE '+sid,target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false});
  sb.sasFiles={'test_assign.json':{kind:'negozi',period,meta,rows:[mk('1105'),mk('1106'),mk('1200')],fname:'test_assign.json'}};
  sb.sasView='negozi';
  sb.storeAssignMap={'1105':{fc:['Primo Fcepsilon'],vm:['Elena Doppio Vmdelta']},'1106':{fc:['Primo Fcepsilon'],vm:[]}};
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  const prevGetMsVals=sb.getMsVals;
  sb.getMsVals=id=>id==='sas-assign'?['Primo Fcepsilon']:prevGetMsVals(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  const cleanup=()=>{sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; sb.getMsVals=prevGetMsVals; sb.storeAssignMap=sb.STORE_ASSIGN_STATIC; sb.allData=rows;};
  try{ sb.renderSas(); } catch(e){ cleanup(); return 'EXCEPTION: '+e.message; }
  const sids1=captured.trows.map(r=>sidOf(r.cells[0].disp)).sort();
  if(JSON.stringify(sids1)!==JSON.stringify(['1105','1106'])){cleanup();return 'filtro FC="Primo Fcepsilon": '+JSON.stringify(sids1);}
  // in vista FC+VM il filtro non deve avere effetto (fAssign forzato a [] fuori da Negozi)
  sb.sasView='fcvm';
  sb.sasFiles={'test_assign2.json':{kind:'fcvm',period,meta:{kind:'fcvm',subtitle:'FC + VM — Consuntivo Luglio 2026'},rows:[{name:'Primo Fcepsilon',role:'FC',nStores:1,target:1,actual:1,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false}],fname:'test_assign2.json'}};
  try{ sb.renderSas(); } catch(e){ cleanup(); return 'EXCEPTION (fcvm): '+e.message; }
  const n2=captured.trows.length;
  cleanup();
  return n2===1?true:'vista FC+VM: attesa 1 riga (filtro Negozi non deve propagarsi), avute '+n2;});
T('sasCurrentFile: due file dello stesso kind+mese (es. "Negozi International" + "Negozi Italia") vengono UNITI, non uno ignorato silenziosamente', ()=>{
  sb.allData=[];
  const metaIntl={kind:'negozi',subtitle:'Negozi International — Consuntivo Agosto 2026',filename:'negozi_intl.json'};
  const metaIta={kind:'negozi',subtitle:'Negozi Italia — Consuntivo Agosto 2026',filename:'negozi_ita.json'};
  const period=sb.sasParsePeriod(metaIntl);
  const mkRow=sid=>({sid,name:'STORE '+sid,target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false});
  sb.sasFiles={
    'negozi_intl.json':{kind:'negozi',period,meta:metaIntl,rows:[mkRow('1101'),mkRow('1102')],fname:'negozi_intl.json'},
    'negozi_ita.json':{kind:'negozi',period,meta:metaIta,rows:[mkRow('2001'),mkRow('2002'),mkRow('2003')],fname:'negozi_ita.json'},
  };
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),sasMonth:mkEl(String(period.monthKey)),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  const cleanup=()=>{sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; sb.allData=rows;};
  try{ sb.renderSas(); } catch(e){ cleanup(); return 'EXCEPTION: '+e.message; }
  const n=captured.trows.length;
  const sids=captured.trows.map(r=>sidOf(r.cells[0].disp)).sort();
  cleanup();
  if(n!==5)return 'attese 5 righe unite (2 International + 3 Italia), avute '+n+': '+JSON.stringify(sids);
  if(JSON.stringify(sids)!==JSON.stringify(['1101','1102','2001','2002','2003']))return 'righe unite non corrette: '+JSON.stringify(sids);
  return true;});
T('renderSas: colonna "SY/QTY" — dept store con targetQty/resultQty validi mostra il dato reale, con targetQty=0 (sporco) mostra "—"; negozi normali confrontano resultSY con syLastYear (non più targetSY), "(n/d)" se lo storico manca', ()=>{
  sb.allData=[];
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Luglio 2026',filename:'test_syqty.json'};
  const period=sb.sasParsePeriod(meta);
  const mkRow=sid=>({sid,name:'STORE '+sid,target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false});
  const deptOk=Object.assign(mkRow('1187'),{targetQty:245,resultQty:246}); // 1187 = ECI Pozuelo, in DEPT_STORE_IDS
  const deptDirty=Object.assign(mkRow('1350'),{targetQty:0,resultQty:235}); // 1350 = ECI Santander, dept, targetQty=0 sporco (visto nel file reale)
  const normWithPY=Object.assign(mkRow('1101'),{resultSY:74.11,syLastYear:73.66}); // vs anno precedente: migliorato
  const normNoPY=Object.assign(mkRow('1102'),{resultSY:50,syLastYear:null}); // storico anno precedente assente
  sb.sasFiles={'test_syqty.json':{kind:'negozi',period,meta,rows:[deptOk,deptDirty,normWithPY,normNoPY],fname:'test_syqty.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  const cleanup=()=>{sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; sb.allData=rows;};
  try{ sb.renderSas(); } catch(e){ cleanup(); return 'EXCEPTION: '+e.message; }
  const syColIdx=captured.cols.findIndex(c=>c.label.startsWith('SY/QTY'));
  if(syColIdx<0){cleanup();return 'colonna SY/QTY non trovata: '+JSON.stringify(captured.cols.map(c=>c.label));}
  const byId=sid=>captured.trows.find(r=>sidOf(r.cells[0].disp)===sid);
  const deptOkCell=byId('1187').cells[syColIdx].disp, deptDirtyCell=byId('1350').cells[syColIdx].disp;
  const pyCell=byId('1101').cells[syColIdx].disp, noPyCell=byId('1102').cells[syColIdx].disp;
  cleanup();
  if(!/^246 .*\(\+1\)/.test(deptOkCell))return 'dept store con QTY valida (1187): '+deptOkCell;
  if(!/class="dash"/.test(deptDirtyCell))return 'dept store con targetQty=0 sporco (1350) non mostra "—": '+deptDirtyCell;
  if(!/74\.1.*\(\+0\.5\)/.test(pyCell))return 'negozio con syLastYear (1101): '+pyCell;
  if(!/\(n\/d\)/.test(noPyCell))return 'negozio senza syLastYear (1102) non mostra "(n/d)": '+noPyCell;
  return true;});
T('sasEsubero: legge "esuberoPrec" quando "esubero" manca (file nuovi, schemaVersion 2, es. Negozi Italia e FC+VM 10/09/2026 — il campo ridondante "esubero" è stato eliminato dal tool esterno), resta compatibile con i file vecchi che hanno entrambi', ()=>{
  if(sb.sasEsubero({esubero:100,esuberoPrec:999})!==100)return 'con entrambi presenti deve vincere esubero (file vecchi, schemaVersion 1): '+sb.sasEsubero({esubero:100,esuberoPrec:999});
  if(sb.sasEsubero({esuberoPrec:250})!==250)return 'con solo esuberoPrec (file nuovi, schemaVersion 2) deve leggerlo: '+sb.sasEsubero({esuberoPrec:250});
  if(sb.sasEsubero({esubero:0,esuberoPrec:999})!==0)return 'esubero=0 legittimo non deve essere scavalcato da esuberoPrec: '+sb.sasEsubero({esubero:0,esuberoPrec:999});
  if(sb.sasEsubero({})!==undefined)return 'nessuno dei due campi presente deve dare undefined, non 0 indovinato: '+sb.sasEsubero({});
  return true;});
T('renderSas: colonna "Esub. prec." legge esuberoPrec quando esubero manca (file schemaVersion 2 senza il campo ridondante) — prima del fix (10/09/2026) mostrava sempre "—" su questi file nonostante il dato ci fosse', ()=>{
  sb.allData=[];
  const meta={kind:'negozi',subtitle:'Negozi Italia — Consuntivo Agosto 2026',filename:'test_esub_v2.json'};
  const period=sb.sasParsePeriod(meta);
  // riga "stile schemaVersion 2": SOLO esuberoPrec, niente campo esubero (come nei file reali post 10/09)
  const row={sid:'1001',name:'1001 MILANO',target:100,actual:100,pctBase:1,esuberoPrec:50902,esuberoPrecUsed:50902,resultSY:0,pctFinal:1,sasValue:0,recPct:0,recValue:0,applied:0,esito:'full',esitoLabel:'Pieno',determinante:false};
  sb.sasFiles={'test_esub_v2.json':{kind:'negozi',period,meta,rows:[row],fname:'test_esub_v2.json'}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  const cleanup=()=>{sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; sb.allData=rows;};
  try{ sb.renderSas(); } catch(e){ cleanup(); return 'EXCEPTION: '+e.message; }
  const esubColIdx=captured.cols.findIndex(c=>c.label==='Esub. prec.');
  if(esubColIdx<0){cleanup();return 'colonna "Esub. prec." non trovata: '+JSON.stringify(captured.cols.map(c=>c.label));}
  const cell=captured.trows[0].cells[esubColIdx];
  cleanup();
  if(!/50\.902/.test(cell.disp))return 'atteso € 50.902 (da esuberoPrec), mostrato: '+cell.disp;
  return true;});
T('renderSas: % finale mostrato "100.0%" è colorato verde anche se il valore grezzo è leggermente <1 prima dell\'arrotondamento', ()=>{
  const meta={kind:'negozi',subtitle:'Negozi Italia — Consuntivo Luglio 2026',filename:'test_pctcls.json'};
  const period=sb.sasParsePeriod(meta);
  // pctFinal=0.9996 → mostrato "100.0%" (toFixed(1)) ma raw <1: prima del fix restava colorato arancio ("warn")
  const row={sid:'1',name:'TEST 100',target:100,actual:100,esubero:0,targetSY:80,resultSY:80,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:0.9996,esito:'full',esitoLabel:'Pieno',determinante:false};
  sb.sasFiles={'test_pctcls.json':{kind:'negozi',period,meta,rows:[row],fname:'test_pctcls.json'}};
  sb.sasView='negozi';
  const mkEl2=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els2={sasBdgFrom:mkEl2('202401'),sasBdgTo:mkEl2('202612'),sasQ:mkEl2(''),
    'sasFDet-si':Object.assign(mkEl2(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl2(''),sasKpiRow:mkEl2(''),sasCountNote:mkEl2(''),sasTbl:mkEl2(''),sasChips:mkEl2('')};
  const prevGetById2=sb.document.getElementById;
  sb.document.getElementById=id=>els2[id]||prevGetById2(id);
  let captured2=null;
  const prevMst2=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured2={cols,trows,defSort};};
  try{ sb.renderSas(); }
  catch(e){ sb.document.getElementById=prevGetById2; sb.makeSortTable=prevMst2; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGetById2; sb.makeSortTable=prevMst2;
  const idx=captured2.cols.findIndex(c=>c.label==='% finale');
  const disp=captured2.trows[0].cells[idx].disp;
  if(disp.indexOf('100.0%')<0)return 'testo inatteso (non mostra 100.0%): '+disp;
  return disp.indexOf('good')>=0?true:'colorato non-verde nonostante mostri 100.0%: '+disp;});
T('renderSas: una riga con resultSY/targetSY assenti (es. nuovo dipendente senza storico SY) non blocca il render delle altre righe', ()=>{
  const meta={kind:'fcvm',subtitle:'Field Coach + VM — Consuntivo Luglio 2026',filename:'test_sycrash.json'};
  const period=sb.sasParsePeriod(meta);
  const rowOk={sid:null,name:'ROSSI MARCO',role:'FC',nStores:3,target:100,actual:100,esubero:0,targetSY:80,resultSY:85,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false};
  const rowNoSY=Object.assign({},rowOk,{name:'NUOVO DIPENDENTE',resultSY:null,targetSY:null});
  sb.sasFiles={'test_sycrash.json':{kind:'fcvm',period,meta,rows:[rowOk,rowNoSY],fname:'test_sycrash.json'}};
  sb.sasView='fcvm';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;
  const prevMst=sb.makeSortTable;
  sb.makeSortTable=(id,stateKey,cols,trows,defSort)=>{captured={cols,trows,defSort};};
  try{ sb.renderSas(); }
  catch(e){ sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst; return 'EXCEPTION (il render si è bloccato): '+e.message; }
  sb.document.getElementById=prevGetById; sb.makeSortTable=prevMst;
  return (captured&&captured.trows.length===2)?true:'righe renderizzate: '+(captured?captured.trows.length:0)+' (attese 2)';});

// ── 17. Qualità Dati: copertura mensile (mesi mancanti) ────────
T('qdMissingMonths: nessun mese mancante su range compatto', ()=>{
  const out=sb.qdMissingMonths(()=>true,202401,202403);
  return out.length===0?true:'attesi 0 mancanti, avuto '+JSON.stringify(out);});
T('qdMissingMonths: individua correttamente i mesi mancanti (demo reale)', ()=>{
  sb.allData=rows;
  const negKeys=[...new Set(rows.filter(r=>r._tipo==='mensile').map(r=>r.monthKey||0).filter(Boolean))].sort((a,b)=>a-b);
  const missing=sb.qdMissingMonths(r=>r._tipo==='mensile',negKeys[0],202606);
  // ogni mese "mancante" non deve comparire tra i mesi realmente presenti
  const presentSet=new Set(negKeys);
  const bad2=missing.filter(mk=>presentSet.has(mk));
  if(bad2.length)return 'mesi presenti segnalati come mancanti: '+JSON.stringify(bad2);
  return missing.includes(202606)?true:'atteso 202606 tra i mancanti, avuto '+JSON.stringify(missing);});
T('qdDefaultTargetKey: mese completo precedente a oggi', ()=>{
  const k=sb.qdDefaultTargetKey();
  const now=new Date();let y=now.getFullYear(),mo=now.getMonth();if(mo===0){mo=12;y--;}
  return eq(k,y*100+mo);});
T('qdCoverageSection: gira senza eccezioni e riporta i mesi mancanti attesi (demo)', ()=>{
  sb.allData=rows;
  let html;
  try{html=sb.qdCoverageSection();}catch(e){return 'EXCEPTION: '+e.message;}
  const txt=String(html).replace(/<[^>]+>/g,' ');
  if(!/Giugno 2026/.test(txt))return 'atteso "Giugno 2026" tra i mesi mancanti Negozi, testo: '+txt.slice(0,200);
  return true;});

// ── 18. Caricamento file: sessione .json trascinata nella zona xlsx ──
T('loadFiles: un file .json trascinato viene instradato a loadSessionFile (non trattato come xlsx)', ()=>{
  const prev=sb.loadSessionFile;
  let captured=null;
  sb.loadSessionFile=f=>{captured=f;};
  const fakeJsonFile={name:'sessione_test.json'};
  try{ sb.loadFiles([fakeJsonFile]); }
  catch(e){ sb.loadSessionFile=prev; return 'EXCEPTION (probabile fallback al ramo xlsx): '+e.message; }
  sb.loadSessionFile=prev;
  return captured===fakeJsonFile?true:'loadSessionFile non chiamata con il file atteso';});
T('_sessionFileName: nome file "parlante" (Sessione + data/ora + conteggio righe, niente collisioni "(1)" nello stesso giorno)', ()=>{
  const now=new Date(2026,6,30,15,47); // 30/07/2026 15:47 (mese 0-based)
  const name=sb._sessionFileName(now,12616);
  return name==='BoggiPremi_Sessione_2026-07-30_1547_12616righe.json'?true:'nome file: '+name;});
T('loadSessionFile: unisce sasFiles del JSON caricato a quelli già presenti (additivo, non li sostituisce) — prima venivano ignorati del tutto', ()=>{
  sb.allData=[]; sb.fileMap={};
  sb.sasFiles={'existing.json':{kind:'negozi',period:{monthKey:202606,label:'Giugno 2026'},meta:{},rows:[{sid:'1',name:'A'}],fname:'existing.json'}};
  const sessionObj={version:'3.3',savedAt:'2026-07-30T16:07:00.000Z',fileNames:[],
    rows:[{_tipo:'mensile',monthKey:202607,cognome:'X',nome:'Y',store:'S',matricola:'1',massimale:100,erogato:50}],
    sasFiles:{'loaded.json':{kind:'fcvm',period:{monthKey:202607,label:'Luglio 2026'},meta:{},rows:[{name:'B',role:'FC'}],fname:'loaded.json'}}};
  const fakeFile={_content:JSON.stringify(sessionObj)};
  try{ sb.loadSessionFile(fakeFile); } catch(e){ return 'EXCEPTION: '+e.message; }
  if(!('existing.json' in sb.sasFiles))return 'sasFiles esistenti persi dopo il caricamento';
  if(!('loaded.json' in sb.sasFiles))return 'sasFiles del JSON caricato non aggiunti';
  return true;});
T('saveSession: il file esportato include sasFiles (prima veniva salvato solo allData, il tab SAS → Fatturato spariva ricaricando la sessione)', ()=>{
  sb.allData=[{a:1}]; sb.fileMap={'x.xlsx':[]};
  sb.sasFiles={'test.json':{kind:'negozi',period:{monthKey:202607,label:'Luglio 2026'},meta:{},rows:[{sid:'1'}],fname:'test.json'}};
  let capturedBlobText=null;
  const prevBlob=sb.Blob, prevURL=sb.URL, prevCreate=sb.document.createElement;
  sb.Blob=function(parts){capturedBlobText=parts[0];};
  sb.URL={createObjectURL:()=>'blob:test',revokeObjectURL:()=>{}};
  sb.document.createElement=tag=>{if(tag==='a')return{set href(v){},click(){}};return prevCreate(tag);};
  try{ sb.saveSession(); } finally { sb.Blob=prevBlob; sb.URL=prevURL; sb.document.createElement=prevCreate; }
  const parsed=JSON.parse(capturedBlobText);
  return (parsed.sasFiles&&'test.json' in parsed.sasFiles)?true:'sasFiles assente o vuoto nel file esportato: '+JSON.stringify(parsed.sasFiles);});
TA('tryRestoreSasSession: se il tab SAS è già visibile quando il ripristino async finisce (race condition da hashApply su #t=sas), ridisegna da sola invece di restare bloccata su "nessun dato"', async()=>{
  sb.allData=[]; sb.sasFiles={}; sb.sasView='negozi';
  const tabSasEl={style:{display:''}}; // tab già visibile, come dopo hashApply(#t=sas) prima che sasFiles sia pronto
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={tabSas:tabSasEl,sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;
  sb.document.getElementById=id=>els[id]||prevGetById(id);
  const prevIdb=sb.idbLoadSession;
  sb.idbLoadSession=async()=>({sasFiles:{'test.json':{kind:'negozi',period:{monthKey:202607,label:'Luglio 2026'},meta:{subtitle:'Negozi — Consuntivo Luglio 2026'},
    rows:[{sid:'1',name:'TEST',target:100,actual:100,esubero:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false}],fname:'test.json'}}});
  try{
    sb.renderSas(); // simula il render precoce (troppo presto: sasFiles ancora vuoto)
    if(els.sasSubtitle.textContent.indexOf('Nessun dato')<0)return 'precondizione non verificata: il render precoce doveva mostrare "nessun dato"';
    await sb.tryRestoreSasSession(); // il ripristino async completa DOPO
    return els.sasSubtitle.textContent==='Negozi — Consuntivo Luglio 2026'?true:'subtitle dopo il ripristino: '+els.sasSubtitle.textContent;
  } finally { sb.document.getElementById=prevGetById; sb.idbLoadSession=prevIdb; }
});

// ── Paracadute (salvagente) raggiunto/non raggiunto: negozi + FC/VM ─────────────────────────
// Dept store = Qty ≥ target Qty; negozi normali = SY > SY anno prec.; FC/VM = SY area, tranne i
// SOLO-dept (Qty area = ΣQty ≥ Σtarget Qty). Stessa formula di parachuteOk dell'app (verificata su 155 negozi agosto 2026: 0 discordanze).
const _DEPT_MV=['1188','1189','1198','1304','1305','1327','1329','1348','1349']; // tutti i negozi dell'FC solo dept (FC solo dept)
// Nomi presi dalla mappa negozio -> FC di statistiche.html tramite il codice negozio: il file
// di test non contiene nomi di persone reali (dati demo CI pubblicabili).
const _fcStores=(()=>{const by={};Object.keys(sb.storeAssignMap||{}).forEach(sid=>(((sb.storeAssignMap[sid]||{}).fc)||[]).forEach(n=>{(by[n]=by[n]||[]).push(sid);}));return by;})();
const _N_MV=(Object.keys(_fcStores).find(n=>_fcStores[n].slice().sort().join(',')===_DEPT_MV.slice().sort().join(','))||'').toUpperCase(); // l'FC con esattamente i 9 dept
const _N_TEO=(Object.keys(_fcStores).find(n=>_fcStores[n+' · area 2'])||'').toUpperCase(); // l'FC che ha anche un'«area 2»
T('sasParachute negozi dept: Qty>=target → raggiunto, sotto → no, dato mancante → n/d (mai indovinato)', ()=>{
  const sid=_DEPT_MV[0];
  if(!sb.isDeptStore(sid))return 'precondizione: '+sid+' non è dept';
  const a=sb.sasParachute({sid,targetQty:245,resultQty:246},'negozi',null);
  const b=sb.sasParachute({sid,targetQty:245,resultQty:245},'negozi',null);
  const c=sb.sasParachute({sid,targetQty:245,resultQty:244},'negozi',null);
  const d=sb.sasParachute({sid,targetQty:0,resultQty:50},'negozi',null);
  const e=sb.sasParachute({sid,targetQty:245,resultQty:null},'negozi',null);
  return (a.ok===true&&a.kind==='qty'&&b.ok===true&&c.ok===false&&d.ok===null&&e.ok===null)?true:JSON.stringify([a,b,c,d,e]);});
T('sasParachute negozi normali: SY > SY anno prec. (uguale = no), anno prec. assente → n/d', ()=>{
  if(sb.isDeptStore('1102'))return 'precondizione: 1102 non dovrebbe essere dept';
  const a=sb.sasParachute({sid:'1102',resultSY:144.4,syLastYear:100},'negozi',null);
  const b=sb.sasParachute({sid:'1102',resultSY:100,syLastYear:100},'negozi',null);
  const c=sb.sasParachute({sid:'1102',resultSY:90,syLastYear:null},'negozi',null);
  return (a.ok===true&&a.kind==='sy'&&b.ok===false&&c.ok===null)?true:JSON.stringify([a,b,c]);});
T('sasAssignedStores: "NOME_2" del JSON = "Nome · area 2" della mappa, distinta dall\'area base', ()=>{
  const base=sb.sasAssignedStores(_N_TEO,'FC'),a2=sb.sasAssignedStores(_N_TEO+'_2','FC');
  if(!base.length||!a2.length)return 'liste vuote: '+base.length+'/'+a2.length;
  if(base.some(s=>a2.includes(s)))return 'aree sovrapposte';
  const mv=sb.sasAssignedStores(_N_MV,'FC').sort().join(',');
  return mv===_DEPT_MV.slice().sort().join(',')?true:'Terzo Fceta: '+mv;});
T('sasParachute FC solo-dept (Terzo Fceta, 9 dept): Qty area ΣQty ≥ Σtarget; negozio senza dato → n/d; mai SY', ()=>{
  const mk=(res)=>{const m={};_DEPT_MV.forEach((s,i)=>{m[s]={sid:s,targetQty:100,resultQty:res[i]};});return m;};
  const fc={name:_N_MV,role:'FC',resultSY:null,targetSY:null};
  const ok=sb.sasParachute(fc,'fcvm',mk([100,100,100,100,100,100,100,100,100]));       // 900/900
  const koCompensato=sb.sasParachute(fc,'fcvm',mk([0,0,0,0,0,300,300,300,0]));          // 900/900 con negozi singoli sotto (somma area, non per negozio)
  const ko=sb.sasParachute(fc,'fcvm',mk([100,100,100,100,100,100,100,100,99]));          // 899/900
  const m2=mk([100,100,100,100,100,100,100,100,100]);delete m2['1349'];
  const manca=sb.sasParachute(fc,'fcvm',m2);
  return (ok.ok===true&&ok.kind==='qty'&&koCompensato.ok===true&&ko.ok===false&&manca.ok===null)?true:JSON.stringify([ok,koCompensato,ko,manca]);});
T('sasParachute FC/VM misti: SY area vs anno prec. (fallback targetSY = SY LY nei JSON senza syLastYear); dept-heavy ma non solo-dept resta su SY', ()=>{
  const a=sb.sasParachute({name:'PRIMO FCEPSILON',role:'FC',resultSY:34.9,targetSY:38.1},'fcvm',{});      // 20 dept su 27: non solo-dept
  const b=sb.sasParachute({name:'SECONDO VMZETA',role:'VM',resultSY:38.5,targetSY:38.1},'fcvm',{});
  const c=sb.sasParachute({name:'PRIMO FCEPSILON',role:'FC',resultSY:34.9,targetSY:38.1,syLastYear:30},'fcvm',{}); // syLastYear esplicito ha la precedenza
  const d=sb.sasParachute({name:'NESSUNA MAPPA',role:'FC',resultSY:null,targetSY:null},'fcvm',{});
  return (a.ok===false&&a.kind==='sy'&&b.ok===true&&c.ok===true&&d.ok===null)?true:JSON.stringify([a,b,c,d]);});
T('renderSas FC+VM: colonna "Paracadute" con badge e val 1/0; l\'FC solo-dept usa le Qty dal JSON Negozi dello stesso mese', ()=>{
  const nMeta={kind:'negozi',subtitle:'Negozi International — Consuntivo Agosto 2026',filename:'n.json'};
  const fMeta={kind:'fcvm',subtitle:'Field Coach + VM — Consuntivo Agosto 2026',filename:'f.json'};
  const period=sb.sasParsePeriod(nMeta);
  const nRows=_DEPT_MV.map(s=>({sid:s,name:s+' X',target:1,actual:1,esubero:0,targetSY:0,resultSY:0,targetQty:100,resultQty:101,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false}));
  const base={nStores:9,target:1,actual:1,esubero:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false};
  const fRows=[Object.assign({name:_N_MV,role:'FC',targetSY:null,resultSY:null},base),Object.assign({name:'PRIMO FCEPSILON',role:'FC',targetSY:38.1,resultSY:34.9},base)];
  sb.sasFiles={'n.json':{kind:'negozi',period,meta:nMeta,rows:nRows,fname:'n.json'},'f.json':{kind:'fcvm',period,meta:fMeta,rows:fRows,fname:'f.json'}};
  sb.sasView='fcvm';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasMonth:mkEl(String(period.monthKey)),sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGetById=sb.document.getElementById;sb.document.getElementById=id=>els[id]||prevGetById(id);
  let captured=null;const prevMst=sb.makeSortTable;sb.makeSortTable=(id,k,cols,trows)=>{captured={cols,trows};};
  try{sb.renderSas();}catch(e){sb.document.getElementById=prevGetById;sb.makeSortTable=prevMst;sb.sasView='negozi';return 'EXCEPTION: '+e.message;}
  sb.document.getElementById=prevGetById;sb.makeSortTable=prevMst;sb.sasView='negozi';
  const i=captured.cols.findIndex(c=>String(c.label).indexOf('Paracadute')===0);
  if(i<0)return 'colonna Paracadute assente: '+JSON.stringify(captured.cols.map(c=>c.label));
  const strip=s=>String(s).replace(/<[^>]+>/g,'');
  const byName={};captured.trows.forEach(t=>{byName[strip(t.cells[0].disp)]=t.cells[i];});
  const mv=byName[_N_MV],pr=byName['PRIMO FCEPSILON'];
  if(!mv||mv.val!==1||mv.disp.indexOf('Raggiunto')<0)return 'Terzo Fceta (Qty 909/900): '+JSON.stringify(mv);
  if(!pr||pr.val!==0||pr.disp.indexOf('Non raggiunto')<0)return 'Fcepsilon (SY 34.9<38.1): '+JSON.stringify(pr);
  // la colonna SY/QTY dell'FC solo-dept mostra la Qty d'area (909, delta +9), non "—"; l'FC misto resta su SY
  const iSy=captured.cols.findIndex(c=>String(c.label).indexOf('SY/QTY')===0);
  const syMv=strip(captured.trows.find(t=>strip(t.cells[0].disp)===_N_MV).cells[iSy].disp).replace(/\s+/g,' ');
  const syPr=strip(captured.trows.find(t=>strip(t.cells[0].disp)==='PRIMO FCEPSILON').cells[iSy].disp).replace(/\s+/g,' ');
  if(syMv!=='909 (+9)')return 'SY/QTY Terzo Fceta: '+syMv;
  if(syPr.indexOf('34.9')<0)return 'SY/QTY Fcepsilon: '+syPr;
  if(captured.cols[i].filter!=='none')return 'la colonna Paracadute non deve avere filtro: '+captured.cols[i].filter;
  return true;});

T('renderSas: colonna Coef. Inv. — applicato (con tooltip), na/nodata, file vecchio = n/d, tile KPI con perdita premio area FC', ()=>{
  const meta={kind:'fcvm',subtitle:'Field Coach + VM — Consuntivo Ottobre 2026',filename:'test_dem.json'};
  const period=sb.sasParsePeriod(meta);
  const base={sid:null,nStores:3,target:100,actual:100,esubero:0,targetSY:80,resultSY:85,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false};
  const rows=[
    Object.assign({},base,{name:'ROSSI MARCO',role:'FC',demoltStatus:'applied',demoltPct:0.75,demoltInvio:0.9,demoltCompl:0.85,premioAreaPre:1000,premioAreaPost:750}),
    Object.assign({},base,{name:'BIANCHI LUCA',role:'VM',demoltStatus:'na',demoltPct:null}),
    Object.assign({},base,{name:'VERDI ANNA',role:'FC'})
  ];
  sb.sasFiles={'test_dem.json':{kind:'fcvm',period,meta,rows,fname:'test_dem.json'}};
  sb.sasView='fcvm';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl('')};
  const prevGet=sb.document.getElementById,prevMst=sb.makeSortTable;
  sb.document.getElementById=id=>els[id]||prevGet(id);
  let cap=null;
  sb.makeSortTable=(id,k,cols,trows,d)=>{cap={cols,trows};};
  try{ sb.renderSas(); }
  catch(e){ sb.document.getElementById=prevGet; sb.makeSortTable=prevMst; return 'EXCEPTION: '+e.message; }
  sb.document.getElementById=prevGet; sb.makeSortTable=prevMst;
  const i=cap.cols.findIndex(c=>/^Coef\. Inv\./.test(c.label));
  if(i<0)return 'colonna Coef. Inv. non trovata';
  const cell=n=>cap.trows.find(t=>t.cells[0].disp.indexOf(n)>=0).cells[i];
  const a=cell('ROSSI'),v=cell('BIANCHI'),o=cell('VERDI');
  if(a.disp.indexOf('75%')<0||a.disp.indexOf('→')<0||a.val!==0.75)return 'FC applicato: '+a.disp;
  if(a.disp.indexOf('% invio area 90.00%')<0)return 'tooltip invio: '+a.disp;
  if(v.disp.indexOf('solo ai Field Coach')<0)return 'VM: '+v.disp;
  if(o.disp.indexOf('n/d')<0)return 'file vecchio: '+o.disp;
  if(els.sasKpiRow.innerHTML.indexOf('Coef. Inventari')<0||els.sasKpiRow.innerHTML.indexOf('€ 250')<0)return 'tile KPI: '+els.sasKpiRow.innerHTML.slice(-260);
  return true;});

T('Scheda negozio: il nome nella tabella è un link, il popup xl mostra tutti i blocchi + storico mesi, chiusura toglie la classe xl', ()=>{
  sb.allData=[];
  const mkCls=()=>({_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){if(f===undefined)f=!this._s.has(c);if(f)this._s.add(c);else this._s.delete(c);return f;},contains(c){return this._s.has(c);}});
  const mkEl=(v)=>({style:{},classList:mkCls(),appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',textContent:'',value:v||'',getContext:()=>({}),dataset:{}});
  const mk=(label,mkey,extra)=>{const meta={kind:'negozi',subtitle:'Negozi Italia — Consuntivo '+label,filename:'t'+mkey+'.json'};const period=sb.sasParsePeriod(meta);
    return ['t'+mkey+'.json',{kind:'negozi',period,meta,fname:'t'+mkey+'.json',rows:[Object.assign({sid:'1101',name:'1101 JERMYN STREET',target:1000,actual:900,esuberoPrec:50,targetSY:80,resultSY:85,syLastYear:80,pctBase:0.9,sasValue:100,recPct:75,recValue:75,applied:60,esuberoSasPrec:10,esuberoSasPrecUsed:10,sasReserveNext:15,pctFinal:0.99,esito:'none',esitoLabel:'Nessuno',determinante:false},extra||{})]}];};
  const a=mk('Settembre 2026','9'),b=mk('Ottobre 2026','10',{demoltStatus:'applied',demoltPct:0.8,demoltCompl:0.91,demoltAcc:0.97,determinante:true});
  sb.sasFiles={[a[0]]:a[1],[b[0]]:b[1]};
  sb.sasView='negozi';
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),sasMonth:mkEl(String(b[1].period.monthKey)),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl(''),
    modalBody:mkEl(''),modalTitle:mkEl(''),modalBox:mkEl(''),modalOverlay:mkEl('')};
  const prevGet=sb.document.getElementById,prevMst=sb.makeSortTable;
  sb.document.getElementById=id=>els[id]||prevGet(id);
  let cap=null;sb.makeSortTable=(id,k,cols,trows,d)=>{cap={cols,trows};};
  const cleanup=()=>{sb.document.getElementById=prevGet;sb.makeSortTable=prevMst;sb.allData=rows;};
  try{
    sb.renderSas();
    if(cap.cols.length&&/^(ID|Store ID)$/.test(cap.cols[0].label))return 'la colonna ID non deve esserci: '+cap.cols[0].label;
    const cell=cap.trows[0].cells[0].disp;
    if(cell.indexOf('sd-link')<0||cell.indexOf('1101 JERMYN STREET')<0)return 'nome non cliccabile: '+cell;
    sb.sasOpenStore('1101');
    const h=els.modalBody.innerHTML;
    if(!els.modalBox.classList.contains('xl')||!els.modalOverlay.classList.contains('open'))return 'popup non aperto in formato xl';
    for(const t of ['1101 JERMYN STREET','Fatturato','Vendite','SAS determinante','Coefficiente Inventari','BDG storico','Mesi caricati','80%','91,00%','97,00%','Compl. inv.','Accuracy inv.','91,00%','97,00%'])
      if(h.indexOf(t)<0)return 'manca "'+t+'" nel popup';
    if(!/<tr class="cur"><td>Ottobre 2026/.test(h))return 'riga del mese corrente non evidenziata';
    sb.closeModal();
    if(els.modalBox.classList.contains('xl'))return 'closeModal non toglie xl';
    return true;
  }catch(e){return 'EXCEPTION: '+e.message;}
  finally{cleanup();}});

T('Scheda FC/VM: nome cliccabile, popup xl con coefficiente/premio area, negozi dell\'area e storico mesi; VM = non si applica', ()=>{
  sb.allData=[];
  const mkCls=()=>({_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){if(f===undefined)f=!this._s.has(c);if(f)this._s.add(c);else this._s.delete(c);return f;},contains(c){return this._s.has(c);}});
  const mkEl=(v)=>({style:{},classList:mkCls(),appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',textContent:'',value:v||'',getContext:()=>({}),dataset:{}});
  const mkRow=(extra)=>Object.assign({name:'PRIMO FCEPSILON',role:'FC',nStores:2,target:1000,actual:1100,esuberoPrec:0,targetSY:60,resultSY:58,syLastYear:60,pctBase:1.1,sasValue:100,recPct:75,recValue:75,applied:0,esuberoSasPrec:0,esuberoSasPrecUsed:0,sasReserveNext:75,pctFinal:1.1,esito:'full',esitoLabel:'Pieno',determinante:false},extra||{});
  const mk=(label,key,rowsF)=>{const meta={kind:'fcvm',subtitle:'Field Coach + VM — Consuntivo '+label,filename:'f'+key+'.json'};const period=sb.sasParsePeriod(meta);return ['f'+key+'.json',{kind:'fcvm',period,meta,fname:'f'+key+'.json',rows:rowsF}];};
  const a=mk('Settembre 2026','9',[mkRow()]);
  const b=mk('Ottobre 2026','10',[mkRow({demoltStatus:'applied',demoltPct:0.85,demoltInvio:0.985,demoltCompl:0.81,premioAreaPre:3000,premioAreaPost:2550}),mkRow({name:'SECONDO VMZETA',role:'VM',demoltStatus:'na'}),mkRow({name:'QUARTO FCTHETA',role:'FC',demoltStatus:'na'})]);
  sb.sasFiles={[a[0]]:a[1],[b[0]]:b[1]};
  sb.sasView='fcvm';
  const prevAssign=sb.storeAssignMap; sb.storeAssignMap={'1105':{fc:['Primo Fcepsilon'],vm:[]},'1106':{fc:['Primo Fcepsilon'],vm:[]}};
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),sasMonth:mkEl(String(b[1].period.monthKey)),
    'sasFDet-si':Object.assign(mkEl(''),{classList:{contains:()=>false,add:noop,remove:noop,toggle:noop}}),
    sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl(''),
    modalBody:mkEl(''),modalTitle:mkEl(''),modalBox:mkEl(''),modalOverlay:mkEl('')};
  const prevGet=sb.document.getElementById,prevMst=sb.makeSortTable;
  sb.document.getElementById=id=>els[id]||prevGet(id);
  let cap=null;sb.makeSortTable=(id,k,cols,trows,d)=>{cap={cols,trows};};
  const cleanup=()=>{sb.document.getElementById=prevGet;sb.makeSortTable=prevMst;sb.storeAssignMap=prevAssign;sb.allData=rows;};
  try{
    sb.renderSas();
    const cell=cap.trows.find(t=>t.cells[0].val==='PRIMO FCEPSILON').cells[0].disp;
    if(cell.indexOf('sd-link')<0||cell.indexOf('sasOpenPerson')<0)return 'nome FC non cliccabile: '+cell;
    sb.sasOpenPerson('PRIMO FCEPSILON');
    const h=els.modalBody.innerHTML;
    if(!els.modalBox.classList.contains('xl')||!els.modalOverlay.classList.contains('open'))return 'popup non aperto in formato xl';
    for(const t of ['PRIMO FCEPSILON','Fatturato area','SAS area','Coefficiente Inventari','98,50%','81,00%','€ 3000','€ 2550','Negozi dell','1105','1106','Mesi caricati','Premio area','Invio inv.','Compl. inv.','98,50%','81,00%'])
      if(h.replace(/(\d)[.,](\d{3})/g,'$1$2').indexOf(t)<0)return 'manca "'+t+'" nel popup FC';
    if(!/<tr class="cur"><td>Ottobre 2026/.test(h))return 'riga mese corrente non evidenziata';
    sb.sasOpenPerson('SECONDO VMZETA');
    if(els.modalBody.innerHTML.indexOf('solo FC')<0)return 'VM: manca "non si applica (solo FC)"';
    sb.sasOpenPerson('QUARTO FCTHETA');
    if(els.modalBody.innerHTML.indexOf('area interamente USA')<0)return 'FC USA: manca la spiegazione';
    sb.closeModal();
    return els.modalBox.classList.contains('xl')?'closeModal non toglie xl':true;
  }catch(e){return 'EXCEPTION: '+e.message;}
  finally{cleanup();}});

// ── Coefficiente Inventari: interruttore "come pagato" / "al lordo" ──────────
const _coefPeriod=(label)=>sb.sasParsePeriod({kind:'negozi',subtitle:'Negozi — Consuntivo '+label});
const _coefStoreFile=(rowsN,label)=>({kind:'negozi',period:_coefPeriod(label),meta:{},fname:'n.json',rows:rowsN});
const _coefFcFile=(rowsF,label)=>({kind:'fcvm',period:_coefPeriod(label),meta:{},fname:'f.json',rows:rowsF});
const _coefSm=(over)=>Object.assign({_tipo:'mensile',job:'SM',store:'1101 JERMYN STREET',matricola:'1',cognome:'ROSSI',nome:'MARIO',monthKey:202610,erogato:800,massimale:1500,cBdg:500,cDigital:300,cSas:0},over||{});
T('Coef. inventari: SM/VSM al lordo = ÷ coefficiente su erogato e voci, massimale invariato, ritorno a "come pagato" esatto e idempotente; altri ruoli e mesi senza coefficiente intatti', ()=>{
  const prev=sb.allData;
  const sm=_coefSm(), vsm=_coefSm({job:'VSM',matricola:'2',cognome:'BIANCHI',erogato:400,cBdg:400,cDigital:0});
  const ssa=_coefSm({job:'SSA',matricola:'3',cognome:'VERDI'}), sett=_coefSm({monthKey:202609,matricola:'4',cognome:'NERI'});
  sb.allData=[sm,vsm,ssa,sett];
  sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'1101 JERMYN STREET',demoltStatus:'applied',demoltPct:0.8}],'Ottobre 2026')};
  try{
    sb.coefMode='paid'; sb.applyCoefMode();
    if(sm.erogato!==800||sm.cBdg!==500)return 'paid non deve cambiare nulla';
    if(Math.round(sb.coefInfo.loss)!==300)return 'perdita attesa 300 (200+100), trovata '+sb.coefInfo.loss;
    sb.coefMode='gross'; sb.applyCoefMode();
    const near=(a,b)=>Math.abs(a-b)<1e-6;
    if(!near(sm.erogato,1000)||!near(sm.cBdg,625)||!near(sm.cDigital,375))return 'SM lordo: '+sm.erogato+' '+sm.cBdg+' '+sm.cDigital;
    if(!near(vsm.erogato,500))return 'VSM lordo: '+vsm.erogato;
    if(sm.massimale!==1500)return 'massimale deve restare invariato';
    if(sm.pct!==66.7)return 'pct ricalcolata attesa 66.7, trovata '+sm.pct;
    if(ssa.erogato!==800||sett.erogato!==800)return 'SSA o mese senza JSON toccati';
    sb.coefMode='gross'; sb.applyCoefMode(); if(!near(sm.erogato,1000))return 'applicazione ripetuta non idempotente: '+sm.erogato;
    sb.coefMode='paid'; sb.applyCoefMode();
    if(!near(sm.erogato,800)||!near(sm.cBdg,500)||sm._cf!==undefined)return 'ritorno a pagato non esatto: '+sm.erogato+' _cf='+sm._cf;
    return true;
  }finally{sb.coefMode='paid';sb.allData=prev;}});
T('Coef. inventari: la riscalatura dei cambi (applyUniformRates) dopo il lordo non rompe il ritorno a "come pagato"', ()=>{
  const prev=sb.allData; const sm=_coefSm();
  sb.allData=[sm]; sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'x',demoltStatus:'applied',demoltPct:0.8}],'Ottobre 2026')};
  try{
    sb.coefMode='gross'; sb.applyCoefMode();           // 1000
    sm.erogato*=2; sm.cBdg*=2;                          // simula un riallineamento cambio x2
    sb.coefMode='paid'; sb.applyCoefMode();
    return (Math.abs(sm.erogato-1600)<1e-6&&Math.abs(sm.cBdg-1000)<1e-6)?true:'attesi 1600/1000, trovati '+sm.erogato+'/'+sm.cBdg;
  }finally{sb.coefMode='paid';sb.allData=prev;}});
T('Coef. inventari: se il JSON viene rimosso con la modalità lorda, le righe tornano come pagate; mesi senza JSON Negozi segnalati', ()=>{
  const prev=sb.allData; const sm=_coefSm(), nov=_coefSm({monthKey:202611,matricola:'9',cognome:'GIALLI'});
  sb.allData=[sm,nov]; sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'x',demoltStatus:'applied',demoltPct:0.8}],'Ottobre 2026')};
  try{
    sb.coefMode='gross'; sb.applyCoefMode();
    if(Math.abs(sm.erogato-1000)>1e-6)return 'lordo non applicato';
    if(JSON.stringify(sb.coefInfo.missing)!==JSON.stringify([202611]))return 'mesi mancanti: '+JSON.stringify(sb.coefInfo.missing);
    sb.sasFiles={}; sb.applyCoefMode();
    return (Math.abs(sm.erogato-800)<1e-6&&sm._cf===undefined)?true:'senza JSON dovrebbe tornare 800, trovato '+sm.erogato;
  }finally{sb.coefMode='paid';sb.allData=prev;}});
T('Coef. inventari: FC al lordo = + (premio area prima − dopo), aree _2 sommate; coefficiente non applicabile o abbinamento ambiguo → lasciato come pagato e segnalato', ()=>{
  const prev=sb.allData;
  const fc=(cognome,nome,m,E)=>({_tipo:'fc vm',job:'FC',store:'FC',matricola:m,cognome,nome,monthKey:202610,erogato:E,massimale:3500,cBdg:E});
  const fcepsilon=fc('FCEPSILON','PRIMO','11',2550), teo=fc('FCIOTA','QUINTO','12',800), dup1=fc('ROSSI','LUCA','13',1000), dup2=fc('ROSSI','LUCA','14',1000);
  const vm=Object.assign(fc('VMBETA','VITO','15',900),{job:'VM'});
  sb.allData=[fcepsilon,teo,dup1,dup2,vm];
  sb.sasFiles={'f.json':_coefFcFile([
    {name:'PRIMO FCEPSILON',role:'FC',demoltStatus:'applied',demoltPct:0.85,premioAreaPre:3000,premioAreaPost:2550},
    {name:'QUINTO FCIOTA',role:'FC',demoltStatus:'applied',demoltPct:0.6,premioAreaPre:800,premioAreaPost:480},
    {name:'QUINTO FCIOTA_2',role:'FC',demoltStatus:'applied',demoltPct:0.75,premioAreaPre:200,premioAreaPost:150},
    {name:'LUCA ROSSI',role:'FC',demoltStatus:'applied',demoltPct:0.5,premioAreaPre:1000,premioAreaPost:500},
    {name:'VITO VMBETA',role:'VM',demoltStatus:'na'}],'Ottobre 2026')};
  try{
    sb.coefMode='gross'; sb.applyCoefMode();
    const near=(a,b)=>Math.abs(a-b)<1e-6;
    if(!near(fcepsilon.erogato,3000)||!near(fcepsilon.cBdg,3000))return 'Fcepsilon lordo: '+fcepsilon.erogato;
    if(!near(teo.erogato,800+320+50))return 'FC con area 2, area+area_2: '+teo.erogato;
    if(dup1.erogato!==1000||dup2.erogato!==1000)return 'abbinamento ambiguo: non deve toccare le righe';
    if(sb.coefInfo.unmatched.length!==1)return 'attesa 1 segnalazione, trovate '+JSON.stringify(sb.coefInfo.unmatched);
    if(vm.erogato!==900)return 'VM toccato';
    if(Math.round(sb.coefInfo.loss)!==Math.round(450+370))return 'perdita FC attesa 820, trovata '+sb.coefInfo.loss;
    sb.coefMode='paid'; sb.applyCoefMode();
    return (near(fcepsilon.erogato,2550)&&near(teo.erogato,800))?true:'ritorno a pagato: '+fcepsilon.erogato+' '+teo.erogato;
  }finally{sb.coefMode='paid';sb.allData=prev;}});
T('Coef. inventari: nota per Lament1 con la modalità attiva (nessuna nota se non ci sono righe con coefficiente)', ()=>{
  const prev=sb.allData; const sm=_coefSm();
  sb.allData=[sm]; sb.sasFiles={};
  try{
    sb.applyCoefMode(); if(sb.coefAgentNote()!=='')return 'senza coefficiente non deve esserci nota';
    sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'x',demoltStatus:'applied',demoltPct:0.8}],'Ottobre 2026')};
    sb.coefMode='gross'; sb.applyCoefMode();
    const g=sb.coefAgentNote();
    sb.coefMode='paid'; sb.applyCoefMode();
    const pd=sb.coefAgentNote();
    return (g.indexOf('AL LORDO')>=0&&pd.indexOf('COME PAGATO')>=0)?true:'note: '+g.slice(0,200)+' | '+pd.slice(0,200);
  }finally{sb.coefMode='paid';sb.allData=prev;}});

T('Coef. inventari: le righe da salvare (sessione/autosave) sono sempre "come pagato", anche in modalità lorda, senza toccare allData', ()=>{
  const prev=sb.allData; const sm=_coefSm(), ssa=_coefSm({job:'SSA',matricola:'3',cognome:'VERDI'});
  sb.allData=[sm,ssa]; sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'x',demoltStatus:'applied',demoltPct:0.8}],'Ottobre 2026')};
  try{
    sb.coefMode='gross'; sb.applyCoefMode();
    const out=sb.rowsAsPaid(sb.allData);
    if(Math.abs(out[0].erogato-800)>1e-6||Math.abs(out[0].cBdg-500)>1e-6||out[0]._cf!==undefined)return 'riga salvata non come pagato: '+out[0].erogato+' _cf='+out[0]._cf;
    if(out[0].pct!==53.3)return 'pct salvata attesa 53.3, trovata '+out[0].pct;
    if(out[1]!==ssa)return 'righe senza coefficiente devono restare lo stesso oggetto';
    if(Math.abs(sm.erogato-1000)>1e-6)return 'allData non deve cambiare (resta al lordo)';
    return true;
  }finally{sb.coefMode='paid';sb.applyCoefMode();sb.allData=prev;}});
T('Alert: in vista "come pagato" chi è sotto soglia per il coefficiente ha come prima motivazione "Coefficiente inventari"; in vista lorda no', ()=>{
  const prev=sb.allData, prevRows=sb.getAlertRows, prevTh=sb.alertThresholds;
  const sm=_coefSm({rml_period:4000,erogato:200,cBdg:200,cDigital:0});
  const peer=_coefSm({matricola:'7',cognome:'PARI',store:'1999 ALTRO',rml_period:4000,erogato:1200,cBdg:1200,cDigital:0});
  sb.allData=[sm,peer]; sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'x',demoltStatus:'applied',demoltPct:0.5}],'Ottobre 2026')};
  sb.getAlertRows=()=>sb.allData; sb.alertThresholds=()=>({th:{SM:20},tol:2});
  try{
    sb.coefMode='paid'; sb.applyCoefMode();
    let e=sb.alertCompute().emps.find(x=>x.matricola==='1');
    if(e.status!=='sotto')return 'atteso sotto soglia, trovato '+e.status;
    if(!/^Coefficiente inventari: premio ridotto di € 200 \(coefficiente 50%\)/.test(e.reasons[0]||''))return 'prima motivazione: '+e.reasons[0];
    sb.coefMode='gross'; sb.applyCoefMode();
    e=sb.alertCompute().emps.find(x=>x.matricola==='1');
    if((e.reasons||[]).some(r=>/Coefficiente inventari/.test(r)))return 'in vista lorda la motivazione non serve';
    return true;
  }finally{sb.coefMode='paid';sb.applyCoefMode();sb.allData=prev;sb.getAlertRows=prevRows;sb.alertThresholds=prevTh;}});

T('Export Excel: nome file con "AlLordoCoefInv_" solo in modalità lorda con righe a coefficiente; mai per l\'export SAS', ()=>{
  const prev=sb.allData, prevW=sb.XLSX;
  const names=[];
  sb.XLSX={utils:{json_to_sheet:()=>({}),book_new:()=>({}),book_append_sheet:()=>{}},writeFile:(wb,n)=>names.push(n)};
  const sm=_coefSm(); sb.allData=[sm];
  sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'x',demoltStatus:'applied',demoltPct:0.8}],'Ottobre 2026')};
  try{
    sb.coefMode='paid'; sb.applyCoefMode(); sb._writeXlsx([{a:1}],'S','BoggiPremi_Alert_');
    sb.coefMode='gross'; sb.applyCoefMode(); sb._writeXlsx([{a:1}],'S','BoggiPremi_Alert_'); sb._writeXlsx([{a:1}],'S','BoggiPremi_SasFatturato_',true);
    if(/AlLordo/.test(names[0]))return 'come pagato non deve avere il tag: '+names[0];
    if(!/^BoggiPremi_Alert_AlLordoCoefInv_\d{4}-\d{2}-\d{2}\.xlsx$/.test(names[1]))return 'al lordo: '+names[1];
    if(/AlLordo/.test(names[2]))return 'export SAS non deve avere il tag: '+names[2];
    return true;
  }finally{sb.coefMode='paid';sb.applyCoefMode();sb.allData=prev;sb.XLSX=prevW;}});
T('Tab SAS: filtro "Solo coef. inventari < 100%" tiene solo le righe con coefficiente applicato sotto il 100%', ()=>{
  sb.allData=[];
  const meta={kind:'negozi',subtitle:'Negozi — Consuntivo Ottobre 2026',filename:'t_coeff.json'}, period=sb.sasParsePeriod(meta);
  const mk=(sid,extra)=>Object.assign({sid,name:sid+' X',target:1,actual:1,esuberoPrec:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false},extra);
  sb.sasFiles={'t_coeff.json':{kind:'negozi',period,meta,fname:'t_coeff.json',rows:[mk('1101',{demoltStatus:'applied',demoltPct:0.8}),mk('1102',{demoltStatus:'applied',demoltPct:1}),mk('1103',{demoltStatus:'nodata',demoltPct:null}),mk('1104',{demoltStatus:'na',demoltPct:null})]}};
  sb.sasView='negozi';
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),'sasFDet-si':mkEl(''),sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl(''),'sasFCoef-no':mkEl(''),'sasFCoef-si':mkEl('')};
  const prevGet=sb.document.getElementById,prevMst=sb.makeSortTable;
  sb.document.getElementById=id=>els[id]||prevGet(id);
  let cap=null; sb.makeSortTable=(id,k,cols,trows)=>{cap={cols,trows};};
  try{
    sb.sasSetCoef(true);
    const sids=cap.trows.map(t=>sidOf(t.cells[0].disp));
    sb.sasSetCoef(false);
    const all=cap.trows.length;
    if(JSON.stringify(sids)!=='["1101"]')return 'con filtro: '+JSON.stringify(sids);
    return all===4?true:'senza filtro attese 4 righe, trovate '+all;
  }catch(e){return 'EXCEPTION: '+e.message;}
  finally{sb.sasSetCoef&&(sb.sasOnlyCoef=false);sb.document.getElementById=prevGet;sb.makeSortTable=prevMst;sb.allData=rows;}});
T('Lament1 coefficiente_inventari: stessi numeri dei JSON del tab SAS e della riduzione calcolata sulle righe premi (negozio, persona SM, FC, riepilogo)', ()=>{
  const prev=sb.allData; const sm=_coefSm();
  sb.allData=[sm];
  sb.sasFiles={'n.json':_coefStoreFile([{sid:'1101',name:'1101 JERMYN STREET',demoltStatus:'applied',demoltPct:0.8,demoltCompl:0.5,demoltAcc:0.99},{sid:'1165',name:'1165 NICE',demoltStatus:'nodata'}],'Ottobre 2026'),
    'f.json':_coefFcFile([{name:'PRIMO FCEPSILON',role:'FC',demoltStatus:'applied',demoltPct:0.85,demoltInvio:0.985,demoltCompl:0.81,premioAreaPre:3000,premioAreaPost:2550}],'Ottobre 2026')};
  try{
    sb.coefMode='paid'; sb.applyCoefMode(); sb.AgentTools.setData(sb.allData);
    const n=sb.AgentTools.run('coefficiente_inventari',{negozio:'jermyn'});
    if(n.errore)return 'negozio: '+n.errore;
    if(n.coefficiente_pct!==80||n.completamento_pct!==50||n.riduzione_premi_smvsm_eur!==200)return 'negozio: '+JSON.stringify(n);
    const p=sb.AgentTools.run('coefficiente_inventari',{cognome:'Rossi'});
    if(p.riduzione_dipendente_eur!==200||!p.si_applica_al_ruolo||!p.negozio_coefficiente)return 'persona: '+JSON.stringify(p);
    const f=sb.AgentTools.run('coefficiente_inventari',{cognome:'Fcepsilon'});
    if(!f.aree||f.aree[0].premio_area_prima_eur!==3000||f.aree[0].premio_area_dopo_eur!==2550)return 'FC: '+JSON.stringify(f);
    const r=sb.AgentTools.run('coefficiente_inventari',{});
    if(r.negozi.con_coefficiente!==1||r.negozi.senza_dati!==1||r.fc.perdita_premio_area_eur!==450||r.riduzione_totale_premi_eur!==200)return 'riepilogo: '+JSON.stringify(r);
    return true;
  }finally{sb.coefMode='paid';sb.applyCoefMode();sb.allData=prev;sb.AgentTools.setData(prev);}});

T('Tab SAS: 3 colonne inventari — negozi: Coef + Compl. + Accuracy; FC: Coef + Invio + Compl. (troncati a 2 decimali), "—" se non applicato', ()=>{
  sb.allData=[];
  const mkEl=(v)=>({style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,setAttribute:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],children:[],innerHTML:'',value:v||'',getContext:()=>({}),dataset:{}});
  const els={sasBdgFrom:mkEl('202401'),sasBdgTo:mkEl('202612'),sasQ:mkEl(''),'sasFDet-si':mkEl(''),sasSubtitle:mkEl(''),sasKpiRow:mkEl(''),sasCountNote:mkEl(''),sasTbl:mkEl(''),sasChips:mkEl(''),sasAssignWrap:mkEl(''),'sasFCoef-no':mkEl(''),'sasFCoef-si':mkEl('')};
  const prevGet=sb.document.getElementById,prevMst=sb.makeSortTable;
  sb.document.getElementById=id=>els[id]||prevGet(id);
  let cap=null; sb.makeSortTable=(id,k,cols,trows)=>{cap={cols,trows};};
  const base={target:1,actual:1,esuberoPrec:0,targetSY:0,resultSY:0,pctBase:1,sasValue:0,recPct:0,recValue:0,applied:0,pctFinal:1,esito:'full',esitoLabel:'Pieno',determinante:false};
  try{
    const pn=sb.sasParsePeriod({kind:'negozi',subtitle:'Negozi — Consuntivo Ottobre 2026'}), pf=sb.sasParsePeriod({kind:'fcvm',subtitle:'Field Coach + VM — Consuntivo Ottobre 2026'});
    sb.sasFiles={'n.json':{kind:'negozi',period:pn,meta:{},fname:'n.json',rows:[Object.assign({sid:'1101',name:'1101 A'},base,{demoltStatus:'applied',demoltPct:0.85,demoltCompl:0.9127,demoltAcc:0.9899}),Object.assign({sid:'1165',name:'1165 B'},base,{demoltStatus:'nodata',demoltPct:null,demoltCompl:null,demoltAcc:null})]},
      'f.json':{kind:'fcvm',period:pf,meta:{},fname:'f.json',rows:[Object.assign({name:'ROSSI MARCO',role:'FC',nStores:2},base,{demoltStatus:'applied',demoltPct:0.7,demoltInvio:0.985,demoltCompl:0.5526}),Object.assign({name:'BIANCHI LUCA',role:'VM',nStores:2},base,{demoltStatus:'na',demoltPct:null,demoltInvio:null,demoltCompl:null})]}};
    sb.sasView='negozi'; sb.renderSas();
    const lab=cap.cols.map(c=>String(c.label).replace(/<[^>]+>/g,'').trim());
    const i=lab.findIndex(l=>/^Coef\. Inv\./.test(l));
    if(i<0||!/^Compl\. inv\./.test(lab[i+1])||!/^Accuracy inv/.test(lab[i+2]))return 'colonne negozi: '+JSON.stringify(lab.slice(i-1,i+4));
    const t=id=>cap.trows.find(r=>sidOf(r.cells[0].disp)===id);
    const a=t('1101').cells, b=t('1165').cells;
    if(!/^91\.27%$/.test(a[i+1].disp)||!/^98\.99%$/.test(a[i+2].disp))return 'valori negozio: '+a[i+1].disp+' '+a[i+2].disp;
    if(a.length!==cap.cols.length)return 'celle ('+a.length+') ≠ colonne ('+cap.cols.length+')';
    if(!/dash/.test(b[i+1].disp)||!/dash/.test(b[i+2].disp))return 'negozio senza dati: '+b[i+1].disp;
    sb.sasView='fcvm'; sb.renderSas();
    const lab2=cap.cols.map(c=>String(c.label).replace(/<[^>]+>/g,'').trim());
    const j=lab2.findIndex(l=>/^Coef\. Inv\./.test(l));
    if(j<0||!/^Invio inv\./.test(lab2[j+1])||!/^Compl\. inv\./.test(lab2[j+2]))return 'colonne FC: '+JSON.stringify(lab2.slice(j-1,j+4));
    const fc=cap.trows.find(r=>r.cells[0].val==='ROSSI MARCO').cells, vm=cap.trows.find(r=>r.cells[0].val==='BIANCHI LUCA').cells;
    if(!/^98\.50%$/.test(fc[j+1].disp)||!/^55\.26%$/.test(fc[j+2].disp))return 'valori FC: '+fc[j+1].disp+' '+fc[j+2].disp;
    if(fc.length!==cap.cols.length)return 'celle FC ('+fc.length+') ≠ colonne ('+cap.cols.length+')';
    if(!/dash/.test(vm[j+1].disp))return 'VM deve avere trattino: '+vm[j+1].disp;
    return true;
  }catch(e){return 'EXCEPTION: '+e.message;}
  finally{sb.sasView='negozi';sb.document.getElementById=prevGet;sb.makeSortTable=prevMst;sb.allData=rows;}});

// ── esito ──────────────────────────────────────────────────────
(async()=>{
  for(const {name,fn} of asyncTests){
    try{ const r=await fn(); if(r===true){pass++;} else {fail++;bad.push(name+(typeof r==='string'?' — '+r:''));} }
    catch(e){ fail++; bad.push(name+' — EXCEPTION: '+e.message); }
  }
  console.log('\n'+pass+' ok, '+fail+' falliti'+(fail?'\n\nFALLITI:\n - '+bad.join('\n - '):' — tutto verde ✅'));
  process.exit(fail?1:0);
})();
