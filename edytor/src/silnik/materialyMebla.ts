import { atom } from 'nanostores'

import { kopiaUstawien, nowyMaterial, type UstawieniaMaterialu } from '@/meble/material'

import { aktualizujUniformy, kluczStruktury, zbudujMaterial } from './budowaMaterialu'
import type { Silnik } from './most'
import { zglosDuzaZmiane } from './zmiany'

/* Grupy materiałów w zaznaczonym meblu (jak Figma „Selection colors”): siatki o wspólnym materiale edytuje się razem.
   Klucz grupy = uuid materiału z silnika, zachowany po podmianie na materiał edytora. Edycja dotyczy tylko
   tego mebla — nawet jeśli silnik współdzieli materiał z innymi meblami, podmieniamy go wyłącznie na tych siatkach. */
export interface GrupaMaterialu {
  klucz: string
  nazwa: string
  siatki: any[]
  material: any
  zrodlo: any
  ustawienia: UstawieniaMaterialu
  powierzchnia: number
}

export const $wersjaMaterialow = atom(0)
const POMIJANE = /Pasek LED|szk|glass/i

function zSilnika(s: Silnik, m: any): UstawieniaMaterialu {
  const T = s.THREE
  const kolor = `#${new T.Color(m.userData?.kolorDrewna ?? m.color ?? 0xcccccc).getHexString()}`
  const teksturowy = !!(m.map || (m.colorNode && m.userData?.kolorDrewna))
  return nowyMaterial({
    nazwa: m.name || 'Material',
    baza: teksturowy ? 'texture' : 'solid',
    kolor,
    powierzchnia: { chropowatosc: m.roughness ?? 0.8, metalicznosc: m.metalness ?? 0, lakier: m.clearcoat ?? 0, polysk: m.sheen ?? 0 },
    relief: { wypuklosc: 0, sledzenieWysokosci: false, glebokosc: 0.2, generatywne: false, skalaSzumu: 4, silaSzumu: 0.15, ziarno: 1 },
    // Silnik ma już własną warstwę niedoskonałości — edytor nie dokłada drugiej, dopóki użytkownik jej nie włączy.
    niedoskonalosci: { wlaczone: false, kurz: 0.2, smugi: 0.2, rysy: 0.1, wytarcie: 0.15 }
  })
}

export function grupyMaterialow(s: Silnik | null, mebel: string): GrupaMaterialu[] {
  const korzen = s?.scene.getObjectByName(`biblioteka:${mebel}`)
  if (!s || !korzen) return []
  const T = s.THREE
  const grupy = new Map<string, GrupaMaterialu>()
  const rozmiar = new T.Vector3()
  korzen.traverse((o: any) => {
    if (!o.isMesh || Array.isArray(o.material) || POMIJANE.test(`${o.name} ${o.material?.name}`)) return
    const m = o.material
    const klucz = m.userData?.grupaEdytora ?? m.uuid
    let g = grupy.get(klucz)
    if (!g) {
      const zrodlo = m.userData?.zrodloEdytora ?? m
      g = { klucz, nazwa: m.name || 'Material', siatki: [], material: m, zrodlo, ustawienia: m.userData?.ustawieniaEdytora ?? zSilnika(s, zrodlo), powierzchnia: 0 }
      grupy.set(klucz, g)
    }
    g.siatki.push(o)
    o.geometry.boundingBox ?? o.geometry.computeBoundingBox()
    const [a, b] = o.geometry.boundingBox.getSize(rozmiar).multiply(o.scale).toArray().sort((x: number, y: number) => y - x)
    g.powierzchnia += a * b
  })
  return [...grupy.values()].sort((a, b) => b.powierzchnia - a.powierzchnia)
}

export function ustawGrupe(s: Silnik | null, mebel: string, klucz: string, u: UstawieniaMaterialu, { duza = false } = {}) {
  const g = grupyMaterialow(s, mebel).find((x) => x.klucz === klucz)
  if (!s || !g) return
  const kopia = kopiaUstawien(u)
  if (g.material.userData?.grupaEdytora && g.material.userData.struktura === kluczStruktury(kopia)) {
    aktualizujUniformy(s, g.material, kopia)
    g.material.userData.ustawieniaEdytora = kopia
  } else {
    const nowy = zbudujMaterial(s, kopia, g.zrodlo)
    Object.assign(nowy.userData, { grupaEdytora: klucz, zrodloEdytora: g.zrodlo, ustawieniaEdytora: kopia })
    for (const siatka of g.siatki) siatka.material = nowy
    if (g.material.userData?.grupaEdytora) g.material.dispose()
  }
  s.oznaczZmiane?.()
  $wersjaMaterialow.set($wersjaMaterialow.get() + 1)
  if (duza) zglosDuzaZmiane()
}

/* Selection colors: kolory wszystkich grup (także drugi kolor wzoru), scalone po wartości. */
export interface KolorZaznaczenia { hex: string; uzycia: { klucz: string; pole: 'kolor' | 'kolor2' }[]; teksturowy: boolean; elementy: number }

export function koloryZaznaczenia(grupy: GrupaMaterialu[]): KolorZaznaczenia[] {
  const wynik = new Map<string, KolorZaznaczenia>()
  const dodaj = (hex: string, klucz: string, pole: 'kolor' | 'kolor2', teksturowy: boolean, elementy: number) => {
    const k = hex.toLowerCase()
    const w = wynik.get(k) ?? { hex: k, uzycia: [], teksturowy: false, elementy: 0 }
    w.uzycia.push({ klucz, pole })
    w.teksturowy ||= teksturowy
    w.elementy += elementy
    wynik.set(k, w)
  }
  for (const g of grupy) {
    dodaj(g.ustawienia.kolor, g.klucz, 'kolor', g.ustawienia.baza === 'texture', g.siatki.length)
    if (g.ustawienia.baza === 'pattern') dodaj(g.ustawienia.wzor.kolor2, g.klucz, 'kolor2', false, g.siatki.length)
  }
  return [...wynik.values()]
}

export function zmienKolor(s: Silnik | null, mebel: string, kolor: KolorZaznaczenia, hex: string, opcje = { duza: false }) {
  const grupy = grupyMaterialow(s, mebel)
  for (const { klucz, pole } of kolor.uzycia) {
    const g = grupy.find((x) => x.klucz === klucz)
    if (!g) continue
    const u = kopiaUstawien(g.ustawienia)
    if (pole === 'kolor') u.kolor = hex
    else u.wzor.kolor2 = hex
    ustawGrupe(s, mebel, klucz, u, opcje)
  }
}
