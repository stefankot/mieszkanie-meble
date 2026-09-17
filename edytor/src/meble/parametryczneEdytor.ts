import type { NadpisaniaParametryczne } from '../../../renderery/webgpu/parametryczne.js'

import type { Silnik } from '@/silnik/most'

import { parsujWlasny } from './rozklad'
import type { UkladMebla } from './uklad'

/* Most między układem z Inspektora a sekcją `parametric` mebla w silniku.
   Mebel parametryczny przebudowuje bryłę przy tym samym rozmiarze zewnętrznym. */
const NAZWY = { rowne: 'equal', fibonacci: 'fibonacci', losowe: 'random', wlasne: 'custom' } as const

export function nadpisaniaZUkladu(u: UkladMebla): NadpisaniaParametryczne {
  const wlasne = u.rozklad === 'wlasne' ? parsujWlasny(u.wlasne) : null
  return {
    rows: { count: wlasne ? wlasne.length : Math.max(1, u.polki + 1), distribution: NAZWY[u.rozklad], custom: u.wlasne, seed: u.ziarno, reverse: u.odwroc },
    columns: { count: Math.max(1, u.kolumny) },
    instances: Object.fromEntries(u.komponenty.map((k) => [k.id, { count: k.ile }]))
  }
}

/* Układ startowy Inspektora dla mebla parametrycznego (zanim użytkownik cokolwiek zmieni). */
export function ukladZParametrycznego(p: any): Partial<UkladMebla> | null {
  if (!p?.layout) return null
  const odwrotne = { equal: 'rowne', fibonacci: 'fibonacci', random: 'losowe', custom: 'wlasne' } as const
  const r = p.layout.rows ?? {}
  const k = p.layout.columns ?? {}
  return {
    polki: Math.max(0, (r.count ?? 1) - 1),
    kolumny: k.count ?? 1,
    rozklad: odwrotne[(r.distribution ?? 'equal') as keyof typeof odwrotne],
    wlasne: r.custom ?? '',
    ziarno: r.seed ?? 1,
    odwroc: !!r.reverse,
    grubosc: p.carcass?.boardMm ?? 18,
    przeplyw: (k.count ?? 1) > 1 ? 'siatka' : 'wiersze',
    komponenty: (p.instances ?? []).map((i: any) => ({
      id: i.id,
      nazwa: i.label ?? p.definitions?.[i.definition]?.label ?? i.definition,
      ile: i.cells?.count ?? (r.count ?? 1) * (k.count ?? 1),
      uklad: 'siatka' as const,
      uchwyt: 'groove' as const,
      otwieranie: 'left' as const,
      szklo: false
    }))
  }
}

export const czyParametryczny = (s: Silnik | null, mebel: string) => !!(s as any)?.biblioteka?.parametryczny?.(mebel)

export function przebudujMebel(s: Silnik | null, mebel: string, u: UkladMebla) {
  return !!(s as any)?.biblioteka?.przebudujParametryczny?.(mebel, nadpisaniaZUkladu(u))
}
