import { describe, expect, it } from 'vitest'

import { kategorie, MINIATURA, szukaj, type TeksturaOnline } from './polyhaven'

const lista: TeksturaOnline[] = [
  { id: 'old_wood_floor', nazwa: 'Old Wood Floor', kategorie: ['wood', 'floor'], tagi: ['planks', 'brown'], wymiaryM: [3, 3] },
  { id: 'red_brick_03', nazwa: 'Red Brick 03', kategorie: ['brick', 'wall'], tagi: ['red'], wymiaryM: [2, 2] },
  { id: 'concrete_floor_02', nazwa: 'Concrete Floor 02', kategorie: ['concrete', 'floor'], tagi: ['grey'], wymiaryM: null }
]

describe('katalog tekstur online', () => {
  it('szuka po nazwie, tagu i kategorii', () => {
    expect(szukaj('wood', null, lista).map((t) => t.id)).toEqual(['old_wood_floor'])
    expect(szukaj('red', null, lista).map((t) => t.id)).toEqual(['red_brick_03'])
    expect(szukaj('', 'floor', lista).map((t) => t.id)).toEqual(['old_wood_floor', 'concrete_floor_02'])
  })

  it('łączy frazę z kategorią', () => {
    expect(szukaj('concrete', 'floor', lista).map((t) => t.id)).toEqual(['concrete_floor_02'])
    expect(szukaj('concrete', 'wall', lista)).toHaveLength(0)
  })

  it('liczy kategorie malejąco', () => {
    expect(kategorie(lista)[0]).toEqual(['floor', 2])
  })

  it('miniatura ma zadany rozmiar', () => {
    expect(MINIATURA('old_wood_floor', 128)).toBe('https://cdn.polyhaven.com/asset_img/thumbs/old_wood_floor.png?width=128&height=128')
  })
})
