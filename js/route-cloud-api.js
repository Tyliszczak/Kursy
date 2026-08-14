import {loadCompanySession,requestApi} from './registration-api.js';
import {getDeviceIdentity} from './device-identity.js';
import {ensureAdminDevice} from './license-cloud-api.js';

function sessionToken(){
  const token=loadCompanySession()?.token;
  if(!token){
    const error=new Error('Sesja wygasła. Zaloguj się ponownie.');
    error.code='UNAUTHORIZED';
    throw error;
  }
  return token;
}

export async function loadCloudRoutes(){
  await ensureAdminDevice();const result=await requestApi('loadRoutes',{sessionToken:sessionToken(),...getDeviceIdentity()});
  return {routes:Array.isArray(result.routes)?result.routes:[],version:Number(result.version)||0,updatedAt:result.updatedAt||null,company:result.company||null};
}

export async function saveCloudRoutes(routes,expectedVersion){
  await ensureAdminDevice();const result=await requestApi('saveRoutes',{sessionToken:sessionToken(),...getDeviceIdentity(),routes,expectedVersion:Number(expectedVersion)||0});
  return {routes:Array.isArray(result.routes)?result.routes:routes,version:Number(result.version)||0,updatedAt:result.updatedAt||null};
}

