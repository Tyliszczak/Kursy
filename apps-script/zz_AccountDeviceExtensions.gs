// Rozszerzenia panelu firmy: nazwy urządzeń, edycja konta i reset hasła.
// Plik jest celowo nazwany zz_*, aby po synchronizacji z Apps Script był ładowany po Code.gs.

if(!HEADERS.Devices.includes('name'))HEADERS.Devices.splice(6,0,'name');

function doGet(){return json_({ok:true,service:'kursy-license-api',version:'1.3.0'})}
function doPost(e){
  try{
    const contents=e.postData&&e.postData.contents||'{}';if(contents.length>1000000)throw apiError_('REQUEST_TOO_LARGE','Żądanie jest zbyt duże.');
    const body=JSON.parse(contents);assertGateway_(body);rateLimit_(body.action||'unknown',body.payload||{});
    const actions={registerCompany:registerCompany_,verifyEmail:verifyEmail_,login:login_,logout:logout_,passwordResetRequest:passwordResetRequest_,passwordResetConfirm:passwordResetConfirm_,createCheckout:createCheckout_,confirmCheckout:confirmCheckout_,licenseStatus:licenseStatus_,loadRoutes:loadRoutes_,saveRoutes:saveRoutes_,companySnapshot:companySnapshot_,activateAdminDevice:activateAdminDevice_,renameAdminDevice:renameAdminDevice_,updateCompanyContact:updateCompanyContact_,changeCompanyPassword:changeCompanyPassword_,addDriver:addDriver_,createDriverActivation:createDriverActivation_,setDriverBlocked:setDriverBlocked_,releaseDriverDevices:releaseDriverDevices_,deleteDriver:deleteDriver_,releaseDevice:releaseDevice_,driverStatus:driverStatus_,activateDriverDevice:activateDriverDevice_,refreshDriverSession:refreshDriverSession_,driverRoutes:driverRoutes_,driverVehicles:driverVehicles_,ownerLogin:ownerLogin_,ownerLogout:ownerLogout_,ownerSnapshot:ownerSnapshot_,ownerCreateCompany:ownerCreateCompany_,ownerUpdateCompany:ownerUpdateCompany_,ownerUpdateLicense:ownerUpdateLicense_,ownerExtendTrial:ownerExtendTrial_,ownerEndTrial:ownerEndTrial_,ownerGrantPaid:ownerGrantPaid_,ownerSetBlocked:ownerSetBlocked_};
    if(!actions[body.action])throw apiError_('UNKNOWN_ACTION','Nieobsługiwana operacja.');
    return json_(actions[body.action](body.payload||{}));
  }catch(error){return json_({ok:false,code:error.code||'SERVER_ERROR',message:error.publicMessage||'Operacja nie powiodła się.'})}
}

function companySnapshotData_(companyId){
  const c=findOne_(SHEETS.COMPANIES,x=>x.id===companyId);if(!c)throw apiError_('COMPANY_NOT_FOUND','Nie znaleziono firmy.');
  const admin=findOne_(SHEETS.ADMINS,x=>x.companyId===companyId);
  const drivers=rows_(SHEETS.DRIVERS).filter(x=>x.companyId===companyId&&!x.deletedAt).map(publicDriver_);
  const devices=activeDevices_(companyId).map(publicDevice_);
  const history=rows_(SHEETS.HISTORY).filter(x=>x.companyId===companyId).slice(-100);
  return {id:c.id,name:c.name,country:c.country,taxId:c.taxId,adminEmail:(admin&&admin.email)||c.adminEmail||'',adminPhone:(admin&&admin.phone)||'',status:c.status,license:publicLicense_(companyId),drivers,adminDevices:devices.filter(x=>x.role==='admin'),driverDevices:devices.filter(x=>x.role==='driver'),history:history.map(x=>({id:x.id,type:x.type,details:parseJson_(x.detailsJson,{}),at:x.createdAt}))};
}
function publicDevice_(d){return {id:d.id,deviceId:d.deviceId,userId:d.userId,role:d.role,name:d.name||'',activatedAt:d.activatedAt||null,lastSeenAt:d.lastSeenAt||null}}

