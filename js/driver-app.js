import {activateDriver,effectiveStatus,mayUse} from './license-model.js';
import {getDeviceIdentity} from './device-identity.js';
import {loadStore,saveStore} from './license-store.js';
import {esc,statusLabel} from './license-view-helpers.js';
import {initI18n,t,translateMessage} from './i18n.js';

let store=loadStore();const token=new URLSearchParams(location.search).get('token');
const match=()=>{for(const company of store.companies){const driver=company.drivers.find(item=>item.activationToken===token);if(driver)return {company,driver}}return null};
const appUrl=()=>`driver-app/index.html?token=${encodeURIComponent(token)}`;
function currentDeviceIsActive(company,driver){const {deviceId}=getDeviceIdentity();return company.driverDevices.some(device=>device.deviceId===deviceId&&device.userId===driver.id)}
function openDriverApp(){localStorage.setItem('kursy.driver.activationToken.v1',token);location.assign(appUrl())}
function render(){const root=document.querySelector('#driverApp'),found=match();if(!token){root.innerHTML=`<div class="notice">${t('driver.noToken')}</div>`;return}if(!found){root.innerHTML=`<div class="notice">${t('driver.badLink')}</div>`;return}const {company,driver}=found,ready=driver.status==='active'&&mayUse(company)&&currentDeviceIsActive(company,driver);root.innerHTML=`<div class="hero"><div><span class="badge">${t('driver.badge')}</span><h2>${esc(driver.name)}</h2><p>${t('driver.company',{name:esc(company.name)})}</p><p>${t('driver.license',{status:esc(statusLabel(company,t))})}</p>${ready?`<button class="btn primary" id="openDriverApp">${t('driver.open')}</button>`:`<button class="btn primary" id="activateDriver">${t('driver.activate')}</button>`}</div><div class="road"></div></div>`}
document.addEventListener('click',event=>{if(event.target.id==='openDriverApp'){openDriverApp();return}if(event.target.id!=='activateDriver')return;const found=match();try{activateDriver(found.company,found.driver.id,getDeviceIdentity());saveStore(store);openDriverApp()}catch(error){alert(translateMessage(error.message))}});
initI18n(document.querySelector('.brand'));document.addEventListener('kursy:languagechange',render);render();
