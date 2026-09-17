import type { KeyBindingMap } from 'tinykeys'

import { cofnij, ponow } from './projekt/projekt'
import { $silnik } from './silnik/most'
import { $czescZaznaczona, $narzedzie, $oknoMaterialu, $paletaPolecenOtwarta, $tryb, $zaznaczenie } from './stan'

/* Skróty powłoki — rejestrowane na oknie edytora i na oknie ramki renderera.
   Litery i Esc nie działają w polach tekstowych (router klawiatury z kopii Codex). */
const EDYTOWALNE = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]'
const wPolu = (e: KeyboardEvent) => e.composedPath().some((w) => (w as Element).matches?.(EDYTOWALNE))
const poza = (fn: (e: KeyboardEvent) => void) => (e: KeyboardEvent) => {
  if (wPolu(e)) return
  e.preventDefault()
  fn(e)
}
const wEdycji = (fn: (e: KeyboardEvent) => void) => poza((e) => $tryb.get() === 'edit' && fn(e))

export const skrotyPowloki: KeyBindingMap = {
  '$mod+KeyK': (e) => {
    e.preventDefault()
    $paletaPolecenOtwarta.set(true)
  },
  '$mod+KeyZ': poza(() => cofnij()),
  '$mod+Shift+KeyZ': poza(() => ponow()),
  KeyV: wEdycji(() => $narzedzie.set('zaznacz')),
  KeyG: wEdycji(() => $narzedzie.set('przesun')),
  KeyR: wEdycji(() => $narzedzie.set('obroc')),
  // F — kadr zaznaczonego mebla (istniejące kadrowanie silnika z kolizjami).
  KeyF: wEdycji(() => {
    const s = $silnik.get() as any
    const korzen = s?.scene.getObjectByName(`biblioteka:${$zaznaczenie.get()}`)
    if (korzen) s.nawigacja.kadrujMebel(korzen)
  }),
  Escape: (e) => {
    if (wPolu(e) || $tryb.get() !== 'edit') return
    if ($oknoMaterialu.get()) return $oknoMaterialu.set(null)
    $zaznaczenie.set(null)
    $czescZaznaczona.set(null)
  }
}
