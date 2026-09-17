import { describe, expect, it, vi } from 'vitest'

import { zmienioneKlucze } from './dokument'
import { utworzHistorie } from './historia'

const historia = () => {
  let czas = 0
  const projektuj = vi.fn()
  const h = utworzHistorie({ projektuj, zegar: () => czas })
  return { h, projektuj, uplyw: (ms: number) => (czas += ms) }
}

describe('historia dokumentu projektu', () => {
  it('cofa i ponawia zmianę, nanosząc różnicę na scenę', () => {
    const { h, projektuj } = historia()
    h.zmien('Light', (d) => (d.widocznosc['regal-salon'] = false))
    expect(h.dokument.widocznosc['regal-salon']).toBe(false)
    expect(h.cofnij()).toBe(true)
    expect(h.dokument.widocznosc).toEqual({})
    expect(projektuj).toHaveBeenLastCalledWith(expect.objectContaining({ widocznosc: { 'regal-salon': false } }), expect.objectContaining({ widocznosc: {} }))
    expect(h.ponow()).toBe(true)
    expect(h.dokument.widocznosc['regal-salon']).toBe(false)
  })

  it('scala przeciąganie suwaka w jeden krok, ale nie zmiany rozdzielone przerwą', () => {
    const { h, uplyw } = historia()
    for (const v of [100, 200, 300]) {
      h.zmien('Light', (d) => (d.uklady.a = { polki: v }), { scal: 'uklad:a' })
      uplyw(100)
    }
    expect(h.stan.krokow).toBe(1)
    uplyw(5000)
    h.zmien('Light', (d) => (d.uklady.a = { polki: 4 }), { scal: 'uklad:a' })
    expect(h.stan.krokow).toBe(2)
    h.cofnij()
    expect(h.dokument.uklady.a).toEqual({ polki: 300 })
    h.cofnij()
    expect(h.dokument.uklady).toEqual({})
  })

  it('pomija zmianę bez różnicy i czyści ponowienia po nowej zmianie', () => {
    const { h, projektuj } = historia()
    expect(h.zmien('Nic', () => {})).toBe(false)
    expect(projektuj).not.toHaveBeenCalled()
    h.zmien('A', (d) => (d.nazwa = 'A'))
    h.cofnij()
    expect(h.stan.moznaPonowic).toBe(true)
    h.zmien('B', (d) => (d.nazwa = 'B'))
    expect(h.stan.moznaPonowic).toBe(false)
  })

  it('wczytanie podmienia dokument bez kroku historii', () => {
    const { h } = historia()
    h.zmien('A', (d) => (d.nazwa = 'A'))
    h.wczytaj({ wersja: 1, nazwa: 'Wariant B', uklady: {}, materialy: {}, swiatla: {}, widocznosc: { x: false } })
    expect(h.stan.moznaCofnac).toBe(false)
    expect(h.dokument.nazwa).toBe('Wariant B')
  })

  it('wykrywa dodane, zmienione i usunięte klucze sekcji', () => {
    expect(zmienioneKlucze({ a: 1, b: 2, c: 3 }, { a: 1, b: 5, d: 4 }).sort()).toEqual(['b', 'c', 'd'])
  })
})
