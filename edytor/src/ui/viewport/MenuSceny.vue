<script setup lang="ts">
import { Check, ChevronDown, Eye, ScanLine } from '@lucide/vue'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

/* D5: przyciski „Camera ▾” i „Display ▾” w prawym górnym rogu sceny. */
const props = defineProps<{ rodzaj: 'kamera' | 'wyswietlanie' }>()
const wybrane = ref(props.rodzaj === 'kamera' ? 'walk' : 'high')
const konfiguracja = computed(() =>
  props.rodzaj === 'kamera'
    ? { nazwa: 'Camera', ikona: ScanLine, grupy: [
        { etykieta: 'Mode', opcje: [['walk', 'Walk'], ['orbit', 'Orbit'], ['arch', 'Straight verticals']] },
        { etykieta: 'Frames', opcje: [['save', 'Save frame…'], ['fov', 'Field of view 42°']] }
      ] }
    : { nazwa: 'Display', ikona: Eye, grupy: [
        { etykieta: 'Render priority', opcje: [['smooth', 'Smooth'], ['high', 'High quality'], ['photo', 'Photo (still)']] },
        { etykieta: 'Show', opcje: [['triggers', 'Triggers'], ['navmesh', 'Navigation mesh'], ['fps', 'FPS']] }
      ] }
)
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger class="flex h-5 items-center gap-1 rounded-d5 bg-[#3a3d44]/85 px-1.5 text-[10.5px] text-white outline-none hover:bg-[#474a52]">
      <component :is="konfiguracja.ikona" :size="11" :stroke-width="1.75" /> {{ konfiguracja.nazwa }} <ChevronDown :size="10" class="text-[#c3c6cc]" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent align="end" :side-offset="3" class="z-50 w-44 rounded-d5 bg-panel-2 p-1 shadow-2xl ring-1 ring-black/40">
        <template v-for="(g, i) in konfiguracja.grupy" :key="g.etykieta">
          <DropdownMenuSeparator v-if="i" class="my-1 h-px bg-line" />
          <DropdownMenuLabel class="px-2 py-1 text-2xs text-muted">{{ g.etykieta }}</DropdownMenuLabel>
          <DropdownMenuItem v-for="[id, nazwa] in g.opcje" :key="id" class="flex h-[22px] items-center gap-2 rounded-[2px] px-2 text-xs text-text outline-none data-[highlighted]:bg-accent" @select="wybrane = id">
            <span class="flex-1">{{ nazwa }}</span><Check v-if="wybrane === id" :size="11" />
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
