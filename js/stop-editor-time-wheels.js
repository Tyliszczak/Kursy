(()=>{
  const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
  const MINUTES=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'));
  const COPIES=5;

  function pad(v,max){
    const n=Math.max(0,Math.min(max,parseInt(String(v).replace(/\D/g,''),10)||0));
    return String(n).padStart(2,'0');
  }

  function ensureStyles(){
    if(document.getElementById('inlineStopTimeStyles'))return;
    const s=document.createElement('style');
    s.id='inlineStopTimeStyles';
    s.textContent=`
      .inlineStopTime{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px}
      .inlineTimePart{position:relative;width:72px;height:132px;overflow:hidden;border:1px solid #d0d5dd;border-radius:12px;background:#fff}
      .inlineTimeWheel{height:132px;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none;padding:44px 0}
      .inlineTimeWheel::-webkit-scrollbar{display:none}
      .inlineTimeOption{display:flex;align-items:center;justify-content:center;height:44px;scroll-snap-align:center;font-size:18px;color:#667085;user-select:none}
      .inlineTimeEdit{position:absolute;left:5px;right:5px;top:44px;height:44px;z-index:3;border:2px solid #d71920;border-radius:9px;background:#fff;text-align:center;font-size:22px;font-weight:800;box-sizing:border-box}
      .inlineTimeColon{font-size:28px;font-weight:800}
      .stopEditorTime{display:none!important}
    `;
    document.head.appendChild(s);
  }

  function buildOptions(values){
    return Array.from({length:COPIES},(_,cycle)=>values.map(v=>`<div class="inlineTimeOption" data-value="${v}" data-cycle="${cycle}">${v}</div>`).join('')).join('');
  }

  function selectAll(input){
    requestAnimationFrame(()=>{
      input.focus();
      input.select();
      try{input.setSelectionRange(0,input.value.length)}catch{}
    });
  }

  function setupPart(part,type,current,onChange){
    const values=type==='hour'?HOURS:MINUTES,max=type==='hour'?23:59,mid=2;
    const wheel=part.querySelector('.inlineTimeWheel'),edit=part.querySelector('.inlineTimeEdit'),opts=[...wheel.querySelectorAll('.inlineTimeOption')];
    let timer=null,ignore=false;
    const middle=v=>opts.find(o=>o.dataset.value===v&&Number(o.dataset.cycle)===mid)||opts.find(o=>o.dataset.value===v);
    const center=v=>{const o=middle(v);if(o){ignore=true;wheel.scrollTop=o.offsetTop-(wheel.clientHeight-o.offsetHeight)/2;requestAnimationFrame(()=>ignore=false)}};
    const set=v=>{edit.value=v;part.dataset.value=v;onChange()};
    const settle=()=>{
      const c=wheel.scrollTop+wheel.clientHeight/2;let best=opts[0],dist=Infinity;
      opts.forEach(o=>{const d=Math.abs(o.offsetTop+o.offsetHeight/2-c);if(d<dist){dist=d;best=o}});
      set(best.dataset.value);center(best.dataset.value);
    };
    wheel.addEventListener('scroll',()=>{if(ignore)return;clearTimeout(timer);timer=setTimeout(settle,70)},{passive:true});
    opts.forEach(o=>o.addEventListener('click',()=>{set(o.dataset.value);center(o.dataset.value)}));
    edit.addEventListener('click',()=>selectAll(edit));
    edit.addEventListener('focus',()=>selectAll(edit));
    edit.addEventListener('input',()=>{
      edit.value=edit.value.replace(/\D/g,'').slice(0,2);
      if(!edit.value)return;
      const v=pad(edit.value,max);part.dataset.value=v;onChange();center(v);
    });
    edit.addEventListener('blur',()=>{const v=pad(edit.value,max);set(v);center(v)});
    part.dataset.value=current;edit.value=current;requestAnimationFrame(()=>center(current));
  }

  function enhance(input){
    if(!input||input.dataset.inlineWheel==='1')return;
    input.dataset.inlineWheel='1';
    ensureStyles();
    const [hh='00',mm='00']=(input.value||'00:00').split(':');
    const wrap=document.createElement('div');
    wrap.className='inlineStopTime';
    wrap.innerHTML=`
      <div class="inlineTimePart" data-part="hour"><div class="inlineTimeWheel">${buildOptions(HOURS)}</div><input class="inlineTimeEdit" inputmode="numeric" maxlength="2" aria-label="Godzina"></div>
      <div class="inlineTimeColon">:</div>
      <div class="inlineTimePart" data-part="minute"><div class="inlineTimeWheel">${buildOptions(MINUTES)}</div><input class="inlineTimeEdit" inputmode="numeric" maxlength="2" aria-label="Minuty"></div>`;
    input.insertAdjacentElement('afterend',wrap);
    const sync=()=>{
      const h=wrap.querySelector('[data-part="hour"]').dataset.value||'00';
      const m=wrap.querySelector('[data-part="minute"]').dataset.value||'00';
      input.value=`${h}:${m}`;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    };
    setupPart(wrap.querySelector('[data-part="hour"]'),'hour',pad(hh,23),sync);
    setupPart(wrap.querySelector('[data-part="minute"]'),'minute',pad(mm,59),sync);
  }

  function enhanceAll(){document.querySelectorAll('#stopEditorFields .stopEditorTime').forEach(enhance)}

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('#stopEditorFields, .stopEditorTime')||n.querySelector?.('.stopEditorTime')))))enhanceAll();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-edit-stop]'))setTimeout(enhanceAll,0)},true);
  enhanceAll();
})();
