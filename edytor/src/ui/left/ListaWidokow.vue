<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { widoki } from '@/data/mieszkanie'
import { $aktywnyWidok } from '@/stan'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'

/* D5 Scene List: miniatury zapisanych widoków; klik = płynne przejście kamery. */
const aktywny = useStore($aktywnyWidok)
</script>

<template>
  <section class="flex min-h-0 flex-col border-b border-line">
    <div class="flex h-8 shrink-0 items-center px-3">
      <span class="flex-1 text-xs text-muted">Widoki</span>
      <PrzyciskIkona :ikona="Plus" opis="Zapisz bieżący widok" :rozmiar="14" />
    </div>
    <ul class="min-h-0 overflow-y-auto px-1.5 pb-2">
      <li v-for="w in widoki" :key="w.id">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md p-1 text-left"
          :class="aktywny === w.id ? 'bg-accent-soft' : 'hover:bg-hover'"
          @click="$aktywnyWidok.set(w.id)"
        >
          <span
            class="h-8 w-14 shrink-0 rounded-[4px] ring-1"
            :class="aktywny === w.id ? 'ring-accent' : 'ring-white/10'"
            :style="{ background: `linear-gradient(135deg, ${w.odcien}, #1b1b1e 85%)` }"
          />
          <span class="truncate text-xs" :class="aktywny === w.id ? 'text-text' : 'text-muted'">{{ w.nazwa }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
