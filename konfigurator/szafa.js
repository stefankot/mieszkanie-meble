/* Punkt wejścia: składa moduły, trzyma historię i przebudowę, podpina zdarzenia. */
import * as THREE from 'three';
import {rozwinParametryczny, sprawdzParametryczny} from 'https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js';
import {stan, ZRODLA, HOST, el, bladEl, pokazBlad, cm, UKLAD, ukladyDlaKomorki,
        zgodnaKolumna, zgodnaWysokosc, zgodnaGlebokosc, ODSTEP_MEBLI, polaMebla,
        zapiszAktywny, wczytajDo, KOLORY, WYKONCZENIA} from './dane.js';
import {konfigurujModel, wnetrzeWys} from './model.js';
import {przytnijDoWnek, czesciWnek, czesciNozek} from './wneki.js';
import {eksportDokument, dociagnijDoIkea} from './eksport.js';
import {stworzScene, zbudujBryle, zbierzDekor, dopasujKamere, dopasujRozmiar, ustawUjecie,
        frontMebla, wczytajKatalogDrewna, przelaczSciezki, odswiezSciezki, petla, kamera,
        sterowanie, mebel, renderer, naOsiCzolowej} from './scena.js';
import {odswiezNakladke, zamknijKarte} from './nakladka.js';

import {wlaczPrzeciaganie, wlaczZaznaczanie, czyscZaznaczenie, zakonczEdycje,
        wlaczHoverMebli, przesunPrzegrode} from './wybor.js';
import {zbudujPanel, odswiezacze} from './panel.js';
import {wczytajKatalogModeli} from './modele.js';
/* Komórki każdego korpusu z ostatniej przebudowy — panel potrzebuje ich, żeby moduł osadzony
   mógł wskazać, w której komórce rodzica siedzi. */
export const komorkiRodzica = new Map();

import {nowyId, rozmiescModuly, sciezkaDo, wszystkieWKolejnosci, wSrodku, czesciOsadzone,
        odniesienieModulu,
        mozliweKotwice, nazwaModulu, STRONY} from './moduly.js';
import {parsujTory, naturalnaSuma} from './siatka.js';

let FABRYCZNY = null;                                  // stan mebla zaraz po wczytaniu modelu

/* ---------- mebel fabryczny: regał przy łóżku ---------- */
/* Odtworzenie v0020 w języku modułów. Sześć bytów, każdy z własnym kompletem parametrów:
   kobaltowy cokół z drzwiami i szufladą, biała część nad nim, dwa biurka z opuszczanym
   blatem, drewniane skrzydło obrócone o 90° i koralowa nisza na jego czole.
   Siatki wpisane stylem Custom, bo prześwity z v0020 nie wychodzą z żadnego automatu. */
