<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import type { Component } from 'vue'

/* Figma UI3: ikona 24×24 przy prawej krawędzi wiersza; aktywna — niebieskawe tło i jasnoniebieska ikona
   (jak przełącznik Auto layout). */
defineProps<{ ikona: Component; opis: string; aktywny?: boolean }>()
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
        class="flex size-6 shrink-0 items-center justify-center rounded-[5px] outline-none"
        :class="aktywny ? 'bg-[#34406a] text-[#8cc8ff]' : 'text-[#e6e7ea] hover:bg-white/5'"
      >
        <component :is="ikona" :size="15" :stroke-width="1.6" />
      </button>
    </TooltipTrigger>
    <TooltipPortal><TooltipContent :side-offset="5" class="z-[80] rounded-[4px] bg-black px-2 py-1 text-[10.5px] text-white">{{ opis }}</TooltipContent></TooltipPortal>
  </TooltipRoot>
</template>
