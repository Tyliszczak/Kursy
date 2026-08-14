import {clearOwnerSession,licenseCloudApi,loadOwnerSession,ownerLogin,ownerLogout} from './license-cloud-api.js';
import {esc,formatDate,STATUS_LABELS} from './license-view-helpers.js';

let companies=[];
const root=document.querySelector('#ownerApp');
const statusName=company=>STATUS_LABELS[company.license.status]||company.license.status;
const field=(company,key,label,value,type='number',extra='')=>`<label>${label}<input data-company="${esc(company.id)}" data-field="${key}" type="${type}" value="${esc(value??'')}" ${extra}></label>`;

function loginView(message=''){
  companies=[];
  root.innerHTML=`<section class="ownerCompany"><h2>Logowanie właściciela systemu</h2><p class="muted">Dane panelu są ukryte do czasu potwierdzenia hasła przez centralny backend. Hasło nie jest zapisane w kodzie ani w pamięci przeglądarki.</p>${message?`<div class="notice">${esc(message)}</div>`:''}<form id="ownerLoginForm" class="ownerFields"><label>E-mail właściciela<input name="email" type="email" autocomplete="username" required autofocus></label><label>Hasło<input name="password" type="password" autocomplete="current-password" minlength="12" required></label><button class="btn primary" type="submit">Zaloguj do mojego panelu</button></form></section>`;
}
function createCompanyView(){
  return `<section class="ownerCompany"><h2>Dodaj firmę</h2><form id="newCompanyForm" class="ownerFields"><label>Nazwa firmy *<input name="name" required></label><label>E-mail administratora firmy<input name="adminEmail" type="email"></label><label>Długość triala (dni)<input name="trialDays" type="number" min="1" value="14"></label><button class="btn primary" type="submit">Utwórz firmę</button></form></section>`;
}
function companyView(company){
  const license=company.license;
  return `<section class="ownerCompany"><h2>${esc(company.name)}</h2><p><strong>${esc(statusName(company))}</strong> · administratorzy ${company.adminDevices.length}/${license.limits.adminDevices}, kierowcy ${company.drivers.length}/${license.limits.drivers}, urządzenia kierowców ${company.driverDevices.length}/${license.limits.driverDevices}</p><div class="ownerFields">${field(company,'name','Nazwa firmy',company.name,'text','required')}${field(company,'adminEmail','E-mail administratora',company.adminEmail,'email')}${field(company,'trialDays','Trial (dni)',license.trialDays)}${field(company,'adminDevices','Limit urządzeń administratorów',license.limits.adminDevices)}${field(company,'drivers','Limit kierowców',license.limits.drivers)}${field(company,'driverDevices','Limit urządzeń kierowców',license.limits.driverDevices)}${field(company,'monthlyPrice','Cena miesięczna',license.monthlyPrice??'','number','min="0" step="0.01"')}${field(company,'currency','Waluta',license.currency||'PLN','text','maxlength="3"')}</div><p>Start triala: ${formatDate(license.trialStartedAt)} · koniec triala: ${formatDate(license.trialEndsAt)} · licencja płatna do: ${formatDate(license.paidEndsAt)}</p><div class="actions"><a class="btn" href="company.html">Panel firmy</a><button class="btn" data-owner-action="save:${esc(company.id)}">Zapisz dane, limity i cenę</button><button class="btn" data-owner-action="extend:${esc(company.id)}">Przedłuż trial</button><button class="btn" data-owner-action="end:${esc(company.id)}">Zakończ trial</button><button class="btn primary" data-owner-action="paid:${esc(company.id)}">Nadaj licencję płatną</button><button class="btn dangerText" data-owner-action="block:${esc(company.id)}">${license.blocked||license.status==='blocked'?'Odblokuj firmę':'Zablokuj firmę'}</button></div><details><summary>Historia zmian (${company.history.length})</summary>${company.history.slice().reverse().map(entry=>`<div>${formatDate(entry.at)} - ${esc(entry.type)}</div>`).join('')}</details></section>`;
}
function render(){
  const logout='<div class="actions" style="justify-content:flex-end"><button class="btn" id="ownerLogout">Wyloguj bezpiecznie</button></div>';
  root.innerHTML=logout+createCompanyView()+(companies.map(companyView).join('')||'<div class="empty">Nie utworzono jeszcze żadnej firmy.</div>');
}
const value=(id,key)=>document.querySelector(`[data-company="${CSS.escape(id)}"][data-field="${key}"]`)?.value??'';
async function refresh(){const result=await licenseCloudApi.ownerSnapshot();companies=result.companies||[];render()}
async function run(task,button){if(button)button.disabled=true;try{await task();await refresh()}catch(error){alert(error.message)}finally{if(button)button.disabled=false}}

document.addEventListener('submit',async event=>{
  if(event.target.id==='ownerLoginForm'){event.preventDefault();const form=event.target,button=form.querySelector('button'),data=new FormData(form);button.disabled=true;try{await ownerLogin(data.get('email'),data.get('password'));form.reset();await refresh()}catch(error){clearOwnerSession();loginView(error.message)}return}
  if(event.target.id!=='newCompanyForm')return;event.preventDefault();const data=new FormData(event.target);await run(()=>licenseCloudApi.ownerCreateCompany({name:data.get('name'),adminEmail:data.get('adminEmail'),trialDays:Number(data.get('trialDays'))||14,country:'PL',currency:'PLN'}));event.target.reset();event.target.elements.trialDays.value='14';
});
document.addEventListener('click',async event=>{
  const logoutButton=event.target.closest('#ownerLogout');if(logoutButton){logoutButton.disabled=true;try{await ownerLogout()}catch{}finally{companies=[];loginView()}return}
  const button=event.target.closest('[data-owner-action]');if(!button)return;const [action,id]=button.dataset.ownerAction.split(':'),company=companies.find(item=>item.id===id);if(!company)return;
  if(action==='save')run(async()=>{await licenseCloudApi.ownerUpdateCompany({companyId:id,name:value(id,'name'),adminEmail:value(id,'adminEmail')});await licenseCloudApi.ownerUpdateLicense({companyId:id,trialDays:Number(value(id,'trialDays')),adminDeviceLimit:Number(value(id,'adminDevices')),driverLimit:Number(value(id,'drivers')),driverDeviceLimit:Number(value(id,'driverDevices')),monthlyPrice:value(id,'monthlyPrice'),currency:value(id,'currency')})},button);
  if(action==='extend'){const days=Number(prompt('O ile dni przedłużyć trial?',company.license.trialDays))||company.license.trialDays;run(()=>licenseCloudApi.ownerExtendTrial(id,days),button)}
  if(action==='end'&&confirm('Zakończyć trial tej firmy?'))run(()=>licenseCloudApi.ownerEndTrial(id),button);
  if(action==='paid'){const days=Number(prompt('Na ile dni nadać licencję?',365))||365;run(()=>licenseCloudApi.ownerGrantPaid(id,days),button)}
  if(action==='block'&&confirm(company.license.blocked||company.license.status==='blocked'?'Odblokować firmę?':'Zablokować firmę?'))run(()=>licenseCloudApi.ownerSetBlocked(id,!(company.license.blocked||company.license.status==='blocked')),button);
});
if(loadOwnerSession())refresh().catch(error=>{clearOwnerSession();loginView(error.message)});else loginView();
