import { atom } from 'nanostores'

/* Klucz OpenAI: najpierw zapisany w tej przeglądarce (ustawienia), a w trybie dev — z `.env.local`
   przez serwer Vite (`/__lokalne/openai`). W kodzie i w repo nie ma klucza. */
const MIEJSCE = 'edytor:openai-klucz'
export const $kluczOpenAI = atom('')

try {
  $kluczOpenAI.set(localStorage.getItem(MIEJSCE) ?? '')
} catch {
  /* brak dostępu do localStorage */
}

if (import.meta.env.DEV && !$kluczOpenAI.get()) {
  fetch('/__lokalne/openai')
    .then((r) => r.json())
    .then(({ klucz }) => klucz && !$kluczOpenAI.get() && $kluczOpenAI.set(klucz))
    .catch(() => {})
}

export function zapiszKlucz(klucz: string) {
  $kluczOpenAI.set(klucz.trim())
  try {
    if (klucz.trim()) localStorage.setItem(MIEJSCE, klucz.trim())
    else localStorage.removeItem(MIEJSCE)
  } catch {
    /* klucz zostaje w pamięci do przeładowania */
  }
}
