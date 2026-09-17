<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import type { Component } from 'vue'

/* D5: płaska ikona 16 px bez tła; aktywna na niebieskim kwadracie (np. ikona ustawień mapy). */
withDefaults(defineProps<{ ikona: Component; opis: string; aktywny?: boolean; rozmiar?: number; kwadrat?: number }>(), { rozmiar: 16, kwadrat: 26 })
// TooltipRoot nie renderuje elementu, więc @click i inne atrybuty trafiają jawnie na <button>.
defineOptions({ inheritAttrs: false })
</script>

<template>
  <TooltipRoot :delay-duration="500">
    <TooltipTrigger as-child>
      <button
        v-bind="$attrs"
        type="button"
        :aria-label="opis"
        :aria-pressed="aktywny"
        :style="{ width: kwadrat + 'px', height: kwadrat + 'px' }"
        class="flex shrink-0 items-center justify-center rounded-d5 text-[#c3c6cc] outline-none hover:bg-hover hover:text-white"
        :class="aktywny ? 'bg-accent text-white hover:bg-accent' : ''"
      >
        <component :is="ikona" :size="rozmiar" :stroke-width="1.5" />
      </button>
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent :side-offset="5" class="z-[80] rounded-d5 bg-[#0b0c0e] px-2 py-1 text-2xs text-white shadow-lg">{{ opis }}</TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
