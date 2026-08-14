import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import test from 'node:test';

const text=path=>readFile(new URL(path,import.meta.url),'utf8');

test('pełna kopia Trasy 2.0 jest odseparowana w katalogu driver-app',async()=>{
  const files=await readdir(new URL('../driver-app/',import.meta.url));
  for(const required of ['Tyliszczak.png','access-gate.js','app.js','index.html','manifest.json','map-editor.html','nav-map.js','offline-map.js','schedule.js','style.css','sw.js','vehicles.js','wake-style.js'])assert.ok(files.includes(required),`brakuje skopiowanego pliku ${required}`);
});

test('Trasy 2.0 startuje dopiero po serwerowej kontroli licencji i urządzenia',async()=>{
  const [html,gate]=await Promise.all([text('../driver-app/index.html'),text('../driver-app/access-gate.js')]);
  assert.match(html,/access-gate\.js/);assert.ok(!html.includes('src="./app.js'));
  assert.match(gate,/licenseCloudApi\.driverStatus/);
  assert.match(gate,/status\.mayUse/);
  assert.match(gate,/await import\('\.\/app\.js\?v=cloud-1'\)/);
  assert.doesNotMatch(gate,/loadStore|license-store/);
});

test('aktywacja kierowcy jest potwierdzana przez backend',async()=>{
  const activation=await text('../js/driver-app.js');
  assert.match(activation,/activateDriverDevice/);
  assert.match(activation,/getDeviceIdentity/);
  assert.doesNotMatch(activation,/driver-app\/index\.html\?token=/);
  assert.match(activation,/history\.replaceState/);
});

test('trasy kierowcy pochodzą z centralnego API, a lokalna pamięć jest tylko kopią offline',async()=>{
  const app=await text('../driver-app/app.js');
  assert.match(app,/licenseCloudApi\.driverRoutes/);
  assert.doesNotMatch(app,/DRIVER_CONTEXT\.activationToken/);
  assert.match(app,/DATA_KEY/);
  assert.doesNotMatch(app,/FALLBACK_ROUTES/);
});

test('pamięć offline jest rozdzielona według firmy i kierowcy',async()=>{
  const [app,vehicles]=await Promise.all([text('../driver-app/app.js'),text('../driver-app/vehicles.js')]);
  assert.match(app,/CACHE_SCOPE=.*companyId.*driverId/);
  assert.match(vehicles,/scope=.*companyId.*driverId/);
  assert.doesNotMatch(vehicles,/activationToken=.*encodeURIComponent/);
});

test('service workery nie kasują wzajemnie swoich pamięci podręcznych',async()=>{
  const [root,driver]=await Promise.all([text('../sw.js'),text('../driver-app/sw.js')]);
  assert.match(root,/startsWith\('kursy-v'\)/);
  assert.match(driver,/startsWith\('trasy-2\.0-'\)/);
  assert.match(driver,/license-cloud-api\.js/);
});

