/* P26 — miękkie bryły tkanin (materac, poduchy).
   Model mebla zostaje nietknięty: renderer podmienia wyłącznie geometrię siatek
   z materiałem tkaniny (material.userData.surface === 'fabric'), w ich układzie lokalnym.
   Obsługiwane bryły to graniastosłupy wypukłe:
   · pudełko (BoxGeometry / RoundedBoxGeometry) — materac,
   · graniastosłup trójkątny z 6 wierzchołków — klin poduchy (oryginał nie ma UV,
     dlatego tkanina była płaskim kolorem).

   Kształt = F(punkt nominalnej powierzchni):
   1. zaokrąglenie: rzut na bryłę pomniejszoną o r + r·normalna (suma Minkowskiego),
   2. wypchanie wolnych ścian (1-u²)(1-v²); ściany stykające się z inną częścią mebla zostają płaskie,
   3. lamówka na krawędziach, zagniecenia przy narożnikach, szum wypchania,
   4. wgniecenia materaca pod poduchami i dociśnięcie spodu poduch.
   Normalne z różnic skończonych F. Brzegi sąsiednich ścian próbkowane identycznie,
   a wszystkie przemieszczenia poza lamówką znikają na krawędziach, więc nie ma szczelin.
   Kolor wierzchołków = okluzja przy styku i we wgnieceniach. Wszystko deterministyczne. */

const R = {materac: 2.6, poducha: 2.2};            // promień zaokrąglenia [cm]
const WYPCHANIE = {materac: .6, poducha: 1.8};     // szczyt wolnej ściany [cm]
const LAMOWKA = .32, ZAGNIECENIE = .3, SZUM = .22, WGNIECENIE = .8, KROK = 2.2;

const skrot = s => { let h = 2166136261; for(const c of String(s)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function losowe(ziarno){ let a = ziarno || 1; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return ((a >>> 0) % 100000) / 100000; }; }
function szum3(ziarno){
  const h = (x, y, z) => { const v = Math.sin(x*127.1 + y*311.7 + z*74.7 + ziarno*.137) * 43758.5453; return v - Math.floor(v); };
  const g = t => t*t*(3 - 2*t), l = (a, b, t) => a + (b - a)*t;
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = g(x-xi), fy = g(y-yi), fz = g(z-zi);
    return l(l(l(h(xi,yi,zi), h(xi+1,yi,zi), fx), l(h(xi,yi+1,zi), h(xi+1,yi+1,zi), fx), fy),
             l(l(h(xi,yi,zi+1), h(xi+1,yi,zi+1), fx), l(h(xi,yi+1,zi+1), h(xi+1,yi+1,zi+1), fx), fy), fz)*2 - 1;
  };
}
const gesciej = t => t + .6*((.5 - .5*Math.cos(Math.PI*t)) - t);   // gęściej przy krawędziach

/* Rozpoznanie bryły: oś wytłoczenia, przekrój 2D (CCW), zakres wzdłuż osi. */
function rozpoznaj(g){
  const P = g.parameters;
  if(P && (g.type === 'RoundedBoxGeometry' || g.type === 'BoxGeometry')){
    const wym = [P.width, P.height, P.depth];
    const os = wym[0] >= wym[2] ? 0 : 2, [i, j] = os === 0 ? [2, 1] : [0, 1];
    const hi = wym[i]/2, hj = wym[j]/2;
    return {os, i, j, amin: -wym[os]/2, amax: wym[os]/2, przekroj: [[-hi,-hj],[hi,-hj],[hi,hj],[-hi,hj]], rodzaj: 'materac'};
  }
  const poz = g.attributes.position, unik = [];
  for(let k = 0; k < poz.count; k++){
    const v = [poz.getX(k), poz.getY(k), poz.getZ(k)];
    if(!unik.some(u => Math.hypot(u[0]-v[0], u[1]-v[1], u[2]-v[2]) < 1e-3)) unik.push(v);
    if(unik.length > 6) return null;
  }
  if(unik.length !== 6) return null;
  for(const os of [0, 1, 2]){
    const [i, j] = [0, 1, 2].filter(k => k !== os);
    const lo = Math.min(...unik.map(u => u[os])), hi = Math.max(...unik.map(u => u[os]));
    const koniec = unik.filter(u => Math.abs(u[os] - lo) < 1e-3);
    if(koniec.length !== 3 || !koniec.every(u => unik.some(w => Math.abs(w[os]-hi) < 1e-3
       && Math.abs(w[i]-u[i]) < 1e-3 && Math.abs(w[j]-u[j]) < 1e-3))) continue;
    let tri = koniec.map(u => [u[i], u[j]]);
    if((tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1]) - (tri[2][0]-tri[0][0])*(tri[1][1]-tri[0][1]) < 0) tri = [tri[0], tri[2], tri[1]];
    return {os, i, j, amin: lo, amax: hi, przekroj: tri, rodzaj: 'poducha'};
  }
  return null;
}

