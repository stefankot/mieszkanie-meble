import test from 'node:test';
import assert from 'node:assert/strict';

import {kandeleZLumenow, katStozka} from '../renderery/webgpu/swiatla-edytora.js';

test('lumeny → kandele uwzględniają centymetrową skalę sceny i kalibrację do lamp silnika', () => {
  // 4π lm punktowego światła = 1 cd przy metrach, czyli 10 000 przy centymetrach; kalibracja 1/6,3.
  assert.equal(Math.round(kandeleZLumenow(4 * Math.PI)), Math.round(10000 / 6.3));
  assert.ok(Math.abs(kandeleZLumenow(2000) / kandeleZLumenow(1000) - 2) < 1e-9, 'natężenie rośnie liniowo z lumenami');
  // Ten sam strumień w węższym stożku świeci mocniej.
  assert.ok(kandeleZLumenow(1000, {typ: 'stozek', kat: katStozka(100)}) > kandeleZLumenow(1000, {typ: 'stozek', kat: katStozka(0)}));
});

test('skupienie 0–100% zawęża stożek z 60° do 10°', () => {
  assert.equal(Math.round((katStozka(0) * 180) / Math.PI), 60);
  assert.equal(Math.round((katStozka(100) * 180) / Math.PI), 10);
});
