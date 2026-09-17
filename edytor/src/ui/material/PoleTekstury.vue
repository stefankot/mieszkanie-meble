<script setup lang="ts">
import { ImageUp, LoaderCircle, Sparkles } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { ref } from 'vue'

import { $kluczOpenAI } from '@/ai/klucz'
import { generujTeksture } from '@/ai/tekstury'

/* Źródło tekstury: skan materiału ze sceny, wgrany obraz albo tekstura wygenerowana przez model obrazów
   z opisu (bezszwowy kafel). Obraz trzymamy jako data URL w ustawieniach materiału. */
defineProps<{ maSkan: boolean }>()
const zrodlo = defineModel<'scene' | 'image'>('zrodlo', { required: true })
const url = defineModel<string | undefined>('url', { required: true })
const klucz = useStore($kluczOpenAI)
const opis = ref('')
const trwa = ref(false)
const blad = ref('')

function wgraj(e: Event) {
  const plik = (e.target as HTMLInputElement).files?.[0]
  if (!plik) return
  const czytnik = new FileReader()
  czytnik.onload = () => {
    url.value = String(czytnik.result)
    zrodlo.value = 'image'
  }
  czytnik.readAsDataURL(plik)
}
async function generuj() {
  if (!opis.value.trim() || trwa.value) return
  trwa.value = true
  blad.value = ''
  try {
    url.value = await generujTeksture(opis.value.trim())
    zrodlo.value = 'image'
  } catch (e) {
    blad.value = e instanceof Error ? e.message : String(e)
  } finally {
    trwa.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-2 gap-1 rounded-[6px] bg-[#2c2e34] p-0.5">
      <button type="button" :disabled="!maSkan" class="h-6 rounded-[5px] text-[11px] disabled:opacity-40" :class="zrodlo === 'scene' ? 'bg-[#44474e] font-semibold text-white' : 'text-[#c9ccd2]'" @click="zrodlo = 'scene'">Scene scan</button>
      <button type="button" class="h-6 rounded-[5px] text-[11px]" :class="zrodlo === 'image' ? 'bg-[#44474e] font-semibold text-white' : 'text-[#c9ccd2]'" @click="zrodlo = 'image'">Image</button>
    </div>
    <template v-if="zrodlo === 'image'">
      <label class="group relative flex aspect-[16/9] cursor-pointer items-center justify-center overflow-hidden rounded-[6px] bg-[repeating-conic-gradient(#34363c_0_25%,#2a2c31_0_50%)] bg-[length:12px_12px] ring-1 ring-white/10 hover:ring-[#0d99ff]">
        <img v-if="url" :src="url" alt="Texture" class="absolute inset-0 size-full object-cover" />
        <span class="relative flex items-center gap-1.5 rounded-[5px] bg-black/60 px-2 py-1 text-[11px] opacity-100 group-hover:opacity-100" :class="url ? 'opacity-0' : ''"><ImageUp :size="13" /> Upload image</span>
        <input type="file" accept="image/*" class="sr-only" @change="wgraj" />
      </label>
      <div class="flex flex-col gap-1.5 rounded-[6px] bg-[#25272c] p-2">
        <span class="flex items-center gap-1.5 text-[11px] font-medium"><Sparkles :size="12" class="text-[#a78bfa]" /> Generate with AI</span>
        <textarea v-model="opis" rows="2" placeholder="e.g. burgundy linoleum with fine speckles" class="resize-none rounded-[5px] bg-[#2c2e34] p-1.5 text-[11px] outline-none placeholder:text-[#7b7f87] focus:ring-1 focus:ring-[#0d99ff]" @keydown.meta.enter="generuj" />
        <button type="button" :disabled="!opis.trim() || trwa || !klucz" class="flex h-7 items-center justify-center gap-1.5 rounded-[6px] bg-[#0d99ff] text-[11px] font-medium hover:bg-[#2aa5ff] disabled:bg-[#3a3d44] disabled:text-[#8b8f97]" @click="generuj">
          <LoaderCircle v-if="trwa" :size="13" class="animate-spin" />{{ trwa ? 'Generating…' : 'Generate seamless texture' }}
        </button>
        <p v-if="!klucz" class="text-[10.5px] text-[#a4a7ae]">Needs an OpenAI API key (Settings or .env.local in dev).</p>
        <p v-if="blad" class="text-[10.5px] text-[#ff8a80]">{{ blad }}</p>
      </div>
    </template>
  </div>
</template>
