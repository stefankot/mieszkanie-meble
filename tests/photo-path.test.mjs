import assert from 'node:assert/strict';
import {PHOTO_PATH_CONTRACT, inspectPhotoPathCapability, createPhotoPathIntegration} from '../renderery/webgpu/photo-path.js';

assert.equal(inspectPhotoPathCapability({revision:'185'}).supported,false);
assert.match(inspectPhotoPathCapability({revision:'186'}).reason,/r185/);
const adapter={apiVersion:1};
for(const name of PHOTO_PATH_CONTRACT.required) adapter[name]=()=>{};
assert.equal(inspectPhotoPathCapability({revision:'185',adapter}).supported,true);
assert.equal(createPhotoPathIntegration({revision:'185'}).mode,'photo_raster_fallback');
console.log('photo-path: 4 assertions passed');
