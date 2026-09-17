<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { $silnik } from '@/silnik/most'
import { granicePlanu, renderujRzut, type Granice } from '@/silnik/rzutZGory'
import { poDuzejZmianie } from '@/silnik/zmiany'
import { $aktywnyWidok, $mapaWidoczna } from '@/stan'

/* Mapa: tło to rzut z góry z silnika (co minutę i po dużej zmianie), na nim pokoje (klik = scena),
   małe znaczniki mebli (klik = kadr mebla) i stale aktualna pozycja oraz kierunek patrzenia. */
const silnik = useStore($silnik)
const widoczna = useStore($mapaWidoczna)
const aktywny = useStore($aktywnyWidok)
const g = ref<Granice | null>(null)
const tlo = ref<string | null>(null)
const ja = ref({ x: 0, z: 0, kat: 0 })
const meble = ref<{ id: string; nazwa: string; x: number; z: number; korzen: unknown }[]>([])

const pokoje = computed(() => (silnik.value?.nawigacja.pokoje ?? []).map((p: any) => ({ id: p.id, nazwa: p.name, punkty: (p.polygon as number[][]).map((q) => q.join(',')).join(' ') })))
const viewBox = computed(() => (g.value ? `${g.value.minX} ${g.value.minZ} ${g.value.szer} ${g.value.wys}` : '0 0 1 1'))
// Znaczniki w pikselach ekranu niezależnie od skali planu (mapa ma 220 px szerokości).
const px = computed(() => (g.value ? g.value.szer / 220 : 1))

let trwa = false
async function odswiezTlo() {
  const s = silnik.value
  if (!s || !g.value || trwa || !widoczna.value) return
  trwa = true
  try {
    tlo.value = await renderujRzut(s, g.value)
  } catch (e) {
    console.warn('Rzut z góry nie powstał', e)
  } finally {
    trwa = false
  }
}

function zbierzMeble() {
  const s = silnik.value as any
  if (!s?.biblioteka) return
  const T = s.THREE
  meble.value = [...s.biblioteka.meble].flatMap(([id, wpis]: [string, any]) => {
    if (!wpis?.korzen) return []
    const c = new T.Box3().setFromObject(wpis.korzen).getCenter(new T.Vector3())
    return Number.isFinite(c.x) ? [{ id, nazwa: wpis.nazwa ?? id, x: c.x, z: c.z, korzen: wpis.korzen }] : []
  })
}

let klatka = 0
let ostatnia = 0
function sledz(czas: number) {
  klatka = requestAnimationFrame(sledz)
  const s = silnik.value
  if (!s || czas - ostatnia < 66) return
  ostatnia = czas
  const d = s.camera.getWorldDirection(new s.THREE.Vector3())
  ja.value = { x: s.camera.position.x, z: s.camera.position.z, kat: (Math.atan2(d.z, d.x) * 180) / Math.PI }
}

let czasomierz: ReturnType<typeof setInterval> | undefined
let wypisz: (() => void) | undefined
watch(
  silnik,
  (s) => {
    clearInterval(czasomierz)
    wypisz?.()
    cancelAnimationFrame(klatka)
    if (!s) return
    g.value = granicePlanu(s)
    zbierzMeble()
    klatka = requestAnimationFrame(sledz)
    setTimeout(odswiezTlo, 2500)
    czasomierz = setInterval(odswiezTlo, 60_000)
    wypisz = poDuzejZmianie(1500, () => (zbierzMeble(), odswiezTlo()))
  },
  { immediate: true }
)
watch(widoczna, (v) => v && !tlo.value && odswiezTlo())
onBeforeUnmount(() => {
  clearInterval(czasomierz)
  wypisz?.()
  cancelAnimationFrame(klatka)
})

const kadruj = (korzen: unknown) => (silnik.value as any)?.nawigacja.kadrujMebel(korzen)
</script>

<template>
  <div v-if="widoczna && g" class="pointer-events-auto absolute bottom-4 right-4 z-10 w-[220px] overflow-hidden rounded-[10px] bg-[#1b1d22]/90 p-1 shadow-[0_8px_24px_rgba(0,0,0,.35)] ring-1 ring-white/10 backdrop-blur">
    <svg :viewBox="viewBox" class="block w-full" role="img" aria-label="Apartment map">
      <image v-if="tlo" :href="tlo" :x="g.minX" :y="g.minZ" :width="g.szer" :height="g.wys" preserveAspectRatio="none" />
      <polygon
        v-for="p in pokoje"
        :key="p.id"
        :points="p.punkty"
        class="cursor-pointer outline-none"
        :fill="p.id === aktywny ? 'rgba(13,153,255,.14)' : tlo ? 'transparent' : '#2a2c31'"
        :stroke="p.id === aktywny ? '#0d99ff' : 'rgba(255,255,255,.28)'"
        :stroke-width="px"
        @click="$aktywnyWidok.set(p.id)"
      >
        <title>{{ p.nazwa }}</title>
      </polygon>
      <circle v-for="m in meble" :key="m.id" :cx="m.x" :cy="m.z" :r="px * 3.5" fill="#fff" :stroke="'#1b1d22'" :stroke-width="px" class="cursor-pointer" @click="kadruj(m.korzen)">
        <title>{{ m.nazwa }}</title>
      </circle>
      <g :transform="`translate(${ja.x} ${ja.z}) rotate(${ja.kat})`" class="pointer-events-none">
        <path :d="`M0 0 L${px * 30} ${-px * 14} A${px * 33} ${px * 33} 0 0 1 ${px * 30} ${px * 14} Z`" fill="rgba(13,153,255,.35)" />
        <circle :r="px * 4.5" fill="#0d99ff" stroke="#fff" :stroke-width="px * 1.5" />
      </g>
    </svg>
  </div>
</template>
