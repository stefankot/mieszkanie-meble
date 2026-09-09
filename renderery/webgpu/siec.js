/* ============================================================
   POBIERANIE Z LIMITEM CZASU I PONOWIENIEM
   ------------------------------------------------------------
   Wszystkie zasoby sceny idą z sieci: kod tekstur z GitHuba, skany PBR i HDRI
   z Poly Haven, manifesty mebli z repozytorium. Żadne z tych pobrań nie miało
   limitu czasu, a część siedzi w top-level await — więc jedno zawieszone
   połączenie zatrzymywało CAŁY graf modułów i strona stała pusta bez błędu.
   To jest przyczyna „połowę razy w ogóle się nie ładuje".

   Tutaj każde pobranie ma termin i ponowienia. Przekroczony termin kończy się
   wyjątkiem, a nie ciszą — wywołujący może wtedy sięgnąć po wariant zapasowy.
   ============================================================ */

export const TERMIN = 12000;    // ms na jedną próbę
export const PROBY = 2;         // ile razy ponowić po niepowodzeniu

/* Obietnica, która przegrywa wyścig z zegarem. Używane tam, gdzie loader
   z three.js nie przyjmuje AbortSignal (TextureLoader, RGBELoader):
   samo żądanie leci dalej w tle, ale my przestajemy na nie czekać. */
export function zTerminem(obietnica, ms = TERMIN, opis = 'zasób'){
  let zegar;
  const termin = new Promise((_, odrzuc) => {
    zegar = setTimeout(() => odrzuc(Error(`przekroczony czas ${ms} ms — ${opis}`)), ms);
  });
  return Promise.race([obietnica, termin]).finally(() => clearTimeout(zegar));
}

/* Ponowienie z narastającą przerwą. Ostatni błąd jest przekazywany dalej,
   żeby diagnostyka mówiła, co konkretnie nie doszło. */
export async function ponow(fn, {proby = PROBY, opis = 'zasób'} = {}){
  let ostatni;
  for(let i = 0; i <= proby; i++){
    try{ return await fn(i); }
    catch(e){
      ostatni = e;
      if(i < proby) await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw Error(opis + ': ' + (ostatni?.message || ostatni));
}

export function pobierz(url, opcje = {}, {ms = TERMIN, proby = PROBY, opis = url} = {}){
  return ponow(async () => {
    /* AbortSignal naprawdę przerywa żądanie — inaczej porzucone pobrania
       zajmowałyby limit równoległych połączeń przeglądarki. */
    const odp = await fetch(url, {...opcje, signal: AbortSignal.timeout(ms)});
    if(!odp.ok) throw Error('HTTP ' + odp.status);
    return odp;
  }, {proby, opis});
}

/* Raport postępu — nadpisywany przez stronę; tutaj bezpieczna atrapa,
   żeby moduły dało się uruchomić także poza tą stroną. */
/* Raport postępu plus POMIAR ETAPÓW. Czas każdego etapu ląduje w
   globalThis.__czasy, żeby dało się zobaczyć, co naprawdę zajmuje start,
   zamiast zgadywać po etykiecie widocznej akurat na pasku. */
let poprzedniEtap = null, poprzedniCzas = 0;
export const postep = (etap, ulamek) => {
  const t = (globalThis.performance || Date).now();
  const c = globalThis.__czasy || (globalThis.__czasy = []);
  if(poprzedniEtap !== null) c.push({etap: poprzedniEtap, ms: Math.round(t - poprzedniCzas)});
  poprzedniEtap = etap; poprzedniCzas = t;
  try{ globalThis.__postep?.etap?.(etap, ulamek); }catch(e){}
};
export const koniecPomiaru = () => {
  const t = (globalThis.performance || Date).now();
  if(poprzedniEtap !== null){
    (globalThis.__czasy || (globalThis.__czasy = [])).push({etap: poprzedniEtap, ms: Math.round(t - poprzedniCzas)});
    poprzedniEtap = null;
  }
};
