<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed } from 'vue'

/* Wiersz ustawienia: etykieta, suwak, wartość (jak suwaki obrazu w Figmie). `mnoznik` zmienia jednostkę wyświetlania (0–1 → %). */
const props = withDefaults(defineProps<{ etykieta: string; min: number; max: number; krok?: number; mnoznik?: number; jednostka?: string }>(), { krok: 0.01, mnoznik: 100, jednostka: '' })
const wartosc = defineModel<number>({ required: true })
const tekst = computed(() => `${Math.round(wartosc.value * props.mnoznik * 10) / 10}${props.jednostka}`)
function wpisz(e: Event) {
  const v = Number.parseFloat((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) wartosc.value = Math.min(props.max, Math.max(props.min, v / props.mnoznik))
  ;(e.target as HTMLInputElement).value = tekst.value
}
</script>

<template>
  <div class="grid h-7 grid-cols-[76px_1fr_44px] items-center gap-2">
    <span class="truncate text-[11px] text-[#c9ccd2]">{{ etykieta }}</span>
    <SliderRoot :model-value="[wartosc]" :min="min" :max="max" :step="krok" class="relative flex h-5 touch-none select-none items-center" @update:model-value="(v) => v && (wartosc = v[0])">
      <SliderTrack class="relative h-[3px] grow rounded-full bg-[#3a3d44]">
        <SliderRange class="absolute h-full rounded-full bg-[#c9ccd2]" />
      </SliderTrack>
      <SliderThumb class="block size-3 rounded-full bg-white shadow ring-1 ring-black/30 outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]" :aria-label="etykieta" />
    </SliderRoot>
    <input :value="tekst" :aria-label="`${etykieta} value`" class="h-6 w-full rounded-[5px] bg-[#2c2e34] px-1.5 text-right text-[11px] tabular-nums text-white outline-none focus:ring-1 focus:ring-[#0d99ff]" @change="wpisz" @keydown.enter="wpisz" />
  </div>
</template>
