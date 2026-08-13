(()=>{
  let bypass=false;

  const style=document.createElement('style');
  style.textContent=`
    #routesList .item{cursor:pointer}
    #routesList [data-edit-route]{display:none!important}
    #routesList .item:active,.stopCard .stopTableWrap:active{transform:scale(.995)}
    .stopCard{position:relative;padding-right:48px}
    .stopCard .stopTableWrap{cursor:pointer}
    .stopCard .routeTable input,
    .stopCard .stopMap,
    .stopCard .stopTimeBtn{pointer-events:none}
    .stopCard [data-move-up],
    .stopCard [data-move-down]{display:none!important}
    .stopCard .routeTable input{border:0!important;background:transparent!important;box-shadow:none!important;padding-left:0!important}
    .stopCard .stopMap{display:none!important}
    .stopCard .stopTimeBtn{border:0!important;background:transparent!important;box-shadow:none!important}
    .stopCard .stopNameOpen{border:0!important;background:transparent!important;box-shadow:none!important;padding-left:0!important;pointer-events:none}
    .stopCard .tableActions [data-remove-stop]{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:3}
    #routeEditorTitle{font-size:clamp(22px,4vw,32px)!important;font-weight:800!important;line-height:1.15!important}
    #stopEditorModal .editorRouteContext{display:block;font-size:clamp(22px,4vw,30px);font-weight:800;line-height:1.15}
    .dataActionGroups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0 18px}
    .dataActionBox{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px}
    .dataActionBox h3{margin:0 0 5px;font-size:16px}
    .dataActionBox p{margin:0 0 12px;color:var(--muted);font-size:13px;line-height:1.4}
    .dataActionBox .toolbar{margin:0}
    .dataActionBox.warning{border-color:#f2b8b5;background:#fffafa}
    .dataActionBox.warning p{color:#9b1c1c;font-weight:800}
    .dataActionBox button[disabled]{opacity:.55;cursor:not-allowed}
    @media(max-width:700px){.dataActionGroups{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const clean=s=>(s||'').trim()||'Bez nazwy';
  const currentRouteName=()=>clean(document.getElementById('routeName')?.value);

  function setupDataActions(){
    const toolbar=document.querySelector('#view-routes .toolbar');
    if(!toolbar||toolbar.closest('.dataActionGroups'))return;
    const parent=toolbar.parentElement;
    const groups=document.createElement('div');
    groups.className='dataActionGroups';
    const local=document.createElement('div');
    local.className='dataActionBox';
    local.innerHTML='<h3>Dane lokalne</h3><p>Dane są zapisywane tylko na tym urządzeniu.</p>';
    parent.insertBefore(groups,toolbar);
    groups.appendChild(local);
    local.appendChild(toolbar);
    const online=document.createElement('div');
    online.className='dataActionBox warning';
    online.innerHTML='<h3>Dane online</h3><p>❗ Dane zmieniamy dla wszystkich urządzeń online.</p><div class="toolbar"><button type="button" class="btn primary" id="exportOnlineBtn" disabled>Wyeksportuj dane</button><button type="button" class="btn" id="importOnlineBtn" disabled>Importuj dane</button></div>';
    groups.appendChild(online);
  }

  function routeHeader(name,isNew=false){
    requestAnimationFrame(()=>{
      const h=document.getElementById('routeEditorTitle');
      if(h)h.textContent=isNew?'Nowa trasa':`Edycja trasy: ${clean(name)}`;
    });
  }
  function stopHeader(){
    requestAnimationFrame(()=>{
      const modal=document.getElementById('stopEditorModal');
      if(!modal||modal.hidden)return;
      const h=modal.querySelector('.modalCard > h3');
      if(h){h.className='editorRouteContext';h.textContent=`Trasa: ${currentRouteName()}`;}
    });
  }

  document.addEventListener('click',e=>{
    if(bypass)return;
    const route=e.target.closest('#routesList .item');
    if(route){
      if(e.target.closest('[data-delete-route]'))return;
      const edit=route.querySelector('[data-edit-route]');
      if(edit){routeHeader(route.querySelector('strong')?.textContent||'',false);e.preventDefault();e.stopImmediatePropagation();bypass=true;edit.click();bypass=false;}
      return;
    }
    if(e.target.closest('#addRouteBtn')){routeHeader('',true);return}
    const card=e.target.closest('#stopRows .stopCard');
    if(card){
      if(e.target.closest('[data-remove-stop],[data-add-stop-after]'))return;
      const edit=card.querySelector('[data-edit-stop]');
      if(edit){stopHeader();e.preventDefault();e.stopImmediatePropagation();bypass=true;edit.click();bypass=false;}
    }
  },true);

  document.addEventListener('input',e=>{
    if(e.target.id==='routeName'){
      const h=document.getElementById('routeEditorTitle');
      if(h&&h.textContent!=='Nowa trasa')h.textContent=`Edycja trasy: ${clean(e.target.value)}`;
      const ctx=document.querySelector('#stopEditorModal .editorRouteContext');
      if(ctx)ctx.textContent=`Trasa: ${clean(e.target.value)}`;
    }
  });

  requestAnimationFrame(()=>{setupDataActions();const b=document.querySelector('.badge');if(b)b.textContent='WERSJA TESTOWA 0.7.6'});
})();