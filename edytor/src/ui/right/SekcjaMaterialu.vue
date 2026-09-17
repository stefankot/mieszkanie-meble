<script setup lang="ts">
import { CircleHelp, Crosshair, Link2, Pipette, RotateCcw, RotateCw, SlidersHorizontal } from '@lucide/vue'
import { ref } from 'vue'

import { materialy } from '@/data/mieszkanie'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'
import Pudelko from '@/ui/primitives/Pudelko.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* D5 Inspector materiału: szablon, Invisible in raytracing, Map (próbka + pole z wypełnieniem + ikona ustawień),
   Color Space, przełączniki, UV (Stretch/Offset/Rotate inline), Triplanar, Advanced. */
const material = ref('burgundy')
const szablon = ref('custom')
const niewidoczny = ref(false)
const zrodlo = ref('map')
const mapy = ref([
  { nazwa: 'Normal', probka: '#7f7fff', wartosc: 0.1, aktywna: false },
  { nazwa: 'Specular', probka: 'szachownica', wartosc: 0.5, aktywna: false },
  { nazwa: 'Roughness', probka: '#8a8a8a', wartosc: 1, aktywna: true },
  { nazwa: 'Metallic', probka: 'szachownica', wartosc: 0, aktywna: false },
  { nazwa: 'AO', probka: 'szachownica', wartosc: 0, aktywna: false }
])
const przestrzen = ref('srgb')
const odwrocony = ref(true)
const osobneUV = ref(false)
const emisja = ref(false)
const uv = ref({ sx: 1, sy: 1, ox: 0, oy: 0, obrot: 0 })
const trojplanarne = ref(true)
const mieszanie = ref(0)
const aktualny = () => materialy.find((m) => m.id === material.value)
const szachownica = 'repeating-conic-gradient(#4a4d55 0 25%, #2b2e35 0 50%) 0 0 / 8px 8px'
</script>

<template>
  <Sekcja tytul="Material">
    <template #akcje>
      <div class="flex gap-0.5">
        <PrzyciskIkona :ikona="Pipette" opis="Pick material" :rozmiar="12" :kwadrat="20" />
        <PrzyciskIkona :ikona="Crosshair" opis="Select objects with material" :rozmiar="12" :kwadrat="20" />
        <PrzyciskIkona :ikona="RotateCw" opis="Replace" :rozmiar="12" :kwadrat="20" />
        <PrzyciskIkona :ikona="RotateCcw" opis="Reset" :rozmiar="12" :kwadrat="20" />
      </div>
    </template>
    <Wybor v-model="material" :opcje="materialy.map((m) => ({ wartosc: m.id, etykieta: m.nazwa }))" />
    <Pole etykieta="Material Template">
      <Wybor v-model="szablon" :opcje="[{ wartosc: 'custom', etykieta: 'Custom' }, { wartosc: 'wood', etykieta: 'Wood' }, { wartosc: 'fabric', etykieta: 'Fabric' }, { wartosc: 'glass', etykieta: 'Glass' }]" />
    </Pole>
    <Wiersz etykieta="Invisible in raytracing"><CircleHelp :size="10" class="text-muted" /><Pudelko v-model="niewidoczny" /></Wiersz>

    <div class="flex h-(--etykieta) items-center pt-1 text-xs text-label">Map</div>
    <Segmenty v-model="zrodlo" :opcje="[{ wartosc: 'color', etykieta: 'Base Color' }, { wartosc: 'map', etykieta: 'Base Color Map' }]" />
    <div class="flex items-center gap-1">
      <span class="size-5 shrink-0 rounded-[2px] ring-1 ring-white/10" :style="{ background: aktualny()?.kolor }" />
      <span class="flex-1" />
      <PrzyciskIkona :ikona="SlidersHorizontal" opis="Map settings" :rozmiar="12" :kwadrat="22" />
    </div>
    <Pole v-for="m in mapy" :key="m.nazwa" :etykieta="m.nazwa">
      <span class="size-5 shrink-0 rounded-[2px] ring-1 ring-white/10" :style="{ background: m.probka === 'szachownica' ? szachownica : m.probka }" />
      <PoleLiczby v-model="m.wartosc" :min="0" :max="1" :krok="0.01" />
      <PrzyciskIkona :ikona="SlidersHorizontal" :opis="`${m.nazwa} settings`" :rozmiar="12" :kwadrat="22" :aktywny="m.aktywna" @click="m.aktywna = !m.aktywna" />
    </Pole>
    <Pole etykieta="Color Space Transfer Function">
      <Wybor v-model="przestrzen" :opcje="[{ wartosc: 'srgb', etykieta: 'sRGB' }, { wartosc: 'linear', etykieta: 'Linear' }]" />
    </Pole>
    <Wiersz etykieta="Inverted"><Przelacznik v-model="odwrocony" /></Wiersz>
    <Wiersz etykieta="Individual UV"><CircleHelp :size="10" class="text-muted" /><Przelacznik v-model="osobneUV" /></Wiersz>
    <Wiersz etykieta="Emissive"><Przelacznik v-model="emisja" /></Wiersz>

    <div class="flex h-(--etykieta) items-center pt-1 text-xs text-label">UV</div>
    <Wiersz etykieta="Stretch"><Link2 :size="10" class="shrink-0 text-muted" /><div class="grid w-[84px] shrink-0 grid-cols-2 gap-[3px]"><PoleLiczby v-model="uv.sx" os="X" :krok="0.05" /><PoleLiczby v-model="uv.sy" os="Y" :krok="0.05" /></div></Wiersz>
    <Wiersz etykieta="Offset"><div class="grid w-[84px] shrink-0 grid-cols-2 gap-[3px]"><PoleLiczby v-model="uv.ox" os="X" :krok="0.01" /><PoleLiczby v-model="uv.oy" os="Y" :krok="0.01" /></div></Wiersz>
    <Wiersz etykieta="Rotate"><div class="w-[84px] shrink-0"><PoleLiczby v-model="uv.obrot" jednostka="°" /></div></Wiersz>
    <Wiersz etykieta="Triplanar"><CircleHelp :size="10" class="text-muted" /><Przelacznik v-model="trojplanarne" /></Wiersz>
    <Wiersz etykieta="Blend Amount"><div class="w-[64px] shrink-0"><PoleLiczby v-model="mieszanie" :min="0" :max="1" :krok="0.01" /></div></Wiersz>
  </Sekcja>
  <Sekcja tytul="Advanced" :otwarta="false"><p class="text-2xs text-faint">Displacement, clear coat, sheen.</p></Sekcja>
</template>
