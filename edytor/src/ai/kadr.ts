import type { Silnik } from '@/silnik/most'

/* Wejście renderu AI z kadru silnika. Kadr obejmuje CAŁY EKRAN (jakby nie było paneli) plus margines:
   na czas przechwycenia ramka renderera dostaje proporcje obrazu wyjściowego, a kąt widzenia kamery
   rośnie tak, żeby zmieścić ostrosłup pełnego okna z zapasem. Potem wszystko wraca.
   `ekran` = jaka część obrazu (szerokość, wysokość) odpowiada oknu — nakładka wpasowuje ją w cały ekran. */
export const ROZMIARY = { landscape: [1536, 1024], square: [1024, 1024], portrait: [1024, 1536] } as const
export type Orientacja = keyof typeof ROZMIARY
export interface Przechwycenie { kadr: HTMLCanvasElement; blob: Blob; maska: Blob | null; kanaly: { normalne: Blob; glebia: Blob } | null; ekran: { fx: number; fy: number } }

const MARGINES = 0.1
const doBloba = (k: HTMLCanvasElement) => new Promise<Blob>((ok, blad) => k.toBlob((b) => (b ? ok(b) : blad(new Error('Canvas export failed'))), 'image/png'))
const czekaj = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function przechwycKadr(s: Silnik, orientacja: Orientacja, chronMebel: string | null = null, zKanalami = false): Promise<Przechwycenie> {
  const plotno = s.renderer.domElement as HTMLCanvasElement
  const okno = plotno.ownerDocument.defaultView as Window
  const ramka = okno.frameElement as HTMLIFrameElement | null
  const kamera = s.camera
  const [W, H] = ROZMIARY[orientacja]
  const Ai = W / H
  const ekranW = window.innerWidth
  const ekranH = window.innerHeight
  const stary = { fov: kamera.fov, styl: ramka?.getAttribute('style') ?? '' }
  // Ostrosłup okna: pionowy kąt kamery dotyczy wysokości ramki, przeliczamy go na wysokość całego okna.
  const ty = Math.tan((kamera.fov * Math.PI) / 360) * (ekranH / Math.max(1, ramka?.clientHeight ?? ekranH))
  const sx = ty * (ekranW / ekranH) * (1 + MARGINES)
  const sy = ty * (1 + MARGINES)
  const cy = sx / sy > Ai ? sx / Ai : sy
  try {
    if (ramka) {
      const h = ramka.parentElement?.clientHeight ?? ekranH
      ramka.style.cssText = `position:absolute;left:50%;top:50%;width:${Math.round(h * Ai)}px;height:${h}px;transform:translate(-50%,-50%);border:0`
    }
    kamera.fov = (Math.atan(cy) * 360) / Math.PI
    kamera.updateProjectionMatrix()
    s.oznaczZmiane?.()
    // Zmiana rozmiaru czyści historię TAA i GI — dajemy silnikowi czas na dopracowanie obrazu.
    await czekaj(1800)
    s.oznaczZmiane?.()
    await new Promise((r) => okno.requestAnimationFrame(() => okno.requestAnimationFrame(r)))
    const kadr = document.createElement('canvas')
    kadr.width = W
    kadr.height = H
    const g = kadr.getContext('2d', { willReadFrequently: true })!
    g.drawImage(plotno, 0, 0, W, H)
    // Tryb Arch Photo może przyciąć kąt widzenia (maks. 60°) — ułamki ekranu liczymy z faktycznego kąta.
    const tyFakt = Math.tan((kamera.fov * Math.PI) / 360)
    const ekran = { fx: Math.min(1.5, (ty * (ekranW / ekranH)) / (tyFakt * (plotno.width / plotno.height))), fy: Math.min(1.5, ty / tyFakt) }
    const maska = chronMebel ? await maskaOchrony(s, chronMebel, W, H) : null
    const kanaly = zKanalami ? await kanalyGeometrii(s, W, H) : null
    return { kadr, blob: await doBloba(kadr), maska, kanaly, ekran }
  } finally {
    kamera.fov = stary.fov
    kamera.updateProjectionMatrix()
    if (ramka) ramka.setAttribute('style', stary.styl)
    s.oznaczZmiane?.()
  }
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

/* Kanały geometrii: normalne i głębia z tej samej kamery co kadr. Renderujemy scenę z materiałem
   zastępczym do celu poza ekranem — to ta sama bryła, więc model dostaje jednoznaczny opis kształtu. */
async function kanalyGeometrii(s: Silnik, W: number, H: number) {
  const T = s.THREE
  const r = s.renderer
  const poprzedniMaterial = s.scene.overrideMaterial
  const rysuj = async (material: any, mapuj: (px: Float32Array, i: number) => [number, number, number]) => {
    const cel = new T.RenderTarget(W, H, { type: T.FloatType, depthBuffer: true })
    try {
      s.scene.overrideMaterial = material
      const poprzedni = r.getRenderTarget()
      r.setRenderTarget(cel)
      r.render(s.scene, s.camera)
      r.setRenderTarget(poprzedni)
      const px = (await r.readRenderTargetPixelsAsync(cel, 0, 0, W, H)) as Float32Array
      const obraz = new ImageData(W, H)
      for (let i = 0; i < W * H * 4; i += 4) {
        const [a, b, c] = mapuj(px, i)
        obraz.data.set([a, b, c, 255], i)
      }
      const k = document.createElement('canvas')
      k.width = W
      k.height = H
      k.getContext('2d')!.putImageData(obraz, 0, 0)
      return await doBloba(k)
    } finally {
      cel.dispose()
      s.scene.overrideMaterial = poprzedniMaterial
    }
  }
  const bajt = (v: number) => Math.min(255, Math.max(0, Math.round(v * 255)))
  const normalne = await rysuj(new T.MeshNormalNodeMaterial(), (px, i) => [bajt(px[i]), bajt(px[i + 1]), bajt(px[i + 2])])
  // Głębia: 0,5 m (biel) … 8 m (czerń) — zakres wnętrza; szerszy zakres dawał obraz prawie płaski.
  const glebiaMaterial = new T.MeshBasicNodeMaterial()
  const L = T.TSL
  glebiaMaterial.colorNode = L.vec3(L.float(1).sub(L.positionView.length().sub(50).div(750).clamp(0, 1)))
  const glebia = await rysuj(glebiaMaterial, (px, i) => [bajt(px[i]), bajt(px[i]), bajt(px[i])])
  glebiaMaterial.dispose()
  return { normalne, glebia }
}

/* Maska dla images.edit: przezroczyste = do edycji, nieprzezroczyste = chronione (obrys mebla w kadrze).
   Wywoływana w trakcie przechwycenia, więc rzutuje przez kamerę kadru. */
function maskaOchrony(s: Silnik, mebel: string, W: number, H: number): Promise<Blob> | null {
  const korzen = s.scene.getObjectByName(`biblioteka:${mebel}`)
  if (!korzen) return null
  const T = s.THREE
  const b = new T.Box3().setFromObject(korzen)
  const naroza = [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => new T.Vector3(i ? b.max.x : b.min.x, j ? b.max.y : b.min.y, k ? b.max.z : b.min.z))))
  const punkty = naroza.map((v: any) => v.project(s.camera)).filter((v: any) => v.z < 1)
  if (!punkty.length) return null
  const xs = punkty.map((v: any) => ((v.x + 1) / 2) * W)
  const ys = punkty.map((v: any) => ((1 - v.y) / 2) * H)
  const k = document.createElement('canvas')
  k.width = W
  k.height = H
  const g = k.getContext('2d')!
  const x0 = Math.max(0, Math.min(...xs))
  const y0 = Math.max(0, Math.min(...ys))
  g.fillStyle = '#000'
  g.fillRect(x0, y0, Math.min(W, Math.max(...xs)) - x0, Math.min(H, Math.max(...ys)) - y0)
  return doBloba(k)
}
