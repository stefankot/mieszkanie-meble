<script setup lang="ts">
import { Box, ChevronDown, ChevronRight, Clock, Heart, LayoutGrid, Maximize2, Pin, Search, X } from '@lucide/vue'
import { useDraggable } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

import { kategorieBiblioteki, materialy, obiekty, palety } from '@/data/mieszkanie'
import { $bibliotekaOtwarta } from '@/stan'
import Pudelko from '@/ui/primitives/Pudelko.vue'

/* D5 Assets (pomiar: okno ~632×876, tytuł 23, zakładki Online/Local 26, wiersz kontrolek 28, nawigacja 137,
   wiersze listy co 25, karty ~151×150 z odstępem 6). Przeciągane za pasek tytułu. */
const uchwyt = useTemplateRef<HTMLElement>('uchwyt')
const { style } = useDraggable(uchwyt, { initialValue: { x: 360, y: 40 }, preventDefault: true })
const zrodlo = ref<'online' | 'local'>('local')
const typ = ref<'model' | 'material' | 'palette'>('model')
const dynamiczne = ref(false)
const wybrana = ref('regal-salon')
const meble = computed(() => obiekty.filter((o) => o.typ === 'mebel'))
const karta = (id: string) => (wybrana.value === id ? 'ring-2 ring-[#3b6cff]' : 'ring-1 ring-transparent hover:ring-[#3a3d45]')
const wierszListy = 'flex h-(--wiersz-listy) items-center gap-2 rounded-[3px] px-2 text-[10.5px]'
</script>

<template>
  <div class="fixed z-40 flex h-[min(876px,calc(100vh-56px))] w-[632px] flex-col overflow-hidden rounded-[4px] bg-panel shadow-[0_16px_48px_rgba(0,0,0,.6)] ring-1 ring-black/50" :style="style">
    <div ref="uchwyt" class="flex h-[23px] shrink-0 cursor-grab items-center gap-1.5 bg-[#15171b] pl-2 pr-2.5 select-none">
      <span class="size-3 rounded-full bg-[#6c4bff]" />
      <span class="text-[9.5px] font-semibold tracking-wide text-label">ASSETS</span>
      <div class="ml-auto flex items-center gap-3 text-label">
        <button type="button" aria-label="Pin" class="hover:text-white"><Pin :size="11" /></button>
        <button type="button" aria-label="Maximize" class="hover:text-white"><Maximize2 :size="11" /></button>
        <button type="button" aria-label="Close" class="hover:text-white" @click="$bibliotekaOtwarta.set(false)"><X :size="12" /></button>
      </div>
    </div>
    <div class="flex h-[30px] shrink-0 items-end gap-[22px] px-[18px]">
      <button v-for="z in ['online', 'local'] as const" :key="z" type="button" class="pb-1 text-xs capitalize" :class="zrodlo === z ? 'font-semibold text-white' : 'text-label'" @click="zrodlo = z">{{ z }}</button>
    </div>
    <div class="flex h-7 shrink-0 items-center justify-end gap-3 pr-3.5">
      <label class="flex items-center gap-1.5 text-[10.5px] text-label"><Pudelko v-model="dynamiczne" /> Dynamic only</label>
      <button type="button" class="flex h-5 items-center gap-2 rounded-d5 bg-field pl-2 pr-1.5 text-[10.5px] text-text">Medium Icons <ChevronDown :size="10" class="text-muted" /></button>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-[137px_1fr]">
      <nav class="flex min-h-0 flex-col overflow-y-auto pb-3 pl-2 pr-1">
        <div class="flex h-6 items-center gap-3 px-1">
          <button v-for="t in ['model', 'material', 'palette'] as const" :key="t" type="button" class="text-[10.5px] capitalize" :class="typ === t ? 'text-white' : 'text-muted'" @click="typ = t">{{ t }}</button>
        </div>
        <label class="mt-2.5 flex h-(--wys-listy) shrink-0 items-center gap-1.5 rounded-d5 bg-field px-2 text-muted"><Search :size="11" /><input class="min-w-0 flex-1 bg-transparent text-[10.5px] text-text outline-none placeholder:text-faint" placeholder="Search Assets" /></label>
        <ul class="mt-3">
          <li :class="[wierszListy, 'text-text']"><LayoutGrid :size="11" class="text-label" /> All <span class="ml-auto text-label">16</span></li>
          <li :class="[wierszListy, 'text-text']"><Clock :size="11" class="text-label" /> Recent <span class="ml-auto text-label">4</span></li>
          <li :class="[wierszListy, 'text-text']"><Heart :size="11" class="text-label" /> Favourite <span class="ml-auto text-label">2</span></li>
        </ul>
        <ul class="mt-5">
          <template v-for="k in kategorieBiblioteki" :key="k.nazwa">
            <li :class="[wierszListy, 'gap-1 pl-1 text-text']"><ChevronRight :size="10" :class="k.dzieci ? 'rotate-90 text-label' : 'opacity-0'" /> {{ k.nazwa }} <span class="ml-auto text-label">{{ k.liczba }}</span></li>
            <li v-for="(d, i) in k.dzieci" :key="d.nazwa" :class="[wierszListy, 'pl-6', i === 0 ? 'bg-accent text-white' : 'text-text']">{{ d.nazwa }} <span class="ml-auto" :class="i === 0 ? 'text-white' : 'text-label'">{{ d.liczba }}</span></li>
          </template>
        </ul>
      </nav>
      <div class="grid min-h-0 auto-rows-[150px] grid-cols-3 content-start gap-1.5 overflow-y-auto pb-3 pl-4 pr-3">
        <template v-if="typ === 'model'">
          <button v-for="m in meble" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left" :class="karta(m.id)" @click="wybrana = m.id">
            <span class="flex flex-1 items-center justify-center text-[#5b5f67]"><Box :size="46" :stroke-width="0.8" /></span>
            <span class="truncate px-2.5 pb-2.5 text-[10.5px] text-text">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else-if="typ === 'material'">
          <button v-for="m in materialy" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left" :class="karta(m.id)" @click="wybrana = m.id">
            <span class="mx-auto mt-3 aspect-square w-[92px] rounded-full bg-cover bg-center" :style="{ backgroundColor: m.kolor, backgroundImage: m.miniatura ? `url(${m.miniatura})` : undefined }" />
            <span class="mt-auto truncate px-2.5 pb-2.5 text-[10.5px] text-text">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else>
          <button v-for="p in palety" :key="p.id" type="button" class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left" :class="karta(p.id)" @click="wybrana = p.id">
            <span class="mx-3 mt-3 flex flex-1 overflow-hidden rounded-[2px]"><i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" /></span>
            <span class="truncate px-2.5 py-2.5 text-[10.5px] text-text">{{ p.nazwa }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
