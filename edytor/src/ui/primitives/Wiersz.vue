<script setup lang="ts">
/* D5: etykieta po lewej, kontrolka po prawej. Bez ikony (checkbox, UV) wiersz 18 px (skok ~24);
   z ikoną (Sun, Fog, Wind, Precipitation) wiersz 28 px (skok ~34). */
defineProps<{ etykieta: string; ikona?: object }>()
</script>

<template>
  <div class="flex items-center gap-[7px]" :class="ikona ? 'h-(--wiersz-ikona)' : 'min-h-(--wiersz)'">
    <component :is="ikona" v-if="ikona" :size="12" :stroke-width="1.75" class="shrink-0 text-label" />
    <span class="min-w-0 flex-1 truncate text-xs leading-none text-label">{{ etykieta }}</span>
    <slot />
  </div>
</template>
