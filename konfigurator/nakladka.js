/* Nakładka nad sceną: komórki, wnęki, wymiarowanie i znaczniki mebli.
   Karty edycji są w karty.js, zaznaczanie i wybór mebli w wybor.js. */
import * as THREE from 'three';
import {stan, KOLORY, UKLAD, MM, el, cm, suma, zgodnaKolumna, zgodnaWysokosc,
        zgodnaGlebokosc} from './dane.js';
import {cokolMm} from './model.js';
import {granicaWneki, wWnece} from './wneki.js';
import {rysujZaznaczenie} from './wybor.js';
import {nazwaModulu} from './moduly.js';

import {kamera, renderer, mebel, naOsiCzolowej, grupyMebli, sciezkiAktywne} from './scena.js';

let rectyKomorek = [];                                 // prostokąty komórek w pikselach sceny
let rectyWnek = [];                                    // to samo dla wnęk — wnęka zasłania komórki pod sobą
export const komorkiEkranu = () => rectyKomorek;
export const wnekiEkranu = () => rectyWnek;

/* ---------- nakładka: komórki, ołówki przegród, pełne wymiarowanie ---------- */
/* Punkt z układu lokalnego aktywnego mebla na piksele sceny — przez macierz jego grupy,
   więc przesunięcie i obrót są uwzględnione same z siebie. */
export function rzutuj(x, y, z){
  const v = new THREE.Vector3(x * MM, y * MM, z * MM);
  const grupa = grupyMebli[stan.aktywny];
  if(grupa) grupa.localToWorld(v);
  v.project(kamera);
  const c = renderer.domElement;
  return [(v.x * .5 + .5) * c.clientWidth, (-v.y * .5 + .5) * c.clientHeight];
}

export function etykieta(x, y, tekst, klasa, zgodny){
  const uwaga = zgodny === false ? '<span class="zle">· not IKEA</span>' : '';
  return `<div class="wymiar-et ${klasa}${zgodny === false ? ' niezgodny' : ''}" style="left:${x}px;top:${y}px">${tekst}${uwaga}</div>`;
}

