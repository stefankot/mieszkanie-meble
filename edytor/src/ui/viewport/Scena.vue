<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { tinykeys } from 'tinykeys'
import { watch } from 'vue'

import { $przebudowaMebli } from '@/projekt/projekt'
import { uruchomKropki } from '@/silnik/hotspoty'
import { $silnik, podlaczRamke } from '@/silnik/most'
import { uruchomZaznaczanie } from '@/silnik/zaznaczanie'
import { skrotyPowloki } from '@/skroty'
import { $czescZaznaczona, $tryb, $zaznaczenie } from '@/stan'
import Kropki from '@/ui/hotspots/Kropki.vue'
import PasekNarzedzi from '@/ui/toolbar/PasekNarzedzi.vue'
import TrybSpaceru from '@/ui/walk/TrybSpaceru.vue'

import Gizmo from './Gizmo.vue'
import MiniMapa from './MiniMapa.vue'
import UchwytyPolek from './UchwytyPolek.vue'

/* Jedna ramka renderera dla obu trybów (bez przeładowania przy przełączaniu).
   Stary panel renderera jest ukryty; mapa i pasek to komponenty powłoki. */
const tryb = useStore($tryb)
const silnik = useStore($silnik)
const zaznaczenie = useStore($zaznaczenie)
const przebudowa = useStore($przebudowaMebli)
/* Parametry diagnostyczne silnika (źródło mebli, wersja POC, rewizja three, wyłączone warstwy)
   przekazujemy z adresu edytora do ramki — np. ?furnitureSource=local&furnitureV2=regal-salon:v0008-parametric */
const PRZEKAZYWANE = ['furnitureSource', 'furnitureV2', 'three', 'bez', 'quality', 'tone']
const zrodlo = (() => {
  const adres = new URLSearchParams(location.search)
  const przekaz = new URLSearchParams()
  for (const klucz of PRZEKAZYWANE) if (adres.has(klucz)) przekaz.set(klucz, adres.get(klucz)!)
  const pytanie = przekaz.size ? `?${przekaz}` : ''
  return `${import.meta.env.DEV ? '/' : '../'}renderery/webgpu/mieszkanie-webgpu-v1.html${pytanie}`
})()

// Stary panel, joystick i stara mini-mapa renderera są zastąpione przez powłokę (pasek, MiniMapa).
const CSS_RAMKI = `#sterowanie,#joystickRuchu,#miniMapa{display:none!important}`

function poZaladowaniu(e: Event) {
  const ramka = e.target as HTMLIFrameElement
  const doc = ramka.contentDocument
  if (!doc) return
  const styl = doc.createElement('style')
  styl.textContent = CSS_RAMKI
  doc.head.append(styl)
  // Fokus bywa w ramce — skróty powłoki muszą działać także tam.
  if (ramka.contentWindow) tinykeys(ramka.contentWindow, skrotyPowloki)
  podlaczRamke(ramka)
  uruchomKropki(ramka)
}

// Klik w scenie w trybie edycji zaznacza mebel (i część); obrys zaznaczenia rysuje OutlineNode silnika.
let zatrzymajZaznaczanie: (() => void) | undefined
watch(silnik, (s) => {
  zatrzymajZaznaczanie?.()
  if (s) zatrzymajZaznaczanie = uruchomZaznaczanie(s, {
    aktywne: () => $tryb.get() === 'edit',
    wybierz: (z) => {
      $zaznaczenie.set(z?.mebel ?? null)
      $czescZaznaczona.set(z?.czesc ? `${z.mebel}:${z.czesc}` : null)
    }
  })
}, { immediate: true })
watch([silnik, zaznaczenie, tryb, przebudowa], ([s, id, t]) => {
  const obrys = (s as any)?.hoverOutline
  if (!obrys?.ustawTrwaly) return
  obrys.ustawTrwaly(t === 'edit' && id ? s!.scene.getObjectByName(`biblioteka:${id}`) : null)
  s!.oznaczZmiane?.()
}, { immediate: true })
</script>

<template>
  <section class="relative min-h-0 min-w-0 overflow-hidden bg-[#e3e5e6]">
    <iframe :src="zrodlo" title="Apartment renderer" class="absolute inset-0 size-full border-0" @load="poZaladowaniu" />
    <Kropki />
    <UchwytyPolek />

    <TrybSpaceru v-if="tryb === 'walk'" />
    <Gizmo v-if="tryb === 'edit'" />
    <MiniMapa />
    <PasekNarzedzi />
  </section>
</template>
