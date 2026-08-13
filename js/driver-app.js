import {activateDriver,effectiveStatus,mayUse} from './license-model.js';
import {getDeviceIdentity} from './device-identity.js';
import {loadStore,saveStore} from './license-store.js';
import {esc,statusLabel} from './license-view-helpers.js';

let store=loadStore();const token=new URLSearchParams(location.search).get('token');
const match=()=>{for(const company of store.companies){const driver=company.drivers.find(item=>item.activationToken===token);if(driver)return {company,driver}}return null};
function render(){const root=document.querySelector('#driverApp'),found=match();if(!token){root.innerHTML='<div class="notice">Brak tokenu aktywacyjnego. Otwórz indywidualny link otrzymany od firmy.</div>';return}if(!found){root.innerHTML='<div class="notice">Link nie został rozpoznany. W wersji lokalnej link działa tylko w przeglądarce, w której firma utworzyła kierowcę. Docelowo sprawdzi go centralny backend.</div>';return}const {company,driver}=found;root.innerHTML=`<div class="hero"><div><span class="badge">APLIKACJA KIEROWCY</span><h2>${esc(driver.name)}</h2><p>Firma: ${esc(company.name)}</p><p>Status licencji firmy: <strong>${esc(statusLabel(company))}</strong></p>${driver.status==='active'&&mayUse(company)?'<div class="notice info">Urządzenie jest aktywne. Tutaj pojawią się przypisane kursy kierowcy.</div>':`<button class="btn primary" id="activateDriver">Aktywuj to urządzenie</button>`}</div><div class="road"></div></div>`}
document.addEventListener('click',event=>{if(event.target.id!=='activateDriver')return;const found=match();try{activateDriver(found.company,found.driver.id,getDeviceIdentity());saveStore(store);render()}catch(error){alert(error.message)}});
render();
