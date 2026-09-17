import { map } from 'nanostores'

import { zmienProjekt } from '@/projekt/projekt'

import type { Rozklad } from './rozklad'

/* Stan parametryczny mebla (makieta; docelowo schemat v2 `definitions` + `instances` i operacje rejestru).
   Mebel = komponent (jak w Figmie): układ półek przy stałej wielkości + komponenty powtarzane N razy. */
export interface KomponentPowtarzany {
  id: string
  nazwa: string
  ile: number
  uklad: 'wiersze' | 'kolumny' | 'siatka'
  uchwyt: 'groove' | 'knob' | 'push'
  otwieranie: 'left' | 'right'
  szklo: boolean
}

export interface UkladMebla {
  przeplyw: 'wiersze' | 'kolumny' | 'siatka'
  polki: number
  kolumny: number
  rozklad: Rozklad
  wlasne: string
  ziarno: number
  odwroc: boolean
  grubosc: number
  marginesGora: number
  marginesDol: number
  stalyRozmiar: boolean
  komponenty: KomponentPowtarzany[]
}

const drzwi = (ile: number): KomponentPowtarzany => ({ id: 'door', nazwa: 'Door', ile, uklad: 'siatka', uchwyt: 'groove', otwieranie: 'left', szklo: false })

const DOMYSLNE: Record<string, UkladMebla> = {
  'regal-kuchnia': { przeplyw: 'siatka', polki: 6, kolumny: 3, rozklad: 'rowne', wlasne: '', ziarno: 7, odwroc: false, grubosc: 18, marginesGora: 0, marginesDol: 0, stalyRozmiar: true, komponenty: [drzwi(6)] },
  'regal-salon': { przeplyw: 'siatka', polki: 5, kolumny: 4, rozklad: 'fibonacci', wlasne: '', ziarno: 3, odwroc: false, grubosc: 18, marginesGora: 0, marginesDol: 0, stalyRozmiar: true, komponenty: [drzwi(8)] },
  'regal-przy-lozku': { przeplyw: 'wiersze', polki: 3, kolumny: 1, rozklad: 'wlasne', wlasne: '60+40+20+40', ziarno: 1, odwroc: false, grubosc: 18, marginesGora: 0, marginesDol: 0, stalyRozmiar: true, komponenty: [drzwi(2), { ...drzwi(1), id: 'drawer', nazwa: 'Drawer', uklad: 'wiersze' }] }
}

export const $uklady = map<Record<string, UkladMebla>>(structuredClone(DOMYSLNE))

export function uklad(id: string): UkladMebla {
  const u = $uklady.get()[id]
  if (u) return u
  const nowy = structuredClone(DOMYSLNE['regal-kuchnia'])
  $uklady.setKey(id, nowy)
  return nowy
}

/* Zmiana układu idzie przez dokument projektu (Cofnij/Ponów, zapis); przeciąganie suwaka = jeden krok. */
export function zmienUklad(id: string, zmiana: Partial<UkladMebla>) {
  const nowy = { ...uklad(id), ...zmiana }
  zmienProjekt('Shelf layout', (d) => (d.uklady[id] = structuredClone(nowy)), { scal: `uklad:${id}` })
}
