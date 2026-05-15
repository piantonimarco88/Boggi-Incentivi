// === AGGIUNTE: manual overrides per employee, ADDED to normal calc, bypass rules/malattia ===
// Keys match Aggiunte sheet: rb=BDG lordo, rbn=BDG netto, rd=Digital, rs=SY, rp=Privilege, rsa=SAS, rdc=DCC, rcs=CS, ra=Articoli
var AGG={};// keyed by matricola: {rb:0,rbn:0,rd:0,rs:0,rp:0,rsa:0,rdc:0,rcs:0,ra:0}
var MONITOR_SNAPS=[];
var AGG_KEYS=[{k:"rb",l:"BDG (Lordo)"},{k:"rbn",l:"BDG (Netto)"},{k:"rd",l:"Digital"},{k:"rs",l:"SY"},{k:"rp",l:"Privilege"},{k:"rsa",l:"SAS"},{k:"rdc",l:"DCC"},{k:"rcs",l:"CS"},{k:"ra",l:"Articoli"}];

function getAgg(m){return AGG[m]||null}
function aggTotal(m){var a=AGG[m];if(!a)return 0;var t=0;AGG_KEYS.forEach(function(ak){t+=(a[ak.k]||0)});return t}
