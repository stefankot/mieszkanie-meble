/* Moduły: każdy mebel w scenie jest modułem — samodzielnym bytem z własnym kompletem
   parametrów, który może być zakotwiczony w innym (bok, góra, dół). Kotwica zastępuje
   łańcuch „bok w bok": to ona wylicza położenie, więc narożnik typu L da się opisać wprost.

   Obroty są wielokrotnością 90°, więc obrysy zostają równoległe do osi i cała matematyka
   sprowadza się do dodawania. Jednostki: mm, początek na podłodze, +Z = front. */
import {stan} from './dane.js';

export const STRONY = {
  prawo:   {nazwa: 'Right',  os: 'x', znak: 1},
  lewo:    {nazwa: 'Left',   os: 'x', znak: -1},
  gora:    {nazwa: 'Top',    os: 'y', znak: 1},
  dol:     {nazwa: 'Bottom', os: 'y', znak: -1},
  wnetrze: {nazwa: 'Inside', os: 'w', znak: 0}
};

/* Moduł osadzony w komórce rodzica: nie ma własnego korpusu, tylko jedną definicję z dokumentu
   bazowego rodzica (biurko, nisza, drzwi) rozwiniętą na wymiary tej komórki. Dzięki temu biurko
   i koralowa nisza są osobnymi bytami z własnym kolorem, a nie ustawieniem komórki. */
/* Moduł z definicją JEST osadzony — nie ma własnego korpusu, więc nie da się go „odczepić"
   na bok zmianą strony. Pytanie o `strona` samo w sobie tego nie rozstrzyga. */
export const wSrodku = m => !!m?.definicja && !!m?.kotwica;

/* Rozwinięcie wyrażeń {cell:'w'|'h'|'d'} z definicji — ten sam zapis, co w silniku. */
export const wymiarKomorki = (v, k) => typeof v === 'number' ? v
  : (v && typeof v === 'object' && ['w', 'h', 'd'].includes(v.cell)) ? k[v.cell] * (v.mul ?? 1) + (v.addMm ?? 0)
  : 0;

/* Do czego moduł osadzony się odnosi: do komórki gospodarza albo do całej jego bryły.
   Prostokąt w układzie lokalnym rodzica — środek i wymiary, wszystko w mm. */
export function odniesienieModulu(m, rodzic, komorki){
  const k = m.kotwica || {};
  if(k.wzgledem !== 'bryla'){
    const kom = (komorki || []).find(c => `r${c.r}c${c.c}` === k.komorka);
    if(kom) return {x: kom.x, y: kom.y, z: kom.z || 0, w: kom.w, h: kom.h, d: kom.d};
  }
  /* Bryła gospodarza: początek układu leży na podłodze pośrodku, więc środek w pionie
     wypada na połowie wysokości. */
  return {x: 0, y: (rodzic?.wysokoscMm || 0) / 2, z: 0,
          w: rodzic?.szerokoscMm || 0, h: rodzic?.wysokoscMm || 0, d: rodzic?.glebokoscMm || 0};
}

export const WYROWNANIE_X = {lewo: 'Left', srodek: 'Center', prawo: 'Right'};
export const WYROWNANIE_Y = {dol: 'Bottom', srodek: 'Middle', gora: 'Top'};

/* Części modułu osadzonego, w układzie lokalnym rodzica. Definicja rozwija się na wymiarach
   odniesienia, a potem cała przesuwa tak, żeby wskazana krawędź modułu zrównała się ze
   wskazaną krawędzią odniesienia — stąd „równo do dołu" bez zgadywania milimetrów. */