const REGAL_PRZY_LOZKU = [
  /* Cokół to osobny moduł w całości kobaltowy — materiał bierze wprost z dokumentu,
     więc paleta go nie przemalowuje razem z resztą. */
  {id: 'szafki-dolne', nazwa: 'Szafki dolne',
   zrodlo: 'regal-lozko', szerokoscMm: 1764, wysokoscMm: 782, glebokoscMm: 570,
   styl: 'custom', siatkaKol: '58.2 + 58.2 + 58.2', siatkaRzed: '56.4',
   materialKorpusu: 'cobalt-matte', wykonczenie: 'board', drewno: null, nogi: 'plinth', obrot: 0,
   uklady: {r1c1: 'drzwiK', r1c2: 'szufl120'}},
  {id: 'skrzydlo-glowne', nazwa: 'Skrzydło główne',
   zrodlo: 'regal-lozko', szerokoscMm: 1764, wysokoscMm: 1818, glebokoscMm: 570,
   styl: 'custom', siatkaKol: '58.2 + 58.2 + 58.2', siatkaRzed: '58.2 + 58.2 + 58.2',
   kolor: 0, wykonczenie: 'board', drewno: null, nogi: 'none', obrot: 0,
   kotwica: {do: 'szafki-dolne', strona: 'gora'},
   uklady: {r3c1: 'door', r3c2: 'door', r3c3: 'door'}},
  /* Biurka są osobnymi modułami, a nie ustawieniem komórki — każde ma własny kolor i głębokość. */
  {id: 'biurko-lewe', nazwa: 'Biurko lewe', definicja: 'biurko-60', kolor: 0,
   kotwica: {do: 'skrzydlo-glowne', strona: 'wnetrze', komorka: 'r1c1'}},
  {id: 'biurko-prawe', nazwa: 'Biurko prawe', definicja: 'biurko-120', kolor: 0,
   kotwica: {do: 'skrzydlo-glowne', strona: 'wnetrze', komorka: 'r1c2'}},
  {id: 'skrzydlo-krotkie', nazwa: 'Skrzydło krótkie',
   zrodlo: 'regal-lozko-bok', szerokoscMm: 1200, wysokoscMm: 1792, glebokoscMm: 600,
   styl: 'custom', siatkaKol: '116.4', siatkaRzed: '115.6 + 58.2',
   kolor: 3, wykonczenie: 'veneer', drewno: null, nogi: 'none', obrot: 90,
   /* Czołem do lewego boku zabudowy, plecami w jednej linii z jej plecami — obrót o 90°
      sprawia, że bryła idzie w głąb pokoju. Dokładnie jak w v0020. */
   kotwica: {do: 'szafki-dolne', strona: 'lewo'},
   /* W v0020 skrzydło wisi na czterech toczonych nóżkach i zaczyna się na y=808 —
      odtwarzam to prętowymi nóżkami konfiguratora, bo kształt i tak jest przybliżeniem. */
   nozkiMm: 790, nozkiKolor: 0,
   uklady: {r1c1: 'drzwiP'}},
  /* Koralowa nisza na czole krótkiego skrzydła — własny moduł, własny kolor. */
  /* Paleta Tylko nie ma korala, więc startuję najbliższym odcieniem — i w przeciwieństwie do
     kobaltowego cokołu ta nisza słucha próbnika, bo o to prosił użytkownik. */
  {id: 'nisza-koralowa', nazwa: 'Nisza koralowa', definicja: 'nisza-koral', kolor: 9,
   wykonczenie: 'board', drewno: null,
   kotwica: {do: 'skrzydlo-krotkie', strona: 'wnetrze', komorka: 'r2c1'}}
];

function mebleFabryczne(){
  const meble = [];
  for(const opis of REGAL_PRZY_LOZKU){
    wczytajDo(FABRYCZNY);
    Object.assign(stan, structuredClone(opis));
    /* Moduł osadzony bierze wymiary z komórki gospodarza — nie ma własnej siatki rzędów. */
    if(stan.siatkaRzed && !stan.definicja){
      /* Wysokość dobieram tak, żeby prześwity wyszły co do milimetra — dokładnie tak, jak
         robi to pole „Rows" w panelu. */
      const {tory} = parsujTory(stan.siatkaRzed);
      const dostepne = wnetrzeWys() - (tory.length - 1) * stan.plytaMm;
      stan.wysokoscMm += Math.round(naturalnaSuma(tory, dostepne) - dostepne);
    }
    meble.push(polaMebla());
  }
  stan.meble = meble;
  stan.aktywny = 0;
  wczytajDo(meble[0]);
}

export const pokazKomunikat = pokazBlad;

/* Projekt przeżywa zamknięcie karty. Zapis jest opóźniony, żeby ciągnięcie suwaka
   nie pisało po localStorage co klatkę; brak dostępu (tryb prywatny) nie psuje pracy. */
const KLUCZ_ZAPISU = 'konfigurator-szafy-v1';
/* W trybie selftestu nie czytam i nie zapisuję pamięci przeglądarki: testy mają startować
   z tego samego stanu i nie wolno im skasować projektu użytkownika. */
