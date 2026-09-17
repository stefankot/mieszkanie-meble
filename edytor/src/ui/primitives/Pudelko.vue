<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

/* D5: kwadratowy checkbox po prawej stronie wiersza (Volume Light, Cast Shadow). */
const zaznaczony = defineModel<boolean>({ default: false })
</script>

<template>
  <CheckboxRoot v-model="zaznaczony" class="flex size-3 shrink-0 items-center justify-center rounded-[2px] bg-[#15171b] ring-1 ring-[#3a3d45] outline-none data-[state=checked]:bg-accent data-[state=checked]:ring-accent">
    <CheckboxIndicator><Check :size="9" :stroke-width="3" class="text-white" /></CheckboxIndicator>
  </CheckboxRoot>
</template>
