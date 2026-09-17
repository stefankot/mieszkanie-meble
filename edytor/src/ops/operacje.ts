import { z } from 'zod'

import { generujTeksture } from '@/ai/tekstury'
import { renderujAI } from '@/ai/render'
import { palety, widoki } from '@/data/mieszkanie'
import { presetyMaterialow, kopiaUstawien } from '@/meble/material'
import { uklad, zmienUklad } from '@/meble/uklad'
import { cofnij, eksportujProjekt, ponow, zapiszWersje, zmienProjekt } from '@/projekt/projekt'
import { grupyMaterialow, koloryZaznaczenia, ustawieniaPoZmianieKoloru } from '@/silnik/materialyMebla'
import { $silnik, kliknij, ustawKontrolke } from '@/silnik/most'
import { parametrySwiatla, swiatlaMebli, swiatlaPokoi, znajdzSwiatlo } from '@/silnik/swiatla'
import { $aktywnyWidok, $mapaWidoczna, $tryb, $trybPrawejKolumny, $zaznaczenie } from '@/stan'

import { zdefiniuj } from './rejestr'

/* Operacje = API edytora. Nazwy są stabilne (używa ich AI) — zmieniać świadomie.
   Zmiany projektu idą przez dokument, więc każda operacja jest objęta Cofnij/Ponów. */
const idWidokow = widoki.map((w) => w.id) as [string, ...string[]]
const idPalet = palety.map((p) => p.id) as [string, ...string[]]
const nazwyPresetow = presetyMaterialow.map((p) => p.nazwa) as [string, ...string[]]
const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const silnik = () => $silnik.get()
const mebelZaznaczony = () => $zaznaczenie.get() ?? undefined
const wymagajMebla = (mebel?: string) => {
  const id = mebel ?? mebelZaznaczony()
  if (!id) throw new Error('Nie wskazano mebla i nic nie jest zaznaczone.')
  return id
}
const grupyMebla = (mebel: string, grupa?: string) => {
  const wszystkie = grupyMaterialow(silnik(), mebel)
  if (!wszystkie.length) throw new Error(`Mebel ${mebel} nie ma grup materiałów w scenie.`)
  return grupa ? wszystkie.filter((g) => g.klucz === grupa || g.nazwa === grupa) : wszystkie
}

/* ---------- scena i kamera ---------- */
zdefiniuj({
  nazwa: 'scene.describe', tytul: 'Opisz stan sceny', grupa: 'Scena', tylkoOdczyt: true,
  wejscie: z.object({}), domyslne: () => ({}),
  wykonaj: () => {
    const s = silnik()
    const meble = s ? [...((s as any).biblioteka?.meble ?? new Map())].map(([id, w]: [string, any]) => ({ id, nazwa: w.nazwa, wersja: w.wersja, parametryczny: !!w.dokument?.parametric })) : []
    return {
      tryb: $tryb.get(), widok: $aktywnyWidok.get(), zaznaczenie: $zaznaczenie.get(), meble,
      swiatlaPokoi: swiatlaPokoi(s).map((l) => ({ id: l.id, nazwa: l.etykieta, wlaczone: l.wlaczone })),
      swiatlaMebli: [...swiatlaMebli(s)].flatMap(([mebel, lista]) => lista.map((l) => ({ id: l.id, mebel, wlaczone: l.wlaczone })))
    }
  }
})
zdefiniuj({
  nazwa: 'camera.goToRoom', tytul: 'Przejdź do pomieszczenia', grupa: 'Kamera',
  wejscie: z.object({ pokoj: z.enum(idWidokow) }),
  wykonaj: ({ pokoj }) => $aktywnyWidok.set(pokoj)
})
zdefiniuj({
  nazwa: 'camera.setMode', tytul: 'Zmień tryb kamery', grupa: 'Kamera',
  wejscie: z.object({ tryb: z.enum(['spacer', 'orbita', 'ptak']) }),
  wykonaj: ({ tryb }) => (silnik() as any)?.nawigacja.ustawTryb(tryb)
})
zdefiniuj({
  nazwa: 'camera.topView', tytul: 'Widok z góry', grupa: 'Kamera',
  wejscie: z.object({}), domyslne: () => ({}), wykonaj: () => kliknij('#widokToggle')
})
zdefiniuj({
  nazwa: 'camera.frameSelection', tytul: 'Wykadruj zaznaczony mebel', grupa: 'Kamera',
  wejscie: z.object({ mebel: z.string().optional() }), domyslne: () => ({ mebel: mebelZaznaczony() }),
  wykonaj: ({ mebel }) => {
    const s = silnik() as any
    const korzen = s?.scene.getObjectByName(`biblioteka:${wymagajMebla(mebel)}`)
    if (!korzen) throw new Error('Mebel nie jest w scenie.')
    return s.nawigacja.kadrujMebel(korzen)
  }
})
zdefiniuj({
  nazwa: 'view.setMode', tytul: 'Tryb edycji albo spaceru', grupa: 'Scena',
  wejscie: z.object({ tryb: z.enum(['edit', 'walk']) }), wykonaj: ({ tryb }) => $tryb.set(tryb)
})
zdefiniuj({
  nazwa: 'view.toggleMap', tytul: 'Pokaż lub ukryj mapę', grupa: 'Scena',
  wejscie: z.object({ widoczna: z.boolean().optional() }), domyslne: () => ({}),
  wykonaj: ({ widoczna }) => $mapaWidoczna.set(widoczna ?? !$mapaWidoczna.get())
})

