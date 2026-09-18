import { beforeEach, describe, expect, it, vi } from 'vitest'

import { $katalogOnline, kategorie, mapyTekstury, pobierzKatalog, szukaj } from './blendkit'

const wpis = (id: string, nazwa: string, kategoria: string, tagi: string[] = []) => ({
  id, assetBaseId: `${id}-uuid`, nazwa, autor: 'Autor', licencja: 'cc_zero', kategoria, tagi, miniatura: `https://x/${id}.png`, rozmiarM: 1.5, rozdzielczosc: '2k'
})

describe('katalog Blendkit', () => {
  beforeEach(() => $katalogOnline.set([]))

  it('wczytuje katalog lokalnych tekstur i mapuje wymiary kafla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [wpis('deska', 'Deska dębowa', 'wood', ['oak'])] }))
    const lista = await pobierzKatalog()
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ id: 'deska', nazwa: 'Deska dębowa', licencja: 'cc_zero', lokalna: true, wymiaryM: [1.5, 1.5] })
  })

  it('szuka po nazwie, tagach i kategorii', () => {
    const lista = [wpis('deska', 'Deska dębowa', 'wood', ['oak']), wpis('beton', 'Beton szalunkowy', 'concrete', ['raw'])].map((w) => ({
      ...w, kategorie: [w.kategoria], wymiaryM: [1.5, 1.5] as [number, number], lokalna: true
    }))
    expect(szukaj('oak', null, lista as any).map((t) => t.id)).toEqual(['deska'])
    expect(szukaj('', 'concrete', lista as any).map((t) => t.id)).toEqual(['beton'])
    expect(kategorie(lista as any)).toEqual([['wood', 1], ['concrete', 1]])
  })

  it('zwraca adresy map z manifestu razem z odwróconymi i kanałami', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          rozdzielczosc: '2k',
          mapy: { kolor: 'tekstury/deska/kolor_2k.ktx2', chropowatosc: 'tekstury/deska/chropowatosc_2k.ktx2', wysokosc: 'tekstury/deska/wysokosc_2k.ktx2' },
          odwrocone: ['chropowatosc'],
          kanaly: { chropowatosc: 'g' }
        })
      })
    )
    const mapy = await mapyTekstury('deska', '2k')
    expect(mapy.kolor).toContain('tekstury/deska/kolor_2k.ktx2')
    expect(mapy.wysokosc).toContain('wysokosc_2k.ktx2')     // mapa wysokości musi dojść do materiału
    expect(mapy.odwrocone).toEqual(['chropowatosc'])
    expect(mapy.kanaly).toEqual({ chropowatosc: 'g' })
  })
})
