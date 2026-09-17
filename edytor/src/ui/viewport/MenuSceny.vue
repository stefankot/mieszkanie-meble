<script setup lang="ts">
import { Check, ChevronDown, Monitor, Video } from '@lucide/vue'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

/* D5: przyciski „Camera” i „Display” w prawym górnym rogu sceny. */
const props = defineProps<{ rodzaj: 'kamera' | 'wyswietlanie' }>()
const wybrane = ref(props.rodzaj === 'kamera' ? 'spacer' : 'wysoka')
const konfiguracja = computed(() =>
  props.rodzaj === 'kamera'
    ? { nazwa: 'Kamera', ikona: Video, grupy: [
        { etykieta: 'Tryb', opcje: [['spacer', 'Spacer'], ['orbita', 'Orbita'], ['arch', 'Kadr architektoniczny']] },
        { etykieta: 'Kadry', opcje: [['zapisz', 'Zapisz kadr…'], ['perspektywa', 'Perspektywa 42°']] }
      ] }
    : { nazwa: 'Wyświetlanie', ikona: Monitor, grupy: [
        { etykieta: 'Priorytet', opcje: [['plynnosc', 'Płynność'], ['wysoka', 'Wysoka jakość'], ['zdjecie', 'Zdjęcie (bezruch)']] },
        { etykieta: 'Pokaż', opcje: [['minimapa', 'Mini-mapa'], ['nawigacja', 'Siatka nawigacyjna'], ['fps', 'Licznik FPS']] }
      ] }
)
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger class="flex h-7 items-center gap-1.5 rounded-lg border border-line bg-panel/90 px-2 text-xs text-text shadow-lg outline-none backdrop-blur hover:bg-hover">
      <component :is="konfiguracja.ikona" :size="13" :stroke-width="1.75" /> {{ konfiguracja.nazwa }} <ChevronDown :size="12" class="text-faint" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent align="end" :side-offset="4" class="z-50 w-48 rounded-lg border border-line bg-panel-2 p-1 shadow-xl">
        <template v-for="(g, i) in konfiguracja.grupy" :key="g.etykieta">
          <DropdownMenuSeparator v-if="i" class="my-1 h-px bg-line" />
          <DropdownMenuLabel class="px-2 py-1 text-2xs text-faint">{{ g.etykieta }}</DropdownMenuLabel>
          <DropdownMenuItem
            v-for="[id, nazwa] in g.opcje"
            :key="id"
            class="flex h-6 items-center gap-2 rounded px-2 text-xs text-text outline-none data-[highlighted]:bg-accent"
            @select="wybrane = id"
          >
            <span class="flex-1">{{ nazwa }}</span><Check v-if="wybrane === id" :size="12" />
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
