/* Wspólny stan konfiguratora, stałe wymiarowe i katalog układów modułu. */
export const HOST = 'https://stefankot.github.io/mieszkanie-meble/';
/* Dokumenty bazowe: każdy mebel w scenie wskazuje jeden z nich przez `stan.zrodlo`.
   Regał przy łóżku jest w kształcie L, a `carcass` to jedna bryła — stąd dwa dokumenty. */
export const ZRODLA = {
  'regal-lozko':     {nazwa: 'Regał przy łóżku', plik: 'meble/regal-przy-lozku/wersje/v0021-parametric.json'},
  'regal-lozko-bok': {nazwa: 'Krótkie skrzydło', plik: 'meble/regal-przy-lozku/wersje/v0022-parametric-skrzydlo.json'},
  'regal-salon':     {nazwa: 'Regał salon',      plik: 'meble/regal-salon/wersje/v0008-parametric.json'}
};
export const ZRODLO_DOMYSLNE = 'regal-lozko';
export const MM = 0.001;
export const UDZIAL_SZER = 0.70, UDZIAL_WYS = 0.80;
export const WNEKA_DRZWI = 20, PLYTA_FRONTU = 18;
export const KROK = 32;                       // system 32 — skok wysokości rzędów
export const MODULY = [400, 600, 800];        // szerokości LASTARE (obudowa, drzwi, komoda, półka ALTARLIDEN)
export const MIN_KOMORKA = 200;
export const NOZKA_FI = 15;                            // średnica nóżki prętowej w mm               // 20 cm minimum w obu osiach
export const RZAD_MIN = 300, RZAD_MAX = 800;  // rzędy trzymają się 30–80 cm
export const GLEB_LASTARE = [300, 420, 620];  // zatrzaski głębokości LASTARE
export const SZER_LASTARE = [400, 600, 800];  // szerokości obudów LASTARE
export const WYS_LASTARE = [360, 600, 1000, 2000];  // wysokości: nadstawka, szafka wisząca, obudowa 100 i 200
export const najblizszy = (v, lista) => lista.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
export const zgodnaWysokosc = h => WYS_LASTARE.some(v => Math.abs(v - h) <= 1);
export const zgodnaGlebokosc = d => GLEB_LASTARE.some(v => Math.abs(v - d) <= 1);
export const GLEB_WNETRZA = [420, 620];       // głębokości półek i koszy ALTARLIDEN
export const WYS_NADSTAWKI = 360;

/* Style Tylko: rozkład wspólnych rzędów + reguła dokładania półek w komórkach. */
export const STYLE = [
  ['grid', 'Grid'], ['pattern', 'Pattern'], ['slant', 'Slant'],
  ['mosaic', 'Mosaic'], ['gradient', 'Gradient'], ['pixel', 'Pixel'], ['custom', 'Custom']
];
/* Połysk jak przy Veneer dla wszystkich wykończeń — mebel ma być lekko rozświetlony. */
export const WYKONCZENIA = {board: ['Board', .38], plywood: ['Plywood', .46], veneer: ['Veneer', .34]};
/* Paleta 1:1 z Tylko (odczytana z ich plików color-swatches/T02-*.svg). */
export const KOLORY = [
  ['White', '#ffffff'], ['Cotton', '#fffdec'], ['Butter yellow', '#fef4ce'], ['Beige', '#dbd3cb'],
  ['Grey', '#c4c1c0'], ['Stone grey', '#afa7a3'], ['Sage green', '#b1caba'], ['Sky blue', '#9bbfe0'],
  ['Lilac', '#efe2e9'], ['Reisinger pink', '#edbacd'], ['Olive green', '#717a54'], ['Terracotta', '#a8442b'],
  ['Burgundy', '#671112'], ['Dark brown', '#513228'], ['Indigo', '#283a57'], ['Matte black', '#191b1c'],
  /* Dopisane z linii Edge i Tone (ich `color-swatches/T03-*.svg`). Wyłącznie na koniec listy:
     zapisane projekty trzymają `kolor` jako indeks, więc przestawienie zmieniłoby stare meble. */
  ['Cashmere beige', '#cfc8c1'], ['Graphite grey', '#4c4c49'], ['Antique pink', '#ceafae'],
  ['Misty blue', '#9ba9b6'], ['Clay brown', '#c88a64'], ['Deep plum', '#75263d'],
  ['Dusk blue', '#637c8d'], ['Warm stone', '#a3968b']
];
/* Przedmioty dekoracyjne: [szer, wys, głęb, kolor] w mm. */
export const DEKORY = {
  ksiazka: [[32, 210, 150], [26, 240, 140], [38, 195, 160], [22, 225, 145]],
  pudelko: [[240, 130, 190], [190, 160, 170]],
  wazon: [[90, 230, 90], [70, 180, 70]],
  roslina: [[120, 110, 120], [150, 190, 150]]
};
export const BARWY_DEKORU = ['#8f9aa6', '#c8bfae', '#a9b4a3', '#cbb6a2', '#7f6a5a', '#d9d2c7', '#6d7b86'];

