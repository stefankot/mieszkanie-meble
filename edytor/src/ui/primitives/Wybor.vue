<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui'

/* D5: lista rozwijana („All”, Material Template, Color Space) — 22 px, tekst 10 px od lewej, chevron przy prawej krawędzi. */
defineProps<{ opcje: { wartosc: string; etykieta: string }[] }>()
const wybrana = defineModel<string>({ required: true })
</script>

<template>
  <SelectRoot v-model="wybrana">
    <SelectTrigger class="flex h-(--wys-listy) min-w-0 flex-1 items-center justify-between gap-1 rounded-d5 bg-field pl-2.5 pr-1.5 text-xs text-text outline-none">
      <SelectValue class="truncate" />
      <ChevronDown :size="11" class="shrink-0 text-muted" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="2" class="z-[70] min-w-[var(--reka-select-trigger-width)] rounded-d5 bg-panel-2 p-1 shadow-2xl ring-1 ring-black/40">
        <SelectViewport>
          <SelectItem v-for="o in opcje" :key="o.wartosc" :value="o.wartosc" class="flex h-6 items-center gap-2 rounded-[2px] px-2.5 text-xs text-text outline-none data-[highlighted]:bg-accent">
            <SelectItemText class="flex-1">{{ o.etykieta }}</SelectItemText>
            <SelectItemIndicator><Check :size="11" /></SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
