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
  function askSave(){return confirm('Czy chcesz zapisać zmiany?\n\nOK — zapisz zmiany\nAnuluj — nie zapisuj zmian')}
  function makeBar(title,onExit){const el=document.createElement('div');el.className='editorWindowBar';el.innerHTML=`<button type="button" class="editorWindowBtn editorBack" aria-label="Wróć" title="Wróć">←</button><div class="editorWindowTitle"></div><button type="button" class="editorWindowBtn editorClose" aria-label="Zamknij" title="Zamknij">×</button>`;el.querySelector('.editorWindowTitle').textContent=title;el.querySelector('.editorBack').onclick=onExit;el.querySelector('.editorClose').onclick=onExit;return el}
  function routeTitle(){const n=document.getElementById('routeName')?.value||'';return n.trim()?`Edycja trasy: ${clean(n)}`:'Nowa trasa'}
  function ensureRouteBar(){const ed=document.getElementById('routeEditor');if(!ed||ed.hidden)return;let b=ed.querySelector(':scope > .editorWindowBar');if(!b){const exit=()=>{if(askSave())document.querySelector('#routeForm button[type="submit"]')?.click();else document.getElementById('cancelRouteBtn')?.click()};b=makeBar(routeTitle(),exit);ed.prepend(b)}const t=b.querySelector('.editorWindowTitle'),v=routeTitle();if(t.textContent!==v)t.textContent=v}
  function ensureStopBar(){const m=document.getElementById('stopEditorModal');if(!m||m.hidden)return;const card=m.querySelector('.modalCard');if(!card)return;let b=card.querySelector(':scope > .editorWindowBar');if(!b){const exit=()=>{if(askSave())document.getElementById('stopEditorSave')?.click();else document.getElementById('stopEditorCancel')?.click()};b=makeBar(`Trasa: ${clean(document.getElementById('routeName')?.value)}`,exit);card.prepend(b)}const t=b.querySelector('.editorWindowTitle'),v=`Trasa: ${clean(document.getElementById('routeName')?.value)}`;if(t.textContent!==v)t.textContent=v}
  function refresh(){ensureRouteBar();ensureStopBar()}
  document.addEventListener('click',e=>{if(e.target.closest('[data-edit-route],[data-edit-stop],#addRouteBtn'))setTimeout(refresh,0)},true);
  document.addEventListener('input',e=>{if(e.target.id==='routeName')refresh()});
  const obs=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.attributeName==='hidden'))refresh()});
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
  requestAnimationFrame(refresh);
})();
