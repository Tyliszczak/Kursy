import {loadCompanySession,requestApi,usingSecurityGateway} from './registration-api.js';
import {getDeviceIdentity} from './device-identity.js';
import {ensureAdminDevice} from './license-cloud-api.js';

let routeVersions=null;

function sessionToken(){
  const token=loadCompanySession()?.token;
  if(!token&&!usingSecurityGateway()){
    const error=new Error('Sesja wygasła. Zaloguj się ponownie.');
    error.code='UNAUTHORIZED';
    throw error;
  }
  return token||'';
}

export async function loadCloudRoutes(){
  await ensureAdminDevice();
  const result=await requestApi('loadRoutes',{sessionToken:sessionToken(),...getDeviceIdentity()});
  routeVersions=result.routeVersions&&typeof result.routeVersions==='object'?{...result.routeVersions}:{};
  return {
    routes:Array.isArray(result.routes)?result.routes:[],
    version:Number(result.version)||0,
    routeVersions:{...routeVersions},
    updatedAt:result.updatedAt||null,
    company:result.company||null
  };
}

export async function saveCloudRoutes(routes,expectedVersion){
  await ensureAdminDevice();
  const payload={
    sessionToken:sessionToken(),
    ...getDeviceIdentity(),
    routes,
    expectedVersion:Number(expectedVersion)||0
  };
  if(routeVersions)payload.routeVersions={...routeVersions};
  const result=await requestApi('saveRoutes',payload);
  routeVersions=result.routeVersions&&typeof result.routeVersions==='object'?{...result.routeVersions}:routeVersions;
  return {
    routes:Array.isArray(result.routes)?result.routes:routes,
    version:Number(result.version)||0,
    routeVersions:routeVersions?{...routeVersions}:{},
    updatedAt:result.updatedAt||null
  };
}
