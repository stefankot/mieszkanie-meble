<script setup lang="ts">
import { Box, Boxes, ChevronRight, DoorOpen, Lamp, LayoutGrid, Search } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { ref } from 'vue'

import { obiekty, type Wezel } from '@/data/mieszkanie'
import { $zaznaczenie } from '@/stan'

/* D5 Object / Imported: wyszukiwarka i drzewo. Moduły (× N) to kopie jednej definicji (schemat v2). */
const zaznaczone = useStore($zaznaczenie)
const rozwiniete = ref(new Set(['kuchnia', 'regal-kuchnia']))
const zakladka = ref<'obiekty' | 'zaimportowane'>('obiekty')
const ikona = (w: Wezel) => ({ mebel: Box, modul: Boxes, mechanizm: DoorOpen, swiatlo: Lamp })[w.typ]
function przelacz(id: string) {
  const s = rozwiniete.value
  s.has(id) ? s.delete(id) : s.add(id)
}
</script>

<template>
  <section class="flex min-h-0 flex-col">
    <div class="flex h-8 shrink-0 items-center gap-3 px-3">
      <button v-for="z in (['obiekty', 'zaimportowane'] as const)" :key="z" type="button" class="text-xs" :class="zakladka === z ? 'text-text' : 'text-faint'" @click="zakladka = z">
        {{ z === 'obiekty' ? 'Obiekty' : 'Zaimportowane' }}
      </button>
    </div>
    <div class="flex shrink-0 items-center gap-1 px-2 pb-1.5">
      <label class="flex h-6 flex-1 items-center gap-1.5 rounded-[5px] bg-field px-2 text-faint">
        <Search :size="12" /><input class="min-w-0 flex-1 bg-transparent text-xs text-text outline-none placeholder:text-faint" placeholder="Szukaj" />
      </label>
      <button type="button" class="flex size-6 items-center justify-center rounded-[5px] bg-field text-faint" aria-label="Widok siatki"><LayoutGrid :size="12" /></button>
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
      <template v-for="w in obiekty" :key="w.id">
        <li>
          <button
            type="button"
            class="flex h-6 w-full items-center gap-1.5 rounded-md pr-2 text-left text-xs"
            :class="zaznaczone === w.id ? 'bg-accent text-white' : 'text-text hover:bg-hover'"
            @click="$zaznaczenie.set(w.id)"
          >
            <span class="flex w-4 justify-center" @click.stop="w.dzieci && przelacz(w.id)">
              <ChevronRight v-if="w.dzieci" :size="11" class="transition-transform" :class="rozwiniete.has(w.id) ? 'rotate-90' : ''" />
            </span>
            <component :is="ikona(w)" :size="13" :stroke-width="1.75" class="shrink-0 opacity-80" />
            <span class="flex-1 truncate">{{ w.nazwa }}</span>
            <span v-if="w.opis" class="text-2xs" :class="zaznaczone === w.id ? 'text-white/70' : 'text-faint'">{{ w.opis }}</span>
          </button>
        </li>
        <template v-if="w.dzieci && rozwiniete.has(w.id)">
          <li v-for="d in w.dzieci" :key="d.id">
            <button
              type="button"
              class="flex h-6 w-full items-center gap-1.5 rounded-md pl-7 pr-2 text-left text-xs"
              :class="zaznaczone === d.id ? 'bg-accent text-white' : 'text-muted hover:bg-hover'"
              @click="$zaznaczenie.set(d.id)"
            >
              <component :is="ikona(d)" :size="12" :stroke-width="1.75" class="shrink-0 opacity-70" />
              <span class="truncate">{{ d.nazwa }}</span>
            </button>
          </li>
        </template>
      </template>
    </ul>
  </section>
</template>
