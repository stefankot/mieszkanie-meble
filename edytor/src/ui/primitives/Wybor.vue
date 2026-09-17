<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { SelectContent, SelectItem, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui'

/* Lista rozwijana dla dłuższych wyborów (D5: Material Template, Color Space). */
defineProps<{ opcje: { wartosc: string; etykieta: string }[] }>()
const wybrana = defineModel<string>({ required: true })
</script>

<template>
  <SelectRoot v-model="wybrana">
    <SelectTrigger class="flex h-6 min-w-0 flex-1 items-center justify-between gap-1 rounded-[5px] bg-field px-2 text-xs text-text outline-none">
      <SelectValue class="truncate" />
      <ChevronDown :size="12" class="shrink-0 text-faint" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="4" class="z-50 min-w-[var(--reka-select-trigger-width)] rounded-md border border-line bg-panel-2 p-1 shadow-xl">
        <SelectViewport>
          <SelectItem
            v-for="o in opcje"
            :key="o.wartosc"
            :value="o.wartosc"
            class="flex h-6 items-center rounded px-2 text-xs text-text outline-none data-[highlighted]:bg-accent"
          >
            <SelectItemText>{{ o.etykieta }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
