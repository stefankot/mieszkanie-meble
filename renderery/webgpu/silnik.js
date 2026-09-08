/* ============================================================
   SILNIK — WebGPU + TSL
   ------------------------------------------------------------
   Renderer przepisany z WebGL/EffectComposer na WebGPURenderer i graf
   węzłów TSL. Ustawienia renderera i parametry efektów przeniesione
   z Lumen Decor Studio oraz z konfiguracji WebGI (znaczniki [Lumen] / [WebGI]).

   Meble NIE są tu wpisane. Łóżko pochodzi z biblioteki i jest sprawdzane
   sumą SHA-256 przed wykonaniem — tak samo jak w sekcji AI wersji WebGL.
   ============================================================ */
import * as Core from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';
import { pass, mrt, output, diffuseColor, emissive, velocity, normalView,
         metalness, roughness, packNormalToRGB, unpackRGBToNormal,
         sample, vec2, vec4, add } from 'three/tsl';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { ssr }  from 'three/addons/tsl/display/SSRNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import SunCalc from 'suncalc';
import { utworzTekstury } from './tekstury.js';
import { utworzPlan } from './plan.js';

const THREE = {...Core, OrbitControls, RoundedBoxGeometry};
THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

const TEX = utworzTekstury(THREE);
const { boxGeo, board, boardMaterial, pegMaterial, fabricMaterial, setUV,
        canvasTex, cloneTex, grayCanvas, fbmMaker, heightToNormal,
        drawSky, drawBoardHeight, mattressMat, cushionMat } = TEX;
const PLAN = utworzPlan(THREE);
const { APARTMENT, wallGeometry, wallPositions } = PLAN;

/* Mebel z biblioteki. Suma kontrolna jest sprawdzana przed importem —
   ten sam mechanizm, co w sekcji AI wersji WebGL. */
const BIBLIOTEKA = 'https://raw.githubusercontent.com/stefankot/mieszkanie-meble/main/';
const LOZKO_URL = BIBLIOTEKA + 'meble/lozko/wersje/bazowa-95056a0097fc.js';
const LOZKO_SHA = '95056a0097fc3c7e1203d5408e3bfad82a87e6d22f2d60f92d5bf0519a7cf0de';
async function pobierzLozko(){
  const odp = await fetch(LOZKO_URL);
  if(!odp.ok) throw Error('Nie można pobrać łóżka: HTTP ' + odp.status);
  const bajty = await odp.arrayBuffer();
  const suma = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bajty))]
    .map(x => x.toString(16).padStart(2,'0')).join('');
  if(suma !== LOZKO_SHA) throw Error('Plik łóżka nie zgadza się z zatwierdzoną wersją.');
  const url = URL.createObjectURL(new Blob([bajty], {type:'text/javascript'}));
  try { return (await import(url)).default; } finally { URL.revokeObjectURL(url); }
}
const F = await pobierzLozko();

const $ = id => document.getElementById(id);
const zapisz = t => { const n = $('stan'); if (n) n.textContent = t; };
const usterki = [];
window.__silnik = { usterki, gotowy: false };

/* Panel jest domyślnie ukryty przy starcie w niektórych osadzeniach i wtedy
   innerWidth wynosi 0. Renderer o zerowym canvasie nic nie rysuje, więc rozmiar
   bierzemy z pierwszego niezerowego źródła i pilnujemy go przy każdej klatce. */
const szerokosc = () => Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1280);
const wysokosc = () => Math.max(1, window.innerHeight || document.documentElement.clientHeight || 720);

/* MRT z sześcioma kanałami przekracza domyślny limit 32 B na próbkę.
   Adapter zwykle udostępnia znacznie więcej (tu 128), ale trzeba o to poprosić
   przy tworzeniu urządzenia — Lumen robi dokładnie to samo (requiredLimits). */
