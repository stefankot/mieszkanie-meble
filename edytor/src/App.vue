<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { TooltipProvider } from 'reka-ui'
import { tinykeys } from 'tinykeys'
import { onBeforeUnmount } from 'vue'

import { skrotyPowloki } from './skroty'
import { $bibliotekaOtwarta } from './stan'
import OknoBiblioteki from './ui/assets/OknoBiblioteki.vue'
import PaletaPolecen from './ui/command/PaletaPolecen.vue'
import LewaKolumna from './ui/left/LewaKolumna.vue'
import PrawaKolumna from './ui/right/PrawaKolumna.vue'
import GornyPasek from './ui/top-bar/GornyPasek.vue'
import Scena from './ui/viewport/Scena.vue'

/* Powłoka edytora — układ D5: górny pasek, lewa kolumna, scena, prawa kolumna, pływająca Biblioteka. */
const biblioteka = useStore($bibliotekaOtwarta)
const odepnij = tinykeys(window, skrotyPowloki)
onBeforeUnmount(odepnij)
</script>

<template>
  <TooltipProvider>
    <div class="grid h-full grid-rows-[40px_minmax(0,1fr)]">
      <GornyPasek />
      <main class="grid min-h-0 grid-cols-[232px_minmax(0,1fr)_280px]">
        <LewaKolumna />
        <Scena />
        <PrawaKolumna />
      </main>
    </div>
    <OknoBiblioteki v-if="biblioteka" />
    <PaletaPolecen />
  </TooltipProvider>
</template>
