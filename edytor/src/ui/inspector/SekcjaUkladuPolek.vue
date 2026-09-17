<script setup lang="ts">
import { AlignVerticalSpaceAround, ArrowUpDown, Columns3, Dices, Grid3x3, LayoutPanelTop, Lock, PanelBottom, PanelTop, PencilLine, Rows3, Scan, SeparatorHorizontal, Shell, Shuffle, SlidersHorizontal } from '@lucide/vue'
import { computed } from 'vue'

import { poprawnyWlasny, rozloz } from '@/meble/rozklad'
import { zmienUklad, type UkladMebla } from '@/meble/uklad'
import GrupaF from '@/ui/figma/GrupaF.vue'
import GrupaIkonF from '@/ui/figma/GrupaIkonF.vue'
import PoleF from '@/ui/figma/PoleF.vue'
import PrzyciskF from '@/ui/figma/PrzyciskF.vue'
import PudelkoF from '@/ui/figma/PudelkoF.vue'
import SekcjaF from '@/ui/figma/SekcjaF.vue'
import SuwakF from '@/ui/figma/SuwakF.vue'

import PodgladRozkladu from './PodgladRozkladu.vue'

/* Odpowiednik Figma „Auto layout” dla mebla: przepływ, liczba półek (suwak), rozkład Equal / Fibonacci /
   Random / Custom „60+40+20+40”, stała wielkość mebla, grubość płyt, marginesy. Zmiany nie zmieniają W×H. */
const props = defineProps<{ mebel: string; uklad: UkladMebla; szerokosc: number; wysokosc: number }>()
const u = computed(() => props.uklad)
const zmien = (z: Partial<UkladMebla>) => zmienUklad(props.mebel, z)
const wnetrze = computed(() => Math.max(100, props.wysokosc - u.value.marginesGora - u.value.marginesDol))
const wynik = computed(() => rozloz(wnetrze.value, u.value.grubosc, { liczba: u.value.polki, ...u.value }))
const przegrodyCm = computed(() => wynik.value.przegrody.map((p) => Math.round(p / 10)).join(' · '))
const wlasnyOk = computed(() => poprawnyWlasny(u.value.wlasne))

function ustawWlasny(tekst: string) {
  zmien({ wlasne: tekst })
  if (poprawnyWlasny(tekst)) zmien({ polki: tekst.split('+').length - 1 })
}
</script>