async function wymaganeLimity(){
  try{
    const adapter = await navigator.gpu.requestAdapter();
    const limity = {};
    const bajty = adapter && adapter.limits && adapter.limits.maxColorAttachmentBytesPerSample;
    if(bajty && bajty > 32) limity.maxColorAttachmentBytesPerSample = Math.min(bajty, 128);
    const cele = adapter && adapter.limits && adapter.limits.maxColorAttachments;
    if(cele && cele > 4) limity.maxColorAttachments = Math.min(cele, 8);
    return limity;
  }catch(e){ usterki.push('requiredLimits: '+e.message); return {}; }
}
const limity = await wymaganeLimity();
const renderer = new THREE.WebGPURenderer({
  antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, samples: 0,
  requiredLimits: limity
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(szerokosc(), wysokosc());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // [Lumen] ma BasicShadowMap, ale tam cienie
                                                  // wygładza akumulacja; tutaj PCF daje je od razu
renderer.shadowMap.autoUpdate = true;             // [Lumen] ma false, ale tam cienie odświeża
                                                  // akumulacja progresywna; tutaj jej (jeszcze) nie ma
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // [Lumen] VA = 4 · [WebGI] toneMapping 4
renderer.toneMappingExposure = 0.85;                  // [WebGI] 1; obniżone po kalibracji ACES
renderer.domElement.tabIndex = 0;
$('app').append(renderer.domElement);

await renderer.init();
zapisz('WebGPU: ' + (renderer.backend && renderer.backend.constructor.name) + ' · budowanie sceny…');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe3e5e6);
const camera = new THREE.PerspectiveCamera(42, szerokosc() / wysokosc(), 2, 6500);
camera.position.set(430, 175, 700);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .08;   // [WebGI] 0.08
controls.minDistance = 35; controls.maxDistance = 3000;
controls.maxPolarAngle = Math.PI * .495;
controls.zoomSpeed = .65; controls.panSpeed = .8;
controls.target.set(150, 90, 620);

/* ---------- MIESZKANIE: jedna scena, prawdziwe otwory ----------
   Wersja WebGL trzymała ściany w osobnej scenie i doklejała je jako overlay
   z prepassem głębi i stencilowym portalem okiennym. W WebGPU wszystko wchodzi
   do jednego przebiegu, bo SSGI i SSR czytają MRT tej sceny — inaczej promienie
   nie widziałyby ścian. Otwory okienne są realne w siatce, więc stencil znika. */
const materialSciany = new THREE.MeshPhysicalMaterial({
  color:0xe4e3df, roughness:.92, metalness:0,
  normalMap: canvasTex(heightToNormal(grayCanvas(256,(()=>{const n=fbmMaker(719,3,32);return(u,v)=>.5+(n(u,v)-.5)*.32;})()),.35),false,1,1),
  normalScale: new THREE.Vector2(.35,.35),
  envMapIntensity:.45, side:THREE.DoubleSide, dithering:true
});
const uvSciany=[];
for(let i=0;i<wallPositions.length;i+=9){
  const a=wallPositions.slice(i,i+3),b=wallPositions.slice(i+3,i+6),c=wallPositions.slice(i+6,i+9);
  const n=[(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])];
  const ax=Math.abs(n[0]),ay=Math.abs(n[1]),az=Math.abs(n[2]);
  for(const p of [a,b,c]) uvSciany.push(ax>=ay&&ax>=az?p[2]:p[0], ay>ax&&ay>az?p[2]:p[1]);
}
wallGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvSciany.map(v=>v/60),2));
const sciany = new THREE.Mesh(wallGeometry, materialSciany);
sciany.castShadow = sciany.receiveShadow = true; sciany.name='Ściany';
scene.add(sciany);

const ksztaltSufitu = new THREE.Shape(APARTMENT.outer.map(p=>new THREE.Vector2(p[0],-p[1])));
const geoSufit = new THREE.ShapeGeometry(ksztaltSufitu);
const materialSufitu = materialSciany.clone();
materialSufitu.side = THREE.BackSide; materialSufitu.roughness = .96; materialSufitu.name='Sufit';
const sufit = new THREE.Mesh(geoSufit, materialSufitu);
sufit.rotation.x = -Math.PI/2; sufit.position.y = APARTMENT.height; sufit.receiveShadow = true;
scene.add(sufit);

