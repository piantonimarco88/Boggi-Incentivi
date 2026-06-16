var PARAMS={bdg100:0.995,kpi100:0.995,bdg60:0.95,bdg60mult:0.6,digMinClassic:0.03,digMinMobility:0.05,digPct:0.3,syPct:0.03,privPct:0.02,sasRate:2,sasMax:200,dccRate:0.002,dccMax:100,qtyPct:0.5,artPct:0.3,artEnabled:true,workgamePct:0.30};
// Il vecchio gate "% min SAS accettati" (giugno 2026, vecchia policy interim) è stato
// rimosso: dispatch a luglio 2026 con la nuova logica a matrice. Le due funzioni
// restano come stub no-op per non rompere i call site nelle lettere/calcolo.
function sasAccActive(){return false;}
function sasZeroByAcc(e){return false;}

// ============================================================
// NUOVA LOGICA SAS (da Luglio 2026, solo mensile + FC+VM)
// ------------------------------------------------------------
// Il valore dei SAS gestiti dal negozio viene riconosciuto in parte
// (% da matrice accettazione × velocità) e sommato al fatturato verso
// il target BDG, fino al 100% (cap). L'avanzo si accantona come
// RISERVA SAS dedicata, separata dall'esubero fatturato, e si riporta
// al mese successivo. Vedi sasReserveCalc().
// ------------------------------------------------------------
// Matrice editabile in Configurazione: celle (% riconosciuta) + soglie
// delle fasce di accettazione e velocità. accBands/velBands sono i punti
// di taglio interni; grid[accIdx][velIdx] è la frazione riconosciuta 0..1.
// Entrambi gli assi indicizzati bassa→alta (idx 0 = peggiore, 3 = migliore):
//   accIdx/velIdx: <bands[0]→0, <[1]→1, <[2]→2, else 3
// grid[accIdx][velIdx]: idx0=fascia <70%, idx3=fascia ≥90%.
var SAS_MATRIX={
  velLabel:"% gestiti entro 4h",
  accBands:[0.70,0.80,0.90],
  velBands:[0.70,0.80,0.90],
  grid:[
    [0.00,0.25,0.35,0.45],
    [0.40,0.50,0.60,0.70],
    [0.55,0.65,0.75,0.85],
    [0.70,0.80,0.90,1.00]
  ]
};
var SAS_NEW_START_YEAR=2026, SAS_NEW_START_MONTH=7;
// Attiva solo in mensile + FC+VM da luglio 2026 (mai seasonal, mai prima).
function sasNewActive(){
  if(PRIZE_MODE!=="mensile"&&PRIZE_MODE!=="fcvm")return false;
  return (CFG_YEAR>SAS_NEW_START_YEAR)||(CFG_YEAR===SAS_NEW_START_YEAR&&CFG_MONTH>=SAS_NEW_START_MONTH);
}
// Indice di fascia accettazione (0 = peggiore <70%, 3 = migliore ≥90%) per una % 0..1.
function sasAccBandIdx(acc){
  var b=SAS_MATRIX.accBands;
  if(acc<b[0])return 0;if(acc<b[1])return 1;if(acc<b[2])return 2;return 3;
}
// Indice di fascia velocità (0 = peggiore) per una % 0..1.
function sasVelBandIdx(vel){
  var b=SAS_MATRIX.velBands;
  if(vel<b[0])return 0;if(vel<b[1])return 1;if(vel<b[2])return 2;return 3;
}
// % riconosciuta (0..1) data accettazione e velocità. null se un dato manca.
function sasMatrixPct(acc,vel){
  if(acc==null||vel==null||isNaN(acc)||isNaN(vel))return null;
  return SAS_MATRIX.grid[sasAccBandIdx(acc)][sasVelBandIdx(vel)];
}
// Valore SAS riconosciuto = % matrice × valore SAS. 0 se dato mancante.
function sasRecognizedValue(acc,vel,value){
  var p=sasMatrixPct(acc,vel);
  if(p==null||!value)return 0;
  return p*value;
}
// Logica riserva: il riconosciuto (+riserva precedente) colma il gap verso
// il target fino al 100%; l'avanzo diventa riserva del mese dopo.
//   base       = fatturato + esubero fatturato precedente
//   target     = obiettivo fatturato
//   recognized = valore SAS riconosciuto questo mese
//   reserveIn  = riserva SAS riportata dal mese precedente
// Ritorna {avail, gap, used, reserveOut, num} dove num = numeratore verso target.
function sasReserveCalc(base,target,recognized,reserveIn){
  base=base||0;target=target||0;
  var avail=(recognized||0)+(reserveIn||0);
  var gap=Math.max(0,target-base);
  var used=Math.min(avail,gap);
  return {avail:avail,gap:gap,used:used,reserveOut:avail-used,num:base+used};
}

