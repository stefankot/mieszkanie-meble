<script setup lang="ts">
import { Eye, EyeOff, Plus } from '@lucide/vue'
import { ref } from 'vue'

import { warstwy } from '@/data/mieszkanie'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'

/* D5 Layer: widoczność grup sceny. */
const lista = ref(structuredClone(warstwy))
</script>

<template>
  <section class="border-b border-line pb-1.5">
    <div class="flex h-8 items-center px-3">
      <span class="flex-1 text-xs text-muted">Warstwy</span>
      <PrzyciskIkona :ikona="Plus" opis="Nowa warstwa" :rozmiar="14" />
    </div>
    <ul class="px-1.5">
      <li v-for="w in lista" :key="w.id" class="group flex h-6 items-center gap-2 rounded-md px-1.5 hover:bg-hover">
        <button type="button" class="text-faint hover:text-text" :aria-label="w.widoczna ? 'Ukryj' : 'Pokaż'" @click="w.widoczna = !w.widoczna">
          <component :is="w.widoczna ? Eye : EyeOff" :size="13" />
        </button>
        <span class="truncate text-xs" :class="w.widoczna ? 'text-text' : 'text-faint'">{{ w.nazwa }}</span>
      </li>
    </ul>
  </section>
</template>
