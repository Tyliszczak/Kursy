import {DEFAULT_LOCATION,makeId,normalizeRoute,normalizeService,normalizeStop,normalizeTime} from './route-model.js';

const text=value=>String(value??'').trim();
const validTime=value=>/^\d{1,2}:\d{2}$/.test(text(value));
const toTime=value=>{
  const raw=text(value);
  if(!validTime(raw))return '';
  const [h,m]=raw.split(':');
  return normalizeTime(`${String(Number(h)).padStart(2,'0')}:${m}`);
};
const confidence=value=>['high','medium','low'].includes(value)?value:'medium';

export function normalizeImportedRoutes(payload={}){
  const sourceRoutes=Array.isArray(payload)?payload:Array.isArray(payload.routes)?payload.routes:[];
  return sourceRoutes.map((sourceRoute,routeIndex)=>{
    const routeName=text(sourceRoute.name||sourceRoute.routeName)||`Trasa ${routeIndex+1}`;
    const routeAutoNamed=!text(sourceRoute.name||sourceRoute.routeName);
    const sourceServices=Array.isArray(sourceRoute.services)?sourceRoute.services:Array.isArray(sourceRoute.courses)?sourceRoute.courses:[];
    const services=(sourceServices.length?sourceServices:[{}]).map((sourceService,serviceIndex)=>{
      const suppliedName=text(sourceService.name||sourceService.courseName);
      const targetTime=toTime(sourceService.targetTime||sourceService.destinationTime||sourceService.arrivalTarget);
      const fallbackName=suppliedName||`Kurs ${serviceIndex+1}`;
      const finalName=targetTime||fallbackName;
      return {
        ...normalizeService({
          id:sourceService.id||makeId('service'),
          name:finalName,
          targetTime:targetTime||'00:00'
        },serviceIndex),
        sourceName:suppliedName||'',
        targetTimeKnown:Boolean(targetTime),
        autoNamed:!targetTime&&!suppliedName,
        confidence:confidence(sourceService.confidence)
      };
    });
    const serviceIds=services.map(service=>service.id);
    const sourceStops=Array.isArray(sourceRoute.stops)?sourceRoute.stops:[];
    const stops=sourceStops.map((sourceStop,stopIndex)=>{
      const stop=normalizeStop({
        id:sourceStop.id||makeId('stop'),
        name:text(sourceStop.name||sourceStop.stopName)||`Przystanek ${stopIndex+1}`,
        locationOut:text(sourceStop.locationOut||sourceStop.location||sourceStop.address)||DEFAULT_LOCATION,
        locationReturn:text(sourceStop.locationReturn||sourceStop.returnLocation||sourceStop.location||sourceStop.address)||undefined,
        times:{}
      });
      const importedTimes=sourceStop.times||sourceStop.serviceTimes||{};
      services.forEach((service,index)=>{
        const raw=importedTimes[service.id]??importedTimes[index]??sourceStop.time;
        const parsed=toTime(raw);
        if(parsed)stop.times[service.id]=parsed;
      });
      return {
        ...stop,
        autoNamed:!text(sourceStop.name||sourceStop.stopName),
        locationNeedsReview:Boolean(sourceStop.locationNeedsReview)||confidence(sourceStop.locationConfidence)==='low',
        confidence:confidence(sourceStop.confidence)
      };
    });
    const route=normalizeRoute({
      id:sourceRoute.id||makeId('route'),
      name:routeName,
      description:text(sourceRoute.description||sourceRoute.notes),
      services,
      stops
    });
    route.importMeta={
      imported:true,
      autoNamed:routeAutoNamed,
      warnings:Array.isArray(sourceRoute.warnings)?sourceRoute.warnings.map(text).filter(Boolean):[],
      uncertainFields:Array.isArray(sourceRoute.uncertainFields)?sourceRoute.uncertainFields:[]
    };
    route.services=services;
    route.stops=stops;
    route.serviceIds=serviceIds;
    return route;
  });
}
