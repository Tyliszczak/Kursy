const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const MINUTES=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'));
const COPIES=5;
const DEFAULT_LOCATION='Centrum Zielonej Góry, Zielona Góra';
const DRAFT_ROUTES_KEY='kursy.routes.draft.v2';
let activeTimeButton=null;
let activeTimeKind='stop';
let applyingFixes=false;

function makeId(prefix='stop'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
function syncCard(card){
  if(!card)return;
  let data={};
  try{data=JSON.parse(card.dataset.stopData||'{}')}catch{}
  const row=card.querySelector('tr');
  if(!row)return;
  data.id=data.id||card.dataset.stopId||makeId();
  data.name=row.querySelector('.stopName')?.value.trim()||'';
  data.locationOut=row.querySelector('.locationOut')?.value.trim()||DEFAULT_LOCATION;
  data.locationReturn=row.querySelector('.locationReturn')?.value.trim()||data.locationOut;
  data.times=data.times||{};
  row.querySelectorAll('[data-time-service]').forEach(b=>data.times[b.dataset.timeService]=b.textContent.trim());
  card.dataset.stopId=data.id;
  card.dataset.stopData=JSON.stringify(data);
}
function syncAllCards(){document.querySelectorAll('#stopRows .stopCard').forEach(syncCard)}
function renumber(){document.querySelectorAll('#stopRows .stopCard').forEach((card,i)=>{const td=card.querySelector('tbody tr td'),v=String(i+1);if(td&&td.textContent!==v)td.textContent=v})}
function stopCards(){return [...document.querySelectorAll('#stopRows .stopCard')]}

function ensureImportControls(){
  const toolbar=document.querySelector('#view-routes .toolbar');
  if(!toolbar||document.getElementById('importRoutesBtn'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.id='importRoutesBtn';btn.textContent='Importuj dane';
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.id='importRoutesFile';input.hidden=true;
  toolbar.insertBefore(btn,toolbar.children[1]||null);toolbar.appendChild(input);
  btn.addEventListener('click',()=>{input.value='';input.click()});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      const routes=Array.isArray(parsed)?parsed:Array.isArray(parsed?.routes)?parsed.routes:null;
      if(!routes)throw new Error('Plik nie zawiera listy tras.');
      if(!confirm(`Zaimportować ${routes.length} tras z pliku „${file.name}”? Obecna lokalna wersja robocza zostanie zastąpiona.`)){input.value='';return}
      localStorage.setItem(DRAFT_ROUTES_KEY,JSON.stringify(routes));
      alert(`Zaimportowano ${routes.length} tras. Aplikacja zostanie odświeżona.`);
      location.reload();
    }catch(err){alert(`Nie udało się zaimportować danych: ${err.message||err}`);input.value=''}
  });
}

