<script setup lang="ts">
import { NumberFieldInput, NumberFieldRoot } from 'reka-ui'
import { computed, ref } from 'vue'

/* Pole liczby D5: wartość po lewej, jaśniejsze wypełnienie do wartości (gdy znany zakres).
   Przeciągnięcie w poziomie zmienia wartość (scrub), klik bez ruchu — wpisywanie (Reka NumberField). */
const props = defineProps<{ min?: number; max?: number; krok?: number; jednostka?: string; os?: string }>()
const wartosc = defineModel<number>({ required: true })
const przeciaganie = ref(false)
const krok = computed(() => props.krok ?? 1)
const wypelnienie = computed(() =>
  props.min === undefined || props.max === undefined ? null : Math.min(100, Math.max(0, ((wartosc.value - props.min) / (props.max - props.min)) * 100))
)

function scrub(e: PointerEvent) {
  const pole = e.currentTarget as HTMLElement
  const startX = e.clientX
  const start = wartosc.value
  const szerokosc = pole.clientWidth || 100
  const zakres = props.min !== undefined && props.max !== undefined ? props.max - props.min : krok.value * 100
  let ruszono = false
  const ruch = (m: PointerEvent) => {
    const dx = m.clientX - startX
    if (!ruszono && Math.abs(dx) < 3) return
    ruszono = true
    przeciaganie.value = true
    const surowa = start + (dx / szerokosc) * zakres
    const zaokr = Math.round(surowa / krok.value) * krok.value
    wartosc.value = Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, Number(zaokr.toFixed(4))))
  }
  const koniec = () => {
    window.removeEventListener('pointermove', ruch)
    window.removeEventListener('pointerup', koniec)
    przeciaganie.value = false
    if (!ruszono) (pole.querySelector('input') as HTMLInputElement | null)?.select()
  }
  window.addEventListener('pointermove', ruch)
  window.addEventListener('pointerup', koniec)
}
</script>

<template>
  <NumberFieldRoot v-model="wartosc" :min="min" :max="max" :step="krok" :format-options="{ maximumFractionDigits: 3, useGrouping: false }" class="min-w-0 flex-1">
    <div
      class="relative flex h-[22px] items-center overflow-hidden rounded-d5 bg-field text-xs focus-within:ring-1 focus-within:ring-accent"
      :class="przeciaganie ? 'cursor-ew-resize' : 'cursor-text'"
      @pointerdown="scrub"
    >
      <div v-if="wypelnienie !== null" class="pointer-events-none absolute inset-y-0 left-0 bg-fill" :style="{ width: wypelnienie + '%' }" />
      <span v-if="os" class="relative pl-1.5 text-2xs text-muted">{{ os }}</span>
      <NumberFieldInput class="relative min-w-0 flex-1 bg-transparent px-1.5 tabular-nums text-text outline-none" />
      <span v-if="jednostka" class="relative pr-1.5 text-2xs text-muted">{{ jednostka }}</span>
    </div>
  </NumberFieldRoot>
</template>
