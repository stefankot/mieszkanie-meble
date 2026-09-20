/* three.js: scena, światło, bryła mebla, dekoracje, kamera i powrót na oś czołową. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {stan, MM, UDZIAL_SZER, UDZIAL_WYS, BARWY_DEKORU, plotno, zacisk} from './dane.js';

import {odswiezNakladke} from './nakladka.js';
import {sciezkaZawierania} from './moduly.js';
import {stworzTlo} from './tlo.js';
import {egzemplarz} from './modele.js';

/* ---------- scena ---------- */
export let renderer, scena, kamera, sterowanie, mebel, dekor, cien, tlo;
export let swiatloKluczowe, gotowa = false;
let sciezki = null;                                    // sterownik pathtracingu, gdy tryb włączony

export function sciezkiAktywne(){ return !!sciezki; }

/* Moduł pathtracingu wczytuję dopiero tutaj — do pierwszego kliknięcia nic z niego
   nie jest pobierane ani parsowane. */
export async function przelaczSciezki(raport){
  if(sciezki){
    sciezki.zatrzymaj();
    sciezki = null;
    if(tlo) tlo.sylwetka.visible = true;
    dopasujRozmiar();
    return false;
  }
  const modul = await import('./sciezki.js');
  /* Sylwetka to płaski wycinak z maską alfa — ścieżki widzą sam prostokąt, więc na czas
     fotograficznego podglądu znika. Ściany i podłoga zostają: dają światłu co odbijać. */
  if(tlo) tlo.sylwetka.visible = false;
  sciezki = await modul.uruchom(renderer, scena, kamera, sterowanie, raport);
  return true;
}

export function odswiezSciezki(){ sciezki?.przebudowano(); }
let przelot = null;                                    // przelot kamery między meblami                                     // powolny powrót kamery na oś czołową
export const sferyczna = new THREE.Spherical();
import {material, materialCzesci, cienKontaktowy, GEOMETRIA, WALEC, katalogDrewna,
        wczytajKatalogDrewna} from './materialy.js';
import {postawRosline} from './dekor.js';
export {katalogDrewna, wczytajKatalogDrewna} from './materialy.js';
export {zbierzDekor, ustawDekor} from './dekor.js';

/* Metal odbija otoczenie, a nie światła — na samym gradiencie złoto wychodziło czarne.
   Standardowe wnętrze studyjne z three daje mu co odbijać: jasne płaszczyzny i lampy. */
function otoczenie(){
  const pmrem = new THREE.PMREMGenerator(renderer);
  const pokoj = new RoomEnvironment();
  const cel = pmrem.fromScene(pokoj, .04).texture;
  pokoj.dispose?.();
  pmrem.dispose();
  return cel;
}

export function stworzScene(){
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  plotno.appendChild(renderer.domElement);
  scena = new THREE.Scene();
  scena.background = new THREE.Color(0xf4f3f1);
  kamera = new THREE.PerspectiveCamera(30, 1, .05, 80);
  kamera.position.set(0, 1.2, 5);
  sterowanie = new OrbitControls(kamera, renderer.domElement);
  Object.assign(sterowanie, {
    enableDamping: true, dampingFactor: .085, enablePan: false, rotateSpeed: .55,
    minPolarAngle: Math.PI * .30, maxPolarAngle: Math.PI * .60,
    minAzimuthAngle: -Math.PI * .27, maxAzimuthAngle: Math.PI * .27
  });
  sterowanie.addEventListener('change', () => { if(!stan.przeciaganie) odswiezNakladke(); });
  sterowanie.addEventListener('start', koniecPrzelotu);
  /* Kontrast: słabe światło otoczenia + mocny kluczowy z góry-prawej + zimny odbity z lewej.
     Dzięki temu boki, półki i plecy mają wyraźnie inną jasność, a wnętrza komórek się pogłębiają. */
  scena.environment = otoczenie();                     // metal musi mieć co odbijać
  scena.environmentIntensity = .55;
  scena.add(new THREE.HemisphereLight(0xf4f1ec, 0xa8a199, 1.45));
  const kluczowe = new THREE.DirectionalLight(0xfff6ea, 1.75);
  kluczowe.position.set(2.6, 4.2, 3.0);
  kluczowe.castShadow = true;
  kluczowe.shadow.mapSize.set(3072, 3072);
  kluczowe.shadow.bias = -0.0001;
  kluczowe.shadow.normalBias = 0.006;
  kluczowe.shadow.radius = 3.5;
  kluczowe.shadow.blurSamples = 12;
  swiatloKluczowe = kluczowe;
  const odbite = new THREE.DirectionalLight(0xdfe6ef, .75);
  odbite.position.set(-3.4, 1.2, 2.2);
  const przod = new THREE.DirectionalLight(0xffffff, .35);
  przod.position.set(0, .4, 6);
  scena.add(kluczowe, kluczowe.target, odbite, przod);
  mebel = new THREE.Group();
  dekor = new THREE.Group();
  cien = cienKontaktowy();
  tlo = stworzTlo();
  scena.add(mebel, dekor, cien, tlo);
  gotowa = true;
}

