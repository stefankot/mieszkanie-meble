<script setup lang="ts">
import { Box, ChevronRight, Clock, Heart, LayoutGrid, Maximize2, Pin, Search, X } from '@lucide/vue'
import { useDraggable } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

import { kategorieBiblioteki, materialy, obiekty, palety } from '@/data/mieszkanie'
import { $bibliotekaOtwarta } from '@/stan'

/* D5 Assets: pływające okno (przypnij, powiększ, zamknij), Online/Lokalne, Model/Materiał/Paleta,
   Wszystkie/Ostatnie/Ulubione, kategorie z licznikami, siatka miniatur. Przeciągany za nagłówek. */
const uchwyt = useTemplateRef<HTMLElement>('uchwyt')
const { style } = useDraggable(uchwyt, { initialValue: { x: 300, y: 96 }, preventDefault: true })
const zrodlo = ref<'online' | 'lokalne'>('lokalne')
const typ = ref<'modele' | 'materialy' | 'palety'>('modele')
const meble = computed(() => obiekty.filter((o) => o.typ === 'mebel'))
</script>

<template>
  <div class="fixed z-40 flex h-[460px] w-[640px] flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-2xl" :style="style">
    <div ref="uchwyt" class="flex h-8 shrink-0 cursor-grab items-center gap-2 border-b border-line bg-panel-2 px-2 select-none">
      <span class="text-2xs font-medium tracking-wide text-muted">BIBLIOTEKA</span>
      <div class="ml-auto flex items-center gap-1 text-faint">
        <button type="button" aria-label="Przypnij" class="p-1 hover:text-text"><Pin :size="12" /></button>
        <button type="button" aria-label="Powiększ" class="p-1 hover:text-text"><Maximize2 :size="12" /></button>
        <button type="button" aria-label="Zamknij" class="p-1 hover:text-text" @click="$bibliotekaOtwarta.set(false)"><X :size="13" /></button>
      </div>
    </div>
    <div class="flex h-9 shrink-0 items-center gap-4 border-b border-line px-3">
      <button v-for="z in (['online', 'lokalne'] as const)" :key="z" type="button" class="text-xs" :class="zrodlo === z ? 'font-medium text-text' : 'text-faint'" @click="zrodlo = z">
        {{ z === 'online' ? 'Online' : 'Lokalne' }}
      </button>
      <label class="ml-auto flex items-center gap-1.5 text-2xs text-muted"><LayoutGrid :size="12" /> Średnie ikony</label>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-[180px_1fr]">
      <nav class="flex min-h-0 flex-col gap-1 overflow-y-auto border-r border-line p-2">
        <div class="flex gap-3 px-1 pb-1">
          <button v-for="t in (['modele', 'materialy', 'palety'] as const)" :key="t" type="button" class="text-xs" :class="typ === t ? 'text-text' : 'text-faint'" @click="typ = t">
            {{ { modele: 'Model', materialy: 'Materiał', palety: 'Paleta' }[t] }}
          </button>
        </div>
        <label class="flex h-6 items-center gap-1.5 rounded-[5px] bg-field px-2 text-faint"><Search :size="12" /><input class="min-w-0 flex-1 bg-transparent text-xs text-text outline-none placeholder:text-faint" placeholder="Szukaj zasobów" /></label>
        <ul class="mt-1 text-xs">
          <li class="flex h-6 items-center gap-2 rounded px-1.5 text-text"><LayoutGrid :size="12" class="text-faint" /> Wszystkie <span class="ml-auto text-faint">16</span></li>
          <li class="flex h-6 items-center gap-2 rounded px-1.5 text-muted"><Clock :size="12" class="text-faint" /> Ostatnie <span class="ml-auto text-faint">4</span></li>
          <li class="flex h-6 items-center gap-2 rounded px-1.5 text-muted"><Heart :size="12" class="text-faint" /> Ulubione <span class="ml-auto text-faint">2</span></li>
        </ul>
        <ul class="mt-1 border-t border-line pt-1 text-xs">
          <template v-for="k in kategorieBiblioteki" :key="k.nazwa">
            <li class="flex h-6 items-center gap-1 rounded px-1.5 text-muted"><ChevronRight :size="11" :class="k.dzieci ? 'rotate-90' : 'opacity-0'" /> {{ k.nazwa }} <span class="ml-auto text-faint">{{ k.liczba }}</span></li>
            <li v-for="(d, i) in k.dzieci" :key="d.nazwa" class="flex h-6 items-center rounded pl-6 pr-1.5" :class="i === 0 ? 'bg-accent text-white' : 'text-muted'">{{ d.nazwa }} <span class="ml-auto" :class="i === 0 ? 'text-white/70' : 'text-faint'">{{ d.liczba }}</span></li>
          </template>
        </ul>
      </nav>
      <div class="grid min-h-0 auto-rows-[132px] grid-cols-3 gap-2 overflow-y-auto p-2">
        <template v-if="typ === 'modele'">
          <button v-for="(m, i) in meble" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-md bg-panel-2 text-left ring-1" :class="i === 0 ? 'ring-accent' : 'ring-transparent hover:ring-line'">
            <span class="flex flex-1 items-center justify-center bg-gradient-to-b from-[#26262b] to-[#1b1b1e] text-faint"><Box :size="34" :stroke-width="1" /></span>
            <span class="truncate px-2 py-1.5 text-2xs text-muted">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else-if="typ === 'materialy'">
          <button v-for="m in materialy" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-md bg-panel-2 text-left ring-1 ring-transparent hover:ring-line">
            <span class="flex-1 bg-cover bg-center" :style="{ backgroundColor: m.kolor, backgroundImage: m.miniatura ? `url(${m.miniatura})` : undefined }" />
            <span class="truncate px-2 py-1.5 text-2xs text-muted">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else>
          <button v-for="p in palety" :key="p.id" type="button" class="flex flex-col overflow-hidden rounded-md bg-panel-2 text-left ring-1 ring-transparent hover:ring-line">
            <span class="flex flex-1"><i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" /></span>
            <span class="truncate px-2 py-1.5 text-2xs text-muted">{{ p.nazwa }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
