/* Kontrole 13–28: wiele mebli, obroty, wnęki, tekstury, pathtracing, siatka Custom,
   przedmioty na półkach, wydajność i mebel fabryczny. */
import * as THREE from 'three';

import {stan, KOLORY, el, suma, cm, stworzWzorzec, przywrocZeWzorca, policzOdstepstwa,
        wczytajDo, ustawPole, mieszanePole} from './dane.js';
import {wnetrzeWys} from './model.js';
import {granicaWneki, czesciWnek} from './wneki.js';
import {eksportDokument} from './eksport.js';
import {ustawUjecie, grupyMebli, katalogDrewna, renderer, frontMebla, zbierzDekor, kamera,
        sterowanie} from './scena.js';
import {katalogModeli, modeleRoli} from './modele.js';
import {mebelWPunkcie, obrysMebla} from './wybor.js';
import {parsujTory, naturalnaSuma} from './siatka.js';
import {przebuduj, duplikujMebel, usunMebel, przelaczMebel, wczytajJSON,
        resetDoFabrycznych, resetDoLadmakare, resetDoKuchni, wejdzWModul, wyjdzZModulu, zaznaczCalyMebel} from './szafa.js';

export async function kontroleMebli(dodaj){
  const eksport = () => JSON.stringify(eksportDokument());
  const przedMebli = stan.meble.length;
  duplikujMebel();
  stan.wysokoscMm = 1200;
  stan.kolor = 3;
  przebuduj(false);
  const dwa = stan.meble.length === przedMebli + 1;
  const rozne = stan.meble[0].wysokoscMm !== stan.meble[1].wysokoscMm;
  przelaczMebel(0);
  const wrocil = stan.wysokoscMm === stan.meble[0].wysokoscMm;
  usunMebel();
  dodaj(13, 'pieces duplicate, differ and switch independently',
    dwa && rozne && wrocil && stan.meble.length === przedMebli,
    `${przedMebli} → ${przedMebli + 1} pieces, heights ${Math.round(stan.meble[0].wysokoscMm)} vs ${rozne ? 1200 : '?'}, switch restores ${wrocil}`);

  /* Eksport → import musi odtworzyć układ co do komórki, razem z wnękami i liczbą mebli. */
  stan.wneki = [{r1: 1, r2: 2, c1: 1, c2: 2, tresc: 'biurko', wysun: 50, kolor: 9, otwarte: true}];
  stan.uklady = {r3c1: 'door1'};
  duplikujMebel();
  stan.wysokoscMm = 1400;
  przebuduj(false);
  const plik = JSON.stringify(eksportDokument());
  const stanMebli = () => JSON.stringify([stan.meble.length, stan.aktywny, stan.meble.map(m =>
    [m.szerokoscMm, m.wysokoscMm, m.glebokoscMm, m.kolor, m.wneki.length, Object.keys(m.uklady).length])]);
  const przedImportem = stanMebli();
  stan.meble = [];
  stan.wneki = [];
  stan.uklady = {};
  stan.szerokoscMm = 800;
  przebuduj(false);
  let bladImportu = '';
  try{ wczytajJSON(plik); }catch(e){ bladImportu = e.message; }
  dodaj(14, 'export → import restores every piece, niche and layout',
    !bladImportu && stanMebli() === przedImportem,
    bladImportu || `${przedImportem} → ${stanMebli()}`);

  /* Obrót nie może wpychać mebli w siebie ani zostawiać pustego narożnika. */
  stan.wneki = [];
  stan.uklady = {};
  stan.szerokoscMm = 1600;
  przebuduj(false);
  duplikujMebel();
  stan.szerokoscMm = 1200;
  const raport = [];
  for(const obrot of [0, 90, 180, 270]){
    stan.obrot = obrot;
    przebuduj(false);
    const [a, b] = grupyMebli.map(g => new THREE.Box3().setFromObject(g));
    const naX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const naZ = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    const kolizja = naX > .002 && naZ > .002;
    const szczelina = Math.max(Math.max(a.min.x - b.max.x, b.min.x - a.max.x, 0),
                               Math.max(a.min.z - b.max.z, b.min.z - a.max.z, 0));
    raport.push({obrot, kolizja, szczelina: Math.round(szczelina * 1000)});
  }
  usunMebel();
  dodaj(15, 'rotated pieces touch by an edge without overlapping',
    raport.every(r => !r.kolizja && r.szczelina <= 1),
    raport.map(r => `${r.obrot}°: overlap=${r.kolizja}, gap=${r.szczelina}mm`).join(', '));

  /* Nisza nie może przeżyć zmniejszenia siatki i ciąć przegród poza swoim zakresem. */
  stan.wneki = [];
  stan.uklady = {};
  stan.szerokoscMm = 2400;
  stan.wysokoscMm = 2200;
  stan.gestosc = 40;
  stan.rzedyWlasne = null;
  stan.kolumnyWlasne = null;
  przebuduj(false);
  const siatkaPrzed = `${stan.kolumny.length}×${stan.rzedy.length}`;
  stan.wneki = [{r1: stan.rzedy.length - 1, r2: stan.rzedy.length, c1: stan.kolumny.length - 1,
                 c2: stan.kolumny.length, tresc: 'pusta', wysun: 0, kolor: null, otwarte: false}];
  przebuduj(false);
  stan.szerokoscMm = 800;                              // siatka się kurczy pod niszą
  stan.wysokoscMm = 900;
  przebuduj(false);
  const wZakresie = stan.wneki.every(w => w.r2 <= stan.rzedy.length && w.c2 <= stan.kolumny.length);
  const ciecia = stan.czesci.filter(c => /^pion-\d+-/.test(c.id)).length;
  dodaj(16, 'a niche never outlives the grid it was drawn on',
    wZakresie && (stan.wneki.length === 0 || ciecia > 0),
    `${siatkaPrzed} → ${stan.kolumny.length}×${stan.rzedy.length}, niches left ${stan.wneki.length}, cut dividers ${ciecia}`);
  stan.wneki = [];

  /* Projekt musi przeżyć zamknięcie karty — zapis i odczyt z pamięci przeglądarki. */
  stan.szerokoscMm = 1800;
  stan.kolor = 12;
  stan.wneki = [{r1: 1, r2: 2, c1: 1, c2: 2, tresc: 'polka', wysun: 100, kolor: 5, otwarte: false}];
  przebuduj(false);
  duplikujMebel();
  stan.wysokoscMm = 1300;
  stan.obrot = 270;
  przebuduj(false);
  localStorage.setItem('konfigurator-szafy-v1', JSON.stringify({wersja: 1, aktywny: stan.aktywny, meble: stan.meble}));
  const przedOdczytem = JSON.stringify([stan.meble.length, stan.aktywny,
    stan.meble.map(m => [m.szerokoscMm, m.wysokoscMm, m.kolor, m.obrot, m.wneki.length])]);
  stan.meble = [];
  stan.aktywny = 0;
  let udalo = false;
  try{
    const zapis = JSON.parse(localStorage.getItem('konfigurator-szafy-v1'));
    stan.meble = zapis.meble;
    stan.aktywny = zapis.aktywny;
    udalo = true;
  }catch(e){ udalo = false; }
  if(udalo) Object.assign(stan, structuredClone(stan.meble[stan.aktywny]));
  localStorage.removeItem('konfigurator-szafy-v1');
  przebuduj(false);
  const poOdczycie = JSON.stringify([stan.meble.length, stan.aktywny,
    stan.meble.map(m => [m.szerokoscMm, m.wysokoscMm, m.kolor, m.obrot, m.wneki.length])]);
  dodaj(17, 'the design survives a browser reload', udalo && przedOdczytem === poOdczycie,
    `${przedOdczytem} → ${poOdczycie}`);
  usunMebel();

  /* Każdy mebel trzyma swoje wykończenie — materiały powstają po pętli budowania,
     więc łatwo tu o wyciek ustawień aktywnego mebla na wszystkie pozostałe. */
  stan.wneki = [];
  stan.uklady = {};
  stan.wykonczenie = 'board';
  stan.kolor = 14;
  stan.drewno = null;
  przebuduj(false);
  duplikujMebel();
  stan.wykonczenie = 'veneer';
  przebuduj(false);
  /* Moduł osadzony bywa pusty, gdy jego komórka zniknęła po zmianie siatki — pomijam takie. */
  const opis = () => grupyMebli.map(g => {
    let m = null;
    g.traverse(o => { if(!m && o.isMesh) m = Array.isArray(o.material) ? o.material[0] : o.material; });
    return m ? `${m.map ? 'drewno' : 'kolor'}:${m.color.getHexString()}` : null;
  }).filter(Boolean).join(' | ');
  const przedZmiana = opis();
  przelaczMebel(0);
  const poZmianie = opis();
  dodaj(18, 'each piece keeps its own finish when focus changes',
    przedZmiana === poZmianie && /kolor/.test(poZmianie) && /drewno/.test(poZmianie),
    `${przedZmiana} → ${poZmianie}`);
  usunMebel();
  dodaj(19, 'ambientCG texture catalogue is wired in', Array.isArray(katalogDrewna.tekstury),
    `${katalogDrewna.tekstury.length} textures in tekstury/katalog.json`);

  /* Pathtracing ma nie kosztować nic, dopóki nikt go nie włączy. */
  const doczytane = performance.getEntriesByType('resource')
    .filter(r => /pathtracer|three-mesh-bvh|sciezki\.js/.test(r.name));
  dodaj(20, 'path tracing stays unloaded until the mode is switched on', doczytane.length === 0,
    `${doczytane.length} path-tracing resources fetched during a normal session`);

  /* Wnęka każdego mebla musi być liczona na JEGO siatce. Gdy kolejność w pętli budowania
     się rozjedzie, wyściółka wypada w poprzek rzędów sąsiada. */
  Object.assign(stan, {szerokoscMm: 2400, wysokoscMm: 2200, gestosc: 40, obrot: 0, nozkiMm: 0, pozycjaMm: null,
                       wykonczenie: 'board', kolumnyWlasne: null, rzedyWlasne: null, uklady: {}, wneki: []});
  przebuduj(false);
  duplikujMebel();
  Object.assign(stan, {wysokoscMm: 1600, szerokoscMm: 1600, gestosc: 80,
                       kolumnyWlasne: null, rzedyWlasne: null});
  przebuduj(false);
  const raportWnek = [];
  for(const i of [0, 1]){
    przelaczMebel(i);
    stan.wneki = [{r1: 1, r2: 1, c1: 1, c2: Math.min(2, stan.kolumny.length),
                   tresc: 'pusta', wysun: 0, kolor: 5, otwarte: false}];
    przebuduj(false);
    const g = granicaWneki(stan.wneki[0]);
    const pudlo = new THREE.Box3();
    grupyMebli[i].traverse(o => { if(o.isMesh && /wneka/.test(o.name)) pudlo.expandByObject(o); });
    const podstawa = grupyMebli[i].position.y;
    const dol = (pudlo.min.y - podstawa) * 1000, gora = (pudlo.max.y - podstawa) * 1000;
    raportWnek.push({i, ok: Math.abs(dol - g.y1) < 2 && Math.abs(gora - g.y2) < 2,
                     opis: `#${i}: ${Math.round(dol)}–${Math.round(gora)} vs cells ${Math.round(g.y1)}–${Math.round(g.y2)}`});
  }
  usunMebel();
  dodaj(21, 'each piece builds its niche on its own grid', raportWnek.every(r => r.ok),
    raportWnek.map(r => r.opis).join(' | '));

  /* Styl Custom: podziały wpisane ręcznie, składnia jak w CSS grid, tylko w centymetrach. */
  while(stan.meble.length > 1) usunMebel();
  Object.assign(stan, {styl: 'custom', szerokoscMm: 2400, wysokoscMm: 2200, nadstawka: false, pozycjaMm: null,
                       kolumnyWlasne: null, rzedyWlasne: null, uklady: {}, wneki: []});
  const proby = [];
  for(const [wpis, oczekiwane] of [['60+40', [600, 400]], ['60 cm + 40 cm', [600, 400]],
                                   ['1/3 2/3', [800, 1600]], ['40% 60%', [960, 1440]],
                                   ['repeat(4, 45)', [450, 450, 450, 450]], ['80 + 1fr', [800, 1600]]]){
    const {tory, blad} = parsujTory(wpis);
    stan.siatkaKol = wpis;
    /* Wpis z samych centymetrów wyznacza też szerokość mebla — „60+40" ma dać 60 i 40 cm. */
    stan.szerokoscMm = tory.every(t => t.typ === 'mm') ? naturalnaSuma(tory, stan.szerokoscMm) : 2400;
    przebuduj(false);
    proby.push({wpis, blad, ok: !blad && JSON.stringify(stan.kolumny.map(Math.round)) === JSON.stringify(oczekiwane),
                widac: stan.kolumny.map(v => Math.round(v / 10)).join('+')});
  }
  dodaj(22, 'custom style takes CSS-grid style divisions in centimetres', proby.every(p => p.ok),
    proby.map(p => `${p.wpis} → ${p.blad || p.widac + ' cm'}`).join(' | '));

  stan.siatkaRzed = '40 + 40 + 40';
  /* Wysokość dobieram tak jak panel: trzy otwory po 40 cm plus przegrody, wieńce i cokół. */
  stan.wysokoscMm += 1200 - (wnetrzeWys() - 2 * stan.plytaMm);
  przebuduj(false);
  const recznieOk = stan.rzedy.length === 3 && stan.rzedy.every(v => Math.abs(v - 400) < 2);
  const bezPolek = Object.values(stan.polkiWyliczone || {}).every(v => v === 0);
  dodaj(23, 'manual rows land exactly and add no shelves of their own', recznieOk && bezPolek,
    `${stan.rzedy.map(v => Math.round(v / 10)).join('+')} cm, shelves ${Object.values(stan.polkiWyliczone || {}).join('')}`);

  /* Mebel obrócony bokiem ma na ekranie kilkadziesiąt pikseli sylwetki — bez zapasu i bez
     znacznika nad bryłą trafienie w niego kursorem jest loterią. */
  while(stan.meble.length > 1) usunMebel();
  Object.assign(stan, {styl: 'grid', szerokoscMm: 2400, wysokoscMm: 2200, obrot: 0, pozycjaMm: null,
                       siatkaKol: '', siatkaRzed: '', kolumnyWlasne: null, rzedyWlasne: null});
  przebuduj(false);
  duplikujMebel();
  stan.obrot = 90;
  przebuduj(false);
  przelaczMebel(0);
  ustawUjecie(frontMebla());                           // przelot trwa 800 ms, a test jest natychmiastowy
  const obrys = obrysMebla(1);
  const sy = obrys ? (obrys.y1 + obrys.y2) / 2 : 0;
  const bezZapasu = obrys ? mebelWPunkcie(obrys.x2 + 8, sy, 0) : 0;
  const zZapasem = obrys ? mebelWPunkcie(obrys.x2 + 8, sy) : -1;
  const znaczniki = el('znaczniki').querySelectorAll('.znacznik');
  dodaj(24, 'a piece turned side-on stays easy to pick',
    znaczniki.length === 2 && zZapasem === 1 && bezZapasu !== 1,
    `${obrys ? Math.round(obrys.x2 - obrys.x1) : 0} px wide on screen, ${znaczniki.length} markers, `
    + `8 px past the edge: ${bezZapasu} without the allowance, ${zZapasem} with it`);
  usunMebel();

  /* stan.kolumny czytają panel, wymiary i przeciąganie przegród — po przebudowie musi to
     być siatka mebla edytowanego, choćby stał pierwszy w rzędzie. */
  while(stan.meble.length > 1) usunMebel();
  Object.assign(stan, {styl: 'grid', szerokoscMm: 2400, wysokoscMm: 2200, gestosc: 0, pozycjaMm: null,
                       kolumnyWlasne: null, rzedyWlasne: null, siatkaKol: '', siatkaRzed: ''});
  przebuduj(false);
  duplikujMebel();
  Object.assign(stan, {szerokoscMm: 1200, wysokoscMm: 1000, gestosc: 100});
  przebuduj(false);
  przelaczMebel(0);
  const mojeKolumny = suma(stan.kolumny), mojeRzedy = suma(stan.rzedy) + (stan.rzedy.length - 1) * stan.plytaMm;
  dodaj(25, 'after a rebuild the grid in state belongs to the piece being edited',
    Math.abs(mojeKolumny - stan.szerokoscMm) < 2 && mojeRzedy < stan.wysokoscMm,
    `${stan.kolumny.length} columns totalling ${Math.round(mojeKolumny)} mm for a ${stan.szerokoscMm} mm piece`);
  usunMebel();

  /* Rzeczy na półkach: suwak ma realnie zmieniać ich liczbę, duża doniczka ma stać na
     podłodze obok, a modele mają się doczytać w tle — dlatego czekam na katalog. */
  for(let i = 0; i < 100 && !katalogModeli.gotowe; i++) await new Promise(r => setTimeout(r, 100));
  while(stan.meble.length > 1) usunMebel();
  Object.assign(stan, {styl: 'grid', szerokoscMm: 2400, wysokoscMm: 2200, obrot: 0, uklady: {}, wneki: [], pozycjaMm: null,
                       kolumnyWlasne: null, rzedyWlasne: null, siatkaKol: '', siatkaRzed: ''});
  const ileRzeczy = n => { stan.dodatki = n; przebuduj(false); return zbierzDekor().length; };
  const pusto = ileRzeczy(0), malo = ileRzeczy(30), duzo = ileRzeczy(100);
  const doniczki = grupyMebli[0].parent.children.filter(c => c.userData.mebel === undefined).length;
  dodaj(26, 'the shelf-items slider changes how much stands on the shelves, big plant on the floor',
    pusto === 0 && malo > 0 && duzo > malo && doniczki === 1,
    `0% → ${pusto}, 30% → ${malo}, 100% → ${duzo} items · ${modeleRoli('polka').length} shelf models, `
    + `${doniczki} plant on the floor`);
  stan.dodatki = 55;

  /* Przedmioty nie mogą zjeść płynności — 60 klatek to dolna granica, mierzę na komplecie. */
  const gl = renderer.getContext(), bufor = new Uint8Array(4), scena3d = grupyMebli[0].parent.parent;
  const zmierz = n => {
    renderer.render(scena3d, kamera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bufor);
    const t0 = performance.now();
    for(let i = 0; i < n; i++) renderer.render(scena3d, kamera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bufor);
    return (performance.now() - t0) / n;
  };
  Object.assign(stan, {dodatki: 100, szerokoscMm: 4000});
  przebuduj(false);
  zmierz(5);
  const msKlatki = zmierz(30);
  dodaj(27, 'a full set of shelf items still renders well above 60 fps', msKlatki < 16.7,
    `${msKlatki.toFixed(1)} ms per frame (~${Math.round(1000 / msKlatki)} fps), `
    + `${renderer.info.render.triangles} triangles in ${renderer.info.render.calls} draw calls`);
  stan.dodatki = 55;

  /* Mebel fabryczny to regał przy łóżku z v0021/v0022: dwa skrzydła, prześwity dokładnie
     jak w v0020 i kobalt, który musi przeżyć zmianę koloru korpusu. */
  resetDoFabrycznych();
  const skrzydla = stan.meble.map(m => m.id);
  const osadzone = stan.meble.filter(m => m.kotwica?.strona === 'wnetrze').map(m => m.definicja);
  przelaczMebel(stan.meble.findIndex(m => m.id === 'skrzydlo-glowne'), true);
  const komorki = stan.komorki.map(k => `${Math.round(k.w)}×${Math.round(k.h)}`);
  const wymiaryOk = komorki.every(o => o === '564×564' || o === '564×582');
  stan.kolor = 12;                                     // Burgundy — korpus tak, fronty kobaltowe nie
  przebuduj(false);
  const barwy = stan.model.materials.definitions;
  const kobaltOk = barwy['cobalt-matte-front'].color.toLowerCase() === '#0047ab';
  const korpusOk = barwy['white-matte'].color.toLowerCase() === KOLORY[12][1].toLowerCase();
  /* Regał przy łóżku to pięć modułów: dwa korpusy, dwa biurka i koralowa nisza. */
  const drzewoOk = skrzydla.join() === 'szafki-dolne,skrzydlo-glowne,biurko-lewe,biurko-prawe,skrzydlo-krotkie,nisza-koralowa';
  const osadzoneOk = osadzone.join() === 'biurko-60,biurko-120,nisza-koral';
  dodaj(28, 'the bedside shelf loads as six modules and keeps its own cobalt',
    drzewoOk && osadzoneOk && wymiaryOk && kobaltOk && korpusOk,
    `${skrzydla.length} modules (${osadzone.length} embedded), cells ${[...new Set(komorki)].join(' / ')}, `
    + `cobalt ${barwy['cobalt-matte-front'].color}, carcass ${barwy['white-matte'].color}`);
  resetDoFabrycznych();
  /* ---------- moduły jak symbole ---------- */
  /* Kotwica ma stawiać moduł licem do lica sąsiada — zmiana strony przerzuca bryłę na drugą
     stronę rodzica, a nie przesuwa ją o przypadkową wartość. */
  resetDoFabrycznych();
  /* Szukam po identyfikatorze, bo reset buduje listę modułów od nowa i stare referencje wietrzeją. */
  const obrysModulu = id => {
    const g = grupyMebli[stan.meble.findIndex(m => m.id === id)];
    if(!g) return {x1: 0, x2: 0};
    const p = new THREE.Box3().setFromObject(g);
    return {x1: Math.round(p.min.x * 1000), x2: Math.round(p.max.x * 1000)};
  };
  const obrysKrotkiego = () => obrysModulu('skrzydlo-krotkie');
  const glowne = () => obrysModulu('szafki-dolne');
  przelaczMebel(stan.meble.findIndex(m => m.id === 'skrzydlo-krotkie'));
  const poLewej = obrysKrotkiego(), rodzicL = glowne();
  stan.kotwica = {do: 'szafki-dolne', strona: 'prawo'};
  przebuduj(false);
  const poPrawej = obrysKrotkiego(), rodzicP = glowne();
  const lewoOk = Math.abs(poLewej.x2 - rodzicL.x1) < 2;
  const prawoOk = Math.abs(poPrawej.x1 - rodzicP.x2) < 2;
  dodaj(29, 'an anchored module sits flush against the chosen side of its parent', lewoOk && prawoOk,
    `left: ${poLewej.x2} vs ${rodzicL.x1}, right: ${poPrawej.x1} vs ${rodzicP.x2}`);

  /* Wejście w moduł przygasza resztę i blokuje edycję — Esc wraca o poziom. */
  resetDoFabrycznych();
  const policzPrzygaszone = () => {
    let n = 0;
    for(const g of grupyMebli) g.traverse(o => { if(o.userData?.materialPelny) n++; });
    return n;
  };
  const przedWejsciem = policzPrzygaszone();
  wejdzWModul('skrzydlo-krotkie');
  const wSrodkuIle = policzPrzygaszone();
  const aktywnyKryjacy = id => {
    const g = grupyMebli[stan.meble.findIndex(m => m.id === id)];
    let ok = true;
    g?.traverse(o => {
      if(!o.isMesh || !o.material) return;
      const materialy = Array.isArray(o.material) ? o.material : [o.material];
      if(o.userData?.materialPelny || materialy.some(m => m.transparent || m.opacity < .999)) ok = false;
    });
    return ok;
  };
  const skrzydloKryjace = aktywnyKryjacy('skrzydlo-krotkie');
  const sciezka = [...stan.wejscie];
  wyjdzZModulu();
  wyjdzZModulu();
  wejdzWModul('nisza-koralowa');
  const niszaKryjaca = aktywnyKryjacy('nisza-koralowa');
  wyjdzZModulu();
  wyjdzZModulu();
  wejdzWModul('skrzydlo-krotkie');
  przelaczMebel(stan.meble.findIndex(m => m.id === 'skrzydlo-glowne'));
  const zmienionyKryjacy = aktywnyKryjacy('skrzydlo-glowne');
  const zmianaWyszla = stan.wejscie.length === 0 && policzPrzygaszone() === 0;
  dodaj(30, 'entering a module dims the rest and Esc walks back out',
    przedWejsciem === 0 && wSrodkuIle > 0 && skrzydloKryjace && niszaKryjaca
      && sciezka.length === 1 && zmienionyKryjacy && zmianaWyszla,
    `${przedWejsciem} dimmed outside, ${wSrodkuIle} inside, active opaque ${skrzydloKryjace}/${niszaKryjaca}, `
    + `switched opaque ${zmienionyKryjacy}, exited ${zmianaWyszla}`);

  /* Wzorzec i instancje: odstępstwo powstaje z różnicy wobec komponentu, nie z klikania. */
  resetDoFabrycznych();
  przelaczMebel(stan.meble.findIndex(m => m.id === 'biurko-lewe'));
  stworzWzorzec(stan.meble[stan.aktywny], 'Biurko');
  wczytajDo(stan.meble[stan.aktywny]);
  przebuduj(false);
  const czysta = policzOdstepstwa(stan.meble[stan.aktywny]).length;
  stan.kolor = 12;
  przebuduj(false);
  const odstepstwaPoZmianie = policzOdstepstwa(stan.meble[stan.aktywny]);
  przywrocZeWzorca(stan.meble[stan.aktywny]);
  wczytajDo(stan.meble[stan.aktywny]);
  przebuduj(false);
  dodaj(31, 'an instance override covers one field and resets back to the component',
    czysta === 0 && odstepstwaPoZmianie.join() === 'kolor' && policzOdstepstwa(stan.meble[stan.aktywny]).length === 0,
    `${czysta} at first, then [${odstepstwaPoZmianie.join(', ')}], ${policzOdstepstwa(stan.meble[stan.aktywny]).length} after reset`);

  /* Edycja zbiorcza: jedno pole ustawia wszystkie zaznaczone i tylko je. */
  resetDoFabrycznych();
  stan.zaznaczone = ['skrzydlo-glowne', 'skrzydlo-krotkie'];
  przelaczMebel(stan.meble.findIndex(m => m.id === 'skrzydlo-glowne'), true);
  const mieszaneNaStarcie = mieszanePole('glebokoscMm');
  ustawPole('glebokoscMm', 500);
  przebuduj(false);
  const glebokosci = stan.meble.map(m => m.glebokoscMm);
  stan.zaznaczone = [];
  dodaj(32, 'editing with several modules selected changes all of them and nothing else',
    mieszaneNaStarcie && glebokosci[1] === 500 && glebokosci[4] === 500
      && glebokosci[0] !== 500 && glebokosci[2] !== 500,
    `mixed at start: ${mieszaneNaStarcie}, depths now ${glebokosci.join(' / ')} mm`);

  /* Korzeń listy („Furniture") zaznacza wszystko naraz, wychodzi z modułu i kadruje całość. */
  resetDoFabrycznych();
  wejdzWModul('nisza-koralowa');
  const wSrodkuSciezka = stan.wejscie.length;
  zaznaczCalyMebel();
  const kadrCalosci = kamera.position.distanceTo(sterowanie.target);
  const wszystkie = stan.zaznaczone.length;
  const puste = stan.wejscie.length;
  przelaczMebel(stan.meble.findIndex(m => m.id === 'biurko-lewe'));
  stan.zaznaczone = [];
  przebuduj(false);
  /* Przełączenie modułu kadruje łagodnym przelotem, więc odległość trzeba zmierzyć PO nim.
     Wcześniej każda przebudowa dociągała kamerę natychmiast i pomiar wychodził od ręki —
     teraz kamera stoi w miejscu, dopóki nie zmieni się mebel, więc trzeba poczekać. */
  await new Promise(r => setTimeout(r, 800));
  const kadrModulu = kamera.position.distanceTo(sterowanie.target);
  dodaj(33, 'the list root selects every module, leaves the one you were in and frames the whole set',
    wSrodkuSciezka === 2 && wszystkie === stan.meble.length && puste === 0 && kadrCalosci > kadrModulu,
    `path ${wSrodkuSciezka} → 0, ${wszystkie}/${stan.meble.length} selected, `
    + `camera ${kadrCalosci.toFixed(1)} m for the set vs ${kadrModulu.toFixed(1)} m for one module`);
  /* Moduł osadzony ma być edytowalny jak każdy inny: własny kolor i tekstura z palety,
     przeniesienie do innej komórki gospodarza i wysunięcie przed jego lico. */
  resetDoFabrycznych();
  wejdzWModul('nisza-koralowa');
  /* Fabrycznie nisza wisi na bryle; tutaj jawnie przełączamy ją na komórkę, bo ta kontrola
     sprawdza właśnie przenoszenie modułu między komórkami gospodarza. */
  stan.kotwica = {...stan.kotwica, wzgledem: 'komorka', komorka: 'r2c1'};
  przebuduj(false);
  const barwaNiszy = () => {
    const g = grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')];
    let h = null;
    g.traverse(o => { if(!h && o.isMesh) h = (Array.isArray(o.material) ? o.material[0] : o.material); });
    return h;
  };
  const barwaStart = barwaNiszy().color.getHexString();
  ustawPole('kolor', 11);
  przebuduj(false);
  const barwaPoZmianie = barwaNiszy().color.getHexString();
  const wzgledemRodzica = () => {
    const n = new THREE.Box3().setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')]);
    const r = new THREE.Box3().setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'skrzydlo-krotkie')]);
    return Math.round((n.min.x - r.min.x) * 1000);
  };
  const przedWysunieciem = wzgledemRodzica();
  ustawPole('wysunMm', 200);
  przebuduj(false);
  const poWysunieciu = wzgledemRodzica();
  const dolWKomorce = () => Math.round(new THREE.Box3()
    .setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')]).min.y * 1000);
  const przedKomorka = dolWKomorce();
  stan.kotwica = {...stan.kotwica, komorka: 'r1c1'};
  przebuduj(false);
  const poKomorce = dolWKomorce();
  dodaj(34, 'an embedded module takes colour from the palette, moves between cells and pushes out',
    barwaStart === 'edbacd' && barwaPoZmianie === KOLORY[11][1].slice(1)
      && poWysunieciu - przedWysunieciem === 200 && poKomorce < przedKomorka,
    `${barwaStart} → ${barwaPoZmianie}, pushed out by ${poWysunieciu - przedWysunieciem} mm, `
    + `bottom ${przedKomorka} → ${poKomorce} mm after moving down a row`);

  /* Dwie pułapki naraz: `[hidden]` przegrywało ze stylem autora, więc ukrywane wiersze panelu
     zostawały klikalne, a klik w „Top" wyprowadzał moduł osadzony poza komórkę gospodarza. */
  resetDoFabrycznych();
  wejdzWModul('nisza-koralowa');
  const ukryte = [...document.querySelectorAll('#wiersze .wiersz[hidden], #wiersze .sekcja[hidden]')];
  const naprawdeUkryte = ukryte.every(w => w.offsetParent === null);
  const gdzieByla = new THREE.Box3()
    .setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')]).min.clone();
  stan.kotwica = {...stan.kotwica, strona: 'gora'};
  przebuduj(false);
  const gdzieJest = new THREE.Box3()
    .setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')]).min;
  dodaj(35, 'hidden panel rows are really hidden and an embedded module cannot leave its cell',
    ukryte.length > 0 && naprawdeUkryte && gdzieByla.distanceTo(gdzieJest) < 0.002,
    `${ukryte.length} rows marked hidden, all invisible: ${naprawdeUkryte}, `
    + `moved ${Math.round(gdzieByla.distanceTo(gdzieJest) * 1000)} mm after forcing side to top`);

  /* „Równo do dołu drewnianej części": moduł osadzony równa się do krawędzi gospodarza,
     a nie do przypadkowej komórki. Dół bryły gospodarza to spód korpusu, nie spód nóżek. */
  resetDoFabrycznych();
  wejdzWModul('nisza-koralowa');
  const dolNiszy = () => Math.round(new THREE.Box3()
    .setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')]).min.y * 1000);
  stan.kotwica = {...stan.kotwica, wzgledem: 'bryla', pionowo: 'dol'};
  przebuduj(false);
  const przyDole = dolNiszy();
  stan.kotwica = {...stan.kotwica, pionowo: 'gora'};
  przebuduj(false);
  const przyGorze = dolNiszy();
  const gospodarz = stan.meble.find(m => m.id === 'skrzydlo-krotkie');
  dodaj(36, 'an embedded module aligns to the edge of the host body, not to a cell',
    przyDole === gospodarz.nozkiMm && przyGorze > przyDole,
    `bottom-aligned at ${przyDole} mm (host carcass starts at ${gospodarz.nozkiMm} mm), `
    + `top-aligned at ${przyGorze} mm`);
  resetDoFabrycznych();
  const niszaFabryczna = stan.meble.find(m => m.id === 'nisza-koralowa');
  wejdzWModul('nisza-koralowa');
  const brylaNiszy = new THREE.Box3()
    .setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'nisza-koralowa')]);
  const brylaGospodarza = new THREE.Box3()
    .setFromObject(grupyMebli[stan.meble.findIndex(m => m.id === 'skrzydlo-krotkie')]);
  /* Nisza 600×600×200 pokrywa pełną głębokość krótkiego skrzydła, ale jej 200 mm
     szerokości musi leżeć poza zewnętrzną ścianką, nie wewnątrz drewnianego korpusu. */
  const pelnaGlebokosc = Math.abs(brylaNiszy.min.x - brylaGospodarza.min.x) < 0.002
    && Math.abs(brylaNiszy.max.x - brylaGospodarza.max.x) < 0.002;
  const pozaScianka = Math.abs(brylaNiszy.min.z - brylaGospodarza.max.z) < 0.002;
  dodaj(48, 'the coral niche starts on the front face at the bottom of the wooden cabinet',
    niszaFabryczna.kotwica?.wzgledem === 'bryla' && niszaFabryczna.kotwica?.pionowo === 'dol'
      && niszaFabryczna.kotwica?.poziomo === 'lewo' && niszaFabryczna.kotwica?.przesunX === -200
      && Math.round(brylaNiszy.min.y * 1000) === gospodarz.nozkiMm && pelnaGlebokosc && pozaScianka,
    `reference ${niszaFabryczna.kotwica?.wzgledem || 'cell'}, vertical ${niszaFabryczna.kotwica?.pionowo || 'middle'}, `
    + `bottom ${Math.round(brylaNiszy.min.y * 1000)} mm, side gap ${Math.round((brylaNiszy.min.z - brylaGospodarza.max.z) * 1000)} mm, `
    + `depth ${Math.round((brylaNiszy.max.x - brylaNiszy.min.x) * 1000)} mm`);
  resetDoLadmakare();
  const pudloLadmakare = new THREE.Box3().setFromObject(grupyMebli[0]);
  const rozmiarLadmakare = pudloLadmakare.getSize(new THREE.Vector3()).multiplyScalar(1000);
  const przesuwne = stan.model.parametric.instances.filter(i => i.definition === 'drzwi-przesuwne');
  const definicjaPrzesuwnych = stan.model.parametric.definitions['drzwi-przesuwne'];
  dodaj(49, 'LÅDMAKARE keeps its real dimensions, open back, shelves and paired sliding doors',
    stan.meble.length === 1 && stan.meble[0].id === 'ladmakare' && !stan.plecy && stan.roslina === 'brak'
      && stan.kolumny.length === 2 && stan.rzedy.length === 4
      && Math.max(...stan.rzedy) - Math.min(...stan.rzedy) <= 1
      && przesuwne.length === 4 && definicjaPrzesuwnych.parts.length === 4
      && Math.abs(rozmiarLadmakare.x - 1594) < 2 && Math.abs(rozmiarLadmakare.y - 2124) < 2
      && Math.abs(rozmiarLadmakare.z - 350) < 35,
    `${Math.round(rozmiarLadmakare.x)}×${Math.round(rozmiarLadmakare.z)}×${Math.round(rozmiarLadmakare.y)} mm, `
    + `${przesuwne.length} cabinets, ${definicjaPrzesuwnych.parts.length / 2} door-and-pull pairs, back ${stan.plecy}`);
  resetDoFabrycznych();
  const usuwany = stan.meble[0].id, nastepny = structuredClone(stan.meble[1]);
  usunMebel();
  dodaj(50, 'Delete removes the active module instead of overwriting its successor',
    !stan.meble.some(m => m.id === usuwany) && stan.meble.some(m => m.id === nastepny.id)
      && stan.meble.find(m => m.id === nastepny.id)?.nazwa === nastepny.nazwa,
    `removed ${usuwany}: ${!stan.meble.some(m => m.id === usuwany)}, kept ${nastepny.id}: ${stan.meble.some(m => m.id === nastepny.id)}`);
  resetDoLadmakare();
  const polaCm = [...document.querySelectorAll('#wiersze input[type="number"]')];
  const poleSzer = polaCm[0];
  poleSzer.value = '159.3';
  poleSzer.dispatchEvent(new Event('change', {bubbles: true}));
  dodaj(51, 'dimension number fields accept tenths of a centimetre without slider rounding',
    stan.szerokoscMm === 1593 && polaCm.length === 3,
    `${polaCm.length} fields, width entered as 159.3 cm → ${stan.szerokoscMm} mm`);
  resetDoFabrycznych();
  przelaczMebel(1);
  dodaj(52, 'the navigator selection always follows the object being edited',
    stan.zaznaczone.length === 1 && stan.zaznaczone[0] === stan.meble[stan.aktywny].id
      && document.querySelector('.drzewo .modul[aria-current="true"]')?.getAttribute('aria-pressed') === 'true',
    `active ${stan.meble[stan.aktywny].id}, selected ${stan.zaznaczone.join(', ') || 'none'}`);
  resetDoKuchni();
  const frontKuchni = stan.meble.find(m => m.id === 'kuchnia-front');
  const bokKuchni = stan.meble.find(m => m.id === 'kuchnia-bok');
  const maPiekarnik = stan.model.parametric.instances.some(i => i.definition === 'piekarnik');
  const czesciPiekarnika = stan.model.parametric.definitions.piekarnik?.parts || [];
  const maCiemnyFrontPiekarnika = ['rama', 'szyba'].every(id =>
    czesciPiekarnika.some(cz => cz.id === id && cz.material === 'mirror-dark'));
  const niszaKuchenna = frontKuchni.wneki.find(w => w.tresc === 'kuchnia');
  const czesciGornychFrontow = czesciWnek().filter(cz => /^wneka\d+-front-gorny-/.test(cz.id));
  const gorneFronty = czesciGornychFrontow.length;
  const frontyCofniete = czesciGornychFrontow.every(cz => cz.positionMm[2] === frontKuchni.glebokoscMm / 2 - 129);
  dodaj(53, 'the kitchen has an L-shaped run, coral work niche, sink and built-in oven',
    stan.meble.length === 2 && frontKuchni.szerokoscMm === 3200 && frontKuchni.wysokoscMm === 2500
      && bokKuchni.obrot === 90 && bokKuchni.kotwica?.do === frontKuchni.id
      && !!niszaKuchenna && niszaKuchenna.r2 === 3 && niszaKuchenna.kolor === 9
      && gorneFronty === 4 && frontyCofniete && maPiekarnik && maCiemnyFrontPiekarnika,
    `${frontKuchni.szerokoscMm}×${frontKuchni.wysokoscMm} mm front, side ${bokKuchni.obrot}°, `
    + `coral niche ${!!niszaKuchenna}, upper fronts ${gorneFronty}, recessed ${frontyCofniete}, `
    + `oven ${maPiekarnik}, dark front ${maCiemnyFrontPiekarnika}`);
  resetDoFabrycznych();
}
