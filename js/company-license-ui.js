import {getDeviceIdentity} from './device-identity.js';
import {licenseCloudApi} from './license-cloud-api.js';
import {esc,formatDate,statusLabel} from './license-view-helpers.js';
import {t,translateMessage} from './i18n.js';

let company=null;
const root=document.querySelector('#companyLicensePanel');
const startsFirstTrial=()=>company?.license.status==='trial_pending'&&!company.license.trialStartedAt&&!company.drivers.some(d=>d.status==='active');
const confirmFirstDriverAccess=()=>!startsFirstTrial()||confirm(`${t('message.firstDriverTrialWarning')}\n\n${t('message.firstDriverTrialConfirm')}`);
const activationUrl=token=>{const url=new URL('driver.html',location.href);url.hash=`activate=${encodeURIComponent(token)}`;return url.href};

function driverName(userId){return company?.drivers.find(driver=>driver.id===userId)?.name||t('drivers.unknown')}
function deviceRows(devices,role){
  if(!devices.length)return `<div class="empty">${t('devices.none')}</div>`;
  return devices.map(d=>{
    const owner=role==='driver'?`<small>${t('devices.assignedTo',{name:esc(driverName(d.userId))})}</small>`:'';
    const label=esc(d.name||`${d.deviceId.slice(0,20)}…`);
    const rename=role==='admin'?`<button class="btn" data-rename-device="${esc(d.deviceId)}">Zmień nazwę</button>`:'';
    return `<div class="licenseRow"><span><strong>${label}</strong>${owner}<small>Ostatnia aktywność: ${formatDate(d.lastSeenAt||d.activatedAt)}</small></span><div class="itemActions">${rename}<button class="btn dangerText" data-release-device="${role}:${esc(d.deviceId)}">${t('common.release')}</button></div></div>`;
  }).join('');
}
function render(){
  if(!root||!company)return;const l=company.license,warning=startsFirstTrial()&&company.drivers.length?`<div class="notice warning" role="alert"><strong>${t('message.firstDriverTrialWarning')}</strong></div>`:'';
  const drivers=company.drivers.map(d=>{const deviceCount=company.driverDevices.filter(device=>device.userId===d.id).length,blocked=d.status==='blocked';return `<div class="licenseRow"><span><strong>${esc(d.name)}</strong><small>${esc(d.phone)} · ${esc(t(`driverStatus.${d.status}`))}</small><small>${t('drivers.deviceCount',{count:deviceCount})}</small></span><div class="itemActions"><button class="btn" data-copy-driver="${esc(d.id)}">${t('common.copyLink')}</button><button class="btn" data-sms-driver="${esc(d.id)}">${t('common.sendSms')}</button>${deviceCount?`<button class="btn" data-release-driver-devices="${esc(d.id)}">${t('drivers.releaseDevices')}</button>`:''}<button class="btn" data-block-driver="${esc(d.id)}">${blocked?t('drivers.unblock'):t('drivers.block')}</button><button class="btn dangerText" data-delete-driver="${esc(d.id)}">${t('drivers.delete')}</button></div></div>`}).join('')||`<div class="empty">${t('drivers.none')}</div>`;
  const trialPending=l.status==='trial_pending'&&!l.trialStartedAt;
  const statusText=trialPending?'Trial jeszcze nie ruszył':statusLabel(company,t);
  const statusHint=trialPending?'Okres próbny rozpocznie się po pierwszej aktywacji na urządzeniu kierowcy.':'';
  root.innerHTML=`<h2>${t('license.title')}</h2><p class="muted">${t('license.intro')}</p>
  <div class="licenseSummary"><strong>${esc(company.name)}</strong><span class="licenseStatus"${trialPending?` title="${esc(statusHint)}"`:''}>${esc(statusText)}</span><span>${t('license.trial',{start:formatDate(l.trialStartedAt),end:formatDate(l.trialEndsAt)})}</span>${l.monthlyPrice!==null?`<span>${esc(l.monthlyPrice)} ${esc(l.currency)} / miesiąc</span>`:''}</div>
  <div class="panel" style="margin:18px 0"><h3>Edytuj dane firmy</h3><form id="companyContactForm" class="ownerFields"><label>Adres e-mail<input name="email" type="email" required value="${esc(company.adminEmail||'')}"></label><label>Numer telefonu<input name="phone" type="tel" required value="${esc(company.adminPhone||'')}"></label><button class="btn primary" type="submit">Zapisz dane firmy</button></form><h3 style="margin-top:18px">Zmień hasło</h3><form id="companyPasswordForm" class="ownerFields"><label>Obecne hasło<input name="currentPassword" type="password" required autocomplete="current-password"></label><label>Nowe hasło<input name="newPassword" type="password" minlength="10" required autocomplete="new-password"></label><label>Powtórz nowe hasło<input name="confirmPassword" type="password" minlength="10" required autocomplete="new-password"></label><button class="btn primary" type="submit">Zmień hasło</button></form></div>
  <div class="licenseGrid"><section><h3>${t('drivers.title',{used:company.drivers.length,limit:l.limits.drivers})}</h3><form id="driverForm" class="ownerFields"><label>${t('drivers.name')}<input name="name" required></label><label>${t('drivers.phone')}<input name="phone" type="tel" required></label><label>${t('drivers.email')}<input name="email" type="email"></label><button class="btn primary" type="submit">${t('drivers.add')}</button></form>${warning}<div class="licenseList">${drivers}</div></section><section><h3>${t('devices.admin',{used:company.adminDevices.length,limit:l.limits.adminDevices})}</h3>${deviceRows(company.adminDevices,'admin')}<h3>${t('devices.driver',{used:company.driverDevices.length,limit:l.limits.driverDevices})}</h3>${deviceRows(company.driverDevices,'driver')}</section></div>`;
}
function fail(error){root.innerHTML=`<div class="notice"><strong>${esc(error.message||error)}</strong><p class="muted">Dane nie zostały zapisane lokalnie. Sprawdź połączenie z centralnym backendem.</p></div>`}
async function refresh(){const result=await licenseCloudApi.companySnapshot();company=result.company;render()}
async function activationFor(driverId){const result=await licenseCloudApi.createDriverActivation(driverId);return activationUrl(result.activationToken)}
async function busy(button,task){button.disabled=true;try{await task()}catch(error){alert(translateMessage(error.message))}finally{button.disabled=false}}

