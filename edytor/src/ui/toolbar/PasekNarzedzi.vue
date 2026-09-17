<script setup lang="ts">
import { Aperture, Camera, ChevronLeft, ChevronRight, Diamond, Lightbulb, Map as MapIcon, MapPinned, MousePointer2, Move3d, PanelLeft, PencilRuler, Rotate3d, Route, SlidersHorizontal, Sofa, Sparkles, Video } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { widoki } from '@/data/mieszkanie'
import { $silnik, kliknij, wcisniety } from '@/silnik/most'
import { wykonaj } from '@/ops/rejestr'
import '@/ops/operacje'
import { $aktywnyWidok, $bibliotekaOtwarta, $kropkiWidoczne, $mapaWidoczna, $narzedzie, $panelWidokow, $tryb, $trybPrawejKolumny } from '@/stan'
import UstawieniaSpaceru from '@/ui/walk/UstawieniaSpaceru.vue'

import JakoscRenderu from './JakoscRenderu.vue'
import PrzyciskPaska from './PrzyciskPaska.vue'

/* Figma UI3: pływający pasek na dole sceny zamiast górnego paska. Dwa warianty:
   edycja — narzędzia, tryb kamery, Image, AI render, jakość renderu, widok z góry, mapa;
   spacer — Edit, lista widoków, kropki, pager, widok z góry, mapa, ustawienia, jakość renderu. */
const tryb = useStore($tryb)
const narzedzie = useStore($narzedzie)
const trybPrawej = useStore($trybPrawejKolumny)
const kropki = useStore($kropkiWidoczne)
const mapa = useStore($mapaWidoczna)
const dodajSwiatlo = () => wykonaj('light.add', {})
const panelWidokow = useStore($panelWidokow)
const aktywny = useStore($aktywnyWidok)
const silnik = useStore($silnik)
const zGory = ref(false)
const trybKamery = ref('orbita')

const narzedzia = [
  { id: 'zaznacz', ikona: MousePointer2, opis: 'Select (V)' },
  { id: 'przesun', ikona: Move3d, opis: 'Move (G)' },
  { id: 'obroc', ikona: Rotate3d, opis: 'Rotate (R)' }
] as const
const aktywneNarzedzie = computed(() => narzedzia.find((n) => n.id === narzedzie.value) ?? narzedzia[0])
const indeks = computed(() => widoki.findIndex((w) => w.id === aktywny.value))
const idz = (krok: number) => $aktywnyWidok.set(widoki[(indeks.value + krok + widoki.length) % widoki.length].id)

// Widok z góry i tryb kamery pochodzą z silnika — odczyt okresowy, bo zmieniają je też skróty w ramce.
let zegar = 0
onMounted(() => {
  zegar = window.setInterval(() => {
    zGory.value = wcisniety('#widokToggle')
    trybKamery.value = (silnik.value as { nawigacja: { tryb: string } } | null)?.nawigacja.tryb ?? trybKamery.value
  }, 400)
})
onBeforeUnmount(() => clearInterval(zegar))
function przelaczZGory() {
  kliknij('#widokToggle')
  setTimeout(() => (zGory.value = wcisniety('#widokToggle')), 80)
}
function ustawTrybKamery(t: string) {
  ;(silnik.value as { nawigacja: { ustawTryb(t: string): void } } | null)?.nawigacja.ustawTryb(t)
  trybKamery.value = t
}
const menu = 'z-50 w-44 rounded-[8px] bg-[#1e1f23] p-1 shadow-2xl ring-1 ring-black/50'
const pozycjaMenu = 'flex h-7 items-center gap-2 rounded-[5px] px-2 text-[12px] text-white outline-none data-[highlighted]:bg-[#0d99ff]'
</script>

