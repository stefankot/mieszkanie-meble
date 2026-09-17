<script setup lang="ts">
import { ref } from 'vue'

import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* D5 Effect. Parametry z obecnego panelu „Obraz” + sekcja „W ruchu (filmowo)”:
   25 FPS, bez migotania, rozmycie ruchu, głębia ostrości, tonowanie, ziarno (węzły TSL three r186). */
const priorytet = ref('wysoka')
const ekspozycja = ref(0)
const tonowanie = ref('agx')
const wygladzanie = ref('traa')
const swiatloPosrednie = ref(true)
const odbicia = ref(true)
const docelowyFps = ref('25')
const rozmycieRuchu = ref(true)
const silaRozmycia = ref(35)
const glebiaOstrosci = ref(true)
const przyslona = ref(2.8)
const ziarno = ref(true)
const silaZiarna = ref(12)
const lut = ref('cieply')
const winieta = ref(20)
</script>

<template>
  <div>
    <Sekcja tytul="Obraz">
      <Wiersz etykieta="Priorytet">
        <Wybor v-model="priorytet" :opcje="[{ wartosc: 'plynnosc', etykieta: 'Płynność' }, { wartosc: 'zrownowazona', etykieta: 'Zrównoważona' }, { wartosc: 'wysoka', etykieta: 'Wysoka jakość' }, { wartosc: 'zdjecie', etykieta: 'Zdjęcie — bezruch' }]" />
      </Wiersz>
      <Wiersz etykieta="Ekspozycja"><PoleLiczby v-model="ekspozycja" :min="-3" :max="3" :krok="0.1" jednostka="EV" pasek /></Wiersz>
      <Wiersz etykieta="Tonowanie">
        <Wybor v-model="tonowanie" :opcje="[{ wartosc: 'agx', etykieta: 'AgX' }, { wartosc: 'neutral', etykieta: 'Neutral' }, { wartosc: 'aces', etykieta: 'ACES Filmic' }]" />
      </Wiersz>
      <Wiersz etykieta="Wygładzanie">
        <Segmenty v-model="wygladzanie" :opcje="[{ wartosc: 'traa', etykieta: 'TRAA' }, { wartosc: 'smaa', etykieta: 'SMAA' }, { wartosc: 'taau', etykieta: 'TAAU' }]" />
      </Wiersz>
    </Sekcja>

    <Sekcja tytul="Światło globalne">
      <Wiersz etykieta="Pośrednie (GI)"><Przelacznik v-model="swiatloPosrednie" /></Wiersz>
      <Wiersz etykieta="Odbicia (SSR)"><Przelacznik v-model="odbicia" /></Wiersz>
    </Sekcja>

    <Sekcja tytul="W ruchu · filmowo">
      <Wiersz etykieta="Docelowo">
        <Segmenty v-model="docelowyFps" :opcje="[{ wartosc: '25', etykieta: '25 FPS' }, { wartosc: '30', etykieta: '30' }, { wartosc: '60', etykieta: '60' }]" />
      </Wiersz>
      <Wiersz etykieta="Rozmycie"><Przelacznik v-model="rozmycieRuchu" /></Wiersz>
      <Wiersz v-if="rozmycieRuchu" etykieta="Siła"><PoleLiczby v-model="silaRozmycia" :min="0" :max="100" jednostka="%" pasek /></Wiersz>
      <Wiersz etykieta="Głębia ostrości"><Przelacznik v-model="glebiaOstrosci" /></Wiersz>
      <Wiersz v-if="glebiaOstrosci" etykieta="Przysłona"><PoleLiczby v-model="przyslona" :min="1.4" :max="16" :krok="0.1" os="f/" pasek /></Wiersz>
      <Wiersz etykieta="Ziarno filmowe"><Przelacznik v-model="ziarno" /></Wiersz>
      <Wiersz v-if="ziarno" etykieta="Siła ziarna"><PoleLiczby v-model="silaZiarna" :min="0" :max="100" jednostka="%" pasek /></Wiersz>
      <Wiersz etykieta="LUT">
        <Wybor v-model="lut" :opcje="[{ wartosc: 'brak', etykieta: 'Brak' }, { wartosc: 'cieply', etykieta: 'Ciepły kinowy' }, { wartosc: 'chlodny', etykieta: 'Chłodny poranek' }]" />
      </Wiersz>
      <Wiersz etykieta="Winieta"><PoleLiczby v-model="winieta" :min="0" :max="100" jednostka="%" pasek /></Wiersz>
    </Sekcja>
  </div>
</template>
