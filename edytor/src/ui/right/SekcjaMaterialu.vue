<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import { ref } from 'vue'

import { materialy } from '@/data/mieszkanie'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* D5 Inspector materiału: szablon, mapa (kolor | mapa), wiersze próbka + wartość + ustawienia, UV. */
const material = ref('burgundy')
const zrodlo = ref('kolor')
const chropowatosc = ref(0.62)
const metalicznosc = ref(0)
const skala = ref(1)
const obrotUV = ref(0)
const trojplanarne = ref(false)
const aktualny = () => materialy.find((m) => m.id === material.value)
</script>

<template>
  <Sekcja tytul="Materiał · Front">
    <Wiersz etykieta="Materiał">
      <Wybor v-model="material" :opcje="materialy.map((m) => ({ wartosc: m.id, etykieta: m.nazwa }))" />
    </Wiersz>
    <Wiersz etykieta="Mapa">
      <Segmenty v-model="zrodlo" :opcje="[{ wartosc: 'kolor', etykieta: 'Kolor' }, { wartosc: 'mapa', etykieta: 'Mapa koloru' }]" />
    </Wiersz>
    <Wiersz etykieta="Kolor bazowy">
      <span class="size-6 shrink-0 rounded-[5px] ring-1 ring-white/10" :style="{ background: aktualny()?.kolor }" />
      <span class="flex h-6 flex-1 items-center rounded-[5px] bg-field px-2 font-mono text-2xs uppercase text-muted">{{ aktualny()?.kolor }}</span>
      <button type="button" class="flex size-6 items-center justify-center text-faint hover:text-text" aria-label="Ustawienia mapy"><SlidersHorizontal :size="13" /></button>
    </Wiersz>
    <Wiersz etykieta="Chropowatość">
      <span class="size-6 shrink-0 rounded-[5px] bg-[repeating-conic-gradient(#3a3a40_0_25%,#2a2a2e_0_50%)] bg-[length:8px_8px]" />
      <PoleLiczby v-model="chropowatosc" :min="0" :max="1" :krok="0.01" pasek />
    </Wiersz>
    <Wiersz etykieta="Metaliczność">
      <span class="size-6 shrink-0 rounded-[5px] bg-[repeating-conic-gradient(#3a3a40_0_25%,#2a2a2e_0_50%)] bg-[length:8px_8px]" />
      <PoleLiczby v-model="metalicznosc" :min="0" :max="1" :krok="0.01" pasek />
    </Wiersz>
    <div class="mt-1 border-t border-line pt-2 text-2xs text-faint">UV</div>
    <Wiersz etykieta="Skala"><PoleLiczby v-model="skala" :min="0.1" :max="4" :krok="0.05" jednostka="×" pasek /></Wiersz>
    <Wiersz etykieta="Obrót"><PoleLiczby v-model="obrotUV" :min="0" :max="360" jednostka="°" pasek /></Wiersz>
    <Wiersz etykieta="Trójplanarne"><Przelacznik v-model="trojplanarne" /></Wiersz>
  </Sekcja>
</template>
