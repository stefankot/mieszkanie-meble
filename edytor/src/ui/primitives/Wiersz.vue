<script setup lang="ts">
/* Wiersz właściwości: etykieta po lewej, kontrolka po prawej (D5 Inspector). */
defineProps<{ etykieta: string; pionowo?: boolean }>()
</script>

<template>
  <div :class="pionowo ? 'flex flex-col gap-1 py-0.5' : 'grid min-h-7 grid-cols-[84px_1fr] items-center gap-2'">
    <span class="truncate text-xs text-muted">{{ etykieta }}</span>
    <div class="flex min-w-0 items-center gap-1"><slot /></div>
  </div>
</template>
