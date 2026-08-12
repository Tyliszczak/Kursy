const RESULT_KEY='kursy.map.result.v1';
const DEFAULT_LOCATION='Centrum Zielonej Góry, Zielona Góra';

function rowKey(row){
  if(!row.dataset.mapKey) row.dataset.mapKey=`stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  return row.dataset.mapKey;
}

function applyMapResult(){
  let result=null;
  try{result=JSON.parse(localStorage.getItem(RESULT_KEY)||'null')}catch{}
  if(!result?.key||!result?.coordinates)return;
  const row=[...document.querySelectorAll('.stopRow')].find(r=>r.dataset.mapKey===result.key);
  if(!row)return;
  const input=row.querySelector('.stopLocation');
  if(input){
    input.value=result.coordinates;
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  localStorage.removeItem(RESULT_KEY);
}

document.addEventListener('click',e=>{
  const map=e.target.closest('.stopMap');
  if(!map)return;
  e.preventDefault();
  const row=map.closest('.stopRow');
  if(!row)return;
  const input=row.querySelector('.stopLocation');
  const key=rowKey(row);
  const coords=(input?.value||DEFAULT_LOCATION).trim();
  const name=(row.querySelector('.stopName')?.value||'Przystanek').trim();
  const url=`map-editor.html?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&coords=${encodeURIComponent(coords)}`;
  window.open(url,'_blank','noopener=false');
});

window.addEventListener('focus',applyMapResult);
window.addEventListener('pageshow',applyMapResult);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')applyMapResult()});
window.addEventListener('storage',e=>{if(e.key===RESULT_KEY)applyMapResult()});
