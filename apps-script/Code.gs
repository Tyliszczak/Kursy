const SHEETS={COMPANIES:'Companies',ADMINS:'Admins',VERIFICATIONS:'Verifications',SESSIONS:'Sessions',LICENSES:'Licenses',HISTORY:'LicenseHistory',PAYMENTS:'Payments',ROUTES:'Routes',DRIVERS:'Drivers',DEVICES:'Devices',OWNER_SESSIONS:'OwnerSessions'};
const HEADERS={
  Companies:['id','name','country','taxId','adminEmail','status','createdAt','updatedAt'],
  Admins:['id','companyId','name','email','phone','passwordHash','passwordSalt','emailVerifiedAt','phoneVerifiedAt','createdAt'],
  Verifications:['id','companyId','channel','target','codeHash','expiresAt','attempts','usedAt','createdAt'],
  Sessions:['tokenHash','companyId','adminId','expiresAt','revokedAt','createdAt'],
  Licenses:['companyId','status','trialDays','trialStartedAt','trialEndsAt','paidEndsAt','blocked','adminDeviceLimit','driverLimit','driverDeviceLimit','monthlyPrice','currency','statusBeforeBlock','updatedAt'],
  LicenseHistory:['id','companyId','type','detailsJson','createdAt'],
  Payments:['id','companyId','provider','plan','checkoutSessionId','status','amount','currency','paidAt','createdAt','updatedAt'],
  Routes:['companyId','version','routesJson','updatedAt','updatedBy'],
  Drivers:['id','companyId','name','phone','email','status','activationTokenHash','activatedAt','deletedAt','createdAt','updatedAt'],
  Devices:['id','companyId','userId','role','deviceId','fingerprintHash','activatedAt','lastSeenAt','releasedAt'],
  OwnerSessions:['tokenHash','email','expiresAt','createdAt']
};

function doGet(){return json_({ok:true,service:'kursy-license-api',version:'1.2.0'})}
function doPost(e){
  try{
    const body=JSON.parse(e.postData&&e.postData.contents||'{}');
    rateLimit_(body.action||'unknown');
    const actions={registerCompany:registerCompany_,verifyEmail:verifyEmail_,verifyPhone:verifyPhone_,login:login_,createCheckout:createCheckout_,confirmCheckout:confirmCheckout_,licenseStatus:licenseStatus_,loadRoutes:loadRoutes_,saveRoutes:saveRoutes_,companySnapshot:companySnapshot_,activateAdminDevice:activateAdminDevice_,addDriver:addDriver_,createDriverActivation:createDriverActivation_,setDriverBlocked:setDriverBlocked_,releaseDriverDevices:releaseDriverDevices_,deleteDriver:deleteDriver_,releaseDevice:releaseDevice_,driverStatus:driverStatus_,activateDriverDevice:activateDriverDevice_,driverRoutes:driverRoutes_,ownerLogin:ownerLogin_,ownerSnapshot:ownerSnapshot_,ownerCreateCompany:ownerCreateCompany_,ownerUpdateCompany:ownerUpdateCompany_,ownerUpdateLicense:ownerUpdateLicense_,ownerExtendTrial:ownerExtendTrial_,ownerEndTrial:ownerEndTrial_,ownerGrantPaid:ownerGrantPaid_,ownerSetBlocked:ownerSetBlocked_};
    if(!actions[body.action])throw apiError_('UNKNOWN_ACTION','Nieobsługiwana operacja.');
    return json_(actions[body.action](body.payload||{}));
  }catch(error){return json_({ok:false,code:error.code||'SERVER_ERROR',message:error.publicMessage||'Operacja nie powiodła się.'})}
}

function setup(){Object.keys(HEADERS).forEach(name=>sheet_(name));PropertiesService.getScriptProperties().setProperty('SCHEMA_VERSION','2')}
function setOwnerCredentials(email,password){if(!email||!password||String(password).length<12)throw new Error('Podaj e-mail i hasło właściciela o długości co najmniej 12 znaków.');const salt=randomToken_(),props=PropertiesService.getScriptProperties();props.setProperty('OWNER_EMAIL',normalizeEmail_(email));props.setProperty('OWNER_PASSWORD_SALT',salt);props.setProperty('OWNER_PASSWORD_HASH',hash_(salt+String(password)));return 'OK'}

