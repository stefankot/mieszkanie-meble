/* Przedmioty na półkach i roślina obok mebla: modele CC0 z Poly Haven (modele/katalog.json).
   Wszystko doczytuje się w tle po pierwszym renderze — scena ma stać od razu, a nie po
   ośmiu megabajtach. Gdy komplet dojdzie, jedna przebudowa wymienia zastępcze bryłki
   na prawdziwe modele. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const katalogModeli = {modele: [], gotowe: false};
const wczytane = new Map();                            // id → scena glTF (wzorzec do klonowania)

export const modeleRoli = rola => katalogModeli.modele.filter(m => m.rola === rola && wczytane.has(m.id));
export const opisModelu = id => katalogModeli.modele.find(m => m.id === id) || null;

/* Barwa światła z temperatury — 2700 K to ciepła żarówka. Przybliżenie Tannera Hellanda,
   dokładne w zakresie, który nas interesuje (1900–6500 K). */
export function barwaZKelwinow(k){
  const t = k / 100;
  const zacisk = v => Math.min(255, Math.max(0, v)) / 255;
  const r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332;
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * (t - 60) ** -0.0755;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return new THREE.Color(zacisk(r), zacisk(g), zacisk(b));
}
export const modelWczytany = id => wczytane.get(id);

/* Wysokość modelu w mm — Poly Haven podaje wymiary jako [x, y, z] z osią Z do góry,
   a glTF obraca scenę tak, że do góry idzie Y. Liczę z bryły, żeby nie zgadywać. */
export function wymiaryModelu(id){
  const wzorzec = wczytane.get(id);
  if(!wzorzec) return null;
  const p = new THREE.Box3().setFromObject(wzorzec);
  const r = p.getSize(new THREE.Vector3()), s = p.getCenter(new THREE.Vector3());
  return {w: r.x * 1000, h: r.y * 1000, d: r.z * 1000,
          dol: p.min.y * 1000, srodekX: s.x * 1000, srodekZ: s.z * 1000};
}

/* Model dostaje własną grupę: w środku jest wyśrodkowany w poziomie i postawiony na zerze,
   więc grupę wolno obracać i stawiać wprost tam, gdzie leży półka. */
export function egzemplarz(id, skala = 1){
  const wzorzec = wczytane.get(id), r = wymiaryModelu(id);
  if(!wzorzec || !r) return null;
  const kopia = wzorzec.clone(true);
  kopia.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  /* Lampa ma naprawdę świecić: klosz dostaje emisję, a w środku siada punktowe światło.
     Emisja jest tym, co widzi pathtracing; punktowe oświetla scenę w trybie zwykłym. */
  const opis = opisModelu(id);
  if(opis?.rola === 'lampa'){
    const s = opis.swiatlo || {};
    const barwa = barwaZKelwinow(s.kelwiny || 2700);
    kopia.traverse(o => {
      if(!o.isMesh) return;
      o.castShadow = false;                            // klosz nie ma rzucać cienia na samego siebie
      for(const mat of (Array.isArray(o.material) ? o.material : [o.material])){
        if(!mat) continue;
        mat.emissive = barwa.clone();
        mat.emissiveIntensity = .45;                   // klosz ma świecić, nie zasłaniać sceny
      }
    });
    /* Żarówka o zasięgu kilkudziesięciu centymetrów: oświetla wnękę, w której stoi,
       i nie rozjaśnia całego mebla. Lumeny z katalogu przeliczam na jednostki three. */
    const zarowka = new THREE.PointLight(barwa, (s.lumeny || 400) / 150, 2.2, 2);
    zarowka.position.set(0, (s.wysokoscMm || r.h * .6) / 1000, 0);
    zarowka.name = 'zarowka';
    kopia.add(zarowka);
  }
  kopia.scale.multiplyScalar(skala);
  kopia.position.set(-r.srodekX * skala / 1000, -r.dol * skala / 1000, -r.srodekZ * skala / 1000);
  const grupa = new THREE.Group();
  grupa.add(kopia);
  return grupa;
}

export async function wczytajKatalogModeli(poGotowym){
  try{
    const odp = await fetch('modele/katalog.json', {cache: 'no-cache'});
    katalogModeli.modele = (await odp.json()).modele || [];
  }catch(e){ katalogModeli.gotowe = true; return; }
  const loader = new GLTFLoader();
  await Promise.all(katalogModeli.modele.map(m => new Promise(koniec => {
    loader.load(`modele/${m.plik}`, gltf => {
      /* Materiały ze skanów bywają dwustronne i z mapą wysokości — obie rzeczy kosztują,
         a na przedmiocie wielkości wazonu nic nie dają. */
      gltf.scene.traverse(o => {
        if(!o.isMesh) return;
        const mat = Array.isArray(o.material) ? o.material : [o.material];
        for(const m2 of mat){ if(m2){ m2.side = THREE.FrontSide; m2.displacementMap = null; } }
      });
      wczytane.set(m.id, gltf.scene);
      koniec();
    }, undefined, () => koniec());
  })));
  katalogModeli.gotowe = true;
  if(wczytane.size) poGotowym?.();
}
