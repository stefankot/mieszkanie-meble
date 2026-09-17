<script setup lang="ts">
import { Component, Ellipsis, Target } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { computed } from 'vue'

import { obiekty } from '@/data/mieszkanie'
import { $uklady, uklad } from '@/meble/uklad'
import { $silnik } from '@/silnik/most'
import { wymiaryMebla } from '@/silnik/wymiary'
import PrzyciskF from '@/ui/figma/PrzyciskF.vue'

import SekcjaKolorow from './SekcjaKolorow.vue'
import SekcjaKomponentu from './SekcjaKomponentu.vue'
import SekcjaMaterialow from './SekcjaMaterialow.vue'
import SekcjaPozycji from './SekcjaPozycji.vue'
import SekcjaUkladuPolek from './SekcjaUkladuPolek.vue'

/* Inspector mebla parametrycznego w układzie Figma UI3: nagłówek komponentu, Position, Shelf Layout
   (odpowiednik Auto layout), Selection colors i Selection materials (grupy elementów), potem komponenty
   powtarzane N razy z listą kopii. Wymiary ze sceny, gdy dostępne. */
const props = defineProps<{ mebel: string }>()
const silnik = useStore($silnik)
const uklady = useStore($uklady)
const u = computed(() => uklady.value[props.mebel] ?? uklad(props.mebel))
const nazwa = computed(() => obiekty.find((o) => o.id === props.mebel)?.nazwa ?? props.mebel)
const wersja = computed(() => obiekty.find((o) => o.id === props.mebel)?.opis)
const w = computed(() => wymiaryMebla(silnik.value, props.mebel) ?? { szerokosc: 1200, wysokosc: 2400, glebokosc: 360, x: 1840, y: -2260, obrot: 90 })
</script>

<template>
  <div>
    <div class="flex h-11 items-center gap-2 border-b border-[#34363c] px-[13px]">
      <Component :size="14" class="shrink-0 text-[#a78bfa]" />
      <span class="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">{{ nazwa }}</span>
      <span v-if="wersja" class="text-[10.5px] text-[#a4a7ae]">{{ wersja }}</span>
      <PrzyciskF :ikona="Target" opis="Frame in view (F)" />
      <PrzyciskF :ikona="Ellipsis" opis="More" />
    </div>
    <SekcjaPozycji :key="mebel + '-poz'" :x="w.x" :y="w.y" :obrot="w.obrot" />
    <SekcjaUkladuPolek :mebel="mebel" :uklad="u" :szerokosc="w.szerokosc" :wysokosc="w.wysokosc" />
    <SekcjaKolorow :mebel="mebel" />
    <SekcjaMaterialow :mebel="mebel" />
    <SekcjaKomponentu v-for="k in u.komponenty" :key="k.id" :mebel="mebel" :uklad="u" :komponent="k" />
  </div>
</template>