/* ---------- meble ---------- */
zdefiniuj({
  nazwa: 'furniture.select', tytul: 'Zaznacz mebel', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string() }), wykonaj: ({ mebel }) => $zaznaczenie.set(mebel)
})
zdefiniuj({
  nazwa: 'furniture.setShelfLayout', tytul: 'Zmień układ półek (stała wielkość mebla)', grupa: 'Meble',
  wejscie: z.object({
    mebel: z.string().optional(),
    przeplyw: z.enum(['wiersze', 'kolumny', 'siatka']).optional(),
    polki: z.number().int().min(0).max(23).optional(),
    kolumny: z.number().int().min(1).max(24).optional(),
    rozklad: z.enum(['rowne', 'fibonacci', 'losowe', 'wlasne']).optional(),
    wlasne: z.string().regex(/^\s*\d+(?:[.,]\d+)?(?:\s*\+\s*\d+(?:[.,]\d+)?)*\s*$/).optional(),
    ziarno: z.number().int().min(1).max(999).optional(),
    odwroc: z.boolean().optional()
  }),
  wykonaj: ({ mebel, ...zmiana }) => zmienUklad(wymagajMebla(mebel), zmiana)
})
zdefiniuj({
  nazwa: 'furniture.setComponent', tytul: 'Zmień komponent powtarzany (liczba kopii, uchwyt, kierunek)', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string().optional(), komponent: z.string(), ile: z.number().int().min(1).max(48).optional(), uchwyt: z.enum(['groove', 'knob', 'push']).optional(), otwieranie: z.enum(['left', 'right']).optional(), szklo: z.boolean().optional() }),
  wykonaj: ({ mebel, komponent, ...zmiana }) => {
    const id = wymagajMebla(mebel)
    const u = uklad(id)
    zmienUklad(id, { komponenty: u.komponenty.map((k) => (k.id === komponent || k.nazwa === komponent ? { ...k, ...zmiana } : k)) })
  }
})
zdefiniuj({
  nazwa: 'furniture.setMechanism', tytul: 'Otwórz lub zamknij drzwiczki i szuflady', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string().optional(), mechanizm: z.string().optional(), otwarty: z.boolean() }),
  wykonaj: ({ mebel, mechanizm, otwarty }) => {
    const s = silnik()
    const id = wymagajMebla(mebel)
    const ruchy = (s?.interakcje.ruchy() ?? []).filter((r) => r.mebel === id && (!mechanizm || r.ruch.id === mechanizm || r.ruch.etykieta === mechanizm))
    if (!ruchy.length) throw new Error('Nie znaleziono takiego mechanizmu.')
    for (const r of ruchy) s?.interakcje.ustaw(r.ruch, otwarty ? 1 : 0)
    return ruchy.length
  }
})
zdefiniuj({
  nazwa: 'furniture.setVisibility', tytul: 'Ukryj lub pokaż mebel albo część', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string().optional(), czesc: z.string().optional(), widoczny: z.boolean() }),
  wykonaj: ({ mebel, czesc, widoczny }) => {
    const klucz = czesc ? `${wymagajMebla(mebel)}:${czesc}` : wymagajMebla(mebel)
    zmienProjekt(widoczny ? `Show ${klucz}` : `Hide ${klucz}`, (d) => {
      if (widoczny) delete d.widocznosc[klucz]
      else d.widocznosc[klucz] = false
    })
  }
})

