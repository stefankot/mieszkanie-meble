/* Prawy panel: style, suwaki, próbniki, podsumowanie i przyciski. */
import {stan, STYLE, KOLORY, WYKONCZENIA, GLEB_LASTARE, NOZKA_FI, el, cm, ile, zacisk,
        zgodnaKolumna, ileDodatkow, stworzWzorzec, przywrocZeWzorca, odczepInstancje,
        instancjeWzorca, policzOdstepstwa, wczytajDo, ustawPole, mieszanePole,
        zaznaczoneModuly} from './dane.js';
import {liczbaRzedow, progiWysokosci, wnetrzeWys} from './model.js';
import {parsujTory, naturalnaSuma, zapisTorow, PRZYKLAD} from './siatka.js';
import {modeleRoli} from './modele.js';
import {STRONY, WYROWNANIE_X, WYROWNANIE_Y, modul, mozliweKotwice, nazwaModulu, poziom,
        wszystkieWKolejnosci, wSrodku as wSrodkuModul} from './moduly.js';
import {katalogDrewna} from './scena.js';
import {zamknijKarte} from './nakladka.js';
import {przebuduj, zapisz, pobierzJSON, duplikujZPytaniem, usunMebel, przelaczMebel, wejdzWModul,
        zaznaczCalyMebel, komorkiRodzica} from './szafa.js';
import {pokazBlad, bladEl} from './dane.js';
import {przyciskKreatora} from './kreator.js';

/* ---------- panel ---------- */
export const odswiezacze = [];

export function wiersz(etykietaTekst, kontrolka, pionowy, pole){
  const w = document.createElement('div');
  w.className = pionowy ? 'wiersz kolumna' : 'wiersz';
  const e = document.createElement('div');
  e.className = 'etykieta';
  e.textContent = etykietaTekst;
  w.append(e, kontrolka);
  /* Przy kilku zaznaczonych modułach pole o różnych wartościach dostaje znacznik „mixed" —
     wpisanie czegokolwiek ustawia to wszystkim, tak jak w Figmie. */
  if(pole) odswiezacze.push(() => w.classList.toggle('mieszany', mieszanePole(pole)));
  return w;
}

/* Pasek nad sekcjami: ile modułów jest zaznaczonych do edycji zbiorczej. */
function pasekZaznaczenia(){
  const box = document.createElement('p');
  box.className = 'pasek-zaznaczenia';
  odswiezacze.push(() => {
    const ile = zaznaczoneModuly().length;
    box.hidden = ile < 2;
    box.textContent = `${ile} modules selected — changes apply to all of them.`;
  });
  return box;
}

export function grupa(opcje, czytaj, zapiszWartosc){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  box.innerHTML = `<div class="grupa">${opcje.map(([id, txt]) => `<button data-id="${id}">${txt}</button>`).join('')}</div>`;
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    zapiszWartosc(b.dataset.id);
    przebuduj();
  });
  odswiezacze.push(() => box.querySelectorAll('button')
    .forEach(b => b.classList.toggle('aktywny', b.dataset.id === String(czytaj()))));
  return box;
}

export function suwak(min, max, krok, czytaj, zapiszWartosc, format, progi, poleCm = false){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  box.innerHTML = `<div class="tor"><sl-range class="suwak" min="${min}" max="${max}" step="${krok}" value="${czytaj()}" tooltip="none"></sl-range><div class="progi"></div></div>${poleCm
    ? `<label class="banka pole-cm"><input type="number" step="0.1" inputmode="decimal" aria-label="${poleCm} in centimetres"><span>cm</span></label>`
    : `<span class="banka">${format(czytaj())}</span>`}`;
  const s = box.querySelector('sl-range'), b = box.querySelector('.banka'), kropki = box.querySelector('.progi');
  const pole = box.querySelector('input');
  s.addEventListener('sl-input', () => { zapiszWartosc(+s.value); przebuduj(false); });
  s.addEventListener('sl-change', () => zapisz());
  const zatwierdzPole = () => {
    const mm = Math.max(min, Math.min(max, Math.round((+pole.value || 0) * 10)));
    if(mm === czytaj()) return;
    zapiszWartosc(mm);
    przebuduj();
  };
  if(pole){
    pole.addEventListener('input', zatwierdzPole);
    pole.addEventListener('change', zatwierdzPole);
    pole.addEventListener('blur', zatwierdzPole);
    pole.addEventListener('keydown', e => { if(e.key === 'Enter'){ zatwierdzPole(); pole.blur(); } });
  }
  odswiezacze.push(() => {
    s.value = czytaj();
    if(pole) pole.value = +(czytaj() / 10).toFixed(1); else b.textContent = format(czytaj());
    if(progi) kropki.innerHTML = progi().filter(v => v >= min && v <= max)
      .map(v => `<i style="left:${(v - min) / (max - min) * 100}%"></i>`).join('');
  });
  return box;
}

