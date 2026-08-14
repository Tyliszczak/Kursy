import {apiUrl,loadCompanySession,requestApi} from './registration-api.js';
import {getDeviceIdentity} from './device-identity.js';
const OWNER_SESSION_KEY='kursy.owner.session.v1';

function companyToken(){const token=loadCompanySession()?.token;if(!token){const error=new Error('Sesja firmy wygasła. Zaloguj się ponownie.');error.code='UNAUTHORIZED';throw error}return token}
function companyAuth(){return {sessionToken:companyToken(),...getDeviceIdentity()}}
let adminActivation=null;export function ensureAdminDevice(){if(!adminActivation)adminActivation=requestApi('activateAdminDevice',companyAuth()).catch(error=>{adminActivation=null;throw error});return adminActivation}
export function loadOwnerSession(){try{const value=JSON.parse(sessionStorage.getItem(OWNER_SESSION_KEY)||'null');return value&&new Date(value.expiresAt)>new Date()?value:null}catch{return null}}
function ownerToken(){const token=loadOwnerSession()?.token;if(!token){const error=new Error('Zaloguj się jako właściciel systemu.');error.code='OWNER_UNAUTHORIZED';throw error}return token}
export function clearOwnerSession(){sessionStorage.removeItem(OWNER_SESSION_KEY)}
export async function ownerLogout(){const session=loadOwnerSession();try{if(session?.token)await requestApi('ownerLogout',{ownerToken:session.token})}finally{clearOwnerSession()}}
export async function ownerLogin(email,password){const result=await requestApi('ownerLogin',{email,password});sessionStorage.setItem(OWNER_SESSION_KEY,JSON.stringify(result.session));return result.session}
export const licenseCloudApi={
  endpoint:()=>apiUrl(),
  companySnapshot:async()=>{await ensureAdminDevice();return requestApi('companySnapshot',companyAuth())},
  activateAdminDevice:()=>ensureAdminDevice(),
  addDriver:async driver=>{await ensureAdminDevice();return requestApi('addDriver',{...companyAuth(),...driver})},
  createDriverActivation:async driverId=>{await ensureAdminDevice();return requestApi('createDriverActivation',{...companyAuth(),driverId})},
  setDriverBlocked:async(driverId,blocked)=>{await ensureAdminDevice();return requestApi('setDriverBlocked',{...companyAuth(),driverId,blocked})},
  releaseDriverDevices:async driverId=>{await ensureAdminDevice();return requestApi('releaseDriverDevices',{...companyAuth(),driverId})},
  deleteDriver:async driverId=>{await ensureAdminDevice();return requestApi('deleteDriver',{...companyAuth(),driverId})},
  releaseDevice:async(role,targetDeviceId)=>{await ensureAdminDevice();const auth=companyAuth();return requestApi('releaseDevice',{sessionToken:auth.sessionToken,actorDeviceId:auth.deviceId,targetDeviceId,role})},
  driverStatus:(activationToken,identity)=>requestApi('driverStatus',{activationToken,...identity}),
  activateDriverDevice:(activationToken,identity)=>requestApi('activateDriverDevice',{activationToken,...identity}),
  driverRoutes:(activationToken,identity)=>requestApi('driverRoutes',{activationToken,...identity}),
  ownerSnapshot:()=>requestApi('ownerSnapshot',{ownerToken:ownerToken()}),
  ownerCreateCompany:data=>requestApi('ownerCreateCompany',{ownerToken:ownerToken(),...data}),
  ownerUpdateCompany:data=>requestApi('ownerUpdateCompany',{ownerToken:ownerToken(),...data}),
  ownerUpdateLicense:data=>requestApi('ownerUpdateLicense',{ownerToken:ownerToken(),...data}),
  ownerExtendTrial:(companyId,days)=>requestApi('ownerExtendTrial',{ownerToken:ownerToken(),companyId,days}),
  ownerEndTrial:companyId=>requestApi('ownerEndTrial',{ownerToken:ownerToken(),companyId}),
  ownerGrantPaid:(companyId,days)=>requestApi('ownerGrantPaid',{ownerToken:ownerToken(),companyId,days}),
  ownerSetBlocked:(companyId,blocked)=>requestApi('ownerSetBlocked',{ownerToken:ownerToken(),companyId,blocked})
};
