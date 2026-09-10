import assert from 'node:assert/strict';
import {createPhotoRasterState, updatePhotoRasterState, photoRasterSlices} from '../photo-raster.js';

const state=createPhotoRasterState();
updatePhotoRasterState(state,{active:true,moving:false});
assert.equal(state.samples,1);
for(let i=1;i<8;i++) updatePhotoRasterState(state,{active:true,moving:false});
assert.equal(state.heavy,true);
assert.equal(photoRasterSlices(8),6);
const movement=updatePhotoRasterState(state,{active:true,moving:true});
assert.equal(state.samples,0);
assert.equal(movement.resetHistory,true);
assert.equal(photoRasterSlices(48),12);
updatePhotoRasterState(state,{active:false,moving:false});
assert.deepEqual({samples:state.samples,heavy:state.heavy},{samples:0,heavy:false});
console.log('photo-raster: 8 assertions passed');
