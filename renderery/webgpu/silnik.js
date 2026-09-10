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
         sample, vec2, vec4, add, uniform, vec3 } from 'three/tsl';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { ssr }  from 'three/addons/tsl/display/SSRNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { taau } from 'three/addons/tsl/display/TAAUNode.js';
import { sharpen } from 'three/addons/tsl/display/SharpenNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { dodajSuwakiJakosci } from './suwaki-jakosci.js';
import { ustawWariacjeKoloru } from './niedoskonalosci.js';
import { temporalReproject } from 'three/addons/tsl/display/TemporalReprojectNode.js';
import { recurrentDenoise } from 'three/addons/tsl/display/RecurrentDenoiseNode.js';
import { sss } from 'three/addons/tsl/display/SSSNode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import SunCalc from 'suncalc';
import { utworzTekstury } from './tekstury.js';
import { utworzPlan } from './plan.js';
import { uruchomBiblioteke } from './biblioteka.js?p8';
import { utworzNawigacje } from './nawigacja.js?p18c';
import { utworzSterowanie } from './sterowanie.js?dev1';
import { wczytajMaterialy, wczytajSrodowisko } from './materialy.js';
import { odswiezOswietlenieMebli } from './oswietlenie-mebli.js';
import { skrzywFormatki } from './niedoskonalosci.js';
import { postep, koniecPomiaru } from './siec.js';
import { utworzInterakcje } from './interakcje.js';
import { utworzZaslony } from './zaslony.js';
import { audytMrt } from './mrt-audit.js';
import { utworzWorldGI, wybierzWorldGI } from './world-gi.js';
import { wybierzSSR, SSR_MODERN, SSR_MODERN_SETTINGS } from './ssr-variants.js';
import { utworzArchPhoto } from './arch-photo.js';
import { createPhotoRasterState, updatePhotoRasterState, photoRasterSlices } from './photo-raster.js';
import { createPhotoPathIntegration } from './photo-path.js';
import { runNavigationRegression } from './navigation-regression.js?p18b';
import { wlaczone } from './flagi.js';
import { zmiekczTkaniny } from './miekkie-bryly.js';
import { wczytajTeksturyUzytkownika } from './tekstury-uzytkownika.js';
import { utworzDrzewa } from './drzewa.js';
import { PERF, utworzPomiar } from './wydajnosc.js';
import { utworzHoverOutline } from './hover-outline.js';

/* Jednostka sceny: centymetr. Dane mebli pozostają w mm; konwersja w bibliotece.
   Helpery dotyczą długości w scenie, nie promieni filtrów w pikselach. */
const cm = wartosc => wartosc;
const m = wartosc => cm(wartosc * 100);

/* Kompilacja WGSL blokuje główny wątek, więc pasek postępu zamarza dokładnie
   wtedy, gdy jest najbardziej potrzebny. Przed każdym długim etapem oddajemy
   przeglądarce dwie klatki, żeby zdążyła narysować nowy komunikat. */
const oddajKlatke = () => new Promise(r => {
  /* requestAnimationFrame NIE odpala się na karcie w tle. Bez wyścigu z zegarem
     ładowanie stanęłoby tam na zawsze — a to jest dokładnie ten scenariusz,
     w którym użytkownik otwiera stronę i przełącza się na inną kartę. */
  let gotowe = false;
  const koniec = () => { if(!gotowe){ gotowe = true; r(); } };
  requestAnimationFrame(() => requestAnimationFrame(koniec));
  setTimeout(koniec, 150);
});

const THREE = {...Core, OrbitControls, RoundedBoxGeometry};
THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

const TEX = utworzTekstury(THREE);
const { boxGeo, board, boardMaterial, pegMaterial, fabricMaterial, setUV,
        canvasTex, cloneTex, grayCanvas, fbmMaker, heightToNormal,
        drawSky, drawBoardHeight, mattressMat, cushionMat, rng } = TEX;
const PLAN = utworzPlan(THREE);
const { APARTMENT, wallGeometry, wallPositions } = PLAN;


const $ = id => document.getElementById(id);
const zapisz = t => { const n = $('stan'); if (n) n.textContent = t; };
const usterki = [];
window.__silnik = { usterki, gotowy: false };

/* Panel jest domyślnie ukryty przy starcie w niektórych osadzeniach i wtedy
   innerWidth wynosi 0. Renderer o zerowym canvasie nic nie rysuje, więc rozmiar
   bierzemy z pierwszego niezerowego źródła i pilnujemy go przy każdej klatce. */
const szerokosc = () => Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1280);
const wysokosc = () => Math.max(1, window.innerHeight || document.documentElement.clientHeight || 720);
window.__silnik.mrtAudit=audytMrt(szerokosc(),wysokosc(),1);

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
  requiredLimits: limity, trackTimestamp: PERF   // P19: czas GPU tylko przy ?perf=1
});
/* MRT ma sześć załączników, więc każdy dodatkowy piksel kosztuje sześć buforów.
   Na 8 GB pixelRatio 1 to różnica między płynnym obrazem a zamuloną maszyną. */
renderer.setPixelRatio(1);
renderer.setSize(szerokosc(), wysokosc());
renderer.shadowMap.enabled = true;
/* VSM zamiast PCF. Filtr PCF w r185 bierze zaledwie PIĘĆ próbek z dysku Vogela,
   więc zwiększanie shadow.radius daje ziarno i schodki, a nie miękką półcień.
   VSM rozmywa mapę głębi naprawdę i to on daje łagodne cienie z referencji.
   Kosztem jest przeciek światła na cienkich bryłach — stąd umiarkowany promień. */
renderer.shadowMap.type = THREE.VSMShadowMap;
/* Mapa cienia NIE odświeża się w każdej klatce. Przy VSM każde odświeżenie to
   przerysowanie 458 siatek do bufora 2048² plus przebieg rozmycia — czyli
   drugi pełny render sceny co klatkę. Lumen też ma tu false.
   Odświeżamy na żądanie: przy zmianie światła, otwarciu mebla, podmianie modelu
   i — rzadko — dla wiatru w koronach. */
renderer.shadowMap.autoUpdate = false;
/* Jedno miejsce, przez które przechodzi każde żądanie przerysowania cienia.
   Ustawia obie flagi: tę na rendererze (dla ścieżki WebGL, gdyby wróciła)
   i tę na świetle, która JEDYNA działa w WebGPU — patrz komentarz przy `slonce`. */
let swiatloCienia = null;          // wypełniane przy tworzeniu słońca, niżej
/* P22: klatki rysujemy tylko przez chwilę po zmianie. Zmiana sceny przechodzi przez
   odswiezCien(), zdarzenia DOM albo ruch kamery i przesuwa ten znacznik czasu. */
let ostatniaZmiana = performance.now();
const oznaczZmiane = () => { ostatniaZmiana = performance.now(); };
window.__silnik.oznaczZmiane = oznaczZmiane;
function odswiezCien(){
  oznaczZmiane();
  renderer.shadowMap.needsUpdate = true;
  if(swiatloCienia) swiatloCienia.shadow.needsUpdate = true;
}
/* ACES przy ekspozycji 0,72 — dokładnie jak w wersji WebGL. Zamiana na AgX
   miała chronić jasne pastele przed żółcią, ale przy tym materiale odbiera
   drewnu złocistość, którą użytkownik wskazał jako lepszą na porównaniu A/B.
   AgX zostaje do wyboru w zakładce Jakość, gdy dojdą kremowe fronty MDF. */
const TONE_MAPPING = {aces:THREE.ACESFilmicToneMapping,neutral:THREE.NeutralToneMapping,agx:THREE.AgXToneMapping};
const toneZUrl = new URLSearchParams(location.search).get('tone');
renderer.toneMapping = TONE_MAPPING[toneZUrl] ?? THREE.ACESFilmicToneMapping;
/* 0,72 przy tym oświetleniu wypalało fronty do bieli — albedo forniru jest
   poprawne (zmierzone: 0,48/0,35/0,24 liniowo), więc korekta idzie tutaj. */
renderer.toneMappingExposure = 0.55;
renderer.domElement.tabIndex = 0;
$('app').append(renderer.domElement);

await renderer.init();
postep('Silnik WebGPU gotowy…', .12);
await oddajKlatke();
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

/* ---------- SKANOWANE MATERIAŁY PBR ----------
   Pozycja #1 z pakietu: prawdziwe skany zamiast tekstur proceduralnych.
   Gdyby CDN nie odpowiedział, wracamy do tekstur proceduralnych — scena ma
   się pokazać zawsze, tylko gorzej wyglądać, i powiedzieć o tym wprost. */
postep('Pobieranie skanów PBR (Poly Haven, CC0)…', .15);
zapisz('Pobieranie skanów PBR (Poly Haven, CC0)…');
let MAT = {maDrewno:false, maTynk:false, maParkiet:false, braki:['nie próbowano']};
try{
  MAT = await wczytajMaterialy(THREE, renderer, {jakosc: '1k'});
  window.__silnik.ktx2=MAT.ktx2;
  if(MAT.braki.length) usterki.push('Skany: ' + MAT.braki.join(' · '));
}catch(e){ usterki.push('Skany PBR: ' + e.message); }

/* ---------- MIESZKANIE: jedna scena, prawdziwe otwory ----------
   Wersja WebGL trzymała ściany w osobnej scenie i doklejała je jako overlay
   z prepassem głębi i stencilowym portalem okiennym. W WebGPU wszystko wchodzi
   do jednego przebiegu, bo SSGI i SSR czytają MRT tej sceny — inaczej promienie
   nie widziałyby ścian. Otwory okienne są realne w siatce, więc stencil znika. */
/* Gęstość tynku wynika z UV ścian (dzielone przez PROBKA_TYNKU niżej). */
const materialSciany = MAT.maTynk
  ? MAT.tynk(0xfaf8f4)
  : new THREE.MeshPhysicalMaterial({
      color:0xe4e3df, roughness:.92, metalness:0,
      normalMap: canvasTex(heightToNormal(grayCanvas(256,(()=>{const n=fbmMaker(719,3,32);return(u,v)=>.5+(n(u,v)-.5)*.32;})()),.35),false,1,1),
      normalScale: new THREE.Vector2(.35,.35),
      envMapIntensity:.45, dithering:true
    });
materialSciany.side = THREE.DoubleSide;
const uvSciany=[];
for(let i=0;i<wallPositions.length;i+=9){
  const a=wallPositions.slice(i,i+3),b=wallPositions.slice(i+3,i+6),c=wallPositions.slice(i+6,i+9);
  const n=[(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])];
  const ax=Math.abs(n[0]),ay=Math.abs(n[1]),az=Math.abs(n[2]);
  for(const p of [a,b,c]) uvSciany.push(ax>=ay&&ax>=az?p[2]:p[0], ay>ax&&ay>az?p[2]:p[1]);
}
/* Dzielnik = wymiar rzeczywisty próbki tynku (200 cm). Tekstura jest
   współdzielona ze stropem, więc gęstość ustawiamy w UV, nie w repeat. */
const PROBKA_TYNKU = 200;
wallGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvSciany.map(v=>v/PROBKA_TYNKU),2));
postep('Ściany, stropy i okna…', .72);
await oddajKlatke();
const sciany = new THREE.Mesh(wallGeometry, materialSciany);
sciany.castShadow = sciany.receiveShadow = true; sciany.name='Ściany';
scene.add(sciany);

const ksztaltSufitu = new THREE.Shape(APARTMENT.outer.map(p=>new THREE.Vector2(p[0],-p[1])));
const geoSufit = new THREE.ShapeGeometry(ksztaltSufitu);
const materialSufitu = materialSciany.clone();
materialSufitu.side = THREE.BackSide; materialSufitu.roughness = .96; materialSufitu.name='Sufit';
/* Bez shadowSide płaszczyzna stropu widziana od spodu nie trafia do mapy cienia
   i słońce świeci przez sufit prosto do wnętrza. To był główny błąd oświetlenia:
   światło wchodziło górą zamiast oknami. */
materialSufitu.shadowSide = THREE.DoubleSide;
/* ShapeGeometry wystawia UV w centymetrach obrysu, więc bez podziału wzór
   powtórzyłby się tysiąc razy na jednym stropie. */
{ const uv = geoSufit.attributes.uv;
  for(let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i)/PROBKA_TYNKU, uv.getY(i)/PROBKA_TYNKU);
  uv.needsUpdate = true; }
const sufit = new THREE.Mesh(geoSufit, materialSufitu);
sufit.rotation.x = -Math.PI/2; sufit.position.y = APARTMENT.height;
sufit.receiveShadow = true; sufit.castShadow = true;
scene.add(sufit);

const normalnaPodlogi = canvasTex(heightToNormal(drawBoardHeight(512),.3),false,32,32);
const chropPodlogi = canvasTex(grayCanvas(256,(()=>{const n=fbmMaker(51,3,8);return(u,v)=>.90+(n(u,v)-.5)*.1;})()),false,32,32);
/* Parkiet z referencji 2. PlaneGeometry ma UV 0..1 na całej płycie, więc
   wymiar detalu = wymiar płyty; skan sam rozłoży się co 225 cm. */
const materialPodlogi = MAT.maParkiet
  ? MAT.parkiet(2800, 2600)
  : new THREE.MeshPhysicalMaterial({
      color:0xe3e5e6, normalMap:normalnaPodlogi, normalScale:new THREE.Vector2(.04,.04),
      roughnessMap:chropPodlogi, roughness:.88, metalness:0, envMapIntensity:.65, dithering:true
    });
const podloga = new THREE.Mesh(new THREE.PlaneGeometry(2800,2600), materialPodlogi);
if(MAT.maParkiet){
  /* Jedyne miejsce, gdzie powtórzenie idzie przez teksturę, a nie przez UV:
     podłoga jest jedna, więc jeden opis tekstury nikogo nie kosztuje. */
  for(const m of [materialPodlogi.map, materialPodlogi.normalMap, materialPodlogi.roughnessMap])
    if(m) m.repeat.set(2800/225, 2600/225);
}
podloga.rotation.x = -Math.PI/2; podloga.position.set(503,-.03,378); podloga.receiveShadow = true;
podloga.name='Podłoga'; scene.add(podloga);

