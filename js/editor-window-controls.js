(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .editorWindowBar{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:14px}
    .editorWindowBar .editorWindowTitle{text-align:center;font-weight:900;font-size:clamp(20px,4vw,30px);line-height:1.15;min-width:0}
    .editorWindowBtn{width:44px;height:44px;border:1px solid var(--line);border-radius:11px;background:#fff;font-size:24px;font-weight:900;display:grid;place-items:center;padding:0}
    .editorWindowBtn:active{transform:scale(.96)}
    #routeEditor>.sectionTop{display:none!important}
    #routeForm>.actions{display:none!important}
    #stopEditorModal .modalCard>.actions{display:none!important}
    #stopEditorModal .modalCard>.editorRouteContext{display:none!important}
  `;
  document.head.appendChild(style);

  const clean=s=>(s||'').trim()||'Bez nazwy';
  let routeSnapshot=null;
  let stopSnapshot=null;

  function bar(title,onBack,onClose){
    const el=document.createElement('div');el.className='editorWindowBar';
    el.innerHTML=`<button type="button" class="editorWindowBtn editorBack" aria-label="Wróć" title="Wróć">←</button><div class="editorWindowTitle"></div><button type="button" class="editorWindowBtn editorClose" aria-label="Zamknij" title="Zamknij">×</button>`;
    el.querySelector('.editorWindowTitle').textContent=title;
    el.querySelector('.editorBack').onclick=onBack;
    el.querySelector('.editorClose').onclick=onClose;
    return el;
  }
  function askSave(){return confirm('Czy chcesz zapisać zmiany?\n\nOK — zapisz zmiany\nAnuluj — nie zapisuj zmian')}

  function routeTitle(){const n=document.getElementById('routeName')?.value||'';return n.trim()?`Edycja trasy: ${clean(n)}`:'Nowa trasa'}
  function installRouteBar(){
    const ed=document.getElementById('routeEditor');if(!ed||ed.hidden)return;
    let b=ed.querySelector(':scope > .editorWindowBar');
    const close=()=>{if(askSave()){document.querySelector('#routeForm button[type="submit"]')?.click()}else document.getElementById('cancelRouteBtn')?.click()};
    if(!b){b=bar(routeTitle(),close,close);ed.prepend(b)}
    b.querySelector('.editorWindowTitle').textContent=routeTitle();
  }
  function installStopBar(){
    const m=document.getElementById('stopEditorModal');if(!m||m.hidden)return;
    const card=m.querySelector('.modalCard');if(!card)return;
    let b=card.querySelector(':scope > .editorWindowBar');
    const close=()=>{if(askSave())document.getElementById('stopEditorSave')?.click();else document.getElementById('stopEditorCancel')?.click()};
    if(!b){b=bar(`Trasa: ${clean(document.getElementById('routeName')?.value)}`,close,close);card.prepend(b)}
    b.querySelector('.editorWindowTitle').textContent=`Trasa: ${clean(document.getElementById('routeName')?.value)}`;
  }

  const obs=new MutationObserver(()=>{installRouteBar();installStopBar()});
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden'],childList:true});
  document.addEventListener('input',e=>{if(e.target.id==='routeName'){installRouteBar();installStopBar()}});
  requestAnimationFrame(()=>{installRouteBar();installStopBar()});
})();
