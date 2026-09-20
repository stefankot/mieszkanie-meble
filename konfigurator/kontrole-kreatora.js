/* Kontrole 54–60: kreator mebli, style przepisane z tylko.com i kreator kuchni. */
import {stan, UKLAD, el, KOLORY} from './dane.js';
import {sprawdzParametryczny} from 'https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js';
import {KATEGORIE, PALETY, LINIE, KATEGORIA_START, katalogProjektow, opisZProjektu} from './tylko.js';
import {STYLE_LINII, modulyStylu} from './style-tylko.js';
import {modulyKuchni, DOMYSLNE} from './kuchnia.js';
import {pokazKreator, zamknijKreator} from './kreator.js';
import {resetDoFabrycznych} from './szafa.js';

const chwila = ms => new Promise(r => setTimeout(r, ms));
const klik = sel => document.querySelector(sel)?.click();
const parsuj = k => /^r(\d+)c(\d+)$/.exec(k);

/* Czy opis da się zbudować: fronty trafiają w istniejące komórki, a kotwice w moduły
   z tego samego kompletu. Tanie, bo nie wymaga przebudowy sceny. */
function opisSpojny(opisy){
  const ids = new Set(opisy.map(o => o.id));
  return opisy.every(o => {
    const kolumn = o.siatkaKol.split('+').length, rzedow = o.rzedyWlasne.length;
    const komorkiOk = Object.entries(o.uklady).every(([k, v]) => {
      const m = parsuj(k);
      return m && +m[1] >= 1 && +m[1] <= rzedow && +m[2] >= 1 && +m[2] <= kolumn && !!UKLAD[v];
    });
    return komorkiOk && o.szerokoscMm > 0 && o.wysokoscMm > 0
      && (!o.kotwica || ids.has(o.kotwica.do));
  });
}

