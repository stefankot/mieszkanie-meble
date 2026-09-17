<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'

/* D5: segmenty („Geo and Sky | HDRI”, „Base Color | Base Color Map”) — ciemny tor, aktywny jaśniejszy. */
defineProps<{ opcje: { wartosc: string; etykieta: string }[] }>()
const wybrana = defineModel<string>({ required: true })
function ustaw(v: unknown) {
  if (typeof v === 'string' && v) wybrana.value = v
}
</script>

<template>
  <ToggleGroupRoot type="single" :model-value="wybrana" class="flex h-[22px] flex-1 rounded-d5 bg-[#16181c] p-[2px]" @update:model-value="ustaw">
    <ToggleGroupItem
      v-for="o in opcje"
      :key="o.wartosc"
      :value="o.wartosc"
      class="flex-1 truncate rounded-[2px] px-1 text-2xs text-muted outline-none data-[state=on]:bg-field data-[state=on]:text-text"
    >
      {{ o.etykieta }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
