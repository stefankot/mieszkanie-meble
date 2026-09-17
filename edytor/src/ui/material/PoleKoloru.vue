<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import WyborKoloru from '@/ui/kolor/WyborKoloru.vue'

/* Wiersz koloru w oknie materiału: próbka + HEX, klik otwiera color picker obok okna. */
defineProps<{ etykieta: string }>()
const kolor = defineModel<string>({ required: true })
</script>

<template>
  <div class="grid h-7 grid-cols-[76px_1fr] items-center gap-2">
    <span class="truncate text-[11px] text-[#c9ccd2]">{{ etykieta }}</span>
    <PopoverRoot>
      <PopoverTrigger class="flex h-6 items-center gap-2 rounded-[5px] bg-[#2c2e34] pl-1 pr-2 text-left outline-none hover:ring-1 hover:ring-[#44474e] data-[state=open]:ring-1 data-[state=open]:ring-[#0d99ff]">
        <span class="size-4 shrink-0 rounded-[3px] ring-1 ring-inset ring-white/15" :style="{ background: kolor }" />
        <span class="flex-1 text-[11px] uppercase tabular-nums">{{ kolor.slice(1) }}</span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent side="left" align="start" :side-offset="16" class="z-50 outline-none"><WyborKoloru v-model="kolor" /></PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
