import { atom } from 'nanostores'

/* Biblioteka online: Poly Haven (publiczne API, CORS otwarty, wszystko na licencji CC0 — darmowe także
   komercyjnie). Bierzemy pełny zestaw map PBR, nie sam obrazek: barwa, normalne (OpenGL), ARM
   (AO + chropowatość + metaliczność w jednym pliku), wysokość. Adresy plików podaje API, nie zgadujemy ich. */
const API = 'https://api.polyhaven.com'
export const MINIATURA = (id: string, px = 256) => `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=${px}&height=${px}`

export interface TeksturaOnline { id: string; nazwa: string; kategorie: string[]; tagi: string[]; wymiaryM: [number, number] | null }
export interface MapyTekstury { kolor?: string; normalna?: string; arm?: string; chropowatosc?: string; metalicznosc?: string; ao?: string; wysokosc?: string }

export const $katalogOnline = atom<TeksturaOnline[]>([])
export const $stanKatalogu = atom<'pusty' | 'pobieranie' | 'gotowy' | 'blad'>('pusty')

export async function pobierzKatalog() {
  if ($stanKatalogu.get() === 'pobieranie' || $katalogOnline.get().length) return $katalogOnline.get()
  $stanKatalogu.set('pobieranie')
  try {
    const dane = (await (await fetch(`${API}/assets?t=textures`)).json()) as Record<string, any>
    const lista = Object.entries(dane).map(([id, v]) => ({
      id, nazwa: v.name ?? id, kategorie: v.categories ?? [], tagi: v.tags ?? [],
      wymiaryM: Array.isArray(v.dimensions) ? ([v.dimensions[0] / 1000, v.dimensions[1] / 1000] as [number, number]) : null
    }))
    $katalogOnline.set(lista)
    $stanKatalogu.set('gotowy')
    return lista
  } catch (e) {
    $stanKatalogu.set('blad')
    throw new Error(`Nie udało się pobrać katalogu Poly Haven: ${e instanceof Error ? e.message : String(e)}`)
  }
}

const pliki = new Map<string, Promise<any>>()
const lokalne = new Map<string, Promise<MapyTekstury | null>>()

/* Lokalne KTX2 z `narzedzia/tekstury-ktx2.mjs` mają pierwszeństwo: ta sama tekstura, ale format GPU
   (BC7 na desktopie, ASTC na telefonie) i bez dekodowania JPEG na procesorze. */
function lokalnyZestaw(id: string, rozdzielczosc: string) {
  const klucz = `${id}/${rozdzielczosc}`
  if (!lokalne.has(klucz)) {
    lokalne.set(
      klucz,
      fetch(`${import.meta.env.DEV ? '' : '..'}/tekstury/${id}/mapy.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => (m && m.rozdzielczosc === rozdzielczosc ? (Object.fromEntries(Object.entries(m.mapy).map(([k, v]) => [k, `${import.meta.env.DEV ? '' : '..'}/${v}`])) as MapyTekstury) : null))
        .catch(() => null)
    )
  }
  return lokalne.get(klucz)!
}
const wpis = (dane: any, mapa: string, rozdz: string, format = 'jpg') => dane?.[mapa]?.[rozdz]?.[format]?.url as string | undefined

/* Adresy map dla wybranej rozdzielczości. Normalne bierzemy w wariancie OpenGL (three.js tak je czyta). */
export async function mapyTekstury(id: string, rozdzielczosc: '1k' | '2k' | '4k' = '2k'): Promise<MapyTekstury> {
  const zLokalnych = await lokalnyZestaw(id, rozdzielczosc)
  if (zLokalnych?.kolor) return zLokalnych
  if (!pliki.has(id)) pliki.set(id, fetch(`${API}/files/${id}`).then((r) => r.json()))
  const dane = await pliki.get(id)!
  const dostepne: string[] = Object.keys(dane?.Diffuse ?? {})
  const r = dostepne.includes(rozdzielczosc) ? rozdzielczosc : (dostepne.includes('2k') ? '2k' : dostepne[0])
  return {
    kolor: wpis(dane, 'Diffuse', r) ?? wpis(dane, 'diffuse', r),
    normalna: wpis(dane, 'nor_gl', r) ?? wpis(dane, 'nor_dx', r),
    arm: wpis(dane, 'arm', r),
    chropowatosc: wpis(dane, 'Rough', r),
    metalicznosc: wpis(dane, 'metal', r),
    ao: wpis(dane, 'AO', r),
    wysokosc: wpis(dane, 'Displacement', r)
  }
}

/* Szukanie po nazwie, kategoriach i tagach — katalog ma ~860 pozycji, więc filtrujemy lokalnie. */
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
