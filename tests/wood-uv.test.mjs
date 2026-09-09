import test from 'node:test';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
import{semantyczneUV}from'../renderery/webgpu/uv-drewna.js';
const root=process.env.THREE_TEST_ROOT;const T=await import(root?pathToFileURL(root+'/build/three.webgpu.js').href:'three/webgpu');
const spec={grainDirection:'y',textureGrainAxis:'u',textureScaleMm:[1000,1000],grainOffset:[0,0],veneerSheetId:'sheet-1',veneerContinuityGroup:'fronts'};
const front=()=>new T.BoxGeometry(60,72,1.8);
test('UV scale is millimetres and grain runs along authored local Y',()=>{const g=front();semantyczneUV(g,spec);const uv=g.attributes.uv;assert.ok(Math.abs(uv.getX(16)+.72)<1e-6);assert.equal(uv.getY(16),0);});
test('no drift on refresh and explicit offsets preserve adjacent sheet continuity',()=>{const a=front(),b=front();semantyczneUV(a,spec);const old=[...a.attributes.uv.array];semantyczneUV(a,spec);assert.deepEqual([...a.attributes.uv.array],old);semantyczneUV(b,{...spec,grainOffset:[0,600]});assert.ok(Math.abs(a.attributes.uv.getY(17)-b.attributes.uv.getY(16))<1e-6);});
test('per-face orientation overrides inherited grain orientation',()=>{const g=front();semantyczneUV(g,{...spec,faceOrientation:{pz:0}});assert.equal(g.attributes.uv.getX(16),0);assert.ok(Math.abs(g.attributes.uv.getY(16)-.72)<1e-6);});
test('invalid physical scale is rejected rather than silently replaced',()=>{for(const value of [0,-1,NaN])assert.throws(()=>semantyczneUV(front(),{...spec,textureScaleMm:value}));});
test('world placement does not affect local authored UV',()=>{const g=front();semantyczneUV(g,spec);const before=[...g.attributes.uv.array];const o=new T.Mesh(g);o.position.set(120,500,600);o.rotation.y=1.2;o.updateMatrixWorld();semantyczneUV(g,spec);assert.deepEqual([...g.attributes.uv.array],before);});

test('vertical scan preserves requested vertical grain',()=>{const g=front();semantyczneUV(g,{...spec,textureGrainAxis:'v'});assert.equal(g.attributes.uv.getX(16),0);assert.ok(Math.abs(g.attributes.uv.getY(16)-.72)<1e-6);});
