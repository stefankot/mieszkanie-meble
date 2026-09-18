import { atom } from 'nanostores'

/* Biblioteka online: Blendkit (blendkit.com, dawniej BlenderKit) — 140 tys. assetów, materiały wydawane
   wyłącznie jako pliki `.blend`. Mapy wyciąga z nich Blender (`narzedzia/blendkit.mjs` + `-wyciag.py`),
   a wynik trafia do `tekstury/<id>/` jako KTX2. Dlatego:
   • katalog = to, co już wyciągnięto lokalnie (`tekstury/katalog.json`) — działa też na opublikowanej stronie,
   • szukanie w całym Blendkicie i pobieranie nowych materiałów działa tylko przy serwerze dev
     (API Blendkitu nie wysyła nagłówków CORS, a Blender musi być lokalnie).
   Licencje są różne: `cc_zero` wolno publikować, `royalty_free` (licencja Blendkit) — tylko do własnych projektów. */
const BAZA = import.meta.env.DEV ? '' : '..'
const DEV = import.meta.env.DEV

export interface TeksturaOnline {
  id: string
  assetBaseId?: string
  nazwa: string
  autor: string
  licencja: string
  kategorie: string[]
  tagi: string[]
  wymiaryM: [number, number] | null
  miniatura: string
  lokalna: boolean
  rozdzielczosc?: string
}
export interface MapyTekstury {
  kolor?: string
  normalna?: string
  arm?: string
  chropowatosc?: string
  metalicznosc?: string
  ao?: string
  wysokosc?: string
  odwrocone?: string[]
  kanaly?: Record<string, string>
}

export const $katalogOnline = atom<TeksturaOnline[]>([])
export const $stanKatalogu = atom<'pusty' | 'pobieranie' | 'gotowy' | 'blad'>('pusty')
export const $pobieranaTekstura = atom<string | null>(null)
export const MINIATURA = (t: TeksturaOnline) => t.miniatura

const zWpisu = (w: any, lokalna: boolean): TeksturaOnline => ({
  id: w.id,
  assetBaseId: w.assetBaseId,
  nazwa: w.nazwa ?? w.id,
  autor: w.autor ?? '',
  licencja: w.licencja ?? '',
  kategorie: [w.kategoria].filter(Boolean),
  tagi: w.tagi ?? [],
  wymiaryM: typeof w.rozmiarM === 'number' ? [w.rozmiarM, w.rozmiarM] : null,
  miniatura: w.miniatura ?? '',
  rozdzielczosc: w.rozdzielczosc,
  lokalna
})

export async function pobierzKatalog() {
  if ($stanKatalogu.get() === 'pobieranie' || $katalogOnline.get().length) return $katalogOnline.get()
  $stanKatalogu.set('pobieranie')
  try {
    const odp = await fetch(`${BAZA}/tekstury/katalog.json`)
    // W opublikowanej wersji pokazujemy tylko CC0 — pozostałych licencja Blendkit nie pozwala udostępniać,
    // więc ich plików nie ma w repozytorium (lokalnie widać wszystko, co wyciągnięte).
    const lista = odp.ok ? ((await odp.json()) as any[]).filter((w) => DEV || w.licencja === 'cc_zero').map((w) => zWpisu(w, true)) : []
    $katalogOnline.set(lista)
    $stanKatalogu.set('gotowy')
    return lista
  } catch (e) {
    $stanKatalogu.set('blad')
    throw new Error(`Nie udało się wczytać katalogu tekstur: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/* Szukanie w całym Blendkicie — przez serwer dev, bo API nie ma CORS. Wyniki dołączamy do katalogu
   (z `lokalna: false`), żeby dało się je wybrać tak samo jak te już wyciągnięte. */
export async function szukajOnline(fraza: string, { tylkoCC0 = false } = {}): Promise<TeksturaOnline[]> {
  if (!DEV || fraza.trim().length < 3) return []
  const zapytanie = `${tylkoCC0 ? 'license:cc_zero ' : ''}${fraza}`
  const odp = await fetch(`/__lokalne/blendkit/szukaj?q=${encodeURIComponent(zapytanie)}&ile=36`)
  if (!odp.ok) throw new Error(`Blendkit: ${(await odp.json().catch(() => ({}))).blad ?? odp.status}`)
  const { wyniki } = (await odp.json()) as { wyniki: any[] }
  const zdalne = wyniki
    .filter((w) => !w.proceduralna)
    .map((w) => zWpisu({ ...w, kategoria: w.kategoria, rozmiarM: w.rozmiarM }, false))
  const lokalneId = new Set($katalogOnline.get().filter((t) => t.lokalna).map((t) => t.assetBaseId ?? t.id))
  const nowe = zdalne.filter((t) => !lokalneId.has(t.assetBaseId ?? t.id))
  $katalogOnline.set([...$katalogOnline.get(), ...nowe.filter((t) => !$katalogOnline.get().some((x) => x.id === t.id))])
  return zdalne
}

const lokalne = new Map<string, Promise<MapyTekstury | null>>()
/* Adresy map muszą być bezwzględne: wczytuje je silnik z ramki (`/renderery/webgpu/`), więc ścieżka
   względna edytora („../tekstury/…") rozwiązałaby się tam na `/renderery/tekstury/…` i dawała 404. */
const adres = (sciezka: string) => new URL(`${BAZA}/${sciezka}`, globalThis.location?.href ?? 'http://localhost/').href

function manifestLokalny(id: string, rozdzielczosc: string) {
  const klucz = `${id}/${rozdzielczosc}`
  if (!lokalne.has(klucz)) {
    lokalne.set(
      klucz,
      fetch(`${BAZA}/tekstury/${id}/mapy.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => (m && m.rozdzielczosc === rozdzielczosc ? zManifestu(m) : null))
        .catch(() => null)
    )
  }
  return lokalne.get(klucz)!
}

