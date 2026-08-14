import {getDeviceIdentity} from './device-identity.js';
import {licenseCloudApi} from './license-cloud-api.js';
import {esc} from './license-view-helpers.js';
import {initI18n,t,translateMessage} from './i18n.js';

const TOKEN_KEY='kursy.driver.activationToken.v1';
const queryToken=new URLSearchParams(location.search).get('token');
const token=queryToken||localStorage.getItem(TOKEN_KEY)||'';
const root=document.querySelector('#driverApp');
let status=null;
const appUrl=()=>`driver-app/index.html?token=${encodeURIComponent(token)}`;
function openDriverApp(){localStorage.setItem(TOKEN_KEY,token);location.assign(appUrl())}
function render(){
  if(!token){root.innerHTML=`<div class="notice">${t('driver.noToken')}</div>`;return}
  if(!status){root.innerHTML=`<div class="notice">${t('home.loading')}</div>`;return}
  const blocked=status.driver.status==='blocked'||['blocked','expired'].includes(status.license.status);
  root.innerHTML=`<div class="hero"><div><span class="badge">${t('driver.badge')}</span><h2>${esc(status.driver.name)}</h2><p>${t('driver.company',{name:esc(status.company.name)})}</p><p>${t('driver.license',{status:esc(t(`status.${status.license.status}`))})}</p>${blocked?`<div class="notice">${t('driver.accessLicense',{status:t(`status.${status.license.status}`)})}</div>`:status.mayUse?`<button class="btn primary" id="openDriverApp">${t('driver.open')}</button>`:`<button class="btn primary" id="activateDriver">${t('driver.activate')}</button>`}</div><div class="road"></div></div>`;
}
async function load(){if(!token){render();return}try{status=await licenseCloudApi.driverStatus(token,getDeviceIdentity());render()}catch(error){root.innerHTML=`<div class="notice">${esc(error.code==='INVALID_ACTIVATION'?t('driver.badLink'):translateMessage(error.message))}</div>`}}
document.addEventListener('click',async event=>{
  if(event.target.id==='openDriverApp'){openDriverApp();return}
  if(event.target.id!=='activateDriver')return;const button=event.target;button.disabled=true;
  try{status=await licenseCloudApi.activateDriverDevice(token,getDeviceIdentity());if(status.mayUse)openDriverApp();else render()}catch(error){alert(translateMessage(error.message));button.disabled=false}
});
initI18n(document.querySelector('.brand'));document.addEventListener('kursy:languagechange',render);render();load();
