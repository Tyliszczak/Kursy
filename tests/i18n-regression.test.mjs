import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('interfejs jest tymczasowo ograniczony do języka polskiego',async()=>{
  const [i18n,modules,company,driver,owner,index,driverHtml]=await Promise.all([
    readFile(new URL('../js/i18n.js',import.meta.url),'utf8'),
    readFile(new URL('../js/i18n-modules.js',import.meta.url),'utf8'),
    readFile(new URL('../js/company-license-ui.js',import.meta.url),'utf8'),
    readFile(new URL('../js/driver-app.js',import.meta.url),'utf8'),
    readFile(new URL('../owner.html',import.meta.url),'utf8'),
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../driver-app/index.html',import.meta.url),'utf8')
  ]);
  assert.match(i18n,/LANGUAGES=Object\.freeze\(\{pl:'Polski'\}\)/);
  assert.match(i18n,/const CATALOGS=\{pl\}/);
  assert.match(i18n,/export function mountLanguageSelector\(\)\{\}/);
  assert.match(company,/from '\.\/i18n\.js'/);
  for(const section of ['registration.title','driver.selectRoute','message.firstDriverTrialWarning'])assert.ok(modules.includes(section));
  assert.match(driver,/initI18n/);
  assert.ok(!index.includes('language-flags.css'));
  assert.ok(!driverHtml.includes('language-flags.css'));
  assert.ok(!owner.includes('i18n.js'),'panel właściciela ma pozostać wyłącznie po polsku');
});