/* ---------- OKNA: ramy, szyby i widok na zewnątrz ---------- */
const materialRamy = new THREE.MeshPhysicalMaterial({color:0xe9e5dc, roughness:.5, metalness:.03, clearcoat:.08, envMapIntensity:.5});
/* SZKŁO: transmission zamiast opacity (pakiet §19.J).
   opacity:.10 to była półprzezroczysta powłoka bez załamania — szyba nie miała
   ani grubości, ani IOR, więc widok przez okno był po prostu przygaszony.
   transmission liczy refrakcję fizycznie: 1,52 to współczynnik szkła sodowego,
   grubość 0,6 cm to realna szyba zespolona sprowadzona do jednej tafli. */
const materialSzyby = new THREE.MeshPhysicalNodeMaterial({
  color: 0xffffff, roughness: .045, metalness: 0,
  transmission: 1, thickness: 0.6, ior: 1.52,
  attenuationColor: new THREE.Color(0xeaf2f0), attenuationDistance: 340,
  transparent: true, opacity: 1, side: THREE.DoubleSide, envMapIntensity: 1
});
/* Transmission to osobny przebieg renderowania sceny — na słabszej karcie
   kosztuje zauważalnie. Przełącznik w zakładce Jakość wraca do taniej szyby
   na opacity, bez zmiany geometrii okna. */
function ustawSzklo(fizyczne){
  materialSzyby.transmission = fizyczne ? 1 : 0;
  materialSzyby.opacity = fizyczne ? 1 : .10;
  materialSzyby.roughness = fizyczne ? .045 : .08;
  materialSzyby.needsUpdate = true;
}
window.__silnik.ustawSzklo = ustawSzklo;
const otwory = [
  ...APARTMENT.windows.map(o=>({...o, sill:o.sill??120, head:o.head??240})),
  ...APARTMENT.doors.filter(o=>o.name==='Drzwi balkonowe').map(o=>({...o, sill:0, head:220}))
];
const grupaOkien = new THREE.Group(); grupaOkien.name='Okna'; scene.add(grupaOkien);
for(const o of otwory){
  const [x,z,w,h] = o.rect;
  const pionowe = w < h;                       // otwór w ścianie wschód-zachód
  const szer = pionowe ? h : w, gr = pionowe ? w : h;
  const wys = o.head - o.sill;
  const cx = x + w/2, cz = z + h/2, cy = (o.sill + o.head)/2;
  /* Rama to CZTERY ramiaki, nie lita bryła. Poprzednia wersja wstawiała
     w otwór pełny prostopadłościan wielkości całego okna, czyli zamurowywała
     je: z wnętrza okno było szarym prostokątem, nie wpadało przez nie światło
     i nie było widać nieba ani drzew. To był główny powód „fatalnego światła”. */
  const PROFIL = 6;                    // szerokość ramiaka w cm
  const wzdluz = Math.max(2, szer), swiatloPion = Math.max(2, wys - 2*PROFIL);
  const ramiak = (dl, wysB, x, y, zz) => {
    const m = new THREE.Mesh(
      pionowe ? boxGeo(gr, wysB, dl, .4) : boxGeo(dl, wysB, gr, .4), materialRamy);
    m.position.set(x, y, zz);
    m.castShadow = m.receiveShadow = true;
    grupaOkien.add(m);
  };
  const os = pionowe ? 'z' : 'x';      // oś, wzdłuż której biegnie otwór
  const wzdl = (d) => os === 'z' ? [cx, cz + d] : [cx + d, cz];
  // nadproże i podokiennik
  for(const dy of [wys/2 - PROFIL/2, -(wys/2 - PROFIL/2)]){
    const [px, pz] = wzdl(0);
    ramiak(wzdluz, PROFIL, px, cy + dy, pz);
  }
  // ramiaki boczne
  for(const dd of [wzdluz/2 - PROFIL/2, -(wzdluz/2 - PROFIL/2)]){
    const [px, pz] = wzdl(dd);
    ramiak(PROFIL, swiatloPion, px, cy, pz);
  }
  const szyba = new THREE.Mesh(new THREE.PlaneGeometry(szer-4, wys-4), materialSzyby);
  szyba.position.set(cx, cy, cz);
  if(pionowe) szyba.rotation.y = Math.PI/2;
  grupaOkien.add(szyba);
}

/* Niebo: skończona kula za elewacjami. Przez realne otwory widać ją wprost,
   bez maski stencilowej, której wymagał potok WebGL. */
const teksturaNieba = canvasTex(drawSky(1024,512), true);
teksturaNieba.wrapS = teksturaNieba.wrapT = THREE.ClampToEdgeWrapping;
/* Niebo świeci ponad biel: mnożnik >1 wchodzi w tone mapping i wychodzi
   prześwietlone, tak jak okno na obu referencjach. Bez tego szyba jest tylko
   jaśniejszym szarym prostokątem i wnętrze nie ma z czego czerpać kontrastu. */
const materialNieba = new THREE.MeshBasicMaterial({map:teksturaNieba, side:THREE.BackSide, toneMapped:true});
materialNieba.color.setRGB(2.6, 2.55, 2.4);
const niebo = new THREE.Mesh(new THREE.SphereGeometry(2400,64,32), materialNieba);
niebo.position.set(503,170,378); niebo.name='Niebo'; scene.add(niebo);

/* ---------- WIDOK ZA OKNEM ----------
   Korony drzew z wersji WebGL. Tam były wyłącznie cieniodajne (osobna scena
   shadowOnly), bo portal okienny pokazywał samo niebo. Tu otwory są prawdziwe,
   więc te same karty rysujemy WIDOCZNIE — i nadal rzucają cień, dzięki czemu
   przez okna wpada światło przetykane liśćmi, a nie równy prostokąt.
   Skoro korony są widoczne, doszły pnie; w wersji cieniowej nie były potrzebne.
   Drzewa są ilustracyjne — nikt nie podał pomiarów prawdziwego otoczenia. */
function maskaGalezi(ziarno){
  const los = rng(ziarno), plotno2 = document.createElement('canvas');
  plotno2.width = plotno2.height = 512;
  const c = plotno2.getContext('2d'); c.lineCap = 'round';
  (function galaz(x,y,kat,dl,gr,gleb){
    const kx = x+Math.cos(kat)*dl, ky = y+Math.sin(kat)*dl;
    c.strokeStyle='#46563a'; c.lineWidth=gr; c.beginPath(); c.moveTo(x,y);
    c.quadraticCurveTo((x+kx)/2+9*(los()-.5),(y+ky)/2+9*(los()-.5),kx,ky); c.stroke();
    if(gleb>0){
      galaz(kx,ky,kat+(los()-.5)*.4,dl*.69,gr*.62,gleb-1);
      galaz(x+(kx-x)*.62,y+(ky-y)*.62,kat+(los()>.5?1:-1)*(.45+los()*.5),dl*.57,gr*.55,gleb-1);
    }else{
      for(let i=0;i<13;i++){
        const a=los()*Math.PI*2, r=Math.sqrt(los())*31;
        c.fillStyle=['#485b38','#5c7145','#73834f','#88955e'][Math.floor(los()*4)];
        c.beginPath(); c.ellipse(kx+Math.cos(a)*r,ky+Math.sin(a)*r,4+los()*4,9+los()*6,a,0,Math.PI*2); c.fill();
      }
    }
  })(245,470,-1.58,147,7,4);
  const t = canvasTex(plotno2,true,1,1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}
const zielen = new THREE.Group(); zielen.name = 'Drzewa za oknami'; scene.add(zielen);
/* P30: drzewa 3D z wiatrem w shaderze zamiast płaskich kart; ?bez=drzewa3d przywraca karty. */
const DRZEWA_3D = wlaczone('drzewa3d');
if(DRZEWA_3D) zielen.add(utworzDrzewa(THREE, otwory));
const maskiGalezi = DRZEWA_3D ? [] : [0,1,2,3].map(i => maskaGalezi(104729 + i*7919));
const materialyKorony = maskiGalezi.map(map => new THREE.MeshBasicMaterial({
  map, alphaTest:.45, side:THREE.DoubleSide, toneMapped:true}));
const materialPnia = new THREE.MeshPhysicalMaterial({color:0x4a4034, roughness:.95, metalness:0});
const losKorony = rng(6102026);
const galezie = [];
for(const [nrOkna, o] of (DRZEWA_3D ? [] : otwory).entries()){
  const [x,z,w,d] = o.rect, naZewnatrz = x < 500 ? -1 : 1;
  for(let i=0;i<4;i++){
    const oś = new THREE.Group();
    /* Drzewa odsunięte od okien: przy 95 cm ich liście rzucały ostre cętki na
       całą zabudowę i to one dominowały obraz. Z 300 cm ten sam cień jest
       rozmyty przez półcień VSM i daje łagodną modulację, a nie plamy. */
    oś.position.set(x+w/2 + naZewnatrz*(300+i*70), 80+i*24, z+d/2 + (i-1.5)*95);
    zielen.add(oś);
    const szer = 225+losKorony()*55, wys = 300+losKorony()*95;
    const karta = new THREE.Mesh(new THREE.PlaneGeometry(szer,wys), materialyKorony[(nrOkna+i)%4]);
    karta.position.y = wys*.5;
    karta.rotation.y = Math.PI/2 + (losKorony()-.5)*.36;
    karta.castShadow = true;
    oś.add(karta);
    const pien = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 7.5, oś.position.y+40, 8), materialPnia);
    pien.position.set(oś.position.x, (oś.position.y+40)/2, oś.position.z);
    pien.castShadow = true; zielen.add(pien);
    galezie.push({oś, faza: losKorony()*Math.PI*2, czest: .38+losKorony()*.22,
                  amp: .012+losKorony()*.013, baza: oś.position.clone()});
  }
}
/* Wiatr: gładki, deterministyczny szum porywów — ten sam, co w wersji WebGL. */
function szumWiatru(t, ziarno){
  const n = Math.floor(t), f = t-n, s2 = f*f*f*(f*(f*6-15)+10);
  const v = k => { const a = Math.sin(k*127.1 + ziarno*311.7)*43758.5453123; return (a-Math.floor(a))*2-1; };
  return THREE.MathUtils.lerp(v(n), v(n+1), s2);
}
function poruszZielen(t){
  const szeroki = szumWiatru(t*.13, 11), poryw = .65 + .35*szumWiatru(t*.057, 37);
  for(const g of galezie){
    const lokalny = szumWiatru(t*.43, g.faza+4);
    const wychylenie = (szeroki*.65 + Math.sin(t*g.czest + g.faza)*.35 + lokalny*.22) * poryw;
    g.oś.rotation.x = g.amp*wychylenie;
    g.oś.rotation.z = g.amp*.38*Math.sin(t*.23 + g.faza);
    g.oś.position.z = g.baza.z + 1.4*szumWiatru(t*.21, g.faza+13);
  }
}
poruszZielen(0);
const stanZieleni = {animuj: true, cien: true};
/* Przy cieniu liści wiatr chodzi wolniej, bo poza zmienia się skokowo
   co ósmą klatkę — wolniejszy ruch sprawia, że skok jest niewidoczny. */
const WOLNIEJSZY_WIATR = .28;
/* Przełącznik cienia liści (komorebi) — domyślnie WŁĄCZONY, ale mocno rozmyty:
   ostre cętki dominowały obraz, rozmyte dają miękką modulację plamy słońca. */
function ustawCienZieleni(wl){
  stanZieleni.cien = !!wl;
  zielen.traverse(o => { if(o.isMesh) o.castShadow = stanZieleni.cien; });
  odswiezCien();
}
window.__silnik.ustawCienZieleni = ustawCienZieleni;
window.__silnik.zielen = {zielen, poruszZielen, stanZieleni};

/* ---------- ŚWIATŁO ---------- */
/* Orientacja mieszkania względem stron świata. Bazowa (0°) pochodzi z symbolu N
   na SVG. Referencja ma światło z lewej, a salon ma okna wyłącznie od wschodu,
   więc samą porą dnia nie da się tego odtworzić — obracamy więc całe mieszkanie.
   To ustawienie RENDERERA, nie zmiana planu: dane w plan.js zostają nietknięte,
   a 0° wraca do orientacji z SVG. */
let orientacjaStopni = 0;
const POLNOC_BAZA = new THREE.Vector3(-1,0,1).normalize();
const WSCHOD_BAZA = new THREE.Vector3(-1,0,-1).normalize();
const POLNOC = POLNOC_BAZA.clone(), WSCHOD = WSCHOD_BAZA.clone();
function ustawOrientacje(stopnie){
  orientacjaStopni = stopnie;
  const k = THREE.MathUtils.degToRad(stopnie);
  POLNOC.copy(POLNOC_BAZA).applyAxisAngle(new THREE.Vector3(0,1,0), k);
  WSCHOD.copy(WSCHOD_BAZA).applyAxisAngle(new THREE.Vector3(0,1,0), k);
}
const DO_SLONCA = new THREE.Vector3();
let wysokoscSlonca = 0;
/* Kierunek słońca dla dowolnej chwili — ta sama arytmetyka co w wersji WebGL:
   SunCalc dla Warszawy, azymut obrócony do siatki budynku (północ [-44,44]). */
function kierunekSlonca(chwila){
  const p = SunCalc.getPosition(chwila, 52.23, 21.01);
  const az = (p.azimuth + Math.PI) % (2*Math.PI);
  DO_SLONCA.copy(POLNOC).multiplyScalar(Math.cos(az)*Math.cos(p.altitude))
           .addScaledVector(WSCHOD, Math.sin(az)*Math.cos(p.altitude));
  DO_SLONCA.y = Math.sin(p.altitude);
  wysokoscSlonca = p.altitude;
  return p;
}
/* Z3a: 15 września 16:30, Warszawa. SunCalc: kierunek (0.639, 0.352, 0.684).
   Późniejsze słońce przesuwa plamę bliżej prawej strony regału. */
