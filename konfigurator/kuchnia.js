/* Kreator kuchni. Wszystkie kuchnie z załączonych zdjęć są tym samym meblem: ściana
   gładkich frontów w jednym kolorze i WYCIĘTA W NIEJ POZIOMA NISZA w drugim — z blatem,
   zlewem, podświetleniem i wiszącymi frontami w środku. Różni je tylko szerokość, kolor
   pary i to, które AGD siedzi w zabudowie.

   Dlatego kreator nie buduje dowolnej kuchni, tylko tę jedną kompozycję z parametrami:
   pyta o wymiary, wysokość blatu i niszy, parę barw oraz o to, gdzie stoi lodówka,
   piekarnik i zmywarka — każde z nich może po prostu nie istnieć. */
import {KOLORY} from './dane.js';
import {opisMebla} from './tylko.js';

export const KSZTALTY = [
  {id: 'prosta',   nazwa: 'Single wall', opis: 'One run of cabinets along a wall.'},
  {id: 'naroznik', nazwa: 'L-shaped',    opis: 'A second run turned 90° at the right end.'},
  {id: 'wyspa',    nazwa: 'With island', opis: 'One run plus a free-standing island in front.'}
];

/* AGD. `gdzie` to lista dopuszczalnych odpowiedzi — pierwszą jest zawsze „brak”, bo
   użytkownik może nie chcieć danego sprzętu. */
export const AGD = [
  {id: 'lodowka',   nazwa: 'Fridge',     gdzie: ['brak', 'lewo', 'prawo'], domyslne: 'lewo',
   opis: 'Full-height unit; its column stays out of the niche.'},
  {id: 'piekarnik', nazwa: 'Oven',       gdzie: ['brak', 'lewo', 'srodek', 'prawo'], domyslne: 'srodek',
   opis: 'Built in under the worktop.'},
  {id: 'zmywarka',  nazwa: 'Dishwasher', gdzie: ['brak', 'lewo', 'prawo'], domyslne: 'prawo',
   opis: 'Behind a front, next to the sink.'},
  {id: 'mikrofala', nazwa: 'Microwave',  gdzie: ['brak', 'lewo', 'srodek', 'prawo'], domyslne: 'brak',
   opis: 'In the run above the niche.'},
  {id: 'spizarnia', nazwa: 'Tall larder', gdzie: ['brak', 'lewo', 'prawo'], domyslne: 'prawo',
   opis: 'Full-height storage closing the run.'}
];

export const PYTANIA_DODATKOWE = [
  {id: 'wysBlatu',  nazwa: 'Worktop height', opcje: [[850, '85 cm'], [900, '90 cm'], [950, '95 cm']], domyslne: 900},
  {id: 'wysNiszy',  nazwa: 'Niche height',   opcje: [[500, '50 cm'], [600, '60 cm'], [700, '70 cm']], domyslne: 600},
  {id: 'frontyWNiszy', nazwa: 'Wall units inside the niche', opcje: [[1, 'Yes'], [0, 'No']], domyslne: 1},
  {id: 'doSufitu',  nazwa: 'Run up to the ceiling', opcje: [[1, 'Yes'], [0, 'No']], domyslne: 1},
  {id: 'zlewPoStronie', nazwa: 'Sink side', opcje: [['prawo', 'Right'], ['lewo', 'Left']], domyslne: 'prawo'}
];

export const DOMYSLNE = {
  ksztalt: 'prosta',
  w: 3200, h: 2500, d: 600, dlugoscBoku: 2400, wyspaW: 2000, wyspaD: 900,
  kolor: 3, kolorNiszy: 7, wykonczenie: 'veneer',
  ...Object.fromEntries(PYTANIA_DODATKOWE.map(p => [p.id, p.domyslne])),
  ...Object.fromEntries(AGD.map(a => [a.id, a.domyslne]))
};

const SLUP = 600;                                      // moduł kuchenny 60 cm
const COKOL = 100;

/* Która kolumna dostaje sprzęt spod odpowiedzi „lewo/środek/prawo”. Kolumny skrajne bywają
   zajęte przez słupy pełnej wysokości, więc środek liczę ze środka wolnego pasma. */
const kolumnaZ = (gdzie, od, do_) => gdzie === 'lewo' ? od
  : gdzie === 'prawo' ? do_ : Math.round((od + do_) / 2);

