import test from 'node:test';
import assert from 'node:assert/strict';

import {dlugoscTrasy, widac, znajdzTrase} from '../renderery/webgpu/trasa.js';

/* Dwa pokoje 400×300 cm przedzielone ścianą x∈[195,215] z drzwiami z∈[200,280]; gracz ma promień 20 cm. */
const PROMIEN = 20;
const sciana = (x, z) => x + PROMIEN > 195 && x - PROMIEN < 215 && !(z - PROMIEN > 200 && z + PROMIEN < 280);
const poza = (x, z) => x < PROMIEN || x > 400 - PROMIEN || z < PROMIEN || z > 300 - PROMIEN;
const zablokowane = (x, z) => poza(x, z) || sciana(x, z);
const granice = {minX: 0, minZ: 0, maxX: 400, maxZ: 300};

test('odcinek przez ścianę nie jest przejezdny, a wzdłuż pokoju jest', () => {
  assert.equal(widac({x: 100, z: 60}, {x: 300, z: 60}, zablokowane), false);
  assert.equal(widac({x: 60, z: 60}, {x: 160, z: 250}, zablokowane), true);
});

test('trasa między pokojami prowadzi przez drzwi i żaden odcinek nie przecina ściany', () => {
  const trasa = znajdzTrase({od: {x: 100, z: 60}, cel: {x: 300, z: 60}, zablokowane, granice});
  assert.ok(trasa, 'trasa powinna istnieć');
  assert.ok(trasa.length > 2, 'potrzebny objazd przez drzwi');
  for(let i = 1; i < trasa.length; i++) assert.ok(widac(trasa[i-1], trasa[i], zablokowane), `odcinek ${i} przecina przeszkodę`);
  // Odcinek przecinający oś ściany (x = 205) robi to w świetle drzwi.
  const przejscie = trasa.slice(1).map((b, i) => [trasa[i], b]).find(([a, b]) => (a.x - 205) * (b.x - 205) <= 0);
  assert.ok(przejscie, 'trasa przechodzi na drugą stronę ściany');
  const [a, b] = przejscie;
  const zNaScianie = a.z + (b.z - a.z) * ((205 - a.x) / (b.x - a.x));
  assert.ok(zNaScianie > 220 && zNaScianie < 260, `przejście w świetle drzwi (z = ${zNaScianie})`);
  assert.ok(dlugoscTrasy(trasa) < 520, 'trasa nie krąży');
});

test('widoczny cel daje prosty odcinek', () => {
  assert.deepEqual(znajdzTrase({od: {x: 60, z: 60}, cel: {x: 160, z: 250}, zablokowane, granice}), [{x: 60, z: 60}, {x: 160, z: 250}]);
});

test('zamknięty pokój nie ma trasy', () => {
  const bezDrzwi = (x, z) => poza(x, z) || (x + PROMIEN > 195 && x - PROMIEN < 215);
  assert.equal(znajdzTrase({od: {x: 100, z: 60}, cel: {x: 300, z: 60}, zablokowane: bezDrzwi, granice}), null);
});
