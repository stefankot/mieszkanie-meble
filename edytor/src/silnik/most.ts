import { atom } from 'nanostores'
import { markRaw } from 'vue'

import { $aktywnyWidok } from '@/stan'

import { widokPokoju } from './punktWidoku'

/* Tymczasowy most do renderera w ramce (ten sam origin). Docelowo zastąpią go operacje rejestru
   wywołujące moduły silnika bezpośrednio. Do tego czasu nowe panele sterują ukrytym starym panelem
   renderera (#sterowanie) — te same funkcje co w trybie bez DEV, bez zmian w silniku. */
export interface Silnik {
  gotowy: boolean
  THREE: any
  scene: any
  camera: any
  renderer: any
  nawigacja: {
    pokoje: { id: string; name: string }[]
    teleportujDoPokoju(i: number): boolean
    punktyMapy(): { index: number; id: string; nazwa: string; pozycja: any; cel: any; kat: number }[]
    ustawWidok(pozycja: any, cel: any): boolean
    przejdzDo?(pozycja: any, cel: any): boolean
  }
  interakcje: { ruchy(): { mebel: string; nazwaMebla: string; ruch: any }[]; przelacz(r: any): boolean; ustaw(r: any, v: number): boolean }
  lampy: { zarowki: any[]; lampySufitowe: any[]; materialZarowki: any; pulaLamp: { gniazda: any[]; aktualizuj(kamera: any, wymus?: boolean): void } }
  ledy?: { gniazda: any[]; paski: any[]; aktualizuj(kamera: any, wymus?: boolean): void }
  oznaczZmiane?: () => void
}

export const $silnik = atom<Silnik | null>(null)
let ramkaOkno: (Window & { __silnik?: Silnik }) | null = null

export function podlaczRamke(ramka: HTMLIFrameElement) {
  ramkaOkno = ramka.contentWindow as typeof ramkaOkno
  const czekaj = setInterval(() => {
    const s = ramkaOkno?.__silnik
    if (!s?.gotowy) return
    clearInterval(czekaj)
    // Obiekty three.js nie mogą trafić do proxy Vue (useStore daje readonly) — zapisy i macierze by nie działały.
    $silnik.set(markRaw(s))
    teleportuj($aktywnyWidok.get(), false)
  }, 250)
}

function teleportuj(id: string, plynnie = true) {
  const s = $silnik.get()
  const punkt = s?.nawigacja.punktyMapy().find((p) => p.id === id)
  if (!s || !punkt) return
  const { pozycja, cel } = widokPokoju(s, punkt)
  // Płynne przejście po trasie (omija ściany i meble); starszy silnik bez przejdzDo — cięcie.
  if (!plynnie || !s.nawigacja.przejdzDo?.(pozycja, cel)) s.nawigacja.ustawWidok(pozycja, cel)
}
$aktywnyWidok.listen((id) => teleportuj(id))

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
