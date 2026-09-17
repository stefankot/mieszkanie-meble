<script setup lang="ts">
import { EllipsisVertical, ImagePlus, Monitor } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { widoki } from '@/data/mieszkanie'
import { $miniatury } from '@/silnik/miniatury'
import { $aktywnyWidok } from '@/stan'

/* D5 3.x Scene List: nagłówek 36 px; wiersz 44 px — miniatura 48×31 (wcięcie 33 px), nazwa 8 px dalej,
   ikona monitora przy prawej krawędzi. Miniatura = kadr z renderera. */
const aktywny = useStore($aktywnyWidok)
const miniatury = useStore($miniatury)
</script>

<template>
  <section class="flex min-h-0 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-3 pl-(--pad-x) pr-2.5 text-muted">
      <span class="flex-1 text-xs text-label">Scene List</span>
      <button type="button" aria-label="Add scene" class="hover:text-white"><ImagePlus :size="13" /></button>
      <button type="button" aria-label="More" class="hover:text-white"><EllipsisVertical :size="13" /></button>
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto">
      <li v-for="w in widoki" :key="w.id">
        <button
          type="button"
          class="flex h-(--wiersz-sceny) w-full items-center gap-2 pl-[33px] pr-2.5 text-left"
          :class="aktywny === w.id ? 'bg-[#2a2d33]' : 'hover:bg-[#24262b]'"
          @click="$aktywnyWidok.set(w.id)"
        >
          <span
            class="h-[31px] w-12 shrink-0 rounded-[2px] bg-cover bg-center"
            :style="{ backgroundImage: miniatury[w.id] ? `url(${miniatury[w.id]})` : `linear-gradient(135deg, ${w.odcien}, #1b1d22)` }"
          />
          <span class="min-w-0 flex-1 truncate text-xs text-text">{{ w.nazwa }}</span>
          <Monitor :size="12" class="shrink-0 text-label" />
        </button>
      </li>
    </ul>
  </section>
</template>