/* Układy pojedynczego modułu — odpowiednik galerii z konfiguratora Tylko, ale złożony
   z realnych części LASTARE (obudowa, drzwi, komoda, półka i drążek ALTARLIDEN).
   Lista dostępnych wariantów zależy od wymiarów komórki: minH/maxH/modul. */
export const UKLAD = {
  open:    {nazwa: 'Open',          polki: 0, front: null},
  shelf1:  {nazwa: '1 shelf',       polki: 1, front: null},
  shelf2:  {nazwa: '2 shelves',     polki: 2, front: null},
  shelf3:  {nazwa: '3 shelves',     polki: 3, front: null},
  rail:    {nazwa: 'Rail',          polki: 0, front: null, drazek: true, minH: 900},
  rail1:   {nazwa: 'Rail + shelf',  polki: 1, front: null, drazek: true, minH: 1300},
  door:    {nazwa: 'Door',          polki: 0, front: 'drzwi'},
  door1:   {nazwa: 'Door, 1 shelf', polki: 1, front: 'drzwi'},
  door2:   {nazwa: 'Door, 2 shelves', polki: 2, front: 'drzwi'},
  sliding: {nazwa: 'Sliding doors', polki: 0, front: 'drzwi-przesuwne'},
  oven:   {nazwa: 'Built-in oven', polki: 0, front: 'piekarnik'},
  coralDoor: {nazwa: 'Coral door', polki: 0, front: 'drzwi-koral-kuchnia'},
  doorail: {nazwa: 'Door + rail',   polki: 0, front: 'drzwi', drazek: true, minH: 900},
  drawer:  {nazwa: 'Drawer',        polki: 0, front: 'szuflada', maxH: 700},
  komoda:  {nazwa: '4 drawers', polki: 0, front: 'komoda', minH: 700, maxH: 1300},
  kosz1:   {nazwa: '1 wire basket', polki: 0, kosze: 1, minH: 300},
  kosz2:   {nazwa: '2 wire baskets', polki: 0, kosze: 2, minH: 560},
  kosz3:   {nazwa: '3 wire baskets', polki: 0, kosze: 3, minH: 840},
  doorkos: {nazwa: 'Door + 2 baskets', polki: 0, kosze: 2, front: 'drzwi', minH: 560},
  /* Elementy zaprojektowane w konkretnym dokumencie — pokazujemy je tylko wtedy, gdy
     dokument tego mebla naprawdę ma taką definicję (`wymaga`). */
  drzwiK:  {nazwa: 'Cobalt door',      polki: 0, front: 'drzwi-kobalt', wymaga: 'drzwi-kobalt'},
  szufl120:{nazwa: 'Wide drawer',      polki: 0, front: 'szuflada-120', wymaga: 'szuflada-120', maxH: 700},
  biurko:  {nazwa: 'Drop-down desk',   polki: 0, front: 'biurko-60', wymaga: 'biurko-60', minH: 400},
  biurko2: {nazwa: 'Wide desk',        polki: 0, front: 'biurko-120', wymaga: 'biurko-120', minH: 400},
  drzwiP:  {nazwa: 'Full-height door', polki: 0, front: 'drzwi-pelna', wymaga: 'drzwi-pelna'},
  panelS:  {nazwa: 'Fixed front',      polki: 0, front: 'panel-staly', wymaga: 'panel-staly'},
  koral:   {nazwa: 'Coral niche',      polki: 0, front: 'nisza-koral', wymaga: 'nisza-koral'}
};

/* Definicje, którymi dysponuje dokument bazowy edytowanego mebla. */
export const definicjeDokumentu = () =>
  new Set(Object.keys(stan.dokumenty?.[stan.zrodlo]?.parametric?.definitions || {}));

/* Z IKEA bierzemy wyłącznie wyposażenie wnęki (ALTARLIDEN: półka, kosz, drążek).
   Korpus, drzwi i fronty szuflad robimy na wymiar, więc ich nie sprawdzamy. */
