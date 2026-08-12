import {loadRepoData} from './data.js';
import {checkApi} from './api.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state={company:null,routes:[],courses:[],activeCourse:null,activeStop:0};

function show(name){
  $$('.view').forEach(v=>v.hidden=v.id!==`view-${name}`);
  $$('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('#pageTitle').textContent={home:'Strona główna',driver:'Tryb kierowcy',routes:'Trasy',courses:'Kursy',admin:'Administracja'}[name]||'Kursy';
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function routeById(id){return state.routes.find(r=>r.id===id)}
function renderHome(){
  $('#companyName').textContent=state.company?.name||'—';
  $('#routesCount').textContent=state.routes.length;
  $('#coursesCount').textContent=state.courses.length;
}
function renderRoutes(){
  const box=$('#routesList');
  if(!state.routes.length){box.innerHTML='<div class="empty">Brak tras w repozytorium. Dodaj je w pliku data/routes.json.</div>';return}
  box.innerHTML=state.routes.map(r=>`<div class="item"><div><strong>${esc(r.name)}</strong><br><small>${(r.stops||[]).length} przystanków • ${esc(r.description||'Bez opisu')}</small></div></div>`).join('');
}
function renderCourses(){
  const box=$('#coursesList');
  if(!state.courses.length){box.innerHTML='<div class="empty">Brak kursów w repozytorium. Dodaj je w pliku data/courses.json.</div>';return}
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
$('#nextStopBtn').onclick=()=>{state.activeStop++;renderActiveCourse()};
$('#closeCourseBtn').onclick=()=>{state.activeCourse=null;renderActiveCourse()};

async function init(){
  $$('.nav button[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));
  $$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
  addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();
  try{
    const data=await loadRepoData(); state={...state,...data};
    renderHome();renderRoutes();renderCourses();renderDriver();
    $('#dataStatus').textContent='Repozytorium';
  }catch(err){
    $('#dataStatus').textContent='Błąd danych';
    $('#loadError').hidden=false;$('#loadError').textContent=err.message;
  }
  const api=await checkApi(); $('#apiStatus').textContent=api.label;
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
}
function updateNetwork(){const on=navigator.onLine;$('#netState').textContent=on?'Online':'Offline';$('#netDot').classList.toggle('off',!on)}
init();
