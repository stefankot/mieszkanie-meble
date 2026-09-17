<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, ref } from 'vue'

import { presetyMaterialow, type UstawieniaMaterialu } from '@/meble/material'

import KulkaMaterialu from './KulkaMaterialu.vue'

/* Libraries: presety jako kulki (D5 Material Library), wyszukiwanie po nazwie. */
defineProps<{ aktualny: string; zrodlo?: unknown }>()
const emit = defineEmits<{ wybierz: [UstawieniaMaterialu] }>()
const szukaj = ref('')
const RODZAJ = { solid: 'Solid', texture: 'Texture', pattern: 'Pattern' } as const
const lista = computed(() => presetyMaterialow.filter((p) => p.nazwa.toLowerCase().includes(szukaj.value.toLowerCase())))
</script>

<template>
  <div class="flex flex-col gap-3 p-3">
    <label class="flex h-7 items-center gap-2 rounded-[6px] bg-[#2c2e34] px-2 text-[#a4a7ae] focus-within:ring-1 focus-within:ring-[#0d99ff]">
      <Search :size="13" />
      <input v-model="szukaj" placeholder="Search presets" class="min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-[#7b7f87]" />
    </label>
    <p class="text-[11px] text-[#a4a7ae]">Project presets</p>
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="p in lista"
        :key="p.nazwa"
        type="button"
        class="flex flex-col items-center gap-1.5 rounded-[8px] p-1.5 outline-none hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-[#0d99ff]"
        :class="p.nazwa === aktualny ? 'bg-[#34406a]/70 ring-1 ring-[#0d99ff]' : ''"
        :title="`${p.nazwa} · ${RODZAJ[p.baza]}`"
        @click="emit('wybierz', p)"
      >
        <KulkaMaterialu :ustawienia="p" :zrodlo="zrodlo" :rozmiar="58" />
        <span class="w-full truncate text-center text-[10.5px] leading-tight">{{ p.nazwa }}</span>
      </button>
    </div>
    <p v-if="!lista.length" class="text-[11px] text-[#a4a7ae]">No presets match.</p>
  </div>
</template>