export function probniki(){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  box.innerHTML = `<div class="probniki">${KOLORY.map(([n, hex], i) =>
    `<button class="probnik" data-i="${i}" title="${n}" style="background:${hex}"></button>`).join('')}</div>`;
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b){
      ustawPole('kolor', +b.dataset.i);
      ustawPole('wykonczenie', 'board');               // kolor solid wypiera teksturę
      ustawPole('drewno', null);
      przebuduj();
    }
  });
  odswiezacze.push(() => box.querySelectorAll('.probnik')
    .forEach(b => b.classList.toggle('aktywny', stan.wykonczenie === 'board' && +b.dataset.i === stan.kolor)));
  return box;
}

/* Rozwijana lista — do wyboru rodzica kotwicy, gdzie segmentowany pasek by się nie zmieścił. */
export function lista(opcje, czytaj, zapiszWartosc){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  const pole = document.createElement('select');
  pole.className = 'lista-wyboru';
  box.append(pole);
  pole.addEventListener('change', () => { zapiszWartosc(pole.value); przebuduj(); });
  odswiezacze.push(() => {
    const teraz = String(czytaj() ?? '');
    pole.innerHTML = opcje().map(([id, txt]) =>
      `<option value="${id}"${String(id) === teraz ? ' selected' : ''}>${txt}</option>`).join('');
  });
  return box;
}

/* Kotwica: do czego moduł przylega, którą stroną i jak daleko przesunięty wzdłuż styku.
   Moduł bez kotwicy stoi samodzielnie w łańcuchu — jak warstwa najwyższego poziomu. */
function sekcjaKotwicy(dodaj){
  dodaj('Attach to', lista(
    () => [['', 'Nothing (free)'], ...mozliweKotwice(stan.id).map(m => [m.id, nazwaModulu(m)])],
    () => stan.kotwica?.do || '',
    v => {
      if(!v) return (stan.kotwica = null);
      stan.kotwica = {...(stan.kotwica || {strona: 'prawo'}), do: v};
      stan.pozycjaMm = null;                           // kotwica wygrywa z wpisanym położeniem
    }));
  const przyBoku = [], wSrodku = [];
  przyBoku.push(dodaj('Side', grupa(Object.entries(STRONY).filter(([id]) => id !== 'wnetrze').map(([id, s]) => [id, s.nazwa]),
    () => stan.kotwica?.strona || 'prawo',
    /* Moduł osadzony zostaje w komórce — strona dotyczy tylko modułów z własnym korpusem. */
    v => { if(stan.kotwica && !stan.definicja) stan.kotwica = {...stan.kotwica, strona: v}; })));
  przyBoku.push(dodaj('Align', grupa([['tyl', 'Back'], ['lico', 'Front']],
    () => stan.kotwica?.poziomuj || 'tyl',
    v => { if(stan.kotwica) stan.kotwica = {...stan.kotwica, poziomuj: v}; })));
  przyBoku.push(dodaj('Slide', suwak(-2000, 2000, 10,
    () => stan.kotwica?.przesun || 0,
    v => { if(stan.kotwica) stan.kotwica = {...stan.kotwica, przesun: v}; }, cm)));
  /* Moduł osadzony odnosi się do komórki gospodarza albo do całej jego bryły i równa się
     do jej krawędzi — „równo do dołu" zamiast wpisywania milimetrów. */
  const zmienKotwice = z => { if(stan.kotwica) stan.kotwica = {...stan.kotwica, ...z}; };
  wSrodku.push(dodaj('Relative to', grupa([['bryla', 'Whole body'], ['komorka', 'Cell']],
    () => stan.kotwica?.wzgledem || 'komorka', v => zmienKotwice({wzgledem: v}))));
  const wierszKomorki = dodaj('Cell', lista(
    () => (komorkiRodzica.get(stan.kotwica?.do) || []).map(k => [`r${k.r}c${k.c}`,
      `Row ${k.r}, column ${k.c} · ${Math.round(k.w / 10)}×${Math.round(k.h / 10)} cm`]),
    () => stan.kotwica?.komorka || '',
    v => zmienKotwice({komorka: v})));
  wSrodku.push(wierszKomorki);
  wSrodku.push(dodaj('Align ↕', grupa(Object.entries(WYROWNANIE_Y),
    () => stan.kotwica?.pionowo || 'srodek', v => zmienKotwice({pionowo: v}))));
  wSrodku.push(dodaj('Align ↔', grupa(Object.entries(WYROWNANIE_X),
    () => stan.kotwica?.poziomo || 'srodek', v => zmienKotwice({poziomo: v}))));
  wSrodku.push(dodaj('Offset ↕', suwak(-2000, 2000, 5, () => stan.kotwica?.przesunY || 0,
    v => zmienKotwice({przesunY: v}), cm)));
  wSrodku.push(dodaj('Offset ↔', suwak(-2000, 2000, 5, () => stan.kotwica?.przesunX || 0,
    v => zmienKotwice({przesunX: v}), cm)));
  wSrodku.push(dodaj('Push out', suwak(0, 400, 5, () => stan.wysunMm || 0,
    v => ustawPole('wysunMm', v), v => v ? cm(v) : 'flush')));

  odswiezacze.push(() => {
    const osadzony = wSrodkuModul(stan.meble[stan.aktywny]);
    /* Bez kotwicy strona, wyrównanie i przesuw nie mają do czego się odnosić. */
    przyBoku.forEach(w => w && (w.hidden = !stan.kotwica || osadzony));
    wSrodku.forEach(w => w && (w.hidden = !osadzony));
    /* Wiersz komórki ma sens tylko wtedy, gdy odniesieniem jest jedna komórka. */
    if(osadzony) wierszKomorki.hidden = (stan.kotwica?.wzgledem || 'komorka') === 'bryla';
  });
}