function registerCompany_(p){
  required_(p,['companyName','country','taxId','adminName','email','phone','password']);
  const country=String(p.country).toUpperCase(),taxId=normalizeTaxId_(p.taxId,country),email=normalizeEmail_(p.email),phone=normalizePhone_(p.phone,country);
  if(country==='PL'&&!validNip_(taxId))throw apiError_('INVALID_TAX_ID','Nieprawidłowy NIP.');
  if(String(p.password).length<10)throw apiError_('WEAK_PASSWORD','Hasło musi mieć co najmniej 10 znaków.');
  const companies=rows_(SHEETS.COMPANIES),admins=rows_(SHEETS.ADMINS);
  if(companies.some(x=>x.country===country&&String(x.taxId)===taxId))throw apiError_('COMPANY_EXISTS','Firma o tym identyfikatorze już istnieje. Zaloguj się lub odzyskaj dostęp.');
  if(admins.some(x=>normalizeEmail_(x.email)===email))throw apiError_('EMAIL_EXISTS','Ten e-mail ma już konto.');
  const now=iso_(),companyId=id_('company'),adminId=id_('admin'),salt=randomToken_();
  append_(SHEETS.COMPANIES,{id:companyId,name:String(p.companyName).trim(),country,taxId,adminEmail:email,status:'pending_verification',createdAt:now,updatedAt:now});
  append_(SHEETS.ADMINS,{id:adminId,companyId,name:String(p.adminName).trim(),email,phone,passwordHash:hash_(salt+String(p.password)),passwordSalt:salt,emailVerifiedAt:'',phoneVerifiedAt:'',createdAt:now});
  append_(SHEETS.LICENSES,{companyId,status:'trial_pending',trialDays:14,trialStartedAt:'',trialEndsAt:'',paidEndsAt:'',blocked:false,adminDeviceLimit:3,driverLimit:10,driverDeviceLimit:10,monthlyPrice:'',currency:'PLN',statusBeforeBlock:'',updatedAt:now});
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
  if(!admin||!admin.emailVerifiedAt)throw apiError_('EMAIL_REQUIRED','Najpierw potwierdź e-mail.');
  consumeCode_(p.companyId,'phone',p.code);updateOne_(SHEETS.ADMINS,x=>x.companyId===p.companyId,{phoneVerifiedAt:iso_()});
  updateOne_(SHEETS.COMPANIES,x=>x.id===p.companyId,{status:'active',updatedAt:iso_()});history_(p.companyId,'admin_phone_verified',{});
  return {ok:true,session:createSession_(p.companyId,admin.id),licenseStatus:'trial_pending',trialStartedAt:null};
}

function login_(p){
  required_(p,['email','password']);const email=normalizeEmail_(p.email),admin=findOne_(SHEETS.ADMINS,x=>normalizeEmail_(x.email)===email);
  if(!admin||!constantEqual_(admin.passwordHash,hash_(admin.passwordSalt+String(p.password))))throw apiError_('INVALID_LOGIN','Nieprawidłowy e-mail lub hasło.');
  if(!admin.emailVerifiedAt||!admin.phoneVerifiedAt)throw apiError_('NOT_VERIFIED','Dokończ potwierdzenie e-maila i telefonu.');
  return {ok:true,session:createSession_(admin.companyId,admin.id),license:publicLicense_(admin.companyId)};
}

function createCheckout_(p){
  const auth=session_(p.sessionToken),plan=String(p.plan||'');if(!['start','company'].includes(plan))throw apiError_('INVALID_PLAN','Nieprawidłowy pakiet.');
  const props=PropertiesService.getScriptProperties(),secret=props.getProperty('STRIPE_SECRET_KEY'),priceId=props.getProperty(plan==='start'?'STRIPE_PRICE_START':'STRIPE_PRICE_COMPANY'),license=publicLicense_(auth.companyId),custom=Number(license.monthlyPrice)>0;
  if(!secret||(!custom&&!priceId))throw apiError_('PAYMENTS_NOT_CONFIGURED','Płatności nie są jeszcze skonfigurowane.');
  const success=props.getProperty('CHECKOUT_SUCCESS_URL')||'https://tyliszczak.github.io/Kursy/?checkout=success&session_id={CHECKOUT_SESSION_ID}',cancel=props.getProperty('CHECKOUT_CANCEL_URL')||'https://tyliszczak.github.io/Kursy/?checkout=cancel',payload={mode:'subscription','line_items[0][quantity]':'1',success_url:success,cancel_url:cancel,'metadata[companyId]':auth.companyId,'metadata[plan]':plan};
  if(custom){payload['line_items[0][price_data][currency]']=String(license.currency||'PLN').toLowerCase();payload['line_items[0][price_data][unit_amount]']=Math.round(Number(license.monthlyPrice)*100);payload['line_items[0][price_data][recurring][interval]']='month';payload['line_items[0][price_data][product_data][name]']='Kursy — licencja firmy'}else payload['line_items[0][price]']=priceId;
  const response=UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions',{method:'post',headers:{Authorization:'Bearer '+secret},payload:payload,muteHttpExceptions:true});
  const data=JSON.parse(response.getContentText()||'{}');if(response.getResponseCode()>=300)throw apiError_('PAYMENT_PROVIDER_ERROR','Nie udało się rozpocząć płatności.');
  append_(SHEETS.PAYMENTS,{id:id_('payment'),companyId:auth.companyId,provider:'stripe',plan,checkoutSessionId:data.id,status:'pending',amount:custom?Math.round(Number(license.monthlyPrice)*100):'',currency:license.currency||'',paidAt:'',createdAt:iso_(),updatedAt:iso_()});
  return {ok:true,checkoutUrl:data.url,checkoutSessionId:data.id};
}