document.addEventListener('submit',event=>{
  if(event.target.id==='driverForm'){event.preventDefault();const form=event.target,data=new FormData(form),button=form.querySelector('button[type=submit]');busy(button,async()=>{const result=await licenseCloudApi.addDriver({name:data.get('name'),phone:data.get('phone'),email:data.get('email')});company=result.company;form.reset();render()});return}
  if(event.target.id==='companyContactForm'){event.preventDefault();const form=event.target,data=new FormData(form),button=form.querySelector('button[type=submit]');busy(button,async()=>{const result=await licenseCloudApi.updateCompanyContact({email:data.get('email'),phone:data.get('phone')});company=result.company;render();alert('Dane firmy zostały zaktualizowane.')});return}
  if(event.target.id==='companyPasswordForm'){event.preventDefault();const form=event.target,data=new FormData(form),button=form.querySelector('button[type=submit]');if(data.get('newPassword')!==data.get('confirmPassword')){alert('Nowe hasła nie są takie same.');return}busy(button,async()=>{await licenseCloudApi.changeCompanyPassword({currentPassword:data.get('currentPassword'),newPassword:data.get('newPassword')});form.reset();alert('Hasło zostało zmienione.')});return}
});
document.addEventListener('click',event=>{
  const rename=event.target.closest('[data-rename-device]');if(rename){const device=company.adminDevices.find(x=>x.deviceId===rename.dataset.renameDevice);const name=prompt('Podaj nową nazwę urządzenia:',device?.name||'');if(!name?.trim())return;busy(rename,async()=>{const result=await licenseCloudApi.renameAdminDevice(name.trim());company=result.company;render()});return}
  const copy=event.target.closest('[data-copy-driver]');if(copy){if(!confirmFirstDriverAccess())return;busy(copy,async()=>{const url=await activationFor(copy.dataset.copyDriver);await navigator.clipboard.writeText(url);alert(t('message.linkCopied'))});return}
  const sms=event.target.closest('[data-sms-driver]');if(sms){if(!confirmFirstDriverAccess())return;busy(sms,async()=>{const driver=company.drivers.find(x=>x.id===sms.dataset.smsDriver),url=await activationFor(driver.id),body=t('message.sms',{url});location.href=`sms:${encodeURIComponent(driver.phone)}?body=${encodeURIComponent(body)}`});return}
  const releaseAll=event.target.closest('[data-release-driver-devices]');if(releaseAll){const driver=company.drivers.find(x=>x.id===releaseAll.dataset.releaseDriverDevices);if(!confirm(t('drivers.releaseConfirm',{name:driver.name})))return;busy(releaseAll,async()=>{const result=await licenseCloudApi.releaseDriverDevices(driver.id);company=result.company;render()});return}
  const block=event.target.closest('[data-block-driver]');if(block){const driver=company.drivers.find(x=>x.id===block.dataset.blockDriver),blocked=driver.status==='blocked';if(!confirm(t(blocked?'drivers.unblockConfirm':'drivers.blockConfirm',{name:driver.name})))return;busy(block,async()=>{const result=await licenseCloudApi.setDriverBlocked(driver.id,!blocked);company=result.company;render()});return}
  const remove=event.target.closest('[data-delete-driver]');if(remove){const driver=company.drivers.find(x=>x.id===remove.dataset.deleteDriver);if(!confirm(t('drivers.deleteConfirm',{name:driver.name})))return;busy(remove,async()=>{const result=await licenseCloudApi.deleteDriver(driver.id);company=result.company;render()});return}
  const release=event.target.closest('[data-release-device]');if(release){const [role,deviceId]=release.dataset.releaseDevice.split(':');if(!confirm('Zwolnić to urządzenie?'))return;busy(release,async()=>{const result=await licenseCloudApi.releaseDevice(role,deviceId);company=result.company;render()})}
});
document.addEventListener('kursy:languagechange',render);
(async()=>{try{const identity=getDeviceIdentity();const result=await licenseCloudApi.activateAdminDevice(identity);company=result.company;render()}catch(error){fail(error)}})();
