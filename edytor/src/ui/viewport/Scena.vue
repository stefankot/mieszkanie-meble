<script setup lang="ts">
import { ChevronDown, Globe, Magnet, MousePointer2, Move3d, Pipette, Rotate3d } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui'
import { tinykeys } from 'tinykeys'
import { computed, watch } from 'vue'

import { uruchomKropki } from '@/silnik/hotspoty'
import { $silnik, kontrolka, podlaczRamke } from '@/silnik/most'
import { skrotyPowloki } from '@/skroty'
import { $narzedzie, $przyciaganie, $tryb } from '@/stan'
import Kropki from '@/ui/hotspots/Kropki.vue'
import TrybSpaceru from '@/ui/walk/TrybSpaceru.vue'

import MenuSceny from './MenuSceny.vue'
import UchwytyPolek from './UchwytyPolek.vue'
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
const aktywneNarzedzie = computed(() => narzedzia.find((n) => n.id === narzedzie.value) ?? narzedzia[0])
</script>

<template>
  <section class="relative min-h-0 min-w-0 overflow-hidden bg-[#e3e5e6]">
    <iframe :src="zrodlo" title="Apartment renderer" class="absolute inset-0 size-full border-0" @load="poZaladowaniu" />
    <Kropki />
    <UchwytyPolek />

    <TrybSpaceru v-if="tryb === 'walk'" />
    <template v-else>
      <div class="absolute left-2 top-2 z-20 flex items-center gap-[5px]">
        <DropdownMenuRoot>
          <DropdownMenuTrigger title="Transform tool" class="flex h-5 w-9 items-center justify-center gap-0.5 rounded-[3px] bg-[#3d4046]/90 text-[#e0e2e6] outline-none">
            <component :is="aktywneNarzedzie.ikona" :size="12" :stroke-width="1.75" /><ChevronDown :size="9" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="start" :side-offset="4" class="z-50 w-36 rounded-d5 bg-panel-2 p-1 shadow-2xl ring-1 ring-black/40">
              <DropdownMenuItem v-for="n in narzedzia" :key="n.id" class="flex h-6 items-center gap-2 rounded-[2px] px-2.5 text-xs text-text outline-none data-[highlighted]:bg-accent" @select="$narzedzie.set(n.id)">
                <component :is="n.ikona" :size="12" /> {{ n.opis }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <button type="button" title="Local / Global" class="flex size-5 items-center justify-center rounded-[3px] bg-[#3d4046]/90 text-[#e0e2e6]"><Globe :size="12" /></button>
        <button type="button" title="Snap to Walls" class="flex size-5 items-center justify-center rounded-[3px]" :class="przyciaganie ? 'bg-accent text-white' : 'bg-[#3d4046]/90 text-[#e0e2e6]'" @click="$przyciaganie.set(!przyciaganie)"><Magnet :size="12" /></button>
        <button type="button" title="Material Picker" class="flex size-5 items-center justify-center rounded-[3px] bg-[#3d4046]/90 text-[#e0e2e6]"><Pipette :size="12" /></button>
      </div>
      <div class="absolute right-2 top-2 z-20 flex items-center gap-[7px]">
        <MenuSceny rodzaj="kamera" />
        <MenuSceny rodzaj="wyswietlanie" />
      </div>
      <PasekSkrotow />
    </template>
  </section>
</template>
