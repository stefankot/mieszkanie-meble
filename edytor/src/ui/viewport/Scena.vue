<script setup lang="ts">
import { Magnet, MousePointer2, Move3d, Rotate3d } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { tinykeys } from 'tinykeys'

import { podlaczRamke } from '@/silnik/most'
import { skrotyPowloki } from '@/skroty'
import { $narzedzie, $przyciaganie } from '@/stan'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'

import MenuSceny from './MenuSceny.vue'

/* Prawdziwy renderer w ramce (ten sam origin). Stary panel renderera jest ukrywany;
   docelowo silnik będzie sterowany przez rejestr operacji zamiast własnych kontrolek. */
const narzedzie = useStore($narzedzie)
const przyciaganie = useStore($przyciaganie)
const zrodlo = `${import.meta.env.DEV ? '/' : '../'}renderery/webgpu/mieszkanie-webgpu-v1.html`

function poZaladowaniu(e: Event) {
  const ramka = e.target as HTMLIFrameElement
  const doc = ramka.contentDocument
  if (!doc) return
  const styl = doc.createElement('style')
  styl.textContent = '#sterowanie,#joystickRuchu{display:none!important}'
  doc.head.append(styl)
  // Fokus bywa w ramce — skróty powłoki muszą działać także tam.
  if (ramka.contentWindow) tinykeys(ramka.contentWindow, skrotyPowloki)
  podlaczRamke(ramka)
}

const narzedzia = [
  { id: 'zaznacz', ikona: MousePointer2, opis: 'Zaznacz (V)' },
  { id: 'przesun', ikona: Move3d, opis: 'Przesuń (G)' },
  { id: 'obroc', ikona: Rotate3d, opis: 'Obróć (R)' }
] as const
</script>

<template>
  <section class="relative min-h-0 min-w-0 overflow-hidden bg-[#e3e5e6]">
    <iframe :src="zrodlo" title="Renderer mieszkania" class="absolute inset-0 size-full border-0" @load="poZaladowaniu" />

    <div class="absolute left-2 top-2 flex items-center gap-0.5 rounded-lg border border-line bg-panel/90 p-0.5 shadow-lg backdrop-blur">
      <PrzyciskIkona v-for="n in narzedzia" :key="n.id" :ikona="n.ikona" :opis="n.opis" :aktywny="narzedzie === n.id" @click="$narzedzie.set(n.id)" />
      <div class="mx-0.5 h-4 w-px bg-line" />
      <PrzyciskIkona :ikona="Magnet" opis="Przyciąganie do ścian" :aktywny="przyciaganie" @click="$przyciaganie.set(!przyciaganie)" />
    </div>

    <div class="absolute right-2 top-2 flex items-center gap-1">
      <MenuSceny rodzaj="kamera" />
      <MenuSceny rodzaj="wyswietlanie" />
    </div>
  </section>
</template>
