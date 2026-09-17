<script setup lang="ts">
import { ChevronRight, SlidersHorizontal } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { computed } from 'vue'

import { $wersjaMaterialow, grupyMaterialow } from '@/silnik/materialyMebla'
import { $silnik } from '@/silnik/most'
import { $oknoMaterialu } from '@/stan'
import SekcjaF from '@/ui/figma/SekcjaF.vue'
import KulkaMaterialu from '@/ui/material/KulkaMaterialu.vue'

/* Selection materials: grupy elementów o wspólnym materiale jako kulki presetów (D5). Klik — biblioteka presetów,
   suwaki — ustawienia własne; oba w pływającym oknie i zawsze dla całej grupy (jak Figma). */
const props = defineProps<{ mebel: string }>()
const silnik = useStore($silnik)
const wersja = useStore($wersjaMaterialow)
const okno = useStore($oknoMaterialu)
const grupy = computed(() => (void wersja.value, grupyMaterialow(silnik.value, props.mebel)))
const RODZAJ = { solid: 'Solid', texture: 'Texture', pattern: 'Pattern' } as const
const otworz = (klucz: string, zakladka: 'custom' | 'libraries') => $oknoMaterialu.set({ mebel: props.mebel, klucz, zakladka })
</script>

<template>
  <SekcjaF tytul="Selection materials">
    <p v-if="!grupy.length" class="text-[11px] text-[#a4a7ae]">Waiting for the scene…</p>
    <div
      v-for="g in grupy"
      :key="g.klucz"
      class="-mx-1.5 flex h-11 items-center gap-2.5 rounded-[6px] px-1.5"
      :class="okno?.klucz === g.klucz ? 'bg-[#34406a]/60' : 'hover:bg-white/[0.04]'"
    >
      <button type="button" class="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none" :title="`Choose preset for ${g.siatki.length} elements`" @click="otworz(g.klucz, 'libraries')">
        <KulkaMaterialu :ustawienia="g.ustawienia" :zrodlo="g.zrodlo" :rozmiar="32" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[12px] text-white">{{ g.ustawienia.nazwa }}</span>
          <span class="block truncate text-[10.5px] text-[#a4a7ae]">{{ RODZAJ[g.ustawienia.baza] }} · {{ g.siatki.length }} elements</span>
        </span>
        <ChevronRight :size="12" class="shrink-0 text-[#a4a7ae]" />
      </button>
      <button type="button" title="Edit material" aria-label="Edit material" class="flex size-6 shrink-0 items-center justify-center rounded-[5px] text-[#c9ccd2] hover:bg-white/5 hover:text-white" @click="otworz(g.klucz, 'custom')">
        <SlidersHorizontal :size="13" />
      </button>
    </div>
  </SekcjaF>
</template>
