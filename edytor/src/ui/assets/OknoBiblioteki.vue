<script setup lang="ts">
import { Box, ChevronDown, ChevronRight, Clock, Heart, LayoutGrid, Maximize2, Pin, Search, X } from '@lucide/vue'
import { useDraggable } from '@vueuse/core'
import { computed, ref, useTemplateRef, watch } from 'vue'

import { $katalogOnline, $pobieranaTekstura, $stanKatalogu, kategorie as kategorieOnline, MINIATURA, pobierzKatalog, szukaj, szukajOnline } from '@/assets/blendkit'
import { kategorieBiblioteki, materialy, obiekty, palety } from '@/data/mieszkanie'
import { wykonaj } from '@/ops/rejestr'
import '@/ops/operacje'
import { useStore } from '@nanostores/vue'

import { $bibliotekaOtwarta, $zaznaczenie } from '@/stan'
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
const blad = ref('')
/* Zakładka Online: Blendkit. Materiały są tam plikami `.blend`, więc katalog pokazuje to, co już wyciągnięte
   lokalnie, a szukanie sięga po całą bibliotekę przez serwer dev (Blender wyciąga mapy przy pierwszym użyciu). */
const katalog = useStore($katalogOnline)
const stanKatalogu = useStore($stanKatalogu)
const pobierana = useStore($pobieranaTekstura)
const szukanie = ref('')
const kategoria = ref<string | null>(null)
const rozdzielczosc = ref<'1k' | '2k' | '4k'>('2k')
const szukaWBibliotece = ref(false)
const tylkoCC0 = ref(false)
watch(zrodlo, (z) => z === 'online' && pobierzKatalog().catch((e) => (blad.value = e.message)), { immediate: true })
let czasomierzSzukania: ReturnType<typeof setTimeout> | undefined
watch([szukanie, zrodlo, tylkoCC0], ([fraza, z]) => {
  clearTimeout(czasomierzSzukania)
  if (z !== 'online' || String(fraza).trim().length < 3) return
  czasomierzSzukania = setTimeout(() => {
    szukaWBibliotece.value = true
    szukajOnline(String(fraza), { tylkoCC0: tylkoCC0.value })
      .catch((e) => (blad.value = e instanceof Error ? e.message : String(e)))
      .finally(() => (szukaWBibliotece.value = false))
  }, 450)
})
const opisLicencji = (l: string) => (l === 'cc_zero' ? 'CC0' : l === 'royalty_free' ? 'licencja Blendkit' : l)
const wynikiOnline = computed(() => szukaj(szukanie.value, kategoria.value, katalog.value).slice(0, 180))
const kategorieZKatalogu = computed(() => kategorieOnline(katalog.value))
function uzyjOnline(id: string) {
  blad.value = ''
  try {
    const wynik = wykonaj('material.applyOnlineTexture', { tekstura: id, rozdzielczosc: rozdzielczosc.value, mebel: $zaznaczenie.get() ?? undefined })
    if (wynik instanceof Promise) wynik.catch((e) => (blad.value = e instanceof Error ? e.message : String(e)))
  } catch (e) {
    blad.value = e instanceof Error ? e.message : String(e)
  }
}
/* Podwójny klik wstawia mebel przed kamerą (kopia w projekcie), nadaje materiał albo paletę zaznaczeniu. */
function uzyj(id: string) {
  blad.value = ''
  try {
    if (typ.value === 'model') wykonaj('furniture.insert', { asset: id })
    else if (typ.value === 'palette') wykonaj('palette.apply', { paleta: id, mebel: $zaznaczenie.get() ?? undefined })
    else wykonaj('material.setColor', { kolor: materialy.find((m) => m.id === id)?.kolor ?? '#cccccc' })
  } catch (e) {
    blad.value = e instanceof Error ? e.message : String(e)
  }
}
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
      <label v-if="zrodlo === 'online'" class="flex items-center gap-1 text-[10.5px] text-muted" title="Tylko materiały CC0 — te wolno publikować razem z projektem"><input v-model="tylkoCC0" type="checkbox" class="accent-[#3b6cff]" />CC0</label>
      <select v-if="zrodlo === 'online'" v-model="rozdzielczosc" aria-label="Rozdzielczość" class="h-5 rounded-d5 bg-field px-1 text-[10.5px] text-text outline-none">
        <option value="1k">1K</option>
        <option value="2k">2K</option>
        <option value="4k">4K</option>
      </select>
      <button type="button" class="flex h-5 items-center rounded-d5 bg-accent px-2 text-[10.5px] font-medium text-white" @click="zrodlo === 'online' ? uzyjOnline(wybrana) : uzyj(wybrana)">{{ zrodlo === 'online' ? 'Apply' : typ === 'model' ? 'Insert' : 'Apply' }}</button>
    </div>
    <p v-if="zrodlo === 'online'" class="px-4 pb-1 text-[10.5px] text-muted">Blendkit · darmowe assety · pełny zestaw map PBR: barwa, normalne, chropowatość, metaliczność, AO, wysokość</p>
    <p v-if="blad" class="px-4 pb-1 text-[10.5px] text-[#ff8a80]">{{ blad }}</p>
    <div class="grid min-h-0 flex-1 grid-cols-[137px_1fr]">
      <nav class="flex min-h-0 flex-col overflow-y-auto pb-3 pl-2 pr-1">
        <div class="flex h-6 items-center gap-3 px-1">
          <button v-for="t in ['model', 'material', 'palette'] as const" :key="t" type="button" class="text-[10.5px] capitalize" :class="typ === t ? 'text-white' : 'text-muted'" @click="typ = t">{{ t }}</button>
        </div>
        <label class="mt-2.5 flex h-(--wys-listy) shrink-0 items-center gap-1.5 rounded-d5 bg-field px-2 text-muted"><Search :size="11" /><input v-model="szukanie" class="min-w-0 flex-1 bg-transparent text-[10.5px] text-text outline-none placeholder:text-faint" :placeholder="zrodlo === 'online' ? 'Szukaj w Blendkit' : 'Search Assets'" /></label>
        <ul class="mt-3">
          <li :class="[wierszListy, 'text-text']"><LayoutGrid :size="11" class="text-label" /> All <span class="ml-auto text-label">16</span></li>
          <li :class="[wierszListy, 'text-text']"><Clock :size="11" class="text-label" /> Recent <span class="ml-auto text-label">4</span></li>
          <li :class="[wierszListy, 'text-text']"><Heart :size="11" class="text-label" /> Favourite <span class="ml-auto text-label">2</span></li>
        </ul>
        <ul v-if="zrodlo === 'online'" class="mt-3">
          <li :class="[wierszListy, kategoria === null ? 'bg-accent text-white' : 'text-text']"><button type="button" class="flex w-full items-center" @click="kategoria = null">Wszystkie <span class="ml-auto" :class="kategoria === null ? 'text-white' : 'text-label'">{{ katalog.length }}</span></button></li>
          <li v-for="[k, ile] in kategorieZKatalogu" :key="k" :class="[wierszListy, kategoria === k ? 'bg-accent text-white' : 'text-text']"><button type="button" class="flex w-full items-center capitalize" @click="kategoria = k">{{ k }} <span class="ml-auto" :class="kategoria === k ? 'text-white' : 'text-label'">{{ ile }}</span></button></li>
        </ul>
        <ul v-else class="mt-5">
          <template v-for="k in kategorieBiblioteki" :key="k.nazwa">
            <li :class="[wierszListy, 'gap-1 pl-1 text-text']"><ChevronRight :size="10" :class="k.dzieci ? 'rotate-90 text-label' : 'opacity-0'" /> {{ k.nazwa }} <span class="ml-auto text-label">{{ k.liczba }}</span></li>
            <li v-for="(d, i) in k.dzieci" :key="d.nazwa" :class="[wierszListy, 'pl-6', i === 0 ? 'bg-accent text-white' : 'text-text']">{{ d.nazwa }} <span class="ml-auto" :class="i === 0 ? 'text-white' : 'text-label'">{{ d.liczba }}</span></li>
          </template>
        </ul>
      </nav>
      <div class="grid min-h-0 auto-rows-[150px] grid-cols-3 content-start gap-1.5 overflow-y-auto pb-3 pl-4 pr-3">
        <template v-if="zrodlo === 'online'">
          <p v-if="stanKatalogu === 'pobieranie'" class="col-span-3 py-6 text-center text-[10.5px] text-muted">Wczytuję katalog tekstur…</p>
          <p v-else-if="szukaWBibliotece" class="col-span-3 py-2 text-center text-[10.5px] text-muted">Szukam w Blendkit…</p>
          <p v-else-if="stanKatalogu === 'blad'" class="col-span-3 py-6 text-center text-[10.5px] text-[#ff8a80]">Nie udało się pobrać katalogu.</p>
          <button
            v-for="t in wynikiOnline"
            :key="t.id"
            type="button"
            class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left"
            :class="karta(t.id)"
            :title="`${t.nazwa}${t.autor ? ` · ${t.autor}` : ''} · ${opisLicencji(t.licencja)}${t.wymiaryM ? ` · ${t.wymiaryM[0]} m` : ''}${t.lokalna ? ' · wyciągnięta lokalnie' : ' · Blender wyciągnie mapy przy pierwszym użyciu'}`"
            @click="wybrana = t.id"
            @dblclick="uzyjOnline(t.id)"
          >
            <span class="relative min-h-0 flex-1">
              <img :src="MINIATURA(t)" :alt="t.nazwa" loading="lazy" class="h-full w-full object-cover" />
              <span v-if="pobierana === t.id" class="absolute inset-0 flex items-center justify-center bg-black/65 text-[10.5px] text-white">Blender wyciąga mapy…</span>
              <span v-else-if="!t.lokalna" class="absolute right-1 top-1 rounded-[2px] bg-black/60 px-1 text-[9px] text-white">do pobrania</span>
            </span>
            <span class="flex items-baseline gap-1 px-2.5 pb-2 pt-1.5">
              <span class="truncate text-[10.5px] text-text">{{ t.nazwa }}</span>
              <span class="ml-auto shrink-0 text-[9px] text-label">{{ opisLicencji(t.licencja) }}</span>
            </span>
          </button>
          <p v-if="stanKatalogu === 'gotowy' && !wynikiOnline.length" class="col-span-3 py-6 text-center text-[10.5px] text-muted">Brak wyników.</p>
        </template>
        <template v-else-if="typ === 'model'">
          <button v-for="m in meble" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left" :class="karta(m.id)" @click="wybrana = m.id" @dblclick="uzyj(m.id)">
            <span class="flex flex-1 items-center justify-center text-[#5b5f67]"><Box :size="46" :stroke-width="0.8" /></span>
            <span class="truncate px-2.5 pb-2.5 text-[10.5px] text-text">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else-if="typ === 'material'">
          <button v-for="m in materialy" :key="m.id" type="button" class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left" :class="karta(m.id)" @click="wybrana = m.id" @dblclick="uzyj(m.id)">
            <span class="mx-auto mt-3 aspect-square w-[92px] rounded-full bg-cover bg-center" :style="{ backgroundColor: m.kolor, backgroundImage: m.miniatura ? `url(${m.miniatura})` : undefined }" />
            <span class="mt-auto truncate px-2.5 pb-2.5 text-[10.5px] text-text">{{ m.nazwa }}</span>
          </button>
        </template>
        <template v-else>
          <button v-for="p in palety" :key="p.id" type="button" class="flex flex-col overflow-hidden rounded-[3px] bg-[#16181c] text-left" :class="karta(p.id)" @click="wybrana = p.id" @dblclick="uzyj(p.id)">
            <span class="mx-3 mt-3 flex flex-1 overflow-hidden rounded-[2px]"><i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" /></span>
            <span class="truncate px-2.5 py-2.5 text-[10.5px] text-text">{{ p.nazwa }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