ustawOrientacje(335);
let chwila = new Date(2026, 8, 15, 16, 30, 0);
kierunekSlonca(chwila);

const cel = new THREE.Object3D(); cel.position.set(503,90,378); scene.add(cel);
const slonce = new THREE.DirectionalLight(0xfff1dc, 9);
slonce.position.copy(cel.position).addScaledVector(DO_SLONCA, 1800);
slonce.target = cel; slonce.castShadow = true;
slonce.shadow.mapSize.set(2048,2048);   // 4096² to 64 MB samej mapy głębi
slonce.shadow.blurSamples = 32;         // VSM: więcej próbek, bo promień jest duży
slonce.shadow.bias = -0.0009;              // [WebGI] -0.00279; złagodzone, bo strop
slonce.shadow.normalBias = 0.8;            // VSM potrzebuje mniej niż PCF
slonce.shadow.camera.near = 100; slonce.shadow.camera.far = 3600;
const zasieg = 700;
Object.assign(slonce.shadow.camera, {left:-zasieg, right:zasieg, top:zasieg, bottom:-zasieg});
slonce.shadow.camera.updateProjectionMatrix();
/* PRAWDZIWA BRAMKA ODŚWIEŻANIA CIENIA.
   `renderer.shadowMap.autoUpdate` i `renderer.shadowMap.needsUpdate` NIE MAJĄ
   ŻADNEGO ZNACZENIA w ścieżce WebGPU. ShadowNode pyta o zgodę wyłącznie światła:

       let needsUpdate = shadow.needsUpdate || shadow.autoUpdate;   // three.webgpu.js:45484

   Dopóki `light.shadow.autoUpdate` zostaje domyślnym `true`, mapa cienia jest
   przerysowywana W KAŻDEJ KLATCE — czyli drugi pełny render 458 siatek do bufora
   2048² plus przebieg rozmycia VSM — a całe dławienie wyżej było martwym kodem.
   Ustawienie flagi na samym świetle jest tym, czego ten kod chciał od początku. */
slonce.shadow.autoUpdate = false;
slonce.shadow.needsUpdate = true;
swiatloCienia = slonce;
scene.add(slonce);

const niebieskie = new THREE.HemisphereLight(0xdfe9ff, 0x6a5a48, .12);
scene.add(niebieskie);

/* ============================================================
   PULE ŚWIATEŁ OBSZAROWYCH
   ------------------------------------------------------------
   RectAreaLight kosztuje PER PIKSEL — każdy oświetlony fragment przechodzi
   transformację LTC dla KAŻDEGO źródła w scenie. Przy 43 źródłach kadr regału
   kosztował 61 ms. Zmniejszenie liczby świateł jest jedyną skuteczną drogą:
   ClusteredLightsNode z r185 obejmuje wyłącznie światła punktowe bez cienia.

   Nie gasimy świateł, tylko trzymamy STAŁĄ, małą pulę i przestawiamy ją do
   gniazd najbliższych kamerze. Stała liczba jest tu warunkiem koniecznym:
   dodanie lub usunięcie światła unieważnia materiały i wymusza rekompilację
   shaderów, więc gaszenie co klatkę byłoby gorsze od problemu.
   ============================================================ */
function utworzPuleObszarowa({gniazda, ile, nazwa}){
  const pula = Array.from({length: Math.min(ile, gniazda.length)}, () => {
    const l = new THREE.RectAreaLight(0xffffff, 0, 10, 10);
    l.name = nazwa;
    scene.add(l);
    return l;
  });
  let ostatnia = new THREE.Vector3(NaN, NaN, NaN);
  function aktualizuj(kam, wymus){
    if(!wymus && ostatnia.distanceToSquared(kam.position) < 2500) return;
    ostatnia.copy(kam.position);
    const bliskie = gniazda
      .map(g => ({g, d: g.poz.distanceToSquared(kam.position)}))
      .sort((a, b) => a.d - b.d);
    pula.forEach((l, i) => {
      const w = bliskie[i];
      if(!w){ l.intensity = 0; return; }
      const g = w.g;
      l.position.copy(g.poz);
      l.width = g.szer; l.height = g.wys;
      l.color.copy(g.kolor);
      l.intensity = g.moc;
      l.lookAt(g.cel); // RectAreaLight emituje w lokalnym kierunku −Z.
    });
  }
  return {pula, gniazda, aktualizuj,
          ustawMoc(f){ for(const g of gniazda) g.moc = g.mocBazowa * f; aktualizuj(camera, true); }};
}

/* Światło wpadające każdym otworem — gniazda, nie światła. */
const gniazdaOkien = otwory.map(o => {
  const [x,z,w,h] = o.rect;
  const pionowe = w < h;
  const szer = pionowe ? h : w, wys = o.head - o.sill;
  const poz = new THREE.Vector3(x+w/2, (o.sill+o.head)/2, z+h/2);
  return {poz, cel: new THREE.Vector3(503, poz.y, 378),
          szer: Math.max(10,szer-6), wys: Math.max(10,wys-6),
          kolor: new THREE.Color(0xffecd1), moc: 1.6, mocBazowa: 1.6};
});
/* Okna zostają WSZYSTKIE. Pooling ich do trzech oszczędzał raptem trzy światła,
   a odbierał połowę światła dziennego: obraz robił się ciemny i zaszumiony, bo
   SSGI musiało wyciągać go z niczego. Oszczędność była tu w złym miejscu —
   prawdziwy koszt siedział w trzydziestu listwach LED, i to je zastąpiły
   emisyjne paski. Pula zostaje jako mechanizm, tylko obejmuje pełen zestaw. */
const pulaOkien = utworzPuleObszarowa({gniazda: gniazdaOkien, ile: gniazdaOkien.length, nazwa: 'Okno'});
const swiatlaOkien = pulaOkien.pula;

/* ---------- LAMPY SUFITOWE ----------
   Port z wersji WebGL: na pokój jedna świecąca kula na wysokości 235 cm.
   Prostokątne źródło daje miękkie wypełnienie w dół. Punktowa łuna jest
   wyłączona; sama kula pozostaje widocznym emiterem.
   Moc prostokąta skaluje się odwrotnie do jego powierzchni, żeby wąskie
   pomieszczenia (WC ma 78 cm) dostały tyle samo światła co pokój wzorcowy. */
const gniazdaLamp = [], gniazdaLun = [], zarowki = [];
const geoZarowki = new THREE.SphereGeometry(6.8, 32, 24);
const materialZarowki = new THREE.MeshPhysicalMaterial({
  color:0xfff4e7, emissive:0xffdfb7, emissiveIntensity:6, roughness:.6, metalness:0});
for(const [nr, pokoj] of APARTMENT.rooms.entries()){
  const srodek = PLAN.roomCenter(pokoj), wielokat = pokoj.polygon;
  const szer = Math.min(180, Math.max(...wielokat.map(v=>v[0])) - Math.min(...wielokat.map(v=>v[0])) - 24);
  const gleb = Math.min(150, Math.max(...wielokat.map(v=>v[1])) - Math.min(...wielokat.map(v=>v[1])) - 24);
  const moc = 1.5 * 180 * 150 / (szer * gleb);
  gniazdaLamp.push({poz: srodek.clone().setY(235), cel: new THREE.Vector3(srodek.x, 0, srodek.z),
                    szer, wys: gleb, kolor: new THREE.Color(0xffdfb7),
                    moc, mocBazowa: moc, nazwa: pokoj.name});

  let odstep = Infinity;
  for(let i=0;i<wielokat.length;i++){
    const a = new THREE.Vector3(wielokat[i][0],0,wielokat[i][1]);
    const b = new THREE.Vector3(wielokat[(i+1)%wielokat.length][0],0,wielokat[(i+1)%wielokat.length][1]);
    const kraw = b.clone().sub(a);
    const t = THREE.MathUtils.clamp(srodek.clone().sub(a).dot(kraw)/kraw.lengthSq(), 0, 1);
    odstep = Math.min(odstep, srodek.distanceTo(a.addScaledVector(kraw, t)));
  }
  gniazdaLun.push({poz: srodek.clone().setY(235), zasieg: Math.min(160, odstep*.95)});

  const kula = new THREE.Mesh(geoZarowki, materialZarowki);
  kula.name = 'Kula światła · ' + pokoj.name;
  kula.position.copy(srodek).setY(235); kula.castShadow = false; kula.receiveShadow = false;
  scene.add(kula); zarowki.push(kula);
}
/* Dwie najbliższe lampy sufitowe z siedmiu — reszta świeci w pokojach, których
   i tak nie widać zza ściany. Kule pozostają w każdym pokoju: to jedna tania
   siatka z materiałem emisyjnym, a to ona jest widoczna. */
const pulaLamp = utworzPuleObszarowa({gniazda: gniazdaLamp, ile: 2, nazwa: 'Lampa sufitowa'});
const lampySufitowe = pulaLamp.pula;

const BAZA_LUNY = 0; // Z3a: wyłączona sztuczna łuna na suficie.
/* P21: łuny mają moc 0, a każde PointLight i tak jest liczone w shaderze każdego
   materiału. Bez nich obraz jest identyczny, a piksel tańszy. ?bez=luny przywraca. */
const luny = Array.from({length: wlaczone('luny') ? 0 : 2}, () => {
  const l = new THREE.PointLight(0xffdfb7, 0, 160, 2);
  l.name = 'Łuna kuli';
  scene.add(l);
  return l;
});
let ostatniaLuna = new THREE.Vector3(NaN, NaN, NaN);
function odswiezLuny(kam, wymus){
  if(!wymus && ostatniaLuna.distanceToSquared(kam.position) < 2500) return;
  ostatniaLuna.copy(kam.position);
  const bliskie = gniazdaLun
    .map(g => ({g, d: g.poz.distanceToSquared(kam.position)}))
    .sort((a,b) => a.d - b.d);
  luny.forEach((l, i) => {
    const w = bliskie[i];
    if(!w){ l.intensity = 0; return; }
    l.position.copy(w.g.poz);
    l.distance = w.g.zasieg;
    l.intensity = BAZA_LUNY * swiatlo.kule;
  });
}
window.__silnik.lampy = {lampySufitowe, zarowki, luny, materialZarowki, pulaLamp};

/* ---------- KRYCIE MIESZKANIA ----------
   Port suwaka „Krycie" z wersji WebGL. Przy widoku z góry ściany przepuszczają
   wzrok do środka — to jest ten domek dla lalek, o który chodziło.
   Materiały przezroczyste nie zapisują się poprawnie do MRT, więc przy pełnym
   kryciu wracamy do trybu nieprzezroczystego i SSGI działa jak wcześniej. */
const materialyMieszkania = [materialSciany, materialSufitu, materialRamy];
let kryciePodstawowe = 1, krycieWidoku = 1;
function zastosujKrycie(){
  const v = Math.min(kryciePodstawowe, krycieWidoku);
  for(const m of materialyMieszkania){
    m.transparent = v < .999;
    m.opacity = v;
    m.depthWrite = v > .35;
    m.needsUpdate = true;
  }
  materialSzyby.opacity = .10 * v;
  grupaOkien.visible = v > .02;
  sciany.visible = v > .02;
  odswiezCien();
}
function ustawKrycieMieszkania(v){ kryciePodstawowe = THREE.MathUtils.clamp(v,0,1); zastosujKrycie(); }
function ustawKrycieWidoku(v){ krycieWidoku = THREE.MathUtils.clamp(v,0,1); zastosujKrycie(); }
window.__silnik.krycie = {ustawKrycieMieszkania, ustawKrycieWidoku};

/* ---------- STEROWANIE ŚWIATŁEM ----------
   Port suwaków z zakładki „Światło" wersji WebGL: pora dnia (SunCalc),
   ciepło, rozproszenie i trzy niezależne wzmocnienia. Wartości bazowe
   trzymamy osobno, żeby wzmocnienia mnożyły się przewidywalnie, a nie
   nakładały jedno na drugie przy każdym ruchu suwaka. */
/* Wartości bazowe przestrojone pod obie referencje: tam nie ma ostrej plamy
   słońca, jest szerokie, miękkie światło dzienne. Główna moc przeszła ze
   słońca do HDRI i okien; słońce zostaje po to, żeby dawać kierunek i cień
   kontaktowy, a nie żeby wypalać wnętrze. */
/* Z3a: poprawnie skierowane okna dają szerokie wypełnienie; słabsze słońce
   zachowuje kierunek światła przy mniejszym kontraście. Ocena wizualna użytkownika. */
const ODN = {wysokosc: Math.sin(THREE.MathUtils.degToRad(27.1)), rozproszenie: .72};
const BAZA = {slonce: 6, okno: 6, hemi: .27};
const ZIMNE = new THREE.Color(0xdbe7ff), CIEPLE = new THREE.Color(0xffd9a6);
const swiatlo = {cieplo: .45, rozproszenie: .90, okna: 1, slonce: 1, kule: .30};

