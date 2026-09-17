<script setup lang="ts">
import { Copy, Crosshair, EyeOff, FlipHorizontal2, Group, Lock, RotateCcw, Save, Scissors, SquareDashed, Trash2, Ungroup } from '@lucide/vue'
import { ref } from 'vue'

import { mechanizmy } from '@/data/mieszkanie'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import WierszXYZ from '@/ui/primitives/WierszXYZ.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

import SekcjaMaterialu from './SekcjaMaterialu.vue'
import SekcjaPalety from './SekcjaPalety.vue'

/* D5 Inspector obiektu: nazwa, Layer, dwa rzędy akcji, Basic (Location/Rotation/Size).
   Parameters wg Spline (brak w D5). Dane przykładowe: Regał w kuchni. */
const warstwa = ref('furniture')
const polozenie = ref<[number, number, number]>([1840, 0, -2260])
const obrot = ref<[number, number, number]>([0, 90, 0])
const rozmiar = ref<[number, number, number]>([1200, 2400, 360])
const kolumny = ref(3)
const rzedy = ref(6)
const szerokosc = ref(400)
const uchwyt = ref('groove')
const otwieranie = ref('left')
const wersja = ref('v0002')
const stany = ref(mechanizmy.map((nazwa, i) => ({ nazwa, otwarty: i === 1 })))
const akcje1 = [[Copy, 'Duplicate'], [FlipHorizontal2, 'Mirror'], [Crosshair, 'Focus (F)'], [Lock, 'Lock'], [EyeOff, 'Hide'], [SquareDashed, 'Select same']] as const
const akcje2 = [[RotateCcw, 'Reset to base version'], [Scissors, 'Detach'], [Group, 'Group'], [Ungroup, 'Ungroup'], [Save, 'Save to Local assets'], [Trash2, 'Delete']] as const
</script>

<template>
  <div>
    <div class="flex flex-col gap-1.5 px-2.5 pb-2 pt-0.5">
      <span class="truncate text-xs text-muted">Regał w kuchni</span>
      <Wybor v-model="warstwa" :opcje="[{ wartosc: 'furniture', etykieta: 'Furniture' }, { wartosc: 'apartment', etykieta: 'Apartment' }]" />
      <div class="grid grid-cols-6 justify-items-center">
        <PrzyciskIkona v-for="[ikona, opis] in akcje1" :key="opis" :ikona="ikona" :opis="opis" :rozmiar="13" :kwadrat="22" />
        <PrzyciskIkona v-for="[ikona, opis] in akcje2" :key="opis" :ikona="ikona" :opis="opis" :rozmiar="13" :kwadrat="22" />
      </div>
    </div>

    <Sekcja tytul="Basic">
      <WierszXYZ v-model="polozenie" etykieta="Location" />
      <WierszXYZ v-model="obrot" etykieta="Rotation" />
      <WierszXYZ v-model="rozmiar" etykieta="Size" lancuch />
    </Sekcja>

    <Sekcja tytul="Parameters">
      <Pole etykieta="Columns"><PoleLiczby v-model="kolumny" :min="1" :max="6" /></Pole>
      <Pole etykieta="Rows"><PoleLiczby v-model="rzedy" :min="1" :max="8" /></Pole>
      <Pole etykieta="Module Width"><PoleLiczby v-model="szerokosc" :min="300" :max="900" :krok="10" jednostka="mm" /></Pole>
      <Pole etykieta="Handle"><Segmenty v-model="uchwyt" :opcje="[{ wartosc: 'groove', etykieta: 'Groove' }, { wartosc: 'knob', etykieta: 'Knob' }, { wartosc: 'push', etykieta: 'Push' }]" /></Pole>
      <Pole etykieta="Opening"><Segmenty v-model="otwieranie" :opcje="[{ wartosc: 'left', etykieta: 'Left' }, { wartosc: 'right', etykieta: 'Right' }]" /></Pole>
      <p class="text-[10px] leading-snug text-faint">Door × 6 — one definition, changes apply to all copies.</p>
    </Sekcja>

    <Sekcja tytul="Version">
      <Wybor v-model="wersja" :opcje="[{ wartosc: 'v0002', etykieta: 'v0002 · current' }, { wartosc: 'v0001', etykieta: 'v0001' }]" />
    </Sekcja>

    <Sekcja tytul="Mechanisms">
      <Wiersz v-for="s in stany" :key="s.nazwa" :etykieta="s.nazwa"><Przelacznik v-model="s.otwarty" /></Wiersz>
    </Sekcja>

    <SekcjaMaterialu />
    <SekcjaPalety />
  </div>
</template>
