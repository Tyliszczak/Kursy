import {registrationApi} from './registration-api.js';

const $=s=>document.querySelector(s);

function isDirty(){
  const notice=$('#draftNotice');
  return Boolean(notice&&!notice.hidden);
}
function syncClientStatus(){
  const dataStatus=$('#dataStatus');
  const apiStatus=$('#apiStatus');
  const save=$('#saveCloudBtn');
  const draft=$('#draftNotice');
  if(apiStatus?.closest('.status'))apiStatus.closest('.status').remove();
  if(draft){draft.textContent='Zmiany zapisane lokalnie.';draft.classList.add('info')}
  if(!dataStatus)return;
  let button=$('#sendDatabaseBtn');
  if(!button){
    button=document.createElement('button');
    button.id='sendDatabaseBtn';button.type='button';button.className='btn';
    button.textContent='Wyślij do bazy danych';
    button.style.marginTop='10px';button.style.background='#16803c';button.style.color='#fff';button.style.borderColor='#16803c';button.style.fontWeight='700';
    dataStatus.parentElement?.appendChild(button);
    button.addEventListener('click',()=>save?.click());
  }
  const dirty=isDirty();
  dataStatus.textContent=dirty?'Zmiany zapisane lokalnie.':'Aktualne dane są zapisane w bazie.';
  button.hidden=!dirty;
  button.disabled=!dirty||!save||save.disabled;
}

function ensureLogoutModal(){
  if($('#logoutUnsavedModal'))return;
  const modal=document.createElement('div');
  modal.id='logoutUnsavedModal';modal.className='modal';modal.hidden=true;
  modal.innerHTML=`<div class="modalCard" style="width:min(94vw,620px);max-width:620px">
    <div style="background:#ffd84d;color:#111;border:2px solid #111;border-radius:12px;padding:16px 18px;margin-bottom:18px">
      <h3 style="margin:0 0 8px">Masz zmiany, które nie zostały wysłane do bazy danych.</h3>
      <p style="margin:0;font-weight:600">Dane zapisane lokalnie nie są widoczne dla kierowców. Jeśli wybierzesz „Wyloguj bez wysyłania”, możesz wysłać dane do bazy później.</p>
    </div>
    <div class="actions" style="display:flex;gap:10px;flex-wrap:wrap">
      <button type="button" id="logoutSend" class="btn" style="background:#16803c;color:#fff;border-color:#16803c;font-weight:700">Wyślij do bazy i wyloguj</button>
      <button type="button" id="logoutLocal" class="btn">Wyloguj bez wysyłania</button>
      <button type="button" id="logoutCancel" class="btn">Anuluj</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  $('#logoutCancel').addEventListener('click',()=>modal.hidden=true);
  $('#logoutLocal').addEventListener('click',async()=>{
    modal.hidden=true;await registrationApi.logout();location.replace('./?mode=login');
  });
  $('#logoutSend').addEventListener('click',async()=>{
    const save=$('#saveCloudBtn');
    if(!save||save.disabled){alert('Nie można teraz wysłać danych do bazy. Sprawdź połączenie i spróbuj ponownie.');return}
    const oldConfirm=window.confirm;window.confirm=()=>true;
    try{save.click()}finally{window.confirm=oldConfirm}
    const started=Date.now();
    const timer=setInterval(async()=>{
      if(!isDirty()){
        clearInterval(timer);modal.hidden=true;await registrationApi.logout();location.replace('./?mode=login');
      }else if(Date.now()-started>15000){clearInterval(timer);alert('Nie udało się potwierdzić zapisu do bazy. Spróbuj ponownie.')}
    },250);
  });
}

function interceptLogout(){
  ensureLogoutModal();
  document.addEventListener('click',event=>{
    if(!event.target.closest('#companyLogout'))return;
    if(!isDirty())return;
    event.preventDefault();event.stopImmediatePropagation();
    $('#logoutUnsavedModal').hidden=false;
  },true);
}

const observer=new MutationObserver(syncClientStatus);
addEventListener('DOMContentLoaded',()=>{
  syncClientStatus();interceptLogout();
  const draft=$('#draftNotice'),save=$('#saveCloudBtn'),data=$('#dataStatus');
  [draft,save,data].filter(Boolean).forEach(el=>observer.observe(el,{attributes:true,childList:true,subtree:true,characterData:true}));
  setInterval(syncClientStatus,750);
});