function przeliczSwiatlo(){
  const {cieplo, rozproszenie} = swiatlo;
  const barwa = ZIMNE.clone().lerp(CIEPLE, cieplo);
  /* Nocą słońce gaśnie; miękkość zabiera mu moc i oddaje ją niebu oraz oknom,
     tak jak „Rozproszenie" w wersji WebGL. */
  const nadHoryzontem = Math.max(0, Math.sin(wysokoscSlonca));
  const tlumienie = (1 - .55*rozproszenie) / (1 - .55*ODN.rozproszenie);
  slonce.color.copy(barwa);
  slonce.intensity = BAZA.slonce * swiatlo.slonce * (nadHoryzontem/ODN.wysokosc) * tlumienie;
  /* Przy VSM promień to realne rozmycie mapy, więc suwak rozproszenia
     steruje wielkością półcienia — od ostrego słońca po zachmurzenie. */
  slonce.shadow.radius = 6 + 30*rozproszenie;   // mocne rozmycie: cętki liści mają się zlewać
  niebieskie.intensity = BAZA.hemi * (1 + 3*rozproszenie);
  /* Moc ustawiamy na GNIAZDACH, nie na światłach: pula nadpisuje własne wartości
     przy każdym przestawieniu, więc ustawienie wprost na źródle znikałoby
     przy najbliższym ruchu kamery. */
  for(const g of gniazdaOkien){
    g.kolor.copy(barwa);
    g.moc = BAZA.okno * swiatlo.okna * (1 + .5*rozproszenie);
  }
  pulaOkien.aktualizuj(camera, true);
  /* Świecą dwie lampy z siedmiu — pozostałe są w pokojach zza ściany, ale te
     dwie muszą wziąć na siebie także odbicia, które wcześniej dokładały tamte. */
  for(const g of gniazdaLamp) g.moc = g.mocBazowa * swiatlo.kule * 2.2;
  pulaLamp.aktualizuj(camera, true);
  odswiezLuny(camera, true);
  materialZarowki.emissiveIntensity = 6 * swiatlo.kule;
  odswiezCien();
}

function ustawCzas(data){
  chwila = data;
  kierunekSlonca(chwila);
  slonce.position.copy(cel.position).addScaledVector(DO_SLONCA, 1800);
  slonce.target.updateMatrixWorld();
  przeliczSwiatlo();
  return {wysokosc: wysokoscSlonca, chwila};
}
function ustawSwiatlo(zmiany){ Object.assign(swiatlo, zmiany); przeliczSwiatlo(); }
przeliczSwiatlo();
window.__silnik.swiatlo = {ustawCzas, ustawSwiatlo, stan: swiatlo,
                           ustawOrientacje: st => { ustawOrientacje(st); return ustawCzas(chwila); },
                           get orientacja(){ return orientacjaStopni; },
                           get kierunekSlonca(){ return DO_SLONCA.clone(); },
                           get chwila(){ return chwila; },
                           get wysokoscSlonca(){ return wysokoscSlonca; }};

/* ---------- ŚRODOWISKO ----------
   Jedno prawdziwe HDRI zamiast proceduralnego pudełka. Miękkie światło
   wypełniające z całej półsfery to główna różnica między obiema referencjami
   a dotychczasowym obrazem: tam nie ma jednego ostrego źródła, tylko szeroka,
   równomierna kopuła i delikatny kierunek od okna.
   Proceduralne pudełko zostaje jako zapas, gdyby HDRI nie doszło. */
let srodowisko = null;
const wariantSSR = wybierzSSR();
let odbiciaModern = null;
/* Środowisko HDRI ładuje się PO pokazaniu sceny (patrz koniec pliku).
   Pobranie pliku RGBE i wygenerowanie mapy PMREM to kilka sekund, a bez nich
   scena wygląda tylko płasko — nie ma powodu, żeby trzymać przez ten czas
   pusty ekran. */
async function wczytajSrodowiskoPozniej(){
  try{
    const tloHdri = new URLSearchParams(location.search).get('environment') === 'hdri';
    srodowisko = await wczytajSrodowisko(THREE, renderer, scene,
      {nazwa: 'urban_courtyard_02', jakosc: '1k', moc: .34, tloHdri,
       zachowajHdr: wariantSSR === SSR_MODERN});
    if(odbiciaModern && srodowisko.hdr) odbiciaModern.setEnvMap(srodowisko.hdr);
    TU?.ustawSrodowisko(scene);   // P29: stal odbija HDRI z własnym natężeniem
    if(tloHdri) niebo.visible = false;
  }catch(e){
    usterki.push('HDRI: ' + e.message + ' — zapasowe środowisko proceduralne');
    try{
      const sc = new THREE.Scene();
      const panel = (w,h,col,x,y,z2,rx,ry)=>{
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
        m.material.color.setRGB(col[0],col[1],col[2]); m.position.set(x,y,z2);
        if(rx) m.rotation.x=rx; if(ry) m.rotation.y=ry; sc.add(m); return m;
      };
      const R=260;
      panel(2*R,2*R,[0.76,0.72,0.65],0,R,0,Math.PI/2);
      panel(2*R,2*R,[0.30,0.22,0.15],0,-R,0,-Math.PI/2);
      panel(2*R,2*R,[0.52,0.50,0.46],0,0,-R,0,0);
      panel(2*R,2*R,[0.48,0.46,0.42],0,0,R,0,Math.PI);
      panel(2*R,2*R,[0.46,0.44,0.40],-R,0,0,0,Math.PI/2);
      panel(2*R,2*R,[0.50,0.48,0.44],R,0,0,0,-Math.PI/2);
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(sc, 0.02, 1, 900).texture;
      scene.environmentIntensity = 0.35;
      pmrem.dispose();
    }catch(e2){ usterki.push('PMREM zapasowy: ' + e2.message); }
  }
}


/* ---------- P29 (10a): TEKSTURY UŻYTKOWNIKA ---------- */
let TU = null;
if(wlaczone('tekstury10a')){
  try{
    TU = await wczytajTeksturyUzytkownika(THREE, TEX);
    scene.add(TU.wykonczenia(PLAN));
  }catch(e){ usterki.push('Tekstury użytkownika: ' + e.message); }
}
window.__silnik.teksturyUzytkownika = TU;

/* ---------- MEBEL ---------- */
const materialBazowy = {
  /* Fornir: skan oak_veneer_03 w 2K — ten sam, którego używała wersja WebGL,
     z jej parametrami. Bez skanu wracamy do proceduralnego board(). */
  wood:(w,h,kolor)=>{ const m = MAT.maDrewno ? MAT.drewno(w,h,kolor) : board(0xdddddd,w,h);
    m.userData.kolorDrewna = kolor; return m; },   // P29: kolor regału dla ramy łóżka
  white:(w,h,kolor)=> MAT.lakier(kolor || 0xefe9d8, w, h),
  graphite:(w,h)=>board(0x33363b,w,h,34),
  peg:(w,h)=>pegMaterial(w,h),
  fabric:(w,h,color='#c9c04f',profile)=>{const m=fabricMaterial(color,undefined,{profile});setUV(m,w,h);return m;},
  metal:(w,h,kolor)=> TU ? TU.stalNierdzewna(kolor || '#b9bec2')   // P29: blat, zlew, uchwyty
    : new THREE.MeshPhysicalMaterial({color:0xaeb3ba,metalness:.95,roughness:.25}),
  black:()=>new THREE.MeshPhysicalMaterial({color:0x151719,roughness:.44,metalness:.1})
};
/* Wszystkie meble pochodzą z biblioteki: manifesty, wersje i zatwierdzone
   ustawienia. Silnik nie zna geometrii żadnego mebla. Brakujące pozycje
   zostają brakujące — bez atrap. */
/* ---------- MIKROFAZA KRAWĘDZI ----------
   Na referencjach każdy front ma widoczną, cienką kreskę cienia na styku
   z sąsiadem. U nas formatki stykały się matematycznie ostro, więc cała
   zabudowa czytała się jak jedna płyta. Modele mebli zostają nietknięte —
   minimalny promień narzuca renderer, bo to decyzja o wykończeniu, nie o
   projekcie mebla. 1,5 mm to tyle, ile realnie zostawia frezarka. */
/* 2,2 mm i trzy segmenty. Przy 1,5 mm na dwóch segmentach zaokrąglenie było
   pojedynczą fasetką i krawędź nadal czytała się jak matematycznie ostra —
   potrzebny jest gradient, żeby światło przesuwało się po załamaniu. */
const FAZA_MIN = 0.22;   // cm
function boxGeoZFaza(w, h, d, r, seg){
  return boxGeo(w, h, d, Math.max(r || 0, FAZA_MIN), Math.max(seg || 0, 3));
}
const materialyMebla = {THREE, boxGeo, board, boardMaterial, setUV, pegMaterial,
                        fabricMaterial, baseMaterial: materialBazowy, mattressMat, cushionMat};
function opiszBiblioteke(b){
  const wpisy = [...b.meble.values()];
  const wczytane = wpisy.filter(w => w.korzen);
  const braki = wpisy.filter(w => !w.korzen);
  const pominiete = wpisy.flatMap(w => (w.pominiete || []).map(t => w.nazwa + ': ' + t));
  wpisy.filter(w => w.blad).forEach(w => usterki.push(w.nazwa + ' — ' + w.blad));
  return {
    wczytane: wczytane.map(w => w.nazwa + ' (' + w.wersja + ' · ' + (w.status || 'legacy') + ')'),
    braki: braki.map(w => w.nazwa),
    pominiete
  };
}
let nawigacja = null, sterowanie = null, interakcje = null;

/* Fornir jest jedną, współdzieloną teksturą. Żeby słój miał właściwą gęstość na
   każdej formatce, fizyczny wymiar wchodzi w UV siatki — raz na geometrię. */
let ledyMebli = null;
function odswiezLedy(zrodlo){
  if(!zrodlo?.meble) return;
  ledyMebli = odswiezOswietlenieMebli({THREE, biblioteka: zrodlo, scena: scene,
                                       poprzednie: ledyMebli, ilePuli: 6});
  ledyMebli.aktualizuj(camera);
  window.__silnik.ledy = ledyMebli;
}
function skalujUVMebli(zrodlo){
  /* Bibliotekę dostajemy argumentem, bo przyZmianie potrafi wystrzelić jeszcze
     w trakcie uruchomBiblioteke — wtedy stała `biblioteka` jest w martwej strefie. */
  if(!zrodlo?.meble) return;
  for(const wpis of zrodlo.meble.values()){
    /* Skan jest jedną, współdzieloną teksturą, więc fizyczna gęstość rysunku
       wchodzi w UV siatki — i tam też zamieniamy składowe, żeby na wysokiej
       formatce słój biegł pionowo. */
    /* Formatki lekko poza pionem — tolerancja stolarska, nie błąd. */
    if(wpis.korzen) skrzywFormatki(wpis.korzen, THREE);
    /* P29 (10a): rama łóżka z forniru regału w salonie, tkanina łóżka z tekstury użytkownika. */
    if(wpis.korzen && TU){
      if(wpis.korzen.name === 'biblioteka:lozko'){
        let kolor = '#d8bd99';
        zrodlo.meble.get('regal-salon')?.korzen?.traverse(o => { if(o.material?.userData?.kolorDrewna) kolor = o.material.userData.kolorDrewna; });
        TU.ramaLozka(wpis.korzen, MAT, kolor);
      }
      wpis.korzen.traverse(o => { if(o.isMesh && o.material?.userData?.surface === 'fabric') TU.nalozTkanine(o.material); });
      TU.ustawSrodowisko(scene);   // meble przebudowane po wczytaniu HDRI
    }
    /* P26: materac i poduchy jako miękkie bryły — tylko geometria renderera, model bez zmian. */
    if(wpis.korzen && wlaczone('miekkie')) zmiekczTkaniny(wpis.korzen, THREE);

    /* ---------- SCALANIE MATERIAŁÓW ----------
       siatka() w bibliotece klonuje materiał na KAŻDĄ część, więc regał dawał
       131 osobnych NodeMaterialów, a kuchnia 155. Każdy z nich to własny graf
       węzłów, czyli własna kompilacja WGSL i własny pipeline — i to one, a nie
       sieć, odpowiadały za kilkadziesiąt sekund ładowania (pobieranie zajmuje
       łącznie ok. 1,4 s).

       Części o identycznym wykończeniu dostają teraz JEDEN wspólny materiał.
       Wariacja słoja między formatkami nie ginie, bo siedzi w UV geometrii,
       a nie w materiale.

       Pamięć jest lokalna dla mebla: biblioteka przy podmianie wersji zwalnia
       materiały swojego korzenia, więc współdzielenie między meblami groziłoby
       zwolnieniem materiału nadal używanego przez sąsiada. */
    const wspolne = new Map();
    wpis.korzen?.traverse(o => {
      if(!o.isMesh || !o.material) return;
      const m = o.material;
      const klucz = [m.name || m.type, m.color?.getHexString?.() || '',
                     m.roughness, m.metalness, m.opacity, !!m.transparent].join('|');
      const juz = wspolne.get(klucz);
      if(juz && juz !== m){ o.material = juz; m.dispose(); }
      else if(!juz) wspolne.set(klucz, m);
    });
    wpis.korzen?.traverse(o => {
      if(!o.isMesh) return;
      /* P23: części o promieniu < 5 cm (kołki, uchwyty, siłowniki) nie dają widocznego
         cienia przy tekselu ~0,7 cm i rozmyciu VSM, a dokładają wywołań do każdej aktualizacji mapy. */
      if(wlaczone('cienstatyczny') && o.castShadow){
        if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const sk = o.getWorldScale(new THREE.Vector3());
        if(o.geometry.boundingSphere.radius * Math.max(sk.x, sk.y, sk.z) < 5) o.castShadow = false;
      }
      MAT.skalujUV?.(o, 100);
      /* siatka() w bibliotece nadpisuje roughness wartością z modelu (0,58 dla
         regału), co robiło z matowego forniru politurę. Modele deklarowały to
         pod dawną teksturę proceduralną; wykończenie należy do renderera.
         Uwaga: roughnessNode z warstwy niedoskonałości ma pierwszeństwo przed
         tą liczbą, więc ustawiamy ją jako BAZĘ, na której tamta pracuje. */
      if(o.material?.name === 'Fornir dębowy'){
        o.material.roughness = .88;
        o.material.clearcoat = 0;
        o.material.envMapIntensity = .75;
      }
    });
  }
}
const biblioteka = await uruchomBiblioteke({
  THREE, scena: scene, materialBazowy, boxGeo: boxGeoZFaza, materialyMebla,
  przyZmianie: (b) => {
    odswiezCien();
    skalujUVMebli(b);
    odswiezLedy(b);
    nawigacja?.przeliczMeble();
    sterowanie?.odswiezMeble();
  }
});
const v2Poc=new URLSearchParams(location.search).get('furnitureV2');
if(v2Poc){
  const [assetId,version]=v2Poc.split(':');
  if(assetId && version) await biblioteka.przypnij(assetId,version);
  else usterki.push('furnitureV2 wymaga formatu assetId:version');
}

