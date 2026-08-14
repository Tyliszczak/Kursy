const SHEETS={COMPANIES:'Companies',ADMINS:'Admins',VERIFICATIONS:'Verifications',SESSIONS:'Sessions',LICENSES:'Licenses',HISTORY:'LicenseHistory',PAYMENTS:'Payments',ROUTES:'Routes'};
const HEADERS={
  Companies:['id','name','country','taxId','status','createdAt','updatedAt'],
  Admins:['id','companyId','name','email','phone','passwordHash','passwordSalt','emailVerifiedAt','phoneVerifiedAt','createdAt'],
  Verifications:['id','companyId','channel','target','codeHash','expiresAt','attempts','usedAt','createdAt'],
  Sessions:['tokenHash','companyId','adminId','expiresAt','revokedAt','createdAt'],
  Licenses:['companyId','status','trialDays','trialStartedAt','trialEndsAt','paidEndsAt','blocked','adminDeviceLimit','driverLimit','driverDeviceLimit','updatedAt'],
  LicenseHistory:['id','companyId','type','detailsJson','createdAt'],
  Payments:['id','companyId','provider','plan','checkoutSessionId','status','amount','currency','paidAt','createdAt','updatedAt'],
  Routes:['companyId','version','routesJson','updatedAt','updatedBy']
};

function doGet(){return json_({ok:true,service:'kursy-license-api',version:'1.1.0'})}
function doPost(e){
  try{
    const body=JSON.parse(e.postData&&e.postData.contents||'{}');
    rateLimit_(body.action||'unknown');
    const actions={registerCompany:registerCompany_,verifyEmail:verifyEmail_,verifyPhone:verifyPhone_,login:login_,createCheckout:createCheckout_,confirmCheckout:confirmCheckout_,licenseStatus:licenseStatus_,loadRoutes:loadRoutes_,saveRoutes:saveRoutes_};
    if(!actions[body.action])throw apiError_('UNKNOWN_ACTION','NieobsĹ‚ugiwana operacja.');
    return json_(actions[body.action](body.payload||{}));
  }catch(error){return json_({ok:false,code:error.code||'SERVER_ERROR',message:error.publicMessage||'Operacja nie powiodĹ‚a siÄ™.'})}
}

function setup(){Object.keys(HEADERS).forEach(name=>sheet_(name));PropertiesService.getScriptProperties().setProperty('SCHEMA_VERSION','1')}

function registerCompany_(p){
  required_(p,['companyName','country','taxId','adminName','email','phone','password']);
  const country=String(p.country).toUpperCase(),taxId=normalizeTaxId_(p.taxId,country),email=normalizeEmail_(p.email),phone=normalizePhone_(p.phone,country);
  if(country==='PL'&&!validNip_(taxId))throw apiError_('INVALID_TAX_ID','NieprawidĹ‚owy NIP.');
  if(String(p.password).length<10)throw apiError_('WEAK_PASSWORD','HasĹ‚o musi mieÄ‡ co najmniej 10 znakĂłw.');
  const companies=rows_(SHEETS.COMPANIES),admins=rows_(SHEETS.ADMINS);
  if(companies.some(x=>x.country===country&&String(x.taxId)===taxId))throw apiError_('COMPANY_EXISTS','Firma o tym identyfikatorze juĹĽ istnieje. Zaloguj siÄ™ lub odzyskaj dostÄ™p.');
  if(admins.some(x=>normalizeEmail_(x.email)===email))throw apiError_('EMAIL_EXISTS','Ten e-mail ma juĹĽ konto.');
  const now=iso_(),companyId=id_('company'),adminId=id_('admin'),salt=randomToken_();
  append_(SHEETS.COMPANIES,{id:companyId,name:String(p.companyName).trim(),country,taxId,status:'pending_verification',createdAt:now,updatedAt:now});
  append_(SHEETS.ADMINS,{id:adminId,companyId,name:String(p.adminName).trim(),email,phone,passwordHash:hash_(salt+String(p.password)),passwordSalt:salt,emailVerifiedAt:'',phoneVerifiedAt:'',createdAt:now});
  append_(SHEETS.LICENSES,{companyId,status:'trial_pending',trialDays:14,trialStartedAt:'',trialEndsAt:'',paidEndsAt:'',blocked:false,adminDeviceLimit:3,driverLimit:10,driverDeviceLimit:10,updatedAt:now});
  history_(companyId,'company_registered',{country,taxIdMasked:mask_(taxId)});
  const code=createCode_(companyId,'email',email);sendEmailCode_(email,code);
  return {ok:true,companyId,next:'verify_email'};
}

