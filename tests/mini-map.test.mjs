import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const root=process.env.THREE_TEST_ROOT;
const THREE=await import(root?pathToFileURL(root+'/build/three.webgpu.js').href:'three/webgpu');
const {zbierzMebleMapy}=await import('../renderery/webgpu/mini-mapa.js');

test('mini map is SVG/DOM only and cannot create a second renderer',async()=>{
  const source=await readFile(new URL('../renderery/webgpu/mini-mapa.js',import.meta.url),'utf8');
  assert.match(source,/createElementNS\(SVG_NS,'svg'\)/);
  assert.doesNotMatch(source,/WebGPURenderer|WebGLRenderer|requestAnimationFrame|canvas/i);
  assert.doesNotMatch(source,/teleportujDoPokoju|punktyMapy/);
  assert.match(source,/nawigacja\.kadrujMebel\(mebel\.korzen\)/);
  assert.match(source,/TRYBY\.PTAK/);
});

test('map data contains visible furniture bounds and no room-only points',()=>{
  const visible=new THREE.Group();
  visible.position.set(120,25,260);
  visible.add(new THREE.Mesh(new THREE.BoxGeometry(80,50,40),new THREE.MeshBasicMaterial()));
  const hidden=new THREE.Group();hidden.visible=false;
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial()));
  const biblioteka={meble:new Map([
    ['regal',{nazwa:'Regał w salonie',korzen:visible}],
    ['ukryty',{nazwa:'Ukryty',korzen:hidden}],
    ['brak',{nazwa:'Brak modelu',korzen:null}]
  ])};
  const calls=[];
  const nawigacja={znajdzKadrMebla(korzen){calls.push(korzen);return {ok:true,pozycja:new THREE.Vector3(),cel:new THREE.Vector3()};}};
  const pamiecKadrow=new WeakMap();
  const wynik=zbierzMebleMapy({THREE,biblioteka,nawigacja,pamiecKadrow});
  zbierzMebleMapy({THREE,biblioteka,nawigacja,pamiecKadrow});
  assert.equal(wynik.length,1);
  assert.equal(wynik[0].id,'regal');
  assert.equal(wynik[0].nazwa,'Regał w salonie');
  assert.deepEqual(wynik[0].obrys.min.toArray(),[80,0,240]);
  assert.deepEqual(wynik[0].obrys.max.toArray(),[160,50,280]);
  assert.deepEqual(calls,[visible],'ten sam model powinien użyć zapamiętanego kadru przy odświeżeniu mapy');
});