/* Spacer, orbita i widok z lotu ptaka. Kolizje czyta z planu, pudełka mebli
   przelicza po każdej podmianie modelu z biblioteki. */
/* Zasłony i firanki — muszą powstać przed nawigacją, bo klik w tkaninę ma
   pierwszeństwo przed podejściem. */
const zaslony = utworzZaslony({
  THREE, scena: scene, plan: PLAN,
  przyZmianie: () => { odswiezCien(); }
});
window.__silnik.zaslony = zaslony;

/* Interakcje mebli: klik w ruchomą część otwiera ją, klik w resztę teleportuje. */
interakcje = utworzInterakcje({
  biblioteka, zastosujRuch: biblioteka.zastosujRuch,
  przyZmianie: () => { odswiezCien(); }
});
window.__silnik.interakcje = interakcje;
const hoverOutline = utworzHoverOutline({THREE});
window.__silnik.hoverOutline = hoverOutline;

nawigacja = utworzNawigacje({THREE, camera, controls, renderer, plan: PLAN, biblioteka, scena: scene, sufit,
                             ustawKrycieWidoku: v => window.__silnik.krycie?.ustawKrycieWidoku(v),
                             przySkokuKamery: powod => resetujHistorieTAAU(powod),
                             przyZmianie: st => sterowanie?.odswiezStan(st),
                             /* Kolejność ma znaczenie: tkanina, potem mechanizm mebla,
                                a dopiero gdy nic nie trafiło — podejście. */
                             czyInteraktywne: o => {
                               const ruchy = interakcje.ruchy();
                               for(let p=o; p; p=p.parent){
                                 if(zaslony.zestawy.some(z => z.panele.includes(p))
                                    || ruchy.some(r => r.ruch.id === p.userData?.ruchId)) return p;
                               }
                               return null;
                             },
                             przyNajechaniu: o => hoverOutline.ustaw(o),
                             przyKlikniecie: o => zaslony.kliknij(o) || interakcje.kliknij(o)});
skalujUVMebli(biblioteka);
/* LED-y wykrywane są promieniami po froncie mebla — odkładamy to na po
   pokazaniu sceny, razem ze środowiskiem i potokiem. */
nawigacja.przeliczMeble();
window.__silnik.nawigacja = nawigacja;

const archPhoto = utworzArchPhoto({THREE,camera,nawigacja,
  przyZmianie:powod=>{if(window.__silnik.aa)resetujHistorieTAAU(powod);}});
window.__silnik.archPhoto = archPhoto;

/* Panel sterowania — odbudowa zakładek z wersji WebGL. */
sterowanie = utworzSterowanie({
  THREE, renderer, scene, camera, controls, nawigacja, plan: PLAN, biblioteka, interakcje, zaslony,
  swiatlo: window.__silnik.swiatlo, krycie: window.__silnik.krycie, zielen: stanZieleni, archPhoto
});
window.__silnik.sterowanie = sterowanie;
window.__silnik.biblioteka = biblioteka;
window.__silnik.opisBiblioteki = () => opiszBiblioteke(biblioteka);

/* Speedball instaluje fabrykę węzłów świateł, więc opt-in musi nastąpić przed
   pierwszym renderer.renderAsync(). Wyłączenie dla niższych profili zachowuje
   jednocześnie twardą granicę QUALITY_DESKTOP. */
const worldGI = await utworzWorldGI({
  renderer, scene, camera,
  wariant: wybierzWorldGI(),
  profil: document.getElementById('jakoscPoziom')?.value,
  onError: e => usterki.push('Speedball GI: ' + (e?.message || e))
});
window.__silnik.worldGI = worldGI;
function aktualizujDiagnostykeGI(){
  const el = document.getElementById('worldGIInfo');
  if(!el) return;
  const s = worldGI.odczyt();
  if(s.wariant !== 'speedball') { el.textContent = 'World GI: current SSGI'; return; }
  el.textContent = 'Speedball 0.7.0 · install ' + s.installMs.toFixed(1) + ' ms'
    + (s.firstDataMs === null ? ' · budowa probes…' : ' · pierwsze dane ' + s.firstDataMs.toFixed(1) + ' ms')
    + (s.stats?.probes ? ' · probes ' + s.stats.probes : '')
    + (s.blad ? ' · błąd: ' + s.blad : '');
}
aktualizujDiagnostykeGI();

/* ============================================================
   POTOK RENDEROWANIA — graf węzłów TSL
   ------------------------------------------------------------
   Układ przeniesiony z Lumen Decor Studio: scenePass z MRT, SSGI na
   kanałach koloru/głębi/normalnych, SSR na spakowanym metalness-roughness,
   bloom liczony wyłącznie z bufora emisji, na końcu SMAA.
   Kompozycja GI mnoży odbicie przez BUFOR ALBEDO, nie przez kolor cieniowany —
   to jest ta poprawność, której nie dało się uzyskać w potoku WebGL.
   ============================================================ */
/* Kompilacja WGSL dla wszystkich materiałów sceny — najdłuższy pojedynczy
   etap, którego nie da się podzielić na kroki. Uprzedzamy wprost i oddajemy
   klatkę, żeby ten komunikat zdążył się pojawić przed zamrożeniem wątku. */
postep('Kompilacja shaderów — to najdłuższy etap, chwila cierpliwości…', .94);
await oddajKlatke();
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
/* B2: cykliczne obroty/offsety próbek SSGI powodowały pulsowanie wnęk.
   Stały wzór próbek + istniejący DenoiseNode; zasięg i intensywności bez zmian. */
gi.useTemporalFiltering = false;
gi.sliceCount.value = 2;                 // [WebGI] rayCount 2
gi.stepCount.value = 8;
gi.radius.value = m(2);
gi.thickness.value = cm(60);
/* aoIntensity 1 zwierało kąt za szafą do czerni i kasowało gradację cienia.
   Przy .68 okluzja nadal rysuje styki, ale zostawia rysunek w półcieniu. */
gi.aoIntensity.value = .68;
gi.giIntensity.value = 3;     // skalibrowane na zrzutach: 6 zalewało, 1.6 ledwo widoczne
gi.useLinearThickness.value = false;      // [Lumen]
gi.useScreenSpaceSampling.value = true;   // [Lumen]
/* --- SSGI W NIŻSZEJ ROZDZIELCZOŚCI ---
   SSGINode ma własny cel renderowania i własne setSize, niezależne od przebiegu
   sceny — więc obniżenie go NIE psuje kopiowania bufora głębi, na czym wyłożyło
   się skalowanie PassNode. Światło pośrednie jest z natury niskoczęstotliwościowe,
   a odszumianie i tak pracuje po nim, więc połowa rozdzielczości jest praktycznie
   niewidoczna, a kosztuje cztery razy mniej pikseli. */
let skalaSSGI = 1;
const setSizeSSGI = gi.setSize.bind(gi);
gi.setSize = (w, h) => setSizeSSGI(Math.max(2, Math.round(w*skalaSSGI)),
                                   Math.max(2, Math.round(h*skalaSSGI)));
function ustawSkaleSSGI(f){
  skalaSSGI = f;
  const r = renderer.getSize(new THREE.Vector2());
  if(r.x > 0 && r.y > 0) gi.setSize(r.x, r.y);
}
window.__silnik.ustawSkaleSSGI = ustawSkaleSSGI;

const wezelAO = gi.getAONode();
const wezelGI = gi.getGINode();

/* --- SSR: standardowy r185; długości w jednostkach sceny (cm). --- */
const odbicia = ssr(kKolor, kGlebia, normalnaSceny, {
  stochastic: wariantSSR === SSR_MODERN,
  diffuseNode: kAlbedo,
  metalnessNode: kMetRou.r,
  roughnessNode: kMetRou.g,
  envImportanceSampling: wariantSSR === SSR_MODERN && SSR_MODERN_SETTINGS.envImportanceSampling,
  binaryRefine: wariantSSR === SSR_MODERN && SSR_MODERN_SETTINGS.binaryRefine,
  camera
});
odbicia.quality.value = SSR_MODERN_SETTINGS.quality; // [Lumen] ssr.quality
odbicia.intensity.value = 1.2;            // [Lumen] ssr.intensity
/* Standardowy SSR ogranicza odległość punkt–płaszczyzna, nie stałą długość
   promienia. 1 cm pozostaje bazą do A/B z m(.5), m(1), ewentualnie m(2). */
odbicia.maxDistance.value = cm(1);
odbicia.thickness.value = cm(.1);
odbicia.mirrorBias.value = .5;            // [Lumen] ssr.mirrorBias
odbicia.maxLuminance.value = 35;          // [Lumen] ssr.maxLuminance
odbicia.screenEdgeFade.value = .2;        // [Lumen] ssr.screenEdgeFade
odbicia.environmentIntensity.value = Math.PI;  // [Lumen] ssr.environmentIntensity
odbicia.resolutionScale = SSR_MODERN_SETTINGS.resolutionScale;
odbicia.binaryRefine = wariantSSR === SSR_MODERN && SSR_MODERN_SETTINGS.binaryRefine;

/* Oficjalny łańcuch r185 dla szumnego SSR: reprojekcja, rekurencyjne
   odszumianie i feedback poprzedniej odszumionej klatki. Baseline nie tworzy
   tych buforów ani shaderów. */
const wezlyHistoriiSSR = new Set();
let odbiciaDoKompozycji = odbicia;
if(wariantSSR === SSR_MODERN){
  odbiciaModern = odbicia;
  const reprojekcjaSSR = temporalReproject(odbicia, kGlebia, kNormal, kPredkosc, camera,
    {mode:'specular', accumulate:false});
  const odszumioneSSR = recurrentDenoise(reprojekcjaSSR, camera, {
    depth:kGlebia, normal:kNormal, raw:odbicia, metalRoughness:kMetRou,
    mode:'specular', accumulate:true
  });
  odszumioneSSR.alphaSource = 'raylength';
  odbicia.setHistory(odszumioneSSR, kPredkosc);
  reprojekcjaSSR.setHistoryTexture(odszumioneSSR);
  wezlyHistoriiSSR.add(reprojekcjaSSR); wezlyHistoriiSSR.add(odszumioneSSR);
  odbiciaDoKompozycji = odszumioneSSR;
}
window.__silnik.ssr = {wariant:wariantSSR, modern:odbiciaModern,
  opis:'modern = stochastic SSR + TemporalReproject + RecurrentDenoise + setHistory; tylko profil wysoka'};

/* --- kompozycja: AO na kolorze, GI na albedo, SSR dodatkowo ---
   SSGI i SSR są włączone i potwierdzone wizualnie: przy włączonym SSGI
   narożniki dostają okluzję, pod skrzynią pojawia się cień kontaktowy,
   a obraz zyskuje głębię. Ocena idzie ze zrzutów ekranu — odczyt pikseli
   przez createImageBitmap na canvasie WebGPU zwracał nieaktualny bufor. */
/* Zawór bezpieczeństwa dla słabszej maszyny: ?lekki=1 wyłącza SSGI i SSR,
   czyli dwa najdroższe przebiegi. Zostaje pass + bloom + SMAA, więc obraz
   nadal ma materiały, światło i wygładzanie — tylko bez światła pośredniego.
   Lepiej pokazać scenę bez GI niż zawiesić komputer. */
const LEKKI = new URLSearchParams(location.search).has('lekki');
const UZYJ_SSGI = true;   // graf pełny budujemy zawsze; wybór następuje niżej
/* --- ODSZUMIANIE GI ---
   SSGI przy 2 plastrach to bufor pełen ziarna — to ono dawało „piaskowe”
   wnętrza wnęk. DenoiseNode jest świadomy krawędzi (głębia + normalne),
   więc czyści szum, nie rozmywając styków formatek. */
const giCzyste = UZYJ_SSGI ? denoise(wezelGI, kGlebia, normalnaSceny, camera) : null;
if(giCzyste){
  giCzyste.lumaPhi.value = 12;
  giCzyste.depthPhi.value = 2.5;
  giCzyste.normalPhi.value = 6;
  giCzyste.radius.value = 9;
}

/* --- CIENIE KONTAKTOWE ---
   Mapa cienia słońca ma 2048² na całe mieszkanie, więc gubi styk mebla
   z podłogą i ścianą. SSS dokłada krótkodystansowy cień ze screen space
   dokładnie tam, gdzie mapa nie ma rozdzielczości. Jednostki sceny to
   centymetry, stąd maxDistance i thickness są większe niż domyślne. */
const cienKontaktowy = UZYJ_SSGI ? sss(kGlebia, camera, slonce) : null;
if(cienKontaktowy){
  cienKontaktowy.maxDistance.value = cm(9); // dalej robi się z tego obwódka
  cienKontaktowy.thickness.value = cm(2.5);
  cienKontaktowy.shadowIntensity.value = .22;
  cienKontaktowy.quality.value = .6;
}

/* SSS zwraca maskę cienia w kanale R (g i b są zerowe). Mnożenie przez cały
   wektor zostawiało wyłącznie składową czerwoną i cała scena robiła się
   czerwona — bierzemy sam kanał R. */
const kolorZAO = UZYJ_SSGI
  ? kKolor.rgb.mul(wezelAO.r).mul(cienKontaktowy.r)
  : kKolor.rgb;