const normalnaPodlogi = canvasTex(heightToNormal(drawBoardHeight(512),.3),false,32,32);
const chropPodlogi = canvasTex(grayCanvas(256,(()=>{const n=fbmMaker(51,3,8);return(u,v)=>.90+(n(u,v)-.5)*.1;})()),false,32,32);
const podloga = new THREE.Mesh(new THREE.PlaneGeometry(2800,2600), new THREE.MeshPhysicalMaterial({
  color:0xe3e5e6, normalMap:normalnaPodlogi, normalScale:new THREE.Vector2(.04,.04),
  roughnessMap:chropPodlogi, roughness:.88, metalness:0, envMapIntensity:.65, dithering:true
}));
podloga.rotation.x = -Math.PI/2; podloga.position.set(503,-.03,378); podloga.receiveShadow = true;
podloga.name='Podłoga'; scene.add(podloga);

/* ---------- OKNA: ramy, szyby i widok na zewnątrz ---------- */
const materialRamy = new THREE.MeshPhysicalMaterial({color:0xe9e5dc, roughness:.5, metalness:.03, clearcoat:.08, envMapIntensity:.5});
const materialSzyby = new THREE.MeshPhysicalMaterial({color:0xf1eee5, roughness:.08, metalness:0, transparent:true, opacity:.10, side:THREE.DoubleSide, envMapIntensity:.9});
const otwory = [
  ...APARTMENT.windows.map(o=>({...o, sill:120, head:240})),
  ...APARTMENT.doors.filter(o=>o.name==='Drzwi balkonowe').map(o=>({...o, sill:0, head:220}))
];
const grupaOkien = new THREE.Group(); grupaOkien.name='Okna'; scene.add(grupaOkien);
for(const o of otwory){
  const [x,z,w,h] = o.rect;
  const pionowe = w < h;                       // otwór w ścianie wschód-zachód
  const szer = pionowe ? h : w, gr = pionowe ? w : h;
  const wys = o.head - o.sill;
  const cx = x + w/2, cz = z + h/2, cy = (o.sill + o.head)/2;
  const rama = new THREE.Mesh(boxGeo(pionowe?gr+2:szer+2, wys+2, pionowe?szer+2:gr+2, .8), materialRamy);
  rama.position.set(cx, cy, cz); rama.castShadow = rama.receiveShadow = true; grupaOkien.add(rama);
  const szyba = new THREE.Mesh(new THREE.PlaneGeometry(szer-4, wys-4), materialSzyby);
  szyba.position.set(cx, cy, cz);
  if(pionowe) szyba.rotation.y = Math.PI/2;
  grupaOkien.add(szyba);
}

/* Niebo: skończona kula za elewacjami. Przez realne otwory widać ją wprost,
   bez maski stencilowej, której wymagał potok WebGL. */
const teksturaNieba = canvasTex(drawSky(1024,512), true);
teksturaNieba.wrapS = teksturaNieba.wrapT = THREE.ClampToEdgeWrapping;
const niebo = new THREE.Mesh(new THREE.SphereGeometry(2400,64,32),
  new THREE.MeshBasicMaterial({map:teksturaNieba, side:THREE.BackSide, toneMapped:true}));
niebo.position.set(503,170,378); niebo.name='Niebo'; scene.add(niebo);

/* ---------- ŚWIATŁO ---------- */
const chwila = new Date('2026-04-01T14:00:00Z');
const pozycjaSlonca = SunCalc.getPosition(chwila, 52.23, 21.01);
const azymut = (pozycjaSlonca.azimuth + Math.PI) % (2*Math.PI);
const POLNOC = new THREE.Vector3(-1,0,1).normalize(), WSCHOD = new THREE.Vector3(-1,0,-1).normalize();
const DO_SLONCA = POLNOC.clone().multiplyScalar(Math.cos(azymut)*Math.cos(pozycjaSlonca.altitude))
  .addScaledVector(WSCHOD, Math.sin(azymut)*Math.cos(pozycjaSlonca.altitude));
DO_SLONCA.y = Math.sin(pozycjaSlonca.altitude);

