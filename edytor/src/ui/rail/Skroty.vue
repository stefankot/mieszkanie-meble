<script setup lang="ts">
/* Skróty klawiszowe (dawny pasek podpowiedzi D5 na dole sceny) — teraz w pomocy szyny. */
const skroty = [
  ['Drag', 'Look around'],
  ['Click', 'Go to point'],
  ['W S A D / ↑ ↓ ← →', 'Walk'],
  ['Q / E', 'Eye height'],
  ['F', 'Frame selection'],
  ['V · G · R', 'Select · Move · Rotate'],
  ['⌘ K', 'Commands'],
  ['⌘ Z / ⇧⌘ Z', 'Undo / Redo']
]
</script>

<template>
  <div class="w-60 rounded-[10px] bg-[#1e1f23] p-3 shadow-2xl ring-1 ring-black/50">
    <h3 class="mb-2 text-[12px] font-semibold text-white">Keyboard shortcuts</h3>
    <dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[11px]">
      <template v-for="[klawisz, opis] in skroty" :key="klawisz">
        <dt class="text-[#c9ccd2]">{{ opis }}</dt>
        <dd><kbd class="rounded-[4px] bg-[#2c2e34] px-1.5 py-0.5 font-sans text-[10.5px] text-white">{{ klawisz }}</kbd></dd>
      </template>
    </dl>
  </div>
</template>
