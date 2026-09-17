<script setup lang="ts">
import { ChevronDown, Component, Diamond, DoorOpen, LayoutGrid, Lamp, Search } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { ref } from 'vue'

import { obiekty, type Wezel } from '@/data/mieszkanie'
import { $zaznaczenie } from '@/stan'

/* D5 Object / Imported: zakładki (36 px), wyszukiwarka 22 px + przycisk siatki, drzewo — skok 25 px,
   zaznaczenie pełnym niebieskim wierszem. Moduły „× N” to kopie jednej definicji (schemat v2). */
const zaznaczone = useStore($zaznaczenie)
const zakladka = ref<'object' | 'imported'>('object')
// Jak w Figmie: mebel parametryczny = komponent (fioletowy), moduł powtarzany = instancja.
const ikona = (w: Wezel) => ({ mebel: Component, modul: Diamond, mechanizm: DoorOpen, swiatlo: Lamp })[w.typ]
const kolorIkony = (w: Wezel, id: string) => (zaznaczone.value === id ? '' : w.typ === 'mebel' || w.typ === 'modul' ? 'text-[#a78bfa]' : '')
const wiersz = (id: string) => (zaznaczone.value === id ? 'bg-accent text-white' : 'text-text hover:bg-[#24262b]')
</script>

<template>
  <section class="flex min-h-0 flex-col border-t border-line">
    <div class="flex h-9 shrink-0 items-center gap-3 pl-(--pad-x) pr-2.5">
      <button v-for="z in ['object', 'imported'] as const" :key="z" type="button" class="text-xs capitalize" :class="zakladka === z ? 'font-semibold text-white' : 'text-muted'" @click="zakladka = z">{{ z }}</button>
      <ChevronDown :size="12" class="ml-auto text-label" />
    </div>
    <div class="flex shrink-0 items-center gap-1.5 pb-2 pl-1.5 pr-2.5">
      <label class="flex h-(--wys-listy) flex-1 items-center gap-1.5 rounded-d5 bg-field px-2 text-muted">
        <Search :size="12" /><input class="min-w-0 flex-1 bg-transparent text-xs text-text outline-none" />
      </label>
      <button type="button" aria-label="Grid" class="flex size-(--wys-listy) items-center justify-center rounded-d5 bg-field text-label"><LayoutGrid :size="12" /></button>
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
      <template v-for="w in obiekty" :key="w.id">
        <li>
          <button type="button" class="flex h-(--wiersz-listy) w-full items-center gap-2 rounded-[3px] px-2 text-left text-xs" :class="wiersz(w.id)" @click="$zaznaczenie.set(w.id)">
            <component :is="ikona(w)" :size="12" :stroke-width="1.75" class="shrink-0" :class="kolorIkony(w, w.id)" />
            <span class="truncate">{{ w.nazwa }}</span>
          </button>
        </li>
        <li v-for="d in w.dzieci" :key="d.id">
          <button type="button" class="flex h-(--wiersz-listy) w-full items-center gap-2 rounded-[3px] pl-[30px] pr-2 text-left text-xs" :class="wiersz(d.id)" @click="$zaznaczenie.set(d.id)">
            <component :is="ikona(d)" :size="12" :stroke-width="1.75" class="shrink-0" :class="kolorIkony(d, d.id)" />
            <span class="truncate">{{ d.nazwa }}</span>
          </button>
        </li>
      </template>
    </ul>
  </section>
</template>
