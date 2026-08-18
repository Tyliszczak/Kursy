import {getDeviceIdentity} from './device-identity.js';
import {licenseCloudApi,loadDriverSession,clearDriverSession} from './license-cloud-api.js';
import {esc} from './license-view-helpers.js';
import {initI18n,t,translateMessage} from './i18n.js';

const fragmentToken=new URLSearchParams(location.hash.slice(1)).get('activate');
const legacyQueryToken=new URLSearchParams(location.search).get('token');
const token=fragmentToken||legacyQueryToken||'';
if(token)history.replaceState({},'',location.pathname);
const root=document.querySelector('#driverApp');
let status=null,heartbeatTimer=null,lastPosition=null;
const appUrl=()=>`driver-app/index.html`;
function openDriverApp(){history.replaceState({},'',location.pathname);location.assign(appUrl())}
function presence(){return lastPosition?{latitude:lastPosition.coords.latitude,longitude:lastPosition.coords.longitude,locationAccuracy:lastPosition.coords.accuracy,locationAt:new Date(lastPosition.timestamp).toISOString()}:{} }
function startLocation(){if(!navigator.geolocation)return;navigator.geolocation.watchPosition(position=>{lastPosition=position},()=>{}, {enableHighAccuracy:false,maximumAge:120000,timeout:10000})}
function stopHeartbeat(){if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}}
async function heartbeat(){if(document.visibilityState!=='visible'||!loadDriverSession())return;try{const result=await licenseCloudApi.driverHeartbeat(getDeviceIdentity(),presence());if(result&&!result.mayUse)throw Object.assign(new Error('Sesja została zakończona.'),{code:'DRIVER_CONCURRENT_USE'})}catch(error){if(['DRIVER_CONCURRENT_USE','DRIVER_SESSION_EXPIRED','DRIVER_DEVICE_RELEASED','DRIVER_ACCESS_DENIED'].includes(error.code)){stopHeartbeat();clearDriverSession();root.innerHTML=`<div class="notice">Wykryto równoczesne użycie konta lub sesja została zakończona. Ze względów bezpieczeństwa aktywuj urządzenie ponownie.</div>`}}}
function startHeartbeat(){stopHeartbeat();heartbeat();heartbeatTimer=setInterval(heartbeat,60000)}
function render(){
  if(!token&&!loadDriverSession()){root.innerHTML=`<div class="notice">${t('driver.noToken')}</div>`;return}
  if(!status){root.innerHTML=`<div class="notice">${t('home.loading')}</div>`;return}
  const blocked=status.driver.status==='blocked'||['blocked','expired'].includes(status.license.status);
  root.innerHTML=`<div class="hero"><div><span class="badge">${t('driver.badge')}</span><h2>${esc(status.driver.name)}</h2><p>${t('driver.company',{name:esc(status.company.name)})}</p><p>${t('driver.license',{status:esc(t(`status.${status.license.status}`))})}</p>${blocked?`<div class="notice">${t('driver.accessLicense',{status:t(`status.${status.license.status}`)})}</div>`:status.mayUse?`<button class="btn primary" id="openDriverApp">${t('driver.open')}</button>`:`<button class="btn primary" id="activateDriver">${t('driver.activate')}</button>`}</div><div class="road"></div></div>`;
}
async function load(){if(!token&&!loadDriverSession()){render();return}try{status=await licenseCloudApi.driverStatus(token,getDeviceIdentity(),presence());render();if(status.mayUse)startHeartbeat()}catch(error){root.innerHTML=`<div class="notice">${esc(error.code==='INVALID_ACTIVATION'?t('driver.badLink'):translateMessage(error.message))}</div>`}}
document.addEventListener('click',async event=>{
  if(event.target.id==='openDriverApp'){openDriverApp();return}
  if(event.target.id!=='activateDriver')return;const button=event.target;button.disabled=true;
  try{status=await licenseCloudApi.activateDriverDevice(token,getDeviceIdentity());if(status.mayUse){startHeartbeat();openDriverApp()}else render()}catch(error){alert(translateMessage(error.message));button.disabled=false}
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heartbeat()});
startLocation();initI18n(document.querySelector('.brand'));document.addEventListener('kursy:languagechange',render);render();load();
