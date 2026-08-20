const QUEUE_KEY='kursy.punctuality.queue.v1';
const VISITED_KEY='kursy.punctuality.visited.v1';
const DEFAULT_RADIUS_METERS=120;
let watchId=null,currentContext=null,uploadFn=null;

const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const parseCoords=value=>{const match=String(value||'').match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);return match?{lat:Number(match[1]),lng:Number(match[2])}:null};
const meters=(a,b)=>{const R=6371000,toRad=n=>n*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat);const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const tripKey=context=>[context.routeId||context.routeName,context.courseId||context.courseName||context.targetTime,new Date().toISOString().slice(0,10)].join('|');

function visitedSet(context){const all=readJson(VISITED_KEY,{}),key=tripKey(context);return {all,key,set:new Set(all[key]||[])} }
function markVisited(context,stopId){const state=visitedSet(context);state.set.add(stopId);state.all[state.key]=[...state.set];const keys=Object.keys(state.all).sort().slice(-20);writeJson(VISITED_KEY,Object.fromEntries(keys.map(key=>[key,state.all[key]])))}
function queue(event){const list=readJson(QUEUE_KEY,[]);list.push(event);writeJson(QUEUE_KEY,list.slice(-1000));flushQueue()}

export async function flushQueue(){if(!uploadFn||!navigator.onLine)return;const list=readJson(QUEUE_KEY,[]);if(!list.length)return;const remaining=[];for(const event of list){try{await uploadFn(event)}catch{remaining.push(event)}}writeJson(QUEUE_KEY,remaining)}

function arrivalEvent(context,stop,position,distance){const now=new Date();return {
  eventId:`arr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
  routeId:context.routeId||'',routeName:context.routeName||'',courseId:context.courseId||'',courseName:context.courseName||context.targetTime||'',targetTime:context.targetTime||'',
  stopId:stop.id||stop.name,stopName:stop.name||'',plannedTime:stop.time||'',actualAt:now.toISOString(),
  latitude:position.coords.latitude,longitude:position.coords.longitude,accuracyMeters:Math.round(position.coords.accuracy||0),distanceMeters:Math.round(distance),source:'automatic_geofence'
}}

function onPosition(position){if(!currentContext)return;const here={lat:position.coords.latitude,lng:position.coords.longitude},visited=visitedSet(currentContext).set;for(const stop of currentContext.stops||[]){const stopId=String(stop.id||stop.name||'');if(!stopId||visited.has(stopId)||!stop.time)continue;const point=parseCoords(stop.coordinates);if(!point)continue;const distance=meters(here,point);const accuracy=Math.max(0,Number(position.coords.accuracy)||0);const radius=Math.max(DEFAULT_RADIUS_METERS,Math.min(220,accuracy+60));if(distance<=radius){markVisited(currentContext,stopId);queue(arrivalEvent(currentContext,stop,position,distance));break}}}

export function configurePunctualityUpload(fn){uploadFn=typeof fn==='function'?fn:null;flushQueue();window.addEventListener('online',flushQueue,{once:false})}
export function startPunctualityTracking(context){stopPunctualityTracking();currentContext=context;if(!navigator.geolocation||!(context?.stops||[]).length)return;watchId=navigator.geolocation.watchPosition(onPosition,()=>{}, {enableHighAccuracy:true,maximumAge:15000,timeout:15000})}
export function stopPunctualityTracking(){if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;currentContext=null}
export function pendingPunctualityEvents(){return readJson(QUEUE_KEY,[])}
