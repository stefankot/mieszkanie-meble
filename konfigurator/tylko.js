/* Dane skopiowane z tylko.com: kategorie, linie, palety i proponowane układy startowe,
   plus przeliczanie ich gotowych projektów na opis mebla tego konfiguratora.

   Skąd co pochodzi:
   – kategorie i piktogramy: krok 1 kreatora (tylko.com/en-pl/configurator-intro?category=storage),
     obrazki leżą lokalnie w `ikony/`, bo media.tylko.com odrzuca żądania spoza ich strony;
   – linie (Original / Edge / Tone): krok 2 tego samego kreatora;
   – barwy: ich pliki `color-swatches/*.svg`, więc to dokładne wartości, nie odczyt z ekranu;
   – wymiary i podziały układów: prawdziwe projekty z `api/v1/watty_configurator/<id>/`. */
import {KOLORY} from './dane.js';

/* Indeks w KOLORY po nazwie Tylko. Kilka nazw spotyka się w jednym odcieniu (Sand i Beige
   to ten sam #dbd3cb), więc mapuję nazwy, a nie odwrotnie. */
const NAZWA_NA_INDEKS = {
  'white': 0, 'cotton': 1, 'butter yellow': 2, 'sand': 3, 'beige': 3, 'grey': 4, 'gray': 4,
  'stone grey': 5, 'stone gray': 5, 'sage green': 6, 'sky blue': 7, 'lilac': 8,
  'reisinger pink': 9, 'olive green': 10, 'green': 10, 'terracotta': 11, 'burgundy': 12,
  'dark brown': 13, 'indigo': 14, 'midnight blue': 14, 'matte black': 15, 'black': 15,
  'cashmere beige': 16, 'cashmere': 16, 'graphite grey': 17, 'graphite': 17,
  'antique pink': 18, 'misty blue': 19, 'clay brown': 20, 'deep plum': 21,
  'dusk blue': 22, 'denim blue': 22, 'warm stone': 23
};
/* Druga połowa pary to wnętrze, a tam te same słowa znaczą co innego: „Gray” w „White and Gray”
   to ciepły kamień z palety wnętrz, nie grafit obudowy. Stąd osobna mapa dla drugiego członu. */
const WNETRZE_NA_INDEKS = {
  'antique pink': 18, 'pink': 18, 'stone grey': 23, 'stone gray': 23, 'grey': 23, 'gray': 23,
  'sage green': 6, 'green': 6, 'misty blue': 19, 'blue': 19, 'white': 0
};

/* „Cashmere Beige + Antique Pink” i „Gray and Blue” to ten sam zapis pary front + wnętrze. */
export function rozbierzBarwe(nazwa){
  const czesci = String(nazwa || '').split(/\s+(?:\+|and)\s+/i).map(s => s.trim().toLowerCase());
  const plywood = /plywood/.test(czesci[0]);
  const fornir = /wood effect|veneer/.test(czesci[0]);
  const czysty = czesci[0].replace(/\s*(plywood|wood effect|veneer)\s*/g, '').trim();
  return {
    kolor: NAZWA_NA_INDEKS[czysty] ?? (/dark/.test(czysty) ? 13 : 0),
    wnetrze: czesci[1] != null ? (WNETRZE_NA_INDEKS[czesci[1]] ?? null) : null,
    wykonczenie: plywood ? 'plywood' : fornir ? 'veneer' : 'board'
  };
}

const para = (nazwa, kolor, wnetrze) => ({nazwa, kolor, wnetrze});
const solo = nazwa => para(nazwa, NAZWA_NA_INDEKS[nazwa.toLowerCase()], null);

/* Palety linii. Original to lista z konfiguratora Type02 (ta sama, którą ma już `KOLORY`),
   Edge to zakładka „Colour” szafy Edge, Tone to pełna krata front × wnętrze z ich PLP. */
const TONE_FRONTY = [['White', 0], ['Cashmere Beige', 16], ['Graphite Grey', 17]];
const TONE_WNETRZA = [['', null], ['Antique Pink', 18], ['Stone Grey', 23], ['Sage Green', 6], ['Misty Blue', 19]];

export const PALETY = {
  original: KOLORY.slice(0, 16).map(([n]) => solo(n)),
  edge: ['White', 'Grey', 'Stone grey', 'Matte black', 'Sand', 'Clay brown',
         'Butter yellow', 'Olive green', 'Dusk blue', 'Indigo', 'Deep plum'].map(solo),
  tone: TONE_FRONTY.flatMap(([fn, fi]) => TONE_WNETRZA.map(([wn, wi]) =>
    para(wn ? `${fn} + ${wn}` : fn, fi, wi)))
};

