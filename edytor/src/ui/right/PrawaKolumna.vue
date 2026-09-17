<script setup lang="ts">
import { Camera, Play } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { watch } from 'vue'

import { $tryb, $trybPrawejKolumny, $zakladkaPrawa, $zaznaczenie } from '@/stan'
import PrzyciskF from '@/ui/figma/PrzyciskF.vue'
import PanelZdjecia from '@/ui/render/PanelZdjecia.vue'

import ZakladkaInspektor from './ZakladkaInspektor.vue'
import ZakladkaPrototyp from './ZakladkaPrototyp.vue'

/* Figma UI3: u góry akcje (Image, Walk ▶), pod nimi zakładki Inspector → Prototype (ruchy drzwi i szuflad).
   Environment jest w lewym panelu (szyna, pod Assets); jakość renderu — ikona na pływającym pasku. */
const tryb = useStore($trybPrawejKolumny)
const zakladka = useStore($zakladkaPrawa)
const zaznaczenie = useStore($zaznaczenie)
const zakladki = ['inspector', 'prototype'] as const
watch(zaznaczenie, (z) => z && $zakladkaPrawa.set('inspector'))
</script>

<template>
  <aside class="flex min-h-0 flex-col border-l border-[#2a2c31] bg-panel">
    <div class="flex h-12 shrink-0 items-center gap-1 border-b border-[#2a2c31] px-3">
      <PrzyciskF :ikona="Camera" opis="Image" :aktywny="tryb === 'zdjecie'" @click="$trybPrawejKolumny.set(tryb === 'zdjecie' ? 'edycja' : 'zdjecie')" />
      <button type="button" class="ml-auto flex h-7 items-center gap-1.5 rounded-[6px] bg-[#0d99ff] px-3 text-[12px] font-medium text-white hover:bg-[#2aa5ff]" @click="$tryb.set('walk')">
        <Play :size="12" fill="currentColor" /> Walk
      </button>
    </div>
    <PanelZdjecia v-if="tryb === 'zdjecie'" />
    <TabsRoot v-else :model-value="zakladka" class="flex min-h-0 flex-1 flex-col" @update:model-value="$zakladkaPrawa.set($event as typeof zakladka)">
      <TabsList class="flex h-10 shrink-0 items-center gap-1 px-3">
        <TabsTrigger
          v-for="z in zakladki"
          :key="z"
          :value="z"
          class="h-6 rounded-[5px] px-2 text-[12px] capitalize text-[#a4a7ae] outline-none data-[state=active]:bg-[#2c2e34] data-[state=active]:font-semibold data-[state=active]:text-white"
        >
          {{ z }}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="inspector" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaInspektor /></TabsContent>
      <TabsContent value="prototype" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaPrototyp /></TabsContent>
    </TabsRoot>
  </aside>
</template>