const zGI  = UZYJ_SSGI ? vec4(add(kolorZAO, kAlbedo.rgb.mul(giCzyste.rgb)), kKolor.a) : kKolor;
const zSSR = UZYJ_SSGI ? vec4(zGI.rgb.add(odbiciaDoKompozycji.rgb), zGI.a) : zGI;

/* --- bloom tylko z bufora emisji: [WebGI] intensity 0.5, radius 0.6, threshold 2 --- */
const poswiata = bloom(kEmisja, .5, .6, 2.0);

/* --- GRADACJA: kontrast i nasycenie ---
   Kontrast liczymy w przestrzeni liniowej wokół szarości 18 %, czyli PRZED
   tone mappingiem — ACES dostaje rozciągnięty sygnał i sam go domyka, zamiast
   kompresować płaski. */
const KONTRAST = uniform(1.08), PIVOT = uniform(0.18), NASYCENIE = uniform(1.02);
const LUMA = vec3(0.2126, 0.7152, 0.0722);

/* ============================================================
   GRAF WYJŚCIOWY BUDOWANY NA ŻĄDANIE
   ------------------------------------------------------------
   Wcześniej wszystkie trzy warianty (pełny, średni, tani) powstawały przy
   starcie. Ówczesne TRAA alokowało bufory historii w pełnej
   rozdzielczości i kompilowało osobny zestaw shaderów. Ładowanie kompilowało więc
   POTRÓJNY potok, zanim cokolwiek pojawiło się na ekranie — i na słabszej
   maszynie kończyło się to zawieszeniem na pasku postępu.

   Teraz budujemy tylko ten wariant, który jest w danej chwili potrzebny,
   i zapamiętujemy go. Przełączenie jakości dokłada koszt raz, a nie przy
   każdym uruchomieniu.
   ============================================================ */
const zbudowane = new Map();
const wezlyTAAU = new Set();
let trybAA = document.getElementById('antyaliasing')?.value === 'taau' ? 'taau' : 'smaa';

function resetujHistorieTAAU(powod='manual'){
  camera.clearViewOffset();
  velocity.setProjectionMatrix?.(null);
  for(const n of wezlyTAAU) n.setSize(1,1);
  for(const n of wezlyHistoriiSSR) n.setSize(1,1);
  const a=window.__silnik.aa;
  if(a){ a.resets++; a.lastReset=powod; }
}

function gradacja(zrodlo){
  const pod = zrodlo.rgb.sub(PIVOT).mul(KONTRAST).add(PIVOT).max(0);
  const szary = pod.dot(LUMA);
  return vec4(szary.add(pod.sub(szary).mul(NASYCENIE)).max(0), zrodlo.a);
}

function wyjscieDla(poziom){
  const photo=poziom==='photo';
  const temporal=photo || (trybAA==='taau' && poziom==='pelny');
  const klucz=poziom+':'+(photo?'photo-raster':temporal?'taau':'smaa');
  if(zbudowane.has(klucz)) return zbudowane.get(klucz);
  let kompozyt;
  if(poziom === 'pelny' || photo){
    /* Okluzja, światło pośrednie, cień kontaktowy i odbicia ekranowe. */
    kompozyt = vec4(zSSR.rgb.add(poswiata.rgb), zSSR.a);
  }else if(poziom === 'sredni'){
    /* Zostaje to, co najmocniej buduje głębię — okluzja i światło pośrednie.
       Odpadają odbicia ekranowe i krótkodystansowy cień kontaktowy, których
       przy matowych materiałach tego wnętrza widać najmniej. */
    const zGI = vec4(add(kKolor.rgb.mul(wezelAO.r), kAlbedo.rgb.mul(giCzyste.rgb)), kKolor.a);
    kompozyt = vec4(zGI.rgb.add(poswiata.rgb), zGI.a);
  }else{
    /* Sam raster plus bloom: materiały, światło i wygładzanie zostają,
       nie ma światła pośredniego ani odbić. */
    kompozyt = vec4(kKolor.rgb.add(poswiata.rgb), kKolor.a);
  }
  let aa;
  /* P35: TAAU stabilne — próg 0,00045 przy near = 2 cm odrzucał historię już od samego jittera
     (skakanie obrazu); 0,002 i waga 0,04 akumulują stabilnie. ?bez=taaustabilne wraca do P25. */
  const stabilne = wlaczone('taaustabilne');
  /* P36: przy wejściu 100% TAAU niczego nie powiększa, a jego filtr gaussowski 3×3 zmiękcza obraz.
     TRAA bierze bieżący piksel wprost — to samo wygładzanie czasowe, ostre jak SMAA. ?bez=traa wraca do TAAU. */
  const uzyjTRAA = !photo && wlaczone('traa') && wlaczone('taaupelne');
  if(temporal && uzyjTRAA){
    aa=traa(kompozyt,kGlebia,kPredkosc,camera);
    aa.depthThreshold=stabilne ? .002 : .0005;
    aa.edgeDepthDiff=.001;
    aa.maxVelocityLength=96;
    wezlyTAAU.add(aa);
  }else if(temporal){
    aa=taau(kompozyt,kGlebia,kPredkosc,camera);
    aa.currentFrameWeight=photo ? 1/64 : (stabilne ? .04 : .06);
    aa.depthThreshold=stabilne ? .002 : .00045;
    aa.edgeDepthDiff=.001;
    aa.maxVelocityLength=96;
    wezlyTAAU.add(aa);
  }else aa=smaa(kompozyt);
  /* P35: RCAS po TAAU oddaje ostrość zjedzoną przez filtr gaussowski rekonstrukcji.
     sharpness: 0 = najmocniej, 2 = brak; ?ostrosc=<liczba>, ?bez=wyostrz wyłącza.
     P36: jitter TRAA uśrednia słój w obrębie piksela — RCAS 0,4 przywraca jego kontrast (zrzut vs SMAA). */
  /* P37: siła wyostrzania jako wspólny uniform — suwak w panelu zmienia ją bez rekompilacji. */
  wyjscieDla.ostrosc ??= uniform(+(new URLSearchParams(location.search).get('ostrosc') ?? .4));
  const wynik = gradacja(temporal && wlaczone('wyostrz') ? sharpen(aa, wyjscieDla.ostrosc) : aa);
  zbudowane.set(klucz, wynik);
  return wynik;
}

/* Pierwszy graf powstaje przy ustawieniu poziomu jakości niżej. */
window.__silnik.gradacja = {KONTRAST, PIVOT, NASYCENIE};

window.__silnik.potok = potok;
window.__silnik.wezly = {gi, odbicia, poswiata, przebieg, giCzyste, cienKontaktowy};

/* ---------- PROGRESYWNE DOPRACOWANIE PO ZATRZYMANIU ----------
   Brief: „szybki raster podczas ruchu, progresywne dopracowanie po zatrzymaniu”.
   Podczas ruchu SSGI liczy 2 plastry przy stałych 28 krokach.
   Po zatrzymaniu liczba plastrów rośnie do 6. Wzór próbek jest stały,
   a wygładzanie SMAA nie korzysta z historii poprzednich klatek. */
/* ADAPTACYJNA ROZDZIELCZOŚĆ ZOSTAŁA USUNIĘTA.
   `PassNode.setResolutionScale()` zmienia rozmiar bufora przebiegu, ale nie
   rozmiaru tekstury głębi, którą dalsze węzły kopiują w całości. Efekt:
   w KAŻDEJ KLATCE leciał błąd walidacji WebGPU

     Copy size (704×396) does not cover the entire subresource (1280×720)
     of Texture Depth24Plus — the entire subresource must be copied

   i cały potok był odrzucany. To dlatego obraz klatkował, a znacznik miał
   `visible = true`, ale nie było go widać. Dopracowanie po zatrzymaniu zostaje,
   ale wyłącznie przez liczbę próbek SSGI — bez ruszania rozdzielczości. */
/* MRUGANIE PRZY SZAFIE — DIAGNOZA I POPRAWKA.
   Drabinka dopracowania zmieniała naraz trzy rzeczy i dwie z nich zmieniały
   nie jakość, tylko WYGLĄD:

   1. `stepCount`. Przy `useScreenSpaceSampling` (a tak to jest ustawione)
      długość kroku jest STAŁA:
          stepRadius = RADIUS * resolution.x / 32            // SSGINode.js:594
      a promień l-tego kroku rośnie liniowo z indeksem pętli:
          offset ~ stepRadius * (i + szum),  i < STEP_COUNT   // SSGINode.js:489
      Liczba kroków wyznacza więc DYSTANS, jaki przebiega promień, czyli
      rzeczywisty zasięg okluzji — a nie gęstość próbkowania. 6 → 28 kroków to
      promień prawie pięć razy dłuższy: znajduje pięć razy więcej zasłaniaczy
      i wyraźnie przyciemnia wnęki. To jest skok jasności, nie wygładzenie.
      Sprawdzone zrzutami: przy stałej liczbie plastrów 6 vs 28 kroków daje
      widocznie inny obraz, a 2 vs 6 plastrów przy stałych krokach — ten sam.
   2. `DenoiseNode.index`. Steruje OBROTEM jądra rozmycia (`index.mod(4)`,
      DenoiseNode.js:207). Każda zmiana przestawia cały wzór odszumiania —
      widać to jako drgnięcie w miejscach, gdzie GI niesie obraz.
   3. Detektor ruchu był progiem zero-jedynkowym bez histerezy, a drabinka
      spadała od razu na najniższy szczebel. Przy gładziku mikroruchy przekraczają
      próg co kilka klatek, więc obraz cyklicznie leciał w dół i wracał trzema
      skokami — i to jest „szybkie mruganie", najlepiej widoczne na szafie,
      bo jej wnęki są najciemniejszym, najbardziej zależnym od GI miejscem sceny.

   Poprawka: liczba kroków jest STAŁA (nie wolno nią ruszać, bo zmienia obraz),
   drabinka reguluje wyłącznie liczbę plastrów — a te SSGINode normalizuje
   (`ao.divAssign(ROTATION_COUNT)`, SSGINode.js:630), więc więcej plastrów to
   mniej ziarna przy tej samej jasności. Indeks odszumiania zostaje na stałe.
   Dochodzi histereza i zejście po jednym szczeblu.

   Przy stałych 28 krokach: ruch 2 × 28, spoczynek do 6 × 28 próbek. */
const KROKI_SSGI = 28;             // NIGDY nie zmieniać w czasie działania
const PLASTRY_RUCH = 2;
const PLASTRY_STOP = [3, 4, 6];   // sam spadek ziarna, bez zmiany jasności
let stopien = -1, bezRuchu = 0, klatekRuchu = 0;
const ostatniaKam = new THREE.Vector3(NaN, NaN, NaN);
const ostatniObrot = new THREE.Quaternion();
let poprawkaRuchu = true, czasOdDrgniecia = Infinity;
const PROG_OBROTU = Math.cos(THREE.MathUtils.degToRad(.02)/2);
const stanPhotoRaster = createPhotoRasterState();
const photoPath = createPhotoPathIntegration({revision:THREE.REVISION,
  adapter:globalThis.__FURNITURE_WEBGPU_PATH_TRACER__});
window.__silnik.photoPath=photoPath;
const photoPathInfo=$('photoPathInfo');
if(photoPathInfo) photoPathInfo.textContent=photoPath.capability.supported
  ? 'PHOTO_PATH: zgodny adapter eksperymentalny dostępny'
  : `PHOTO_PATH: ${photoPath.capability.reason}; używany jest PHOTO_RASTER fallback`;
const SSR_INTERACTIVE = {quality:SSR_MODERN_SETTINGS.quality, resolutionScale:SSR_MODERN_SETTINGS.resolutionScale};
function ustawCiezkiPhotoRaster(wlaczony){
  odbicia.quality.value = wlaczony ? .7 : SSR_INTERACTIVE.quality;
  odbicia.resolutionScale = wlaczony ? 1 : SSR_INTERACTIVE.resolutionScale;
  for(const n of wezlyHistoriiSSR) n.setSize(1,1);
}
function wykryjRuch(dt){
  const inicjalizacja = !Number.isFinite(ostatniaKam.x);
  const drgniecie = !inicjalizacja && (
    ostatniaKam.distanceToSquared(camera.position) > (poprawkaRuchu ? .0025 : 4)
    || Math.abs(ostatniObrot.dot(camera.quaternion)) < (poprawkaRuchu ? PROG_OBROTU : .9999));
  // Drobne przesunięcia sumują się względem ostatniego wykrytego ruchu.
  if(inicjalizacja || drgniecie || !poprawkaRuchu){
    ostatniaKam.copy(camera.position); ostatniObrot.copy(camera.quaternion);
  }
  czasOdDrgniecia = drgniecie ? 0 : czasOdDrgniecia + dt;
  return poprawkaRuchu ? czasOdDrgniecia < .16 : drgniecie;
}
function ustawJakosc(plastry){
  gi.sliceCount.value = plastry;
  gi.stepCount.value = KROKI_SSGI;
}
function dopracuj(dt){
  if(!dopracowanieWlaczone) return;
  const drgniecie = wykryjRuch(dt);
  /* HISTEREZA: jedna klatka drgnięcia to jeszcze nie ruch. Dopiero trzecia
     z rzędu zbija jakość — inaczej pojedyncze mikroprzesunięcie gładzika
     kasuje dopracowanie i obraz mruga. */
  klatekRuchu = drgniecie ? klatekRuchu + 1 : 0;
  const photoZmiana=updatePhotoRasterState(stanPhotoRaster, {
    active:['photo_raster','photo_path'].includes(poziomJakosci), moving:drgniecie && klatekRuchu>=3
  });
  if(photoZmiana.resetHistory) resetujHistorieTAAU('photo-camera-move');
  if(photoZmiana.heavyChanged) ustawCiezkiPhotoRaster(stanPhotoRaster.heavy);
  if(stanPhotoRaster.active){
    ustawJakosc(photoRasterSlices(stanPhotoRaster.samples));
    if(photoZmiana.samplesChanged && (stanPhotoRaster.samples<2 || stanPhotoRaster.samples%8===0)){
      const n=$('photoRasterInfo');
      if(n) n.textContent=stanPhotoRaster.moving ? 'PHOTO_RASTER: ruch — historia wyzerowana'
        : `PHOTO_RASTER: akumulacja ${stanPhotoRaster.samples}/${stanPhotoRaster.target}`
          + (stanPhotoRaster.heavy ? ' · pełne GI/SSR' : '');
    }
  }
  if(drgniecie){
    /* Pule świateł przestawiamy przy KAŻDYM drgnięciu — mają własny próg
       pół metra, więc to i tak kosztuje tylko porównanie kwadratu odległości. */
    ledyMebli?.aktualizuj(camera);
    pulaOkien.aktualizuj(camera);
    pulaLamp.aktualizuj(camera);
    odswiezLuny(camera);
    if(klatekRuchu >= 3){
      bezRuchu = 0;
      /* Zejście po JEDNYM szczeblu, nie na samo dno. */
      if(stopien >= 0){ stopien -= 1; ustawJakosc(stopien < 0 ? PLASTRY_RUCH : PLASTRY_STOP[stopien]); }
    }
    return;
  }
  if(stanPhotoRaster.active){ bezRuchu += dt; return; }
  bezRuchu += dt;
  /* Kolejny szczebel co ~0,4 s bezruchu — i tylko o jeden w górę naraz. */
  const docelowy = Math.min(PLASTRY_STOP.length - 1, Math.floor(bezRuchu / .4) - 1);
  if(docelowy > stopien){
    stopien += 1;
    ustawJakosc(PLASTRY_STOP[stopien]);
  }
}
window.__silnik.dopracuj = () => ({stopien, bezRuchu: +bezRuchu.toFixed(2), klatekRuchu,
  plastry: gi.sliceCount.value, kroki: gi.stepCount.value,
  photoRaster:{...stanPhotoRaster}});

