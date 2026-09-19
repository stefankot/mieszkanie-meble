/* Kontrole 3–12: kontrolki panelu, przegrody, przemiatanie wymiarów, zgodność z IKEA, karty. */
import * as THREE from 'three';
import {sprawdzParametryczny} from 'https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js';
import {stan, SZER_LASTARE, WYS_LASTARE, GLEB_LASTARE, MIN_KOMORKA, el, suma, cm} from './dane.js';

import {eksportDokument, dociagnijDoIkea} from './eksport.js';
import {ustawUjecie} from './scena.js';

import {przesunPrzegrode, zaznaczWPunkcie} from './wybor.js';

import {przebuduj, wejdzWModul} from './szafa.js';

export async function kontrolePodstaw(dodaj){
  const odcisk = () => JSON.stringify(stan.czesci.map(c => [c.id, c.sizeMm, c.positionMm]));
  const eksport = () => JSON.stringify(eksportDokument());
  /* Nakładka, karty i uchwyty żyją dopiero w środku modułu — testy wchodzą tak jak człowiek. */
  const wejdzWAktywny = () => wejdzWModul(stan.meble[stan.aktywny]?.id);
  wejdzWAktywny();
  stan.szerokoscMm = 1000;
  przebuduj();
  for(const [nazwa, zmien, tylkoMaterial] of [
    ['Width', () => stan.szerokoscMm = 1800], ['Height', () => stan.wysokoscMm = 1800],
    ['Depth', () => stan.glebokoscMm = 620], ['Style', () => stan.styl = 'pattern'],
    ['Density', () => stan.gestosc = 80], ['Feet / plinth', () => stan.nogi = 'none'],
    ['Back panels', () => stan.plecy = false], ['Module layout on one cell', () => stan.uklady.r1c1 = 'door2'],
    ['Finish', () => stan.wykonczenie = stan.wykonczenie === 'board' ? 'veneer' : 'board', true], ['Colour', () => stan.kolor = 15, true]
  ]){
    const g = odcisk(), j = eksport();
    zmien();
    przebuduj();
    dodaj(3, `control ${nazwa}`, j !== eksport() && (tylkoMaterial || g !== odcisk()),
      tylkoMaterial ? 'export changed, geometry unchanged by design' : 'geometry and export changed');
  }
  stan.kolumnyWlasne = null;
  stan.szerokoscMm = 1200;
  przebuduj();
  const przed = suma(stan.kolumny), pierwszaKol = stan.kolumny[0], wpisy = stan.historia.length;
  stan.przeciaganie = {os: 'c', i: 0};
  przesunPrzegrode('c', 0, -180);
  stan.przeciaganie = null;
  przebuduj();
  dodaj(4, 'column divider moves the sections and keeps the total, one history entry',
    Math.abs(suma(stan.kolumny) - przed) <= 1 && Math.abs(stan.kolumny[0] - pierwszaKol) > 1
      && stan.historia.length === wpisy + 1,
    `${Math.round(pierwszaKol)} → ${Math.round(stan.kolumny[0])} mm, total ${przed} → ${suma(stan.kolumny)} mm, history ${wpisy} → ${stan.historia.length}`);
  const przedR = suma(stan.rzedy), pierwszyRz = stan.rzedy[0];
  stan.przeciaganie = {os: 'r', i: 0};
  przesunPrzegrode('r', 0, 120);
  stan.przeciaganie = null;
  przebuduj();
  dodaj(4, 'row divider moves the sections and keeps the total',
    Math.abs(suma(stan.rzedy) - przedR) <= 1 && Math.abs(stan.rzedy[0] - pierwszyRz) > 1,
    `${Math.round(pierwszyRz)} → ${Math.round(stan.rzedy[0])} mm, total ${przedR} → ${suma(stan.rzedy)} mm`);
  const rz = [...stan.rzedy];
  stan.rzedyWlasne = null;
  przebuduj(false);
  stan.przeciaganie = {os: 'r', i: 0};
  przesunPrzegrode('r', 0, 400 - stan.rzedy[0]);
  stan.przeciaganie = null;
  przebuduj();
  dodaj(10, 'picking an exact row height gives exactly that height', Math.abs(stan.rzedy[0] - 400) <= 1,
    `asked 400 mm, got ${Math.round(stan.rzedy[0])} mm`);
  wejdzWAktywny();
  ustawUjecie(new THREE.Vector3(.44, .17, 1));
  const schowana = el('siatka').hidden;
  ustawUjecie(new THREE.Vector3(0, 0, 1));
  /* Widok zostaje tam, gdzie go zostawisz — nakładka ma wracać sama, gdy wrócisz na oś. */
  dodaj(5, 'overlay hides off-axis and comes back head-on, and the view never moves on its own',
    schowana && !el('siatka').hidden,
    `off-axis hidden=${schowana}, head-on hidden=${el('siatka').hidden}`);
  let w6 = 'threw';
  try{ w6 = String(sprawdzParametryczny(eksportDokument().parametric)); }catch(e){ w6 = e.message; }
  dodaj(6, 'sprawdzParametryczny(eksport().parametric)', w6 === 'true', `returned ${w6}`);
  let linie = -1;
  try{ linie = (await (await fetch('szafa.js?' + Date.now())).text()).split('\n').filter(l => l.trim()).length; }catch(e){ }
  dodaj(7, 'own JS line count', linie > 0, `szafa.js = ${linie} non-blank lines`);
  let bledy = 0, prob = 0;
  for(const W of [400, 800, 1200, 2000, 2800, 3600]) for(const H of [400, 900, 1600, 2600])
    for(const D of [240, 420, 800]) for(const styl of ['grid', 'mosaic', 'pixel']){
      prob++;
      Object.assign(stan, {szerokoscMm: W, wysokoscMm: H, glebokoscMm: D, styl, kolumnyWlasne: null, rzedyWlasne: null});
      try{ przebuduj(false); sprawdzParametryczny(eksportDokument().parametric); }catch(e){ bledy++; }
    }
  dodaj(8, 'dimension sweep without errors', bledy === 0, `${prob - bledy}/${prob} configurations valid`);
  const rzedyOk = stan.rzedy.every(h => h >= MIN_KOMORKA);
  dodaj(9, 'every row at least 20 cm', rzedyOk, `rows ${stan.rzedy.map(v => Math.round(v / 10)).join('/')} cm`);
  Object.assign(stan, {szerokoscMm: 2350, wysokoscMm: 2130, glebokoscMm: 470, gestosc: 45,
                       kolumnyWlasne: null, rzedyWlasne: null});
  przebuduj(false);
  const przedSnap = `${stan.kolumny.map(v => Math.round(v)).join('/')} · ${stan.rzedy.map(v => Math.round(v)).join('/')} · ${stan.glebokoscMm}`;
  dociagnijDoIkea();
  const kolOk = stan.kolumny.every(w => SZER_LASTARE.some(v => Math.abs(v - w) <= 1));
  const rzOk = stan.rzedy.every(h => WYS_LASTARE.some(v => Math.abs(v - h) <= 1));
  const glOk = GLEB_LASTARE.includes(stan.glebokoscMm);
  dodaj(11, 'snap to IKEA lands every size on a LASTARE dimension', kolOk && rzOk && glOk,
    `${przedSnap} → ${stan.kolumny.map(v => Math.round(v)).join('/')} · ${stan.rzedy.map(v => Math.round(v)).join('/')} · ${stan.glebokoscMm}`);

  /* Karty: każda musi się otworzyć, mieć treść i klikalne zamknięcie. Handler, który
     po cichu rzuca wyjątkiem, przechodziłby wszystkie pozostałe kontrole. */
  Object.assign(stan, {szerokoscMm: 2400, wysokoscMm: 2200, gestosc: 40, wykonczenie: 'board',
                       kolumnyWlasne: null, rzedyWlasne: null, uklady: {}});
  przebuduj(false);                                    // znana siatka, żeby nisza miała gdzie powstać
  wejdzWAktywny();
  stan.wneki = [{r1: 1, r2: 2, c1: 1, c2: 2, tresc: 'polka', wysun: 100, kolor: 5, otwarte: false}];
  przebuduj(false);
  /* Komórki nie łapią wskaźnika (przeciąganie należy do sceny), więc klikamy je
     geometrycznie — tą samą drogą, którą idzie kliknięcie użytkownika w mebel. */
  const puk = elem => {
    const r = elem.getBoundingClientRect();
    zaznaczWPunkcie(r.left + r.width / 2, r.top + r.height / 2);
  };
  const karty = {};
  for(const [nazwa, akcja] of [
    ['niche', () => puk(el('siatka').querySelector('.wneka'))],
    ['cell', () => puk(el('siatka').querySelector('.komorka[data-klucz]'))],
    ['divider', () => el('olowki').querySelector('.olowek')?.click()]
  ]){
    document.querySelector('.karta')?.remove();
    let blad = '';
    try{ akcja(); }catch(e){ blad = e.message; }
    await new Promise(r => setTimeout(r, 60));
    const k = document.querySelector('.karta');
    karty[nazwa] = !blad && !!k && !!k.querySelector('h3') && !!k.querySelector('.karta-zamknij svg');
    if(blad) karty[nazwa + '-blad'] = blad;
  }
  document.querySelector('.karta')?.remove();
  dodaj(12, 'every editing card opens with a working close icon',
    karty.niche && karty.cell && karty.divider,
    Object.entries(karty).map(([k, v]) => `${k}=${v}`).join(', '));

}
