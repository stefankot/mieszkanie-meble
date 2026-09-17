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
  // Włączenie przywraca strumień ustawiony w panelu światła (lumeny, skupienie).
  lampa.gniazdo.moc = wlaczone ? lampa.gniazdo.mocBazowa * (lampa.gniazdo.mnoznikZapamietany ?? 1) * kompensacjaDla(lampa.gniazdo) : 0
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

/* Parametry światła w jednostkach użytkownika. Silnik ma moc względną (RectAreaLight), więc lumeny liczymy
   od mocy nominalnej: lampa sufitowa 1600 lm, listwa LED 300 lm na 100 cm. Skupienie zmniejsza powierzchnię
   świecącą (światło obszarowe nie ma stożka) przy zachowanym strumieniu. Kierunek: pochylenie od pionu w dół
   (0–90°) i azymut w płaszczyźnie podłogi. */
export interface ParametrySwiatla { wlaczone: boolean; lumeny: number; skupienie: number; pochylenie: number; azymut: number; kelwiny: number }
type Swiatlo = SwiatloPokoju | SwiatloMebla

const gniazdaSwiatla = (l: Swiatlo): any[] => ('gniazdo' in l ? [l.gniazdo] : l.gniazda)
const nominalne = (g: any, pokoj: boolean) => (pokoj ? 1600 : ((g.szerBazowa ?? g.szer) / 100) * 300)

// Mniejsza powierzchnia przy tym samym strumieniu: moc rośnie odwrotnie do pola.
const kompensacjaDla = (g: any) => (g.szerBazowa ? (g.szerBazowa / g.szer) ** 2 : 1)

function zapamietajBaze(g: any) {
  g.szerBazowa ??= g.szer
  g.wysBazowa ??= g.wys
  g.celBazowy ??= g.cel.clone()
}

export function parametrySwiatla(l: Swiatlo): ParametrySwiatla {
  const pokoj = 'gniazdo' in l
  const gniazda = gniazdaSwiatla(l)
  const g = gniazda[0]
  const mnoznik = pokoj && !l.wlaczone ? (g.mnoznikZapamietany ?? 1) : (pokoj ? g.moc / (g.mocBazowa || 1) : (g.mnoznik ?? 1)) / kompensacjaDla(g)
  const d = g.cel.clone().sub(g.poz).normalize()
  return {
    wlaczone: l.wlaczone,
    lumeny: Math.round(gniazda.reduce((suma, x) => suma + nominalne(x, pokoj), 0) * mnoznik),
    skupienie: g.skupienie ?? 0,
    pochylenie: Math.round((Math.acos(Math.min(1, Math.max(-1, -d.y))) * 180) / Math.PI),
    azymut: Math.round(((Math.atan2(d.z, d.x) * 180) / Math.PI + 360) % 360),
    kelwiny: g.kelwiny ?? 3000
  }
}

// Barwa ciała doskonale czarnego → RGB (przybliżenie Tannera Hellanda), 1000–12000 K.
export function kolorTemperatury(k: number): [number, number, number] {
  const t = k / 100
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  return [r, g, b].map((v) => Math.min(255, Math.max(0, v)) / 255) as [number, number, number]
}

export function ustawParametrySwiatla(s: Silnik | null, l: Swiatlo, p: ParametrySwiatla) {
  if (!s) return
  const T = s.THREE
  const pokoj = 'gniazdo' in l
  const gniazda = gniazdaSwiatla(l)
  const suma = gniazda.reduce((x, g) => x + nominalne(g, pokoj), 0) || 1
  const mnoznik = p.lumeny / suma
  const skala = 1 - 0.7 * (p.skupienie / 100)
  const t = (p.pochylenie * Math.PI) / 180
  const a = (p.azymut * Math.PI) / 180
  for (const g of gniazda) {
    zapamietajBaze(g)
    g.skupienie = p.skupienie
    g.kelwiny = p.kelwiny
    g.szer = g.szerBazowa * skala
    g.wys = g.wysBazowa * skala
    const odleglosc = g.celBazowy.distanceTo(g.poz)
    g.cel = g.poz.clone().add(new T.Vector3(Math.sin(t) * Math.cos(a), -Math.cos(t), Math.sin(t) * Math.sin(a)).multiplyScalar(odleglosc))
    if (pokoj) {
      g.mnoznikZapamietany = mnoznik
      g.kolor?.setRGB?.(...kolorTemperatury(p.kelwiny))
    } else g.mnoznik = mnoznik * kompensacjaDla(g)
  }
  if (pokoj) {
    const lampa = l as SwiatloPokoju
    ustawSwiatloPokoju(s, lampa, p.wlaczone)
    lampa.gniazdo.moc = p.wlaczone ? lampa.gniazdo.mocBazowa * mnoznik * kompensacjaDla(lampa.gniazdo) : 0
    s.lampy.pulaLamp.aktualizuj(s.camera, true)
  } else ustawSwiatloMebla(s, l as SwiatloMebla, p.wlaczone)
}

/* Silnik odtwarza gniazda LED po każdej zmianie mebli — światło zawsze wyszukujemy od nowa po id. */
export function znajdzSwiatlo(s: Silnik | null, id: string): Swiatlo | undefined {
  if (id.startsWith('lampa:')) return swiatlaPokoi(s).find((l) => l.id === id)
  for (const ledy of swiatlaMebli(s).values()) {
    const l = ledy.find((x) => x.id === id)
    if (l) return l
  }
}