/* Każda wartość `?selftest=` włącza tryb testowy — `1` to komplet, `29` albo `29-36` zakres. */
const TRYB_TESTU = new URLSearchParams(location.search).has('selftest');
let zapisWToku = 0;

export function zapiszLokalnie(natychmiast = false){
  if(TRYB_TESTU) return;
  clearTimeout(zapisWToku);
  const wykonaj = () => {
    try{
      zapiszAktywny();
      localStorage.setItem(KLUCZ_ZAPISU, JSON.stringify({wersja: 2, aktywny: stan.aktywny,
                                                        meble: stan.meble, wzorce: stan.wzorce}));
    }catch(e){ /* brak localStorage — pracujemy bez zapisu */ }
  };
  if(natychmiast) wykonaj(); else zapisWToku = setTimeout(wykonaj, 400);
}

export function wczytajLokalnie(){
  if(TRYB_TESTU) return false;
  try{
    const zapis = JSON.parse(localStorage.getItem(KLUCZ_ZAPISU) || 'null');
    if(!zapis?.meble?.length) return false;
    stan.meble = zapis.meble;
    stan.wzorce = zapis.wzorce || {};
    stan.aktywny = Math.min(zapis.aktywny || 0, zapis.meble.length - 1);
    wczytajDo(stan.meble[stan.aktywny]);
    return true;
  }catch(e){ return false; }
}

export function zapomnijZapis(){
  if(TRYB_TESTU) return;                               // testy nie kasują projektu użytkownika
  try{ localStorage.removeItem(KLUCZ_ZAPISU); }catch(e){ /* nic do sprzątania */ }
}

/* ---------- historia, eksport, przebudowa ---------- */
export const migawka = () => { zapiszAktywny(); return JSON.stringify({meble: stan.meble, aktywny: stan.aktywny, wzorce: stan.wzorce}); };

export function zapisz(){
  const m = migawka();
  if(stan.historia[stan.indeks] === m) return;
  stan.historia.splice(stan.indeks + 1);
  stan.historia.push(m);
  stan.indeks = stan.historia.length - 1;
}

export function skok(delta){
  const i = stan.indeks + delta;
  if(i < 0 || i >= stan.historia.length) return;
  stan.indeks = i;
  const zapis = JSON.parse(stan.historia[i]);
  stan.meble = zapis.meble;
  stan.wzorce = zapis.wzorce || {};
  stan.aktywny = Math.min(zapis.aktywny, zapis.meble.length - 1);
  wczytajDo(stan.meble[stan.aktywny]);
  przebuduj(false);
}

export function pobierzJSON(){
  const d = eksportDokument();
  sprawdzParametryczny(d.parametric);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], {type: 'application/json'}));
  a.download = 'szafa.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Buduje wszystkie meble po kolei: każdy dostaje własny model i przesunięcie po X,
   a pola aktywnego mebla zostają w `stan`, żeby nakładka i panel działały jak dotąd. */
/* Pathtracing: wolny, fotograficzny podgląd. Nakładka edycyjna znika, bo każda zmiana
   geometrii kasuje zebrane próbki i liczenie zaczyna się od zera. */
async function przelaczTrybSciezek(przycisk){
  const stanEl = el('sciezki-stan');
  przycisk.classList.add('pracuje');
  try{
    const wlaczony = await przelaczSciezki((probki, maks) => {
      stanEl.textContent = probki >= maks ? `Path tracing · ${maks} samples · done`
                                          : `Path tracing · ${probki} / ${maks} samples`;
    });
    przycisk.classList.toggle('aktywny', wlaczony);
    stanEl.hidden = !wlaczony;
    if(wlaczony){
      stanEl.textContent = 'Path tracing · warming up…';
      zakonczEdycje();
    }
    el('siatka').hidden = el('olowki').hidden = wlaczony;
  }catch(e){
    pokazBlad('Path tracing could not start: ' + e.message);
    setTimeout(() => { bladEl.hidden = true; }, 6000);
  }finally{
    przycisk.classList.remove('pracuje');
  }
}

