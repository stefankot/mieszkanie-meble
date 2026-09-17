import { describe, expect, it } from 'vitest'

import { parsujWlasny, rozloz, wlasnyZeSrodkow, type ParametryRozkladu } from './rozklad'

const baza: ParametryRozkladu = { liczba: 3, rozklad: 'rowne', wlasne: '', ziarno: 1, odwroc: false }
const suma = (t: number[]) => t.reduce((a, b) => a + b, 0)

describe('rozloz', () => {
  it('równe: cztery równe przegrody, suma z płytami = wnętrze', () => {
    const w = rozloz(2000, 18, baza)
    expect(w.przegrody).toHaveLength(4)
    expect(new Set(w.przegrody.map((x) => x.toFixed(6))).size).toBe(1)
    expect(suma(w.przegrody) + 3 * 18).toBeCloseTo(2000)
  })

  it('Fibonacci: największa przegroda na dole, odwrócenie zmienia kolejność', () => {
    const w = rozloz(1200, 0, { ...baza, rozklad: 'fibonacci' })
    expect(w.przegrody[0]).toBeGreaterThan(w.przegrody[3])
    const o = rozloz(1200, 0, { ...baza, rozklad: 'fibonacci', odwroc: true })
    expect(o.przegrody[0]).toBeCloseTo(w.przegrody[3])
  })

  it('losowe: to samo ziarno daje ten sam wynik, inne ziarno — inny', () => {
    const a = rozloz(1500, 18, { ...baza, rozklad: 'losowe', ziarno: 42 })
    expect(rozloz(1500, 18, { ...baza, rozklad: 'losowe', ziarno: 42 }).przegrody).toEqual(a.przegrody)
    expect(rozloz(1500, 18, { ...baza, rozklad: 'losowe', ziarno: 43 }).przegrody).not.toEqual(a.przegrody)
  })

  it('własne: „60+40+20+40” skalowane proporcjonalnie do wnętrza', () => {
    const w = rozloz(3200, 0, { ...baza, rozklad: 'wlasne', wlasne: '60+40+20+40' })
    expect(w.przegrody.map((x) => Math.round(x))).toEqual([1200, 800, 400, 800])
    expect(w.sumaWlasnych).toBe(160)
  })
})

describe('zapis własny', () => {
  it('odrzuca błędny zapis', () => {
    expect(parsujWlasny('60+-40')).toBeNull()
    expect(parsujWlasny('60,5 + 40')).toEqual([60.5, 40])
  })

  it('środki półek → zapis w pełnych cm i z powrotem ten sam układ (±1,5 cm)', () => {
    const w = rozloz(1600, 18, { ...baza, rozklad: 'wlasne', wlasne: '60+40+20+40' })
    const tekst = wlasnyZeSrodkow(1600, 18, w.srodkiPolek)
    const znowu = rozloz(1600, 18, { ...baza, rozklad: 'wlasne', wlasne: tekst })
    expect(tekst).toMatch(/^\d+(\+\d+)*$/)
    znowu.srodkiPolek.forEach((s, i) => expect(Math.abs(s - w.srodkiPolek[i])).toBeLessThanOrEqual(15))
  })
})
