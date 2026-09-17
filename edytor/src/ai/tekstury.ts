import { najnowszyModelObrazow, openai } from './klient'

/* Tekstura z opisu: płaski, bezszwowy kafel (bez perspektywy i cieni), gotowy do powtarzania na meblu. */
const WYTYCZNE =
  'Seamless tileable material texture, flat orthographic top-down scan, uniform soft lighting, no shadows, no perspective, no objects, no text, edges wrap perfectly.'

export async function generujTeksture(opis: string, { jakosc = 'medium' as 'low' | 'medium' | 'high' } = {}) {
  const model = await najnowszyModelObrazow()
  const wynik = await (await openai()).images.generate({ model, prompt: `${WYTYCZNE}\nMaterial: ${opis}`, size: '1024x1024', quality: jakosc, n: 1 })
  const b64 = wynik.data?.[0]?.b64_json
  if (!b64) throw new Error('The image model returned no texture.')
  return `data:image/png;base64,${b64}`
}