/* Reset kasuje cały projekt, więc pyta — kartą przy szynie, nie systemowym alertem. */
function potwierdzReset(przycisk){
  zamknijKarte();
  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `<button class="karta-zamknij" data-id="nie"><i data-lucide="x"></i></button>
    <h3>Start over?</h3>
    <p>This drops every piece, niche and layout change and replaces the design saved in this browser with a plain wardrobe.</p>
    <div class="grupa" data-rola="reset"><button data-id="nie">Cancel</button><button data-id="tak" class="grozny">Reset everything</button></div>`;
  karta.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    zakonczEdycje();
    if(b.dataset.id === 'tak') resetDoFabrycznych();
  });
  el('scena').append(karta);
  window.lucide?.createIcons();
  const sc = el('scena').getBoundingClientRect(), r = przycisk.getBoundingClientRect();
  karta.classList.add('od-prawej');
  karta.style.left = Math.max(8, r.left - sc.left - karta.offsetWidth - 14) + 'px';
  karta.style.top = Math.max(8, Math.min(r.top - sc.top - 20, sc.height - karta.offsetHeight - 8)) + 'px';
}

export function resetDoFabrycznych(){
  zapomnijZapis();
  stan.meble = [];
  stan.aktywny = 0;
  stan.historia = [];
  stan.indeks = -1;
  mebleFabryczne();
  przebuduj();
}

/* Import: dokument z tego konfiguratora wraca w całości, obcy v2 wczytuję po wymiarach korpusu. */
export function wczytajJSON(tekst){
  const d = JSON.parse(tekst);
  const zapis = d?.customParameters?.konfigurator;
  if(zapis?.meble?.length){
    stan.meble = zapis.meble;
    stan.wzorce = zapis.wzorce || {};
    stan.aktywny = Math.min(zapis.aktywny || 0, zapis.meble.length - 1);
    wczytajDo(stan.meble[stan.aktywny]);
  }else if(Array.isArray(d?.parametric?.carcass?.sizeMm)){
    const c = d.parametric.carcass;
    Object.assign(stan, {
      szerokoscMm: c.sizeMm[0], wysokoscMm: c.sizeMm[1], glebokoscMm: c.sizeMm[2],
      plecy: (c.backMm || 0) > 0, nogi: (c.plinthMm || 0) > 0 ? 'standard' : 'none',
      uklady: {}, wneki: [], kolumnyWlasne: null, rzedyWlasne: null, siatkaKol: '', siatkaRzed: ''});
    stan.meble = [polaMebla()];
    stan.aktywny = 0;
  }else throw Error('to nie wygląda na dokument mebla v2');
  stan.historia = [];
  stan.indeks = -1;
  zamknijKarte();
  czyscZaznaczenie();
  przebuduj();
  return stan.meble.length;
}