export const LINIE = {
  original: {nazwa: 'Original', opis: 'Classic plywood in timeless colours with hand-oiled, exposed edges.'},
  edge:     {nazwa: 'Edge',     opis: 'Vertical lines, full-length aluminium details, generous fronts.'},
  tone:     {nazwa: 'Tone',     opis: 'Smooth fronts, soft tones and a colour-rich interior.'}
};

export const KATEGORIE = [
  {id: 'bookcase',    nazwa: 'Bookcases',    ikona: 'ikony/tylko-bookcase.webp',
   opis: 'Open plywood shelving — books, records, everything on show.'},
  {id: 'wallstorage', nazwa: 'Wall storage', ikona: 'ikony/tylko-wallstorage.webp',
   opis: 'Wall-to-wall grids that mix open cells with doors and drawers.'},
  {id: 'wardrobe',    nazwa: 'Wardrobes',    ikona: 'ikony/tylko-wardrobe.webp',
   opis: 'Full-height fronts, rails and internal drawers.'}
];

/* Układy startowe: wymiary i podziały przepisane z konkretnych projektów Tylko (`zrodlo`
   to ich numer). `rzed` jest proporcją — `wysokosciRzedow()` skaluje ją do wnętrza korpusu,
   więc mebel zawsze wychodzi dokładnie w podanej wysokości. */
