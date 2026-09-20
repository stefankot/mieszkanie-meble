/* Karty edycji: komórka, wnęka i przegroda. Rysowanie nakładki jest w nakladka.js. */
import * as THREE from 'three';
import {stan, KOLORY, UKLAD, MIN_KOMORKA, el, cm, suma, zacisk, ukladyDlaKomorki,
        frontKomorki, zgodnaKolumna, zgodnoscUkladu} from './dane.js';

import {granicaWneki, WNEKA_TRESC} from './wneki.js';

import {przebuduj, zapisz} from './szafa.js';
import {zamknijKarte, komorkiEkranu} from './nakladka.js';
import {przesunPrzegrode, zakonczEdycje} from './wybor.js';

export function miniatura(id, u, custom, aktywny){
  const n = u.polki + 1, wys = 34 / n, p = [];
  for(let i = 0; i < n; i++)
    p.push(`<rect x="3.5" y="${3.5 + i * wys}" width="21" height="${wys - 1}" fill="#eceae6" stroke="#8d8880" stroke-width="1"/>`);
  if(u.drazek) p.push('<line x1="5" y1="8" x2="23" y2="8" stroke="#8d8880" stroke-width="1.6"/>');
  for(let i = 0; i < (u.kosze || 0); i++)
    p.push(`<rect x="5" y="${34 - (i + 1) * 9}" width="18" height="7" fill="#d5d0c8" stroke="#8d8880" stroke-width=".8"/>`);
  if(u.front === 'komoda')
    for(let i = 0; i < 4; i++)
      p.push(`<rect x="3.5" y="${3.5 + i * 8.6}" width="21" height="7.6" fill="#d8d3cb" stroke="#4a463f" stroke-width=".9"/>`);
  if(u.front === 'drzwi') p.push('<rect x="3.5" y="3.5" width="21" height="34" fill="#d8d3cb" fill-opacity=".85" stroke="#4a463f"/><line x1="21" y1="18" x2="21" y2="24" stroke="#4a463f" stroke-width="1.6"/>');
  if(u.front === 'szuflada') p.push('<rect x="3.5" y="3.5" width="21" height="34" fill="#d8d3cb" fill-opacity=".85" stroke="#4a463f"/><line x1="10" y1="21" x2="18" y2="21" stroke="#4a463f" stroke-width="1.6"/>');
  return `<button class="uklad-mini${aktywny ? ' aktywny' : ''}${custom ? ' custom' : ''}" data-id="${id}" title="${u.nazwa}${custom ? ' — fittings made to measure' : ''}"><svg viewBox="0 0 28 41">${p.join('')}</svg></button>`;
}

export function trybRzedu(r){
  const w = stan.kolumny.map((_, i) => frontKomorki(`r${r}c${i + 1}`));
  return w.every(v => !v) ? 'none' : w.every(v => v) ? 'max' : 'some';
}

export function ustawRzad(r, tryb){
  stan.kolumny.forEach((_, i) => {
    const klucz = `r${r}c${i + 1}`;
    if(tryb === 'none' || (tryb === 'some' && i % 2)) delete stan.uklady[klucz];
    else stan.uklady[klucz] = 'door';
  });
  przebuduj();
}

export function zmienWysokoscRzedu(r, delta){
  const h = [...stan.rzedy], i = r - 1, j = r < h.length ? r : r - 2;
  if(j < 0 || h[i] + delta < MIN_KOMORKA || h[j] - delta < MIN_KOMORKA) return;
  h[i] += delta; h[j] -= delta;
  stan.rzedyWlasne = h;
  przebuduj();
}

export function wysokosciDoWyboru(r){
  const h = [...stan.rzedy], i = r - 1, j = r < h.length ? r : r - 2;
  if(j < 0) return [];
  const razem = h[i] + h[j];
  return [200, 300, 400, 500, 600, 800].filter(v => v >= MIN_KOMORKA && razem - v >= MIN_KOMORKA);
}

export function ustawWysokoscRzedu(r, wartosc){
  const h = [...stan.rzedy], i = r - 1, j = r < h.length ? r : r - 2;
  if(j < 0) return;
  const razem = h[i] + h[j];
  h[i] = wartosc;
  h[j] = razem - wartosc;
  stan.rzedyWlasne = h;
  przebuduj();
}