function confirmCheckout_(p){
  required_(p,['sessionId']);const payment=findOne_(SHEETS.PAYMENTS,x=>x.checkoutSessionId===p.sessionId);if(!payment)throw apiError_('PAYMENT_NOT_FOUND','Nie znaleziono płatności.');
  const secret=PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  const response=UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(p.sessionId),{headers:{Authorization:'Bearer '+secret},muteHttpExceptions:true});const data=JSON.parse(response.getContentText()||'{}');
  if(data.payment_status!=='paid')return {ok:true,status:data.payment_status||'pending'};
  if(data.metadata&&data.metadata.companyId!==payment.companyId)throw apiError_('PAYMENT_MISMATCH','Płatność nie pasuje do firmy.');
  const paidEndsAt=data.subscription?addDays_(new Date(),32):addDays_(new Date(),30);
  updateOne_(SHEETS.PAYMENTS,x=>x.checkoutSessionId===p.sessionId,{status:'paid',amount:data.amount_total||'',currency:data.currency||'',paidAt:iso_(),updatedAt:iso_()});
  updateOne_(SHEETS.LICENSES,x=>x.companyId===payment.companyId,{status:'active',paidEndsAt,blocked:false,updatedAt:iso_()});history_(payment.companyId,'paid_license_activated',{plan:payment.plan,sessionId:p.sessionId});
  return {ok:true,status:'paid',license:publicLicense_(payment.companyId)};
}

function licenseStatus_(p){const auth=session_(p.sessionToken);return {ok:true,license:publicLicense_(auth.companyId)}}

function loadRoutes_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);const row=findOne_(SHEETS.ROUTES,x=>x.companyId===auth.companyId),company=findOne_(SHEETS.COMPANIES,x=>x.id===auth.companyId),publicCompany={id:auth.companyId,name:company&&company.name||''};
  if(!row)return {ok:true,routes:[],version:0,updatedAt:null,company:publicCompany};
  let routes;try{routes=JSON.parse(String(row.routesJson||'[]'))}catch{throw apiError_('ROUTES_CORRUPTED','Nie można odczytać zapisanych tras.')}
  return {ok:true,routes:Array.isArray(routes)?routes:[],version:Number(row.version)||0,updatedAt:row.updatedAt||null,company:publicCompany};
}

