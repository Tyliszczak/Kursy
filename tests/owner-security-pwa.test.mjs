import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,ui,pwa,manifest,api,backend,sw]=await Promise.all([
  read('owner.html'),read('js/owner-license-ui.js'),read('js/owner-pwa.js'),read('owner-manifest.webmanifest'),read('js/license-cloud-api.js'),read('apps-script/Code.gs'),read('sw.js')
]);

test('panel właściciela pokazuje wyłącznie logowanie przed autoryzacją',()=>{
  assert.match(html,/id="ownerApp"/);
  assert.doesNotMatch(html,/id="newCompanyForm"/);
  assert.match(ui,/if\(loadOwnerSession\(\)\)refresh/);
  assert.match(ui,/loginView/);
  assert.match(ui,/type="password"/);
  assert.match(ui,/ownerSnapshot/);
});

test('hasło i sesja właściciela są sprawdzane oraz unieważniane przez backend',()=>{
  assert.match(backend,/OWNER_PASSWORD_HASH/);
  assert.match(backend,/OWNER_LOGIN_LOCKED/);
  assert.match(backend,/attempts>=5/);
  assert.match(backend,/function ownerLogout_/);
  assert.match(backend,/revokedAt/);
  assert.match(api,/requestApi\('ownerLogout'/);
  for(const source of [html,ui,pwa,api])assert.doesNotMatch(source,/OWNER_PASSWORD_HASH|bardzo-dlugie-haslo|STRIPE_SECRET_KEY/);
});

test('panel właściciela ma własną propozycję instalacji PWA',()=>{
  const data=JSON.parse(manifest);
  assert.equal(data.start_url,'./owner.html');
  assert.equal(data.id,'./owner.html');
  assert.match(html,/owner-manifest\.webmanifest/);
  assert.match(html,/ownerInstallBanner/);
  assert.match(pwa,/beforeinstallprompt/);
  assert.match(pwa,/serviceWorker\.register\('\.\/sw\.js'/);
  assert.match(sw,/owner-manifest\.webmanifest/);
  assert.match(sw,/owner-pwa\.js/);
});