/* ---------- materiały i kolory ---------- */
zdefiniuj({
  nazwa: 'material.applyPreset', tytul: 'Nadaj materiał z presetu', grupa: 'Materiały',
  wejscie: z.object({ mebel: z.string().optional(), grupa: z.string().optional(), preset: z.enum(nazwyPresetow) }),
  wykonaj: ({ mebel, grupa, preset }) => {
    const id = wymagajMebla(mebel)
    const p = presetyMaterialow.find((x) => x.nazwa === preset)!
    const cele = grupyMebla(id, grupa)
    zmienProjekt(`Preset · ${preset}`, (d) => cele.forEach((g) => (d.materialy[`${id}/${g.klucz}`] = kopiaUstawien(p))))
    return cele.length
  }
})
zdefiniuj({
  nazwa: 'material.setColor', tytul: 'Zmień kolor', grupa: 'Materiały',
  wejscie: z.object({ mebel: z.string().optional(), grupa: z.string().optional(), kolor: HEX }),
  wykonaj: ({ mebel, grupa, kolor }) => {
    const id = wymagajMebla(mebel)
    const cele = grupyMebla(id, grupa)
    zmienProjekt('Selection color', (d) =>
      cele.forEach((g) => {
        const u = kopiaUstawien(d.materialy[`${id}/${g.klucz}`] ?? g.ustawienia)
        u.kolor = kolor.toLowerCase()
        d.materialy[`${id}/${g.klucz}`] = u
      })
    )
    return cele.length
  }
})
zdefiniuj({
  nazwa: 'material.generateTexture', tytul: 'Wygeneruj teksturę z opisu (AI)', grupa: 'Materiały',
  wejscie: z.object({ mebel: z.string().optional(), grupa: z.string().optional(), opis: z.string().min(3) }),
  wykonaj: async ({ mebel, grupa, opis }) => {
    const id = wymagajMebla(mebel)
    const cele = grupyMebla(id, grupa)
    const url = await generujTeksture(opis)
    zmienProjekt(`Texture · ${opis.slice(0, 40)}`, (d) =>
      cele.forEach((g) => {
        const u = kopiaUstawien(d.materialy[`${id}/${g.klucz}`] ?? g.ustawienia)
        u.baza = 'texture'
        u.tekstura = { ...u.tekstura, zrodlo: 'image', url }
        d.materialy[`${id}/${g.klucz}`] = u
      })
    )
    return cele.length
  }
})
zdefiniuj({
  nazwa: 'palette.apply', tytul: 'Zastosuj paletę kolorów', grupa: 'Materiały',
  wejscie: z.object({ paleta: z.enum(idPalet), mebel: z.string().optional() }),
  wykonaj: ({ paleta, mebel }) => {
    const id = wymagajMebla(mebel)
    const p = palety.find((x) => x.id === paleta)!
    const kolory = koloryZaznaczenia(grupyMaterialow(silnik(), id))
    zmienProjekt(`Palette · ${p.nazwa}`, (d) =>
      kolory.forEach((k, i) => {
        const nowe = ustawieniaPoZmianieKoloru(silnik(), id, k, p.kolory[i % p.kolory.length].hex)
        Object.entries(nowe).forEach(([klucz, u]) => (d.materialy[`${id}/${klucz}`] = u))
      })
    )
    return kolory.length
  }
})

