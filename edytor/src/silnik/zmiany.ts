import { atom } from 'nanostores'

import { $silnik, type Silnik } from './most'

/* Duża zmiana sceny: mebel przesunięty o > 30 cm, obrócony o > 5°, dodany lub usunięty — albo jawnie zgłoszona
   zmiana palety czy materiału grupy. Drobne zmiany (półki, drzwiczki, detale) jej nie wywołują.
   Odbiorcy (miniatury scen, mapa) reagują z opóźnieniem, żeby seria zmian dała jedno odświeżenie. */
export const $duzaZmiana = atom(0)

const PROG_CM = 30
const PROG_KATA = (5 * Math.PI) / 180
const migawka = new Map<string, { x: number; z: number; kat: number }>()

export const zglosDuzaZmiane = () => $duzaZmiana.set($duzaZmiana.get() + 1)

function sprawdz(s: Silnik) {
  const T = s.THREE
  const p = new T.Vector3()
  const obecne = new Set<string>()
  let zmiana = false
  s.scene.traverse((o: any) => {
    if (!o.name?.startsWith('biblioteka:')) return
    obecne.add(o.name)
    o.getWorldPosition(p)
    const teraz = { x: p.x, z: p.z, kat: o.rotation.y }
    const bylo = migawka.get(o.name)
    if (bylo && Math.hypot(teraz.x - bylo.x, teraz.z - bylo.z) <= PROG_CM && Math.abs(teraz.kat - bylo.kat) <= PROG_KATA) return
    zmiana ||= !!bylo || migawka.size > 0
    migawka.set(o.name, teraz)
  })
  for (const nazwa of migawka.keys()) if (!obecne.has(nazwa)) (migawka.delete(nazwa), (zmiana = true))
  if (zmiana) zglosDuzaZmiane()
}

let petla: ReturnType<typeof setInterval> | undefined
$silnik.subscribe((s) => {
  clearInterval(petla)
  migawka.clear()
  if (s) petla = setInterval(() => sprawdz(s), 1000)
})

/* Wywołuje `fn` raz, `ms` po ostatniej dużej zmianie. Zwraca funkcję wypisania. */
export function poDuzejZmianie(ms: number, fn: () => void) {
  let czasomierz: ReturnType<typeof setTimeout> | undefined
  const wypisz = $duzaZmiana.listen(() => {
    clearTimeout(czasomierz)
    czasomierz = setTimeout(fn, ms)
  })
  return () => (clearTimeout(czasomierz), wypisz())
}