function saveRoutes_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);const routes=p.routes,expected=Number(p.expectedVersion)||0;
  if(!Array.isArray(routes))throw apiError_('VALIDATION_ERROR','Nieprawidłowy format tras.');
  const json=JSON.stringify(routes);
  if(json.length>4500000)throw apiError_('DATA_TOO_LARGE','Dane tras są zbyt duże do zapisania.');
  assertRouteWriteAllowed_(auth.companyId);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw apiError_('SAVE_BUSY','Inny zapis jest w toku. Spróbuj ponownie.');
  try{
    const current=findOne_(SHEETS.ROUTES,x=>x.companyId===auth.companyId),version=current?Number(current.version)||0:0;
    if(version!==expected){
      const error=apiError_('VERSION_CONFLICT','Trasy zostały zmienione na innym urządzeniu. Odśwież dane przed ponownym zapisem.');
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
  if(!l||String(l.blocked)==='true'||l.status==='blocked')throw apiError_('COMPANY_BLOCKED','Dostęp firmy jest zablokowany.');
  const now=new Date();
  if(l.status==='expired'||(l.status==='trial_active'&&l.trialEndsAt&&new Date(l.trialEndsAt)<now)||(l.status==='active'&&l.paidEndsAt&&new Date(l.paidEndsAt)<now))throw apiError_('LICENSE_EXPIRED','Licencja wygasła. Dane pozostają bezpieczne, ale zapis zmian jest zablokowany.');
  if(!['trial_pending','trial_active','active'].includes(String(l.status)))throw apiError_('LICENSE_REQUIRED','Brak uprawnienia do zapisu tras.');
}

function companySnapshot_(p){const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);return {ok:true,company:companySnapshotData_(auth.companyId)}}
function companySnapshotData_(companyId){
  const c=findOne_(SHEETS.COMPANIES,x=>x.id===companyId);if(!c)throw apiError_('COMPANY_NOT_FOUND','Nie znaleziono firmy.');
  const drivers=rows_(SHEETS.DRIVERS).filter(x=>x.companyId===companyId&&!x.deletedAt).map(publicDriver_);
  const devices=activeDevices_(companyId).map(publicDevice_);
  const history=rows_(SHEETS.HISTORY).filter(x=>x.companyId===companyId).slice(-100);
  return {id:c.id,name:c.name,country:c.country,taxId:c.taxId,adminEmail:c.adminEmail||'',status:c.status,license:publicLicense_(companyId),drivers:drivers,adminDevices:devices.filter(x=>x.role==='admin'),driverDevices:devices.filter(x=>x.role==='driver'),history:history.map(x=>({id:x.id,type:x.type,details:parseJson_(x.detailsJson,{}),at:x.createdAt}))};
}
function publicDriver_(d){return {id:d.id,name:d.name,phone:d.phone,email:d.email||'',status:d.status||'inactive',activatedAt:d.activatedAt||null,hasActivationLink:Boolean(d.activationTokenHash)}}
function publicDevice_(d){return {id:d.id,deviceId:d.deviceId,userId:d.userId,role:d.role,activatedAt:d.activatedAt||null,lastSeenAt:d.lastSeenAt||null}}
function activeDevices_(companyId){return rows_(SHEETS.DEVICES).filter(x=>x.companyId===companyId&&!x.releasedAt)}
function assertAdminDevice_(auth,p){required_(p,['deviceId']);const license=findOne_(SHEETS.LICENSES,x=>x.companyId===auth.companyId);if(!license||effectiveLicenseStatus_(license)==='blocked')throw apiError_('COMPANY_BLOCKED','Dostęp firmy jest zablokowany.');const ok=activeDevices_(auth.companyId).some(x=>x.role==='admin'&&x.userId===auth.adminId&&x.deviceId===String(p.deviceId));if(!ok)throw apiError_('ADMIN_DEVICE_NOT_ACTIVE','To urządzenie administratora nie jest aktywne.')}
function effectiveLicenseStatus_(l,now=new Date()){if(String(l.blocked)==='true'||l.status==='blocked')return 'blocked';if(l.status==='trial_active'&&l.trialEndsAt&&new Date(l.trialEndsAt)<=now)return 'expired';if(l.status==='active'&&l.paidEndsAt&&new Date(l.paidEndsAt)<=now)return 'expired';return String(l.status)}
function licenseAllowsDriver_(companyId){const l=findOne_(SHEETS.LICENSES,x=>x.companyId===companyId);if(!l)throw apiError_('LICENSE_NOT_FOUND','Brak licencji.');const status=effectiveLicenseStatus_(l);if(!['trial_pending','trial_active','active'].includes(status))throw apiError_(status==='blocked'?'COMPANY_BLOCKED':'LICENSE_EXPIRED',status==='blocked'?'Dostęp firmy jest zablokowany.':'Licencja firmy wygasła.');return l}
function activateAdminDevice_(p){
  const auth=session_(p.sessionToken);required_(p,['deviceId']);const l=findOne_(SHEETS.LICENSES,x=>x.companyId===auth.companyId);if(!l)throw apiError_('LICENSE_NOT_FOUND','Brak licencji.');if(effectiveLicenseStatus_(l)==='blocked')throw apiError_('COMPANY_BLOCKED','Dostęp firmy jest zablokowany.');
  const active=activeDevices_(auth.companyId).filter(x=>x.role==='admin'),known=rows_(SHEETS.DEVICES).find(x=>x.companyId===auth.companyId&&x.role==='admin'&&x.deviceId===String(p.deviceId));
  if((!known||known.releasedAt)&&active.length>=Number(l.adminDeviceLimit))throw apiError_('ADMIN_DEVICE_LIMIT','Osiągnięto limit urządzeń administratorów.');
  const now=iso_(),patch={userId:auth.adminId,fingerprintHash:hash_(String(p.fingerprint||'')),lastSeenAt:now,releasedAt:''};
  if(known)updateOne_(SHEETS.DEVICES,x=>x.id===known.id,patch);else append_(SHEETS.DEVICES,{id:id_('device'),companyId:auth.companyId,userId:auth.adminId,role:'admin',deviceId:String(p.deviceId),fingerprintHash:patch.fingerprintHash,activatedAt:now,lastSeenAt:now,releasedAt:''});
  history_(auth.companyId,'admin_device_activated',{deviceId:String(p.deviceId),adminId:auth.adminId});return {ok:true,company:companySnapshotData_(auth.companyId)};
}
function addDriver_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['name','phone']);const snapshot=companySnapshotData_(auth.companyId);
  if(snapshot.drivers.length>=snapshot.license.limits.drivers)throw apiError_('DRIVER_LIMIT','Osiągnięto limit kierowców.');
  const company=findOne_(SHEETS.COMPANIES,x=>x.id===auth.companyId),now=iso_(),driver={id:id_('driver'),companyId:auth.companyId,name:String(p.name).trim(),phone:normalizePhone_(p.phone,company&&company.country||'PL'),email:p.email?normalizeEmail_(p.email):'',status:'inactive',activationTokenHash:'',activatedAt:'',createdAt:now,updatedAt:now};
  append_(SHEETS.DRIVERS,driver);history_(auth.companyId,'driver_added',{driverId:driver.id,phoneMasked:mask_(driver.phone)});return {ok:true,driver:publicDriver_(driver),company:companySnapshotData_(auth.companyId)};
}
function setDriverBlocked_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['driverId']);const driver=findOne_(SHEETS.DRIVERS,x=>x.id===p.driverId&&x.companyId===auth.companyId);if(!driver)throw apiError_('DRIVER_NOT_FOUND','Nie znaleziono kierowcy.');const blocked=Boolean(p.blocked),status=blocked?'blocked':(driver.activatedAt?'active':'inactive');updateOne_(SHEETS.DRIVERS,x=>x.id===driver.id,{status:status,updatedAt:iso_()});history_(auth.companyId,blocked?'driver_blocked':'driver_unblocked',{driverId:driver.id});return {ok:true,company:companySnapshotData_(auth.companyId)};
}
function releaseDriverDevices_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['driverId']);const driver=findOne_(SHEETS.DRIVERS,x=>x.id===p.driverId&&x.companyId===auth.companyId&&!x.deletedAt);if(!driver)throw apiError_('DRIVER_NOT_FOUND','Nie znaleziono kierowcy.');const now=iso_(),devices=activeDevices_(auth.companyId).filter(x=>x.role==='driver'&&x.userId===driver.id);devices.forEach(device=>updateOne_(SHEETS.DEVICES,x=>x.id===device.id,{releasedAt:now}));history_(auth.companyId,'driver_devices_released',{driverId:driver.id,count:devices.length});return {ok:true,releasedCount:devices.length,company:companySnapshotData_(auth.companyId)};
}
function deleteDriver_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['driverId']);const driver=findOne_(SHEETS.DRIVERS,x=>x.id===p.driverId&&x.companyId===auth.companyId&&!x.deletedAt);if(!driver)throw apiError_('DRIVER_NOT_FOUND','Nie znaleziono kierowcy.');const now=iso_(),devices=activeDevices_(auth.companyId).filter(x=>x.role==='driver'&&x.userId===driver.id);devices.forEach(device=>updateOne_(SHEETS.DEVICES,x=>x.id===device.id,{releasedAt:now}));updateOne_(SHEETS.DRIVERS,x=>x.id===driver.id,{status:'deleted',activationTokenHash:'',deletedAt:now,updatedAt:now});history_(auth.companyId,'driver_deleted',{driverId:driver.id,releasedDeviceCount:devices.length});return {ok:true,company:companySnapshotData_(auth.companyId)};
}
function createDriverActivation_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['driverId']);const driver=findOne_(SHEETS.DRIVERS,x=>x.id===p.driverId&&x.companyId===auth.companyId);if(!driver)throw apiError_('DRIVER_NOT_FOUND','Nie znaleziono kierowcy.');
  const token=randomToken_();updateOne_(SHEETS.DRIVERS,x=>x.id===driver.id,{activationTokenHash:hash_(token),updatedAt:iso_()});history_(auth.companyId,'driver_activation_link_created',{driverId:driver.id});return {ok:true,activationToken:token};
}
function releaseDevice_(p){
  const auth=session_(p.sessionToken);required_(p,['actorDeviceId','targetDeviceId','role']);assertAdminDevice_(auth,{deviceId:p.actorDeviceId});const device=findOne_(SHEETS.DEVICES,x=>x.companyId===auth.companyId&&x.deviceId===String(p.targetDeviceId)&&x.role===String(p.role)&&!x.releasedAt);if(!device)throw apiError_('DEVICE_NOT_FOUND','Nie znaleziono aktywnego urządzenia.');
  updateOne_(SHEETS.DEVICES,x=>x.id===device.id,{releasedAt:iso_()});history_(auth.companyId,'device_released',{role:device.role,deviceId:device.deviceId});return {ok:true,company:companySnapshotData_(auth.companyId)};
}
function driverByToken_(token){if(!token)throw apiError_('INVALID_ACTIVATION','Nieprawidłowy link aktywacyjny.');const tokenHash=hash_(String(token)),driver=findOne_(SHEETS.DRIVERS,x=>!x.deletedAt&&constantEqual_(x.activationTokenHash,tokenHash));if(!driver)throw apiError_('INVALID_ACTIVATION','Nieprawidłowy lub nieaktualny link aktywacyjny.');return driver}
function driverStatus_(p){
  const driver=driverByToken_(p.activationToken),license=publicLicense_(driver.companyId),company=findOne_(SHEETS.COMPANIES,x=>x.id===driver.companyId),device=String(p.deviceId||''),active=activeDevices_(driver.companyId).some(x=>x.role==='driver'&&x.userId===driver.id&&x.deviceId===device);
  return {ok:true,driver:publicDriver_(driver),company:{id:company.id,name:company.name},license:license,activeDevice:active,mayUse:['trial_active','active'].includes(license.status)&&driver.status==='active'&&active};
}
function activateDriverDevice_(p){
  required_(p,['activationToken','deviceId']);const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw apiError_('ACTIVATION_BUSY','Inna aktywacja jest w toku. Spróbuj ponownie.');
  try{
    const driver=driverByToken_(p.activationToken);if(driver.status==='blocked')throw apiError_('DRIVER_BLOCKED','Dostęp kierowcy jest zablokowany.');const l=licenseAllowsDriver_(driver.companyId),all=rows_(SHEETS.DEVICES),active=all.filter(x=>x.companyId===driver.companyId&&x.role==='driver'&&!x.releasedAt),known=all.find(x=>x.companyId===driver.companyId&&x.role==='driver'&&x.deviceId===String(p.deviceId));
    if(known&&!known.releasedAt&&known.userId!==driver.id)throw apiError_('DEVICE_ASSIGNED','To urządzenie jest przypisane do innego kierowcy.');
    if((!known||known.releasedAt)&&active.length>=Number(l.driverDeviceLimit))throw apiError_('DRIVER_DEVICE_LIMIT','Osiągnięto limit urządzeń kierowców.');
    const now=iso_(),devicePatch={userId:driver.id,fingerprintHash:hash_(String(p.fingerprint||'')),lastSeenAt:now,releasedAt:''};
    if(known)updateOne_(SHEETS.DEVICES,x=>x.id===known.id,devicePatch);else append_(SHEETS.DEVICES,{id:id_('device'),companyId:driver.companyId,userId:driver.id,role:'driver',deviceId:String(p.deviceId),fingerprintHash:devicePatch.fingerprintHash,activatedAt:now,lastSeenAt:now,releasedAt:''});
    updateOne_(SHEETS.DRIVERS,x=>x.id===driver.id,{status:'active',activatedAt:driver.activatedAt||now,updatedAt:now});
    if(String(l.status)==='trial_pending'&&!l.trialStartedAt){const days=Math.max(1,Number(l.trialDays)||14),ends=addDays_(new Date(),days);updateOne_(SHEETS.LICENSES,x=>x.companyId===driver.companyId,{status:'trial_active',trialStartedAt:now,trialEndsAt:ends,updatedAt:now});history_(driver.companyId,'trial_started',{driverId:driver.id,deviceId:String(p.deviceId),trialDays:days})}
    history_(driver.companyId,'driver_device_activated',{driverId:driver.id,deviceId:String(p.deviceId)});return driverStatus_(p);
  }finally{lock.releaseLock()}
}
function driverRoutes_(p){
  const status=driverStatus_(p);if(!status.mayUse)throw apiError_('DRIVER_ACCESS_DENIED','Brak dostępu do tras.');const row=findOne_(SHEETS.ROUTES,x=>x.companyId===status.company.id);let source=[];if(row)source=parseJson_(row.routesJson,[]);
  const routes=(Array.isArray(source)?source:[]).map(r=>{const services=Array.isArray(r.services)?r.services:[],times=services.map(x=>String(x.targetTime||'')).filter(Boolean);return {name:r.name,times:times,stops:(r.stops||[]).map(stop=>{const values={};services.forEach(service=>values[String(service.targetTime||'')]=stop.times&&stop.times[service.id]||'');return {name:stop.name,coordinates:stop.locationOut||'',times:values}})}});return {ok:true,routes:routes,version:row?Number(row.version)||0:0,updatedAt:row&&row.updatedAt||null};
}
function ownerLogin_(p){
  required_(p,['email','password']);const props=PropertiesService.getScriptProperties(),email=normalizeEmail_(p.email),expected=props.getProperty('OWNER_EMAIL'),salt=props.getProperty('OWNER_PASSWORD_SALT'),passwordHash=props.getProperty('OWNER_PASSWORD_HASH');
  if(!expected||!salt||!passwordHash)throw apiError_('OWNER_NOT_CONFIGURED','Logowanie właściciela nie jest skonfigurowane.');if(email!==expected||!constantEqual_(passwordHash,hash_(salt+String(p.password))))throw apiError_('INVALID_OWNER_LOGIN','Nieprawidłowy e-mail lub hasło.');
  const token=randomToken_(),expires=new Date(Date.now()+8*3600000).toISOString();append_(SHEETS.OWNER_SESSIONS,{tokenHash:hash_(token),email:email,expiresAt:expires,createdAt:iso_()});return {ok:true,session:{token:token,email:email,expiresAt:expires}};
}
function ownerSession_(token){if(!token)throw apiError_('OWNER_UNAUTHORIZED','Zaloguj się jako właściciel systemu.');const s=findOne_(SHEETS.OWNER_SESSIONS,x=>constantEqual_(x.tokenHash,hash_(token)));if(!s||new Date(s.expiresAt)<new Date())throw apiError_('OWNER_SESSION_EXPIRED','Sesja właściciela wygasła.');return s}
function ownerSnapshot_(p){ownerSession_(p.ownerToken);return {ok:true,companies:rows_(SHEETS.COMPANIES).map(c=>companySnapshotData_(c.id))}}
function ownerCreateCompany_(p){
  const owner=ownerSession_(p.ownerToken);required_(p,['name']);const now=iso_(),companyId=id_('company'),email=p.adminEmail?normalizeEmail_(p.adminEmail):'',country=String(p.country||'PL').toUpperCase(),taxId=p.taxId?normalizeTaxId_(p.taxId,country):'';
  if(taxId&&rows_(SHEETS.COMPANIES).some(x=>x.country===country&&String(x.taxId)===taxId))throw apiError_('COMPANY_EXISTS','Firma o tym identyfikatorze już istnieje.');
  append_(SHEETS.COMPANIES,{id:companyId,name:String(p.name).trim(),country:country,taxId:taxId,adminEmail:email,status:'active',createdAt:now,updatedAt:now});append_(SHEETS.LICENSES,{companyId:companyId,status:'trial_pending',trialDays:Math.max(1,Number(p.trialDays)||14),trialStartedAt:'',trialEndsAt:'',paidEndsAt:'',blocked:false,adminDeviceLimit:3,driverLimit:10,driverDeviceLimit:10,monthlyPrice:p.monthlyPrice===''?'':Number(p.monthlyPrice)||'',currency:String(p.currency||'PLN').toUpperCase(),statusBeforeBlock:'',updatedAt:now});history_(companyId,'company_created_by_owner',{owner:owner.email});return {ok:true,company:companySnapshotData_(companyId)};
}
function ownerUpdateCompany_(p){ownerSession_(p.ownerToken);required_(p,['companyId','name']);const email=p.adminEmail?normalizeEmail_(p.adminEmail):'';updateOne_(SHEETS.COMPANIES,x=>x.id===p.companyId,{name:String(p.name).trim(),adminEmail:email,updatedAt:iso_()});const admin=findOne_(SHEETS.ADMINS,x=>x.companyId===p.companyId);if(admin&&email)updateOne_(SHEETS.ADMINS,x=>x.id===admin.id,{email:email});history_(p.companyId,'company_updated_by_owner',{});return {ok:true,company:companySnapshotData_(p.companyId)}}
function ownerUpdateLicense_(p){ownerSession_(p.ownerToken);required_(p,['companyId']);const patch={trialDays:Math.max(1,Number(p.trialDays)||14),adminDeviceLimit:Math.max(1,Number(p.adminDeviceLimit)||3),driverLimit:Math.max(0,Number(p.driverLimit)||0),driverDeviceLimit:Math.max(0,Number(p.driverDeviceLimit)||0),monthlyPrice:p.monthlyPrice===''||p.monthlyPrice===null?'':Math.max(0,Number(p.monthlyPrice)),currency:String(p.currency||'PLN').toUpperCase(),updatedAt:iso_()};updateOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId,patch);history_(p.companyId,'license_limits_updated',patch);return {ok:true,company:companySnapshotData_(p.companyId)}}
function ownerExtendTrial_(p){ownerSession_(p.ownerToken);required_(p,['companyId']);const l=findOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId),days=Math.max(1,Number(p.days)||Number(l.trialDays)||14),base=l.trialEndsAt&&new Date(l.trialEndsAt)>new Date()?new Date(l.trialEndsAt):new Date(),end=addDays_(base,days),start=l.trialStartedAt||iso_();updateOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId,{status:'trial_active',trialStartedAt:start,trialEndsAt:end,blocked:false,updatedAt:iso_()});history_(p.companyId,'trial_extended',{days:days,trialEndsAt:end});return {ok:true,company:companySnapshotData_(p.companyId)}}
function ownerEndTrial_(p){ownerSession_(p.ownerToken);required_(p,['companyId']);const now=iso_();updateOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId,{status:'expired',trialEndsAt:now,updatedAt:now});history_(p.companyId,'trial_ended',{});return {ok:true,company:companySnapshotData_(p.companyId)}}
function ownerGrantPaid_(p){ownerSession_(p.ownerToken);required_(p,['companyId']);const days=Math.max(1,Number(p.days)||365),end=addDays_(new Date(),days);updateOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId,{status:'active',paidEndsAt:end,blocked:false,updatedAt:iso_()});history_(p.companyId,'paid_license_granted',{days:days,paidEndsAt:end});return {ok:true,company:companySnapshotData_(p.companyId)}}
function ownerSetBlocked_(p){ownerSession_(p.ownerToken);required_(p,['companyId']);const blocked=Boolean(p.blocked),l=findOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId),restore=String(l.statusBeforeBlock||'trial_pending');updateOne_(SHEETS.LICENSES,x=>x.companyId===p.companyId,{blocked:blocked,status:blocked?'blocked':restore,statusBeforeBlock:blocked&&l.status!=='blocked'?l.status:'',updatedAt:iso_()});history_(p.companyId,blocked?'company_blocked':'company_unblocked',{});return {ok:true,company:companySnapshotData_(p.companyId)}}
function parseJson_(value,fallback){try{return JSON.parse(String(value||''))}catch{return fallback}}

