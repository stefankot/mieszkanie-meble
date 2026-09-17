import type { Silnik } from '@/silnik/most'

/* Wejście renderu AI z bieżącego kadru silnika: obraz (z GI i post-processingiem, bez nakładek powłoki),
   mapa krawędzi (Sobel) jako wzorzec geometrii i maska chroniąca zaznaczony mebel.
   Kadr jest przycinany centralnie do proporcji rozmiaru wyjściowego — nakładka używa tego samego prostokąta. */
export const ROZMIARY = { landscape: [1536, 1024], square: [1024, 1024], portrait: [1024, 1536] } as const
export type Orientacja = keyof typeof ROZMIARY

export function przyciecie(szer: number, wys: number, proporcja: number) {
  const w = Math.min(szer, wys * proporcja)
  const h = w / proporcja
  return { x: (szer - w) / 2, y: (wys - h) / 2, w, h }
}

const doBloba = (k: HTMLCanvasElement) => new Promise<Blob>((ok, blad) => k.toBlob((b) => (b ? ok(b) : blad(new Error('Canvas export failed'))), 'image/png'))

export async function przechwycKadr(s: Silnik, orientacja: Orientacja, proba = 0): Promise<{ kadr: HTMLCanvasElement; blob: Blob }> {
  const plotno = s.renderer.domElement as HTMLCanvasElement
  const okno = plotno.ownerDocument.defaultView as Window
  const [W, H] = ROZMIARY[orientacja]
  // Silnik w bezruchu nie rysuje, a płótno WebGPU po prezentacji jest puste: wymuszamy klatkę i kopiujemy po niej.
  s.oznaczZmiane?.()
  await new Promise((r) => okno.requestAnimationFrame(() => okno.requestAnimationFrame(r)))
  const p = przyciecie(plotno.width, plotno.height, W / H)
  const kadr = document.createElement('canvas')
  kadr.width = W
  kadr.height = H
  const g = kadr.getContext('2d', { willReadFrequently: true })!
  g.drawImage(plotno, p.x, p.y, p.w, p.h, 0, 0, W, H)
  const probka = g.getImageData(0, 0, W, H).data
  let jasnosc = 0
  for (let i = 0; i < probka.length; i += 4000) jasnosc += probka[i] + probka[i + 1] + probka[i + 2]
  if (jasnosc < 500 && proba < 4) return przechwycKadr(s, orientacja, proba + 1)
  return { kadr, blob: await doBloba(kadr) }
}

function rozmyj(z: Float32Array, w: number, h: number) {
  const wynik = new Float32Array(z.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let suma = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          suma += z[yy * w + xx]
          n++
        }
      }
      wynik[y * w + x] = suma / n
    }
  }
  return wynik
}

export function mapaKrawedzi(kadr: HTMLCanvasElement): Promise<Blob> {
  const { width: w, height: h } = kadr
  const zrodlo = kadr.getContext('2d')!.getImageData(0, 0, w, h).data
  const surowa = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) surowa[i] = 0.2126 * zrodlo[i * 4] + 0.7152 * zrodlo[i * 4 + 1] + 0.0722 * zrodlo[i * 4 + 2]
  // Rozmycie 5×5 (dwa przebiegi pudełkowe) gasi słój i szum tekstur, zostają krawędzie brył.
  const jas = rozmyj(rozmyj(surowa, w, h), w, h)
  const wynik = new ImageData(w, h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = -jas[i - w - 1] - 2 * jas[i - 1] - jas[i + w - 1] + jas[i - w + 1] + 2 * jas[i + 1] + jas[i + w + 1]
      const gy = -jas[i - w - 1] - 2 * jas[i - w] - jas[i - w + 1] + jas[i + w - 1] + 2 * jas[i + w] + jas[i + w + 1]
      const sila = Math.hypot(gx, gy)
      const v = sila < 48 ? 255 : 255 - Math.min(255, (sila - 48) * 2.2)
      wynik.data.set([v, v, v, 255], i * 4)
    }
  }
  const k = document.createElement('canvas')
  k.width = w
  k.height = h
  k.getContext('2d')!.putImageData(wynik, 0, 0)
  return doBloba(k)
}

/* Maska dla images.edit: przezroczyste = do edycji, nieprzezroczyste = chronione (obrys mebla na ekranie). */
export function maskaOchrony(s: Silnik, mebel: string, orientacja: Orientacja): Promise<Blob> | null {
  const korzen = s.scene.getObjectByName(`biblioteka:${mebel}`)
  if (!korzen) return null
  const T = s.THREE
  const plotno = s.renderer.domElement as HTMLCanvasElement
  const [W, H] = ROZMIARY[orientacja]
  const p = przyciecie(plotno.clientWidth, plotno.clientHeight, W / H)
  const b = new T.Box3().setFromObject(korzen)
  const naroza = [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => new T.Vector3(i ? b.max.x : b.min.x, j ? b.max.y : b.min.y, k ? b.max.z : b.min.z))))
  const punkty = naroza.map((v: any) => v.project(s.camera)).filter((v: any) => v.z < 1)
  if (!punkty.length) return null
  const ekran = punkty.map((v: any) => ({ x: (((v.x + 1) / 2) * plotno.clientWidth - p.x) * (W / p.w), y: (((1 - v.y) / 2) * plotno.clientHeight - p.y) * (H / p.h) }))
  const k = document.createElement('canvas')
  k.width = W
  k.height = H
  const g = k.getContext('2d')!
  const minX = Math.max(0, Math.min(...ekran.map((e) => e.x)))
  const minY = Math.max(0, Math.min(...ekran.map((e) => e.y)))
  g.fillStyle = '#000'
  g.fillRect(minX, minY, Math.min(W, Math.max(...ekran.map((e) => e.x))) - minX, Math.min(H, Math.max(...ekran.map((e) => e.y))) - minY)
  return doBloba(k)
}
