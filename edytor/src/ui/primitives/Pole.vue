<script setup lang="ts">
/* D5: etykieta NAD kontrolką. Etykieta 14 px + odstęp 6 + pole 21 + odstęp 6 w sekcji = skok ~48 px
   (D5: etykieta→środek pola 25, skok grupy 50 px przy oknie 1920). Slot `akcja` = ikona obok etykiety. */
defineProps<{ etykieta: string }>()
</script>

<template>
  <div class="flex flex-col gap-(--odstep)">
    <div class="flex h-(--etykieta) items-center justify-between">
      <span class="truncate text-xs leading-none text-label">{{ etykieta }}</span>
      <slot name="akcja" />
    </div>
    <div class="flex min-w-0 items-center gap-1"><slot /></div>
  </div>
</template>
