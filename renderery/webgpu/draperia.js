/* P28 — draperia zasłon: losowe fałdy na panel i stała długość tkaniny.
   Każdy panel ma własne ziarno: półfale o różnej szerokości (±25%) i głębokości (±35%),
   fałdy lekko wędrują w poziomie wzdłuż wysokości, rozkloszowują się ku dołowi, a pod
   szyną przechodzą w regularną taśmę marszczącą. Stan odsłonięty to cel morfingu
   (morphTargets): szerokość maleje, a amplituda każdej półfali rośnie tak, żeby długość
   łuku tkaniny została ta sama (ograniczona odstępem od ściany). Zero pracy CPU w animacji. */

function losowe(tekst){
  let h = 2166136261; for(const c of String(tekst)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const dlugoscLuku = (a, A) => {           // półfala sinusa o rozpiętości a i amplitudzie A
  let s = 0; const N = 16;
  for(let k = 0; k < N; k++){ const t = (k + .5)/N, d = Math.PI*A/a*Math.cos(Math.PI*t); s += Math.sqrt(1 + d*d); }
  return s * a / N;
};
function amplitudaDlaDlugosci(a, l, max){
  if(a >= l) return 0;
  let lo = 0, hi = max;
  if(dlugoscLuku(a, hi) < l) return hi;
  for(let k = 0; k < 24; k++){ const m = (lo + hi)/2; if(dlugoscLuku(a, m) < l) lo = m; else hi = m; }
  return (lo + hi)/2;
}

export function utworzDraperie(THREE, {szer, szerOtwarta, wys, glebMax, faldy, amplituda, ziarno, zwis = 1}){
  const los = losowe(ziarno), POL = faldy*2, maxA = Math.max(.5, glebMax/2);
  const w = Array.from({length: POL}, () => 1 + (los() - .5)*.5), sw = w.reduce((a, b) => a + b, 0);
  const fale = [];
  let start = 0;
  for(let k = 0; k < POL; k++){
    const f = w[k]/sw, Az = Math.min(maxA, amplituda*(.65 + .7*los()));
    const l = dlugoscLuku(f*szer, Az);
    fale.push({start, f, Az, Ao: amplitudaDlaDlugosci(f*szerOtwarta, l, maxA),
               znak: k % 2 ? -1 : 1, fazy: [los()*6.28, los()*6.28, los()*6.28]});
    start += f;
  }
  const SEG_X = POL*6, SEG_Y = 40;
  const glowa = fale.reduce((s, f) => s + f.Az, 0)/POL*.6;

  function punkt(u, v, otwarta){
    let k = fale.findIndex(f => u <= f.start + f.f + 1e-9); if(k < 0) k = POL - 1;
    const f = fale[k], s = Math.min(1, Math.max(0, (u - f.start)/f.f));
    const W = otwarta ? szerOtwarta : szer, A = otwarta ? f.Ao : f.Az;
    const falka = Math.sin(Math.PI*s);
    const szum = Math.sin(v*5.1 + f.fazy[0])*.6 + Math.sin(v*11.3 + f.fazy[1])*.4;
    const klosz = .82 + .3*(1 - v) + .1*szum;                // rozkloszowanie ku dołowi
    const naSzynie = Math.min(1, Math.max(0, (v - .93)/.07));
    const a = A*klosz*(1 - naSzynie) + glowa*naSzynie*(otwarta ? 1.6 : 1);
    const x = -W/2 + u*W + (1 - naSzynie)*1.2*falka*Math.sin(v*3.7 + f.fazy[2]);   // fałdy wędrują
    const z = f.znak*a*falka;
    let y = (v - .5)*wys - zwis*(1 - v)*(.25 + .75*falka*falka);
    y = Math.max(-wys/2, y);
    return [x, y, z];
  }
  function siatka(otwarta){
    const g = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y), p = g.attributes.position;
    for(let iy = 0; iy <= SEG_Y; iy++) for(let ix = 0; ix <= SEG_X; ix++){
      const idx = iy*(SEG_X + 1) + ix;
      p.setXYZ(idx, ...punkt(ix/SEG_X, 1 - iy/SEG_Y, otwarta));
    }
    g.computeVertexNormals();
    return g;
  }
  const g = siatka(false), o = siatka(true);
  g.morphAttributes.position = [o.attributes.position];
  g.morphAttributes.normal = [o.attributes.normal];
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.draperia = {ziarno, faleZamkniete: fale.map(f => +f.Az.toFixed(2)), faleOtwarte: fale.map(f => +f.Ao.toFixed(2))};
  return g;
}
