<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { useElementSize } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'

import { $kropki } from '@/silnik/hotspoty'
import { $tryb } from '@/stan'

import PanelKontekstowy from './PanelKontekstowy.vue'

/* D5 3.1 „3D triggers”: białe kółka nad aktywnymi elementami. Klik otwiera panel obok kropki. */
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
      class="pointer-events-auto absolute size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-dot shadow-[0_1px_4px_rgba(0,0,0,.45)] ring-[1.5px] ring-[#5f6168] transition-transform hover:scale-110"
      :class="wybrana === k.id ? 'scale-110 ring-accent' : ''"
      :style="{ left: k.x + 'px', top: k.y + 'px' }"
      @click="wybrana = wybrana === k.id ? null : k.id"
    >
      <span class="absolute inset-[5px] rounded-full bg-[#d9d9d6]" />
    </button>
    <PanelKontekstowy v-if="wybrana" :id="wybrana" :szerokosc="width" @zamknij="wybrana = null" />
  </div>
</template>
