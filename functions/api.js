const COOKIE={
  company:'__Host-kursy_company',
  owner:'__Host-kursy_owner',
  driver:'__Host-kursy_driver',
  driverRefresh:'__Host-kursy_driver_refresh'
};

const COMPANY_ACTIONS=new Set([
  'logout','createCheckout','confirmCheckout','licenseStatus','loadRoutes','saveRoutes',
  'companySnapshot','activateAdminDevice','addDriver','createDriverActivation',
  'setDriverBlocked','releaseDriverDevices','deleteDriver','releaseDevice'
]);
const OWNER_ACTIONS=new Set([
  'ownerLogout','ownerSnapshot','ownerCreateCompany','ownerUpdateCompany',
  'ownerUpdateLicense','ownerExtendTrial','ownerEndTrial','ownerGrantPaid','ownerSetBlocked'
]);
const DRIVER_ACTIONS=new Set(['driverStatus','driverRoutes','driverVehicles']);

const json=(body,status=200,headers=new Headers())=>{
  headers.set('Content-Type','application/json; charset=utf-8');
  headers.set('Cache-Control','no-store, max-age=0');
  headers.set('Pragma','no-cache');
  headers.set('X-Content-Type-Options','nosniff');
  return new Response(JSON.stringify(body),{status,headers});
};

const parseCookies=request=>Object.fromEntries((request.headers.get('Cookie')||'').split(';').map(value=>value.trim()).filter(Boolean).map(value=>{
  const index=value.indexOf('=');
  return [decodeURIComponent(index<0?value:value.slice(0,index)),decodeURIComponent(index<0?'':value.slice(index+1))];
}));

const cookie=(name,value,maxAge)=>`${name}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0,Math.floor(maxAge))}`;
const ttl=expiresAt=>Math.max(0,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000));
const clearCookie=name=>cookie(name,'',0);

function assertSameOrigin(request,env){
  const requestOrigin=new URL(request.url).origin;
  const allowed=String(env.APP_ORIGIN||requestOrigin).replace(/\/$/,'');
  const origin=String(request.headers.get('Origin')||'').replace(/\/$/,'');
  const fetchSite=request.headers.get('Sec-Fetch-Site');
  if(origin!==allowed||!['same-origin','none',null].includes(fetchSite))throw Object.assign(new Error('Niedozwolone ĹşrĂłdĹ‚o ĹĽÄ…dania.'),{status:403,code:'ORIGIN_REJECTED'});
}

function injectSession(action,payload,cookies){
  const next={...payload};
  if(COMPANY_ACTIONS.has(action))next.sessionToken=cookies[COOKIE.company]||'';
  if(OWNER_ACTIONS.has(action))next.ownerToken=cookies[COOKIE.owner]||'';
  if(DRIVER_ACTIONS.has(action))next.driverSessionToken=cookies[COOKIE.driver]||'';
  if(action==='refreshDriverSession')next.refreshToken=cookies[COOKIE.driverRefresh]||'';
  return next;
}

function secureResponse(action,data){
  const headers=new Headers();
  if(['verifyEmail','login'].includes(action)&&data.session?.token){
    headers.append('Set-Cookie',cookie(COOKIE.company,data.session.token,ttl(data.session.expiresAt)));
    data.session={companyId:data.session.companyId,expiresAt:data.session.expiresAt,cookie:true};
  }
  if(action==='ownerLogin'&&data.session?.token){
    headers.append('Set-Cookie',cookie(COOKIE.owner,data.session.token,ttl(data.session.expiresAt)));
    data.session={email:data.session.email,expiresAt:data.session.expiresAt,cookie:true};
  }
  if(['activateDriverDevice','refreshDriverSession'].includes(action)&&data.driverSession?.token){
    const session=data.driverSession;
    headers.append('Set-Cookie',cookie(COOKIE.driver,session.token,ttl(session.expiresAt)));
    headers.append('Set-Cookie',cookie(COOKIE.driverRefresh,session.refreshToken,ttl(session.refreshExpiresAt)));
    data.driverSession={companyId:session.companyId,driverId:session.driverId,deviceId:session.deviceId,expiresAt:session.expiresAt,refreshExpiresAt:session.refreshExpiresAt,absoluteExpiresAt:session.absoluteExpiresAt,cookie:true};
  }
  if(action==='logout')headers.append('Set-Cookie',clearCookie(COOKIE.company));
  if(action==='ownerLogout')headers.append('Set-Cookie',clearCookie(COOKIE.owner));
  return {headers,data};
}

export async function onRequestPost({request,env}){
  try{
    assertSameOrigin(request,env);
    const raw=await request.text();
    if(raw.length>1_000_000)return json({ok:false,code:'REQUEST_TOO_LARGE',message:'Ĺ»Ä…danie jest zbyt duĹĽe.'},413);
    const body=JSON.parse(raw||'{}');
    if(!body.action||typeof body.action!=='string')return json({ok:false,code:'INVALID_ACTION',message:'Brak operacji API.'},400);
    if(!env.UPSTREAM_API_URL)return json({ok:false,code:'GATEWAY_NOT_CONFIGURED',message:'Brama API nie jest skonfigurowana.'},503);
    const payload=injectSession(body.action,body.payload||{},parseCookies(request));
    const upstream=await fetch(env.UPSTREAM_API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:body.action,payload,gatewaySecret:env.GATEWAY_SHARED_SECRET||''}),
      redirect:'follow'
    });
    const data=await upstream.json().catch(()=>({ok:false,code:'INVALID_UPSTREAM_RESPONSE',message:'Backend zwrĂłciĹ‚ nieprawidĹ‚owÄ… odpowiedĹş.'}));
    const secured=secureResponse(body.action,data);
    return json(secured.data,upstream.ok?200:502,secured.headers);
  }catch(error){
    return json({ok:false,code:error.code||'GATEWAY_ERROR',message:error.status?'Ĺ»Ä…danie zostaĹ‚o odrzucone.':'Brama API jest chwilowo niedostÄ™pna.'},error.status||500);
  }
}

export function onRequestGet(){return json({ok:true,service:'kursy-security-gateway',version:'1.0.0'})}
export function onRequestOptions(){return new Response(null,{status:204,headers:{Allow:'GET, POST, OPTIONS','Cache-Control':'no-store'}})}

