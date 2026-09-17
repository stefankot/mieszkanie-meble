<script setup lang="ts">
import { PanelLeftClose } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { widoki } from '@/data/mieszkanie'
import { $miniatury } from '@/silnik/miniatury'
import { $aktywnyWidok, $panelWidokow } from '@/stan'

/* D5 3.1 prezentacja: pływająca lista slajdów (~177 px). Wiersz = numer w lewym górnym rogu + miniatura ~128×73,
   skok ~91 px, wybrany na niebieskiej karcie. Bez podpisów (jak D5) — nazwa w podpowiedzi. */
const aktywny = useStore($aktywnyWidok)
const miniatury = useStore($miniatury)
</script>

<template>
  <aside class="absolute bottom-16 left-3 top-10 z-20 flex w-[177px] flex-col rounded-[4px] bg-[#16181c] shadow-2xl">
    <div class="flex h-[34px] shrink-0 items-center pl-[15px] pr-3">
      <span class="flex-1 text-[10.5px] font-semibold text-text">Apartment</span>
      <button type="button" aria-label="Hide views" class="text-label hover:text-white" @click="$panelWidokow.set(false)"><PanelLeftClose :size="13" /></button>
    </div>
    <ol class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[7px] pb-3">
      <li v-for="(w, i) in widoki" :key="w.id">
        <button
          type="button"
          :title="w.nazwa"
          class="flex w-full gap-2 rounded-[4px] py-[5px] pl-[9px] pr-[5px] text-left"
          :class="aktywny === w.id ? 'bg-accent' : 'hover:bg-white/5'"
          @click="$aktywnyWidok.set(w.id)"
        >
          <span class="w-2 pt-0.5 text-[9.5px]" :class="aktywny === w.id ? 'text-white' : 'text-label'">{{ i + 1 }}</span>
          <span
            class="aspect-[128/73] flex-1 rounded-[3px] bg-cover bg-center"
            :style="{ backgroundImage: miniatury[w.id] ? `url(${miniatury[w.id]})` : `linear-gradient(135deg, ${w.odcien}, #1b1d22)` }"
          />
        </button>
      </li>
    </ol>
  </aside>
</template>
