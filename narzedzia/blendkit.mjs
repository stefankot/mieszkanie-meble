#!/usr/bin/env node
/* ============================================================
   BLENDKIT → mapy PBR → KTX2
   ------------------------------------------------------------
   Blendkit (blendkit.com, dawniej BlenderKit) wydaje materiały wyłącznie jako pliki `.blend` — także
   warianty „resolution_1K/2K/4K”. Nie ma tam gotowych map do pobrania, więc wyciągamy je Blenderem
   (`narzedzia/blendkit-wyciag.py`), a potem kodujemy do KTX2 (BC7/ASTC/ETC2 po stronie sterownika).
   API nie wysyła nagłówków CORS, więc szukanie idzie przez serwer (ten plik albo wtyczka dev w vite.config.ts).
   Darmowe assety pobierają się bez klucza; licencje bywają różne (`cc_zero` wolno publikować, `royalty_free` nie).

   Użycie:
     node narzedzia/blendkit.mjs szukaj "wood floor" [--ile 12] [--platne]
     node narzedzia/blendkit.mjs pobierz <assetBaseId|slug-z-listy> [--res 1k|2k|4k] [--etc1s]
   Wynik: tekstury/<slug>/<mapa>_<res>.ktx2, tekstury/<slug>/mapy.json, wpis w tekstury/katalog.json
   ============================================================ */
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const uruchom = promisify(execFile)
const API = 'https://www.blendkit.com/api/v1'
const PRZEGLADARKA = { 'User-Agent': 'Mozilla/5.0 (edytor-mieszkania)' }
const KATALOG = 'tekstury'
const SCENA = '00000000-0000-0000-0000-000000000000'   // addon wymaga identyfikatora sceny; dowolny działa

export const BLENDER = process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender'
/* Mapy barwy idą jako sRGB, mapy danych (normalne, chropowatość, wysokość) liniowo — inaczej normalne kłamią. */
const SRGB = new Set(['kolor'])

export const slug = (nazwa) =>
  nazwa.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

/* ——— API ——— */
export async function szukaj(fraza, { ile = 24, tylkoDarmowe = true, strona = 1 } = {}) {
  const zapytanie = ['asset_type:material', tylkoDarmowe ? 'is_free:true' : '', fraza].filter(Boolean).join(' ')
  const url = `${API}/search/?query=${encodeURIComponent(zapytanie)}&page_size=${ile}&page=${strona}`
  const odp = await fetch(url, { headers: PRZEGLADARKA })
  if (!odp.ok) throw new Error(`Blendkit ${odp.status}`)
  const dane = await odp.json()
  return {
    ile: dane.count,
    wyniki: (dane.results ?? []).map((r) => ({
      id: r.assetBaseId,
      slug: slug(r.name),
      nazwa: r.name,
      autor: r.author?.fullName ?? '',
      kategoria: r.category ?? '',
      tagi: r.tags ?? [],
      licencja: r.license,
      darmowa: !!r.isFree,
      miniatura: r.thumbnailMiddleUrl ?? r.thumbnailSmallUrl ?? '',
      rozmiarM: r.dictParameters?.textureSizeMeters ?? null,
      proceduralna: r.dictParameters?.procedural === true,
      rozdzielczosci: (r.files ?? []).map((f) => f.fileType).filter((t) => t?.startsWith('resolution_')),
      pliki: (r.files ?? []).map((f) => ({ typ: f.fileType, url: f.downloadUrl, mb: +((f.fileUploadSize ?? 0) / 1048576).toFixed(1) }))
    }))
  }
}

export async function opisAssetu(id) {
  const { wyniki } = await szukaj(`asset_base_id:${id}`, { ile: 1, tylkoDarmowe: false })
  return wyniki[0] ?? null
}

const POLE_RES = { '1k': 'resolution_1K', '2k': 'resolution_2K', '4k': 'resolution_4K', '05k': 'resolution_0_5K' }

async function pobierzBlend(asset, rozdzielczosc) {
  const kolejnosc = [POLE_RES[rozdzielczosc], 'resolution_2K', 'resolution_1K', 'resolution_0_5K', 'blend']
  const plik = kolejnosc.map((t) => asset.pliki.find((p) => p.typ === t)).find(Boolean)
  if (!plik) throw new Error(`Asset ${asset.nazwa} nie ma pliku .blend`)
  const odp = await fetch(`${plik.url}?scene_uuid=${SCENA}`, { headers: PRZEGLADARKA })
  if (!odp.ok) throw new Error(`Pobranie odrzucone (${odp.status}) — ten asset wymaga konta Blendkit.`)
  const { filePath } = await odp.json()
  const cel = join(tmpdir(), `blendkit-${asset.slug}-${Date.now()}.blend`)
  const dane = await fetch(filePath, { headers: PRZEGLADARKA })
  if (!dane.ok) throw new Error(`Plik .blend ${dane.status}`)
  await writeFile(cel, Buffer.from(await dane.arrayBuffer()))
  return { sciezka: cel, typ: plik.typ, mb: (await stat(cel)).size / 1048576 }
}

