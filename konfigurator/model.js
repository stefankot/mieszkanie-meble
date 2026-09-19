/* Geometria: podział na kolumny i rzędy, klon dokumentu v2. Wnęki i nóżki są w wneki.js, eksport w eksport.js. */
import {rozloz} from 'https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js';
import {stan, KOLORY, WYKONCZENIA, UKLAD, MIN_KOMORKA, KROK, RZAD_MIN, RZAD_MAX,
        WYS_NADSTAWKI, PLYTA_FRONTU, WNEKA_DRZWI, cm, suma, zacisk, ziarno} from './dane.js';
import {parsujTory, rozlozTory} from './siatka.js';

import {wWnece} from './wneki.js';

/* ---------- układ ---------- */
export function cokolMm(){ return stan.nogi === 'none' ? 0 : 110; }
export function wnetrzeWys(){ return stan.wysokoscMm - cokolMm() - 2 * stan.plytaMm; }

/* Liczba rzędów wynika z WYSOKOŚCI (gęstość przesuwa tylko docelową wysokość rzędu 56→42 cm),
   więc zmiana wysokości zawsze przelicza podział — rzędy trzymają się przedziału ~40–60 cm. */
export function docelowyRzad(){ return RZAD_MAX - stan.gestosc * (RZAD_MAX - RZAD_MIN) / 100; }

export function liczbaRzedow(wnetrzeDane){
  const wnetrze = wnetrzeDane ?? (wnetrzeWys() - (stan.nadstawka ? WYS_NADSTAWKI + stan.plytaMm : 0)), t = stan.plytaMm;
  const maks = Math.max(1, Math.min(24, Math.floor((wnetrze + t) / (RZAD_MIN + t))));
  const min = Math.max(1, Math.ceil((wnetrze + t) / (RZAD_MAX + t)));
  return zacisk(Math.round(wnetrze / docelowyRzad()), min, maks);
}

/* Wysokości, przy których przybywa rząd — kropki na suwaku, jak u Tylko. */
export function progiWysokosci(){
  const t = stan.plytaMm, baza = cokolMm() + 2 * t, cel = docelowyRzad(), progi = [];
  for(let n = 1; n <= 16; n++){
    const h = Math.round(baza + n * cel + (n - 1) * t);
    if(h > 400 && h < 3400) progi.push(h);
  }
  return progi;
}

export function rozkladRzedow(n){
  if(stan.styl === 'gradient') return {distribution: 'fibonacci'};
  if(stan.styl === 'mosaic') return {distribution: 'random', seed: 7 + n * 13 + stan.gestosc};
  if(stan.styl === 'slant')
    return {distribution: 'custom', custom: Array.from({length: n}, (_, i) => 100 + (n - 1 - i) * 55).join('+')};
  if(stan.styl === 'pattern')                          // rytm wysoki-niski-wysoki
    return {distribution: 'custom', custom: Array.from({length: n}, (_, i) => i % 2 ? 190 : 320).join('+')};
  return {distribution: 'equal'};                      // grid, pixel
}

