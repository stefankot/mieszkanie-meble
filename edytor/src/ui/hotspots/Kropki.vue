<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { useElementSize } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'

import { $kropki } from '@/silnik/hotspoty'
import { $tryb } from '@/stan'

import PanelKontekstowy from './PanelKontekstowy.vue'

/* D5 3.1 „3D triggers” (~28 px: cienki ciemny obrys, biały pierścień, szary środek): białe kółka nad aktywnymi elementami. Klik otwiera panel obok kropki. */
const kropki = useStore($kropki)
const wybrana = ref<string | null>(null)
const { width } = useElementSize(useTemplateRef<HTMLElement>('warstwa'))
$tryb.listen(() => (wybrana.value = null))
</script>

<template>
  <div ref="warstwa" class="pointer-events-none absolute inset-0 z-10 overflow-hidden">
    <button
      v-for="k in kropki"
      :key="k.id"
      type="button"
      :aria-label="k.etykieta"
      :title="k.etykieta"
      class="pointer-events-auto absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dot shadow-[0_2px_6px_rgba(0,0,0,.4)] ring-1 ring-[#6f7176] transition-transform hover:scale-110"
      :class="wybrana === k.id ? 'scale-110 ring-accent' : ''"
      :style="{ left: k.x + 'px', top: k.y + 'px' }"
      @click="wybrana = wybrana === k.id ? null : k.id"
    >
      <span class="absolute inset-[5px] rounded-full bg-[#d6d7d9] shadow-[inset_0_1px_2px_rgba(0,0,0,.25)] ring-1 ring-[#b9babd]" />
    </button>
    <PanelKontekstowy v-if="wybrana" :id="wybrana" :szerokosc="width" @zamknij="wybrana = null" />
  </div>
</template>