/* Blender otwiera .blend bez interfejsu i zapisuje obrazy materiału do katalogu roboczego. */
async function wyciagnijMapy(blend, katalogRoboczy) {
  if (!existsSync(BLENDER)) throw new Error(`Brak Blendera (${BLENDER}). Ustaw zmienną BLENDER na ścieżkę binarki.`)
  const skrypt = fileURLToPath(new URL('blendkit-wyciag.py', import.meta.url))   // ścieżka bywa ze spacjami
  const { stdout, stderr } = await uruchom(BLENDER, ['-b', blend, '-P', skrypt, '--', katalogRoboczy], { maxBuffer: 32 * 1024 * 1024 })
  const linia = stdout.split('\n').find((l) => l.includes('###RAPORT###'))
  if (!linia) throw new Error(`Blender nie zwrócił raportu (materiał proceduralny albo błąd skryptu): ${(stderr || stdout).trim().split('\n').slice(-3).join(' | ')}`)
  return JSON.parse(linia.slice(linia.indexOf('###RAPORT###') + 12))
}

async function doKtx2(wejscie, wyjscie, { srgb = false, etc1s = false } = {}) {
  const flagi = ['-ktx2', '-mipmap', '-file', wejscie, '-output_file', wyjscie]
  if (!etc1s) flagi.push('-uastc')
  if (!srgb) flagi.push('-linear')
  await uruchom('basisu', flagi, { maxBuffer: 32 * 1024 * 1024 })
  return (await stat(wyjscie)).size
}

const maKoder = async () => {
  try {
    await uruchom('basisu', ['-version'])
    return true
  } catch {
    return false
  }
}

/* Pełna ścieżka: asset → .blend → mapy → KTX2 → manifest. Zwraca zawartość mapy.json. */
export async function pobierzTeksture(id, { rozdzielczosc = '2k', etc1s = false, log = () => {} } = {}) {
  const asset = (await opisAssetu(id)) ?? (await szukaj(id, { ile: 1 })).wyniki[0]
  if (!asset) throw new Error(`Nie znalazłem assetu ${id}`)
  if (asset.proceduralna) throw new Error(`„${asset.nazwa}” jest proceduralny — nie ma map do wyciągnięcia.`)
  log(`Pobieram ${asset.nazwa} (${asset.licencja})…`)
  const blend = await pobierzBlend(asset, rozdzielczosc)
  const roboczy = join(tmpdir(), `blendkit-mapy-${asset.slug}-${Date.now()}`)
  try {
    log(`Blender wyciąga mapy z ${blend.typ} (${blend.mb.toFixed(1)} MB)…`)
    const raport = await wyciagnijMapy(blend.sciezka, roboczy)
    const rodzaje = Object.keys(raport.mapy)
    if (!rodzaje.includes('kolor')) throw new Error(`„${asset.nazwa}” nie ma mapy barwy (węzły: ${raport.material}).`)
    const katalog = join(KATALOG, asset.slug)
    await mkdir(katalog, { recursive: true })
    const skompresowany = await maKoder()
    const mapy = {}
    const odwrocone = []
    const kanaly = {}
    for (const [rodzaj, opis] of Object.entries(raport.mapy)) {
      const zrodlo = join(roboczy, opis.plik)
      if (opis.odwrocona) odwrocone.push(rodzaj)
      if (opis.kanal) kanaly[rodzaj] = opis.kanal
      if (skompresowany) {
        const wyjscie = join(katalog, `${rodzaj}_${rozdzielczosc}.ktx2`)
        await doKtx2(zrodlo, wyjscie, { srgb: SRGB.has(rodzaj), etc1s })
        mapy[rodzaj] = `${KATALOG}/${asset.slug}/${rodzaj}_${rozdzielczosc}.ktx2`
      } else {
        const wyjscie = join(katalog, `${rodzaj}_${rozdzielczosc}${opis.plik.slice(opis.plik.lastIndexOf('.'))}`)
        await writeFile(wyjscie, await readFile(zrodlo))
        mapy[rodzaj] = `${KATALOG}/${asset.slug}/${wyjscie.split('/').pop()}`
      }
      log(`  ${rodzaj.padEnd(13)} ← ${opis.zrodlo}${opis.odwrocona ? ' (odwrócona)' : ''}`)
    }
    const manifest = {
      id: asset.slug, assetBaseId: asset.id, zrodlo: 'blendkit', nazwa: asset.nazwa, autor: asset.autor,
      licencja: asset.licencja, kategoria: asset.kategoria, tagi: asset.tagi, miniatura: asset.miniatura,
      rozmiarM: asset.rozmiarM, rozdzielczosc, kodek: skompresowany ? (etc1s ? 'etc1s' : 'uastc') : 'oryginał',
      mapy, odwrocone, kanaly
    }
    await writeFile(join(katalog, 'mapy.json'), JSON.stringify(manifest, null, 2))
    await dopiszDoKatalogu(manifest)
    return manifest
  } finally {
    await rm(blend.sciezka, { force: true })
    await rm(roboczy, { recursive: true, force: true })
  }
}

