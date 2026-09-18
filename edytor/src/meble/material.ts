import { z } from 'zod'

/* Ustawienia materiału edytora (preset albo custom). Jedna definicja dla UI, silnika (TSL) i AI (JSON Schema).
   Jednostki: skala wzoru/tekstury w cm na powtórzenie; wartości suwaków 0–1, jeśli nie zaznaczono inaczej. */
export const Baza = z.enum(['solid', 'texture', 'pattern'])
export const Wzor = z.enum(['stripes', 'checker', 'grid', 'dots', 'herringbone', 'terrazzo'])

export const UstawieniaMaterialu = z.object({
  nazwa: z.string(),
  baza: Baza,
  kolor: z.string().regex(/^#[0-9a-f]{6}$/i),
  tekstura: z.object({
    zrodlo: z.enum(['scene', 'image', 'online']).describe('scene = skan z silnika, image = wgrany lub wygenerowany obraz, online = zestaw map z biblioteki'),
    url: z.string().optional(),
    /* Pełny zestaw map PBR z biblioteki online (adresy plików). ARM łączy AO, chropowatość i metaliczność. */
    mapy: z.object({
      kolor: z.string().optional(), normalna: z.string().optional(), arm: z.string().optional(), chropowatosc: z.string().optional(),
      metalicznosc: z.string().optional(), ao: z.string().optional(), wysokosc: z.string().optional(),
      /* Biblioteka wydaje mapy „na odwrót” (gloss zamiast chropowatości) albo spakowane w jednym kanale. */
      odwrocone: z.array(z.string()).optional(),
      kanaly: z.record(z.string(), z.string()).optional()
    }).optional(),
    zrodloNazwa: z.string().optional(),
    ekspozycja: z.number().min(-1).max(1),
    kontrast: z.number().min(-1).max(1),
    nasycenie: z.number().min(-1).max(1),
    temperatura: z.number().min(-1).max(1),
    odcien: z.number().min(-1).max(1),
    swiatla: z.number().min(-1).max(1),
    cienie: z.number().min(-1).max(1)
  }),
  wzor: z.object({ rodzaj: Wzor, kolor2: z.string(), proporcja: z.number().min(0.05).max(0.95) }),
  powierzchnia: z.object({ chropowatosc: z.number(), metalicznosc: z.number(), lakier: z.number(), polysk: z.number() }),
  relief: z.object({
    wypuklosc: z.number().min(0).max(1).describe('bump z jasności tekstury'),
    sledzenieWysokosci: z.boolean().describe('height field tracing (paralaksa)'),
    glebokosc: z.number().min(0).max(1),
    generatywne: z.boolean(),
    skalaSzumu: z.number().min(0.2).max(50).describe('cm'),
    silaSzumu: z.number().min(0).max(1),
    ziarno: z.number().int()
  }),
  niedoskonalosci: z.object({ wlaczone: z.boolean(), kurz: z.number(), smugi: z.number(), rysy: z.number(), wytarcie: z.number() }),
  mapowanie: z.object({ skala: z.number().min(1).max(400), obrot: z.number(), trojplanarne: z.boolean() })
})
export type UstawieniaMaterialu = z.infer<typeof UstawieniaMaterialu>

const NEUTRALNA = { zrodlo: 'scene' as const, ekspozycja: 0, kontrast: 0, nasycenie: 0, temperatura: 0, odcien: 0, swiatla: 0, cienie: 0 }

export function nowyMaterial(zmiany: Partial<UstawieniaMaterialu> & { nazwa: string }): UstawieniaMaterialu {
  return {
    baza: 'solid',
    kolor: '#cccccc',
    tekstura: { ...NEUTRALNA },
    wzor: { rodzaj: 'stripes', kolor2: '#f1efe9', proporcja: 0.5 },
    powierzchnia: { chropowatosc: 0.8, metalicznosc: 0, lakier: 0, polysk: 0 },
    relief: { wypuklosc: 0.2, sledzenieWysokosci: false, glebokosc: 0.2, generatywne: false, skalaSzumu: 4, silaSzumu: 0.15, ziarno: 1 },
    niedoskonalosci: { wlaczone: true, kurz: 0.2, smugi: 0.2, rysy: 0.1, wytarcie: 0.15 },
    mapowanie: { skala: 60, obrot: 0, trojplanarne: true },
    ...zmiany
  }
}

const mat = (nazwa: string, kolor: string, chropowatosc: number, reszta: Partial<UstawieniaMaterialu> = {}) =>
  nowyMaterial({ nazwa, kolor, powierzchnia: { chropowatosc, metalicznosc: 0, lakier: 0, polysk: 0 }, ...reszta })

/* Presety kolorów i wykończeń z palet projektu. Tekstur nie wybieramy za użytkownika:
   preset teksturowy korzysta wyłącznie ze skanu, który materiał ma już w scenie. */
export const presetyMaterialow: UstawieniaMaterialu[] = [
  mat('Burgund mat', '#6f2230', 0.82),
  mat('Kobalt mat', '#2e4fa0', 0.8),
  mat('Krem lakier', '#ece2cf', 0.42, { powierzchnia: { chropowatosc: 0.42, metalicznosc: 0, lakier: 0.35, polysk: 0 } }),
  mat('Grafit mat', '#3a3b3e', 0.86),
  mat('Stal szczotkowana', '#a9abad', 0.38, { powierzchnia: { chropowatosc: 0.38, metalicznosc: 1, lakier: 0, polysk: 0 }, relief: { wypuklosc: 0, sledzenieWysokosci: false, glebokosc: 0, generatywne: true, skalaSzumu: 0.4, silaSzumu: 0.08, ziarno: 3 } }),
  mat('Fornir ze sceny', '#d8bd99', 0.88, { baza: 'texture', relief: { wypuklosc: 0.3, sledzenieWysokosci: true, glebokosc: 0.25, generatywne: false, skalaSzumu: 4, silaSzumu: 0.1, ziarno: 1 } }),
  mat('Paski krem-burgund', '#6f2230', 0.7, { baza: 'pattern', wzor: { rodzaj: 'stripes', kolor2: '#ece2cf', proporcja: 0.5 }, mapowanie: { skala: 12, obrot: 90, trojplanarne: true } }),
  mat('Lastryko', '#e8e2d6', 0.55, { baza: 'pattern', wzor: { rodzaj: 'terrazzo', kolor2: '#7b2f34', proporcja: 0.18 }, mapowanie: { skala: 18, obrot: 0, trojplanarne: true } }),
  mat('Jodełka klon', '#c9a27a', 0.7, { baza: 'pattern', wzor: { rodzaj: 'herringbone', kolor2: '#9c7250', proporcja: 0.5 }, mapowanie: { skala: 30, obrot: 45, trojplanarne: true } })
]

export const kluczUstawien = (u: UstawieniaMaterialu) => JSON.stringify(u)
// Kopia działa też na proxy Vue (structuredClone ich nie przyjmuje).
export const kopiaUstawien = (u: UstawieniaMaterialu): UstawieniaMaterialu => JSON.parse(JSON.stringify(u))
