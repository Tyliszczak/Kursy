const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return 0;const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2};
const mad=values=>{if(!values.length)return 0;const m=median(values);return median(values.map(value=>Math.abs(value-m)))};

export const PUNCTUALITY_DEFAULTS={
  minimumSamples:10,
  minimumMeaningfulMinutes:1,
  strongMeaningfulMinutes:8,
  minimumConsistency:0.7,
  maximumMadMinutes:5,
  smallDeviationMaxMinutes:4,
  smallDeviationMinimumSamples:12,
  smallDeviationMinimumConsistency:0.9,
  smallDeviationMaximumMadMinutes:1.5,
  lookbackDays:45
};

function minutesBetween(actualIso,plannedTime){
  if(!actualIso||!/^[0-2]\d:[0-5]\d$/.test(String(plannedTime||'')))return null;
  const actual=new Date(actualIso);if(Number.isNaN(actual.getTime()))return null;
  const [h,m]=plannedTime.split(':').map(Number);
  const planned=new Date(actual);planned.setHours(h,m,0,0);
  let diff=(actual-planned)/60000;
  if(diff>720)diff-=1440;
  if(diff<-720)diff+=1440;
  return diff;
}

function normalizeEvent(event){
  const deviation=Number.isFinite(Number(event.deviationMinutes))?Number(event.deviationMinutes):minutesBetween(event.actualAt,event.plannedTime);
  return {
    ...event,
    deviationMinutes:Number.isFinite(deviation)?Math.round(deviation*10)/10:null,
    routeId:String(event.routeId||event.routeName||''),
    routeName:String(event.routeName||''),
    courseId:String(event.courseId||event.courseName||event.targetTime||''),
    courseName:String(event.courseName||event.targetTime||''),
    stopId:String(event.stopId||event.stopName||''),
    stopName:String(event.stopName||''),
    actualAt:event.actualAt||event.recordedAt||''
  };
}

function groupEvents(events){
  const groups=new Map();
  events.map(normalizeEvent).filter(event=>event.deviationMinutes!==null).forEach(event=>{
    const key=[event.routeId,event.courseId,event.stopId].join('|');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(event);
  });
  return groups;
}

function proposedShift(value){
  const sign=Math.sign(value);
  const abs=Math.abs(value);
  if(abs<1)return 0;
  const rounded=Math.max(1,Math.round(abs));
  return sign*clamp(rounded,1,15);
}

export function analyzePunctuality(events=[],options={}){
  const cfg={...PUNCTUALITY_DEFAULTS,...options};
  const since=Date.now()-cfg.lookbackDays*86400000;
  const recent=(Array.isArray(events)?events:[]).filter(event=>{
    const at=new Date(event.actualAt||event.recordedAt||0).getTime();
    return !at||at>=since;
  });
  const recommendations=[];
  for(const rows of groupEvents(recent).values()){
    const deviations=rows.map(row=>row.deviationMinutes);
    const med=median(deviations);
    const absMedian=Math.abs(med);
    if(absMedian<cfg.minimumMeaningfulMinutes)continue;

    const spread=mad(deviations);
    const direction=Math.sign(med);
    const sameDirection=direction===0?0:deviations.filter(value=>Math.sign(value)===direction).length/deviations.length;
    const smallDeviation=absMedian<=cfg.smallDeviationMaxMinutes;

    if(smallDeviation){
      if(rows.length<cfg.smallDeviationMinimumSamples)continue;
      if(sameDirection<cfg.smallDeviationMinimumConsistency)continue;
      if(spread>cfg.smallDeviationMaximumMadMinutes)continue;
    }else{
      if(rows.length<cfg.minimumSamples)continue;
      if(sameDirection<cfg.minimumConsistency)continue;
      if(spread>cfg.maximumMadMinutes)continue;
    }

    const sample=rows[rows.length-1];
    const shift=proposedShift(med);
    const severity=absMedian>=cfg.strongMeaningfulMinutes?'strong':smallDeviation?'small-stable':'moderate';
    recommendations.push({
      routeId:sample.routeId,routeName:sample.routeName,
      courseId:sample.courseId,courseName:sample.courseName,
      stopId:sample.stopId,stopName:sample.stopName,
      samples:rows.length,medianDeviationMinutes:Math.round(med*10)/10,
      consistency:Math.round(sameDirection*100),spreadMinutes:Math.round(spread*10)/10,
      proposedShiftMinutes:shift,severity,
      reason:med<0?`Kierowcy regularnie są około ${Math.abs(Math.round(med))} min za wcześnie.`:`Kierowcy regularnie są około ${Math.abs(Math.round(med))} min za późno.`
    });
  }
  recommendations.sort((a,b)=>Math.abs(b.medianDeviationMinutes)-Math.abs(a.medianDeviationMinutes));
  return recommendations;
}

export function summarizeRouteRecommendations(recommendations=[]){
  const map=new Map();
  recommendations.forEach(item=>{
    const key=item.routeId||item.routeName;
    if(!map.has(key))map.set(key,{routeId:item.routeId,routeName:item.routeName,items:[],strong:0});
    const group=map.get(key);group.items.push(item);if(item.severity==='strong')group.strong++;
  });
  return [...map.values()].sort((a,b)=>b.strong-a.strong||b.items.length-a.items.length);
}
