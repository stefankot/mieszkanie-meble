<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed, watch } from 'vue'

import { $trybPrawejKolumny, $zakladkaPrawa, $zaznaczenie } from '@/stan'
import PanelZdjecia from '@/ui/render/PanelZdjecia.vue'

import ZakladkaEfekty from './ZakladkaEfekty.vue'
import ZakladkaInspektor from './ZakladkaInspektor.vue'
import ZakladkaOtoczenie from './ZakladkaOtoczenie.vue'

/* D5: zakładki Environment / Effect; Inspector pojawia się tylko przy zaznaczeniu. Ikona AI po prawej.
   Tryb Image podmienia kolumnę na ustawienia obrazu. */
const tryb = useStore($trybPrawejKolumny)
const zakladka = useStore($zakladkaPrawa)
const zaznaczenie = useStore($zaznaczenie)
const zakladki = computed(() => (zaznaczenie.value ? ['environment', 'effect', 'inspector'] : ['environment', 'effect']) as (typeof zakladka.value)[])
watch(zaznaczenie, (z) => $zakladkaPrawa.set(z ? 'inspector' : 'environment'))
</script>

<template>
  <aside class="flex min-h-0 flex-col bg-panel">
    <PanelZdjecia v-if="tryb === 'zdjecie'" />
    <TabsRoot v-else :model-value="zakladka" class="flex min-h-0 flex-1 flex-col" @update:model-value="$zakladkaPrawa.set($event as typeof zakladka)">
      <TabsList class="flex h-(--zakladki) shrink-0 items-center gap-2.5 pl-2.5 pr-2.5">
        <TabsTrigger v-for="z in zakladki" :key="z" :value="z" class="text-[10.5px] capitalize text-muted data-[state=active]:font-semibold data-[state=active]:text-white">{{ z }}</TabsTrigger>
        <Sparkles :size="12" class="ml-auto shrink-0 text-label" />
      </TabsList>
      <TabsContent value="environment" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaOtoczenie /></TabsContent>
      <TabsContent value="effect" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaEfekty /></TabsContent>
      <TabsContent value="inspector" class="min-h-0 flex-1 overflow-y-auto"><ZakladkaInspektor /></TabsContent>
    </TabsRoot>
  </aside>
</template>
