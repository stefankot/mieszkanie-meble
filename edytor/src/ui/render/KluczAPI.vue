<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { ref } from 'vue'

import { $kluczOpenAI, zapiszKlucz } from '@/ai/klucz'

/* Klucz OpenAI zapisywany tylko w tej przeglądarce (localStorage). W dev może pochodzić z .env.local. */
const klucz = useStore($kluczOpenAI)
const nowy = ref('')
const edycja = ref(false)
function zapisz() {
  zapiszKlucz(nowy.value)
  nowy.value = ''
  edycja.value = false
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex h-6 items-center gap-2 text-[11px]">
      <KeyRound :size="13" class="text-[#a4a7ae]" />
      <span class="flex-1" :class="klucz ? 'text-[#c9ccd2]' : 'text-[#ffb4a9]'">{{ klucz ? `OpenAI key ···${klucz.slice(-4)}` : 'No OpenAI API key' }}</span>
      <button type="button" class="rounded-[5px] px-1.5 py-0.5 text-[#c9ccd2] hover:bg-white/5 hover:text-white" @click="edycja = !edycja">{{ klucz ? 'Change' : 'Add' }}</button>
    </div>
    <form v-if="edycja" class="flex gap-1" @submit.prevent="zapisz">
      <input v-model="nowy" type="password" autocomplete="off" placeholder="sk-…" aria-label="OpenAI API key" class="h-6 min-w-0 flex-1 rounded-[5px] bg-[#2c2e34] px-2 text-[11px] outline-none focus:ring-1 focus:ring-[#0d99ff]" />
      <button type="submit" class="h-6 rounded-[5px] bg-[#0d99ff] px-2 text-[11px] font-medium text-white">Save</button>
    </form>
    <p v-if="edycja" class="text-[10.5px] leading-snug text-[#a4a7ae]">Stored only in this browser. Leave empty and save to remove.</p>
  </div>
</template>
