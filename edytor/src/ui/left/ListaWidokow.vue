<script setup lang="ts">
import { EllipsisVertical, ImagePlus, Monitor } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { widoki } from '@/data/mieszkanie'
import { $miniatury } from '@/silnik/most'
import { $aktywnyWidok } from '@/stan'

/* D5 Scene List: wiersz = miniatura kadru z renderera + nazwa + ikona podglądu. */
const aktywny = useStore($aktywnyWidok)
const miniatury = useStore($miniatury)
</script>

<template>
  <section class="flex min-h-0 flex-col">
    <div class="flex h-7 shrink-0 items-center gap-2 px-2.5 text-muted">
      <span class="flex-1 text-xs">Scene List</span>
      <button type="button" aria-label="Add scene" class="hover:text-white"><ImagePlus :size="13" /></button>
      <button type="button" aria-label="More" class="hover:text-white"><EllipsisVertical :size="13" /></button>
    </div>
    <ul class="min-h-0 flex-1 overflow-y-auto px-1">
      <li v-for="w in widoki" :key="w.id">
        <button
          type="button"
          class="flex h-[42px] w-full items-center gap-2.5 rounded-d5 px-1.5 text-left"
          :class="aktywny === w.id ? 'bg-[#2a2d34]' : 'hover:bg-[#23262c]'"
          @click="$aktywnyWidok.set(w.id)"
        >
          <span
            class="h-[30px] w-12 shrink-0 rounded-[2px] bg-cover bg-center"
            :style="{ backgroundImage: miniatury[w.id] ? `url(${miniatury[w.id]})` : `linear-gradient(135deg, ${w.odcien}, #1b1d22)` }"
          />
          <span class="min-w-0 flex-1 truncate text-xs text-text">{{ w.nazwa }}</span>
          <Monitor :size="11" class="shrink-0 text-muted" />
        </button>
      </li>
    </ul>
  </section>
</template>
