/* ============================================================
   PODŚWIETLENIE WNĘK W MEBLACH
   ------------------------------------------------------------
   Na obu referencjach wnęki są rozświetlone od środka listwą LED tuż za
   frontem. Format mebla ma już typ części `light`, ale żaden opublikowany
   model go nie deklaruje — więc dopóki go nie zadeklaruje, renderer sam
   znajduje wnęki w geometrii i wstawia w nie listwy.

   Wnęka wykrywana jest pomiarem, nie zgadywaniem: z płaszczyzny frontu mebla
   puszczamy siatkę promieni w głąb i patrzymy, jak daleko jest pierwsza
   powierzchnia. Komórki cofnięte głębiej niż próg to wnęka; sąsiadujące
   komórki sklejamy w prostokąty i na górnej krawędzi każdego stawiamy listwę.

   Dzięki temu, gdy mebel zmieni podział, światła przestawią się same —
   i nic nie jest wpisane na sztywno pod jeden konkretny regał.
   ============================================================ */

/* Gęstość siatki pomiarowej. Przy 6 cm regał w salonie (307 × 243 cm) wymagał
   ~2000 promieni, a każdy przechodził przez 131 siatek mebla — to samo dawało
   6,5 s startu, zmierzone. Przy 14 cm promieni jest trzynaście razy mniej,
   a najmniejsza wnęka ma 18 cm, więc nadal zostaje wykryta. */
const KROK = 14;         // gęstość siatki pomiarowej [cm]
const PROG_GLEBOKOSCI = 10;   // od tylu cm za frontem uznajemy komórkę za wnękę
const MIN_POLE = 400;    // cm² — mniejsze zagłębienia to szczeliny, nie wnęki

