import { utworzKadrowanie } from './kadrowanie.js';

/* ============================================================
   NAWIGACJA — Point & Go, spacer, widok z lotu ptaka
   ------------------------------------------------------------
   Wzorzec zachowania: vr-interior.oaksun.studio (wartości [oaksun] odczytane
   z jego bundla) plus wymagania z briefu, tam gdzie brief jest bardziej
   szczegółowy niż demo:

   · JEDEN klik podchodzi w wskazane miejsce — nie dwuklik,
   · na poprawnym celu na podłodze ostre NIEBIESKIE kółko,
   · przeciąganie rozgląda kamerę i nigdy nie wywołuje podejścia,
   · ←/→ przesuwają kamerę bokiem, jak A/D w OAKSUN; Q/E zmieniają wysokość,
   · domyślna wysokość oczu 170 cm,
   · Point & Go trwa ~1 s i zachowuje kierunek patrzenia, zatrzymując się
     80 cm przed celem; przejście do pomieszczenia trwa 2,5 s i na końcu
     kieruje wzrok na najbliższy sensowny obiekt, a nie w ścianę,
   · wszystko z easingiem — bez szarpnięć.

   Ruch liczony na sekundę, nie na klatkę: prędkość nie może zależeć od tego,
   ile klatek wyrobi karta.
   ============================================================ */

const OCZY = 170;            // brief: wysokość oczu po teleportacji
const OCZY_KUCANIE = 95;
const PROMIEN = 20;          // promień kolidera gracza [cm]
const CZULOSC = .0013;       // [oaksun] st — rad na piksel
const PITCH_MAX = Math.PI/3; // [oaksun] Kt — ±60°
const TLUMIENIE = .92;       // [oaksun] dampening (na klatkę 60 Hz)
/* Parametry ruchu przepisane wprost z demo (ie = {...}), przeliczone z metrów
   na centymetry. Kluczowy jest mechanizm, nie same liczby: prędkość NIE jest
   ustawiana wprost — jest akumulowana w wektorze i tłumiona co klatkę. Prędkość
   końcowa to maxSpeed/(1−dampening) = 0,4/0,08 = 5 cm na klatkę, czyli ~3 m/s.
   Dlatego samo maxSpeed 0,4 wygląda na absurdalnie małe, a chodzi się normalnie. */
const RUCH = {
  maxSpeed: 0.4,        // [oaksun] .004 m
  acceleration: 0.4,    // [oaksun] .004
  deceleration: 0.35,   // [oaksun] .0035
  dampening: 0.92       // [oaksun] .92
};
const GRAWITACJA = 900, SKOK = 300;
const PROGI = [14, 85];
const PODEJSCIE_MS = 1000;   // [oaksun] l = 1e3
const POKOJ_MS = 2500;       // brief: przejście do pomieszczenia 2–3 s
const ODSTEP_OD_CELU = 80;   // [oaksun] t.sub(s.multiplyScalar(.8)) — 0,8 m

/* ORBITA to nazwa historyczna — od teraz jest to ROZGLĄDANIE: kamera stoi
   w miejscu, a przeciągnięcie obraca widok, jak przy panoramie na telefonie.
   OrbitControls krążyły wokół punktu, co przy chodzeniu po mieszkaniu jest
   zupełnie innym gestem i użytkownik tego nie chciał. Kółko myszy przesuwa
   kamerę wzdłuż kierunku patrzenia, z tymi samymi kolizjami co spacer. */
const TRYBY = {ORBITA:'orbita', SPACER:'spacer', PTAK:'ptak'};
const KROK_KOLKA = 26;   // cm na jeden ząbek