export function odswiezNakladke(){
  odswiezZnaczniki();
  /* Siatka komórek i uchwyty przegród pokazują się dopiero w środku modułu — jak zawartość
     grupy w Figmie, do której trzeba wejść dwuklikiem. Poza modułem scena jest czysta. */
  const siatka = el('siatka'), olowki = el('olowki');
  const front = naOsiCzolowej() && !sciezkiAktywne() && stan.wejscie.length > 0;
  siatka.hidden = olowki.hidden = !front;
  if(!front) zamknijKarte();
  if(!front || !stan.komorki.length) return;
  kamera.updateMatrixWorld();
  const z = stan.glebokoscMm / 2, W = stan.szerokoscMm, H = stan.wysokoscMm;
  rectyKomorek = stan.komorki.map(k => {
    const [a, b] = rzutuj(k.x - k.w / 2, k.y + k.h / 2, z), [c, d] = rzutuj(k.x + k.w / 2, k.y - k.h / 2, z);
    return {r: k.r, c: k.c, x1: a, y1: b, x2: c, y2: d};
  });
  let html = stan.komorki.filter(k => wWnece(k.r, k.c) < 0).map(k => {
    const [x1, y1] = rzutuj(k.x - k.w / 2, k.y + k.h / 2, z), [x2, y2] = rzutuj(k.x + k.w / 2, k.y - k.h / 2, z);
    const u = UKLAD[stan.uklady[`r${k.r}c${k.c}`]];
    const opis = stan.wymiary ? `<span class="miara">${cm(k.w)}×${cm(k.h)}</span>` : '';
    return `<div class="komorka${u ? ' ustawiona' : ''}" data-klucz="r${k.r}c${k.c}"
      style="left:${x1}px;top:${y1}px;width:${x2 - x1}px;height:${y2 - y1}px">${opis}</div>`;
  }).join('');
  rectyWnek = [];
  stan.wneki.forEach((w, i) => {
    const g = granicaWneki(w);
    if(!g) return;
    const zw = z + (w.wysun || 0);
    const [x1, y1] = rzutuj(g.x1, g.y2, zw), [x2, y2] = rzutuj(g.x2, g.y1, zw);
    rectyWnek.push({i, x1, y1, x2, y2});
    const opis = stan.wymiary ? `<span class="miara">${cm(g.sz)}×${cm(g.wys)}${w.wysun ? ' · +' + cm(w.wysun) : ''}</span>` : '';
    html += `<div class="komorka wneka" data-wneka="${i}"
      style="left:${x1}px;top:${y1}px;width:${x2 - x1}px;height:${y2 - y1}px">${opis}</div>`;
  });
  if(stan.wymiary){
    const [, yGora] = rzutuj(0, H, z), [, yDol] = rzutuj(0, 0, z);
    let x = -W / 2;
    for(const w of stan.kolumny){
      const [px] = rzutuj(x + w / 2, H, z);
      html += etykieta(px, yGora - 26, cm(w), 'gora', zgodnaKolumna(w));
      x += w;
    }
    let y = cokolMm() + stan.plytaMm;
    for(const h of stan.rzedy){
      const [px2, py] = rzutuj(-W / 2, y + h / 2, z);
      html += etykieta(px2 - 74, py, cm(h), 'lewo', zgodnaWysokosc(h));
      y += h + stan.plytaMm;
    }
    const [pxs] = rzutuj(0, 0, z);
    html += etykieta(pxs, yDol + 58, `${cm(W)} × ${cm(H)} × ${cm(stan.glebokoscMm)} deep`, 'suma',
      zgodnaGlebokosc(stan.glebokoscMm));
  }
  html += rysujZaznaczenie();
  siatka.innerHTML = html;
  if(stan.przeciaganie) return;
  const dolWnetrza = cokolMm() + stan.plytaMm;
  const [, yPod] = rzutuj(0, 0, z);
  const MAKS_UCHWYTOW = 12;                            // przy gęstej siatce uchwyty zasłaniają mebel
  let x = -W / 2 + stan.plytaMm;
  let olow = (stan.kolumny.length - 1 > MAKS_UCHWYTOW ? [] : stan.kolumny.slice(0, -1)).map((w, i) => {
    x += w;
    const [px] = rzutuj(x - stan.plytaMm / 2, 0, z);
    return `<button class="olowek" data-os="c" data-i="${i}" title="Drag to move it, click to set the size" style="left:${px}px;top:${yPod + 34}px"><i data-lucide="chevrons-left-right"></i></button>`;
  }).join('');
  let y = dolWnetrza;
  olow += (stan.rzedy.length - 1 > MAKS_UCHWYTOW ? [] : stan.rzedy.slice(0, -1)).map((h, i) => {
    y += h;
    const [px, py] = rzutuj(-W / 2, y + stan.plytaMm / 2, z);
    return `<button class="olowek pion" data-os="r" data-i="${i}" title="Drag to move it, click to set the size" style="left:${px - 34}px;top:${py}px"><i data-lucide="chevrons-up-down"></i></button>`;
  }).join('');
  olowki.innerHTML = olow;
  window.lucide?.createIcons();
}

/* ---------- karta modułu: galeria układów zależna od wymiarów ---------- */
export function zamknijKarte(){ document.querySelector('.karta')?.remove(); }

const pudloZnacznika = new THREE.Box3(), punktZnacznika = new THREE.Vector3();

export function odswiezZnaczniki(){
  const host = el('znaczniki');
  if(!host) return;
  host.hidden = stan.meble.length < 2 || sciezkiAktywne();
  if(host.hidden) return;
  if(host.children.length !== stan.meble.length)
    host.innerHTML = stan.meble.map((m, i) =>
      `<button class="znacznik" data-i="${i}"><span class="kropka"></span><span class="opis"></span></button>`).join('');
  const c = renderer.domElement;
  kamera.updateMatrixWorld();
  stan.meble.forEach((m, i) => {
    const b = host.children[i], grupa = grupyMebli[i];
    if(!b) return;
    if(!grupa){ b.hidden = true; return; }
    pudloZnacznika.setFromObject(grupa);
    punktZnacznika.set((pudloZnacznika.min.x + pudloZnacznika.max.x) / 2, pudloZnacznika.max.y,
                       (pudloZnacznika.min.z + pudloZnacznika.max.z) / 2).project(kamera);
    b.hidden = punktZnacznika.z > 1;
    b.style.left = (punktZnacznika.x * .5 + .5) * c.clientWidth + 'px';
    b.style.top = (-punktZnacznika.y * .5 + .5) * c.clientHeight + 'px';
    b.classList.toggle('aktywny', i === stan.aktywny);
    b.title = i === stan.aktywny ? 'This piece is being edited' : 'Edit this piece';
    b.querySelector('.kropka').style.background = KOLORY[m.kolor][1];
    b.querySelector('.opis').textContent = nazwaModulu(m);
  });
}

/* Prostokąt bryły mebla w pikselach sceny — zapas przy trafianiu w wąski bok. */