function stackLocations(){
  document.querySelectorAll('.routeTable').forEach(table=>{
    const head=table.querySelector('thead tr');
    if(head&&!head.dataset.locationsStacked){
      const ths=[...head.children],out=ths.find(th=>th.textContent.trim()==='Lokalizacja TAM'),ret=ths.find(th=>th.textContent.trim()==='Lokalizacja POWRÓT');
      if(out&&out.textContent!=='Lokalizacja TAM / POWRÓT')out.textContent='Lokalizacja TAM / POWRÓT';
      if(ret)ret.remove();
      head.dataset.locationsStacked='1';
    }
    table.querySelectorAll('tbody tr').forEach(row=>{
      if(row.dataset.locationsStacked)return;
      const outInput=row.querySelector('.locationOut'),retInput=row.querySelector('.locationReturn');
      if(!outInput||!retInput)return;
      const outTd=outInput.closest('td'),retTd=retInput.closest('td');
      if(!outTd||!retTd||outTd===retTd)return;
      const outCell=outTd.querySelector('.locationCell'),retCell=retTd.querySelector('.locationCell');
      if(outCell&&!outCell.querySelector('.locationLabel'))outCell.insertAdjacentHTML('afterbegin','<span class="locationLabel">TAM</span>');
      if(retCell){if(!retCell.querySelector('.locationLabel'))retCell.insertAdjacentHTML('afterbegin','<span class="locationLabel">POWRÓT</span>');retCell.classList.add('locationReturnStack');outTd.appendChild(retCell)}
      retTd.remove();row.dataset.locationsStacked='1';
    });
  });
}
function fixLabels(){
  document.querySelectorAll('.routeTable thead th').forEach(th=>{const t=th.textContent.trim();if(/^Do\s+\d{2}:\d{2}$/.test(t))th.textContent=t.replace(/^Do\s+/,'Na ')});
  document.querySelectorAll('.addStopBelow').forEach(b=>{if(b.textContent!=='+ Dodaj przystanek')b.textContent='+ Dodaj przystanek'});
  const exportBtn=document.getElementById('exportRoutesBtn');if(exportBtn&&exportBtn.textContent!=='Eksportuj dane')exportBtn.textContent='Eksportuj dane';
}
function updateCourseHeader(serviceId,value){document.querySelectorAll('.routeTable').forEach(table=>{const btn=table.querySelector(`[data-time-service="${CSS.escape(serviceId)}"]`);if(!btn)return;const cell=btn.closest('td'),row=cell?.parentElement,idx=row?[...row.children].indexOf(cell):-1;const th=idx>=0?table.querySelector(`thead tr th:nth-child(${idx+1})`):null;const text=`Na ${value}`;if(th&&th.textContent!==text)th.textContent=text})}

function addServicePreservingStops(){
  syncAllCards();
  const rows=document.getElementById('serviceRows');if(!rows)return;
  const id=makeId('service');
  const row=document.createElement('div');row.className='serviceRow';row.dataset.serviceId=id;
  row.innerHTML='<label class="field"><span>Godzina, na którą do pracy</span><button type="button" class="timeValueBtn serviceTargetTime">06:00</button></label><button type="button" class="btn dangerText removeService">Usuń kurs</button>';
  rows.appendChild(row);
  stopCards().forEach(card=>{
    syncCard(card);
    const table=card.querySelector('.routeTable'),head=table?.querySelector('thead tr'),tr=table?.querySelector('tbody tr');if(!head||!tr)return;
    const actionTh=head.lastElementChild,actionTd=tr.lastElementChild;
    const th=document.createElement('th');th.textContent='Na 06:00';head.insertBefore(th,actionTh);
    const td=document.createElement('td');td.innerHTML=`<button type="button" class="timeValueBtn stopTimeBtn" data-time-service="${id}">00:00</button>`;tr.insertBefore(td,actionTd);
    let data={};try{data=JSON.parse(card.dataset.stopData||'{}')}catch{}data.times=data.times||{};data.times[id]='00:00';card.dataset.stopData=JSON.stringify(data);
  });
}
function removeServicePreservingStops(button){
  syncAllCards();const row=button.closest('.serviceRow');if(!row)return;const id=row.dataset.serviceId;
  stopCards().forEach(card=>{const btn=card.querySelector(`[data-time-service="${CSS.escape(id)}"]`);const td=btn?.closest('td');if(td)td.remove();const table=card.querySelector('.routeTable');const heads=[...table.querySelectorAll('thead th')];const serviceIds=[...table.querySelectorAll('tbody [data-time-service]')].map(b=>b.dataset.timeService);heads.forEach(th=>{if(th.textContent.trim().startsWith('Na ')&&!serviceIds.includes(id)&&th===heads[heads.length-2]){} });let data={};try{data=JSON.parse(card.dataset.stopData||'{}')}catch{}if(data.times)delete data.times[id];card.dataset.stopData=JSON.stringify(data)});
  row.remove();
  // Odtwórz nagłówki kursów bez ruszania danych przystanków.
  const services=[...document.querySelectorAll('#serviceRows .serviceRow')].map(r=>({id:r.dataset.serviceId,time:r.querySelector('.serviceTargetTime')?.textContent.trim()||'06:00'}));
  stopCards().forEach(card=>{const head=card.querySelector('.routeTable thead tr');if(!head)return;[...head.querySelectorAll('th')].filter(th=>/^Na \d{2}:\d{2}$/.test(th.textContent.trim())).forEach(th=>th.remove());const action=head.lastElementChild;services.forEach(s=>{const th=document.createElement('th');th.textContent=`Na ${s.time}`;head.insertBefore(th,action)})});
}

