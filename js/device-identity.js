const KEY='kursy.device.identity.v1';
const ADMIN_NAME_KEY='kursy.admin.device-name.v1';
export function getDeviceIdentity(storage=globalThis.localStorage){let d;try{d=JSON.parse(storage.getItem(KEY)||'null')}catch{}if(d?.deviceId)return d;d={deviceId:globalThis.crypto?.randomUUID?.()||`device-${Date.now()}-${Math.random()}`,fingerprint:fingerprint(),createdAt:new Date().toISOString()};storage.setItem(KEY,JSON.stringify(d));return d;}
export function fingerprint(nav=globalThis.navigator,screen=globalThis.screen){return [nav?.platform,nav?.userAgent,nav?.language,screen?.width,screen?.height,screen?.colorDepth].filter(v=>v!==undefined).join('|');}
export function getAdminDeviceName(storage=globalThis.localStorage){return String(storage.getItem(ADMIN_NAME_KEY)||'').trim();}
export function setAdminDeviceName(name,storage=globalThis.localStorage){const value=String(name||'').trim();if(value)storage.setItem(ADMIN_NAME_KEY,value);else storage.removeItem(ADMIN_NAME_KEY);return value;}
export function requireAdminDeviceName(){let name=getAdminDeviceName();while(!name){name=String(globalThis.prompt?.('Nazwij to urządzenie\n\nPodaj nazwę, po której rozpoznasz urządzenie, np. „Laptop biuro” albo „Telefon Krzysztofa”.','')||'').trim();if(!name)globalThis.alert?.('Nazwa urządzenia jest wymagana, aby aktywować panel administratora na tym urządzeniu.');}return setAdminDeviceName(name);}
