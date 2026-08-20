import {configurePunctualityUpload,startPunctualityTracking,stopPunctualityTracking} from './punctuality-tracker.js';
import {licenseCloudApi} from '../js/license-cloud-api.js';

const $=selector=>document.querySelector(selector);
const parseRows=()=>[...document.querySelectorAll('#scheduleBody tr')].map((row,index)=>({
  id:row.dataset.stopId||`stop-${index+1}`,
  name:row.cells?.[0]?.textContent?.trim()||`Przystanek ${index+1}`,
  time:row.cells?.[1]?.textContent?.trim()||'',
  coordinates:row.dataset.coordinate||''
})).filter(stop=>stop.name&&stop.time);

function currentContext(){
  const routeName=$('#scheduleRouteName')?.textContent?.trim()||'';
  const targetTime=$('#scheduleTimeSelect')?.value||'';
  const stops=parseRows();
  if(!routeName||!targetTime||!stops.length)return null;
  return {routeName,courseName:targetTime,targetTime,stops};
}

function refresh(){const context=currentContext();if(context)startPunctualityTracking(context);else stopPunctualityTracking()}
configurePunctualityUpload(event=>licenseCloudApi.recordPunctuality(event));
const body=$('#scheduleBody');if(body)new MutationObserver(refresh).observe(body,{childList:true,subtree:true});
$('#scheduleTimeSelect')?.addEventListener('change',()=>setTimeout(refresh,0));
$('#backFromSchedule')?.addEventListener('click',stopPunctualityTracking);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPunctualityTracking();else refresh()});
refresh();
