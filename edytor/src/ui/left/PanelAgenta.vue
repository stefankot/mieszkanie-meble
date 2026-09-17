<script setup lang="ts">
import { ArrowUp, Mic, RotateCcw, Square } from '@lucide/vue'

/* Wzór Spline (Agent). Tekst i rozmowa głosowa (OpenAI Realtime) na tym samym rejestrze operacji;
   każda zmiana pokazuje operację i Undo. Dane przykładowe (treść poleceń po polsku — język użytkownika). */
const rozmowa = [
  { kto: 'ja', tekst: 'Zmień fronty regału w kuchni na kobalt z palety' },
  { kto: 'ai', tekst: 'Applied palette “Maple & cobalt” to role Front — 6 doors from one definition.', operacje: ['palette.apply · regal-kuchnia'] },
  { kto: 'ja', tekst: 'Przejdź do salonu i ustaw zimę, ósma rano', glos: true },
  { kto: 'ai', tekst: 'Walking to the living room through the hall and setting winter light 8:00.', operacje: ['camera.goToRoom · SALON', 'light.setTime · winter · 8'] }
]
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ol class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2">
      <li v-for="(m, i) in rozmowa" :key="i" :class="m.kto === 'ja' ? 'self-end' : ''" class="max-w-[94%]">
        <p v-if="m.kto === 'ja'" class="rounded-[4px] bg-field px-2 py-1.5 text-xs leading-snug text-text">
          <Mic v-if="m.glos" :size="10" class="mr-1 inline text-accent" />{{ m.tekst }}
        </p>
        <div v-else class="flex flex-col gap-1 text-xs leading-snug text-label">
          <p>{{ m.tekst }}</p>
          <div v-for="op in m.operacje" :key="op" class="flex items-center gap-1 rounded-d5 bg-[#16181c] px-1.5 py-1">
            <code class="min-w-0 flex-1 truncate font-mono text-[9.5px] text-muted">{{ op }}</code>
            <button type="button" aria-label="Undo" class="text-muted hover:text-white"><RotateCcw :size="10" /></button>
          </div>
        </div>
      </li>
    </ol>
    <div class="mx-1.5 mb-1 flex h-6 items-center gap-1.5 rounded-d5 bg-accent-soft px-1.5 text-[10px] text-[#9bb8ff]">
      <span class="flex h-2.5 items-end gap-[2px]"><i v-for="h in [4, 8, 10, 6, 9, 3]" :key="h" class="w-[2px] rounded bg-accent" :style="{ height: h + 'px' }" /></span>
      <span class="flex-1">Voice · listening</span>
      <button type="button" aria-label="End conversation"><Square :size="9" fill="currentColor" /></button>
    </div>
    <div class="m-1.5 mt-0 rounded-[4px] bg-field p-1.5">
      <textarea rows="2" class="w-full resize-none bg-transparent text-xs text-text outline-none placeholder:text-faint" placeholder="Describe a change or type / for commands" />
      <div class="flex items-center gap-1">
        <span class="truncate text-[9.5px] text-faint">OpenAI · realtime</span>
        <button type="button" class="ml-auto flex size-5 items-center justify-center rounded-full bg-accent text-white" aria-label="Voice"><Mic :size="11" /></button>
        <button type="button" class="flex size-5 items-center justify-center rounded-full bg-[#3a3d45] text-white" aria-label="Send"><ArrowUp :size="11" /></button>
      </div>
    </div>
  </div>
</template>