export function czesciOsadzone(m, definicja, odniesienie, material){
  if(!definicja?.parts || !odniesienie) return [];
  const k = {w: odniesienie.w || 0, h: odniesienie.h || 0, d: odniesienie.d || 0};
  const liczba = v => Number.isFinite(v) ? v : 0;
  const surowe = definicja.parts.map((cz, i) => ({
    ...cz,
    id: `${m.id}-${cz.id || i}`,
    material: material || m.material || cz.material,
    sizeMm: (cz.sizeMm || []).map(v => Math.max(1, liczba(wymiarKomorki(v, k)))),
    positionMm: (cz.positionMm || [0, 0, 0]).map(v => liczba(wymiarKomorki(v, k)))
  }));
  if(!surowe.length) return surowe;

  const skraj = os => surowe.reduce((a, cz) => [
    Math.min(a[0], cz.positionMm[os] - cz.sizeMm[os] / 2),
    Math.max(a[1], cz.positionMm[os] + cz.sizeMm[os] / 2)
  ], [Infinity, -Infinity]);
  const [minX, maxX] = skraj(0), [minY, maxY] = skraj(1), [, maxZ] = skraj(2);
  const kot = m.kotwica || {};
  const pol = o => ({x: odniesienie.w, y: odniesienie.h, z: odniesienie.d}[o] || 0) / 2;

  const doX = {
    lewo:   odniesienie.x - pol('x') - minX,
    prawo:  odniesienie.x + pol('x') - maxX,
    srodek: odniesienie.x - (minX + maxX) / 2
  }[kot.poziomo || 'srodek'] + (kot.przesunX || 0);
  const doY = {
    dol:    odniesienie.y - pol('y') - minY,
    gora:   odniesienie.y + pol('y') - maxY,
    srodek: odniesienie.y - (minY + maxY) / 2
  }[kot.pionowo || 'srodek'] + (kot.przesunY || 0);
  /* W głąb: lico modułu równa się z licem odniesienia, a `wysunMm` wypycha je do przodu. */
  const doZ = odniesienie.z + pol('z') - maxZ + (m.wysunMm || 0);

  return surowe.map(cz => ({...cz,
    positionMm: [cz.positionMm[0] + doX, cz.positionMm[1] + doY, cz.positionMm[2] + doZ]}));
}

let licznik = 0;
export const nowyId = () => `m${Date.now().toString(36)}${(licznik++).toString(36)}`;

export const modul = id => stan.meble.find(m => m.id === id) || null;
export const dzieci = id => stan.meble.filter(m => m.kotwica?.do === id);
export const rodzic = id => modul(modul(id)?.kotwica?.do);
export const korzenie = () => stan.meble.filter(m => !m.kotwica);

/* Ścieżka od korzenia do modułu — okruszki i wychodzenie Esc idą po niej. */
export function sciezkaDo(id){
  const droga = [];
  for(let m = modul(id); m && !droga.includes(m.id); m = rodzic(m.id)) droga.unshift(m.id);
  return droga;
}
export const poziom = id => sciezkaDo(id).length - 1;

/* Zawieranie to co innego niż przyleganie: moduł osadzony (`wnetrze`) siedzi w środku
   gospodarza, ale moduł przystawiony bokiem czy postawiony na innym jest sąsiadem, nie
   zawartością. Klik w scenie bierze najbardziej zewnętrzny pojemnik, a dwuklik schodzi
   o jeden poziom zawierania — dokładnie jak wchodzenie w grupę w Figmie. */
export function sciezkaZawierania(id){
  const droga = [];
  for(let m = modul(id); m && !droga.includes(m.id); m = wSrodku(m) ? modul(m.kotwica.do) : null)
    droga.unshift(m.id);
  return droga;
}

/* Kolejność do listy i do budowania: korzenie w kolejności dodania, pod każdym jego dzieci. */
export function wszystkieWKolejnosci(){
  const wynik = [];
  const zejdz = m => { wynik.push(m); dzieci(m.id).forEach(zejdz); };
  korzenie().forEach(zejdz);
  for(const m of stan.meble) if(!wynik.includes(m)) wynik.push(m);   // sierota po skasowanym rodzicu
  return wynik;
}

