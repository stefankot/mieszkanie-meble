import type OpenAI from 'openai'

import { $kluczOpenAI } from './klucz'

/* Klient OpenAI w przeglądarce (klucz użytkownika, bez serwera pośredniczącego). Biblioteka ładowana dopiero
   przy pierwszym użyciu AI — nie spowalnia startu edytora.
   Model obrazów „zawsze najnowszy”: z listy modeli konta wybieramy najnowszy gpt-image-*. */
let klient: OpenAI | null = null
let kluczKlienta = ''

export async function openai() {
  const klucz = $kluczOpenAI.get()
  if (!klucz) throw new Error('Add an OpenAI API key in Settings (or OPENAI_API_KEY in .env.local for dev).')
  if (!klient || kluczKlienta !== klucz) {
    const { default: OpenAIKlient } = await import('openai')
    klient = new OpenAIKlient({ apiKey: klucz, dangerouslyAllowBrowser: true })
    kluczKlienta = klucz
  }
  return klient
}

const ZAPASOWY = 'gpt-image-1'
/* Modele nietekstowe albo nieobsługujące Responses z narzędziami (live, transkrypcja, obraz, dźwięk…).
   Pominięcie „live” jest istotne: `gpt-live-*` jest najnowszy na liście, ale na Responses zwraca 500. */
const NIE_TEKSTOWE = /image|audio|tts|whisper|transcribe|realtime|live|embedding|moderation|search|computer|sora|codex|instruct/i

/* Najnowszy model z danej rodziny na koncie — bez wpisywania nazw na sztywno. */
async function najnowszyZListy(pasuje: (id: string) => boolean, zapasowy: string) {
  try {
    const lista: { id: string; created: number }[] = []
    for await (const m of (await openai()).models.list()) if (pasuje(m.id)) lista.push(m)
    return lista.sort((a, b) => b.created - a.created)[0]?.id ?? zapasowy
  } catch {
    return zapasowy
  }
}

let tekstowy: Promise<string> | null = null
export const najnowszyModelTekstowy = () => (tekstowy ??= najnowszyZListy((id) => /^(gpt|o\d)/i.test(id) && !NIE_TEKSTOWE.test(id), 'gpt-4.1'))

let realtime: Promise<string> | null = null
export const najnowszyModelRealtime = () => (realtime ??= najnowszyZListy((id) => /realtime/i.test(id) && !/whisper|translate|transcribe/i.test(id), 'gpt-realtime'))
let najnowszy: Promise<string> | null = null

export function modeleObrazow(): Promise<string[]> {
  return (async () => {
    const lista: { id: string; created: number }[] = []
    for await (const m of (await openai()).models.list()) if (/^gpt-image/.test(m.id)) lista.push(m)
    return lista.sort((a, b) => b.created - a.created).map((m) => m.id)
  })()
}

export function najnowszyModelObrazow() {
  najnowszy ??= modeleObrazow()
    .then((l) => l[0] ?? ZAPASOWY)
    .catch(() => ((najnowszy = null), ZAPASOWY))
  return najnowszy
}