/* Komponent i instancje — zachowanie z Figmy. Moduł bez wzorca dostaje przycisk „Create
   component"; instancja pokazuje, ile jest kopii i które pola są odczepione, z możliwością
   przywrócenia ze wzorca albo odczepienia instancji na stałe. */
function sekcjaKomponentu(box){
  const info = document.createElement('div');
  info.className = 'komponent';
  box.append(info);
  info.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    const m = stan.meble[stan.aktywny];
    if(b.dataset.akcja === 'stworz'){ stworzWzorzec(m, stan.nazwa); wczytajDo(m); }
    if(b.dataset.akcja === 'przywroc'){ przywrocZeWzorca(m); wczytajDo(m); }
    if(b.dataset.akcja === 'odczep') odczepInstancje(m);
    if(b.dataset.pole){ przywrocZeWzorca(m, b.dataset.pole); wczytajDo(m); }
    przebuduj();
  });
  odswiezacze.push(() => {
    const m = stan.meble[stan.aktywny];
    if(!m) return (info.innerHTML = '');
    const w = m.wzorzec && stan.wzorce[m.wzorzec];
    if(!w){
      info.innerHTML = '<button class="cta wtorna" data-akcja="stworz">Create component</button>';
      return;
    }
    const ile = instancjeWzorca(m.wzorzec).length;
    const odstepstwa = policzOdstepstwa(m);
    info.innerHTML = `<p class="komponent-nazwa"><i data-lucide="component"></i>${w.nazwa}
        <span class="licznik">${ile} ${ile === 1 ? 'instance' : 'instances'}</span></p>
      ${odstepstwa.length ? `<p class="nota-siatki">${odstepstwa.length} overridden</p>
        <div class="odstepstwa">${odstepstwa.map(p =>
          `<button data-pole="${p}" title="Reset ${p} to component">${p}<i data-lucide="rotate-ccw"></i></button>`).join('')}</div>`
        : '<p class="nota-siatki">Matches the component.</p>'}
      <button class="cta wtorna" data-akcja="przywroc"${odstepstwa.length ? '' : ' disabled'}>Reset all overrides</button>
      <button class="cta wtorna" data-akcja="odczep">Detach instance</button>`;
    window.lucide?.createIcons();
  });
}

export function podsumowanie(){
  const box = document.createElement('div');
  box.className = 'wiersz kolumna podsumowanie';
  odswiezacze.push(() => {
    const custom = stan.id === 'ladmakare' ? [] : stan.kolumny
      .map((w, i) => zgodnaKolumna(w) ? null : `C${i + 1} ${Math.round(w / 10)}cm`)
      .filter(Boolean);
    const drzwi = ile('drzwi') + ile('drzwi-przesuwne') * 2;
    box.innerHTML = `<b>${cm(stan.szerokoscMm)} × ${cm(stan.wysokoscMm)} × ${cm(stan.glebokoscMm)}</b> ·
      ${stan.kolumny.length} columns (${stan.kolumny.map(v => Math.round(v / 10)).join(' + ')} cm) ·
      ${stan.rzedy.length} rows · ${stan.komorki.length} cells<br>
      ${drzwi} doors, ${ile('szuflada')} drawers, ${ile('drazek')} rails ·
      ${stan.czesci.filter(c => c.type === 'box').length} parts · board ${stan.plytaMm} mm<br>
      ${custom.length ? `<span class="ostrzezenie">Custom-width columns: ${custom.join(', ')} · made-to-measure fittings</span>`
               : stan.id === 'ladmakare' ? 'original IKEA LÅDMAKARE dimensions'
               : 'every opening takes stock IKEA fittings (40/60/80 cm)'}`;
  });
  return box;
}

