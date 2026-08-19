import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [backend,company,owner,driver,gate,driverApp,store]=await Promise.all([
  read('apps-script/Code.gs'),read('js/company-license-ui.js'),read('js/owner-license-ui.js'),read('js/driver-app.js'),read('driver-app/access-gate.js'),read('driver-app/app.js'),read('js/license-store.js')
]);

test('centralny backend przechowuje kierowców, urządzenia i sesje właściciela',()=>{
  for(const sheet of ["DRIVERS:'Drivers'","DEVICES:'Devices'","OWNER_SESSIONS:'OwnerSessions'"])assert.ok(backend.includes(sheet));
  for(const action of ['companySnapshot','activateAdminDevice','addDriver','createDriverActivation','releaseDevice','driverStatus','activateDriverDevice','driverRoutes','ownerLogin','ownerSnapshot'])assert.ok(backend.includes(action+':'));
});

test('trial uruchamia wyłącznie aktywacja pierwszego urządzenia kierowcy',()=>{
  const add=backend.slice(backend.indexOf('function addDriver_'),backend.indexOf('function createDriverActivation_'));
  const activate=backend.slice(backend.indexOf('function activateDriverDevice_'),backend.indexOf('function driverRoutes_'));
  assert.doesNotMatch(add,/trialStartedAt|trial_started/);
  assert.match(activate,/status\)==='trial_pending'/);
  assert.match(activate,/trialStartedAt:now/);
  assert.match(activate,/trial_started/);
});

test('limity urządzeń są egzekwowane przez backend',()=>{
  assert.match(backend,/ADMIN_DEVICE_LIMIT/);
  assert.match(backend,/DRIVER_DEVICE_LIMIT/);
  assert.match(backend,/assertAdminDevice_/);
  assert.match(backend,/DEVICE_ASSIGNED/);
});

test('właściciel może ustawić cenę firmy bez sekretów we frontendzie',()=>{
  assert.match(backend,/monthlyPrice/);
  assert.match(backend,/price_data/);
  assert.match(backend,/OWNER_PASSWORD_HASH/);
  for(const source of [company,owner,driver,gate])assert.doesNotMatch(source,/STRIPE_SECRET|OWNER_PASSWORD_HASH|SMSAPI_TOKEN/);
});

test('moduły produkcyjne nie korzystają z lokalnego magazynu licencji',()=>{
  for(const source of [company,owner,driver,gate])assert.doesNotMatch(source,/license-store|loadStore|saveStore/);
  assert.doesNotMatch(store,/localStorage/);
  assert.match(store,/Lokalny magazyn licencji został wyłączony/);
});

test('aplikacja kierowcy pobiera wyłącznie trasy opublikowane dla aktywnego urządzenia',()=>{
  assert.match(gate,/licenseCloudApi\.driverStatus/);
  assert.match(driverApp,/licenseCloudApi\.driverRoutes/);
  assert.doesNotMatch(driverApp,/FALLBACK_ROUTES/);
  assert.match(backend,/DRIVER_ACCESS_DENIED/);
});