export function oswietlWneki({THREE, korzen, scena, kolor = 0xffc582, moc = 170}){
  const gniazda = [];
  const opis = korzen.userData.lighting;
  if(opis !== undefined){
    // Jawne dane biblioteki mają pierwszeństwo przed zgadywaniem wnęk promieniami.
    if(opis?.units !== 'mm' || opis.coordinateSystem !== 'model-local' || !Array.isArray(opis.recesses)){
      console.warn('Nieobsługiwany opis LED:', korzen.name); return gniazda;
    }
    korzen.updateWorldMatrix(true, false);
    const wektor = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
    const ids = new Set();
    for(const wneka of opis.recesses){
      if(!Array.isArray(wneka?.ledStrips)){ console.warn('Brak listew LED:', wneka?.id); continue; }
      for(const led of wneka.ledStrips){
        if(!led || typeof led.id !== 'string' || ids.has(led.id) || !wektor(led.positionMm) || !wektor(led.targetMm)
           || !Number.isFinite(led.widthMm) || led.widthMm <= 0 || !Number.isFinite(led.heightMm) || led.heightMm <= 0){
          console.warn('Niepoprawny opis listwy LED:', led?.id); continue;
        }
        const poz = korzen.localToWorld(new THREE.Vector3().fromArray(led.positionMm).multiplyScalar(.1));
        const cel = korzen.localToWorld(new THREE.Vector3().fromArray(led.targetMm).multiplyScalar(.1));
        if(poz.distanceToSquared(cel) < 1e-8){ console.warn('LED bez kierunku:', led.id); continue; }
        ids.add(led.id);
        gniazda.push({id:led.id, wneka:wneka.id, poz, cel, szer:led.widthMm/10, wys:led.heightMm/10, rodzaj:'biblioteka'});
      }
    }
    return gniazda;
  }
  const bryla = new THREE.Box3().setFromObject(korzen);
  if(!isFinite(bryla.min.x)) return gniazda;

  /* Osie mebla: front to lokalne +Z (FORMAT-MEBLA.md), bok to lokalne +X. */
  const przod = new THREE.Vector3(0, 0, 1).applyQuaternion(korzen.quaternion).normalize();
  const bok   = new THREE.Vector3(1, 0, 0).applyQuaternion(korzen.quaternion).normalize();
  const gora  = new THREE.Vector3(0, 1, 0);

  const rozmiar = bryla.getSize(new THREE.Vector3());
  const srodek  = bryla.getCenter(new THREE.Vector3());
  const szer = Math.abs(rozmiar.x*bok.x) + Math.abs(rozmiar.z*bok.z);
  const gleb = Math.abs(rozmiar.x*przod.x) + Math.abs(rozmiar.z*przod.z);
  const wys  = rozmiar.y;
  if(szer < 30 || wys < 30) return gniazda;

  /* Punkt na płaszczyźnie frontu dla współrzędnych (u = w poprzek, v = w górę). */
  const naFroncie = (u, v) => srodek.clone()
    .addScaledVector(bok, u)
    .addScaledVector(gora, v)
    .addScaledVector(przod, gleb/2 + 2);

  const NU = Math.max(2, Math.floor(szer/KROK));
  const NV = Math.max(2, Math.floor(wys/KROK));
  const promien = new THREE.Raycaster();
  promien.far = gleb + 12;
  const wneka = new Uint8Array(NU*NV);
  const glebokosci = new Float32Array(NU*NV);

  for(let iv = 0; iv < NV; iv++){
    for(let iu = 0; iu < NU; iu++){
      const u = -szer/2 + (iu + .5)*(szer/NU);
      const v = -wys/2  + (iv + .5)*(wys/NV);
      promien.set(naFroncie(u, v), przod.clone().multiplyScalar(-1));
      const traf = promien.intersectObject(korzen, true);
      /* Brak trafienia = prześwit na wylot, też traktujemy jak wnękę. */
      const glebokosc = traf.length ? traf[0].distance - 2 : gleb;
      glebokosci[iv*NU + iu] = glebokosc;
      if(glebokosc >= PROG_GLEBOKOSCI) wneka[iv*NU + iu] = 1;
    }
  }

  /* Sklejanie sąsiadujących komórek w prostokąty (zalewanie). */
  const odwiedzone = new Uint8Array(NU*NV);
  const obszary = [];
  for(let iv = 0; iv < NV; iv++){
    for(let iu = 0; iu < NU; iu++){
      const i0 = iv*NU + iu;
      if(!wneka[i0] || odwiedzone[i0]) continue;
      let minU = iu, maxU = iu, minV = iv, maxV = iv, ile = 0, sumaGleb = 0;
      const stos = [i0];
      odwiedzone[i0] = 1;
      while(stos.length){
        const i = stos.pop(), cu = i % NU, cv = (i - cu)/NU;
        ile++; sumaGleb += glebokosci[i];
        if(cu < minU) minU = cu; if(cu > maxU) maxU = cu;
        if(cv < minV) minV = cv; if(cv > maxV) maxV = cv;
        for(const [du, dv] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nu = cu+du, nv = cv+dv;
          if(nu < 0 || nv < 0 || nu >= NU || nv >= NV) continue;
          const j = nv*NU + nu;
          if(wneka[j] && !odwiedzone[j]){ odwiedzone[j] = 1; stos.push(j); }
        }
      }
      const szerW = (maxU - minU + 1)*(szer/NU);
      const wysW  = (maxV - minV + 1)*(wys/NV);
      if(ile*(szer/NU)*(wys/NV) < MIN_POLE || szerW < 18 || wysW < 18) continue;

      /* Listwa siedzi przy TYLNEJ ściance wnęki, nie przy froncie: profil LED
         jest wpuszczony w tylny wieniec i myje wnętrze do przodu i w dół.
         Postawiona przy froncie świeciła w pustkę i praktycznie nie było jej widać.
         Głębokość bierzemy ze zmierzonych promieni, a nie z grubości mebla —
         wnęka bywa płytsza niż korpus. */
      const glebWneki = Math.min(gleb - 2, sumaGleb/ile);
      const uSrodek = -szer/2 + ((minU + maxU)/2 + .5)*(szer/NU);

      /* Na referencji duża wnęka świeci OD GÓRY I OD DOŁU — poświata obrysowuje
         otwór jak ramka. Wysoka wnęka dostaje dodatkowo listwy pośrednie, bo tam
         świeci każda półka, a nie tylko szczyt jednego wielkiego otworu.

         Duża powierzchnia świecąca = miękka poświata. Wąski pasek 2,5 cm przy
         mocy 260 dawał twarde punkty i stożki; szeroki, słaby panel rozkłada
         światło równo. */
      const ileGornych = Math.max(1, Math.round(wysW / 78));
      /* Profil siedzi pod górną krawędzią OTWORU, cofnięty ok. 8 cm za front —
         nie przy tylnej ściance. Stamtąd światło muska tylny panel z góry i
         schodzi po nim równomiernie, tak jak na referencji. Postawiony głęboko
         świecił w boczne ścianki i zostawiał na nich jasne kliny. */
      const wysPanelu = 3.5;
      const szerPanelu = Math.max(10, szerW - 8);
      const zaFrontem = gleb/2 - Math.min(9, glebWneki*0.35);

      const postaw = (vPoz, wDol) => {
        const poz = srodek.clone()
          .addScaledVector(bok, uSrodek)
          .addScaledVector(gora, vPoz)
          .addScaledVector(przod, zaFrontem);
        /* Nie tworzymy tu światła — tylko OPIS GNIAZDA. Prawdziwych źródeł
           jest kilka i wędrują do najbliższych gniazd (patrz pula niżej). */
        /* Kąt świecenia: 22° od poziomu, głównie W GŁĄB wnęki, ku tylnej ściance.
           Poprzednio było 63° (przod −20, gora ±40), czyli listwa świeciła
           prawie pionowo w dół i zostawiała jasną plamę tuż pod sobą zamiast
           równomiernie myć tylny panel. tan(22°) ≈ 0,404, stąd 40 : 16. */
        gniazda.push({poz, cel: poz.clone().addScaledVector(przod, -40)
                                    .addScaledVector(gora, wDol ? -16 : 16),
                      szer: szerPanelu, wys: wysPanelu, rodzaj: 'wneka'});
      };

      const wysKomorki = wys/NV;
      for(let n = 0; n < ileGornych; n++)
        postaw(-wys/2 + (maxV + .8 - n*((maxV-minV+1)/ileGornych))*wysKomorki, true);
      /* Listwa dolna tylko dla wnęk na tyle wysokich, żeby ramka miała sens. */
      if(wysW > 45) postaw(-wys/2 + (minV + .2)*wysKomorki, false);
      obszary.push({minU, maxU, minV, maxV, uSrodek, szerW, glebWneki});
    }
  }
  /* ---------- LISTWY POD PÓŁKAMI ----------
     Na referencji świeci nie tylko górna krawędź otworu: pod SPODEM każdej półki
     biegnie profil, który oświetla komorę poniżej. Bez tego dolne komory zostają
     ciemne, a to właśnie one najbardziej rzucają się w oczy przy porównaniu.

     Półki znajdujemy w geometrii mebla: cienkie w pionie, szerokie i głębokie
     bryły, których czoło jest cofnięte za front — czyli leżące wewnątrz wnęki. */
  const wPolu = (u, v) => obszary.some(o =>
    u >= -szer/2 + o.minU*(szer/NU) - 6 && u <= -szer/2 + (o.maxU+1)*(szer/NU) + 6 &&
    v >= -wys/2  + o.minV*(wys/NV)  - 6 && v <= -wys/2  + (o.maxV+1)*(wys/NV)  + 6);

  const pudlo = new THREE.Box3(), rozm = new THREE.Vector3(), sr = new THREE.Vector3();
  korzen.traverse(o => {
    if(!o.isMesh || gniazda.length > 60) return;
    pudlo.setFromObject(o);
    pudlo.getSize(rozm); pudlo.getCenter(sr);
    const gruboscPion = rozm.y;
    const rozpietosc = Math.max(rozm.x, rozm.z);
    if(gruboscPion > 6 || rozpietosc < 22) return;          // to nie półka
    const wzgl = sr.clone().sub(srodek);
    const u = wzgl.dot(bok), v = wzgl.dot(gora), d = wzgl.dot(przod);
    const czolo = d + Math.abs(rozm.x*przod.x) / 2 + Math.abs(rozm.z*przod.z) / 2;
    if(gleb/2 - czolo < PROG_GLEBOKOSCI - 4) return;        // półka nie leży we wnęce
    if(!wPolu(u, v)) return;

    const szerPolki = Math.abs(rozm.x*bok.x) + Math.abs(rozm.z*bok.z);
    const poz = srodek.clone()
      .addScaledVector(bok, u)
      .addScaledVector(gora, v - gruboscPion/2 - 1.2)
      .addScaledVector(przod, czolo - 7);
    /* Pod półką ten sam kąt: w głąb i lekko w dół, żeby światło szło po tylnej
       ściance komory, a nie prosto w blat poniżej. */
    gniazda.push({poz, cel: poz.clone().addScaledVector(przod, -40).addScaledVector(gora, -16),
                  szer: Math.max(8, szerPolki - 6), wys: 3, rodzaj: 'polka'});
  });

  return gniazda;
}

