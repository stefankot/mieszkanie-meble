<script setup lang="ts">
import { Upload } from '@lucide/vue'
import { computed, ref } from 'vue'

import { palety } from '@/data/mieszkanie'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'

/* Brak w D5 → wzór Spline (próbki kolorów przy materiale). Paleta z JSON/SVG,
   stosowana przez role w meblu, kolejność kolorów albo ręcznie per część. */
const wybrana = ref('klon-kobalt')
const tryb = ref('role')
const paleta = computed(() => palety.find((p) => p.id === wybrana.value)!)
</script>

<template>
  <Sekcja tytul="Paleta kolorów">
    <template #akcje><PrzyciskIkona :ikona="Upload" opis="Importuj paletę (JSON lub SVG)" :rozmiar="13" /></template>
    <div class="flex flex-col gap-1">
      <button
        v-for="p in palety"
        :key="p.id"
        type="button"
        class="flex items-center gap-2 rounded-md p-1 text-left"
        :class="wybrana === p.id ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-hover'"
        @click="wybrana = p.id"
      >
        <span class="flex h-5 w-24 shrink-0 overflow-hidden rounded-[4px]">
          <i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" />
        </span>
        <span class="truncate text-xs" :class="wybrana === p.id ? 'text-text' : 'text-muted'">{{ p.nazwa }}</span>
      </button>
    </div>
    <Wiersz etykieta="Zastosuj">
      <Segmenty v-model="tryb" :opcje="[{ wartosc: 'role', etykieta: 'Role' }, { wartosc: 'kolejnosc', etykieta: 'Kolejność' }, { wartosc: 'recznie', etykieta: 'Ręcznie' }]" />
    </Wiersz>
    <ul class="grid grid-cols-5 gap-1 pt-1">
      <li v-for="k in paleta.kolory" :key="k.rola" class="flex flex-col items-center gap-1">
        <span class="h-7 w-full rounded-[5px] ring-1 ring-white/10" :style="{ background: k.hex }" />
        <span class="text-[9.5px] text-faint">{{ k.rola }}</span>
      </li>
    </ul>
  </Sekcja>
</template>
