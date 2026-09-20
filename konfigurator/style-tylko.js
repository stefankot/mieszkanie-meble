/* Style Tylko odtworzone z ich własnych piktogramów „Available styles”
   (media.tylko.com/cloudinary/comparison-page/geometry-icons/high/Original*.svg i Edge*.svg).
   Kopie tych plików leżą w `ikony/styl-*.svg`, a proporcje niżej są z nich odczytane:
   ikona rysuje korpus w prostokącie x 4.75–43.25 i y 2.75–45.25, więc ułamek od lewej to
   (x−4.75)/38.5, a od dołu (45.25−y)/42.5.

   Linia Original to style GEOMETRII: zmienia się podział, a przy Slant i Pixel także obrys
   bryły. Nie da się tego zapisać jedną siatką, bo nasz korpus jest prostokątem — więc styl
   zwraca kilka modułów zakotwiczonych w sobie. Dokładnie tak działa też oryginał: regał Tylko
   w układzie Pixel to skrzyżowane pionowe słupy i poziome pasy, a nie jeden korpus.

   Linia Edge to style FRONTÓW: siatka jest zwykłym prostokątem, zmienia się tylko to,
   gdzie stoją drzwi i szuflady. */
import {opisMebla} from './tylko.js';

const mm = (f, calosc) => Math.round(f * calosc);
const klucze = (fronty, wariant = 'door') => Object.fromEntries(
  (fronty || []).map(f => [`r${f[0]}c${f[1]}`, f[2] || wariant]));

/* Pasma jedno na drugim. Każde jest osobnym modułem, bo ma własny podział kolumn — stąd
   biorą się rytmy Brick i Mosaic, których jedna siatka nie potrafi. */
function stos(pasma, ctx){
  const opisy = [];
  let poprzedni = null, srodekPoprzedniego = 0;
  pasma.forEach((p, i) => {
    const szer = mm(p.szer ?? 1, ctx.w);
    const srodek = mm(p.przesun ?? 0, ctx.w);
    const id = `${ctx.id}-p${i + 1}`;
    opisy.push(opisMebla({
      id, nazwa: `${ctx.nazwa} · band ${i + 1}`,
      w: szer, h: mm(p.wys, ctx.h), d: ctx.d,
      kol: p.kol.map(f => mm(f, szer)),
      rzed: (p.rzed || [1]).map(v => Math.round(v * 1000)),
      uklady: klucze(p.fronty, p.wariant),
      nogi: i === 0 ? ctx.nogi : 'none', plecy: ctx.plecy,
      wykonczenie: ctx.wykonczenie, kolor: ctx.kolor, wnetrze: ctx.wnetrze,
      kotwica: poprzedni ? {do: poprzedni, strona: 'gora', przesun: srodek - srodekPoprzedniego} : null
    }));
    poprzedni = id;
    srodekPoprzedniego = srodek;
  });
  return opisy;
}

/* Słupy obok siebie, każdy innej wysokości — schodkowy obrys stylu Slant. Kotwica „prawo”
   trzyma je na jednym poziomie podłogi, więc różnią się tylko górą. */
function obok(slupy, ctx){
  const opisy = [];
  let poprzedni = null;
  slupy.forEach((s, i) => {
    const id = `${ctx.id}-s${i + 1}`;
    const szer = mm(s.szer, ctx.w);
    opisy.push(opisMebla({
      id, nazwa: `${ctx.nazwa} · column ${i + 1}`,
      w: szer, h: mm(s.wys, ctx.h), d: ctx.d,
      kol: [szer], rzed: Array.from({length: s.rzedow}, () => 1000),
      uklady: klucze(s.fronty, s.wariant),
      nogi: ctx.nogi, plecy: ctx.plecy,
      wykonczenie: ctx.wykonczenie, kolor: ctx.kolor, wnetrze: ctx.wnetrze,
      kotwica: poprzedni ? {do: poprzedni, strona: 'prawo'} : null
    }));
    poprzedni = id;
  });
  return opisy;
}

/* Pixel: dwa pionowe słupy na całą wysokość skrzyżowane z dwoma poziomymi pasami na całą
   szerokość. Z ikony: słupy zajmują x 10.75–19.25 i 28.75–37.25 (czyli ±0,2335 od środka,
   każdy 0,221 szerokości), pasy y 27.75–38.25 i 10.75–21.25 (0,165–0,412 i 0,565–0,812
   wysokości). Stąd obrys w kształcie kraty: skrzynki wystają nad pasy, pod nie i na boki. */