/* ============================================================
   PULA ŚWIATEŁ + EMISYJNE PASKI
   ------------------------------------------------------------
   RectAreaLight liczy się PER PIKSEL, z transformacją LTC. Trzydzieści listew
   w meblach plus lampy sufitowe i okna dawało 43 źródła obszarowe i ~2 sekundy
   na klatkę. ClusteredLightsNode z r185 tego nie ratuje — klasteryzuje wyłącznie
   światła punktowe bez cienia.

   Rozwiązanie rozdziela dwie rzeczy, które wcześniej robiło jedno światło:

   1. WIDOCZNA POŚWIATA — cienki pasek z materiałem emisyjnym w każdym gnieździe.
      Kosztuje jedno wywołanie rysowania, zero kosztu na piksel oświetlenia,
      a że silnik liczy bloom z bufora emisji i SSGI roznosi emisję po scenie,
      sąsiednie powierzchnie i tak dostają ciepły odblask.

   2. RZECZYWISTE ŚWIATŁO — mała, STAŁA pula RectAreaLightów, które wędrują do
      gniazd najbliższych kamerze. Stała liczba jest tu kluczowa: zmiana liczby
      świateł w scenie unieważnia materiały i wymusza rekompilację shaderów,
      więc gaszenie świateł co klatkę byłoby lekarstwem gorszym od choroby.
   ============================================================ */

