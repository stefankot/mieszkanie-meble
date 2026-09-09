/* ============================================================
   MATERIAŁY SKANOWANE (Poly Haven, CC0)
   ------------------------------------------------------------
   Zamiana proceduralnych tekstur na skany PBR. To jest pozycja #1 z pakietu
   materiałów: proceduralne drewno zawsze wraca do wyglądu CGI, niezależnie od
   tego, ile post-processingu się na nie nałoży.

   Skala jest FIZYCZNA. Poly Haven podaje rzeczywisty wymiar próbki, więc
   powtórzenie liczymy jako (wymiar detalu w cm) / (wymiar próbki w cm),
   a nie „na oko”. Dzięki temu słój dębu ma taką samą gęstość na froncie
   szafy 60 cm i na boku 240 cm.

   Kierunek słoja idzie wzdłuż dłuższego boku formatki — tak fornir kładzie
   stolarz i tak wygląda na obu referencjach (pionowy słój na wysokich frontach).

   Kanały arm: R = AO, G = roughness, B = metalness. Three.js czyta z
   roughnessMap kanał G, więc ta sama mapa trafia tam wprost. aoMap pomijamy,
   bo wymaga drugiego zestawu UV, którego ta geometria nie ma — a dla płaskich
   frontów AO ze skanu i tak niewiele wnosi.
   ============================================================ */

import { texture, vec3 } from 'three/tsl';
import { dodajNiedoskonalosci } from './niedoskonalosci.js';
import { zTerminem, ponow, postep } from './siec.js';
import { semantyczneUV } from './uv-drewna.js';

const CDN = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg';
const HDRI = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr';

/* wymiar rzeczywisty próbki w cm — z api.polyhaven.com/info/<asset> */
/* Wybór po obejrzeniu samych plików: oak_veneer_04 ma słój ledwo czytelny,
   ash_veneer jest równomierny i chłodny, a oak_veneer_03 ma prawdziwy rysunek
   katedralny i pory — i to jego używała wersja WebGL. Drewno w 2K, bo jest
   oglądane z bliska i to ono niesie rysunek; tynk i parkiet w 1K wystarczą. */
const ZBIOR = {
  /* Referencja pokazuje fornir RIFT/QUARTER-SAWN: słój prosty, drobny, równoległy.
     oak_veneer_03 ma rysunek katedralny (litery V) — inny sposób cięcia, więc
     nigdy nie będzie wyglądał tak samo. white_oak_veneer ma prosty, pionowy słój.
     `slojPionowy` mówi, że w tym skanie słój biegnie już wzdłuż V, więc na
     wysokiej formatce NIE zamieniamy składowych UV (odwrotnie niż w 03). */
  /* 1K, nie 2K. Pomiar startu: sieć to 0,5 s (wszystko z cache), a ~19 s idzie
     na dekodowanie JPEG-ów i wysyłkę do GPU. Trzy mapy 2048² to czterokrotnie
     więcej pikseli do zdekodowania niż 1024² — a przy odległości, z jakiej
     ogląda się zabudowę, różnicy w rysunku słoja nie widać. */
  drewno:  {id: 'oak_veneer_01',        cm: 100, jakosc: '1k', slojPionowy: true},
  tynk:    {id: 'painted_plaster_wall', cm: 200, jakosc: '1k'},
  parkiet: {id: 'rectangular_parquet',  cm: 225, jakosc: '1k'}
};
const MAPY = {diff: 'diff', nor: 'nor_gl', arm: 'arm'};

