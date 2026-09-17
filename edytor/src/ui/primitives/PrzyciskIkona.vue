<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import type { Component } from 'vue'

/* Przycisk z ikoną i podpowiedzią (D5: rząd akcji obiektu, narzędzia w górnym pasku). */
withDefaults(defineProps<{ ikona: Component; opis: string; aktywny?: boolean; rozmiar?: number }>(), { rozmiar: 15 })
// TooltipRoot nie renderuje elementu, więc @click i inne atrybuty trafiają jawnie na <button>.
defineOptions({ inheritAttrs: false })
</script>

<template>
  <TooltipRoot :delay-duration="400">
    <TooltipTrigger as-child>
      <button
        v-bind="$attrs"
        type="button"
        :aria-label="opis"
        :aria-pressed="aktywny"
        class="flex size-7 shrink-0 items-center justify-center rounded-md text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-1 focus-visible:ring-accent"
        :class="aktywny ? 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent' : ''"
      >
        <component :is="ikona" :size="rozmiar" :stroke-width="1.75" />
      </button>
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent :side-offset="6" class="z-50 rounded bg-black px-2 py-1 text-2xs text-white shadow-lg">{{ opis }}</TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