function activateAdminDevice_(p){
  const auth=session_(p.sessionToken);required_(p,['deviceId','deviceName']);const l=findOne_(SHEETS.LICENSES,x=>x.companyId===auth.companyId);if(!l)throw apiError_('LICENSE_NOT_FOUND','Brak licencji.');if(effectiveLicenseStatus_(l)==='blocked')throw apiError_('COMPANY_BLOCKED','Dostęp firmy jest zablokowany.');
  const name=String(p.deviceName).trim().slice(0,80);if(!name)throw apiError_('DEVICE_NAME_REQUIRED','Podaj nazwę urządzenia.');
  const active=activeDevices_(auth.companyId).filter(x=>x.role==='admin'),known=rows_(SHEETS.DEVICES).find(x=>x.companyId===auth.companyId&&x.role==='admin'&&x.deviceId===String(p.deviceId));
  if((!known||known.releasedAt)&&active.length>=Number(l.adminDeviceLimit))throw apiError_('ADMIN_DEVICE_LIMIT','Osiągnięto limit urządzeń administratorów.');
  const now=iso_(),patch={userId:auth.adminId,name,fingerprintHash:hash_(String(p.fingerprint||'')),lastSeenAt:now,releasedAt:''};
  if(known)updateOne_(SHEETS.DEVICES,x=>x.id===known.id,patch);else append_(SHEETS.DEVICES,{id:id_('device'),companyId:auth.companyId,userId:auth.adminId,role:'admin',deviceId:String(p.deviceId),name,fingerprintHash:patch.fingerprintHash,activatedAt:now,lastSeenAt:now,releasedAt:''});
  history_(auth.companyId,'admin_device_activated',{deviceId:String(p.deviceId),deviceName:name,adminId:auth.adminId});return {ok:true,company:companySnapshotData_(auth.companyId)};
}
function renameAdminDevice_(p){const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['deviceName']);const name=String(p.deviceName).trim().slice(0,80);if(!name)throw apiError_('DEVICE_NAME_REQUIRED','Podaj nazwę urządzenia.');const device=findOne_(SHEETS.DEVICES,x=>x.companyId===auth.companyId&&x.role==='admin'&&x.userId===auth.adminId&&x.deviceId===String(p.deviceId)&&!x.releasedAt);if(!device)throw apiError_('DEVICE_NOT_FOUND','Nie znaleziono aktywnego urządzenia.');updateOne_(SHEETS.DEVICES,x=>x.id===device.id,{name,lastSeenAt:iso_()});history_(auth.companyId,'admin_device_renamed',{deviceId:device.deviceId,deviceName:name});return {ok:true,company:companySnapshotData_(auth.companyId)}}

function updateCompanyContact_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['email','phone']);const email=normalizeEmail_(p.email),company=findOne_(SHEETS.COMPANIES,x=>x.id===auth.companyId),phone=normalizePhone_(p.phone,company&&company.country||'PL'),admin=findOne_(SHEETS.ADMINS,x=>x.id===auth.adminId&&x.companyId===auth.companyId);if(!admin)throw apiError_('ADMIN_NOT_FOUND','Nie znaleziono konta administratora.');
  const duplicate=rows_(SHEETS.ADMINS).some(x=>x.id!==admin.id&&normalizeEmail_(x.email)===email);if(duplicate)throw apiError_('EMAIL_EXISTS','Ten adres e-mail jest już używany przez inne konto.');
  updateOne_(SHEETS.ADMINS,x=>x.id===admin.id,{email,phone});updateOne_(SHEETS.COMPANIES,x=>x.id===auth.companyId,{adminEmail:email,updatedAt:iso_()});history_(auth.companyId,'company_contact_updated',{adminId:admin.id});return {ok:true,company:companySnapshotData_(auth.companyId)};
}
function changeCompanyPassword_(p){
  const auth=session_(p.sessionToken);assertAdminDevice_(auth,p);required_(p,['currentPassword','newPassword']);if(String(p.newPassword).length<10)throw apiError_('WEAK_PASSWORD','Nowe hasło musi mieć co najmniej 10 znaków.');const admin=findOne_(SHEETS.ADMINS,x=>x.id===auth.adminId&&x.companyId===auth.companyId);if(!admin||!validPassword_(admin,p.currentPassword))throw apiError_('INVALID_CURRENT_PASSWORD','Obecne hasło jest nieprawidłowe.');const salt=randomToken_();updateOne_(SHEETS.ADMINS,x=>x.id===admin.id,{passwordSalt:salt,passwordHash:passwordHash_(salt,p.newPassword)});history_(auth.companyId,'company_password_changed',{adminId:admin.id});return {ok:true};
}

