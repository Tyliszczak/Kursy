import {licenseCloudApi} from './license-cloud-api.js';

const CACHE_KEY='kursy.driver.activation-links.v1';
const root=document.querySelector('#companyLicensePanel');

function readLinks(){
  try{return JSON.parse(sessionStorage.getItem(CACHE_KEY)||'{}')||{}}catch{return {}}
}
function saveLinks(value){sessionStorage.setItem(CACHE_KEY,JSON.stringify(value))}
function activationUrl(token){const url=new URL('driver.html',location.href);url.hash=`activate=${encodeURIComponent(token)}`;return url.href}
function getLink(driverId){
  const item=readLinks()[driverId];
  if(!item)return null;
  if(item.expiresAt&&new Date(item.expiresAt)<=new Date())return null;
  return item;
}
function setLink(driverId,item){const links=readLinks();links[driverId]=item;saveLinks(links)}
async function copyText(text){
  if(navigator.clipboard?.writeText&&document.hasFocus()){
    try{await navigator.clipboard.writeText(text);return true}catch{}
  }
  const input=document.createElement('textarea');
  input.value=text;input.setAttribute('readonly','');input.style.position='fixed';input.style.left='-9999px';input.style.top='0';
  document.body.appendChild(input);input.focus();input.select();input.setSelectionRange(0,input.value.length);
  let copied=false;try{copied=document.execCommand('copy')}catch{}input.remove();
  if(copied)return true;
  prompt('Skopiuj link z pola poniżej:',text);return false;
}
function closeMenu(button){button.closest('details')?.removeAttribute('open')}
function menuButton(label,attrs='',className=''){return `<button type="button" class="actionMenuItem ${className}" ${attrs}>${label}</button>`}
function enhanceRow(row){
  const actions=row.querySelector('.itemActions');
  const copy=actions?.querySelector('[data-copy-driver]');
  if(!actions||!copy||actions.dataset.driverMenus==='1')return;
  const driverId=copy.dataset.copyDriver;
  if(!driverId||String(driverId).startsWith('local_pending_'))return;
  const sms=actions.querySelector('[data-sms-driver]');
  const release=actions.querySelector('[data-release-driver-devices]');
  const block=actions.querySelector('[data-block-driver]');
  const remove=actions.querySelector('[data-delete-driver]');
  if(!block||!remove)return;
  actions.dataset.driverMenus='1';
  [copy,sms,release,block,remove].filter(Boolean).forEach(button=>{button.hidden=true});
  const blocked=block.textContent.trim().toLowerCase().includes('odblok');
  const cached=getLink(driverId);
  const linkMenu=document.createElement('details');
  linkMenu.className='actionMenu';
  linkMenu.innerHTML=`<summary class="btn">Link aktywacyjny</summary><div class="actionMenuPanel">
    ${menuButton('Generuj nowy link',`data-generate-driver-link="${driverId}"`)}
    ${menuButton('Kopiuj link',`data-copy-current-link="${driverId}"${cached?'':' disabled'}`)}
    ${release?menuButton('Zwolnij aktualne urządzenie',`data-release-current-device="${driverId}"`):''}
  </div>`;
  const manageMenu=document.createElement('details');
  manageMenu.className='actionMenu';
  manageMenu.innerHTML=`<summary class="btn dangerBtn">Zarządzaj kierowcą</summary><div class="actionMenuPanel">
    ${menuButton(blocked?'Odblokuj kierowcę':'Zablokuj kierowcę',`data-driver-block-menu="${driverId}"`,blocked?'':'dangerAction')}
    ${menuButton('Usuń kierowcę',`data-driver-delete-menu="${driverId}"`,'dangerAction')}
  </div>`;
  actions.append(linkMenu,manageMenu);
}
function enhance(){root?.querySelectorAll('.licenseRow').forEach(enhanceRow)}

root&&new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
enhance();

document.addEventListener('click',async event=>{
  const generate=event.target.closest('[data-generate-driver-link]');
  if(generate){
    event.preventDefault();event.stopPropagation();
    const driverId=generate.dataset.generateDriverLink;
    if(!confirm('Wygenerować nowy link aktywacyjny? Poprzedni link przestanie działać.'))return;
    const original=generate.textContent;generate.disabled=true;generate.textContent='Generowanie…';
    try{
      const result=await licenseCloudApi.createDriverActivation(driverId);
      const item={url:activationUrl(result.activationToken),expiresAt:result.expiresAt||'',createdAt:new Date().toISOString()};
      setLink(driverId,item);
      const copyButton=generate.closest('.actionMenuPanel')?.querySelector('[data-copy-current-link]');if(copyButton)copyButton.disabled=false;
      alert('Nowy link został wygenerowany. Możesz go teraz skopiować.');
    }catch(error){alert(error.message||'Nie udało się wygenerować linku.')}finally{generate.disabled=false;generate.textContent=original;closeMenu(generate)}
    return;
  }
  const copy=event.target.closest('[data-copy-current-link]');
  if(copy){
    event.preventDefault();event.stopPropagation();
    const item=getLink(copy.dataset.copyCurrentLink);
    if(!item){alert('Nie ma zapamiętanego ważnego linku. Wybierz najpierw „Generuj nowy link”.');return}
    const done=await copyText(item.url);if(done)alert('Link do aplikacji kierowcy został skopiowany.');closeMenu(copy);return;
  }
  const release=event.target.closest('[data-release-current-device]');
  if(release){
    event.preventDefault();event.stopPropagation();
    const original=root.querySelector(`[data-release-driver-devices="${CSS.escape(release.dataset.releaseCurrentDevice)}"]`);
    closeMenu(release);original?.click();return;
  }
  const block=event.target.closest('[data-driver-block-menu]');
  if(block){
    event.preventDefault();event.stopPropagation();
    const original=root.querySelector(`[data-block-driver="${CSS.escape(block.dataset.driverBlockMenu)}"]`);
    closeMenu(block);original?.click();return;
  }
  const remove=event.target.closest('[data-driver-delete-menu]');
  if(remove){
    event.preventDefault();event.stopPropagation();
    const original=root.querySelector(`[data-delete-driver="${CSS.escape(remove.dataset.driverDeleteMenu)}"]`);
    closeMenu(remove);original?.click();return;
  }
  if(!event.target.closest('.actionMenu'))document.querySelectorAll('.actionMenu[open]').forEach(menu=>menu.removeAttribute('open'));
});
