<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import type { Component } from 'vue'

/* Figma UI3: zespolone przyciski 24 px (Alignment, Flow, Rotation). Tryb wyboru: aktywny ma ciemne tło
   i obwódkę (jak Flow). Tryb akcji: bez stanu, emituje `akcja`. Etykieta tekstowa zamiast ikony — opcjonalnie. */
defineProps<{ opcje: { wartosc: string; ikona?: Component; etykieta?: string; opis: string }[] }>()
const wybrana = defineModel<string | null>({ default: null })
const emit = defineEmits<{ akcja: [string] }>()
function klik(v: string) {
  if (wybrana.value !== null) wybrana.value = v
  emit('akcja', v)
}
</script>

<template>
  <div class="flex h-6 min-w-0 items-stretch rounded-[5px] bg-[#2c2e34]">
    <TooltipRoot v-for="(o, i) in opcje" :key="o.wartosc" :delay-duration="500">
      <TooltipTrigger as-child>
        <button
          type="button"
          :aria-label="o.opis"
          :aria-pressed="wybrana === o.wartosc"
          class="relative flex min-w-0 flex-1 items-center justify-center rounded-[5px] text-[11px] text-[#e6e7ea] outline-none hover:bg-white/5"
          :class="wybrana === o.wartosc ? 'bg-[#1b1c20] ring-1 ring-inset ring-[#505359]' : ''"
          @click="klik(o.wartosc)"
        >
          <span v-if="i && wybrana !== o.wartosc && wybrana !== opcje[i - 1].wartosc" class="absolute inset-y-1 left-0 w-px bg-[#1c1e23]" />
          <component :is="o.ikona" v-if="o.ikona" :size="15" :stroke-width="1.6" />
          <span v-else class="truncate px-1">{{ o.etykieta }}</span>
        </button>
      </TooltipTrigger>
      <TooltipPortal><TooltipContent :side-offset="5" class="z-[80] rounded-[4px] bg-black px-2 py-1 text-[10.5px] text-white">{{ o.opis }}</TooltipContent></TooltipPortal>
    </TooltipRoot>
  </div>
</template>
