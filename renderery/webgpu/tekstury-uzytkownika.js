/* P29 (punkt 10a) — tekstury wskazane przez użytkownika.
   · posadzka-piso-teto.jpg  → podłoga kuchni; podłoga i ściany do sufitu w łazience i WC,
   · metal-okap-ramy.jpg     → materiał „metal” (blat KNOXHULT ze stali, zlew, uchwyty, bateria),
   · tkanina-tecido.jpg      → tkanina łóżka (materac, poduchy),
   · rama łóżka              → ten sam fornir co regał w salonie (MAT.drewno z kolorem regału).
   Pliki są kopiami JPEG 1024 px z ~/.gemini/antigravity/scratch/textures_organized (sips, bez zmian treści).
   Wymiar próbki nie jest znany — przyjęte wartości w CM, do korekty jedną liczbą. */
import { texture, vec3, float } from 'three/tsl';

const BAZA = new URL('./tekstury-uzytkownika/', import.meta.url).href;
const CM = {plytki: 80, stal: 60, tkanina: 30};
const RAMA_LOZKA = new Set(['dno', 'front', 'SO', 'prawa_sciana', 'przegroda_sb', 'listwa_lewa', 'listwa_prawa',
                            'skosny_zaglowek', 'platforma_pod_materacem', 'klapa_schowka_bocznego']);

