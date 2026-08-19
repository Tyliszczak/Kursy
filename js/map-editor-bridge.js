const RESULT_KEY='kursy.map.result.v1';

function rowKey(card){if(!card.dataset.mapKey)card.dataset.mapKey=`stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;return card.dataset.mapKey}
function applyMapResult(){let result=null;try{result=JSON.parse(localStorage.getItem(RESULT_KEY)||'null')}catch{}if(!result?.key||!result?.coordinates)return;const card=[...document.querySelectorAll('.stopCard')].find(r=>r.dataset.mapKey===result.key);if(!card)return;const selector=result.field==='locationReturn'?'.locationReturn':'.locationOut';const input=card.querySelector(selector);if(input){input.value=result.coordinates;input.dispatchEvent(new Event('input',{bubbles:true}))}localStorage.removeItem(RESULT_KEY)}
function openMap(card,map){
  const field=map.dataset.mapField==='locationReturn'?'locationReturn':'locationOut';
  const input=card.querySelector(field==='locationReturn'?'.locationReturn':'.locationOut');
  const key=rowKey(card),coords=(input?.value||'').trim(),name=(card.querySelector('.stopNameOpen')?.textContent||'Przystanek').trim();
  const url=`map-editor.html?key=${encodeURIComponent(key)}&field=${encodeURIComponent(field)}&name=${encodeURIComponent(name)}&coords=${encodeURIComponent(coords)}`;
  window.open(url,'_blank','noopener,noreferrer');
}
document.addEventListener('click',e=>{const map=e.target.closest('.stopMap');if(!map)return;e.preventDefault();const card=map.closest('.stopCard');if(!card)return;openMap(card,map)});
window.addEventListener('focus',applyMapResult);window.addEventListener('pageshow',applyMapResult);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')applyMapResult()});window.addEventListener('storage',e=>{if(e.key===RESULT_KEY)applyMapResult()});
