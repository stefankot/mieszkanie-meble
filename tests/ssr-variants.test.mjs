import test from 'node:test';
import assert from 'node:assert/strict';
import {wybierzSSR,SSR_MODERN_SETTINGS} from '../renderery/webgpu/ssr-variants.js';

test('approved candidate C makes modern SSR default with an explicit current fallback',()=>{
  assert.equal(wybierzSSR(''),'modern');
  assert.equal(wybierzSSR('?ssr=modern'),'modern');
  assert.equal(wybierzSSR('?ssr=current'),'current');
  assert.equal(wybierzSSR('?ssr=dev'),'modern');
});

test('P14 compile-time modern settings stay pinned',()=>{
  assert.deepEqual(SSR_MODERN_SETTINGS,{stochastic:true,envImportanceSampling:true,
    binaryRefine:true,resolutionScale:.5,quality:.35});
});
