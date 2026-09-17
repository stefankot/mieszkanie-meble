<script setup lang="ts">
import { computed, ref } from 'vue'

/* Kierunek strumienia na tarczy: środek = pionowo w dół, krawędź = 90° pochylenia; kąt wokół środka = azymut
   (0° = oś X sceny, zgodnie z mapą). Przeciąganie uchwytu lub strzałki klawiatury (←→ azymut, ↑↓ pochylenie). */
const pochylenie = defineModel<number>('pochylenie', { required: true })
const azymut = defineModel<number>('azymut', { required: true })
const emit = defineEmits<{ koniec: [] }>()
const R = 44
const tarcza = ref<SVGSVGElement | null>(null)
const uchwyt = computed(() => {
  const r = (Math.min(90, pochylenie.value) / 90) * R
  const a = (azymut.value * Math.PI) / 180
  return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r }
})

function zPunktu(e: PointerEvent) {
  const b = tarcza.value!.getBoundingClientRect()
  const x = ((e.clientX - b.left) / b.width) * 100 - 50
  const y = ((e.clientY - b.top) / b.height) * 100 - 50
  pochylenie.value = Math.round(Math.min(1, Math.hypot(x, y) / R) * 90)
  azymut.value = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}
function start(e: PointerEvent) {
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  zPunktu(e)
}
function klawisz(e: KeyboardEvent) {
  const krok = e.shiftKey ? 15 : 5
  if (e.key === 'ArrowLeft') azymut.value = (azymut.value + 360 - krok) % 360
  else if (e.key === 'ArrowRight') azymut.value = (azymut.value + krok) % 360
  else if (e.key === 'ArrowUp') pochylenie.value = Math.min(90, pochylenie.value + krok)
  else if (e.key === 'ArrowDown') pochylenie.value = Math.max(0, pochylenie.value - krok)
  else return
  e.preventDefault()
  emit('koniec')
}
</script>

<template>
  <div class="flex items-center gap-3">
    <svg
      ref="tarcza"
      viewBox="0 0 100 100"
      class="size-[84px] shrink-0 cursor-crosshair touch-none rounded-full outline-none focus-visible:ring-1 focus-visible:ring-[#0d99ff]"
      role="slider"
      tabindex="0"
      :aria-label="`Beam direction: tilt ${pochylenie}°, azimuth ${azymut}°`"
      :aria-valuenow="pochylenie"
      @pointerdown="start"
      @pointermove="(e) => e.buttons && zPunktu(e)"
      @pointerup="emit('koniec')"
      @keydown="klawisz"
    >
      <circle cx="50" cy="50" r="48" fill="#1f2126" stroke="#34363c" />
      <circle cx="50" cy="50" r="29" fill="none" stroke="#2c2e34" stroke-dasharray="2 3" />
      <circle cx="50" cy="50" r="14.5" fill="none" stroke="#2c2e34" stroke-dasharray="2 3" />
      <line x1="50" y1="4" x2="50" y2="96" stroke="#2c2e34" />
      <line x1="4" y1="50" x2="96" y2="50" stroke="#2c2e34" />
      <line x1="50" y1="50" :x2="uchwyt.x" :y2="uchwyt.y" stroke="#ffc582" stroke-width="1.5" />
      <circle cx="50" cy="50" r="2.5" fill="#6b6f77" />
      <circle :cx="uchwyt.x" :cy="uchwyt.y" r="6" fill="#ffc582" stroke="#fff" stroke-width="1.5" />
    </svg>
    <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px]">
      <dt class="text-label">Tilt</dt>
      <dd class="tabular-nums text-text">{{ pochylenie }}°</dd>
      <dt class="text-label">Azimuth</dt>
      <dd class="tabular-nums text-text">{{ azymut }}°</dd>
      <dt class="col-span-2 mt-1 text-[9.5px] leading-tight text-muted">Center points straight down</dt>
    </dl>
  </div>
</template>
