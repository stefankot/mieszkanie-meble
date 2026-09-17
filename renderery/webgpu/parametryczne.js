/* ============================================================
   MEBLE PARAMETRYCZNE — sekcja `parametric` schematu v2
   ------------------------------------------------------------
   Mebel = korpus o STAŁYM rozmiarze + siatka komórek (kolumny × rzędy) z rozkładem
   równym / Fibonacciego / losowym (ziarno) / własnym „60+40+20+40” + komponenty:
   jedna definicja (np. drzwiczki) powtarzana w wybranych komórkach (instances).
   Wymiary części definicji mogą odwoływać się do komórki: {"cell":"w","mul":1,"addMm":-4}.
   Wynik to zwykłe części i mechanizmy v1 — renderer buduje je tak jak każdy model.
   Jednostki: mm. Początek: środek obrysu na podłodze, +Z = front, +Y = góra.
   Moduł bez three.js (testy w Node, import także z edytora).
   ============================================================ */

const ROZKLADY = new Set(['equal', 'fibonacci', 'random', 'custom']);
const WZOR_WLASNY = /^\s*\d+(?:[.,]\d+)?(?:\s*\+\s*\d+(?:[.,]\d+)?)*\s*$/;
const ID = /^[A-Za-z0-9_.-]{1,60}$/;

export const parsujWlasny = tekst => {
  if(typeof tekst !== 'string' || !WZOR_WLASNY.test(tekst)) return null;
  const w = tekst.split('+').map(t => Number(t.trim().replace(',', '.')));
  return w.every(v => v > 0) ? w : null;
};

