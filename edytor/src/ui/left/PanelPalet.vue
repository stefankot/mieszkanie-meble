<script setup lang="ts">
import { Plus, Upload } from '@lucide/vue'
import { ref } from 'vue'

import { palety } from '@/data/mieszkanie'
import PrzyciskF from '@/ui/figma/PrzyciskF.vue'

/* Palety kolorów jako „Variables” w Figmie: kolekcje kolorów z rolami (Carcass, Front, Top, Handle, Textile).
   Import z JSON lub SVG; zastosowanie na zaznaczeniu — w Inspectorze (Color Palette). */
const wybrana = ref(palety[0].id)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-14 shrink-0 items-center gap-1 border-b border-[#2a2c31] px-4">
      <p class="flex-1 text-[13px] font-semibold text-white">Palettes</p>
      <PrzyciskF :ikona="Upload" opis="Import palette (JSON or SVG)" />
      <PrzyciskF :ikona="Plus" opis="New palette" />
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto p-2">
      <li v-for="p in palety" :key="p.id">
        <button type="button" class="w-full rounded-[8px] p-2.5 text-left" :class="wybrana === p.id ? 'bg-[#2c2e34]' : 'hover:bg-white/[0.04]'" @click="wybrana = p.id">
          <span class="mb-2 block text-[12px] font-medium text-white">{{ p.nazwa }}</span>
          <span class="grid grid-cols-5 gap-1.5">
            <span v-for="k in p.kolory" :key="k.rola" class="flex flex-col gap-1">
              <span class="h-6 rounded-[4px] ring-1 ring-white/10" :style="{ background: k.hex }" />
              <span class="truncate text-[10px] text-[#a4a7ae]">{{ k.rola }}</span>
            </span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