export async function kontroleKreatora(dodaj){
  /* 54 — przycisk na samej górze panelu, trzy kategorie z piktogramami Tylko, trzy zakładki. */
  const pierwszy = el('wiersze')?.firstElementChild;
  await pokazKreator();
  await chwila(300);
  const okno = document.querySelector('.kreator-tlo');
  const kategorie = okno ? okno.querySelectorAll('.kreator-kategoria').length : 0;
  const piktogramy = okno ? [...okno.querySelectorAll('.kreator-kategoria img')]
    .filter(i => i.getAttribute('src').startsWith('ikony/tylko-')).length : 0;
  const zakladki = okno ? okno.querySelectorAll('.kreator-zakladki button').length : 0;
  dodaj(54, 'the furniture creator opens from the top of the right panel with three Tylko categories and three tabs',
    pierwszy?.classList.contains('kreator-start') && !!okno
      && kategorie === KATEGORIE.length && piktogramy === KATEGORIE.length && zakladki === 3,
    `first panel row ${pierwszy?.className || 'none'}, ${kategorie} categories, ${piktogramy} pictograms, ${zakladki} tabs`);

  /* 55 — dwanaście stylów Tylko: każdy daje spójny opis i ma własny piktogram z ich pliku. */
  const zle = [];
  for(const [zestaw, style] of Object.entries({original: STYLE_LINII.original, edge: STYLE_LINII.edge}))
    for(const st of style){
      const s = KATEGORIA_START[zestaw === 'original' ? 'bookcase' : 'wardrobe'];
      const opisy = modulyStylu(st, {w: s.w, h: s.h, d: s.d}, PALETY.original[0], {nogi: s.nogi});
      const ikona = await fetch(st.ikona).then(r => r.ok).catch(() => false);
      if(!opisy.length || !opisSpojny(opisy) || !ikona) zle.push(`${zestaw}/${st.id}`);
    }
  const ile = STYLE_LINII.original.length + STYLE_LINII.edge.length;
  dodaj(55, 'all twelve Tylko styles build a consistent piece and keep their own pictogram',
    ile === 12 && zle.length === 0, `${ile} styles, broken: ${zle.join(', ') || 'none'}`);

  /* 56 — Pixel to gęsta krata z poszarpanym obrysem, a nie fronty rozrzucone po jednej
     siatce ani rzadki krzyż z piktogramu. */
  klik('[data-kategoria="bookcase"]');
  await chwila(250);
  klik('[data-styl="pixel"]');
  await chwila(150);
  klik('.kreator [data-akcja="kreator-stworz"]');
  await chwila(150);
  klik('[data-akcja="kreator-zastap"]');
  await chwila(1200);
  const krata = stan.meble.find(m => /-krata$/.test(m.id));
  const skrzynki = stan.meble.filter(m => /-(stopa|gora|lewo|prawo)/.test(m.id));
  const kolumnKraty = krata ? krata.siatkaKol.split('+').length : 0;
  const rzedowKraty = krata ? krata.rzedyWlasne.length : 0;
  const frontow = krata ? Object.keys(krata.uklady).length : 0;
  const wystaje = ['gora', 'lewo', 'prawo', 'stopa']
    .filter(s => stan.meble.some(m => new RegExp(`-${s}`).test(m.id))).length;
  dodaj(56, 'Pixel builds a dense grid of square cells with boxes stepping out on every side',
    !!krata && kolumnKraty >= 4 && rzedowKraty >= 3
      && frontow > kolumnKraty * rzedowKraty * .6          // większość komórek ma front
      && frontow < kolumnKraty * rzedowKraty               // ale nie wszystkie — reszta to ciemne pola
      && wystaje === 4 && skrzynki.length >= 5
      && skrzynki.every(m => m.szerokoscMm < krata.szerokoscMm / 3),
    `grid ${kolumnKraty}×${rzedowKraty} with ${frontow} fronts, ${skrzynki.length} boxes `
    + `stepping out on ${wystaje} of 4 sides`);

  /* 57 — para barw z linii Tone: korpus bierze pierwszy kolor, półki i plecy drugi. */
  await pokazKreator();
  await chwila(250);
  klik('[data-kategoria="wardrobe"]');
  await chwila(250);
  klik('[data-linia="tone"]');
  await chwila(200);
  const parAll = PALETY.tone.length;
  klik('.kreator-barwa[data-barwa="6"]');              // Cashmere Beige + Antique Pink
  await chwila(150);
  klik('.kreator [data-akcja="kreator-stworz"]');
  await chwila(150);
  klik('[data-akcja="kreator-zastap"]');
  await chwila(1100);
  const def = stan.model?.materials?.definitions || {};
  const korpus = stan.model?.parametric?.carcass;
  dodaj(57, 'the Tone line offers fifteen front-and-interior pairs and paints the carcass and shelves apart',
    parAll === 15 && stan.kolor === 16 && stan.kolorWnetrza === 18
      && def[korpus?.material]?.color?.toLowerCase() === '#cfc8c1'
      && def[korpus?.shelfMaterial]?.color?.toLowerCase() === '#ceafae',
    `${parAll} pairs, carcass ${def[korpus?.material]?.color}, shelves ${def[korpus?.shelfMaterial]?.color}`);

  /* 58 — cały zrzut katalogu Tylko przelicza się na poprawne meble. */
  const projekty = await katalogProjektow().catch(() => []);
  const wadliwe = projekty.filter(p => {
    const [opis] = opisZProjektu(p);
    return !(opis.szerokoscMm === p.w && opis.wysokoscMm === p.h && opis.glebokoscMm === p.d
      && opis.siatkaKol.split('+').length === p.kol.length && opisSpojny([opis]));
  }).map(p => p.id);
  dodaj(58, 'every design imported from the Tylko catalogue converts into a valid piece',
    projekty.length > 40 && wadliwe.length === 0,
    `${projekty.length} designs, broken: ${wadliwe.join(', ') || 'none'}`);

  /* 59 — kreator pyta, zanim skasuje projekt, a „Add next to it” zostawia poprzedni. */
  const przedtem = stan.meble.length;
  await pokazKreator();
  await chwila(250);
  klik('[data-zakladka="katalog"]');
  await chwila(500);
  klik('[data-projekt="61921"]');
  await chwila(150);
  klik('.kreator [data-akcja="kreator-stworz"]');
  await chwila(200);
  const pytaZanimSkasuje = !!document.querySelector('[data-akcja="kreator-zastap"]')
    && !!document.querySelector('[data-akcja="kreator-dolacz"]');
  klik('[data-akcja="kreator-dolacz"]');
  await chwila(1200);
  dodaj(59, 'the creator asks before it replaces, and adding keeps what was already in the scene',
    pytaZanimSkasuje && stan.meble.length === przedtem + 1
      && stan.meble.some(m => m.id === 'tylko-61921'),
    `asked ${pytaZanimSkasuje}, ${przedtem} modules before, ${stan.meble.length} after`);

  /* 60 — kuchnia: nisza w drugim kolorze, AGD opcjonalne. */
  const zAgd = modulyKuchni({});
  const bezAgd = modulyKuchni({lodowka: 'brak', piekarnik: 'brak', zmywarka: 'brak',
                               mikrofala: 'brak', spizarnia: 'brak'});
  const naroznik = modulyKuchni({ksztalt: 'naroznik'});
  const wyspa = modulyKuchni({ksztalt: 'wyspa'});
  const nisza = zAgd[0].wneki?.[0];
  const piekarniki = Object.values(zAgd[0].uklady).filter(v => v === 'oven').length;
  const bezPiekarnika = Object.values(bezAgd[0].uklady).every(v => v !== 'oven');
  let dokumentOk = false;
  const {resetDoOpisu} = await import('./szafa.js');
  resetDoOpisu(zAgd);
  await chwila(1100);
  try{ sprawdzParametryczny(stan.model.parametric); dokumentOk = true; }catch(e){ dokumentOk = false; }
  dodaj(60, 'the kitchen creator builds a contrasting niche with worktop and sink, and every appliance can be left out',
    !!nisza && nisza.tresc === 'kuchnia' && nisza.gladka === true
      && nisza.kolor !== zAgd[0].kolor && piekarniki >= 1 && bezPiekarnika
      && naroznik.length === 2 && wyspa.length === 2
      && opisSpojny(zAgd) && opisSpojny(naroznik) && opisSpojny(wyspa) && dokumentOk,
    `niche ${nisza?.tresc} in ${KOLORY[nisza?.kolor ?? 0][0]} vs body ${KOLORY[zAgd[0].kolor][0]}, `
    + `${piekarniki} oven front, without appliances ${bezPiekarnika}, `
    + `L-shape ${naroznik.length} modules, island ${wyspa.length}, document ${dokumentOk}`);

  zamknijKreator();
  resetDoFabrycznych();
}