export function zgodnoscUkladu(u, w, h){
  const d = stan.glebokoscMm, uwagi = [];
  if(!(u.polki || u.kosze || u.drazek)) return uwagi;
  if(!zgodnaKolumna(w)) uwagi.push(`opening is ${cm(w)} wide — fittings come in 40, 60 and 80 cm`);
  if(!GLEB_WNETRZA.some(v => Math.abs(v - d) <= 15)) uwagi.push(`carcass is ${cm(d)} deep — fittings are 42 and 62 cm`);
  if(u.drazek && w < 600) uwagi.push('the rail comes in 60 and 80 cm only');
  if(u.kosze && !((Math.abs(w - 600) <= 1 && Math.abs(d - 420) <= 15) || (Math.abs(w - 800) <= 1 && Math.abs(d - 620) <= 15)))
    uwagi.push('wire baskets exist as 60×42 and 80×62 cm only');
  return uwagi;
}
export function ukladyDlaKomorki(w, h){
  const mamy = definicjeDokumentu();
  return Object.entries(UKLAD).filter(([, u]) =>
    (!u.wymaga || mamy.has(u.wymaga)) &&
    (!u.minH || h >= u.minH) && (!u.maxH || h <= u.maxH) && h / (u.polki + 1) >= MIN_KOMORKA);
}

export const el = id => document.getElementById(id);
export const plotno = el('plotno'), bladEl = el('blad');
export const cm = v => (Math.abs(v % 10) > .5 ? (v / 10).toFixed(1) : Math.round(v / 10)) + 'cm';
export const suma = a => a.reduce((x, y) => x + y, 0);
export const ile = rodzaj => (stan.model?.parametric.instances || []).filter(i => i.definition === rodzaj).length;
export const frontKomorki = klucz => UKLAD[stan.uklady[klucz]]?.front || null;
export const zgodnaKolumna = w => MODULY.some(m => Math.abs(w - m) <= 1);

export const KONFIG = ['szerokoscMm', 'wysokoscMm', 'glebokoscMm', 'plecy', 'nogi', 'styl', 'gestosc',
                'kolor', 'wykonczenie', 'drewno', 'dodatki', 'nadstawka', 'uklady', 'wneki', 'obrot',
                'nozkiMm', 'nozkiKolor',
                'kolumnyWlasne', 'rzedyWlasne', 'siatkaKol', 'siatkaRzed', 'roslina', 'zrodlo',
                'pozycjaMm', 'id', 'nazwa', 'kotwica', 'wzorzec', 'odstepstwa',
                'definicja', 'wysunMm', 'material', 'materialKorpusu', 'kolorWnetrza'];
export const ODSTEP_MEBLI = 0;                         // meble stoją bok w bok, bez szczeliny

/* Konfiguracja pojedynczego mebla to pola z KONFIG; stan trzyma aktywny mebel „na wierzchu”,
   a stan.meble listę wszystkich. Przełączenie zapisuje bieżący i wczytuje wybrany. */
export function polaMebla(){
  return Object.fromEntries(KONFIG.map(k => [k, structuredClone(stan[k])]));
}

/* Wzorzec (komponent) trzyma wartości wspólne dla instancji. Tożsamość, kotwica i obrót
   zostają przy instancji — dwie kopie tej samej szafki stoją w różnych miejscach. */
export const POLA_WZORCA = KONFIG.filter(k =>
  !['id', 'nazwa', 'kotwica', 'pozycjaMm', 'wzorzec', 'odstepstwa', 'obrot'].includes(k));

const rowne = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/* Odstępstwa liczę z porównania, a nie z przechwytywania zmian — jak w Figmie liczy się to,
   czym instancja różni się od komponentu, a nie to, co ktoś kliknął po drodze. */
export function policzOdstepstwa(mebel){
  const w = mebel.wzorzec && stan.wzorce[mebel.wzorzec];
  if(!w) return [];
  return POLA_WZORCA.filter(k => !rowne(mebel[k], w.pola[k]));
}

export function zapiszAktywny(){
  if(!stan.meble[stan.aktywny]) return;
  const nowe = polaMebla();
  nowe.odstepstwa = policzOdstepstwa(nowe);
  stan.meble[stan.aktywny] = nowe;
}

export function wczytajDo(mebel){
  for(const k of KONFIG) stan[k] = structuredClone(mebel[k]);
  /* Pola nieodczepione biorą wartość z wzorca — zmiana wzorca idzie do wszystkich instancji. */
  const w = mebel.wzorzec && stan.wzorce[mebel.wzorzec];
  if(!w) return;
  const odstepstwa = mebel.odstepstwa || [];
  for(const k of POLA_WZORCA) if(!odstepstwa.includes(k)) stan[k] = structuredClone(w.pola[k]);
}

