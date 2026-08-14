const SESSION_KEY='kursy.company.session.v1';
const LOCAL_REGISTRATIONS_KEY='kursy.company.registrations.preview.v1';

function apiUrl(){return document.querySelector('meta[name="kursy-api-url"]')?.content?.trim()||''}
async function request(action,payload={}){
  const endpoint=apiUrl();
  if(!endpoint) return localPreview(action,payload);
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,payload})});
  const data=await response.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));
  if(!response.ok||!data.ok) throw new Error(data.message||'Operacja nie powiodła się.');
  return data;
}

function localPreview(action,payload){
  const list=JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY)||'[]');
  if(action==='registerCompany'){
    const id=crypto.randomUUID?.()||`preview-${Date.now()}`;
    const row={id,...payload,password:undefined,status:'pending_email',licenseStatus:'trial_pending',trialStartedAt:null,createdAt:new Date().toISOString()};
    list.push(row);localStorage.setItem(LOCAL_REGISTRATIONS_KEY,JSON.stringify(list));
    return Promise.resolve({ok:true,preview:true,companyId:id,next:'verify_email',debugCode:'123456'});
  }
  if(action==='verifyEmail') return Promise.resolve({ok:true,preview:true,next:'verify_phone',debugCode:'123456'});
  if(action==='verifyPhone'){
    const session={token:`preview-${Date.now()}`,companyId:payload.companyId,expiresAt:new Date(Date.now()+86400000).toISOString(),preview:true};
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));return Promise.resolve({ok:true,session,next:'company'});
  }
  if(action==='login'){
    const found=list.find(x=>x.email===String(payload.email||'').toLowerCase());
    if(!found) return Promise.reject(new Error('Nie znaleziono konta w tej przeglądarce.'));
    const session={token:`preview-${Date.now()}`,companyId:found.id,expiresAt:new Date(Date.now()+86400000).toISOString(),preview:true};
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));return Promise.resolve({ok:true,session});
  }
  if(action==='createCheckout') return Promise.reject(new Error('Płatność zostanie uruchomiona po skonfigurowaniu Stripe w backendzie.'));
  return Promise.reject(new Error('Nieobsługiwana operacja.'));
}

export const registrationApi={
  register:payload=>request('registerCompany',payload),
  verifyEmail:payload=>request('verifyEmail',payload),
  verifyPhone:payload=>request('verifyPhone',payload),
  login:payload=>request('login',payload),
  checkout:payload=>request('createCheckout',payload)
};

