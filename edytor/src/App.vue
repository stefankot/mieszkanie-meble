<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { TooltipProvider } from 'reka-ui'
import { tinykeys } from 'tinykeys'
import { onBeforeUnmount } from 'vue'

import { skrotyPowloki } from './skroty'
import { $bibliotekaOtwarta, $tryb } from './stan'
import OknoBiblioteki from './ui/assets/OknoBiblioteki.vue'
import OknoMaterialu from './ui/material/OknoMaterialu.vue'
import PaletaPolecen from './ui/command/PaletaPolecen.vue'
import LewyPanel from './ui/left/LewyPanel.vue'
import Szyna from './ui/rail/Szyna.vue'
import PrawaKolumna from './ui/right/PrawaKolumna.vue'
import Scena from './ui/viewport/Scena.vue'

/* Start w trybie spaceru (scena na cały ekran, nakładki D5 3.1 Presentation).
   Tryb edycji: układ Figma UI3 — szyna ikon 56 px, lewy panel 264 px (AI domyślnie), scena, prawy panel 240 px.
   Ta sama ramka renderera w obu trybach (siatka zmienia tylko szablon). */
const tryb = useStore($tryb)
const biblioteka = useStore($bibliotekaOtwarta)
const odepnij = tinykeys(window, skrotyPowloki)
onBeforeUnmount(odepnij)
</script>

<template>
  <TooltipProvider>
    <!-- v-show usuwa panel z siatki, więc w trybie spaceru szablon ma jedną kolumnę. -->
    <main class="grid h-full min-h-0" :class="tryb === 'edit' ? 'grid-cols-[56px_264px_minmax(0,1fr)_var(--kolumna-prawa)]' : 'grid-cols-[minmax(0,1fr)]'">
      <Szyna v-show="tryb === 'edit'" />
      <LewyPanel v-show="tryb === 'edit'" />
      <Scena />
      <PrawaKolumna v-show="tryb === 'edit'" />
    </main>
    <OknoBiblioteki v-if="biblioteka && tryb === 'edit'" />
    <OknoMaterialu v-if="tryb === 'edit'" />
    <PaletaPolecen />
  </TooltipProvider>
</template>
