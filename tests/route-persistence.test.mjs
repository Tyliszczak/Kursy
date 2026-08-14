import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const draft=fs.readFileSync(new URL('js/route-draft-store.js',root),'utf8');
const cloud=fs.readFileSync(new URL('js/route-cloud-api.js',root),'utf8');
const registration=fs.readFileSync(new URL('js/registration-api.js',root),'utf8');

test('lokalne kopie używają IndexedDB i interwału jednej minuty',()=>{
  assert.match(draft,/indexedDB\.open/);
  assert.match(draft,/SNAPSHOT_INTERVAL_MS=60000/);
  assert.doesNotMatch(draft,/localStorage/);
});

test('retencję wybiera użytkownik, a kopia robocza nie podlega czyszczeniu',()=>{
  assert.match(draft,/RETENTION_OPTIONS=\[1,7,30,90,'manual'\]/);
  assert.match(draft,/x\.kind==='history'/);
  assert.match(draft,/Bieżącej niezapisanej kopii/);
});

test('zapis chmurowy wymaga sesji i wersji oczekiwanej',()=>{
  assert.match(cloud,/sessionToken\(\)/);
  assert.match(cloud,/expectedVersion/);
  assert.match(cloud,/saveRoutes/);
});

test('rejestracja nie tworzy lokalnego konta, gdy backend jest niedostępny',()=>{
  assert.doesNotMatch(registration,/localPreview|LOCAL_REGISTRATIONS_KEY|preview-/);
  assert.match(registration,/BACKEND_NOT_CONFIGURED/);
  assert.match(registration,/NETWORK_ERROR/);
});