export function przyciski(){
  const box = document.createElement('div');
  box.className = 'przyciski-panelu';
  box.innerHTML = `<button class="cta" data-akcja="mieszkanie">Dodaj do mieszkania</button>
    <button class="cta wtorna" data-akcja="eksport">Download specification (JSON)</button>`;
  box.addEventListener('click', e => {
    const akcja = e.target.closest('button')?.dataset.akcja;
    if(akcja === 'eksport') pobierzJSON();
    if(akcja === 'mieszkanie'){
      pobierzJSON();
      pokazBlad('Mebel zapisany jako dokument v2 — wrzuć go do modelu mieszkania obok pozostałych mebli.');
      setTimeout(() => { bladEl.hidden = true; }, 6000);
    }
  });
  return box;
}

/* Lista modułów — wzorzec panelu „Object" z D5, zachowanie z Figmy: klik zaznacza,
   Shift-klik dokłada, dwuklik wchodzi do środka, Esc wychodzi o poziom. Wiersz, w którym
   jesteśmy, ma obwódkę; wcięcie pokazuje, co do czego przylega. */
function listaModulow(){
  const box = document.createElement('div');
  box.className = 'wiersz kolumna lista-modulow';
  odswiezacze.push(() => {
    const wejsciowy = stan.wejscie.at(-1) || null;
    box.innerHTML = `<div class="etykieta lista-glowka"><span>Modules</span>
        <span class="licznik">${stan.meble.length}</span>
        <button class="ikonka" data-akcja="duplikuj" title="Duplicate (⌘D)"><i data-lucide="copy-plus"></i></button>
        ${stan.meble.length > 1 ? '<button class="ikonka" data-akcja="usun" title="Delete"><i data-lucide="trash-2"></i></button>' : ''}
      </div>
      <ul class="drzewo">
        <li><button class="modul korzen ${stan.zaznaczone.length === stan.meble.length && stan.meble.length > 1 ? 'zaznaczony' : ''}"
            data-id="__mebel" title="Select every module"><i data-lucide="box"></i>
          <span class="nazwa">Furniture</span>
          <span class="strona">${stan.meble.length}</span></button></li>
        ${wszystkieWKolejnosci().map(m => {
        const i = stan.meble.indexOf(m);
        const klasy = [m.id === wejsciowy ? 'wejsciowy' : '', i === stan.aktywny ? 'aktywny-modul' : '',
                       stan.zaznaczone.includes(m.id) ? 'zaznaczony' : ''].join(' ');
        return `<li><button class="modul ${klasy}" data-id="${m.id}" aria-current="${i === stan.aktywny ? 'true' : 'false'}"
          aria-pressed="${stan.zaznaczone.includes(m.id)}" style="padding-left:${22 + poziom(m.id) * 14}px">
          <i data-lucide="${m.kotwica ? 'diamond' : 'component'}"></i>
          <span class="kropka" style="background:${KOLORY[m.kolor][1]}"></span>
          <span class="nazwa">${nazwaModulu(m)}</span>
          ${m.id === wejsciowy ? '<span class="strona">Editing</span>'
            : m.kotwica ? `<span class="strona">${STRONY[m.kotwica.strona]?.nazwa || ''}</span>` : ''}
        </button></li>`;
      }).join('')}</ul>
      ${stan.wejscie.length ? `<div class="okruchy">${stan.wejscie.map((id, k) =>
        `<button data-okruch="${k}">${nazwaModulu(modul(id) || {})}</button>`).join('<i data-lucide="chevron-right"></i>')}</div>` : ''}`;
    window.lucide?.createIcons();
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'duplikuj') return duplikujZPytaniem();
    if(b.dataset.akcja === 'usun') return usunMebel();
    if(b.dataset.okruch != null) return wejdzWModul(stan.wejscie[+b.dataset.okruch]);
    if(b.dataset.id === '__mebel') return zaznaczCalyMebel();
    if(!b.dataset.id) return;
    /* Pierwszy klik przebudowuje drzewo, więc natywne `dblclick` bywało tracone razem ze
       starym węzłem. Drugi click zachowuje `detail === 2` także po tej podmianie. */
    if(e.detail === 2) return wejdzWModul(b.dataset.id);
    if(e.shiftKey){
      stan.zaznaczone = stan.zaznaczone.includes(b.dataset.id)
        ? stan.zaznaczone.filter(x => x !== b.dataset.id) : [...stan.zaznaczone, b.dataset.id];
      return przebuduj(false);
    }
    stan.zaznaczone = [b.dataset.id];
    przelaczMebel(stan.meble.findIndex(m => m.id === b.dataset.id));
  });
  box.addEventListener('dblclick', e => {
    const b = e.target.closest('button[data-id]');
    if(b) wejdzWModul(b.dataset.id);
  });
  return box;
}

