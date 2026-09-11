import assert from 'node:assert/strict';
import {PRESSETY_SWIATLA, DOMYSLNY_PRESET_SWIATLA, dataPresetuSwiatla}
  from '../renderery/webgpu/presety-swiatla.mjs';

assert.deepEqual(Object.keys(PRESSETY_SWIATLA), [
  'lato-08','lato-14','lato-20','zima-08','zima-14','zima-20'
]);
assert.equal(DOMYSLNY_PRESET_SWIATLA, 'zima-14');
for(const [id, p] of Object.entries(PRESSETY_SWIATLA)){
  const d = dataPresetuSwiatla(id);
  assert.equal(d.getFullYear(), 2026, id);
  assert.equal(d.getMonth(), p.miesiac, id);
  assert.equal(d.getDate(), p.dzien, id);
  assert.equal(d.getHours(), p.h, id);
  assert.equal(d.getMinutes(), 0, id);
}
assert.throws(() => dataPresetuSwiatla('jesien-11'), /Nieznany preset/);
console.log('light presets: PASS');
