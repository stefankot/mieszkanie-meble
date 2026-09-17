<script setup lang="ts">
import { Download, FolderOpen, History, Redo2, Save, Undo2 } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { ref } from 'vue'

import { $historia, $wersje, $zapisSzkicu, cofnij, eksportujProjekt, importujProjekt, ponow, przywrocWersje, zapiszWersje } from '@/projekt/projekt'

/* Projekt (Figma „File”): szkic zapisywany automatycznie w przeglądarce, Cofnij/Ponów, wersje (warianty),
   plik projektu JSON (Open / Export). */
const historia = useStore($historia)
const wersje = useStore($wersje)
const zapis = useStore($zapisSzkicu)
const nazwaWersji = ref('')
const blad = ref('')
const plik = ref<HTMLInputElement | null>(null)

async function otworz(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  blad.value = ''
  try {
    await importujProjekt(f)
  } catch (err) {
    blad.value = err instanceof Error ? err.message : String(err)
  }
  ;(e.target as HTMLInputElement).value = ''
}
async function zapiszNazwana() {
  await zapiszWersje(nazwaWersji.value.trim() || `Version ${wersje.value.length + 1}`)
  nazwaWersji.value = ''
}
const STAN = { zapisano: 'Draft saved in this browser', zapisywanie: 'Saving draft…', blad: 'Draft could not be saved' }
const wiersz = 'flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left hover:bg-white/[0.04] disabled:opacity-40 disabled:hover:bg-transparent'
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-14 shrink-0 flex-col justify-center border-b border-[#2a2c31] px-4">
      <p class="text-[13px] font-semibold text-white">Mieszkanie</p>
      <p class="text-[11px]" :class="zapis === 'blad' ? 'text-[#ff8a80]' : 'text-[#a4a7ae]'">{{ STAN[zapis] }}</p>
    </div>
    <div class="flex flex-col gap-0.5 border-b border-[#2a2c31] p-2">
      <button type="button" :class="wiersz" :disabled="!historia.moznaCofnac" @click="cofnij">
        <Undo2 :size="15" :stroke-width="1.6" class="shrink-0 text-[#c9ccd2]" />
        <span class="min-w-0 flex-1"><span class="block text-[12px] text-white">Undo</span><span class="block truncate text-[10.5px] text-[#a4a7ae]">{{ historia.cofnij ?? 'Nothing to undo' }}</span></span>
        <kbd class="text-[10.5px] text-[#a4a7ae]">⌘Z</kbd>
      </button>
      <button type="button" :class="wiersz" :disabled="!historia.moznaPonowic" @click="ponow">
        <Redo2 :size="15" :stroke-width="1.6" class="shrink-0 text-[#c9ccd2]" />
        <span class="min-w-0 flex-1"><span class="block text-[12px] text-white">Redo</span><span class="block truncate text-[10.5px] text-[#a4a7ae]">{{ historia.ponow ?? 'Nothing to redo' }}</span></span>
        <kbd class="text-[10.5px] text-[#a4a7ae]">⇧⌘Z</kbd>
      </button>
    </div>
    <div class="flex flex-col gap-0.5 border-b border-[#2a2c31] p-2">
      <button type="button" :class="wiersz" @click="plik?.click()">
        <FolderOpen :size="15" :stroke-width="1.6" class="shrink-0 text-[#c9ccd2]" />
        <span class="min-w-0"><span class="block text-[12px] text-white">Open…</span><span class="block truncate text-[10.5px] text-[#a4a7ae]">Project file (.json)</span></span>
      </button>
      <input ref="plik" type="file" accept="application/json,.json" class="sr-only" @change="otworz" />
      <button type="button" :class="wiersz" @click="eksportujProjekt">
        <Download :size="15" :stroke-width="1.6" class="shrink-0 text-[#c9ccd2]" />
        <span class="min-w-0"><span class="block text-[12px] text-white">Export JSON</span><span class="block truncate text-[10.5px] text-[#a4a7ae]">Layouts, materials, lights and visibility</span></span>
      </button>
      <p v-if="blad" class="px-2.5 text-[10.5px] text-[#ff8a80]">{{ blad }}</p>
    </div>
    <div class="flex min-h-0 flex-1 flex-col p-2">
      <div class="flex items-center gap-2 px-2.5 pb-2 pt-1">
        <History :size="15" :stroke-width="1.6" class="text-[#c9ccd2]" />
        <span class="flex-1 text-[12px] font-medium text-white">Version history</span>
      </div>
      <form class="flex gap-1 px-2.5 pb-2" @submit.prevent="zapiszNazwana">
        <input v-model="nazwaWersji" placeholder="Name this version" aria-label="Version name" class="h-7 min-w-0 flex-1 rounded-[6px] bg-[#2c2e34] px-2 text-[11px] text-white outline-none placeholder:text-[#7b7f87] focus:ring-1 focus:ring-[#0d99ff]" />
        <button type="submit" class="flex h-7 items-center gap-1 rounded-[6px] bg-[#0d99ff] px-2 text-[11px] font-medium text-white"><Save :size="12" /> Save</button>
      </form>
      <ul class="min-h-0 flex-1 overflow-y-auto">
        <li v-for="w in wersje" :key="w.id" class="group flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 hover:bg-white/[0.04]">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[12px] text-white">{{ w.nazwa }}</span>
            <span class="block text-[10.5px] text-[#a4a7ae]">{{ new Date(w.czas).toLocaleString() }}</span>
          </span>
          <button type="button" class="rounded-[5px] px-1.5 py-0.5 text-[11px] text-[#c9ccd2] opacity-0 hover:bg-white/5 hover:text-white group-hover:opacity-100 focus:opacity-100" @click="przywrocWersje(w.id)">Restore</button>
        </li>
        <li v-if="!wersje.length" class="px-2.5 py-1 text-[11px] text-[#a4a7ae]">No saved versions yet.</li>
      </ul>
    </div>
  </div>
</template>