function passwordResetRequest_(p){
  required_(p,['email']);const email=normalizeEmail_(p.email),admin=findOne_(SHEETS.ADMINS,x=>normalizeEmail_(x.email)===email);
  // Nie ujawniamy, czy adres istnieje w systemie.
  if(!admin)return {ok:true};
  rows_(SHEETS.VERIFICATIONS).filter(x=>x.companyId===admin.companyId&&x.channel==='password_reset'&&normalizeEmail_(x.target)===email&&!x.usedAt).forEach(row=>updateOne_(SHEETS.VERIFICATIONS,x=>x.id===row.id,{usedAt:'superseded'}));
  const code=String(Math.floor(100000+Math.random()*900000)),pepper=secret_('OTP_PEPPER');append_(SHEETS.VERIFICATIONS,{id:id_('verify'),companyId:admin.companyId,channel:'password_reset',target:email,codeHash:hash_(pepper+code),expiresAt:new Date(Date.now()+3*60000).toISOString(),attempts:0,usedAt:'',createdAt:iso_()});
  MailApp.sendEmail({to:email,subject:'Kursy — kod do zmiany hasła',htmlBody:'Twój kod do zmiany hasła: <b>'+code+'</b><br>Kod jest ważny 3 minuty.'});return {ok:true};
}
function passwordResetConfirm_(p){
  required_(p,['email','code','newPassword']);if(String(p.newPassword).length<10)throw apiError_('WEAK_PASSWORD','Nowe hasło musi mieć co najmniej 10 znaków.');const email=normalizeEmail_(p.email),admin=findOne_(SHEETS.ADMINS,x=>normalizeEmail_(x.email)===email);if(!admin)throw apiError_('RESET_CODE_INVALID','Kod jest niepoprawny.');
  const pepper=secret_('OTP_PEPPER'),wanted=hash_(pepper+String(p.code)),records=rows_(SHEETS.VERIFICATIONS).filter(x=>x.companyId===admin.companyId&&x.channel==='password_reset'&&normalizeEmail_(x.target)===email),matching=[...records].reverse().find(x=>constantEqual_(x.codeHash,wanted));
  if(!matching)throw apiError_('RESET_CODE_INVALID','Kod jest niepoprawny.');
  const newer=records.some(x=>String(x.createdAt)>String(matching.createdAt));if(matching.usedAt==='superseded'||newer)throw apiError_('RESET_CODE_SUPERSEDED','Ten kod nie jest już ważny. Użyj najnowszego kodu wysłanego na e-mail.');
  if(matching.usedAt)throw apiError_('RESET_CODE_INVALID','Kod jest niepoprawny.');
  if(new Date(matching.expiresAt)<=new Date())throw apiError_('RESET_CODE_EXPIRED','Kod utracił ważność. Wyślij nowy kod.');
  if(Number(matching.attempts)>=5)throw apiError_('RESET_CODE_INVALID','Kod jest niepoprawny.');
  updateOne_(SHEETS.VERIFICATIONS,x=>x.id===matching.id,{usedAt:iso_()});const salt=randomToken_();updateOne_(SHEETS.ADMINS,x=>x.id===admin.id,{passwordSalt:salt,passwordHash:passwordHash_(salt,p.newPassword)});rows_(SHEETS.SESSIONS).filter(x=>x.adminId===admin.id&&!x.revokedAt).forEach(s=>updateOne_(SHEETS.SESSIONS,x=>x.tokenHash===s.tokenHash,{revokedAt:iso_()}));clearLoginFailures_(email);history_(admin.companyId,'password_reset_completed',{adminId:admin.id});return {ok:true};
}
