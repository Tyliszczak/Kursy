export const DEFAULT_LIMITS=Object.freeze({adminDevices:3,drivers:10,driverDevices:10});
export const TrialStatus=Object.freeze({PENDING:'trial_pending',ACTIVE:'trial_active',ACTIVE_LICENSE:'active',EXPIRED:'expired',BLOCKED:'blocked'});
const id=(prefix)=>`${prefix}-${cryptoSafe()}-${Math.random().toString(36).slice(2,8)}`;
const cryptoSafe=()=>Date.now().toString(36);
export const nowIso=(now=new Date())=>new Date(now).toISOString();

export function createCompany({name,adminEmail='',trialDays=14,limits={}}={}){
  if(!name?.trim())throw new Error('Nazwa firmy jest wymagana.');
  return {id:id('company'),name:name.trim(),adminEmail,license:{status:TrialStatus.PENDING,trialDays:Number(trialDays)||14,trialStartedAt:null,trialEndsAt:null,paidEndsAt:null,blocked:false,limits:{...DEFAULT_LIMITS,...limits}},drivers:[],adminDevices:[],driverDevices:[],history:[event('company_created',{},new Date())]};
}
export function event(type,details={},now=new Date()){return {id:id('history'),type,details,at:nowIso(now)}}
export function effectiveStatus(company,now=new Date()){
  const l=company.license;if(l.blocked)return TrialStatus.BLOCKED;
  if(l.status===TrialStatus.ACTIVE&&l.trialEndsAt&&new Date(l.trialEndsAt)<=now)return TrialStatus.EXPIRED;
  if(l.status===TrialStatus.ACTIVE_LICENSE&&l.paidEndsAt&&new Date(l.paidEndsAt)<=now)return TrialStatus.EXPIRED;
  return l.status;
}
export const mayUse=(company,now=new Date())=>[TrialStatus.ACTIVE,TrialStatus.ACTIVE_LICENSE].includes(effectiveStatus(company,now));
export function addDriver(company,{name,phone,email=''},{now=new Date()}={}){
  if(company.drivers.length>=company.license.limits.drivers)throw new Error('Osiągnięto limit kierowców.');
  if(!name?.trim()||!phone?.trim())throw new Error('Imię/nazwa i numer telefonu są wymagane.');
  const driver={id:id('driver'),name:name.trim(),phone:phone.trim(),email:email.trim(),status:'inactive',activationToken:id('activate'),activatedAt:null};company.drivers.push(driver);company.history.push(event('driver_added',{driverId:driver.id},now));return driver;
}
export function activateDriver(company,driverId,device,{now=new Date()}={}){
  const driver=company.drivers.find(d=>d.id===driverId);if(!driver)throw new Error('Nie znaleziono kierowcy.');if(driver.status==='blocked')throw new Error('Kierowca jest zablokowany.');
  const known=company.driverDevices.find(d=>d.deviceId===device.deviceId);
  if(!known&&company.driverDevices.length>=company.license.limits.driverDevices)throw new Error('Osiągnięto limit urządzeń kierowców.');
  if(!known)company.driverDevices.push({...device,userId:driver.id,role:'driver',activatedAt:nowIso(now),lastSeenAt:nowIso(now)});else Object.assign(known,{userId:driver.id,lastSeenAt:nowIso(now)});
  driver.status='active';driver.activatedAt=driver.activatedAt||nowIso(now);
  if(company.license.status===TrialStatus.PENDING){company.license.status=TrialStatus.ACTIVE;company.license.trialStartedAt=nowIso(now);company.license.trialEndsAt=nowIso(new Date(+now+company.license.trialDays*86400000));company.history.push(event('trial_started',{driverId},now));}
  company.history.push(event('driver_device_activated',{driverId,deviceId:device.deviceId},now));return company;
}
export function activateAdminDevice(company,adminEmail,device,{now=new Date()}={}){const known=company.adminDevices.find(d=>d.deviceId===device.deviceId);if(!known&&company.adminDevices.length>=company.license.limits.adminDevices)throw new Error('Osiągnięto limit urządzeń administratorów.');if(!known)company.adminDevices.push({...device,userId:adminEmail,role:'admin',activatedAt:nowIso(now)});return company;}
export function releaseDevice(company,role,deviceId,now=new Date()){const key=role==='admin'?'adminDevices':'driverDevices';company[key]=company[key].filter(d=>d.deviceId!==deviceId);company.history.push(event('device_released',{role,deviceId},now));}
export function setLicense(company,patch,now=new Date()){Object.assign(company.license,patch);company.history.push(event('license_changed',patch,now));return company;}
export function endTrial(company,now=new Date()){company.license.status=TrialStatus.EXPIRED;company.license.trialEndsAt=nowIso(now);company.history.push(event('trial_ended',{},now));}
export function grantPaidLicense(company,paidEndsAt,now=new Date()){company.license.status=TrialStatus.ACTIVE_LICENSE;company.license.paidEndsAt=paidEndsAt;company.license.blocked=false;company.history.push(event('paid_license_granted',{paidEndsAt},now));}
export function setBlocked(company,blocked,now=new Date()){company.license.blocked=blocked;company.history.push(event(blocked?'company_blocked':'company_unblocked',{},now));}
