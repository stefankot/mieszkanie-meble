<script setup lang="ts">
import { Camera, Download, File, LibraryBig, Lightbulb, Menu, Palette, Redo2, Route, Search, Sofa, Sparkles, Undo2 } from '@lucide/vue'
import { useStore } from '@nanostores/vue'

import { $bibliotekaOtwarta, $paletaPolecenOtwarta, $trybPrawejKolumny } from '@/stan'
import PrzyciskIkona from '@/ui/primitives/PrzyciskIkona.vue'

/* Układ D5: lewo — menu, plik, Biblioteka; środek — narzędzia sceny; prawo — wyjście (zdjęcie, eksport). */
const biblioteka = useStore($bibliotekaOtwarta)
const tryb = useStore($trybPrawejKolumny)
</script>

<template>
  <header class="relative flex h-10 items-center border-b border-line bg-panel px-1.5">
    <div class="flex items-center gap-0.5">
      <PrzyciskIkona :ikona="Menu" opis="Menu" />
      <PrzyciskIkona :ikona="File" opis="Projekt: zapisz, otwórz, eksport JSON" />
      <button
        type="button"
        class="ml-1 flex h-7 items-center gap-1.5 rounded-full px-3 text-xs"
        :class="biblioteka ? 'bg-accent text-white' : 'bg-field text-text hover:bg-hover'"
        @click="$bibliotekaOtwarta.set(!biblioteka)"
      >
        <LibraryBig :size="14" :stroke-width="1.75" /> Biblioteka
      </button>
      <div class="mx-2 h-4 w-px bg-line" />
      <PrzyciskIkona :ikona="Undo2" opis="Cofnij (⌘Z)" />
      <PrzyciskIkona :ikona="Redo2" opis="Ponów (⇧⌘Z)" />
    </div>

    <div class="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
      <PrzyciskIkona :ikona="Lightbulb" opis="Dodaj światło" />
      <PrzyciskIkona :ikona="Sofa" opis="Wstaw mebel z biblioteki" />
      <PrzyciskIkona :ikona="Palette" opis="Paleta kolorów na zaznaczeniu" />
      <PrzyciskIkona :ikona="Route" opis="Przejdź do punktu (omija ściany)" />
    </div>

    <div class="ml-auto flex items-center gap-0.5">
      <button
        type="button"
        class="mr-1 flex h-7 w-48 items-center gap-2 whitespace-nowrap rounded-md bg-field px-2 text-xs text-faint hover:bg-hover"
        @click="$paletaPolecenOtwarta.set(true)"
      >
        <Search :size="13" /> <span class="flex-1 text-left">Szukaj poleceń</span>
        <kbd class="rounded bg-panel px-1 font-sans text-2xs">⌘K</kbd>
      </button>
      <PrzyciskIkona :ikona="Camera" opis="Zdjęcie — tryb renderu" :aktywny="tryb === 'zdjecie'" @click="$trybPrawejKolumny.set(tryb === 'zdjecie' ? 'edycja' : 'zdjecie')" />
      <PrzyciskIkona :ikona="Sparkles" opis="Render AI" @click="$trybPrawejKolumny.set('zdjecie')" />
      <PrzyciskIkona :ikona="Download" opis="Eksport projektu (JSON)" />
    </div>
  </header>
</template>
