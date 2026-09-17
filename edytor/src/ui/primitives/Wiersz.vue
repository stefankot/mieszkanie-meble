<script setup lang="ts">
/* D5: wiersz z etykietą po lewej i kontrolką po prawej (UV: Stretch/Offset/Rotate, przełączniki). */
defineProps<{ etykieta: string; ikona?: object }>()
</script>

<template>
  <div class="flex min-h-[22px] items-center gap-1.5">
    <component :is="ikona" v-if="ikona" :size="12" :stroke-width="1.75" class="shrink-0 text-muted" />
    <span class="min-w-0 flex-1 truncate text-xs text-label">{{ etykieta }}</span>
    <slot />
  </div>
</template>