export function odswiezOswietlenieMebli({THREE, biblioteka, scena, poprzednie = null,
                                         ilePuli = 6, kolor = 0xffc582, moc = 170}){
  /* Sprzątanie po poprzednim wywołaniu. */
  if(poprzednie){
    for(const m of poprzednie.paski || []){ scena.remove(m); m.geometry.dispose(); }
    poprzednie.materialPaska?.dispose?.();
  }

  const gniazda = [];
  for(const wpis of biblioteka?.meble?.values?.() || []){
    if(!wpis.korzen) continue;
    gniazda.push(...oswietlWneki({THREE, korzen: wpis.korzen, scena, kolor, moc}));
  }

  /* Jeden materiał na wszystkie paski — jeden pipeline. */
  const materialPaska = new THREE.MeshStandardMaterial({
    /* Emisja celowo umiarkowana: pasek trafia do bufora koloru, z którego SSGI
       zbiera światło pośrednie. Zbyt jasny punkt daje świetliki i plamy, których
       odszumianie nie usuwa — a widoczną poświatę i tak niosą światła z puli. */
    color: 0x000000, emissive: new THREE.Color(kolor), emissiveIntensity: 1.9,
    roughness: 1, metalness: 0, toneMapped: true
  });
  materialPaska.name = 'Pasek LED';

  const paski = [];
  const pom = new THREE.Object3D();
  for(const g of gniazda){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(g.szer, Math.min(g.wys, 2.2)), materialPaska);
    m.position.copy(g.poz);
    pom.position.copy(g.poz); pom.lookAt(g.cel);
    m.quaternion.copy(pom.quaternion);
    m.castShadow = m.receiveShadow = false;
    m.name = 'Pasek LED';
    scena.add(m);
    paski.push(m);
  }

  /* Pula świateł — tworzona RAZ i nigdy nie zmieniająca liczności. */
  const pula = poprzednie?.pula;
  const swiatla = pula || Array.from({length: ilePuli}, () => {
    const l = new THREE.RectAreaLight(kolor, 0, 10, 3);
    l.name = 'LED (pula)';
    scena.add(l);
    return l;
  });

  let ostatniaKam = new THREE.Vector3(NaN, NaN, NaN);

  /* Przypisanie puli do najbliższych gniazd. Robione tylko wtedy, gdy kamera
     ruszy się o ponad pół metra — przestawianie co klatkę nic by nie dało. */
  function aktualizuj(kamera){
    if(!gniazda.length){ swiatla.forEach(l => { l.intensity = 0; }); return; }
    if(ostatniaKam.distanceToSquared(kamera.position) < 2500) return;
    ostatniaKam.copy(kamera.position);

    const posortowane = gniazda
      .map(g => ({g, d: g.poz.distanceToSquared(kamera.position)}))
      .sort((a, b) => Number(b.g.rodzaj === 'biblioteka') - Number(a.g.rodzaj === 'biblioteka') || a.d - b.d);

    swiatla.forEach((l, i) => {
      const wpis = posortowane[i];
      if(!wpis){ l.intensity = 0; return; }
      const g = wpis.g;
      l.position.copy(g.poz);
      l.width = g.szer; l.height = g.wys;
      l.lookAt(g.cel); // Światło świeci w -Z; pomocniczy Object3D patrzył w +Z.
      l.intensity = moc;
    });
  }

  return {gniazda, paski, pula: swiatla, materialPaska, aktualizuj,
          ileGniazd: gniazda.length, ileSwiatel: swiatla.length};
}
