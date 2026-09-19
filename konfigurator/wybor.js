/* Zaznaczanie komórek, przeciąganie przegród i wybór edytowanego mebla. */
import * as THREE from 'three';
import {stan, MIN_KOMORKA, el, zacisk} from './dane.js';

import {wWnece} from './wneki.js';
import {zapisTorow} from './siatka.js';
import {kamera, renderer, mebel, grupyMebli} from './scena.js';
import {przebuduj, przelaczMebel, wejdzWModul} from './szafa.js';
import {sciezkaDo} from './moduly.js';
import {rzutuj, zamknijKarte, odswiezNakladke, komorkiEkranu, wnekiEkranu} from './nakladka.js';
import {otworzKarte, kartaWneki, kartaPrzegrody} from './karty.js';

let ostatnieCiagniecie = 0;
let zaznaczenie = null;                                // {r1,r2,c1,c2} — bieżący obszar
let ciagniecie = null;
const raycaster = new THREE.Raycaster(), wsk = new THREE.Vector2();
const pudloMebla = new THREE.Box3(), punktMebla = new THREE.Vector3();

export function przesunPrzegrode(os, i, deltaMm){
  const lista = os === 'c' ? [...stan.kolumny] : [...stan.rzedy];
  const razem = lista[i] + lista[i + 1];
  const a = zacisk(Math.round((lista[i] + deltaMm) / 10) * 10, MIN_KOMORKA, razem - MIN_KOMORKA);
  if(a === lista[i]) return false;
  lista[i] = a;
  lista[i + 1] = razem - a;
  if(os === 'c') stan.kolumnyWlasne = lista; else stan.rzedyWlasne = lista;
  if(stan.styl === 'custom'){                          // pole siatki pokazuje to, co ustawiła myszka
    if(os === 'c') stan.siatkaKol = zapisTorow(lista); else stan.siatkaRzed = zapisTorow(lista);
  }
  przebuduj(false);
  return true;
}

export function wlaczPrzeciaganie(){
  el('olowki').addEventListener('click', e => {        // klik (bez przeciągnięcia) otwiera kartę przegrody
    const b = e.target.closest('.olowek');
    if(b && Date.now() - ostatnieCiagniecie > 300) kartaPrzegrody(b.dataset.os, +b.dataset.i, b.getBoundingClientRect());
  });
  const skala = () => {
    const [a] = rzutuj(0, stan.wysokoscMm / 2, stan.glebokoscMm / 2);
    const [b] = rzutuj(1000, stan.wysokoscMm / 2, stan.glebokoscMm / 2);
    return 1000 / Math.max(1e-6, b - a);
  };
  window.interact('.olowek').draggable({
    listeners: {
      start(e){
        stan.przeciaganie = {os: e.target.dataset.os, i: +e.target.dataset.i, mm: 0, s: skala(),
                        start: (e.target.dataset.os === 'c' ? stan.kolumny : stan.rzedy)[+e.target.dataset.i]};
        e.target.classList.add('ciagniety');
      },
      move(e){
        const pion = stan.przeciaganie.os === 'r';
        stan.przeciaganie.mm += (pion ? -e.dy : e.dx) * stan.przeciaganie.s;
        e.target.style[pion ? 'top' : 'left'] =
          (parseFloat(e.target.style[pion ? 'top' : 'left']) + (pion ? e.dy : e.dx)) + 'px';
        przesunPrzegrode(stan.przeciaganie.os, stan.przeciaganie.i, stan.przeciaganie.start + stan.przeciaganie.mm
          - (stan.przeciaganie.os === 'c' ? stan.kolumny : stan.rzedy)[stan.przeciaganie.i] + 0);
      },
      end(e){
        e.target.classList.remove('ciagniety');
        const ruszony = Math.abs(stan.przeciaganie.mm) > 1;
        stan.przeciaganie = null;
        ostatnieCiagniecie = ruszony ? Date.now() : 0;
        przebuduj();                                   // jeden wpis historii na całe przeciągnięcie
      }
    }
  });
}

/* ---------- zaznaczanie obszaru: klik, potem uchwyty w rogach (wzór cssgridgenerator) ---------- */
function prostokatZaznaczenia(){
  if(!zaznaczenie) return null;
  const w = komorkiEkranu().filter(k => k.r >= zaznaczenie.r1 && k.r <= zaznaczenie.r2
                                  && k.c >= zaznaczenie.c1 && k.c <= zaznaczenie.c2);
  if(!w.length) return null;
  return {x1: Math.min(...w.map(k => k.x1)), y1: Math.min(...w.map(k => k.y1)),
          x2: Math.max(...w.map(k => k.x2)), y2: Math.max(...w.map(k => k.y2))};
}

