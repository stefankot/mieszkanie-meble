<script setup lang="ts">
import { Box, ChevronDown, ChevronRight, Clock, Heart, LayoutGrid, Maximize2, Pin, Search, X } from '@lucide/vue'
import { useDraggable } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

import { kategorieBiblioteki, materialy, obiekty, palety } from '@/data/mieszkanie'
import { $bibliotekaOtwarta } from '@/stan'
import Pudelko from '@/ui/primitives/Pudelko.vue'

/* D5 Assets: pływające okno z tytułem, Online/Local, „Dynamic only”, „Medium Icons”; lewa nawigacja
   (Model/Material/Palette, szukaj, All/Recent/Favourite, kategorie z licznikami); siatka kwadratowych kart. */
const uchwyt = useTemplateRef<HTMLElement>('uchwyt')
const { style } = useDraggable(uchwyt, { initialValue: { x: 420, y: 70 }, preventDefault: true })
const zrodlo = ref<'online' | 'local'>('local')
const typ = ref<'model' | 'material' | 'palette'>('model')
const dynamiczne = ref(false)
const wybrana = ref('regal-salon')
const meble = computed(() => obiekty.filter((o) => o.typ === 'mebel'))
const karta = (id: string) => (wybrana.value === id ? 'ring-[1.5px] ring-accent' : 'ring-1 ring-transparent hover:ring-[#3a3d45]')
</script>

<template>
  <div class="fixed z-40 flex h-[560px] w-[600px] flex-col overflow-hidden rounded-[4px] bg-panel shadow-[0_16px_48px_rgba(0,0,0,.6)] ring-1 ring-black/50" :style="style">
    <div ref="uchwyt" class="flex h-7 shrink-0 cursor-grab items-center gap-2 bg-[#16181c] px-2 select-none">
      <span class="size-3 rounded-full bg-[#6c4bff]" />
      <span class="text-[9.5px] font-semibold tracking-wide text-label">ASSETS</span>
      <div class="ml-auto flex items-center gap-2 text-muted">
        <button type="button" aria-label="Pin" class="hover:text-white"><Pin :size="11" /></button>
        <button type="button" aria-label="Maximize" class="hover:text-white"><Maximize2 :size="11" /></button>
        <button type="button" aria-label="Close" class="hover:text-white" @click="$bibliotekaOtwarta.set(false)"><X :size="12" /></button>
      </div>
    </div>
    <div class="flex h-8 shrink-0 items-center gap-4 px-3">
      <button v-for="z in ['online', 'local'] as const" :key="z" type="button" class="text-xs capitalize" :class="zrodlo === z ? 'font-semibold text-white' : 'text-muted'" @click="zrodlo = z">{{ z }}</button>
      <label class="ml-auto flex items-center gap-1.5 text-2xs text-label"><Pudelko v-model="dynamiczne" /> Dynamic only</label>
      <button type="button" class="flex h-5 items-center gap-1 rounded-d5 bg-field px-1.5 text-2xs text-text">Medium Icons <ChevronDown :size="10" class="text-muted" /></button>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-[150px_1fr]">
      <nav class="flex min-h-0 flex-col gap-1 overflow-y-auto px-1.5 pb-2">
        <div class="flex gap-2.5 px-1 pb-1">
          <button v-for="t in ['model', 'material', 'palette'] as const" :key="t" type="button" class="text-2xs capitalize" :class="typ === t ? 'text-white' : 'text-muted'" @click="typ = t">{{ t }}</button>
        </div>
        <label class="flex h-[22px] items-center gap-1.5 rounded-d5 bg-field px-1.5 text-muted"><Search :size="11" /><input class="min-w-0 flex-1 bg-transparent text-2xs text-text outline-none placeholder:text-faint" placeholder="Search Assets" /></label>
        <ul class="mt-1 text-2xs">
          <li class="flex h-[22px] items-center gap-1.5 px-1.5 text-text"><LayoutGrid :size="11" class="text-muted" /> All <span class="ml-auto text-muted">16</span></li>
          <li class="flex h-[22px] items-center gap-1.5 px-1.5 text-text"><Clock :size="11" class="text-muted" /> Recent <span class="ml-auto text-muted">4</span></li>
          <li class="flex h-[22px] items-center gap-1.5 px-1.5 text-text"><Heart :size="11" class="text-muted" /> Favourite <span class="ml-auto text-muted">2</span></li>
        </ul>
        <ul class="text-2xs">
          <template v-for="k in kategorieBiblioteki" :key="k.nazwa">
            <li class="flex h-[22px] items-center gap-1 px-1 text-text"><ChevronRight :size="10" :class="k.dzieci ? 'rotate-90 text-muted' : 'opacity-0'" /> {{ k.nazwa }} <span class="ml-auto text-muted">{{ k.liczba }}</span></li>
            <li v-for="(d, i) in k.dzieci" :key="d.nazwa" class="flex h-[22px] items-center rounded-d5 pl-5 pr-1.5" :class="i === 0 ? 'bg-accent text-white' : 'text-text'">{{ d.nazwa }} <span class="ml-auto" :class="i === 0 ? 'text-white' : 'text-muted'">{{ d.liczba }}</span></li>
          </template>
        </ul>
      </nav>
      <div class="grid min-h-0 auto-rows-[128px] grid-cols-3 content-start gap-1.5 overflow-y-auto p-1.5 pl-0">
        <template v-if="typ === 'model'">
          <button v-for="m in meble" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-d5 bg-[#16181c] text-left" :class="karta(m.id)" @click="wybrana = m.id">
            <span class="flex flex-1 items-center justify-center text-[#5b5f67]"><Box :size="40" :stroke-width="0.9" /></span>
            <span class="truncate px-1.5 pb-1.5 text-[10px] text-text">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else-if="typ === 'material'">
          <button v-for="m in materialy" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-d5 bg-[#16181c] text-left" :class="karta(m.id)" @click="wybrana = m.id">
            <span class="m-1.5 flex-1 rounded-full bg-cover bg-center" :style="{ backgroundColor: m.kolor, backgroundImage: m.miniatura ? `url(${m.miniatura})` : undefined }" />
            <span class="truncate px-1.5 pb-1.5 text-[10px] text-text">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else>
          <button v-for="p in palety" :key="p.id" type="button" class="flex flex-col overflow-hidden rounded-d5 bg-[#16181c] text-left" :class="karta(p.id)" @click="wybrana = p.id">
            <span class="m-1.5 flex flex-1 overflow-hidden rounded-[2px]"><i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" /></span>
            <span class="truncate px-1.5 pb-1.5 text-[10px] text-text">{{ p.nazwa }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
