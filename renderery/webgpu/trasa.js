/* ============================================================
   TRASA PRZEJŚCIA PO MIESZKANIU
   ------------------------------------------------------------
   Przelot po prostej przechodził przez ściany i meble. Tu liczymy drogę
   na siatce tej samej funkcji kolizji, której używa chodzenie (plan: podłoga,
   ściany; pudełka mebli; promień gracza), więc trasa omija dokładnie to,
   czego gracz nie może przejść.

   1. A* na siatce 8-sąsiedztwa (bez ścinania narożników), heurystyka oktylna.
   2. Uproszczenie „po nitce”: zostają tylko punkty, bez których odcinek
      traciłby przejście (próbkowanie kolizji co kilka cm).
   Wygładzenie krzywą robi nawigacja (CatmullRom) — tu czyste dane, bez three.js.
   Jednostki: cm; punkty {x, z}.
   ============================================================ */

const SASIEDZI = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];

/* Odcinek przejezdny, jeśli żadna próbka nie koliduje. */
export function widac(a, b, zablokowane, krokProbki = 6){
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(d / krokProbki));
  for(let i = 1; i < n; i++){
    const t = i / n;
    if(zablokowane(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}

export function dlugoscTrasy(punkty){
  let suma = 0;
  for(let i = 1; i < punkty.length; i++) suma += Math.hypot(punkty[i].x - punkty[i-1].x, punkty[i].z - punkty[i-1].z);
  return suma;
}

/* Kopiec binarny po koszcie f. */
function kopiec(){
  const el = [];
  return {
    get size(){ return el.length; },
    push(k, f){
      el.push([f, k]);
      let i = el.length - 1;
      while(i > 0){ const r = (i - 1) >> 1; if(el[r][0] <= el[i][0]) break; [el[r], el[i]] = [el[i], el[r]]; i = r; }
    },
    pop(){
      const gora = el[0], koniec = el.pop();
      if(el.length){
        el[0] = koniec;
        let i = 0;
        for(;;){
          const l = 2*i + 1, p = l + 1;
          let m = i;
          if(l < el.length && el[l][0] < el[m][0]) m = l;
          if(p < el.length && el[p][0] < el[m][0]) m = p;
          if(m === i) break;
          [el[m], el[i]] = [el[i], el[m]]; i = m;
        }
      }
      return gora[1];
    }
  };
}

/* Zwraca [od, …punkty załamania, cel] albo null, gdy celu nie da się osiągnąć. */
export function znajdzTrase({od, cel, zablokowane, granice, krok = 15}){
  if(widac(od, cel, zablokowane)) return [od, cel];
  const kol = Math.ceil((granice.maxX - granice.minX) / krok) + 1;
  const wie = Math.ceil((granice.maxZ - granice.minZ) / krok) + 1;
  const stan = new Uint8Array(kol * wie);          // 0 nieznana, 1 wolna, 2 zajęta
  const wolna = (i, j) => {
    if(i < 0 || j < 0 || i >= kol || j >= wie) return false;
    const k = j * kol + i;
    if(!stan[k]) stan[k] = zablokowane(granice.minX + i * krok, granice.minZ + j * krok) ? 2 : 1;
    return stan[k] === 1;
  };
  const punkt = k => ({x: granice.minX + (k % kol) * krok, z: granice.minZ + Math.floor(k / kol) * krok});
  // Najbliższa wolna komórka, z której widać zadany punkt (start i koniec zwykle nie leżą na węzłach).
  const zaczep = p => {
    const i0 = Math.round((p.x - granice.minX) / krok), j0 = Math.round((p.z - granice.minZ) / krok);
    for(let r = 0; r <= 4; r++)
      for(let dj = -r; dj <= r; dj++)
        for(let di = -r; di <= r; di++){
          if(Math.max(Math.abs(di), Math.abs(dj)) !== r || !wolna(i0 + di, j0 + dj)) continue;
          const k = (j0 + dj) * kol + i0 + di;
          if(widac(p, punkt(k), zablokowane)) return k;
        }
    return -1;
  };
  const start = zaczep(od), meta = zaczep(cel);
  if(start < 0 || meta < 0) return null;

  const g = new Float64Array(kol * wie).fill(Infinity);
  const skad = new Int32Array(kol * wie).fill(-1);
  const zamknieta = new Uint8Array(kol * wie);
  const mi = meta % kol, mj = Math.floor(meta / kol);
  const h = k => { const dx = Math.abs(k % kol - mi), dz = Math.abs(Math.floor(k / kol) - mj); return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz); };
  const otwarte = kopiec();
  g[start] = 0; otwarte.push(start, h(start));
  let znaleziona = false;
  while(otwarte.size){
    const k = otwarte.pop();
    if(zamknieta[k]) continue;
    if(k === meta){ znaleziona = true; break; }
    zamknieta[k] = 1;
    const i = k % kol, j = Math.floor(k / kol);
    for(const [di, dj, koszt] of SASIEDZI){
      const ni = i + di, nj = j + dj;
      if(!wolna(ni, nj)) continue;
      if(di && dj && (!wolna(i + di, j) || !wolna(i, j + dj))) continue;   // bez ścinania narożników
      const nk = nj * kol + ni;
      const ng = g[k] + koszt;
      if(ng < g[nk]){ g[nk] = ng; skad[nk] = k; otwarte.push(nk, ng + h(nk)); }
    }
  }
  if(!znaleziona) return null;

  const komorki = [];
  for(let k = meta; k >= 0; k = skad[k]) komorki.push(punkt(k));
  komorki.reverse();
  const pelna = [od, ...komorki, cel];
  // Uproszczenie: od bieżącego punktu skaczemy do najdalszego widocznego.
  const wynik = [pelna[0]];
  let i = 0;
  while(i < pelna.length - 1){
    let j = pelna.length - 1;
    while(j > i + 1 && !widac(pelna[i], pelna[j], zablokowane)) j--;
    wynik.push(pelna[j]);
    i = j;
  }
  return wynik;
}
