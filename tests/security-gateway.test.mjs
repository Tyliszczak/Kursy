import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api.js';

const origin='https://app.tyli.pl';
const env={UPSTREAM_API_URL:'https://example.test/apps-script',APP_ORIGIN:origin,GATEWAY_SHARED_SECRET:'gateway-secret-for-tests'};
const request=(body,{cookie='',requestOrigin=origin,fetchSite='same-origin'}={})=>new Request(`${origin}/api`,{method:'POST',headers:{Origin:requestOrigin,'Sec-Fetch-Site':fetchSite,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('brama odrzuca ĹĽÄ…dania z obcej domeny przed wywoĹ‚aniem backendu',async()=>{
  let called=false;const previous=globalThis.fetch;globalThis.fetch=async()=>{called=true;throw new Error('unexpected')};
  try{const response=await onRequestPost({request:request({action:'login',payload:{}},{requestOrigin:'https://evil.example',fetchSite:'cross-site'}),env});assert.equal(response.status,403);assert.equal(called,false);assert.equal((await response.json()).code,'ORIGIN_REJECTED')}finally{globalThis.fetch=previous}
});

test('token firmy trafia do ciasteczka HttpOnly i znika z JSON',async()=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,session:{token:'company-secret',companyId:'company-1',expiresAt:new Date(Date.now()+3600000).toISOString()}}),{status:200});
  try{const response=await onRequestPost({request:request({action:'login',payload:{email:'a@example.test',password:'example'}}),env});const data=await response.json(),setCookie=response.headers.get('set-cookie')||'';assert.equal(data.session.token,undefined);assert.equal(data.session.cookie,true);assert.match(setCookie,/__Host-kursy_company=/);assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Strict/)}finally{globalThis.fetch=previous}
});

test('brama wstrzykuje sesjÄ™ i wspĂłlny sekret dopiero po stronie serwera',async()=>{
  let forwarded;const previous=globalThis.fetch;globalThis.fetch=async(_url,options)=>{forwarded=JSON.parse(options.body);return new Response(JSON.stringify({ok:true,company:{id:'company-1'}}),{status:200})};
  try{const response=await onRequestPost({request:request({action:'companySnapshot',payload:{sessionToken:'attacker-value'}},{cookie:'__Host-kursy_company=server-cookie-token'}),env});assert.equal(response.status,200);assert.equal(forwarded.payload.sessionToken,'server-cookie-token');assert.equal(forwarded.gatewaySecret,env.GATEWAY_SHARED_SECRET)}finally{globalThis.fetch=previous}
});

test('access i refresh token kierowcy sÄ… usuwane z odpowiedzi',async()=>{
  const expires=new Date(Date.now()+3600000).toISOString(),refreshExpires=new Date(Date.now()+86400000).toISOString();const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,driverSession:{token:'driver-secret',refreshToken:'refresh-secret',companyId:'company-1',driverId:'driver-1',deviceId:'device-1',expiresAt:expires,refreshExpiresAt:refreshExpires,absoluteExpiresAt:refreshExpires}}),{status:200});
  try{const response=await onRequestPost({request:request({action:'activateDriverDevice',payload:{activationToken:'one-time',deviceId:'device-1'}}),env});const data=await response.json(),setCookie=response.headers.get('set-cookie')||'';assert.equal(data.driverSession.token,undefined);assert.equal(data.driverSession.refreshToken,undefined);assert.match(setCookie,/__Host-kursy_driver=/);assert.match(setCookie,/__Host-kursy_driver_refresh=/)}finally{globalThis.fetch=previous}
});