<template>
  <SekcjaF tytul="Shelf Layout">
    <template #akcje><PrzyciskF :ikona="LayoutPanelTop" opis="Parametric layout" aktywny /></template>

    <GrupaF etykieta="Flow">
      <GrupaIkonF
        class="col-span-2"
        :model-value="u.przeplyw"
        :opcje="[{ wartosc: 'wiersze', ikona: Rows3, opis: 'Shelves (rows)' }, { wartosc: 'kolumny', ikona: Columns3, opis: 'Partitions (columns)' }, { wartosc: 'siatka', ikona: Grid3x3, opis: 'Grid' }]"
        @update:model-value="zmien({ przeplyw: $event as UkladMebla['przeplyw'] })"
      />
      <PrzyciskF :ikona="ArrowUpDown" opis="Reverse order" :aktywny="u.odwroc" @click="zmien({ odwroc: !u.odwroc })" />
    </GrupaF>

    <GrupaF etykieta="Shelves">
      <SuwakF :model-value="u.polki" :min="0" :max="12" prefiks="#" @update:model-value="zmien({ polki: $event, rozklad: u.rozklad === 'wlasne' ? 'rowne' : u.rozklad })" />
      <span />
    </GrupaF>

    <GrupaF v-if="u.przeplyw !== 'wiersze'" etykieta="Columns">
      <SuwakF :model-value="u.kolumny" :min="1" :max="8" prefiks="#" @update:model-value="zmien({ kolumny: $event })" />
      <span />
    </GrupaF>

    <GrupaF etykieta="Distribution">
      <GrupaIkonF
        class="col-span-2"
        :model-value="u.rozklad"
        :opcje="[{ wartosc: 'rowne', ikona: AlignVerticalSpaceAround, opis: 'Equal' }, { wartosc: 'fibonacci', ikona: Shell, opis: 'Fibonacci' }, { wartosc: 'losowe', ikona: Shuffle, opis: 'Random' }, { wartosc: 'wlasne', ikona: PencilLine, opis: 'Custom' }]"
        @update:model-value="zmien({ rozklad: $event as UkladMebla['rozklad'], wlasne: $event === 'wlasne' && !u.wlasne ? przegrodyCm.replaceAll(' · ', '+') : u.wlasne })"
      />
      <PrzyciskF v-if="u.rozklad === 'losowe'" :ikona="Dices" opis="Randomize" @click="zmien({ ziarno: u.ziarno + 1 })" />
      <span v-else />
    </GrupaF>

    <GrupaF v-if="u.rozklad === 'wlasne'" etykieta="Custom (cm, bottom → top)">
      <input
        :value="u.wlasne"
        class="col-span-2 h-6 min-w-0 rounded-[5px] bg-[#2c2e34] px-2 font-mono text-[11px] text-white outline-none focus:ring-1"
        :class="wlasnyOk ? 'focus:ring-[#0d99ff]' : 'ring-1 ring-[#f24822]'"
        placeholder="60+40+20+40"
        @input="ustawWlasny(($event.target as HTMLInputElement).value)"
      />
      <span />
    </GrupaF>
    <p class="-mt-0.5 text-[10.5px] leading-snug text-[#a4a7ae]">
      {{ przegrodyCm }} cm<template v-if="wynik.sumaWlasnych !== null && Math.abs(wynik.sumaWlasnych * 10 - (wnetrze - u.polki * u.grubosc)) > 5"> · Σ {{ wynik.sumaWlasnych }} cm scaled to fit</template>
    </p>

    <GrupaF etykieta="Resizing">
      <PoleF :model-value="szerokosc" prefiks="W" przyrostek="Fixed" />
      <PoleF :model-value="wysokosc" prefiks="H" przyrostek="Fixed" />
      <PrzyciskF :ikona="Lock" opis="Outer size locked" :aktywny="u.stalyRozmiar" @click="zmien({ stalyRozmiar: !u.stalyRozmiar })" />
    </GrupaF>

    <div class="grid grid-cols-[88px_1fr_24px] grid-rows-[16px_24px_32px] items-center gap-x-2 gap-y-0.5">
      <span class="text-[11px] text-[#a4a7ae]">Preview</span>
      <span class="text-[11px] text-[#a4a7ae]">Board</span>
      <span />
      <PodgladRozkladu :mebel="mebel" :uklad="u" :wnetrze="wnetrze" class="self-stretch" />
      <PoleF :model-value="u.grubosc" :prefiks="SeparatorHorizontal" jednostka="mm" :min="12" :max="40" @update:model-value="zmien({ grubosc: $event })" />
      <PrzyciskF :ikona="SlidersHorizontal" opis="Board settings" />
      <p class="self-start pt-1 text-[10.5px] leading-snug text-[#a4a7ae]">Drag shelf lines here or on the model.</p>
      <span />
    </div>

    <GrupaF etykieta="Padding">
      <PoleF :model-value="u.marginesGora" :prefiks="PanelTop" jednostka="mm" :min="0" :max="400" :krok="5" @update:model-value="zmien({ marginesGora: $event })" />
      <PoleF :model-value="u.marginesDol" :prefiks="PanelBottom" jednostka="mm" :min="0" :max="400" :krok="5" @update:model-value="zmien({ marginesDol: $event })" />
      <PrzyciskF :ikona="Scan" opis="Individual padding" />
    </GrupaF>

    <PudelkoF :model-value="u.stalyRozmiar" etykieta="Keep outer size" @update:model-value="zmien({ stalyRozmiar: $event })" />
  </SekcjaF>
</template>