function publicLicense_(companyId){const l=findOne_(SHEETS.LICENSES,x=>x.companyId===companyId);if(!l)throw apiError_('LICENSE_NOT_FOUND','Brak licencji.');return {status:effectiveLicenseStatus_(l),trialDays:Number(l.trialDays),trialStartedAt:l.trialStartedAt||null,trialEndsAt:l.trialEndsAt||null,paidEndsAt:l.paidEndsAt||null,blocked:String(l.blocked)==='true',monthlyPrice:l.monthlyPrice===''?null:Number(l.monthlyPrice),currency:String(l.currency||'PLN').toUpperCase(),limits:{adminDevices:Number(l.adminDeviceLimit),drivers:Number(l.driverLimit),driverDevices:Number(l.driverDeviceLimit)}}}

function createCode_(companyId,channel,target){const code=String(Math.floor(100000+Math.random()*900000)),pepper=secret_('OTP_PEPPER');append_(SHEETS.VERIFICATIONS,{id:id_('verify'),companyId,channel,target,codeHash:hash_(pepper+code),expiresAt:new Date(Date.now()+10*60000).toISOString(),attempts:0,usedAt:'',createdAt:iso_()});return code}
function consumeCode_(companyId,channel,code){const all=rows_(SHEETS.VERIFICATIONS),record=[...all].reverse().find(x=>x.companyId===companyId&&x.channel===channel&&!x.usedAt);if(!record||new Date(record.expiresAt)<new Date())throw apiError_('CODE_EXPIRED','Kod wygasł.');if(Number(record.attempts)>=5)throw apiError_('CODE_LOCKED','Przekroczono liczbę prób.');if(!constantEqual_(record.codeHash,hash_(secret_('OTP_PEPPER')+String(code)))){updateOne_(SHEETS.VERIFICATIONS,x=>x.id===record.id,{attempts:Number(record.attempts)+1});throw apiError_('INVALID_CODE','Nieprawidłowy kod.')}updateOne_(SHEETS.VERIFICATIONS,x=>x.id===record.id,{usedAt:iso_()})}
function sendEmailCode_(email,code){MailApp.sendEmail({to:email,subject:'Kursy — kod potwierdzający',htmlBody:'Twój kod potwierdzający: <b>'+code+'</b><br>Kod jest ważny 10 minut.'})}
function sendSmsCode_(phone,code){const props=PropertiesService.getScriptProperties(),token=props.getProperty('SMSAPI_TOKEN');if(!token){if(props.getProperty('ALLOW_TEST_CODES')==='true')return;throw apiError_('SMS_NOT_CONFIGURED','Wysyłka SMS nie jest jeszcze skonfigurowana.')}const response=UrlFetchApp.fetch('https://api.smsapi.pl/sms.do',{method:'post',headers:{Authorization:'Bearer '+token},payload:{to:phone,message:'Kursy: kod potwierdzający '+code,format:'json'},muteHttpExceptions:true});if(response.getResponseCode()>=300)throw apiError_('SMS_FAILED','Nie udało się wysłać SMS-a.')}

