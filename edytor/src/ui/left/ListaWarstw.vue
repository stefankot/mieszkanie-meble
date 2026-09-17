<script setup lang="ts">
import { Check, ChevronUp, Layers, Plus } from '@lucide/vue'
import { ref } from 'vue'

import { warstwy } from '@/data/mieszkanie'

/* D5 Layer: nagłówek 36 px z „+” i zwijaniem; wiersz „✓ ⊜ Default Layer” (skok 25 px, ✓ 16 px od lewej). */
const lista = ref(structuredClone(warstwy))
const otwarta = ref(true)
</script>

<template>
  <section class="border-t border-line">
    <div class="flex h-9 items-center gap-4 pl-(--pad-x) pr-2.5 text-label">
      <span class="flex-1 text-xs">Layer</span>
      <button type="button" aria-label="Add layer" class="hover:text-white"><Plus :size="14" /></button>
      <button type="button" aria-label="Collapse" class="hover:text-white" @click="otwarta = !otwarta"><ChevronUp :size="12" :class="otwarta ? '' : 'rotate-180'" /></button>
    </div>
    <ul v-if="otwarta" class="pb-2">
      <li v-for="w in lista" :key="w.id">
        <button type="button" class="flex h-(--wiersz-listy) w-full items-center gap-[9px] pl-3 pr-2.5 text-left hover:bg-[#24262b]" @click="w.widoczna = !w.widoczna">
          <Check :size="12" :class="w.widoczna ? 'text-text' : 'text-transparent'" />
          <Layers :size="12" class="text-label" />
          <span class="truncate text-xs" :class="w.widoczna ? 'text-text' : 'text-faint'">{{ w.nazwa }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
