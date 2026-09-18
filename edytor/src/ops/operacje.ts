import { z } from 'zod'

import { generujTeksture } from '@/ai/tekstury'
import { renderujAI } from '@/ai/render'
import { palety, widoki } from '@/data/mieszkanie'
import { presetyMaterialow, kopiaUstawien } from '@/meble/material'
import { uklad, zmienUklad } from '@/meble/uklad'
import { cofnij, dokumentProjektu, eksportujProjekt, ponow, zapiszWersje, zmienProjekt } from '@/projekt/projekt'
import { grupyMaterialow, koloryZaznaczenia, ustawieniaPoZmianieKoloru } from '@/silnik/materialyMebla'
import { $silnik, kliknij, ustawKontrolke } from '@/silnik/most'
import { przyciagnijDoSciany } from '@/silnik/przyciaganie'
import { slowaCelu } from '@/ai/jezyk'
import { parametrySwiatla, swiatlaMebli, swiatlaPokoi, znajdzSwiatlo } from '@/silnik/swiatla'
import { $aktywnyWidok, $mapaWidoczna, $przyciaganie, $tryb, $trybPrawejKolumny, $zaznaczenie } from '@/stan'

import { zdefiniuj } from './rejestr'

/* Operacje = API edytora. Nazwy są stabilne (używa ich AI) — zmieniać świadomie.
   Zmiany projektu idą przez dokument, więc każda operacja jest objęta Cofnij/Ponów. */