function wheelMarkup(type,values){const repeated=Array.from({length:COPIES},(_,cycle)=>values.map(v=>`<button type="button" class="wheelOption" data-value="${v}" data-cycle="${cycle}">${v}</button>`).join('')).join('');return `<div class="wheelColumn" data-fix-wheel="${type}"><div class="wheelPad"></div>${repeated}<div class="wheelPad"></div></div>`}
function setupWheel(type,value){const wheel=document.querySelector(`[data-fix-wheel="${type}"]`);if(!wheel)return;const options=[...wheel.querySelectorAll('.wheelOption')],middleCycle=Math.floor(COPIES/2);let timer,recentering=false;const center=o=>{if(o)wheel.scrollTop=o.offsetTop-(wheel.clientHeight-o.offsetHeight)/2};const middle=v=>options.find(o=>o.dataset.value===v&&+o.dataset.cycle===middleCycle);const mark=v=>{wheel.dataset.value=v;options.forEach(o=>o.classList.toggle('selected',o.dataset.value===v))};const settle=()=>{const c=wheel.scrollTop+wheel.clientHeight/2;let best=options[0],d=Infinity;options.forEach(o=>{const x=Math.abs(o.offsetTop+o.offsetHeight/2-c);if(x<d){d=x;best=o}});mark(best.dataset.value);const cycle=+best.dataset.cycle;if(cycle<=1||cycle>=COPIES-2){recentering=true;center(middle(best.dataset.value));requestAnimationFrame(()=>recentering=false)}else center(best)};options.forEach(o=>o.onclick=()=>{mark(o.dataset.value);center(o)});wheel.addEventListener('scroll',()=>{if(recentering)return;clearTimeout(timer);timer=setTimeout(settle,70)},{passive:true});requestAnimationFrame(()=>{mark(value);center(middle(value))})}
function openPicker(button,kind){activeTimeButton=button;activeTimeKind=kind;const modal=document.getElementById('timePickerModal'),h=document.getElementById('modalHour'),m=document.getElementById('modalMinute');if(!modal||!h||!m)return;const [hh='00',mm='00']=button.textContent.trim().split(':');h.innerHTML=wheelMarkup('hour',HOURS);m.innerHTML=wheelMarkup('minute',MINUTES);modal.hidden=false;setupWheel('hour',hh);setupWheel('minute',mm)}

function addBlankStopAfter(card){syncAllCards();const clone=card.cloneNode(true);clone.dataset.stopId=makeId();clone.dataset.mapKey='';const name=clone.querySelector('.stopName'),out=clone.querySelector('.locationOut'),ret=clone.querySelector('.locationReturn');if(name)name.value='';if(out)out.value=DEFAULT_LOCATION;if(ret)ret.value=DEFAULT_LOCATION;clone.querySelectorAll('.stopTimeBtn').forEach(b=>b.textContent='00:00');const times={};clone.querySelectorAll('[data-time-service]').forEach(b=>times[b.dataset.timeService]='00:00');clone.dataset.stopData=JSON.stringify({id:clone.dataset.stopId,name:'',locationOut:DEFAULT_LOCATION,locationReturn:DEFAULT_LOCATION,times});card.insertAdjacentElement('afterend',clone);applyFixes()}
function moveCard(card,dir){syncAllCards();const cards=stopCards(),i=cards.indexOf(card),j=i+dir;if(i<0||j<0||j>=cards.length)return;if(dir<0)cards[j].before(card);else cards[j].after(card);renumber()}
function removeCard(card){syncAllCards();const cards=stopCards();if(cards.length<=1){const name=card.querySelector('.stopName'),out=card.querySelector('.locationOut'),ret=card.querySelector('.locationReturn');if(name)name.value='';if(out)out.value=DEFAULT_LOCATION;if(ret)ret.value=DEFAULT_LOCATION;card.querySelectorAll('.stopTimeBtn').forEach(b=>b.textContent='00:00');syncCard(card);return}card.remove();renumber()}

