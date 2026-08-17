import {apiUrl,loadCompanySession,requestApi,usingSecurityGateway} from './registration-api.js';
import {getDeviceIdentity,getAdminDeviceName,requireAdminDeviceName,setAdminDeviceName} from './device-identity.js';
const OWNER_SESSION_KEY='kursy.owner.session.v1';
const DRIVER_SESSION_KEY='kursy.driver.session.v2';

function companyToken(){const token=loadCompanySession()?.token;if(!token&&!usingSecurityGateway()){const error=new Error('Sesja firmy wygasła. Zaloguj się ponownie.');error.code='UNAUTHORIZED';throw error}return token||''}
function companyAuth(){return {sessionToken:companyToken(),...getDeviceIdentity()}}
let adminActivation=null;export function ensureAdminDevice(){if(!adminActivation){const deviceName=getAdminDeviceName()||requireAdminDeviceName();adminActivation=requestApi('activateAdminDevice',{...companyAuth(),deviceName}).catch(error=>{adminActivation=null;throw error})}return adminActivation}
export function loadOwnerSession(){try{const value=JSON.parse(sessionStorage.getItem(OWNER_SESSION_KEY)||'null');return value&&new Date(value.expiresAt)>new Date()?value:null}catch{return null}}
function ownerToken(){const token=loadOwnerSession()?.token;if(!token&&!usingSecurityGateway()){const error=new Error('Zaloguj się jako właściciel systemu.');error.code='OWNER_UNAUTHORIZED';throw error}return token||''}
function saveOwnerSession(session){if(session)sessionStorage.setItem(OWNER_SESSION_KEY,JSON.stringify(session));return session}
export function clearOwnerSession(){sessionStorage.removeItem(OWNER_SESSION_KEY)}
export async function ownerLogout(){const session=loadOwnerSession();try{if(usingSecurityGateway()||session?.token)await requestApi('ownerLogout',{ownerToken:session?.token||''})}finally{clearOwnerSession()}}
export async function ownerLogin(email,password){const result=await requestApi('ownerLogin',{email,password});return saveOwnerSession(result.session)}
export async function ownerSetupConfirm(payload){const result=await requestApi('ownerSetupConfirm',payload);saveOwnerSession(result.session);return result}
export async function ownerResetConfirm(payload){const result=await requestApi('ownerResetConfirm',payload);saveOwnerSession(result.session);return result}
export function loadDriverSession(){try{const value=JSON.parse(localStorage.getItem(DRIVER_SESSION_KEY)||'null');if(!value)return null;const refreshExpiry=value.refreshExpiresAt||value.expiresAt;if(new Date(refreshExpiry)<=new Date()){clearDriverSession();return null}return value}catch{return null}}
export function clearDriverSession(){localStorage.removeItem(DRIVER_SESSION_KEY)}
function saveDriverSession(session){if(session){const safe=usingSecurityGateway()?{...session,token:undefined,refreshToken:undefined}:session;localStorage.setItem(DRIVER_SESSION_KEY,JSON.stringify(safe));return safe}return session}
export async function ensureDriverSession(identity,optional=false){const current=loadDriverSession();if(!current)return null;if((current.token||usingSecurityGateway())&&new Date(current.expiresAt)>new Date())return current;if(!current.refreshToken&&!usingSecurityGateway()){clearDriverSession();return null}try{const result=await requestApi('refreshDriverSession',{refreshToken:current.refreshToken||'',...identity});return saveDriverSession(result.driverSession)}catch(error){clearDriverSession();if(optional)return null;throw error}}
export const licenseCloudApi={
  endpoint:()=>apiUrl(),
  companySnapshot:async()=>{await ensureAdminDevice();return requestApi('companySnapshot',companyAuth())},
  activateAdminDevice:()=>ensureAdminDevice(),
  renameAdminDevice:async name=>{await ensureAdminDevice();const auth=companyAuth();const value=String(name||'').trim();const result=await requestApi('renameAdminDevice',{...auth,deviceName:value,name:value});setAdminDeviceName(value);return result},
  updateCompanyContact:async data=>{await ensureAdminDevice();return requestApi('updateCompanyContact',{...companyAuth(),...data})},
  changeCompanyPassword:async data=>{await ensureAdminDevice();return requestApi('changeCompanyPassword',{...companyAuth(),...data})},
  addDriver:async driver=>{await ensureAdminDevice();return requestApi('addDriver',{...companyAuth(),...driver})},
  createDriverActivation:async driverId=>{await ensureAdminDevice();return requestApi('createDriverActivation',{...companyAuth(),driverId})},
  setDriverBlocked:async(driverId,blocked)=>{await ensureAdminDevice();return requestApi('setDriverBlocked',{...companyAuth(),driverId,blocked})},
  releaseDriverDevices:async driverId=>{await ensureAdminDevice();return requestApi('releaseDriverDevices',{...companyAuth(),driverId})},
  deleteDriver:async driverId=>{await ensureAdminDevice();return requestApi('deleteDriver',{...companyAuth(),driverId})},
  releaseDevice:async(role,targetDeviceId)=>{await ensureAdminDevice();const auth=companyAuth();return requestApi('releaseDevice',{sessionToken:auth.sessionToken,actorDeviceId:auth.deviceId,targetDeviceId,role})},
  driverStatus:async(activationToken,identity)=>{const session=await ensureDriverSession(identity,true);return requestApi('driverStatus',{activationToken:session?'':activationToken,driverSessionToken:session?.token||'',...identity})},
  activateDriverDevice:async(activationToken,identity)=>{const result=await requestApi('activateDriverDevice',{activationToken,...identity});saveDriverSession(result.driverSession);return result},
  driverRoutes:async identity=>{const session=await ensureDriverSession(identity);if(!session){const error=new Error('Sesja kierowcy wygasła. Poproś administratora firmy o nowy link.');error.code='DRIVER_REFRESH_EXPIRED';throw error}return requestApi('driverRoutes',{driverSessionToken:session.token,...identity})},
  driverVehicles:async identity=>{const session=await ensureDriverSession(identity);if(!session){const error=new Error('Sesja kierowcy wygasła. Poproś administratora firmy o nowy link.');error.code='DRIVER_REFRESH_EXPIRED';throw error}return requestApi('driverVehicles',{driverSessionToken:session.token,...identity})},
  ownerStatus:()=>requestApi('ownerStatus'),
  ownerSetupRequest:email=>requestApi('ownerSetupRequest',{email}),
  ownerSetupConfirm,
  ownerResetRequest:email=>requestApi('ownerResetRequest',{email}),
  ownerResetConfirm,
  ownerSnapshot:()=>requestApi('ownerSnapshot',{ownerToken:ownerToken()}),
  ownerCreateCompany:data=>requestApi('ownerCreateCompany',{ownerToken:ownerToken(),...data}),
  ownerUpdateCompany:data=>requestApi('ownerUpdateCompany',{ownerToken:ownerToken(),...data}),
  ownerUpdateLicense:data=>requestApi('ownerUpdateLicense',{ownerToken:ownerToken(),...data}),
  ownerExtendTrial:(companyId,days)=>requestApi('ownerExtendTrial',{ownerToken:ownerToken(),companyId,days}),
  ownerEndTrial:companyId=>requestApi('ownerEndTrial',{ownerToken:ownerToken(),companyId}),
  ownerGrantPaid:(companyId,days)=>requestApi('ownerGrantPaid',{ownerToken:ownerToken(),companyId,days}),
  ownerSetBlocked:(companyId,blocked)=>requestApi('ownerSetBlocked',{ownerToken:ownerToken(),companyId,blocked})
};