const idWidokow = widoki.map((w) => w.id) as [string, ...string[]]
const idPalet = palety.map((p) => p.id) as [string, ...string[]]
const nazwyPresetow = presetyMaterialow.map((p) => p.nazwa) as [string, ...string[]]
const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const silnik = () => $silnik.get()
const dokumentMebli = () => dokumentProjektu().meble ?? {}
const mebelZaznaczony = () => $zaznaczenie.get() ?? undefined
const wymagajMebla = (mebel?: string) => {
  const id = mebel ?? mebelZaznaczony()
  if (!id) throw new Error('Nie wskazano mebla i nic nie jest zaznaczone.')
  return id
}
/* Grupa wskazana kluczem, nazwą materiału albo nazwą części („materac”, „bordo”) — tak mówi użytkownik. */
const grupyMebla = (mebel: string, grupa?: string) => {
  const wszystkie = grupyMaterialow(silnik(), mebel)
  if (!wszystkie.length) throw new Error(`Mebel ${mebel} nie ma grup materiałów w scenie.`)
  if (!grupa) return wszystkie
  const szukane = slowaCelu(grupa)
  const pasuje = (g: (typeof wszystkie)[number]) => {
    if (g.klucz === grupa || g.nazwa === grupa) return true
    const slowa = [...slowaCelu(g.nazwa), ...g.siatki.slice(0, 12).flatMap((o: any) => slowaCelu(String(o.name ?? '').replace(/^[\w-]+:/, '').replace(/[_-]+/g, ' ')))]
    return szukane.some((x) => slowa.some((y) => x === y || (x.length >= 4 && y.startsWith(x)) || (y.length >= 4 && x.startsWith(y))))
  }
  const trafione = wszystkie.filter(pasuje)
  if (!trafione.length) throw new Error(`W meblu ${mebel} nie ma części „${grupa}”. Części: ${[...new Set(wszystkie.map((g) => g.nazwa))].slice(0, 6).join(', ')}.`)
  return trafione
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
    // „drzwiczki” ma trafić w „Drzwiczki R1 C1” — porównujemy po słowach, nie po pełnej nazwie.
    const szukane = mechanizm ? slowaCelu(mechanizm) : []
    const pasuje = (r: any) => {
      if (!mechanizm) return true
      if (r.ruch.id === mechanizm || r.ruch.etykieta === mechanizm) return true
      const slowa = [...slowaCelu(String(r.ruch.etykieta ?? '')), ...slowaCelu(String(r.ruch.id ?? '').replace(/[:_-]+/g, ' '))]
      return szukane.some((x) => slowa.some((y) => y === x || (x.length >= 4 && y.startsWith(x)) || (y.length >= 4 && x.startsWith(y))))
    }
    const ruchy = (s?.interakcje.ruchy() ?? []).filter((r) => r.mebel === id && pasuje(r))
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

zdefiniuj({
  nazwa: 'furniture.insert', tytul: 'Wstaw kopię mebla przed kamerą', grupa: 'Meble',
  wejscie: z.object({ asset: z.string(), odlegloscCm: z.number().min(60).max(600).default(220) }),
  wykonaj: ({ asset, odlegloscCm }) => {
    const s = silnik()
    if (!s) throw new Error('Silnik nie jest gotowy.')
    const T = s.THREE
    const kierunek = s.camera.getWorldDirection(new T.Vector3())
    kierunek.y = 0
    kierunek.normalize()
    const punkt = s.camera.position.clone().addScaledVector(kierunek, odlegloscCm)
    const numery = Object.keys(dokumentMebli()).filter((k) => k.startsWith(`${asset}-`))
    const id = `${asset}-${numery.length + 2}`
    const obrotKamery = (Math.atan2(kierunek.x, kierunek.z) * 180) / Math.PI
    const u = { positionMm: [Math.round(punkt.x * 10), 0, Math.round(punkt.z * 10)] as [number, number, number], rotationDeg: Math.round(obrotKamery) }
    zmienProjekt(`Insert ${asset}`, (d) => (d.meble[id] = { asset, ...u, kopia: true }))
    // Po wstawieniu mebel jest w scenie — dopiero teraz da się policzyć przyciąganie do ściany.
    if ($przyciaganie.get()) {
      const dosuniete = przyciagnijDoSciany(s, id, u)
      if (dosuniete !== u) zmienProjekt(`Snap ${id}`, (d) => (d.meble[id] = { asset, ...dosuniete, kopia: true }))
    }
    $zaznaczenie.set(id)
    return id
  }
})
zdefiniuj({
  nazwa: 'furniture.place', tytul: 'Ustaw mebel (pozycja i obrót)', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string().optional(), xMm: z.number(), zMm: z.number(), rotationDeg: z.number().min(-360).max(360).default(0), przyciagaj: z.boolean().default(true) }),
  wykonaj: ({ mebel, xMm, zMm, rotationDeg, przyciagaj }) => {
    const id = wymagajMebla(mebel)
    const s = silnik()
    const wpis = dokumentMebli()[id]
    const asset = wpis?.asset ?? id
    let u = { positionMm: [xMm, wpis?.positionMm[1] ?? 0, zMm] as [number, number, number], rotationDeg }
    if (przyciagaj) u = przyciagnijDoSciany(s, id, u)
    zmienProjekt(`Move ${id}`, (d) => (d.meble[id] = { asset, ...u, kopia: wpis?.kopia ?? false }))
    return u
  }
})
zdefiniuj({
  nazwa: 'furniture.remove', tytul: 'Usuń wstawioną kopię mebla', grupa: 'Meble',
  wejscie: z.object({ mebel: z.string().optional() }), domyslne: () => ({ mebel: mebelZaznaczony() }),
  wykonaj: ({ mebel }) => {
    const id = wymagajMebla(mebel)
    if (!dokumentMebli()[id]?.kopia) throw new Error('Usuwać można tylko kopie wstawione w edytorze.')
    zmienProjekt(`Remove ${id}`, (d) => delete d.meble[id])
    if ($zaznaczenie.get() === id) $zaznaczenie.set(null)
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
  wejscie: z.object({ swiatlo: z.string(), wlaczone: z.boolean().optional(), lumeny: z.number().min(0).max(6000).optional(), skupienie: z.number().min(0).max(100).optional(), kelwiny: z.number().min(1800).max(6500).optional(), mnoznikJasnosci: z.number().min(0.1).max(5).optional() }),
  wykonaj: ({ swiatlo, mnoznikJasnosci, ...zmiana }) => {
    const l = znajdzSwiatlo(silnik(), swiatlo)
    if (!l) throw new Error(`Nie ma światła ${swiatlo}.`)
    const biezace = parametrySwiatla(l)
    const p = { ...biezace, ...zmiana, ...(mnoznikJasnosci ? { lumeny: Math.round(biezace.lumeny * mnoznikJasnosci), wlaczone: true } : {}) }
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
  nazwa: 'quality.setCinematic', tytul: 'Profil filmowy (tempo, rozmycie, głębia, ziarno)', grupa: 'Obraz',
  wejscie: z.object({
    wlaczony: z.boolean(),
    fps: z.number().int().min(12).max(60).default(25),
    rozmycieRuchu: z.boolean().default(true),
    glebiaOstrosci: z.boolean().default(true),
    ziarno: z.boolean().default(true),
    ostroscCm: z.number().min(50).max(1200).optional()
  }),
  wykonaj: (dane) => (silnik() as any)?.film?.ustaw(dane)
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

zdefiniuj({
  nazwa: 'light.add', tytul: 'Dodaj własne światło przed kamerą', grupa: 'Światło',
  wejscie: z.object({
    typ: z.enum(['punktowe', 'stozek']).default('punktowe'),
    lumeny: z.number().min(50).max(6000).default(900),
    kelwiny: z.number().min(1800).max(6500).default(3000),
    wysokoscCm: z.number().min(20).max(300).default(215),
    odlegloscCm: z.number().min(50).max(600).default(180)
  }),
  domyslne: () => ({}),
  wykonaj: ({ typ, lumeny, kelwiny, wysokoscCm, odlegloscCm }) => {
    const s = silnik()
    if (!s) throw new Error('Silnik nie jest gotowy.')
    const T = s.THREE
    const kierunek = s.camera.getWorldDirection(new T.Vector3())
    kierunek.y = 0
    kierunek.normalize()
    const p = s.camera.position.clone().addScaledVector(kierunek, odlegloscCm)
    const id = `swiatlo-${Object.keys(dokumentProjektu().swiatlaWlasne ?? {}).length + 1}`
    zmienProjekt('Add light', (d) => (d.swiatlaWlasne[id] = {
      typ, lumeny, kelwiny, skupienie: 40, pochylenie: typ === 'stozek' ? 0 : 0, azymut: 0, wlaczone: true,
      pozycjaMm: [Math.round(p.x * 10), Math.round(wysokoscCm * 10), Math.round(p.z * 10)], zasiegCm: 900
    }))
    return id
  }
})
zdefiniuj({
  nazwa: 'light.remove', tytul: 'Usuń własne światło', grupa: 'Światło',
  wejscie: z.object({ swiatlo: z.string() }),
  wykonaj: ({ swiatlo }) => {
    const id = swiatlo.startsWith('wlasne:') ? swiatlo.slice(7) : swiatlo
    if (!dokumentProjektu().swiatlaWlasne?.[id]) throw new Error('To światło nie należy do projektu.')
    zmienProjekt('Remove light', (d) => delete d.swiatlaWlasne[id])
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
