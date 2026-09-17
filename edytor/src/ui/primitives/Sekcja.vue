<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'

/* D5 3.x: nagłówek sekcji z chevronem po lewej („⌄ Weather”), bez obramowań, akcje po prawej. */
withDefaults(defineProps<{ tytul: string; otwarta?: boolean }>(), { otwarta: true })
</script>

<template>
  <CollapsibleRoot v-slot="{ open }" :default-open="otwarta" class="border-b border-line">
    <div class="flex h-7 items-center pr-2">
      <CollapsibleTrigger class="flex h-full flex-1 items-center gap-1 pl-1.5 text-xs font-medium text-text outline-none">
        <ChevronDown :size="12" :stroke-width="2" class="text-muted transition-transform" :class="open ? '' : '-rotate-90'" />
        {{ tytul }}
      </CollapsibleTrigger>
      <slot name="akcje" />
    </div>
    <CollapsibleContent class="flex flex-col gap-1.5 px-2.5 pb-2.5">
      <slot />
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
