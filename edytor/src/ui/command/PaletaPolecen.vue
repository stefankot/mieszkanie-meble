<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import Fuse from 'fuse.js'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, ListboxContent, ListboxGroup, ListboxGroupLabel, ListboxItem, ListboxRoot } from 'reka-ui'
import { computed, ref } from 'vue'

import { lista, wykonaj, zDanymiDomyslnymi } from '@/ops/rejestr'
import '@/ops/operacje'
import { $paletaPolecenOtwarta } from '@/stan'

/* ⌘K (wzór Spline/openpencil): operacje z rejestru — te same, które wywołuje AI.
   Wykonujemy te, które mają komplet danych (zaznaczenie, bieżący widok); pozostałe wymagają
   argumentów i są dostępne dla agenta. Reka Listbox (klawiatura) + fuse.js (szukanie rozmyte). */
const otwarta = useStore($paletaPolecenOtwarta)
const zapytanie = ref('')
const fuse = new Fuse(lista(), { keys: ['tytul', 'nazwa', 'grupa'], threshold: 0.4 })
const grupy = computed(() => {
  const wyniki = zapytanie.value ? fuse.search(zapytanie.value).map((r) => r.item) : lista()
  const mapa = new Map<string, typeof wyniki>()
  for (const op of wyniki) mapa.set(op.grupa, [...(mapa.get(op.grupa) ?? []), op])
  return [...mapa]
})
const blad = ref('')
function wybierz(nazwa: unknown) {
  const op = lista().find((x) => x.nazwa === nazwa)
  const dane = op && zDanymiDomyslnymi(op)
  if (!op || !dane) {
    blad.value = op ? `„${op.tytul}” wymaga argumentów — poproś agenta w panelu po lewej.` : ''
    return
  }
  $paletaPolecenOtwarta.set(false)
  zapytanie.value = ''
  blad.value = ''
  try {
    const wynik = wykonaj(op.nazwa, dane)
    if (wynik instanceof Promise) wynik.catch((e) => console.warn('[operacja]', op.nazwa, e))
  } catch (e) {
    blad.value = e instanceof Error ? e.message : String(e)
  }
}
const gotowa = (nazwa: string) => {
  const op = lista().find((x) => x.nazwa === nazwa)
  return !!(op && zDanymiDomyslnymi(op))
}
</script>

<template>
  <DialogRoot :open="otwarta" @update:open="$paletaPolecenOtwarta.set($event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/40" />
      <DialogContent class="fixed left-1/2 top-[14%] z-50 w-[min(520px,90vw)] -translate-x-1/2 overflow-hidden rounded-[4px] bg-panel-2 shadow-2xl ring-1 ring-black/50 outline-none">
        <DialogTitle class="sr-only">Commands</DialogTitle>
        <ListboxRoot @update:model-value="wybierz">
          <input v-model="zapytanie" autofocus class="h-9 w-full border-b border-line bg-transparent px-3 text-[12px] text-text outline-none placeholder:text-faint" placeholder="Search commands…" />
          <ListboxContent class="max-h-80 overflow-y-auto p-1">
            <ListboxGroup v-for="[grupa, ops] in grupy" :key="grupa">
              <ListboxGroupLabel class="px-2 pb-0.5 pt-1.5 text-2xs text-muted">{{ grupa }}</ListboxGroupLabel>
              <ListboxItem v-for="op in ops" :key="op.nazwa" :value="op.nazwa" class="flex h-[26px] items-center gap-2 rounded-d5 px-2 text-xs text-text outline-none data-[highlighted]:bg-accent data-[highlighted]:text-white">
                <span class="flex-1 truncate" :class="gotowa(op.nazwa) ? '' : 'opacity-60'">{{ op.tytul }}</span>
                <span v-if="!gotowa(op.nazwa)" class="text-2xs text-muted">args</span>
                <code class="font-mono text-2xs opacity-60">{{ op.nazwa }}</code>
              </ListboxItem>
            </ListboxGroup>
            <p v-if="!grupy.length" class="p-3 text-center text-xs text-muted">No commands.</p>
            <p v-if="blad" class="px-3 pb-2 pt-1 text-2xs text-[#ff8a80]">{{ blad }}</p>
          </ListboxContent>
        </ListboxRoot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
