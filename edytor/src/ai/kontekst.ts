import { palety } from '@/data/mieszkanie'
import { presetyMaterialow } from '@/meble/material'
import { grupyMaterialow } from '@/silnik/materialyMebla'
import { $silnik } from '@/silnik/most'
import { swiatlaMebli, swiatlaPokoi } from '@/silnik/swiatla'
import { $zaznaczenie } from '@/stan'

import { slowaCelu, type Kontekst } from './jezyk'

/* Słownik celów z żywej sceny: meble, grupy materiałów (nazwa materiału + nazwy części, więc „materac”
   albo „bordo” trafiają), światła, pokoje, presety i palety. Budowany przy każdym poleceniu — scena się zmienia. */
/* `zId` tylko dla mebli: ich identyfikatory („regal-salon”) same w sobie są nazwą.
   Dla grup i pokoi identyfikator zawiera nazwę mebla albo pokoju i mylił dopasowanie. */
const cel = (id: string, etykieta: string, dodatkowe: string[] = [], zId = false) => ({
  id, etykieta, slowa: [...new Set([...slowaCelu(etykieta), ...dodatkowe.flatMap(slowaCelu), ...(zId ? slowaCelu(id) : [])])]
})

export function zbierzKontekst(): Kontekst {
  const s = $silnik.get() as any
  const meble = s?.biblioteka ? [...s.biblioteka.meble].map(([id, w]: [string, any]) => cel(id, w.nazwa ?? id, [], true)) : []
  const grupy: Kontekst['grupy'] = {}
  for (const m of meble) {
    grupy[m.id] = grupyMaterialow(s, m.id).map((g) =>
      // Nazwy siatek („materac_bialy”, „bordo_tyl”) są tym, czym użytkownik nazywa część mebla.
      cel(g.klucz, g.nazwa, g.siatki.slice(0, 12).map((o: any) => String(o.name ?? '').replace(/^[\w-]+:/, '').replace(/[_-]+/g, ' ')))
    )
  }
  const swiatla = [
    ...swiatlaPokoi(s).map((l) => cel(l.id, l.etykieta, ['lampa', 'sufitowa'])),
    ...[...swiatlaMebli(s)].flatMap(([mebel, lista]) => lista.map((l) => cel(l.id, l.etykieta, ['led', meble.find((m) => m.id === mebel)?.etykieta ?? mebel])))
  ]
  const pokoje = (s?.nawigacja?.pokoje ?? []).map((p: any) => cel(p.id, p.name ?? p.id))
  return { meble, grupy, swiatla, pokoje, presety: presetyMaterialow.map((p) => p.nazwa), palety: palety.map((p) => ({ id: p.id, nazwa: p.nazwa })), zaznaczenie: $zaznaczenie.get() }
}
