import { atom, map } from 'nanostores'

import { $aktywnyWidok } from '@/stan'

/* Tymczasowy most do renderera w ramce (ten sam origin). Docelowo zastąpią go operacje rejestru
   wywołujące moduły silnika bezpośrednio. Do tego czasu nowe panele sterują ukrytym starym panelem
   renderera (#sterowanie) — te same funkcje co w trybie bez DEV, bez zmian w silniku. */
export interface Silnik {
  gotowy: boolean
  THREE: any
  scene: any
  camera: any
  renderer: { domElement: HTMLCanvasElement }
  nawigacja: { pokoje: { id: string; name: string }[]; teleportujDoPokoju(i: number): boolean }
  interakcje: { ruchy(): { mebel: string; nazwaMebla: string; ruch: any }[]; przelacz(r: any): boolean; ustaw(r: any, v: number): boolean }
  lampy: { zarowki: any[]; lampySufitowe: any[] }
}

export const $silnik = atom<Silnik | null>(null)
export const $miniatury = map<Record<string, string>>(wczytajMiniatury())
let ramkaOkno: (Window & { __silnik?: Silnik }) | null = null

function wczytajMiniatury(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('edytor:miniatury') ?? '{}')
  } catch {
    return {}
  }
}

export function podlaczRamke(ramka: HTMLIFrameElement) {
  ramkaOkno = ramka.contentWindow as typeof ramkaOkno
  const czekaj = setInterval(() => {
    const s = ramkaOkno?.__silnik
    if (!s?.gotowy) return
    clearInterval(czekaj)
    $silnik.set(s)
    teleportuj($aktywnyWidok.get())
  }, 250)
}

function teleportuj(id: string) {
  const s = $silnik.get()
  const i = s?.nawigacja.pokoje.findIndex((p) => p.id === id) ?? -1
  if (!s || i < 0) return
  s.nawigacja.teleportujDoPokoju(i)
  setTimeout(() => zapiszMiniature(id), 1600)
}
$aktywnyWidok.listen(teleportuj)

/* D5 Scene List: miniatura to kadr z renderera. Silnik w bezruchu nie rysuje (P22), a płótno WebGPU
   po prezentacji jest puste — wymuszamy klatkę i kopiujemy w następnym rAF (po rysowaniu silnika).
   Czarny wynik = ponowna próba. */
function zapiszMiniature(id: string, proba = 0) {
  const s = $silnik.get() as (Silnik & { oznaczZmiane?: () => void }) | null
  // Użytkownik przeszedł już do innego widoku — kadr nie należy do tej sceny.
  if (!s || !ramkaOkno || proba > 4 || $aktywnyWidok.get() !== id) return
  s.oznaczZmiane?.()
  ramkaOkno.requestAnimationFrame(() => {
    const k = document.createElement('canvas')
    k.width = 192
    k.height = 108
    const g = k.getContext('2d', { willReadFrequently: true })
    if (!g) return
    g.drawImage(s.renderer.domElement, 0, 0, k.width, k.height)
    const piksele = g.getImageData(0, 0, k.width, k.height).data
    let jasnosc = 0
    for (let i = 0; i < piksele.length; i += 40) jasnosc += piksele[i] + piksele[i + 1] + piksele[i + 2]
    if (jasnosc < 1000) return setTimeout(() => zapiszMiniature(id, proba + 1), 400)
    $miniatury.setKey(id, k.toDataURL('image/jpeg', 0.78))
    try {
      localStorage.setItem('edytor:miniatury', JSON.stringify($miniatury.get()))
    } catch {
      /* pełny localStorage — miniatury zostaną tylko w pamięci */
    }
  })
}

/* Dostęp do kontrolek starego panelu renderera. */
const dok = () => ramkaOkno?.document ?? null
export const kontrolka = <T extends Element = HTMLElement>(sel: string) => dok()?.querySelector<T>(sel) ?? null

export function ustawKontrolke(sel: string, wartosc: string | number) {
  const el = kontrolka<HTMLInputElement | HTMLSelectElement>(sel)
  if (!el) return
  el.value = String(wartosc)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

export const kliknij = (sel: string) => kontrolka<HTMLElement>(sel)?.click()
export const wcisniety = (sel: string) => kontrolka(sel)?.getAttribute('aria-pressed') === 'true'
export const wartoscKontrolki = (sel: string) => kontrolka<HTMLInputElement | HTMLSelectElement>(sel)?.value ?? ''
export const opcjeKontrolki = (sel: string) =>
  [...(kontrolka<HTMLSelectElement>(sel)?.options ?? [])]
    .filter((o) => !o.classList.contains('dev-only'))
    .map((o) => ({ wartosc: o.value, etykieta: o.textContent?.trim() ?? o.value }))
