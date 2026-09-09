/* ============================================================
   ZASŁONY I FIRANKI — geometria generatywna, otwierane kliknięciem
   ------------------------------------------------------------
   Modele odpowiadają konkretnym produktom wskazanym przez użytkownika:

   · SALON — 3 pary IKEA MAJGUL: zasłony zaciemniające, nieprzezroczyste,
     w przygaszonym różu ceglanym. Blokują światło, więc mają materiał
     nieprzezroczysty i rzucają cień.
   · POKÓJ Z ŁÓŻKIEM — 1 para IKEA GLASÖRT: firanka, przezroczysta, z pionowym
     przejściem barwnym (biel → żółć → szałwia). Rozprasza światło i nie
     rzuca pełnego cienia.

   Fałdy nie są modelowane wierzchołek po wierzchołku przy każdej zmianie:
   panel powstaje raz, z sinusoidalnym wygięciem w poprzek, a otwieranie to
   ZMIANA SKALI — węższy panel to gęstsze i głębsze fałdy, dokładnie jak przy
   ściąganiu tkaniny na bok. Dzięki temu animacja nie przelicza geometrii.
   ============================================================ */

import { positionLocal, uv, vec3, vec4, float, mix, smoothstep,
         mx_fractal_noise_float, texture } from 'three/tsl';

const NAD_OTWOREM = 14;      // ile cm nad nadprożem wisi karnisz
const POSZERZENIE = 22;      // ile cm poza otwór z każdej strony
const DO_PODLOGI = 6;        // ile cm nad podłogą kończy się tkanina
const FALDY = 9;             // liczba fałd na panel przy pełnym rozsunięciu
const GLEBOKOSC_FALDY = 4.5; // cm
const OTWARCIE_SZER = .17;   // do ilu skurczy się panel po odsunięciu
const CZAS_MS = 900;

const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;

/* Panel: płaszczyzna wygięta w pionowe fałdy. Fałdy zanikają przy karniszu,
   bo tam tkanina jest zebrana w taśmie marszczącej. */
function geometriaPanelu(THREE, szer, wys, faldy){
  const g = new THREE.PlaneGeometry(szer, wys, Math.max(24, faldy*6), 10);
  const poz = g.attributes.position;
  for(let i = 0; i < poz.count; i++){
    const x = poz.getX(i), y = poz.getY(i);
    const u = (x + szer/2) / szer;
    const odGory = (wys/2 - y) / wys;                 // 0 przy karniszu, 1 u dołu
    const zanik = smoothKrok(odGory, 0, .12);          // taśma marszcząca u góry
    poz.setZ(i, Math.sin(u * Math.PI * 2 * faldy) * GLEBOKOSC_FALDY * zanik);
  }
  g.computeVertexNormals();
  return g;
}
const smoothKrok = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* --- MATERIAŁY --- */
function materialMajgul(THREE){
  /* Zaciemniająca tkanina: gęsty splot, wysoka chropowatość, delikatny połysk
     nitki (sheen). Kolor zdjęty z fotografii produktu — przygaszony ceglany róż. */
  const m = new THREE.MeshPhysicalNodeMaterial({
    color: 0xc4746a, roughness: .95, metalness: 0,
    sheen: .55, sheenRoughness: .8, sheenColor: new THREE.Color(0xffd9cf),
    side: THREE.DoubleSide
  });
  /* Splot i nierówność barwienia — w przestrzeni lokalnej panelu, więc nie
     zmienia się przy przesuwaniu zasłony. */
  const splot = mx_fractal_noise_float(positionLocal.mul(vec3(2.2, 2.2, 2.2)), 3, 2, .5);
  const smugi = mx_fractal_noise_float(positionLocal.mul(vec3(.04, .012, .04)), 2, 2, .5);
  m.colorNode = vec3(0.77, 0.455, 0.415)
                  .mul(float(1).add(splot.mul(.06)).add(smugi.mul(.10)));
  m.roughnessNode = float(.95).add(splot.mul(.05)).clamp(.6, 1);
  m.name = 'MAJGUL — zasłona zaciemniająca';
  return m;
}

function materialGlasort(THREE){
  /* Firanka: przezroczysta, z pionowym przejściem barwnym. Nie używamy
     transmission — dla tkaniny wystarczy przezroczystość z rozpraszaniem,
     a transmission kosztowałoby osobny przebieg renderowania. */
  const m = new THREE.MeshPhysicalNodeMaterial({
    color: 0xffffff, roughness: 1, metalness: 0,
    transparent: true, opacity: .42, depthWrite: false,
    sheen: .8, sheenRoughness: .95, sheenColor: new THREE.Color(0xffffff),
    side: THREE.DoubleSide
  });
  /* Gradient wzdłuż wysokości panelu: u góry biel, w środku żółć, u dołu
     szałwia — jak na zdjęciu produktu. */
  const v = uv().y;
  const gora = vec3(0.96, 0.96, 0.94);
  const srodek = vec3(0.93, 0.87, 0.55);
  const dol = vec3(0.79, 0.86, 0.80);
  const splot = mx_fractal_noise_float(positionLocal.mul(vec3(3.2, 3.2, 3.2)), 2, 2, .5);
  m.colorNode = mix(mix(dol, srodek, smoothstep(float(0), float(.55), v)),
                    gora, smoothstep(float(.55), float(1), v))
                  .mul(float(1).add(splot.mul(.05)));
  /* Splot przepuszcza światło nierówno — stąd delikatna zmienność krycia. */
  m.opacityNode = float(.42).add(splot.mul(.10)).clamp(.24, .62);
  m.name = 'GLASÖRT — firanka';
  return m;
}

