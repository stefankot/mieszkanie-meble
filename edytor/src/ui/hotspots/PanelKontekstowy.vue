<script setup lang="ts">
import { DoorClosed, DoorOpen, Lightbulb, LightbulbOff, X } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { computed, ref } from 'vue'

import { palety } from '@/data/mieszkanie'
import { $kropki, $zrodlaKropek } from '@/silnik/hotspoty'
import { $silnik } from '@/silnik/most'
import { $tryb, $zakladkaPrawa, $zaznaczenie } from '@/stan'

import Kafelek from './Kafelek.vue'

/* Panel obok kropki — wzór D5 „All Variable Sets”: grupy opcji jako kafelki. „More” otwiera Inspector.
   Stany drzwi/szuflad działają (interakcje silnika); uchwyty, palety i barwa światła to makieta. */
const props = defineProps<{ id: string; szerokosc: number }>()
defineEmits<{ zamknij: [] }>()
const kropki = useStore($kropki)
const kropka = computed(() => kropki.value.find((k) => k.id === props.id))
const zrodlo = computed(() => $zrodlaKropek.get(props.id))
const uchwyt = ref('groove')
const paleta = ref(palety[0].id)
const swieci = ref(true)
const barwa = ref('3000')

const pozycja = computed(() => {
  const k = kropka.value
  if (!k) return { display: 'none' }
  const prawo = k.x + 210 < props.szerokosc
  return { left: (prawo ? k.x + 18 : k.x - 198) + 'px', top: Math.max(8, k.y - 40) + 'px' }
})

function ustawRuch(otwarta: boolean) {
  const s = $silnik.get()
  const z = zrodlo.value
  if (s && z?.ruch) s.interakcje.ustaw(z.ruch, otwarta ? 1 : 0)
}
function ustawWszystkie(otwarte: boolean) {
  const s = $silnik.get()
  if (!s) return
  for (const r of s.interakcje.ruchy()) if (r.mebel === zrodlo.value?.mebel) s.interakcje.ustaw(r.ruch, otwarte ? 1 : 0)
}
function wiecej() {
  $zaznaczenie.set(zrodlo.value?.mebel ?? props.id)
  $zakladkaPrawa.set('inspector')
  $tryb.set('edit')
}
</script>

<template>
  <div v-if="kropka && zrodlo" class="pointer-events-auto absolute w-[184px] rounded-[4px] bg-[#16181c] px-[11px] pb-3 pt-1 shadow-2xl ring-1 ring-white/5" :style="pozycja">
    <div class="mb-1.5 flex min-h-[26px] items-center gap-2">
      <span class="min-w-0 flex-1 text-[10.5px] font-medium leading-tight text-text">{{ kropka.etykieta }}</span>
      <button type="button" aria-label="Close" class="text-muted hover:text-white" @click="$emit('zamknij')"><X :size="12" /></button>
    </div>

    <template v-if="kropka.typ === 'ruch'">
      <p class="mb-[9px] text-[10px] text-label">State</p>
      <div class="mb-4 flex gap-2">
        <Kafelek etykieta="Closed" :ikona="DoorClosed" :wybrany="!kropka.otwarta" @wybierz="ustawRuch(false)" />
        <Kafelek etykieta="Open" :ikona="DoorOpen" :wybrany="kropka.otwarta" @wybierz="ustawRuch(true)" />
      </div>
      <p class="mb-[9px] text-[10px] text-label">Handle</p>
      <div class="flex gap-2">
        <Kafelek v-for="u in ['Groove', 'Knob', 'Push']" :key="u" :etykieta="u" tlo="#2a2c31" :wybrany="uchwyt === u.toLowerCase()" @wybierz="uchwyt = u.toLowerCase()" />
      </div>
    </template>

    <template v-else-if="kropka.typ === 'mebel'">
      <p class="mb-[9px] text-[10px] text-label">Doors & drawers</p>
      <div class="mb-4 flex gap-2">
        <Kafelek etykieta="Closed" :ikona="DoorClosed" @wybierz="ustawWszystkie(false)" />
        <Kafelek etykieta="Open all" :ikona="DoorOpen" @wybierz="ustawWszystkie(true)" />
      </div>
      <p class="mb-[9px] text-[10px] text-label">Palette</p>
      <div class="flex flex-wrap gap-2">
        <Kafelek v-for="p in palety" :key="p.id" :etykieta="p.nazwa" :kolory="p.kolory.map((c) => c.hex)" :wybrany="paleta === p.id" @wybierz="paleta = p.id" />
      </div>
    </template>

    <template v-else>
      <p class="mb-[9px] text-[10px] text-label">State</p>
      <div class="mb-4 flex gap-2">
        <Kafelek etykieta="On" :ikona="Lightbulb" :wybrany="swieci" @wybierz="swieci = true" />
        <Kafelek etykieta="Off" :ikona="LightbulbOff" :wybrany="!swieci" @wybierz="swieci = false" />
      </div>
      <p class="mb-[9px] text-[10px] text-label">Color temperature</p>
      <div class="flex gap-2">
        <Kafelek v-for="[k, c] in [['2700', '#ffb46b'], ['3000', '#ffcf8f'], ['4000', '#fff1dc']]" :key="k" :etykieta="k + 'K'" :tlo="c" :wybrany="barwa === k" @wybierz="barwa = k" />
      </div>
    </template>

    <button type="button" class="mt-4 h-[22px] w-full rounded-d5 bg-field text-[10.5px] text-text hover:bg-hover" @click="wiecej">More…</button>
  </div>
</template>