/* Buduje wszystkie meble naraz: każdy w osobnej podgrupie przesuniętej po osi X. */
export const grupyMebli = [];

/* Wejście w moduł przygasza resztę do 30 % — jak wejście w grupę w Figmie, gdzie tło traci
   kontrast. Materiały bywają współdzielone, więc nie ruszam oryginału: podmieniam materiał
   siatki na przygaszoną kopię i odkładam pełny w `userData`. */
const przygaszone = new Map();
export function przygasPozostale(){
  /* Grupa sceny reprezentuje cały mebel, więc także przy edycji zagnieżdżonego modułu
     pełny kontrast musi zachować jego pierwszy, nadrzędny element ścieżki — razem z tym,
     co w nim siedzi. Moduł osadzony ma własną grupę, więc bez sprawdzenia zawierania
     gasł właśnie ten, w który przed chwilą weszliśmy. */
  const aktywny = stan.wejscie?.[0] || null;
  for(const grupa of grupyMebli){
    const przygasic = !!aktywny && sciezkaZawierania(grupa.userData.id)[0] !== aktywny;
    grupa.traverse(o => {
      if(!o.isMesh || !o.material) return;
      const pelny = o.userData.materialPelny ?? o.material;
      if(przygasic){
        o.userData.materialPelny = pelny;
        let kopia = przygaszone.get(pelny);
        if(!kopia){
          kopia = pelny.clone();
          kopia.transparent = true;
          kopia.opacity = (pelny.opacity ?? 1) * .3;
          kopia.depthWrite = false;
          przygaszone.set(pelny, kopia);
        }
        o.material = kopia;
      }else if(o.userData.materialPelny){
        o.material = pelny;
        delete o.userData.materialPelny;
      }
    });
  }
}

export function zbudujBryle(grupy){
  mebel.clear();
  grupyMebli.length = 0;
  for(const g of grupy){
    const podgrupa = new THREE.Group();
    podgrupa.position.set(g.x * MM, ((g.y || 0) + (g.nozki || 0)) * MM, g.z * MM);
    podgrupa.rotation.y = THREE.MathUtils.degToRad(g.obrot || 0);
    podgrupa.userData.mebel = g.indeks;
    podgrupa.userData.id = g.id;
    mebel.add(podgrupa);
    grupyMebli.push(podgrupa);
    zbudujJeden(g.czesci, g.definicje, podgrupa, g.wykonczenie, g.drewno);
    for(const p of g.dekor || []){
      if(p.model){
        const obiekt = egzemplarz(p.model, p.skala);
        if(obiekt){
          obiekt.position.set(p.x * MM, p.y * MM, p.z * MM);
          obiekt.rotation.y = p.obrotY || 0;
          podgrupa.add(obiekt);
          continue;
        }
      }
      const mesh = new THREE.Mesh(GEOMETRIA, material('dekor' + p.barwa, {color: BARWY_DEKORU[p.barwa], roughness: .8}));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.scale.set(p.w * MM, Math.max(p.h, 20) * MM, p.d * MM);
      mesh.position.set(p.x * MM, p.y * MM, p.z * MM);
      podgrupa.add(mesh);
    }
  }
  przygasPozostale();
  mebel.position.set(0, 0, 0);
  mebel.updateMatrixWorld(true);
  postawRosline();                                     // dopiero teraz lokalne = światowe
  mebel.updateMatrixWorld(true);
  const pudlo = new THREE.Box3().setFromObject(mebel);
  if(!pudlo.isEmpty()){
    const sr = pudlo.getCenter(new THREE.Vector3());
    mebel.position.set(-sr.x, 0, -sr.z);               // cały zestaw wyśrodkowany na scenie
    mebel.updateMatrixWorld(true);
    /* Narożnik pokoju i sylwetka dosuwają się do nowej bryły — bez tego ściana zostawałaby
       tam, gdzie stał poprzedni mebel. */
    tlo?.ustaw(new THREE.Box3().setFromObject(mebel));
  }
}

