import assert from 'node:assert/strict';
import {modelSwiatlaDziennego} from '../renderery/webgpu/model-swiatla-dziennego.mjs';

const rad=d=>d*Math.PI/180;
const noc=modelSwiatlaDziennego(rad(-20),20);
const swit=modelSwiatlaDziennego(rad(0),8);
const dzien=modelSwiatlaDziennego(rad(57),14);
assert.equal(noc.jasnoscNieba,.02);
assert.equal(noc.widocznoscSlonca,0);
assert.ok(swit.jasnoscNieba>.2 && swit.jasnoscNieba<.4);
assert.ok(dzien.jasnoscNieba>.99);
assert.ok(dzien.cieploNaturalne<.1);
assert.ok(modelSwiatlaDziennego(rad(8),20).cieploNaturalne>.9);
console.log('daylight-model: PASS');