/* Wybór drewna: procedura plus wszystko, co leży w tekstury/katalog.json (CC0 z ambientCG).
   Wiersz chowa się przy wykończeniu Board, bo tam liczy się kolor, nie słój. */
function drewnoDoWyboru(){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  odswiezacze.push(() => {
    box.innerHTML = `<div class="probniki drewno">
      <button class="probnik proceduralne ${stan.drewno ? '' : 'aktywny'}" data-id="" title="Generated grain"></button>${
      katalogDrewna.tekstury.map(t => `<button class="probnik" data-id="${t.id}" title="${t.nazwa} · CC0 ambientCG"
        style="background-image:url(tekstury/${t.pliki.kolor});background-size:cover"></button>`).join('')
      }<button class="probnik dodaj-drewno" data-biblioteka="1" title="Browse the ambientCG library"><i data-lucide="plus"></i></button></div>`;
    window.lucide?.createIcons();
    /* Na płycie solid żaden próbnik drewna nie jest zaznaczony — kolor i tekstura
       wykluczają się nawzajem. */
    const wDrewnie = stan.wykonczenie !== 'board';
    box.querySelectorAll('.probnik').forEach(b => b.classList.toggle('aktywny',
      wDrewnie && !b.dataset.biblioteka && (b.dataset.id || null) === (stan.drewno || null)));
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.biblioteka) return otworzBiblioteke();
    ustawPole('drewno', b.dataset.id || null);
    if(stan.wykonczenie === 'board') ustawPole('wykonczenie', 'veneer');   // tekstura wypiera kolor
    przebuduj();
  });
  return box;
}

/* Biblioteka ambientCG w oknie konfiguratora. Przeglądarka nie może odpytać ich API
   (brak CORS — to nie kwestia User-Agenta), więc pyta nasz serwer, a ten ambientCG.
   Miniatury idą prosto z ich serwera plików, bo obrazy wolno ładować z innej domeny. */
async function otworzBiblioteke(){
  zamknijKarte();
  const karta = document.createElement('div');
  karta.className = 'karta biblioteka';
  karta.innerHTML = `<button class="karta-zamknij" data-akcja="zamknij"><i data-lucide="x"></i></button>
    <h3>ambientCG library</h3>
    <p>Everything here is CC0. Picking a material downloads its 1K colour, roughness and normal maps into the project.</p>
    <input class="szukaj" value="wood" placeholder="wood, planks, oak…">
    <div class="wyniki">Searching…</div>`;
  el('scena').append(karta);
  window.lucide?.createIcons();
  const sc = el('scena').getBoundingClientRect();
  karta.style.left = Math.max(8, (sc.width - karta.offsetWidth) / 2) + 'px';
  karta.style.top = Math.max(8, (sc.height - karta.offsetHeight) / 2) + 'px';
  const pole = karta.querySelector('.szukaj'), wyniki = karta.querySelector('.wyniki');

  const szukaj = async () => {
    wyniki.textContent = 'Searching…';
    try{
      const odp = await fetch(`/acg/szukaj?q=${encodeURIComponent(pole.value || 'wood')}&ile=24`);
      const dane = await odp.json();
      const maMy = new Set(katalogDrewna.tekstury.map(t => t.id));
      wyniki.innerHTML = dane.materialy?.length
        ? dane.materialy.map(m => `<button class="material${maMy.has(m.id) ? ' juz' : ''}" data-id="${m.id}">
            <img src="${m.podglad}" alt="" loading="lazy"><span>${m.nazwa}</span></button>`).join('')
        : 'Nothing found — ambientCG matches tags, so try <b>wood</b>, <b>planks</b> or <b>oak</b>.';
    }catch(e){
      /* Na statycznym hostingu (GitHub Pages) mostu nie ma i być nie może — zostaje to,
         co leży w repozytorium. */
      wyniki.innerHTML = `No ambientCG bridge here. Browsing the library needs a server, so it works when
        you run <code>python3 konfigurator/serwer.py</code> locally. On static hosting only the textures
        already committed to <code>tekstury/</code> are available.`;
    }
  };
  szukaj();
  let opoznienie = 0;
  pole.addEventListener('input', () => { clearTimeout(opoznienie); opoznienie = setTimeout(szukaj, 400); });
  karta.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'zamknij') return zamknijKarte();
    const id = b.dataset.id;
    if(!id) return;
    b.classList.add('pobieranie');
    try{
      const odp = await fetch(`/acg/pobierz?id=${encodeURIComponent(id)}`);
      const dane = await odp.json();
      if(dane.blad) throw Error(dane.blad);
      katalogDrewna.tekstury = dane.katalog.tekstury;
      stan.drewno = id;
      if(stan.wykonczenie === 'board') stan.wykonczenie = 'veneer';
      zamknijKarte();
      przebuduj();
    }catch(err){
      b.classList.remove('pobieranie');
      wyniki.insertAdjacentHTML('afterbegin', `<p class="nota uwaga">Download failed: ${err.message}</p>`);
    }
  });
}

