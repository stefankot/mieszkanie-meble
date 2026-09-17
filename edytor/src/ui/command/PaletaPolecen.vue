<script setup lang="ts">
import { CommandPaletteRoot, type CommandPaletteGroup } from '@open-pencil/vue'
import { useStore } from '@nanostores/vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed } from 'vue'

import { lista, wykonaj } from '@/ops/rejestr'
import '@/ops/operacje'
import { $paletaPolecenOtwarta } from '@/stan'

/* ⌘K: lista operacji z rejestru (te same, które wywołuje AI). */
const otwarta = useStore($paletaPolecenOtwarta)
const grupy = computed<CommandPaletteGroup[]>(() => {
  const mapa = new Map<string, CommandPaletteGroup>()
  for (const op of lista()) {
    const g = mapa.get(op.grupa) ?? { id: op.grupa, label: op.grupa, items: [] }
    g.items.push({ id: op.nazwa, label: op.tytul, description: op.nazwa, keywords: [op.nazwa] })
    mapa.set(op.grupa, g)
  }
  return [...mapa.values()]
})
const etykiety = { searchPlaceholder: 'Szukaj poleceń…', searchLabel: 'Szukaj poleceń', paletteLabel: 'Paleta poleceń', empty: 'Brak poleceń.', back: 'Wstecz' }
function wybierz(e: { id: string }) {
  $paletaPolecenOtwarta.set(false)
  if (e.id === 'scene.describe') wykonaj(e.id, {})
}
</script>

<template>
  <DialogRoot :open="otwarta" @update:open="$paletaPolecenOtwarta.set($event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/40" />
      <DialogContent class="fixed left-1/2 top-[14%] z-50 w-[min(560px,90vw)] -translate-x-1/2 outline-none">
        <DialogTitle class="sr-only">Paleta poleceń</DialogTitle>
        <CommandPaletteRoot
          :groups="grupy"
          :labels="etykiety"
          :ui="{
            root: 'overflow-hidden rounded-xl border border-line bg-panel-2 text-text shadow-2xl',
            search: 'h-11 w-full border-b border-line bg-transparent px-4 text-[13px] outline-none placeholder:text-faint',
            content: 'max-h-80 overflow-y-auto p-1.5',
            label: 'px-2 pb-1 pt-2 text-2xs text-faint',
            item: 'flex h-8 items-center gap-2 rounded-md px-2 text-xs data-[highlighted]:bg-accent data-[highlighted]:text-white',
            itemLabel: 'flex-1 truncate',
            itemDescription: 'font-mono text-2xs opacity-60',
            empty: 'p-4 text-center text-xs text-faint'
          }"
          @select="wybierz"
        />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
