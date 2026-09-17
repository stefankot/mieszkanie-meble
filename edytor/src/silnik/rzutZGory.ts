import type { Silnik } from './most'
import { doObrazu, renderujDoObrazu } from './tonowanie'

/* Rzut mieszkania z góry, prostopadle do podłogi: kamera ortograficzna pod sufitem (sufit i lampy nad nią
   nie wchodzą w kadr). Obraz w układzie mapy: w prawo +X, w dół +Z (jednostki sceny: cm). */
export interface Granice { minX: number; minZ: number; szer: number; wys: number }

export function granicePlanu(s: Silnik, margines = 16): Granice {
  const punkty = s.nawigacja.pokoje.flatMap((p: any) => p.polygon as [number, number][])
  const xs = punkty.map((p) => p[0])
  const zs = punkty.map((p) => p[1])
  const minX = Math.min(...xs) - margines
  const minZ = Math.min(...zs) - margines
  return { minX, minZ, szer: Math.max(...xs) + margines - minX, wys: Math.max(...zs) + margines - minZ }
}

export async function renderujRzut(s: Silnik, g: Granice, szerokoscObrazu = 480) {
  const T = s.THREE
  const kamera = new T.OrthographicCamera(-g.szer / 2, g.szer / 2, g.wys / 2, -g.wys / 2, 1, 400)
  kamera.position.set(g.minX + g.szer / 2, 228, g.minZ + g.wys / 2)
  kamera.up.set(0, 0, -1)
  kamera.lookAt(kamera.position.x, 0, kamera.position.z)
  kamera.updateMatrixWorld()
  const wysokoscObrazu = Math.round((szerokoscObrazu * g.wys) / g.szer)
  const w = szerokoscObrazu * 2
  const h = wysokoscObrazu * 2
  const piksele = await renderujDoObrazu(s, s.scene, kamera, w, h)
  // Widok z góry łapie mniej światła niż kadr na wysokości oczu — rozjaśniamy, żeby plan był czytelny.
  return doObrazu(piksele, w, h, (s.renderer.toneMappingExposure ?? 1) * 1.8, { szer: szerokoscObrazu, wys: wysokoscObrazu })
}