function krata(ctx){
  const SLUP = .221, ODSUN = .2335;
  const PAS = .247, STOPA = .165, SRODEK = .153, CZUBEK = .188;
  const x = [mm(-ODSUN, ctx.w), mm(ODSUN, ctx.w)];
  const kolPasma = Math.max(3, Math.round(ctx.w / 580));
  const opisy = [];
  const dodaj = (id, nazwa, w, h, kol, uklady, kotwica, pozycjaMm) => {
    opisy.push(opisMebla({id, nazwa, w, h, d: ctx.d, kol, rzed: [1000], uklady,
      nogi: 'none', plecy: ctx.plecy, wykonczenie: ctx.wykonczenie,
      kolor: ctx.kolor, wnetrze: ctx.wnetrze, kotwica, pozycjaMm}));
    return id;
  };
  const szerSlupa = mm(SLUP, ctx.w);
  /* Obie stopy stoją na podłodze, więc obie są korzeniami — bez własnej pozycji łańcuch
     korzeni ustawiłby je bok w bok zamiast w rozstawie kraty. */
  const stopa = ['a', 'b'].map((lit, i) => dodaj(`${ctx.id}-stopa-${lit}`, `${ctx.nazwa} · foot ${i + 1}`,
    szerSlupa, mm(STOPA, ctx.h), [szerSlupa], {}, null, [x[i], ctx.d / 2]));
  /* Pas dolny wisi na pierwszej stopie i wraca na oś mebla; kolejne piętra skaczą tam i z powrotem. */
  const pasA = dodaj(`${ctx.id}-pas-1`, `${ctx.nazwa} · band 1`, ctx.w, mm(PAS, ctx.h),
    Array.from({length: kolPasma}, () => Math.round(ctx.w / kolPasma)),
    klucze(Array.from({length: kolPasma}, (_, c) => c % 2 === 0 ? [1, c + 1] : null).filter(Boolean)),
    {do: stopa[0], strona: 'gora', przesun: -x[0]});
  const srodkowe = ['a', 'b'].map((lit, i) => dodaj(`${ctx.id}-srodek-${lit}`, `${ctx.nazwa} · post ${i + 1}`,
    szerSlupa, mm(SRODEK, ctx.h), [szerSlupa], {},
    {do: pasA, strona: 'gora', przesun: x[i]}));
  const pasB = dodaj(`${ctx.id}-pas-2`, `${ctx.nazwa} · band 2`, ctx.w, mm(PAS, ctx.h),
    Array.from({length: kolPasma}, () => Math.round(ctx.w / kolPasma)),
    klucze(Array.from({length: kolPasma}, (_, c) => c % 2 === 1 ? [1, c + 1] : null).filter(Boolean)),
    {do: srodkowe[0], strona: 'gora', przesun: -x[0]});
  ['a', 'b'].forEach((lit, i) => dodaj(`${ctx.id}-czubek-${lit}`, `${ctx.nazwa} · top ${i + 1}`,
    szerSlupa, mm(CZUBEK, ctx.h), [szerSlupa], {},
    {do: pasB, strona: 'gora', przesun: x[i]}));
  return opisy;
}

/* ---------- sześć stylów linii Original (geometria) ---------- */
/* Rzędy i kolumny są ułamkami odczytanymi z ikon, nie okrągłymi liczbami — dzięki temu
   proporcje zostają te same przy każdej szerokości mebla. */
const RZEDY_GRID = [.306, .259, .165, .271];           // od dołu; z linii y 32.25, 21.25, 14.25

export const STYLE_ORIGINAL = [
  {id: 'grid', nazwa: 'Grid', ikona: 'ikony/styl-grid.svg',
   opis: 'Even columns and rows, fronts along the base.',
   buduj: ctx => stos([{wys: 1, kol: [.364, .286, .351], rzed: RZEDY_GRID,
     fronty: [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3]]}], ctx)},

  {id: 'pattern', nazwa: 'Pattern', ikona: 'ikony/styl-pattern.svg',
   opis: 'One wide bay, fronts placed as a motif rather than a row.',
   buduj: ctx => stos([{wys: 1, kol: [.468, .286, .247], rzed: RZEDY_GRID,
     fronty: [[4, 1], [3, 1], [2, 2]]}], ctx)},

  {id: 'mosaic', nazwa: 'Mosaic', ikona: 'ikony/styl-mosaic.svg',
   opis: 'Three bands, each cut differently — cells of several sizes.',
   buduj: ctx => stos([
     {wys: .518, kol: [.442, .376, .182], rzed: [1, 1], fronty: [[1, 1], [2, 1], [2, 2]]},
     {wys: .165, kol: [.442, .376, .182], rzed: [1]},
     {wys: .317, kol: [.442, .376, .182], rzed: [1, 1], fronty: [[1, 1], [2, 1], [1, 2], [2, 2]]}
   ], ctx)},

  {id: 'slant', nazwa: 'Slant', ikona: 'ikony/styl-slant.svg',
   opis: 'Columns of different heights — the top edge steps.',
   buduj: ctx => obok([
     {szer: .26, wys: .72, rzedow: 3, fronty: [[1, 1]], wariant: 'drawer'},
     {szer: .28, wys: 1, rzedow: 4, fronty: [[3, 1]]},
     {szer: .24, wys: .86, rzedow: 3},
     {szer: .22, wys: .60, rzedow: 2, fronty: [[1, 1]]}
   ], ctx)},

  {id: 'brick', nazwa: 'Brick', ikona: 'ikony/styl-brick.svg',
   opis: 'Running bond — every band shifts its dividers by half a bay.',
   buduj: ctx => stos([
     {wys: .306, kol: [.182, .416, .316, .086], rzed: [1]},
     {wys: .255, kol: [.104, .364, .338, .194], rzed: [1], fronty: [[1, 2]]},
     {wys: .169, kol: [.182, .416, .316, .086], rzed: [1], fronty: [[1, 2], [1, 3]]},
     {wys: .270, kol: [.104, .364, .338, .194], rzed: [1]}
   ], ctx)},

  {id: 'pixel', nazwa: 'Pixel', ikona: 'ikony/styl-pixel.svg',
   opis: 'Full-height posts crossing full-width bands — the outline is a grid of boxes.',
   buduj: krata}
];

