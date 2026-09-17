<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { $zakladkaLewa } from '@/stan'

import PanelAgenta from './PanelAgenta.vue'
import ListaObiektow from './ListaObiektow.vue'
import ListaWarstw from './ListaWarstw.vue'
import ListaWidokow from './ListaWidokow.vue'

/* Zakładka Scena = D5 (Scene List, Layer, Object). Zakładka Agent = Spline (brak w D5). */
const zakladka = useStore($zakladkaLewa)
const zakladki = [{ id: 'scena', nazwa: 'Scena' }, { id: 'agent', nazwa: 'Agent' }] as const
</script>

<template>
  <TabsRoot :model-value="zakladka" class="flex min-h-0 flex-col border-r border-line bg-panel" @update:model-value="$zakladkaLewa.set($event as 'scena' | 'agent')">
    <TabsList class="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
      <TabsTrigger v-for="z in zakladki" :key="z.id" :value="z.id" class="text-xs text-faint data-[state=active]:font-medium data-[state=active]:text-text">
        {{ z.nazwa }}
      </TabsTrigger>
    </TabsList>
    <TabsContent value="scena" class="flex min-h-0 flex-1 flex-col">
      <ListaWidokow class="max-h-[34%] shrink-0" />
      <ListaWarstw class="shrink-0" />
      <ListaObiektow class="min-h-0 flex-1" />
    </TabsContent>
    <TabsContent value="agent" class="flex min-h-0 flex-1 flex-col">
      <PanelAgenta />
    </TabsContent>
  </TabsRoot>
</template>