export function wysokosciRzedow(){
  const t = stan.plytaMm, pelne = wnetrzeWys();
  /* Ręcznie ustawione rzędy (przeciągnięcie, karta, dociągnięcie do IKEA) narzucają swoją liczbę;
     ruch suwaka wysokości zeruje je i układ wraca do automatycznego. */
  if(stan.rzedyWlasne?.length){
    const n2 = stan.rzedyWlasne.length, dost = pelne - (n2 - 1) * t;
    const s2 = suma(stan.rzedyWlasne) || 1;
    const hw = stan.rzedyWlasne.map(v => Math.max(MIN_KOMORKA, Math.round(v / s2 * dost)));
    const i2 = hw.indexOf(Math.max(...hw));
    hw[i2] = Math.max(MIN_KOMORKA, Math.round(hw[i2] + dost - suma(hw)));
    return hw;
  }
  if(stan.styl === 'custom'){                           // podział wpisany ręcznie, składnia CSS grid
    const {tory} = parsujTory(stan.siatkaRzed);
    if(tory.length) return rozlozTory(tory, pelne - (tory.length - 1) * t, MIN_KOMORKA);
  }
  const nad = stan.nadstawka && pelne > WYS_NADSTAWKI + RZAD_MIN + 2 * t ? WYS_NADSTAWKI : 0;
  const wnetrze = pelne - (nad ? nad + t : 0), n = liczbaRzedow(wnetrze);
  const dostepne = wnetrze - (n - 1) * t;
  const wlasne = false;
  let h = wlasne ? [...stan.rzedyWlasne] : rozloz(wnetrze, t, n, rozkladRzedow(n)).dlugosci;
  const s = suma(h) || 1;
  /* Układ automatyczny siada na siatce otworów co 32 mm; wartości ustawione ręcznie
     zostawiam dokładnie takie, jakie wybrał użytkownik (klik „40 cm" ma dać 40 cm). */
  h = wlasne ? h.map(v => Math.max(MIN_KOMORKA, v / s * dostepne))
             : h.map(v => Math.max(MIN_KOMORKA, Math.round(v / s * dostepne / KROK) * KROK));
  const i = h.indexOf(Math.max(...h));
  h[i] = Math.max(MIN_KOMORKA, Math.round(h[i] + dostepne - suma(h)));
  for(let k = 0; k < h.length; k++) h[k] = Math.round(h[k]);
  if(!stan.rzedyWlasne)                                 // układ automatyczny trzymamy w 30–80 cm
    for(const [gorny, dolny, warunek] of [[RZAD_MAX, RZAD_MAX, v => v > RZAD_MAX], [RZAD_MIN, RZAD_MIN, v => v < RZAD_MIN]])
      for(let krok = 0; krok < 60; krok++){
        const zly = h.findIndex(warunek);
        if(zly < 0) break;
        const rosnie = h[zly] < RZAD_MIN;
        const dawca = h.findIndex((v, k) => k !== zly && (rosnie ? v > RZAD_MIN + 16 : v < RZAD_MAX - 16));
        if(dawca < 0) break;
        const ruch = Math.min(16, rosnie ? RZAD_MIN - h[zly] : h[zly] - RZAD_MAX);
        h[zly] += rosnie ? ruch : -ruch;
        h[dawca] += rosnie ? -ruch : ruch;
      }
  if(nad) h.push(nad);                                  // nadstawka zawsze na górze
  return h;
}

/* Wszystkie kafelkowania szerokości modułami 40/60/80, od najmniejszej liczby modułów. */
export function kafelkowania(W){
  const wynik = [];
  for(let a = 0; a * 800 <= W; a++)
    for(let b = 0; a * 800 + b * 600 <= W; b++){
      const reszta = W - a * 800 - b * 600;
      if(reszta % 400 === 0)
        wynik.push([...Array(a).fill(800), ...Array(b).fill(600), ...Array(reszta / 400).fill(400)]);
    }
  return wynik.sort((x, y) => x.length - y.length);
}

/* Gęstość steruje docelową szerokością kolumny: 80 cm przy 0%, 20 cm przy 100%.
   Dopóki cel mieści się w module LASTARE, wybieram kafelkowanie 40/60/80; niżej
   schodzę na równe kolumny custom — dzięki temu da się złożyć ścianę z kolumn po 20 cm. */
export function podzialKolumn(){
  const W = stan.szerokoscMm;
  if(stan.kolumnyWlasne && Math.abs(suma(stan.kolumnyWlasne) - W) < 1) return stan.kolumnyWlasne;
  if(stan.styl === 'custom'){
    const {tory} = parsujTory(stan.siatkaKol);
    if(tory.length) return rozlozTory(tory, W, MIN_KOMORKA);
  }
  const cel = 800 - stan.gestosc * (800 - MIN_KOMORKA) / 100;
  if(cel >= 380){
    const wybrane = wybierzKafelkowanie(W, cel);
    if(wybrane) return ukladajModuly(wybrane);
  }
  const n = zacisk(Math.round(W / cel), 1, Math.min(24, Math.floor(W / MIN_KOMORKA)));
  return Array(n).fill(W / n);
}

/* Kafelkowanie dobrane pod styl: Grid/Pixel chcą jednej szerokości, Pattern dwóch
   naprzemiennych, Gradient/Slant/Mosaic jak najwięcej różnych. Gęstość zawęża kandydatów. */
