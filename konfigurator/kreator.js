/* Kreator mebli — pierwszy ekran po kliknięciu „New furniture” u góry prawego panelu.
   Powtarza drogę z tylko.com: kategoria → układ → wymiary → barwa, plus druga zakładka
   z ich gotowymi projektami. Efektem jest zawsze opis mebla, który dostaje szafa.js. */
import {KOLORY, zacisk} from './dane.js';
import {KATEGORIE, LINIE, PALETY, UKLADY_STARTOWE, katalogProjektow,
        opisZUkladu, opisZProjektu, siatkaProjektu, rozbierzBarwe} from './tylko.js';
import {resetDoOpisu} from './szafa.js';

/* Miniatura układu: ten sam rysunek co kafelki „Layout” w panelu — siatka w proporcjach
   rzeczywistych wymiarów, wypełnione pola tam, gdzie stoi front. */
export function miniatura(kol, rzed, uklady, w, h){
  const W = 100, H = Math.max(40, Math.min(150, 100 * h / w));
  const sx = kol.reduce((a, b) => a + b, 0), sy = rzed.reduce((a, b) => a + b, 0);
  let x = 0, pola = '';
  kol.forEach((kw, ci) => {
    let y = H;
    const px = W * kw / sx;
    rzed.forEach((rh, ri) => {                         // r1 jest na dole, więc idę od dołu
      const py = H * rh / sy;
      y -= py;
      const u = uklady[`r${ri + 1}c${ci + 1}`];
      const front = u && u !== 'open' && !/^shelf/.test(u);
      pola += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${px.toFixed(1)}" height="${py.toFixed(1)}"`
        + ` class="${front ? 'front' : 'otwarte'}"/>`;
    });
    x += px;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="mini" preserveAspectRatio="xMidYMax meet">${pola}</svg>`;
}

const probnikStyl = b => b.wnetrze == null ? `background:${KOLORY[b.kolor][1]}`
  : `background:linear-gradient(135deg, ${KOLORY[b.kolor][1]} 0 50%, ${KOLORY[b.wnetrze][1]} 50% 100%)`;

const wybor = {kategoria: 'wardrobe', uklad: null, barwa: null, wymiary: {}, projekt: null, zakladka: 'start'};

function ukladyKategorii(){ return UKLADY_STARTOWE[wybor.kategoria] || []; }

function ustawKategorie(id){
  wybor.kategoria = id;
  wybor.uklad = ukladyKategorii()[0] || null;
  wybor.barwa = PALETY[wybor.uklad?.linia || 'original'][0];
  wybor.wymiary = wybor.uklad ? {w: wybor.uklad.w, h: wybor.uklad.h, d: wybor.uklad.d} : {};
}

/* ---------- zakładka „Start a design” ---------- */
function widokStartu(){
  const u = wybor.uklad, paleta = PALETY[u?.linia || 'original'];
  const wym = wybor.wymiary;
  return `
  <div class="kreator-krok">
    <h4>1 · Furniture type</h4>
    <div class="kreator-kategorie">${KATEGORIE.map(k => `
      <button class="kreator-kategoria${k.id === wybor.kategoria ? ' aktywna' : ''}" data-kategoria="${k.id}">
        <img src="${k.ikona}" alt="" width="144" loading="lazy">
        <span>${k.nazwa}</span><em>${k.opis}</em>
      </button>`).join('')}</div>
  </div>
  <div class="kreator-krok">
    <h4>2 · Layout</h4>
    <div class="kreator-uklady">${ukladyKategorii().map(l => `
      <button class="kreator-uklad${l === u ? ' aktywna' : ''}" data-uklad="${l.id}" title="Tylko #${l.zrodlo}">
        ${miniatura(l.kol, l.rzed, l.uklady, l.w, l.h)}
        <span>${l.nazwa}</span>
        <em>${LINIE[l.linia].nazwa} · ${Math.round(l.w / 10)}×${Math.round(l.h / 10)}×${Math.round(l.d / 10)} cm</em>
      </button>`).join('')}</div>
    ${u ? `<p class="kreator-nota">${LINIE[u.linia].opis}</p>` : ''}
  </div>
  <div class="kreator-krok">
    <h4>3 · Dimensions</h4>
    <div class="kreator-wymiary">
      ${[['w', 'Width', 400, 5000], ['h', 'Height', 400, 3400], ['d', 'Depth', 240, 800]].map(([k, et, min, max]) => `
        <label>${et}<input type="number" data-wymiar="${k}" value="${((wym[k] ?? 0) / 10).toFixed(1).replace(/\.0$/, '')}"
          min="${min / 10}" max="${max / 10}" step="0.5"><i>cm</i></label>`).join('')}
    </div>
  </div>
  <div class="kreator-krok">
    <h4>4 · Colour${paleta.some(b => b.wnetrze != null) ? ' — front + interior' : ''}</h4>
    <div class="kreator-barwy">${paleta.map((b, i) => `
      <button class="kreator-barwa${b === wybor.barwa ? ' aktywna' : ''}" data-barwa="${i}"
        title="${b.nazwa}" style="${probnikStyl(b)}"></button>`).join('')}</div>
    <p class="kreator-nota">${wybor.barwa ? wybor.barwa.nazwa : ''}</p>
  </div>`;
}

/* ---------- zakładka „Tylko designs” ---------- */
function widokKatalogu(lista){
  const dla = lista.filter(p => p.kat === wybor.kategoria);
  return `
  <div class="kreator-krok">
    <h4>1 · Furniture type</h4>
    <div class="kreator-kategorie">${KATEGORIE.map(k => `
      <button class="kreator-kategoria${k.id === wybor.kategoria ? ' aktywna' : ''}" data-kategoria="${k.id}">
        <img src="${k.ikona}" alt="" width="144" loading="lazy"><span>${k.nazwa}</span>
      </button>`).join('')}</div>
  </div>
  <div class="kreator-krok">
    <h4>2 · Ready designs <small>${dla.length} from tylko.com</small></h4>
    <div class="kreator-uklady szeroko">${dla.map(p => {
      const s = siatkaProjektu(p), b = rozbierzBarwe(p.c);
      return `<button class="kreator-uklad${p === wybor.projekt ? ' aktywna' : ''}" data-projekt="${p.id}">
        ${miniatura(s.kol, s.rzed, s.uklady, p.w, p.h)}
        <span><i class="kropka" style="${probnikStyl(b)}"></i>${p.c}</span>
        <em>${Math.round(p.w / 10)}×${Math.round(p.h / 10)}×${Math.round(p.d / 10)} cm · ${p.kol.length} col</em>
      </button>`;
    }).join('')}</div>
    <p class="kreator-nota">Column widths, colours and fronts come from Tylko’s own configurator.
      Shelf heights are not in their public data, so the row rhythm is reconstructed — adjust it
      afterwards with Columns and Rows.</p>
  </div>`;
}

/* ---------- powłoka ---------- */
let tlo = null, katalog = [];

function odswiez(){
  const tresc = tlo.querySelector('.kreator-tresc');
  tresc.innerHTML = wybor.zakladka === 'start' ? widokStartu() : widokKatalogu(katalog);
  tlo.querySelectorAll('.kreator-zakladki button').forEach(b =>
    b.classList.toggle('aktywna', b.dataset.zakladka === wybor.zakladka));
  const gotowe = wybor.zakladka === 'start' ? !!wybor.uklad : !!wybor.projekt;
  const cta = tlo.querySelector('[data-akcja="kreator-stworz"]');
  cta.disabled = !gotowe;
  cta.textContent = wybor.zakladka === 'start'
    ? (wybor.uklad ? `Create ${wybor.uklad.nazwa}` : 'Create')
    : (wybor.projekt ? `Create Tylko #${wybor.projekt.id}` : 'Pick a design');
}

function stworz(){
  const opis = wybor.zakladka === 'start'
    ? (wybor.uklad && opisZUkladu(wybor.uklad, wybor.barwa, wybor.wymiary))
    : (wybor.projekt && opisZProjektu(wybor.projekt));
  if(!opis) return;
  zamknijKreator();
  resetDoOpisu(opis);
}

export function zamknijKreator(){ tlo?.remove(); tlo = null; }

export async function pokazKreator(){
  if(tlo) return;
  if(!wybor.uklad) ustawKategorie(wybor.kategoria);
  tlo = document.createElement('div');
  tlo.className = 'kreator-tlo';
  tlo.innerHTML = `<div class="kreator" role="dialog" aria-label="Furniture creator">
    <header>
      <h3>Furniture creator</h3>
      <nav class="kreator-zakladki">
        <button data-zakladka="start">Start a design</button>
        <button data-zakladka="katalog">Tylko designs</button>
      </nav>
      <button class="kreator-zamknij" data-akcja="zamknij" aria-label="Close"><i data-lucide="x"></i></button>
    </header>
    <div class="kreator-tresc"></div>
    <footer><p class="kreator-nota">Creating replaces the project in this browser.</p>
      <button class="cta" data-akcja="kreator-stworz">Create</button></footer>
  </div>`;
  document.body.append(tlo);

  tlo.addEventListener('click', e => {
    if(e.target === tlo) return zamknijKreator();
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'zamknij') return zamknijKreator();
    if(b.dataset.akcja === 'kreator-stworz') return stworz();
    if(b.dataset.zakladka){ wybor.zakladka = b.dataset.zakladka; return odswiez(); }
    if(b.dataset.kategoria){
      ustawKategorie(b.dataset.kategoria);
      wybor.projekt = null;
      return odswiez();
    }
    if(b.dataset.uklad){
      wybor.uklad = ukladyKategorii().find(l => l.id === b.dataset.uklad);
      wybor.wymiary = {w: wybor.uklad.w, h: wybor.uklad.h, d: wybor.uklad.d};
      const paleta = PALETY[wybor.uklad.linia];
      if(!paleta.includes(wybor.barwa)) wybor.barwa = paleta[0];
      return odswiez();
    }
    if(b.dataset.projekt){
      wybor.projekt = katalog.find(p => String(p.id) === b.dataset.projekt);
      return odswiez();
    }
    if(b.dataset.barwa){
      wybor.barwa = PALETY[wybor.uklad.linia][+b.dataset.barwa];
      return odswiez();
    }
  });
  /* Wymiary zmieniam bez przerysowania, żeby pole nie traciło kursora przy każdej cyfrze. */
  tlo.addEventListener('input', e => {
    const pole = e.target.closest('[data-wymiar]');
    if(!pole) return;
    const granice = {w: [400, 5000], h: [400, 3400], d: [240, 800]}[pole.dataset.wymiar];
    wybor.wymiary[pole.dataset.wymiar] = zacisk(Math.round(+pole.value * 10), ...granice);
  });
  tlo.addEventListener('keydown', e => { if(e.key === 'Escape') zamknijKreator(); });

  odswiez();
  window.lucide?.createIcons();
  katalog = await katalogProjektow().catch(() => []);
  if(tlo && wybor.zakladka === 'katalog') odswiez();
}

/* Przycisk na samej górze prawego panelu — pierwsza rzecz nad listą modułów. */
export function przyciskKreatora(){
  const box = document.createElement('div');
  box.className = 'kreator-start';
  box.innerHTML = `<button class="cta" data-akcja="kreator"><i data-lucide="layout-grid"></i>New furniture</button>`;
  box.addEventListener('click', () => pokazKreator());
  return box;
}
