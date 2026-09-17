<script setup lang="ts">
/* D5 3.x: na dole sceny szary „klawisz” (np. „Scroll + RMB”) i obok opis bez tła („Adjust Movement Speed”). */
const skroty = [
  ['Drag', 'Look Around'],
  ['Click', 'Go to Point'],
  ['WSAD / ↑↓←→', 'Walk'],
  ['Q / E', 'Eye Height'],
  ['F', 'Frame Selection'],
  ['⌘K', 'Commands']
]
</script>

<template>
  <div class="pointer-events-none absolute bottom-2.5 left-2.5 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
    <span v-for="[klawisz, opis] in skroty" :key="klawisz" class="flex h-4 items-center gap-1.5">
      <b class="flex h-4 items-center rounded-[2px] bg-[#5c5f65]/85 px-1.5 font-normal text-[#e6e8eb]">{{ klawisz }}</b>
      <span class="text-[#eceef1] [text-shadow:0_1px_2px_rgba(0,0,0,.7)]">{{ opis }}</span>
    </span>
  </div>
</template>
