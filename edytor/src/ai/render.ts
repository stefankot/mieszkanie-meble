import { atom } from 'nanostores'
import { toFile } from 'openai'

import type { Silnik } from '@/silnik/most'

import { mapaKrawedzi, maskaOchrony, przechwycKadr, ROZMIARY, type Orientacja } from './kadr'
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
}
export interface WynikAI { id: string; url: string; opis: string; model: string; orientacja: Orientacja; czas: number }

export const $wynikiAI = atom<WynikAI[]>([])
export const $nakladkaAI = atom<{ id: string; krycie: number; mieszanie: 'normal' | 'luminosity'; porownanie: boolean; podzial: number } | null>(null)

const ZASADY = [
  'Photorealistic interior photograph of exactly this view.',
  'Keep the camera position, perspective, framing, walls, openings and every piece of furniture exactly where and how they are: same sizes, proportions, counts and straight lines.',
  'Do not add, remove or move objects. Improve only materials, lighting, reflections and photographic quality.'
]

export async function renderujAI(s: Silnik, o: OpcjeRenderu): Promise<WynikAI[]> {
  const model = o.model === 'latest' ? await najnowszyModelObrazow() : o.model
  const { kadr, blob } = await przechwycKadr(s, o.orientacja)
  const obrazy = [await toFile(blob, 'kadr.png', { type: 'image/png' })]
  const zasady = [...ZASADY]
  if (o.krawedzie) {
    obrazy.push(await toFile(await mapaKrawedzi(kadr), 'krawedzie.png', { type: 'image/png' }))
    zasady.push('The second image is an edge map of the same view: every edge in the result must match it.')
  }
  const maska = o.chronMebel ? maskaOchrony(s, o.chronMebel, o.orientacja) : null
  if (maska) zasady.push('The masked furniture must stay pixel-identical.')
  const [W, H] = ROZMIARY[o.orientacja]
  const odpowiedz = await openai().images.edit({
    model,
    image: obrazy,
    ...(maska ? { mask: await toFile(await maska, 'maska.png', { type: 'image/png' }) } : {}),
    prompt: `${zasady.join(' ')}\n${o.opis}`.trim(),
    size: `${W}x${H}` as '1536x1024',
    quality: o.jakosc,
    n: o.ile,
    ...(o.wiernosc ? { input_fidelity: 'high' as const } : {})
  })
  const czas = Date.now()
  const nowe = (odpowiedz.data ?? []).flatMap((d, i) => (d.b64_json ? [{ id: `${czas}-${i}`, url: `data:image/png;base64,${d.b64_json}`, opis: o.opis, model, orientacja: o.orientacja, czas }] : []))
  if (!nowe.length) throw new Error('The image model returned no images.')
  $wynikiAI.set([...nowe, ...$wynikiAI.get()].slice(0, 24))
  $nakladkaAI.set({ id: nowe[0].id, krycie: 1, mieszanie: 'normal', porownanie: true, podzial: 0.5 })
  return nowe
}
