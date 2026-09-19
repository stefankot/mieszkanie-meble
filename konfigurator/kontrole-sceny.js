/* Kontrola 38: prawdziwe kliknięcia w scenę.

   Panel da się przeklikać (kontrola 37), ale akcje użytkownika zaczynają się w widoku 3D:
   klik zaznacza moduł, dwuklik w niego wchodzi, Esc wychodzi, klik w komórkę otwiera kartę,
   a uchwyt przegrody przesuwa ściankę. Te kontrole wysyłają realne zdarzenia wskaźnika,
   a nie ruszają stanu wprost — inaczej nie widziałyby, że coś jest źle podpięte. */
import * as THREE from 'three';

import {stan, el} from './dane.js';
import {grupyMebli, kamera, renderer, ustawUjecie, frontMebla} from './scena.js';
import {resetDoFabrycznych, przelaczMebel, przebuduj} from './szafa.js';

const czekaj = ms => new Promise(r => setTimeout(r, ms));

/* Zdarzenia wskaźnika lecą przez te same uchwyty co ręka użytkownika. OrbitControls potrafi
   się wywrócić na `setPointerCapture` przy zdarzeniu syntetycznym — stąd try/catch. */
function wyslij(cel, rodzaj, x, y, opcje = {}){
  try{
    cel.dispatchEvent(new PointerEvent(rodzaj, {clientX: x, clientY: y, bubbles: true,
      pointerId: 1, isPrimary: true, button: 0, ...opcje}));
  }catch(e){ /* syntetyczne zdarzenie bez przechwytywania — reszta uchwytów i tak zadziała */ }
}
const klik = async (x, y) => { wyslij(renderer.domElement, 'pointerdown', x, y);
  wyslij(renderer.domElement, 'pointerup', x, y); await czekaj(60); };
const dwuklik = async (x, y) => { await klik(x, y);
  renderer.domElement.dispatchEvent(new MouseEvent('dblclick', {clientX: x, clientY: y, bubbles: true}));
  await czekaj(400); };

/* Punkt na ekranie, w którym na pewno widać dany moduł — środek jego bryły. */
function punktModulu(id){
  const g = grupyMebli[stan.meble.findIndex(m => m.id === id)];
  if(!g) return null;
  const p = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()).project(kamera);
  const r = renderer.domElement.getBoundingClientRect();
  return [r.left + (p.x * .5 + .5) * r.width, r.top + (-p.y * .5 + .5) * r.height];
}

export async function kontroleSceny(dodaj){
  resetDoFabrycznych();
  przelaczMebel(0);
  ustawUjecie(frontMebla());
  await czekaj(120);

  const usterki = [];
  const punkt = punktModulu('skrzydlo-glowne');
  if(!punkt) usterki.push('main wing is not on screen');

  /* Klik zaznacza moduł pod kursorem. */
  if(punkt){
    przelaczMebel(stan.meble.findIndex(m => m.id === 'skrzydlo-krotkie'));
    await czekaj(80);
    await klik(...punkt);
    if(stan.meble[stan.aktywny]?.id !== 'skrzydlo-glowne')
      usterki.push(`click selected ${stan.meble[stan.aktywny]?.id} instead of the main wing`);
  }

  /* Dwuklik wchodzi w moduł, Esc wychodzi o poziom. */
  if(punkt){
    stan.wejscie = [];
    await dwuklik(...punkt);
    if(!stan.wejscie.length) usterki.push('double-click did not enter the module');
    const gleboko = stan.wejscie.length;
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await czekaj(120);
    if(stan.wejscie.length >= gleboko) usterki.push('Esc did not leave the module');
  }

  /* W środku modułu klik w komórkę otwiera jej kartę. */
  document.querySelector('.karta')?.remove();
  przelaczMebel(stan.meble.findIndex(m => m.id === 'skrzydlo-glowne'));
  stan.wejscie = ['szafki-dolne', 'skrzydlo-glowne'];
  ustawUjecie(frontMebla());
  przebuduj(false);
  await czekaj(150);
  const komorka = el('siatka').querySelector('.komorka[data-klucz]');
  if(!komorka) usterki.push('no cells drawn inside the module');
  else{
    const r = komorka.getBoundingClientRect();
    await klik(r.left + r.width / 2, r.top + r.height / 2);
    await czekaj(120);
    if(!document.querySelector('.karta')) usterki.push('clicking a cell did not open its card');
  }
  document.querySelector('.karta')?.remove();

  /* Uchwyt przegrody: samo przeciąganie prowadzi interact.js, którego syntetyczne zdarzenia
     nie ruszą (a przesunięcie liczbowe sprawdzają kontrole 4 i 10). Tu sprawdzam to, co jest
     zwykłym uchwytem DOM — klik w ołówek ma otworzyć kartę przegrody. */
  document.querySelector('.karta')?.remove();
  const olowek = el('olowki').querySelector('.olowek');
  if(!olowek) usterki.push('no divider handles drawn');
  else{
    olowek.click();
    await czekaj(150);
    if(!document.querySelector('.karta')) usterki.push('clicking a divider handle opened no card');
  }
  document.querySelector('.karta')?.remove();

  resetDoFabrycznych();
  dodaj(38, 'clicks in the 3D view select, enter, open cell cards and reach divider handles',
    usterki.length === 0, usterki.length ? usterki.join('; ') : 'select, enter, Esc, cell card and divider handle all work');
}