/* Duża doniczka stoi na podłodze przy krawędzi zestawu — nie należy do żadnego mebla,
   więc nie da się jej kliknąć jak bryły i nie wchodzi w kadrowanie kamery. */

function zbudujJeden(czesci, definicje, korzen, wykonczenie, drewno){
  const wezly = new Map();
  for(const cz of czesci){
    let obiekt;
    if(cz.type === 'group'){
      obiekt = new THREE.Group();
    }else{
      const walec = cz.type === 'cylinder';
      obiekt = new THREE.Mesh(walec ? WALEC : GEOMETRIA,
        materialCzesci(cz.material, definicje, walec ? null : cz.sizeMm, wykonczenie, drewno));
      obiekt.castShadow = obiekt.receiveShadow = true;
      obiekt.scale.set(...cz.sizeMm.map(v => Math.max(Math.abs(v), .2) * MM));
    }
    obiekt.position.set(...(cz.positionMm || [0, 0, 0]).map(v => v * MM));
    obiekt.rotation.set(...(cz.rotationDeg || [0, 0, 0]).map(THREE.MathUtils.degToRad));
    obiekt.name = cz.id;
    wezly.set(cz.id, obiekt);
    ((cz.parent && wezly.get(cz.parent)) || korzen).add(obiekt);
  }
}

/* Model pasuje na półkę, gdy mieści się w prześwicie i nie zasłania sąsiadów. Skaluję
   go tylko wtedy, gdy jest odrobinę za wysoki — wazon rozciągnięty o połowę wygląda źle. */

export function frontMebla(){                          // normalna frontu aktywnego mebla w świecie
  const k = THREE.MathUtils.degToRad(stan.obrot || 0);
  return new THREE.Vector3(Math.sin(k), 0, Math.cos(k));
}

