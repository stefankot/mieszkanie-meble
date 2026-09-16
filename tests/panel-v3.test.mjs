import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const controls=await readFile(new URL('../renderery/webgpu/sterowanie.js',import.meta.url),'utf8');
const navigation=await readFile(new URL('../renderery/webgpu/navigation-regression.js',import.meta.url),'utf8');

test('compact controls replace the simple/dev switch and walk tab',()=>{
  assert.match(controls,/data-panel-mode-toggle/);
  assert.doesNotMatch(controls,/data-panel-mode="simple"/);
  assert.doesNotMatch(controls,/data-z="widok"[^>]*>Spacer</);
  assert.match(controls,/data-z="widok"[^>]*class="dev-only">Ruch/);
  assert.doesNotMatch(controls,/Przejdź do pomieszczenia/);
});

test('M2 profile pins every measured renderer choice and resets manual overrides',()=>{
  assert.match(controls,/quality:'wysoka',aa:'taau',tone:'aces',ssr:'current'/);
  assert.match(controls,/camera:'interactive',light:DOMYSLNY_PRESET_SWIATLA/);
  assert.match(controls,/delete zapis\.pola\[id\]/);
  assert.doesNotMatch(controls,/Profil optymalny[^\n]+speedball/i);
});

test('camera and curtain controls have one pressed-state button each',()=>{
  assert.equal((controls.match(/id="widokToggle"/g)||[]).length,1);
  assert.equal((controls.match(/id="zaslonyToggle"/g)||[]).length,1);
  assert.doesNotMatch(controls,/id="zaslonySterowanie"/);
});

test('new camera key map reserves shift arrows for pitch and plus/minus for height',()=>{
  assert.match(navigation,/ArrowUp:'patrzGora', ArrowDown:'patrzDol'/);
  assert.match(navigation,/Equal:'kameraGora', Minus:'kameraDol'/);
});
