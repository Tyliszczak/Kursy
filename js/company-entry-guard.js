import {usingSecurityGateway} from './registration-api.js';

if(!usingSecurityGateway()){
  try{
    const session=JSON.parse(sessionStorage.getItem('kursy.company.session.v2')||'null');
    if(!session||new Date(session.expiresAt)<=new Date())location.replace('./?mode=login&next=company');
  }catch{
    location.replace('./?mode=login&next=company');
  }
}

