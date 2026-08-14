const SESSION_KEY='kursy.company.session.v1';

export function loadCompanySession(){
  try{
    const value=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    return value&&new Date(value.expiresAt)>new Date()?value:null;
  }catch{return null}
}

function saveCompanySession(session){
  if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  return session;
}

export function apiUrl(){
  return document.querySelector('meta[name="kursy-api-url"]')?.content?.trim()||'';
}

export async function requestApi(action,payload={}){
  const endpoint=apiUrl();
  if(!endpoint){
    const error=new Error('Usługa chmurowa nie jest skonfigurowana. Rejestracja i zapis danych są teraz niedostępne.');
    error.code='BACKEND_NOT_CONFIGURED';
    throw error;
  }
  let response;
  try{
    response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,payload})});
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
  verifyEmail:payload=>requestApi('verifyEmail',payload),
  verifyPhone:async payload=>{const result=await requestApi('verifyPhone',payload);saveCompanySession(result.session);return result},
  login:async payload=>{const result=await requestApi('login',payload);saveCompanySession(result.session);return result},
  checkout:payload=>requestApi('createCheckout',{...payload,sessionToken:loadCompanySession()?.token}),
  confirmCheckout:sessionId=>requestApi('confirmCheckout',{sessionId})
};