export function dopasujKamere(kierunek, animuj = false){
  /* Zaznaczenie korzenia listy („Furniture") kadruje całą zabudowę, nie pojedynczy moduł —
     ale bez doniczki stojącej obok, bo przez nią mebel uciekałby w głąb kadru. */
  const pudlo = new THREE.Box3();
  if(stan.kadrCaly) for(const g of grupyMebli) pudlo.expandByObject(g);
  else pudlo.setFromObject(grupyMebli[stan.aktywny] || mebel);
  if(pudlo.isEmpty()) return;
  const rozmiar = pudlo.getSize(new THREE.Vector3()), srodek = pudlo.getCenter(new THREE.Vector3());
  const vfov = THREE.MathUtils.degToRad(kamera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * kamera.aspect);
  const dystans = Math.max(rozmiar.x / (2 * UDZIAL_SZER * Math.tan(hfov / 2)),
                           rozmiar.y / (2 * UDZIAL_WYS * Math.tan(vfov / 2))) + rozmiar.z * .6;
  /* Przy całym zestawie front aktywnego modułu chował moduły obrócone o 90°. Średnia
     normalnych daje naturalny widok narożny i nadal działa dla zabudowy w jednej linii. */
  if(stan.kadrCaly){
    kierunek = stan.meble.reduce((v, m) => {
      const a = THREE.MathUtils.degToRad(m.obrot || 0);
      return v.add(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
    }, new THREE.Vector3());
  }
  const kier = (kierunek || kamera.position.clone().sub(sterowanie.target)).normalize();
  if(!Number.isFinite(kier.x) || kier.lengthSq() < .5) kier.copy(frontMebla());
  const docelowa = srodek.clone().addScaledVector(kier, dystans);

  /* Łuk obrotu i zakres odległości liczę dla AKTYWNEGO mebla — inaczej OrbitControls
     przyciąłby azymut do okolic globalnego +Z i nie dałoby się stanąć przed obróconym. */
  const baza = new THREE.Spherical().setFromVector3(frontMebla()).theta;
  const limity = {minD: dystans * .55, maxD: dystans * 1.7,
                  minP: Math.PI * .30, maxP: Math.PI * .60,
                  minA: baza - Math.PI * .27, maxA: baza + Math.PI * .27};
  kamera.near = dystans / 60;
  kamera.far = dystans * 8;
  kamera.updateProjectionMatrix();

  const droga = kamera.position.distanceTo(docelowa) + sterowanie.target.distanceTo(srodek);
  if(animuj && droga > .08){
    /* Na czas przelotu limity są zawieszone — inaczej kontrolki przycinałyby kamerę
       co klatkę i animacja skakała. Docelowe wracają dopiero po wylądowaniu. */
    przelot = {t0: performance.now(), czas: 800, odP: kamera.position.clone(), doP: docelowa,
               odC: sterowanie.target.clone(), doC: srodek.clone(), limity};
    Object.assign(sterowanie, {minDistance: .01, maxDistance: 500, minPolarAngle: 0,
                               maxPolarAngle: Math.PI, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity});
  }else{
    przelot = null;
    zastosujLimity(limity);
    sterowanie.target.copy(srodek);
    kamera.position.copy(docelowa);
  }
  sterowanie.update();

  cien.scale.set(rozmiar.x * 1.5, rozmiar.z * 3.4, 1);
  cien.position.set(srodek.x, .0015, 0);
  if(swiatloKluczowe){
    const z = Math.max(rozmiar.x, rozmiar.y) * .75 + .4;
    swiatloKluczowe.position.set(srodek.x + z * .6, srodek.y + z * 1.1, z * .9);
    swiatloKluczowe.target.position.copy(srodek);
    swiatloKluczowe.target.updateMatrixWorld();
    Object.assign(swiatloKluczowe.shadow.camera, {left: -z, right: z, top: z, bottom: -z, near: .1, far: z * 6});
    swiatloKluczowe.shadow.camera.updateProjectionMatrix();
  }
}

function zastosujLimity(l){
  Object.assign(sterowanie, {minDistance: l.minD, maxDistance: l.maxD, minPolarAngle: l.minP,
                             maxPolarAngle: l.maxP, minAzimuthAngle: l.minA, maxAzimuthAngle: l.maxA});
}

export const NA_OSI = .08;
export function naOsiCzolowej(){
  if(przelot) return false;
  const kier = kamera.position.clone().sub(sterowanie.target).normalize();
  const front = frontMebla();
  return kier.angleTo(front) < NA_OSI * 1.4 && Math.abs(kier.y) < NA_OSI;
}

export function ustawUjecie(kierunek, animuj = false){
  dopasujKamere(kierunek, animuj);
  odswiezNakladke();
}

export function dopasujRozmiar(){
  const w = plotno.clientWidth, h = plotno.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.updateProjectionMatrix();
  dopasujKamere();
  odswiezNakladke();
}

function koniecPrzelotu(){
  if(!przelot) return;
  zastosujLimity(przelot.limity);
  przelot = null;
}

function aktualizujPrzelot(){
  if(!przelot) return;
  const k = zacisk((performance.now() - przelot.t0) / przelot.czas, 0, 1);
  const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  sterowanie.target.lerpVectors(przelot.odC, przelot.doC, e);
  kamera.position.lerpVectors(przelot.odP, przelot.doP, e);
  if(k >= 1) koniecPrzelotu();
}

export function petla(){
  requestAnimationFrame(petla);
  if(!gotowa) return;
  aktualizujPrzelot();
  sterowanie.update();
  if(sciezki) sciezki.klatka(); else renderer.render(scena, kamera);
}
