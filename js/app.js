import {loadRepoData} from './data.js';
import {checkApi} from './api.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DRAFT_ROUTES_KEY='kursy.routes.draft.v1';
let state={company:null,routes:[],repoRoutes:[],courses:[],activeCourse:null,activeStop:0};
let deferredInstallPrompt=null;

function show(name){$$('.view').forEach(v=>v.hidden=v.id!==`view-${name}`);$$('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('#pageTitle').textContent={home:'Strona główna',driver:'Tryb kierowcy',routes:'Trasy',courses:'Kursy',admin:'Administracja'}[name]||'Kursy'}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function clone(v){return JSON.parse(JSON.stringify(v))}
function routeById(id){return state.routes.find(r=>r.id===id)}
function makeId(prefix='route'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
function loadDraftRoutes(){try{const raw=localStorage.getItem(DRAFT_ROUTES_KEY);return raw?JSON.parse(raw):null}catch{return null}}
function saveDraftRoutes(){localStorage.setItem(DRAFT_ROUTES_KEY,JSON.stringify(state.routes));$('#draftNotice').hidden=false;$('#dataStatus').textContent='Wersja robocza';renderAll()}
function clearDraftRoutes(){localStorage.removeItem(DRAFT_ROUTES_KEY);state.routes=clone(state.repoRoutes);$('#draftNotice').hidden=true;$('#dataStatus').textContent='Repozytorium';renderAll()}
function mapUrl(location){return location?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`:''}
function renderAll(){renderHome();renderRoutes();renderCourses();renderDriver()}
function renderHome(){$('#companyName').textContent=state.company?.name||'—';$('#routesCount').textContent=state.routes.length;$('#coursesCount').textContent=state.courses.length}
function renderRoutes(){const box=$('#routesList');if(!state.routes.length){box.innerHTML='<div class="empty">Nie ma jeszcze żadnej trasy. Kliknij „Dodaj trasę”, aby utworzyć pierwszą.</div>';return}box.innerHTML=state.routes.map(r=>`<div class="item"><div><strong>${esc(r.name)}</strong><br><small>${(r.stops||[]).length} przystanków • ${esc(r.description||'Bez opisu')}</small></div><div class="itemActions"><button class="btn" data-edit-route="${esc(r.id)}">Edytuj</button><button class="btn dangerText" data-delete-route="${esc(r.id)}">Usuń</button></div></div>`).join('');$$('[data-edit-route]').forEach(b=>b.onclick=()=>openRouteEditor(b.dataset.editRoute));$$('[data-delete-route]').forEach(b=>b.onclick=()=>deleteRoute(b.dataset.deleteRoute))}
function renderCourses(){const box=$('#coursesList');if(!state.courses.length){box.innerHTML='<div class="empty">Brak kursów w repozytorium.</div>';return}box.innerHTML=state.courses.map(c=>{const r=routeById(c.routeId);return `<div class="item"><div><strong>${esc(c.name||r?.name||c.id)}</strong><br><small>${esc(c.departure||'—')} • ${esc((c.days||[]).join(', ')||'brak dni')} • ${esc(r?.name||'Brak trasy')}</small></div></div>`}).join('')}
function renderDriver(){const box=$('#driverCourses');if(!state.courses.length){box.innerHTML='<div class="empty">Brak kursów do realizacji.</div>';return}box.innerHTML=state.courses.map(c=>{const r=routeById(c.routeId);return `<div class="item"><div><strong>${esc(c.name||r?.name||c.id)}</strong><br><small>${esc(c.departure||'—')} • ${esc(r?.name||'Brak trasy')}</small></div><button class="btn primary" data-start="${esc(c.id)}">Otwórz</button></div>`}).join('');$$('[data-start]').forEach(b=>b.onclick=()=>startCourse(b.dataset.start))}
function startCourse(id){const c=state.courses.find(x=>x.id===id);if(!c)return;state.activeCourse=c;state.activeStop=0;renderActiveCourse()}
function renderActiveCourse(){const wrap=$('#activeCourse');if(!state.activeCourse){wrap.hidden=true;return}const r=routeById(state.activeCourse.routeId),stops=r?.stops||[];wrap.hidden=false;$('#activeCourseTitle').textContent=state.activeCourse.name||r?.name||state.activeCourse.id;$('#activeCourseMeta').textContent=`${state.activeCourse.departure||'—'} • ${r?.name||'Brak trasy'}`;$('#activeStops').innerHTML=stops.map((s,i)=>{const loc=s.location||s.coordinates||'';return `<div class="driverStop ${i===state.activeStop?'active':''}"><div><strong>${i+1}. ${esc(s.name)}</strong>${s.time?`<div class="stopClock">🕒 ${esc(s.time)}</div>`:''}</div>${loc?`<a class="btn mapBtn" href="${mapUrl(loc)}" target="_blank" rel="noopener">📍 MAPA</a>`:''}</div>`}).join('')||'<div class="empty">Ta trasa nie ma przystanków.</div>';$('#nextStopBtn').disabled=!stops.length||state.activeStop>=stops.length-1}

const hours=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const minutes=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'));
const WHEEL_COPIES=5;
function wheelHtml(type,values){const repeated=Array.from({length:WHEEL_COPIES},(_,cycle)=>values.map(v=>`<button type="button" class="wheelOption" data-value="${v}" data-cycle="${cycle}">${v}</button>`).join('')).join('');return `<div class="wheelColumn" data-wheel="${type}"><div class="wheelPad"></div>${repeated}<div class="wheelPad"></div></div>`}
function setupWheel(row,type,value){
  const wheel=row.querySelector(`[data-wheel="${type}"]`),hidden=row.querySelector(type==='hour'?'.stopHour':'.stopMinute');
  const opts=[...wheel.querySelectorAll('.wheelOption')];
  const middleCycle=Math.floor(WHEEL_COPIES/2);
  let timer,recentering=false;
  const mark=v=>{hidden.value=v;opts.forEach(o=>o.classList.toggle('selected',o.dataset.value===v))};
  const centerOption=(opt,behavior='auto')=>{if(!opt)return;const top=opt.offsetTop-(wheel.clientHeight-opt.offsetHeight)/2;wheel.scrollTo({top,behavior})};
  const middleOption=v=>opts.find(o=>o.dataset.value===v&&Number(o.dataset.cycle)===middleCycle);
  function settle(){
    const center=wheel.scrollTop+wheel.clientHeight/2;
    let best=opts[0],dist=Infinity;
    opts.forEach(o=>{const d=Math.abs((o.offsetTop+o.offsetHeight/2)-center);if(d<dist){dist=d;best=o}});
    mark(best.dataset.value);
    const cycle=Number(best.dataset.cycle);
    if(cycle<=1||cycle>=WHEEL_COPIES-2){
      const target=middleOption(best.dataset.value);
      if(target){recentering=true;centerOption(target,'auto');requestAnimationFrame(()=>{recentering=false})}
    }else centerOption(best,'smooth');
  }
  opts.forEach(o=>o.onclick=()=>{mark(o.dataset.value);centerOption(o,'smooth')});
  wheel.addEventListener('scroll',()=>{if(recentering)return;clearTimeout(timer);timer=setTimeout(settle,80)},{passive:true});
  requestAnimationFrame(()=>{const initial=middleOption(value||'00');mark(value||'00');centerOption(initial,'auto')});
}
function updateMapButton(row){const input=row.querySelector('.stopLocation'),a=row.querySelector('.stopMap');const url=mapUrl(input.value.trim());if(url){a.href=url;a.classList.remove('disabled');a.removeAttribute('aria-disabled')}else{a.removeAttribute('href');a.classList.add('disabled');a.setAttribute('aria-disabled','true')}}
function stopRow(stop={}){const row=document.createElement('div');row.className='stopRow';const time=String(stop.time||'00:00').match(/^(\d{2}):(\d{2})$/);const hh=time?.[1]||'00',mm=time?.[2]||'00',location=stop.location||stop.coordinates||'';row.innerHTML=`<div class="stopNo"></div><div class="stopMain"><label class="field"><span>Nazwa przystanku *</span><input class="stopName" required placeholder="np. Dworzec PKS" value="${esc(stop.name||'')}"></label><label class="field"><span>Lokalizacja / współrzędne *</span><div class="locationLine"><input class="stopLocation" required placeholder="np. 51.9429, 15.5078 lub adres" value="${esc(location)}"><a class="btn stopMap" target="_blank" rel="noopener">📍 Mapa</a></div></label></div><div class="timeField"><span>Godzina na przystanku</span><div class="timePicker"><input class="stopHour" type="hidden" value="${hh}"><input class="stopMinute" type="hidden" value="${mm}">${wheelHtml('hour',hours)}<div class="timeColon">:</div>${wheelHtml('minute',minutes)}</div></div><div class="stopActions"><button type="button" class="iconBtn" data-up title="Przesuń w górę">↑</button><button type="button" class="iconBtn" data-down title="Przesuń w dół">↓</button><button type="button" class="iconBtn dangerText" data-remove title="Usuń">✕</button></div>`;row.querySelector('[data-remove]').onclick=()=>{row.remove();renumberStops()};row.querySelector('[data-up]').onclick=()=>{const prev=row.previousElementSibling;if(prev){row.parentNode.insertBefore(row,prev);renumberStops()}};row.querySelector('[data-down]').onclick=()=>{const next=row.nextElementSibling;if(next){row.parentNode.insertBefore(next,row);renumberStops()}};row.querySelector('.stopLocation').addEventListener('input',()=>updateMapButton(row));updateMapButton(row);setupWheel(row,'hour',hh);setupWheel(row,'minute',mm);return row}
function renumberStops(){[...$('#stopRows').children].forEach((r,i)=>r.querySelector('.stopNo').textContent=i+1)}
function addStop(stop={}){$('#stopRows').appendChild(stopRow(stop));renumberStops()}
function openRouteEditor(id=null){const r=id?routeById(id):null;$('#routeEditorTitle').textContent=r?'Edytuj trasę':'Nowa trasa';$('#routeId').value=r?.id||'';$('#routeName').value=r?.name||'';$('#routeDescription').value=r?.description||'';$('#stopRows').innerHTML='';(r?.stops?.length?r.stops:[{}]).forEach(addStop);$('#routeEditor').hidden=false;$('#routeEditor').scrollIntoView({behavior:'smooth',block:'start'})}
function closeRouteEditor(){$('#routeEditor').hidden=true;$('#routeForm').reset();$('#stopRows').innerHTML=''}
function collectStops(){return [...$('#stopRows').querySelectorAll('.stopRow')].map(row=>({name:row.querySelector('.stopName').value.trim(),location:row.querySelector('.stopLocation').value.trim(),time:`${row.querySelector('.stopHour').value}:${row.querySelector('.stopMinute').value}`})).filter(s=>s.name)}
function saveRouteFromForm(e){e.preventDefault();const name=$('#routeName').value.trim(),stops=collectStops();if(!name){alert('Podaj nazwę trasy.');return}if(stops.length<2){alert('Trasa powinna mieć co najmniej dwa przystanki.');return}if(stops.some(s=>!s.location)){alert('Każdy przystanek musi mieć lokalizację lub współrzędne.');return}const id=$('#routeId').value||makeId(),route={id,name,description:$('#routeDescription').value.trim(),stops};const idx=state.routes.findIndex(r=>r.id===id);if(idx>=0)state.routes[idx]=route;else state.routes.push(route);saveDraftRoutes();closeRouteEditor()}
function deleteRoute(id){const r=routeById(id);if(!r)return;if(!confirm(`Usunąć trasę „${r.name}”?`))return;state.routes=state.routes.filter(x=>x.id!==id);saveDraftRoutes()}
function exportRoutes(){const blob=new Blob([JSON.stringify(state.routes,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='routes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function resetRoutes(){if(confirm('Usunąć lokalne zmiany i ponownie wczytać trasy z repozytorium?')){clearDraftRoutes();closeRouteEditor()}}

function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function showInstallBanner(){if(!isStandalone())$('#installBanner').hidden=false}
function hideInstallBanner(){$('#installBanner').hidden=true}
function setupInstall(){if(isStandalone())return;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;showInstallBanner()});addEventListener('appinstalled',()=>{deferredInstallPrompt=null;hideInstallBanner()});$('#installBtn').onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;hideInstallBanner();return}const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);alert(isiOS?'W Safari wybierz Udostępnij, a następnie „Dodaj do ekranu początkowego”.':'Jeśli okno instalacji nie pojawiło się automatycznie, otwórz menu przeglądarki i wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.')};$('#installClose').onclick=hideInstallBanner;setTimeout(showInstallBanner,1200)}
$('#nextStopBtn').onclick=()=>{state.activeStop++;renderActiveCourse()};$('#closeCourseBtn').onclick=()=>{state.activeCourse=null;renderActiveCourse()};

async function init(){$$('.nav button[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));$('#addRouteBtn').onclick=()=>openRouteEditor();$('#addStopBtn').onclick=()=>addStop();$('#closeRouteEditor').onclick=closeRouteEditor;$('#cancelRouteBtn').onclick=closeRouteEditor;$('#routeForm').addEventListener('submit',saveRouteFromForm);$('#exportRoutesBtn').onclick=exportRoutes;$('#resetRoutesBtn').onclick=resetRoutes;addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();setupInstall();try{const data=await loadRepoData();state={...state,...data,repoRoutes:clone(data.routes||[])};const draft=loadDraftRoutes();if(Array.isArray(draft)){state.routes=draft;$('#draftNotice').hidden=false;$('#dataStatus').textContent='Wersja robocza'}else{$('#dataStatus').textContent='Repozytorium'}renderAll()}catch(err){$('#dataStatus').textContent='Błąd danych';$('#loadError').hidden=false;$('#loadError').textContent=err.message}const api=await checkApi();$('#apiStatus').textContent=api.label;if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js');reg.update()}}
function updateNetwork(){const on=navigator.onLine;$('#netState').textContent=on?'Online':'Offline';$('#netDot').classList.toggle('off',!on)}
init();
