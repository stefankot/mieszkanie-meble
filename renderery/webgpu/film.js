/* ============================================================
   PROFIL FILMOWY
   ------------------------------------------------------------
   Brief: podczas spaceru ma być filmowo — 25 kl./s wystarczy, bez migotania, z rozmyciem ruchu,
   głębią ostrości, gradacją i ziarnem. Efekty działają na gotowej kompozycji (`dof` materializuje
   ją do tekstury), więc nie psują światła pośredniego ani odbić.

   - Rozmycie ruchu: własny węzeł TSL — próbki wzdłuż wektora prędkości z bufora MRT silnika
     (three r185 nie ma jeszcze MotionBlurNode).
   - Głębia ostrości: `dof` z addonów, ogniskowa liczona z bufora głębi; jednostki sceny to cm.
   - Ziarno: `film` z addonów.
   - Tempo: ograniczenie liczby klatek (domyślnie 25) zamiast rysowania tak szybko, jak się da.
   ============================================================ */
import { Fn, Loop, float, perspectiveDepthToViewZ, rtt, screenUV, uniform, vec4 } from 'three/tsl';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { film as ziarnoFilmowe } from 'three/addons/tsl/display/FilmNode.js';

const PROBKI = 6;
const rozmycieWzdluzRuchu = Fn(([obraz, predkosc, sila]) => {
  const przesuniecie = predkosc.xy.mul(sila);
  const suma = vec4(obraz.sample(screenUV)).toVar();
  Loop(PROBKI, ({i}) => {
    const t = float(i).add(1).div(PROBKI);
    suma.addAssign(obraz.sample(screenUV.sub(przesuniecie.mul(t))));
  });
  return suma.div(PROBKI + 1);
});

export function utworzProfilFilmowy({camera, przyZmianie}){
  const u = {
    rozmycie: uniform(0.35),        // skala wektora prędkości
    ostroscCm: uniform(320),        // odległość płaszczyzny ostrości
    glebiaCm: uniform(220),         // jak daleko od niej obraz jeszcze jest ostry
    bokeh: uniform(1.6),
    ziarnoSila: uniform(0.09)
  };
  const stan = {wlaczony: false, fps: 25, rozmycieRuchu: true, glebiaOstrosci: true, ziarno: true, autoOstrosc: true};

  function nalozNa(kompozyt, {predkosc, glebia}){
    if(!stan.wlaczony) return kompozyt;
    let obraz = kompozyt;
    if(stan.rozmycieRuchu) obraz = rozmycieWzdluzRuchu(rtt(obraz), predkosc, u.rozmycie);
    if(stan.glebiaOstrosci){
      const viewZ = perspectiveDepthToViewZ(glebia.r, camera.near, camera.far);
      obraz = dof(obraz, viewZ, u.ostroscCm, u.glebiaCm, u.bokeh);
    }
    if(stan.ziarno) obraz = ziarnoFilmowe(obraz, u.ziarnoSila);
    return obraz;
  }

  /* Zmiana samych suwaków nie przebudowuje grafu; przełączniki i włączenie profilu — tak. */
  function ustaw(zmiana = {}){
    const strukturalne = ['wlaczony', 'rozmycieRuchu', 'glebiaOstrosci', 'ziarno'];
    const przebuduj = strukturalne.some(k => k in zmiana && zmiana[k] !== stan[k]);
    for(const [k, v] of Object.entries(zmiana)){
      if(k in stan) stan[k] = v;
      else if(k in u) u[k].value = v;
    }
    przyZmianie?.(przebuduj);
    return {...stan, ...Object.fromEntries(Object.entries(u).map(([k, w]) => [k, w.value]))};
  }
  const odczyt = () => ({...stan, ...Object.fromEntries(Object.entries(u).map(([k, w]) => [k, w.value]))});
  /* Ograniczenie tempa. Proste „rysuj, gdy minął cały odstęp” gubiło klatki: przy rytmie ekranu 60 Hz
     i progu 40 ms rysowanie wypadało dopiero co trzecią klatkę (16,7 kl./s zamiast 25). Dlatego próg ma
     10% zapasu, a znacznik czasu idzie akumulatorem — tempo nie dryfuje i wychodzi równe 25 kl./s. */
  let ostatnia = 0;
  function pomin(teraz){
    if(!stan.wlaczony || !stan.fps) return false;
    const interwal = 1000 / stan.fps;
    if(teraz - ostatnia < interwal * .9) return true;
    ostatnia = Math.max(teraz - interwal * .5, ostatnia + interwal);
    return false;
  }
  return {nalozNa, ustaw, odczyt, pomin, uniformy: u};
}
