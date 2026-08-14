import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('js/app-v2.js');
const html=read('company.html');
const backend=read('apps-script/Code.gs');
const registration=read('js/registration-api.js');

test('trasy publikowane są tylko przez dedykowany ręczny przycisk',()=>{
  assert.match(html,/id="saveCloudBtn"/);
  assert.match(app,/saveCloudRoutes\(snapshotRoutes\(\),state\.cloudVersion\)/);
  assert.match(app,/confirm\(t\('routes\.cloudConfirm'\)\)/);
  assert.doesNotMatch(app,/setInterval\([^)]*saveCloudRoutes/);
});

test('lokalna kopia powstaje co minutę i ostrzega przed zamknięciem',()=>{
  assert.match(app,/SNAPSHOT_INTERVAL_MS/);
  assert.match(app,/beforeunload/);
  assert.match(app,/saveWorkingSnapshot/);
});

test('backend blokuje utracone aktualizacje wersją tras',()=>{
  assert.match(backend,/LockService\.getScriptLock/);
  assert.match(backend,/version!==expected/);
  assert.match(backend,/VERSION_CONFLICT/);
  assert.match(backend,/assertRouteWriteAllowed_/);
});

test('brak backendu nie uruchamia lokalnej rejestracji',()=>{
  assert.match(registration,/BACKEND_NOT_CONFIGURED/);
  assert.doesNotMatch(registration,/localPreview|preview-/);
});
