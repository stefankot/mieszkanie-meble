import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {przygotujKorzenMebla,zwolnijNieUzywaneZasoby} from '../renderery/webgpu/zasoby-mebli.js';

const root=process.env.THREE_TEST_ROOT;
const THREE=await import(root?pathToFileURL(root+'/build/three.webgpu.js').href:'three/webgpu');

test('native preparation enables culling and computes valid local bounds',()=>{
  const furniture=new THREE.Group();
  const pivot=new THREE.Group();
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(20,30,4),new THREE.MeshStandardMaterial());
  mesh.frustumCulled=false;
  pivot.position.set(100,50,-20);
  pivot.add(mesh);
  furniture.add(pivot);
  const result=przygotujKorzenMebla(furniture);
  assert.deepEqual(result,{meshes:1,cullingEnabled:1,boundsComputed:1});
  assert.equal(mesh.frustumCulled,true);
  assert.ok(mesh.geometry.boundingSphere.radius>0);
});

test('swap disposes orphan resources but preserves resources still used by scene',()=>{
  const sharedTexture=new THREE.Texture();
  const orphanTexture=new THREE.Texture();
  const sharedMaterial=new THREE.MeshStandardMaterial({map:sharedTexture});
  const orphanMaterial=new THREE.MeshStandardMaterial({map:orphanTexture});
  const sharedGeometry=new THREE.BoxGeometry(1,1,1);
  const orphanGeometry=new THREE.BoxGeometry(2,2,2);
  const oldRoot=new THREE.Group();
  oldRoot.add(new THREE.Mesh(sharedGeometry,sharedMaterial));
  oldRoot.add(new THREE.Mesh(orphanGeometry,orphanMaterial));
  const scene=new THREE.Scene();
  scene.add(new THREE.Mesh(sharedGeometry,sharedMaterial));
  const disposed={sharedGeometry:0,orphanGeometry:0,sharedMaterial:0,orphanMaterial:0,sharedTexture:0,orphanTexture:0};
  for(const [resource,key] of [[sharedGeometry,'sharedGeometry'],[orphanGeometry,'orphanGeometry'],
    [sharedMaterial,'sharedMaterial'],[orphanMaterial,'orphanMaterial'],[sharedTexture,'sharedTexture'],[orphanTexture,'orphanTexture']]){
    resource.addEventListener('dispose',()=>disposed[key]++);
  }
  assert.deepEqual(zwolnijNieUzywaneZasoby(oldRoot,scene),{geometries:1,materials:1,textures:1});
  assert.deepEqual(disposed,{sharedGeometry:0,orphanGeometry:1,sharedMaterial:0,orphanMaterial:1,sharedTexture:0,orphanTexture:1});
});
