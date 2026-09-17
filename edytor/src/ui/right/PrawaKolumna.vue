<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { $trybPrawejKolumny, $zakladkaPrawa } from '@/stan'
import PanelZdjecia from '@/ui/render/PanelZdjecia.vue'

import ZakladkaEfekty from './ZakladkaEfekty.vue'
import ZakladkaInspektor from './ZakladkaInspektor.vue'
import ZakladkaOtoczenie from './ZakladkaOtoczenie.vue'

/* D5: zakładki Environment / Effect / Inspector. Tryb Zdjęcie podmienia kolumnę na ustawienia obrazu. */
const tryb = useStore($trybPrawejKolumny)
const zakladka = useStore($zakladkaPrawa)
const zakladki = [
  { id: 'otoczenie', nazwa: 'Otoczenie' },
  { id: 'efekty', nazwa: 'Efekty' },
  { id: 'inspektor', nazwa: 'Inspektor' }
] as const
</script>

<template>
  <aside class="flex min-h-0 flex-col border-l border-line bg-panel">
    <PanelZdjecia v-if="tryb === 'zdjecie'" />
    <TabsRoot v-else :model-value="zakladka" class="flex min-h-0 flex-1 flex-col" @update:model-value="$zakladkaPrawa.set($event as typeof zakladka)">
      <TabsList class="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
        <TabsTrigger v-for="z in zakladki" :key="z.id" :value="z.id" class="text-xs text-faint data-[state=active]:font-medium data-[state=active]:text-text">
          {{ z.nazwa }}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="otoczenie" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaOtoczenie /></TabsContent>
      <TabsContent value="efekty" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaEfekty /></TabsContent>
      <TabsContent value="inspektor" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaInspektor /></TabsContent>
    </TabsRoot>
  </aside>
</template>
