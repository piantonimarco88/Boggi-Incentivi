var MONTH_NAMES={
  IT:["","GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO","LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"],
  EN:["","JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"],
  FR:["","JANVIER","F\u00c9VRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AO\u00dbT","SEPTEMBRE","OCTOBRE","NOVEMBRE","D\u00c9CEMBRE"],
  DE:["","JANUAR","FEBRUAR","M\u00c4RZ","APRIL","MAI","JUNI","JULI","AUGUST","SEPTEMBER","OKTOBER","NOVEMBER","DEZEMBER"],
  ES:["","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"]
};
function getMonthName(lang){var map={"ITALIANO":"IT","INGLESE":"EN","FRANCESE":"FR","TEDESCO":"DE","SPAGNOLO":"ES"};return(MONTH_NAMES[map[lang]||"EN"]||MONTH_NAMES.EN)[CFG_MONTH]||""}
function getMonthYearLabel(){if(PRIZE_MODE==="seasonal")return CFG_SEASON+" "+CFG_YEAR;return MONTH_NAMES.IT[CFG_MONTH]+" "+CFG_YEAR}
function getPeriodLabelEn(){if(PRIZE_MODE==="seasonal"){var s=CFG_SEASON+String(CFG_YEAR).slice(-2);return SEASON_PERIOD==="mid"?s+" MID-SEASON":s+" "+CFG_YEAR;}return getMonthName("INGLESE")+" "+CFG_YEAR;}
// UNICA fonte di verità per il nome file PDF di un dipendente.
// Deve corrispondere esattamente al nome usato da "Salva Tutti i PDF"
// e alla colonna FILENAME del tracciato lettere (.znf).
// Ogni altra costruzione manuale del nome è un bug in attesa di manifestarsi.
function getEmpPdfFilename(e){
  var mm=String(CFG_MONTH).padStart(2,"0");
  if(PRIZE_MODE==="fcvm")return e.m+"_FCVM_"+mm+"_"+CFG_YEAR+".pdf";
  if(PRIZE_MODE==="seasonal")return e.m+"_"+CFG_SEASON+String(CFG_YEAR).slice(-2)+(SEASON_PERIOD==="mid"?"_MID":"")+".pdf";
  return e.m+"_"+mm+"_"+CFG_YEAR+".pdf";
}
// Codice fiscale: 16 char alfanumerici (persona fisica) o 11 cifre (P.IVA).
// Un valore puramente numerico sotto 11 cifre è quasi certamente una colonna
// Excel sbagliata (es. CdC) → svuotato per non sporcare il tracciato ZNF.
function sanitizeCF(cf){
  cf=String(cf||"").trim().toUpperCase();
  if(cf&&/^\d+$/.test(cf)&&cf.length<11)return "";
  return cf;
}
function getPdfSubfolder(){var r;if(PRIZE_MODE==="fcvm"){var mensileBase=MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR;var base=mensileBase+"/FCVM";r={prev:base+"/Preventivo",cons:base+"/Consuntivo",base:base};}else if(PRIZE_MODE==="seasonal"){var yr2=String(CFG_YEAR).slice(-2);var base=CFG_SEASON+yr2+"_"+CFG_YEAR;if(SEASON_PERIOD==="mid")r={prev:base+"/Mid-Season/Preventivo",cons:base+"/Mid-Season/Consuntivo",base:base+"/Mid-Season"};else r={prev:base+"/Preventivo",cons:base+"/Consuntivo",base:base};}else{r={prev:MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR+"/Preventivo",cons:MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR+"/Consuntivo",base:MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR};}r.fileBase=r.base.replace(/\//g,'_');return r;}
function updateHeader(){var el=document.getElementById("hdrPeriod");if(el)el.textContent=getMonthYearLabel();}
function updateHeaderCount(){
  var hs=document.getElementById("hs");
  if(!hs)return;
  if(PRIZE_MODE==="fcvm"){
    hs.textContent=Object.keys(FC_EMP).length+' dipendenti · '+Object.keys(FC_MAP).length+' negozi';
    return;
  }
  var siSet={};E.forEach(function(e){siSet[String(e.si)]=1;});
  hs.textContent=E.length+' dipendenti · '+Object.keys(siSet).length+' negozi';
}
