<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

/* D5: mały przełącznik 20×11; wyłączony = biała kropka na ciemnym torze, włączony = niebieski tor. */
const wlaczony = defineModel<boolean>({ default: false })
</script>

<template>
  <SwitchRoot v-model="wlaczony" class="flex h-[11px] w-5 shrink-0 items-center rounded-full bg-[#15171b] px-[2px] outline-none data-[state=checked]:bg-accent">
    <SwitchThumb class="size-[7px] rounded-full bg-white transition-transform data-[state=checked]:translate-x-[9px]" />
  </SwitchRoot>
</template>
