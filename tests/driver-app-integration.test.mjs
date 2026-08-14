import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import test from 'node:test';

const text=path=>readFile(new URL(path,import.meta.url),'utf8');

test('pełna kopia Trasy 2.0 jest odseparowana w katalogu driver-app',async()=>{
  const files=await readdir(new URL('../driver-app/',import.meta.url));
  for(const required of ['Tyliszczak.png','app.js','index.html','manifest.json','map-editor.html','nav-map.js','offline-map.js','routes.js','schedule.js','style.css','sw.js','vehicles.js','wake-style.js']){
    assert.ok(files.includes(required),`brakuje skopiowanego pliku ${required}`);
  }
});

test('Trasy 2.0 startuje przez bramkę kierowcy, a nie bezpośrednio',async()=>{
  const html=await text('../driver-app/index.html');
  const gate=await text('../driver-app/access-gate.js');
  assert.match(html,/access-gate\.js/);
  assert.ok(!html.includes('src="./app.js'));
  assert.match(gate,/driverDevices\.some/);
  assert.match(gate,/mayUse\(company\)/);
  assert.match(gate,/driver\.status!=='active'/);
  assert.match(gate,/await import\('\.\/app\.js'\)/);
});

test('aktywacja kierowcy otwiera kopię Trasy 2.0 i zachowuje token urządzenia',async()=>{
  const activation=await text('../js/driver-app.js');
  assert.match(activation,/driver-app\/index\.html\?token=/);
  assert.match(activation,/kursy\.driver\.activationToken\.v1/);
  assert.match(activation,/currentDeviceIsActive/);
  assert.match(activation,/activateDriver[\s\S]*openDriverApp/);
});

test('kopia nie zawiera wpisanego na stałe adresu Apps Script',async()=>{
  for(const path of ['../driver-app/app.js','../driver-app/vehicles.js','../driver-app/map-editor.html']){
    assert.ok(!(await text(path)).includes('script.google.com/macros/s/'),path);
  }
});

test('pamięć tras i pojazdów jest rozdzielona według firmy i kierowcy',async()=>{
  const app=await text('../driver-app/app.js');
  const vehicles=await text('../driver-app/vehicles.js');
  assert.match(app,/CACHE_SCOPE=.*companyId.*driverId/);
  assert.match(vehicles,/scope=.*companyId.*driverId/);
});

test('service workery nie kasują wzajemnie swoich pamięci podręcznych',async()=>{
  const root=await text('../sw.js');
  const driver=await text('../driver-app/sw.js');
  assert.match(root,/startsWith\('kursy-v'\)/);
  assert.match(driver,/startsWith\('trasy-2\.0-'\)/);
});
