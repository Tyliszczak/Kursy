const ENH_DRAFT_KEY='kursy.routes.draft.v2';

function enhPad(value,max){
  const n=Math.max(0,Math.min(max,Number.parseInt(String(value).replace(/\D/g,''),10)||0));
  return String(n).padStart(2,'0');
}
function enhSyncCard(card){
  if(!card)return;
  let data={};try{data=JSON.parse(card.dataset.stopData||'{}')}catch{}
  const row=card.querySelector('tr');if(!row)return;
  data.id=data.id||card.dataset.stopId||`stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  data.name=row.querySelector('.stopName')?.value.trim()||'';
  data.locationOut=row.querySelector('.locationOut')?.value.trim()||'Centrum Zielonej Góry, Zielona Góra';
  data.locationReturn=row.querySelector('.locationReturn')?.value.trim()||data.locationOut;
  data.times=data.times||{};
  row.querySelectorAll('[data-time-service]').forEach(b=>data.times[b.dataset.timeService]=b.textContent.trim());
  card.dataset.stopData=JSON.stringify(data);
}
function enhRoutesForBackup(){
  let routes=[];try{const parsed=JSON.parse(localStorage.getItem(ENH_DRAFT_KEY)||'[]');if(Array.isArray(parsed))routes=parsed}catch{}
  const editor=document.getElementById('routeEditor');
  if(editor && !editor.hidden){
    document.querySelectorAll('#stopRows .stopCard').forEach(enhSyncCard);
    const name=document.getElementById('routeName')?.value.trim()||'';
    if(name){
      const id=document.getElementById('routeId')?.value||`route-${Date.now().toString(36)}`;
      const description=document.getElementById('routeDescription')?.value.trim()||'';
      const services=[...document.querySelectorAll('#serviceRows .serviceRow')].map(row=>({id:row.dataset.serviceId||`service-${Math.random().toString(36).slice(2,7)}`,targetTime:row.querySelector('.serviceTargetTime')?.textContent.trim()||'06:00'}));
      const stops=[...document.querySelectorAll('#stopRows .stopCard')].map(card=>{try{return JSON.parse(card.dataset.stopData||'{}')}catch{return null}}).filter(Boolean);
      const route={id,name,description,services,stops};
      const idx=routes.findIndex(r=>r.id===id);if(idx>=0)routes[idx]=route;else routes.push(route);
    }
  }
  return routes;
}
function enhBackupFilename(){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return `Kursy-kopia-danych-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}
function enhSaveData(){
  const routes=enhRoutesForBackup();
  const blob=new Blob([JSON.stringify(routes,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=enhBackupFilename();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function enhRenameButtons(){
  const save=document.getElementById('exportRoutesBtn');if(save&&save.textContent!=='Zapisz dane')save.textContent='Zapisz dane';
  const load=document.getElementById('importRoutesBtn');if(load&&load.textContent!=='Wczytaj dane')load.textContent='Wczytaj dane';
}
function enhEnsureManualTimeInputs(){
  const modal=document.getElementById('timePickerModal'),picker=modal?.querySelector('.modalTimePicker');if(!modal||!picker)return;
  let box=document.getElementById('manualTimeEntry');
  if(!box){
    box=document.createElement('div');box.id='manualTimeEntry';box.style.cssText='display:flex;gap:10px;align-items:end;justify-content:center;margin:8px 0 14px';
    box.innerHTML='<label style="display:grid;gap:4px;font-size:12px;font-weight:700;text-align:center">Godzina<input id="manualHour" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" style="width:74px;padding:10px;text-align:center;font-size:22px;border:1px solid #bbb;border-radius:10px"></label><span style="font-size:26px;padding-bottom:8px">:</span><label style="display:grid;gap:4px;font-size:12px;font-weight:700;text-align:center">Minuty<input id="manualMinute" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" style="width:74px;padding:10px;text-align:center;font-size:22px;border:1px solid #bbb;border-radius:10px"></label>';
    picker.parentElement.insertBefore(box,picker);
    const bind=(id,type,max)=>{
      const input=document.getElementById(id);if(!input)return;
      input.addEventListener('input',()=>{
        input.value=input.value.replace(/\D/g,'').slice(0,2);
        if(input.value==='')return;
        let n=Number(input.value);if(n>max){n=max;input.value=String(max)}
        const value=String(n).padStart(2,'0'),wheel=document.querySelector(`[data-fix-wheel="${type}"]`);if(!wheel)return;
        wheel.dataset.value=value;
        const opts=[...wheel.querySelectorAll('.wheelOption')];opts.forEach(o=>o.classList.toggle('selected',o.dataset.value===value));
        const target=opts.find(o=>o.dataset.value===value&&Number(o.dataset.cycle)===2)||opts.find(o=>o.dataset.value===value);if(target)wheel.scrollTop=target.offsetTop-(wheel.clientHeight-target.offsetHeight)/2;
      });
      input.addEventListener('blur',()=>{input.value=enhPad(input.value,max)});
    };
    bind('manualHour','hour',23);bind('manualMinute','minute',59);
  }
  const hWheel=document.querySelector('[data-fix-wheel="hour"]'),mWheel=document.querySelector('[data-fix-wheel="minute"]');
  const h=document.getElementById('manualHour'),m=document.getElementById('manualMinute');
  if(h)h.value=hWheel?.dataset.value||'00';if(m)m.value=mWheel?.dataset.value||'00';
  const syncFromWheel=(wheel,input)=>{if(!wheel||!input||wheel.dataset.manualBound)return;wheel.dataset.manualBound='1';let t;wheel.addEventListener('scroll',()=>{clearTimeout(t);t=setTimeout(()=>{if(wheel.dataset.value)input.value=wheel.dataset.value},120)},{passive:true})};
  syncFromWheel(hWheel,h);syncFromWheel(mWheel,m);
}

document.addEventListener('click',e=>{
  if(e.target.closest('#exportRoutesBtn')){e.preventDefault();e.stopImmediatePropagation();enhSaveData();}
},true);

const enhObserver=new MutationObserver(()=>{
  enhRenameButtons();
  const modal=document.getElementById('timePickerModal');if(modal&&!modal.hidden)setTimeout(enhEnsureManualTimeInputs,0);
});
enhObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
window.addEventListener('DOMContentLoaded',()=>{enhRenameButtons();setTimeout(enhRenameButtons,300)});
