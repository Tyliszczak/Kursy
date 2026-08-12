const CACHE='kursy-v0.5.0';
const APP_ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./css/app.css','./js/app.js','./js/data.js','./js/api.js','./js/map-editor-bridge.js','./js/ui-fixes.js','./map-editor.html'];
const DATA_ASSETS=['./data/company.json','./data/routes.json','./data/courses.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll([...APP_ASSETS,...DATA_ASSETS])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function networkFirst(request){try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy))}return response}catch{return(await caches.match(request))||(request.mode==='navigate'?caches.match('./index.html'):Response.error())}}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;event.respondWith(networkFirst(event.request))});