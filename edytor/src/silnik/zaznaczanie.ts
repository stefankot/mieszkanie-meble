import type { Silnik } from './most'

/* Zaznaczanie kliknięciem w scenie (przeniesione z kopii Codex: selection-controller). Trafienie rozwiązujemy
   do mebla (`biblioteka:<id>`) i części (`<id>:<część>`); niewidoczne obiekty są pomijane. Przeciągnięcie > 5 px
   to rozglądanie, nie klik. Gdy zaznaczanie jest aktywne, klik nie wywołuje Point & Go silnika. */
export interface Zaznaczenie { mebel: string; czesc: string | null; obiekt: any }

export function rozwiazZaznaczenie(obiekt: any): Zaznaczenie | null {
  let czesc: string | null = null
  for (let w = obiekt; w; w = w.parent) {
    const nazwa: string = w.name ?? ''
    if (nazwa.startsWith('biblioteka:')) return { mebel: nazwa.slice(11), czesc, obiekt: w }
    const m = /^([\w-]+):(.+)$/.exec(nazwa)
    if (!czesc && m && !nazwa.startsWith('biblioteka:')) czesc = m[2]
  }
  return null
}

const widoczny = (o: any) => {
  for (let w = o; w; w = w.parent) if (w.visible === false) return false
  return true
}

export function uruchomZaznaczanie(s: Silnik, { aktywne, wybierz }: { aktywne: () => boolean; wybierz: (z: Zaznaczenie | null) => void }) {
  const T = s.THREE
  const plotno = s.renderer.domElement as HTMLCanvasElement
  const promien = new T.Raycaster()
  let start: { x: number; y: number } | null = null
  const wcisniecie = (e: PointerEvent) => {
    start = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
  }
  const anuluj = () => (start = null)
  const klik = (e: MouseEvent) => {
    const poczatek = start
    start = null
    if (!aktywne() || !poczatek || Math.hypot(e.clientX - poczatek.x, e.clientY - poczatek.y) > 5) return
    const r = plotno.getBoundingClientRect()
    promien.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), s.camera)
    e.stopImmediatePropagation()
    for (const t of promien.intersectObjects(s.scene.children, true)) {
      if (!widoczny(t.object) || t.object.name === 'Pasek LED') continue
      const z = rozwiazZaznaczenie(t.object)
      if (z) return wybierz(z)
    }
    wybierz(null)
  }
  plotno.addEventListener('pointerdown', wcisniecie, true)
  plotno.addEventListener('pointercancel', anuluj, true)
  plotno.addEventListener('click', klik, true)
  return () => {
    plotno.removeEventListener('pointerdown', wcisniecie, true)
    plotno.removeEventListener('pointercancel', anuluj, true)
    plotno.removeEventListener('click', klik, true)
  }
}