/* ---------- światło i obraz ---------- */
zdefiniuj({
  nazwa: 'light.set', tytul: 'Ustaw światło (lumeny, skupienie, barwa)', grupa: 'Światło',
  wejscie: z.object({ swiatlo: z.string(), wlaczone: z.boolean().optional(), lumeny: z.number().min(0).max(6000).optional(), skupienie: z.number().min(0).max(100).optional(), kelwiny: z.number().min(1800).max(6500).optional() }),
  wykonaj: ({ swiatlo, ...zmiana }) => {
    const l = znajdzSwiatlo(silnik(), swiatlo)
    if (!l) throw new Error(`Nie ma światła ${swiatlo}.`)
    const p = { ...parametrySwiatla(l), ...zmiana }
    zmienProjekt(`Light · ${l.etykieta}`, (d) => (d.swiatla[swiatlo] = p))
  }
})
zdefiniuj({
  nazwa: 'light.setAll', tytul: 'Włącz lub wyłącz wszystkie lampy', grupa: 'Światło',
  wejscie: z.object({ wlaczone: z.boolean(), zakres: z.enum(['pokoje', 'meble', 'wszystkie']).default('wszystkie') }),
  wykonaj: ({ wlaczone, zakres }) => {
    const s = silnik()
    const lista = [
      ...(zakres === 'meble' ? [] : swiatlaPokoi(s)),
      ...(zakres === 'pokoje' ? [] : [...swiatlaMebli(s).values()].flat())
    ]
    zmienProjekt(wlaczone ? 'Turn on lights' : 'Turn off lights', (d) => lista.forEach((l) => (d.swiatla[l.id] = { ...parametrySwiatla(l), wlaczone })))
    return lista.length
  }
})
zdefiniuj({
  nazwa: 'light.setTime', tytul: 'Ustaw porę roku i godzinę', grupa: 'Światło',
  wejscie: z.object({ poraRoku: z.enum(['lato', 'zima']), godzina: z.enum(['8', '12', '16', '20']) }),
  wykonaj: ({ poraRoku, godzina }) => kliknij(`[data-preset-swiatla="${poraRoku}-${godzina}"]`)
})
zdefiniuj({
  nazwa: 'quality.setProfile', tytul: 'Ustaw priorytet renderowania', grupa: 'Obraz',
  wejscie: z.object({ profil: z.enum(['plynnosc', 'zrownowazona', 'wysoka', 'zdjecie']) }),
  wykonaj: ({ profil }) => ustawKontrolke('#jakoscPoziom', profil)
})
zdefiniuj({
  nazwa: 'render.ai', tytul: 'Render AI kadru', grupa: 'Obraz',
  wejscie: z.object({
    opis: z.string().default(''),
    orientacja: z.enum(['landscape', 'square', 'portrait']).default('landscape'),
    jakosc: z.enum(['low', 'medium', 'high', 'auto']).default('high'),
    ile: z.number().int().min(1).max(4).default(1),
    chronZaznaczony: z.boolean().default(false)
  }),
  wykonaj: async ({ opis, orientacja, jakosc, ile, chronZaznaczony }) => {
    const s = silnik()
    if (!s) throw new Error('Silnik nie jest gotowy.')
    $trybPrawejKolumny.set('zdjecie')
    const wyniki = await renderujAI(s, { model: 'latest', orientacja, jakosc, ile, opis, wiernosc: true, krawedzie: true, chronMebel: chronZaznaczony ? mebelZaznaczony() ?? null : null })
    return wyniki.length
  }
})

/* ---------- projekt ---------- */
zdefiniuj({ nazwa: 'project.undo', tytul: 'Cofnij', grupa: 'Projekt', wejscie: z.object({}), domyslne: () => ({}), wykonaj: () => cofnij() })
zdefiniuj({ nazwa: 'project.redo', tytul: 'Ponów', grupa: 'Projekt', wejscie: z.object({}), domyslne: () => ({}), wykonaj: () => ponow() })
zdefiniuj({ nazwa: 'project.exportJson', tytul: 'Eksportuj projekt do JSON', grupa: 'Projekt', wejscie: z.object({}), domyslne: () => ({}), wykonaj: () => eksportujProjekt() })
zdefiniuj({
  nazwa: 'project.saveVersion', tytul: 'Zapisz wersję projektu', grupa: 'Projekt',
  wejscie: z.object({ nazwa: z.string().min(1).default(`Wersja ${new Date().toLocaleString()}`) }),
  domyslne: () => ({}), wykonaj: ({ nazwa }) => zapiszWersje(nazwa)
})
