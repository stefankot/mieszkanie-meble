<script setup lang="ts">
import { Copy, Crosshair, EyeOff, FlipHorizontal2, Lock, RotateCcw } from '@lucide/vue'
import { ref } from 'vue'

import { mechanizmy } from '@/data/mieszkanie'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import WierszXYZ from '@/ui/primitives/WierszXYZ.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

import SekcjaMaterialu from './SekcjaMaterialu.vue'
import SekcjaPalety from './SekcjaPalety.vue'

/* D5 Inspector obiektu + sekcja Parametry wg Spline (brak w D5). Dane przykładowe: Regał w kuchni. */
const warstwa = ref('meble')
const polozenie = ref<[number, number, number]>([1840, 0, -2260])
const obrot = ref<[number, number, number]>([0, 90, 0])
const rozmiar = ref<[number, number, number]>([1200, 2400, 360])
const kolumny = ref(3)
const rzedy = ref(6)
const szerokoscModulu = ref(400)
const uchwyt = ref('frez')
const otwieranie = ref('lewe')
const wersja = ref('v0002')
const stany = ref(mechanizmy.map((nazwa, i) => ({ nazwa, otwarty: i === 1 })))
</script>

<template>
  <div>
    <div class="flex flex-col gap-2 border-b border-line p-3">
      <div class="flex items-baseline gap-2">
        <h2 class="flex-1 truncate text-[13px] font-medium">Regał w kuchni</h2>
        <span class="text-2xs text-faint">KUCHNIA</span>
      </div>
      <Wybor v-model="warstwa" :opcje="[{ wartosc: 'meble', etykieta: 'Warstwa: Meble' }, { wartosc: 'mieszkanie', etykieta: 'Warstwa: Mieszkanie' }]" />
      <div class="flex items-center justify-between">
        <PrzyciskIkona :ikona="Copy" opis="Powiel" />
        <PrzyciskIkona :ikona="FlipHorizontal2" opis="Odbij" />
        <PrzyciskIkona :ikona="Crosshair" opis="Pokaż w kadrze (F)" />
        <PrzyciskIkona :ikona="Lock" opis="Zablokuj" />
        <PrzyciskIkona :ikona="EyeOff" opis="Ukryj" />
        <PrzyciskIkona :ikona="RotateCcw" opis="Przywróć wersję bazową" />
      </div>
    </div>

    <Sekcja tytul="Podstawowe">
      <WierszXYZ v-model="polozenie" etykieta="Położenie" />
      <WierszXYZ v-model="obrot" etykieta="Obrót" />
      <WierszXYZ v-model="rozmiar" etykieta="Rozmiar" />
    </Sekcja>

    <Sekcja tytul="Parametry">
      <Wiersz etykieta="Kolumny"><PoleLiczby v-model="kolumny" :min="1" :max="6" pasek /></Wiersz>
      <Wiersz etykieta="Rzędy"><PoleLiczby v-model="rzedy" :min="1" :max="8" pasek /></Wiersz>
      <Wiersz etykieta="Szer. modułu"><PoleLiczby v-model="szerokoscModulu" :min="300" :max="900" :krok="10" jednostka="mm" pasek /></Wiersz>
      <Wiersz etykieta="Uchwyt">
        <Segmenty v-model="uchwyt" :opcje="[{ wartosc: 'frez', etykieta: 'Frez' }, { wartosc: 'galka', etykieta: 'Gałka' }, { wartosc: 'brak', etykieta: 'Push' }]" />
      </Wiersz>
      <Wiersz etykieta="Otwieranie">
        <Segmenty v-model="otwieranie" :opcje="[{ wartosc: 'lewe', etykieta: 'Lewe' }, { wartosc: 'prawe', etykieta: 'Prawe' }]" />
      </Wiersz>
      <p class="pt-1 text-2xs leading-snug text-faint">Drzwiczki × 6 — jedna definicja, zmiana dotyczy wszystkich kopii.</p>
    </Sekcja>

    <Sekcja tytul="Wersja">
      <Wiersz etykieta="Wersja">
        <Wybor v-model="wersja" :opcje="[{ wartosc: 'v0002', etykieta: 'v0002 · aktualna' }, { wartosc: 'v0001', etykieta: 'v0001' }]" />
      </Wiersz>
    </Sekcja>

    <Sekcja tytul="Mechanizmy">
      <div v-for="s in stany" :key="s.nazwa" class="flex h-6 items-center gap-2">
        <span class="flex-1 truncate text-xs text-muted">{{ s.nazwa }}</span>
        <Przelacznik v-model="s.otwarty" />
      </div>
    </Sekcja>

    <SekcjaMaterialu />
    <SekcjaPalety />
  </div>
</template>
