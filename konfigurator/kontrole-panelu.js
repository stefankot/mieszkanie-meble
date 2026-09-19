/* Kontrola 37: przeklikanie całego panelu.

   Pozostałe kontrole ruszają `stan` wprost, więc nie widzą usterek samego panelu — a to
   właśnie tam psują się akcje użytkownika (kontrolka, która nic nie robi, źle podpięty
   odświeżacz, wiersz widoczny mimo `hidden`). Ta kontrola klika każdy przycisk, przesuwa
   każdy suwak i przestawia każdą listę, a potem pyta: czy dokument w ogóle się zmienił?
   Kontrolka, po której nic się nie stało, trafia na listę martwych. */
import * as THREE from 'three';
import {sprawdzParametryczny} from 'https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js';

import {stan} from './dane.js';
import {grupyMebli} from './scena.js';
import {migawka, przebuduj, resetDoFabrycznych, wejdzWModul} from './szafa.js';

const czekaj = ms => new Promise(r => setTimeout(r, ms));

/* Kontrolki, które z natury nie zmieniają dokumentu — nie są zepsute, po prostu robią co innego. */
const BEZ_ZMIANY = /Create component|Reset all|Detach|Attach to|duplikuj|usun|Add module|Cancel/i;

function opisKontrolki(el){
  const w = el.closest('.wiersz');
  const etykieta = w?.querySelector('.etykieta')?.textContent?.trim()
    || el.closest('.sekcja')?.querySelector('.sekcja-naglowek span')?.textContent?.trim() || '?';
  const co = el.tagName === 'SL-RANGE' ? 'slider' : el.tagName === 'SELECT' ? 'select'
    : el.classList.contains('probnik') ? 'swatch' : `button „${el.textContent.trim().slice(0, 14)}"`;
  return `${etykieta} → ${co}`;
}

/* Jedno kliknięcie/przestawienie i odpowiedź: czy dokument się zmienił. */
async function ruszKontrolke(el){
  const przed = migawka();
  if(el.tagName === 'SL-RANGE'){
    const min = +el.min || 0, max = +el.max || 100, teraz = +el.value;
    el.value = Math.abs(teraz - max) > Math.abs(teraz - min) ? max : min;
    el.dispatchEvent(new CustomEvent('sl-input'));
  }else if(el.tagName === 'SELECT'){
    const inna = [...el.options].find(o => o.value !== el.value);
    if(!inna) return null;                             // jedna opcja — nie ma czego sprawdzać
    el.value = inna.value;
    el.dispatchEvent(new Event('change', {bubbles: true}));
  }else{
    if(el.classList.contains('aktywny')) return null;  // klik w już wybrane nic nie zmienia i dobrze
    el.click();
  }
  await czekaj(30);
  return migawka() !== przed;
}

/* Po każdej akcji pytam nie tylko „czy coś się zmieniło", ale też „czy wynik trzyma się
   kupy": dokument musi przejść walidację silnika, żadna część nie może mieć NaN, a każdy
   moduł musi mieć z czego się złożyć. To łapie akcje, które działają, ale psują mebel. */
function zdrowie(){
  try{ sprawdzParametryczny(stan.model.parametric); }
  catch(e){ return 'invalid document: ' + e.message; }
  for(const cz of stan.czesci){
    const liczby = [...(cz.sizeMm || []), ...(cz.positionMm || [])];
    if(liczby.some(v => typeof v === 'number' && !Number.isFinite(v))) return `NaN in part ${cz.id}`;
    if((cz.sizeMm || []).some(v => v <= 0)) return `non-positive size in part ${cz.id}`;
  }
  for(const g of grupyMebli){
    let ma = false;
    g.traverse(o => { if(o.isMesh) ma = true; });
    if(!ma) return `module ${g.userData.id} has no geometry`;
  }
  const pudlo = new THREE.Box3().setFromObject(grupyMebli[0]?.parent || grupyMebli[0]);
  if(pudlo.isEmpty() || !Number.isFinite(pudlo.min.x)) return 'scene bounding box is not finite';
  return null;
}

export async function kontrolePanelu(dodaj){
  resetDoFabrycznych();
  const martwe = [], ruszone = [], zepsute = [];
  /* Każdy moduł ma inny zestaw kontrolek, więc przechodzę po kilku: korpus i osadzony. */
  for(const id of ['skrzydlo-glowne', 'nisza-koralowa']){
    wejdzWModul(id);
    await czekaj(40);
    const widoczne = [...document.querySelectorAll('#wiersze sl-range, #wiersze select, '
      + '#wiersze .grupa button, #wiersze .probnik, #wiersze .komponent button')]
      .filter(el => el.offsetParent !== null && !BEZ_ZMIANY.test(opisKontrolki(el)));
    for(const el of widoczne){
      if(!el.isConnected || el.offsetParent === null) continue;   // panel przerysował się pod ręką
      const opis = `${id}: ${opisKontrolki(el)}`;
      const wynik = await ruszKontrolke(el);
      if(wynik === null) continue;
      const chore = zdrowie();
      if(chore) zepsute.push(`${opis} → ${chore}`);
      (wynik ? ruszone : martwe).push(opis);
    }
  }
  resetDoFabrycznych();
  dodaj(37, 'every visible panel control changes the design and leaves it valid',
    martwe.length === 0 && zepsute.length === 0,
    `${ruszone.length} controls responded`
    + (martwe.length ? `, ${martwe.length} did nothing: ${martwe.slice(0, 6).join('; ')}` : '')
    + (zepsute.length ? `, ${zepsute.length} broke the design: ${zepsute.slice(0, 6).join('; ')}` : ''));
}
