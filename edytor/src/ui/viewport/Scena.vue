<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { tinykeys } from 'tinykeys'

import { uruchomKropki } from '@/silnik/hotspoty'
import { podlaczRamke } from '@/silnik/most'
import { skrotyPowloki } from '@/skroty'
import { $tryb } from '@/stan'
import Kropki from '@/ui/hotspots/Kropki.vue'
import NakladkaAI from '@/ui/render/NakladkaAI.vue'
import PasekNarzedzi from '@/ui/toolbar/PasekNarzedzi.vue'
import TrybSpaceru from '@/ui/walk/TrybSpaceru.vue'

import MiniMapa from './MiniMapa.vue'
import UchwytyPolek from './UchwytyPolek.vue'

/* Jedna ramka renderera dla obu trybów (bez przeładowania przy przełączaniu).
   Stary panel renderera jest ukryty; mapa i pasek to komponenty powłoki. */
const tryb = useStore($tryb)
const zrodlo = `${import.meta.env.DEV ? '/' : '../'}renderery/webgpu/mieszkanie-webgpu-v1.html`

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

</script>

<template>
  <section class="relative min-h-0 min-w-0 overflow-hidden bg-[#e3e5e6]">
    <iframe :src="zrodlo" title="Apartment renderer" class="absolute inset-0 size-full border-0" @load="poZaladowaniu" />
    <NakladkaAI />
    <Kropki />
    <UchwytyPolek />

    <TrybSpaceru v-if="tryb === 'walk'" />
    <MiniMapa />
    <PasekNarzedzi />
  </section>
</template>
