(()=>{
  const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
  const MINUTES=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'));
  const COPIES=5;
  let target=null;

  const norm=(v,max)=>String(Math.max(0,Math.min(max,parseInt(String(v).replace(/\D/g,''),10)||0))).padStart(2,'0');

  function wheel(type,values,current){
    return `<div class="wheelColumn" data-se-wheel="${type}"><div class="wheelPad"></div>${Array.from({length:COPIES},(_,c)=>values.map(v=>`<button type="button" class="wheelOption ${v===current?'selected':''}" data-value="${v}" data-cycle="${c}">${v}</button>`).join('')).join('')}<div class="wheelPad"></div></div>`;
  }

  function ensureModal(){
    if(document.getElementById('stopEditorTimeWheelModal'))return;
    const m=document.createElement('div');
    m.id='stopEditorTimeWheelModal';m.className='modal';m.hidden=true;
    m.innerHTML=`<div class="modalCard"><h3>Ustaw godzinę przystanku</h3>
      <div style="display:flex;gap:10px;align-items:end;justify-content:center;margin:8px 0 14px">
        <label style="display:grid;gap:4px;font-size:12px;font-weight:700;text-align:center">Godzina<input id="seManualHour" inputmode="numeric" maxlength="2" style="width:74px;padding:10px;text-align:center;font-size:22px;border:1px solid #bbb;border-radius:10px"></label>
        <span style="font-size:26px;padding-bottom:8px">:</span>
        <label style="display:grid;gap:4px;font-size:12px;font-weight:700;text-align:center">Minuty<input id="seManualMinute" inputmode="numeric" maxlength="2" style="width:74px;padding:10px;text-align:center;font-size:22px;border:1px solid #bbb;border-radius:10px"></label>
      </div>
      <div class="timePicker modalTimePicker"><div id="seHour"></div><div class="timeColon">:</div><div id="seMinute"></div></div>
      <div class="actions"><button type="button" id="seTimeSave" class="btn primary">Zapisz godzinę</button><button type="button" id="seTimeCancel" class="btn">Anuluj</button></div>
    </div>`;
    document.body.appendChild(m);

    document.getElementById('seTimeCancel').onclick=()=>{m.hidden=true;target=null};
    document.getElementById('seTimeSave').onclick=()=>{
      if(!target)return;
      const h=m.querySelector('[data-se-wheel="hour"]')?.dataset.value||'00';
      const min=m.querySelector('[data-se-wheel="minute"]')?.dataset.value||'00';
      target.value=`${h}:${min}`;
      target.dispatchEvent(new Event('input',{bubbles:true}));
      target.dispatchEvent(new Event('change',{bubbles:true}));
      m.hidden=true;target=null;
    };
    document.getElementById('seManualHour').addEventListener('input',e=>manual(e.target,'hour',23));
    document.getElementById('seManualMinute').addEventListener('input',e=>manual(e.target,'minute',59));
  }

  function setup(type,current){
    const w=document.querySelector(`[data-se-wheel="${type}"]`);if(!w)return;
    const opts=[...w.querySelectorAll('.wheelOption')],mid=2,input=document.getElementById(type==='hour'?'seManualHour':'seManualMinute');
    let timer=false;
    const center=o=>{if(o)w.scrollTop=o.offsetTop-(w.clientHeight-o.offsetHeight)/2};
    const middle=v=>opts.find(o=>o.dataset.value===v&&Number(o.dataset.cycle)===mid);
    const mark=v=>{w.dataset.value=v;opts.forEach(o=>o.classList.toggle('selected',o.dataset.value===v));if(input&&document.activeElement!==input)input.value=v};
    const settle=()=>{const c=w.scrollTop+w.clientHeight/2;let best=opts[0],d=Infinity;opts.forEach(o=>{const x=Math.abs(o.offsetTop+o.offsetHeight/2-c);if(x<d){d=x;best=o}});mark(best.dataset.value);center(middle(best.dataset.value))};
    opts.forEach(o=>o.onclick=()=>{mark(o.dataset.value);center(middle(o.dataset.value))});
    w.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(settle,80)},{passive:true});
    requestAnimationFrame(()=>{mark(current);center(middle(current))});
  }

  function manual(input,type,max){
    input.value=input.value.replace(/\D/g,'').slice(0,2);if(!input.value)return;
    const v=norm(input.value,max),w=document.querySelector(`[data-se-wheel="${type}"]`);if(!w)return;
    w.dataset.value=v;[...w.querySelectorAll('.wheelOption')].forEach(o=>o.classList.toggle('selected',o.dataset.value===v));
    const o=[...w.querySelectorAll('.wheelOption')].find(x=>x.dataset.value===v&&x.dataset.cycle==='2');if(o)w.scrollTop=o.offsetTop-(w.clientHeight-o.offsetHeight)/2;
  }

  function open(input){
    ensureModal();target=input;
    const [h='00',m='00']=(input.value||'00:00').split(':');
    document.getElementById('seHour').innerHTML=wheel('hour',HOURS,h);
    document.getElementById('seMinute').innerHTML=wheel('minute',MINUTES,m);
    document.getElementById('seManualHour').value=h;
    document.getElementById('seManualMinute').value=m;
    document.getElementById('stopEditorTimeWheelModal').hidden=false;
    setup('hour',h);setup('minute',m);
  }

  document.addEventListener('click',e=>{
    const input=e.target.closest('#stopEditorFields .stopEditorTime');
    if(!input)return;
    e.preventDefault();e.stopImmediatePropagation();open(input);
  },true);
})();
