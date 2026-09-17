<script setup lang="ts">
import { ref } from 'vue'

import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* D5 Effect: parametry obrazu z renderera + sekcja „Cinematic Motion” (25 FPS, rozmycie ruchu,
   głębia ostrości, ziarno, LUT — węzły TSL three r186). */
const priorytet = ref('high')
const ekspozycja = ref(0.72)
const tonowanie = ref('aces')
const aa = ref('taa')
const gi = ref(true)
const odbicia = ref(true)
const fps = ref('25')
const rozmycie = ref(true)
const silaRozmycia = ref(0.35)
const glebia = ref(true)
const przyslona = ref(2.8)
const ziarno = ref(true)
const silaZiarna = ref(0.12)
const lut = ref('warm')
const winieta = ref(0.2)
</script>

<template>
  <div>
    <Sekcja tytul="Image">
      <Pole etykieta="Render Priority">
        <Wybor v-model="priorytet" :opcje="[{ wartosc: 'smooth', etykieta: 'Smooth' }, { wartosc: 'balanced', etykieta: 'Balanced' }, { wartosc: 'high', etykieta: 'High quality' }, { wartosc: 'photo', etykieta: 'Photo (still)' }]" />
      </Pole>
      <Pole etykieta="Exposure"><PoleLiczby v-model="ekspozycja" :min="0.35" :max="2.2" :krok="0.01" /></Pole>
      <Pole etykieta="Tone Mapping">
        <Wybor v-model="tonowanie" :opcje="[{ wartosc: 'aces', etykieta: 'ACES' }, { wartosc: 'neutral', etykieta: 'Neutral' }, { wartosc: 'agx', etykieta: 'AgX' }]" />
      </Pole>
      <Pole etykieta="Anti-aliasing"><Segmenty v-model="aa" :opcje="[{ wartosc: 'taa', etykieta: 'TAA' }, { wartosc: 'smaa', etykieta: 'SMAA' }]" /></Pole>
      <Wiersz etykieta="Global Illumination"><Przelacznik v-model="gi" /></Wiersz>
      <Wiersz etykieta="Reflections"><Przelacznik v-model="odbicia" /></Wiersz>
    </Sekcja>

    <Sekcja tytul="Cinematic Motion">
      <Pole etykieta="Target Frame Rate">
        <Segmenty v-model="fps" :opcje="[{ wartosc: '25', etykieta: '25 FPS' }, { wartosc: '30', etykieta: '30' }, { wartosc: '60', etykieta: '60' }]" />
      </Pole>
      <Wiersz etykieta="Motion Blur"><Przelacznik v-model="rozmycie" /></Wiersz>
      <Pole v-if="rozmycie" etykieta="Intensity"><PoleLiczby v-model="silaRozmycia" :min="0" :max="1" :krok="0.01" /></Pole>
      <Wiersz etykieta="Depth of Field"><Przelacznik v-model="glebia" /></Wiersz>
      <Pole v-if="glebia" etykieta="Aperture"><PoleLiczby v-model="przyslona" :min="1.4" :max="16" :krok="0.1" os="f/" /></Pole>
      <Wiersz etykieta="Film Grain"><Przelacznik v-model="ziarno" /></Wiersz>
      <Pole v-if="ziarno" etykieta="Amount"><PoleLiczby v-model="silaZiarna" :min="0" :max="1" :krok="0.01" /></Pole>
      <Pole etykieta="LUT">
        <Wybor v-model="lut" :opcje="[{ wartosc: 'none', etykieta: 'None' }, { wartosc: 'warm', etykieta: 'Warm Cinema' }, { wartosc: 'cool', etykieta: 'Cool Morning' }]" />
      </Pole>
      <Pole etykieta="Vignette"><PoleLiczby v-model="winieta" :min="0" :max="1" :krok="0.01" /></Pole>
    </Sekcja>
  </div>
</template>
