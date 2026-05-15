var IT=[{k:"rb",l:"BDG",fl:"TURNOVER TARGET",c:"#c9a96e"},{k:"rd",l:"Digital",fl:"DIGITAL TARGET",c:"#8b7ec8"},{k:"rs",l:"SY",fl:"SHOPPER YIELD",c:"#5ba4cf"},{k:"rp",l:"Privilege",fl:"PRIVILEGE",c:"#5bb98c"},{k:"rsa",l:"SAS",fl:"SAS TARGET",c:"#d4a94e"},{k:"rdc",l:"DCC",fl:"DCC TARGET",c:"#cf5b5b"},{k:"rcs",l:"CS",fl:"CUSTOMER SVC",c:"#c95ba4"},{k:"ra",l:"Articoli",fl:"ITEMS",c:"#cf8b4e"},{k:"vi",l:"Visual",fl:"VISUAL IN STORE",c:"#4eafaf"},{k:"pq",l:"QTY",fl:"QTY (DEPT)",c:"#9b6ec9"}];
var CS={EUR:"\u20ac",GBP:"\u00a3",CHF:"CHF ",USD:"$",HKD:"HK$",SGD:"S$",SEK:"kr ",MOP:"MOP ",HUF:"Ft ",DKK:"kr "};
function fc(v,c,d){d=d===undefined?0:d;if(!v&&v!==0)return(CS[c]||c+" ")+"0";var n=Math.abs(Number(v)).toFixed(d);var parts=n.split(".");var intPart=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");var decPart=parts.length>1&&d>0?","+parts[1]:"";return(CS[c]||c+" ")+intPart+decPart}
function fcEUR(v){return"\u20ac"+Math.round(Number(v)||0).toLocaleString("it-IT")}
function fPct(v){var n=(Number(v||0)*100).toFixed(2);return n.replace(".",",")+"%"}
function fDec(v,d){d=d===undefined?2:d;return Number(v||0).toFixed(d).replace(".",",")}
function esc(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
