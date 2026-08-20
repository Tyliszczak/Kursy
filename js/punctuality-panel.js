import {requestApi,loadCompanySession,usingSecurityGateway} from './registration-api.js';
import {getDeviceIdentity} from './device-identity.js';
import {ensureAdminDevice} from './license-cloud-api.js';
import {analyzePunctuality,summarizeRouteRecommendations} from './punctuality-analysis.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function companyToken(){const token=loadCompanySession()?.token;if(!token&&!usingSecurityGateway())throw new Error('Sesja firmy wygasła.');return token||''}
async function fetchEvents(){await ensureAdminDevice();return requestApi('companyPunctuality',{sessionToken:companyToken(),...getDeviceIdentity()})}

function itemHtml(item){const sign=item.proposedShiftMinutes>0?'+':'';return `<div class="item"><div><strong>${esc(item.stopName||'Przystanek')}</strong><br><small>${esc(item.reason)} ${item.samples} przejazdów, powtarzalność ${item.consistency}%.</small></div><div class="itemActions"><span class="badge">Propozycja ${sign}${item.proposedShiftMinutes} min</span></div></div>`}
function routeHtml(group){return `<div class="panel" style="margin-top:14px"><div class="sectionTop"><div><h3>${esc(group.routeName||'Trasa')}</h3><p class="muted">${group.items.length} ${group.items.length===1?'miejsce wymaga':'miejsca wymagają'} sprawdzenia.</p></div></div><div class="list">${group.items.map(itemHtml).join('')}</div></div>`}

function renderEmpty(root){root.innerHTML='<div class="notice info">Na razie nie ma wystarczającej liczby powtarzalnych przejazdów, żeby proponować zmiany. System zacznie podpowiadać dopiero po zebraniu wiarygodnych danych.</div>'}
function renderError(root,error){root.innerHTML=`<div class="notice">Analiza jest przygotowana, ale magazyn danych przejazdów nie odpowiada jeszcze z backendu. ${esc(error?.message||'')}</div>`}

export async function refreshPunctualityPanel(){
  const root=$('#punctualityResults');if(!root)return;
  root.innerHTML='<div class="notice info">Analizuję przejazdy…</div>';
  try{
    const response=await fetchEvents();
    const events=Array.isArray(response.events)?response.events:Array.isArray(response.data)?response.data:[];
    const recommendations=analyzePunctuality(events);
    if(!recommendations.length)return renderEmpty(root);
    root.innerHTML=summarizeRouteRecommendations(recommendations).map(routeHtml).join('');
  }catch(error){renderError(root,error)}
}

document.addEventListener('click',event=>{
  const nav=event.target.closest('[data-view="punctuality"]');if(nav)setTimeout(refreshPunctualityPanel,0);
  if(event.target.closest('#refreshPunctuality'))refreshPunctualityPanel();
});
