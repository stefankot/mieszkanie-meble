<script setup lang="ts">
import { Download, X } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { onKeyStroke, useWindowSize } from '@vueuse/core'
import { computed } from 'vue'

import { $nakladkaAI, $wynikiAI } from '@/ai/render'

/* Wynik AI na CAŁYM ekranie (ponad panelami). Kadr był szerszy niż okno — obraz skalujemy tak, żeby część
   odpowiadająca oknu (`ekran.fx/fy`) wypełniła je dokładnie. Pod spodem ten sam kadr z silnika:
   porównanie A/B suwakiem, krycie i tryb mieszania działają względem niego. Esc zamyka. */
const nakladka = useStore($nakladkaAI)
const wyniki = useStore($wynikiAI)
const { width, height } = useWindowSize()
const wynik = computed(() => wyniki.value.find((w) => w.id === nakladka.value?.id))
const obraz = computed(() => {
  const e = wynik.value?.ekran ?? { fx: 1, fy: 1 }
  const w = width.value / e.fx
  const h = height.value / e.fy
  return { width: `${w}px`, height: `${h}px`, left: `${(width.value - w) / 2}px`, top: `${(height.value - h) / 2}px` }
})
const zmien = (zmiana: Partial<NonNullable<typeof nakladka.value>>) => nakladka.value && $nakladkaAI.set({ ...nakladka.value, ...zmiana })
onKeyStroke('Escape', () => nakladka.value && $nakladkaAI.set(null))

function przeciagnij(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  const ruch = (m: PointerEvent) => zmien({ podzial: Math.min(1, Math.max(0, m.clientX / width.value)) })
  const koniec = () => (window.removeEventListener('pointermove', ruch), window.removeEventListener('pointerup', koniec))
  window.addEventListener('pointermove', ruch)
  window.addEventListener('pointerup', koniec)
}
</script>

<template>
  <div v-if="nakladka && wynik" class="fixed inset-0 z-[60] overflow-hidden bg-black" role="dialog" aria-label="AI render">
    <img :src="wynik.zrodlo" alt="Engine frame" class="absolute max-w-none" :style="obraz" draggable="false" />
    <img
      :src="wynik.url"
      alt="AI render"
      class="absolute max-w-none"
      :style="{ ...obraz, opacity: nakladka.krycie, mixBlendMode: nakladka.mieszanie, clipPath: nakladka.porownanie ? `inset(0 0 0 ${((nakladka.podzial * width - parseFloat(obraz.left)) / parseFloat(obraz.width)) * 100}%)` : 'none' }"
      draggable="false"
    />
    <template v-if="nakladka.porownanie">
      <div class="absolute inset-y-0 w-6 -translate-x-1/2 cursor-ew-resize" :style="{ left: `${nakladka.podzial * 100}%` }" @pointerdown="przeciagnij">
        <div class="mx-auto h-full w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,.6)]" />
        <div class="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#1b1d22] shadow-lg">A|B</div>
      </div>
      <span class="absolute bottom-5 left-5 rounded-[6px] bg-black/55 px-2 py-1 text-[11px] text-white">Engine</span>
      <span class="absolute bottom-5 right-5 rounded-[6px] bg-black/55 px-2 py-1 text-[11px] text-white">AI · {{ wynik.model }}</span>
    </template>
    <div class="absolute left-1/2 top-4 flex h-11 -translate-x-1/2 items-center gap-3 rounded-[12px] bg-[#1b1d22]/90 px-3 text-[11px] text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <label class="flex items-center gap-2">Opacity
        <input type="range" min="0" max="1" step="0.01" :value="nakladka.krycie" class="w-24 accent-[#0d99ff]" @input="zmien({ krycie: Number(($event.target as HTMLInputElement).value) })" />
      </label>
      <select :value="nakladka.mieszanie" aria-label="Blend" class="h-7 rounded-[6px] bg-[#2c2e34] px-2 outline-none" @change="zmien({ mieszanie: ($event.target as HTMLSelectElement).value as 'normal' | 'luminosity' })">
        <option value="normal">Normal</option>
        <option value="luminosity">Luminosity</option>
      </select>
      <label class="flex items-center gap-1.5"><input type="checkbox" :checked="nakladka.porownanie" class="accent-[#0d99ff]" @change="zmien({ porownanie: ($event.target as HTMLInputElement).checked })" />Compare A/B</label>
      <a :href="wynik.url" download="ai-render.png" title="Download" aria-label="Download" class="flex size-7 items-center justify-center rounded-[6px] hover:bg-white/10"><Download :size="14" /></a>
      <button type="button" title="Close (Esc)" aria-label="Close" class="flex size-7 items-center justify-center rounded-[6px] hover:bg-white/10" @click="$nakladkaAI.set(null)"><X :size="14" /></button>
    </div>
  </div>
</template>
