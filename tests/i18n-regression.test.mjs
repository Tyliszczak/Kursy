import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('panel firmy i aplikacja kierowcy obsługują pięć języków',async()=>{
  const [i18n,company,driver,owner,css]=await Promise.all([
    readFile(new URL('../js/i18n.js',import.meta.url),'utf8'),
    readFile(new URL('../js/company-license-ui.js',import.meta.url),'utf8'),
    readFile(new URL('../js/driver-app.js',import.meta.url),'utf8'),
    readFile(new URL('../owner.html',import.meta.url),'utf8'),
    readFile(new URL('../css/app.css',import.meta.url),'utf8')
  ]);
  for(const code of ['pl','en','de','fr','uk'])assert.match(i18n,new RegExp(`(?:const ${code}=|${code}:)`));
  assert.match(company,/from '\.\/i18n\.js'/);
  assert.match(driver,/initI18n/);
  for(const code of ['pl','en','de','fr','uk'])assert.ok(css.includes(`.flag-${code}`));
  assert.match(i18n,/aria-pressed/);
  assert.ok(!owner.includes('i18n.js'),'panel właściciela ma pozostać wyłącznie po polsku');
  assert.ok(!i18n.includes("const es="),'język hiszpański nie należy do zakresu');
});
