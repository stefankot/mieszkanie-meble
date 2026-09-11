import assert from 'node:assert/strict';
import {APARTMENT_DATA} from '../renderery/webgpu/plan.js';
import {wyznaczScianyZaslon} from '../renderery/webgpu/uklad-zaslon.mjs';

const wynik=wyznaczScianyZaslon({APARTMENT:APARTMENT_DATA});
const salon=wynik.find(w=>w.id==='salon'),sypialnia=wynik.find(w=>w.id==='sypialnia');
assert.equal(wynik.length,2);
assert.equal(salon.xSciany,24);
assert.equal(salon.x,40);
assert.equal(salon.otwory.length,3);
assert.equal(salon.pary,3);
assert.equal(sypialnia.xSciany,24);
assert.equal(sypialnia.otwory.length,1);
console.log('curtains-layout: PASS');