function createSession_(companyId,adminId){const token=randomToken_(),now=new Date(),expires=new Date(+now+24*60*60*1000).toISOString();append_(SHEETS.SESSIONS,{tokenHash:hash_(token),companyId,adminId,expiresAt:expires,revokedAt:'',createdAt:now.toISOString()});return {token,companyId,expiresAt:expires}}
function session_(token){if(!token)throw apiError_('UNAUTHORIZED','Zaloguj się.');const s=findOne_(SHEETS.SESSIONS,x=>constantEqual_(x.tokenHash,hash_(token))&&!x.revokedAt);if(!s||new Date(s.expiresAt)<new Date())throw apiError_('SESSION_EXPIRED','Sesja wygasła.');return s}
function rateLimit_(action){const cache=CacheService.getScriptCache(),key='rate:'+action+':'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmm'),count=Number(cache.get(key)||0)+1;if(count>120)throw apiError_('RATE_LIMIT','Zbyt wiele żądań. Spróbuj za chwilę.');cache.put(key,String(count),70)}
function history_(companyId,type,details){append_(SHEETS.HISTORY,{id:id_('history'),companyId,type,detailsJson:JSON.stringify(details||{}),createdAt:iso_()})}
function sheet_(name){const ss=SpreadsheetApp.openById(secret_('SPREADSHEET_ID'));let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);const headers=HEADERS[name];if(sh.getLastRow()===0)sh.appendRow(headers);else{const existing=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0];headers.forEach(h=>{if(!existing.includes(h)){sh.getRange(1,sh.getLastColumn()+1).setValue(h);existing.push(h)}})}return sh}
function rows_(name){const sh=sheet_(name),values=sh.getDataRange().getValues(),headers=values.shift()||HEADERS[name];return values.filter(r=>r.some(v=>v!=='' )).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])))}
function append_(name,obj){const h=HEADERS[name];sheet_(name).appendRow(h.map(k=>obj[k]===undefined?'':obj[k]))}
function findOne_(name,predicate){return rows_(name).find(predicate)}
function updateOne_(name,predicate,patch){const sh=sheet_(name),values=sh.getDataRange().getValues(),headers=values[0];for(let i=1;i<values.length;i++){const obj=Object.fromEntries(headers.map((h,j)=>[h,values[i][j]]));if(predicate(obj)){Object.entries(patch).forEach(([k,v])=>{const col=headers.indexOf(k);if(col>=0)sh.getRange(i+1,col+1).setValue(v)});return}}throw apiError_('ROW_NOT_FOUND','Nie znaleziono danych.')}
function required_(obj,keys){keys.forEach(k=>{if(obj[k]===undefined||obj[k]===null||String(obj[k]).trim()==='')throw apiError_('VALIDATION_ERROR','Uzupełnij wymagane pola.')})}
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