export function modulyKuchni(o){
  const odp = {...DOMYSLNE, ...o};
  const n = Math.max(3, Math.round(odp.w / SLUP));
  const szerKol = Math.round(odp.w / n);
  const kol = Array.from({length: n}, () => szerKol);

  /* Słupy pełnej wysokości: lodówka i spiżarnia. Zajmują skrajne kolumny i wyznaczają,
     gdzie zaczyna się i kończy nisza. */
  const slupLewy = odp.lodowka === 'lewo' || odp.spizarnia === 'lewo';
  const slupPrawy = odp.lodowka === 'prawo' || odp.spizarnia === 'prawo';
  const pierwsza = slupLewy ? 2 : 1;
  const ostatnia = slupPrawy ? n - 1 : n;

  /* Rzędy od dołu: szafki pod blatem, otwór niszy, opcjonalny pas wiszący w niszy i
     zabudowa nad nią. Wysokości wynikają z blatu i z wysokości pomieszczenia. */
  const baza = Math.max(300, odp.wysBlatu - COKOL - 36);
  const niszaDol = odp.wysNiszy;
  const niszaGora = odp.frontyWNiszy ? 400 : 0;
  const gora = Math.max(0, odp.h - COKOL - baza - niszaDol - niszaGora);
  const rzed = [baza, niszaDol];
  if(niszaGora) rzed.push(niszaGora);
  if(gora > 200 && odp.doSufitu) rzed.push(gora);
  const rzadGorny = rzed.length;                       // numer ostatniego rzędu (r1 jest na dole)
  const rzadyNiszy = niszaGora ? [2, 3] : [2, 2];

  const uklady = {};
  /* Pas pod blatem: domyślnie szuflady, bo tak wyglądają wszystkie zdjęcia referencyjne. */
  for(let c = pierwsza; c <= ostatnia; c++) uklady[`r1c${c}`] = 'komoda';
  /* Zabudowa nad niszą — jednolita ściana frontów. */
  if(rzadGorny > rzadyNiszy[1])
    for(let c = 1; c <= n; c++) uklady[`r${rzadGorny}c${c}`] = 'door';
  /* Słupy: front w każdym rzędzie, żeby czytały się jako jedna pełna płyta. */
  const slup = c => { for(let r = 1; r <= rzadGorny; r++) uklady[`r${r}c${c}`] = 'door'; };
  if(slupLewy) slup(1);
  if(slupPrawy) slup(n);

  if(odp.piekarnik !== 'brak')
    uklady[`r1c${kolumnaZ(odp.piekarnik, pierwsza, ostatnia)}`] = 'oven';
  if(odp.zmywarka !== 'brak')
    uklady[`r1c${kolumnaZ(odp.zmywarka, pierwsza, ostatnia)}`] = 'door';
  if(odp.mikrofala !== 'brak' && rzadGorny > rzadyNiszy[1])
    uklady[`r${rzadGorny}c${kolumnaZ(odp.mikrofala, 1, n)}`] = 'oven';

  const barwaNiszy = KOLORY[odp.kolorNiszy][1];
  /* Zlew i blat rysuje wnęka `tresc:'kuchnia'` — to ona jest tą kolorową skrzynką ze zdjęć.
     Lustrzane odbicie daje zlew po lewej stronie. */
  const wneka = {r1: rzadyNiszy[0], r2: rzadyNiszy[1] + 1, c1: pierwsza, c2: ostatnia + 1,
                 tresc: 'kuchnia', wysun: 0, kolor: odp.kolorNiszy, barwa: barwaNiszy,
                 otwarte: true, gladka: true};

  const wspolne = {d: odp.d, nogi: 'plinth', plecy: true, wykonczenie: odp.wykonczenie,
                   kolor: odp.kolor, wnetrze: null};
  const zabudowa = opisMebla({
    id: 'kuchnia-zabudowa', nazwa: 'Kitchen · main run',
    w: odp.w, h: odp.h, kol, rzed, uklady, ...wspolne,
    pozycjaMm: [0, odp.d / 2]
  });
  zabudowa.wneki = [wneka];
  zabudowa.obrot = 0;
  zabudowa.dodatki = 0;
  zabudowa.roslina = 'brak';
  const opisy = [zabudowa];

  if(odp.ksztalt === 'naroznik'){
    const nb = Math.max(2, Math.round(odp.dlugoscBoku / SLUP));
    const bok = opisMebla({
      id: 'kuchnia-bok', nazwa: 'Kitchen · return wall',
      w: odp.dlugoscBoku, h: odp.h,
      kol: Array.from({length: nb}, () => Math.round(odp.dlugoscBoku / nb)),
      rzed: [...rzed],
      uklady: Object.fromEntries(Array.from({length: nb}, (_, c) =>
        [`r1c${c + 1}`, 'komoda']).concat(rzadGorny > rzadyNiszy[1]
          ? Array.from({length: nb}, (_, c) => [`r${rzadGorny}c${c + 1}`, 'door']) : [])),
      ...wspolne,
      kotwica: {do: 'kuchnia-zabudowa', strona: 'prawo', poziomuj: 'tyl'}
    });
    bok.obrot = 90;
    bok.dodatki = 0;
    bok.roslina = 'brak';
    opisy.push(bok);
  }

  if(odp.ksztalt === 'wyspa'){
    const nw = Math.max(2, Math.round(odp.wyspaW / SLUP));
    const wyspa = opisMebla({
      id: 'kuchnia-wyspa', nazwa: 'Kitchen · island',
      w: odp.wyspaW, h: odp.wysBlatu, d: odp.wyspaD,
      kol: Array.from({length: nw}, () => Math.round(odp.wyspaW / nw)),
      rzed: [odp.wysBlatu - COKOL],
      uklady: Object.fromEntries(Array.from({length: nw}, (_, c) => [`r1c${c + 1}`, 'komoda'])),
      nogi: 'plinth', plecy: true, wykonczenie: odp.wykonczenie,
      kolor: odp.kolor, wnetrze: null,
      pozycjaMm: [0, odp.d + 1400 + odp.wyspaD / 2]
    });
    wyspa.dodatki = 0;
    wyspa.roslina = 'brak';
    opisy.push(wyspa);
  }
  return opisy;
}

/* Krótkie podsumowanie pod przyciskiem — użytkownik widzi, co właśnie zamówił. */
export function opisKuchni(o){
  const odp = {...DOMYSLNE, ...o};
  const sprzet = AGD.filter(a => odp[a.id] !== 'brak')
    .map(a => `${a.nazwa.toLowerCase()} ${odp[a.id] === 'srodek' ? 'centre' : odp[a.id]}`);
  return `${Math.round(odp.w / 10)}×${Math.round(odp.h / 10)} cm, worktop at `
    + `${Math.round(odp.wysBlatu / 10)} cm, ${Math.round(odp.wysNiszy / 10)} cm niche in `
    + `${KOLORY[odp.kolorNiszy][0].toLowerCase()}. `
    + (sprzet.length ? sprzet.join(', ') : 'no appliances') + '.';
}
