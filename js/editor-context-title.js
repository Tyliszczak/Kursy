(()=>{
  const clean=s=>(s||'').trim()||'Bez nazwy';

  function routeName(){return clean(document.getElementById('routeName')?.value)}
  function setRouteTitle(name,isNew=false){
    requestAnimationFrame(()=>{
      const h=document.getElementById('routeEditorTitle');
      if(!h)return;
      h.textContent=isNew?'Nowa trasa':`Edycja trasy: ${clean(name)}`;
      h.style.fontSize='clamp(22px,4vw,32px)';
      h.style.fontWeight='800';
      h.style.lineHeight='1.15';
    });
  }
  function setStopTitle(stopName){
    requestAnimationFrame(()=>{
      const modal=document.getElementById('stopEditorModal');
      if(!modal||modal.hidden)return;
      const h=modal.querySelector('.modalCard > h3');
      if(!h)return;
      h.innerHTML=`<span style="display:block;font-size:14px;font-weight:700;opacity:.7;margin-bottom:4px">Trasa: ${escapeHtml(routeName())}</span><span style="display:block;font-size:clamp(22px,4vw,30px);font-weight:800;line-height:1.15">Przystanek: ${escapeHtml(clean(stopName))}</span>`;
    });
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  document.addEventListener('click',e=>{
    const editRoute=e.target.closest('[data-edit-route]');
    if(editRoute){
      const item=editRoute.closest('#routesList .item');
      const name=item?.querySelector('strong')?.textContent||'';
      setRouteTitle(name,false);
      return;
    }
    if(e.target.closest('#addRouteBtn')){setRouteTitle('',true);return}
    const editStop=e.target.closest('[data-edit-stop]');
    if(editStop){
      const card=editStop.closest('.stopCard');
      const name=card?.querySelector('.stopNameOpen')?.textContent||'Przystanek';
      setStopTitle(name);
    }
  },true);

  document.addEventListener('input',e=>{
    if(e.target.id==='routeName'){
      const h=document.getElementById('routeEditorTitle');
      if(h&&h.textContent!=='Nowa trasa')h.textContent=`Edycja trasy: ${clean(e.target.value)}`;
    }
    if(e.target.id==='stopEditorName'){
      const modal=document.getElementById('stopEditorModal');
      const h=modal?.querySelector('.modalCard > h3 span:last-child');
      if(h)h.textContent=`Przystanek: ${clean(e.target.value)}`;
    }
  });
})();
