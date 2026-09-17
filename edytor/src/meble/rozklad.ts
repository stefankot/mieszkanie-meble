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

const WZOR_WLASNY = /^\s*\d+(?:[.,]\d+)?(?:\s*\+\s*\d+(?:[.,]\d+)?)*\s*$/

export const poprawnyWlasny = (tekst: string) => WZOR_WLASNY.test(tekst)

export function parsujWlasny(tekst: string): number[] | null {
  if (!poprawnyWlasny(tekst)) return null
  const wartosci = tekst.split('+').map((t) => Number(t.trim().replace(',', '.')))
  return wartosci.every((v) => v > 0) ? wartosci : null
}

function losowy(ziarno: number) {
  let a = ziarno >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function wagi(p: ParametryRozkladu): number[] {
  const n = Math.max(1, Math.round(p.liczba) + 1)
  switch (p.rozklad) {
    case 'fibonacci': {
      const f = [1, 1]
      while (f.length < n) f.push(f.at(-1)! + f.at(-2)!)
      return f.slice(0, n).reverse()
    }
    case 'losowe': {
      const r = losowy(p.ziarno)
      return Array.from({ length: n }, () => 0.6 + r() * 0.8)
    }
    case 'wlasne':
      return parsujWlasny(p.wlasne) ?? Array(n).fill(1)
    default:
      return Array(n).fill(1)
  }
}

/** Przegrody i środki półek dla wnętrza o wysokości `wnetrze` i płyt o grubości `grubosc` (mm). */
export function rozloz(wnetrze: number, grubosc: number, p: ParametryRozkladu): WynikRozkladu {
  let w = wagi(p)
  if (p.odwroc) w = [...w].reverse()
  const polek = w.length - 1
  const dostepne = Math.max(0, wnetrze - polek * grubosc)
  const suma = w.reduce((a, b) => a + b, 0)
  const przegrody = w.map((x) => (x / suma) * dostepne)
  const srodkiPolek: number[] = []
  let y = 0
  for (let i = 0; i < polek; i++) {
    y += przegrody[i]
    srodkiPolek.push(y + grubosc / 2)
    y += grubosc
  }
  const wlasne = p.rozklad === 'wlasne' ? parsujWlasny(p.wlasne) : null
  return { przegrody, srodkiPolek, sumaWlasnych: wlasne ? wlasne.reduce((a, b) => a + b, 0) : null }
}

/** Ręczne przesunięcie półek na scenie → zapis „własny” w pełnych cm (np. „60+40+20+40”, jak zapis użytkownika). */
export function wlasnyZeSrodkow(wnetrze: number, grubosc: number, srodki: number[]): string {
  const granice = [0, ...srodki.flatMap((s) => [s - grubosc / 2, s + grubosc / 2]), wnetrze]
  const przegrody: number[] = []
  for (let i = 0; i < granice.length; i += 2) przegrody.push((granice[i + 1] - granice[i]) / 10)
  return przegrody.map((cm) => String(Math.max(1, Math.round(cm)))).join('+')
}
