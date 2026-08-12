import {loadRepoData} from './data.js';
import {checkApi} from './api.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DRAFT_ROUTES_KEY='kursy.routes.draft.v1';
let state={company:null,routes:[],repoRoutes:[],courses:[],activeCourse:null,activeStop:0};
let deferredInstallPrompt=null;

function show(name){
  $$('.view').forEach(v=>v.hidden=v.id!==`view-${name}`);
  $$('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('#pageTitle').textContent={home:'Strona główna',driver:'Tryb kierowcy',routes:'Trasy',courses:'Kursy',admin:'Administracja'}[name]||'Kursy';
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function clone(v){return JSON.parse(JSON.stringify(v))}
function routeById(id){return state.routes.find(r=>r.id===id)}
function makeId(prefix='route'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
function loadDraftRoutes(){try{const raw=localStorage.getItem(DRAFT_ROUTES_KEY);return raw?JSON.parse(raw):null}catch{return null}}
function saveDraftRoutes(){localStorage.setItem(DRAFT_ROUTES_KEY,JSON.stringify(state.routes));$('#draftNotice').hidden=false;$('#dataStatus').textContent='Wersja robocza';renderAll()}
function clearDraftRoutes(){localStorage.removeItem(DRAFT_ROUTES_KEY);state.routes=clone(state.repoRoutes);$('#draftNotice').hidden=true;$('#dataStatus').textContent='Repozytorium';renderAll()}
function renderAll(){renderHome();renderRoutes();renderCourses();renderDriver()}
function renderHome(){
  $('#companyName').textContent=state.company?.name||'—';
  $('#routesCount').textContent=state.routes.length;
  $('#coursesCount').textContent=state.courses.length;
}
function renderRoutes(){
  const box=$('#routesList');
  if(!state.routes.length){box.innerHTML='<div class="empty">Nie ma jeszcze żadnej trasy. Kliknij „Dodaj trasę”, aby utworzyć pierwszą.</div>';return}
  box.innerHTML=state.routes.map(r=>`<div class="item"><div><strong>${esc(r.name)}</strong><br><small>${(r.stops||[]).length} przystanków • ${esc(r.description||'Bez opisu')}</small></div><div class="itemActions"><button class="btn" data-edit-route="${esc(r.id)}">Edytuj</button><button class="btn dangerText" data-delete-route="${esc(r.id)}">Usuń</button></div></div>`).join('');
  $$('[data-edit-route]').forEach(b=>b.onclick=()=>openRouteEditor(b.dataset.editRoute));
  $$('[data-delete-route]').forEach(b=>b.onclick=()=>deleteRoute(b.dataset.deleteRoute));
}
function renderCourses(){
  const box=$('#coursesList');
  if(!state.courses.length){box.innerHTML='<div class="empty">Brak kursów w repozytorium.</div>';return}
  box.innerHTML=state.courses.map(c=>{const r=routeById(c.routeId);return `<div class="item"><div><strong>${esc(c.name||r?.name||c.id)}</strong><br><small>${esc(c.departure||'—')} • ${esc((c.days||[]).join(', ')||'brak dni')} • ${esc(r?.name||'Brak trasy')}</small></div></div>`}).join('');
}
function renderDriver(){
  const box=$('#driverCourses');
  if(!state.courses.length){box.innerHTML='<div class="empty">Brak kursów do realizacji.</div>';return}
  box.innerHTML=state.courses.map(c=>{const r=routeById(c.routeId);return `<div class="item"><div><strong>${esc(c.name||r?.name||c.id)}</strong><br><small>${esc(c.departure||'—')} • ${esc(r?.name||'Brak trasy')}</small></div><button class="btn primary" data-start="${esc(c.id)}">Otwórz</button></div>`}).join('');
  $$('[data-start]').forEach(b=>b.onclick=()=>startCourse(b.dataset.start));
}
function startCourse(id){
  const c=state.courses.find(x=>x.id===id); if(!c)return;
  state.activeCourse=c; state.activeStop=0; renderActiveCourse();
}
function renderActiveCourse(){
  const wrap=$('#activeCourse');
  if(!state.activeCourse){wrap.hidden=true;return}
  const r=routeById(state.activeCourse.routeId); const stops=r?.stops||[];
  wrap.hidden=false;
  $('#activeCourseTitle').textContent=state.activeCourse.name||r?.name||state.activeCourse.id;
  $('#activeCourseMeta').textContent=`${state.activeCourse.departure||'—'} • ${r?.name||'Brak trasy'}`;
  $('#activeStops').innerHTML=stops.map((s,i)=>`<div class="driverStop ${i===state.activeStop?'active':''}"><strong>${i+1}. ${esc(s.name)}</strong>${s.timeOffset!=null?`<div class="muted">+${esc(s.timeOffset)} min</div>`:''}</div>`).join('')||'<div class="empty">Ta trasa nie ma przystanków.</div>';
  $('#nextStopBtn').disabled=!stops.length||state.activeStop>=stops.length-1;
}

function stopRow(stop={}){
  const row=document.createElement('div');
  row.className='stopRow';
  row.innerHTML=`<div class="stopNo"></div><label class="field"><span>Nazwa przystanku *</span><input class="stopName" required placeholder="np. Dworzec PKS" value="${esc(stop.name||'')}"></label><label class="field smallField"><span>Minuty od startu</span><input class="stopOffset" type="number" min="0" step="1" placeholder="0" value="${stop.timeOffset??''}"></label><div class="stopActions"><button type="button" class="iconBtn" data-up title="Przesuń w górę">↑</button><button type="button" class="iconBtn" data-down title="Przesuń w dół">↓</button><button type="button" class="iconBtn dangerText" data-remove title="Usuń">✕</button></div>`;
  row.querySelector('[data-remove]').onclick=()=>{row.remove();renumberStops()};
  row.querySelector('[data-up]').onclick=()=>{const prev=row.previousElementSibling;if(prev){row.parentNode.insertBefore(row,prev);renumberStops()}};
  row.querySelector('[data-down]').onclick=()=>{const next=row.nextElementSibling;if(next){row.parentNode.insertBefore(next,row);renumberStops()}};
  return row;
}
function renumberStops(){[...$('#stopRows').children].forEach((r,i)=>r.querySelector('.stopNo').textContent=i+1)}
function addStop(stop={}){$('#stopRows').appendChild(stopRow(stop));renumberStops()}
function openRouteEditor(id=null){
  const r=id?routeById(id):null;
  $('#routeEditorTitle').textContent=r?'Edytuj trasę':'Nowa trasa';
  $('#routeId').value=r?.id||'';
  $('#routeName').value=r?.name||'';
  $('#routeDescription').value=r?.description||'';
  $('#stopRows').innerHTML='';
  const stops=r?.stops?.length?r.stops:[{}];
  stops.forEach(addStop);
  $('#routeEditor').hidden=false;
  $('#routeEditor').scrollIntoView({behavior:'smooth',block:'start'});
}
function closeRouteEditor(){$('#routeEditor').hidden=true;$('#routeForm').reset();$('#stopRows').innerHTML=''}
function collectStops(){
  return [...$('#stopRows').querySelectorAll('.stopRow')].map(row=>{
    const name=row.querySelector('.stopName').value.trim();
    const raw=row.querySelector('.stopOffset').value;
    const stop={name};
    if(raw!=='') stop.timeOffset=Number(raw);
    return stop;
  }).filter(s=>s.name);
}
function saveRouteFromForm(e){
  e.preventDefault();
  const name=$('#routeName').value.trim();
  const stops=collectStops();
  if(!name){alert('Podaj nazwę trasy.');return}
  if(stops.length<2){alert('Trasa powinna mieć co najmniej dwa przystanki.');return}
  const id=$('#routeId').value||makeId();
  const route={id,name,description:$('#routeDescription').value.trim(),stops};
  const idx=state.routes.findIndex(r=>r.id===id);
  if(idx>=0) state.routes[idx]=route; else state.routes.push(route);
  saveDraftRoutes();
  closeRouteEditor();
}
function deleteRoute(id){
  const r=routeById(id); if(!r)return;
  if(!confirm(`Usunąć trasę „${r.name}”?`))return;
  state.routes=state.routes.filter(x=>x.id!==id);
  saveDraftRoutes();
}
function exportRoutes(){
  const blob=new Blob([JSON.stringify(state.routes,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='routes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetRoutes(){if(confirm('Usunąć lokalne zmiany i ponownie wczytać trasy z repozytorium?')){clearDraftRoutes();closeRouteEditor()}}

function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function showInstallBanner(){if(!isStandalone()) $('#installBanner').hidden=false}
function hideInstallBanner(){$('#installBanner').hidden=true}
function setupInstall(){
  if(isStandalone()) return;
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;showInstallBanner()});
  addEventListener('appinstalled',()=>{deferredInstallPrompt=null;hideInstallBanner()});
  $('#installBtn').onclick=async()=>{
    if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;hideInstallBanner();return}
    const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(isiOS?'W Safari wybierz Udostępnij, a następnie „Dodaj do ekranu początkowego”.':'Jeśli okno instalacji nie pojawiło się automatycznie, otwórz menu przeglądarki i wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.');
  };
  $('#installClose').onclick=hideInstallBanner;
  setTimeout(showInstallBanner,1200);
}
$('#nextStopBtn').onclick=()=>{state.activeStop++;renderActiveCourse()};
$('#closeCourseBtn').onclick=()=>{state.activeCourse=null;renderActiveCourse()};

async function init(){
  $$('.nav button[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));
  $$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
  $('#addRouteBtn').onclick=()=>openRouteEditor();
  $('#addStopBtn').onclick=()=>addStop();
  $('#closeRouteEditor').onclick=closeRouteEditor;
  $('#cancelRouteBtn').onclick=closeRouteEditor;
  $('#routeForm').addEventListener('submit',saveRouteFromForm);
  $('#exportRoutesBtn').onclick=exportRoutes;
  $('#resetRoutesBtn').onclick=resetRoutes;
  addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();
  setupInstall();
  try{
    const data=await loadRepoData();
    state={...state,...data,repoRoutes:clone(data.routes||[])};
    const draft=loadDraftRoutes();
    if(Array.isArray(draft)){state.routes=draft;$('#draftNotice').hidden=false;$('#dataStatus').textContent='Wersja robocza'}else{$('#dataStatus').textContent='Repozytorium'}
    renderAll();
  }catch(err){
    $('#dataStatus').textContent='Błąd danych';
    $('#loadError').hidden=false;$('#loadError').textContent=err.message;
  }
  const api=await checkApi(); $('#apiStatus').textContent=api.label;
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
}
function updateNetwork(){const on=navigator.onLine;$('#netState').textContent=on?'Online':'Offline';$('#netDot').classList.toggle('off',!on)}
init();
