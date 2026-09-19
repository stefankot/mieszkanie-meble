/* Eksport dokumentu v2 i dociąganie wymiarów do siatki IKEA LASTARE. */

import {stan, GLEB_LASTARE, SZER_LASTARE, WYS_LASTARE, cm, suma, ile, najblizszy} from './dane.js';

import {przebuduj} from './szafa.js';
import {zapiszAktywny} from './dane.js';
import {cokolMm} from './model.js';
import {czesciWnek, czesciNozek} from './wneki.js';

export function eksportDokument(){
  const d = structuredClone(stan.model);
  d.version = 'v0100-konfigurator';
  d.name = 'Wardrobe — configurator';
  d.summary = `${cm(stan.szerokoscMm)} × ${cm(stan.wysokoscMm)} × ${cm(stan.glebokoscMm)}, ` +
    `${stan.kolumny.length} columns (${stan.kolumny.map(v => Math.round(v / 10)).join('/')} cm), ` +
    `${stan.rzedy.length} rows, ${ile('drzwi')} doors, ${ile('szuflada')} drawers.`;
  d.geometry.parts = [...czesciWnek(), ...czesciNozek()];
  d.mechanics = [];
  d.notes = ['Wygenerowane przez konfigurator/szafa.html.'];
  /* Pełny stan edytora leci razem z dokumentem, żeby import odtworzył go co do komórki.
     Sam dokument zostaje poprawnym v2 — to zwykłe pole w customParameters. */
  zapiszAktywny();
  d.customParameters.konfigurator = {wersja: 2, aktywny: stan.aktywny,
                                     meble: structuredClone(stan.meble), wzorce: structuredClone(stan.wzorce)};
  delete d.parametricOverrides;
  return d;
}

/* Zaokrąglenie każdego wymiaru do najbliższego rozmiaru LASTARE: szerokości kolumn do 40/60/80,
   wysokości rzędów do 36/60/100/200, głębokość do 30/42/62. Korpus zmienia rozmiar tak,
   żeby suma się zgadzała — nie rozciągamy modułów. */
export function dociagnijDoIkea(){
  const t = stan.plytaMm;
  stan.glebokoscMm = najblizszy(stan.glebokoscMm, GLEB_LASTARE);
  const kol = stan.kolumny.map(w => najblizszy(w, SZER_LASTARE));
  while(suma(kol) > 5000){
    const i = kol.indexOf(Math.max(...kol));
    const mniejsze = SZER_LASTARE.filter(v => v < kol[i]);
    if(!mniejsze.length) break;
    kol[i] = mniejsze.at(-1);
  }
  const rz = stan.rzedy.map(h => najblizszy(h, WYS_LASTARE));
  const wysokosc = () => suma(rz) + (rz.length - 1) * t + 2 * t + cokolMm();
  while(wysokosc() > 3400){
    const i = rz.indexOf(Math.max(...rz));
    const mniejsze = WYS_LASTARE.filter(v => v < rz[i]);
    if(!mniejsze.length) break;
    rz[i] = mniejsze.at(-1);
  }
  stan.szerokoscMm = suma(kol);
  stan.wysokoscMm = wysokosc();
  stan.kolumnyWlasne = kol;
  stan.rzedyWlasne = rz;
  stan.wymiary = true;
  document.querySelector('.ikona[data-akcja="wymiary"]')?.classList.add('aktywny');
  przebuduj();
}

