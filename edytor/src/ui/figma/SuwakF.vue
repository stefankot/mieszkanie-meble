<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'

import PoleF from './PoleF.vue'

/* Suwak liczby (np. półek) + pole 24 px obok. Reka Slider; wygląd Figma UI3. */
const props = defineProps<{ min: number; max: number; krok?: number; prefiks?: string }>()
const wartosc = defineModel<number>({ required: true })
const ustaw = (v: number[] | undefined) => v && (wartosc.value = v[0])
</script>

<template>
  <div class="col-span-2 grid grid-cols-[1fr_64px] items-center gap-2">
    <SliderRoot :model-value="[wartosc]" :min="props.min" :max="props.max" :step="krok ?? 1" class="relative flex h-6 touch-none select-none items-center" @update:model-value="ustaw">
      <SliderTrack class="relative h-1 grow rounded-full bg-[#2c2e34]">
        <SliderRange class="absolute h-full rounded-full bg-[#0d99ff]" />
      </SliderTrack>
      <SliderThumb class="block size-3.5 rounded-full bg-white shadow ring-1 ring-black/30 outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]" aria-label="Value" />
    </SliderRoot>
    <PoleF v-model="wartosc" :prefiks="prefiks" :min="min" :max="max" :krok="krok" />
  </div>
</template>
