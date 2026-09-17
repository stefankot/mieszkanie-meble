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

/* Mebel w projekcie: przesunięty mebel z biblioteki (`asset` = id mebla) albo wstawiona kopia
   (`asset` wskazuje pierwowzór). Jednostki mm, obrót w stopniach wokół pionu. */
export const MebelProjektu = z.object({
  asset: z.string(),
  positionMm: z.tuple([z.number(), z.number(), z.number()]),
  rotationDeg: z.number(),
  kopia: z.boolean().default(false)
})

/* Światło dodane przez użytkownika (punktowe albo stożek). Pozycja w mm, zasięg w cm. */
export const SwiatloWlasne = ParametrySwiatla.extend({
  typ: z.enum(['punktowe', 'stozek']).default('punktowe'),
  pozycjaMm: z.tuple([z.number(), z.number(), z.number()]),
  zasiegCm: z.number().min(50).max(3000).default(900)
})

export const DokumentProjektu = z.object({
  wersja: z.literal(1),
  nazwa: z.string().default('Mieszkanie'),
  uklady: z.record(z.string(), z.any()),
  materialy: z.record(z.string(), UstawieniaMaterialu),
  swiatla: z.record(z.string(), ParametrySwiatla),
  widocznosc: z.record(z.string(), z.boolean()),
  meble: z.record(z.string(), MebelProjektu).default({}),
  swiatlaWlasne: z.record(z.string(), SwiatloWlasne).default({})
})
export type DokumentProjektu = z.infer<typeof DokumentProjektu>

export const pustyDokument = (): DokumentProjektu => ({ wersja: 1, nazwa: 'Mieszkanie', uklady: {}, materialy: {}, swiatla: {}, widocznosc: {}, meble: {}, swiatlaWlasne: {} })
export const kopiaDokumentu = (d: DokumentProjektu): DokumentProjektu => JSON.parse(JSON.stringify(d))
export const takieSame = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/* Klucze sekcji, które różnią się między dokumentami (dodane, zmienione, usunięte). */
export function zmienioneKlucze<T>(przed: Record<string, T>, po: Record<string, T>) {
  const klucze = new Set([...Object.keys(przed), ...Object.keys(po)])
  return [...klucze].filter((k) => !takieSame(przed[k], po[k]))
}
