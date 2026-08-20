import {configurePunctualityUpload,startPunctualityTracking,stopPunctualityTracking} from './punctuality-tracker.js';
import {ensureDriverSession} from '../js/license-cloud-api.js';
import {requestApi} from '../js/registration-api.js';

let activeKey='';

function contextKey(context){
  if(!context)return '';
  return [context.routeId||context.routeName,context.courseId||context.targetTime].join('|');
}

function currentContext(){
  try{return globalThis.KURSY_GET_PUNCTUALITY_CONTEXT?.()||null}catch{return null}
}

async function uploadEvent(event){
  const identity={deviceId:globalThis.KURSY_DRIVER_CONTEXT?.deviceId||'',fingerprint:globalThis.KURSY_DRIVER_CONTEXT?.fingerprint||''};
  const session=await ensureDriverSession(identity);
  if(!session)throw new Error('Brak sesji kierowcy.');
  return requestApi('recordPunctuality',{driverSessionToken:session.token||'',...identity,...event});
}

function refresh(explicitContext){
  const context=explicitContext===undefined?currentContext():explicitContext;
  const key=contextKey(context);
  if(!context){if(activeKey){stopPunctualityTracking();activeKey=''}return}
  if(key===activeKey)return;
  startPunctualityTracking(context);
  activeKey=key;
}

configurePunctualityUpload(uploadEvent);
document.addEventListener('kursy:punctuality-context-change',event=>refresh(event.detail||null));
window.addEventListener('online',()=>refresh());
setInterval(()=>refresh(),60000);
refresh();
