<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { TooltipProvider } from 'reka-ui'
import { tinykeys } from 'tinykeys'
import { onBeforeUnmount } from 'vue'

import { skrotyPowloki } from './skroty'
import { $bibliotekaOtwarta, $tryb } from './stan'
import OknoBiblioteki from './ui/assets/OknoBiblioteki.vue'
import PaletaPolecen from './ui/command/PaletaPolecen.vue'
import LewaKolumna from './ui/left/LewaKolumna.vue'
import PrawaKolumna from './ui/right/PrawaKolumna.vue'
import GornyPasek from './ui/top-bar/GornyPasek.vue'
import Scena from './ui/viewport/Scena.vue'

/* Start w trybie spaceru (scena na cały ekran, nakładki D5 3.1 Presentation).
   Tryb edycji: układ D5 — górny pasek 32 px, kolumny ~178 px, scena pomiędzy.
   Ta sama ramka renderera w obu trybach (siatka zmienia tylko szablon). */
const tryb = useStore($tryb)
const biblioteka = useStore($bibliotekaOtwarta)
const odepnij = tinykeys(window, skrotyPowloki)
onBeforeUnmount(odepnij)
</script>

<template>
  <TooltipProvider>
    <!-- v-show usuwa panel z siatki, więc w trybie spaceru szablon ma jeden wiersz i jedną kolumnę. -->
    <div class="grid h-full" :class="tryb === 'edit' ? 'grid-rows-[32px_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]'">
      <GornyPasek v-show="tryb === 'edit'" />
      <main class="grid min-h-0" :class="tryb === 'edit' ? 'grid-cols-[178px_minmax(0,1fr)_178px]' : 'grid-cols-[minmax(0,1fr)]'">
        <LewaKolumna v-show="tryb === 'edit'" />
        <Scena />
        <PrawaKolumna v-show="tryb === 'edit'" />
      </main>
    </div>
    <OknoBiblioteki v-if="biblioteka && tryb === 'edit'" />
    <PaletaPolecen />
  </TooltipProvider>
</template>
