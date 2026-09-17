<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { PropertySectionContent, PropertySectionHeader, PropertySectionRoot, PropertySectionTitle } from '@open-pencil/vue'

/* Zwijana sekcja panelu (D5: nagłówek sekcji z chevronem, cienki separator).
   Uwaga: prop boolean bez wartości Vue rzutuje na false, stąd jawna wartość domyślna. */
withDefaults(defineProps<{ tytul: string; otwarta?: boolean }>(), { otwarta: true })
</script>

<template>
  <PropertySectionRoot v-slot="{ open, actions }" :default-open="otwarta" class="border-b border-line">
    <PropertySectionHeader class="group flex h-8 items-center gap-1 px-3 select-none" @click="actions.toggle()">
      <PropertySectionTitle class="flex-1 text-xs font-medium text-text/90">{{ tytul }}</PropertySectionTitle>
      <div class="flex items-center" @click.stop><slot name="akcje" /></div>
      <ChevronDown :size="13" class="text-faint transition-transform" :class="open ? '' : '-rotate-90'" />
    </PropertySectionHeader>
    <PropertySectionContent class="flex flex-col gap-1 px-3 pb-3">
      <slot />
    </PropertySectionContent>
  </PropertySectionRoot>
</template>
