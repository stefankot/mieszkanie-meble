<script setup lang="ts">
import { CircleHelp, CloudFog, CloudRain, Leaf, Sparkle, Sun, Wind } from '@lucide/vue'
import { ref } from 'vue'

import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import Pudelko from '@/ui/primitives/Pudelko.vue'
import Radio from '@/ui/primitives/Radio.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

import TarczaSlonca from './TarczaSlonca.vue'

/* D5 3.x Environment: filtr „All”, Sky Light, Sun, Weather. Plus sekcje z renderera mieszkania
   (Light Character, Light Sources) w tym samym wzorze etykieta-nad-polem. */
const filtr = ref('all')
const niebo = ref('geo')
const godzina = ref(14)
const sezon = ref('summer')
const polnoc = ref(0)
const slonce = ref(true)
const natezenie = ref(0.4)
const promien = ref(6)
const temperatura = ref(4598)
const kierunek = ref('custom')
const wysokosc = ref(73.9)
const azymut = ref(267.9)
const kaustyka = ref(false)
const cieplo = ref(45)
const rozproszenie = ref(90)
const okna = ref(100)
const zrodloSlonce = ref(100)
const kule = ref(0)
const mgla = ref(true)
const zaSkylight = ref(false)
const gestosc = ref(0.3)
const wysokoscMgly = ref(0.28)
const wolumen = ref(true)
const rozpraszanie = ref(1)
const wiatr = ref(true)
const opady = ref(false)
const roslinnosc = ref(false)
const drogaMleczna = ref(false)
const pozycjaTemp = () => Math.min(100, Math.max(0, ((temperatura.value - 1500) / (12000 - 1500)) * 100))
</script>

<template>
  <div>
    <div class="px-2.5 pb-1"><Wybor v-model="filtr" :opcje="[{ wartosc: 'all', etykieta: 'All' }, { wartosc: 'sky', etykieta: 'Sky Light' }, { wartosc: 'weather', etykieta: 'Weather' }]" /></div>

    <Sekcja tytul="Sky Light">
      <Segmenty v-model="niebo" :opcje="[{ wartosc: 'geo', etykieta: 'Geo and Sky' }, { wartosc: 'hdri', etykieta: 'HDRI' }]" />
      <TarczaSlonca v-model="godzina" />
      <Segmenty v-model="sezon" :opcje="[{ wartosc: 'summer', etykieta: 'Summer' }, { wartosc: 'winter', etykieta: 'Winter' }]" />
      <Pole etykieta="North Offset"><PoleLiczby v-model="polnoc" :min="0" :max="360" jednostka="°" /></Pole>
    </Sekcja>

    <Sekcja tytul="Sun">
      <Wiersz etykieta="Sun" :ikona="Sun"><Przelacznik v-model="slonce" /></Wiersz>
      <Pole etykieta="Sunlight Intensity"><PoleLiczby v-model="natezenie" :min="0" :max="2" :krok="0.1" /></Pole>
      <Pole etykieta="Sun Disk Radius"><PoleLiczby v-model="promien" :min="0" :max="20" /></Pole>
      <Pole etykieta="Color Temperature">
        <div class="relative h-[22px] flex-1 rounded-[2px]" style="background: linear-gradient(90deg, #ff8a00, #ffd9a0 30%, #f4f6ff 50%, #6aa8ff 75%, #2f6bff)">
          <span class="absolute -inset-y-px w-1 rounded-[1px] bg-white ring-1 ring-black/40" :style="{ left: `calc(${pozycjaTemp()}% - 2px)` }" />
        </div>
        <span class="w-11 shrink-0 text-right text-2xs tabular-nums text-text">{{ temperatura }}K</span>
      </Pole>
      <Pole etykieta="Direction"><div class="flex-1"><Radio v-model="kierunek" :opcje="[{ wartosc: 'hdri', etykieta: 'Follow HDRI' }, { wartosc: 'custom', etykieta: 'Custom' }]" /></div></Pole>
      <template v-if="kierunek === 'custom'">
        <Pole etykieta="Altitude"><PoleLiczby v-model="wysokosc" :min="0" :max="90" :krok="0.1" /></Pole>
        <Pole etykieta="Azimuth"><PoleLiczby v-model="azymut" :min="0" :max="360" :krok="0.1" /></Pole>
      </template>
      <Wiersz etykieta="Caustics"><CircleHelp :size="10" class="text-muted" /><Przelacznik v-model="kaustyka" /></Wiersz>
    </Sekcja>

    <Sekcja tytul="Light Character">
      <Pole etykieta="Warmth"><PoleLiczby v-model="cieplo" :min="0" :max="100" jednostka="%" /></Pole>
      <Pole etykieta="Diffusion"><PoleLiczby v-model="rozproszenie" :min="0" :max="100" jednostka="%" /></Pole>
    </Sekcja>

    <Sekcja tytul="Light Sources">
      <Pole etykieta="Windows"><PoleLiczby v-model="okna" :min="0" :max="200" :krok="5" jednostka="%" /></Pole>
      <Pole etykieta="Sun"><PoleLiczby v-model="zrodloSlonce" :min="0" :max="200" :krok="5" jednostka="%" /></Pole>
      <Pole etykieta="Ceiling Lamps"><PoleLiczby v-model="kule" :min="0" :max="200" :krok="5" jednostka="%" /></Pole>
    </Sekcja>

    <Sekcja tytul="Weather">
      <Wiersz etykieta="Fog" :ikona="CloudFog"><Przelacznik v-model="mgla" /></Wiersz>
      <template v-if="mgla">
        <span class="size-4 rounded-[2px] bg-white ring-1 ring-white/20" />
        <Wiersz etykieta="Intensity Follows Skylight"><Pudelko v-model="zaSkylight" /></Wiersz>
        <Pole etykieta="Density"><PoleLiczby v-model="gestosc" :min="0" :max="1" :krok="0.01" /></Pole>
        <Pole etykieta="Height"><PoleLiczby v-model="wysokoscMgly" :min="0" :max="1" :krok="0.01" /></Pole>
        <Wiersz etykieta="Volume Light"><CircleHelp :size="10" class="text-muted" /><Pudelko v-model="wolumen" /></Wiersz>
        <Pole etykieta="Scattering"><PoleLiczby v-model="rozpraszanie" :min="0" :max="1" :krok="0.01" /></Pole>
      </template>
      <Wiersz etykieta="Wind" :ikona="Wind"><Przelacznik v-model="wiatr" /></Wiersz>
      <Wiersz etykieta="Precipitation" :ikona="CloudRain"><Przelacznik v-model="opady" /></Wiersz>
      <Wiersz etykieta="Seasonal Vegetation" :ikona="Leaf"><Przelacznik v-model="roslinnosc" /></Wiersz>
      <Wiersz etykieta="Milky Way" :ikona="Sparkle"><Przelacznik v-model="drogaMleczna" /></Wiersz>
    </Sekcja>
  </div>
</template>