/* Wielokąt wypukły CCW pomniejszony o r i najbliższy punkt na nim. */
function pomniejsz(wiel, r){
  const n = wiel.length, linie = wiel.map((a, k) => {
    const b = wiel[(k+1)%n], dx = b[0]-a[0], dy = b[1]-a[1], d = Math.hypot(dx, dy);
    return {px: a[0] - dy/d*r, py: a[1] + dx/d*r, dx, dy};
  });
  return linie.map((L1, k) => {
    const L0 = linie[(k+n-1)%n], det = L0.dx*L1.dy - L0.dy*L1.dx;
    const t = ((L1.px-L0.px)*L1.dy - (L1.py-L0.py)*L1.dx) / det;
    return [L0.px + L0.dx*t, L0.py + L0.dy*t];
  });
}
function najblizszy2D(wiel, q){
  const n = wiel.length; let wewn = true, best = null, bd = Infinity;
  for(let k = 0; k < n; k++){
    const a = wiel[k], b = wiel[(k+1)%n], ex = b[0]-a[0], ey = b[1]-a[1];
    if(ex*(q[1]-a[1]) - ey*(q[0]-a[0]) < 0) wewn = false;
    const t = Math.max(0, Math.min(1, ((q[0]-a[0])*ex + (q[1]-a[1])*ey) / (ex*ex + ey*ey)));
    const c = [a[0] + ex*t, a[1] + ey*t], d = (q[0]-c[0])**2 + (q[1]-c[1])**2;
    if(d < bd){ bd = d; best = c; }
  }
  return wewn ? q : best;
}

export function zmiekczTkaniny(korzen, THREE){
  const miekkie = [], pudla = [];
  korzen.updateWorldMatrix(true, true);
  korzen.traverse(o => {
    if(!o.isMesh || !o.geometry) return;
    for(let p = o; p; p = p.parent) if(!p.visible) return;
    const box = new THREE.Box3().setFromObject(o);
    pudla.push({o, box});
    if(!o.userData.miekkie && o.material?.userData?.surface === 'fabric'){
      const b = rozpoznaj(o.geometry);
      if(b) miekkie.push({o, b, box});
    }
  });
  const poduchy = miekkie.filter(m => m.b.rodzaj === 'poducha');
  for(const m of miekkie) m.nowa = zbuduj(m, pudla, poduchy, THREE);
  for(const m of miekkie){
    m.o.geometry.dispose();
    m.o.geometry = m.nowa;
    m.o.userData.miekkie = true;
    m.o.material.vertexColors = true;
    m.o.material.needsUpdate = true;
  }
  return miekkie.length;
}

