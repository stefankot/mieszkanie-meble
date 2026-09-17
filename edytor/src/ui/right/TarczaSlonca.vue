<script setup lang="ts">
import { computed } from 'vue'

/* D5 Geo and Sky: tarcza ~140 px, godzina ~20 px pod nią; okrągła tarcza z ciemną kopułą, uchwyt słońca na obwodzie, godzina pod spodem. */
const godzina = defineModel<number>({ required: true })
const kat = computed(() => ((godzina.value - 6) / 24) * Math.PI * 2)
const x = computed(() => 60 + Math.cos(kat.value) * 52)
const y = computed(() => 60 + Math.sin(kat.value) * 52)
const napis = computed(() => `${String(Math.floor(godzina.value)).padStart(2, '0')}:${String(Math.round((godzina.value % 1) * 60)).padStart(2, '0')}`)
</script>

<template>
  <div class="flex flex-col items-center gap-1.5 py-1">
    <svg viewBox="0 0 120 120" class="w-[140px]" aria-label="Sun position">
      <defs>
        <radialGradient id="kopula-d5" cx="45%" cy="30%" r="70%">
          <stop offset="0" stop-color="#6b6e75" /><stop offset=".55" stop-color="#2e3036" /><stop offset="1" stop-color="#15161a" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="#8d9199" stroke-width="1" />
      <path d="M22 62 A38 34 0 0 1 98 62 Z" fill="url(#kopula-d5)" />
      <ellipse cx="60" cy="64" rx="40" ry="10" fill="#1d1f23" stroke="#3a3d44" />
      <line x1="60" y1="62" :x2="x" :y2="y" stroke="#9aa0a8" stroke-width=".7" />
      <circle :cx="x" :cy="y" r="6" fill="#1b1d22" stroke="#e4e6ea" stroke-width="1.2" />
      <circle :cx="x" :cy="y" r="2.2" fill="#e4e6ea" />
    </svg>
    <span class="text-[13px] font-medium tabular-nums text-text">{{ napis }}</span>
  </div>
</template>
