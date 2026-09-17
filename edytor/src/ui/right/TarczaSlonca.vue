<script setup lang="ts">
import { computed } from 'vue'

/* D5 Geo and Sky: tarcza z pozycją słońca i godziną. Kąt poglądowy: 6:00 = wschód, 18:00 = zachód. */
const godzina = defineModel<number>({ required: true })
const kat = computed(() => ((godzina.value - 6) / 12) * Math.PI)
const x = computed(() => 60 - Math.cos(kat.value) * 46)
const y = computed(() => 64 - Math.sin(kat.value) * 38)
const napis = computed(() => `${String(Math.floor(godzina.value)).padStart(2, '0')}:${String(Math.round((godzina.value % 1) * 60)).padStart(2, '0')}`)
</script>

<template>
  <div class="flex flex-col items-center gap-1 py-1">
    <svg viewBox="0 0 120 84" class="w-40" aria-label="Pozycja słońca">
      <defs>
        <radialGradient id="kopula" cx="50%" cy="100%" r="80%">
          <stop offset="0" stop-color="#3a3f4a" /><stop offset="1" stop-color="#1c1c20" />
        </radialGradient>
      </defs>
      <path d="M8 64 A52 46 0 0 1 112 64 Z" fill="url(#kopula)" stroke="#34343a" />
      <ellipse cx="60" cy="64" rx="52" ry="9" fill="#18181b" stroke="#34343a" />
      <line x1="60" y1="64" :x2="x" :y2="y" stroke="#8b8b94" stroke-width="0.8" />
      <circle :cx="x" :cy="y" r="5" fill="#ffd27a" stroke="#fff4d6" stroke-width="1.2" />
    </svg>
    <span class="text-[13px] font-medium tabular-nums">{{ napis }}</span>
  </div>
</template>
