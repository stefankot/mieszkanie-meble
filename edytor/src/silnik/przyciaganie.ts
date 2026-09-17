import type { Silnik } from './most'

/* Przyciąganie mebla do ścian (decyzja użytkownika: tylko do ścian). Bierzemy bryły ścian z planu silnika,
   szukamy najbliższej ściany w zasięgu i dosuwamy mebel plecami do niej, obracając go do jej płaszczyzny.
   Jednostki sceny: cm; położenie w dokumencie: mm. */
export interface Umiejscowienie { positionMm: [number, number, number]; rotationDeg: number }

const ZASIEG_CM = 30

export function wymiaryKorzenia(s: Silnik, mebel: string) {
  const korzen = s.scene.getObjectByName(`biblioteka:${mebel}`)
  if (!korzen) return null
  const T = s.THREE
  const pudlo = new T.Box3().setFromObject(korzen)
  const rozmiar = pudlo.getSize(new T.Vector3())
  const srodek = pudlo.getCenter(new T.Vector3())
  return { korzen, pudlo, rozmiar, srodek }
}

/* Zwraca poprawione umiejscowienie (albo to samo, gdy nie ma ściany w zasięgu). */
export function przyciagnijDoSciany(s: Silnik | null, mebel: string, u: Umiejscowienie): Umiejscowienie {
  const plan = (s as any)?.plan
  const w = s && wymiaryKorzenia(s, mebel)
  if (!plan?.wallBoxes || !w) return u
  const [x, , z] = u.positionMm.map((v) => v / 10)
  const polSzer = w.rozmiar.x / 2
  const polGleb = w.rozmiar.z / 2
  let najlepsze: { odleglosc: number; x: number; z: number; obrot: number } | null = null
  for (const sciana of plan.wallBoxes) {
    const srodek = { x: (sciana.min.x + sciana.max.x) / 2, z: (sciana.min.z + sciana.max.z) / 2 }
    const pionowa = sciana.max.x - sciana.min.x < sciana.max.z - sciana.min.z
    const odleglosc = pionowa ? Math.abs(x - srodek.x) - polSzer : Math.abs(z - srodek.z) - polGleb
    if (odleglosc > ZASIEG_CM || odleglosc < -ZASIEG_CM * 4) continue
    // Plecy mebla (lokalne −Z) dosuwamy do lica ściany; obrót wynika ze strony, po której stoi mebel.
    const kandydat = pionowa
      ? { x: x > srodek.x ? sciana.max.x + polGleb : sciana.min.x - polGleb, z, obrot: x > srodek.x ? 90 : 270 }
      : { x, z: z > srodek.z ? sciana.max.z + polGleb : sciana.min.z - polGleb, obrot: z > srodek.z ? 0 : 180 }
    const dystans = Math.hypot(kandydat.x - x, kandydat.z - z)
    if (!najlepsze || dystans < najlepsze.odleglosc) najlepsze = { odleglosc: dystans, ...kandydat }
  }
  if (!najlepsze) return u
  return { positionMm: [Math.round(najlepsze.x * 10), u.positionMm[1], Math.round(najlepsze.z * 10)], rotationDeg: najlepsze.obrot }
}
