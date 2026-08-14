import {clearOwnerSession,licenseCloudApi,loadOwnerSession,ownerLogin} from './license-cloud-api.js';
import {esc,formatDate,STATUS_LABELS} from './license-view-helpers.js';

let companies=[];
const root=document.querySelector('#ownerCompanies');
const createSection=document.querySelector('#newCompanyForm')?.closest('section');
const statusName=c=>STATUS_LABELS[c.license.status]||c.license.status;
const field=(c,key,label,value,type='number',extra='')=>`<label>${label}<input data-company="${esc(c.id)}" data-field="${key}" type="${type}" value="${esc(value??'')}" ${extra}></label>`;

function loginView(message=''){
  if(createSection)createSection.hidden=true;
  root.innerHTML=`<section class="ownerCompany"><h2>Logowanie właściciela systemu</h2><p class="muted">Uprawnienia właściciela są sprawdzane wyłącznie przez centralny backend.</p>${message?`<div class="notice">${esc(message)}</div>`:''}<form id="ownerLoginForm" class="ownerFields"><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Hasło<input name="password" type="password" autocomplete="current-password" minlength="12" required></label><button class="btn primary" type="submit">Zaloguj</button></form></section>`;
}
function render(){
  if(createSection)createSection.hidden=false;
  const logout='<div class="actions" style="justify-content:flex-end"><button class="btn" id="ownerLogout">Wyloguj właściciela</button></div>';
  root.innerHTML=logout+(companies.map(c=>{const l=c.license;return `<section class="ownerCompany"><h2>${esc(c.name)}</h2><p><strong>${esc(statusName(c))}</strong> · administratorzy ${c.adminDevices.length}/${l.limits.adminDevices}, kierowcy ${c.drivers.length}/${l.limits.drivers}, urządzenia kierowców ${c.driverDevices.length}/${l.limits.driverDevices}</p><div class="ownerFields">${field(c,'name','Nazwa firmy',c.name,'text','required')}${field(c,'adminEmail','E-mail administratora',c.adminEmail,'email')}${field(c,'trialDays','Trial (dni)',l.trialDays)}${field(c,'adminDevices','Limit urządzeń administratorów',l.limits.adminDevices)}${field(c,'drivers','Limit kierowców',l.limits.drivers)}${field(c,'driverDevices','Limit urządzeń kierowców',l.limits.driverDevices)}${field(c,'monthlyPrice','Cena miesięczna',l.monthlyPrice??'','number','min="0" step="0.01"')}${field(c,'currency','Waluta',l.currency||'PLN','text','maxlength="3"')}</div><p>Start triala: ${formatDate(l.trialStartedAt)} · koniec triala: ${formatDate(l.trialEndsAt)} · licencja płatna do: ${formatDate(l.paidEndsAt)}</p><div class="actions"><a class="btn" href="company.html">Panel firmy</a><button class="btn" data-owner-action="save:${esc(c.id)}">Zapisz dane, limity i cenę</button><button class="btn" data-owner-action="extend:${esc(c.id)}">Przedłuż trial</button><button class="btn" data-owner-action="end:${esc(c.id)}">Zakończ trial</button><button class="btn primary" data-owner-action="paid:${esc(c.id)}">Nadaj licencję płatną</button><button class="btn dangerText" data-owner-action="block:${esc(c.id)}">${l.blocked||l.status==='blocked'?'Odblokuj firmę':'Zablokuj firmę'}</button></div><details><summary>Historia zmian (${c.history.length})</summary>${c.history.slice().reverse().map(e=>`<div>${formatDate(e.at)} — ${esc(e.type)}</div>`).join('')}</details></section>`}).join('')||'<div class="empty">Nie utworzono jeszcze żadnej firmy.</div>');
}
const value=(id,key)=>document.querySelector(`[data-company="${CSS.escape(id)}"][data-field="${key}"]`)?.value??'';
async function refresh(){const result=await licenseCloudApi.ownerSnapshot();companies=result.companies||[];render()}
async function run(task,button){if(button)button.disabled=true;try{await task();await refresh()}catch(error){alert(error.message)}finally{if(button)button.disabled=false}}

document.addEventListener('submit',async event=>{
  if(event.target.id==='ownerLoginForm'){event.preventDefault();const d=new FormData(event.target);try{await ownerLogin(d.get('email'),d.get('password'));await refresh()}catch(error){loginView(error.message)}return}
  if(event.target.id!=='newCompanyForm')return;event.preventDefault();const d=new FormData(event.target);await run(()=>licenseCloudApi.ownerCreateCompany({name:d.get('name'),adminEmail:d.get('adminEmail'),trialDays:Number(d.get('trialDays'))||14,country:'PL',currency:'PLN'}));event.target.reset();event.target.elements.trialDays.value='14';
});
document.addEventListener('click',event=>{
  if(event.target.closest('#ownerLogout')){clearOwnerSession();companies=[];loginView();return}
  const button=event.target.closest('[data-owner-action]');if(!button)return;const [action,id]=button.dataset.ownerAction.split(':'),c=companies.find(x=>x.id===id);if(!c)return;
  if(action==='save')run(async()=>{await licenseCloudApi.ownerUpdateCompany({companyId:id,name:value(id,'name'),adminEmail:value(id,'adminEmail')});await licenseCloudApi.ownerUpdateLicense({companyId:id,trialDays:Number(value(id,'trialDays')),adminDeviceLimit:Number(value(id,'adminDevices')),driverLimit:Number(value(id,'drivers')),driverDeviceLimit:Number(value(id,'driverDevices')),monthlyPrice:value(id,'monthlyPrice'),currency:value(id,'currency')})},button);
  if(action==='extend'){const days=Number(prompt('O ile dni przedłużyć trial?',c.license.trialDays))||c.license.trialDays;run(()=>licenseCloudApi.ownerExtendTrial(id,days),button)}
  if(action==='end'&&confirm('Zakończyć trial tej firmy?'))run(()=>licenseCloudApi.ownerEndTrial(id),button);
  if(action==='paid'){const days=Number(prompt('Na ile dni nadać licencję?',365))||365;run(()=>licenseCloudApi.ownerGrantPaid(id,days),button)}
  if(action==='block'&&confirm(c.license.blocked||c.license.status==='blocked'?'Odblokować firmę?':'Zablokować firmę?'))run(()=>licenseCloudApi.ownerSetBlocked(id,!(c.license.blocked||c.license.status==='blocked')),button);
});
if(loadOwnerSession())refresh().catch(error=>loginView(error.message));else loginView();