export function wybierzKafelkowanie(W, cel){
  const opcje = kafelkowania(W).filter(o => o.length <= 24);
  if(!opcje.length) return null;
  const odleglosc = o => Math.abs(W / o.length - cel);
  const posort = [...opcje].sort((a, b) => odleglosc(a) - odleglosc(b));
  const kandydaci = posort.filter(o => odleglosc(o) <= odleglosc(posort[0]) + 150);
  const roznych = o => new Set(o).size;
  if(stan.styl === 'grid' || stan.styl === 'pixel')
    return [...kandydaci].sort((a, b) => roznych(a) - roznych(b))[0];
  if(stan.styl === 'pattern')
    return kandydaci.find(o => roznych(o) === 2) || kandydaci[0];
  return [...kandydaci].sort((a, b) => roznych(b) - roznych(a) || a.length - b.length)[0];
}

export function ukladajModuly(lista){
  const rosnaco = [...lista].sort((a, b) => a - b);
  if(stan.styl === 'gradient') return rosnaco;                 // od wąskich do szerokich
  if(stan.styl === 'slant') return rosnaco.reverse();
  if(stan.styl === 'mosaic'){
    const r = ziarno(lista.length * 97 + stan.gestosc + Math.round(stan.szerokoscMm));
    return lista.map(v => [v, r()]).sort((x, y) => x[1] - y[1]).map(x => x[0]);
  }
  if(stan.styl === 'pattern'){                                 // naprzemiennie szeroki / wąski
    const szerokie = rosnaco.filter(v => v >= rosnaco.at(-1)), waskie = rosnaco.filter(v => v < rosnaco.at(-1));
    const wynik = [];
    while(szerokie.length || waskie.length){
      if(szerokie.length) wynik.push(szerokie.shift());
      if(waskie.length) wynik.push(waskie.shift());
    }
    return wynik;
  }
  return lista;                                                // grid, pixel: równo
}

/* Reguła harmonii (wskazówka użytkownika: wyższa komórka = więcej półek):
   komórka > 60 cm dostaje tyle półek, żeby żadna przegroda nie przekroczyła ~60 cm. */
export function polkiHarmonijne(h){ return zacisk(Math.ceil(h / 600) - 1, 0, 2); }

export function polkiStylu(r, c, h, los){
  const baza = polkiHarmonijne(h);
  const K = Math.max(1, stan.kolumny.length - 1), R = Math.max(1, stan.rzedy.length - 1);
  switch(stan.styl){
    case 'custom':   return 0;                         // co wpiszesz, to dostajesz
    case 'pixel':    return zacisk(baza + 1, 1, 3);
    case 'pattern':  return (r + c) % 2 ? zacisk(baza + 1, 1, 3) : 0;
    case 'slant':    return zacisk(Math.round((c - 1) / K + (stan.rzedy.length - r) / R), 0, 2);
    case 'mosaic':   return zacisk(Math.floor(los() * 3.2), 0, 2);
    case 'gradient': return zacisk(baza + (r <= stan.rzedy.length / 2 ? 1 : 0), 0, 3);
    default:         return baza;                      // grid — wszędzie tak samo
  }
}

/* ---------- klon modelu ---------- */
export function definicjaPolki(offsety){
  return {label: 'Shelf', parts: offsety.map((mul, i) => ({
    id: `p${i + 1}`, type: 'box', material: 'maple-0375', label: 'Shelf',
    sizeMm: [{cell: 'w', addMm: -1}, 18, {cell: 'd', addMm: -12}],
    positionMm: [0, {cell: 'h', mul}, {cell: 'd', mul: -.5, addMm: 6}], rotationDeg: [0, 0, 0]
  }))};
}