export function przebuduj(zapisujHistorie = true){
  zapiszAktywny();
  if(!stan.meble.length){ stan.meble = [polaMebla()]; stan.aktywny = 0; }
  stan.aktywny = Math.min(stan.aktywny, stan.meble.length - 1);
  const grupy = [];
  let aktywne = null;
  /* Każdy moduł ma tożsamość — po niej chodzą kotwice, lista i zaznaczenie. Starsze zapisy
     i kopie zrobione przed wprowadzeniem modułów dostają ją przy pierwszej przebudowie. */
  for(const m of stan.meble) if(!m.id) m.id = nowyId();
  /* Położenia liczy drzewo kotwic: korzenie idą bok w bok, dzieci przylegają do rodzica.
     Łańcuch z dociąganiem po kolizji zniknął — narożnik opisuje teraz kotwica, nie przypadek. */
  const polozenia = rozmiescModuly(ODSTEP_MEBLI);

  /* Buduję w kolejności drzewa, bo moduł osadzony potrzebuje komórek swojego rodzica. */
  const definicjeRodzica = new Map();
  komorkiRodzica.clear();
  for(const m of wszystkieWKolejnosci()){
    const i = stan.meble.indexOf(m);
    wczytajDo(m);
    const p = polozenia.get(m.id) || {x: 0, y: 0, z: 0};

    if(wSrodku(m)){
      /* Moduł osadzony: jedna definicja z dokumentu rodzica rozwinięta na wymiary komórki.
         Biurko i koralowa nisza są dzięki temu osobnymi bytami z własnym kolorem. */
      const host = m.kotwica.do;
      const rodzicM = stan.meble.find(x => x.id === host);
      const odniesienie = odniesienieModulu(m, rodzicM, komorkiRodzica.get(host));
      const definicja = definicjeRodzica.get(host)?.[m.definicja];
      /* Moduł osadzony ma własny materiał z palety — inaczej kolor i tekstura nie miałyby na co
         działać, bo definicja przychodzi z dokumentu rodzica z zapisanym na sztywno materiałem.
         `materialKorpusu` wypisuje moduł z palety i zostawia barwę zaprojektowaną. */
      const bazowe = structuredClone(stan.dokumenty[rodzicM?.zrodlo]?.materials.definitions || {});
      const wlasny = `modul-${m.id}`;
      if(!stan.materialKorpusu)
        bazowe[wlasny] = {type: 'wood', color: KOLORY[stan.kolor][1],
                          roughness: WYKONCZENIA[stan.wykonczenie][1], metalness: 0};
      const czesciM = czesciOsadzone(m, definicja, odniesienie, stan.materialKorpusu || wlasny);
      grupy.push({czesci: czesciM, definicje: bazowe,
                  dekor: [], x: p.x, z: p.z, y: p.y, obrot: rodzicM?.obrot || 0, indeks: i, id: m.id,
                  /* Moduł osadzony dziedziczy podniesienie gospodarza — inaczej szafka na nóżkach
                     miałaby zawartość leżącą na podłodze. */
                  wykonczenie: m.wykonczenie, drewno: m.drewno, nozki: rodzicM?.nozkiMm || 0});
      if(i === stan.aktywny) aktywne = {model: stan.model, czesci: czesciM, komorki: [],
                                        kolumny: [], rzedy: [], polki: {}};
      continue;
    }

    const model = konfigurujModel();
    m.wneki = stan.wneki;                              // nisze przycięte do siatki muszą zostać w zapisie
    const wynik = rozwinParametryczny(model.parametric);
    /* Komórki TEGO mebla muszą trafić do stanu ZANIM policzę wnęki i dekoracje —
       inaczej granicaWneki() liczy na siatce poprzedniego mebla i wyściółka ląduje
       w poprzek rzędów, a przy dwóch meblach wygląda, jakby edytował się nie ten. */
    stan.komorki = wynik.komorki;
    komorkiRodzica.set(m.id, wynik.komorki);
    definicjeRodzica.set(m.id, model.parametric.definitions);
    const czesci = [...przytnijDoWnek(wynik.parts), ...czesciWnek(), ...czesciNozek()];
    grupy.push({czesci, definicje: model.materials.definitions, dekor: zbierzDekor(),
                x: p.x, z: p.z, y: p.y, obrot: m.obrot || 0, indeks: i, id: m.id,
                wykonczenie: m.wykonczenie, drewno: m.drewno, nozki: m.nozkiMm || 0});
    /* Siatkę aktywnego mebla trzeba odłożyć na bok: konfigurujModel() następnego mebla
       nadpisze stan.kolumny i stan.rzedy, a czyta je potem panel, wymiarowanie i
       przeciąganie przegród — bez tego edytowałyby siatkę ostatniego mebla w rzędzie. */
    if(i === stan.aktywny) aktywne = {model, czesci, komorki: wynik.komorki,
                                      kolumny: stan.kolumny, rzedy: stan.rzedy, polki: stan.polkiWyliczone};
  }
  wczytajDo(stan.meble[stan.aktywny]);
  stan.model = aktywne.model;
  stan.czesci = aktywne.czesci;
  stan.komorki = aktywne.komorki;
  stan.kolumny = aktywne.kolumny;
  stan.rzedy = aktywne.rzedy;
  stan.polkiWyliczone = aktywne.polki;
  zbudujBryle(grupy);
  odswiezSciezki();                                    // pathtracing musi zobaczyć nową geometrię
  /* Obrót mebla zmienia kierunek „na wprost”, więc kamera musi się przestawić. */
  const obrocono = stan.ostatniObrot !== stan.obrot || stan.ostatniAktywny !== stan.aktywny;
  stan.ostatniObrot = stan.obrot;
  stan.ostatniAktywny = stan.aktywny;
  dopasujKamere(obrocono ? frontMebla() : undefined, obrocono);
  /* Jeden wadliwy odświeżacz panelu nie może zabijać całej przebudowy sceny. */
  for(const f of odswiezacze){
    try{ f(); }catch(e){ console.error('odświeżanie panelu:', e); }
  }
  odswiezNakladke();
  zapiszLokalnie();
  if(zapisujHistorie) zapisz();
}

