/* Stałe, deterministyczne pory dla Warszawy. Daty są lokalne: SunCalc ma
   dostać tę samą godzinę ścienną niezależnie od źródła (start lub panel). */
export const PRESSETY_SWIATLA = Object.freeze({
  'lato-08': Object.freeze({sezon:'LATO', godzina:'8.00', miesiac:5, dzien:21, h:8}),
  'lato-14': Object.freeze({sezon:'LATO', godzina:'14.00', miesiac:5, dzien:21, h:14}),
  'lato-20': Object.freeze({sezon:'LATO', godzina:'20.00', miesiac:5, dzien:21, h:20}),
  'zima-08': Object.freeze({sezon:'ZIMA', godzina:'8.00', miesiac:11, dzien:21, h:8}),
  'zima-14': Object.freeze({sezon:'ZIMA', godzina:'14.00', miesiac:11, dzien:21, h:14}),
  'zima-20': Object.freeze({sezon:'ZIMA', godzina:'20.00', miesiac:11, dzien:21, h:20})
});

/* Niskie, boczne światło ZIMA 14.00 jest najbliższe fotografii referencyjnej:
   jasne okno po lewej, miękki kierunek na frontach i widoczne ciepłe LED-y. */
export const DOMYSLNY_PRESET_SWIATLA = 'zima-14';

export function dataPresetuSwiatla(id, rok=2026){
  const p = PRESSETY_SWIATLA[id];
  if(!p) throw new RangeError('Nieznany preset światła: ' + id);
  return new Date(rok, p.miesiac, p.dzien, p.h, 0, 0, 0);
}
