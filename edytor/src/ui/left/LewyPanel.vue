<script setup lang="ts">
import { useStore } from '@nanostores/vue'

import { $panelLewy } from '@/stan'

import ListaObiektow from './ListaObiektow.vue'
import ListaWarstw from './ListaWarstw.vue'
import ListaWidokow from './ListaWidokow.vue'
import PanelAgenta from './PanelAgenta.vue'
import PanelPalet from './PanelPalet.vue'
import PanelProjektu from './PanelProjektu.vue'
import ZakladkaOtoczenie from '@/ui/right/ZakladkaOtoczenie.vue'

/* Lewy panel sterowany szyną (Figma UI3). Agent — domyślnie; Scene — lista scen, warstwy, obiekty (logika D5);
   Palettes — palety kolorów (jak Variables); Environment — niebo, słońce, pogoda (pod Assets); File — projekt. */
const panel = useStore($panelLewy)
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-[#2a2c31] bg-panel">
    <PanelAgenta v-if="panel === 'agent'" />
    <template v-else-if="panel === 'scene'">
      <ListaWidokow class="min-h-0 flex-[1.2]" />
      <ListaWarstw class="shrink-0" />
      <ListaObiektow class="min-h-0 flex-1" />
    </template>
    <PanelPalet v-else-if="panel === 'palettes'" />
    <template v-else-if="panel === 'environment'">
      <div class="flex h-14 shrink-0 items-center border-b border-[#2a2c31] px-4 text-[13px] font-semibold text-white">Environment</div>
      <div class="min-h-0 flex-1 overflow-y-auto"><ZakladkaOtoczenie /></div>
    </template>
    <PanelProjektu v-else />
  </aside>
</template>