export async function wczytajMaterialy(THREE, renderer, {jakosc = '1k', przyBledzie} = {}){
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const maxAniso = renderer.backend?.hasFeature?.('anisotropic-filtering') === false ? 1 : 16;

  let pobrane = 0;
  const WSZYSTKICH = Object.keys(ZBIOR).length * 3;
  async function wczytaj(id, rodzaj, jak){
    const j = jak || jakosc;
    const url = `${CDN}/${j}/${id}/${id}_${MAPY[rodzaj]}_${j}.jpg`;
    /* TextureLoader nie przyjmuje AbortSignal, więc ścigamy go z zegarem —
       żądanie leci dalej w tle, ale my przestajemy na nie czekać. */
    const t = await ponow(() => zTerminem(loader.loadAsync(url), 15000, `${id} ${rodzaj}`),
                          {opis: `skan ${id} (${rodzaj})`});
    pobrane++;
    postep(`Skany PBR — ${pobrane} z ${WSZYSTKICH}…`, .15 + .40*(pobrane/WSZYSTKICH));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    if(rodzaj === 'diff') t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }

  const zestaw = {};
  const braki = [];
  await Promise.all(Object.entries(ZBIOR).map(async ([nazwa, {id, cm, jakosc: jak}]) => {
    try{
      const [diff, nor, arm] = await Promise.all(['diff','nor','arm'].map(r => wczytaj(id, r, jak)));
      zestaw[nazwa] = {diff, nor, arm, cm, id, slojPionowy: !!ZBIOR[nazwa].slojPionowy};
    }catch(e){
      /* Brak skanu nie może wywalić sceny — silnik wraca wtedy do tekstur
         proceduralnych i mówi wprost, czego nie pobrał. */
      braki.push(nazwa + ' (' + id + '): ' + e.message);
      przyBledzie?.(nazwa, e);
    }
  }));

  /* ------------------------------------------------------------
     BEZ KLONOWANIA TEKSTUR.
     Poprzednia wersja klonowała trzy mapy na KAŻDĄ część mebla, żeby ustawić
     powtórzenie. Klon dzieli obraz w JS, ale backend zakłada osobną teksturę
     GPU, więc przy ~150 częściach robiło się z tego kilkaset tekstur 2K —
     kilka gigabajtów i zawieszona maszyna.

     Skala fizyczna idzie teraz w UV geometrii (skalujUV niżej), a tekstury
     są współdzielone: trzy mapy na materiał, raz. Powtórzenie zostaje 1:1,
     bo to UV mówi, ile razy wzór ma się powtórzyć.
     ------------------------------------------------------------ */
  function powierzchnia(zrodlo){
    return {map: zrodlo.diff, normalMap: zrodlo.nor, roughnessMap: zrodlo.arm};
  }

  const jest = n => !!zestaw[n];

  /* --- fornir: fronty i korpusy mebli ---
     Skan jest ciemniejszy niż referencja, a `material.color` potrafi wyłącznie
     przyciemniać (mnoży albedo). Rozjaśnienie robimy więc gradacją w TSL:
     gamma < 1 podnosi półcienie, a gain lekko ociepla. To jedyny sposób, żeby
     doprowadzić skan do jasnego, blond tonu z renderu bez zmiany oświetlenia. */
  /* Sama gamma < 1 rozjaśnia, ale przy okazji ZBIJA kontrast słoja: podnosi
     ciemne partie mocniej niż jasne. Dlatego po rozjaśnieniu przywracamy
     kontrast wokół punktu środkowego — inaczej fornir wychodzi jak papier. */
  const GAMMA = 0.66, GAIN = [1.04, 1.04, 1.05];   // rozjaśnienie bez wypłukania słoja
  const KONTRAST_SLOJA = 1.38, SRODEK = 0.46;   // rysunek słoja wraca po rozjaśnieniu
  /* Skan dębu jest mocno żółty; referencja ma ton mlecznej kawy, czyli mniej
     nasycony i chłodniejszy. Ściągamy nasycenie samego forniru — kontrast słoja
     zostaje, bo ten siedzi w jasności, nie w barwie. */
  const NASYCENIE_DREWNA = 0.44;   // piaskowa, ale słój ma pozostać czytelny
  const LUMA_W = [0.2126, 0.7152, 0.0722];
  function drewno(szerCm = 60, wysCm = 200, kolor){
    if(!jest('drewno')) return null;
    const m = new THREE.MeshPhysicalNodeMaterial({
      ...powierzchnia(zestaw.drewno),
      /* Referencja to fornir olejowany/matowy: żadnego lakieru, żadnej smugi
         odbicia. Clearcoat i wysokie envMapIntensity dawały wygląd politury. */
      roughness: .88, metalness: 0,
      normalScale: new THREE.Vector2(.32, .32),
      clearcoat: 0, clearcoatRoughness: 1,
      envMapIntensity: .75
    });
    /* Kolor zostaje biały: oak_veneer_03 jest bardzo jasny i to deklaracja
       z modelu (regał w salonie: #d8bd99) nadaje mu miodowy ton — dokładnie
       tak działała wersja WebGL, gdzie board() ustawiał biel, a kolor mebla
       dochodził dopiero w siatce. */
    const jasniej = texture(zestaw.drewno.diff).rgb
                      .pow(vec3(GAMMA, GAMMA, GAMMA))
                      .mul(vec3(...GAIN));
    const zKontrastem = jasniej.sub(SRODEK).mul(KONTRAST_SLOJA).add(SRODEK).clamp(0, 1);
    const luma = zKontrastem.dot(vec3(...LUMA_W));
    const stonowany = luma.add(zKontrastem.sub(luma).mul(NASYCENIE_DREWNA));
    /* Kolor z modelu (regał deklaruje #d8bd99) wchodzi TUTAJ, bo colorNode omija
       material.color. Ale wchodzi ZNORMALIZOWANY do jasności 1: sam skan jest już
       brązowy, więc mnożenie przez ciemny odcień liczyło brąz drugi raz i ściągało
       kanał niebieski do 0,6 — stąd pomarańcz zamiast mlecznej kawy. Po normalizacji
       deklaracja z modelu wpływa na ODCIEŃ, a nie na jasność. */
    const odcien = new THREE.Color(kolor || 0xffffff);
    const lumaOdcienia = Math.max(.05, 0.2126*odcien.r + 0.7152*odcien.g + 0.0722*odcien.b);
    const t = [odcien.r/lumaOdcienia, odcien.g/lumaOdcienia, odcien.b/lumaOdcienia];
    /* Pozostały przechył w żółć ściągamy w stronę neutralnej — o połowę. */
    const zmiekczony = t.map(v => v + (1 - v)*0.78);   // odcień ledwo muska barwę
    m.colorNode = stonowany.mul(vec3(...zmiekczony)).clamp(0, 1);
    m.color.setHex(0xffffff);
    m.name = 'Fornir dębowy';
    return dodajNiedoskonalosci(m, 'drewno');
  }

  /* --- lakierowany MDF: kremowe i bordowe fronty z referencji 1 ---
     Bez albedo ze skanu. Kolor jest płaski, a wiarygodność daje wyłącznie
     bardzo słaby microrelief tynku w normalu i lekka wariacja roughness. */
  function lakier(kolor = 0xefe9d8, szerCm = 60, wysCm = 200){
    /* NodeMaterial, bo warstwa niedoskonałości ustawia colorNode i roughnessNode;
       na zwykłym MeshPhysicalMaterial te węzły zostałyby zignorowane. */
    const m = new THREE.MeshPhysicalNodeMaterial({
      color: kolor, roughness: .42, metalness: 0,
      clearcoat: .35, clearcoatRoughness: .38, envMapIntensity: 1
    });
    if(jest('tynk')){
      m.normalMap = zestaw.tynk.nor;
      m.normalScale = new THREE.Vector2(.06, .06);   // ledwo widoczny
    }
    m.name = 'Lakier MDF';
    return dodajNiedoskonalosci(m, 'lakier');
  }

  /* --- tynk malowany: ściany i sufit --- */
  function tynk(kolor = 0xece9e2, szerCm = 400, wysCm = 250, {sufit = false} = {}){
    const m = new THREE.MeshPhysicalNodeMaterial({
      color: kolor, roughness: sufit ? .97 : .93, metalness: 0,
      envMapIntensity: sufit ? .5 : .75, dithering: true
    });
    if(jest('tynk')){
      m.normalMap = zestaw.tynk.nor;
      m.normalScale = new THREE.Vector2(sufit ? .10 : .18, sufit ? .10 : .18);
      if(!sufit) m.roughnessMap = zestaw.tynk.arm;
    }
    m.name = sufit ? 'Sufit — tynk' : 'Ściana — tynk';
    return dodajNiedoskonalosci(m, 'tynk');
  }

  /* --- parkiet ---
     Podłoga ma być DOKŁADNIE w tonacji forniru. Policzone, nie dobrane na oko:
     średnia skanu parkietu to sRGB (120, 92, 51), czyli liniowo (0,188 / 0,107 /
     0,033); fornir po swojej gradacji ląduje na (0,477 / 0,350 / 0,243).
     Gamma 0,55 plus wzmocnienia poniżej sprowadzają jedno na drugie —
     obie powierzchnie wychodzą na sRGB (184, 160, 135). */
  const PARKIET_GAMMA = 0.55;
  const PARKIET_GAIN = [1.1966, 1.1963, 1.5837];
  function parkiet(szerCm = 1000, glebCm = 800){
    if(!jest('parkiet')) return null;
    const m = new THREE.MeshPhysicalNodeMaterial({
      ...powierzchnia(zestaw.parkiet),
      roughness: .86, metalness: 0,
      normalScale: new THREE.Vector2(.55, .55),
      clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: .75
    });
    m.colorNode = texture(zestaw.parkiet.diff).rgb
                    .pow(vec3(PARKIET_GAMMA, PARKIET_GAMMA, PARKIET_GAMMA))
                    .mul(vec3(...PARKIET_GAIN))
                    .clamp(0, 1);
    m.name = 'Parkiet';
    return dodajNiedoskonalosci(m, 'parkiet');
  }

  /* Fizyczna skala wzoru wpisana w UV siatki. Dwa największe boki bryły
     wyznaczają, ile razy próbka ma się powtórzyć. Wykonywane raz na geometrię. */
  function skalujUV(mesh, cmProbki = 100){
    const g = mesh.geometry;
    if(mesh.userData.woodUV && semantyczneUV(g, mesh.userData.woodUV)) return;
    if(!g || !g.attributes.uv || g.userData.uvSkala) return;
    if(!g.boundingBox) g.computeBoundingBox();
    const r = g.boundingBox.getSize(new THREE.Vector3());
    const boki = [r.x, r.y, r.z].sort((a,b) => b - a);
    const su = Math.max(.04, boki[0]/cmProbki), sv = Math.max(.04, boki[1]/cmProbki);

    /* Słój w skanie biegnie poziomo (wzdłuż U). Na wysokiej formatce ma biec
       pionowo — jak na referencji i jak kładzie się fornir. Zamiast obracać
       teksturę (co przy mapie współdzielonej obróciłoby wszystko naraz),
       zamieniamy składowe UV tej jednej siatki. To jest darmowe i lokalne. */
    /* Formatka wysoka + skan o słoju poziomym → zamieniamy składowe.
       Skan o słoju już pionowym (white_oak_veneer) zostawiamy bez zamiany. */
    const wysoka = r.y >= r.x && r.y >= r.z;
    const pionowa = zestaw.drewno?.slojPionowy ? !wysoka : wysoka;
    /* WARIACJA MIĘDZY FORMATKAMI.
       Wszystkie drzwiczki dzielą jedną teksturę, więc bez tego dwadzieścia
       sąsiednich frontów ma identyczny słój — co natychmiast zdradza render.
       Prawdziwy stolarz kładzie kolejne arkusze forniru z innego miejsca sztapla
       i co drugi odwraca (książkowo). Robimy to samo: losowe przesunięcie po
       obu osiach plus lustrzane odbicie co któregoś elementu.

       Losowość jest DETERMINISTYCZNA — wynika z położenia siatki w meblu — więc
       ten sam mebel wygląda tak samo po każdym przeładowaniu i po odświeżeniu
       z biblioteki. */
    mesh.updateWorldMatrix(true, false);
    const poz = mesh.getWorldPosition(new THREE.Vector3());
    const ziarno = Math.abs(Math.sin(poz.x*12.9898 + poz.y*78.233 + poz.z*37.719) * 43758.5453);
    const los = k => { const v = Math.abs(Math.sin(ziarno*(k+1)*7.13) * 9973.17); return v - Math.floor(v); };
    const przesU = los(1), przesV = los(2);
    const lustroU = los(3) > .5 ? -1 : 1;
    const lustroV = los(4) > .78 ? -1 : 1;   // odbicie w pionie rzadziej: słój ma trzymać kierunek

    const uv = g.attributes.uv;
    for(let i = 0; i < uv.count; i++){
      const u = uv.getX(i), v = uv.getY(i);
      const a1 = pionowa ? v*sv : u*su;
      const b1 = pionowa ? u*su : v*sv;
      uv.setXY(i, a1*lustroU + przesU, b1*lustroV + przesV);
    }
    uv.needsUpdate = true;
    g.userData.uvSkala = [su, sv, pionowa ? 'pion' : 'poziom', lustroU, lustroV];
  }

  return {zestaw, braki, drewno, lakier, tynk, parkiet, skalujUV, powierzchnia,
          maDrewno: jest('drewno'), maTynk: jest('tynk'), maParkiet: jest('parkiet')};
}

