import test from 'node:test';
import assert from 'node:assert/strict';
import {wybierzSSR,SSR_MODERN_SETTINGS} from '../renderery/webgpu/ssr-variants.js';

test('P14 modern SSR is explicit opt-in',()=>{
  assert.equal(wybierzSSR(''),'current');
  assert.equal(wybierzSSR('?ssr=modern'),'modern');
  assert.equal(wybierzSSR('?ssr=dev'),'current');
});

test('P14 compile-time modern settings stay pinned',()=>{
  assert.deepEqual(SSR_MODERN_SETTINGS,{stochastic:true,envImportanceSampling:true,
    binaryRefine:true,resolutionScale:.5,quality:.35});
});
