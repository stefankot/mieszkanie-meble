<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import type { Component } from 'vue'

/* Figma UI3: przycisk pływającego paska — 32×32, zaokrąglenie 8, aktywny na niebieskim; opcjonalny chevron listy.
   Jeden element <button> jako korzeń: działa jako `as-child` w wyzwalaczach menu Reka (pozycjonowanie popovera). */
defineProps<{ ikona: Component; opis: string; aktywny?: boolean; lista?: boolean; tekst?: string }>()
</script>

<template>
  <button
    type="button"
    :title="opis"
    :aria-label="opis"
    :aria-pressed="aktywny"
    class="flex h-8 shrink-0 items-center justify-center gap-1 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]"
    :class="[aktywny ? 'bg-[#0d99ff] text-white' : 'text-[#e6e7ea] hover:bg-white/[0.07]', tekst ? 'px-2.5' : lista ? 'pl-2 pr-1' : 'w-8']"
  >
    <component :is="ikona" :size="17" :stroke-width="1.6" />
    <span v-if="tekst" class="text-[12px] font-medium">{{ tekst }}</span>
    <ChevronDown v-if="lista" :size="11" class="opacity-70" />
  </button>
</template>
