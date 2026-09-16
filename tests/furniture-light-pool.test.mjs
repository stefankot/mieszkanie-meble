import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {utworzPlan} from '../renderery/webgpu/plan.js';
import {odswiezOswietlenieMebli} from '../renderery/webgpu/oswietlenie-mebli.js';

const root = process.env.THREE_TEST_ROOT;
const THREE = await import(root ? pathToFileURL(root + '/build/three.webgpu.js').href : 'three/webgpu');
const shelf = JSON.parse(await readFile(new URL('../meble/regal-salon/wersje/v0006.json', import.meta.url)));
const plan = utworzPlan(THREE);

function fixture(){
  const regal = new THREE.Group();
  regal.position.fromArray(shelf.placement.positionMm).multiplyScalar(.1);
  regal.userData.lighting = shelf.model.lighting;
  // Competing lights behind the salon wall, closer to its doorway than the shelf.
  const inny = new THREE.Group();
  inny.position.set(400, 0, 380);
  inny.userData.lighting = {units:'mm', coordinateSystem:'model-local', recesses:[{
    id:'other', ledStrips:Array.from({length:6}, (_, i) => ({id:'other-'+i,
      positionMm:[i*10,1200,0], targetMm:[i*10,1000,0], widthMm:300, heightMm:5}))
  }]};
  const scena = new THREE.Scene();
  const biblioteka = {meble:new Map([['regal',{korzen:regal}],['inny',{korzen:inny}]])};
  const options = {THREE, biblioteka, scena, roomAt:plan.roomAt};
  const pool = odswiezOswietlenieMebli(options);
  return {pool, options, camera:{position:new THREE.Vector3(370,167,380)}};
}
const positions = pool => pool.pula.map(l => l.position.toArray());
const shelfPositions = pool => pool.gniazda.slice(0,6).map(g => g.poz.toArray());

test('all six salon strips light on entering the room, even after a step below 50 cm',()=>{
  const {pool,camera} = fixture();
  pool.aktualizuj(camera);
  assert.notDeepEqual(positions(pool), shelfPositions(pool));
  camera.position.x = 350;
  assert.equal(plan.roomAt(350,380).id,'SALON');
  pool.aktualizuj(camera);
  assert.deepEqual(positions(pool), shelfPositions(pool));
  assert.ok(pool.pula.every(l => l.intensity > 0));
});

test('salon strips stay assigned throughout the room without adding GPU lights',()=>{
  const {pool,camera,options} = fixture();
  const lights = [...pool.pula];
  for(const [x,z] of [[350,380],[60,480],[200,260],[200,90]]){
    camera.position.set(x,167,z);
    pool.aktualizuj(camera);
    assert.deepEqual(positions(pool), shelfPositions(pool));
    assert.deepEqual(pool.pula,lights);
  }
  assert.equal(options.scena.children.filter(o => o.isLight).length,6);
  const refreshed = odswiezOswietlenieMebli({...options,poprzednie:pool});
  refreshed.aktualizuj(camera);
  assert.deepEqual(refreshed.pula,lights);
  assert.equal(options.scena.children.filter(o => o.isLight).length,6);
});

test('pool follows the next room and remains safe outside the apartment or with no furniture',()=>{
  const {pool,camera,options} = fixture();
  camera.position.set(350,167,380); pool.aktualizuj(camera);
  camera.position.x = 370; pool.aktualizuj(camera);
  assert.ok(pool.pula.every(l => l.position.x >= 400));
  camera.position.set(-200,167,380); pool.aktualizuj(camera);
  assert.ok(pool.pula.every(l => Number.isFinite(l.intensity)));
  const empty = odswiezOswietlenieMebli({...options,biblioteka:{},poprzednie:pool});
  empty.aktualizuj(camera);
  assert.ok(empty.pula.every(l => l.intensity === 0));
});
