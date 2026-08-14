import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../apps-script/Code.gs',import.meta.url),'utf8');
let uid=0;
class Range{
  constructor(sheet,row,col,rows=1,cols=1){Object.assign(this,{sheet,row,col,rows,cols})}
  getValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>this.sheet.data[this.row-1+r]?.[this.col-1+c]??''))}
  setValue(value){while(this.sheet.data.length<this.row)this.sheet.data.push([]);this.sheet.data[this.row-1][this.col-1]=value;return this}
}
class Sheet{
  constructor(){this.data=[]}
  appendRow(row){this.data.push([...row])}
  getLastRow(){return this.data.length}
  getLastColumn(){return Math.max(0,...this.data.map(r=>r.length))}
  getRange(row,col,rows=1,cols=1){return new Range(this,row,col,rows,cols)}
  getDataRange(){return new Range(this,1,1,Math.max(this.data.length,1),Math.max(this.getLastColumn(),1))}
}
function fixture(){
  const sheets=new Map(),properties=new Map([['SPREADSHEET_ID','test-sheet']]),cache=new Map();
  const book={getSheetByName:n=>sheets.get(n)||null,insertSheet:n=>{const s=new Sheet();sheets.set(n,s);return s}};
  const props={getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,String(v))};
  const mocks={
    SpreadsheetApp:{openById:()=>book},
    PropertiesService:{getScriptProperties:()=>props},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(key,value)=>cache.set(key,String(value)),remove:key=>cache.delete(key)})},
    Session:{getScriptTimeZone:()=> 'Europe/Warsaw'},
    Utilities:{getUuid:()=>String(++uid).padStart(8,'0'),computeDigest:(_,v)=>[...createHash('sha256').update(String(v)).digest()],base64EncodeWebSafe:v=>Buffer.from(v).toString('base64url'),DigestAlgorithm:{SHA_256:'SHA_256'},formatDate:()=> '202608141200'},
    ContentService:{createTextOutput:()=>({setMimeType(){return this}}),MimeType:{JSON:'JSON'}},
    MailApp:{sendEmail(){}},
    UrlFetchApp:{fetch(){throw new Error('external fetch disabled in tests')}}
  };
  const names=Object.keys(mocks);
  const api=new Function(...names,source+`;return {setup,setOwnerCredentials,ownerLogin_,ownerLogout_,ownerCreateCompany_,ownerUpdateCompany_,ownerUpdateLicense_,ownerExtendTrial_,ownerEndTrial_,ownerGrantPaid_,ownerSetBlocked_,ownerSnapshot_,activateAdminDevice_,addDriver_,createDriverActivation_,setDriverBlocked_,releaseDriverDevices_,deleteDriver_,activateDriverDevice_,driverStatus_,releaseDevice_,saveRoutes_,loadRoutes_,append_,updateOne_,createSession_,publicLicense_};`)(...Object.values(mocks));
  api.setup();api.setOwnerCredentials('owner@example.com','bardzo-dlugie-haslo');const ownerToken=api.ownerLogin_({email:'owner@example.com',password:'bardzo-dlugie-haslo'}).session.token;
  function company(overrides={}){return api.ownerCreateCompany_({ownerToken,name:'Firma Testowa',trialDays:14,...overrides}).company}
  function admin(companyId){api.append_('Admins',{id:'admin_'+companyId,companyId,name:'Admin',email:companyId+'@example.com',phone:'+48111222333',passwordHash:'x',passwordSalt:'x',emailVerifiedAt:new Date().toISOString(),phoneVerifiedAt:new Date().toISOString(),createdAt:new Date().toISOString()});return api.createSession_(companyId,'admin_'+companyId).token}
  return {api,ownerToken,company,admin};
}
const code=(expected,fn)=>assert.throws(fn,error=>error?.code===expected);