export function rysujZaznaczenie(){
  const p = prostokatZaznaczenia();
  if(!p) return '';
  const z = zaznaczenie, rzedow = z.r2 - z.r1 + 1, kolumn = z.c2 - z.c1 + 1;
  const jedna = rzedow === 1 && kolumn === 1;
  const wnekaTu = wWnece(z.r1, z.c1) >= 0;
  const rogi = [['nw', p.x1, p.y1], ['ne', p.x2, p.y1], ['sw', p.x1, p.y2], ['se', p.x2, p.y2]]
    .map(([id, x, y]) => `<button class="rog ${id}" data-rog="${id}" style="left:${x}px;top:${y}px"
      title="Drag to cover more cells"><i data-lucide="move-diagonal${id === 'ne' || id === 'sw' ? '-2' : ''}"></i></button>`).join('');
  const podpis = jedna ? 'Drag a corner to merge cells into one niche'
                       : `${kolumn} × ${rzedow} cells${wnekaTu ? ' · niche' : ' — release to merge'}`;
  return `<div class="zaznaczenie" style="left:${p.x1}px;top:${p.y1}px;width:${p.x2 - p.x1}px;height:${p.y2 - p.y1}px"></div>
    <div class="zaznaczenie-podpis" style="left:${(p.x1 + p.x2) / 2}px;top:${p.y1 - 14}px">${podpis}</div>${rogi}`;
}

function komorkaWPunkcie(clientX, clientY, tylkoWprost){
  const r = renderer.domElement.getBoundingClientRect();
  const x = clientX - r.left, y = clientY - r.top;
  let najlepsza = null, dystans = Infinity;
  for(const k of komorkiEkranu()){
    if(x >= k.x1 && x <= k.x2 && y >= k.y1 && y <= k.y2) return k;
    if(tylkoWprost) continue;
    const dx = Math.max(k.x1 - x, 0, x - k.x2), dy = Math.max(k.y1 - y, 0, y - k.y2);
    const d = dx * dx + dy * dy;
    if(d < dystans){ dystans = d; najlepsza = k; }
  }
  return najlepsza;                                    // poza siatką bierzemy najbliższą, żeby nie gubić ruchu
}

function zastosujZaznaczenie(){
  const z = zaznaczenie;
  if(!z) return;
  const jedna = z.r1 === z.r2 && z.c1 === z.c2;
  const bylo = JSON.stringify(stan.wneki);
  stan.wneki = stan.wneki.filter(w => w.r2 < z.r1 || w.r1 > z.r2 || w.c2 < z.c1 || w.c1 > z.c2);
  if(!jedna){
    for(let r = z.r1; r <= z.r2; r++) for(let c = z.c1; c <= z.c2; c++) delete stan.uklady[`r${r}c${c}`];
    stan.wneki.push({r1: z.r1, r2: z.r2, c1: z.c1, c2: z.c2, tresc: 'pusta', wysun: 0, kolor: null, otwarte: false});
  }
  if(JSON.stringify(stan.wneki) !== bylo) przebuduj(); else odswiezNakladke();
}

export function wlaczZaznaczanie(){
  const siatka = el('siatka');
  const ustaw = (od, doKom) => {
    zaznaczenie = {r1: Math.min(od.r, doKom.r), r2: Math.max(od.r, doKom.r),
                   c1: Math.min(od.c, doKom.c), c2: Math.max(od.c, doKom.c)};
    odswiezNakladke();
  };
  /* Po siatce da się ciągnąć tylko uchwyty w rogach; przeciąganie po samym meblu
     należy do sceny, więc komórki w ogóle nie łapią wskaźnika. */
  siatka.addEventListener('pointerdown', e => {
    const rog = e.target.closest('.rog');
    if(!rog || !zaznaczenie) return;
    const z = zaznaczenie;
    ciagniecie = {kotwica: {r: rog.dataset.rog[0] === 'n' ? z.r1 : z.r2,
                            c: rog.dataset.rog[1] === 'w' ? z.c2 : z.c1}};
    try{ siatka.setPointerCapture(e.pointerId); }catch(err){ /* zdarzenie bez wskaźnika */ }
    e.preventDefault();
    e.stopPropagation();
  });
  siatka.addEventListener('pointermove', e => {
    if(!ciagniecie) return;
    const k = komorkaWPunkcie(e.clientX, e.clientY);
    if(k) ustaw(ciagniecie.kotwica, k);
  });
  siatka.addEventListener('pointerup', e => {
    if(!ciagniecie) return;
    ciagniecie = null;
    try{ siatka.releasePointerCapture(e.pointerId); }catch(err){ /* już zwolniony */ }
    zastosujZaznaczenie();
    pokazKarteObszaru();
  });
}

