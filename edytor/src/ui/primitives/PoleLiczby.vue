<script setup lang="ts">
import { NumberFieldInput, NumberFieldLeading, NumberFieldRoot, NumberFieldUnit, NumberFieldValue } from '@open-pencil/vue'
import { computed } from 'vue'

/* Pole liczby jak w D5: wartość, jednostka i pasek wypełnienia; przeciąganie zmienia wartość
   (scrub z @open-pencil/vue), kliknięcie pozwala wpisać liczbę lub wyrażenie. */
const props = defineProps<{ os?: string; jednostka?: string; min?: number; max?: number; krok?: number; pasek?: boolean }>()
const wartosc = defineModel<number>({ required: true })
const wypelnienie = computed(() => {
  if (!props.pasek || props.min === undefined || props.max === undefined) return 0
  return Math.min(100, Math.max(0, ((wartosc.value - props.min) / (props.max - props.min)) * 100))
})
</script>

<template>
  <NumberFieldRoot v-slot="{ attrs, editing, actions }" v-model="wartosc" :min="min" :max="max" :step="krok ?? 1" :aria-label="os ?? 'wartość'">
    <div
      v-bind="attrs"
      class="relative flex h-6 min-w-0 flex-1 items-center overflow-hidden rounded-[5px] bg-field text-xs outline-none focus-within:ring-1 focus-within:ring-accent"
      @pointerdown="!editing && actions.startScrub($event)"
    >
      <div v-if="pasek" class="pointer-events-none absolute inset-y-0 left-0 bg-white/[0.07]" :style="{ width: wypelnienie + '%' }" />
      <NumberFieldLeading v-if="os" class="relative pl-1.5 pr-1 text-2xs text-faint">{{ os }}</NumberFieldLeading>
      <NumberFieldInput class="relative min-w-0 flex-1 border-0 bg-transparent px-1.5 text-text outline-none" />
      <NumberFieldValue class="relative min-w-0 flex-1 truncate px-1.5 tabular-nums text-text" />
      <NumberFieldUnit v-if="jednostka" class="relative pr-1.5 text-2xs text-faint">{{ jednostka }}</NumberFieldUnit>
    </div>
  </NumberFieldRoot>
</template>
