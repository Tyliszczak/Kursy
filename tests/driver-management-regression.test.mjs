import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [ui,api,backend,i18n]=await Promise.all([
  read('js/company-license-ui.js'),read('js/license-cloud-api.js'),read('apps-script/Code.gs'),read('js/i18n.js')
]);

test('panel pokazuje jawne działania przy każdym kierowcy',()=>{
  for(const marker of ['data-release-driver-devices','data-block-driver','data-delete-driver'])assert.match(ui,new RegExp(marker));
  for(const label of ["t('drivers.releaseDevices')","t('drivers.block')","t('drivers.delete')"])assert.ok(ui.includes(label));
  assert.match(ui,/devices\.assignedTo/);
});

test('usunięcie jest miękkie, zwalnia urządzenia i unieważnia link',()=>{
  assert.match(backend,/function deleteDriver_/);
  assert.match(backend,/activationTokenHash:''/);
  assert.match(backend,/deletedAt:now/);
  assert.match(backend,/releasedDeviceCount/);
  assert.match(backend,/filter\(x=>x\.companyId===companyId&&!x\.deletedAt\)/);
  assert.match(api,/deleteDriver/);
  assert.match(api,/releaseDriverDevices/);
});

test('nowe działania mają tłumaczenia w pięciu językach',()=>{
  for(const key of ['drivers.block','drivers.unblock','drivers.delete','drivers.releaseDevices','drivers.deleteConfirm','devices.assignedTo'])assert.equal(i18n.split("'"+key+"'").length-1,5,key);
});