export function normalizujDefinicje(p){
  for(const cz of p.definitions.drzwi.parts){
    if(cz.id === 'panel'){ cz.sizeMm[2] = PLYTA_FRONTU; cz.positionMm[2] = -(WNEKA_DRZWI + PLYTA_FRONTU / 2); }
    if(cz.id === 'uchwyt') cz.positionMm[2] = -(WNEKA_DRZWI - cz.sizeMm[2] / 2);
  }
  const szuflada = structuredClone(p.definitions.drzwi);
  szuflada.label = 'Drawer';
  szuflada.joint = {type: 'slide', axis: [0, 0, 1], travelMm: {cell: 'd', mul: .8}};
  const uchwyt = szuflada.parts.find(c => c.id === 'uchwyt');
  if(uchwyt) uchwyt.positionMm[1] = 0;
  p.definitions.szuflada = szuflada;
  p.definitions['polka-1'] = definicjaPolki([0]);
  p.definitions['polka-2'] = definicjaPolki([-1 / 6, 1 / 6]);
  p.definitions['polka-3'] = definicjaPolki([-.25, 0, .25]);
  p.definitions.komoda = {label: 'Four drawers', joint: {type: 'slide', axis: [0, 0, 1], travelMm: {cell: 'd', mul: .7}},
    parts: Array.from({length: 4}, (_, i) => ({
      id: `front${i + 1}`, type: 'box', material: 'maple-0375-front', label: `Drawer ${i + 1}`,
      sizeMm: [{cell: 'w', addMm: -4}, {cell: 'h', mul: .25, addMm: -5}, PLYTA_FRONTU],
      positionMm: [0, {cell: 'h', mul: -.375 + i * .25}, -(WNEKA_DRZWI + PLYTA_FRONTU / 2)], rotationDeg: [0, 0, 0]
    }))};
  for(const n of [1, 2, 3]) p.definitions[`kosz-${n}`] = {label: 'Wire baskets', parts:
    Array.from({length: n}, (_, i) => i).flatMap(i => {
      const mul = -.5 + (i + .5) / n;
      return [{
        id: `kosz${i + 1}f`, type: 'box', material: 'maple-0375-back', label: `Basket ${i + 1}`,
        sizeMm: [{cell: 'w', addMm: -34}, 130, 14],
        positionMm: [0, {cell: 'h', mul, addMm: -20}, {cell: 'd', mul: -.06}], rotationDeg: [0, 0, 0]
      }, {
        id: `kosz${i + 1}d`, type: 'box', material: 'maple-0375-back', label: `Basket base ${i + 1}`,
        sizeMm: [{cell: 'w', addMm: -34}, 12, {cell: 'd', mul: .62}],
        positionMm: [0, {cell: 'h', mul, addMm: -85}, {cell: 'd', mul: -.38}], rotationDeg: [0, 0, 0]
      }];
    })};
  p.definitions.drazek = {label: 'Rail', parts: [{
    id: 'rura', type: 'box', material: 'maple-0375', label: 'Rail (ALTARLIDEN)',
    sizeMm: [{cell: 'w', addMm: -24}, 26, 26],
    positionMm: [0, {cell: 'h', mul: .5, addMm: -95}, {cell: 'd', mul: -.5, addMm: 25}], rotationDeg: [0, 0, 0]
  }]};
}

export function instancje(){
  const lista = [], los = ziarno(stan.kolumny.length * 131 + stan.rzedy.length * 17 + stan.gestosc);
  stan.polkiWyliczone = {};
  stan.rzedy.forEach((h, ri) => stan.kolumny.forEach((w, ci) => {
    const r = ri + 1, c = ci + 1, klucz = `r${r}c${c}`;
    if(wWnece(r, c) >= 0){ stan.polkiWyliczone[klucz] = 0; return; }   // wnęka rządzi się sama
    const u = UKLAD[stan.uklady[klucz]];
    const front = u?.front || null;
    let polki = u ? u.polki : polkiStylu(r, c, h, los);
    while(polki > 0 && h / (polki + 1) < MIN_KOMORKA) polki--;
    stan.polkiWyliczone[klucz] = polki;
    if(front) lista.push({id: `${front}-${klucz}`, definition: front,
                          label: front === 'drzwi' ? 'Door' : front === 'komoda' ? 'Chest' : 'Drawer',
                          cells: {rows: [r], columns: [c]}});
    if(polki > 0)
      lista.push({id: `polka${polki}-${klucz}`, definition: `polka-${polki}`, label: 'Shelf', cells: {rows: [r], columns: [c]}});
    if(u?.drazek) lista.push({id: `drazek-${klucz}`, definition: 'drazek', label: 'Rail', cells: {rows: [r], columns: [c]}});
    if(u?.kosze) lista.push({id: `kosz${u.kosze}-${klucz}`, definition: `kosz-${u.kosze}`, label: 'Baskets', cells: {rows: [r], columns: [c]}});
  }));
  return lista;
}