function verifyEmail_(p){
  required_(p,['companyId','code']);consumeCode_(p.companyId,'email',p.code);
  updateOne_(SHEETS.ADMINS,x=>x.companyId===p.companyId,{emailVerifiedAt:iso_()});
  const admin=findOne_(SHEETS.ADMINS,x=>x.companyId===p.companyId);const code=createCode_(p.companyId,'phone',admin.phone);sendSmsCode_(admin.phone,code);
  history_(p.companyId,'admin_email_verified',{});return {ok:true,next:'verify_phone'};
}

function verifyPhone_(p){
  required_(p,['companyId','code']);const admin=findOne_(SHEETS.ADMINS,x=>x.companyId===p.companyId);
  if(!admin||!admin.emailVerifiedAt)throw apiError_('EMAIL_REQUIRED','Najpierw potwierdĹş e-mail.');
  consumeCode_(p.companyId,'phone',p.code);updateOne_(SHEETS.ADMINS,x=>x.companyId===p.companyId,{phoneVerifiedAt:iso_()});
  updateOne_(SHEETS.COMPANIES,x=>x.id===p.companyId,{status:'active',updatedAt:iso_()});history_(p.companyId,'admin_phone_verified',{});
  return {ok:true,session:createSession_(p.companyId,admin.id),licenseStatus:'trial_pending',trialStartedAt:null};
}

function login_(p){
  required_(p,['email','password']);const email=normalizeEmail_(p.email),admin=findOne_(SHEETS.ADMINS,x=>normalizeEmail_(x.email)===email);
  if(!admin||!constantEqual_(admin.passwordHash,hash_(admin.passwordSalt+String(p.password))))throw apiError_('INVALID_LOGIN','NieprawidĹ‚owy e-mail lub hasĹ‚o.');
  if(!admin.emailVerifiedAt||!admin.phoneVerifiedAt)throw apiError_('NOT_VERIFIED','DokoĹ„cz potwierdzenie e-maila i telefonu.');
  return {ok:true,session:createSession_(admin.companyId,admin.id),license:publicLicense_(admin.companyId)};
}

function createCheckout_(p){
  const auth=session_(p.sessionToken),plan=String(p.plan||'');if(!['start','company'].includes(plan))throw apiError_('INVALID_PLAN','NieprawidĹ‚owy pakiet.');
  const props=PropertiesService.getScriptProperties(),secret=props.getProperty('STRIPE_SECRET_KEY'),priceId=props.getProperty(plan==='start'?'STRIPE_PRICE_START':'STRIPE_PRICE_COMPANY');
  if(!secret||!priceId)throw apiError_('PAYMENTS_NOT_CONFIGURED','PĹ‚atnoĹ›ci nie sÄ… jeszcze skonfigurowane.');
  const success=props.getProperty('CHECKOUT_SUCCESS_URL')||'https://tyliszczak.github.io/Kursy/?checkout=success&session_id={CHECKOUT_SESSION_ID}',cancel=props.getProperty('CHECKOUT_CANCEL_URL')||'https://tyliszczak.github.io/Kursy/?checkout=cancel';
  const response=UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions',{method:'post',headers:{Authorization:'Bearer '+secret},payload:{mode:'subscription','line_items[0][price]':priceId,'line_items[0][quantity]':'1',success_url:success,cancel_url:cancel,'metadata[companyId]':auth.companyId,'metadata[plan]':plan},muteHttpExceptions:true});
  const data=JSON.parse(response.getContentText()||'{}');if(response.getResponseCode()>=300)throw apiError_('PAYMENT_PROVIDER_ERROR','Nie udaĹ‚o siÄ™ rozpoczÄ…Ä‡ pĹ‚atnoĹ›ci.');
  append_(SHEETS.PAYMENTS,{id:id_('payment'),companyId:auth.companyId,provider:'stripe',plan,checkoutSessionId:data.id,status:'pending',amount:'',currency:'',paidAt:'',createdAt:iso_(),updatedAt:iso_()});
  return {ok:true,checkoutUrl:data.url,checkoutSessionId:data.id};
}