test('nowa firma otrzymuje trial_pending i domyślnie 3 urządzenia administratorów',()=>{
  const f=fixture(),c=f.company();assert.equal(c.license.status,'trial_pending');assert.equal(c.license.trialStartedAt,null);assert.equal(c.license.limits.adminDevices,3);
});
test('konfiguracja firmy i zapis tras nie uruchamiają triala',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id),identity={sessionToken,deviceId:'admin-1',fingerprint:'fp'};f.api.activateAdminDevice_(identity);f.api.ownerUpdateCompany_({ownerToken:f.ownerToken,companyId:c.id,name:'Nowa nazwa',adminEmail:'nowy@example.com'});f.api.saveRoutes_({...identity,routes:[{name:'A',services:[],stops:[]}],expectedVersion:0});const l=f.api.publicLicense_(c.id);assert.equal(l.status,'trial_pending');assert.equal(l.trialStartedAt,null);
});
test('dodanie kierowcy nie uruchamia triala, pierwsza aktywacja uruchamia go tylko raz',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id),identity={sessionToken,deviceId:'admin-1',fingerprint:'fp'};f.api.activateAdminDevice_(identity);const d=f.api.addDriver_({...identity,name:'Jan',phone:'500600700'}).driver;assert.equal(f.api.publicLicense_(c.id).trialStartedAt,null);const token=f.api.createDriverActivation_({...identity,driverId:d.id}).activationToken;const first=f.api.activateDriverDevice_({activationToken:token,deviceId:'driver-1',fingerprint:'fp1'});assert.equal(first.license.status,'trial_active');const started=first.license.trialStartedAt;f.api.updateOne_('Admins',x=>x.companyId===c.id,{email:'zmiana@example.com'});f.api.updateOne_('Drivers',x=>x.id===d.id,{phone:'+48999999999'});f.api.activateDriverDevice_({activationToken:token,deviceId:'driver-1',fingerprint:'fp2'});assert.equal(f.api.publicLicense_(c.id).trialStartedAt,started);
});
test('limit trzech urządzeń administratorów blokuje czwarte, także po zwolnieniu innego urządzenia',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id);for(let i=1;i<=3;i++)f.api.activateAdminDevice_({sessionToken,deviceId:'admin-'+i,fingerprint:'fp'});code('ADMIN_DEVICE_LIMIT',()=>f.api.activateAdminDevice_({sessionToken,deviceId:'admin-4',fingerprint:'fp'}));f.api.releaseDevice_({sessionToken,actorDeviceId:'admin-1',targetDeviceId:'admin-1',role:'admin'});f.api.activateAdminDevice_({sessionToken,deviceId:'admin-4',fingerprint:'fp'});code('ADMIN_DEVICE_LIMIT',()=>f.api.activateAdminDevice_({sessionToken,deviceId:'admin-1',fingerprint:'fp'}));
});
test('limit kierowców i ich urządzeń jest egzekwowany, a zwolnienie urządzenia umożliwia kolejną aktywację',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id),identity={sessionToken,deviceId:'admin',fingerprint:'fp'};f.api.activateAdminDevice_(identity);f.api.ownerUpdateLicense_({ownerToken:f.ownerToken,companyId:c.id,trialDays:14,adminDeviceLimit:3,driverLimit:2,driverDeviceLimit:1,currency:'PLN',monthlyPrice:''});const d1=f.api.addDriver_({...identity,name:'Jan',phone:'500600700'}).driver,d2=f.api.addDriver_({...identity,name:'Anna',phone:'500600701'}).driver;code('DRIVER_LIMIT',()=>f.api.addDriver_({...identity,name:'Piotr',phone:'500600702'}));const t1=f.api.createDriverActivation_({...identity,driverId:d1.id}).activationToken,t2=f.api.createDriverActivation_({...identity,driverId:d2.id}).activationToken;f.api.activateDriverDevice_({activationToken:t1,deviceId:'phone-1',fingerprint:'a'});code('DRIVER_DEVICE_LIMIT',()=>f.api.activateDriverDevice_({activationToken:t2,deviceId:'phone-2',fingerprint:'b'}));f.api.releaseDevice_({sessionToken,actorDeviceId:'admin',targetDeviceId:'phone-1',role:'driver'});assert.equal(f.api.activateDriverDevice_({activationToken:t2,deviceId:'phone-2',fingerprint:'b'}).mayUse,true);
});
test('administrator może blokować i odblokować kierowcę',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id),identity={sessionToken,deviceId:'admin',fingerprint:'fp'};f.api.activateAdminDevice_(identity);const d=f.api.addDriver_({...identity,name:'Jan',phone:'500600700'}).driver;assert.equal(f.api.setDriverBlocked_({...identity,driverId:d.id,blocked:true}).company.drivers[0].status,'blocked');assert.equal(f.api.setDriverBlocked_({...identity,driverId:d.id,blocked:false}).company.drivers[0].status,'inactive');
});
test('wygaśnięcie, przedłużenie triala i przejście na płatną licencję',()=>{
  const f=fixture(),c=f.company();f.api.ownerExtendTrial_({ownerToken:f.ownerToken,companyId:c.id,days:7});f.api.updateOne_('Licenses',x=>x.companyId===c.id,{trialEndsAt:'2000-01-01T00:00:00.000Z'});assert.equal(f.api.publicLicense_(c.id).status,'expired');const extended=f.api.ownerExtendTrial_({ownerToken:f.ownerToken,companyId:c.id,days:14}).company;assert.equal(extended.license.status,'trial_active');const paid=f.api.ownerGrantPaid_({ownerToken:f.ownerToken,companyId:c.id,days:365}).company;assert.equal(paid.license.status,'active');assert.ok(paid.license.paidEndsAt);
});
test('blokada firmy działa natychmiast, odblokowanie przywraca poprzedni status',()=>{
  const f=fixture(),c=f.company();assert.equal(f.api.ownerSetBlocked_({ownerToken:f.ownerToken,companyId:c.id,blocked:true}).company.license.status,'blocked');assert.equal(f.api.ownerSetBlocked_({ownerToken:f.ownerToken,companyId:c.id,blocked:false}).company.license.status,'trial_pending');
});

