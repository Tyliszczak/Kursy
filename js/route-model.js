export const DEFAULT_LOCATION='';

export const makeId=(prefix='id')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
export const clone=value=>JSON.parse(JSON.stringify(value));
export const normalizeTime=value=>/^\d{2}:\d{2}$/.test(value||'')?value:'00:00';

export function normalizeStop(stop={}){
  const locationOut=stop.locationOut||stop.location||stop.coordinates||DEFAULT_LOCATION;
  return {
    id:stop.id||makeId('stop'),
    name:stop.name||'',
    locationOut,
    locationReturn:stop.locationReturn||stop.returnLocation||locationOut,
    times:{...(stop.times||{})}
  };
}

export function normalizeService(service={},index=0){
  const targetTime=normalizeTime(service.targetTime||service.destinationTime||'06:00');
  const suppliedName=String(service.name||service.courseName||'').trim();
  const offsetRaw=service.returnDepartureOffsetMinutes??service.returnOffsetMinutes??service.departureAfterShiftMinutes;
  const offsetNumber=offsetRaw===''||offsetRaw===null||offsetRaw===undefined?null:Number(offsetRaw);
  return {
    id:service.id||makeId('service'),
    name:suppliedName||targetTime||`Kurs ${index+1}`,
    targetTime,
    returnDepartureOffsetMinutes:Number.isFinite(offsetNumber)&&offsetNumber>=0?Math.round(offsetNumber):null
  };
}

export function normalizeRoute(route={}){
  return {
    id:route.id||makeId('route'),
    name:route.name||'',
    description:route.description||'',
    services:(route.services||[]).map((service,index)=>normalizeService(service,index)),
    stops:(route.stops||[]).map(normalizeStop)
  };
}