function zbuduj({o, b}, pudla, poduchy, THREE){
  const {os, i, j, amin, amax, przekroj, rodzaj} = b;
  const r = R[rodzaj], n = przekroj.length;
  const los = losowe(skrot(o.name + o.position.x.toFixed(1) + o.position.z.toFixed(1)));
  const szum = szum3(skrot(o.name) % 997);
  /* Ostry wierzchołek (klin 24°) po zaokrągleniu cofa się o r/sin(θ/2) − r. Przesuwamy go
     na zewnątrz dwusiecznej o tę wartość tylko w wielokącie pomniejszanym, więc zaokrąglony
     czubek wypada dokładnie w nominalnym wymiarze. */
  const doPomniejszenia = przekroj.map((p, k) => {
    const a = przekroj[(k+n-1)%n], b = przekroj[(k+1)%n];
    const ux = a[0]-p[0], uy = a[1]-p[1], wx = b[0]-p[0], wy = b[1]-p[1];
    const lu = Math.hypot(ux, uy), lw = Math.hypot(wx, wy);
    const kat = Math.acos(Math.max(-1, Math.min(1, (ux*wx + uy*wy)/(lu*lw))));
    if(kat > THREE.MathUtils.degToRad(85)) return p;
    const bx = ux/lu + wx/lw, by = uy/lu + wy/lw, bl = Math.hypot(bx, by);
    const delta = r/Math.sin(kat/2) - r;
    return [p[0] - bx/bl*delta, p[1] - by/bl*delta];
  });
  const male = pomniejsz(doPomniejszenia, r), amid = (amin + amax)/2;
  const mat = o.matrixWorld, odwr = mat.clone().invert();
  const v3 = (a, q) => { const v = [0,0,0]; v[os] = a; v[i] = q[0]; v[j] = q[1]; return v; };
  const doSwiata = v => new THREE.Vector3(...v).applyMatrix4(mat);
  const srodek = przekroj.reduce((s, p) => [s[0] + p[0]/n, s[1] + p[1]/n], [0, 0]);
  const krawedz = k => { const A = przekroj[k], B = przekroj[(k+1)%n]; return {A, B, dl: Math.hypot(B[0]-A[0], B[1]-A[1])}; };

  /* Ściany 0..n-1 boczne (krawędź przekroju × oś), n i n+1 denka. Styk: środek ściany
     przesunięty 1,2 cm na zewnątrz leży w pudełku innej części tego mebla. */
  const sciany = [];
  for(let k = 0; k < n + 2; k++){
    let c, nn;
    if(k < n){
      const {A, B, dl} = krawedz(k);
      c = v3(amid, [(A[0]+B[0])/2, (A[1]+B[1])/2]); nn = v3(0, [(B[1]-A[1])/dl, -(B[0]-A[0])/dl]);
    }else{ c = v3(k === n ? amin : amax, srodek); nn = v3(k === n ? -1 : 1, [0, 0]); }
    /* Punkt 1,2 cm na zewnątrz w pudełku sąsiada, a 1,2 cm do wewnątrz już nie — sąsiad dotyka ściany,
       zamiast obejmować całą bryłę. Środek ściany leży NA granicy pudełka, więc nie nadaje się do testu. */
    const naZewnatrz = doSwiata(c.map((x, q) => x + nn[q]*1.2)), doSrodka = doSwiata(c.map((x, q) => x - nn[q]*1.2));
    const styk = pudla.some(p => p.o !== o && p.box.clone().expandByScalar(.3).containsPoint(naZewnatrz) && !p.box.containsPoint(doSrodka));
    sciany.push({styk, nn, faza: [0, 1, 2, 3].map(() => los()*6.28)});
  }

  /* Ślady poduch na wierzchu materaca, w układzie lokalnym materaca. */
  const slady = rodzaj === 'materac' ? poduchy.map(p => p.box.clone().applyMatrix4(odwr)) : [];
  const maska = (x, z) => {
    let m = 0;
    for(const s of slady){
      const dx = Math.max(s.min.x - x, 0, x - s.max.x), dz = Math.max(s.min.z - z, 0, z - s.max.z);
      m = Math.max(m, Math.exp(-(dx*dx + dz*dz)/18));
    }
    return m;
  };

  function F(sc, u, v){
    // boczne: u wzdłuż osi, v wzdłuż krawędzi; denka: u = pierścień (0 brzeg → 1 środek), v = obwód
    let a, q, bump, pu = 0, pv = 0, pol = [1, 1];
    if(sc < n){
      const {A, B, dl} = krawedz(sc);
      a = amin + (amax - amin)*u; q = [A[0] + (B[0]-A[0])*v, A[1] + (B[1]-A[1])*v];
      pu = 2*u - 1; pv = 2*v - 1; bump = Math.max(0, (1 - pu*pu)*(1 - pv*pv)); pol = [(amax-amin)/2, dl/2];
    }else{
      a = sc === n ? amin : amax;
      const t = v*n, kk = Math.min(n-1, Math.floor(t)), f = t - kk, {A, B} = krawedz(kk);
      const brzeg = [A[0] + (B[0]-A[0])*f, A[1] + (B[1]-A[1])*f];
      q = [srodek[0] + (brzeg[0]-srodek[0])*(1-u), srodek[1] + (brzeg[1]-srodek[1])*(1-u)];
      bump = 1 - (1-u)*(1-u);
    }
    const p = v3(a, q), c = v3(Math.max(amin + r, Math.min(amax - r, a)), najblizszy2D(male, q));
    let nx = p[0]-c[0], ny = p[1]-c[1], nz = p[2]-c[2];
    const dlug = Math.hypot(nx, ny, nz) || 1; nx /= dlug; ny /= dlug; nz /= dlug;
    const sciana = sciany[sc];
    let d = 0;
    if(!sciana.styk){
      d += (rodzaj === 'materac' ? WYPCHANIE.materac : WYPCHANIE.poducha*(sc < n ? 1 : .55)) * bump;
      d += SZUM * szum(p[0]/18, p[1]/18, p[2]/18) * bump;
      if(sc < n){   // zagniecenia promieniście od narożników, zanikają na krawędziach
        let z = 0;
        for(const [k, su, sv] of [[0,-1,-1],[1,1,-1],[2,1,1],[3,-1,1]]){
          const du = (1 - su*pu)*pol[0] + .01, dv = (1 - sv*pv)*pol[1] + .01, odl = Math.hypot(du, dv);
          z += Math.exp(-odl/9) * Math.sin(Math.atan2(dv, du)*9 + sciana.faza[k]);
        }
        d += ZAGNIECENIE * z * Math.sqrt(bump);
      }
    }else if(rodzaj === 'poducha' && ny < -.9){
      d += WGNIECENIE * bump;          // spód poduchy w wgniecenie materaca
    }
    if(dlug > r*1.002){                // lamówka w strefie zaokrąglenia, szczyt w pół drogi między ścianami
      const dots = sciany.map(s => nx*s.nn[0] + ny*s.nn[1] + nz*s.nn[2]).sort((x, y) => y - x);
      d += LAMOWKA * Math.exp(-(((dots[0] - dots[1])/.22)**2));
    }
    const px = c[0] + nx*(r + d), pz = c[2] + nz*(r + d);
    let py = c[1] + ny*(r + d);
    let ao = sciana.styk ? .84 : 1 - .1*(1 - bump);
    if(slady.length && ny > .3){ const mk = maska(px, pz); py -= WGNIECENIE * mk * ny; ao *= 1 - .22*mk; }
    return [px, py, pz, nx, ny, nz, ao];
  }

  const poz = [], nor = [], uv = [], kol = [], ind = [];
  const obwod = []; { let s = 0; for(let k = 0; k < n; k++){ obwod.push(s); s += krawedz(k).dl; } }
  const przesU = los()*.5, przesV = los()*.5, eps = 1e-3;
  const segmenty = dl => Math.max(6, Math.round(dl/KROK));
  function siatka(sc, us, vs){
    const start = poz.length/3;
    for(const u of us) for(const v of vs){
      const f = F(sc, u, v);
      const a1 = F(sc, Math.min(1, u+eps), v), a0 = F(sc, Math.max(0, u-eps), v);
      const b1 = F(sc, u, Math.min(1, v+eps)), b0 = F(sc, u, Math.max(0, v-eps));
      const tu = [a1[0]-a0[0], a1[1]-a0[1], a1[2]-a0[2]], tv = [b1[0]-b0[0], b1[1]-b0[1], b1[2]-b0[2]];
      let cx = tu[1]*tv[2]-tu[2]*tv[1], cy = tu[2]*tv[0]-tu[0]*tv[2], cz = tu[0]*tv[1]-tu[1]*tv[0];
      let cl = Math.hypot(cx, cy, cz);
      if(cl < 1e-9){ cx = f[3]; cy = f[4]; cz = f[5]; cl = 1; }
      if(cx*f[3] + cy*f[4] + cz*f[5] < 0){ cx = -cx; cy = -cy; cz = -cz; }
      poz.push(f[0], f[1], f[2]); nor.push(cx/cl, cy/cl, cz/cl); kol.push(f[6], f[6], f[6]);
      if(sc < n) uv.push(przesU + (amin + (amax-amin)*u)/200, przesV + (obwod[sc] + v*krawedz(sc).dl)/160);
      else {
        const t = v*n, kk = Math.min(n-1, Math.floor(t)), ff = t - kk, {A, B} = krawedz(kk);
        uv.push(przesU + (srodek[0] + (A[0]+(B[0]-A[0])*ff - srodek[0])*(1-u))/200,
                przesV + (srodek[1] + (A[1]+(B[1]-A[1])*ff - srodek[1])*(1-u))/160);
      }
    }
    const NV = vs.length;
    for(let a = 0; a < us.length - 1; a++) for(let bI = 0; bI < NV - 1; bI++){
      const i0 = start + a*NV + bI, i1 = i0 + NV;
      ind.push(i0, i1, i0+1, i1, i1+1, i0+1);
    }
  }
  const zakres = N => Array.from({length: N + 1}, (_, k) => gesciej(k/N));
  const osU = zakres(segmenty(amax - amin));
  for(let k = 0; k < n; k++) siatka(k, osU, zakres(segmenty(krawedz(k).dl)));
  /* Brzeg denka próbkowany dokładnie jak końce ścian bocznych — bez szczelin. */
  const obwodV = [];
  for(let k = 0; k < n; k++){ const N = segmenty(krawedz(k).dl); for(let s = 0; s < N; s++) obwodV.push((k + gesciej(s/N))/n); }
  obwodV.push(1);
  siatka(n, zakres(10), obwodV); siatka(n+1, zakres(10), obwodV);

  /* Kolejność wierzchołków zgodna z normalną — ściany widoczne z zewnątrz. */
  for(let t = 0; t < ind.length; t += 3){
    const a = ind[t], bI = ind[t+1], c = ind[t+2];
    const ex = poz[bI*3]-poz[a*3], ey = poz[bI*3+1]-poz[a*3+1], ez = poz[bI*3+2]-poz[a*3+2];
    const fx = poz[c*3]-poz[a*3], fy = poz[c*3+1]-poz[a*3+1], fz = poz[c*3+2]-poz[a*3+2];
    const nx = nor[a*3]+nor[bI*3]+nor[c*3], ny = nor[a*3+1]+nor[bI*3+1]+nor[c*3+1], nz = nor[a*3+2]+nor[bI*3+2]+nor[c*3+2];
    if((ey*fz-ez*fy)*nx + (ez*fx-ex*fz)*ny + (ex*fy-ey*fx)*nz < 0){ ind[t+1] = c; ind[t+2] = bI; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3));
  g.setIndex(ind);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.miekkaBryla = {rodzaj, r, styki: sciany.map(s => s.styk)};
  return g;
}
