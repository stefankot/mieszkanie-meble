<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { $zakladkaLewa } from '@/stan'

import ListaObiektow from './ListaObiektow.vue'
import ListaWarstw from './ListaWarstw.vue'
import ListaWidokow from './ListaWidokow.vue'
import PanelAgenta from './PanelAgenta.vue'

/* Scene = D5 (Scene List, Layer, Object). Agent = Spline (brak odpowiednika w D5). */
const zakladka = useStore($zakladkaLewa)
</script>

<template>
  <TabsRoot :model-value="zakladka" class="flex min-h-0 flex-col bg-panel" @update:model-value="$zakladkaLewa.set($event as 'scene' | 'agent')">
    <TabsList class="flex h-(--zakladki) shrink-0 items-center gap-[15px] px-(--pad-x)">
      <TabsTrigger v-for="z in ['scene', 'agent'] as const" :key="z" :value="z" class="text-xs capitalize text-muted data-[state=active]:font-semibold data-[state=active]:text-white">{{ z }}</TabsTrigger>
    </TabsList>
    <TabsContent value="scene" class="flex min-h-0 flex-1 flex-col">
      <ListaWidokow class="min-h-0 flex-[1.2]" />
      <ListaWarstw class="shrink-0" />
      <ListaObiektow class="min-h-0 flex-1" />
    </TabsContent>
    <TabsContent value="agent" class="flex min-h-0 flex-1 flex-col"><PanelAgenta /></TabsContent>
  </TabsRoot>
</template>
