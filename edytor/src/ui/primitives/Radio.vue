<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'

/* D5 Direction: „◯ Follow HDRI / ◉ Custom” — każda opcja w osobnym wierszu na tle pola. */
defineProps<{ opcje: { wartosc: string; etykieta: string }[] }>()
const wybrana = defineModel<string>({ required: true })
</script>

<template>
  <RadioGroupRoot v-model="wybrana" class="flex flex-col gap-1">
    <label v-for="o in opcje" :key="o.wartosc" class="flex h-[26px] items-center gap-2 rounded-d5 bg-[#202227] px-2 text-xs text-text">
      <RadioGroupItem :value="o.wartosc" class="flex size-3 items-center justify-center rounded-full ring-1 ring-[#8d9199] outline-none data-[state=checked]:ring-accent">
        <RadioGroupIndicator class="size-[6px] rounded-full bg-accent" />
      </RadioGroupItem>
      {{ o.etykieta }}
    </label>
  </RadioGroupRoot>
</template>
