<script setup lang="ts">
import { Camera, FilePlus2, Footprints, Lightbulb, Menu, Palette, Route, Share, Sofa, Sparkles, Video } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { $bibliotekaOtwarta, $tryb, $trybPrawejKolumny } from '@/stan'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'

/* D5 3.x górny pasek (32 px): lewo — menu, plik, pigułka Assets; środek — narzędzia sceny;
   prawo — wyjście: tryb spaceru/prezentacji, zdjęcie, render AI, eksport. */
const biblioteka = useStore($bibliotekaOtwarta)
const tryb = useStore($trybPrawejKolumny)
</script>

<template>
  <header class="relative flex h-8 items-center bg-panel px-1">
    <div class="flex items-center gap-0.5">
      <PrzyciskIkona :ikona="Menu" opis="Menu" />
      <PrzyciskIkona :ikona="FilePlus2" opis="Project" />
      <button
        type="button"
        class="ml-1 flex h-[22px] items-center gap-1.5 rounded-full px-3 text-xs"
        :class="biblioteka ? 'bg-accent text-white' : 'bg-[#34373e] text-white hover:bg-[#3d4048]'"
        @click="$bibliotekaOtwarta.set(!biblioteka)"
      >
        Assets <Sparkles :size="11" :stroke-width="1.75" class="text-[#c3c6cc]" />
      </button>
    </div>

    <div class="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
      <PrzyciskIkona :ikona="Lightbulb" opis="Light" />
      <PrzyciskIkona :ikona="Sofa" opis="Place furniture" />
      <PrzyciskIkona :ikona="Palette" opis="Color palette" />
      <PrzyciskIkona :ikona="Route" opis="Go to point" />
    </div>

    <div class="ml-auto flex items-center gap-1">
      <PrzyciskIkona :ikona="Footprints" opis="Walk mode" @click="$tryb.set('walk')" />
      <PrzyciskIkona :ikona="Share" opis="Export project (JSON)" />
      <PrzyciskIkona :ikona="Camera" opis="Image" :aktywny="tryb === 'zdjecie'" @click="$trybPrawejKolumny.set(tryb === 'zdjecie' ? 'edycja' : 'zdjecie')" />
      <PrzyciskIkona :ikona="Sparkles" opis="AI render" @click="$trybPrawejKolumny.set('zdjecie')" />
      <PrzyciskIkona :ikona="Video" opis="Video" />
    </div>
  </header>
</template>
