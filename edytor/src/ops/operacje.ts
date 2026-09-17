import { z } from 'zod'

import { palety, widoki } from '@/data/mieszkanie'

import { zdefiniuj } from './rejestr'

/* Pierwsze operacje (szkielet). Nazwy są stabilnym API dla AI — zmieniać świadomie. */
const idWidokow = widoki.map((w) => w.id) as [string, ...string[]]
const idPalet = palety.map((p) => p.id) as [string, ...string[]]

zdefiniuj({
  nazwa: 'scene.describe', tytul: 'Opisz stan sceny', grupa: 'Scena', tylkoOdczyt: true,
  wejscie: z.object({})
})
zdefiniuj({
  nazwa: 'camera.goToRoom', tytul: 'Przejdź do pomieszczenia', grupa: 'Kamera',
  wejscie: z.object({ pokoj: z.enum(idWidokow) })
})
zdefiniuj({
  nazwa: 'light.setTime', tytul: 'Ustaw porę roku i godzinę', grupa: 'Światło',
  wejscie: z.object({ poraRoku: z.enum(['lato', 'zima']), godzina: z.number().min(5).max(22) })
})
zdefiniuj({
  nazwa: 'quality.setProfile', tytul: 'Ustaw priorytet renderowania', grupa: 'Obraz',
  wejscie: z.object({ profil: z.enum(['plynnosc', 'zrownowazona', 'wysoka', 'zdjecie']) })
})
zdefiniuj({
  nazwa: 'furniture.setMechanism', tytul: 'Otwórz lub zamknij mechanizm mebla', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string(), mechanizm: z.string(), otwarty: z.boolean() })
})
zdefiniuj({
  nazwa: 'furniture.setParam', tytul: 'Zmień parametr mebla', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string(), parametr: z.string(), wartosc: z.number() })
})
zdefiniuj({
  nazwa: 'furniture.setShelfLayout', tytul: 'Zmień układ półek (stała wielkość mebla)', grupa: 'Meble',
  wejscie: z.object({
    mebel: z.string(),
    przeplyw: z.enum(['wiersze', 'kolumny', 'siatka']).optional(),
    polki: z.number().int().min(0).max(12).optional(),
    kolumny: z.number().int().min(1).max(8).optional(),
    rozklad: z.enum(['rowne', 'fibonacci', 'losowe', 'wlasne']).optional(),
    wlasne: z.string().regex(/^\s*\d+(?:[.,]\d+)?(?:\s*\+\s*\d+(?:[.,]\d+)?)*\s*$/).optional()
  })
})
zdefiniuj({
  nazwa: 'furniture.setComponent', tytul: 'Zmień komponent powtarzany (liczba kopii, uchwyt, kierunek)', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string(), komponent: z.string(), ile: z.number().int().min(1).max(24).optional(), uchwyt: z.enum(['groove', 'knob', 'push']).optional(), otwieranie: z.enum(['left', 'right']).optional() })
})
zdefiniuj({
  nazwa: 'palette.apply', tytul: 'Zastosuj paletę kolorów', grupa: 'Materiały',
  wejscie: z.object({ paleta: z.enum(idPalet), cel: z.string(), tryb: z.enum(['role', 'kolejnosc', 'recznie']) })
})
zdefiniuj({
  nazwa: 'render.ai', tytul: 'Render AI kadru', grupa: 'Obraz',
  wejscie: z.object({
    dostawca: z.enum(['openai', 'gemini']),
    kanaly: z.array(z.enum(['obraz', 'albedo', 'glebia', 'normalne', 'maska'])),
    prompt: z.string()
  })
})