/* Katalog lokalnych tekstur — to z niego korzysta edytor po zbudowaniu (na Pages nie ma serwera). */
export async function dopiszDoKatalogu(manifest) {
  const plik = join(KATALOG, 'katalog.json')
  let lista = []
  try {
    lista = JSON.parse(await readFile(plik, 'utf8'))
  } catch {
    /* pierwszy wpis */
  }
  const wpis = {
    id: manifest.id, assetBaseId: manifest.assetBaseId, nazwa: manifest.nazwa, autor: manifest.autor,
    licencja: manifest.licencja, kategoria: manifest.kategoria, tagi: manifest.tagi,
    miniatura: manifest.miniatura, rozmiarM: manifest.rozmiarM, rozdzielczosc: manifest.rozdzielczosc
  }
  lista = [...lista.filter((x) => x.id !== wpis.id), wpis].sort((a, b) => a.nazwa.localeCompare(b.nazwa))
  await mkdir(KATALOG, { recursive: true })
  await writeFile(plik, JSON.stringify(lista, null, 2))
  return lista
}

/* ——— wiersz poleceń ——— */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [polecenie, ...reszta] = process.argv.slice(2)
  const flaga = (nazwa, domyslna) => {
    const i = reszta.indexOf(`--${nazwa}`)
    return i >= 0 ? reszta[i + 1] : domyslna
  }
  const wolne = reszta.filter((a, i) => !a.startsWith('--') && !reszta[i - 1]?.startsWith('--'))
  try {
    if (polecenie === 'szukaj') {
      const { ile, wyniki } = await szukaj(wolne.join(' '), { ile: +flaga('ile', 12), tylkoDarmowe: !reszta.includes('--platne') })
      console.log(`Blendkit: ${ile} materiałów, pokazuję ${wyniki.length}. Wybierz sam — nie decyduję za Ciebie.\n`)
      for (const w of wyniki) {
        console.log(`${w.nazwa}\n  id: ${w.id}\n  ${w.licencja} · ${w.autor} · ${w.kategoria} · ${w.rozmiarM ?? '?'} m · ${w.rozdzielczosci.length} rozdzielczości${w.proceduralna ? ' · PROCEDURALNY (bez map)' : ''}`)
      }
      console.log('\nPobranie: node narzedzia/blendkit.mjs pobierz <id> --res 2k')
    } else if (polecenie === 'pobierz') {
      const m = await pobierzTeksture(wolne[0], { rozdzielczosc: flaga('res', '2k'), etc1s: reszta.includes('--etc1s'), log: (t) => console.log(t) })
      console.log(`\nGotowe: ${KATALOG}/${m.id}/mapy.json · mapy: ${Object.keys(m.mapy).join(', ')}`)
      if (m.licencja !== 'cc_zero') console.log(`Uwaga: licencja ${m.licencja} — tych plików nie wolno publikować w repozytorium.`)
      else console.log(`Licencja CC0 — żeby trafiła na stronę, dopisz w .gitignore wyjątek: !tekstury/${m.id}/`)
    } else {
      console.log('Użycie:\n  node narzedzia/blendkit.mjs szukaj "wood floor" [--ile 12] [--platne]\n  node narzedzia/blendkit.mjs pobierz <assetBaseId> [--res 1k|2k|4k] [--etc1s]')
    }
  } catch (e) {
    console.error(`Błąd: ${e.message}`)
    process.exit(1)
  }
}
