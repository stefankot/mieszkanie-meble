import { map } from 'nanostores'

import { $silnik, type Silnik } from './most'
import { widokPokoju } from './punktWidoku'
import { doObrazu, renderujDoObrazu } from './tonowanie'
import { poDuzejZmianie } from './zmiany'

/* Miniatury scen (D5 Scene List) renderowane poza ekranem z punktu widoku każdego pokoju — kamera użytkownika
   stoi w miejscu. Odświeżane 5 s po dużej zmianie mebla oraz raz dla scen bez miniatury.
   Render trafia do celu float bez post-processingu (tonowanie w `tonowanie.ts`). */
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

async function renderuj(s: Silnik, punkt: { pozycja: any; cel: any }): Promise<string | null> {
  const T = s.THREE
  const w = SZER * NADPROBKA
  const h = WYS * NADPROBKA
  const kamera = new T.PerspectiveCamera(s.camera.fov, w / h, s.camera.near, s.camera.far)
  kamera.layers.mask = s.camera.layers.mask
  kamera.position.copy(punkt.pozycja)
  kamera.lookAt(punkt.cel)
  kamera.updateMatrixWorld()
  try {
    const piksele = await renderujDoObrazu(s, s.scene, kamera, w, h)
    return doObrazu(piksele, w, h, s.renderer.toneMappingExposure ?? 1, { szer: SZER, wys: WYS })
  } catch (e) {
    console.warn('Miniatura sceny nie powstała', e)
    return null
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
