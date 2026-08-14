import {getDeviceIdentity} from './device-identity.js';
import {licenseCloudApi} from './license-cloud-api.js';
import {esc,formatDate,statusLabel} from './license-view-helpers.js';
import {t,translateMessage} from './i18n.js';

let company=null;
const root=document.querySelector('#companyLicensePanel');
const startsFirstTrial=()=>company?.license.status==='trial_pending'&&!company.license.trialStartedAt&&!company.drivers.some(d=>d.status==='active');
const confirmFirstDriverAccess=()=>!startsFirstTrial()||confirm(`${t('message.firstDriverTrialWarning')}\n\n${t('message.firstDriverTrialConfirm')}`);
const activationUrl=token=>new URL(`driver.html?token=${encodeURIComponent(token)}`,location.href).href;

function deviceRows(devices,role){
  if(!devices.length)return `<div class="empty">${t('devices.none')}</div>`;
  return devices.map(d=>`<div class="licenseRow"><span><strong>${esc(d.deviceId.slice(0,20))}…</strong><small>${t('devices.lastSeen',{date:formatDate(d.lastSeenAt||d.activatedAt)})}</small></span><button class="btn dangerText" data-release-device="${role}:${esc(d.deviceId)}">${t('common.release')}</button></div>`).join('');
}
function render(){
  if(!root||!company)return;const l=company.license,warning=startsFirstTrial()&&company.drivers.length?`<div class="notice warning" role="alert"><strong>${t('message.firstDriverTrialWarning')}</strong></div>`:'';
  root.innerHTML=`<h2>${t('license.title')}</h2><p class="muted">${t('license.intro')}</p><div class="licenseSummary"><strong>${esc(company.name)}</strong><span class="licenseStatus">${esc(statusLabel(company,t))}</span><span>${t('license.trial',{start:formatDate(l.trialStartedAt),end:formatDate(l.trialEndsAt)})}</span>${l.monthlyPrice!==null?`<span>${esc(l.monthlyPrice)} ${esc(l.currency)} / miesiąc</span>`:''}</div><div class="licenseGrid"><section><h3>${t('drivers.title',{used:company.drivers.length,limit:l.limits.drivers})}</h3><form id="driverForm" class="ownerFields"><label>${t('drivers.name')}<input name="name" required></label><label>${t('drivers.phone')}<input name="phone" type="tel" required></label><label>${t('drivers.email')}<input name="email" type="email"></label><button class="btn primary" type="submit">${t('drivers.add')}</button></form>${warning}<div class="licenseList">${company.drivers.map(d=>`<div class="licenseRow"><span><strong>${esc(d.name)}</strong><small>${esc(d.phone)} · ${esc(d.status)}</small></span><div class="itemActions"><button class="btn" data-copy-driver="${esc(d.id)}">${t('common.copyLink')}</button><button class="btn" data-sms-driver="${esc(d.id)}">${t('common.sendSms')}</button><button class="btn dangerText" data-block-driver="${esc(d.id)}">${d.status==='blocked'?'▶':'⛔'}</button></div></div>`).join('')||`<div class="empty">${t('drivers.none')}</div>`}</div></section><section><h3>${t('devices.admin',{used:company.adminDevices.length,limit:l.limits.adminDevices})}</h3>${deviceRows(company.adminDevices,'admin')}<h3>${t('devices.driver',{used:company.driverDevices.length,limit:l.limits.driverDevices})}</h3>${deviceRows(company.driverDevices,'driver')}</section></div>`;
}
function fail(error){root.innerHTML=`<div class="notice"><strong>${esc(error.message||error)}</strong><p class="muted">Dane nie zostały zapisane lokalnie. Sprawdź połączenie z centralnym backendem.</p></div>`}
async function refresh(){const result=await licenseCloudApi.companySnapshot();company=result.company;render()}
async function activationFor(driverId){const result=await licenseCloudApi.createDriverActivation(driverId);return activationUrl(result.activationToken)}
async function busy(button,task){button.disabled=true;try{await task()}catch(error){alert(translateMessage(error.message))}finally{button.disabled=false}}

document.addEventListener('submit',event=>{if(event.target.id!=='driverForm')return;event.preventDefault();const form=event.target,data=new FormData(form),button=form.querySelector('button[type=submit]');busy(button,async()=>{const result=await licenseCloudApi.addDriver({name:data.get('name'),phone:data.get('phone'),email:data.get('email')});company=result.company;form.reset();render()})});
document.addEventListener('click',event=>{
  const copy=event.target.closest('[data-copy-driver]');if(copy){if(!confirmFirstDriverAccess())return;busy(copy,async()=>{const url=await activationFor(copy.dataset.copyDriver);await navigator.clipboard.writeText(url);alert(t('message.linkCopied'))});return}
  const sms=event.target.closest('[data-sms-driver]');if(sms){if(!confirmFirstDriverAccess())return;busy(sms,async()=>{const driver=company.drivers.find(x=>x.id===sms.dataset.smsDriver),url=await activationFor(driver.id),body=t('message.sms',{url});location.href=`sms:${encodeURIComponent(driver.phone)}?body=${encodeURIComponent(body)}`});return}
  const block=event.target.closest('[data-block-driver]');if(block){const driver=company.drivers.find(x=>x.id===block.dataset.blockDriver);busy(block,async()=>{const result=await licenseCloudApi.setDriverBlocked(driver.id,driver.status!=='blocked');company=result.company;render()});return}
  const release=event.target.closest('[data-release-device]');if(release){const [role,deviceId]=release.dataset.releaseDevice.split(':');if(!confirm('Zwolnić to urządzenie?'))return;busy(release,async()=>{const result=await licenseCloudApi.releaseDevice(role,deviceId);company=result.company;render()})}
});
document.addEventListener('kursy:languagechange',render);
(async()=>{try{const identity=getDeviceIdentity();const result=await licenseCloudApi.activateAdminDevice(identity);company=result.company;render()}catch(error){fail(error)}})();
