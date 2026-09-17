<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui'
import type { Component } from 'vue'

/* Figma UI3: lista 24 px (właściwości komponentu, „W 501 ⌄”). */
defineProps<{ opcje: { wartosc: string; etykieta: string }[]; prefiks?: string | Component }>()
const wybrana = defineModel<string>({ required: true })
</script>

<template>
  <SelectRoot v-model="wybrana">
    <SelectTrigger class="flex h-6 min-w-0 items-center gap-1 rounded-[5px] bg-[#2c2e34] pr-1.5 text-[11px] text-white outline-none hover:ring-1 hover:ring-[#3d4047]" :class="prefiks ? '' : 'pl-2'">
      <span v-if="prefiks" class="flex w-6 shrink-0 justify-center text-[#a4a7ae]">
        <component :is="prefiks" v-if="typeof prefiks !== 'string'" :size="13" :stroke-width="1.75" /><template v-else>{{ prefiks }}</template>
      </span>
      <SelectValue class="min-w-0 flex-1 truncate text-left" />
      <ChevronDown :size="12" class="shrink-0 text-[#c9ccd2]" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="3" class="z-[70] min-w-[var(--reka-select-trigger-width)] rounded-[6px] bg-[#1e1f23] p-1 shadow-2xl ring-1 ring-black/50">
        <SelectViewport>
          <SelectItem v-for="o in opcje" :key="o.wartosc" :value="o.wartosc" class="flex h-6 items-center gap-2 rounded-[4px] px-2 text-[11px] text-white outline-none data-[highlighted]:bg-[#0d99ff]">
            <SelectItemIndicator class="w-3"><Check :size="11" /></SelectItemIndicator>
            <SelectItemText>{{ o.etykieta }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