const cel = new THREE.Object3D(); cel.position.set(503,90,378); scene.add(cel);
const slonce = new THREE.DirectionalLight(0xfff1dc, 9);
slonce.position.copy(cel.position).addScaledVector(DO_SLONCA, 1800);
slonce.target = cel; slonce.castShadow = true;
slonce.shadow.mapSize.set(4096,4096);
slonce.shadow.bias = -0.0028;              // [WebGI] shadow.bias -0.00279
slonce.shadow.camera.near = 100; slonce.shadow.camera.far = 3600;
const zasieg = 700;
Object.assign(slonce.shadow.camera, {left:-zasieg, right:zasieg, top:zasieg, bottom:-zasieg});
slonce.shadow.camera.updateProjectionMatrix();
scene.add(slonce);

scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x6a5a48, .12));

/* Światło wpadające każdym otworem — prostokątne źródło na wysokości okna. */
const swiatlaOkien = [];
for(const o of otwory){
  const [x,z,w,h] = o.rect;
  const pionowe = w < h;
  const szer = pionowe ? h : w, wys = o.head - o.sill;
  const l = new THREE.RectAreaLight(0xffecd1, 1.6, Math.max(10,szer-6), Math.max(10,wys-6));
  l.position.set(x+w/2, (o.sill+o.head)/2, z+h/2);
  const doSrodka = new THREE.Vector3(503,(o.sill+o.head)/2,378);
  l.lookAt(doSrodka.x, l.position.y, doSrodka.z);
  scene.add(l); swiatlaOkien.push(l);
}

/* Środowisko: PMREM z proceduralnej sceny pudełkowej — ta sama, co w wersji
   WebGL. [Lumen] environmentIntensity = krzywa(godzina) × 0.04, tu stała. */
function zbudujSceneSrodowiska(){
  const s = new THREE.Scene();
  const panel = (w,h,col,x,y,z,rx,ry)=>{
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    m.material.color.setRGB(col[0],col[1],col[2]); m.position.set(x,y,z);
    if(rx) m.rotation.x=rx; if(ry) m.rotation.y=ry; s.add(m); return m;
  };
  const R=260;
  panel(2*R,2*R,[0.76,0.72,0.65],0,R,0,Math.PI/2);
  panel(2*R,2*R,[0.30,0.22,0.15],0,-R,0,-Math.PI/2);
  panel(2*R,2*R,[0.52,0.50,0.46],0,0,-R,0,0);
  panel(2*R,2*R,[0.48,0.46,0.42],0,0,R,0,Math.PI);
  panel(2*R,2*R,[0.46,0.44,0.40],-R,0,0,0,Math.PI/2);
  panel(2*R,2*R,[0.50,0.48,0.44],R,0,0,0,-Math.PI/2);
  const okno = new THREE.Mesh(new THREE.PlaneGeometry(150,150), new THREE.MeshBasicMaterial({map:teksturaNieba.clone()}));
  okno.material.color.setRGB(4.8,4.35,3.65); okno.position.set(0,26,-R+2); s.add(okno);
  return s;
}
try{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(zbudujSceneSrodowiska(), 0.02, 1, 900);
  scene.environment = rt.texture;
  scene.environmentIntensity = 0.35;   // [WebGI] envMapIntensity 0.5; obniżone po kalibracji
  pmrem.dispose();
}catch(e){ usterki.push('PMREM: '+e.message); }