const zManifestu = (m: any): MapyTekstury => ({
  ...(Object.fromEntries(Object.entries(m.mapy as Record<string, string>).map(([k, v]) => [k, adres(v)])) as MapyTekstury),
  odwrocone: m.odwrocone?.length ? m.odwrocone : undefined,
  kanaly: m.kanaly && Object.keys(m.kanaly).length ? m.kanaly : undefined
})

/* Mapy dla wybranej rozdzielczości. Jeśli materiału nie ma jeszcze na dysku, przy serwerze dev
   zamawiamy wyciąg: pobranie `.blend` z Blendkitu, Blender w tle, kompresja do KTX2 (~5 s). */
export async function mapyTekstury(id: string, rozdzielczosc: '1k' | '2k' | '4k' = '2k'): Promise<MapyTekstury> {
  const gotowe = await manifestLokalny(id, rozdzielczosc)
  if (gotowe?.kolor) return gotowe
  if (!DEV) throw new Error(`Tekstura „${id}” nie jest wyciągnięta lokalnie. Uruchom: node narzedzia/blendkit.mjs pobierz <id> --res ${rozdzielczosc}`)
  const wpis = $katalogOnline.get().find((t) => t.id === id)
  $pobieranaTekstura.set(id)
  try {
    const odp = await fetch(`/__lokalne/blendkit/pobierz?id=${encodeURIComponent(wpis?.assetBaseId ?? id)}&res=${rozdzielczosc}`)
    const dane = await odp.json()
    if (!odp.ok) throw new Error(dane.blad ?? `Blendkit ${odp.status}`)
    lokalne.delete(`${dane.id}/${rozdzielczosc}`)
    if (wpis) $katalogOnline.set($katalogOnline.get().map((t) => (t.id === id ? { ...t, id: dane.id, lokalna: true } : t)))
    return zManifestu(dane)
  } finally {
    $pobieranaTekstura.set(null)
  }
}

/* Filtr po nazwie, kategorii i tagach — katalog lokalny jest krótki, więc filtrujemy w pamięci. */
export function szukaj(fraza: string, kategoria: string | null, lista = $katalogOnline.get()) {
  const f = fraza.trim().toLowerCase()
  return lista.filter((t) => {
    if (kategoria && !t.kategorie.includes(kategoria)) return false
    if (!f) return true
    return t.nazwa.toLowerCase().includes(f) || t.id.includes(f) || t.tagi.some((x) => x.includes(f)) || t.kategorie.some((x) => x.includes(f))
  })
}

export function kategorie(lista = $katalogOnline.get()) {
  const licznik = new Map<string, number>()
  for (const t of lista) for (const k of t.kategorie) licznik.set(k, (licznik.get(k) ?? 0) + 1)
  return [...licznik].sort((a, b) => b[1] - a[1]).slice(0, 16)
}