/* ---------- sześć stylów linii Edge (rozkład frontów) ---------- */
const RZEDY_EDGE = [.259, .259, .259, .223];           // z linii y 34.25, 23.25, 12.25

export const STYLE_EDGE = [
  {id: 'closed', nazwa: 'Fully closed', ikona: 'ikony/styl-closed.svg',
   opis: 'Every bay behind a front.',
   buduj: ctx => stos([{wys: 1, kol: [.519, .481], rzed: RZEDY_EDGE,
     fronty: [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2], [4, 1], [4, 2]]}], ctx)},

  {id: 'open-base', nazwa: 'Open base', ikona: 'ikony/styl-open-base.svg',
   opis: 'Closed above, four open bays along the floor.',
   buduj: ctx => stos([
     {wys: .447, kol: [.26, .24, .25, .25], rzed: [1]},
     {wys: .553, kol: [.519, .481], rzed: [1, 1, 1],
      fronty: [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2]]}
   ], ctx)},

  {id: 'drawer-base', nazwa: 'Drawer base', ikona: 'ikony/styl-drawer-base.svg',
   opis: 'Closed above, drawers on one side and an open bay on the other.',
   buduj: ctx => stos([
     {wys: .447, kol: [.519, .481], rzed: [1, 1, 1], wariant: 'drawer',
      fronty: [[2, 1], [3, 1]]},
     {wys: .553, kol: [.519, .481], rzed: [1, 1, 1],
      fronty: [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2]]}
   ], ctx)},

  {id: 'open-middle', nazwa: 'Open middle', ikona: 'ikony/styl-open-middle.svg',
   opis: 'A closed band at eye level, open shelving above and below.',
   buduj: ctx => stos([
     {wys: .357, kol: [.27, .24, .25, .24], rzed: [1, 1]},
     {wys: .285, kol: [.519, .481], rzed: [1], fronty: [[1, 1], [1, 2]]},
     {wys: .358, kol: [.27, .24, .25, .24], rzed: [1, 1]}
   ], ctx)},

  {id: 'checker', nazwa: 'Chequer', ikona: 'ikony/styl-checker.svg',
   opis: 'Fronts staggered between the columns, open along the floor.',
   buduj: ctx => stos([{wys: 1, kol: [.334, .333, .333], rzed: [.300, .251, .200, .249],
     fronty: [[2, 1], [2, 3], [3, 2], [4, 1], [4, 2], [4, 3]]}], ctx)},

  {id: 'side-open', nazwa: 'Side open', ikona: 'ikony/styl-side-open.svg',
   opis: 'Two closed columns beside one open full-height bay.',
   buduj: ctx => stos([{wys: 1, kol: [.334, .333, .333], rzed: [.263, .213, .208, .316],
     fronty: [[2, 1], [2, 2], [3, 1], [3, 2], [4, 1], [4, 2]]}], ctx)}
];

export const STYLE_LINII = {original: STYLE_ORIGINAL, edge: STYLE_EDGE, tone: STYLE_EDGE};

/* Styl + wymiary + barwa → komplet modułów gotowy dla `resetDoOpisu`. */
export function modulyStylu(styl, wymiary, barwa, dodatki = {}){
  return styl.buduj({
    id: 'tylko-' + styl.id, nazwa: styl.nazwa,
    w: wymiary.w, h: wymiary.h, d: wymiary.d,
    kolor: barwa.kolor, wnetrze: barwa.wnetrze,
    wykonczenie: dodatki.wykonczenie || 'board',
    nogi: dodatki.nogi || 'plinth',
    plecy: dodatki.plecy !== false
  });
}