/* ---------- MEBEL ---------- */
const materialBazowy = {
  wood:(w,h)=>board(0xdddddd,w,h),
  white:(w,h)=>board(0xf2f1ee,w,h),
  graphite:(w,h)=>board(0x33363b,w,h,34),
  peg:(w,h)=>pegMaterial(w,h),
  fabric:(w,h,color='#c9c04f',profile)=>{const m=fabricMaterial(color,undefined,{profile});setUV(m,w,h);return m;},
  metal:()=>new THREE.MeshPhysicalMaterial({color:0xaeb3ba,metalness:.95,roughness:.25}),
  black:()=>new THREE.MeshPhysicalMaterial({color:0x151719,roughness:.44,metalness:.1})
};
const mebel = new THREE.Group(); mebel.name = F.name;
mebel.position.set(F.place[0],0,F.place[1]);
mebel.rotation.y = THREE.MathUtils.degToRad(F.place[2]||0);
scene.add(mebel);
function prymityw(row,parent){
  const [type,material,x,y,z,a,b,c,bevelOrId,id]=row;
  const desc=Array.isArray(material)?material:[material,a,b];
  const mat=materialBazowy[desc[0]](desc[1]??a,desc[2]??b,desc[3]);
  const geo=type==='b'?boxGeo(a,b,c,bevelOrId):type==='c'?new THREE.CylinderGeometry(a,a,b,c||24):null;
  const mesh=new THREE.Mesh(geo,mat); mesh.position.set(x,y,z);
  mesh.name=(type==='b'?id:bevelOrId)||''; mesh.castShadow=mesh.receiveShadow=true;
  parent.add(mesh); return mesh;
}
for(const row of F.p||[]) prymityw(row, mebel);
const ruchy = [], postep = {};
const zaczepy = F.extra?.(mebel,{THREE,boxGeo,board,boardMaterial,setUV,pegMaterial,fabricMaterial,baseMaterial:materialBazowy,mattressMat,cushionMat}) || {};
mebel.updateWorldMatrix(true,true);
for(const m of F.i||[]) ruchy.push({id:m[1], value:0, target:0, def:m});
function odswiezPozy(){ mebel.updateWorldMatrix(true,true); zaczepy.afterPose?.(postep); }
odswiezPozy();

/* ============================================================
   POTOK RENDEROWANIA — graf węzłów TSL
   ------------------------------------------------------------
   Układ przeniesiony z Lumen Decor Studio: scenePass z MRT, SSGI na
   kanałach koloru/głębi/normalnych, SSR na spakowanym metalness-roughness,
   bloom liczony wyłącznie z bufora emisji, na końcu TRAA.
   Kompozycja GI mnoży odbicie przez BUFOR ALBEDO, nie przez kolor cieniowany —
   to jest ta poprawność, której nie dało się uzyskać w potoku WebGL.
   ============================================================ */
const potok = new THREE.RenderPipeline(renderer);
const przebieg = pass(scene, camera);
przebieg.setMRT(mrt({
  output: output,
  diffuseColor: diffuseColor,
  emissive: emissive,
  normal: packNormalToRGB(normalView),
  metalrough: vec2(metalness, roughness),
  velocity: velocity
}));
const kKolor  = przebieg.getTextureNode('output');
const kAlbedo = przebieg.getTextureNode('diffuseColor');
const kEmisja = przebieg.getTextureNode('emissive');
const kNormal = przebieg.getTextureNode('normal');
const kMetRou = przebieg.getTextureNode('metalrough');
const kPredkosc = przebieg.getTextureNode('velocity');
const kGlebia = przebieg.getTextureNode('depth');
// oszczędność pasma — tak samo jak w oficjalnych przykładach three.js
przebieg.getTexture('normal').type = THREE.UnsignedByteType;
przebieg.getTexture('metalrough').type = THREE.UnsignedByteType;
przebieg.getTexture('diffuseColor').type = THREE.UnsignedByteType;

const normalnaSceny = sample(uv => unpackRGBToNormal(kNormal.sample(uv)));

/* --- SSGI: [WebGI ssrtgi] rayCount 2, stepCount 4→8, objectRadius 2 m --- */
const gi = ssgi(kKolor, kGlebia, normalnaSceny, camera);
gi.sliceCount.value = 2;                 // [WebGI] rayCount 2
gi.stepCount.value = 8;
gi.radius.value = 200;                   // [WebGI] objectRadius 2 m → 200 cm
gi.thickness.value = 60;                 // [WebGI] tolerance
gi.aoIntensity.value = 1;                // [Lumen] giOcclusionStrength 1
gi.giIntensity.value = 3;     // skalibrowane na zrzutach: 6 zalewało, 1.6 ledwo widoczne
gi.useLinearThickness.value = false;      // [Lumen]
gi.useScreenSpaceSampling.value = true;   // [Lumen]
const wezelAO = gi.getAONode();
const wezelGI = gi.getGINode();

