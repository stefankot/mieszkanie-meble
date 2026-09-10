/* ============================================================
   NIEDOSKONAŁOŚCI POWIERZCHNI — warstwa generatywna w TSL
   ------------------------------------------------------------
   Odtworzenie warstwy, która w wersji WebGL wchodziła przez onBeforeCompile
   i przy przejściu na WebGPU przepadła, bo NodeMaterial tego haka nie zna.

   Wszystko liczone jest w PRZESTRZENI ŚWIATA, nie w UV. Dzięki temu:
   · wzór nie powtarza się razem z teksturą i nie tworzy widocznej kratki,
   · sąsiednie formatki dostają inne zabrudzenie, choć dzielą jedną teksturę,
   · działa na każdej geometrii, także bez sensownych UV.

   Pięć warstw, każda odpowiada jednej rzeczy z natury:

   1. PRZEBARWIENIA  — bardzo niska częstotliwość: drewno z różnych partii,
                       farba kładziona wałkiem w kilku nawrotach.
   2. CHROPOWATOŚĆ   — plamy matu i satyny; żadna prawdziwa powierzchnia nie ma
                       jednej wartości roughness na całym polu.
   3. PRZYBRUDZENIA  — kurz osiada na powierzchniach zwróconych do góry i zbiera
                       się przy podłodze; brud przyciemnia i matowi.
   4. WYTARCIA       — miejsca dotykane są gładsze i jaśniejsze: klamki, krawędzie,
                       pas na wysokości dłoni.
   5. GEOMETRIA      — patrz skrzywFormatki(): formatki lekko poza pionem.
   ============================================================ */

import { positionWorld, normalWorld, mx_fractal_noise_float, mx_worley_noise_float, mx_noise_float,
         float, vec3, texture, mix, smoothstep, clamp, uniform } from 'three/tsl';
import { wlaczone } from './flagi.js';

/* P4: jedna zmienna A/B. Chropowatość i geometria nie zależą od przełącznika. */
const wariacjaKoloru = uniform(new URLSearchParams(globalThis.location?.search || '')
  .get('imperfections') === 'color-off' ? 0 : 1);
export function ustawWariacjeKoloru(wlacz){
  wariacjaKoloru.value = wlacz ? 1 : 0;
  return wariacjaKoloru.value;
}

/* Domyślne natężenia. Wszystkie celowo małe — niedoskonałość ma być widoczna
   dopiero wtedy, gdy się jej szuka. Przesada wygląda jak brud, nie jak realizm. */
const PROFILE = {
  drewno:  {przebarwienie: .055, chropowatosc: .13, brud: .05, wytarcie: .10, skalaBrudu: .012},
  parkiet: {przebarwienie: .070, chropowatosc: .16, brud: .10, wytarcie: .16, skalaBrudu: .010},
  tynk:    {przebarwienie: .045, chropowatosc: .10, brud: .06, wytarcie: .03, skalaBrudu: .008},
  lakier:  {przebarwienie: .030, chropowatosc: .09, brud: .04, wytarcie: .07, skalaBrudu: .014}
};

