<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

/* Przełącznik po prawej stronie wiersza (D5: Fog / Wind / Emissive). */
const wlaczony = defineModel<boolean>({ default: false })
</script>

<template>
  <SwitchRoot v-model="wlaczony" class="ml-auto flex h-3.5 w-6 shrink-0 items-center rounded-full bg-field px-0.5 transition-colors data-[state=checked]:bg-accent">
    <SwitchThumb class="size-2.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-2.5 data-[state=checked]:bg-white" />
  </SwitchRoot>
</template>