/* ============================================================
   POZIOMY JAKOŚCI
   ------------------------------------------------------------
   Trzy ustawienia dotykają tego, co naprawdę kosztuje, a nie tego, co ładnie
   brzmi. Największe pozycje w tej scenie to: przebiegi SSGI/SSR, liczba świateł
   OBSZAROWYCH (RectAreaLight liczy się per piksel i jest ich 34), rozdzielczość
   bufora oraz osobny przebieg refrakcji szkła.

   Zmiana outputNode wymusza rekompilację shaderów — kilka sekund przy każdym
   przełączeniu. Dlatego to przełącznik, a nie suwak.
   ============================================================ */
const POZIOMY = {
  minimalna: {
    potok: 'tani', ssgiSkala: .5, szklo: false, pixelRatio: .75, cienMapa: 1024, rozmycieCienia: 8,
    ledPodPolka: false, cienZieleni: false, dopracowanie: false,
    opis: 'sam raster — bez światła pośredniego, odbić i refrakcji'
  },
  srednia: {
    potok: 'sredni', ssgiSkala: .5, szklo: false, pixelRatio: 1, cienMapa: 2048, rozmycieCienia: 16,
    ledPodPolka: true, cienZieleni: true, dopracowanie: true,
    opis: 'światło pośrednie i okluzja, bez odbić i cieni kontaktowych'
  },
  wysoka: {
    potok: 'pelny', ssgiSkala: .5, szklo: true, pixelRatio: 1, cienMapa: 2048, rozmycieCienia: 32,
    ledPodPolka: true, cienZieleni: true, dopracowanie: true,
    opis: 'pełny potok: odbicia, cienie kontaktowe i refrakcja szkła'
  },
  photo_raster: {
    potok: 'photo', ssgiSkala: 1, szklo: true, pixelRatio: 1, cienMapa: 2048, rozmycieCienia: 32,
    ledPodPolka: true, cienZieleni: true, dopracowanie: true,
    opis: 'PHOTO_RASTER: 64-klatkowa akumulacja; pełne GI i odbicia po zatrzymaniu'
  },
  photo_path: {
    potok: 'photo', ssgiSkala: 1, szklo: true, pixelRatio: 1, cienMapa: 2048, rozmycieCienia: 32,
    ledPodPolka: true, cienZieleni: true, dopracowanie: true,
    opis: `PHOTO_PATH niedostępny: ${photoPath.capability.reason}; podgląd PHOTO_RASTER`
  }
};
let poziomJakosci = 'srednia';
let dopracowanieWlaczone = true;

function ustawPoziomJakosci(nazwa){
  const j = POZIOMY[nazwa];
  if(!j) return poziomJakosci;
  poziomJakosci = nazwa;
  worldGI.ustawProfil(nazwa);

  const temporal=trybAA==='taau' && nazwa==='wysoka';
  /* P35: wejście TAAU 100% (było 75% — rozmycie przy skalowaniu w górę); ?bez=taaupelne wraca do 75%. */
  przebieg.setResolutionScale(temporal && !wlaczone('taaupelne') ? .75 : 1);
  resetujHistorieTAAU('profile-switch');
  stanPhotoRaster.active=['photo_raster','photo_path'].includes(nazwa);
  stanPhotoRaster.samples=0; stanPhotoRaster.moving=false; stanPhotoRaster.heavy=false;
  ustawCiezkiPhotoRaster(false);
  const photoInfo=$('photoRasterInfo');
  if(photoInfo) photoInfo.textContent=stanPhotoRaster.active
    ? `PHOTO_RASTER: akumulacja 0/${stanPhotoRaster.target}` : '';

  potok.outputNode = wyjscieDla(j.potok);
  potok.needsUpdate = true;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, j.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);

  slonce.shadow.mapSize.set(j.cienMapa, j.cienMapa);
  slonce.shadow.blurSamples = j.rozmycieCienia;
  /* Mapa cienia jest już zaalokowana, więc trzeba ją zwolnić, żeby powstała
     w nowym rozmiarze. */
  slonce.shadow.map?.dispose?.();
  slonce.shadow.map = null;
  odswiezCien();

  ustawSkaleSSGI(j.ssgiSkala ?? 1);
  ustawSzklo(j.szklo);
  ustawCienZieleni(j.cienZieleni);

  /* Listwy podpółkowe to połowa świateł obszarowych w scenie. */
  /* Emisyjne paski są darmowe, więc zostają zawsze; regulujemy tylko liczbę
     rzeczywistych źródeł w puli. */
  for(const [i, l] of (ledyMebli?.pula || []).entries()) l.visible = j.ledPodPolka || i < 2;

  dopracowanieWlaczone = j.dopracowanie;
  stopien = -1; klatekRuchu = 0; bezRuchu = 0;
  ustawJakosc(PLASTRY_RUCH);
  window.__silnik.suwakiJakosci?.zastosujNadpisania();   // P37: ręczne wartości wygrywają z presetem

  return poziomJakosci;
}
window.__silnik.jakosc = {ustawPoziomJakosci, POZIOMY,
                          get poziom(){ return poziomJakosci; }};
function ustawAA(nazwa){
  if(!['smaa','taau'].includes(nazwa)) return trybAA;
  trybAA=nazwa;
  if(potokGotowy) ustawPoziomJakosci(poziomJakosci);
  return trybAA;
}
window.__silnik.aa={ustaw:ustawAA,get tryb(){return trybAA;},resets:0,lastReset:null,
  opis:'TAAU r185: wysoka używa wejścia 75%; PHOTO_RASTER akumuluje 64 pełne klatki'};
if(new URLSearchParams(location.search).get('navtest')==='1'){
  const wynik=runNavigationRegression({nav:nawigacja,camera,controls,canvas:renderer.domElement,THREE});
  window.__silnik.navigationRegression=wynik;
  const n=$('navigationRegressionInfo');
  if(n) n.textContent='NAV TEST: '+(wynik.pass?'PASS':'FAIL')+' · '+JSON.stringify(wynik);
}
/* Zapisana jakość jest już odtworzona w panelu. Odczytujemy ją na końcu
   rozruchu, aby opóźnione ładowanie HDRI/LED nie nadpisało wyboru użytkownika. */
function wybranaJakoscStartowa(){
  const wybrana = document.getElementById('jakoscPoziom')?.value;
  return Object.hasOwn(POZIOMY, wybrana) ? wybrana : 'minimalna';
}
window.__silnik.renderer = renderer;
window.__silnik.scene = scene;
window.__silnik.camera = camera;
window.__silnik.controls = controls;
window.__silnik.THREE = THREE;

/* Krótki pomiar A/B na żądanie: rzeczywiste odstępy między końcami klatek.
   Nie mierzy czasu GPU. Ukrycie karty, zmiana jakości lub rozmiaru anuluje próbę. */
let pomiarWydajnosci = null;
function wariantPomiaru(poprawiony){
  // Porównujemy skalę całego obrazu; GI, SSR i detektor ruchu pozostają takie same.
  poprawkaRuchu = true; czasOdDrgniecia = Infinity;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,
    poprawiony ? POZIOMY[poziomJakosci].pixelRatio : 1.25));
  renderer.setSize(szerokosc(), wysokosc());
  // Zamierzona zmiana bufora nie jest zmianą okna dokonaną przez użytkownika.
  if(pomiarWydajnosci) pomiarWydajnosci.sygnatura = sygnaturaPomiaru();
  ostatniaKam.copy(camera.position); ostatniObrot.copy(camera.quaternion);
  stopien = PLASTRY_STOP.length - 1; bezRuchu = 1.6; klatekRuchu = 0;
  ustawJakosc(PLASTRY_STOP[stopien]);
}
function sygnaturaPomiaru(){
  return [poziomJakosci, renderer.domElement.width, renderer.domElement.height].join(':');
}
function zakonczPomiar(tekst){
  const p = pomiarWydajnosci;
  pomiarWydajnosci = null;
  if(p){ wariantPomiaru(true); p.pokaz(tekst, false); }
}
function rozpocznijPomiar(pokaz){
  if(pomiarWydajnosci) return;
  if(document.hidden || !potokGotowy || poziomJakosci !== 'wysoka' || LEKKI){
    pokaz('Poczekaj na wczytanie sceny i wybierz wysoką jakość. Okno musi być widoczne.', false);
    return;
  }
  if((window.devicePixelRatio || 1) <= 1){
    pokaz('Na tym ekranie skala była już ograniczona do 1,0 — brak różnicy do porównania.', false); return;
  }
  pomiarWydajnosci = {pokaz, skalaPrzed:Math.min(window.devicePixelRatio, 1.25), sygnatura:sygnaturaPomiaru(), etap:0,
    ostatnia:null, ms:0, klatki:0, dlugie:0, raportMs:0, wyniki:[]};
  wariantPomiaru(false);
  pokaz(`PRZED: skala ${pomiarWydajnosci.skalaPrzed} — 10 s. Rozglądaj się powoli; potem powtórz ten sam ruch.`, true);
}
function zmierzKlatke(teraz){
  const p = pomiarWydajnosci;
  if(!p) return;
  if(document.hidden || p.sygnatura !== sygnaturaPomiaru()){
    zakonczPomiar('Pomiar anulowany: ukryto kartę albo zmieniono jakość lub rozmiar okna.'); return;
  }
  if(p.ostatnia === null){ p.ostatnia = teraz; return; }
  const dt = teraz-p.ostatnia; p.ostatnia = teraz;
  p.ms += dt; p.klatki++; if(dt > 50) p.dlugie++;
  if(p.ms >= 10000){
    p.wyniki.push(`${p.etap ? 'PO' : 'PRZED'}: ${(1000*p.klatki/p.ms).toFixed(1)} FPS; klatki >50 ms: ${p.dlugie}/${p.klatki} (${(100*p.dlugie/p.klatki).toFixed(1)}%)`);
    if(p.etap === 1){ zakonczPomiar(`Porównanie skali obrazu: ${p.skalaPrzed} → 1,0\n`+p.wyniki.join('\n')); return; }
    p.etap = 1; p.ms = 0; p.klatki = 0; p.dlugie = 0; p.raportMs = 0; p.ostatnia = null;
    wariantPomiaru(true);
    p.pokaz('PO: skala 1,0 — 10 s. Powtórz podobne rozglądanie w tym samym miejscu.', true);
  }else if(p.ms-p.raportMs >= 500){
    p.raportMs = p.ms;
    p.pokaz(`${p.etap ? 'PO' : 'PRZED'} — pozostało ${Math.ceil((10000-p.ms)/1000)} s. Rozglądaj się powoli.`, true);
  }
}
addEventListener('visibilitychange', () => {
  if(document.hidden) zakonczPomiar('Pomiar anulowany po ukryciu karty.');
});
window.__silnik.wydajnosc = {rozpocznijPomiar};

/* ---------- pętla ---------- */
let brudne = true, klatki = 0, czasKlatki = performance.now(), potokGotowy = false;
const invalidate = () => { brudne = true; };
controls.addEventListener('change', invalidate);

function dopasujRozmiar(){
  const w = szerokosc(), h = wysokosc();
  const d = renderer.domElement;
  if(d.width === Math.floor(w*renderer.getPixelRatio()) && d.height === Math.floor(h*renderer.getPixelRatio())) return false;
  renderer.setSize(w,h); camera.aspect = w/h; camera.updateProjectionMatrix();
  resetujHistorieTAAU('resize');
  return true;
}
addEventListener('resize', ()=>{ if(dopasujRozmiar()) invalidate(); });

odswiezCien();
const pomiar = utworzPomiar(renderer);   // P19
window.__silnik.perf = pomiar;
/* P22: po RYSUJ_PO_ZMIANIE_MS bez zmian (drabinka SSGI, odszumianie i TAAU zdążą się
   ustalić) przestajemy rysować; raz na sekundę idzie klatka kontrolna. */
