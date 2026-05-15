// ── FC+VM DATA ─────────────────────────────────────────────────────
var FC_EMP={};     // {matricola:{m,c,n,j,cu,ex,ib,lang}}
var FC_MAP={};     // {store_id:{fc:"matr",vm:"matr"}}
var FC_TARGETS={}; // {store_id:{to_eur,sy_cy,sy_ly}}
var FC_RESULTS={}; // {store_id:{sc_eur,sy_cy,sy_ly}}
var FC_SYLY={};   // {store_id:{sales_ly,footfall_ly,sy_ly}} — dati LY per calcolo SY LY area
var MONTHLY_SYLY={};  // {store_id: sy_value} — SY LY mensile (da file "SY Gross VAT After Returns")
var FC_STORE_FLAGS={}; // {store_id:{excl_fatt:bool, excl_sy:bool}}
var AGG_FCVM={};       // {matricola: importo aggiunta manuale FC+VM}
var _fcZipBlobs={};   // {fcKey: Blob} — ZIP blobs in memoria dopo generazione
var _fcZipMetas={};   // {fcKey: {email,fileName,period,typeLabel}} — metadati per EML
var FC_OVERRIDES={};   // {matr: '100'|'60'} — override manuale esito premio area
var FC_PREV_RESULTS={}; // {store_id:{to_eur,sc_eur}} — risultati mese precedente
var FCVM_PARAMS={soglia100:0.995,soglia60:0.95,pct60:0.60};
