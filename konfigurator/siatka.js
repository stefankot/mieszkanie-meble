/* Ręczny podział siatki — składnia jak w CSS grid, tylko w centymetrach zamiast pikseli.
   Rozumie: 60+40, 60cm 40cm, 400mm, 1fr 2fr, auto, 40% 60%, 1/3 2/3, repeat(3, 40).
   Rozdzielają plusy, przecinki, średniki i spacje; ułamek 1/3 zostaje jednym tokenem. */
export const PRZYKLAD = '60 + 40   ·   1/3 + 2/3   ·   40% 60%   ·   80 + 1fr';
export const MAX_TOROW = 24;

/* Jeden tor: {typ:'mm'} stała długość, {typ:'ul'} udział w całości, {typ:'fr'} podział reszty. */
function token(t){
  let m;
  if(t === 'auto' || t === 'fr' || t === '*') return {typ: 'fr', v: 1};
  const L = '(\\d+(?:[.,]\\d+)?)';
  const licz = s => +s.replace(',', '.');
  if(m = new RegExp(`^${L}fr$`).exec(t)) return {typ: 'fr', v: licz(m[1])};
  if(m = new RegExp(`^${L}\\*$`).exec(t)) return {typ: 'fr', v: licz(m[1])};
  if(m = new RegExp(`^${L}%$`).exec(t)) return {typ: 'ul', v: licz(m[1]) / 100};
  if(m = new RegExp(`^${L}/${L}$`).exec(t)) return licz(m[2]) ? {typ: 'ul', v: licz(m[1]) / licz(m[2])} : null;
  if(m = new RegExp(`^${L}mm$`).exec(t)) return {typ: 'mm', v: licz(m[1])};
  if(m = new RegExp(`^${L}(?:cm)?$`).exec(t)) return {typ: 'mm', v: licz(m[1]) * 10};
  return null;
}

export function parsujTory(tekst){
  let s = String(tekst || '').toLowerCase().trim();
  if(!s) return {tory: [], blad: null};
  /* repeat(3, 40) rozwijam przed podziałem na tokeny — dokładnie jak w CSS grid. */
  for(let i = 0; i < 4 && /repeat\s*\(/.test(s); i++)
    s = s.replace(/repeat\s*\(\s*(\d+)\s*,([^()]*)\)/g,
      (_, n, tresc) => Array(Math.min(+n, MAX_TOROW)).fill(tresc.trim()).join(' '));
  s = s.replace(/(\d)\s+(cm|mm|fr|%|\*)/g, '$1$2');       // „60 cm" to jeden tor, nie dwa
  const slowa = s.split(/[+,;\s]+/).filter(Boolean);
  const tory = [];
  for(const w of slowa){
    const t = token(w);
    if(!t || !(t.v > 0)) return {tory: [], blad: `can’t read “${w}” — use 60, 40cm, 1fr, 40% or 1/3`};
    tory.push(t);
  }
  if(tory.length > MAX_TOROW) return {tory: [], blad: `${tory.length} tracks — ${MAX_TOROW} is the most a piece takes`};
  return {tory, blad: null};
}

/* Długość, jakiej siatka chce dla siebie: stałe wprost, udziały od dostępnej przestrzeni.
   Tory elastyczne (fr) nie mają własnej długości — biorą to, co zostanie. */
export function naturalnaSuma(tory, dostepneMm){
  return tory.reduce((s, t) => s + (t.typ === 'mm' ? t.v : t.typ === 'ul' ? t.v * dostepneMm : 0), 0);
}
export const elastycznych = tory => tory.filter(t => t.typ === 'fr').length;

/* Rozkład wypełnia dostępną przestrzeń co do milimetra: stałe zostają, fr dzielą resztę,
   a gdy elastycznych nie ma i suma się nie zgadza — skaluję proporcjonalnie. */
export function rozlozTory(tory, dostepneMm, minMm){
  if(!tory.length) return [];
  const fr = tory.filter(t => t.typ === 'fr').reduce((s, t) => s + t.v, 0);
  const stale = naturalnaSuma(tory, dostepneMm);
  const reszta = dostepneMm - stale;
  let dl;
  if(fr > 0 && reszta > 0)
    dl = tory.map(t => t.typ === 'fr' ? reszta * t.v / fr : t.typ === 'ul' ? t.v * dostepneMm : t.v);
  else{                                              // brak reszty do podziału — proporcje
    const waga = tory.map(t => t.typ === 'fr' ? Math.max(1, dostepneMm / tory.length) * t.v
                                              : t.typ === 'ul' ? t.v * dostepneMm : t.v);
    const s = waga.reduce((a, b) => a + b, 0) || 1;
    dl = waga.map(v => v / s * dostepneMm);
  }
  dl = dl.map(v => Math.max(minMm, Math.round(v)));
  /* Zaokrąglenia muszą trafić dokładnie w wymiar — nadmiar oddaje największy tor. */
  const i = dl.indexOf(Math.max(...dl));
  dl[i] = Math.max(minMm, dl[i] + dostepneMm - dl.reduce((a, b) => a + b, 0));
  return dl;
}

/* Zapis listy milimetrów jako tekst siatki — po przeciągnięciu przegrody pole ma
   pokazywać to, co użytkownik właśnie ustawił myszą. */
export const zapisTorow = lista => lista
  .map(v => String(+(v / 10).toFixed(1)).replace(/\.0$/, '')).join(' + ');
