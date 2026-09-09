/* ============================================================
   BIBLIOTEKA MEBLI — ładowanie, ustawienie i śledzenie wersji
   ------------------------------------------------------------
   Port synchronizacji z adaptera WebGL (narzedzia/synchronizacja.js) na silnik
   WebGPU. Kontrakt danych bez zmian — FORMAT-MEBLA.md:

   · jednostki biblioteki to MILIMETRY, scena renderera jest w CENTYMETRACH,
     więc wszystko dzielone przez 10,
   · positionMm wskazuje środek obrysu na poziomie podłogi, lokalne +Z to front,
   · rotationDeg to obrót wokół osi Y.

   FORMAT BĘDZIE ROSNĄŁ (światła, bogatsza mechanika), więc rozpoznawanie
   typów siedzi w dwóch rejestrach: TYPY_CZESCI i TYPY_MECHANIZMOW. Dodanie
   nowego typu to jeden wpis, bez ruszania reszty.

   Nieznany typ NIE wywala całego mebla: część jest pomijana, reszta modelu
   renderuje się dalej, a powód trafia do diagnostyki. Dzięki temu nowszy
   model otwarty w starszym silniku pokazuje to, co potrafi pokazać, i mówi
   wprost, czego nie umie — zamiast znikać albo udawać, że wszystko odtworzył.

   Łóżko ma wpis legacy: jego model to zaufany moduł JS wydzielony z renderera,
   sprawdzany sumą SHA-256 przed wykonaniem. Brakujący mebel zostaje brakujący —
   żadnych atrap.
   ============================================================ */

import { pobierz, postep } from './siec.js';

const BAZA = 'https://raw.githubusercontent.com/stefankot/mieszkanie-meble/main/';
const MEBLE = [
  ['lozko', 'Łóżko pod oknem'],
  ['regal-salon', 'Regał w salonie'],
  ['regal-przy-lozku', 'Regał przy łóżku'],
  ['kuchnia', 'Nowa kuchnia'],
  ['regal-kuchnia', 'Regał w kuchni']
];
const SUMA_LOZKA = '95056a0097fc3c7e1203d5408e3bfad82a87e6d22f2d60f92d5bf0519a7cf0de';
const OKRES_MS = 15000;         // ten sam odstęp, co w wersji WebGL
const SCHEMA_ZNANA = 1;

const liczba = (v, min = -30000, max = 30000) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const wektor = (v, n = 3, min = -30000, max = 30000) =>
  Array.isArray(v) && v.length === n && v.every(x => liczba(x, min, max));
const identyfikator = v => typeof v === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(v);
const mm = x => x / 10;         // milimetry biblioteki → centymetry sceny

/* ------------------------------------------------------------
   REJESTR TYPÓW CZĘŚCI
   Każdy wpis dostaje (p, ctx) i zwraca Object3D albo rzuca wyjątek.
   ctx = {THREE, materialBazowy, boxGeo, model}
   ------------------------------------------------------------ */