export function konfigurujModel(){
  const d = structuredClone(stan.dokumenty[stan.zrodlo] || stan.dokument), p = d.parametric;
  stan.kolumny = podzialKolumn();
  stan.rzedy = wysokosciRzedow();
  /* Zmiana stylu, gęstości czy wymiarów potrafi zabrać rzędy lub kolumny. Nisza, która
     wystaje poza nową siatkę, przycinałaby przegrody w przypadkowych miejscach —
     dlatego dociągam ją do zakresu, a jeśli zostanie z niej jedna komórka, znika. */
  const K = stan.kolumny.length, R = stan.rzedy.length;
  stan.wneki = stan.wneki
    .map(w => ({...w, r1: Math.min(w.r1, R), r2: Math.min(w.r2, R),
                      c1: Math.min(w.c1, K), c2: Math.min(w.c2, K)}))
    .filter(w => w.r2 > w.r1 || w.c2 > w.c1);
  p.carcass.sizeMm = [stan.szerokoscMm, stan.wysokoscMm, stan.glebokoscMm];
  p.carcass.boardMm = stan.plytaMm;
  p.carcass.backMm = stan.plecy ? 8 : 0;
  p.carcass.plinthMm = (stan.nozkiMm || 0) > 0 ? 0 : cokolMm();   // nóżki wykluczają cokół
  p.carcass.plinthRecessMm = stan.nogi === 'plinth' ? 0 : 70;
  p.layout.columns = {count: stan.kolumny.length, distribution: 'custom',
                      custom: stan.kolumny.map(v => Math.round(v - stan.plytaMm)).join('+')};
  p.layout.rows = {count: stan.rzedy.length, distribution: 'custom', custom: stan.rzedy.join('+')};
  normalizujDefinicje(p);
  p.instances = instancje();
  const [, szorstkosc] = WYKONCZENIA[stan.wykonczenie], barwa = KOLORY[stan.kolor][1];
  const ciemniej = h => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.substr(i, 2), 16) * .88)
    .toString(16).padStart(2, '0')).join('');
  /* Paleta przemalowuje tylko materiały korpusu. Kobalt na frontach, koral w niszy, LED
     i lustro to decyzje projektanta zapisane w dokumencie — zostają takie, jakie są,
     inaczej regał przy łóżku zrobiłby się jednobarwny przy pierwszym kliknięciu koloru. */
  /* Moduł może wziąć korpus wprost z materiału dokumentu (np. kobaltowy cokół regału przy
     łóżku). Wtedy paleta go nie dotyka — cała bryła zostaje w kolorze zaprojektowanym. */
  if(stan.materialKorpusu && d.materials.definitions[stan.materialKorpusu]){
    p.carcass.material = p.carcass.shelfMaterial = stan.materialKorpusu;
    p.carcass.backMaterial = d.materials.definitions[stan.materialKorpusu + '-back']
      ? stan.materialKorpusu + '-back' : stan.materialKorpusu;
    for(const m of Object.values(d.materials.definitions)) m.autorskie = true;
    d.customParameters.wneki = structuredClone(stan.wneki);
    return d;
  }
  const rdzen = p.carcass.material;
  for(const [id, m] of Object.entries(d.materials.definitions)){
    if(!(id === rdzen || id.startsWith(rdzen + '-'))){ m.autorskie = true; continue; }
    m.color = id.endsWith('-back') ? ciemniej(barwa) : barwa;
    m.roughness = +(szorstkosc + (id.endsWith('-back') ? .08 : 0)).toFixed(2);
    delete m.assets;
  }
  if((stan.nozkiMm || 0) > 0) d.materials.definitions.nozka =
    {type: 'paint', color: KOLORY[stan.nozkiKolor || 0][1], roughness: .35, metalness: .15};
  stan.wneki.forEach((w, i) => {
    if(w.kolor != null) d.materials.definitions[`wneka-${i}`] =
      {type: 'wood', color: KOLORY[w.kolor][1], roughness: szorstkosc, metalness: 0};
  });
  d.customParameters.wneki = structuredClone(stan.wneki);
  return d;
}

/* ---------- wnęki: prostokąt scalonych komórek ---------- */
