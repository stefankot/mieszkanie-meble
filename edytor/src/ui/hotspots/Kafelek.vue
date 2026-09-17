<script setup lang="ts">
import type { Component } from 'vue'

/* D5 All Variable Sets: opcja jako kwadratowa miniatura z podpisem; wybrana — jasna ramka i pogrubiony podpis. */
defineProps<{ etykieta: string; wybrany?: boolean; ikona?: Component; kolory?: string[]; tlo?: string }>()
defineEmits<{ wybierz: [] }>()
</script>

<template>
  <button type="button" class="flex w-[46px] flex-col items-center gap-1 outline-none" @click="$emit('wybierz')">
    <span
      class="flex size-[46px] items-center justify-center overflow-hidden rounded-d5 bg-[#2a2c31] text-[#c3c6cc]"
      :class="wybrany ? 'ring-2 ring-[#dfe6ff] ring-offset-1 ring-offset-[#2f6bff]' : 'ring-1 ring-white/5'"
      :style="tlo ? { background: tlo } : undefined"
    >
      <component :is="ikona" v-if="ikona" :size="20" :stroke-width="1.5" />
      <span v-else-if="kolory" class="flex size-full"><i v-for="c in kolory" :key="c" class="flex-1" :style="{ background: c }" /></span>
    </span>
    <span class="w-full truncate text-center text-[9.5px]" :class="wybrany ? 'font-semibold text-white' : 'text-muted'">{{ etykieta }}</span>
  </button>
</template>
