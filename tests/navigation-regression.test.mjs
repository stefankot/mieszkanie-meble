import assert from 'node:assert/strict';
import {NAV_KEY_MAP,classifyTrackpadGesture} from '../renderery/webgpu/navigation-regression.js';
import {DEFAULT_EYE_HEIGHT_CM} from '../renderery/webgpu/navigation-config.mjs';

assert.equal(classifyTrackpadGesture({ctrlKey:false}),'two-finger-look');
assert.equal(classifyTrackpadGesture({ctrlKey:true}),'pinch-drive');
assert.equal(NAV_KEY_MAP.KeyW,NAV_KEY_MAP.ArrowUp);
assert.equal(NAV_KEY_MAP.KeyA,NAV_KEY_MAP.ArrowLeft);
assert.equal(NAV_KEY_MAP.KeyS,NAV_KEY_MAP.ArrowDown);
assert.equal(NAV_KEY_MAP.KeyD,NAV_KEY_MAP.ArrowRight);
assert.equal(DEFAULT_EYE_HEIGHT_CM,167);
console.log('navigation-regression: 7 assertions passed');
