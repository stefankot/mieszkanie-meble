import { atom } from 'nanostores'

import { obiekty } from '@/data/mieszkanie'
import { $kropkiWidoczne } from '@/stan'

import { $silnik, type Silnik } from './most'
import { swiatlaMebli, swiatlaPokoi, type SwiatloMebla, type SwiatloPokoju } from './swiatla'

/* Białe kropki (D5 3.1 „3D triggers”) przy ruchomych częściach, meblach i światłach.
   Punkt kotwicy liczony raz w układzie lokalnym obiektu, rzutowany co klatkę; zasłonięcie
   sprawdzane promieniem kilka razy na sekundę. Jednostki sceny: cm. */
export type TypKropki = 'ruch' | 'mebel' | 'swiatlo'
export interface Kropka { id: string; typ: TypKropki; etykieta: string; mebel?: string; x: number; y: number; otwarta?: boolean }
interface Zrodlo { id: string; typ: TypKropki; etykieta: string; mebel?: string; obiekt: any; lokalnie: any; zasieg: number; ruch?: any; swiatlo?: SwiatloPokoju | SwiatloMebla; zaslonieta: boolean }

export const $kropki = atom<Kropka[]>([])
export const $zrodlaKropek = new Map<string, Zrodlo>()

const ZASIEG = { ruch: 320, mebel: 900, swiatlo: 700 }
let ledyKropek: unknown = null
let ileWlasnych = 0

function zbuduj(s: Silnik) {
  const T = s.THREE
  const srodekLokalny = (obiekt: any) => {
    const g = obiekt.geometry
    if (!g) return new T.Vector3()
    g.boundingBox ?? g.computeBoundingBox()
    return g.boundingBox.getCenter(new T.Vector3())
  }
  $zrodlaKropek.clear()
  ledyKropek = s.ledy
  ileWlasnych = (s as any).swiatlaEdytora?.ile ?? 0
  const meble = new Map<string, string>()
  for (const { mebel, nazwaMebla, ruch } of s.interakcje.ruchy()) {
    meble.set(mebel, nazwaMebla)
    $zrodlaKropek.set(ruch.id, { id: ruch.id, typ: 'ruch', etykieta: ruch.etykieta, mebel, obiekt: ruch.wezel, lokalnie: srodekLokalny(ruch.wezel), zasieg: ZASIEG.ruch, ruch, zaslonieta: false })
  }
  // Wszystkie meble ze sceny (także bez ruchomych części); kotwica w środku bryły.
  s.scene.traverse((korzen: any) => {
    if (!korzen.name?.startsWith('biblioteka:')) return
    const id = korzen.name.slice('biblioteka:'.length)
    const srodek = new T.Box3().setFromObject(korzen).getCenter(new T.Vector3())
    const etykieta = meble.get(id) ?? obiekty.find((o) => o.id === id)?.nazwa ?? id
    $zrodlaKropek.set(`mebel:${id}`, { id: `mebel:${id}`, typ: 'mebel', etykieta, mebel: id, obiekt: korzen, lokalnie: korzen.worldToLocal(srodek), zasieg: ZASIEG.mebel, zaslonieta: false })
  })
  // Światła: lampy sufitowe pokoi (kotwica — widoczna kula) i listwy LED mebli (kotwica — pierwszy pasek).
  for (const l of swiatlaPokoi(s)) {
    if (l.kula) $zrodlaKropek.set(l.id, { id: l.id, typ: 'swiatlo', etykieta: `Ceiling light · ${l.etykieta}`, obiekt: l.kula, lokalnie: new T.Vector3(), zasieg: ZASIEG.swiatlo, swiatlo: l, zaslonieta: false })
  }
  for (const l of (s as any).swiatlaEdytora?.lista() ?? []) {
    $zrodlaKropek.set(`wlasne:${l.id}`, { id: `wlasne:${l.id}`, typ: 'swiatlo', etykieta: `Light · ${l.id}`, obiekt: l.kula, lokalnie: new T.Vector3(), zasieg: ZASIEG.swiatlo, zaslonieta: false })
  }
  for (const [mebel, ledy] of swiatlaMebli(s)) {
    for (const l of ledy) {
      if (l.paski[0]) $zrodlaKropek.set(l.id, { id: l.id, typ: 'swiatlo', etykieta: l.etykieta, mebel, obiekt: l.paski[0], lokalnie: new T.Vector3(0, 0, 2), zasieg: ZASIEG.ruch, swiatlo: l, zaslonieta: false })
    }
  }
}

export function uruchomKropki(ramka: HTMLIFrameElement) {
  let s: Silnik | null = null
  let ostatniaZaslona = 0
  const petla = (czas: number) => {
    requestAnimationFrame(petla)
    if (!s || !$kropkiWidoczne.get()) return $kropki.get().length && $kropki.set([])
    const T = s.THREE
    const kamera = s.camera
    const w = ramka.clientWidth
    const h = ramka.clientHeight
    const sprawdzZaslone = czas - ostatniaZaslona > 280
    // Silnik odtwarza listwy LED po wczytaniu lub zmianie mebli — kotwice kropek trzeba wtedy zbudować od nowa.
    if (sprawdzZaslone && (s.ledy !== ledyKropek || ((s as any).swiatlaEdytora?.ile ?? 0) !== ileWlasnych)) zbuduj(s)
    if (sprawdzZaslone) ostatniaZaslona = czas
    const wynik: Kropka[] = []
    const p = new T.Vector3()
    const promien = new T.Raycaster()
    for (const z of $zrodlaKropek.values()) {
      p.copy(z.lokalnie)
      z.obiekt.localToWorld(p)
      const odleglosc = p.distanceTo(kamera.position)
      if (odleglosc > z.zasieg) continue
      if (sprawdzZaslone) {
        const kierunek = p.clone().sub(kamera.position).normalize()
        promien.set(kamera.position, kierunek)
        promien.far = odleglosc - 4
        const trafienie = promien.intersectObjects(s.scene.children, true).find((t: any) => t.object.visible && !t.object.isLight)
        let wlasny = false
        trafienie?.object.traverseAncestors((a: any) => (wlasny ||= a === z.obiekt))
        z.zaslonieta = !!trafienie && trafienie.object !== z.obiekt && !wlasny
      }
      if (z.zaslonieta) continue
      p.project(kamera)
      if (p.z > 1 || Math.abs(p.x) > 0.98 || Math.abs(p.y) > 0.98) continue
      wynik.push({ id: z.id, typ: z.typ, etykieta: z.etykieta, mebel: z.mebel, x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, otwarta: z.ruch ? (z.ruch.cel ?? z.ruch.wartosc ?? 0) > 0.5 : undefined })
    }
    $kropki.set(wynik)
  }
  const start = (silnik: Silnik | null) => {
    if (!silnik || s) return
    s = silnik
    zbuduj(silnik)
  }
  start($silnik.get())
  $silnik.listen(start)
  requestAnimationFrame(petla)
}
