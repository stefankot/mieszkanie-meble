import test from 'node:test';import assert from 'node:assert/strict';
import {audytMrt,MRT_PROFILE_NEEDS} from '../renderery/webgpu/mrt-audit.js';
test('minimal and medium do not claim unused MRT attachments',()=>{
  const a=audytMrt(1280,720,1);
  assert.deepEqual(MRT_PROFILE_NEEDS.minimalna,['output','emissive']);
  assert.ok(a.profiles.minimalna.unused.includes('velocity'));
  assert.ok(a.profiles.srednia.unused.includes('metalrough'));
  assert.equal(a.profiles.wysoka.unused.length,0);
  assert.ok(a.profiles.minimalna.estimatedColorWriteMiB<a.profiles.srednia.estimatedColorWriteMiB);
});
