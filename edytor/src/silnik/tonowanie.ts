/* Obraz z celu renderowania float (bez post-processingu silnika) → PNG/JPEG w przestrzeni sRGB.
   three.js ACESFilmicToneMapping (dopasowanie RRT+ODT) liczony na CPU. Kanał alfa zachowany. */
function aces(r: number, g: number, b: number, ekspozycja: number): [number, number, number] {
  const e = ekspozycja / 0.6
  r *= e
  g *= e
  b *= e
  const a = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b]
  const [x, y, z] = a.map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081))
  return [1.60475 * x - 0.53108 * y - 0.07367 * z, -0.10208 * x + 1.10813 * y - 0.00605 * z, -0.00327 * x - 0.07276 * y + 1.07602 * z]
}
const srgb = (c: number) => 255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))

export function doObrazu(piksele: Float32Array, w: number, h: number, ekspozycja: number, wyjscie: { szer: number; wys: number; typ?: string }) {
  const obraz = new ImageData(w, h)
  for (let i = 0; i < w * h * 4; i += 4) {
    const [r, g, b] = aces(piksele[i], piksele[i + 1], piksele[i + 2], ekspozycja)
    obraz.data[i] = srgb(r)
    obraz.data[i + 1] = srgb(g)
    obraz.data[i + 2] = srgb(b)
    obraz.data[i + 3] = 255 * Math.min(1, Math.max(0, piksele[i + 3]))
  }
  const duzy = new OffscreenCanvas(w, h)
  duzy.getContext('2d')!.putImageData(obraz, 0, 0)
  const maly = document.createElement('canvas')
  maly.width = wyjscie.szer
  maly.height = wyjscie.wys
  const g = maly.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(duzy, 0, 0, wyjscie.szer, wyjscie.wys)
  return maly.toDataURL(wyjscie.typ ?? 'image/jpeg', 0.82)
}

/* Render sceny do celu float między klatkami silnika (jego klatka mieści się w jednym zadaniu). */
export async function renderujDoObrazu(s: any, scena: any, kamera: any, w: number, h: number, przezroczyste = false) {
  const T = s.THREE
  const r = s.renderer
  const cel = new T.RenderTarget(w, h, { type: T.FloatType, depthBuffer: true })
  const okno = r.domElement.ownerDocument.defaultView as Window
  try {
    await r.compileAsync(scena, kamera)
    await new Promise((gotowe) => okno.requestAnimationFrame(gotowe))
    const poprzedni = r.getRenderTarget()
    const kolorTla = r.getClearColor(new T.Color())
    const alfaTla = r.getClearAlpha()
    if (przezroczyste) r.setClearColor(0x000000, 0)
    r.setRenderTarget(cel)
    r.render(scena, kamera)
    r.setRenderTarget(poprzedni)
    if (przezroczyste) r.setClearColor(kolorTla, alfaTla)
    return (await r.readRenderTargetPixelsAsync(cel, 0, 0, w, h)) as Float32Array
  } finally {
    cel.dispose()
  }
}