const TYPY_CZESCI = {
  group: (p, {THREE}) => new THREE.Group(),

  box: (p, ctx) => {
    if(!wektor(p.sizeMm, 3, 0.001, 30000)) throw Error('błędne sizeMm');
    if(Object.hasOwn(p, 'edgeRadiusMm')){
      const r = p.edgeRadiusMm;
      if(!liczba(r, 0, Math.min(...p.sizeMm)/2) || r === Math.min(...p.sizeMm)/2)
        throw Error('edgeRadiusMm musi być nieujemne i mniejsze od połowy grubości');
      const g = r === 0
        ? new ctx.THREE.BoxGeometry(...p.sizeMm.map(mm))
        : new ctx.THREE.RoundedBoxGeometry(...p.sizeMm.map(mm), 3, mm(r));
      return siatka(g, p, ctx);
    }
    return siatka(ctx.boxGeo(...p.sizeMm.map(mm), mm(p.bevelMm || 0)), p, ctx);
  },

  cylinder: (p, ctx) => siatka(new ctx.THREE.CylinderGeometry(
    mm(p.radiusTopMm), mm(p.radiusBottomMm), mm(p.heightMm), p.segments || 24), p, ctx),

  sphere: (p, ctx) => siatka(new ctx.THREE.SphereGeometry(
    mm(p.radiusMm), p.segments || 24, p.rings || 12), p, ctx),

  extrude: (p, ctx) => {
    const ks = new ctx.THREE.Shape();
    p.profileMm.forEach((v, i) => i ? ks.lineTo(mm(v[0]), mm(v[1])) : ks.moveTo(mm(v[0]), mm(v[1])));
    ks.closePath();
    const g = new ctx.THREE.ExtrudeGeometry(ks, {
      depth: mm(p.depthMm), steps: 1, bevelEnabled: !!p.bevelMm,
      bevelThickness: mm(p.bevelMm || 0), bevelSize: mm(p.bevelMm || 0), bevelSegments: 2
    });
    g.translate(0, 0, -mm(p.depthMm) / 2);     // wytłoczenie symetryczne względem Z
    return siatka(g, p, ctx);
  },

  mesh: (p, ctx) => {
    const g = new ctx.THREE.BufferGeometry();
    g.setAttribute('position', new ctx.THREE.Float32BufferAttribute(p.verticesMm.map(mm), 3));
    g.setIndex(p.indices);
    if(p.uv) g.setAttribute('uv', new ctx.THREE.Float32BufferAttribute(p.uv, 2));
    g.computeVertexNormals();
    return siatka(g, p, ctx);
  },

  /* ŚWIATŁA W MEBLU (LED w niszach, oprawy).
     Punkt rozszerzenia z komentarza zamieniony na działającą implementację —
     bez tego nie da się odtworzyć podświetlonych wnęk z referencji.

     Kształt danych trzyma konwencje formatu: milimetry, lokalne osie części,
     +Z jako front. Typ świecenia wybiera `shape`:
       "strip" (domyślnie) → RectAreaLight, czyli listwa LED o wymiarach sizeMm
       "point"             → PointLight o zasięgu distanceMm
       "spot"              → SpotLight o kącie angleDeg

     Nieznany `shape` nie wywala mebla — część zostaje pominięta i wypisana,
     tak samo jak każdy inny nieobsługiwany typ. */
  light: (p, {THREE}) => {
    const kolor = p.color || 0xffd9a6;
    const moc = liczba(p.intensity, 0, 1000) ? p.intensity : 3;
    const ksztalt = p.shape || 'strip';
    if(ksztalt === 'point'){
      const l = new THREE.PointLight(kolor, moc, mm(p.distanceMm || 0), p.decay ?? 2);
      l.castShadow = !!p.castShadow;
      return l;
    }
    if(ksztalt === 'spot'){
      const l = new THREE.SpotLight(kolor, moc, mm(p.distanceMm || 0),
                                    THREE.MathUtils.degToRad(p.angleDeg ?? 40),
                                    p.penumbra ?? .6, p.decay ?? 2);
      l.castShadow = !!p.castShadow;
      return l;
    }
    if(ksztalt !== 'strip') throw Error('nieznany kształt światła "' + ksztalt + '"');
    /* Listwa świeci wzdłuż lokalnego −Z, czyli w głąb wnęki. RectAreaLight nie
       rzuca cieni w Three.js — to jest wypełnienie, nie źródło kierunkowe. */
    const [sx, sy] = (p.sizeMm || [600, 20]).map(mm);
    const l = new THREE.RectAreaLight(kolor, moc, Math.max(1, sx), Math.max(1, sy));
    return l;
  }
};

function siatka(geometria, p, {THREE, materialBazowy, model}){
  const d = model.materials[p.material];
  if(!d) throw Error('brak materiału ' + p.material);
  const rozmiar = p.sizeMm || [500, 500, 500];
  const mat = d.type === 'glass'
    ? new THREE.MeshPhysicalMaterial({color: d.color || '#d9e4df', roughness: .08,
                                      transparent: true, opacity: .32, depthWrite: false})
    : (materialBazowy[d.type]
        ? materialBazowy[d.type](mm(rozmiar[0]), mm(rozmiar[1]), d.color).clone()
        : (() => { throw Error('nieznany typ materiału ' + d.type); })());
  if(d.color) mat.color.set(d.color);
  if(d.roughness !== undefined) mat.roughness = d.roughness;
  if(d.metalness !== undefined) mat.metalness = d.metalness;
  const o = new THREE.Mesh(geometria, mat);
  o.userData.design = Object.fromEntries(
    ['edgeRadiusMm', 'gapMm', 'recessMm', 'panelThicknessMm']
      .filter(k => Object.hasOwn(p, k)).map(k => [k, p[k]]));
  o.castShadow = o.receiveShadow = true;
  return o;
}

