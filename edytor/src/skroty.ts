import type { KeyBindingMap } from 'tinykeys'

import { $paletaPolecenOtwarta } from './stan'

/* Skróty powłoki — rejestrowane na oknie edytora i na oknie ramki renderera. */
export const skrotyPowloki: KeyBindingMap = {
  '$mod+KeyK': (e) => {
    e.preventDefault()
    $paletaPolecenOtwarta.set(true)
  }
}
