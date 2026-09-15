import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile('renderery/webgpu/silnik.js','utf8');

test('high quality uses a 90 percent buffer while retaining TRAA',()=>{
  assert.match(source,/wysoka:\s*\{[\s\S]*?pixelRatio:\s*\.9/);
  assert.match(source,/przebieg\.setResolutionScale\(1\)/);
  assert.match(source,/const uzyjTRAA = !photo && wlaczone\('traa'\)/);
  assert.match(source,/Math\.min\(window\.devicePixelRatio \|\| 1, pixelRatio\)/);
});

test('full-resolution A B fallback remains available',()=>{
  assert.match(source,/wlaczone\('skala90'\)/);
  assert.match(source,/\?bez=skala90/);
});
