<script setup lang="ts">
/* Figma UI3: etykieta 11 px nad wierszem kontrolek. Domyślna siatka: dwie kolumny + ikona 24 px (jak Position X/Y). */
withDefaults(defineProps<{ etykieta?: string; kolumny?: string }>(), { kolumny: 'grid-cols-[1fr_1fr_24px]' })
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <span v-if="etykieta" class="flex h-4 items-center text-[11px] text-[#a4a7ae]">{{ etykieta }}</span>
    <div class="grid items-center gap-2" :class="kolumny"><slot /></div>
  </div>
</template>
