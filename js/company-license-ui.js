import {addDriver,releaseDevice} from './license-model.js';
import {loadStore,saveStore} from './license-store.js';
import {activationUrl,esc,formatDate,statusLabel} from './license-view-helpers.js';

let store=loadStore();
const requestedCompanyId=new URLSearchParams(location.search).get('company');
const company=()=>store.companies.find(item=>item.id===requestedCompanyId)||store.companies[0];
const save=()=>saveStore(store);

function deviceRows(devices,role){
  if(!devices.length)return '<div class="empty">Brak aktywnych urządzeń.</div>';
  return devices.map(device=>`<div class="licenseRow"><span><strong>${esc(device.deviceId.slice(0,20))}…</strong><small>Ostatnia aktywność: ${formatDate(device.lastSeenAt||device.activatedAt)}</small></span><button class="btn dangerText" data-release-device="${role}:${esc(device.deviceId)}">Zwolnij</button></div>`).join('');
}

function render(){
  const root=document.querySelector('#companyLicensePanel'),c=company();if(!root||!c)return;
  const license=c.license;
  root.innerHTML=`<h2>Firma i licencja</h2><p class="muted">Panel firmy: trasy, kierowcy i urządzenia firmy. Licencjami wszystkich firm zarządza właściciel systemu w osobnym module.</p><div class="licenseSummary"><strong>${esc(c.name)}</strong><span class="licenseStatus">${esc(statusLabel(c))}</span><span>Trial: ${formatDate(license.trialStartedAt)} – ${formatDate(license.trialEndsAt)}</span></div><div class="licenseGrid"><section><h3>Kierowcy (${c.drivers.length}/${license.limits.drivers})</h3><form id="driverForm" class="ownerFields"><label>Imię lub nazwa *<input name="name" required></label><label>Numer telefonu *<input name="phone" type="tel" required></label><label>E-mail (opcjonalnie)<input name="email" type="email"></label><button class="btn primary" type="submit">Dodaj kierowcę</button></form><div class="licenseList">${c.drivers.map(driver=>{const url=activationUrl(driver);return `<div class="licenseRow"><span><strong>${esc(driver.name)}</strong><small>${esc(driver.phone)} · ${esc(driver.status)}</small></span><div class="itemActions"><button class="btn" data-copy-driver="${esc(driver.id)}">Kopiuj link</button><a class="btn" href="sms:${encodeURIComponent(driver.phone)}?body=${encodeURIComponent(`Aktywuj aplikację kierowcy Kursy: ${url}`)}">Wyślij SMS</a></div></div>`}).join('')||'<div class="empty">Brak kierowców.</div>'}</div></section><section><h3>Urządzenia administratorów (${c.adminDevices.length}/${license.limits.adminDevices})</h3>${deviceRows(c.adminDevices,'admin')}<h3>Urządzenia kierowców (${c.driverDevices.length}/${license.limits.driverDevices})</h3>${deviceRows(c.driverDevices,'driver')}</section></div>`;
}

document.addEventListener('submit',event=>{if(event.target.id!=='driverForm')return;event.preventDefault();const data=new FormData(event.target);try{addDriver(company(),{name:data.get('name'),phone:data.get('phone'),email:data.get('email')});save();render()}catch(error){alert(error.message)}});
document.addEventListener('click',event=>{const copy=event.target.closest('[data-copy-driver]');if(copy){const driver=company().drivers.find(item=>item.id===copy.dataset.copyDriver);navigator.clipboard?.writeText(activationUrl(driver));alert('Link do aplikacji kierowcy został skopiowany.')}const release=event.target.closest('[data-release-device]');if(release){const [role,deviceId]=release.dataset.releaseDevice.split(':');releaseDevice(company(),role,deviceId);save();render()}});
render();