/* Wejście w moduł — dwuklik jak w Figmie. Ustawia ścieżkę, przełącza edycję na ten moduł
   i przygasza resztę sceny; Esc wychodzi o jeden poziom. */
export function wejdzWModul(id){
  const m = stan.meble.find(x => x.id === id);
  if(!m) return;
  stan.kadrCaly = false;
  stan.wejscie = sciezkaDo(id);
  stan.zaznaczone = [id];
  przelaczMebel(stan.meble.indexOf(m));
}

/* Korzeń listy: zaznacza wszystkie moduły naraz i kadruje całą zabudowę. Odpowiednik
   kliknięcia w ramkę w Figmie — wychodzisz z każdej grupy i widzisz całość. */
export function zaznaczCalyMebel(){
  zapiszAktywny();
  stan.wejscie = [];
  stan.zaznaczone = stan.meble.map(m => m.id);
  stan.kadrCaly = true;
  przebuduj(false);
  ustawUjecie(frontMebla(), true);
  stan.kadrCaly = false;                               // kadr jest jednorazowy, nie trybem
}

export function wyjdzZModulu(){
  if(!stan.wejscie.length) return false;
  stan.wejscie = stan.wejscie.slice(0, -1);
  const id = stan.wejscie.at(-1);
  if(id) przelaczMebel(stan.meble.findIndex(m => m.id === id)); else przebuduj(false);
  return true;
}

export function przelaczMebel(i){
  zapiszAktywny();
  stan.aktywny = Math.max(0, Math.min(i, stan.meble.length - 1));
  wczytajDo(stan.meble[stan.aktywny]);
  zamknijKarte();
  czyscZaznaczenie();
  przebuduj();                                         // sama przebudowa celuje w nowy mebel łagodnym przelotem
}

/* Nowy moduł pyta, gdzie ma stanąć — jak wstawianie komponentu w Figmie, gdzie od razu
   widać, do czego przylegnie. Bez odpowiedzi nic nie powstaje. */
export function duplikujMebel(kotwica = null){
  zapiszAktywny();
  const zrodlo = stan.meble[stan.aktywny];
  const kopia = structuredClone(zrodlo);
  kopia.id = nowyId();                                 // kopia to nowy moduł, nie ten sam
  kopia.nazwa = (zrodlo.nazwa || nazwaModulu(zrodlo)) + ' copy';
  kopia.kotwica = kotwica;
  kopia.pozycjaMm = null;
  stan.meble.splice(stan.aktywny + 1, 0, kopia);
  przelaczMebel(stan.aktywny + 1);
}

/* Przycisk w panelu pyta, gdzie postawić kopię; `duplikujMebel()` zostaje wywołaniem wprost,
   żeby kontrole i skróty nie musiały klikać w okno. */
