<script setup lang="ts">
import { PanelLeftClose } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { widoki } from '@/data/mieszkanie'
import { $miniatury } from '@/silnik/most'
import { $aktywnyWidok, $panelWidokow } from '@/stan'

/* D5 3.1 prezentacja: pływająca lista slajdów — numer, miniatura, wybrany na niebieskiej karcie. */
const aktywny = useStore($aktywnyWidok)
const miniatury = useStore($miniatury)
</script>

<template>
  <aside class="absolute bottom-14 left-2 top-10 z-20 flex w-[176px] flex-col rounded-[4px] bg-[#16181c] shadow-2xl">
    <div class="flex h-8 shrink-0 items-center px-3">
      <span class="flex-1 text-[10.5px] font-medium text-text">Apartment</span>
      <button type="button" aria-label="Hide views" class="text-muted hover:text-white" @click="$panelWidokow.set(false)"><PanelLeftClose :size="13" /></button>
    </div>
    <ol class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pb-2">
      <li v-for="(w, i) in widoki" :key="w.id">
        <button
          type="button"
          class="flex w-full gap-1.5 rounded-[4px] p-1.5 text-left"
          :class="aktywny === w.id ? 'bg-accent' : 'hover:bg-white/5'"
          @click="$aktywnyWidok.set(w.id)"
        >
          <span class="w-3 pt-0.5 text-[9.5px]" :class="aktywny === w.id ? 'text-white' : 'text-muted'">{{ i + 1 }}</span>
          <span class="flex flex-1 flex-col gap-1">
            <span
              class="aspect-video w-full rounded-[3px] bg-cover bg-center"
              :style="{ backgroundImage: miniatury[w.id] ? `url(${miniatury[w.id]})` : `linear-gradient(135deg, ${w.odcien}, #1b1d22)` }"
            />
            <span class="truncate text-[10px]" :class="aktywny === w.id ? 'text-white' : 'text-label'">{{ w.nazwa }}</span>
          </span>
        </button>
      </li>
    </ol>
  </aside>
</template>
