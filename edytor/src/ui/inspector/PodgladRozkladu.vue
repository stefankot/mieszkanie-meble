<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { rozloz, wlasnyZeSrodkow } from '@/meble/rozklad'
import { zmienUklad, type UkladMebla } from '@/meble/uklad'

/* Podgląd frontu mebla (jak siatka Alignment w Figmie): linie półek i przegród. Linię półki można przeciągnąć —
   rozkład przechodzi w „Custom”, a zapis w cm aktualizuje się (to samo co uchwyty na scenie). */
const props = defineProps<{ mebel: string; uklad: UkladMebla; wnetrze: number }>()
const pudelko = useTemplateRef<HTMLElement>('pudelko')
const wynik = computed(() => rozloz(props.wnetrze, props.uklad.grubosc, { liczba: props.uklad.polki, ...props.uklad }))
const kolumny = computed(() => (props.uklad.przeplyw === 'wiersze' ? 1 : props.uklad.kolumny))

function przeciagnij(i: number, e: PointerEvent) {
  const el = pudelko.value
  if (!el) return
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const r = el.getBoundingClientRect()
  const ruch = (m: PointerEvent) => {
    const srodki = [...wynik.value.srodkiPolek]
    const min = props.uklad.grubosc + 50
    const y = (1 - (m.clientY - r.top) / r.height) * props.wnetrze
    srodki[i] = Math.min((srodki[i + 1] ?? props.wnetrze) - min, Math.max((srodki[i - 1] ?? 0) + min, y))
    zmienUklad(props.mebel, { rozklad: 'wlasne', wlasne: wlasnyZeSrodkow(props.wnetrze, props.uklad.grubosc, srodki) })
  }
  const koniec = () => {
    window.removeEventListener('pointermove', ruch)
    window.removeEventListener('pointerup', koniec)
  }
  window.addEventListener('pointermove', ruch)
  window.addEventListener('pointerup', koniec)
}
</script>

<template>
  <div ref="pudelko" class="relative row-span-2 h-full min-h-[56px] rounded-[5px] bg-[#2c2e34] ring-1 ring-inset ring-[#3a3d44]">
    <span v-for="k in kolumny - 1" :key="'k' + k" class="absolute inset-y-1.5 w-px bg-[#5b5f67]" :style="{ left: `${(k / kolumny) * 100}%` }" />
    <button
      v-for="(s, i) in wynik.srodkiPolek"
      :key="i"
      type="button"
      :aria-label="`Shelf ${i + 1}`"
      class="group absolute inset-x-1.5 h-2 -translate-y-1/2 cursor-ns-resize"
      :style="{ top: `${(1 - s / wnetrze) * 100}%` }"
      @pointerdown.prevent="przeciagnij(i, $event)"
    >
      <span class="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-[#8cc8ff] group-hover:bg-white" />
    </button>
  </div>
</template>