/* Obrys bryły w rzucie z góry. Przy obrocie 90° i 270° szerokość biegnie wzdłuż Z. */
export function obrysModulu(m, x, z){
  const wzdluzX = (m.obrot || 0) % 180 === 0;
  const sx = wzdluzX ? m.szerokoscMm : m.glebokoscMm;
  const sz = wzdluzX ? m.glebokoscMm : m.szerokoscMm;
  return {x1: x - sx / 2, x2: x + sx / 2, z1: z - sz / 2, z2: z + sz / 2, sx, sz};
}

/* Połowa bryły wzdłuż podanej osi świata — ile trzeba odsunąć środek od płaszczyzny styku. */
function polowaWzdluz(m, os){
  const wzdluzX = (m.obrot || 0) % 180 === 0;
  if(os === 'y') return m.wysokoscMm / 2;
  return (wzdluzX ? m.szerokoscMm : m.glebokoscMm) / 2;
}

/* Położenie modułu wynikające z kotwicy. `przesun` przesuwa wzdłuż ściany styku, `poziomuj`
   mówi, czym równać przy boku: plecami (domyślnie) czy licem. */
export function zKotwicy(m, r, poz){
  const k = m.kotwica;
  /* Moduł osadzony siedzi w bryle rodzica — jego części liczy się w układzie rodzica,
     więc sam moduł stoi dokładnie tam, gdzie rodzic. */
  if(wSrodku(m)) return {...poz};
  const strona = STRONY[k.strona] || STRONY.prawo;
  const obrysR = obrysModulu(r, poz.x, poz.z);
  const przesun = k.przesun || 0;
  if(strona.os === 'y'){
    const y = strona.znak > 0 ? poz.y + r.wysokoscMm : poz.y - m.wysokoscMm;
    return {x: poz.x + przesun, y, z: poz.z};
  }
  /* Bok: środek odsunięty o połowę własnej bryły od lica rodzica, plecy w jednej linii. */
  const x = strona.znak > 0 ? obrysR.x2 + polowaWzdluz(m, 'x') : obrysR.x1 - polowaWzdluz(m, 'x');
  const glebR = obrysR.z2 - obrysR.z1, glebM = obrysModulu(m, 0, 0).sz;
  const doTylu = k.poziomuj === 'lico' ? (glebR - glebM) / 2 : (glebM - glebR) / 2;
  return {x, y: poz.y, z: poz.z + doTylu + przesun};
}

/* Rozmieszczenie całej sceny: korzenie idą łańcuchem bok w bok (albo mają własne `pozycjaMm`),
   dzieci liczą się z kotwic. Zwraca mapę id → {x, y, z}. */
export function rozmiescModuly(odstep = 0){
  const poz = new Map();
  let kx = 0;
  for(const m of korzenie()){
    const o = obrysModulu(m, 0, 0);
    const srodek = Array.isArray(m.pozycjaMm)
      ? {x: m.pozycjaMm[0], y: 0, z: m.pozycjaMm[1]}
      : {x: kx + o.sx / 2, y: 0, z: o.sz / 2};
    poz.set(m.id, srodek);
    kx = Math.max(kx, srodek.x + o.sx / 2 + odstep);
  }
  const zejdz = r => {
    for(const d of dzieci(r.id)){
      if(poz.has(d.id)) continue;                      // pętla w kotwicach — nie zapętlam się
      poz.set(d.id, zKotwicy(d, r, poz.get(r.id)));
      zejdz(d);
    }
  };
  korzenie().forEach(zejdz);
  for(const m of stan.meble) if(!poz.has(m.id)) poz.set(m.id, {x: 0, y: 0, z: 0});
  return poz;
}

/* Nazwa w liście: własna albo wymiary, tak jak nazywa się warstwy w Figmie. */
export const nazwaModulu = m => m.nazwa || `${Math.round(m.szerokoscMm / 10)}×${Math.round(m.wysokoscMm / 10)}`;

/* Do kogo można się przykleić — wszystko poza sobą i własnym potomstwem. */
export function mozliweKotwice(id){
  const zakazane = new Set();
  const zejdz = x => { zakazane.add(x); dzieci(x).forEach(d => zejdz(d.id)); };
  zejdz(id);
  return stan.meble.filter(m => !zakazane.has(m.id));
}
