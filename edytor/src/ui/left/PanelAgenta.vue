<script setup lang="ts">
import { ArrowUp, Mic, RotateCcw, Square } from '@lucide/vue'

/* Wzór Spline (zakładka Agent). Rozmowa tekstowa i głosowa (OpenAI Realtime) na tym samym
   rejestrze operacji; każda zmiana pokazuje nazwę operacji i daje Cofnij. Dane przykładowe. */
const rozmowa = [
  { kto: 'ja', tekst: 'Zmień fronty regału w kuchni na kobalt z palety' },
  { kto: 'ai', tekst: 'Zastosowałem paletę „Klon i kobalt” do roli Front — 6 drzwiczek z jednej definicji.', operacje: ['palette.apply · regal-kuchnia · role'] },
  { kto: 'ja', tekst: 'Przejdź do salonu i ustaw zimę, ósma rano', glos: true },
  { kto: 'ai', tekst: 'Przechodzę do salonu przez przedpokój i ustawiam zimowe światło 8:00.', operacje: ['camera.goToRoom · SALON', 'light.setTime · zima · 8'] }
]
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ol class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <li v-for="(m, i) in rozmowa" :key="i" :class="m.kto === 'ja' ? 'self-end' : ''" class="max-w-[92%]">
        <p v-if="m.kto === 'ja'" class="rounded-lg bg-field px-2.5 py-1.5 text-xs text-text">
          <Mic v-if="m.glos" :size="11" class="mr-1 inline text-accent" />{{ m.tekst }}
        </p>
        <div v-else class="flex flex-col gap-1.5 text-xs leading-relaxed text-text/90">
          <p>{{ m.tekst }}</p>
          <div v-for="op in m.operacje" :key="op" class="flex items-center gap-1.5 rounded-md border border-line bg-panel-2 px-2 py-1">
            <code class="flex-1 truncate font-mono text-2xs text-muted">{{ op }}</code>
            <button type="button" class="flex items-center gap-1 text-2xs text-faint hover:text-text"><RotateCcw :size="11" /> Cofnij</button>
          </div>
        </div>
      </li>
    </ol>

    <div class="mx-2 mb-1.5 flex items-center gap-2 rounded-md bg-accent-soft px-2 py-1.5 text-2xs text-accent">
      <span class="flex h-3 items-end gap-[2px]">
        <i v-for="h in [5, 9, 12, 7, 10, 4]" :key="h" class="w-[2px] rounded bg-accent" :style="{ height: h + 'px' }" />
      </span>
      <span class="flex-1">Rozmowa głosowa · słucham</span>
      <button type="button" class="flex items-center gap-1 text-accent" aria-label="Zakończ rozmowę"><Square :size="10" fill="currentColor" /></button>
    </div>

    <div class="m-2 mt-0 rounded-lg border border-line bg-panel-2 p-2">
      <textarea rows="2" class="w-full resize-none bg-transparent text-xs text-text outline-none placeholder:text-faint" placeholder="Opisz zmianę lub wpisz / dla poleceń" />
      <div class="flex items-center gap-1">
        <span class="text-2xs text-faint">OpenAI · gpt-realtime</span>
        <button type="button" class="ml-auto flex size-6 items-center justify-center rounded-full bg-accent text-white" aria-label="Rozmowa głosowa"><Mic :size="13" /></button>
        <button type="button" class="flex size-6 items-center justify-center rounded-full bg-field text-muted" aria-label="Wyślij"><ArrowUp :size="13" /></button>
      </div>
    </div>
  </div>
</template>
