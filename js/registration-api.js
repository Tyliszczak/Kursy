const SESSION_KEY='kursy.company.session.v2';

export function loadCompanySession(){
  try{
    const value=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
    return value&&new Date(value.expiresAt)>new Date()?value:null;
  }catch{return null}
}
export function clearCompanySession(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem('kursy.company.session.v1')}

function saveCompanySession(session){
  if(session)sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
  return session;
}

export function apiUrl(){
  if(usingSecurityGateway())return new URL('/api',location.origin).href;
  return document.querySelector('meta[name="kursy-api-url"]')?.content?.trim()||'';
}

export function usingSecurityGateway(){return location.protocol==='https:'&&(location.hostname==='tyli.pl'||location.hostname.endsWith('.tyli.pl')||location.hostname.endsWith('.pages.dev'))}

export async function requestApi(action,payload={}){
  const endpoint=apiUrl();
  if(!endpoint){
    const error=new Error('Usługa chmurowa nie jest skonfigurowana. Rejestracja i zapis danych są teraz niedostępne.');
    error.code='BACKEND_NOT_CONFIGURED';
    throw error;
  }
  let response;
  try{
    const gateway=usingSecurityGateway();
    const headers={'Content-Type':gateway?'application/json':'text/plain;charset=utf-8'};
    if(gateway)headers['X-Kursy-Request']='1';
    response=await fetch(endpoint,{method:'POST',credentials:gateway?'same-origin':'omit',headers,body:JSON.stringify({action,payload})});
  }catch{
    const error=new Error('Nie można połączyć się z usługą chmurową. Sprawdź internet i spróbuj ponownie.');
    error.code='NETWORK_ERROR';
    throw error;
  }
  const data=await response.json().catch(()=>({ok:false,code:'INVALID_RESPONSE',message:'Serwer zwrócił nieprawidłową odpowiedź.'}));
  if(!response.ok||!data.ok){
    const error=new Error(data.message||'Operacja nie powiodła się.');
    error.code=data.code||'API_ERROR';
    error.details=data;
    throw error;
  }
  return data;
}

export const registrationApi={
  register:payload=>requestApi('registerCompany',payload),
  verifyEmail:async payload=>{const result=await requestApi('verifyEmail',payload);saveCompanySession(result.session);return result},
  login:async payload=>{const result=await requestApi('login',payload);saveCompanySession(result.session);return result},
  logout:async()=>{const session=loadCompanySession();try{if(usingSecurityGateway()||session?.token)await requestApi('logout',{sessionToken:session?.token||''})}finally{clearCompanySession()}},
  checkout:payload=>requestApi('createCheckout',{...payload,sessionToken:loadCompanySession()?.token}),
  confirmCheckout:sessionId=>requestApi('confirmCheckout',{sessionId,sessionToken:loadCompanySession()?.token})
};
