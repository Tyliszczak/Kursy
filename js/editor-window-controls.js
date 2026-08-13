(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .editorWindowBar{position:sticky;top:0;z-index:1000;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;margin:0 -4px 14px;padding:8px 4px;background:rgba(255,255,255,.97);box-shadow:0 1px 0 rgba(16,24,40,.08)}
    .editorWindowBar .editorWindowTitle{text-align:left;font-weight:900;font-size:clamp(20px,4vw,30px);line-height:1.15;min-width:0}
    .editorWindowAction{min-height:44px;border:1px solid var(--line);border-radius:11px;background:#fff;font-size:15px;font-weight:800;padding:0 14px;white-space:nowrap}
    .editorWindowAction.primary{background:var(--primary);border-color:var(--primary);color:#fff}
    .editorWindowAction:active{transform:scale(.98)}
    #routeEditor>.sectionTop{display:none!important}
    #routeForm>.actions{display:none!important}
    #stopEditorModal .modalCard>.actions{display:none!important}
    #stopEditorModal .modalCard>.editorRouteContext{display:none!important}
    @media(max-width:520px){.editorWindowBar{grid-template-columns:minmax(0,1fr) auto auto;gap:5px}.editorWindowAction{padding:0 9px;font-size:14px}.editorWindowBar .editorWindowTitle{font-size:18px}}
  `;
  document.head.appendChild(style);
  const clean=s=>(s||'').trim()||'Bez nazwy';
  function makeBar(title,onCancel,onSave){const el=document.createElement('div');el.className='editorWindowBar';el.innerHTML=`<div class="editorWindowTitle"></div><button type="button" class="editorWindowAction editorCancel">Anuluj</button><button type="button" class="editorWindowAction primary editorSave">Zapisz</button>`;el.querySelector('.editorWindowTitle').textContent=title;el.querySelector('.editorCancel').onclick=onCancel;el.querySelector('.editorSave').onclick=onSave;return el}
  function routeTitle(){const n=document.getElementById('routeName')?.value||'';return n.trim()?`Edycja trasy: ${clean(n)}`:'Nowa trasa'}
  function ensureRouteBar(){const ed=document.getElementById('routeEditor');if(!ed||ed.hidden)return;let b=ed.querySelector(':scope > .editorWindowBar');if(!b){const cancel=()=>document.getElementById('cancelRouteBtn')?.click();const save=()=>document.querySelector('#routeForm button[type="submit"]')?.click();b=makeBar(routeTitle(),cancel,save);ed.prepend(b)}const t=b.querySelector('.editorWindowTitle'),v=routeTitle();if(t.textContent!==v)t.textContent=v}
  function ensureStopBar(){const m=document.getElementById('stopEditorModal');if(!m||m.hidden)return;const card=m.querySelector('.modalCard');if(!card)return;let b=card.querySelector(':scope > .editorWindowBar');if(!b){const cancel=()=>document.getElementById('stopEditorCancel')?.click();const save=()=>document.getElementById('stopEditorSave')?.click();b=makeBar(`Trasa: ${clean(document.getElementById('routeName')?.value)}`,cancel,save);card.prepend(b)}const t=b.querySelector('.editorWindowTitle'),v=`Trasa: ${clean(document.getElementById('routeName')?.value)}`;if(t.textContent!==v)t.textContent=v}
  function refresh(){ensureRouteBar();ensureStopBar()}
  document.addEventListener('click',e=>{if(e.target.closest('[data-edit-route],[data-edit-stop],#addRouteBtn'))setTimeout(refresh,0)},true);
  document.addEventListener('input',e=>{if(e.target.id==='routeName')refresh()});
  const obs=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.attributeName==='hidden'))refresh()});
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
  requestAnimationFrame(refresh);
})();