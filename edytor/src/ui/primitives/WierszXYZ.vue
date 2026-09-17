<script setup lang="ts">
import { Link2 } from '@lucide/vue'

import PoleLiczby from './PoleLiczby.vue'

/* D5 Basic: etykieta nad trzema polami X/Y/Z; opcjonalna kłódka proporcji (Size). */
defineProps<{ etykieta: string; lancuch?: boolean }>()
const xyz = defineModel<[number, number, number]>({ required: true })
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex h-4 items-center gap-1 text-xs text-label">{{ etykieta }}<Link2 v-if="lancuch" :size="11" class="text-muted" /></div>
    <div class="grid grid-cols-3 gap-1">
      <PoleLiczby v-model="xyz[0]" os="X" />
      <PoleLiczby v-model="xyz[1]" os="Y" />
      <PoleLiczby v-model="xyz[2]" os="Z" />
    </div>
  </div>
</template>
