var RL=[
  "SM","VSM","SSA","SSAP","SA","JSA","SCS",
  "SM DEPT","VSM DEPT","SSA DEPT","SSAP DEPT","SA DEPT","JSA DEPT","SCS DEPT",
  "SM NO SAS","VSM NO SAS","SSA NO SAS","SSAP NO SAS","SA NO SAS","JSA NO SAS","SCS NO SAS",
  "SM NO DIGITAL","VSM NO DIGITAL","SSA NO DIGITAL","SSAP NO DIGITAL","SA NO DIGITAL","JSA NO DIGITAL","SCS NO DIGITAL",
  "SCS NO SAS NO DIGITAL",
  "SM NO DIGITAL NO SY NO PRIVILEGE","VSM NO DIGITAL NO SY NO PRIVILEGE","SSA NO DIGITAL NO SY NO PRIVILEGE","SSAP NO DIGITAL NO SY NO PRIVILEGE","SA NO DIGITAL NO SY NO PRIVILEGE","JSA NO DIGITAL NO SY NO PRIVILEGE",
  "SCS NO DIGITAL NO PRIVILEGE"
];
var KP=["BDG","Digital","SY","Privilege","SAS","DCC","CS","Articoli","Visual","QTY Dept"];
var TC={};
function initTC(){RL.forEach(function(r){TC[r]={};KP.forEach(function(k){
  var isSCS=r.indexOf("SCS")>=0,isDept=r.indexOf("DEPT")>=0,isNoSas=r.indexOf("NO SAS")>=0,isNoDig=r.indexOf("NO DIGITAL")>=0,isNoSY=r.indexOf("NO SY")>=0,isNoPriv=r.indexOf("NO PRIVILEGE")>=0;
  if(k==="BDG")TC[r][k]=true;
  else if(k==="Digital")TC[r][k]=!isNoDig&&!isDept;
  else if(k==="SY")TC[r][k]=!isSCS&&!isDept&&!isNoSY;
  else if(k==="Privilege")TC[r][k]=!isDept&&!isNoPriv;
  else if(k==="SAS")TC[r][k]=isSCS&&!isNoSas;
  else if(k==="DCC")TC[r][k]=isSCS;
  else if(k==="CS")TC[r][k]=false;
  else if(k==="Articoli")TC[r][k]=true;
  else if(k==="Visual")TC[r][k]=false;
  else if(k==="QTY Dept")TC[r][k]=isDept})})}
initTC();
