/* ============================================================
   WŁASNE ŚWIATŁA EDYTORA
   ------------------------------------------------------------
   Punktowe i kierunkowe (stożek) światła dodawane przez użytkownika — poza pulami silnika,
   więc nie konkurują z lampami pokoi ani listwami LED.

   Jednostki: scena jest w centymetrach, a three.js liczy oświetlenie fizycznie (natężenie w kandelach,
   spadek 1/d²). Przy metrach 1 lm punktowego światła to 1/(4π) cd; w centymetrach odległość jest 100×
   większa, więc natężenie mnożymy przez 100² = 10⁴. Dla stożka bierzemy kąt bryłowy 2π(1−cos θ).
   ============================================================ */
const CM_NA_METR = 100;
/* Kalibracja. Pomiar 17.09 (salon, średnia luminancja kadru w przestrzeni liniowej): tło bez lamp 0,230;
   lampa sufitowa silnika 0,258 (przyrost 0,028 — pule RectAreaLight mają własną, bardzo oszczędną skalę);
   własne światło 1600 lm bez kalibracji dawało 1,629, czyli przyrost 1,4 — zalewało kadr.
   Wybrana stała daje przyrost ok. 0,225 przy 1600 lm z 2,2 m, czyli mniej więcej podwojenie jasności
   w pobliżu — tak jak zwykła żarówka. To wartość pośrednia: skala silnika jest zbyt słaba, a pełna
   fizyka zbyt mocna dla tej sceny. Powtórzenie pomiaru: wyłącz wszystko, zmierz, włącz lampy, zmierz,
   dodaj własne światło i porównaj przyrosty. */
const KALIBRACJA = 1 / 6.3;
export const kandeleZLumenow = (lumeny, {typ = 'punktowe', kat = Math.PI / 3} = {}) => {
  const steradiany = typ === 'stozek' ? 2 * Math.PI * (1 - Math.cos(kat)) : 4 * Math.PI;
  return (lumeny / Math.max(0.05, steradiany)) * CM_NA_METR * CM_NA_METR * KALIBRACJA;
};

/* Skupienie 0–100% → połowa kąta stożka (szeroko 60° … wąsko 10°). */
export const katStozka = skupienie => ((60 - 50 * Math.min(100, Math.max(0, skupienie)) / 100) * Math.PI) / 180;

export function utworzSwiatlaEdytora({THREE, scena, przyZmianie}){
  const swiatla = new Map();

  function znacznik(kolor){
    const siatka = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12),
      new THREE.MeshStandardMaterial({color: 0x111111, emissive: new THREE.Color(kolor), emissiveIntensity: 3, roughness: 1}));
    siatka.name = 'Znacznik światła';
    siatka.castShadow = siatka.receiveShadow = false;
    return siatka;
  }

  function ustaw(id, opis){
    const {typ = 'punktowe', pozycja = [0, 200, 0], kierunek = [0, -1, 0], lumeny = 800,
           kelwiny = 3000, skupienie = 40, wlaczone = true, zasieg = 900} = opis || {};
    let wpis = swiatla.get(id);
    const kolor = new THREE.Color().setRGB(...barwa(kelwiny));
    if(wpis && wpis.typ !== typ){ usun(id); wpis = undefined; }
    if(!wpis){
      const swiatlo = typ === 'stozek' ? new THREE.SpotLight(kolor, 0, zasieg, katStozka(skupienie), .35, 2)
                                       : new THREE.PointLight(kolor, 0, zasieg, 2);
      swiatlo.name = `Światło edytora · ${id}`;
      const kula = znacznik(kolor);
      scena.add(swiatlo, kula);
      if(swiatlo.isSpotLight){ swiatlo.target = new THREE.Object3D(); scena.add(swiatlo.target); }
      wpis = {typ, swiatlo, kula};
      swiatla.set(id, wpis);
    }
    const {swiatlo, kula} = wpis;
    swiatlo.position.set(pozycja[0] / 10, pozycja[1] / 10, pozycja[2] / 10);
    kula.position.copy(swiatlo.position);
    swiatlo.color.copy(kolor);
    kula.material.emissive.copy(kolor);
    kula.material.emissiveIntensity = wlaczone ? 3 : 0;
    swiatlo.distance = zasieg;
    if(swiatlo.isSpotLight){
      swiatlo.angle = katStozka(skupienie);
      swiatlo.target.position.copy(swiatlo.position).add(new THREE.Vector3(...kierunek).normalize().multiplyScalar(100));
      swiatlo.target.updateMatrixWorld();
    }
    swiatlo.intensity = wlaczone ? kandeleZLumenow(lumeny, {typ: typ === 'stozek' ? 'stozek' : 'punktowe', kat: swiatlo.angle}) : 0;
    przyZmianie?.();
    return id;
  }

  function usun(id){
    const wpis = swiatla.get(id);
    if(!wpis) return false;
    scena.remove(wpis.swiatlo, wpis.kula);
    if(wpis.swiatlo.target) scena.remove(wpis.swiatlo.target);
    wpis.kula.geometry.dispose();
    wpis.kula.material.dispose();
    wpis.swiatlo.dispose?.();
    swiatla.delete(id);
    przyZmianie?.();
    return true;
  }

  return {ustaw, usun, lista: () => [...swiatla.entries()].map(([id, w]) => ({id, typ: w.typ, swiatlo: w.swiatlo, kula: w.kula})),
          get ile(){ return swiatla.size; }};
}

/* Barwa ciała doskonale czarnego (przybliżenie Tannera Hellanda) → RGB 0–1. */
function barwa(k){
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map(v => Math.min(255, Math.max(0, v)) / 255);
}
