import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {MODULE_TRANSLATIONS} from '../js/i18n-modules.js';

test('wyłączone tłumaczenia pozostają w katalogu do późniejszego przywrócenia',()=>{
  assert.deepEqual(Object.keys(MODULE_TRANSLATIONS),['pl','en','de','fr','uk']);
  for(const code of Object.keys(MODULE_TRANSLATIONS)){
    assert.ok(MODULE_TRANSLATIONS[code]['registration.title']);
    assert.ok(MODULE_TRANSLATIONS[code]['driver.selectRoute']);
    assert.ok(MODULE_TRANSLATIONS[code]['message.firstDriverTrialWarning']);
  }
});

test('ostrzeżenie triala jest wymagane przed kopiowaniem linku i SMS-em',async()=>{
  const source=await readFile(new URL('../js/company-license-ui.js',import.meta.url),'utf8');
  assert.match(source,/license\.status==='trial_pending'/);
  assert.match(source,/data-copy-driver[\s\S]*confirmFirstDriverAccess/);
  assert.match(source,/data-sms-driver/);
  assert.match(source,/message\.firstDriverTrialWarning/);
});