/* Nóżki prętowe: cztery walce fi 15 mm w narożnikach, do metra wysokości.
   Wykluczają się z cokołem — na jednym meblu albo jedno, albo drugie. */
function nozkiKolorem(){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  odswiezacze.push(() => {
    box.innerHTML = `<div class="probniki nozki">${KOLORY.map(([n, hex], i) =>
      `<button class="probnik" data-i="${i}" title="${n}" style="background:${hex}"></button>`).join('')}</div>`;
    box.querySelectorAll('.probnik').forEach(b =>
      b.classList.toggle('aktywny', +b.dataset.i === (stan.nozkiKolor || 0)));
    box.closest('.wiersz').hidden = !(stan.nozkiMm > 0);
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b){ ustawPole('nozkiKolor', +b.dataset.i); przebuduj(); }
  });
  return box;
}

/* ---------- styl Custom: podziały wpisane ręcznie ---------- */
/* Pole przyjmuje składnię CSS grid przeliczoną na centymetry: „60 + 40", „1/3 2/3",
   „40% 60%", „80 + 1fr", „repeat(3, 40)". Wpis z samych centymetrów ustawia też wymiar
   mebla — kto pisze 60+40, chce dokładnie 60 i 40 cm, a nie ich proporcji. */
export function przygotujSiatke(){
  if(!stan.siatkaKol) stan.siatkaKol = zapisTorow(stan.kolumny);
  if(!stan.siatkaRzed) stan.siatkaRzed = zapisTorow(stan.rzedy);
}

function dopasujWymiar(os, tory){
  if(!tory.every(t => t.typ === 'mm')) return;         // udziały i fr mieszczą się w tym, co jest
  const t = stan.plytaMm;
  if(os === 'c'){
    stan.szerokoscMm = zacisk(Math.round(naturalnaSuma(tory, stan.szerokoscMm)), 400, 5000);
    return;
  }
  const dostepne = wnetrzeWys() - (tory.length - 1) * t;
  stan.wysokoscMm = zacisk(Math.round(stan.wysokoscMm + naturalnaSuma(tory, dostepne) - dostepne), 400, 3400);
}

function poleSiatki(os){
  const box = document.createElement('div');
  box.className = 'kontrolka pionowa';
  box.innerHTML = `<input class="pole-siatki" spellcheck="false" autocomplete="off" placeholder="${PRZYKLAD}">
    <p class="nota-siatki"></p>`;
  const pole = box.querySelector('input'), nota = box.querySelector('.nota-siatki');
  const opisz = (blad) => {
    nota.classList.toggle('uwaga', !!blad);
    if(blad) return nota.textContent = blad;
    const lista = os === 'c' ? stan.kolumny : stan.rzedy;
    const nazwa = os === 'c' ? 'columns' : 'rows';
    /* Przy równych podziałach „4 × 58,2 cm" czyta się lepiej niż cztery razy ta sama liczba. */
    const wCm = lista.map(v => +(v / 10).toFixed(1));
    const rowne = wCm.every(v => Math.abs(v - wCm[0]) < .05);
    nota.textContent = rowne ? `${lista.length} ${nazwa} × ${wCm[0]} cm` : `${wCm.join(' + ')} cm`;
  };
  pole.addEventListener('input', () => {
    const {tory, blad} = parsujTory(pole.value);
    if(blad) return opisz(blad);
    if(os === 'c') stan.siatkaKol = pole.value; else stan.siatkaRzed = pole.value;
    stan.kolumnyWlasne = stan.rzedyWlasne = null;       // wpis wypiera to, co ustawiła myszka
    if(tory.length) dopasujWymiar(os, tory);
    przebuduj(false);
    opisz();
  });
  pole.addEventListener('change', () => zapisz());
  odswiezacze.push(() => {
    box.closest('.wiersz').hidden = stan.styl !== 'custom';
    if(document.activeElement === pole) return;         // nie podmieniam tekstu pod palcami
    /* Presety mogą mieć gotowe kolumnyWlasne bez tekstowego zapisu siatki. Puste pole
       wyglądało wtedy jak nieaktywne i Safari wybierało placeholder zamiast ustawić kursor. */
    pole.value = (os === 'c' ? stan.siatkaKol : stan.siatkaRzed)
      || zapisTorow(os === 'c' ? stan.kolumny : stan.rzedy);
    opisz();
  });
  return box;
}

/* Doniczka obok mebla: próbniki z miniaturami modeli o roli „podloga". Wiersz chowa się,
   dopóki modele się nie doczytają — nie ma sensu pokazywać pustego rzędu. */
