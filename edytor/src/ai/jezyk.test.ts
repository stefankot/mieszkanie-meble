import { describe, expect, it } from 'vitest'

import { zinterpretuj, type Kontekst } from './jezyk'

/* Kontekst jak ze sceny: dwa meble, części po nazwach siatek, lampa nazwana jak pokój. */
const k: Kontekst = {
  meble: [
    { id: 'regal-salon', etykieta: 'Regał w salonie', slowa: ['regal', 'salon'] },
    { id: 'lozko', etykieta: 'Łóżko pod oknem', slowa: ['lozk', 'pod', 'oknem'] }
  ],
  grupy: {
    'regal-salon': [{ id: 'Fornir@V01', etykieta: 'Fornir dębowy', slowa: ['fornir', 'debow'] }],
    lozko: [{ id: 'Tkanina@materac', etykieta: 'Tkanina materac/poduchy', slowa: ['tkanin', 'materac', 'poduch'] }]
  },
  swiatla: [{ id: 'lampa:3', etykieta: 'Salon', slowa: ['salon', 'lampa'] }],
  pokoje: [{ id: 'KUCHNIA', etykieta: 'Kuchnia', slowa: ['kuchni'] }],
  presety: ['Burgund mat', 'Kobalt mat'],
  palety: [{ id: 'skandynawska', nazwa: 'Nordic' }],
  zaznaczenie: 'regal-salon'
}
const jedna = (tekst: string) => zinterpretuj(tekst, k).operacje[0]

describe('interpreter poleceń offline', () => {
  it('liczba półek trafia do mebla z nazwy, nie do zaznaczenia', () => {
    expect(jedna('ustaw 6 polek w regale w salonie')).toEqual({ nazwa: 'furniture.setShelfLayout', dane: { mebel: 'regal-salon', polki: 6 } })
  })

  it('część nazwana wprost wskazuje swój mebel, a ostatnia barwa wygrywa', () => {
    expect(jedna('zmien kolor materaca na zielony pistacjowy')).toEqual({ nazwa: 'material.setColor', dane: { mebel: 'lozko', grupa: 'Tkanina@materac', kolor: '#b5cd8f' } })
  })

  it('preset dotyczy całego mebla — jego nazwa nie jest nazwą części', () => {
    expect(jedna('burgund mat na regale w salonie')).toEqual({ nazwa: 'material.applyPreset', dane: { mebel: 'regal-salon', preset: 'Burgund mat' } })
  })

  it('lampa nazwana jak pokój nie przechwytuje słowa o pokoju', () => {
    expect(jedna('idz do kuchni')).toEqual({ nazwa: 'camera.goToRoom', dane: { pokoj: 'KUCHNIA' } })
    expect(jedna('zgas swiatla')).toEqual({ nazwa: 'light.setAll', dane: { wlaczone: false, zakres: 'wszystkie' } })
  })

  it('literówki i odmiana nie psują dopasowania', () => {
    expect(jedna('ustw 5 polek')).toEqual({ nazwa: 'furniture.setShelfLayout', dane: { mebel: 'regal-salon', polki: 5 } })
    expect(jedna('hex #2E4FA0')?.dane).toMatchObject({ kolor: '#2e4fa0' })
  })

  it('bez celu i bez zaznaczenia pyta zamiast zgadywać', () => {
    const w = zinterpretuj('zrob to na czerwono', { ...k, zaznaczenie: null })
    expect(w.operacje).toHaveLength(0)
    expect(w.pytanie?.opcje.map((o) => o.etykieta)).toEqual(['Regał w salonie', 'Łóżko pod oknem'])
  })

  it('polecenie spoza leksykonu nie daje operacji (zapasem jest model)', () => {
    expect(zinterpretuj('zaprojektuj mi cos ladnego', k).operacje).toHaveLength(0)
  })
})
