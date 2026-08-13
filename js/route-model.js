export const DEFAULT_LOCATION='Centrum Zielonej Góry, Zielona Góra';

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

export function normalizeRoute(route={}){
  return {
    id:route.id||makeId('route'),
    name:route.name||'',
    description:route.description||'',
    services:(route.services||[]).map(service=>({
      id:service.id||makeId('service'),
      targetTime:normalizeTime(service.targetTime||'06:00')
    })),
    stops:(route.stops||[]).map(normalizeStop)
  };
}
