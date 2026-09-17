<script setup lang="ts">
/* D5: pasek podpowiedzi skrótów na dole sceny („Scroll + RMB  Adjust Movement Speed”). */
const skroty = [
  ['Drag', 'Look around'],
  ['Click', 'Go to point'],
  ['WSAD / ↑↓←→', 'Walk'],
  ['Q / E', 'Eye height'],
  ['F', 'Frame selection'],
  ['⌘K', 'Commands']
]
</script>

<template>
  <div class="pointer-events-none absolute bottom-1.5 left-1.5 z-20 flex flex-wrap gap-1 text-[10px]">
    <span v-for="[klawisz, opis] in skroty" :key="klawisz" class="flex h-4 items-center overflow-hidden rounded-[2px] bg-[#1b1d22]/80">
      <b class="bg-white/10 px-1.5 font-normal text-[#d6d9de]">{{ klawisz }}</b>
      <span class="px-1.5 text-[#a9adb5]">{{ opis }}</span>
    </span>
  </div>
</template>