document.addEventListener('input',e=>{
  const card=e.target.closest('.stopCard');if(!card)return;
  if(e.target.classList.contains('locationOut')){
    let data={};try{data=JSON.parse(card.dataset.stopData||'{}')}catch{}
    const ret=card.querySelector('.locationReturn');const oldOut=data.locationOut||DEFAULT_LOCATION;const oldReturn=data.locationReturn||oldOut;const newOut=e.target.value.trim()||DEFAULT_LOCATION;
    if(ret&&(oldReturn===oldOut||oldReturn===DEFAULT_LOCATION||!oldReturn))ret.value=newOut;
  }
  syncCard(card);
},true);
document.addEventListener('click',e=>{
  const stopTime=e.target.closest('.stopTimeBtn');if(stopTime){e.preventDefault();e.stopImmediatePropagation();syncCard(stopTime.closest('.stopCard'));openPicker(stopTime,'stop');return}
  const service=e.target.closest('.serviceTargetTime');if(service){e.preventDefault();e.stopImmediatePropagation();syncAllCards();openPicker(service,'service');return}
  const add=e.target.closest('.addStopBelow');if(add){e.preventDefault();e.stopImmediatePropagation();const card=add.closest('.stopCard');if(card)addBlankStopAfter(card);return}
  const up=e.target.closest('[data-up]');if(up){e.preventDefault();e.stopImmediatePropagation();moveCard(up.closest('.stopCard'),-1);return}
  const down=e.target.closest('[data-down]');if(down){e.preventDefault();e.stopImmediatePropagation();moveCard(down.closest('.stopCard'),1);return}
  const remove=e.target.closest('[data-remove]');if(remove){e.preventDefault();e.stopImmediatePropagation();removeCard(remove.closest('.stopCard'));return}
  if(e.target.id==='addServiceBtn'){e.preventDefault();e.stopImmediatePropagation();addServicePreservingStops();return}
  const removeService=e.target.closest('.removeService');if(removeService){e.preventDefault();e.stopImmediatePropagation();removeServicePreservingStops(removeService);return}
},true);

document.addEventListener('click',e=>{
  if(e.target.id==='timePickerSave'&&activeTimeButton){e.preventDefault();e.stopImmediatePropagation();const h=document.querySelector('[data-fix-wheel="hour"]')?.dataset.value||'00',m=document.querySelector('[data-fix-wheel="minute"]')?.dataset.value||'00',value=`${h}:${m}`;activeTimeButton.textContent=value;if(activeTimeKind==='stop')syncCard(activeTimeButton.closest('.stopCard'));else{syncAllCards();const serviceId=activeTimeButton.closest('.serviceRow')?.dataset.serviceId;if(serviceId)updateCourseHeader(serviceId,value)}document.getElementById('timePickerModal').hidden=true;activeTimeButton=null}
  else if(e.target.id==='timePickerCancel'&&activeTimeButton){e.preventDefault();e.stopImmediatePropagation();document.getElementById('timePickerModal').hidden=true;activeTimeButton=null}
},true);

function applyFixes(){if(applyingFixes)return;applyingFixes=true;try{stackLocations();fixLabels();renumber();ensureImportControls()}finally{applyingFixes=false}}
const observer=new MutationObserver(()=>{if(!applyingFixes)requestAnimationFrame(applyFixes)});observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('DOMContentLoaded',applyFixes);applyFixes();