const RYSUJ_PO_ZMIANIE_MS = 2500;
let ostatnieRysowanie = 0, podpisKamery = '';
for(const typ of ['pointerdown','pointermove','wheel','keydown','keyup','input','change','click','touchstart','touchmove'])
  addEventListener(typ, e => { if(typ !== 'pointermove' || e.buttons) oznaczZmiane(); }, {capture: true, passive: true});
async function klatka(){
  const startCPU = performance.now();
  if(dopasujRozmiar()){ invalidate(); oznaczZmiane(); }
  const dtKlatki = Math.min(1/15, (performance.now() - czasKlatki)/1000); czasKlatki = performance.now();
  nawigacja.aktualizuj();
  archPhoto.aktualizuj();
  if(interakcje.aktualizuj()) oznaczZmiane();
  if(zaslony.aktualizuj()) odswiezCien();
  dopracuj(dtKlatki);
  worldGI.aktualizuj();
  const pk = camera.position, qk = camera.quaternion, sh = archPhoto.shift;
  const podpis = [pk.x, pk.y, pk.z, qk.x, qk.y, qk.z, qk.w, camera.fov, camera.aspect, camera.zoom, sh.x, sh.y]
    .map(v => v.toFixed(4)).join();
  if(podpis !== podpisKamery){ podpisKamery = podpis; oznaczZmiane(); }
  const teraz = performance.now();
  const aktywny = !wlaczone('bezczynnosc') || !potokGotowy
    || (stanPhotoRaster.active && stanPhotoRaster.samples < stanPhotoRaster.target)
    || teraz - ostatniaZmiana < RYSUJ_PO_ZMIANIE_MS;
  if(!aktywny && teraz - ostatnieRysowanie < 1000){ nawigacja.rysujZnacznik(); return; }
  ostatnieRysowanie = teraz;
  if(stanZieleni.animuj && aktywny){
    /* MIGOTANIE CO ~0,1 s — przyczyna i naprawa.
       Liście poruszały się w KAŻDEJ klatce, a ich cień odświeżał się co ósmą.
       Cień doskakiwał więc o osiem klatek ruchu naraz, kilka razy na sekundę —
       i to było widać jako szybkie, nieregularne miganie całej sceny.

       Teraz poza i cień idą w tym samym rytmie: gdy cień liści jest włączony,
       korony przesuwamy DOKŁADNIE wtedy, gdy odświeżamy mapę cienia, więc jedno
       nigdy nie wyprzedza drugiego. Żeby ten wspólny krok nie był widoczny,
       wiatr jest odpowiednio wolniejszy — przy rozmyciu VSM zmiana między
       kolejnymi pozami jest wtedy poniżej progu dostrzegalności.
       Bez cienia liści nic nie ogranicza płynności i korony chodzą co klatkę. */
    if(!stanZieleni.cien || wlaczone('cienstatyczny')){
      /* P23: cień koron zostaje w ostatniej pozie, więc korony chodzą co klatkę bez
         przerysowania mapy cienia (445 obiektów + rozmycie VSM) co 8 klatek. */
      poruszZielen(performance.now()/1000);
    }else if((klatki & 7) === 0){
      poruszZielen(performance.now()/1000 * WOLNIEJSZY_WIATR);
      slonce.shadow.needsUpdate = true;   // P22: wiatr sam nie podtrzymuje rysowania
    }
  }
  /* Dopóki potok post-processingu nie jest skompilowany, rysujemy scenę wprost.
     To jest tanie i nie wymaga żadnej kompilacji poza materiałami, więc obraz
     pojawia się od razu — zamiast kilkunastu sekund pustego paska postępu. */
  if(potokGotowy){
    if(potok.render) potok.render(); else await potok.renderAsync();
  }else{
    await renderer.renderAsync(scene, camera);
  }
  nawigacja.rysujZnacznik();
  pomiar.poKlatce(performance.now() - startCPU);
  klatki++; window.__silnik.klatki = klatki;
  if((klatki & 31) === 0) aktualizujDiagnostykeGI();
  zmierzKlatke(performance.now());
}
window.__silnik.klatka = klatka;
renderer.setAnimationLoop(klatka);

/* ============================================================
   URUCHOMIENIE DWUETAPOWE
   ------------------------------------------------------------
   Kompilacja shaderów potoku trwała kilkanaście sekund i cały ten czas pasek
   stał na 94 %, a ekran był pusty — użytkownik widział to jako zawieszenie.

   Teraz: najpierw kilka klatek rysowanych WPROST (bez post-processingu), zdjęcie
   zasłony i dopiero potem budowa potoku. Mieszkanie pojawia się od razu, a efekty
   dochodzą chwilę później, z jednorazowym zacięciem zamiast pustego czekania.
   ============================================================ */
postep('Pierwsza klatka…', .97);
await oddajKlatke();
await klatka();
window.__silnik.gotowy = true;
koniecPomiaru();
window.__silnik.czasyEtapow = globalThis.__czasy;
try{ globalThis.__postep?.koniec?.(); }catch(e){}

/* Potok budujemy po oddaniu dwóch klatek, żeby zasłona zdążyła zniknąć
   i użytkownik zobaczył scenę, zanim wątek zablokuje się na kompilacji. */
(async () => {
  await oddajKlatke();
  await oddajKlatke();
  zapisz('Dopracowywanie obrazu — środowisko i efekty…');
  try{ await wczytajSrodowiskoPozniej(); }
  catch(e){ usterki.push('Środowisko: ' + e.message); }
  await oddajKlatke();
  try{ odswiezLedy(biblioteka); }
  catch(e){ usterki.push('Oświetlenie mebli: ' + e.message); }
  await oddajKlatke();
  try{
    ustawPoziomJakosci(wybranaJakoscStartowa());
    potokGotowy = true;
    oznaczZmiane();   // P22: potok gotowy — pełne klatki przez okres ustalania
    /* P37: suwaki parametrów obrazu — tylko to, co działa na żywo (uniformy i właściwości
       czytane w każdej klatce); progi TRAA i liczba kroków SSGI wymagają rekompilacji. */
    const kontenerSuwakow = document.getElementById('suwakiJakosci');
    if(kontenerSuwakow && wlaczone('suwakijakosci')){
      kontenerSuwakow.innerHTML = '';
      const u = n => ({get: () => n?.value, set: v => { n.value = v; }});
      const pole = (id, etykieta, min, max, krok, gs, extra = {}) => ({id, etykieta, min, max, krok, ...gs, ...extra});
      let skalaObrazu = 0, skalaGI = 0, aniso = 16;
      window.__silnik.suwakiJakosci = dodajSuwakiJakosci({kontener: kontenerSuwakow, grupy: [
        {nazwa: 'Obraz', pola: [
          pole('qSkalaObrazu', 'Skala obrazu (auto = wg poziomu)', 0, 2, .05, {get: () => skalaObrazu, set: v => {
            skalaObrazu = v;
            renderer.setPixelRatio(v > 0 ? v : Math.min(window.devicePixelRatio || 1, POZIOMY[poziomJakosci].pixelRatio));
            renderer.setSize(szerokosc(), wysokosc()); resetujHistorieTAAU('skala-obrazu');
          }}, {auto: true, zdarzenie: 'change', poPoziomie: true}),
          pole('qOstrosc', 'Wyostrzanie (0 = najmocniej, 2 = brak)', 0, 2, .05, u(wyjscieDla.ostrosc)),
          pole('qKontrast', 'Kontrast', .8, 1.4, .01, u(KONTRAST)),
          pole('qNasycenie', 'Nasycenie', .5, 1.5, .01, u(NASYCENIE)),
          pole('qPivot', 'Środek kontrastu', .05, .5, .01, u(PIVOT)),
          pole('qAniso', 'Filtrowanie anizotropowe', 1, 16, 1, {get: () => aniso, set: v => {
            aniso = v;
            scene.traverse(o => { if(!o.isMesh) return; for(const mt of [].concat(o.material))
              for(const k of ['map', 'normalMap', 'roughnessMap']){ const t = mt?.[k]; if(t && t.anisotropy !== v){ t.anisotropy = v; t.needsUpdate = true; } } });
          }}, {zdarzenie: 'change'}),
          pole('qSrodowisko', 'Światło otoczenia (HDRI)', 0, 1.5, .01, {get: () => scene.environmentIntensity, set: v => { scene.environmentIntensity = v; }})
        ]},
        {nazwa: 'Światło pośrednie (SSGI)', pola: [
          pole('qGiSila', 'Siła światła pośredniego', 0, 8, .1, u(gi.giIntensity)),
          pole('qAoSila', 'Siła okluzji (AO)', 0, 2, .01, u(gi.aoIntensity)),
          pole('qGiZasieg', 'Zasięg [cm]', 20, 600, 5, u(gi.radius)),
          pole('qGiGrubosc', 'Grubość obiektów [cm]', 1, 200, 1, u(gi.thickness)),
          pole('qGiSkala', 'Rozdzielczość GI (auto = wg poziomu)', 0, 1, .05, {get: () => skalaGI, set: v => {
            skalaGI = v; ustawSkaleSSGI(v > 0 ? v : (POZIOMY[poziomJakosci].ssgiSkala ?? 1));
          }}, {auto: true, zdarzenie: 'change', poPoziomie: true}),
          pole('qOdszJasnosc', 'Odszumianie: jasność', 0, 40, .5, u(giCzyste.lumaPhi)),
          pole('qOdszGlebia', 'Odszumianie: głębia', 0, 10, .1, u(giCzyste.depthPhi)),
          pole('qOdszNormalne', 'Odszumianie: normalne', 0, 20, .1, u(giCzyste.normalPhi)),
          pole('qOdszPromien', 'Odszumianie: promień', 1, 20, 1, u(giCzyste.radius))
        ]},
        {nazwa: 'Odbicia (SSR, poziom wysoki)', pola: [
          pole('qSsrSila', 'Siła odbić', 0, 3, .05, u(odbicia.intensity)),
          pole('qSsrJakosc', 'Jakość śledzenia', 0, 1, .05, u(odbicia.quality)),
          pole('qSsrDystans', 'Maks. odległość [cm]', 0, 50, .5, u(odbicia.maxDistance)),
          pole('qSsrGrubosc', 'Grubość [cm]', 0, 5, .05, u(odbicia.thickness)),
          pole('qSsrLustro', 'Próg lustra', 0, 1, .01, u(odbicia.mirrorBias)),
          pole('qSsrJasnosc', 'Maks. jasność odbicia', 1, 100, 1, u(odbicia.maxLuminance)),
          pole('qSsrKrawedz', 'Zanikanie przy krawędzi ekranu', 0, 1, .01, u(odbicia.screenEdgeFade)),
          pole('qSsrOtoczenie', 'Odbicie otoczenia', 0, 6, .1, u(odbicia.environmentIntensity)),
          pole('qSsrSkala', 'Rozdzielczość odbić', .25, 1, .05, {get: () => odbicia.resolutionScale, set: v => { odbicia.resolutionScale = v; }},
               {zdarzenie: 'change', poPoziomie: true})
        ]},
        {nazwa: 'Cienie', pola: [
          pole('qSssDystans', 'Cień kontaktowy: zasięg [cm]', 0, 30, .5, u(cienKontaktowy?.maxDistance)),
          pole('qSssGrubosc', 'Cień kontaktowy: grubość [cm]', .1, 10, .1, u(cienKontaktowy?.thickness)),
          pole('qSssSila', 'Cień kontaktowy: siła', 0, 1, .01, u(cienKontaktowy?.shadowIntensity)),
          pole('qSssJakosc', 'Cień kontaktowy: jakość', 0, 1, .05, u(cienKontaktowy?.quality)),
          pole('qCienBias', 'Cień słońca: przesunięcie (bias)', -.005, .002, .0001, {get: () => slonce.shadow.bias, set: v => { slonce.shadow.bias = v; odswiezCien(); }}),
          pole('qCienNormal', 'Cień słońca: przesunięcie wzdłuż normalnej', 0, 3, .05, {get: () => slonce.shadow.normalBias, set: v => { slonce.shadow.normalBias = v; odswiezCien(); }})
        ]},
        {nazwa: 'Poświata (bloom)', pola: [
          pole('qBloomSila', 'Siła', 0, 3, .05, u(poswiata.strength)),
          pole('qBloomPromien', 'Promień', 0, 1, .01, u(poswiata.radius)),
          pole('qBloomProg', 'Próg jasności', 0, 6, .05, u(poswiata.threshold))
        ]},
        {nazwa: 'Materiały', pola: [
          {id: 'qPlamy', etykieta: 'Plamy i przebarwienia powierzchni', typ: 'przelacznik', get: () => 1, set: v => ustawWariacjeKoloru(!!v)}
        ]}
      ]});
    }
  }catch(e){
    usterki.push('Potok efektów: ' + e.message);
  }
  opiszStan();
})();
function opiszStan(){
const opis = opiszBiblioteke(biblioteka);
zapisz('WebGPU · ' + (LEKKI ? 'tryb lekki (bez SSGI/SSR)' : 'SSGI + SSR + bloom + SMAA') + '\n'
     + 'Meble: ' + (opis.wczytane.join(', ') || 'brak')
     + (opis.braki.length ? '\nCzeka na model: ' + opis.braki.join(', ') : '')
     + '\nZasłony: ' + zaslony.ile + ' par (' + zaslony.opis.join(', ') + ')'
     + '\nWorld GI: ' + (worldGI.odczyt().wariant === 'speedball'
       ? 'SSGI + Speedball 0.7.0 TEST (' + (worldGI.odczyt().aktywny ? 'aktywne' : 'tylko profil wysoka') + ')'
       : 'current SSGI')
     + '\nSSR: ' + (wariantSSR === SSR_MODERN ? 'stochastic r185 TEST' : 'current')
     + (opis.pominiete.length ? '\nPominięte: ' + opis.pominiete.join(' · ') : '')
     + (usterki.length ? '\nUsterki: ' + usterki.join(' · ') : ''));
}
opiszStan();
