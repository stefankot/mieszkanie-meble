import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const root=process.env.THREE_TEST_ROOT;
const THREE=await import(root?pathToFileURL(root+'/build/three.webgpu.js').href:'three/webgpu');
const {utworzKadrowanie}=await import('../renderery/webgpu/kadrowanie.js');

test('framing can use the side when the furniture front is against a wall',()=>{
  const room={id:'test'};
  const plan={
    APARTMENT:{height:280,outer:[[0,0],[500,0],[500,500],[0,500]]},
    czyPodloga:(x,z)=>x>=20&&x<=480&&z>=20&&z<=480,
    czySciana:()=>false,
    wallBoxes:[],
    roomAt:(x,z)=>x>=0&&x<=500&&z>=0&&z<=500?room:null
  };
  const korzen=new THREE.Group();
  korzen.position.set(250,50,430);
  korzen.add(new THREE.Mesh(new THREE.BoxGeometry(100,100,100),new THREE.MeshBasicMaterial()));
  const biblioteka={meble:new Map([['mebel',{korzen}]])};
  const camera=new THREE.PerspectiveCamera(60,16/9,.1,2000);
  const kadrowanie=utworzKadrowanie({THREE,plan,biblioteka});
  const wynik=kadrowanie.kadruj(korzen,camera);
  assert.equal(wynik.ok,true,wynik.powod);
  assert.ok(Math.abs(wynik.pozycja.x-250)>70,'kamera powinna znaleźć miejsce z boku mebla');
  assert.ok(wynik.pozycja.z<=480);
});

test('framing can look through an open passage from an adjacent room',()=>{
  const left={id:'left'},right={id:'right'};
  const plan={
    APARTMENT:{height:280,outer:[[0,0],[600,0],[600,400],[0,400]]},
    czyPodloga:(x,z)=>x>=20&&x<=580&&z>=20&&z<=380,
    czySciana:(x,_y,z)=>Math.abs(x-300)<3 && !(z>170&&z<230),
    wallBoxes:[],
    roomAt:(x)=>x<300?left:right
  };
  const korzen=new THREE.Group();
  /* Mebel zajmuje niemal całą szerokość lewego pokoju; wolny kadr istnieje
     dopiero po prawej stronie ściany, przez otwarte przejście. */
  korzen.position.set(145,60,200);
  korzen.add(new THREE.Mesh(new THREE.BoxGeometry(250,120,110),new THREE.MeshBasicMaterial()));
  const biblioteka={meble:new Map([['mebel',{korzen}]])};
  const camera=new THREE.PerspectiveCamera(60,16/9,.1,2000);
  const wynik=utworzKadrowanie({THREE,plan,biblioteka}).kadruj(korzen,camera);
  assert.equal(wynik.ok,true,wynik.powod);
  assert.ok(wynik.pozycja.x>300,'kamera powinna skorzystać z otwartego przejścia');
});
