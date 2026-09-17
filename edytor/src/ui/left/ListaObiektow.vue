<script setup lang="ts">
import { Box, Boxes, ChevronDown, DoorOpen, LayoutGrid, Lamp, Search } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { ref } from 'vue'

import { obiekty, type Wezel } from '@/data/mieszkanie'
import { $zaznaczenie } from '@/stan'

/* D5 Object / Imported: wyszukiwarka + przycisk siatki, drzewo z wcięciami, zaznaczenie pełnym niebieskim wierszem.
   Moduły „× N” to kopie jednej definicji (schemat v2). */
const zaznaczone = useStore($zaznaczenie)
const zakladka = ref<'object' | 'imported'>('object')
const ikona = (w: Wezel) => ({ mebel: Box, modul: Boxes, mechanizm: DoorOpen, swiatlo: Lamp })[w.typ]
const wiersz = (id: string) => (zaznaczone.value === id ? 'bg-accent text-white' : 'text-text hover:bg-[#23262c]')
</script>

<template>
  <section class="flex min-h-0 flex-col border-t border-line">
    <div class="flex h-7 shrink-0 items-center gap-3 px-2.5">
      <button v-for="z in ['object', 'imported'] as const" :key="z" type="button" class="text-xs capitalize" :class="zakladka === z ? 'text-white' : 'text-muted'" @click="zakladka = z">{{ z }}</button>
      <ChevronDown :size="12" class="ml-auto text-muted" />
    </div>
    <div class="flex shrink-0 items-center gap-1 px-1.5 pb-1">
      <label class="flex h-[22px] flex-1 items-center gap-1.5 rounded-d5 bg-field px-1.5 text-muted">
        <Search :size="11" /><input class="min-w-0 flex-1 bg-transparent text-xs text-text outline-none" />
      </label>
      <button type="button" aria-label="Grid" class="flex size-[22px] items-center justify-center rounded-d5 bg-field text-muted"><LayoutGrid :size="11" /></button>
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
      <template v-for="w in obiekty" :key="w.id">
        <li>
          <button type="button" class="flex h-[22px] w-full items-center gap-1.5 rounded-d5 px-1.5 text-left text-xs" :class="wiersz(w.id)" @click="$zaznaczenie.set(w.id)">
            <component :is="ikona(w)" :size="11" :stroke-width="1.75" class="shrink-0" />
            <span class="truncate">{{ w.nazwa }}</span>
          </button>
        </li>
        <li v-for="d in w.dzieci" :key="d.id">
          <button type="button" class="flex h-[22px] w-full items-center gap-1.5 rounded-d5 pl-5 pr-1.5 text-left text-xs" :class="wiersz(d.id)" @click="$zaznaczenie.set(d.id)">
            <component :is="ikona(d)" :size="11" :stroke-width="1.75" class="shrink-0 opacity-80" />
            <span class="truncate">{{ d.nazwa }}</span>
          </button>
        </li>
      </template>
    </ul>
  </section>
</template>
