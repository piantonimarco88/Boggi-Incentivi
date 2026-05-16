// Initialize STORE_FLAGS from DEPT list if not already set
function initStoreFlags(){DEPT.forEach(function(sid){var k=String(sid);if(!STORE_FLAGS[k])STORE_FLAGS[k]={dept:true,noSas:false,noDig:false}})}
function isD(s){var sf=STORE_FLAGS[String(s)];return sf?sf.dept:false}
