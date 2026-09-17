<script setup lang="ts">
import { X } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { useDraggable } from '@vueuse/core'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed, ref, useTemplateRef, watch } from 'vue'

import { kopiaUstawien, type UstawieniaMaterialu } from '@/meble/material'
import { zmienProjekt } from '@/projekt/projekt'
import { grupyMaterialow } from '@/silnik/materialyMebla'
import { $silnik } from '@/silnik/most'
import { $oknoMaterialu } from '@/stan'

import BibliotekaMaterialow from './BibliotekaMaterialow.vue'
import KulkaMaterialu from './KulkaMaterialu.vue'
import UstawieniaWlasne from './UstawieniaWlasne.vue'

/* Pływające okno materiału grupy elementów (Figma: okno fill z zakładkami Custom | Libraries; D5: kulka i presety).
   Zmiany idą na żywo do silnika raz na klatkę; zmiana struktury (baza, wzór, przełączniki) przebudowuje shader. */
const okno = useStore($oknoMaterialu)
const silnik = useStore($silnik)
const grupa = computed(() => (okno.value ? grupyMaterialow(silnik.value, okno.value.mebel).find((g) => g.klucz === okno.value!.klucz) : undefined))
const u = ref<UstawieniaMaterialu | null>(null)
const zakladka = ref<'custom' | 'libraries'>('libraries')
watch(okno, (o) => {
  u.value = grupa.value ? kopiaUstawien(grupa.value.ustawienia) : null
  if (o) zakladka.value = o.zakladka
}, { immediate: true })

let klatka = 0
watch(u, (v) => {
  if (!v || !okno.value) return
  cancelAnimationFrame(klatka)
  const { mebel, klucz } = okno.value
  const kopia = kopiaUstawien(v)
  klatka = requestAnimationFrame(() => zmienProjekt(`Material · ${kopia.nazwa}`, (d) => (d.materialy[`${mebel}/${klucz}`] = kopia), { scal: `material:${mebel}/${klucz}` }))
}, { deep: true })

function wybierzPreset(p: UstawieniaMaterialu) {
  if (!okno.value) return
  u.value = kopiaUstawien(p)
  const { mebel, klucz } = okno.value
  zmienProjekt(`Preset · ${p.nazwa}`, (d) => (d.materialy[`${mebel}/${klucz}`] = kopiaUstawien(p)))
}

const ramka = useTemplateRef<HTMLElement>('ramka')
const uchwyt = useTemplateRef<HTMLElement>('uchwyt')
const { style } = useDraggable(ramka, { handle: uchwyt, initialValue: { x: window.innerWidth - 240 - 12 - 272, y: 64 }, preventDefault: true })
</script>

<template>
  <div v-if="okno && u && grupa" ref="ramka" class="fixed z-40 flex max-h-[calc(100vh-80px)] w-[272px] flex-col overflow-hidden rounded-[13px] bg-[#1e1e1e] text-white shadow-[0_12px_36px_rgba(0,0,0,.5)] ring-1 ring-white/10" :style="style">
    <div ref="uchwyt" class="flex h-12 shrink-0 cursor-grab items-center gap-2.5 border-b border-[#2c2c2c] px-3 active:cursor-grabbing">
      <KulkaMaterialu :ustawienia="u" :zrodlo="grupa.zrodlo" :rozmiar="30" />
      <span class="min-w-0 flex-1">
        <input v-model="u.nazwa" aria-label="Material name" class="w-full truncate bg-transparent text-[12px] font-semibold outline-none focus:ring-1 focus:ring-[#0d99ff]" @pointerdown.stop />
        <span class="block text-[10.5px] text-[#a4a7ae]">{{ grupa.siatki.length }} elements with this material</span>
      </span>
      <button type="button" aria-label="Close" class="flex size-6 items-center justify-center rounded-[5px] text-[#c9ccd2] hover:bg-white/5 hover:text-white" @pointerdown.stop @click="$oknoMaterialu.set(null)"><X :size="14" /></button>
    </div>
    <TabsRoot v-model="zakladka" class="flex min-h-0 flex-1 flex-col">
      <TabsList class="flex h-9 shrink-0 items-center gap-1 border-b border-[#2c2c2c] px-2">
        <TabsTrigger v-for="z in ['custom', 'libraries']" :key="z" :value="z" class="h-6 rounded-[5px] px-2 text-[11px] capitalize text-[#a4a7ae] outline-none data-[state=active]:bg-[#2c2e34] data-[state=active]:font-semibold data-[state=active]:text-white">{{ z }}</TabsTrigger>
      </TabsList>
      <TabsContent value="custom" class="min-h-0 flex-1 overflow-y-auto outline-none"><UstawieniaWlasne v-model="u" :zrodlo="grupa.zrodlo" /></TabsContent>
      <TabsContent value="libraries" class="min-h-0 flex-1 overflow-y-auto outline-none"><BibliotekaMaterialow :aktualny="u.nazwa" :zrodlo="grupa.zrodlo" @wybierz="wybierzPreset" /></TabsContent>
    </TabsRoot>
  </div>
</template>