export const UKLADY_STARTOWE = {
  bookcase: [
    {id: 'narrow', nazwa: 'Narrow', linia: 'original', zrodlo: 521669,
     w: 740, h: 1980, d: 270, kol: [722], rzed: [330, 330, 330, 330, 330, 330],
     uklady: {r1c1: 'door'}, nogi: 'none', plecy: true, wykonczenie: 'plywood'},
    {id: 'classic', nazwa: 'Classic', linia: 'original', zrodlo: 532154,
     w: 1530, h: 2280, d: 360, kol: [756, 756], rzed: [380, 320, 320, 320, 320, 320, 320],
     uklady: {r1c1: 'drawer', r1c2: 'drawer', r2c1: 'door', r2c2: 'door'},
     nogi: 'none', plecy: true, wykonczenie: 'plywood'},
    {id: 'pixel', nazwa: 'Pixel', linia: 'original', zrodlo: 1932478,
     w: 3100, h: 2290, d: 360, kol: [1028, 1027, 1027], rzed: [380, 300, 340, 300, 360, 300, 310],
     uklady: {r1c3: 'door', r3c1: 'door', r5c2: 'door', r7c3: 'door'},
     nogi: 'none', plecy: true, wykonczenie: 'board'},
    {id: 'slant', nazwa: 'Slant', linia: 'original', zrodlo: 1650847,
     w: 2100, h: 2280, d: 360, kol: [694, 694, 694], rzed: [400, 376, 376, 376, 376, 376],
     uklady: {r1c1: 'drawer', r1c3: 'drawer'}, nogi: 'none', plecy: true, wykonczenie: 'board'},
    {id: 'low', nazwa: 'Low unit', linia: 'original', zrodlo: 522196,
     w: 2430, h: 1380, d: 360, kol: [804, 804, 804], rzed: [360, 340, 340, 340],
     uklady: {r1c1: 'drawer', r1c2: 'drawer', r1c3: 'drawer'},
     nogi: 'none', plecy: true, wykonczenie: 'veneer'}
  ],
  wallstorage: [
    {id: 'pixel-wall', nazwa: 'Pixel wall', linia: 'original', zrodlo: 1933654,
     w: 2580, h: 1980, d: 360, kol: [854, 854, 854], rzed: [330, 330, 330, 330, 330, 330],
     uklady: {r1c3: 'door', r2c3: 'door', r5c3: 'door', r3c1: 'door', r6c2: 'door'},
     nogi: 'none', plecy: true, wykonczenie: 'board'},
    {id: 'grid-wall', nazwa: 'Grid wall', linia: 'original', zrodlo: 539931,
     w: 1980, h: 1980, d: 360, kol: [654, 654, 654], rzed: [340, 328, 328, 328, 328, 328],
     uklady: {r1c1: 'drawer', r1c2: 'drawer', r1c3: 'drawer'},
     nogi: 'none', plecy: true, wykonczenie: 'plywood'},
    {id: 'tall-wall', nazwa: 'Wall to wall', linia: 'original', zrodlo: 540446,
     w: 3140, h: 2280, d: 360, kol: [781, 781, 780, 780], rzed: [380, 320, 320, 320, 320, 320, 300],
     uklady: {r1c1: 'drawer', r1c2: 'drawer', r1c3: 'drawer', r1c4: 'drawer'},
     nogi: 'none', plecy: true, wykonczenie: 'board'},
    {id: 'compact', nazwa: 'Compact', linia: 'original', zrodlo: 521154,
     w: 1450, h: 1080, d: 450, kol: [716, 716], rzed: [360, 360, 360],
     uklady: {r1c1: 'door', r2c1: 'door', r3c1: 'door', r1c2: 'drawer'},
     nogi: 'none', plecy: true, wykonczenie: 'board'}
  ],
  wardrobe: [
    {id: 'edge-rail', nazwa: 'Rail + shelves', linia: 'edge', zrodlo: 1409889,
     w: 1990, h: 1980, d: 600, kol: [658, 657, 657], rzed: [1900],
     uklady: {r1c1: 'doorail', r1c2: 'doorail', r1c3: 'shelf3'},
     nogi: 'plinth', plecy: true, wykonczenie: 'board'},
    {id: 'edge-wide', nazwa: 'Wide Edge', linia: 'edge', zrodlo: 1936868,
     w: 2560, h: 1980, d: 450, kol: [848, 847, 847], rzed: [700, 1220],
     uklady: {r1c1: 'komoda', r2c1: 'doorail', r1c2: 'door', r2c2: 'door2',
              r1c3: 'door', r2c3: 'door2'},
     nogi: 'plinth', plecy: true, wykonczenie: 'board'},
    /* Układ „pixel”: pięć wąskich słupków i nierówny rytm rzędów — z niego wychodzi
       szafa ze zrzutu, w której fronty są porozrzucane po siatce. */
    {id: 'pixel-wardrobe', nazwa: 'Pixel', linia: 'edge', zrodlo: 1935036,
     w: 2930, h: 2380, d: 450, kol: [583, 583, 582, 582, 582], rzed: [560, 420, 460, 480, 460],
     uklady: {r1c1: 'door', r1c2: 'door', r1c3: 'door', r1c4: 'door', r1c5: 'door',
              r3c2: 'door', r5c1: 'door', r4c4: 'door', r2c5: 'door', r5c5: 'door'},
     nogi: 'plinth', plecy: true, wykonczenie: 'board'},
    {id: 'tone-full', nazwa: 'Full height', linia: 'tone', zrodlo: 62131,
     w: 2360, h: 3000, d: 630, kol: [927, 464, 927], rzed: [2900],
     uklady: {r1c1: 'doorail', r1c2: 'door2', r1c3: 'doorail'},
     nogi: 'plinth', plecy: true, wykonczenie: 'board'},
    {id: 'tone-wall', nazwa: 'Wall to wall', linia: 'tone', zrodlo: 70134,
     w: 3850, h: 2910, d: 530, kol: [952, 952, 952, 952], rzed: [2800],
     uklady: {r1c1: 'doorail', r1c2: 'doorail', r1c3: 'door2', r1c4: 'doorail'},
     nogi: 'plinth', plecy: true, wykonczenie: 'board'},
    {id: 'tone-single', nazwa: 'Single column', linia: 'tone', zrodlo: 92275,
     w: 600, h: 2750, d: 630, kol: [558], rzed: [700, 2000],
     uklady: {r1c1: 'komoda', r2c1: 'doorail'},
     nogi: 'plinth', plecy: true, wykonczenie: 'board'}
  ]
};

const cmTekst = lista => lista.map(v => String(+(v / 10).toFixed(1)).replace(/\.0$/, '')).join(' + ');

/* Wspólny szkielet opisu mebla — te same pola, których używa `mebleZOpisu` w szafa.js.
   Siatka kolumn idzie tekstem (skaluje się do szerokości), rzędy listą (skalują się do
   wnętrza), dzięki czemu mebel wychodzi dokładnie w wymiarach z Tylko. */
function opisMebla({id, nazwa, w, h, d, kol, rzed, uklady, nogi, plecy, wykonczenie, kolor, wnetrze}){
  return {
    id, nazwa, zrodlo: 'regal-lozko',
    szerokoscMm: w, wysokoscMm: h, glebokoscMm: d,
    styl: 'custom', siatkaKol: cmTekst(kol), siatkaRzed: '',
    kolumnyWlasne: null, rzedyWlasne: [...rzed],
    kolor, kolorWnetrza: wnetrze ?? null, wykonczenie, drewno: null,
    dodatki: 0, roslina: 'brak', nadstawka: false, obrot: 0,
    plecy, nogi, nozkiMm: 0, nozkiKolor: 0,
    uklady: {...uklady}, wneki: [],
    kotwica: null, pozycjaMm: null, materialKorpusu: null, definicja: null,
    wzorzec: null, odstepstwa: []
  };
}