/* ------------------------------------------------------------
   REJESTR MECHANIZMÓW
   Każdy wpis dostaje (j, wezel, korzen, THREE) i zwraca opis ruchu.
   ------------------------------------------------------------ */
const TYPY_MECHANIZMOW = {
  hinge: (j, wezel, korzen, THREE) => {
    const os = new THREE.Group();
    os.name = 'os:' + j.part;
    korzen.add(os);
    if(wektor(j.pivotMm)) os.position.fromArray(j.pivotMm.map(mm));
    os.updateWorldMatrix(true, false);
    os.attach(wezel);
    return {typ: 'hinge', os, kierunek: j.axis, zakres: j.angleDeg,
            bazowaOrientacja: os.quaternion.clone(), bazowaPozycja: os.position.clone()};
  },

  slide: (j, wezel, korzen, THREE) => {
    const os = new THREE.Group();
    os.name = 'os:' + j.part;
    korzen.add(os);
    os.updateWorldMatrix(true, false);
    os.attach(wezel);
    return {typ: 'slide', os, kierunek: j.axis, zakres: mm(j.travelMm || 0),
            bazowaOrientacja: os.quaternion.clone(), bazowaPozycja: os.position.clone()};
  }

  /* PUNKT ROZSZERZENIA — bogatsza mechanika (sprzężone siłowniki, ruch po
     ścieżce, ograniczenia kątowe). Dodanie typu to jeden wpis; funkcja
     zastosujRuch() niżej też rozpoznaje typ po nazwie. */
};

/* Ustawienie mechanizmu w zadanym otwarciu 0..1. */
export function zastosujRuch(ruch, t){
  if(!ruch || !ruch.os) return;
  const THREE = ruch.THREE;
  if(ruch.typ === 'hinge'){
    const os = new THREE.Vector3(...ruch.kierunek).normalize();
    const kat = THREE.MathUtils.degToRad(ruch.zakres) * t;
    ruch.os.quaternion.copy(ruch.bazowaOrientacja)
      .multiply(new THREE.Quaternion().setFromAxisAngle(os, kat));
  }else if(ruch.typ === 'slide'){
    const os = new THREE.Vector3(...ruch.kierunek).normalize();
    ruch.os.position.copy(ruch.bazowaPozycja).addScaledVector(os, ruch.zakres * t);
  }
  ruch.wartosc = t;
}

async function pobierzJSON(sciezka){
  const odp = await pobierz(BAZA + sciezka, {cache: 'no-cache'}, {opis: sciezka});
  return odp.json();
}

/* Model deklaratywny → grupa Three.js. Zwraca też listę pominiętych elementów,
   żeby renderer mógł uczciwie powiedzieć, czego nie odtworzył. */
export function zbudujModel(dane, ctx){
  const m = dane.model;
  const pominiete = [];
  if(!m || m.units !== 'mm' || !Array.isArray(m.parts) || !m.parts.length)
    throw Error('Niepoprawny model albo jednostki (wymagane mm).');
  if(!m.materials || typeof m.materials !== 'object')
    throw Error('Brak słownika materiałów.');

  const THREE = ctx.THREE;
  const korzen = new THREE.Group();
  korzen.name = 'biblioteka:' + dane.assetId;
  korzen.userData.lighting = m.lighting; // jawne opisy LED w lokalnych mm, bez tworzenia świateł
  const czesci = new Map();
  const pelnyCtx = {...ctx, model: m};

  for(const p of m.parts){
    if(!identyfikator(p.id)){ pominiete.push('część bez poprawnego id'); continue; }
    const budowniczy = TYPY_CZESCI[p.type];
    if(!budowniczy){ pominiete.push(`część "${p.id}": nieobsługiwany typ "${p.type}"`); continue; }
    let o;
    try{ o = budowniczy(p, pelnyCtx); }
    catch(e){ pominiete.push(`część "${p.id}": ${e.message}`); continue; }
    o.name = dane.assetId + ':' + p.id;
    o.userData.label = p.label || p.id;
    o.position.fromArray((p.positionMm || [0,0,0]).map(mm));
    o.rotation.set(...(p.rotationDeg || [0,0,0]).map(THREE.MathUtils.degToRad));
    czesci.set(p.id, o);
    korzen.add(o);
  }
  if(!czesci.size) throw Error('Żadna część modelu nie dała się zbudować.');

  for(const p of m.parts){
    if(!p.parent) continue;
    const rodzic = czesci.get(p.parent), dziecko = czesci.get(p.id);
    if(rodzic && dziecko) rodzic.add(dziecko);
  }
  korzen.updateMatrixWorld(true);

  const ruchy = [];
  for(const j of m.joints || []){
    const wezel = czesci.get(j.part);
    if(!wezel){ pominiete.push(`mechanizm dla nieznanej części "${j.part}"`); continue; }
    const budowniczy = TYPY_MECHANIZMOW[j.type];
    if(!budowniczy){ pominiete.push(`mechanizm "${j.part}": nieobsługiwany typ "${j.type}"`); continue; }
    if(!wektor(j.axis, 3, -1, 1) || j.axis.reduce((s,x) => s + x*x, 0) < .01){
      pominiete.push(`mechanizm "${j.part}": błędna oś`); continue;
    }
    const r = budowniczy(j, wezel, korzen, THREE);
    r.id = dane.assetId + ':' + j.part;
    r.etykieta = j.label || j.part;
    r.wezel = wezel; r.THREE = THREE; r.wartosc = 0; r.cel = 0;
    wezel.traverse(n => { n.userData.ruchId = r.id; });
    ruchy.push(r);
  }
  return {korzen, ruchy, pominiete};
}