function confirmCheckout_(p){
  required_(p,['sessionId']);const payment=findOne_(SHEETS.PAYMENTS,x=>x.checkoutSessionId===p.sessionId);if(!payment)throw apiError_('PAYMENT_NOT_FOUND','Nie znaleziono pĹ‚atnoĹ›ci.');
  const secret=PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  const response=UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(p.sessionId),{headers:{Authorization:'Bearer '+secret},muteHttpExceptions:true});const data=JSON.parse(response.getContentText()||'{}');
  if(data.payment_status!=='paid')return {ok:true,status:data.payment_status||'pending'};
  if(data.metadata&&data.metadata.companyId!==payment.companyId)throw apiError_('PAYMENT_MISMATCH','PĹ‚atnoĹ›Ä‡ nie pasuje do firmy.');
  const paidEndsAt=data.subscription?addDays_(new Date(),32):addDays_(new Date(),30);
  updateOne_(SHEETS.PAYMENTS,x=>x.checkoutSessionId===p.sessionId,{status:'paid',amount:data.amount_total||'',currency:data.currency||'',paidAt:iso_(),updatedAt:iso_()});
  updateOne_(SHEETS.LICENSES,x=>x.companyId===payment.companyId,{status:'active',paidEndsAt,blocked:false,updatedAt:iso_()});history_(payment.companyId,'paid_license_activated',{plan:payment.plan,sessionId:p.sessionId});
  return {ok:true,status:'paid',license:publicLicense_(payment.companyId)};
}

function licenseStatus_(p){const auth=session_(p.sessionToken);return {ok:true,license:publicLicense_(auth.companyId)}}

function loadRoutes_(p){
  const auth=session_(p.sessionToken),row=findOne_(SHEETS.ROUTES,x=>x.companyId===auth.companyId),company=findOne_(SHEETS.COMPANIES,x=>x.id===auth.companyId),publicCompany={id:auth.companyId,name:company&&company.name||''};
  if(!row)return {ok:true,routes:[],version:0,updatedAt:null,company:publicCompany};
  let routes;try{routes=JSON.parse(String(row.routesJson||'[]'))}catch{throw apiError_('ROUTES_CORRUPTED','Nie moĹĽna odczytaÄ‡ zapisanych tras.')}
  return {ok:true,routes:Array.isArray(routes)?routes:[],version:Number(row.version)||0,updatedAt:row.updatedAt||null,company:publicCompany};
}

function saveRoutes_(p){
  const auth=session_(p.sessionToken),routes=p.routes,expected=Number(p.expectedVersion)||0;
  if(!Array.isArray(routes))throw apiError_('VALIDATION_ERROR','NieprawidĹ‚owy format tras.');
  const json=JSON.stringify(routes);
  if(json.length>4500000)throw apiError_('DATA_TOO_LARGE','Dane tras sÄ… zbyt duĹĽe do zapisania.');
  assertRouteWriteAllowed_(auth.companyId);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw apiError_('SAVE_BUSY','Inny zapis jest w toku. SprĂłbuj ponownie.');
  try{
    const current=findOne_(SHEETS.ROUTES,x=>x.companyId===auth.companyId),version=current?Number(current.version)||0:0;
    if(version!==expected){
      const error=apiError_('VERSION_CONFLICT','Trasy zostaĹ‚y zmienione na innym urzÄ…dzeniu. OdĹ›wieĹĽ dane przed ponownym zapisem.');
      error.currentVersion=version;throw error;
    }
    const now=iso_(),next=version+1;
    if(current)updateOne_(SHEETS.ROUTES,x=>x.companyId===auth.companyId,{version:next,routesJson:json,updatedAt:now,updatedBy:auth.adminId});
    else append_(SHEETS.ROUTES,{companyId:auth.companyId,version:next,routesJson:json,updatedAt:now,updatedBy:auth.adminId});
    history_(auth.companyId,'routes_published',{version:next,routeCount:routes.length,adminId:auth.adminId});
    return {ok:true,routes:routes,version:next,updatedAt:now};
  }finally{lock.releaseLock()}
}