/* Układ startowy + wybrana barwa i wymiary z kreatora → jednoelementowy projekt. */
export function opisZUkladu(uklad, barwa, wymiary = {}){
  return [opisMebla({
    id: 'tylko-' + uklad.id, nazwa: `${uklad.nazwa} · ${barwa.nazwa}`,
    w: wymiary.w ?? uklad.w, h: wymiary.h ?? uklad.h, d: wymiary.d ?? uklad.d,
    kol: uklad.kol, rzed: uklad.rzed, uklady: uklad.uklady,
    nogi: uklad.nogi, plecy: uklad.plecy, wykonczenie: uklad.wykonczenie,
    kolor: barwa.kolor, wnetrze: barwa.wnetrze
  })];
}

/* ---------- import gotowych projektów Tylko ---------- */
/* Ich `components` niosą prawdziwe szerokości słupków i liczniki zawartości, ale nie
   wysokości półek — te są dopiero w 800-kilobajtowym DNA, którego nie ma sensu wozić.
   Odtwarzam więc rytm: liczba komór najgęstszego słupka wyznacza rzędy, a `doors_coverage`
   mówi, dokąd sięga front. To przybliżenie i kreator mówi o tym wprost. */
function ukladSlupka(komory, drzwi, drazki){
  if(drazki > 0) return drzwi > 0 ? 'doorail' : 'rail';
  const polki = Math.max(0, Math.min(drzwi > 0 ? 2 : 3, komory - 1));
  return drzwi > 0 ? ['door', 'door1', 'door2'][polki] : ['open', 'shelf1', 'shelf2', 'shelf3'][polki];
}

export function siatkaProjektu(p){
  const drazkiSa = p.sl.some(s => s[4] > 0);
  const szufladySa = p.sl.some(s => s[2] > 0);
  const maxKomor = Math.min(8, Math.max(1, ...p.sl.map(s => s[0] || 1)));
  /* Szafa z drążkiem to jeden wysoki otwór (plus pas szuflad), regał — tyle rzędów,
     ile najgęstszy słupek ma komór. */
  const rzedow = drazkiSa ? (szufladySa ? 2 : 1) : maxKomor;
  const wysRzedu = Math.round((p.h - (szufladySa && drazkiSa ? 400 : 0)) / Math.max(1, rzedow - (szufladySa && drazkiSa ? 1 : 0)));
  const rzed = drazkiSa && szufladySa ? [400, p.h - 400]
             : Array.from({length: rzedow}, () => wysRzedu);

  const uklady = {};
  p.sl.forEach(([komory, drzwi, szufZ, , drazki, pokrycie], i) => {
    const c = i + 1;
    if(drazkiSa){
      if(szufladySa){
        uklady[`r1c${c}`] = szufZ >= 3 ? 'komoda' : szufZ > 0 ? 'drawer' : 'open';
        uklady[`r2c${c}`] = ukladSlupka(komory, drzwi, drazki);
      }else uklady[`r1c${c}`] = ukladSlupka(komory, drzwi, drazki);
      return;
    }
    /* Regał: front sięga tyle rzędów, ile mówi `doors_coverage`; dół bierze szufladę. */
    const zDrzwiami = pokrycie === 'full' ? rzedow : pokrycie === 'partial' ? Math.min(2, rzedow) : 0;
    for(let r = 1; r <= zDrzwiami; r++) uklady[`r${r}c${c}`] = 'door';
    if(szufZ > 0) uklady[`r1c${c}`] = szufZ >= 3 ? 'komoda' : 'drawer';
  });
  return {kol: p.kol, rzed, uklady};
}

export function opisZProjektu(p){
  const {kol, rzed, uklady} = siatkaProjektu(p);
  const b = rozbierzBarwe(p.c);
  return [opisMebla({
    id: 'tylko-' + p.id, nazwa: `Tylko #${p.id} · ${p.c}`,
    w: p.w, h: p.h, d: p.d, kol, rzed, uklady,
    nogi: p.kat === 'wardrobe' ? 'plinth' : 'none', plecy: true,
    wykonczenie: b.wykonczenie, kolor: b.kolor, wnetrze: b.wnetrze
  })];
}

let katalog = null;
export async function katalogProjektow(){
  if(katalog) return katalog;
  const dane = await fetch('tylko-projekty.json').then(r => r.json());
  katalog = dane.projekty || [];
  return katalog;
}
