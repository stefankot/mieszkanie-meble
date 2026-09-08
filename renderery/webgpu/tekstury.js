/* ============================================================
   TEKSTURY PROCEDURALNE I FABRYKI MATERIAŁÓW
   ------------------------------------------------------------
   Kod nie jest tu duplikowany. Generatory tekstur i fabryki materiałów są
   wycinane z zatwierdzonego źródła WebGL (renderery/zrodla/2026-09-08-v1.html)
   i sprawdzane sumą SHA-256 przed wykonaniem — tym samym mechanizmem, którym
   ten projekt ładuje moduł łóżka.

   Dzięki temu obie wersje silnika korzystają dosłownie z tego samego kodu
   tekstur, a repozytorium nie trzyma dwóch kopii, które mogłyby się rozjechać.

   To czysty Canvas 2D, niezależny od backendu. Jedyna część nieaktywna
   w WebGPU to wstrzykiwanie warstw wykończenia przez onBeforeCompile —
   NodeMaterial go nie zna, więc te wywołania są bezczynne. Warstwy wracają
   jako graf TSL w kolejnej iteracji silnika.
   ============================================================ */

const ZRODLO = 'https://raw.githubusercontent.com/stefankot/mieszkanie-meble/main/renderery/zrodla/2026-09-08-v1.html';
const OD = 'function referenceWood(size){';
const DO = 'var mattressMat = fabricMaterial(';
const SUMA = '23c8d52ce90b84fc275c698143363176992956f40ce1b7a1224338b885ef0cb3';

const API = ['boxGeo','board','boardMaterial','pegMaterial','fabricMaterial','setUV',
             'canvasTex','cloneTex','grayCanvas','fbmMaker','heightToNormal','rng',
             'drawSky','drawBoardHeight','drawFabricAlbedo','FABRIC_PROFILES',
             'attachSurfaceFinish','cloneMaterial'];

async function pobierzFabryke(){
  const odp = await fetch(ZRODLO);
  if(!odp.ok) throw Error('Nie można pobrać źródła tekstur: HTTP ' + odp.status);
  const html = await odp.text();
  const i = html.indexOf(OD), j = html.indexOf(DO);
  if(i < 0 || j < 0 || j <= i) throw Error('Nie znaleziono bloku tekstur w źródle.');
  const blok = html.slice(i, j);

  const suma = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(blok)))]
    .map(x => x.toString(16).padStart(2,'0')).join('');
  if(suma !== SUMA) throw Error('Blok tekstur nie zgadza się z zatwierdzoną wersją (' + suma.slice(0,12) + ').');

  /* Preambuła: to, czego wycinek potrzebuje, a co w źródle leży poza nim.
     MAXANISO — WebGPURenderer nie ma capabilities.getMaxAnisotropy().
     CHAMFER i boxGeo — w źródle stoją niżej, przy budowie mebla. */
  const preambula = `
const MAXANISO = 16;
const CHAMFER = .28;
function boxGeo(w,h,d,r,seg){
  r = (r===undefined) ? CHAMFER : r;
  var lim = Math.min(w,h,d)*0.49;
  r = Math.min(r, lim);
  if(r <= 0.005) return new THREE.BoxGeometry(w,h,d);
  return new THREE.RoundedBoxGeometry(w,h,d, seg||1, r);
}
`;
  const cialo = preambula + blok + '\nreturn {' + API.join(',') + '};';
  return new Function('THREE', cialo);
}

/* Pobranie odbywa się raz, na poziomie modułu (top-level await), dzięki czemu
   eksportowana funkcja jest synchroniczna i silnik nie musi jej awaitować. */
const fabryka = await pobierzFabryke();

export function utworzTekstury(THREE){
  const T = fabryka(THREE);
  // materiały egzemplarzowe tworzone tu, bo w oryginale leżą tuż za wycinkiem
  T.mattressMat = T.fabricMaterial('#c9c04f');
  T.cushionMat  = T.fabricMaterial('#d1c858');
  return T;
}
