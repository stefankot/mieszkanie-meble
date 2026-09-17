<script setup lang="ts">
import { SegmentedControlItem, SegmentedControlRoot } from '@open-pencil/vue'
import type { Component } from 'vue'

/* Segmenty dla 2–4 krótkich opcji (D5: Geo and Sky / HDRI). */
defineProps<{ opcje: { wartosc: string; etykieta?: string; ikona?: Component }[] }>()
const wybrana = defineModel<string>({ required: true })
</script>

<template>
  <SegmentedControlRoot v-model="wybrana" class="flex h-6 flex-1 rounded-[5px] bg-field p-0.5">
    <SegmentedControlItem
      v-for="o in opcje"
      :key="o.wartosc"
      :value="o.wartosc"
      :title="o.etykieta"
      class="flex flex-1 items-center justify-center gap-1 rounded-[4px] px-1.5 text-2xs text-muted data-[state=on]:bg-hover data-[state=on]:text-text"
    >
      <component :is="o.ikona" v-if="o.ikona" :size="13" />
      <span v-if="o.etykieta && !o.ikona">{{ o.etykieta }}</span>
    </SegmentedControlItem>
  </SegmentedControlRoot>
</template>
