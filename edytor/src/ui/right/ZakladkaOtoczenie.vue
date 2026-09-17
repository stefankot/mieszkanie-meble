<script setup lang="ts">
import { CloudSun, Leaf, Wind } from '@lucide/vue'
import { ref } from 'vue'

import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'

import TarczaSlonca from './TarczaSlonca.vue'

/* D5 Environment: Sky Light (Geo and Sky | HDRI), tarcza słońca, temperatura barwowa, pogoda.
   Wartości z obecnego panelu renderera (Pora dnia, Charakter, Źródła światła i otoczenie). */
const zrodlo = ref('geo')
const poraRoku = ref('lato')
const godzina = ref(14)
const polnoc = ref(0)
const cieplo = ref(45)
const rozproszenie = ref(90)
const okna = ref(100)
const slonce = ref(100)
const kule = ref(0)
const wiatr = ref(true)
const liscie = ref(false)
const presety = [8, 14, 20]
</script>

<template>
  <div>
    <Sekcja tytul="Światło nieba">
      <Segmenty v-model="zrodlo" :opcje="[{ wartosc: 'geo', etykieta: 'Geo i niebo' }, { wartosc: 'hdri', etykieta: 'HDRI' }]" />
      <TarczaSlonca v-model="godzina" />
      <Wiersz etykieta="Pora roku">
        <Segmenty v-model="poraRoku" :opcje="[{ wartosc: 'lato', etykieta: 'Lato' }, { wartosc: 'zima', etykieta: 'Zima' }]" />
      </Wiersz>
      <Wiersz etykieta="Godzina">
        <PoleLiczby v-model="godzina" :min="5" :max="22" :krok="0.25" jednostka="h" pasek />
      </Wiersz>
      <div class="grid grid-cols-3 gap-1 pl-[92px]">
        <button v-for="h in presety" :key="h" type="button" class="h-5 rounded-[4px] text-2xs" :class="godzina === h ? 'bg-accent text-white' : 'bg-field text-muted hover:bg-hover'" @click="godzina = h">
          {{ h }}:00
        </button>
      </div>
      <Wiersz etykieta="Północ"><PoleLiczby v-model="polnoc" :min="0" :max="360" jednostka="°" /></Wiersz>
    </Sekcja>

    <Sekcja tytul="Charakter światła">
      <Wiersz etykieta="Ciepło" pionowo>
        <div class="relative h-6 flex-1 rounded-[5px]" style="background: linear-gradient(90deg, #9cc3ff, #ffffff 45%, #ffc27a)">
          <span class="absolute inset-y-0.5 w-1 rounded-sm bg-white shadow ring-1 ring-black/40" :style="{ left: `calc(${cieplo}% - 2px)` }" />
        </div>
        <span class="w-14 shrink-0 whitespace-nowrap text-right text-2xs tabular-nums text-muted">{{ 6500 - cieplo * 35 }} K</span>
      </Wiersz>
      <Wiersz etykieta="Rozproszenie"><PoleLiczby v-model="rozproszenie" :min="0" :max="100" jednostka="%" pasek /></Wiersz>
    </Sekcja>

    <Sekcja tytul="Źródła światła">
      <Wiersz etykieta="Okna"><PoleLiczby v-model="okna" :min="0" :max="200" :krok="5" jednostka="%" pasek /></Wiersz>
      <Wiersz etykieta="Słońce"><PoleLiczby v-model="slonce" :min="0" :max="200" :krok="5" jednostka="%" pasek /></Wiersz>
      <Wiersz etykieta="Kule sufitowe"><PoleLiczby v-model="kule" :min="0" :max="200" :krok="5" jednostka="%" pasek /></Wiersz>
    </Sekcja>

    <Sekcja tytul="Pogoda i otoczenie">
      <div class="flex h-7 items-center gap-2 text-xs text-muted"><Wind :size="13" /> Wiatr w koronach drzew <Przelacznik v-model="wiatr" /></div>
      <div class="flex h-7 items-center gap-2 text-xs text-muted"><Leaf :size="13" /> Cień liści na ścianach <Przelacznik v-model="liscie" /></div>
      <div class="flex h-7 items-center gap-2 text-xs text-faint"><CloudSun :size="13" /> Chmury <Przelacznik /></div>
    </Sekcja>
  </div>
</template>
