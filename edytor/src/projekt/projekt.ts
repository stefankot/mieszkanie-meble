import { get, set } from 'idb-keyval'
import { atom } from 'nanostores'

import { czyParametryczny, przebudujMebel } from '@/meble/parametryczneEdytor'
import { $uklady, type UkladMebla } from '@/meble/uklad'
import { przywrocGrupe, ustawGrupe } from '@/silnik/materialyMebla'
import { $silnik } from '@/silnik/most'
import { parametrySwiatla, ustawParametrySwiatla, znajdzSwiatlo } from '@/silnik/swiatla'
import { zglosDuzaZmiane } from '@/silnik/zmiany'

import { DokumentProjektu, pustyDokument, zmienioneKlucze, type ParametrySwiatla } from './dokument'
import { utworzHistorie } from './historia'

/* Projekt edytora: historia dokumentu + rzutowanie na silnik + autozapis szkicu (IndexedDB, idb-keyval).
   Wszystkie zmiany projektu z UI, ⌘K i AI przechodzą przez `zmienProjekt` — dzięki temu działa Cofnij/Ponów. */
const SZKIC = 'edytor:projekt:v1'
// Układy z definicji makiety — stan „bez nadpisań”. Leniwie: uklad.ts i ten moduł importują się nawzajem.
let bazaUkladowPamiec: Map<string, UkladMebla> | null = null
const bazaUkladow = () => (bazaUkladowPamiec ??= new Map(Object.entries(structuredClone($uklady.get()))))
const bazaSwiatel = new Map<string, ParametrySwiatla>()

function projektuj(przed: DokumentProjektu, po: DokumentProjektu) {
  for (const id of zmienioneKlucze(przed.uklady, po.uklady)) {
    const baza = bazaUkladow()
    if (!baza.has(id) && $uklady.get()[id]) baza.set(id, structuredClone($uklady.get()[id]))
    const cel = po.uklady[id] ?? baza.get(id)
    if (!cel) continue
    $uklady.setKey(id, cel)
    if (czyParametryczny($silnik.get(), id)) zaplanujPrzebudowe(id)
  }
  const s = $silnik.get()
  if (!s) return // silnik jeszcze się wczytuje — całość zostanie naniesiona po starcie
  let duza = false
  for (const klucz of zmienioneKlucze(przed.materialy, po.materialy)) {
    const [mebel, grupa] = [klucz.slice(0, klucz.indexOf('/')), klucz.slice(klucz.indexOf('/') + 1)]
    if (po.materialy[klucz]) ustawGrupe(s, mebel, grupa, po.materialy[klucz])
    else przywrocGrupe(s, mebel, grupa)
    duza = true
  }
  for (const id of zmienioneKlucze(przed.swiatla, po.swiatla)) {
    const swiatlo = znajdzSwiatlo(s, id)
    if (!swiatlo) continue
    if (!przed.swiatla[id] && !bazaSwiatel.has(id)) bazaSwiatel.set(id, parametrySwiatla(swiatlo))
    const cel = po.swiatla[id] ?? bazaSwiatel.get(id)
    if (cel) ustawParametrySwiatla(s, swiatlo, cel)
  }
  for (const klucz of zmienioneKlucze(przed.widocznosc, po.widocznosc)) {
    const [mebel, czesc] = klucz.split(':')
    const korzen = s.scene.getObjectByName(`biblioteka:${mebel}`)
    const obiekt = czesc ? korzen?.getObjectByName(`${mebel}:${czesc}`) : korzen
    if (obiekt) obiekt.visible = po.widocznosc[klucz] ?? true
    duza = true
  }
  s.oznaczZmiane?.()
  if (duza) zglosDuzaZmiane()
}

