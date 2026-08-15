const RESULT_KEY='kursy.map.result.v1';
const query=new URLSearchParams(location.search);
const key=query.get('key')||'';
const field=query.get('field')==='locationReturn'?'locationReturn':'locationOut';
const name=query.get('name')||'Przystanek';
const raw=query.get('coords')||'';
const match=raw.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
let lat=match?Number(match[1]):51.9356;
let lng=match?Number(match[2]):15.5062;
document.getElementById('meta').textContent=`${name} â€˘ ${field==='locationReturn'?'POWRĂ“T':'TAM'}`;
const coords=document.getElementById('coords');
const message=document.getElementById('msg');
const map=L.map('map',{zoomControl:true}).setView([lat,lng],match?18:14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'Â© OpenStreetMap'}).addTo(map);
const marker=L.marker([lat,lng],{draggable:true}).addTo(map);
function setPoint(nextLat,nextLng,pan=false){lat=nextLat;lng=nextLng;marker.setLatLng([lat,lng]);if(pan)map.setView([lat,lng],18);coords.textContent=`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
setPoint(lat,lng);
marker.on('dragend',()=>{const point=marker.getLatLng();setPoint(point.lat,point.lng)});
map.on('click',event=>setPoint(event.latlng.lat,event.latlng.lng));
document.getElementById('myLocation').addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(position=>{setPoint(position.coords.latitude,position.coords.longitude,true);message.textContent='Ustawiono bieĹĽÄ…cÄ… lokalizacjÄ™.'},()=>message.textContent='Nie udaĹ‚o siÄ™ pobraÄ‡ lokalizacji telefonu.',{enableHighAccuracy:true,timeout:10000}));
document.getElementById('save').addEventListener('click',()=>{if(!key){message.textContent='Brakuje identyfikatora przystanku.';return}localStorage.setItem(RESULT_KEY,JSON.stringify({key,field,coordinates:`${lat.toFixed(6)}, ${lng.toFixed(6)}`,ts:Date.now()}));message.textContent='Zapisano. Wracam do edycji trasyâ€¦';setTimeout(()=>{try{window.close()}catch{}if(!window.closed)history.back()},180)});
document.getElementById('cancel').addEventListener('click',()=>{try{window.close()}catch{}if(!window.closed)history.back()});