function ustaw(korzen, umiejscowienie, THREE){
  const p = umiejscowienie.positionMm.map(mm);
  korzen.position.set(p[0], p[1], p[2]);
  korzen.rotation.y = THREE.MathUtils.degToRad(umiejscowienie.rotationDeg || 0);
}

function usun(scena, wpis){
  if(!wpis || !wpis.korzen) return;
  scena.remove(wpis.korzen);
  wpis.korzen.traverse(o => {
    if(o.geometry) o.geometry.dispose();
    if(o.material) (Array.isArray(o.material) ? o.material : [o.material])
      .forEach(m => m && m.dispose && m.dispose());
  });
}

export async function uruchomBiblioteke(api){
  const {THREE, scena, materialBazowy, boxGeo, materialyMebla, przyZmianie} = api;
  const stan = new Map();
  const wynik = {meble: stan, ruchy: [], odswiez, stop, zastosujRuch};
  let timer = null;

  /* Łóżko bazowe: zaufany moduł JS wydzielony z renderera, nie JSON.
     Format JSON nie odtwarza jego sprzężonych siłowników, więc dopóki nie
     zostanie opublikowana pełnoprawna wersja deklaratywna, ten moduł zostaje. */
  async function zbudujLegacy(wpisWersji, umiejscowienie){
    const odp = await pobierz(BAZA + wpisWersji.file, {}, {opis: 'moduł łóżka'});
    const bajty = await odp.arrayBuffer();
    const suma = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bajty))]
      .map(x => x.toString(16).padStart(2,'0')).join('');
    if(suma !== SUMA_LOZKA) throw Error('Moduł łóżka nie zgadza się z zatwierdzoną wersją.');
    const url = URL.createObjectURL(new Blob([bajty], {type:'text/javascript'}));
    let F;
    try { F = (await import(url)).default; } finally { URL.revokeObjectURL(url); }

    const korzen = new THREE.Group();
    korzen.name = 'biblioteka:lozko';
    korzen.position.set(F.place[0], 0, F.place[1]);
    korzen.rotation.y = THREE.MathUtils.degToRad(F.place[2] || 0);
    if(umiejscowienie && wektor(umiejscowienie.positionMm)) ustaw(korzen, umiejscowienie, THREE);

    for(const row of F.p || []){
      const [typ, material, x, y, z, a, b, c, faza, id] = row;
      const opis = Array.isArray(material) ? material : [material, a, b];
      const mat = materialBazowy[opis[0]](opis[1] ?? a, opis[2] ?? b, opis[3]);
      const g = typ === 'b' ? boxGeo(a, b, c, faza)
              : typ === 'c' ? new THREE.CylinderGeometry(a, a, b, c || 24) : null;
      if(!g) continue;
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.set(x, y, z);
      mesh.name = (typ === 'b' ? id : faza) || '';
      mesh.castShadow = mesh.receiveShadow = true;
      korzen.add(mesh);
    }
    const postep = {};
    const zaczepy = F.extra?.(korzen, materialyMebla) || {};
    korzen.updateWorldMatrix(true, true);
    zaczepy.afterPose?.(postep);
    const ruchy = (F.i || []).map(m => ({
      id: 'lozko:' + m[1], typ: m[0] === 'h' ? 'hinge' : 'slide', legacy: true,
      etykieta: (F.labels && F.labels[m[1]]) || m[1], wartosc: 0, cel: 0
    }));
    return {korzen, ruchy, postep, zaczepy, pominiete: []};
  }

  async function zaladujMebel(id, nazwa){
    const poprzedni = stan.get(id) || {};
    let manifest;
    try{
      manifest = await pobierzJSON('meble/' + id + '/manifest.json');
    }catch(e){
      // nieudany odczyt nie usuwa poprawnego modelu z widoku
      stan.set(id, {...poprzedni, nazwa, blad: 'Odczyt manifestu: ' + e.message});
      return false;
    }

    const wersje = Array.isArray(manifest.versions) ? manifest.versions : [];
    const wybrana = poprzedni.przypieta
      ? wersje.find(v => v.id === poprzedni.przypieta)
      : wersje.find(v => v.id === manifest.currentVersion);

    if(!wybrana){
      if(poprzedni.korzen) usun(scena, poprzedni);
      stan.set(id, {nazwa, manifest, wersja: null, korzen: null, ruchy: [], pominiete: [],
                    brak: 'Czeka na model i położenie zaakceptowane na SVG.'});
      return !!poprzedni.korzen;
    }
    if(poprzedni.wersja === wybrana.id && poprzedni.korzen) return false;

    const umiejscowienie = wybrana.placement || manifest.placement;
    try{
      let zbudowane;
      if(wybrana.legacy){
        zbudowane = await zbudujLegacy(wybrana, umiejscowienie);
      }else{
        const dane = await pobierzJSON(wybrana.file);
        if(dane.assetId !== id || dane.version !== wybrana.id)
          throw Error('Identyfikator albo wersja modelu nie pasuje do katalogu.');
        const uwagi = [];
        if(dane.schemaVersion !== SCHEMA_ZNANA){
          // nowszy format wczytujemy najlepszym staraniem i mówimy o tym wprost
          uwagi.push(`model deklaruje schemaVersion ${dane.schemaVersion}, ten silnik zna ${SCHEMA_ZNANA}`);
        }
        if(!umiejscowienie || !wektor(umiejscowienie.positionMm) || !liczba(umiejscowienie.rotationDeg, -360, 360))
          throw Error('Brak potwierdzonego ustawienia.');
        zbudowane = zbudujModel(dane, {THREE, materialBazowy, boxGeo});
        zbudowane.pominiete = uwagi.concat(zbudowane.pominiete);
        ustaw(zbudowane.korzen, umiejscowienie, THREE);
      }
      if(poprzedni.korzen) usun(scena, poprzedni);
      scena.add(zbudowane.korzen);
      stan.set(id, {nazwa, manifest, wersja: wybrana.id, opis: wybrana.summary,
                    korzen: zbudowane.korzen, ruchy: zbudowane.ruchy || [],
                    pominiete: zbudowane.pominiete || [],
                    postep: zbudowane.postep, zaczepy: zbudowane.zaczepy,
                    przypieta: poprzedni.przypieta, umiejscowienie});
      return true;
    }catch(e){
      // nieudany model nie usuwa poprzedniego poprawnego
      stan.set(id, {...poprzedni, nazwa, manifest,
                    blad: 'Nie zastosowano zmiany: ' + e.message + ' Poprzedni model pozostaje widoczny.'});
      return false;
    }
  }

  /* Przypięcie konkretnej wersji mebla; null wraca na „najnowszą". */
  async function przypnij(id, wersja){
    const w = stan.get(id) || {};
    stan.set(id, {...w, przypieta: wersja || undefined, wersja: null});
    return zaladujMebel(id, w.nazwa || id);
  }
  wynik.przypnij = przypnij;

  async function odswiez(){
    let gotowych = 0;
    const wyniki = await Promise.all(MEBLE.map(async ([id, nazwa]) => {
      const r = await zaladujMebel(id, nazwa);
      postep(`Meble z biblioteki — ${++gotowych} z ${MEBLE.length}…`, .80 + .13*(gotowych/MEBLE.length));
      return r;
    }));
    wynik.ruchy = [...stan.values()].flatMap(w => w.ruchy || []);
    const zmiana = wyniki.some(Boolean);
    if(zmiana) przyZmianie?.(wynik);
    return zmiana;
  }
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }

  await odswiez();
  timer = setInterval(() => { if(!document.hidden) odswiez(); }, OKRES_MS);
  return wynik;
}
