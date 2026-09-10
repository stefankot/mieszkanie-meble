export const STATUS_MODELU = Object.freeze({
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  REJECTED: 'rejected'
});

const identyfikator = v => typeof v === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(v);
const liczba = (v, min = -30000, max = 30000) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const wektor = (v, n = 3, min = -30000, max = 30000) =>
  Array.isArray(v) && v.length === n && v.every(x => liczba(x, min, max));

export function odrzucDuplikatyId(model){
  const widziane = new Set();
  for(const part of model?.parts || []){
    if(!identyfikator(part?.id)) continue;
    if(widziane.has(part.id)) throw Error(`Powtórzony semantic part ID "${part.id}".`);
    widziane.add(part.id);
  }
  return widziane;
}

export function sprawdzRozszerzenia(dane, obslugiwane = new Set()){
  const extensions = dane?.extensions;
  if(extensions === undefined) return [];
  if(!extensions || typeof extensions !== 'object' || Array.isArray(extensions))
    throw Error('extensions musi być słownikiem.');
  const pominiete = [];
  for(const [id, spec] of Object.entries(extensions)){
    if(!/^[a-zA-Z0-9_.:-]{1,120}$/.test(id) || !spec || typeof spec !== 'object' || Array.isArray(spec))
      throw Error(`Niepoprawne rozszerzenie "${id}".`);
    if(obslugiwane.has(id)) continue;
    if(spec.required === true) throw Error(`Wymagane nieobsługiwane rozszerzenie "${id}".`);
    pominiete.push(`opcjonalne rozszerzenie "${id}"`);
  }
  return pominiete;
}

function poprawneUmiejscowienie(p){
  return !!p && p.confirmed === true && wektor(p.positionMm)
    && liczba(p.rotationDeg ?? 0, -360, 360);
}

/* Manifest jest rejestrem zatwierdzenia. Umiejscowienie wersji/modelu może go
   zastąpić wyłącznie wtedy, gdy samo jest jawnie zatwierdzone. Dzięki temu
   legacy bed z historycznym placement.confirmed=false dziedziczy zatwierdzone
   położenie manifestu, a niezatwierdzony nowy wariant nie wchodzi do sceny. */
export function wybierzPotwierdzoneUmiejscowienie(manifest, wersja, dane){
  for(const p of [dane?.placement, wersja?.placement, manifest?.placement]){
    if(poprawneUmiejscowienie(p)) return structuredClone(p);
  }
  throw Error('Brak potwierdzonego ustawienia (placement.confirmed=true).');
}

export function utworzBramkePokolen(){
  const wartosci = new Map();
  return {
    rozpocznij(id){ const n = (wartosci.get(id) || 0) + 1; wartosci.set(id, n); return n; },
    aktualne(id, n){ return wartosci.get(id) === n; },
    uniewaznij(id){ const n = (wartosci.get(id) || 0) + 1; wartosci.set(id, n); return n; }
  };
}

export function singleFlight(fn){
  let aktywne = null;
  return function(...args){
    if(aktywne) return aktywne;
    aktywne = Promise.resolve().then(() => fn.apply(this, args));
    aktywne = aktywne.finally(() => { aktywne = null; });
    return aktywne;
  };
}

export function statusPoZbudowaniu(pominiete = []){
  return pominiete.length ? STATUS_MODELU.PARTIAL : STATUS_MODELU.COMPLETE;
}

export function odrzuconyStan(poprzedni = {}, dodatki = {}, blad){
  return {...poprzedni, ...dodatki, status: STATUS_MODELU.REJECTED,
    aktywnyStatus: poprzedni.aktywnyStatus ||
      ([STATUS_MODELU.COMPLETE, STATUS_MODELU.PARTIAL].includes(poprzedni.status) ? poprzedni.status : undefined),
    zachowanyPoprzedni: !!poprzedni.korzen, blad};
}