test('zwolnienie wszystkich urządzeń kierowcy nie usuwa kierowcy',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id),identity={sessionToken,deviceId:'admin',fingerprint:'fp'};f.api.activateAdminDevice_(identity);const d=f.api.addDriver_({...identity,name:'Jan',phone:'500600700'}).driver,token=f.api.createDriverActivation_({...identity,driverId:d.id}).activationToken;f.api.activateDriverDevice_({activationToken:token,deviceId:'phone-1',fingerprint:'a'});const result=f.api.releaseDriverDevices_({...identity,driverId:d.id});assert.equal(result.releasedCount,1);assert.equal(result.company.drivers.length,1);assert.equal(result.company.driverDevices.length,0);
});
test('usunięcie kierowcy zwalnia urządzenia, unieważnia link i zachowuje historię triala',()=>{
  const f=fixture(),c=f.company(),sessionToken=f.admin(c.id),identity={sessionToken,deviceId:'admin',fingerprint:'fp'};f.api.activateAdminDevice_(identity);f.api.ownerUpdateLicense_({ownerToken:f.ownerToken,companyId:c.id,trialDays:14,adminDeviceLimit:3,driverLimit:1,driverDeviceLimit:1,currency:'PLN',monthlyPrice:''});const d=f.api.addDriver_({...identity,name:'Jan',phone:'500600700'}).driver,token=f.api.createDriverActivation_({...identity,driverId:d.id}).activationToken;const active=f.api.activateDriverDevice_({activationToken:token,deviceId:'phone-1',fingerprint:'a'}),started=active.license.trialStartedAt;const deleted=f.api.deleteDriver_({...identity,driverId:d.id});assert.equal(deleted.company.drivers.length,0);assert.equal(deleted.company.driverDevices.length,0);code('INVALID_ACTIVATION',()=>f.api.driverStatus_({activationToken:token,deviceId:'phone-1'}));assert.equal(f.api.publicLicense_(c.id).trialStartedAt,started);assert.doesNotThrow(()=>f.api.addDriver_({...identity,name:'Anna',phone:'500600701'}));
});

test('logowanie właściciela blokuje serię nieudanych prób',()=>{
  const f=fixture();for(let i=0;i<5;i++)code('INVALID_OWNER_LOGIN',()=>f.api.ownerLogin_({email:'owner@example.com',password:'błędne-hasło-123'}));code('OWNER_LOGIN_LOCKED',()=>f.api.ownerLogin_({email:'owner@example.com',password:'bardzo-dlugie-haslo'}));
});
test('wylogowanie właściciela unieważnia sesję po stronie serwera',()=>{
  const f=fixture();f.api.ownerLogout_({ownerToken:f.ownerToken});code('OWNER_SESSION_EXPIRED',()=>f.api.ownerSnapshot_({ownerToken:f.ownerToken}));
});