function roslinaDoWyboru(){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  odswiezacze.push(() => {
    const duze = modeleRoli('podloga');
    box.closest('.wiersz').hidden = !duze.length || !ileDodatkow();
    if(!duze.length) return;
    box.innerHTML = `<div class="probniki drewno">
      <button class="probnik bez-rosliny" data-id="brak" title="No plant"></button>${
      duze.map(m => `<button class="probnik" data-id="${m.id}" title="${m.nazwa} · ${Math.round(m.wymiaryMm[2] / 10)} cm"
        style="background-image:url(modele/${m.podglad || ''});background-size:cover"></button>`).join('')}</div>`;
    const najwyzszy = duze.reduce((a, b) => b.wymiaryMm[2] > a.wymiaryMm[2] ? b : a).id;
    const teraz = stan.roslina || najwyzszy;
    box.querySelectorAll('.probnik').forEach(b => b.classList.toggle('aktywny', b.dataset.id === teraz));
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b){ stan.roslina = b.dataset.id; przebuduj(); }
  });
  return box;
}

/* Lampa — ten sam próbnik co rośliny, ale z katalogu `rola: 'lampa'`. Staje we wnęce,
   a gdy mebel jej nie ma, na najwyższej otwartej półce. */
function lampaDoWyboru(){
  const box = document.createElement('div');
  box.className = 'kontrolka';
  odswiezacze.push(() => {
    const lampy = modeleRoli('lampa');
    box.closest('.wiersz').hidden = !lampy.length;
    if(!lampy.length) return;
    box.innerHTML = `<div class="probniki drewno">
      <button class="probnik bez-rosliny" data-id="brak" title="No lamp"></button>${
      lampy.map(m => `<button class="probnik" data-id="${m.id}" title="${m.nazwa} · ${Math.round(m.wymiaryMm[2] / 10)} cm"
        style="background-image:url(modele/${m.podglad || ''});background-size:cover"></button>`).join('')}</div>`;
    const teraz = stan.lampa || lampy[0].id;
    box.querySelectorAll('.probnik').forEach(b => b.classList.toggle('aktywny', b.dataset.id === teraz));
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b){ ustawPole('lampa', b.dataset.id); przebuduj(); }
  });
  return box;
}

/* Sekcja panelu — nagłówek 40 px jak w Inspektorze edytora. Rzeczy ustawiane raz startują
   zwinięte; kolumna ma 300 px, więc płaska lista dwudziestu wierszy była nie do przejrzenia. */
function sekcja(host, tytul, zwijana){
  const box = document.createElement('section');
  box.className = 'sekcja' + (zwijana ? ' zwinieta' : '');
  box.innerHTML = `<button class="sekcja-naglowek${zwijana ? ' zwijana' : ''}" type="button">${
    zwijana ? '<i data-lucide="chevron-down"></i>' : ''}<span>${tytul}</span></button>`;
  if(zwijana) box.querySelector('button').addEventListener('click', () => box.classList.toggle('zwinieta'));
  host.append(box);
  const dodaj = (etykieta, kontrolka, pionowy, pole) => {
    const w = wiersz(etykieta, kontrolka, pionowy, pole);
    box.append(w);
    return w;
  };
  dodaj.box = box;
  return dodaj;
}