export function dodajNiedoskonalosci(material, rodzaj = 'drewno', przesuniecie = 0){
  /* P31: ?bez=niedoskonalosci — pomiar kosztu warstwy (11 oktaw szumu 3D na piksel). */
  if(!wlaczone('niedoskonalosci')) return material;
  const p = PROFILE[rodzaj] || PROFILE.drewno;
  const q = positionWorld.add(vec3(przesuniecie, przesuniecie * .7, przesuniecie * 1.3));

  /* 1. PRZEBARWIENIA — skala ~1,7 m, więc plamy są większe niż formatka. */
  /* P31: tańszy szum — 6 oktaw zamiast 11 i bez Worleya; ?bez=szumtani wraca do pełnego. */
  const tani = wlaczone('szumtani');
  const plama = mx_fractal_noise_float(q.mul(0.006), tani ? 2 : 3, 2.0, 0.5);

  /* 2. CHROPOWATOŚĆ — worley daje płaty o wyraźnych granicach, jak ślady
        polerowania albo nierówno rozprowadzony olej. */
  const platy = tani
    ? smoothstep(float(.3), float(.7), mx_noise_float(q.mul(0.02)).mul(.5).add(.5))   // płaty z progowanego szumu
    : mx_worley_noise_float(q.mul(0.02), 1.0, 1);
  const drobne = mx_fractal_noise_float(q.mul(0.09), tani ? 2 : 4, 2.0, 0.5);

  /* 3. PRZYBRUDZENIA — kurz osiada na tym, co zwrócone do góry, i gromadzi się
        przy podłodze. Poniżej 25 cm brud narasta, powyżej 120 cm zanika. */
  const doGory = clamp(normalWorld.y, 0, 1);
  const przyPodlodze = smoothstep(float(120), float(25), positionWorld.y);
  const zabrudzenie = mx_fractal_noise_float(q.mul(p.skalaBrudu), tani ? 2 : 4, 2.0, 0.5)
                        .mul(.5).add(.5)
                        .mul(doGory.mul(.6).add(przyPodlodze.mul(.7)).add(.15));

  /* 4. WYTARCIA — pas na wysokości dłoni (70–110 cm) i powierzchnie pionowe.
        Tam, gdzie się dotyka, powierzchnia jest gładsza i odrobinę jaśniejsza. */
  const wysokoscDloni = smoothstep(float(55), float(85), positionWorld.y)
                          .mul(smoothstep(float(125), float(95), positionWorld.y));
  const pionowa = clamp(float(1).sub(normalWorld.y.abs()), 0, 1);
  const wytarcie = wysokoscDloni.mul(pionowa).mul(drobne.mul(.5).add(.5));

  /* --- KOLOR --- */
  const bazaKoloru = material.colorNode
    ? material.colorNode
    : (material.map ? texture(material.map).rgb : vec3(material.color.r, material.color.g, material.color.b));

  const jasnosc = float(1)
    .add(plama.mul(p.przebarwienie))            // przebarwienia w obie strony
    .sub(zabrudzenie.mul(p.brud))               // brud przyciemnia
    .add(wytarcie.mul(p.wytarcie * .45));       // wytarcie rozjaśnia

  /* Brud jest lekko chłodny i szary — ściąga barwę w stronę neutralnej. */
  const poBrudzie = mix(bazaKoloru, vec3(0.38, 0.37, 0.35), zabrudzenie.mul(p.brud * 1.4));
  material.colorNode = mix(bazaKoloru, poBrudzie.mul(jasnosc).clamp(0, 1), wariacjaKoloru);

  /* --- CHROPOWATOŚĆ --- */
  const bazaChrop = material.roughnessMap
    ? texture(material.roughnessMap).g.mul(material.roughness)
    : float(material.roughness);

  material.roughnessNode = bazaChrop
    .add(platy.sub(.5).mul(p.chropowatosc))     // płaty matu i satyny
    .add(drobne.sub(.5).mul(p.chropowatosc * .4))
    .add(zabrudzenie.mul(p.brud * 2.2))         // brud zawsze matowi
    .sub(wytarcie.mul(p.wytarcie))              // wytarcie wygładza
    .clamp(0.05, 1.0);

  material.userData.niedoskonalosci = rodzaj;
  return material;
}

/* ------------------------------------------------------------
   GEOMETRIA: formatki lekko poza pionem.

   Prawdziwa zabudowa nie jest zmontowana z dokładnością CAD — fronty mają
   ułamki stopnia luzu na zawiasach i dziesiąte części milimetra różnicy
   w osadzeniu. Bez tego wszystkie krawędzie są matematycznie równoległe
   i oko natychmiast czyta render.

   Odchyłki są DETERMINISTYCZNE (z położenia bryły), więc mebel wygląda tak
   samo po każdym przeładowaniu — i mieszczą się w tolerancji stolarskiej,
   więc nic nie zaczyna kolidować ani odstawać.
   ------------------------------------------------------------ */
const KAT_MAX = 0.0022;   // rad ≈ 0,13°
const PRZESUW_MAX = 0.045; // cm ≈ 0,45 mm

export function skrzywFormatki(korzen, THREE){
  let zmienione = 0;
  korzen.traverse(o => {
    if(!o.isMesh || o.userData.skrzywione) return;
    const p = o.position;
    const ziarno = Math.abs(Math.sin(p.x*12.9898 + p.y*78.233 + p.z*37.719) * 43758.5453);
    const los = k => { const v = Math.abs(Math.sin(ziarno*(k+1)*7.13) * 9973.17); return (v - Math.floor(v))*2 - 1; };
    o.rotation.x += los(1)*KAT_MAX;
    o.rotation.y += los(2)*KAT_MAX;
    o.rotation.z += los(3)*KAT_MAX;
    o.position.x += los(4)*PRZESUW_MAX;
    o.position.y += los(5)*PRZESUW_MAX;
    o.position.z += los(6)*PRZESUW_MAX;
    o.userData.skrzywione = true;
    zmienione++;
  });
  return zmienione;
}