export function duplikujZPytaniem(){
  zapiszAktywny();
  pytajOUmiejscowienie(stan.meble[stan.aktywny], kotwica => duplikujMebel(kotwica));
}

function pytajOUmiejscowienie(zrodlo, gotowe){
  zamknijKarte();
  const cele = mozliweKotwice(zrodlo.id).filter(m => m.id !== zrodlo.id);
  const karta = document.createElement('div');
  karta.className = 'karta';
  karta.innerHTML = `<button class="karta-zamknij" data-akcja="anuluj"><i data-lucide="x"></i></button>
    <h3>Where does it go?</h3>
    <p>A module either stands on its own or attaches to another one — side, top or bottom.</p>
    <div class="pole"><div class="mini">Attach to</div>
      <select class="lista-wyboru" data-rola="rodzic">
        <option value="">Nothing — stands on its own</option>
        ${cele.map(m => `<option value="${m.id}"${m.id === zrodlo.id ? ' selected' : ''}>${nazwaModulu(m)}</option>`).join('')}
      </select></div>
    <div class="pole" data-rola="strony"><div class="mini">Side</div>
      <div class="grupa">${Object.entries(STRONY).filter(([id]) => id !== 'wnetrze')
        .map(([id, s2], i) => `<button data-strona="${id}"${i ? '' : ' class="aktywny"'}>${s2.nazwa}</button>`).join('')}</div></div>
    <button class="cta" data-akcja="dodaj">Add module</button>`;
  el('scena').append(karta);
  window.lucide?.createIcons();
  const sc = el('scena').getBoundingClientRect();
  karta.style.left = Math.max(8, (sc.width - karta.offsetWidth) / 2) + 'px';
  karta.style.top = Math.max(8, (sc.height - karta.offsetHeight) / 2) + 'px';
  const rodzic = karta.querySelector('[data-rola="rodzic"]');
  const strony = karta.querySelector('[data-rola="strony"]');
  let strona = 'prawo';
  const odswiez = () => { strony.hidden = !rodzic.value; };
  rodzic.addEventListener('change', odswiez);
  odswiez();
  karta.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;
    if(b.dataset.strona){
      strona = b.dataset.strona;
      strony.querySelectorAll('button').forEach(x => x.classList.toggle('aktywny', x === b));
      return;
    }
    if(b.dataset.akcja === 'anuluj') return zakonczEdycje();
    if(b.dataset.akcja === 'dodaj'){
      const wybrany = rodzic.value;
      zakonczEdycje();
      gotowe(wybrany ? {do: wybrany, strona} : null);
    }
  });
}

export function usunMebel(){
  if(stan.meble.length < 2) return;
  /* Skasowanie rodzica nie może zostawić sierot wiszących w powietrzu — dzieci przejmują
     jego kotwicę, tak jak w Figmie usunięcie grupy wypuszcza jej zawartość o poziom wyżej. */
  const znikajacy = stan.meble[stan.aktywny];
  for(const m of stan.meble) if(m.kotwica?.do === znikajacy.id) m.kotwica = znikajacy.kotwica ? {...znikajacy.kotwica} : null;
  stan.meble.splice(stan.aktywny, 1);
  stan.wejscie = stan.wejscie.filter(id => id !== znikajacy.id);
  stan.zaznaczone = stan.zaznaczone.filter(id => id !== znikajacy.id);
  przelaczMebel(Math.max(0, stan.aktywny - 1));
}

