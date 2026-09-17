<script setup lang="ts">
import { ChevronDown, Globe, Magnet, MousePointer2, Move3d, Pipette, Rotate3d } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { tinykeys } from 'tinykeys'
import { watch } from 'vue'

import { uruchomKropki } from '@/silnik/hotspoty'
import { $silnik, kontrolka, podlaczRamke } from '@/silnik/most'
import { skrotyPowloki } from '@/skroty'
import { $narzedzie, $przyciaganie, $tryb } from '@/stan'
import Kropki from '@/ui/hotspots/Kropki.vue'
import TrybSpaceru from '@/ui/walk/TrybSpaceru.vue'

import MenuSceny from './MenuSceny.vue'
import PasekSkrotow from './PasekSkrotow.vue'

/* Jedna ramka renderera dla obu trybów (bez przeładowania przy przełączaniu).
   Stary panel renderera jest ukryty; mini-mapa wyjęta z panelu i pokazywana w trybie spaceru. */
const tryb = useStore($tryb)
const narzedzie = useStore($narzedzie)
const przyciaganie = useStore($przyciaganie)
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

const narzedzia = [
  { id: 'zaznacz', ikona: MousePointer2, opis: 'Select (V)' },
  { id: 'przesun', ikona: Move3d, opis: 'Move (G)' },
  { id: 'obroc', ikona: Rotate3d, opis: 'Rotate (R)' }
] as const
</script>

<template>
  <section class="relative min-h-0 min-w-0 overflow-hidden bg-[#e3e5e6]">
    <iframe :src="zrodlo" title="Apartment renderer" class="absolute inset-0 size-full border-0" @load="poZaladowaniu" />
    <Kropki />

    <TrybSpaceru v-if="tryb === 'walk'" />
    <template v-else>
      <div class="absolute left-1.5 top-1.5 z-20 flex items-center gap-1">
        <div class="flex h-[22px] items-center rounded-d5 bg-[#2b2e35]/90 px-[2px]">
          <button
            v-for="n in narzedzia"
            :key="n.id"
            type="button"
            :title="n.opis"
            class="flex size-[18px] items-center justify-center rounded-[2px]"
            :class="narzedzie === n.id ? 'bg-accent text-white' : 'text-[#c3c6cc] hover:text-white'"
            @click="$narzedzie.set(n.id)"
          >
            <component :is="n.ikona" :size="12" :stroke-width="1.75" />
          </button>
          <ChevronDown :size="9" class="mx-0.5 text-muted" />
        </div>
        <button type="button" title="Local / global" class="flex size-[22px] items-center justify-center rounded-d5 bg-[#2b2e35]/90 text-[#c3c6cc]"><Globe :size="12" /></button>
        <button type="button" title="Snap to walls" class="flex size-[22px] items-center justify-center rounded-d5" :class="przyciaganie ? 'bg-accent text-white' : 'bg-[#2b2e35]/90 text-[#c3c6cc]'" @click="$przyciaganie.set(!przyciaganie)"><Magnet :size="12" /></button>
        <button type="button" title="Material picker" class="flex size-[22px] items-center justify-center rounded-d5 bg-[#2b2e35]/90 text-[#c3c6cc]"><Pipette :size="12" /></button>
      </div>
      <div class="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
        <MenuSceny rodzaj="kamera" />
        <MenuSceny rodzaj="wyswietlanie" />
      </div>
      <PasekSkrotow />
    </template>
  </section>
</template>
