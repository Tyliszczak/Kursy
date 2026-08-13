import {addDriver,releaseDevice} from './license-model.js';
import {loadStore,saveStore} from './license-store.js';
import {activationUrl,esc,formatDate,statusLabel} from './license-view-helpers.js';
import {t} from './i18n.js';

let store=loadStore();
const requestedCompanyId=new URLSearchParams(location.search).get('company');
const company=()=>store.companies.find(item=>item.id===requestedCompanyId)||store.companies[0];
const save=()=>saveStore(store);

function deviceRows(devices,role){
  if(!devices.length)return `<div class="empty">${t('devices.none')}</div>`;
  return devices.map(device=>`<div class="licenseRow"><span><strong>${esc(device.deviceId.slice(0,20))}…</strong><small>${t('devices.lastSeen',{date:formatDate(device.lastSeenAt||device.activatedAt)})}</small></span><button class="btn dangerText" data-release-device="${role}:${esc(device.deviceId)}">${t('common.release')}</button></div>`).join('');
}

function render(){
  const root=document.querySelector('#companyLicensePanel'),c=company();if(!root||!c)return;
  const license=c.license;
  root.innerHTML=`<h2>${t('license.title')}</h2><p class="muted">${t('license.intro')}</p><div class="licenseSummary"><strong>${esc(c.name)}</strong><span class="licenseStatus">${esc(statusLabel(c,t))}</span><span>${t('license.trial',{start:formatDate(license.trialStartedAt),end:formatDate(license.trialEndsAt)})}</span></div><div class="licenseGrid"><section><h3>${t('drivers.title',{used:c.drivers.length,limit:license.limits.drivers})}</h3><form id="driverForm" class="ownerFields"><label>${t('drivers.name')}<input name="name" required></label><label>${t('drivers.phone')}<input name="phone" type="tel" required></label><label>${t('drivers.email')}<input name="email" type="email"></label><button class="btn primary" type="submit">${t('drivers.add')}</button></form><div class="licenseList">${c.drivers.map(driver=>{const url=activationUrl(driver);return `<div class="licenseRow"><span><strong>${esc(driver.name)}</strong><small>${esc(driver.phone)} · ${esc(driver.status)}</small></span><div class="itemActions"><button class="btn" data-copy-driver="${esc(driver.id)}">${t('common.copyLink')}</button><a class="btn" href="sms:${encodeURIComponent(driver.phone)}?body=${encodeURIComponent(t('message.sms',{url}))}">${t('common.sendSms')}</a></div></div>`}).join('')||`<div class="empty">${t('drivers.none')}</div>`}</div></section><section><h3>${t('devices.admin',{used:c.adminDevices.length,limit:license.limits.adminDevices})}</h3>${deviceRows(c.adminDevices,'admin')}<h3>${t('devices.driver',{used:c.driverDevices.length,limit:license.limits.driverDevices})}</h3>${deviceRows(c.driverDevices,'driver')}</section></div>`;
}

document.addEventListener('submit',event=>{if(event.target.id!=='driverForm')return;event.preventDefault();const data=new FormData(event.target);try{addDriver(company(),{name:data.get('name'),phone:data.get('phone'),email:data.get('email')});save();render()}catch(error){alert(error.message)}});
document.addEventListener('click',event=>{const copy=event.target.closest('[data-copy-driver]');if(copy){const driver=company().drivers.find(item=>item.id===copy.dataset.copyDriver);navigator.clipboard?.writeText(activationUrl(driver));alert(t('message.linkCopied'))}const release=event.target.closest('[data-release-device]');if(release){const [role,deviceId]=release.dataset.releaseDevice.split(':');releaseDevice(company(),role,deviceId);save();render()}});
document.addEventListener('kursy:languagechange',render);
render();
