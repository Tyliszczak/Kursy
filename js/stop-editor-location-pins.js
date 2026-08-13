(()=>{
  const RESULT_KEY='kursy.map.result.v1';
  let active=null;

  function ensureButtons(){
    const modal=document.getElementById('stopEditorModal');
    if(!modal||modal.hidden)return;
    const fields=document.getElementById('stopEditorFields');
    if(!fields)return;
    [['stopEditorOut','locationOut','TAM'],['stopEditorReturn','locationReturn','POWRÓT']].forEach(([id,field,label])=>{
      const input=document.getElementById(id);if(!input)return;
      const holder=input.parentElement;if(!holder||holder.querySelector(`[data-stop-editor-map="${field}"]`))return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='btn stopEditorMapBtn';btn.dataset.stopEditorMap=field;
      btn.textContent=`📍 Ustaw pinezkę ${label}`;
      btn.style.marginTop='8px';
      holder.appendChild(btn);
    });
  }

  function offlineEdit(field,input){
    const current=(input.value||'').trim();
    const value=prompt(`Brak internetu. Wpisz współrzędne dla ${field==='locationOut'?'TAM':'POWRÓT'} w formacie: 51.123456, 15.123456`,current);
    if(value!==null&&value.trim())input.value=value.trim();
  }

  function openMap(field){
    const input=document.getElementById(field==='locationReturn'?'stopEditorReturn':'stopEditorOut');
    if(!input)return;
    if(!navigator.onLine){offlineEdit(field,input);return;}
    const name=(document.getElementById('stopEditorName')?.value||'Przystanek').trim();
    const key=`stop-editor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
    active={key,field,inputId:input.id};
    const coords=(input.value||'Centrum Zielonej Góry, Zielona Góra').trim();
    const url=`map-editor.html?key=${encodeURIComponent(key)}&field=${encodeURIComponent(field)}&name=${encodeURIComponent(name)}&coords=${encodeURIComponent(coords)}`;
    window.open(url,'_blank','noopener=false');
  }

  function applyResult(){
    if(!active)return;
    let result=null;try{result=JSON.parse(localStorage.getItem(RESULT_KEY)||'null')}catch{}
    if(!result||result.key!==active.key||!result.coordinates)return;
    const input=document.getElementById(active.inputId);
    if(input){
      const oldOut=document.getElementById('stopEditorOut')?.value.trim()||'';
      input.value=result.coordinates;
      if(active.field==='locationOut'){
        const ret=document.getElementById('stopEditorReturn');
        if(ret&&(!ret.value.trim()||ret.value.trim()===oldOut))ret.value=result.coordinates;
      }
    }
    localStorage.removeItem(RESULT_KEY);active=null;
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-stop]');
    if(edit)setTimeout(ensureButtons,0);
    const btn=e.target.closest('[data-stop-editor-map]');
    if(btn){e.preventDefault();e.stopPropagation();openMap(btn.dataset.stopEditorMap)}
  });
  window.addEventListener('focus',()=>{applyResult();setTimeout(ensureButtons,0)});
  window.addEventListener('pageshow',()=>{applyResult();setTimeout(ensureButtons,0)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){applyResult();setTimeout(ensureButtons,0)}});
  window.addEventListener('storage',e=>{if(e.key===RESULT_KEY)applyResult()});
})();
