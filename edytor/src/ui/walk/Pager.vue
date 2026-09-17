<script setup lang="ts">
import { ChevronLeft, ChevronRight, Diamond } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { computed } from 'vue'

import { widoki } from '@/data/mieszkanie'
import { $aktywnyWidok, $kropkiWidoczne } from '@/stan'

/* D5 3.1: dolny pager (~117×28 px) „◈ ‹ 1/5 ›”. ◈ włącza/wyłącza białe kropki (3D triggers). */
const aktywny = useStore($aktywnyWidok)
const kropki = useStore($kropkiWidoczne)
const indeks = computed(() => widoki.findIndex((w) => w.id === aktywny.value))
const idz = (krok: number) => $aktywnyWidok.set(widoki[(indeks.value + krok + widoki.length) % widoki.length].id)
</script>

<template>
  <div class="absolute bottom-5 left-1/2 z-20 flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-[3px] bg-[#16181c]/95 px-2.5 text-[10.5px] text-text shadow-xl">
    <button type="button" aria-label="Toggle triggers" :class="kropki ? 'text-white' : 'text-faint'" class="flex size-5 items-center justify-center" @click="$kropkiWidoczne.set(!kropki)">
      <Diamond :size="11" :fill="kropki ? 'currentColor' : 'none'" />
    </button>
    <span class="mx-0.5 h-3 w-px bg-white/10" />
    <button type="button" aria-label="Previous view" class="flex size-5 items-center justify-center text-muted hover:text-white" @click="idz(-1)"><ChevronLeft :size="12" /></button>
    <span class="min-w-7 text-center tabular-nums">{{ indeks + 1 }}/{{ widoki.length }}</span>
    <button type="button" aria-label="Next view" class="flex size-5 items-center justify-center text-muted hover:text-white" @click="idz(1)"><ChevronRight :size="12" /></button>
  </div>
</template>
