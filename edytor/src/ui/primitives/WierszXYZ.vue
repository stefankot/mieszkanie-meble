<script setup lang="ts">
import { Link2 } from '@lucide/vue'

import PoleLiczby from './PoleLiczby.vue'

/* D5 Basic: etykieta nad trzema polami X/Y/Z (skok grupy jak Pole); opcjonalny łańcuch proporcji (Size). */
defineProps<{ etykieta: string; lancuch?: boolean }>()
const xyz = defineModel<[number, number, number]>({ required: true })
</script>

<template>
  <div class="flex flex-col gap-(--odstep)">
    <div class="flex h-(--etykieta) items-center gap-1 text-xs leading-none text-label">{{ etykieta }}<Link2 v-if="lancuch" :size="11" class="text-muted" /></div>
    <div class="grid grid-cols-3 gap-[3px]">
      <PoleLiczby v-model="xyz[0]" os="X" />
      <PoleLiczby v-model="xyz[1]" os="Y" />
      <PoleLiczby v-model="xyz[2]" os="Z" />
    </div>
  </div>
</template>
