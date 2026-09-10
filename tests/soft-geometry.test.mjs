import test from 'node:test';
import assert from 'node:assert/strict';
import {kluczMiekkiejGeometrii, ograniczMiekkaGeometrie, stanyMiekkiejGeometrii,
  SOFT_REALIZER_VERSION} from '../renderery/webgpu/soft-geometry.js';

const spec={sourceVersion:'v7',semanticType:'curtain',dimensions:{widthCm:100,heightCm:250,depthCm:10},seed:'salon'};
test('cache key contains every invalidation input',()=>{
  assert.equal(kluczMiekkiejGeometrii(spec),`v7|curtain|100x250x10|salon|${SOFT_REALIZER_VERSION}`);
  for(const [field,value] of [['sourceVersion','v8'],['semanticType','cushion'],['seed','bed']])
    assert.notEqual(kluczMiekkiejGeometrii({...spec,[field]:value}),kluczMiekkiejGeometrii(spec));
  assert.notEqual(kluczMiekkiejGeometrii({...spec,dimensions:{...spec.dimensions,widthCm:99}}),kluczMiekkiejGeometrii(spec));
});
test('wall/window envelope clamps width and pleat depth',()=>{
  const x=ograniczMiekkaGeometrie({...spec,constraints:{maxWidthCm:80,maxDepthCm:6,floorYcm:0,windowNames:['W1']}});
  assert.deepEqual(x.dimensions,{widthCm:80,heightCm:250,depthCm:6});
  assert.equal(x.constraints.floorYcm,0);
});
test('open and closed transforms are deterministic and cached',()=>{
  const a=stanyMiekkiejGeometrii({closedWidthCm:100,openWidthCm:20});
  const b=stanyMiekkiejGeometrii({closedWidthCm:100,openWidthCm:20});
  assert.equal(a,b); assert.equal(a.closed.scaleX,1); assert.equal(a.open.scaleX,.2);
});
