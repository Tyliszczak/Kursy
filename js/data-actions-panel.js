(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .dataActionsGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
    .dataActionBox{border:1px solid var(--line);border-radius:14px;padding:14px;background:#fff}
    .dataActionBox h4{margin:0 0 5px;font-size:16px}
    .dataActionBox p{margin:0 0 12px;color:var(--muted);font-size:13px;line-height:1.4}
    .dataActionBox.warning{border-color:#f2c94c;background:#fffaf0}
    .dataActionBox .toolbar{margin:0}
    .dataActionBox .btn:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.2)}
    @media(max-width:720px){.dataActionsGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  let localDirty=false;
  let onlineDirty=false;
  let initialized=false;

  const markDirty=()=>{localDirty=true;onlineDirty=true;update()};
  const update=()=>{
    const localSave=document.getElementById('exportRoutesBtn');
    const onlineExport=document.getElementById('onlineExportRoutesBtn');
    if(localSave)localSave.disabled=!localDirty;
    if(onlineExport)onlineExport.disabled=!onlineDirty;
  };

  function build(){
    if(initialized)return;
    const oldToolbar=document.querySelector('#view-routes .toolbar');
    if(!oldToolbar)return;
    const localSave=document.getElementById('exportRoutesBtn');
    const localLoad=document.getElementById('importRoutesBtn');
    const file=document.getElementById('importRoutesFile');
    if(!localSave||!localLoad||!file)return;

    const grid=document.createElement('div');
    grid.className='dataActionsGrid';
    grid.innerHTML=`
      <section class="dataActionBox" id="localDataBox">
        <h4>Dane lokalne</h4>
        <p>Dane są zapisywane tylko na tym urządzeniu.</p>
        <div class="toolbar" id="localDataToolbar"></div>
      </section>
      <section class="dataActionBox warning" id="onlineDataBox">
        <h4>Dane online</h4>
        <p><strong>❗ Dane zmieniamy dla wszystkich urządzeń online.</strong></p>
        <div class="toolbar"><button class="btn primary" id="onlineExportRoutesBtn" type="button">Wyeksportuj dane</button><button class="btn" id="onlineImportRoutesBtn" type="button">Importuj dane</button></div>
      </section>`;
    oldToolbar.replaceWith(grid);
    grid.querySelector('#localDataToolbar').append(localSave,localLoad,file);

    document.getElementById('onlineExportRoutesBtn').addEventListener('click',()=>{
      alert('Eksport danych online zostanie uruchomiony po podłączeniu centralnego zapisu danych firmy.');
    });
    document.getElementById('onlineImportRoutesBtn').addEventListener('click',()=>{
      alert('Import danych online zostanie uruchomiony po podłączeniu centralnego zapisu danych firmy.');
    });
    localSave.addEventListener('click',()=>{setTimeout(()=>{localDirty=false;update()},0)});
    file.addEventListener('change',()=>{if(file.files?.length)setTimeout(markDirty,50)});

    initialized=true;
    update();
  }

  const mutatingSelector='[data-delete-route],[data-remove-stop],[data-add-stop-after],[data-remove-service],#addRouteBtn,#addServiceBtn,#stopEditorSave,#routeForm button[type="submit"]';
  document.addEventListener('input',e=>{
    if(e.target.closest('#routeEditor,#stopEditorModal'))markDirty();
  },true);
  document.addEventListener('change',e=>{
    if(e.target.id!=='importRoutesFile'&&e.target.closest('#routeEditor,#stopEditorModal'))markDirty();
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest(mutatingSelector))markDirty();
  },true);

  const obs=new MutationObserver(()=>build());
  obs.observe(document.body,{childList:true,subtree:true});
  build();
})();