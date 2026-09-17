<script setup lang="ts">
import { Upload } from '@lucide/vue'
import { computed, ref } from 'vue'

import { palety } from '@/data/mieszkanie'
import Pole from '@/ui/primitives/Pole.vue'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'

/* Brak w D5 → wzór Spline (próbki kolorów przy materiale). Paleta z JSON/SVG,
   stosowana przez role, kolejność kolorów albo ręcznie. */
const wybrana = ref('klon-kobalt')
const tryb = ref('roles')
const paleta = computed(() => palety.find((p) => p.id === wybrana.value)!)
</script>

<template>
  <Sekcja tytul="Color Palette">
    <template #akcje><PrzyciskIkona :ikona="Upload" opis="Import palette (JSON or SVG)" :rozmiar="12" :kwadrat="20" /></template>
    <button
      v-for="p in palety"
      :key="p.id"
      type="button"
      class="flex h-[26px] items-center gap-2 rounded-d5 px-1 text-left"
      :class="wybrana === p.id ? 'bg-[#2a2d34] ring-1 ring-accent' : 'hover:bg-[#23262c]'"
      @click="wybrana = p.id"
    >
      <span class="flex h-4 w-14 shrink-0 overflow-hidden rounded-[2px]"><i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" /></span>
      <span class="truncate text-xs" :class="wybrana === p.id ? 'text-white' : 'text-label'">{{ p.nazwa }}</span>
    </button>
    <Pole etykieta="Apply By">
      <Segmenty v-model="tryb" :opcje="[{ wartosc: 'roles', etykieta: 'Roles' }, { wartosc: 'order', etykieta: 'Order' }, { wartosc: 'manual', etykieta: 'Manual' }]" />
    </Pole>
    <ul class="grid grid-cols-5 gap-1">
      <li v-for="k in paleta.kolory" :key="k.rola" class="flex flex-col items-center gap-0.5">
        <span class="h-[22px] w-full rounded-[2px] ring-1 ring-white/10" :style="{ background: k.hex }" />
        <span class="w-full truncate text-center text-[9px] text-muted">{{ k.rola }}</span>
      </li>
    </ul>
  </Sekcja>
</template>
