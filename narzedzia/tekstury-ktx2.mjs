#!/usr/bin/env node
/* ============================================================
   TEKSTURY → KTX2 (Basis UASTC/ETC1S)
   ------------------------------------------------------------
   Żadna biblioteka (Poly Haven, Poliigon, ambientCG) nie wydaje BC7, ASTC ani KTX2 — dostajemy JPG/PNG/EXR.
   Kompresję dla GPU robimy u siebie: KTX2 z Basis Universal transkoduje się w przeglądarce do formatu,
   który obsługuje karta: BC7 na desktopie, ASTC na telefonach, ETC2 tam, gdzie nie ma nic lepszego.

   Wymaga `basisu` (KTX-Software/Basis Universal): `brew install basis-universal`.
   Użycie:
     node narzedzia/tekstury-ktx2.mjs old_wood_floor 2k
     node narzedzia/tekstury-ktx2.mjs --plik moja-tekstura.png --linear
   Wynik: tekstury/<id>/<mapa>_<rozdzielczosc>.ktx2 + tekstury/<id>/mapy.json (adresy dla edytora).
   ============================================================ */
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const uruchom = promisify(execFile)
const API = 'https://api.polyhaven.com'
/* Mapy barwy idą jako sRGB, mapy danych (normalne, ARM, wysokość) liniowo — inaczej normalne się przekłamują. */
const MAPY = { kolor: { pole: 'Diffuse', srgb: true }, normalna: { pole: 'nor_gl' }, arm: { pole: 'arm' }, wysokosc: { pole: 'Displacement' } }

async function jest(program) {
  try {
    await uruchom(program, ['-version'])
    return true
  } catch {
    return false
  }
}

async function pobierz(url, cel) {
  const odp = await fetch(url)
  if (!odp.ok) throw new Error(`${odp.status} ${url}`)
  await writeFile(cel, Buffer.from(await odp.arrayBuffer()))
  return (await stat(cel)).size
}

/* UASTC: wysoka jakość, stały rozmiar w pamięci GPU (BC7/ASTC). ETC1S: mniejszy plik, słabszy przy normalnych. */
async function doKtx2(wejscie, wyjscie, { srgb = false, etc1s = false } = {}) {
  const flagi = ['-ktx2', '-mipmap', '-file', wejscie, '-output_file', wyjscie]
  if (!etc1s) flagi.push('-uastc')
  if (!srgb) flagi.push('-linear')
  await uruchom('basisu', flagi)
  return (await stat(wyjscie)).size
}

const argumenty = process.argv.slice(2)
if (!argumenty.length || argumenty.includes('--pomoc')) {
  console.log('Użycie: node narzedzia/tekstury-ktx2.mjs <id-tekstury> [1k|2k|4k] [--etc1s]\n        node narzedzia/tekstury-ktx2.mjs --plik <obraz> [--srgb] [--etc1s]')
  process.exit(0)
}
if (!(await jest('basisu'))) {
  console.error('Brak `basisu`. Zainstaluj: brew install basis-universal (albo KTX-Software: `toktx`).')
  process.exit(1)
}
const etc1s = argumenty.includes('--etc1s')

if (argumenty[0] === '--plik') {
  const plik = argumenty[1]
  const wyjscie = plik.replace(/\.[^.]+$/, '.ktx2')
  const rozmiar = await doKtx2(plik, wyjscie, { srgb: argumenty.includes('--srgb'), etc1s })
  console.log(`${basename(wyjscie)} — ${(rozmiar / 1024).toFixed(0)} kB`)
  process.exit(0)
}

const [id, rozdzielczosc = '2k'] = argumenty
const pliki = await (await fetch(`${API}/files/${id}`)).json()
const katalog = join('tekstury', id)
await mkdir(katalog, { recursive: true })
const manifest = {}
let zrodloRazem = 0
let ktx2Razem = 0
for (const [nazwa, opis] of Object.entries(MAPY)) {
  const wpis = pliki?.[opis.pole]?.[rozdzielczosc]?.jpg ?? pliki?.[opis.pole]?.[rozdzielczosc]?.png
  if (!wpis) continue
  const tymczasowy = join(katalog, `_${nazwa}.${wpis.url.split('.').pop()}`)
  const wyjscie = join(katalog, `${nazwa}_${rozdzielczosc}.ktx2`)
  zrodloRazem += await pobierz(wpis.url, tymczasowy)
  ktx2Razem += await doKtx2(tymczasowy, wyjscie, { srgb: !!opis.srgb, etc1s })
  await rm(tymczasowy)
  manifest[nazwa] = `tekstury/${id}/${nazwa}_${rozdzielczosc}.ktx2`
  console.log(`${nazwa.padEnd(10)} → ${basename(wyjscie)}`)
}
await writeFile(join(katalog, 'mapy.json'), JSON.stringify({ id, rozdzielczosc, kodek: etc1s ? 'etc1s' : 'uastc', licencja: 'CC0 · Poly Haven', mapy: manifest }, null, 2))
console.log(`\nŹródło (JPG): ${(zrodloRazem / 1048576).toFixed(1)} MB → KTX2: ${(ktx2Razem / 1048576).toFixed(1)} MB (${Math.round((ktx2Razem / zrodloRazem) * 100)}%)`)
console.log(`Manifest: ${join(katalog, 'mapy.json')}`)
