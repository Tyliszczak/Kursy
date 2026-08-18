import {loadCompanySession,requestApi,usingSecurityGateway} from './registration-api.js';
import {getDeviceIdentity} from './device-identity.js';
import {ensureAdminDevice} from './license-cloud-api.js';

let routeVersions={};
let routeSnapshot={};

function sessionToken(){
  const token=loadCompanySession()?.token;
  if(!token&&!usingSecurityGateway()){
    const error=new Error('Sesja wygasła. Zaloguj się ponownie.');
    error.code='UNAUTHORIZED';
    throw error;
  }
  return token||'';
}

function routeId(route){
  return String(route?.id||'');
}

function snapshotOf(routes){
  const snapshot={};
  (Array.isArray(routes)?routes:[]).forEach(route=>{
    const id=routeId(route);
    if(id)snapshot[id]=JSON.stringify(route);
  });
  return snapshot;
}

export async function loadCloudRoutes(){
  await ensureAdminDevice();
  const result=await requestApi('loadRoutes',{sessionToken:sessionToken(),...getDeviceIdentity()});
  const routes=Array.isArray(result.routes)?result.routes:[];
  routeVersions=result.routeVersions&&typeof result.routeVersions==='object'?{...result.routeVersions}:{};
  routeSnapshot=snapshotOf(routes);
  return {
    routes,
    version:Number(result.version)||0,
    routeVersions:{...routeVersions},
    updatedAt:result.updatedAt||null,
    company:result.company||null
  };
}

export async function saveCloudRoutes(routes,expectedVersion){
  await ensureAdminDevice();
  const nextRoutes=Array.isArray(routes)?routes:[];
  const nextSnapshot=snapshotOf(nextRoutes);
  const upserts=nextRoutes.filter(route=>{
    const id=routeId(route);
    return id&&routeSnapshot[id]!==nextSnapshot[id];
  });
  const deletes=Object.keys(routeSnapshot).filter(id=>!Object.prototype.hasOwnProperty.call(nextSnapshot,id));

  const result=await requestApi('saveRoutes',{
    sessionToken:sessionToken(),
    ...getDeviceIdentity(),
    expectedVersion:Number(expectedVersion)||0,
    routeVersions:{...routeVersions},
    routeChanges:{upserts,deletes}
  });

  routeVersions=result.routeVersions&&typeof result.routeVersions==='object'?{...result.routeVersions}:routeVersions;
  routeSnapshot=nextSnapshot;
  return {
    routes:nextRoutes,
    version:Number(result.version)||0,
    routeVersions:{...routeVersions},
    updatedAt:result.updatedAt||null
  };
}
