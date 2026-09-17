<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { rozloz, wlasnyZeSrodkow } from '@/meble/rozklad'
import { uklad, zmienUklad } from '@/meble/uklad'
import { $silnik } from '@/silnik/most'
import { $tryb, $zaznaczenie } from '@/stan'

/* Ręczna edycja półek na scenie (tryb edycji): linie półek rzutowane na front zaznaczonego mebla
   (ściana obwiedni zwrócona do kamery), uchwyt na środku, wymiar przegrody obok. Przeciągnięcie →
   rozkład „Custom” (ten sam stan co Inspector). Makieta: geometria modelu jeszcze się nie zmienia. */
interface Linia { x1: number; y1: number; x2: number; y2: number; xm: number; ym: number }
const linie = ref<Linia[]>([])
const etykiety = ref<{ x: number; y: number; tekst: string }[]>([])
const warstwa = ref<HTMLElement | null>(null)
const tryb = useStore($tryb)
const zaznaczenie = useStore($zaznaczenie)
let rzut: ((yMm: number) => number) | null = null
let wnetrze = 0
let klatka = 0

function policz() {
  klatka = requestAnimationFrame(policz)
  const s = $silnik.get()
  const el = warstwa.value
  const id = zaznaczenie.value
  const korzen = id ? s?.scene.getObjectByName(`biblioteka:${id}`) : null
  if (tryb.value !== 'edit' || !s || !el || !korzen) {
    if (linie.value.length) linie.value = []
    if (etykiety.value.length) etykiety.value = []
    return
  }
  const T = s.THREE
  const b = new T.Box3().setFromObject(korzen)
  const kam = s.camera.position
  const cx = (b.min.x + b.max.x) / 2
  const cz = (b.min.z + b.max.z) / 2
  // Ściana obwiedni zwrócona do kamery (front mebla z punktu widzenia użytkownika).
  const sciany = [
    { d: kam.x - b.max.x, a: [b.max.x, b.min.z], c: [b.max.x, b.max.z] },
    { d: b.min.x - kam.x, a: [b.min.x, b.min.z], c: [b.min.x, b.max.z] },
    { d: kam.z - b.max.z, a: [b.min.x, b.max.z], c: [b.max.x, b.max.z] },
    { d: b.min.z - kam.z, a: [b.min.x, b.min.z], c: [b.max.x, b.min.z] }
  ].sort((p, q) => q.d - p.d)[0]
  const u = uklad(id!)
  const y0 = b.min.y + u.marginesDol / 10
  wnetrze = Math.max(100, (b.max.y - b.min.y) * 10 - u.marginesGora - u.marginesDol)
  const w = el.clientWidth
  const h = el.clientHeight
  const naEkran = (x: number, y: number, z: number) => {
    const p = new T.Vector3(x, y, z).project(s.camera)
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, z: p.z }
  }
  const dol = naEkran(cx, y0, cz)
  const gora = naEkran(cx, y0 + wnetrze / 10, cz)
  rzut = (sy: number) => ((dol.y - sy) / (dol.y - gora.y)) * wnetrze
  const wynik = rozloz(wnetrze, u.grubosc, { liczba: u.polki, ...u })
  const nowe: Linia[] = []
  for (const srodek of wynik.srodkiPolek) {
    const y = y0 + srodek / 10
    const a = naEkran(sciany.a[0], y, sciany.a[1])
    const c = naEkran(sciany.c[0], y, sciany.c[1])
    if (a.z > 1 || c.z > 1 || ![a.x, a.y, c.x, c.y].every(Number.isFinite)) continue
    nowe.push({ x1: a.x, y1: a.y, x2: c.x, y2: c.y, xm: (a.x + c.x) / 2, ym: (a.y + c.y) / 2 })
  }
  linie.value = nowe
  // Wymiar przegrody obok osi uchwytów (środek frontu), przycięty do kadru — szeroki mebel wychodzi poza ekran.
  const osX = nowe.length ? nowe[0].xm : naEkran(cx, y0, cz).x
  let pod = 0
  etykiety.value = wynik.przegrody.map((p) => {
    const srodekMm = pod + p / 2
    pod += p + u.grubosc
    const e = naEkran(cx, y0 + srodekMm / 10, cz)
    return { x: Math.min(w - 48, Math.max(4, osX + 22)), y: e.y, tekst: `${Math.round(p / 10)} cm` }
  })
}

function przeciagnij(i: number, e: PointerEvent) {
  const id = zaznaczenie.value
  if (!id || !rzut) return
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const gora = warstwa.value!.getBoundingClientRect().top
  const ruch = (m: PointerEvent) => {
    const u = uklad(id)
    const srodki = rozloz(wnetrze, u.grubosc, { liczba: u.polki, ...u }).srodkiPolek
    const min = u.grubosc + 50
    srodki[i] = Math.min((srodki[i + 1] ?? wnetrze) - min, Math.max((srodki[i - 1] ?? 0) + min, rzut!(m.clientY - gora)))
    zmienUklad(id, { rozklad: 'wlasne', wlasne: wlasnyZeSrodkow(wnetrze, u.grubosc, srodki) })
  }
  const koniec = () => {
    window.removeEventListener('pointermove', ruch)
    window.removeEventListener('pointerup', koniec)
  }
  window.addEventListener('pointermove', ruch)
  window.addEventListener('pointerup', koniec)
}

onMounted(() => (klatka = requestAnimationFrame(policz)))
onBeforeUnmount(() => cancelAnimationFrame(klatka))
</script>

<template>
  <div ref="warstwa" class="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
    <svg v-if="linie.length" class="absolute inset-0 size-full">
      <line v-for="(l, i) in linie" :key="i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" stroke="#0d99ff" stroke-width="1.5" stroke-dasharray="4 3" />
    </svg>
    <button
      v-for="(l, i) in linie"
      :key="'u' + i"
      type="button"
      :aria-label="`Move shelf ${i + 1}`"
      class="pointer-events-auto absolute h-2.5 w-7 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full bg-white shadow ring-2 ring-[#0d99ff]"
      :style="{ left: l.xm + 'px', top: l.ym + 'px' }"
      @pointerdown.prevent="przeciagnij(i, $event)"
    />
    <span
      v-for="(e, i) in etykiety"
      :key="'e' + i"
      class="absolute -translate-y-1/2 rounded-[3px] bg-[#0d99ff] px-1 text-[10px] font-medium leading-4 text-white"
      :style="{ left: e.x + 'px', top: e.y + 'px' }"
    >{{ e.tekst }}</span>
  </div>
</template>