/* ---------- operacje na wzorcach (jak ⌥⌘K i „Reset overrides" w Figmie) ---------- */
export function stworzWzorzec(mebel, nazwa){
  const id = 'w' + Date.now().toString(36);
  stan.wzorce[id] = {nazwa: nazwa || mebel.nazwa || 'Component',
                     pola: Object.fromEntries(POLA_WZORCA.map(k => [k, structuredClone(mebel[k])]))};
  mebel.wzorzec = id;
  mebel.odstepstwa = [];
  return id;
}
export const instancjeWzorca = id => stan.meble.filter(m => m.wzorzec === id);
export function przywrocZeWzorca(mebel, pole){
  const w = stan.wzorce[mebel.wzorzec];
  if(!w) return;
  for(const k of (pole ? [pole] : POLA_WZORCA)) mebel[k] = structuredClone(w.pola[k]);
  mebel.odstepstwa = policzOdstepstwa(mebel);
}
export function odczepInstancje(mebel){ mebel.wzorzec = null; mebel.odstepstwa = []; }

/* ---------- edycja zbiorcza ---------- */
/* Zaznaczone moduły (Shift-klik w liście); bez zaznaczenia liczy się ten, w którym jesteśmy. */
export function zaznaczoneModuly(){
  const ids = stan.zaznaczone?.length ? stan.zaznaczone : [stan.meble[stan.aktywny]?.id];
  return stan.meble.filter(m => ids.includes(m.id));
}
/* Czy zaznaczone moduły mają różne wartości tego pola — wtedy panel pokazuje „mixed". */
export function mieszanePole(nazwa){
  const lista = zaznaczoneModuly();
  if(lista.length < 2) return false;
  const pierwszy = JSON.stringify(lista[0][nazwa] ?? null);
  return lista.some(m => JSON.stringify(m[nazwa] ?? null) !== pierwszy);
}
/* Zapis idzie do wszystkich zaznaczonych — jak w Figmie, gdzie jedno pole ustawia cały wybór. */
export function ustawPole(nazwa, v){
  stan[nazwa] = v;
  const aktywny = stan.meble[stan.aktywny];
  for(const m of zaznaczoneModuly()) if(m !== aktywny) m[nazwa] = structuredClone(v);
}
/* Para czytaj/zapisz dla kontrolki panelu — czyta z modułu, w którym jesteś, pisze do wszystkich. */
export const polePanelu = nazwa => [() => stan[nazwa], v => ustawPole(nazwa, v)];

export const stan = {
  meble: [], aktywny: 0, offsetX: 0, wzorce: {},
  dokumenty: {}, zrodlo: ZRODLO_DOMYSLNE, dokument: null, model: null, czesci: [], komorki: [], kolumny: [], rzedy: [],
  wymiary: false, historia: [], indeks: -1,
  szerokoscMm: 2400, wysokoscMm: 2200, glebokoscMm: 420, plytaMm: 18,
  plecy: true, nogi: 'standard', styl: 'gradient', gestosc: 40,
  kolor: 3, wykonczenie: 'plywood', drewno: null, dodatki: 55,   // ile rzeczy na półkach, 0–100%
  kolorWnetrza: null,                                  // druga barwa pary Tone: półki i plecy; null = jak korpus
  nadstawka: false, uklady: {}, wneki: [], obrot: 0,
  nozkiMm: 0, nozkiKolor: 0,                            // nóżki prętowe ⌀15 mm, 0 = brak
  kolumnyWlasne: null, rzedyWlasne: null,
  siatkaKol: '', siatkaRzed: '',                       // styl Custom: podziały wpisane ręcznie
  roslina: null,                                       // doniczka obok: id modelu, 'brak' albo null (najwyższa)
  pozycjaMm: null,                                     // [x, z] środka bryły; null = moduł idzie w łańcuchu
  id: null, nazwa: '',                                 // tożsamość modułu — po niej chodzą kotwice i lista
  kotwica: null,                                       // {do, strona:'prawo'|'lewo'|'gora'|'dol', przesun, poziomuj}
  wzorzec: null, odstepstwa: [],                       // instancja wzorca i pola odczepione od niego
  definicja: null, wysunMm: 0, material: null,         // moduł osadzony w komórce rodzica
  materialKorpusu: null,                               // korpus z materiału dokumentu, poza paletą
  /* Wejście w moduł (dwuklik) i zaznaczenie wielokrotne — stan powłoki, nie mebla. */
  wejscie: [], zaznaczone: [], kadrCaly: false
};

export function pokazBlad(tekst){ bladEl.hidden = false; bladEl.textContent = tekst; }
export function ziarno(n){ let a = (n >>> 0) || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
export const zacisk = (v, a, b) => Math.min(b, Math.max(a, v));
/* „dodatki” było kiedyś przełącznikiem — starsze zapisy i pliki JSON wciąż niosą true/false. */
export const ileDodatkow = () => stan.dodatki === true ? 55 : stan.dodatki === false ? 0 : (+stan.dodatki || 0);