/* --- KARNISZ --- */
function karnisz(THREE, dlugosc){
  const g = new THREE.CylinderGeometry(1.1, 1.1, dlugosc, 12);
  g.rotateZ(Math.PI/2);
  const m = new THREE.MeshPhysicalMaterial({color: 0xb9b7b0, roughness: .38, metalness: .85});
  m.name = 'Karnisz';
  return new THREE.Mesh(g, m);
}

export function utworzZaslony({THREE, scena, plan, przyZmianie}){
  const {APARTMENT} = plan;
  const majgul = materialMajgul(THREE);
  const glasort = materialGlasort(THREE);
  const zestawy = [];

  /* Które otwory dostają jaką tkaninę. Salon: dwa okna plus drzwi balkonowe —
     razem trzy pary MAJGUL. Pokój 10,56 m²: jedna para GLASÖRT. */
  const doZaslony = [
    ...APARTMENT.windows.map(o => ({...o, sill: 120, head: 240})),
    ...APARTMENT.doors.filter(o => o.name === 'Drzwi balkonowe').map(o => ({...o, sill: 0, head: 220}))
  ];

  for(const o of doZaslony){
    const [x, z, w, h] = o.rect;
    const pionowe = w < h;                       // otwór w ścianie wschód–zachód
    const szerOtworu = pionowe ? h : w;
    const cx = x + w/2, cz = z + h/2;
    const pokoj = plan.roomAt(pionowe ? (x < 500 ? x + w + 30 : x - 30) : cx,
                              pionowe ? cz : (z < 400 ? z + h + 30 : z - 30));
    const wSalonie = pokoj?.name === 'Salon';
    const wSypialni = pokoj && pokoj.name === 'Pokój' && cz > 500;
    if(!wSalonie && !wSypialni) continue;         // pozostałe okna bez zasłon

    const material = wSalonie ? majgul : glasort;
    const gora = o.head + NAD_OTWOREM;
    const wysTkaniny = gora - DO_PODLOGI;
    const szerCalosc = szerOtworu + 2*POSZERZENIE;
    const szerPanelu = szerCalosc/2;

    const grupa = new THREE.Group();
    grupa.name = 'Zasłony · ' + o.name;
    grupa.position.set(cx, 0, cz);
    if(pionowe) grupa.rotation.y = Math.PI/2;     // panel rozciąga się wzdłuż Z
    scena.add(grupa);

    const drazek = karnisz(THREE, szerCalosc + 16);
    drazek.position.set(0, gora + 2, x < 500 || z < 400 ? 9 : -9);
    grupa.add(drazek);

    const panele = [];
    for(const strona of [-1, 1]){
      const siatka = new THREE.Mesh(
        geometriaPanelu(THREE, szerPanelu, wysTkaniny, FALDY), material);
      /* Środek panelu w połowie jego szerokości, licząc od krawędzi zewnętrznej. */
      siatka.position.set(strona * szerPanelu/2, DO_PODLOGI + wysTkaniny/2,
                          drazek.position.z);
      siatka.castShadow = wSalonie;               // firanka nie rzuca pełnego cienia
      siatka.receiveShadow = true;
      siatka.userData.zaslona = true;
      siatka.userData.bazaX = siatka.position.x;
      siatka.userData.strona = strona;
      siatka.userData.szerPanelu = szerPanelu;
      grupa.add(siatka);
      panele.push(siatka);
    }

    zestawy.push({nazwa: o.name, rodzaj: wSalonie ? 'MAJGUL' : 'GLASÖRT',
                  grupa, panele, otwarcie: 0, cel: 0, start: 0, od: 0});
  }

  function zastosuj(z, t){
    for(const p of z.panele){
      const s = 1 - (1 - OTWARCIE_SZER) * t;
      p.scale.x = s;
      /* Przy ściąganiu na bok tkanina gęstnieje i fałdy robią się głębsze. */
      p.scale.z = 1 + t * 1.6;
      /* Panel wędruje ku swojej krawędzi, żeby zebrał się przy karniszu. */
      const przesuw = (p.userData.szerPanelu/2) * (1 - s);
      p.position.x = p.userData.bazaX + p.userData.strona * przesuw;
    }
    z.otwarcie = t;
  }

  function ustaw(z, cel){
    if(Math.abs((z.cel ?? 0) - cel) < .002) return false;
    z.od = z.otwarcie; z.cel = cel; z.start = performance.now();
    return true;
  }
  function przelacz(z){ return ustaw(z, (z.cel ?? 0) > .5 ? 0 : 1); }

  /* Klik w tkaninę otwiera lub zamyka tę parę. */
  function kliknij(obiekt){
    let o = obiekt;
    while(o && !o.userData?.zaslona) o = o.parent;
    if(!o) return false;
    const z = zestawy.find(zz => zz.panele.includes(o));
    if(!z) return false;
    const zmiana = przelacz(z);
    if(zmiana) przyZmianie?.();
    return zmiana;
  }

  function wszystkie(otwarte){
    let ile = 0;
    for(const z of zestawy) if(ustaw(z, otwarte ? 1 : 0)) ile++;
    if(ile) przyZmianie?.();
    return ile;
  }

  function aktualizuj(){
    let ruch = false;
    const teraz = performance.now();
    for(const z of zestawy){
      if(Math.abs(z.otwarcie - z.cel) < .001) continue;
      const t = Math.min(1, (teraz - z.start) / CZAS_MS);
      zastosuj(z, z.od + (z.cel - z.od) * easeInOut(t));
      if(t >= 1) z.otwarcie = z.cel;
      ruch = true;
    }
    return ruch;
  }

  for(const z of zestawy) zastosuj(z, 0);
  return {zestawy, kliknij, przelacz, ustaw, wszystkie, aktualizuj,
          ile: zestawy.length,
          get opis(){ return zestawy.map(z => z.rodzaj + ' · ' + z.nazwa); }};
}
