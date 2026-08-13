import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {DEFAULT_LOCATION, normalizeRoute, normalizeStop, normalizeTime} from '../js/route-model.js';

test('normalizacja przystanku zachowuje TAM, POWRÓT i godziny',()=>{
  const stop=normalizeStop({id:'s1',name:'Dworzec',locationOut:'51.1, 15.5',locationReturn:'51.2, 15.6',times:{a:'06:10'}});
  assert.deepEqual(stop,{id:'s1',name:'Dworzec',locationOut:'51.1, 15.5',locationReturn:'51.2, 15.6',times:{a:'06:10'}});
});

test('normalizacja używa lokalizacji TAM jako domyślnego POWROTU',()=>{
  const stop=normalizeStop({location:'Zielona Góra'});
  assert.equal(stop.locationOut,'Zielona Góra');
  assert.equal(stop.locationReturn,'Zielona Góra');
  assert.equal(normalizeStop({}).locationOut,DEFAULT_LOCATION);
});

test('normalizacja trasy naprawia nieprawidłową godzinę kursu',()=>{
  const route=normalizeRoute({id:'r1',services:[{id:'a',targetTime:'nie'}],stops:[{id:'s1'}]});
  assert.equal(route.services[0].targetTime,'00:00');
  assert.equal(normalizeTime('14:30'),'14:30');
});

test('aktywny HTML ładuje wersję i skrypty edytora tylko po jednym razie',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  for(const script of ['js/app-v2.js','js/card-list-mode.js','js/editor-window-controls.js','js/app-version.js']){
    assert.equal(html.split(script).length-1,1,`${script} powinien wystąpić raz`);
  }
  for(const legacy of ['js/app.js','js/ui-fixes.js','js/enhancements-052.js','js/editor-context-title.js','js/text-field-editor.js']){
    assert.ok(!html.includes(legacy),`${legacy} nie może być ładowany`);
  }
});

test('wersja i most mapy mają jeden aktywny kontrakt',async()=>{
  const [version,sw,bridge,panel]=await Promise.all([
    readFile(new URL('../js/app-version.js',import.meta.url),'utf8'),
    readFile(new URL('../sw.js',import.meta.url),'utf8'),
    readFile(new URL('../js/map-editor-bridge.js',import.meta.url),'utf8'),
    readFile(new URL('../js/data-actions-panel.js',import.meta.url),'utf8')
  ]);
  assert.match(version,/KURSY_APP_VERSION/);
  assert.match(sw,/importScripts\('\.\/js\/app-version\.js'\)/);
  assert.match(sw,/KURSY_APP_VERSION/);
  assert.match(bridge,/\.stopNameOpen/);
  assert.ok(!panel.includes('app-version.js?v='));
});
