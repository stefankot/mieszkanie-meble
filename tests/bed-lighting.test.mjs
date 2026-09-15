import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const root=process.env.THREE_TEST_ROOT;
const T=await import(root?pathToFileURL(root+'/build/three.webgpu.js').href:'three/webgpu');
const {RoundedBoxGeometry}=await import(root
  ?pathToFileURL(root+'/examples/jsm/geometries/RoundedBoxGeometry.js').href
  :'three/addons/geometries/RoundedBoxGeometry.js');
const THREE={...T,RoundedBoxGeometry};

globalThis.document={
  createElement:()=>({
    width:0,
    height:0,
    getContext:()=>({fillStyle:'',fillRect(){}})
  })
};

const {buildLozkoV0017}=await import('../meble/lozko/wersje/v0017-native.js');

test('current bed exposes three continuous strips without embedded lights',()=>{
  const {korzen}=buildLozkoV0017({THREE});
  let pointLights=0, rectAreaLights=0;
  korzen.traverse(o=>{
    if(o.isPointLight) pointLights++;
    if(o.isRectAreaLight) rectAreaLights++;
  });

  assert.equal(pointLights,0);
  assert.equal(rectAreaLights,0);
  assert.equal(korzen.userData.nativeModel.lighting.continuousStripCount,3);
  assert.equal(korzen.userData.nativeModel.lighting.rendererLighting,'fixed-pool');
  assert.equal(korzen.userData.lighting.units,'mm');
  assert.equal(korzen.userData.lighting.coordinateSystem,'model-local');
  assert.equal(korzen.userData.lighting.recesses.length,3);

  const strips=korzen.userData.lighting.recesses.flatMap(r=>r.ledStrips);
  assert.equal(new Set(strips.map(x=>x.id)).size,3);
  for(const strip of strips){
    assert.equal(strip.positionMm.length,3);
    assert.equal(strip.targetMm.length,3);
    assert.ok(strip.widthMm>0);
    assert.ok(strip.heightMm>0);
    assert.notDeepEqual(strip.positionMm,strip.targetMm);
  }
});

test('native adapter refreshes the fixed light pool after root swap',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile('renderery/webgpu/native-meble.js','utf8');
  assert.match(source,/scene\.add\(built\.korzen\)[\s\S]*window\.__silnik\?\.odswiezLedy\?\.\(\)/);
});
