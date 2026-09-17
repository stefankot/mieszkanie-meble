import { atom } from 'nanostores'

import type { Silnik } from '@/silnik/most'

import { mapaKrawedzi, przechwycKadr, ROZMIARY, type Orientacja } from './kadr'
import { najnowszyModelObrazow, openai } from './klient'

/* Render AI na bazie kadru silnika (images.edit). Ograniczenie zniekształceń: wysoka wierność wejścia,
   mapa krawędzi jako drugi obraz-wzorzec, maska chroniąca zaznaczony mebel i instrukcja zachowania geometrii. */
export interface OpcjeRenderu {
  model: string | 'latest'
  orientacja: Orientacja
  jakosc: 'low' | 'medium' | 'high' | 'auto'
  ile: number
  opis: string
  wiernosc: boolean
  krawedzie: boolean
  chronMebel: string | null
  kanaly: boolean
}
export interface WynikAI { id: string; url: string; zrodlo: string; ekran: { fx: number; fy: number }; opis: string; model: string; orientacja: Orientacja; czas: number }

export const $wynikiAI = atom<WynikAI[]>([])

/* Modele, które odrzuciły `input_fidelity` (np. gpt-image-2.5) — zapamiętane w przeglądarce,
   żeby kolejne rendery nie traciły zapytania na błąd 400. */
const BEZ_WIERNOSCI = 'edytor:ai:bez-input-fidelity'
export const $modeleBezWiernosci = atom<string[]>(wczytajListe())
function wczytajListe(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BEZ_WIERNOSCI) ?? '[]')
  } catch {
    return []
  }
}
function zapamietajBezWiernosci(model: string) {
  const lista = [...new Set([...$modeleBezWiernosci.get(), model])]
  $modeleBezWiernosci.set(lista)
  try {
    localStorage.setItem(BEZ_WIERNOSCI, JSON.stringify(lista))
  } catch {
    /* lista zostaje w pamięci */
  }
}
const odrzucilWiernosc = (e: unknown) => (e as { status?: number })?.status === 400 && /input_fidelity/.test(String((e as Error)?.message))
export const $nakladkaAI = atom<{ id: string; krycie: number; mieszanie: 'normal' | 'luminosity'; porownanie: boolean; podzial: number } | null>(null)

const ZASADY = [
  'Photorealistic interior photograph of exactly this view, filling the whole frame edge to edge.',
  'Keep the camera position, perspective, framing, walls, openings and every piece of furniture exactly where and how they are: same sizes, proportions, counts and straight lines.',
  'Do not add, remove or move objects. Improve only materials, lighting, reflections and photographic quality.'
]

export async function renderujAI(s: Silnik, o: OpcjeRenderu): Promise<WynikAI[]> {
  const model = o.model === 'latest' ? await najnowszyModelObrazow() : o.model
  const { kadr, blob, maska, kanaly, ekran } = await przechwycKadr(s, o.orientacja, o.chronMebel, o.kanaly)
  const zrodlo = kadr.toDataURL('image/jpeg', 0.9)
  const { toFile } = await import('openai')
  const obrazy = [await toFile(blob, 'kadr.png', { type: 'image/png' })]
  const zasady = [...ZASADY]
  if (o.krawedzie) {
    obrazy.push(await toFile(await mapaKrawedzi(kadr), 'krawedzie.png', { type: 'image/png' }))
    zasady.push('The second image is an edge map of the same view: every edge in the result must match it.')
  }
  if (kanaly) {
    obrazy.push(await toFile(kanaly.normalne, 'normalne.png', { type: 'image/png' }), await toFile(kanaly.glebia, 'glebia.png', { type: 'image/png' }))
    zasady.push('The next images are a surface-normal map and a depth map of the same view: keep every surface orientation and distance as shown.')
  }
  if (maska) zasady.push('The masked furniture must stay pixel-identical.')
  const [W, H] = ROZMIARY[o.orientacja]
  const plikMaski = maska ? await toFile(maska, 'maska.png', { type: 'image/png' }) : null
  const wyslij = async (wiernosc: boolean) =>
    (await openai()).images.edit({
      model,
      image: obrazy,
      ...(plikMaski ? { mask: plikMaski } : {}),
      prompt: `${zasady.join(' ')}\n${o.opis}`.trim(),
      size: `${W}x${H}` as '1536x1024',
      quality: o.jakosc,
      n: o.ile,
      ...(wiernosc ? { input_fidelity: 'high' as const } : {})
    })
  const wiernosc = o.wiernosc && !$modeleBezWiernosci.get().includes(model)
  let odpowiedz
  try {
    odpowiedz = await wyslij(wiernosc)
  } catch (e) {
    // Model bez obsługi input_fidelity: powtarzamy bez parametru i zapamiętujemy to dla modelu.
    if (!wiernosc || !odrzucilWiernosc(e)) throw e
    zapamietajBezWiernosci(model)
    odpowiedz = await wyslij(false)
  }
  const czas = Date.now()
  const nowe = (odpowiedz.data ?? []).flatMap((d, i) => (d.b64_json ? [{ id: `${czas}-${i}`, url: `data:image/png;base64,${d.b64_json}`, zrodlo, ekran, opis: o.opis, model, orientacja: o.orientacja, czas }] : []))
  if (!nowe.length) throw new Error('The image model returned no images.')
  $wynikiAI.set([...nowe, ...$wynikiAI.get()].slice(0, 24))
  $nakladkaAI.set({ id: nowe[0].id, krycie: 1, mieszanie: 'normal', porownanie: true, podzial: 0.5 })
  return nowe
}