export function utworzNawigacje({THREE, camera, controls, renderer, plan, biblioteka, scena, sufit,
                                 ustawKrycieWidoku, przyZmianie, przyKlikniecie, czyInteraktywne}){
  const {APARTMENT} = plan;
  const plotno = renderer.domElement;
  const kadrowanie = utworzKadrowanie({THREE, plan, biblioteka});
  controls.enabled = false; // OrbitControls obsługuje wyłącznie widok z góry.
  plotno.style.touchAction = 'none';
  plotno.tabIndex = 0;

  let tryb = TRYBY.ORBITA;
  let kolizje = true;
  const stopy = new THREE.Vector3(551, 0, 470);
  const predkosc = new THREE.Vector3();
  let vy = 0, naZiemi = true, kuca = false, wysokoscOczu = OCZY, celOczu = OCZY;
  /* Orientacja mieszka w kwaternionie kamery — jak w demo. Osobno trzymamy
     tylko pochylenie, bo jego ograniczenie wymaga bieżącej wartości. */
  let animacja = null, bylaBlokada = false, widokPrzedPtakiem = null;
  let resztaKroku = 0;
  const klaw = Object.create(null);

  /* ---------- pudełka mebli ---------- */
  let pudelka = [];
  function przeliczMeble(){
    pudelka = [];
    if(!biblioteka || !biblioteka.meble) return;
    for(const wpis of biblioteka.meble.values()){
      if(!wpis.korzen) continue;
      const b = new THREE.Box3().setFromObject(wpis.korzen);
      if(isFinite(b.min.x) && b.max.y - b.min.y > 8) pudelka.push({b, korzen: wpis.korzen});
    }
  }

  /* ---------- kolizje ---------- */
  const OKRAG = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[.7,-.7],[-.7,.7],[-.7,-.7]]
                  .map(([a,b]) => [a*PROMIEN, b*PROMIEN]);
  function zablokowane(x, y, z){
    if(!kolizje) return false;
    if(!plan.czyPodloga(x, z)) return true;
    for(const h of [PROGI[0], PROGI[1], wysokoscOczu - 12])
      for(const [ox, oz] of OKRAG)
        if(plan.czySciana(x + ox, y + h, z + oz)) return true;
    for(const {b} of pudelka){
      if(b.max.y < y + 28 || b.min.y > y + wysokoscOczu) continue;
      if(x + PROMIEN > b.min.x && x - PROMIEN < b.max.x &&
         z + PROMIEN > b.min.z && z - PROMIEN < b.max.z) return true;
    }
    return false;
  }
  /* Najbliższe legalne miejsce w promieniu — żeby podejście pod mebel nie
     kończyło się „nie da się tu stanąć”. */
  function najblizszeWolne(x, z){
    if(!zablokowane(x, 0, z)) return {x, z};
    for(let r = 25; r <= 150; r += 25)
      for(let i = 0; i < 12; i++){
        const a = i/12 * Math.PI*2;
        const px = x + Math.cos(a)*r, pz = z + Math.sin(a)*r;
        if(!zablokowane(px, 0, pz)) return {x: px, z: pz};
      }
    return null;
  }

  /* ---------- ruch ---------- */
  /* ============================================================
     RUCH I PATRZENIE — przepisane 1:1 z bundla demo
     ------------------------------------------------------------
     Odpowiedniki funkcji ze źródła: Jn() = ruch, mi() = patrzenie,
     qt() = znacznik, dt() = podejście, Nt()/$t() = klawisze.

     KLUCZOWA RÓŻNICA, którą wcześniej przeoczyłem: w demo funkcja ruchu
     NIE DOTYKA kwaternionu kamery. Orientację zmienia wyłącznie mi().
     Mój poprzedni krok() odtwarzał orientację z własnych pól yaw/pitch
     w każdej klatce i przez to kasował każde przeciągnięcie myszą —
     stąd „panorama nie działa".

     Jednostki demo to metry, nasze to centymetry, więc odległości ×100.
     Pole `de` z demo (bieżące pochylenie) nazywa się tu `pochylenie`.
     ============================================================ */
  const eulerPom = new THREE.Euler(0, 0, 0, 'YXZ');
  let pochylenie = 0;                    // [oaksun] de
  const kolumna = new THREE.Vector3(), bokWek = new THREE.Vector3(), kierunek = new THREE.Vector3();
  const predkoscRuchu = new THREE.Vector3();   // [oaksun] w.velocity
  let biezacaSzybkosc = 0;                     // [oaksun] w.currentSpeed

  /* [oaksun] mi(o, t) — t oznacza „wskaźnik zablokowany".
     Przy blokadzie bierzemy movementX/Y i ODEJMUJEMY, przy przeciąganiu
     różnicę pozycji i DODAJEMY. Ten odwrócony znak to nie pomyłka: przy
     przeciąganiu obraz ma iść za palcem, jak przy panoramie. */
  function patrz(e, zablokowany){
    ruszyl = true;                       // [oaksun] Wt
    const dx = zablokowany ? e.movementX : e.clientX - ostX;
    const dy = zablokowany ? e.movementY : e.clientY - ostY;
    eulerPom.setFromQuaternion(camera.quaternion);
    if(zablokowany) eulerPom.y -= dx * CZULOSC;
    else            eulerPom.y += dx * CZULOSC;
    const d = pochylenie + (zablokowany ? -dy * CZULOSC : dy * CZULOSC);
    pochylenie = THREE.MathUtils.clamp(d, -PITCH_MAX, PITCH_MAX);
    eulerPom.x = pochylenie;
    camera.quaternion.setFromEuler(eulerPom);
    if(!zablokowany){ ostX = e.clientX; ostY = e.clientY; }
  }

  /* Ustawienie orientacji na punkt — pochylenie zapamiętujemy, żeby ogranicznik
     dalej działał. */
  function skierujNa(cel){
    const k = new THREE.Vector3().subVectors(cel, camera.position).normalize();
    eulerPom.set(0, 0, 0, 'YXZ');
    eulerPom.y = Math.atan2(-k.x, -k.z);
    pochylenie = THREE.MathUtils.clamp(Math.asin(k.y), -PITCH_MAX*.99, PITCH_MAX*.99);
    eulerPom.x = pochylenie;
    camera.quaternion.setFromEuler(eulerPom);
  }
  function odczytajPochylenie(){
    eulerPom.setFromQuaternion(camera.quaternion);
    pochylenie = THREE.MathUtils.clamp(eulerPom.x, -PITCH_MAX*.99, PITCH_MAX*.99);
  }

  /* [oaksun] Jn() — ruch. Działa w OBU trybach. Kierunek z kolumn macierzy
     kamery, prędkość akumulowana i tłumiona. Dołożone są tylko kolizje,
     których demo nie ma (tam nie ma ścian). */
  function krok(dt){
    dt = Math.min(dt, .05);
    const kr = dt * 60;                  // demo liczy na klatkę 60 Hz
    camera.updateMatrix();

    const idzie = klaw.przod || klaw.tyl || klaw.lewo || klaw.prawo;
    if(idzie){
      kierunek.set(0, 0, 0);
      if(klaw.przod || klaw.tyl){
        kolumna.setFromMatrixColumn(camera.matrix, 2);
        kolumna.y = 0; kolumna.normalize();
        kolumna.multiplyScalar((klaw.tyl ? 1 : 0) - (klaw.przod ? 1 : 0));
        kierunek.add(kolumna);
      }
      if(klaw.lewo || klaw.prawo){
        bokWek.setFromMatrixColumn(camera.matrix, 0);
        bokWek.y = 0; bokWek.normalize();
        bokWek.multiplyScalar((klaw.prawo ? 1 : 0) - (klaw.lewo ? 1 : 0));
        kierunek.add(bokWek);
      }
      if(kierunek.length() > 0){
        kierunek.normalize();
        const m = kuca ? .5 : (klaw.bieg ? 2 : 1);
        biezacaSzybkosc = Math.min(biezacaSzybkosc + RUCH.acceleration*m*kr, RUCH.maxSpeed*m);
        predkoscRuchu.add(kierunek.multiplyScalar(biezacaSzybkosc*kr));
      }
    }else{
      const m = kuca ? .5 : 1;
      biezacaSzybkosc = Math.max(biezacaSzybkosc - RUCH.deceleration*m*kr, 0);
    }
    predkoscRuchu.multiplyScalar(Math.pow(RUCH.dampening, kr));
    /* Martwa strefa: tłumienie geometryczne nie zeruje się dokładnie, a bez
       tego kamera pełzła i obraz nigdy nie dochodził do pełnej jakości. */
    if(predkoscRuchu.lengthSq() < 1e-4) predkoscRuchu.set(0, 0, 0);

    /* Wysokość oczu — płynne dojście (kucanie, Q/E). */
    wysokoscOczu += ((kuca ? OCZY_KUCANIE : celOczu) - wysokoscOczu) * Math.min(1, dt*12);

    /* Ruch poziomy z kolizjami, rozdzielony na osie, żeby ślizgać się po ścianie.
       Demo tego nie ma — u nas są ściany i meble. */
    const dx = predkoscRuchu.x, dz = predkoscRuchu.z;
    if(dx || dz) znacznik.visible = false;
    if(!zablokowane(stopy.x + dx, stopy.y, stopy.z)) stopy.x += dx; else predkoscRuchu.x = 0;
    if(!zablokowane(stopy.x, stopy.y, stopy.z + dz)) stopy.z += dz; else predkoscRuchu.z = 0;

    if(tryb === TRYBY.SPACER){
      vy -= GRAWITACJA*dt;
      let y = stopy.y + vy*dt;
      if(y <= 0){ y = 0; vy = 0; naZiemi = true; } else naZiemi = false;
      stopy.y = y;
    }else{
      stopy.y = 0; vy = 0; naZiemi = true;
    }

    /* TYLKO pozycja. Kwaternion zostaje taki, jaki ustawiła funkcja patrzenia —
       dokładnie jak w demo. */
    camera.position.set(stopy.x, stopy.y + wysokoscOczu, stopy.z);
  }

  /* ---------- przeloty ----------
     `patrzNa` puste = zachowaj bieżący kierunek patrzenia (Point & Go),
     ustawione = na końcu skieruj wzrok na ten punkt (przejście do pokoju). */
  function lec(poz, patrzNa, czas, poCzasie){
    const pom = new THREE.PerspectiveCamera(); // kamera patrzy w lokalne -Z, obiekt w +Z
    pom.position.copy(poz);
    pom.up.copy(camera.up);
    if(patrzNa) pom.lookAt(patrzNa);
    else pom.quaternion.copy(camera.quaternion);
    animacja = {odP: camera.position.clone(), doP: poz.clone(),
                odQ: camera.quaternion.clone(), doQ: pom.quaternion.clone(),
                odC: controls.target.clone(),
                doC: (patrzNa || poz.clone().add(kierunekPatrzenia().multiplyScalar(260))),
                uplynelo: 0, czas: czas || PODEJSCIE_MS, po: poCzasie};
    controls.enabled = false;
  }
  /* Kierunek liczymy WPROST z kwaternionu, nie przez getWorldDirection.
     Ten drugi czyta matrixWorld, którą odświeża dopiero render — a my pytamy
     o kierunek zaraz po ustawieniu obrotu, więc dostawaliśmy stan sprzed
     przelotu i kamera po dolocie odwracała się tyłem do celu. */
  function kierunekPatrzenia(){
    return new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  }
  /* Przelot chodzi na tym samym zegarze co reszta pętli (dt), a nie na
     performance.now(). Dzięki temu jedno źródło czasu steruje wszystkim
     i przelot da się przeliczyć krokiem stałym — przy zegarze systemowym
     pętla o ustalonym dt nie posuwałaby animacji ani o krok. */
  function animuj(dt){
    if(!animacja) return;
    animacja.uplynelo += dt*1000;
    const t = Math.min(1, animacja.uplynelo / animacja.czas);
    if(animacja.tylkoPozycja){
      /* [oaksun] dt(): easeOutCubic i WYŁĄCZNIE pozycja. Kierunek patrzenia
         zostaje nietknięty — tak działa podejście w demo, i dlatego nie ma tu
         ani docelowego kwaternionu, ani celu dla OrbitControls. */
      const e3 = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(animacja.odP, animacja.doP, e3);
      if(t >= 1){ const po = animacja.po; animacja = null; po && po(); }
      return;
    }
    const e = 1 - Math.pow(1 - t, 4);                        // easeOutQuart dla przelotów
    camera.position.lerpVectors(animacja.odP, animacja.doP, e);
    camera.quaternion.slerpQuaternions(animacja.odQ, animacja.doQ, e);
    controls.target.lerpVectors(animacja.odC, animacja.doC, e);
    if(t >= 1){ const po = animacja.po; animacja = null; po && po(); }
  }

  /* ---------- widoki ---------- */
  function srodekMieszkania(){
    const xs = APARTMENT.outer.map(p => p[0]), zs = APARTMENT.outer.map(p => p[1]);
    return new THREE.Vector3((Math.min(...xs)+Math.max(...xs))/2, 0,
                             (Math.min(...zs)+Math.max(...zs))/2);
  }
  function widokPtaka(){
    const s = srodekMieszkania();
    const xs = APARTMENT.outer.map(p => p[0]), zs = APARTMENT.outer.map(p => p[1]);
    const r = Math.hypot(Math.max(...xs)-Math.min(...xs), Math.max(...zs)-Math.min(...zs))/2;
    /* camera.aspect bywa 0/0: TRAA rozsuwa kadr przez setViewOffset, a to ustawia
       aspect = fullWidth/fullHeight. Bierzemy proporcje z renderera. */
    const rozmiar = renderer.getSize(new THREE.Vector2());
    const aspekt = rozmiar.x > 0 && rozmiar.y > 0 ? rozmiar.x/rozmiar.y
                 : (isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 16/9);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2*Math.atan(Math.tan(vfov/2) * aspekt);
    let d = r / Math.sin(Math.min(vfov, hfov)/2) * 1.04;
    if(!isFinite(d) || d <= 0) d = r*3;
    const kat = THREE.MathUtils.degToRad(62);
    return {poz: new THREE.Vector3(s.x, Math.sin(kat)*d, s.z + Math.cos(kat)*d), cel: s};
  }

  function zapamietajWidok(){
    return {poz: camera.position.toArray(), obr: camera.quaternion.toArray(), celOczu};
  }
  function zatrzymajRuch(){
    for(const k in klaw) klaw[k] = false;
    predkoscRuchu.set(0, 0, 0); biezacaSzybkosc = 0; resztaKroku = 0;
    vy = 0; kuca = false;
  }
  function ustawTryb(nowy, opcje = {}){
    if(!Object.values(TRYBY).includes(nowy) || (nowy === tryb && !opcje.wymus)) return;
    const poprzedniTryb = tryb;
    if(nowy === TRYBY.PTAK && poprzedniTryb !== TRYBY.PTAK) widokPrzedPtakiem = zapamietajWidok();
    tryb = nowy;
    if(nowy !== TRYBY.SPACER && document.pointerLockElement === plotno) document.exitPointerLock();
    zatrzymajRuch(); animacja = null;
    znacznik.visible = false; controls.enabled = false;
    ustawKrycieWidoku?.(nowy === TRYBY.PTAK ? .42 : 1);
    if(nowy === TRYBY.PTAK){
      const w = widokPtaka();
      lec(w.poz, w.cel, POKOJ_MS, () => { controls.enabled = true; });
    }else if(poprzedniTryb === TRYBY.PTAK){
      const zapis = widokPrzedPtakiem;
      kadrowanie.odswiez();
      const p = kadrowanie.bezpiecznyStart(zapis ? new THREE.Vector3().fromArray(zapis.poz) : null);
      if(!p){ tryb=TRYBY.PTAK; controls.enabled=true; ustawKrycieWidoku?.(.42); odswiezPanel(); return; }
      const q = zapis ? new THREE.Quaternion().fromArray(zapis.obr) : camera.quaternion.clone();
      const cel = p.clone().add(new THREE.Vector3(0, 0, -260).applyQuaternion(q));
      lec(p, cel, PODEJSCIE_MS, () => {
        camera.quaternion.copy(q); synchronizuj();
        celOczu = wysokoscOczu = p.y;
      });
      if(nowy === TRYBY.SPACER) zablokujWskaznik();
    }else{
      const start = opcje.punkt || dobryStart();
      if(!start){ odswiezPanel(); return; }
      stopy.set(start.x, 0, start.z);
      camera.position.set(start.x, THREE.MathUtils.clamp(camera.position.y, 60, 230), start.z);
      synchronizuj();
      if(opcje.yaw !== undefined){
        eulerPom.set(0, opcje.yaw, 0, 'YXZ'); camera.quaternion.setFromEuler(eulerPom); odczytajPochylenie();
      }
      przeliczMeble();
      if(nowy === TRYBY.SPACER) zablokujWskaznik();
    }
    odswiezPanel();
  }
  function dobryStart(){
    kadrowanie.odswiez();
    return kadrowanie.bezpiecznyStart(camera.position);
  }

  /* ---------- Point & Go ----------
     Jeden klik. Kierunek patrzenia zostaje, kamera zatrzymuje się 80 cm przed
     wskazanym punktem i ląduje na wysokości oczu. */
  function podejdz(punkt, czas, patrzNa){
    const cel = new THREE.Vector3(punkt.x, 0, punkt.z);
    const odKamery = new THREE.Vector3(cel.x - camera.position.x, 0, cel.z - camera.position.z);
    if(odKamery.lengthSq() > 1) cel.sub(odKamery.normalize().multiplyScalar(ODSTEP_OD_CELU));
    const wolne = najblizszeWolne(cel.x, cel.z);
    if(!wolne) return false;
    stopy.set(wolne.x, 0, wolne.z);
    const doceloweOko = new THREE.Vector3(wolne.x, celOczu, wolne.z);
    lec(doceloweOko, patrzNa, czas || PODEJSCIE_MS, () => {
      /* NIE przechodzimy w tryb spaceru. Wcześniej tu było `tryb = SPACER`,
         przez co następne kliknięcie trafiało w gałąź „spacer bez blokady"
         i zamiast kolejnego podejścia włączało blokadę wskaźnika z krzyżykiem.
         W demo OAKSUN tryb POINTER zostaje trybem POINTER: klik podchodzi,
         przeciągnięcie rozgląda, a blokada i WASD to osobny tryb FPS. */
      odczytajPochylenie();
      predkoscRuchu.set(0,0,0); vy = 0;
      /* Zostajemy w rozglądaniu i nadal sterujemy kamerą sami. */
      controls.enabled = false;
      ustawKrycieWidoku?.(1);
      przeliczMeble();
      odswiezPanel();
    });
    return true;
  }

  /* Po dotarciu do pomieszczenia patrzymy na najbliższy sensowny obiekt,
     a nie w ścianę. */
  function celWzrokuDlaPokoju(srodek){
    let naj = null, najD = Infinity;
    for(const {b} of pudelka){
      const c = b.getCenter(new THREE.Vector3());
      const d = Math.hypot(c.x - srodek.x, c.z - srodek.z);
      if(d < najD && d < 600){ najD = d; naj = c; }
    }
    return naj ? new THREE.Vector3(naj.x, Math.min(naj.y, 150), naj.z) : null;
  }
  function doPokoju(i){
    const p = APARTMENT.rooms[i];
    if(!p) return;
    const s = plan.roomCenter(p);
    przeliczMeble();
    podejdz({x: s.x, z: s.z}, POKOJ_MS, celWzrokuDlaPokoju(s));
  }

  /* ---------- znacznik podejścia ---------- */
  // Dysk SVG projektowany z 3D: żadnych dodatkowych operacji na buforze WebGPU.
  const znacznik = new THREE.Group();
  znacznik.visible = false;
  const svgNS = 'http://www.w3.org/2000/svg';
  const nakladka = document.createElementNS(svgNS, 'svg');
  nakladka.setAttribute('aria-hidden', 'true');
  nakladka.style.cssText = 'position:fixed;pointer-events:none;z-index:10;display:none;overflow:hidden';
  const pierscien = document.createElementNS(svgNS, 'path');
  const srodek = document.createElementNS(svgNS, 'path');
  for(const p of [srodek, pierscien]) p.setAttribute('fill', '#2f7df6');
  pierscien.setAttribute('fill-rule', 'evenodd');
  pierscien.setAttribute('fill-opacity', '.95');
  srodek.setAttribute('fill-opacity', '.22');
  nakladka.append(srodek, pierscien);
  document.body.append(nakladka);
  const punktZnacznika = new THREE.Vector3();
  function rysujZnacznik(){
    nakladka.style.display = 'none';
    if(!znacznik.visible) return;
    const r = plotno.getBoundingClientRect();
    if(r.width <= 0 || r.height <= 0) return;
    camera.updateMatrixWorld();
    let poprawny = true;
    const obrys = promien => {
      let d = '';
      for(let i=0; i<48; i++){
        const kat = i*Math.PI/24;
        punktZnacznika.set(Math.cos(kat)*promien, Math.sin(kat)*promien, 0)
          .applyQuaternion(znacznik.quaternion).add(znacznik.position).project(camera);
        const {x,y,z} = punktZnacznika;
        if(!Number.isFinite(x+y+z) || z < -1 || z > 1) poprawny = false;
        d += `${i ? 'L' : 'M'}${((x+1)*r.width/2).toFixed(2)},${((1-y)*r.height/2).toFixed(2)}`;
      }
      return d+'Z';
    };
    const zewnetrzny = obrys(21), wewnetrzny = obrys(16);
    if(!poprawny){ znacznik.visible = false; return; }
    nakladka.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    Object.assign(nakladka.style, {left:r.left+'px', top:r.top+'px',
      width:r.width+'px', height:r.height+'px', display:'block'});
    pierscien.setAttribute('d', zewnetrzny+wewnetrzny);
    srodek.setAttribute('d', wewnetrzny);
  }

  const promien = new THREE.Raycaster();
  /* TRAA rozsuwa kadr przez camera.setViewOffset(fullWidth, fullHeight, …).
     Gdy bufor ma chwilowo zerowy rozmiar (karta w tle, panel schowany), trafia
     tam 0/0 — aspect robi się NaN, MACIERZ PROJEKCJI PRZESTAJE BYĆ SKOŃCZONA
     i każdy promień z kamery przepada. Objaw: kliknięcia nagle nic nie robią.
     Naprawiamy przed każdym promieniem i w każdej klatce. */
  function naprawKamere(){
    if(Number.isFinite(camera.aspect) && camera.projectionMatrix.elements.every(Number.isFinite)) return false;
    const r = renderer.getSize(new THREE.Vector2());
    camera.clearViewOffset();
    camera.aspect = r.x > 0 && r.y > 0 ? r.x/r.y : 16/9;
    camera.updateProjectionMatrix();
    return true;
  }

  /* [oaksun] qt() — znacznik podąża za kursorem.
     Promień leci we WSZYSTKO, nie tylko w podłogę: znacznik kładzie się na
     normalnej trafionej powierzchni, więc działa też na ścianie i na meblu.
     Znika, gdy cel jest bliżej niż metr (u nich 1, u nas 100 cm). */
  let ostatnieTrafienie = null;
  const OS_Y = new THREE.Vector3(0, 1, 0);
  const OS_Z = new THREE.Vector3(0, 0, 1);
  const macierzNormalnej = new THREE.Matrix3();

  function celPodejsciaDla(punkt){
    const cel = new THREE.Vector3(punkt.x, celOczu, punkt.z);
    const kier = new THREE.Vector3(cel.x - camera.position.x, 0, cel.z - camera.position.z);
    const dystans = kier.length();
    if(dystans <= ODSTEP_OD_CELU + 1) return null;
    cel.addScaledVector(kier.normalize(), -ODSTEP_OD_CELU);
    const wolne = najblizszeWolne(cel.x, cel.z);
    if(!wolne) return null;
    cel.x = wolne.x; cel.z = wolne.z;
    const kroki = Math.max(1, Math.ceil(Math.hypot(cel.x-camera.position.x, cel.z-camera.position.z)/10));
    for(let i=1; i<=kroki; i++){
      const t=i/kroki;
      if(zablokowane(camera.position.x+(cel.x-camera.position.x)*t, 0,
                     camera.position.z+(cel.z-camera.position.z)*t)) return null;
    }
    return cel;
  }
  function widocznyObiekt(o){
    for(let p=o; p; p=p.parent) if(!p.visible) return false;
    return true;
  }
  const celPodejscia = new THREE.Vector3();
  const kameraZnacznika = new THREE.Vector3(), obrotZnacznika = new THREE.Quaternion();
  function odswiezZnacznik(e){
    znacznik.visible = false; ostatnieTrafienie = null;
    if(tryb !== TRYBY.ORBITA || animacja) return;
    naprawKamere(); camera.updateMatrixWorld();
    const r = plotno.getBoundingClientRect();
    if(r.width <= 0 || r.height <= 0) return;
    promien.setFromCamera(new THREE.Vector2(
      (e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1), camera);
    const traf = promien.intersectObjects(scena.children, true).find(t =>
      widocznyObiekt(t.object) && t.object !== znacznik && !znacznik.children.includes(t.object)
      && t.object.name !== 'Pasek LED');
    if(!traf) return;
    ostatnieTrafienie = traf.object;
    if(czyInteraktywne?.(traf.object)) return;
    if(camera.position.distanceTo(traf.point) < 100) return;
    const cel = celPodejsciaDla(traf.point);
    if(!cel) return;
    const n = traf.face ? traf.face.normal.clone().applyMatrix3(
      macierzNormalnej.getNormalMatrix(traf.object.matrixWorld)).normalize() : OS_Y.clone();
    if(n.dot(promien.ray.direction) > 0) n.negate();
    znacznik.quaternion.setFromUnitVectors(OS_Z, n);
    znacznik.position.copy(traf.point).addScaledVector(n, 1.2);
    znacznik.visible = true; celPodejscia.copy(cel);
    kameraZnacznika.copy(camera.position); obrotZnacznika.copy(camera.quaternion);
  }
  function podejdzDoZnacznika(){
    if(!znacznik.visible) return false;
    const cel = celPodejscia.clone();
    zatrzymajRuch();
    animacja = {odP: camera.position.clone(), doP: cel,
      uplynelo: 0, czas: PODEJSCIE_MS, tylkoPozycja: true,
      po: () => { synchronizuj(); }};
    znacznik.visible = false;
    return true;
  }

  /* Klik jest odróżniany od przeciągnięcia progiem 3 px; anulowany gest nie klika. */
  let wcisniety = false, ruszyl = false, ostX = 0, ostY = 0, startX = 0, startY = 0, pointerId = null;
  plotno.addEventListener('pointerdown', e => {
    if(e.button !== 0 || e.isPrimary === false) return;
    plotno.focus({preventScroll: true});
    if(tryb === TRYBY.PTAK) return;
    wcisniety = true; ruszyl = false; pointerId = e.pointerId;
    ostX = startX = e.clientX; ostY = startY = e.clientY;
    odswiezZnacznik(e);
    try{ plotno.setPointerCapture?.(e.pointerId); }catch(err){}
  });
  plotno.addEventListener('pointermove', e => {
    if(tryb === TRYBY.PTAK || e.isPrimary === false) return;
    if(tryb === TRYBY.SPACER && document.pointerLockElement === plotno){ patrz(e,true); return; }
    if(wcisniety && e.pointerId === pointerId){
      if(!ruszyl && Math.hypot(e.clientX-startX,e.clientY-startY) < 3) return;
      if(animacja){ animacja=null; synchronizuj(); }
      patrz(e,false); znacznik.visible=false;
    }else odswiezZnacznik(e);
  });
  plotno.addEventListener('pointerup', e => {
    if(e.pointerId !== pointerId) return;
    wcisniety=false; pointerId=null;
    try{ plotno.releasePointerCapture?.(e.pointerId); }catch(err){}
  });
  function anulujWskaznik(){ wcisniety=false; pointerId=null; ruszyl=true; znacznik.visible=false; }
  plotno.addEventListener('pointercancel', anulujWskaznik);
  plotno.addEventListener('lostpointercapture', () => { if(wcisniety) anulujWskaznik(); });
  plotno.addEventListener('pointerleave', () => { znacznik.visible=false; });
  plotno.addEventListener('click', e => {
    if(e.button !== 0 || tryb === TRYBY.PTAK || animacja || wcisniety || ruszyl) return;
    if(tryb === TRYBY.SPACER){ if(document.pointerLockElement !== plotno) zablokujWskaznik(); return; }
    odswiezZnacznik(e); // klik/tap bez wcześniejszego hoveru też wyznacza cel
    if(ostatnieTrafienie && przyKlikniecie?.(ostatnieTrafienie)){ znacznik.visible=false; return; }
    podejdzDoZnacznika();
  });

  /* ---------- GŁADZIK ----------
     To był powód, dla którego „nie da się oglądać sceny kursorem". Na gładziku
     Maca przesunięcie dwoma palcami wysyła zdarzenie `wheel`, a ja miałem je
     zmapowane na jazdę do przodu i do tyłu. Odruch użytkownika — przesuń dwoma
     palcami, żeby rozejrzeć się jak po panoramie — powodował więc dojazd,
     a nie obrót.

     Konwencja macOS, którą teraz stosujemy:
       · przesunięcie dwoma palcami (wheel bez ctrl) → ROZGLĄDANIE,
       · szczypanie (wheel z ctrlKey — tak przeglądarka zgłasza pinch)  → dojazd.
     Mysz z kółkiem trafia w drugą gałąź tylko przy wciśniętym Ctrl, więc
     zwykłe kręcenie kółkiem także rozgląda. Dojazd zostaje na Ctrl i na klawiszach. */
  const CZULOSC_GLADZIKA = .0016;   // rad na jednostkę deltaY

  function dojedz(ile){
    const k = kierunekPatrzenia();
    const kroki = Math.max(1, Math.ceil(Math.abs(ile)/10));
    for(let i=0; i<kroki; i++){
      const nx = stopy.x + k.x*ile/kroki, nz = stopy.z + k.z*ile/kroki;
      if(!zablokowane(nx, stopy.y, stopy.z)) stopy.x = nx;
      if(!zablokowane(stopy.x, stopy.y, nz)) stopy.z = nz;
    }
    znacznik.visible = false;
  }

  plotno.addEventListener('wheel', e => {
    if(tryb === TRYBY.PTAK || animacja) return;
    e.preventDefault();
    const jednostka = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? plotno.clientHeight : 1;
    const deltaX = e.deltaX * jednostka, deltaY = e.deltaY * jednostka;

    if(e.ctrlKey){
      /* Szczypanie na gładziku albo Ctrl+kółko: dojazd wzdłuż patrzenia. */
      dojedz(THREE.MathUtils.clamp(-deltaY * .5, -KROK_KOLKA*3, KROK_KOLKA*3));
      return;
    }
    /* Rozglądanie. Znak jak przy przeciąganiu: obraz idzie za palcami. */
    eulerPom.setFromQuaternion(camera.quaternion);
    eulerPom.y -= deltaX * CZULOSC_GLADZIKA;
    const d = pochylenie - deltaY * CZULOSC_GLADZIKA;
    pochylenie = THREE.MathUtils.clamp(d, -PITCH_MAX, PITCH_MAX);
    eulerPom.x = pochylenie;
    camera.quaternion.setFromEuler(eulerPom);
    znacznik.visible = false;
  }, {passive: false});

  function zablokujWskaznik(){
    if(document.pointerLockElement === plotno) return;
    try{
      const p = plotno.requestPointerLock && plotno.requestPointerLock();
      if(p && typeof p.then === 'function') p.then(() => wskazowka(false), () => wskazowka(true));
    }catch(e){ wskazowka(true); }
  }
  document.addEventListener('pointerlockerror', () => wskazowka(true));
  document.addEventListener('pointerlockchange', () => {
    const zablokowany = document.pointerLockElement === plotno;
    celownik.style.opacity = zablokowany ? '1' : '0';
    wskazowka(!zablokowany);
    if(!zablokowany && tryb === TRYBY.SPACER && bylaBlokada) ustawTryb(TRYBY.ORBITA);
    bylaBlokada = zablokowany;
  });

  /* ---------- klawiatura ---------- */
  /* Strzałki są tym samym co WSAD — tak jest w źródle demo. */
  const MAPA = {KeyW:'przod', ArrowUp:'przod', KeyS:'tyl', ArrowDown:'tyl',
                KeyA:'lewo', ArrowLeft:'lewo', KeyD:'prawo', ArrowRight:'prawo'};
  /* Brief: sterowanie musi działać po użyciu panelu — ale wpisywanie daty nie
     może jednocześnie poruszać kamerą. */
  const wPolu = () => {
    const a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  };
  addEventListener('keydown', e => {
    if(e.metaKey || e.ctrlKey || e.altKey || wPolu()) return;
    if(MAPA[e.code]){
      if(tryb === TRYBY.PTAK) return;
      e.preventDefault();
      if(animacja){ animacja=null; synchronizuj(); }
      klaw[MAPA[e.code]] = true; return;
    }
    if(e.repeat) return;
    switch(e.code){
      case 'ShiftLeft': case 'ShiftRight': klaw.bieg = true; break;
      case 'KeyC': kuca = true; break;
      case 'Space':
        if(tryb === TRYBY.SPACER){ e.preventDefault(); if(naZiemi){ vy = SKOK; naZiemi = false; } }
        break;
      case 'KeyF': case 'Enter': ustawTryb(TRYBY.SPACER); break;
      case 'KeyB': ustawTryb(tryb === TRYBY.PTAK ? TRYBY.ORBITA : TRYBY.PTAK); break;
      case 'KeyO': ustawTryb(TRYBY.ORBITA); break;
      case 'KeyK': przelaczKolizje(); break;
      case 'KeyQ': zmienWysokoscOczu(-5); break;
      case 'KeyE': zmienWysokoscOczu(+5); break;
      case 'Escape': if(tryb === TRYBY.SPACER) ustawTryb(TRYBY.ORBITA); break;
      default:
        if(/^Digit[1-7]$/.test(e.code)) doPokoju(+e.code.slice(5) - 1);
    }
  });
  addEventListener('keyup', e => {
    if(MAPA[e.code]) klaw[MAPA[e.code]] = false;
    if(e.code === 'ShiftLeft' || e.code === 'ShiftRight') klaw.bieg = false;
    if(e.code === 'KeyC') kuca = false;
  });
  addEventListener('blur', () => { zatrzymajRuch(); anulujWskaznik(); });

  /* ---------- celownik ---------- */
  const styl = document.createElement('style');
  styl.textContent = `
   #celownik{position:fixed;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;z-index:21;
     opacity:0;transition:opacity .2s;pointer-events:none}
   #celownik::before,#celownik::after{content:'';position:absolute;background:#fff;box-shadow:0 0 2px #0009}
   #celownik::before{left:7px;top:0;width:2px;height:16px}
   #celownik::after{top:7px;left:0;height:2px;width:16px}`;
  document.head.append(styl);
  const celownik = document.createElement('div');
  celownik.id = 'celownik';
  document.body.append(celownik);

  let sposobPatrzenia = 'klik = podejdź · przeciągnij = rozejrzyj się';
  function wskazowka(przeciaganie){
    sposobPatrzenia = tryb === TRYBY.SPACER
      ? (przeciaganie ? 'przeciągnij, aby się rozejrzeć' : 'ruch myszy = rozglądanie')
      : 'klik = podejdź · przeciągnij = rozejrzyj się';
    odswiezPanel();
  }
  function odswiezPanel(){
    przyZmianie?.({tryb, kolizje, sposobPatrzenia, wysokoscOczu: Math.round(celOczu)});
  }

  function zmienWysokoscOczu(d){
    celOczu = THREE.MathUtils.clamp(celOczu + d, 60, 230);
    odswiezPanel();
    return Math.round(celOczu);
  }
  function przelaczKolizje(){ kolizje = !kolizje; odswiezPanel(); return kolizje; }

  /* Zewnętrzne kadrowanie kończy się wyłącznie na wolnym miejscu w planie. */
  function ustawWidok(pozycja, cel){
    kadrowanie.odswiez();
    if(pozycja && !kadrowanie.wolne(pozycja)) return false;
    if(cel && ![cel.x,cel.y,cel.z].every(Number.isFinite)) return false;
    tryb = TRYBY.ORBITA; controls.enabled = false; animacja = null;
    if(document.pointerLockElement === plotno) document.exitPointerLock();
    zatrzymajRuch(); znacznik.visible = false; ustawKrycieWidoku?.(1);
    if(pozycja) camera.position.copy(pozycja);
    synchronizuj();
    if(cel){ skierujNa(cel); controls.target.copy(cel); }
    camera.updateMatrixWorld(); odswiezPanel(); zapiszStan();
    return true;
  }
  function kadrujMebel(korzen){
    naprawKamere();
    const wynik = kadrowanie.kadruj(korzen,camera);
    if(wynik.ok && !ustawWidok(wynik.pozycja,wynik.cel))
      return {ok:false,powod:'Wybrane miejsce nie jest już dostępne.'};
    return wynik;
  }

  /* Odczyt bieżącego stanu kamery do wewnętrznych pól — po tym, jak ktoś
     przestawił kamerę z zewnątrz. */
  function synchronizuj(){
    stopy.set(camera.position.x, 0, camera.position.z);
    celOczu = wysokoscOczu = THREE.MathUtils.clamp(camera.position.y, 20, 400);
    odczytajPochylenie();
    predkoscRuchu.set(0, 0, 0);
  }

  /* ---------- PAMIĘĆ MIĘDZY SESJAMI ----------
     Brief §12: przeglądarka ma pamiętać pozycję i rotację kamery oraz ustawienia.
     localStorage potrafi rzucić wyjątkiem (tryb prywatny, zablokowane dane
     witryny) i potrafi zwrócić śmieci, więc każdy odczyt i zapis jest osłonięty,
     a wczytany stan sprawdzany na sensowność — inaczej jeden zepsuty wpis
     zablokowałby uruchomienie sceny na zawsze. */
  const KLUCZ = 'mieszkanie-webgpu:kamera:1';
  function zapiszStan(){
    try{
      localStorage.setItem(KLUCZ, JSON.stringify({
        poz: camera.position.toArray().map(v => +v.toFixed(2)),
        obr: camera.quaternion.toArray().map(v => +v.toFixed(4)),
        cel: controls.target.toArray().map(v => +v.toFixed(2)),
        stopy: stopy.toArray().map(v => +v.toFixed(2)),
        tryb, celOczu: Math.round(celOczu), kolizje, widokPrzedPtakiem
      }));
    }catch(e){ /* brak pamięci to nie powód, żeby psuć scenę */ }
  }
  function wczytajStan(){
    let d;
    try{ d = JSON.parse(localStorage.getItem(KLUCZ) || 'null'); }catch(e){ return false; }
    const wek = (v,n) => Array.isArray(v) && v.length===n && v.every(Number.isFinite);
    const obrot = v => wek(v,4) && Number.isFinite(v.reduce((s,x)=>s+x*x,0)) && v.reduce((s,x)=>s+x*x,0)>1e-8;
    const punkt = v => new THREE.Vector3().fromArray(v);
    if(typeof d?.kolizje==='boolean') kolizje=d.kolizje;
    if(!d || !wek(d.poz,3) || !obrot(d.obr) || !wek(d.cel,3)) return false;
    kadrowanie.odswiez();
    const p=punkt(d.poz), cel=punkt(d.cel);
    const ptak=d.tryb===TRYBY.PTAK;
    if(ptak){
      // Widok z góry może być poza obrysem, lecz musi patrzeć na mieszkanie.
      const wzor=widokPtaka(), s=wzor.cel;
      const zasieg=Math.max(wzor.poz.distanceTo(s)*2,500);
      if(p.y<=APARTMENT.height || p.distanceTo(s)>zasieg || cel.distanceTo(s)>300) return false;
      const kier=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion().fromArray(d.obr).normalize());
      if(kier.dot(s.clone().sub(p).normalize())<.5) return false;
    }else if(!kadrowanie.wolne(p)) return false;
    camera.position.copy(p);camera.quaternion.fromArray(d.obr).normalize();controls.target.copy(cel);
    tryb=ptak?TRYBY.PTAK:d.tryb===TRYBY.SPACER?TRYBY.SPACER:TRYBY.ORBITA;
    controls.enabled=ptak;
    if(ptak) ustawKrycieWidoku?.(.42);
    const v=d.widokPrzedPtakiem;
    if(v && wek(v.poz,3) && obrot(v.obr) && kadrowanie.wolne(punkt(v.poz)))
      widokPrzedPtakiem={poz:v.poz,obr:new THREE.Quaternion().fromArray(v.obr).normalize().toArray(),celOczu:v.poz[1]};
    if(!ptak){
      synchronizuj();
      if(Number.isFinite(d.celOczu)) celOczu=THREE.MathUtils.clamp(d.celOczu,60,Math.min(230,APARTMENT.height-20));
    }
    return true;
  }
  const wznowiono = wczytajStan();
  if(!wznowiono){
    const start=kadrowanie.bezpiecznyStart(camera.position);
    if(start) camera.position.copy(start);
    synchronizuj();
    if(start) zapiszStan();
  }
  addEventListener('pagehide', zapiszStan);
  addEventListener('visibilitychange', () => { if(document.hidden){ zapiszStan(); zatrzymajRuch(); anulujWskaznik(); } });

  /* ---------- klatka ---------- */
  let poprzedni = performance.now(), odZapisu = 0;
  const ostatniaZapisana = new THREE.Vector3(NaN, NaN, NaN);
  const ostatniZapisanyObrot = new THREE.Quaternion(0,0,0,0);
  function aktualizuj(dtWymuszone){
    const teraz = performance.now();
    const dt = dtWymuszone !== undefined ? dtWymuszone
                                         : Math.min((teraz - poprzedni)/1000, .1);
    poprzedni = teraz;
    naprawKamere();
    animuj(dt);
    if(!animacja && (tryb === TRYBY.SPACER || tryb === TRYBY.ORBITA)){
      // Stała symulacja 60 Hz zachowuje parametry OAKSUN przy różnym FPS renderera.
      resztaKroku += Math.max(0, Math.min(dt, .1));
      while(resztaKroku + 1e-9 >= 1/60){ krok(1/60); resztaKroku -= 1/60; }
    }
    else if(controls.enabled && !animacja) controls.update();
    znacznik.visible = znacznik.visible && tryb === TRYBY.ORBITA && !animacja
      && kameraZnacznika.distanceToSquared(camera.position) < .0001
      && Math.abs(obrotZnacznika.dot(camera.quaternion)) > .999999;
    if(sufit) sufit.visible = camera.position.y < APARTMENT.height - 6;

    /* Zapis co ~1 s i tylko gdy kamera faktycznie się ruszyła — zapisywanie
       w każdej klatce niepotrzebnie obciążałoby główny wątek. */
    odZapisu += dt;
    if(odZapisu > 1){
      odZapisu = 0;
      if(!(ostatniaZapisana.distanceToSquared(camera.position) < .01)
         || Math.abs(ostatniZapisanyObrot.dot(camera.quaternion)) < .999999){
        ostatniaZapisana.copy(camera.position);
        ostatniZapisanyObrot.copy(camera.quaternion);
        zapiszStan();
      }
    }
  }

  return {aktualizuj, ustawTryb, przeliczMeble, doPokoju, zmienWysokoscOczu, przelaczKolizje, naprawKamere,
          ustawWidok, kadrujMebel, synchronizuj, rysujZnacznik,
          podejdz, zapiszStan, TRYBY, pokoje: APARTMENT.rooms, wznowiono,
          get tryb(){ return tryb; }, get kolizje(){ return kolizje; },
          get wysokoscOczu(){ return Math.round(celOczu); }};
}
