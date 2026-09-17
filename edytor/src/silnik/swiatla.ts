import type { Silnik } from './most'

/* Światła jako interakcje. Listwy LED należą do mebla (gniazdo leży w jego bryle), grupowane po wnęce;
   lampy sufitowe to oświetlenie mieszkania (gniazda puli + widoczna kula w pokoju). Jednostki sceny: cm. */
export interface SwiatloMebla { id: string; etykieta: string; mebel: string; gniazda: any[]; paski: any[]; wlaczone: boolean }
export interface SwiatloPokoju { id: string; etykieta: string; gniazdo: any; kula: any; wlaczone: boolean }

const wylaczonaKula = new WeakMap<object, any>()

export function swiatlaMebli(s: Silnik | null): Map<string, SwiatloMebla[]> {
  const wynik = new Map<string, SwiatloMebla[]>()
  const ledy = s?.ledy
  if (!s || !ledy) return wynik
  const T = s.THREE
  const bryly: { id: string; pudlo: any }[] = []
  s.scene.traverse((o: any) => {
    if (o.name?.startsWith('biblioteka:')) bryly.push({ id: o.name.slice(11), pudlo: new T.Box3().setFromObject(o).expandByScalar(6) })
  })
  const wneki = new Map<string, SwiatloMebla>()
  ledy.gniazda.forEach((g: any, i: number) => {
    const mebel = bryly.find((b) => b.pudlo.containsPoint(g.poz))?.id
    if (!mebel) return
    const klucz = `${mebel}:${g.wneka ?? g.rodzaj ?? i}`
    let w = wneki.get(klucz)
    if (!w) {
      const nr = (wynik.get(mebel)?.length ?? 0) + 1
      w = { id: `led:${klucz}`, etykieta: g.wneka ? `LED · ${g.wneka}` : `LED ${nr}`, mebel, gniazda: [], paski: [], wlaczone: true }
      wneki.set(klucz, w)
      wynik.set(mebel, [...(wynik.get(mebel) ?? []), w])
    }
    w.gniazda.push(g)
    if (ledy.paski[i]) w.paski.push(ledy.paski[i])
    w.wlaczone &&= !g.wylaczone
  })
  return wynik
}

export function ustawSwiatloMebla(s: Silnik | null, swiatlo: SwiatloMebla, wlaczone: boolean) {
  if (!s?.ledy) return
  for (const g of swiatlo.gniazda) g.wylaczone = !wlaczone
  for (const p of swiatlo.paski) p.visible = wlaczone
  s.ledy.aktualizuj(s.camera, true)
  s.oznaczZmiane?.()
}

export function swiatlaPokoi(s: Silnik | null): SwiatloPokoju[] {
  const pula = s?.lampy.pulaLamp
  if (!s || !pula) return []
  return pula.gniazda.map((g: any, i: number) => ({
    id: `lampa:${i}`,
    etykieta: g.nazwa ?? `Ceiling light ${i + 1}`,
    gniazdo: g,
    kula: s.lampy.zarowki.find((k: any) => k.name.endsWith(`· ${g.nazwa}`)),
    wlaczone: g.moc > 0
  }))
}

export function ustawSwiatloPokoju(s: Silnik | null, lampa: SwiatloPokoju, wlaczone: boolean) {
  if (!s) return
  lampa.gniazdo.moc = wlaczone ? lampa.gniazdo.mocBazowa : 0
  const kula = lampa.kula
  if (kula) {
    // Materiał kuli jest wspólny dla pokoi — zgaszona dostaje własną nieświecącą kopię.
    if (!wylaczonaKula.has(kula)) {
      const kopia = s.lampy.materialZarowki.clone()
      kopia.emissiveIntensity = 0
      wylaczonaKula.set(kula, kopia)
    }
    kula.material = wlaczone ? s.lampy.materialZarowki : wylaczonaKula.get(kula)
  }
  s.lampy.pulaLamp.aktualizuj(s.camera, true)
  s.oznaczZmiane?.()
}
