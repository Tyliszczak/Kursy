let offlineLocationTarget=null;

function parseCoords(value=''){
  const m=String(value).trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m?{lat:m[1],lng:m[2]}:{lat:'',lng:''};
}
function ensureOfflineLocationModal(){
  let modal=document.getElementById('offlineLocationModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='offlineLocationModal';
  modal.className='modal';
  modal.hidden=true;
  modal.innerHTML=`<div class="modalCard"><h3>Awaryjna zmiana lokalizacji</h3><p class="muted">Działa bez internetu. Wpisz współrzędne ręcznie albo użyj GPS urządzenia.</p><div class="formGrid"><label class="field"><span>Szerokość (lat)</span><input id="offlineLat" inputmode="decimal" autocomplete="off" placeholder="51.942913"></label><label class="field"><span>Długość (lng)</span><input id="offlineLng" inputmode="decimal" autocomplete="off" placeholder="15.507792"></label></div><div id="offlineLocationMsg" class="notice info" hidden></div><div class="actions"><button type="button" class="btn" id="offlineUseGps">📍 Użyj mojej lokalizacji</button><button type="button" class="btn primary" id="offlineLocationSave">Zapisz lokalizację</button><button type="button" class="btn" id="offlineLocationCancel">Anuluj</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#offlineLocationCancel').onclick=()=>{modal.hidden=true;offlineLocationTarget=null};
  modal.querySelector('#offlineLocationSave').onclick=()=>{
    if(!offlineLocationTarget)return;
    const lat=Number(String(modal.querySelector('#offlineLat').value).replace(',','.'));
    const lng=Number(String(modal.querySelector('#offlineLng').value).replace(',','.'));
    const msg=modal.querySelector('#offlineLocationMsg');
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180){msg.hidden=false;msg.textContent='Podaj prawidłowe współrzędne.';return}
    offlineLocationTarget.value=`${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    offlineLocationTarget.dispatchEvent(new Event('input',{bubbles:true}));
    offlineLocationTarget.dispatchEvent(new Event('change',{bubbles:true}));
    modal.hidden=true;offlineLocationTarget=null;
  };
  modal.querySelector('#offlineUseGps').onclick=()=>{
    const msg=modal.querySelector('#offlineLocationMsg');
    if(!navigator.geolocation){msg.hidden=false;msg.textContent='To urządzenie nie udostępnia lokalizacji GPS.';return}
    msg.hidden=false;msg.textContent='Pobieram pozycję z GPS…';
    navigator.geolocation.getCurrentPosition(pos=>{
      modal.querySelector('#offlineLat').value=pos.coords.latitude.toFixed(6);
      modal.querySelector('#offlineLng').value=pos.coords.longitude.toFixed(6);
      msg.textContent=`Pozycja GPS pobrana. Dokładność około ${Math.round(pos.coords.accuracy)} m.`;
    },err=>{msg.textContent=`Nie udało się pobrać pozycji GPS: ${err.message||'brak dostępu'}. Możesz wpisać współrzędne ręcznie.`},{enableHighAccuracy:true,timeout:15000,maximumAge:30000});
  };
  return modal;
}
function openOfflineLocation(input){
  const modal=ensureOfflineLocationModal(),coords=parseCoords(input?.value||'');
  offlineLocationTarget=input;
  modal.querySelector('#offlineLat').value=coords.lat;
  modal.querySelector('#offlineLng').value=coords.lng;
  const msg=modal.querySelector('#offlineLocationMsg');msg.hidden=true;msg.textContent='';
  modal.hidden=false;
}

document.addEventListener('click',e=>{
  const btn=e.target.closest('.stopMap');
  if(!btn||navigator.onLine)return;
  const card=btn.closest('.stopCard');if(!card)return;
  const input=card.querySelector(btn.dataset.mapField==='locationReturn'?'.locationReturn':'.locationOut');
  if(!input)return;
  e.preventDefault();e.stopImmediatePropagation();
  openOfflineLocation(input);
},true);

window.addEventListener('offline',()=>{
  document.querySelectorAll('.stopMap').forEach(b=>{b.title='Offline: ręczna zmiana współrzędnych lub GPS'});
});
