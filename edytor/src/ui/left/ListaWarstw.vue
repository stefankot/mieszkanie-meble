<script setup lang="ts">
import { Check, ChevronDown, Layers, Plus } from '@lucide/vue'
import { ref } from 'vue'

import { warstwy } from '@/data/mieszkanie'

/* D5 Layer: nagłówek z „+” i zwijaniem; wiersz „✓ ⊜ Default Layer”. */
const lista = ref(structuredClone(warstwy))
const otwarta = ref(true)
</script>

<template>
  <section class="border-t border-line">
    <div class="flex h-7 items-center gap-2 px-2.5 text-muted">
      <span class="flex-1 text-xs">Layer</span>
      <button type="button" aria-label="Add layer" class="hover:text-white"><Plus :size="13" /></button>
      <button type="button" aria-label="Collapse" class="hover:text-white" @click="otwarta = !otwarta"><ChevronDown :size="12" :class="otwarta ? '' : '-rotate-90'" /></button>
    </div>
    <ul v-if="otwarta" class="px-1 pb-1.5">
      <li v-for="w in lista" :key="w.id">
        <button type="button" class="flex h-[22px] w-full items-center gap-2 rounded-d5 px-1.5 text-left hover:bg-[#23262c]" @click="w.widoczna = !w.widoczna">
          <Check :size="11" :class="w.widoczna ? 'text-text' : 'text-transparent'" />
          <Layers :size="11" class="text-muted" />
          <span class="truncate text-xs" :class="w.widoczna ? 'text-text' : 'text-faint'">{{ w.nazwa }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