export async function wczytajTeksturyUzytkownika(THREE, TEX){
  const loader = new THREE.TextureLoader();
  const wczytaj = async plik => {
    const t = await loader.loadAsync(BAZA + plik);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const [plytki, stal, tkanina] = await Promise.all(
    ['posadzka-piso-teto.jpg', 'metal-okap-ramy.jpg', 'tkanina-tecido.jpg'].map(wczytaj));
  /* Normalna z jasności obrazu — rzeźba zgodna z rysunkiem tekstury. */
  const normalna = (t, sila) => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    c.getContext('2d').drawImage(t.image, 0, 0, 512, 512);
    const n = TEX.canvasTex(TEX.heightToNormal(c, sila), false, 1, 1);
    n.wrapS = n.wrapT = THREE.RepeatWrapping; n.anisotropy = 16;
    return n;
  };
  const nPlytki = normalna(plytki, .6), nStal = normalna(stal, .8), nTkanina = normalna(tkanina, 1.2);
  // UV miękkich brył: u = cm/200, v = cm/160; UV mebli po skalujUV: 1 = 100 cm.
  for(const t of [tkanina, nTkanina]) t.repeat.set(200/CM.tkanina, 160/CM.tkanina);
  for(const t of [stal, nStal]) t.repeat.set(100/CM.stal, 100/CM.stal);

  const materialPlytek = new THREE.MeshPhysicalNodeMaterial({
    map: plytki, normalMap: nPlytki, normalScale: new THREE.Vector2(.35, .35),
    roughness: .52, metalness: 0, envMapIntensity: .8, specularIntensity: .6
  });
  materialPlytek.name = 'Posadzka i ściany mokre (tekstura użytkownika)';

  /* Stal nierdzewna: metal 1, chropowatość i jasność sterowane rysami tekstury,
     lekka anizotropia wzdłuż blatu i odbicia środowiska — tak wygląda szczotkowana okładzina. */
  function stalNierdzewna(kolor = '#b9bec2'){
    const c = new THREE.Color(kolor);
    const m = new THREE.MeshPhysicalNodeMaterial({
      color: c, metalness: 1, roughness: .28, envMapIntensity: 1.25,
      normalMap: nStal, normalScale: new THREE.Vector2(.12, .12),
      anisotropy: .45, anisotropyRotation: 0, clearcoat: .15, clearcoatRoughness: .2
    });
    const rys = texture(stal).r;
    m.roughnessNode = float(.3).add(rys.sub(.8).mul(1.8)).clamp(.14, .6);
    /* Wspólne środowisko sceny ma natężenie 0,34, więc metal odbijał prawie czerń.
       Własna mapa środowiska z natężeniem 2,5 daje jasną, odbijającą stal (sprawdzone zrzutem). */
    m.userData.stal = true;
    if(srodowisko){ m.envMap = srodowisko; m.envMapIntensity = 2.5; }
    m.colorNode = vec3(c.r, c.g, c.b).mul(float(.94).add(rys.sub(.8).mul(.4)));
    m.name = 'Stal nierdzewna (tekstura użytkownika)';
    return m;
  }

  function nalozTkanine(m){
    if(m.userData.tkaninaUzytkownika) return;
    Object.assign(m, {map: tkanina, normalMap: nTkanina, roughnessMap: null, sheenColorMap: null,
                      sheenRoughnessMap: null, roughness: .95});
    m.normalScale.set(.4, .4);
    m.userData.tkaninaUzytkownika = true;
    m.needsUpdate = true;
  }

  /* Rama łóżka z forniru regału. Klin zagłówka nie ma UV — dostaje rzut płaski wg normalnej. */
  function ramaLozka(korzen, MAT, kolor){
    if(!MAT.maDrewno || korzen.userData.ramaZDrewna) return 0;
    const drewno = MAT.drewno(227, 130, kolor);
    let ile = 0;
    korzen.traverse(o => {
      if(!o.isMesh || !RAMA_LOZKA.has(o.name)) return;
      const g = o.geometry;
      if(!g.attributes.uv){
        g.computeBoundingBox();
        const p = g.attributes.position, n = g.attributes.normal, b = g.boundingBox, r = b.getSize(new THREE.Vector3());
        const uv = new Float32Array(p.count * 2);
        for(let k = 0; k < p.count; k++){
          const ax = Math.abs(n.getX(k)), ay = Math.abs(n.getY(k)), az = Math.abs(n.getZ(k));
          const [a, c] = ax >= ay && ax >= az ? ['z', 'y'] : ay >= az ? ['x', 'z'] : ['x', 'y'];
          const get = (os, i) => os === 'x' ? p.getX(i) : os === 'y' ? p.getY(i) : p.getZ(i);
          uv[k*2] = (get(a, k) - b.min[a]) / (r[a] || 1); uv[k*2+1] = (get(c, k) - b.min[c]) / (r[c] || 1);
        }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      o.material = drewno; ile++;
    });
    korzen.userData.ramaZDrewna = true;
    return ile;
  }

  /* Podłoga kuchni, łazienki i WC oraz ściany łazienki i WC do sufitu — nakładki 0,06–0,15 cm
     od powierzchni, z wyciętymi otworami drzwi (nadproże 205 cm jak w plan.js). */
  function wykonczenia(PLAN){
    const {APARTMENT} = PLAN, H = APARTMENT.height, S = CM.plytki, WYS_DRZWI = 205;
    const grupa = new THREE.Group(); grupa.name = 'Wykończenia pomieszczeń (P29)';
    const pokoj = nazwa => APARTMENT.rooms.find(r => r.name === nazwa);
    for(const nazwa of ['Kuchnia', 'Łazienka', 'WC']){
      const r = pokoj(nazwa); if(!r) continue;
      const g = new THREE.ShapeGeometry(new THREE.Shape(r.polygon.map(p => new THREE.Vector2(p[0], -p[1]))));
      const uv = g.attributes.uv; for(let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k)/S, uv.getY(k)/S);
      const m = new THREE.Mesh(g, materialPlytek);
      m.rotation.x = -Math.PI/2; m.position.y = .06; m.receiveShadow = true; m.name = 'Posadzka · ' + nazwa;
      grupa.add(m);
    }
    const poz = [], nor = [], uvs = [];
    for(const nazwa of ['Łazienka', 'WC']){
      const r = pokoj(nazwa); if(!r) continue;
      const P = r.polygon, cx = P.reduce((s, p) => s + p[0], 0)/P.length, cz = P.reduce((s, p) => s + p[1], 0)/P.length;
      for(let k = 0; k < P.length; k++){
        const a = P[k], b = P[(k+1)%P.length], L = Math.hypot(b[0]-a[0], b[1]-a[1]);
        const dx = (b[0]-a[0])/L, dz = (b[1]-a[1])/L;
        let nx = -dz, nz = dx;
        if((cx - a[0])*nx + (cz - a[1])*nz < 0){ nx = -nx; nz = -nz; }
        const wzdluzX = Math.abs(dz) < 1e-6;
        const otwory = APARTMENT.doors.map(d => {
          const [x, z, w, h] = d.rect;
          if(wzdluzX ? !(z - .5 <= a[1] && a[1] <= z + h + .5) : !(x - .5 <= a[0] && a[0] <= x + w + .5)) return null;
          const s0 = wzdluzX ? (x - a[0])*Math.sign(dx) : (z - a[1])*Math.sign(dz);
          const s1 = wzdluzX ? (x + w - a[0])*Math.sign(dx) : (z + h - a[1])*Math.sign(dz);
          const lo = Math.max(0, Math.min(s0, s1)), hi = Math.min(L, Math.max(s0, s1));
          return hi - lo > 1 ? [lo, hi] : null;
        }).filter(Boolean).sort((p, q) => p[0] - q[0]);
        const quad = (s0, s1, y0, y1) => {
          const pt = (s, y) => [a[0] + dx*s + nx*.15, y, a[1] + dz*s + nz*.15];
          const A = pt(s0, y0), B = pt(s1, y0), C = pt(s1, y1), D = pt(s0, y1);
          const lic = [A, B, C, A, C, D];
          // ściana ma być widoczna od strony pokoju: zamiana kolejności, gdy normalna trójkąta patrzy w ścianę
          const ux = B[0]-A[0], uz = B[2]-A[2], cross = [0*0 - uz*(y1-y0), uz*0 - ux*0, ux*(y1-y0) - 0];
          const zly = cross[0]*nx + cross[2]*nz < 0;
          for(const p of zly ? [A, C, B, A, D, C] : lic){ poz.push(...p); nor.push(nx, 0, nz); }
          for(const [s, y] of zly ? [[s0,y0],[s1,y1],[s1,y0],[s0,y0],[s0,y1],[s1,y1]] : [[s0,y0],[s1,y0],[s1,y1],[s0,y0],[s1,y1],[s0,y1]])
            uvs.push(s/S, y/S);
        };
        let s = 0;
        for(const [lo, hi] of otwory){
          if(lo > s) quad(s, lo, 0, H);
          quad(lo, hi, WYS_DRZWI, H);
          s = Math.max(s, hi);
        }
        if(s < L) quad(s, L, 0, H);
      }
    }
    const gs = new THREE.BufferGeometry();
    gs.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    gs.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    gs.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    const sciany = new THREE.Mesh(gs, materialPlytek);
    sciany.receiveShadow = true; sciany.name = 'Ściany mokre · Łazienka, WC';
    grupa.add(sciany);
    return grupa;
  }

  let srodowisko = null;
  function ustawSrodowisko(scene){
    if(!scene.environment) return;
    srodowisko = scene.environment;
    scene.traverse(o => {
      const m = o.isMesh && o.material;
      if(m?.userData?.stal && m.envMap !== srodowisko){ m.envMap = srodowisko; m.envMapIntensity = 2.5; m.needsUpdate = true; }
    });
  }

  return {stalNierdzewna, nalozTkanine, ramaLozka, wykonczenia, ustawSrodowisko, materialPlytek, CM};
}