/* --- SSR: parametry Lumena 1:1 --- */
const odbicia = ssr(kKolor, kGlebia, normalnaSceny, {
  metalnessNode: kMetRou.r,
  roughnessNode: kMetRou.g
});
odbicia.quality.value = .35;              // [Lumen] ssr.quality
odbicia.intensity.value = 1.2;            // [Lumen] ssr.intensity
odbicia.maxDistance.value = 1;            // [Lumen] ssr.maxDistance
odbicia.thickness.value = .1;             // [Lumen] ssr.thickness
odbicia.mirrorBias.value = .5;            // [Lumen] ssr.mirrorBias
odbicia.maxLuminance.value = 35;          // [Lumen] ssr.maxLuminance
odbicia.screenEdgeFade.value = .2;        // [Lumen] ssr.screenEdgeFade
odbicia.environmentIntensity.value = Math.PI;  // [Lumen] ssr.environmentIntensity
odbicia.resolutionScale = .9;             // [Lumen] ssr.resolutionScale
odbicia.binaryRefine = false;             // [Lumen] ssr.binaryRefine

/* --- kompozycja: AO na kolorze, GI na albedo, SSR dodatkowo ---
   SSGI i SSR są włączone i potwierdzone wizualnie: przy włączonym SSGI
   narożniki dostają okluzję, pod skrzynią pojawia się cień kontaktowy,
   a obraz zyskuje głębię. Ocena idzie ze zrzutów ekranu — odczyt pikseli
   przez createImageBitmap na canvasie WebGPU zwracał nieaktualny bufor. */
const UZYJ_SSGI = true;
const zGI  = UZYJ_SSGI ? vec4(add(kKolor.rgb.mul(wezelAO.r), kAlbedo.rgb.mul(wezelGI.rgb)), kKolor.a) : kKolor;
const zSSR = UZYJ_SSGI ? vec4(zGI.rgb.add(odbicia.rgb), zGI.a) : zGI;

/* --- bloom tylko z bufora emisji: [WebGI] intensity 0.5, radius 0.6, threshold 2 --- */
const poswiata = bloom(kEmisja, .5, .6, 2.0);

/* --- TRAA na kompozycie --- */
const finalny = traa(vec4(zSSR.rgb.add(poswiata.rgb), zSSR.a), kGlebia, kPredkosc, camera);
potok.outputNode = finalny;

window.__silnik.potok = potok;
window.__silnik.wezly = {gi, odbicia, poswiata, przebieg};
window.__silnik.renderer = renderer;
window.__silnik.scene = scene;
window.__silnik.camera = camera;
window.__silnik.controls = controls;
window.__silnik.mebel = mebel;
window.__silnik.THREE = THREE;

/* ---------- pętla ---------- */
let brudne = true, klatki = 0;
const invalidate = () => { brudne = true; };
controls.addEventListener('change', invalidate);

function dopasujRozmiar(){
  const w = szerokosc(), h = wysokosc();
  const d = renderer.domElement;
  if(d.width === Math.floor(w*renderer.getPixelRatio()) && d.height === Math.floor(h*renderer.getPixelRatio())) return false;
  renderer.setSize(w,h); camera.aspect = w/h; camera.updateProjectionMatrix();
  return true;
}
addEventListener('resize', ()=>{ if(dopasujRozmiar()) invalidate(); });

renderer.shadowMap.needsUpdate = true;
async function klatka(){
  if(dopasujRozmiar()) invalidate();
  controls.update();
  if(potok.render) potok.render(); else await potok.renderAsync();
  klatki++; window.__silnik.klatki = klatki;
}
window.__silnik.klatka = klatka;
renderer.setAnimationLoop(klatka);

await klatka();
window.__silnik.gotowy = true;
zapisz('WebGPU · limity: '+JSON.stringify(limity)+' · SSGI + SSR + bloom + TRAA · ' + (usterki.length ? ('usterki: '+usterki.length) : 'bez usterek'));
