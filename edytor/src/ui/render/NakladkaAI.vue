<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { useElementSize } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

import { przyciecie, ROZMIARY } from '@/ai/kadr'
import { $nakladkaAI, $wynikiAI } from '@/ai/render'

/* Wynik AI na scenie w tym samym prostokącie, z którego wzięto kadr (przycięcie centralne).
   Porównanie A/B: przeciągana pionowa linia — po lewej render silnika, po prawej AI. */
const nakladka = useStore($nakladkaAI)
const wyniki = useStore($wynikiAI)
const ramka = useTemplateRef<HTMLElement>('ramka')
const { width, height } = useElementSize(ramka)
const wynik = computed(() => wyniki.value.find((w) => w.id === nakladka.value?.id))
const prostokat = computed(() => {
  if (!wynik.value) return null
  const [W, H] = ROZMIARY[wynik.value.orientacja]
  const p = przyciecie(width.value, height.value, W / H)
  return { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px` }
})

function przeciagnij(e: PointerEvent) {
  const el = (e.currentTarget as HTMLElement).parentElement!
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  const ruch = (m: PointerEvent) => {
    const b = el.getBoundingClientRect()
    const n = nakladka.value
    if (n) $nakladkaAI.set({ ...n, podzial: Math.min(1, Math.max(0, (m.clientX - b.left) / b.width)) })
  }
  const koniec = () => (window.removeEventListener('pointermove', ruch), window.removeEventListener('pointerup', koniec))
  window.addEventListener('pointermove', ruch)
  window.addEventListener('pointerup', koniec)
}
</script>

<template>
  <div ref="ramka" class="pointer-events-none absolute inset-0">
    <div v-if="nakladka && wynik && prostokat" class="absolute" :style="prostokat">
      <img
        :src="wynik.url"
        alt="AI render overlay"
        class="absolute inset-0 size-full"
        :style="{ opacity: nakladka.krycie, mixBlendMode: nakladka.mieszanie, clipPath: nakladka.porownanie ? `inset(0 0 0 ${nakladka.podzial * 100}%)` : 'none' }"
      />
      <template v-if="nakladka.porownanie">
        <div class="pointer-events-auto absolute inset-y-0 w-5 -translate-x-1/2 cursor-ew-resize" :style="{ left: `${nakladka.podzial * 100}%` }" @pointerdown="przeciagnij">
          <div class="mx-auto h-full w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,.5)]" />
          <div class="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#1b1d22] shadow">A|B</div>
        </div>
        <span class="absolute left-2 top-2 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Engine</span>
        <span class="absolute right-2 top-2 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] text-white">AI · {{ wynik.model }}</span>
      </template>
    </div>
  </div>
</template>
