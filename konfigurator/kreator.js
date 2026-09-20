/* Kreator mebli — pierwszy ekran po kliknięciu „New furniture” u góry prawego panelu.
   Powtarza drogę z tylko.com: kategoria → układ → wymiary → barwa, plus druga zakładka
   z ich gotowymi projektami. Efektem jest zawsze opis mebla, który dostaje szafa.js. */
import {KOLORY, zacisk} from './dane.js';
import {KATEGORIE, LINIE, PALETY, KATEGORIA_START, katalogProjektow,
        opisZProjektu, siatkaProjektu, rozbierzBarwe} from './tylko.js';
import {STYLE_LINII, modulyStylu} from './style-tylko.js';
import {KSZTALTY, AGD, PYTANIA_DODATKOWE, DOMYSLNE, modulyKuchni, opisKuchni} from './kuchnia.js';
import {resetDoOpisu, dolaczOpisy} from './szafa.js';

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

const wybor = {kategoria: 'wardrobe', linia: null, styl: null, barwa: null, wymiary: {},
               projekt: null, zakladka: 'start', pytanie: false, kuchnia: {...DOMYSLNE}};

const start = () => KATEGORIA_START[wybor.kategoria];
const linia = () => LINIE[wybor.linia] || LINIE.edge;
function styleKategorii(){ return STYLE_LINII[linia().style] || []; }
function paletaLinii(){ return PALETY[linia().paleta]; }

function ustawLinie(id){
  wybor.linia = id;
  wybor.styl = styleKategorii()[0] || null;
  wybor.barwa = paletaLinii()[0];
}

function ustawKategorie(id){
  wybor.kategoria = id;
  const s = KATEGORIA_START[id];
  wybor.wymiary = {w: s.w, h: s.h, d: s.d};
  ustawLinie(s.linie[0]);
}

