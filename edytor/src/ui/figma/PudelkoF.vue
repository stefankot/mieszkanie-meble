<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

/* Figma UI3: checkbox 16 px z etykietą 12 px (Clip content). */
defineProps<{ etykieta: string }>()
const zaznaczony = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="flex h-8 items-center gap-2.5 text-[12px] text-white">
    <CheckboxRoot v-model="zaznaczony" class="flex size-4 shrink-0 items-center justify-center rounded-[4px] ring-1 ring-inset ring-[#62656c] outline-none data-[state=checked]:bg-[#0d99ff] data-[state=checked]:ring-[#0d99ff]">
      <CheckboxIndicator><Check :size="12" :stroke-width="3" class="text-white" /></CheckboxIndicator>
    </CheckboxRoot>
    {{ etykieta }}
  </label>
</template>