export function zbudujPanel(){
  const host = el('wiersze');
  host.append(przyciskKreatora(), listaModulow(), pasekZaznaczenia());

  /* Moduł osadzony nie ma własnego korpusu — wymiary, siatka i konstrukcja bierze z komórki
     gospodarza, więc te sekcje nie mają czym sterować i chowam je. */
  const bezKorpusu = [];
  const rozmiar = sekcja(host, 'Size & position');
  bezKorpusu.push(rozmiar.box);
  rozmiar('Width', suwak(400, 5000, 10, () => stan.szerokoscMm, v => { ustawPole('szerokoscMm', v); stan.kolumnyWlasne = null; }, cm, null, 'Width'), false, 'szerokoscMm');
  rozmiar('Height', suwak(400, 3400, 10, () => stan.wysokoscMm, v => { ustawPole('wysokoscMm', v); stan.rzedyWlasne = null; },
    v => cm(v) + ` · ${stan.rzedyWlasne?.length || liczbaRzedow()} rows`, progiWysokosci, 'Height'), false, 'wysokoscMm');
  rozmiar('Depth', suwak(240, 800, 10, () => stan.glebokoscMm, v => ustawPole('glebokoscMm', v),
    v => cm(v) + (GLEB_LASTARE.includes(v) ? ' · fits IKEA' : ''), () => GLEB_LASTARE, 'Depth'), false, 'glebokoscMm');
  rozmiar('Rotation', grupa([['0', 'Front'], ['90', '90°'], ['180', '180°'], ['270', '270°']],
    () => String(stan.obrot || 0), v => ustawPole('obrot', +v)), false, 'obrot');

  sekcjaKomponentu(sekcja(host, 'Component').box);

  sekcjaKotwicy(sekcja(host, 'Anchor'));

  const uklad = sekcja(host, 'Layout');
  bezKorpusu.push(uklad.box);
  uklad('Style', grupa(STYLE, () => stan.styl,
    v => {
      const kolumny = [...stan.kolumny], rzedy = [...stan.rzedy];
      ustawPole('styl', v);
      /* Styl określa rytm frontów, nie zgodę na skasowanie geometrii wpisanej ręcznie. */
      stan.kolumnyWlasne = kolumny;
      stan.rzedyWlasne = rzedy;
      stan.siatkaKol = zapisTorow(kolumny);
      stan.siatkaRzed = zapisTorow(rzedy);
      if(v === 'custom') przygotujSiatke();
      przebuduj();
    }), true, 'styl');
  uklad('Columns', poleSiatki('c'), true);
  uklad('Rows', poleSiatki('r'), true);
  const gestosc = wiersz('Density', suwak(0, 100, 10, () => stan.gestosc, v => ustawPole('gestosc', v), v => v + '%'));
  uklad.box.append(gestosc);
  odswiezacze.push(() => gestosc.hidden = stan.styl === 'custom');   // w trybie ręcznym nic nie robi

  const material = sekcja(host, 'Material');
  material('Finish', grupa(Object.entries(WYKONCZENIA).map(([id, w]) => [id, w[0]]), () => stan.wykonczenie,
    v => { ustawPole('wykonczenie', v); if(v === 'board') ustawPole('drewno', null); }), false, 'wykonczenie');
  material('Colour', probniki(), true, 'kolor');
  material('Wood', drewnoDoWyboru(), true, 'drewno');

  const czesci = sekcja(host, 'Components');
  bezKorpusu.push(czesci.box);
  czesci('Back panels', grupa([['on', 'On'], ['off', 'Off']], () => stan.plecy ? 'on' : 'off', v => ustawPole('plecy', v === 'on')));
  czesci('Top unit', grupa([['on', 'On'], ['off', 'Off']], () => stan.nadstawka ? 'on' : 'off', v => ustawPole('nadstawka', v === 'on')));

  const konstrukcja = sekcja(host, 'Construction', true);
  bezKorpusu.push(konstrukcja.box);
  konstrukcja(`Legs ⌀${NOZKA_FI} mm`, suwak(0, 1000, 10, () => stan.nozkiMm || 0,
    v => { ustawPole('nozkiMm', v); if(v > 0) ustawPole('nogi', 'none'); }, v => v ? cm(v) : 'none'));
  konstrukcja('Leg colour', nozkiKolorem(), true);
  konstrukcja('Feet / plinth', grupa([['standard', 'Legs 11 cm'], ['plinth', 'Plinth'], ['none', 'None']], () => stan.nogi,
    v => { ustawPole('nogi', v); if(v !== 'none') ustawPole('nozkiMm', 0); }));

  const scena = sekcja(host, 'Scene', true);
  scena('Items on shelves', suwak(0, 100, 5, ileDodatkow, v => ustawPole('dodatki', v), v => v ? v + '%' : 'none'));
  scena('Plant beside it', roslinaDoWyboru(), true);
  scena('Lamp', lampaDoWyboru(), true);

  host.append(podsumowanie(), przyciski());
  /* „Edycja dopiero po wejściu w moduł" — sekcje parametrów są nieklikalne, dopóki nie
     wejdziesz dwuklikiem. Lista modułów i przyciski na dole zostają czynne. */
  const podpowiedz = document.createElement('p');
  podpowiedz.className = 'podpowiedz-modulu';
  podpowiedz.textContent = 'Double-click a module to edit it. Esc goes back up.';
  host.querySelector('.lista-modulow').after(podpowiedz);
  odswiezacze.push(() => {
    /* Parametry edytujesz po wejściu w moduł albo gdy zaznaczysz kilka naraz — zaznaczenie
       to nie to samo co wejście, ale też pozwala zmieniać właściwości (jak w Figmie). */
    bezKorpusu.forEach(s => s.hidden = wSrodkuModul(stan.meble[stan.aktywny]));
    const w = stan.wejscie.length > 0 || stan.zaznaczone.length > 1;
    host.querySelectorAll('.sekcja').forEach(s => s.classList.toggle('zablokowana', !w));
    podpowiedz.textContent = stan.zaznaczone.length === 1
      ? 'Selected, not editing — double-click the module to edit it.'
      : 'Double-click a module to edit it. Esc goes back up.';
    podpowiedz.hidden = w;
  });
  window.lucide?.createIcons();
}
