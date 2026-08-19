const DB_NAME='kursy-route-recovery';
const DB_VERSION=1;
const STORE='snapshots';
const SETTINGS='settings';
export const SNAPSHOT_INTERVAL_MS=60000;
export const DEFAULT_RETENTION_DAYS=7;
export const RETENTION_OPTIONS=[1,7,30,90,'manual'];

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:'id'});
        store.createIndex('companyCreated',['companyId','createdAt']);
      }
      if(!db.objectStoreNames.contains(SETTINGS))db.createObjectStore(SETTINGS,{keyPath:'key'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function transaction(db,store,mode,work){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode),objectStore=tx.objectStore(store);
    let value;
    try{value=work(objectStore)}catch(error){reject(error);return}
    tx.oncomplete=()=>resolve(value?.result);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}

export function retentionCutoff(retention,now=Date.now()){
  if(retention==='manual')return null;
  const days=Number(retention)||DEFAULT_RETENTION_DAYS;
  return new Date(now-days*86400000).toISOString();
}

export async function getRetention(){
  const db=await openDb();
  const row=await transaction(db,SETTINGS,'readonly',store=>store.get('retention'));
  db.close();
  return RETENTION_OPTIONS.includes(row?.value)?row.value:DEFAULT_RETENTION_DAYS;
}

export async function setRetention(value){
  const normalized=value==='manual'?'manual':Number(value);
  if(!RETENTION_OPTIONS.includes(normalized))throw new Error('Nieprawidłowy okres przechowywania kopii.');
  const db=await openDb();
  await transaction(db,SETTINGS,'readwrite',store=>store.put({key:'retention',value:normalized}));
  db.close();
  await pruneSnapshots();
  return normalized;
}

export async function saveWorkingSnapshot({companyId,routes,editor=null,cloudVersion=0}){
  const createdAt=new Date().toISOString();
  const payload={companyId,routes,editor,cloudVersion,createdAt};
  const db=await openDb();
  await transaction(db,STORE,'readwrite',store=>{
    store.put({id:`working:${companyId}`,kind:'working',...payload});
    store.put({id:`history:${companyId}:${createdAt}:${crypto.randomUUID?.()||Math.random()}`,kind:'history',...payload});
  });
  db.close();
  await pruneSnapshots();
  return payload;
}

export async function getWorkingSnapshot(companyId){
  const db=await openDb();
  const row=await transaction(db,STORE,'readonly',store=>store.get(`working:${companyId}`));
  db.close();
  return row||null;
}

export async function listSnapshots(companyId){
  const db=await openDb();
  const rows=await transaction(db,STORE,'readonly',store=>store.getAll());
  db.close();
  return (rows||[]).filter(x=>x.companyId===companyId&&x.kind==='history').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSnapshot(id){
  const db=await openDb();
  const row=await transaction(db,STORE,'readonly',store=>store.get(id));
  if(row?.kind==='working'){db.close();throw new Error('Bieżącej niezapisanej kopii nie można usunąć automatycznie.');}
  await transaction(db,STORE,'readwrite',store=>store.delete(id));
  db.close();
}

export async function pruneSnapshots(now=Date.now()){
  const retention=await getRetention();
  const cutoff=retentionCutoff(retention,now);
  if(!cutoff)return 0;
  const db=await openDb();
  const rows=await transaction(db,STORE,'readonly',store=>store.getAll());
  const expired=(rows||[]).filter(x=>x.kind==='history'&&x.createdAt<cutoff);
  if(expired.length)await transaction(db,STORE,'readwrite',store=>expired.forEach(x=>store.delete(x.id)));
  db.close();
  return expired.length;
}

