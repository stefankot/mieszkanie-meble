import test from 'node:test';import assert from 'node:assert/strict';
import {audytMrt,MRT_PROFILE_NEEDS} from '../renderery/webgpu/mrt-audit.js';
test('minimal and medium do not claim unused MRT attachments',()=>{
  const a=audytMrt(1280,720,1);
  assert.deepEqual(MRT_PROFILE_NEEDS.minimalna,['output','emissive']);
  assert.ok(a.profiles.minimalna.unused.includes('velocity'));
  assert.ok(a.profiles.srednia.unused.includes('metalrough'));
  assert.equal(a.profiles.wysoka.unused.length,0);
  assert.ok(a.profiles.minimalna.estimatedColorWriteMiB<a.profiles.srednia.estimatedColorWriteMiB);
  assert.equal(a.currentBytesPerSample,30);
  assert.equal(a.attachments.metalrough.bytes,2);
  assert.equal(a.attachments.velocity.bytes,4);
});

test('renderer configures two-channel formats for vec2 attachments',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile('renderery/webgpu/silnik.js','utf8');
  assert.match(source,/getTexture\('metalrough'\)\.format = THREE\.RGFormat/);
  assert.match(source,/getTexture\('velocity'\)\.format = THREE\.RGFormat/);
});
