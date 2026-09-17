<script setup lang="ts">
import { Download, FolderOpen, History, Save } from '@lucide/vue'

/* Projekt (Figma „File”): zapis lokalny, otwarcie, eksport JSON, historia wersji. Makieta — bez działania. */
const akcje = [
  { nazwa: 'Save', opis: 'Save to this browser', ikona: Save },
  { nazwa: 'Open…', opis: 'Open a project file', ikona: FolderOpen },
  { nazwa: 'Export JSON', opis: 'Project with furniture layouts and palettes', ikona: Download },
  { nazwa: 'Version history', opis: 'Named variants and furniture versions', ikona: History }
]
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-14 shrink-0 flex-col justify-center border-b border-[#2a2c31] px-4">
      <p class="text-[13px] font-semibold text-white">Mieszkanie</p>
      <p class="text-[11px] text-[#a4a7ae]">GitHub · stefankot/mieszkanie-meble</p>
    </div>
    <ul class="flex flex-col gap-0.5 p-2">
      <li v-for="a in akcje" :key="a.nazwa">
        <button type="button" class="flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left hover:bg-white/[0.04]">
          <component :is="a.ikona" :size="15" :stroke-width="1.6" class="shrink-0 text-[#c9ccd2]" />
          <span class="min-w-0">
            <span class="block text-[12px] text-white">{{ a.nazwa }}</span>
            <span class="block truncate text-[10.5px] text-[#a4a7ae]">{{ a.opis }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