function assertRouteWriteAllowed_(companyId){
  const l=findOne_(SHEETS.LICENSES,x=>x.companyId===companyId);
  if(!l||String(l.blocked)==='true'||l.status==='blocked')throw apiError_('COMPANY_BLOCKED','DostÄ™p firmy jest zablokowany.');
  const now=new Date();
  if(l.status==='expired'||(l.status==='trial_active'&&l.trialEndsAt&&new Date(l.trialEndsAt)<now)||(l.status==='active'&&l.paidEndsAt&&new Date(l.paidEndsAt)<now))throw apiError_('LICENSE_EXPIRED','Licencja wygasĹ‚a. Dane pozostajÄ… bezpieczne, ale zapis zmian jest zablokowany.');
  if(!['trial_pending','trial_active','active'].includes(String(l.status)))throw apiError_('LICENSE_REQUIRED','Brak uprawnienia do zapisu tras.');
}
function publicLicense_(companyId){const l=findOne_(SHEETS.LICENSES,x=>x.companyId===companyId);if(!l)throw apiError_('LICENSE_NOT_FOUND','Brak licencji.');return {status:l.status,trialDays:Number(l.trialDays),trialStartedAt:l.trialStartedAt||null,trialEndsAt:l.trialEndsAt||null,paidEndsAt:l.paidEndsAt||null,blocked:String(l.blocked)==='true',limits:{adminDevices:Number(l.adminDeviceLimit),drivers:Number(l.driverLimit),driverDevices:Number(l.driverDeviceLimit)}}}

function createCode_(companyId,channel,target){const code=String(Math.floor(100000+Math.random()*900000)),pepper=secret_('OTP_PEPPER');append_(SHEETS.VERIFICATIONS,{id:id_('verify'),companyId,channel,target,codeHash:hash_(pepper+code),expiresAt:new Date(Date.now()+10*60000).toISOString(),attempts:0,usedAt:'',createdAt:iso_()});return code}
function consumeCode_(companyId,channel,code){const all=rows_(SHEETS.VERIFICATIONS),record=[...all].reverse().find(x=>x.companyId===companyId&&x.channel===channel&&!x.usedAt);if(!record||new Date(record.expiresAt)<new Date())throw apiError_('CODE_EXPIRED','Kod wygasĹ‚.');if(Number(record.attempts)>=5)throw apiError_('CODE_LOCKED','Przekroczono liczbÄ™ prĂłb.');if(!constantEqual_(record.codeHash,hash_(secret_('OTP_PEPPER')+String(code)))){updateOne_(SHEETS.VERIFICATIONS,x=>x.id===record.id,{attempts:Number(record.attempts)+1});throw apiError_('INVALID_CODE','NieprawidĹ‚owy kod.')}updateOne_(SHEETS.VERIFICATIONS,x=>x.id===record.id,{usedAt:iso_()})}
function sendEmailCode_(email,code){MailApp.sendEmail({to:email,subject:'Kursy â€” kod potwierdzajÄ…cy',htmlBody:'TwĂłj kod potwierdzajÄ…cy: <b>'+code+'</b><br>Kod jest waĹĽny 10 minut.'})}
function sendSmsCode_(phone,code){const props=PropertiesService.getScriptProperties(),token=props.getProperty('SMSAPI_TOKEN');if(!token){if(props.getProperty('ALLOW_TEST_CODES')==='true')return;throw apiError_('SMS_NOT_CONFIGURED','WysyĹ‚ka SMS nie jest jeszcze skonfigurowana.')}const response=UrlFetchApp.fetch('https://api.smsapi.pl/sms.do',{method:'post',headers:{Authorization:'Bearer '+token},payload:{to:phone,message:'Kursy: kod potwierdzajÄ…cy '+code,format:'json'},muteHttpExceptions:true});if(response.getResponseCode()>=300)throw apiError_('SMS_FAILED','Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ SMS-a.')}