/* Przebudowa bryły mebla parametrycznego jest kosztowna — zbieramy zmiany z przeciągania suwaka. */
export const $przebudowaMebli = atom(0)
const doPrzebudowy = new Set<string>()
let czasomierzPrzebudowy: ReturnType<typeof setTimeout> | undefined
function zaplanujPrzebudowe(mebel: string) {
  doPrzebudowy.add(mebel)
  clearTimeout(czasomierzPrzebudowy)
  czasomierzPrzebudowy = setTimeout(() => {
    const s = $silnik.get()
    const meble = [...doPrzebudowy]
    doPrzebudowy.clear()
    if (!s) return
    let zmiana = false
    for (const mebel of meble) {
      if (!przebudujMebel(s, mebel, $uklady.get()[mebel])) continue
      zmiana = true
      // Nowe siatki: materiały grup nanosimy ponownie z dokumentu.
      for (const [klucz, u] of Object.entries(historia.dokument.materialy)) {
        if (klucz.startsWith(`${mebel}/`)) ustawGrupe(s, mebel, klucz.slice(mebel.length + 1), u)
      }
    }
    if (zmiana) {
      $przebudowaMebli.set($przebudowaMebli.get() + 1)
      zglosDuzaZmiane()
    }
  }, 220)
}

export const $historia = atom({ moznaCofnac: false, moznaPonowic: false, cofnij: null as string | null, ponow: null as string | null, krokow: 0 })
export const $zapisSzkicu = atom<'zapisano' | 'zapisywanie' | 'blad'>('zapisano')

let czasomierzZapisu: ReturnType<typeof setTimeout> | undefined
const historia = utworzHistorie({
  projektuj,
  zmieniono: () => {
    $historia.set(historia.stan)
    clearTimeout(czasomierzZapisu)
    $zapisSzkicu.set('zapisywanie')
    czasomierzZapisu = setTimeout(() => {
      set(SZKIC, historia.dokument).then(
        () => $zapisSzkicu.set('zapisano'),
        () => $zapisSzkicu.set('blad')
      )
    }, 800)
  }
})

export const zmienProjekt = historia.zmien
export const cofnij = () => historia.cofnij()
export const ponow = () => historia.ponow()
export const dokumentProjektu = () => historia.dokument
export const wczytajProjekt = (d: DokumentProjektu) => historia.wczytaj(d)

// Szkic z poprzedniej sesji; nieprawidłowy zapis nie blokuje startu.
get(SZKIC)
  .then((zapis) => {
    const wynik = DokumentProjektu.safeParse(zapis)
    if (wynik.success) historia.wczytaj(wynik.data)
  })
  .catch(() => $zapisSzkicu.set('blad'))

// Po starcie silnika (i wczytaniu mebli) nanosimy cały dokument.
$silnik.subscribe((s) => {
  if (!s) return
  const czekaj = setInterval(() => {
    const meble = Object.keys({ ...historia.dokument.materialy, ...historia.dokument.widocznosc }).map((k) => k.split(/[/:]/)[0])
    if (meble.some((m) => !s.scene.getObjectByName(`biblioteka:${m}`))) return
    clearInterval(czekaj)
    historia.odswiez()
  }, 500)
  setTimeout(() => clearInterval(czekaj), 30_000)
})

/* Plik projektu (Export/Open) — ten sam schemat co szkic. */
export function eksportujProjekt() {
  const d = historia.dokument
  const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${d.nazwa.replace(/[^\w-]+/g, '-').toLowerCase() || 'projekt'}.mieszkanie.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function importujProjekt(plik: File) {
  const wynik = DokumentProjektu.safeParse(JSON.parse(await plik.text()))
  if (!wynik.success) throw new Error(`This is not a project file: ${wynik.error.issues[0]?.message ?? 'invalid data'}`)
  historia.wczytaj({ ...pustyDokument(), ...wynik.data })
}

/* Wersje (warianty) projektu zapisane w przeglądarce. */
export interface WersjaProjektu { id: string; nazwa: string; czas: number; dokument: DokumentProjektu }
const WERSJE = 'edytor:wersje:v1'
export const $wersje = atom<WersjaProjektu[]>([])
get(WERSJE).then((w) => Array.isArray(w) && $wersje.set(w)).catch(() => {})

export async function zapiszWersje(nazwa: string) {
  const lista = [{ id: crypto.randomUUID(), nazwa, czas: Date.now(), dokument: historia.dokument }, ...$wersje.get()].slice(0, 30)
  $wersje.set(lista)
  await set(WERSJE, lista)
}
export function przywrocWersje(id: string) {
  const w = $wersje.get().find((x) => x.id === id)
  if (w) historia.zmien(`Restore ${w.nazwa}`, (d) => Object.assign(d, JSON.parse(JSON.stringify(w.dokument))))
}
