import { z } from 'zod'

import { UstawieniaMaterialu } from '@/meble/material'

/* Dokument projektu — jedyne źródło prawdy o zmianach użytkownika (wzór: E1 z kopii Codex).
   Zawiera wyłącznie nadpisania względem silnika: układy półek, materiały grup elementów (`mebel/klucz`),
   parametry świateł (id światła) i widoczność (`mebel` lub `mebel:część`). Brak wpisu = stan z silnika.
   Stany drzwi i szuflad nie należą do dokumentu (to interakcja, nie projekt). */
export const ParametrySwiatla = z.object({
  wlaczone: z.boolean(),
  lumeny: z.number().min(0),
  skupienie: z.number().min(0).max(100),
  pochylenie: z.number().min(0).max(90),
  azymut: z.number().min(0).max(360),
  kelwiny: z.number().min(1000).max(12000)
})

export const DokumentProjektu = z.object({
  wersja: z.literal(1),
  nazwa: z.string().default('Mieszkanie'),
  uklady: z.record(z.string(), z.any()),
  materialy: z.record(z.string(), UstawieniaMaterialu),
  swiatla: z.record(z.string(), ParametrySwiatla),
  widocznosc: z.record(z.string(), z.boolean())
})
export type DokumentProjektu = z.infer<typeof DokumentProjektu>

export const pustyDokument = (): DokumentProjektu => ({ wersja: 1, nazwa: 'Mieszkanie', uklady: {}, materialy: {}, swiatla: {}, widocznosc: {} })
export const kopiaDokumentu = (d: DokumentProjektu): DokumentProjektu => JSON.parse(JSON.stringify(d))
export const takieSame = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/* Klucze sekcji, które różnią się między dokumentami (dodane, zmienione, usunięte). */
export function zmienioneKlucze<T>(przed: Record<string, T>, po: Record<string, T>) {
  const klucze = new Set([...Object.keys(przed), ...Object.keys(po)])
  return [...klucze].filter((k) => !takieSame(przed[k], po[k]))
}
