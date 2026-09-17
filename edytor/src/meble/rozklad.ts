import { parsujWlasny as parsujSilnik, rozloz as rozlozSilnik } from '../../../renderery/webgpu/parametryczne.js'

/* Rozkład półek w meblu parametrycznym przy STAŁEJ wielkości mebla (odpowiednik Auto layout w Figmie).
   Jednostki: mm. `liczba` = liczba półek wewnętrznych; przegród jest o jedną więcej.
   Tryby: równe, Fibonacci (1,1,2,3,5… — największa przegroda na dole), losowe (deterministyczne z ziarna),
   własne „60+40+20+40” (proporcje; suma inna niż wnętrze → skalowanie). */
export type Rozklad = 'rowne' | 'fibonacci' | 'losowe' | 'wlasne'

export interface ParametryRozkladu {
  liczba: number
  rozklad: Rozklad
  wlasne: string
  ziarno: number
  odwroc: boolean
}

export interface WynikRozkladu {
  przegrody: number[]
  srodkiPolek: number[]
  sumaWlasnych: number | null
}

/* Jeden algorytm dla podglądu w edytorze i geometrii silnika (renderery/webgpu/parametryczne.js). */
const NAZWY = { rowne: 'equal', fibonacci: 'fibonacci', losowe: 'random', wlasne: 'custom' } as const

export const poprawnyWlasny = (tekst: string) => parsujSilnik(tekst) !== null || /^\s*\d+(?:[.,]\d+)?(?:\s*\+\s*\d+(?:[.,]\d+)?)*\s*$/.test(tekst)

export const parsujWlasny = (tekst: string): number[] | null => parsujSilnik(tekst)

/** Przegrody i środki półek dla wnętrza o wysokości `wnetrze` i płyt o grubości `grubosc` (mm). */
export function rozloz(wnetrze: number, grubosc: number, p: ParametryRozkladu): WynikRozkladu {
  const wlasne = p.rozklad === 'wlasne' ? parsujWlasny(p.wlasne) : null
  // Zapis własny wyznacza liczbę przegród; w pozostałych trybach przegród jest o jedną więcej niż półek.
  const n = wlasne ? wlasne.length : Math.max(1, Math.round(p.liczba) + 1)
  const r = rozlozSilnik(wnetrze, grubosc, n, { distribution: wlasne || p.rozklad !== 'wlasne' ? NAZWY[p.rozklad] : 'equal', custom: p.wlasne, seed: p.ziarno, reverse: p.odwroc })
  return { przegrody: r.dlugosci, srodkiPolek: r.poczatki.slice(1).map((s) => s - grubosc / 2), sumaWlasnych: wlasne ? wlasne.reduce((a, b) => a + b, 0) : null }
}

/** Ręczne przesunięcie półek na scenie → zapis „własny” w pełnych cm (np. „60+40+20+40”, jak zapis użytkownika). */
export function wlasnyZeSrodkow(wnetrze: number, grubosc: number, srodki: number[]): string {
  const granice = [0, ...srodki.flatMap((s) => [s - grubosc / 2, s + grubosc / 2]), wnetrze]
  const przegrody: number[] = []
  for (let i = 0; i < granice.length; i += 2) przegrody.push((granice[i + 1] - granice[i]) / 10)
  return przegrody.map((cm) => String(Math.max(1, Math.round(cm)))).join('+')
}
