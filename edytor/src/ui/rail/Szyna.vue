<script setup lang="ts">
import { Box, CircleHelp, Folder, Layers, LibraryBig, Palette, Sparkle, SunMedium } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { $bibliotekaOtwarta, $panelLewy } from '@/stan'

import Skroty from './Skroty.vue'

/* Figma UI3: wąska szyna ikon z podpisami (56 px). Pozycje przełączają lewy panel;
   Assets otwiera pływające okno biblioteki (logika D5). Na dole pomoc ze skrótami. */
const panel = useStore($panelLewy)
const biblioteka = useStore($bibliotekaOtwarta)
const pozycje = [
  { id: 'file', nazwa: 'File', ikona: Folder },
  { id: 'agent', nazwa: 'Agent', ikona: Sparkle },
  { id: 'scene', nazwa: 'Scene', ikona: Layers },
  { id: 'palettes', nazwa: 'Palettes', ikona: Palette }
] as const
</script>

<template>
  <nav class="flex min-h-0 flex-col items-center border-r border-[#2a2c31] bg-panel pb-3 pt-3">
    <div class="mb-3 flex size-8 items-center justify-center text-white" title="Apartment editor"><Box :size="18" :stroke-width="1.6" /></div>
    <div class="mb-2 h-px w-7 bg-[#34363c]" />
    <button
      v-for="p in pozycje"
      :key="p.id"
      type="button"
      class="group flex w-full flex-col items-center gap-1 py-1.5 text-[10px]"
      :class="panel === p.id ? 'text-white' : 'text-[#a4a7ae] hover:text-white'"
      @click="$panelLewy.set(p.id)"
    >
      <span class="flex size-8 items-center justify-center rounded-[8px]" :class="panel === p.id ? 'bg-[#34406a] text-[#8cc8ff]' : 'group-hover:bg-white/5'">
        <component :is="p.ikona" :size="16" :stroke-width="1.6" />
      </span>
      {{ p.nazwa }}
    </button>
    <button
      type="button"
      class="group flex w-full flex-col items-center gap-1 py-1.5 text-[10px]"
      :class="biblioteka ? 'text-white' : 'text-[#a4a7ae] hover:text-white'"
      @click="$bibliotekaOtwarta.set(!biblioteka)"
    >
      <span class="flex size-8 items-center justify-center rounded-[8px]" :class="biblioteka ? 'bg-[#34406a] text-[#8cc8ff]' : 'group-hover:bg-white/5'">
        <LibraryBig :size="16" :stroke-width="1.6" />
      </span>
      Assets
    </button>
    <button
      type="button"
      class="group flex w-full flex-col items-center gap-1 py-1.5 text-[10px]"
      :class="panel === 'environment' ? 'text-white' : 'text-[#a4a7ae] hover:text-white'"
      @click="$panelLewy.set('environment')"
    >
      <span class="flex size-8 items-center justify-center rounded-[8px]" :class="panel === 'environment' ? 'bg-[#34406a] text-[#8cc8ff]' : 'group-hover:bg-white/5'">
        <SunMedium :size="16" :stroke-width="1.6" />
      </span>
      Environment
    </button>
    <PopoverRoot>
      <PopoverTrigger class="mt-auto flex size-8 items-center justify-center rounded-[8px] text-[#a4a7ae] outline-none hover:bg-white/5 hover:text-white" aria-label="Keyboard shortcuts">
        <CircleHelp :size="16" :stroke-width="1.6" />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent side="right" align="end" :side-offset="8" class="z-50 outline-none"><Skroty /></PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </nav>
</template>
