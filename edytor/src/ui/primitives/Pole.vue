<script setup lang="ts">
/* D5: etykieta NAD kontrolką („Sunlight Intensity” → pole). Slot `akcja` = ikona po prawej etykiety. */
defineProps<{ etykieta: string }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex h-4 items-center justify-between">
      <span class="truncate text-xs text-label">{{ etykieta }}</span>
      <slot name="akcja" />
    </div>
    <div class="flex min-w-0 items-center gap-1"><slot /></div>
  </div>
</template>
