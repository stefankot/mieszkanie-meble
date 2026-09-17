import { map } from 'nanostores'

import { $silnik, type Silnik } from './most'
import { widokPokoju } from './punktWidoku'
import { poDuzejZmianie } from './zmiany'

/* Miniatury scen (D5 Scene List) renderowane poza ekranem z punktu widoku każdego pokoju — kamera użytkownika
   stoi w miejscu. Odświeżane 5 s po dużej zmianie mebla oraz raz dla scen bez miniatury.
   Render trafia do celu float bez post-processingu, więc ACES, ekspozycję i sRGB liczymy tutaj. */
export const $miniatury = map<Record<string, string>>(wczytaj())

const KLUCZ = 'edytor:miniatury:v2'
const SZER = 192
const WYS = 108
const NADPROBKA = 2

function wczytaj(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KLUCZ) ?? '{}')
  } catch {
    return {}
  }
}

function zapisz() {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify($miniatury.get()))
  } catch {
    /* pełny localStorage — miniatury zostają w pamięci */
  }
}

// three.js ACESFilmicToneMapping (dopasowanie RRT+ODT) na pikselu liniowym.
function aces(r: number, g: number, b: number, ekspozycja: number): [number, number, number] {
  const e = ekspozycja / 0.6
  r *= e; g *= e; b *= e
  const a = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b]
  const [x, y, z] = a.map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081))
  return [1.60475 * x - 0.53108 * y - 0.07367 * z, -0.10208 * x + 1.10813 * y - 0.00605 * z, -0.00327 * x - 0.07276 * y + 1.07602 * z]
}
const srgb = (c: number) => 255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))

function klatka(s: Silnik) {
  const okno = s.renderer.domElement.ownerDocument.defaultView as Window
  return new Promise((gotowe) => okno.requestAnimationFrame(gotowe))
}

async function renderuj(s: Silnik, punkt: { pozycja: any; cel: any }): Promise<string | null> {
  const T = s.THREE
  const r = s.renderer
  const w = SZER * NADPROBKA
  const h = WYS * NADPROBKA
  const cel = new T.RenderTarget(w, h, { type: T.FloatType, depthBuffer: true })
  const kamera = new T.PerspectiveCamera(s.camera.fov, w / h, s.camera.near, s.camera.far)
  kamera.layers.mask = s.camera.layers.mask
  kamera.position.copy(punkt.pozycja)
  kamera.lookAt(punkt.cel)
  kamera.updateMatrixWorld()
  try {
    // Między klatkami silnika: jego render jest w całości w jednym zadaniu.
    await klatka(s)
    const poprzedni = r.getRenderTarget()
    r.setRenderTarget(cel)
    r.render(s.scene, kamera)
    r.setRenderTarget(poprzedni)
    const piksele: Float32Array = await r.readRenderTargetPixelsAsync(cel, 0, 0, w, h)
    const obraz = new ImageData(w, h)
    const ekspozycja = r.toneMappingExposure ?? 1
    for (let i = 0; i < w * h * 4; i += 4) {
      const [cr, cg, cb] = aces(piksele[i], piksele[i + 1], piksele[i + 2], ekspozycja)
      obraz.data[i] = srgb(cr)
      obraz.data[i + 1] = srgb(cg)
      obraz.data[i + 2] = srgb(cb)
      obraz.data[i + 3] = 255
    }
    const duzy = new OffscreenCanvas(w, h)
    duzy.getContext('2d')!.putImageData(obraz, 0, 0)
    const maly = document.createElement('canvas')
    maly.width = SZER
    maly.height = WYS
    const g = maly.getContext('2d')!
    g.imageSmoothingQuality = 'high'
    g.drawImage(duzy, 0, 0, SZER, WYS)
    return maly.toDataURL('image/jpeg', 0.8)
  } catch (e) {
    console.warn('Miniatura sceny nie powstała', e)
    return null
  } finally {
    cel.dispose()
  }
}

let trwa = false
export async function odswiezMiniatury(tylkoBrakujace = false) {
  const s = $silnik.get()
  if (!s || trwa) return
  trwa = true
  try {
    for (const punkt of s.nawigacja.punktyMapy()) {
      if (tylkoBrakujace && $miniatury.get()[punkt.id]) continue
      const url = await renderuj(s, widokPokoju(s, punkt))
      if (url) $miniatury.setKey(punkt.id, url)
    }
    zapisz()
  } finally {
    trwa = false
  }
}

let wypisz: (() => void) | undefined
$silnik.subscribe((s) => {
  wypisz?.()
  if (!s) return
  wypisz = poDuzejZmianie(5000, () => odswiezMiniatury())
  // Stare miniatury (v1) bywały kadrem z przejścia — pierwsze uruchomienie tworzy brakujące.
  setTimeout(() => odswiezMiniatury(true), 3000)
})
