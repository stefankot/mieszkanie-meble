<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { NumberFieldInput, NumberFieldRoot } from 'reka-ui'
import type { Component } from 'vue'

/* Figma UI3: pole 24 px, zaokrąglenie 5 px. Prefiks (litera lub ikona) w kolumnie 24 px — przeciąganie po nim
   zmienia wartość (scrub jak w Figmie). Opcjonalnie przyrostek („Fixed”, „Hug”) lub strzałka listy. */
const props = defineProps<{ prefiks?: string | Component; min?: number; max?: number; krok?: number; przyrostek?: string; jednostka?: string; lista?: boolean }>()
const wartosc = defineModel<number>({ required: true })

function scrub(e: PointerEvent) {
  const start = wartosc.value
  const x0 = e.clientX
  const krok = props.krok ?? 1
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const ruch = (m: PointerEvent) => {
    const v = start + Math.round((m.clientX - x0) / 2) * krok
    wartosc.value = Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, Number(v.toFixed(3))))
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
  <NumberFieldRoot v-model="wartosc" :min="min" :max="max" :step="krok ?? 1" :format-options="{ maximumFractionDigits: 2, useGrouping: false }" class="min-w-0">
    <div class="flex h-6 items-center rounded-[5px] bg-[#2c2e34] text-[11px] text-white focus-within:ring-1 focus-within:ring-[#0d99ff] hover:ring-1 hover:ring-[#3d4047]">
      <span v-if="prefiks" class="flex h-full shrink-0 cursor-ew-resize items-center justify-center text-[#a4a7ae]" :class="przyrostek ? 'w-5' : 'w-6'" @pointerdown.prevent="scrub">
        <component :is="prefiks" v-if="typeof prefiks !== 'string'" :size="13" :stroke-width="1.75" />
        <template v-else>{{ prefiks }}</template>
      </span>
      <NumberFieldInput class="min-w-0 flex-1 bg-transparent tabular-nums outline-none" :class="prefiks ? 'pr-1' : 'px-2'" />
      <span v-if="jednostka" class="pr-2 text-[#a4a7ae]">{{ jednostka }}</span>
      <span v-if="przyrostek" class="shrink-0 pr-1.5 text-[10px] text-[#c9ccd2]">{{ przyrostek }}</span>
      <ChevronDown v-if="lista" :size="12" class="mr-1.5 shrink-0 text-[#c9ccd2]" />
    </div>
  </NumberFieldRoot>
</template>
