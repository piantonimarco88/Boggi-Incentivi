var MONTH_NAMES={
  IT:["","GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO","LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"],
  EN:["","JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"],
  FR:["","JANVIER","F\u00c9VRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AO\u00dbT","SEPTEMBRE","OCTOBRE","NOVEMBRE","D\u00c9CEMBRE"],
  DE:["","JANUAR","FEBRUAR","M\u00c4RZ","APRIL","MAI","JUNI","JULI","AUGUST","SEPTEMBER","OKTOBER","NOVEMBER","DEZEMBER"],
  ES:["","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"]
};
function getMonthName(lang){var map={"ITALIANO":"IT","INGLESE":"EN","FRANCESE":"FR","TEDESCO":"DE","SPAGNOLO":"ES"};return(MONTH_NAMES[map[lang]||"EN"]||MONTH_NAMES.EN)[CFG_MONTH]||""}
function getMonthYearLabel(){if(PRIZE_MODE==="seasonal")return CFG_SEASON+" "+CFG_YEAR;return MONTH_NAMES.IT[CFG_MONTH]+" "+CFG_YEAR}
function getPdfSubfolder(){if(PRIZE_MODE==="fcvm"){var mensileBase=MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR;var base=mensileBase+"/FCVM";return{prev:base+"/Preventivo",cons:base+"/Consuntivo",base:base};}if(PRIZE_MODE==="seasonal"){var yr2=String(CFG_YEAR).slice(-2);var base=CFG_SEASON+yr2+"_"+CFG_YEAR;if(SEASON_PERIOD==="mid")return{prev:base+"/Mid-Season/Preventivo",cons:base+"/Mid-Season/Consuntivo",base:base+"/Mid-Season"};return{prev:base+"/Preventivo",cons:base+"/Consuntivo",base:base};}return{prev:MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR+"/Preventivo",cons:MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR+"/Consuntivo",base:MONTH_NAMES.IT[CFG_MONTH]+"_"+CFG_YEAR};}
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
