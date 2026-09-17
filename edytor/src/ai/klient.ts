import OpenAI from 'openai'

import { $kluczOpenAI } from './klucz'

/* Klient OpenAI w przeglądarce (klucz użytkownika, bez serwera pośredniczącego).
   Model obrazów „zawsze najnowszy”: z listy modeli konta wybieramy najnowszy gpt-image-*. */
let klient: OpenAI | null = null
let kluczKlienta = ''

export function openai() {
  const klucz = $kluczOpenAI.get()
  if (!klucz) throw new Error('Add an OpenAI API key in Settings (or OPENAI_API_KEY in .env.local for dev).')
  if (!klient || kluczKlienta !== klucz) {
    klient = new OpenAI({ apiKey: klucz, dangerouslyAllowBrowser: true })
    kluczKlienta = klucz
  }
  return klient
}

const ZAPASOWY = 'gpt-image-1'
let najnowszy: Promise<string> | null = null

export function modeleObrazow(): Promise<string[]> {
  return (async () => {
    const lista: { id: string; created: number }[] = []
    for await (const m of openai().models.list()) if (/^gpt-image/.test(m.id)) lista.push(m)
    return lista.sort((a, b) => b.created - a.created).map((m) => m.id)
  })()
}

export function najnowszyModelObrazow() {
  najnowszy ??= modeleObrazow()
    .then((l) => l[0] ?? ZAPASOWY)
    .catch(() => ((najnowszy = null), ZAPASOWY))
  return najnowszy
}