function losowy(ziarno){
  let a = ziarno >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wagi(n, {distribution = 'equal', custom = '', seed = 1}){
  switch(distribution){
    case 'fibonacci': {
      const f = [1, 1];
      while(f.length < n) f.push(f.at(-1) + f.at(-2));
      return f.slice(0, n).reverse();          // największa przegroda na dole / z lewej
    }
    case 'random': {
      const r = losowy(seed);
      return Array.from({length: n}, () => .6 + r() * .8);
    }
    case 'custom': {
      const w = parsujWlasny(custom);
      return w && w.length === n ? w : (w ? w.slice(0, n).concat(Array(Math.max(0, n - w.length)).fill(w.at(-1))) : Array(n).fill(1));
    }
    default: return Array(n).fill(1);
  }
}

/* Podział długości `wnetrze` na `n` przegród oddzielonych płytami `grubosc`. Zwraca początki i długości. */
export function rozloz(wnetrze, grubosc, n, opcje = {}){
  let w = wagi(Math.max(1, Math.round(n)), opcje);
  if(opcje.reverse) w = [...w].reverse();
  const dostepne = Math.max(0, wnetrze - (w.length - 1) * grubosc);
  const suma = w.reduce((a, b) => a + b, 0);
  const dlugosci = w.map(x => x / suma * dostepne);
  const poczatki = [];
  let p = 0;
  for(const d of dlugosci){ poczatki.push(p); p += d + grubosc; }
  return {dlugosci, poczatki};
}

const wymiar = (v, k) => typeof v === 'number' ? v
  : (v && typeof v === 'object' && ['w', 'h', 'd'].includes(v.cell)) ? k[v.cell] * (v.mul ?? 1) + (v.addMm ?? 0)
  : NaN;

const scal = (baza, nad) => ({...baza, ...(nad || {})});

export function sprawdzParametryczny(p){
  if(!p || typeof p !== 'object') throw Error('parametric: wymagany obiekt');
  const c = p.carcass;
  if(!c || !Array.isArray(c.sizeMm) || c.sizeMm.length !== 3 || !c.sizeMm.every(v => Number.isFinite(v) && v > 0))
    throw Error('parametric: carcass.sizeMm musi mieć 3 dodatnie wymiary');
  if(!(c.boardMm > 0 && c.boardMm < Math.min(...c.sizeMm) / 2)) throw Error('parametric: niepoprawne carcass.boardMm');
  if(typeof c.material !== 'string') throw Error('parametric: carcass.material wymagany');
  for(const os of ['rows', 'columns']){
    const o = p.layout?.[os];
    if(!o || !Number.isInteger(o.count) || o.count < 1 || o.count > 24) throw Error(`parametric: layout.${os}.count 1–24`);
    if(o.distribution && !ROZKLADY.has(o.distribution)) throw Error(`parametric: layout.${os}.distribution nieznany`);
  }
  const definicje = p.definitions || {};
  for(const [id, d] of Object.entries(definicje)){
    if(!ID.test(id) || !Array.isArray(d.parts) || !d.parts.length) throw Error(`parametric: definicja ${id} bez części`);
    for(const cz of d.parts) if(!ID.test(cz.id || '')) throw Error(`parametric: niepoprawne ID części w ${id}`);
    if(d.joint && !['hinge', 'slide'].includes(d.joint.type)) throw Error(`parametric: definicja ${id} ma nieznany mechanizm`);
  }
  for(const i of p.instances || []){
    if(!ID.test(i.id || '') || !definicje[i.definition]) throw Error(`parametric: instancja ${i.id} wskazuje brakującą definicję`);
  }
  return true;
}

/* Wybór komórek instancji: 'all' | {rows:[1..], columns:[1..]} | {count, order:'bottom-up'|'top-down'} (numeracja od 1). */
function wybierzKomorki(komorki, wybor, liczba){
  if(Number.isInteger(liczba)) wybor = {...(typeof wybor === 'object' ? wybor : {}), count: liczba};
  if(!wybor || wybor === 'all') return komorki;
  let lista = komorki;
  if(Array.isArray(wybor.rows)) lista = lista.filter(k => wybor.rows.includes(k.r));
  if(Array.isArray(wybor.columns)) lista = lista.filter(k => wybor.columns.includes(k.c));
  if(Number.isInteger(wybor.count)){
    const kolejnosc = [...lista].sort((a, b) => (wybor.order === 'top-down' ? b.r - a.r : a.r - b.r) || a.c - b.c);
    lista = kolejnosc.slice(0, Math.max(0, wybor.count));
  }
  return lista;
}

/* Rozwinięcie do części i mechanizmów. `nadpisania` (z edytora): {rows, columns, instances:{id:{count}}}. */
export function rozwinParametryczny(p, nadpisania = {}){
  sprawdzParametryczny(p);
  const c = p.carcass;
  const [W, H, D] = c.sizeMm;
  const t = c.boardMm, cokol = c.plinthMm ?? 0, plecy = c.backMm ?? 0;
  const rzedy = scal(p.layout.rows, nadpisania.rows);
  const kolumny = scal(p.layout.columns, nadpisania.columns);
  const wnetrzeW = W - 2 * t, wnetrzeH = H - cokol - 2 * t;
  const kol = rozloz(wnetrzeW, t, kolumny.count, kolumny);
  const rz = rozloz(wnetrzeH, t, rzedy.count, rzedy);
  const x0 = -W / 2 + t, y0 = cokol + t;
  const glebokoscPolki = D - plecy;
  const zPolki = plecy / 2;
  const box = (id, sizeMm, positionMm, material, label) => ({id, type: 'box', sizeMm, positionMm, rotationDeg: [0, 0, 0], material, label});

  const parts = [
    box('bok-l', [t, H - cokol, D], [-W / 2 + t / 2, cokol + (H - cokol) / 2, 0], c.material, 'Bok lewy'),
    box('bok-p', [t, H - cokol, D], [W / 2 - t / 2, cokol + (H - cokol) / 2, 0], c.material, 'Bok prawy'),
    box('dol', [W - 2 * t, t, D], [0, cokol + t / 2, 0], c.material, 'Wieniec dolny'),
    box('gora', [W - 2 * t, t, D], [0, H - t / 2, 0], c.material, 'Wieniec górny')
  ];
  if(cokol > 0) parts.push(box('cokol', [W, cokol, t], [0, cokol / 2, D / 2 - t / 2 - (c.plinthRecessMm ?? 30)], c.plinthMaterial || c.material, 'Cokół'));
  if(plecy > 0) parts.push(box('plecy', [W - 2 * t, wnetrzeH, plecy], [0, y0 + wnetrzeH / 2, -D / 2 + plecy / 2], c.backMaterial || c.material, 'Plecy'));
  kol.poczatki.slice(1).forEach((p0, i) => {
    parts.push(box(`pion-${i + 1}`, [t, wnetrzeH, glebokoscPolki], [x0 + p0 - t / 2, y0 + wnetrzeH / 2, zPolki], c.material, `Pion ${i + 1}`));
  });
  const komorki = [];
  kol.dlugosci.forEach((w, ci) => {
    rz.dlugosci.forEach((h, ri) => {
      komorki.push({r: ri + 1, c: ci + 1, w, h, d: glebokoscPolki, x: x0 + kol.poczatki[ci] + w / 2, y: y0 + rz.poczatki[ri] + h / 2});
      if(ri > 0) parts.push(box(`polka-k${ci + 1}-${ri}`, [w, t, glebokoscPolki], [x0 + kol.poczatki[ci] + w / 2, y0 + rz.poczatki[ri] - t / 2, zPolki], c.shelfMaterial || c.material, `Półka ${ci + 1}.${ri}`));
    });
  });

  const joints = [];
  for(const inst of p.instances || []){
    const def = p.definitions[inst.definition];
    const wybrane = wybierzKomorki(komorki, inst.cells ?? 'all', nadpisania.instances?.[inst.id]?.count);
    for(const k of wybrane){
      const gid = `${inst.id}-r${k.r}c${k.c}`;
      const nazwa = `${inst.label || def.label || inst.definition} ${k.r}.${k.c}`;
      parts.push({id: gid, type: 'group', positionMm: [k.x, k.y, D / 2], rotationDeg: [0, 0, 0], label: nazwa});
      for(const cz of def.parts){
        const wynik = {...cz, id: `${gid}-${cz.id}`, parent: gid};
        for(const pole of ['sizeMm', 'positionMm']) if(Array.isArray(cz[pole])) wynik[pole] = cz[pole].map(v => wymiar(v, k));
        for(const pole of ['radiusMm', 'radiusTopMm', 'radiusBottomMm', 'heightMm', 'depthMm']) if(cz[pole] !== undefined) wynik[pole] = wymiar(cz[pole], k);
        if([...(wynik.sizeMm || []), ...(wynik.positionMm || [])].some(v => !Number.isFinite(v)))
          throw Error(`parametric: część ${cz.id} definicji ${inst.definition} ma niepoprawny wymiar`);
        parts.push(wynik);
      }
      if(def.joint){
        const j = def.joint;
        const piwot = (j.pivotMm || [0, 0, 0]).map(v => wymiar(v, k));
        joints.push({part: gid, type: j.type, axis: j.axis,
          ...(j.type === 'hinge' ? {pivotMm: [k.x + piwot[0], k.y + piwot[1], D / 2 + piwot[2]], angleDeg: j.angleDeg ?? 100}
                                 : {travelMm: wymiar(j.travelMm ?? {cell: 'd', mul: .8}, k)}),
          label: nazwa});
      }
    }
  }
  return {parts, joints, komorki};
}