/* ============================================================
   ŚRODOWISKO HDRI
   Jedno prawdziwe HDRI zamiast proceduralnego pudełka PMREM. To jest druga
   pozycja z pakietu i największa pojedyncza zmiana w świetle: miękkie,
   wypełniające światło z całej półsfery to dokładnie to, co widać na obu
   referencjach.
   ============================================================ */
export async function wczytajSrodowisko(THREE, renderer, scene, {
  nazwa = 'urban_courtyard_02', jakosc = '2k', moc = 1.0, tloHdri = false
} = {}){
  postep('Środowisko HDRI…', .60);
  const {RGBELoader} = await import('three/addons/loaders/RGBELoader.js');
  const hdr = await ponow(
    () => zTerminem(new RGBELoader().loadAsync(`${HDRI}/${jakosc}/${nazwa}_${jakosc}.hdr`), 20000, 'HDRI'),
    {opis: 'HDRI ' + nazwa});
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cel = pmrem.fromEquirectangular(hdr);
  scene.environment = cel.texture;
  scene.environmentIntensity = moc;
  pmrem.dispose();
  if(tloHdri){
    scene.background = hdr;
    scene.backgroundIntensity = moc;
    scene.backgroundRotation.copy(scene.environmentRotation);
  }else hdr.dispose();
  return {tekstura: cel.texture, nazwa, tlo: tloHdri ? hdr : null};
}