function createSession_(companyId,adminId){const token=randomToken_(),now=new Date(),expires=new Date(+now+24*60*60*1000).toISOString();append_(SHEETS.SESSIONS,{tokenHash:hash_(token),companyId,adminId,expiresAt:expires,revokedAt:'',createdAt:now.toISOString()});return {token,companyId,expiresAt:expires}}
function session_(token){if(!token)throw apiError_('UNAUTHORIZED','Zaloguj siÄ™.');const s=findOne_(SHEETS.SESSIONS,x=>constantEqual_(x.tokenHash,hash_(token))&&!x.revokedAt);if(!s||new Date(s.expiresAt)<new Date())throw apiError_('SESSION_EXPIRED','Sesja wygasĹ‚a.');return s}
function rateLimit_(action){const cache=CacheService.getScriptCache(),key='rate:'+action+':'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmm'),count=Number(cache.get(key)||0)+1;if(count>120)throw apiError_('RATE_LIMIT','Zbyt wiele ĹĽÄ…daĹ„. SprĂłbuj za chwilÄ™.');cache.put(key,String(count),70)}
function history_(companyId,type,details){append_(SHEETS.HISTORY,{id:id_('history'),companyId,type,detailsJson:JSON.stringify(details||{}),createdAt:iso_()})}
function sheet_(name){const ss=SpreadsheetApp.openById(secret_('SPREADSHEET_ID'));let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);const headers=HEADERS[name];if(sh.getLastRow()===0)sh.appendRow(headers);return sh}
function rows_(name){const sh=sheet_(name),values=sh.getDataRange().getValues(),headers=values.shift()||HEADERS[name];return values.filter(r=>r.some(v=>v!=='' )).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])))}
function append_(name,obj){const h=HEADERS[name];sheet_(name).appendRow(h.map(k=>obj[k]===undefined?'':obj[k]))}
function findOne_(name,predicate){return rows_(name).find(predicate)}
function updateOne_(name,predicate,patch){const sh=sheet_(name),values=sh.getDataRange().getValues(),headers=values[0];for(let i=1;i<values.length;i++){const obj=Object.fromEntries(headers.map((h,j)=>[h,values[i][j]]));if(predicate(obj)){Object.entries(patch).forEach(([k,v])=>{const col=headers.indexOf(k);if(col>=0)sh.getRange(i+1,col+1).setValue(v)});return}}throw apiError_('ROW_NOT_FOUND','Nie znaleziono danych.')}
function required_(obj,keys){keys.forEach(k=>{if(obj[k]===undefined||obj[k]===null||String(obj[k]).trim()==='')throw apiError_('VALIDATION_ERROR','UzupeĹ‚nij wymagane pola.')})}
function normalizeEmail_(v){return String(v).trim().toLowerCase()}
function normalizePhone_(v,country){let raw=String(v).replace(/[^\d+]/g,'');if(country==='PL'){let d=raw.replace(/\D/g,'').replace(/^0048/,'');if(d.length===11&&d.startsWith('48'))d=d.slice(2);return d.length===9?'+48'+d:raw}return raw.startsWith('+')?raw:'+'+raw.replace(/\D/g,'')}
function normalizeTaxId_(v,country){let x=String(v).toUpperCase().replace(/[\s.-]/g,'');return country==='PL'?x.replace(/^PL/,''):x}
function validNip_(v){if(!/^\d{10}$/.test(v))return false;const w=[6,5,7,2,3,4,5,6,7],c=w.reduce((s,n,i)=>s+n*Number(v[i]),0)%11;return c!==10&&c===Number(v[9])}
function constantEqual_(a,b){a=String(a);b=String(b);let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function hash_(v){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v)))}
function randomToken_(){return Utilities.getUuid()+Utilities.getUuid()}
function id_(prefix){return prefix+'_'+Utilities.getUuid()}
function iso_(){return new Date().toISOString()}
function addDays_(date,days){return new Date(+date+days*86400000).toISOString()}
function mask_(v){return String(v).slice(0,3)+'***'+String(v).slice(-3)}
function secret_(name){const value=PropertiesService.getScriptProperties().getProperty(name);if(!value)throw apiError_('CONFIGURATION_ERROR','Brak konfiguracji serwera: '+name);return value}
function apiError_(code,message){const e=new Error(code);e.code=code;e.publicMessage=message;return e}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}

