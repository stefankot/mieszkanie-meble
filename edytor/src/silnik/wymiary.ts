import type { Silnik } from './most'

/* Wymiary i położenie mebla ze sceny (jednostki sceny: cm → wynik w mm). Korzeń mebla: `biblioteka:<id>`. */
export interface WymiaryMebla { szerokosc: number; wysokosc: number; glebokosc: number; x: number; y: number; obrot: number }

export function wymiaryMebla(s: Silnik | null, id: string): WymiaryMebla | null {
  const korzen = s?.scene.getObjectByName(`biblioteka:${id}`)
  if (!s || !korzen) return null
  const T = s.THREE
  const pudlo = new T.Box3().setFromObject(korzen)
  const rozmiar = pudlo.getSize(new T.Vector3())
  const srodek = pudlo.getCenter(new T.Vector3())
  return {
    szerokosc: Math.round(Math.max(rozmiar.x, rozmiar.z) * 10),
    wysokosc: Math.round(rozmiar.y * 10),
    glebokosc: Math.round(Math.min(rozmiar.x, rozmiar.z) * 10),
    x: Math.round(srodek.x * 10),
    y: Math.round(srodek.z * 10),
    obrot: Math.round(T.MathUtils.radToDeg(korzen.rotation.y))
  }
}
