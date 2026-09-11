import assert from 'node:assert/strict';
import fs from 'node:fs';
import {APARTMENT_DATA as plan} from '../renderery/webgpu/plan.js';

const json = JSON.parse(fs.readFileSync('plan/mieszkanie.json', 'utf8'));
const room = id => plan.rooms.find(r => r.id === id);
const manifest = id => JSON.parse(fs.readFileSync(`meble/${id}/manifest.json`, 'utf8'));

assert.deepEqual(room('KUCHNIA').polygon, [[612,15],[982,15],[982,239],[612,239]]);
assert.deepEqual(room('SALON').polygon, [[24,15],[357,15],[357,499],[24,499]]);
assert.deepEqual(room('POKOJ-LOZKO').polygon, [[24,514],[489,514],[489,741],[24,741]]);
assert.deepEqual(plan.windows.find(w => w.name === 'Okno — kuchnia').rect, [982,100,24,136]);
assert.deepEqual(plan.balcony, [-100,15,100,484]);
assert.deepEqual(json.rooms.find(r => r.id === 'KUCHNIA').polygonMm,
  room('KUCHNIA').polygon.map(([x,z]) => [x*10,z*10]));

const kitchen = manifest('kuchnia');
assert.equal(kitchen.currentVersion, 'v0002');
assert.deepEqual(kitchen.placement.positionMm, [8370,0,450]);
assert.equal(kitchen.placement.positionMm[0] + 1450, 9820, 'słup 300 mm styka się ze ścianą okienną');

const kitchenShelf = manifest('regal-kuchnia');
assert.equal(kitchenShelf.currentVersion, 'v0002');
assert.deepEqual(kitchenShelf.placement.positionMm, [7970,0,2235]);

const salonShelf = manifest('regal-salon');
assert.equal(salonShelf.currentVersion, 'v0006');
assert.deepEqual(salonShelf.placement.positionMm, [2033,0,361.5]);
assert.equal(salonShelf.placement.positionMm[0] + 3074/2, 3570,
  'prawy bok regału styka się ze ścianą łazienki');

const bed = manifest('lozko');
const bedShelf = manifest('regal-przy-lozku');
assert.deepEqual(bed.placement.positionMm, [1258,0,6275]);
assert.deepEqual(bedShelf.placement.positionMm, [3616,0,6718]);

console.log('plan-layout: 17 assertions passed');
