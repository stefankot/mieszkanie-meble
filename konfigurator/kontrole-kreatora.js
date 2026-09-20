/* Kontrole 54–58: kreator mebli i dane przepisane z tylko.com. */
import {stan, UKLAD, el} from './dane.js';
import {sprawdzParametryczny} from 'https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js';
import {KATEGORIE, PALETY, UKLADY_STARTOWE, katalogProjektow, opisZUkladu, opisZProjektu} from './tylko.js';
import {pokazKreator, zamknijKreator} from './kreator.js';
import {resetDoFabrycznych} from './szafa.js';

const chwila = ms => new Promise(r => setTimeout(r, ms));
const klik = sel => document.querySelector(sel)?.click();

/* Czy każdy wpis `uklady` trafia w istniejącą komórkę i znany wariant — po tym poznaję,
   że przeliczony projekt nie zgubi frontów przy budowie. */
function wpisyPoprawne(opis, kolumn, rzedow){
  return Object.entries(opis.uklady).every(([k, v]) => {
    const m = /^r(\d+)c(\d+)$/.exec(k);
    return m && +m[1] >= 1 && +m[1] <= rzedow && +m[2] >= 1 && +m[2] <= kolumn && !!UKLAD[v];
  });
}

export async function kontroleKreatora(dodaj){
  /* 54 — przycisk stoi na samej górze prawego panelu i otwiera okno. */
  const pierwszy = el('wiersze')?.firstElementChild;
  await pokazKreator();
  await chwila(300);
  const okno = document.querySelector('.kreator-tlo');
  const kategorie = okno ? okno.querySelectorAll('.kreator-kategoria').length : 0;
  const piktogramy = okno ? [...okno.querySelectorAll('.kreator-kategoria img')]
    .filter(i => i.getAttribute('src').startsWith('ikony/tylko-')).length : 0;
  dodaj(54, 'the furniture creator opens from the top of the right panel and shows three Tylko categories',
    pierwszy?.classList.contains('kreator-start') && !!okno
      && kategorie === KATEGORIE.length && piktogramy === KATEGORIE.length,
    `first panel row ${pierwszy?.className || 'none'}, ${kategorie} categories, ${piktogramy} pictograms`);

  /* 55 — każdy układ startowy ma wymiary i siatkę z Tylko, a fronty mieszczą się w tej siatce. */
  const zle = [];
  for(const [kat, lista] of Object.entries(UKLADY_STARTOWE))
    for(const l of lista){
      const [opis] = opisZUkladu(l, PALETY[l.linia][0]);
      const ok = opis.szerokoscMm === l.w && opis.wysokoscMm === l.h && opis.glebokoscMm === l.d
        && opis.rzedyWlasne.length === l.rzed.length
        && opis.siatkaKol.split('+').length === l.kol.length
        && wpisyPoprawne(opis, l.kol.length, l.rzed.length);
      if(!ok) zle.push(`${kat}/${l.id}`);
    }
  const ilePrzykladow = Object.values(UKLADY_STARTOWE).reduce((s, l) => s + l.length, 0);
  dodaj(55, 'every starting layout keeps its Tylko dimensions and puts fronts inside its own grid',
    zle.length === 0, `${ilePrzykladow} layouts, broken: ${zle.join(', ') || 'none'}`);

  /* 56 — układ „Pixel” buduje się dokładnie w wymiarach i rytmie z Tylko #1935036. */
  klik('[data-uklad="pixel-wardrobe"]');
  await chwila(150);
  klik('.kreator [data-akcja="kreator-stworz"]');
  await chwila(900);
  const drzwi = (stan.model?.parametric.instances || []).filter(i => i.definition === 'drzwi');
  dodaj(56, 'creating the Pixel wardrobe gives 293×238×45 cm, five columns, five rows and ten scattered fronts',
    stan.meble.length === 1 && stan.szerokoscMm === 2930 && stan.wysokoscMm === 2380
      && stan.glebokoscMm === 450 && stan.kolumny.length === 5 && stan.rzedy.length === 5
      && drzwi.length === 10,
    `${stan.szerokoscMm}×${stan.wysokoscMm}×${stan.glebokoscMm} mm, `
    + `${stan.kolumny.length}×${stan.rzedy.length} grid, ${drzwi.length} doors`);

  /* 57 — para barw z linii Tone: korpus bierze pierwszy kolor, półki i plecy drugi. */
  await pokazKreator();
  await chwila(250);
  klik('[data-uklad="tone-full"]');
  await chwila(150);
  klik('.kreator-barwa[data-barwa="6"]');                // Cashmere Beige + Antique Pink
  await chwila(100);
  klik('.kreator [data-akcja="kreator-stworz"]');
  await chwila(900);
  const def = stan.model?.materials?.definitions || {};
  const korpus = stan.model?.parametric?.carcass;
  dodaj(57, 'a Tone colour pair paints the carcass in one colour and shelves plus back in the other',
    stan.kolor === 16 && stan.kolorWnetrza === 18
      && def[korpus?.material]?.color?.toLowerCase() === '#cfc8c1'
      && def[korpus?.shelfMaterial]?.color?.toLowerCase() === '#ceafae'
      && /^#/.test(def[korpus?.backMaterial]?.color || ''),
    `carcass ${def[korpus?.material]?.color}, shelves ${def[korpus?.shelfMaterial]?.color}, `
    + `back ${def[korpus?.backMaterial]?.color}`);

  /* 58 — cały zrzut katalogu Tylko przelicza się na poprawne meble. */
  const projekty = await katalogProjektow().catch(() => []);
  const wadliwe = projekty.filter(p => {
    const [opis] = opisZProjektu(p);
    return !(opis.szerokoscMm === p.w && opis.wysokoscMm === p.h && opis.glebokoscMm === p.d
      && opis.siatkaKol.split('+').length === p.kol.length
      && wpisyPoprawne(opis, p.kol.length, opis.rzedyWlasne.length));
  }).map(p => p.id);
  /* Jeden budowany naprawdę — żeby wiedzieć, że przeliczenie daje dokument, nie tylko opis. */
  const wzorcowy = projekty.find(p => p.id === 61921);
  if(wzorcowy){
    await pokazKreator();
    await chwila(250);
    klik('[data-zakladka="katalog"]');
    await chwila(400);
    klik('[data-projekt="61921"]');
    await chwila(150);
    klik('.kreator [data-akcja="kreator-stworz"]');
    await chwila(900);
  }
  let dokumentOk = false;
  try{ sprawdzParametryczny(stan.model.parametric); dokumentOk = true; }catch(e){ dokumentOk = false; }
  dodaj(58, 'every design imported from the Tylko catalogue converts into a valid piece',
    projekty.length > 40 && wadliwe.length === 0 && dokumentOk
      && stan.szerokoscMm === 4150 && stan.kolumny.length === 5,
    `${projekty.length} designs, broken: ${wadliwe.join(', ') || 'none'}, `
    + `built ${stan.szerokoscMm}×${stan.wysokoscMm} mm in ${stan.kolumny.length} columns, document ${dokumentOk}`);

  zamknijKreator();
  resetDoFabrycznych();
}
