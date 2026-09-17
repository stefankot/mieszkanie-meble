<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

/* D5: kwadratowy checkbox 11 px przy prawej krawędzi (Volume Light — niebieski, Intensity Follows Skylight — szary). */
const zaznaczony = defineModel<boolean>({ default: false })
</script>

<template>
  <CheckboxRoot v-model="zaznaczony" class="flex size-[11px] shrink-0 items-center justify-center rounded-[2px] bg-[#3a3d44] outline-none data-[state=checked]:bg-accent">
    <CheckboxIndicator><Check :size="9" :stroke-width="3" class="text-white" /></CheckboxIndicator>
  </CheckboxRoot>
</template>