/* Krótka informacja, czego w tym otworze nie ma — jedno, najwyżej dwa zdania, jak u Tylko. */
export function notaBraku(h){
  const n = [];
  if(h / 3 < MIN_KOMORKA) n.push(`Two or three shelves need an opening over ${cm(MIN_KOMORKA * 3)}.`);
  else if(h / 4 < MIN_KOMORKA) n.push(`Three shelves need an opening over ${cm(MIN_KOMORKA * 4)}.`);
  if(h < 900) n.push('Rails need an opening at least 90 cm tall.');
  if(h > 700) n.push('Drawers are available for rows under 70 cm.');
  if(h < 700 || h > 1300) n.push('The 4-drawer chest fits openings from 70 to 130 cm.');
  if(h < 560) n.push('Two or three wire baskets need at least 56 cm.');
  return n.slice(0, 2).join(' ');
}

export function trescKarty(klucz){
  const m = /^r(\d+)c(\d+)$/.exec(klucz), r = +m[1], c = +m[2];
  const h = stan.rzedy[r - 1], w = stan.kolumny[c - 1];
  const biezacyId = stan.uklady[klucz] || 'open';
  const dostepne = ukladyDlaKomorki(w, h);
  const biezacy = UKLAD[biezacyId] || UKLAD.open;
  const uwagi = zgodnoscUkladu(biezacy, w, h);
  const maWnetrze = !!(biezacy.polki || biezacy.kosze || biezacy.drazek);
  const powodBraku = notaBraku(h);
  return `
    <button class="karta-zamknij" data-akcja="zamknij"><i data-lucide="x"></i></button>
    <h3>Row ${r}, column ${c}</h3>
    <p>${cm(w)} × ${cm(h)} × ${cm(stan.glebokoscMm)} opening</p>
    <div class="pole"><div class="mini">Module layout</div>
      <div class="uklady" data-rola="uklad">${dostepne.map(([id, u]) =>
        miniatura(id, u, zgodnoscUkladu(u, w, h).length > 0, id === biezacyId)).join('')}</div>
      <p class="nota nazwa-ukladu">${UKLAD[biezacyId]?.nazwa || 'Open'}</p>
      ${powodBraku ? `<p class="nota">${powodBraku}</p>` : ''}</div>
    <div class="pole"><div class="mini">Merge with neighbours</div>
      <div class="grupa" data-rola="scal">${[['l', '←'], ['p', '→'], ['g', '↑'], ['d', '↓']].map(([id, znak]) =>
        `<button data-id="${id}" title="Extend the niche this way">${znak}</button>`).join('')}</div></div>
    ${wysokosciDoWyboru(r).length ? `<div class="pole"><div class="mini">Row height</div>
      <div class="grupa" data-rola="wysokosc">${wysokosciDoWyboru(r).map(v =>
        `<button data-id="${v}" class="${Math.abs(v - h) < 16 ? 'aktywny' : ''}">${cm(v)}</button>`).join('')}</div></div>`
      : ''}
    <div class="pole"><div class="mini">Doors in this row</div>
      <div class="grupa" data-rola="rzad">${['none', 'some', 'max'].map(v =>
        `<button data-id="${v}" class="${trybRzedu(r) === v ? 'aktywny' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
    ${maWnetrze ? (uwagi.length
      ? `<p class="nota uwaga">Fittings here would have to be made to measure: ${uwagi.join('; ')}. The shelf, basket or rail is the only part we buy — the carcass and fronts are ours either way.</p>`
      : `<p class="nota zgodne">Shelves, baskets and rails fit stock IKEA ALTARLIDEN sizes.</p>`) : ''}`;
}

/* Rozszerza zaznaczenie o sąsiednią komórkę i scala — cała operacja z poziomu karty,
   bez przeciągania po meblu, bo to należy teraz do obracania sceny. */
function scalSasiada(r, c, kierunek){
  const z = zaznaczenie || {r1: r, r2: r, c1: c, c2: c};
  const nowe = {...z};
  if(kierunek === 'l') nowe.c1 = Math.max(1, z.c1 - 1);
  if(kierunek === 'p') nowe.c2 = Math.min(stan.kolumny.length, z.c2 + 1);
  if(kierunek === 'd') nowe.r1 = Math.max(1, z.r1 - 1);
  if(kierunek === 'g') nowe.r2 = Math.min(stan.rzedy.length, z.r2 + 1);
  if(JSON.stringify(nowe) === JSON.stringify(z)) return;
  zaznaczenie = nowe;
  zastosujZaznaczenie();
  pokazKarteObszaru();
}

/* Karta ma stac OBOK mebla, nie na nim. Dotad odsuwala sie od samej komorki, wiec przy
   komorce w srodku ladowala na reszcie bryly i zaslaniala to, co wlasnie zmieniasz.
   Teraz odsuwa sie od calego obrysu mebla na ekranie i dopiero gdy tam nie ma miejsca,
   wraca do starego zachowania. */
function obrysMeblaNaEkranie(){
  const k = komorkiEkranu();
  if(!k.length) return null;
  return {
    x1: Math.min(...k.map(r => r.x1)), x2: Math.max(...k.map(r => r.x2)),
    y1: Math.min(...k.map(r => r.y1)), y2: Math.max(...k.map(r => r.y2))
  };
}

export function ustawKarte(karta, prostokat){
  const sc = el('scena').getBoundingClientRect();
  const m = obrysMeblaNaEkranie();
  /* Przy prawej krawedzi sceny stoi szyna narzedzi - karta nie ma prawa jej przykryc. */
  const SZYNA = 64, szer = karta.offsetWidth, luz = 16;
  let lewo = null, odPrawej = false;
  if(m){
    if(m.x2 + luz + szer + SZYNA <= sc.width) lewo = m.x2 + luz;
    else if(m.x1 - luz - szer >= 8){ lewo = m.x1 - luz - szer; odPrawej = true; }
  }
  if(lewo == null){                                    // mebel zajmuje caly kadr - stara regula
    odPrawej = prostokat.left - sc.left + prostokat.width + luz + szer > sc.width;
    lewo = odPrawej ? prostokat.left - sc.left - szer - luz
                    : prostokat.left - sc.left + prostokat.width + luz;
  }
  karta.classList.toggle('od-prawej', odPrawej);
  karta.style.left = zacisk(lewo, 8, Math.max(8, sc.width - szer - SZYNA)) + 'px';
  karta.style.top = Math.min(Math.max(8, prostokat.top - sc.top + prostokat.height / 2 - karta.offsetHeight / 2),
                             Math.max(8, sc.height - karta.offsetHeight - 8)) + 'px';
}

export function otworzKarte(klucz, prostokat){
  zamknijKarte();
  const [, wr, wc] = /^r(\d+)c(\d+)$/.exec(klucz) || [];
  /* Modul osadzony nie ma wlasnej siatki - bierze wymiary z komorki gospodarza. Karta
     liczyla wtedy `NaNcm x NaNcm` i pokazywala pusta liste ukladow, bo `stan.kolumny`
     i `stan.rzedy` naleza do poprzedniego mebla. Nie otwieramy jej tam w ogole. */
  if(!Number.isFinite(stan.kolumny[+wc - 1]) || !Number.isFinite(stan.rzedy[+wr - 1])) return;
  const r = +/^r(\d+)/.exec(klucz)[1];
  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.dataset.klucz = klucz;
  karta.innerHTML = trescKarty(klucz);
  /* Pietnascie ikonek bez podpisu to zgadywanka - nazwa tej pod kursorem ma byc widoczna
     od razu, nie po sekundzie czekania na natywny `title`. */
  karta.addEventListener('pointerover', e => {
    const m = e.target.closest('.uklad-mini');
    const podpis = karta.querySelector('.nazwa-ukladu');
    if(m && podpis) podpis.textContent = UKLAD[m.dataset.id]?.nazwa || 'Open';
  });
  karta.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'zamknij') return zakonczEdycje();
    const rola = b.closest('[data-rola]')?.dataset.rola;
    if(rola === 'wysokosc') ustawWysokoscRzedu(r, +b.dataset.id);
    else if(rola === 'rzad') ustawRzad(r, b.dataset.id);
    else if(rola === 'uklad'){
      if(b.dataset.id === 'open') delete stan.uklady[klucz]; else stan.uklady[klucz] = b.dataset.id;
      przebuduj();
    }else return;
    karta.innerHTML = trescKarty(klucz);              // karta zostaje otwarta, notka od razu widoczna
    window.lucide?.createIcons();
  });
  el('scena').append(karta);
  ustawKarte(karta, prostokat);
  window.lucide?.createIcons();
}

export function kartaWneki(i, prostokat){
  zamknijKarte();
  const karta = document.createElement('div');
  karta.className = 'karta';
  const rysuj = () => {
    const w = stan.wneki[i];
    if(!w) return zamknijKarte();
    const g = granicaWneki(w);
    karta.innerHTML = `
      <button class="karta-zamknij" data-akcja="zamknij"><i data-lucide="x"></i></button>
      <h3>${w.goly ? 'Merged cells' : 'Niche'} ${i + 1}</h3>
      <p>${g ? cm(g.sz) + ' × ' + cm(g.wys) : ''} · rows ${w.r1}\u2013${w.r2}, columns ${w.c1}\u2013${w.c2}</p>
      <div class="pole"><div class="mini">Lining</div>
        <div class="grupa" data-rola="wysciolka">
          <button data-id="0" class="${w.goly ? 'aktywny' : ''}">Plain opening</button>
          <button data-id="1" class="${w.goly ? '' : 'aktywny'}">Lined box</button></div>
        <p class="nota">A plain opening just drops the dividers. A lined box adds a second
          layer of board, so it can take its own colour and stick out past the fronts.</p></div>
      ${w.goly ? '' : `<div class="pole"><div class="mini">Inside</div>
        <div class="grupa" data-rola="tresc">${Object.entries(WNEKA_TRESC).map(([id, n]) =>
          `<button data-id="${id}" class="${w.tresc === id ? 'aktywny' : ''}">${n}</button>`).join('')}</div></div>`}
      ${!w.goly && w.tresc === 'biurko' ? `<div class="pole"><div class="mini">Desk flap</div>
        <div class="grupa" data-rola="klapa"><button data-id="0" class="${w.otwarte ? '' : 'aktywny'}">Closed</button><button data-id="1" class="${w.otwarte ? 'aktywny' : ''}">Open</button></div></div>` : ''}
      ${w.goly ? '' : `<div class="pole"><div class="mini">Sticks out — ${cm(w.wysun || 0)}</div>
        <div class="grupa" data-rola="wysun">${[0, 50, 100, 150, 200, 300].map(v =>
          `<button data-id="${v}" class="${(w.wysun || 0) === v ? 'aktywny' : ''}">${v ? cm(v) : 'flush'}</button>`).join('')}</div></div>
      <div class="pole"><div class="mini">Colour of this niche</div>
        <div class="probniki" data-rola="kolor"><button class="probnik ${w.kolor == null ? 'aktywny' : ''}" data-i="-1" title="Same as the wardrobe" style="background:repeating-linear-gradient(45deg,#fff,#fff 4px,#e5e3df 4px,#e5e3df 8px)"></button>${
          KOLORY.map(([n, hex], k) => `<button class="probnik ${w.kolor === k ? 'aktywny' : ''}" data-i="${k}" title="${n}" style="background:${hex}"></button>`).join('')}</div></div>`}
      <button class="cta wtorna" data-akcja="usun">Split back into cells</button>`;
    window.lucide?.createIcons();
  };
  rysuj();
  /* Pietnascie ikonek bez podpisu to zgadywanka - nazwa tej pod kursorem ma byc widoczna
     od razu, nie po sekundzie czekania na natywny `title`. */
  karta.addEventListener('pointerover', e => {
    const m = e.target.closest('.uklad-mini');
    const podpis = karta.querySelector('.nazwa-ukladu');
    if(m && podpis) podpis.textContent = UKLAD[m.dataset.id]?.nazwa || 'Open';
  });
  karta.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'zamknij') return zakonczEdycje();
    if(b.dataset.akcja === 'usun'){ stan.wneki.splice(i, 1); zaznaczenie = null; zamknijKarte(); return przebuduj(); }
    const rola = b.closest('[data-rola]')?.dataset.rola, w = stan.wneki[i];
    if(rola === 'wysciolka') w.goly = b.dataset.id === '0';
    else if(rola === 'tresc') w.tresc = b.dataset.id;
    else if(rola === 'klapa') w.otwarte = b.dataset.id === '1';
    else if(rola === 'wysun') w.wysun = +b.dataset.id;
    else if(rola === 'kolor') w.kolor = +b.dataset.i < 0 ? null : +b.dataset.i;
    else return;
    przebuduj();
    rysuj();
  });
  el('scena').append(karta);
  window.lucide?.createIcons();                        // ikony podmieniamy dopiero po wstawieniu do DOM
  const sc = el('scena').getBoundingClientRect();
  /* Przy wnęce dochodzącej niemal do prawej krawędzi zaciskanie karty na prawej stronie
     zasłaniało ostatnią kolumnę. Jeśli karta się tam nie mieści, otwieramy ją po lewej. */
  const zaWaska = prostokat.left - sc.left + prostokat.width + 16 + karta.offsetWidth > sc.width;
  karta.classList.toggle('od-prawej', zaWaska);
  karta.style.left = zacisk(zaWaska ? prostokat.left - sc.left - karta.offsetWidth - 16
                                   : prostokat.left - sc.left + prostokat.width + 16,
                            8, sc.width - karta.offsetWidth - 8) + 'px';
  karta.style.top = zacisk(prostokat.top - sc.top, 8, sc.height - karta.offsetHeight - 8) + 'px';
}

/* Klik w uchwyt otwiera kartę z konkretnymi wymiarami obu sąsiadujących przegród. */
export function kartaPrzegrody(os, i, prostokat){
  zamknijKarte();
  const kolumny = os === 'c';
  const lista = kolumny ? stan.kolumny : stan.rzedy;
  if(i + 1 >= lista.length) return;
  const razem = lista[i] + lista[i + 1];
  const nazwa = kolumny ? 'Column' : 'Row';
  const pierwszy = kolumny ? i + 1 : i + 1, drugi = i + 2;
  const opcje = [200, 300, 400, 500, 600, 800].filter(v => v >= MIN_KOMORKA && razem - v >= MIN_KOMORKA);
  const karta = document.createElement('div');
  karta.className = 'karta';
  const rysuj = () => {
    const a = (kolumny ? stan.kolumny : stan.rzedy)[i], b = (kolumny ? stan.kolumny : stan.rzedy)[i + 1];
    karta.innerHTML = `
      <button class="karta-zamknij" data-akcja="zamknij"><i data-lucide="x"></i></button>
      <h3>${nazwa}s ${pierwszy} and ${drugi}</h3>
      <p>${cm(razem)} together — drag the handle, or pick a size below.</p>
      <div class="pole"><div class="mini">${nazwa} ${pierwszy}${kolumny ? '' : ' (lower)'}</div>
        <div class="grupa" data-rola="rozmiar">${opcje.map(v =>
          `<button data-id="${v}" class="${Math.abs(v - a) < 16 ? 'aktywny' : ''}">${cm(v)}</button>`).join('')}</div></div>
      <p class="nota">${nazwa} ${drugi} takes the rest: <b>${cm(b)}</b>.${
        kolumny && !zgodnaKolumna(a) ? ' This width is outside the LASTARE 40/60/80 grid, so fronts would be made to measure.' : ''}</p>`;
    window.lucide?.createIcons();
  };
  rysuj();
  /* Pietnascie ikonek bez podpisu to zgadywanka - nazwa tej pod kursorem ma byc widoczna
     od razu, nie po sekundzie czekania na natywny `title`. */
  karta.addEventListener('pointerover', e => {
    const m = e.target.closest('.uklad-mini');
    const podpis = karta.querySelector('.nazwa-ukladu');
    if(m && podpis) podpis.textContent = UKLAD[m.dataset.id]?.nazwa || 'Open';
  });
  karta.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'zamknij') return zakonczEdycje();
    if(b.closest('[data-rola]')?.dataset.rola === 'rozmiar'){
      const teraz = (kolumny ? stan.kolumny : stan.rzedy)[i];
      przesunPrzegrode(os, i, +b.dataset.id - teraz);
      zapisz();
      rysuj();
    }
  });
  el('scena').append(karta);
  window.lucide?.createIcons();
  const sc = el('scena').getBoundingClientRect();
  karta.style.left = zacisk(prostokat.left - sc.left + 44, 8, sc.width - karta.offsetWidth - 8) + 'px';
  karta.style.top = zacisk(prostokat.top - sc.top - karta.offsetHeight / 2, 8, sc.height - karta.offsetHeight - 8) + 'px';
}

/* ---------- przeciąganie przegród: obie osie, suma bez zmian, minimum 20 cm ---------- */