<template>
  <div class="absolute bottom-4 left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-1 rounded-[12px] bg-[#1b1d22] px-2 shadow-[0_8px_28px_rgba(0,0,0,.45)] ring-1 ring-black/40">
    <template v-if="tryb === 'edit'">
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <PrzyciskPaska :ikona="aktywneNarzedzie.ikona" :opis="aktywneNarzedzie.opis" aktywny lista />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent side="top" :side-offset="10" :class="menu">
            <DropdownMenuItem v-for="n in narzedzia" :key="n.id" :class="pozycjaMenu" @select="$narzedzie.set(n.id)"><component :is="n.ikona" :size="14" /> {{ n.opis }}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <PrzyciskPaska :ikona="Sofa" opis="Place furniture" @click="$bibliotekaOtwarta.set(true)" />
      <PrzyciskPaska :ikona="Lightbulb" opis="Add light" @click="dodajSwiatlo" />
      <PrzyciskPaska :ikona="Route" opis="Go to point" />
      <span class="mx-1 h-6 w-px bg-[#34363c]" />
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child><PrzyciskPaska :ikona="Video" opis="Camera mode" lista /></DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent side="top" :side-offset="10" :class="menu">
            <DropdownMenuItem v-for="[id, nazwa] in [['spacer', 'Walk'], ['orbita', 'Orbit']]" :key="id" :class="pozycjaMenu" @select="ustawTrybKamery(id)">
              <span class="w-3 text-[#8cc8ff]">{{ trybKamery === id ? '✓' : '' }}</span>{{ nazwa }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <PrzyciskPaska :ikona="Camera" opis="Image" :aktywny="trybPrawej === 'zdjecie'" @click="$trybPrawejKolumny.set(trybPrawej === 'zdjecie' ? 'edycja' : 'zdjecie')" />
      <PrzyciskPaska :ikona="Sparkles" opis="AI render" @click="$trybPrawejKolumny.set('zdjecie')" />
    </template>

    <template v-else>
      <PrzyciskPaska :ikona="PencilRuler" opis="Edit mode" tekst="Edit" @click="$tryb.set('edit')" />
      <span class="mx-1 h-6 w-px bg-[#34363c]" />
      <PrzyciskPaska :ikona="PanelLeft" opis="Views" :aktywny="panelWidokow" @click="$panelWidokow.set(!panelWidokow)" />
      <PrzyciskPaska :ikona="Diamond" opis="Triggers (white dots)" :aktywny="kropki" @click="$kropkiWidoczne.set(!kropki)" />
      <div class="flex items-center text-[12px] text-white">
        <button type="button" aria-label="Previous view" class="flex size-8 items-center justify-center rounded-[8px] hover:bg-white/[0.07]" @click="idz(-1)"><ChevronLeft :size="15" /></button>
        <span class="min-w-8 text-center tabular-nums">{{ indeks + 1 }}/{{ widoki.length }}</span>
        <button type="button" aria-label="Next view" class="flex size-8 items-center justify-center rounded-[8px] hover:bg-white/[0.07]" @click="idz(1)"><ChevronRight :size="15" /></button>
      </div>
      <span class="mx-1 h-6 w-px bg-[#34363c]" />
      <PopoverRoot>
        <PopoverTrigger as-child><PrzyciskPaska :ikona="SlidersHorizontal" opis="Settings" /></PopoverTrigger>
        <PopoverPortal><PopoverContent side="top" :side-offset="10" class="z-50 outline-none"><UstawieniaSpaceru /></PopoverContent></PopoverPortal>
      </PopoverRoot>
    </template>

    <span class="mx-1 h-6 w-px bg-[#34363c]" />
    <PrzyciskPaska :ikona="MapIcon" opis="Top view" :aktywny="zGory" @click="przelaczZGory" />
    <PrzyciskPaska :ikona="MapPinned" opis="Mini map" :aktywny="mapa" @click="$mapaWidoczna.set(!mapa)" />
    <PopoverRoot>
      <PopoverTrigger as-child><PrzyciskPaska :ikona="Aperture" opis="Render quality" /></PopoverTrigger>
      <PopoverPortal><PopoverContent side="top" align="end" :side-offset="10" class="z-50 outline-none"><JakoscRenderu /></PopoverContent></PopoverPortal>
    </PopoverRoot>
  </div>
</template>
