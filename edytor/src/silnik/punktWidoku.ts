import type { Silnik } from './most'

/* Punkt widoku sceny. Silnik celuje wzrokiem w wybrany obiekt, który bywa za ścianą (WC, łazienka) —
   wtedy kadr to sama ściana. Gdy promień do celu trafia przeszkodę wcześniej niż w 70% drogi,
   wybieramy kierunek z najdłuższym wolnym widokiem (16 azymutów na wysokości oczu). Jednostki: cm. */
export type Punkt = ReturnType<Silnik['nawigacja']['punktyMapy']>[number]

const ZASIEG = 900

export function widokPokoju(s: Silnik, punkt: Punkt): { pozycja: any; cel: any } {
  const T = s.THREE
  const promien = new T.Raycaster()
  const wolnaDroga = (kierunek: any) => {
    promien.set(punkt.pozycja, kierunek)
    promien.far = ZASIEG
    const t = promien.intersectObjects(s.scene.children, true).find((x: any) => x.object.visible && x.object.isMesh && !x.object.isLight)
    return t?.distance ?? ZASIEG
  }
  const doCelu = punkt.cel.clone().sub(punkt.pozycja)
  if (wolnaDroga(doCelu.clone().normalize()) >= doCelu.length() * 0.7) return punkt
  let najlepszy = { droga: 0, kierunek: new T.Vector3(1, 0, 0) }
  for (let i = 0; i < 16; i++) {
    const kat = (i / 16) * Math.PI * 2
    const kierunek = new T.Vector3(Math.cos(kat), -0.12, Math.sin(kat)).normalize()
    const droga = wolnaDroga(kierunek)
    if (droga > najlepszy.droga) najlepszy = { droga, kierunek }
  }
  return { pozycja: punkt.pozycja, cel: punkt.pozycja.clone().addScaledVector(najlepszy.kierunek, Math.min(najlepszy.droga, 400)) }
}
