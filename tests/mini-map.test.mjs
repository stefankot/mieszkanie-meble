import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('mini map is SVG/DOM only and cannot create a second renderer',async()=>{
  const source=await readFile(new URL('../renderery/webgpu/mini-mapa.js',import.meta.url),'utf8');
  assert.match(source,/createElementNS\(SVG_NS,'svg'\)/);
  assert.doesNotMatch(source,/WebGPURenderer|WebGLRenderer|requestAnimationFrame|canvas/i);
  assert.match(source,/teleportujDoPokoju/);
  assert.match(source,/TRYBY\.PTAK/);
});