// === SEASONAL BONUS CONFIG ===
function _seasRangeLabel(r){
  var lo=r.from<=-9999?"-inf":r.from.toString();
  var hi=r.to>=9999?"+inf":r.to.toString();
  return lo+"% to "+hi+"%";
}
var SEAS_CFG = {
  basePct: 0.20,            // % retribuzione semestrale (base incentivo)
  sasMaxHours: 4,           // SAS raggiunto se ore medie < sasMaxHours (meno è meglio)
  kpi: [
    {k:"sy",  label:"Shopper Yield",      weight:0.50, threshold:0.995},
    {k:"sr",  label:"Subscription Rate",  weight:0.35, threshold:0.995},
    {k:"sas", label:"Seek & Send",        weight:0.15, threshold:0.995},
    {k:"acc", label:"Accuracy",           weight:0.00, threshold:0.995}
  ],
  // KPI config for stores with No SAS flag (SAS weight redistributed)
  kpi_nosas: [
    {k:"sy",  label:"Shopper Yield",      weight:0.57, threshold:0.995},
    {k:"sr",  label:"Subscription Rate",  weight:0.43, threshold:0.995},
    {k:"sas", label:"Seek & Send",        weight:0.00, threshold:0.995},
    {k:"acc", label:"Accuracy",           weight:0.00, threshold:0.995}
  ],
  // KPI config for stores with No Accuracy flag (Accuracy weight redistributed)
  kpi_noacc: [
    {k:"sy",  label:"Shopper Yield",      weight:0.50, threshold:0.995},
    {k:"sr",  label:"Subscription Rate",  weight:0.35, threshold:0.995},
    {k:"sas", label:"Seek & Send",        weight:0.15, threshold:0.995},
    {k:"acc", label:"Accuracy",           weight:0.00, threshold:0.995}
  ],
  molt_turnover: [
    {from:-Infinity, to:-1,    coeff:0.00, label:"< -1%"},
    {from:-1,        to:0,     coeff:0.80, label:"-1% a 0%"},
    {from:0,         to:0.5,   coeff:1.00, label:"0% a 0.5%"},
    {from:0.5,       to:1.5,   coeff:1.30, label:"0.5% a 1.5%"},
    {from:1.5,       to:3.0,   coeff:1.40, label:"1.5% a 2.99%"},
    {from:3.0,       to:Infinity, coeff:1.50, label:"> 3%"}
  ],
  molt_inventario: [
    {from:-0.0015, to:Infinity,   coeff:1.00, label:"\u2265 -0,15%"},
    {from:-0.0020, to:-0.0015,    coeff:0.80, label:"-0,20% a -0,15%"},
    {from:-0.0050, to:-0.0020,    coeff:0.50, label:"-0,50% a -0,20%"},
    {from:-Infinity, to:-0.0050,  coeff:0.00, label:"< -0,50%"}
  ]
};
// Per-employee seasonal inputs {matricola: {sy_pct, sr_pct, sas_pct, acc_pct, scost, inv, excluded}}
var SEAS = {};
var SEAS_TARGETS={"1001":{"to":7370501.24,"pr":0.251024,"sy":103.227506,"sas":4,"acc":0.99},"1002":{"to":1515582.67,"pr":0.34493,"sy":114.771346,"sas":4,"acc":0.99},"1004":{"to":664061.6,"pr":0.270325,"sy":81.038743,"sas":4,"acc":0.99},"1006":{"to":1445975.43,"pr":0.215066,"sy":68.52298,"sas":4,"acc":0.99},"1008":{"to":781428.8,"pr":0.2742,"sy":94.652746,"sas":4,"acc":0.99},"1010":{"to":740459.1,"pr":0.282119,"sy":76.894335,"sas":4,"acc":0.99},"1012":{"to":411097.5,"pr":0.165475,"sy":49.645346,"sas":4,"acc":0.99},"1014":{"to":850250.31,"pr":0.268891,"sy":75.883079,"sas":4,"acc":0.99},"1015":{"to":2844896.38,"pr":0.36115,"sy":114.487805,"sas":4,"acc":0.99},"1017":{"to":847915.76,"pr":0.261838,"sy":75.658321,"sas":4,"acc":0.99},"1020":{"to":795252.7,"pr":0.28971,"sy":101.071901,"sas":4,"acc":0.99},"1022":{"to":1518753.07,"pr":0.216728,"sy":77.393889,"sas":4,"acc":0.99},"1024":{"to":442995.64,"pr":0.217497,"sy":60.768221,"sas":4,"acc":0.99},"1025":{"to":845948.99,"pr":0.245227,"sy":76.276368,"sas":4,"acc":0.99},"1026":{"to":804501.49,"pr":0.20503,"sy":68.290306,"sas":4,"acc":0.99},"1027":{"to":678116.39,"pr":0.29137,"sy":86.325546,"sas":4,"acc":0.99},"1029":{"to":2977008.3,"pr":0.242601,"sy":122.305259,"sas":4,"acc":0.99},"1030":{"to":693398.02,"pr":0.176844,"sy":59.822462,"sas":4,"acc":0.99},"1031":{"to":1361970.01,"pr":0.291608,"sy":99.35089,"sas":4,"acc":0.99},"1032":{"to":1550799.23,"pr":0.250297,"sy":92.216694,"sas":4,"acc":0.99},"1033":{"to":637540.71,"pr":0.276873,"sy":82.191963,"sas":4,"acc":0.99},"1034":{"to":881152.43,"pr":0.193181,"sy":63.132485,"sas":4,"acc":0.99},"1035":{"to":546400.98,"pr":0.281271,"sy":80.006109,"sas":4,"acc":0.99},"1036":{"to":1352294.47,"pr":0.203622,"sy":68.25753,"sas":4,"acc":0.99},"1037":{"to":631823.89,"pr":0.341447,"sy":108.696919,"sas":4,"acc":0.99},"1038":{"to":663264.65,"pr":0.261078,"sy":86.72455,"sas":4,"acc":0.99},"1039":{"to":1047072.72,"pr":0.325814,"sy":94.304182,"sas":4,"acc":0.99},"1040":{"to":391438.22,"pr":0.278649,"sy":68.230336,"sas":4,"acc":0.99},"1041":{"to":1009159.49,"pr":0.263981,"sy":90.964268,"sas":4,"acc":0.99},"1042":{"to":702525.82,"pr":0.237548,"sy":68.192762,"sas":4,"acc":0.99},"1043":{"to":596987.45,"pr":0.127479,"sy":44.101768,"sas":4,"acc":0.99},"1044":{"to":883862.82,"pr":0.201469,"sy":69.931722,"sas":4,"acc":0.99},"1045":{"to":1762687.78,"pr":0.120445,"sy":51.4387,"sas":4,"acc":0.99},"1046":{"to":623305.0,"pr":0.234586,"sy":80.912776,"sas":4,"acc":0.99},"1047":{"to":797918.04,"pr":0.295534,"sy":96.885187,"sas":4,"acc":0.99},"1048":{"to":747632.29,"pr":0.203335,"sy":68.50821,"sas":4,"acc":0.99},"1050":{"to":3220127.63,"pr":0.246617,"sy":102.469331,"sas":4,"acc":0.99},"1101":{"to":2090757.24,"pr":0.20427,"sy":92.134616,"sas":4,"acc":0.99},"1102":{"to":2853814.44,"pr":0.211077,"sy":84.767566,"sas":4,"acc":0.99},"1103":{"to":280484.48,"pr":0.15702,"sy":54.574455,"sas":4,"acc":0.99},"1104":{"to":2103561.25,"pr":0.223252,"sy":99.760691,"sas":4,"acc":0.99},"1105":{"to":3420143.94,"pr":0.227753,"sy":89.436181,"sas":4,"acc":0.99},"1106":{"to":1691435.26,"pr":0.245172,"sy":89.881243,"sas":4,"acc":0.99},"1107":{"to":1126117.04,"pr":0.27579,"sy":103.833076,"sas":4,"acc":0.99},"1109":{"to":1837770.9,"pr":0.22735,"sy":108.374917,"sas":4,"acc":0.99},"1110":{"to":1300222.19,"pr":0.246706,"sy":95.937487,"sas":4,"acc":0.99},"1113":{"to":846892.4,"pr":0.145549,"sy":52.694126,"sas":4,"acc":0.99},"1114":{"to":11502285.03,"pr":0.110016,"sy":596.058647,"sas":4,"acc":0.99},"1115":{"to":856034.53,"pr":0.277568,"sy":86.468753,"sas":4,"acc":0.99},"1116":{"to":1751913.16,"pr":0.244847,"sy":100.3014,"sas":4,"acc":0.99},"1117":{"to":1576504.61,"pr":0.2582,"sy":105.834236,"sas":4,"acc":0.99},"1118":{"to":1302751.06,"pr":0.237214,"sy":80.482981,"sas":4,"acc":0.99},"1120":{"to":1242671.75,"pr":0.193919,"sy":73.958857,"sas":4,"acc":0.99},"1121":{"to":1594647.28,"pr":0.198684,"sy":72.541649,"sas":4,"acc":0.99},"1123":{"to":7611036.76,"pr":0.175775,"sy":812.572226,"sas":4,"acc":0.99},"1125":{"to":496911781.88,"pr":0.205428,"sy":32539.835876,"sas":4,"acc":0.99},"1131":{"to":533398.35,"pr":0.100185,"sy":27.424396,"sas":4,"acc":0.99},"1133":{"to":932296.5,"pr":0.195876,"sy":74.272295,"sas":4,"acc":0.99},"1135":{"to":822254.05,"pr":0.14511,"sy":53.738146,"sas":4,"acc":0.99},"1137":{"to":645036.87,"pr":0.168292,"sy":50.000599,"sas":4,"acc":0.99},"1138":{"to":517834.08,"pr":0.172734,"sy":49.771521,"sas":4,"acc":0.99},"1148":{"to":1709905.42,"pr":0.403511,"sy":174.818246,"sas":4,"acc":0.99},"1149":{"to":1697540.36,"pr":0.212442,"sy":71.106573,"sas":4,"acc":0.99},"1152":{"to":2036556.54,"pr":0.159702,"sy":62.235991,"sas":4,"acc":0.99},"1155":{"to":1188687.14,"pr":0.120826,"sy":98.846951,"sas":4,"acc":0.99},"1158":{"to":535269.17,"pr":0.246025,"sy":80.559278,"sas":4,"acc":0.99},"1159":{"to":490366.09,"pr":0.148384,"sy":46.463083,"sas":4,"acc":0.99},"1160":{"to":860955.03,"pr":0.168005,"sy":50.778534,"sas":4,"acc":0.99},"1161":{"to":1165086.41,"pr":0.242796,"sy":74.858893,"sas":4,"acc":0.99},"1162":{"to":121648683.64,"pr":0.15711,"sy":8445.550766,"sas":4,"acc":0.99},"1163":{"to":86004543.42,"pr":0.42287,"sy":22589.258331,"sas":4,"acc":0.99},"1165":{"to":1371668.46,"pr":0.205348,"sy":81.606357,"sas":4,"acc":0.99},"1167":{"to":137213790.82,"pr":0.10969,"sy":5477.084758,"sas":4,"acc":0.99},"1168":{"to":375894.01,"pr":0.181821,"sy":54.450892,"sas":4,"acc":0.99},"1169":{"to":138576782.56,"pr":0.121953,"sy":5453.329146,"sas":4,"acc":0.99},"1170":{"to":128160725.47,"pr":0.146413,"sy":6801.15737,"sas":4,"acc":0.99},"1171":{"to":1338351.59,"pr":0.213714,"sy":80.016981,"sas":4,"acc":0.99},"1172":{"to":1953741.31,"pr":0.118227,"sy":114.803625,"sas":4,"acc":0.99},"1173":{"to":219504641.46,"pr":0.097576,"sy":4985.662337,"sas":4,"acc":0.99},"1174":{"to":68636696.51,"pr":0.087257,"sy":4244.523355,"sas":4,"acc":0.99},"1177":{"to":3368612.88,"pr":0.139386,"sy":58.162846,"sas":4,"acc":0.99},"1178":{"to":492211.31,"pr":0.146445,"sy":45.382477,"sas":4,"acc":0.99},"1180":{"to":76396911.65,"pr":0.095159,"sy":4086.493497,"sas":4,"acc":0.99},"1181":{"to":54516839.22,"pr":0.083887,"sy":3077.550662,"sas":4,"acc":0.99},"1182":{"to":125826096.82,"pr":0.133609,"sy":5510.173957,"sas":4,"acc":0.99},"1184":{"to":57664981.76,"pr":0.081931,"sy":3285.508728,"sas":4,"acc":0.99},"1185":{"to":1042871.27,"pr":0.10267,"sy":37.463783,"sas":4,"acc":0.99},"1186":{"to":754234.83,"pr":0.15449,"sy":48.189218,"sas":4,"acc":0.99},"1187":{"to":297357.43,"pr":0.01,"sy":3.081424,"sas":4,"acc":0.99},"1188":{"to":326079.29,"pr":0.01,"sy":2.929733,"sas":4,"acc":0.99},"1189":{"to":365856.33,"pr":0.01,"sy":3.184128,"sas":4,"acc":0.99},"1190":{"to":323578.02,"pr":0.01,"sy":2.751514,"sas":4,"acc":0.99},"1191":{"to":631943.35,"pr":0.01,"sy":3.699903,"sas":4,"acc":0.99},"1192":{"to":392074.4,"pr":null,"sy":null,"sas":4,"acc":0.99},"1194":{"to":271740.8,"pr":0.01,"sy":2.848436,"sas":4,"acc":0.99},"1195":{"to":2757528.93,"pr":0.180222,"sy":69.4575,"sas":4,"acc":0.99},"1197":{"to":344150.44,"pr":0.01,"sy":3.441504,"sas":4,"acc":0.99},"1198":{"to":680674.49,"pr":0.01,"sy":8.648977,"sas":4,"acc":0.99},"1199":{"to":71026585.75,"pr":0.123914,"sy":4903.158946,"sas":4,"acc":0.99},"1300":{"to":92445540.39,"pr":0.116895,"sy":4452.601638,"sas":4,"acc":0.99},"1302":{"to":33261541.54,"pr":0.06278,"sy":1973.693266,"sas":4,"acc":0.99},"1303":{"to":258305.02,"pr":0.01,"sy":3.093473,"sas":4,"acc":0.99},"1304":{"to":274200.57,"pr":null,"sy":null,"sas":4,"acc":0.99},"1305":{"to":356221.19,"pr":0.01,"sy":3.078835,"sas":4,"acc":0.99},"1306":{"to":57436620.7,"pr":0.119038,"sy":5608.79334,"sas":4,"acc":0.99},"1308":{"to":42075304.69,"pr":0.06031,"sy":1863.124753,"sas":4,"acc":0.99},"1309":{"to":800733.57,"pr":0.174367,"sy":57.481181,"sas":4,"acc":0.99},"1310":{"to":2850543.94,"pr":null,"sy":null,"sas":4,"acc":0.99},"1312":{"to":358700.22,"pr":0.01,"sy":4.071512,"sas":4,"acc":0.99},"1313":{"to":21248930.49,"pr":0.079845,"sy":4058.901747,"sas":4,"acc":0.99},"1314":{"to":23024963.87,"pr":0.05905,"sy":1824.998552,"sas":4,"acc":0.99},"1315":{"to":42369120.21,"pr":0.083672,"sy":2787.024055,"sas":4,"acc":0.99},"1316":{"to":11120650.13,"pr":0.0697,"sy":2246.70127,"sas":4,"acc":0.99},"1318":{"to":575547.56,"pr":0.012613,"sy":3.990955,"sas":4,"acc":0.99},"1319":{"to":4965920.79,"pr":0.01499,"sy":64.731227,"sas":4,"acc":0.99},"1320":{"to":0.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"1321":{"to":1247472.64,"pr":0.152573,"sy":70.232668,"sas":4,"acc":0.99},"1322":{"to":2871098.39,"pr":0.152818,"sy":79.255187,"sas":4,"acc":0.99},"1323":{"to":1866293.76,"pr":0.15254,"sy":70.799323,"sas":4,"acc":0.99},"1326":{"to":169000.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"1327":{"to":257773.01,"pr":null,"sy":null,"sas":4,"acc":0.99},"1328":{"to":394000.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"1329":{"to":166005.51,"pr":null,"sy":null,"sas":4,"acc":0.99},"1331":{"to":567203.42,"pr":0.162939,"sy":362.430297,"sas":4,"acc":0.99},"1332":{"to":302205.67,"pr":0.162939,"sy":482.756655,"sas":4,"acc":0.99},"1333":{"to":247778.17,"pr":0.162939,"sy":395.811767,"sas":4,"acc":0.99},"1334":{"to":193011.45,"pr":0.162047,"sy":411.538268,"sas":4,"acc":0.99},"1335":{"to":214754.48,"pr":0.162939,"sy":343.058278,"sas":4,"acc":0.99},"1336":{"to":152659.34,"pr":0.162047,"sy":325.499664,"sas":4,"acc":0.99},"1337":{"to":228718.96,"pr":0.162939,"sy":365.365744,"sas":4,"acc":0.99},"1338":{"to":276759.79,"pr":null,"sy":null,"sas":4,"acc":0.99},"1339":{"to":111000.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"1344":{"to":229152.53,"pr":0.01,"sy":6.902185,"sas":4,"acc":0.99},"1501":{"to":281492.75,"pr":0.121441,"sy":32.081425,"sas":4,"acc":0.99},"1507":{"to":425514.34,"pr":0.199172,"sy":51.546913,"sas":4,"acc":0.99},"1508":{"to":142418.79,"pr":0.126342,"sy":26.110005,"sas":4,"acc":0.99},"1510":{"to":59725.93,"pr":0.139678,"sy":39.350842,"sas":4,"acc":0.99},"1601":{"to":1525229.45,"pr":0.201305,"sy":66.947972,"sas":4,"acc":0.99},"1602":{"to":688037.29,"pr":0.171188,"sy":49.44141,"sas":4,"acc":0.99},"2001":{"to":914055.26,"pr":0.113544,"sy":25.816027,"sas":4,"acc":0.99},"2002":{"to":1483380.82,"pr":0.108803,"sy":27.858471,"sas":4,"acc":0.99},"2004":{"to":947960.05,"pr":0.13782,"sy":37.042209,"sas":4,"acc":0.99},"2005":{"to":509424.27,"pr":0.085107,"sy":18.316368,"sas":4,"acc":0.99},"2006":{"to":956278.99,"pr":0.081906,"sy":21.679259,"sas":4,"acc":0.99},"2007":{"to":528815.77,"pr":0.094508,"sy":23.447843,"sas":4,"acc":0.99},"2009":{"to":682525.33,"pr":0.099888,"sy":33.699664,"sas":4,"acc":0.99},"2102":{"to":0.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"2103":{"to":706093.45,"pr":0.119382,"sy":32.002661,"sas":4,"acc":0.99},"3001":{"to":3252841.54,"pr":0.332217,"sy":97.08454,"sas":4,"acc":0.99},"3002":{"to":1299774.24,"pr":0.374469,"sy":76.611052,"sas":4,"acc":0.99},"3005":{"to":1220535.05,"pr":0.183523,"sy":43.646877,"sas":4,"acc":0.99},"3006":{"to":2984692.24,"pr":0.110556,"sy":30.143112,"sas":4,"acc":0.99},"3008":{"to":1934407.53,"pr":0.118697,"sy":30.247466,"sas":4,"acc":0.99},"3009":{"to":911790.12,"pr":0.169433,"sy":39.924391,"sas":4,"acc":0.99},"3010":{"to":1435857.12,"pr":0.105939,"sy":23.384651,"sas":4,"acc":0.99},"3011":{"to":1413368.46,"pr":0.100735,"sy":22.642294,"sas":4,"acc":0.99},"3012":{"to":1720647.06,"pr":0.108161,"sy":23.115931,"sas":4,"acc":0.99},"3013":{"to":488601.76,"pr":0.397268,"sy":81.845073,"sas":4,"acc":0.99},"3014":{"to":784310.03,"pr":0.10046,"sy":23.833079,"sas":4,"acc":0.99},"3015":{"to":964436.85,"pr":0.090083,"sy":18.95696,"sas":4,"acc":0.99},"3016":{"to":853560.91,"pr":0.086094,"sy":21.543861,"sas":4,"acc":0.99},"3017":{"to":540118.28,"pr":0.263299,"sy":49.293717,"sas":4,"acc":0.99},"3101":{"to":1241077.57,"pr":0.115585,"sy":36.436396,"sas":4,"acc":0.99},"3102":{"to":1443361.17,"pr":0.135053,"sy":41.97857,"sas":4,"acc":0.99},"3104":{"to":1551610.92,"pr":0.116516,"sy":31.170323,"sas":4,"acc":0.99},"3105":{"to":1220105.76,"pr":0.114511,"sy":34.794244,"sas":4,"acc":0.99},"3108":{"to":852910.59,"pr":0.069078,"sy":14.619683,"sas":4,"acc":0.99},"3112":{"to":762447.92,"pr":0.126943,"sy":30.048799,"sas":4,"acc":0.99},"3113":{"to":702750.71,"pr":0.122581,"sy":33.234501,"sas":4,"acc":0.99},"3114":{"to":0.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"3115":{"to":79170905.54,"pr":0.133929,"sy":4138.684859,"sas":4,"acc":0.99},"3116":{"to":84893328.1,"pr":0.122817,"sy":3214.036207,"sas":4,"acc":0.99},"3118":{"to":100096422.17,"pr":0.136986,"sy":4694.234019,"sas":4,"acc":0.99},"3119":{"to":556336.1,"pr":0.148801,"sy":37.852565,"sas":4,"acc":0.99},"3120":{"to":1814377.58,"pr":0.105366,"sy":23.66897,"sas":4,"acc":0.99},"3121":{"to":56862537.98,"pr":0.149631,"sy":3830.891113,"sas":4,"acc":0.99},"3123":{"to":488555.25,"pr":0.120607,"sy":32.39327,"sas":4,"acc":0.99},"3124":{"to":403054.66,"pr":0.026915,"sy":5.537606,"sas":4,"acc":0.99},"3125":{"to":685521.71,"pr":0.099354,"sy":23.940003,"sas":4,"acc":0.99},"4001":{"to":995576.56,"pr":0.278033,"sy":38.611105,"sas":4,"acc":0.99},"5002":{"to":922288.35,"pr":0.186537,"sy":78.307266,"sas":4,"acc":0.99},"5004":{"to":601930.2,"pr":0.219748,"sy":92.434082,"sas":4,"acc":0.99},"5006":{"to":505023.0,"pr":0.171475,"sy":73.638267,"sas":4,"acc":0.99},"5013":{"to":0.0,"pr":null,"sy":null,"sas":4,"acc":0.99},"5019":{"to":828699.33,"pr":0.254116,"sy":153.488234,"sas":4,"acc":0.99},"6001":{"to":749432.18,"pr":0.120336,"sy":29.991354,"sas":4,"acc":0.99},"6005":{"to":668689.49,"pr":0.189629,"sy":44.586109,"sas":4,"acc":0.99}}; // seasonal KPI targets per store, importabili da file
