<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'

/* D5 3.x: „⌄ Weather” — chevron 7 px od lewej, tytuł pogrubiony, nagłówek 32 px;
   ostatni wiersz → nagłówek ~43 px, nagłówek → pierwszy wiersz ~32 px. */
withDefaults(defineProps<{ tytul: string; otwarta?: boolean }>(), { otwarta: true })
</script>

<template>
  <CollapsibleRoot v-slot="{ open }" :default-open="otwarta" class="border-b border-line">
    <div class="flex h-(--naglowek-sekcji) items-center pr-(--pad-prawy)">
      <CollapsibleTrigger class="flex h-full flex-1 items-center gap-[3px] pl-[5px] text-xs font-semibold text-text outline-none">
        <ChevronDown :size="11" :stroke-width="2.25" class="text-muted transition-transform" :class="open ? '' : '-rotate-90'" />
        {{ tytul }}
      </CollapsibleTrigger>
      <slot name="akcje" />
    </div>
    <CollapsibleContent class="flex flex-col gap-(--odstep) pb-3 pl-(--pad-x) pr-(--pad-prawy)">
      <slot />
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
