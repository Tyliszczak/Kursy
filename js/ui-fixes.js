const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const MINUTES=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'));
const COPIES=5;
let activeTimeButton=null;

function stackLocations(){
  document.querySelectorAll('.routeTable').forEach(table=>{
    const head=table.querySelector('thead tr');
    if(head && !head.dataset.locationsStacked){
      const ths=[...head.children];
      const outTh=ths.find(th=>th.textContent.trim()==='Lokalizacja TAM');
      const returnTh=ths.find(th=>th.textContent.trim()==='Lokalizacja POWRÓT');
      if(outTh) outTh.textContent='Lokalizacja TAM / POWRÓT';
      if(returnTh) returnTh.remove();
      head.dataset.locationsStacked='1';
    }
    table.querySelectorAll('tbody tr').forEach(row=>{
      if(row.dataset.locationsStacked)return;
      const outInput=row.querySelector('.locationOut');
      const returnInput=row.querySelector('.locationReturn');
      if(!outInput||!returnInput)return;
      const outTd=outInput.closest('td');
      const returnTd=returnInput.closest('td');
      if(!outTd||!returnTd||outTd===returnTd)return;
      const outCell=outTd.querySelector('.locationCell');
      const returnCell=returnTd.querySelector('.locationCell');
      if(outCell) outCell.insertAdjacentHTML('afterbegin','<span class="locationLabel">TAM</span>');
      if(returnCell){returnCell.insertAdjacentHTML('afterbegin','<span class="locationLabel">POWRÓT</span>');returnCell.classList.add('locationReturnStack');outTd.appendChild(returnCell)}
      returnTd.remove();row.dataset.locationsStacked='1';
    });
  });
}
function fixCourseLabels(){document.querySelectorAll('.routeTable thead th').forEach(th=>{const t=th.textContent.trim();if(/^Do\s+\d{2}:\d{2}$/.test(t))th.textContent=t.replace(/^Do\s+/,'Na ')})}
function wheelMarkup(type,values){const repeated=Array.from({length:COPIES},(_,cycle)=>values.map(v=>`<button type="button" class="wheelOption" data-value="${v}" data-cycle="${cycle}">${v}</button>`).join('')).join('');return `<div class="wheelColumn" data-fix-wheel="${type}"><div class="wheelPad"></div>${repeated}<div class="wheelPad"></div></div>`}
function setupWheel(type,value){const wheel=document.querySelector(`[data-fix-wheel="${type}"]`);if(!wheel)return;const options=[...wheel.querySelectorAll('.wheelOption')],middleCycle=Math.floor(COPIES/2);let selected=value,timer,recentering=false;const center=opt=>{if(opt)wheel.scrollTop=opt.offsetTop-(wheel.clientHeight-opt.offsetHeight)/2};const middle=v=>options.find(o=>o.dataset.value===v&&Number(o.dataset.cycle)===middleCycle);const mark=v=>{selected=v;wheel.dataset.value=v;options.forEach(o=>o.classList.toggle('selected',o.dataset.value===v))};const settle=()=>{const c=wheel.scrollTop+wheel.clientHeight/2;let best=options[0],dist=Infinity;options.forEach(o=>{const d=Math.abs(o.offsetTop+o.offsetHeight/2-c);if(d<dist){dist=d;best=o}});mark(best.dataset.value);const cycle=Number(best.dataset.cycle);if(cycle<=1||cycle>=COPIES-2){recentering=true;center(middle(best.dataset.value));requestAnimationFrame(()=>recentering=false)}else center(best)};options.forEach(o=>o.addEventListener('click',()=>{mark(o.dataset.value);center(o)}));wheel.addEventListener('scroll',()=>{if(recentering)return;clearTimeout(timer);timer=setTimeout(settle,70)},{passive:true});requestAnimationFrame(()=>{mark(selected);center(middle(selected))})}
function openStopTimePicker(button){activeTimeButton=button;const modal=document.getElementById('timePickerModal'),hourHost=document.getElementById('modalHour'),minuteHost=document.getElementById('modalMinute');if(!modal||!hourHost||!minuteHost)return;const [hh='00',mm='00']=button.textContent.trim().split(':');hourHost.innerHTML=wheelMarkup('hour',HOURS);minuteHost.innerHTML=wheelMarkup('minute',MINUTES);modal.hidden=false;setupWheel('hour',hh);setupWheel('minute',mm)}
function syncStopCard(button){const card=button.closest('.stopCard');if(!card)return;let data;try{data=JSON.parse(card.dataset.stopData||'{}')}catch{return}const row=card.querySelector('tr');if(!row)return;data.name=row.querySelector('.stopName')?.value.trim()||data.name||'';data.locationOut=row.querySelector('.locationOut')?.value.trim()||data.locationOut||'';data.locationReturn=row.querySelector('.locationReturn')?.value.trim()||data.locationReturn||data.locationOut||'';data.times=data.times||{};row.querySelectorAll('[data-time-service]').forEach(b=>data.times[b.dataset.timeService]=b.textContent.trim());card.dataset.stopData=JSON.stringify(data)}
document.addEventListener('click',e=>{const btn=e.target.closest('.stopTimeBtn');if(btn){e.preventDefault();e.stopImmediatePropagation();openStopTimePicker(btn)}},true);
document.addEventListener('click',e=>{if(e.target.id==='timePickerSave'&&activeTimeButton){e.preventDefault();e.stopImmediatePropagation();const h=document.querySelector('[data-fix-wheel="hour"]')?.dataset.value||'00',m=document.querySelector('[data-fix-wheel="minute"]')?.dataset.value||'00';activeTimeButton.textContent=`${h}:${m}`;syncStopCard(activeTimeButton);document.getElementById('timePickerModal').hidden=true;activeTimeButton=null}if(e.target.id==='timePickerCancel'&&activeTimeButton){e.preventDefault();e.stopImmediatePropagation();document.getElementById('timePickerModal').hidden=true;activeTimeButton=null}},true);
function applyFixes(){stackLocations();fixCourseLabels()}
const observer=new MutationObserver(applyFixes);observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('DOMContentLoaded',applyFixes);applyFixes();
