/* Materiały i tekstury: paleta, proceduralny słój, zestawy z ambientCG, bryłki bazowe.
   Sama scena, światło i kamera są w scena.js. */
import * as THREE from 'three';
import {cm, ziarno} from './dane.js';

export const materialy = new Map();
let teksturaBazowa = null;

/* Tekstury CC0 z ambientCG leżą w `tekstury/`, a `katalog.json` mówi, co jest dostępne.
   Pobiera je `tekstury/pobierz.py`; bez katalogu zostaje generowany słój. */
export const katalogDrewna = {tekstury: []};
const zestawy = new Map();

export async function wczytajKatalogDrewna(){
  try{
    const odp = await fetch('tekstury/katalog.json', {cache: 'no-cache'});
    if(odp.ok) Object.assign(katalogDrewna, await odp.json());
  }catch(e){ /* brak katalogu — nie szkodzi */ }
  return katalogDrewna.tekstury.length;
}

function zestawDrewna(id){
  if(zestawy.has(id)) return zestawy.get(id);
  const wpis = katalogDrewna.tekstury.find(t => t.id === id);
  if(!wpis) return null;
  const loader = new THREE.TextureLoader();
  const zestaw = {gotowy: false};
  let czekam = 0;
  const skonczone = () => { if(--czekam === 0){ zestaw.gotowy = true; przebuduj(false); } };
  const zrob = (plik, srgb) => {
    if(!plik) return null;
    czekam++;
    const t = loader.load(`tekstury/${plik}`, skonczone, undefined, skonczone);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if(srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  Object.assign(zestaw, {kolor: zrob(wpis.pliki.kolor, true), chropowatosc: zrob(wpis.pliki.chropowatosc),
                         normalne: zrob(wpis.pliki.normalne), metalicznosc: zrob(wpis.pliki.metalicznosc)});
  zestawy.set(id, zestaw);
  return zestaw;
}

function dopasujMape(zrodlo, ustawienia){
  const t = zrodlo.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.center.set(.5, .5);
  t.rotation = ustawienia.rotation;
  t.repeat.copy(ustawienia.repeat);
  return t;
}

/* Procedurlny fornir dębowy na wzór Oak Veneer 01: spokojne, równoległe słoje
   o zmiennej szerokości, kilka ciemniejszych linii i drobny szum. Lustrzane
   zawijanie sprawia, że kafelkuje się bez szwu niezależnie od wielkości płyty. */
function plotnoDrewna(){
  const plt = document.createElement('canvas');
  plt.width = plt.height = 512;
  const x = plt.getContext('2d');
  const los = ziarno(20260919);
  x.fillStyle = '#cbad83';
  x.fillRect(0, 0, 512, 512);
  let p = 0;
  while(p < 512){                                      // pasma słoja
    const szer = 4 + los() * 26, j = .84 + los() * .26;
    x.fillStyle = `rgba(${Math.round(176 * j)},${Math.round(140 * j)},${Math.round(96 * j)},.5)`;
    x.fillRect(p, 0, szer, 512);
    p += szer;
  }
  for(let i = 0; i < 110; i++){                        // ciemniejsze linie, lekko falujące
    const xx = los() * 512;
    x.strokeStyle = `rgba(104,75,45,${.04 + los() * .12})`;
    x.lineWidth = .4 + los() * 1.6;
    x.beginPath();
    x.moveTo(xx, 0);
    for(let y = 0; y <= 512; y += 32) x.lineTo(xx + Math.sin(y / 85 + i) * (1.5 + los() * 4), y);
    x.stroke();
  }
  const dane = x.getImageData(0, 0, 512, 512);
  for(let i = 0; i < dane.data.length; i += 4){        // szum, żeby płyta nie była plastikiem
    const s = (los() - .5) * 18;
    dane.data[i] += s;
    dane.data[i + 1] += s;
    dane.data[i + 2] += s;
  }
  x.putImageData(dane, 0, 0);
  return plt;
}

function teksturaDrewna(){
  if(!teksturaBazowa){
    teksturaBazowa = new THREE.CanvasTexture(plotnoDrewna());
    teksturaBazowa.wrapS = teksturaBazowa.wrapT = THREE.MirroredRepeatWrapping;
    teksturaBazowa.colorSpace = THREE.SRGBColorSpace;
    teksturaBazowa.anisotropy = 4;
  }
  return teksturaBazowa;
}

/* Mapa dopasowana do płyty: słoje biegną wzdłuż dłuższego boku, a gęstość
   odpowiada realnym wymiarom — 60 cm na jeden powtórzony kafel. */
function mapaDlaCzesci(sizeMm){
  const [w, h] = sizeMm;
  const poziomo = w > h;
  const dluzszy = Math.max(w, h) / 600, krotszy = Math.max(.25, Math.min(w, h) / 600);
  const kwant = v => Math.max(.25, Math.round(v * 4) / 4);
  const rx = kwant(poziomo ? dluzszy : krotszy), ry = kwant(poziomo ? krotszy : dluzszy);
  const mapa = teksturaDrewna().clone();
  mapa.needsUpdate = true;
  mapa.center.set(.5, .5);
  mapa.rotation = poziomo ? Math.PI / 2 : 0;
  mapa.repeat.set(rx, ry);
  return {mapa, klucz: `${poziomo ? 'h' : 'v'}${rx}x${ry}`};
}
export const GEOMETRIA = new THREE.BoxGeometry(1, 1, 1);
export const WALEC = new THREE.CylinderGeometry(.5, .5, 1, 20);

export function material(klucz, opis){
  if(!materialy.has(klucz)) materialy.set(klucz, new THREE.MeshStandardMaterial({
    color: new THREE.Color(opis.color || '#cfcac4'), roughness: opis.roughness ?? .6,
    metalness: opis.metalness ?? 0, map: opis.mapa || null,
    roughnessMap: opis.chropowatosc || null, normalMap: opis.normalne || null,
    metalnessMap: opis.metalicznosc || null, envMapIntensity: opis.odbicia ?? .5
  }));
  return materialy.get(klucz);
}
/* Board to kolor solid; Plywood i Veneer gubią kolor i dostają drewno —
   ten sam rysunek, inny połysk. Wszystkie wykończenia mają teraz rozjaśniony
   połysk, który wcześniej miał tylko Veneer. */
export const materialCzesci = (id, def, sizeMm, wykonczenie, drewno) => {
  const d = def?.[id] || {};
  /* Materiał autorski (kobalt, koral, LED) nie dostaje ani palety, ani słoja — ma wyglądać
     dokładnie tak, jak go zaprojektowano w dokumencie mebla. */
  if(d.autorskie || wykonczenie === 'board' || !sizeMm) return material(`${id}|${d.color}|${d.roughness}`, d);
  const {mapa, klucz} = mapaDlaCzesci(sizeMm);
  const zestaw = drewno ? zestawDrewna(drewno) : null;
  if(zestaw?.gotowy){
    const barwaZ = id.startsWith('wneka-') ? (d.color || '#ffffff') : '#ffffff';
    /* Metal ma własną mapę metaliczności; bez niej złoto wychodziło matowe, bo materiał
       zostawał dielektrykiem. Chropowatość bierzemy wtedy z mapy, nie z wykończenia. */
    const metal = !!zestaw.metalicznosc;
    return material(`acg|${drewno}|${wykonczenie}|${klucz}|${barwaZ}`, {
      color: barwaZ, roughness: metal ? 1 : d.roughness, metalness: metal ? 1 : 0,
      mapa: dopasujMape(zestaw.kolor, mapa),
      chropowatosc: zestaw.chropowatosc && dopasujMape(zestaw.chropowatosc, mapa),
      normalne: zestaw.normalne && dopasujMape(zestaw.normalne, mapa),
      metalicznosc: metal && dopasujMape(zestaw.metalicznosc, mapa),
      odbicia: metal ? 2.4 : .45});
  }
  /* Korpus gubi kolor na rzecz słoja; wyściółka wnęki zostaje podbarwiona,
     inaczej wybór jej koloru przestałby cokolwiek robić na drewnie. */
  const barwa = id.startsWith('wneka-') ? (d.color || '#ffffff') : '#ffffff';
  return material(`drewno|${wykonczenie}|${klucz}|${barwa}`, {color: barwa, roughness: d.roughness, mapa});
};

export function cienKontaktowy(){
  const plt = document.createElement('canvas');
  plt.width = plt.height = 256;
  const ctx = plt.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
  grad.addColorStop(0, 'rgba(52,46,40,.46)');
  grad.addColorStop(.5, 'rgba(52,46,40,.17)');
  grad.addColorStop(1, 'rgba(52,46,40,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(plt), transparent: true, depthWrite: false}));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = .0015;
  mesh.renderOrder = -1;
  return mesh;
}

