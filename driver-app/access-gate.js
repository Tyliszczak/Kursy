import {getDeviceIdentity} from '../js/device-identity.js';
import {licenseCloudApi,loadDriverSession} from '../js/license-cloud-api.js';
import {initI18n,t} from '../js/i18n.js';

const TOKEN_KEY='kursy.driver.activationToken.v1';
const queryToken=new URLSearchParams(location.search).get('token');
const token=queryToken||localStorage.getItem(TOKEN_KEY)||'';
const gate=document.querySelector('#accessGate'),shell=document.querySelector('#driverShell'),message=document.querySelector('#accessMessage'),activationLink=document.querySelector('#activationLink');
function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.body.append(script)})}
function deny(text,{allowActivation=false}={}){message.textContent=text;activationLink.hidden=!allowActivation;if(allowActivation){activationLink.href='../driver.html?token='+encodeURIComponent(token);activationLink.textContent=t('driver.goActivation')}}
async function start(){
  initI18n(document.body);globalThis.KURSY_T=t;if(!token&&!loadDriverSession()){deny(t('driver.noToken'));return}
  const identity=getDeviceIdentity();let status;try{status=await licenseCloudApi.driverStatus(token,identity)}catch(error){deny(error.code==='INVALID_ACTIVATION'?t('driver.badLink'):error.message);return}
  if(status.driver.status==='blocked'){deny(t('driver.accessBlocked'));return}
  if(['blocked','expired'].includes(status.license.status)){deny(t('driver.accessLicense',{status:t(`status.${status.license.status}`)}));return}
  if(!status.mayUse){deny(t('driver.accessActivation'),{allowActivation:true});return}
  localStorage.removeItem(TOKEN_KEY);history.replaceState({},'',location.pathname);
  globalThis.KURSY_DRIVER_CONTEXT=Object.freeze({companyId:status.company.id,driverId:status.driver.id,driverSessionToken:loadDriverSession()?.token||'',deviceId:identity.deviceId,fingerprint:identity.fingerprint,dataApiUrl:licenseCloudApi.endpoint()});
  gate.hidden=true;shell.hidden=false;await import('./app.js?v=cloud-1');await loadScript('./wake-style.js?v=cloud-1');await loadScript('./vehicles.js?v=cloud-1');await loadScript('./nav-map.js?v=cloud-1');
}
start().catch(error=>{console.error(error);deny(t('driver.accessError'))});