/* ---------- start ---------- */
/* ---------- start ---------- */
(async function start(){
  window.lucide?.createIcons();
  try{
    stworzScene();
  }catch(e){
    return pokazBlad('WebGL could not start in this browser, so the 3D view is unavailable. (' + e.message + ')');
  }
  try{
    /* Każdy mebel ma swój dokument bazowy — regał przy łóżku jest w kształcie L, a `carcass`
       to jedna bryła, więc jego skrzydła to dwa osobne dokumenty. */
    await Promise.all(Object.entries(ZRODLA).map(async ([id, z]) => {
      const odp = await fetch(HOST + z.plik, {cache: 'no-cache'});
      if(!odp.ok) throw Error(z.plik + ': HTTP ' + odp.status);
      stan.dokumenty[id] = await odp.json();
    }));
    stan.dokument = stan.dokumenty[stan.zrodlo];
  }catch(e){
    return pokazBlad('Could not load the parametric models from GitHub Pages (' + e.message + ').');
  }
  el('panel-asset').textContent = '';
  el('panel-nazwa').textContent = 'Furniture';
  el('panel-stan').textContent = 'parametric v2';
  await wczytajKatalogDrewna();
  FABRYCZNY = polaMebla();
  zbudujPanel();
  if(wczytajLokalnie()){
    przebuduj(false);
  }else{
    mebleFabryczne();
  }
  przebuduj();
  dopasujRozmiar();
  ustawUjecie(frontMebla());
  petla();
  /* Modele przedmiotów ważą kilka megabajtów — scena ma stanąć przed nimi, a nie po nich.
     Gdy dojdą, jedna przebudowa wymienia zastępcze bryłki na prawdziwe doniczki. */
  wczytajKatalogModeli(() => przebuduj(false));
  wlaczPrzeciaganie();
  wlaczHoverMebli();
  window.__szafa = {THREE, stan, kamera, sterowanie, mebel, renderer, przebuduj, eksportDokument, przesunPrzegrode,
                    ustawUjecie, naOsiCzolowej, sprawdzParametryczny, UKLAD, ukladyDlaKomorki,
                    dociagnijDoIkea,
                    zgodnaWysokosc, zgodnaGlebokosc, zgodnaKolumna};
  el('plik-json').addEventListener('change', async e => {
    const plik = e.target.files[0];
    if(!plik) return;
    try{
      const ile = wczytajJSON(await plik.text());
      pokazBlad(`Wczytano ${ile} ${ile === 1 ? 'mebel' : 'meble'} z pliku ${plik.name}.`);
    }catch(err){
      pokazBlad('Nie udało się wczytać pliku: ' + err.message);
    }
    setTimeout(() => { bladEl.hidden = true; }, 5000);
    e.target.value = '';
  });
  addEventListener('resize', dopasujRozmiar);
  addEventListener('keydown', e => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); skok(e.shiftKey ? 1 : -1); }
    /* Esc jak w Figmie: najpierw zamyka kartę, potem wychodzi o poziom z modułu. */
    if(e.key === 'Escape'){
      if(document.querySelector('.karta')) zakonczEdycje();
      else if(!wyjdzZModulu()) zakonczEdycje();
    }
  });
  wlaczZaznaczanie();

  document.querySelector('.szyna').addEventListener('click', e => {
    const akcja = e.target.closest('button')?.dataset.akcja;
    if(akcja === 'widok-3d'){ zamknijKarte(); ustawUjecie(frontMebla().applyAxisAngle(new THREE.Vector3(0, 1, 0), .42).setY(.17)); }
    if(akcja === 'dopasuj') ustawUjecie(frontMebla());                 // natychmiastowy powrót na oś
    if(akcja === 'sciezki') return przelaczTrybSciezek(e.target.closest('button'));
    if(akcja === 'wymiary'){
      stan.wymiary = !stan.wymiary;
      document.querySelector('.ikona[data-akcja="wymiary"]').classList.toggle('aktywny', stan.wymiary);
      odswiezNakladke();
    }
    if(akcja === 'ikea') dociagnijDoIkea();
    if(akcja === 'reset') potwierdzReset(e.target.closest('button'));
    if(akcja === 'eksport') pobierzJSON();
    if(akcja === 'import') el('plik-json').click();
  });
  if(TRYB_TESTU) (await import('./selftest.js')).selftest();
})();
