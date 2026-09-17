<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { tinykeys } from 'tinykeys'
import { watch } from 'vue'

import { uruchomKropki } from '@/silnik/hotspoty'
import { $silnik, kontrolka, podlaczRamke } from '@/silnik/most'
import { skrotyPowloki } from '@/skroty'
import { $tryb } from '@/stan'
import Kropki from '@/ui/hotspots/Kropki.vue'
import PasekNarzedzi from '@/ui/toolbar/PasekNarzedzi.vue'
import TrybSpaceru from '@/ui/walk/TrybSpaceru.vue'

import UchwytyPolek from './UchwytyPolek.vue'

/* Jedna ramka renderera dla obu trybów (bez przeładowania przy przełączaniu).
   Stary panel renderera jest ukryty; mini-mapa wyjęta z panelu i pokazywana w trybie spaceru. */
const tryb = useStore($tryb)
const zrodlo = `${import.meta.env.DEV ? '/' : '../'}renderery/webgpu/mieszkanie-webgpu-v1.html`

const CSS_RAMKI = `
#sterowanie,#joystickRuchu{display:none!important}
#miniMapa{position:fixed!important;right:12px;bottom:12px;width:190px;z-index:5;margin:0!important;border-radius:4px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.35)}
#miniMapa[data-edytor-widoczna="nie"],body[data-tryb="edit"] #miniMapa{display:none!important}`

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

/* Mini-mapa wyjęta z ukrytego panelu: jej reguły CSS są zawężone do `#sterowanie`, więc kopiujemy je
   z zakresem `body` (to samo źródło stylów, bez duplikowania wartości). */
function przeniesMape(mapa: HTMLElement) {
  const doc = mapa.ownerDocument
  const panel = doc.getElementById('sterowanie')
  const reguly = [...doc.styleSheets]
    .flatMap((arkusz) => {
      try {
        return [...arkusz.cssRules]
      } catch {
        return []
      }
    })
    .filter((r) => 'selectorText' in r && String((r as CSSStyleRule).selectorText).includes('mini-mapa'))
    .map((r) => r.cssText.replaceAll('#sterowanie', 'body'))
  const styl = doc.createElement('style')
  styl.textContent = `#miniMapa{--accent:${panel ? getComputedStyle(panel).getPropertyValue('--accent') : '#2f6bff'};padding:0!important;background:none!important;border:0!important}\n${reguly.join('\n')}`
  doc.head.append(styl)
  doc.body.append(mapa)
}

const silnik = useStore($silnik)
watch([silnik, tryb], () => {
  const mapa = kontrolka<HTMLElement>('#miniMapa')
  const body = mapa?.ownerDocument.body
  if (!mapa || !body) return
  if (mapa.parentElement !== body) przeniesMape(mapa)
  body.dataset.tryb = tryb.value
})

</script>

<template>
  <section class="relative min-h-0 min-w-0 overflow-hidden bg-[#e3e5e6]">
    <iframe :src="zrodlo" title="Apartment renderer" class="absolute inset-0 size-full border-0" @load="poZaladowaniu" />
    <Kropki />
    <UchwytyPolek />

    <TrybSpaceru v-if="tryb === 'walk'" />
    <PasekNarzedzi />
  </section>
</template>
