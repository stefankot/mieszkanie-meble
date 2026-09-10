import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCH_FOV,poprawnyNamedView,wybierzTrybKamery} from '../renderery/webgpu/arch-photo.js';

const view={name:'Salon',position:[1,2,3],target:[4,2,3],fov:42,shiftX:0,shiftY:.08};
test('P15 ARCH_PHOTO is query opt-in and FOV is bounded',()=>{
  assert.equal(wybierzTrybKamery(''),'interactive');
  assert.equal(wybierzTrybKamery('?camera=arch'),'arch_photo');
  assert.deepEqual(ARCH_FOV,{min:30,max:60,default:42});
});
test('P15 named views reject extreme lenses and offsets',()=>{
  assert.equal(poprawnyNamedView(view),true);
  assert.equal(poprawnyNamedView({...view,fov:18}),false);
  assert.equal(poprawnyNamedView({...view,shiftY:.5}),false);
});