/* Otwiera kartę tego, co jest aktualnie zaznaczone: wnęki albo pojedynczej komórki. */
export function pokazKarteObszaru(){
  const z = zaznaczenie;
  if(!z) return;
  const siatka = el('siatka');
  const i = wWnece(z.r1, z.c1);
  const cel = i >= 0 ? siatka.querySelector(`.wneka[data-wneka="${i}"]`)
                     : siatka.querySelector(`.komorka[data-klucz="r${z.r1}c${z.c1}"]`);
  const rect = cel ? cel.getBoundingClientRect() : {left: 0, top: 0, width: 0, height: 0};
  if(i >= 0) kartaWneki(i, rect);
  else otworzKarte(`r${z.r1}c${z.c1}`, rect);
}

/* Klik w mebel: wybiera komórkę albo wnękę pod kursorem i otwiera jej kartę. */
export function zaznaczWPunkcie(clientX, clientY){
  /* Wnęka zasłania komórki pod sobą i ma własne przegrody — klik w jej środek wypadał między
     prostokątami komórek i nic się nie otwierało. Najpierw więc pytam o wnęki. */
  const r = renderer.domElement.getBoundingClientRect();
  const px = clientX - r.left, py = clientY - r.top;
  const trafiona = wnekiEkranu().find(w => px >= w.x1 && px <= w.x2 && py >= w.y1 && py <= w.y2);
  const k = trafiona ? {r: stan.wneki[trafiona.i].r1, c: stan.wneki[trafiona.i].c1}
                     : komorkaWPunkcie(clientX, clientY, true);
  if(!k) return false;
  const i = wWnece(k.r, k.c);
  const w = i >= 0 ? stan.wneki[i] : null;
  zaznaczenie = w ? {r1: w.r1, r2: w.r2, c1: w.c1, c2: w.c2} : {r1: k.r, r2: k.r, c1: k.c, c2: k.c};
  odswiezNakladke();
  pokazKarteObszaru();
  return true;
}

/* Podświetlenie komórki pod kursorem — CSS :hover nie zadziała, bo nakładka nie łapie wskaźnika. */
export function podswietlWPunkcie(clientX, clientY){
  const k = clientX == null ? null : komorkaWPunkcie(clientX, clientY, true);
  const klucz = k ? `r${k.r}c${k.c}` : null;
  const i = k ? wWnece(k.r, k.c) : -1;
  el('siatka').querySelectorAll('.komorka').forEach(d => d.classList.toggle('podswietlona',
    (i >= 0 && d.dataset.wneka === String(i)) || (i < 0 && d.dataset.klucz === klucz)));
}

export function czyscZaznaczenie(){ zaznaczenie = null; }

/* Koniec edycji obszaru: karta znika razem z uchwytami w rogach. */
export function zakonczEdycje(){
  zamknijKarte();
  if(!zaznaczenie) return;
  zaznaczenie = null;
  odswiezNakladke();
}

/* Najechanie na inny mebel pokazuje przycisk, a kliknięcie w niego od razu go edytuje. */

/* Mebel obrócony o 90° widać z frontu tylko jako wąski bok — trafienie w niego kursorem
   jest loterią. Dlatego każdy mebel dostaje własny znacznik nad bryłą: widać go pod każdym
   kątem, a klik przełącza edycję. Pozycje liczę przy każdej zmianie kamery. */

export function obrysMebla(i){
  const grupa = grupyMebli[i];
  if(!grupa) return null;
  pudloMebla.setFromObject(grupa);
  if(pudloMebla.isEmpty()) return null;
  const c = renderer.domElement, r = c.getBoundingClientRect();
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for(let k = 0; k < 8; k++){
    punktMebla.set(k & 1 ? pudloMebla.max.x : pudloMebla.min.x,
                       k & 2 ? pudloMebla.max.y : pudloMebla.min.y,
                       k & 4 ? pudloMebla.max.z : pudloMebla.min.z).project(kamera);
    if(punktMebla.z > 1) return null;
    const x = r.left + (punktMebla.x * .5 + .5) * r.width, y = r.top + (-punktMebla.y * .5 + .5) * r.height;
    x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y);
  }
  pudloMebla.getCenter(punktMebla);
  return {x1, y1, x2, y2, dystans: kamera.position.distanceTo(punktMebla)};
}