/* ---------- zakładka „Start a design” ---------- */
function widokStartu(){
  const l = linia(), paleta = paletaLinii(), wym = wybor.wymiary;
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
    <h4>2 · Furniture line</h4>
    <div class="grupa kreator-linie">${start().linie.map(id => `
      <button data-linia="${id}" class="${id === wybor.linia ? 'aktywny' : ''}">${LINIE[id].nazwa}</button>`).join('')}</div>
    <p class="kreator-nota">${l.opis}</p>
  </div>
  <div class="kreator-krok">
    <h4>3 · Style</h4>
    <div class="kreator-uklady">${styleKategorii().map(l => `
      <button class="kreator-uklad${l === wybor.styl ? ' aktywna' : ''}" data-styl="${l.id}">
        <img class="mini" src="${l.ikona}" alt="" width="48" height="48">
        <span>${l.nazwa}</span><em>${l.opis}</em>
      </button>`).join('')}</div>
  </div>
  <div class="kreator-krok">
    <h4>4 · Dimensions</h4>
    <div class="kreator-wymiary">
      ${[['w', 'Width', 400, 5000], ['h', 'Height', 400, 3400], ['d', 'Depth', 240, 800]].map(([k, et, min, max]) => `
        <label>${et}<input type="number" data-wymiar="${k}" value="${((wym[k] ?? 0) / 10).toFixed(1).replace(/\.0$/, '')}"
          min="${min / 10}" max="${max / 10}" step="0.5"><i>cm</i></label>`).join('')}
    </div>
  </div>
  <div class="kreator-krok">
    <h4>5 · Colour${paleta.some(b => b.wnetrze != null) ? ' — front + interior' : ''}</h4>
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

/* ---------- zakładka „Kitchen” ---------- */
/* Zdjęcia referencyjne różnią się kolorem i szerokością, nie budową — więc kreator pyta
   dokładnie o to, co je różni, i pozwala każde AGD wyłączyć. */
const grupaOpcji = (pole, opcje, wartosc) => `<div class="grupa">${opcje.map(([v, et]) =>
  `<button data-kuchnia="${pole}" data-wartosc="${v}" class="${String(v) === String(wartosc) ? 'aktywny' : ''}">${et}</button>`).join('')}</div>`;

const ETYKIETY_GDZIE = {brak: 'None', lewo: 'Left', srodek: 'Centre', prawo: 'Right'};

function widokKuchni(){
  const k = wybor.kuchnia;
  const proby = (pole, aktywny) => KOLORY.slice(0, 16).map(([n, hex], i) =>
    `<button class="kreator-barwa${i === aktywny ? ' aktywna' : ''}" data-kuchnia="${pole}"
      data-wartosc="${i}" title="${n}" style="background:${hex}"></button>`).join('');
  const wymiar = (pole, etykieta, min, max) => `<label>${etykieta}
    <input type="number" data-kuchnia-wymiar="${pole}" value="${(k[pole] / 10).toFixed(0)}"
      min="${min / 10}" max="${max / 10}" step="1"><i>cm</i></label>`;
  return `
  <div class="kreator-krok">
    <h4>1 · Shape</h4>
    <div class="kreator-kategorie">${KSZTALTY.map(x => `
      <button class="kreator-kategoria${x.id === k.ksztalt ? ' aktywna' : ''}"
        data-kuchnia="ksztalt" data-wartosc="${x.id}">
        <span>${x.nazwa}</span><em>${x.opis}</em></button>`).join('')}</div>
  </div>
  <div class="kreator-krok">
    <h4>2 · Dimensions</h4>
    <div class="kreator-wymiary">
      ${wymiar('w', 'Run width', 1200, 8000)}${wymiar('h', 'Height', 1800, 3400)}${wymiar('d', 'Depth', 400, 800)}
      ${k.ksztalt === 'naroznik' ? wymiar('dlugoscBoku', 'Return', 800, 5000) : ''}
      ${k.ksztalt === 'wyspa' ? wymiar('wyspaW', 'Island width', 800, 4000) + wymiar('wyspaD', 'Island depth', 600, 1400) : ''}
    </div>
  </div>
  <div class="kreator-krok">
    <h4>3 · Worktop and niche</h4>
    ${PYTANIA_DODATKOWE.map(q => `<div class="kreator-pytanie"><span>${q.nazwa}</span>
      ${grupaOpcji(q.id, q.opcje, k[q.id])}</div>`).join('')}
  </div>
  <div class="kreator-krok">
    <h4>4 · Appliances <small>each one optional</small></h4>
    ${AGD.map(a => `<div class="kreator-pytanie"><span>${a.nazwa}<em>${a.opis}</em></span>
      ${grupaOpcji(a.id, a.gdzie.map(g => [g, ETYKIETY_GDZIE[g]]), k[a.id])}</div>`).join('')}
  </div>
  <div class="kreator-krok">
    <h4>5 · Colours <small>cabinets and niche</small></h4>
    <div class="kreator-pytanie"><span>Cabinets</span><div class="kreator-barwy">${proby('kolor', k.kolor)}</div></div>
    <div class="kreator-pytanie"><span>Niche</span><div class="kreator-barwy">${proby('kolorNiszy', k.kolorNiszy)}</div></div>
    <div class="kreator-pytanie"><span>Finish</span>
      ${grupaOpcji('wykonczenie', [['veneer', 'Veneer'], ['board', 'Board'], ['plywood', 'Plywood']], k.wykonczenie)}</div>
    <p class="kreator-nota">${opisKuchni(k)}</p>
  </div>`;
}

/* ---------- powłoka ---------- */
let tlo = null, katalog = [];

function odswiez(){
  const tresc = tlo.querySelector('.kreator-tresc');
  tresc.innerHTML = wybor.zakladka === 'start' ? widokStartu()
    : wybor.zakladka === 'kuchnia' ? widokKuchni() : widokKatalogu(katalog);
  tlo.querySelectorAll('.kreator-zakladki button').forEach(b =>
    b.classList.toggle('aktywna', b.dataset.zakladka === wybor.zakladka));
  const gotowe = wybor.zakladka === 'start' ? !!wybor.styl
    : wybor.zakladka === 'kuchnia' ? true : !!wybor.projekt;
  const nazwa = wybor.zakladka === 'start'
    ? (wybor.styl ? `Create ${wybor.styl.nazwa}` : 'Create')
    : wybor.zakladka === 'kuchnia' ? 'Create kitchen'
    : (wybor.projekt ? `Create Tylko #${wybor.projekt.id}` : 'Pick a design');
  const stopka = tlo.querySelector('footer');
  stopka.innerHTML = wybor.pytanie
    ? `<p class="kreator-nota">There is already a project open — what should happen to it?</p>
       <button class="cta wtorna" data-akcja="kreator-anuluj">Cancel</button>
       <button class="cta wtorna" data-akcja="kreator-dolacz">Add next to it</button>
       <button class="cta" data-akcja="kreator-zastap">Replace it</button>`
    : `<p class="kreator-nota">Nothing is created until you confirm.</p>
       <button class="cta" data-akcja="kreator-stworz"${gotowe ? '' : ' disabled'}>${nazwa}</button>`;
}

/* Co zrobić z tym, co już stoi w scenie — pytam zamiast kasować po cichu. Nowy projekt
   albo zastępuje dotychczasowy, albo staje obok niego jako kolejne moduły. */
function stworz(){
  wybor.pytanie = true;
  odswiez();
}

function wykonaj(tryb){
  const s = start();
  const opis = wybor.zakladka === 'start'
    ? (wybor.styl && modulyStylu(wybor.styl, wybor.wymiary, wybor.barwa,
        {nogi: s.nogi, wykonczenie: linia().wykonczenie}))
    : wybor.zakladka === 'kuchnia' ? modulyKuchni(wybor.kuchnia)
    : (wybor.projekt && opisZProjektu(wybor.projekt));
  if(!opis) return;
  wybor.pytanie = false;
  zamknijKreator();
  if(tryb === 'dolacz') dolaczOpisy(opis); else resetDoOpisu(opis);
}

export function zamknijKreator(){ tlo?.remove(); tlo = null; wybor.pytanie = false; }

export async function pokazKreator(){
  if(tlo) return;
  if(!wybor.styl) ustawKategorie(wybor.kategoria);
  tlo = document.createElement('div');
  tlo.className = 'kreator-tlo';
  tlo.innerHTML = `<div class="kreator" role="dialog" aria-label="Furniture creator">
    <header>
      <h3>Furniture creator</h3>
      <nav class="kreator-zakladki">
        <button data-zakladka="start">Start a design</button>
        <button data-zakladka="katalog">Tylko designs</button>
        <button data-zakladka="kuchnia">Kitchen</button>
      </nav>
      <button class="kreator-zamknij" data-akcja="zamknij" aria-label="Close"><i data-lucide="x"></i></button>
    </header>
    <div class="kreator-tresc"></div>
    <footer></footer>
  </div>`;
  document.body.append(tlo);

  tlo.addEventListener('click', e => {
    if(e.target === tlo) return zamknijKreator();
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.akcja === 'zamknij') return zamknijKreator();
    if(b.dataset.akcja === 'kreator-stworz') return stworz();
    if(b.dataset.akcja === 'kreator-zastap') return wykonaj('zastap');
    if(b.dataset.akcja === 'kreator-dolacz') return wykonaj('dolacz');
    if(b.dataset.akcja === 'kreator-anuluj'){ wybor.pytanie = false; return odswiez(); }
    if(b.dataset.zakladka){ wybor.zakladka = b.dataset.zakladka; return odswiez(); }
    if(b.dataset.kategoria){
      ustawKategorie(b.dataset.kategoria);
      wybor.projekt = null;
      wybor.pytanie = false;
      return odswiez();
    }
    if(b.dataset.kuchnia){
      const v = b.dataset.wartosc;
      wybor.kuchnia[b.dataset.kuchnia] = /^-?\d+$/.test(v) ? +v : v;
      return odswiez();
    }
    if(b.dataset.linia){ ustawLinie(b.dataset.linia); return odswiez(); }
    if(b.dataset.styl){
      wybor.styl = styleKategorii().find(l => l.id === b.dataset.styl);
      return odswiez();
    }
    if(b.dataset.projekt){
      wybor.projekt = katalog.find(p => String(p.id) === b.dataset.projekt);
      return odswiez();
    }
    if(b.dataset.barwa){
      wybor.barwa = paletaLinii()[+b.dataset.barwa];
      return odswiez();
    }
  });
  /* Wymiary zmieniam bez przerysowania, żeby pole nie traciło kursora przy każdej cyfrze. */
  tlo.addEventListener('input', e => {
    const kuch = e.target.closest('[data-kuchnia-wymiar]');
    if(kuch){
      const granice = {w: [1200, 8000], h: [1800, 3400], d: [400, 800], dlugoscBoku: [800, 5000],
                       wyspaW: [800, 4000], wyspaD: [600, 1400]}[kuch.dataset.kuchniaWymiar];
      wybor.kuchnia[kuch.dataset.kuchniaWymiar] = zacisk(Math.round(+kuch.value * 10), ...granice);
      return;
    }
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