/* Najpierw dokładne trafienie w bryłę. Gdy kursor mija ją o włos — a przy meblu widzianym
   z boku to kwestia kilku pikseli — biorę najbliższy mebel, którego obrys mieści punkt. */

export function mebelWPunkcie(clientX, clientY, zapas = 14){
  const r = renderer.domElement.getBoundingClientRect();
  wsk.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(wsk, kamera);
  let obiekt = raycaster.intersectObject(mebel, true)[0]?.object;
  while(obiekt && obiekt.userData.mebel === undefined) obiekt = obiekt.parent;
  if(obiekt) return obiekt.userData.mebel;
  let najlepszy = -1, najblizej = Infinity;
  for(let i = 0; i < grupyMebli.length; i++){
    const o = obrysMebla(i);
    if(!o || o.dystans >= najblizej) continue;
    if(clientX < o.x1 - zapas || clientX > o.x2 + zapas || clientY < o.y1 - zapas || clientY > o.y2 + zapas) continue;
    najlepszy = i;
    najblizej = o.dystans;
  }
  return najlepszy;
}

export function wlaczHoverMebli(){
  let wcisniety = null;

  /* Znacznik nad meblem to pewna droga do przełączenia — działa też wtedy, gdy bryła
     jest ustawiona bokiem i nie ma w co celować. */
  el('znaczniki').addEventListener('click', e => {
    const b = e.target.closest('.znacznik');
    if(b && +b.dataset.i !== stan.aktywny) przelaczMebel(+b.dataset.i);
  });

  const podswietlZnacznik = i => el('znaczniki').querySelectorAll('.znacznik')
    .forEach((b, k) => b.classList.toggle('blisko', k === i && k !== stan.aktywny));

  renderer.domElement.addEventListener('pointermove', e => {
    if(stan.przeciaganie || stan.meble.length < 2) return;
    const i = mebelWPunkcie(e.clientX, e.clientY);
    renderer.domElement.style.cursor = i >= 0 && i !== stan.aktywny ? 'pointer' : '';
    podswietlWPunkcie(i === stan.aktywny ? e.clientX : null, e.clientY);
    podswietlZnacznik(i);
  });

  /* Klik w bryłę innego mebla przełącza edycję od razu; obrót sceny nie liczy się jako klik. */
  /* Dwuklik wchodzi w moduł pod kursorem — tak jak dwuklik w grupę w Figmie. */
  renderer.domElement.addEventListener('dblclick', e => {
    const i = mebelWPunkcie(e.clientX, e.clientY);
    if(i >= 0 && stan.meble[i]) wejdzWModul(stan.meble[i].id);
  });
  renderer.domElement.addEventListener('pointerdown', e => { wcisniety = {x: e.clientX, y: e.clientY}; });
  renderer.domElement.addEventListener('pointerup', e => {
    if(!wcisniety) return;
    const ruch = Math.hypot(e.clientX - wcisniety.x, e.clientY - wcisniety.y);
    wcisniety = null;
    if(ruch > 5) return;                               // to był obrót sceny, nie klik
    const i = mebelWPunkcie(e.clientX, e.clientY);
    const wejsciowy = stan.wejscie.at(-1);
    /* W środku modułu pojedynczy klik zawsze celuje w ten moduł — otwiera kartę komórki pod
       kursorem, nawet jeśli w komórce siedzi moduł osadzony. Do dziecka wchodzi się dwuklikiem,
       jak w Figmie. Klik poza wnętrzem wychodzi z modułu i przełącza się na trafiony. */
    if(wejsciowy){
      const trafiony = i >= 0 ? stan.meble[i]?.id : null;
      if(trafiony && sciezkaDo(trafiony).includes(wejsciowy))
        return zaznaczWPunkcie(e.clientX, e.clientY);
      if(i >= 0){
        stan.wejscie = [];
        return przelaczMebel(i);
      }
      return;
    }
    if(i >= 0 && i !== stan.aktywny) przelaczMebel(i);
  });

  el('scena').addEventListener('pointerleave', () => { podswietlZnacznik(-1); podswietlWPunkcie(null); });
}

