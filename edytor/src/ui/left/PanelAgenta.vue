<script setup lang="ts">
import { ArrowUp, Box, ChevronDown, Ellipsis, Mic, Plus, Sparkles, Sun, SwatchBook, Wand2, X } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

import { obiekty } from '@/data/mieszkanie'
import { $zaznaczenie } from '@/stan'

/* Figma UI3 „Agents”: nagłówek czatu, „What's next?” z rozwijanymi sugestiami, pole poleceń z zaznaczeniem
   (chip), dodaniem, rozmową głosową (OpenAI Realtime) i wysłaniem. Sugestia wstawia polecenie do pola. */
const zaznaczenie = useStore($zaznaczenie)
const nazwaZaznaczenia = computed(() => obiekty.flatMap((o) => [o, ...(o.dzieci ?? [])]).find((o) => o.id === zaznaczenie.value)?.nazwa)
const polecenie = ref('')
const sugestie = [
  { nazwa: 'Arrange furniture', ikona: Box, przyklady: ['Balance the living room layout', 'Place a sofa along the longest wall'] },
  { nazwa: 'Colors and materials', ikona: SwatchBook, przyklady: ['Apply the Nordic palette to kitchen fronts', 'Warmer wood on the shelves'] },
  { nazwa: 'Set the lighting', ikona: Sun, przyklady: ['Winter morning, 8:00', 'Evening with ceiling lamps on'] },
  { nazwa: 'Render with AI', ikona: Sparkles, przyklady: ['Photoreal still of this view', 'Evening mood with soft light'] }
]
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-14 shrink-0 items-center gap-2 border-b border-[#2a2c31] px-4">
      <div class="min-w-0 flex-1">
        <p class="truncate text-[13px] font-semibold text-white">New chat</p>
        <p class="text-[11px] text-[#a4a7ae]">OpenAI · voice ready</p>
      </div>
      <span class="rounded-[4px] px-1.5 py-0.5 text-[10.5px] text-[#c9ccd2] ring-1 ring-[#3a3d44]">Beta</span>
      <button type="button" aria-label="Chat options" class="flex size-6 items-center justify-center text-[#c9ccd2] hover:text-white"><Ellipsis :size="15" /></button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-8">
      <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-[#34406a] text-[#8cc8ff]"><Wand2 :size="18" :stroke-width="1.6" /></div>
      <h2 class="mb-6 mt-3 text-center text-[15px] font-semibold text-white">What's next?</h2>
      <div class="flex flex-col gap-2.5">
        <CollapsibleRoot v-for="s in sugestie" :key="s.nazwa" v-slot="{ open }" class="rounded-[8px] ring-1 ring-[#34363c]">
          <CollapsibleTrigger class="flex h-10 w-full items-center gap-3 px-3.5 text-[13px] text-white outline-none">
            <component :is="s.ikona" :size="15" :stroke-width="1.6" class="text-[#c9ccd2]" />
            <span class="flex-1 text-left">{{ s.nazwa }}</span>
            <ChevronDown :size="14" class="text-[#a4a7ae] transition-transform" :class="open ? 'rotate-180' : ''" />
          </CollapsibleTrigger>
          <CollapsibleContent class="flex flex-col gap-0.5 px-2 pb-2">
            <button v-for="p in s.przyklady" :key="p" type="button" class="rounded-[6px] px-2.5 py-1.5 text-left text-[12px] text-[#c9ccd2] hover:bg-white/5 hover:text-white" @click="polecenie = p">{{ p }}</button>
          </CollapsibleContent>
        </CollapsibleRoot>
      </div>
    </div>

    <div class="m-4 mt-3 flex min-h-[152px] shrink-0 flex-col rounded-[10px] p-3 ring-1 ring-[#34363c] focus-within:ring-[#4a4d55]">
      <div v-if="nazwaZaznaczenia" class="mb-2 flex">
        <span class="flex h-6 items-center gap-1.5 rounded-[5px] bg-[#23304d] px-2 text-[12px] text-[#8cc8ff]">
          <Box :size="12" /> {{ nazwaZaznaczenia }}
          <button type="button" aria-label="Remove selection from prompt" class="text-[#8cc8ff] hover:text-white" @click="$zaznaczenie.set(null)"><X :size="12" /></button>
        </span>
      </div>
      <textarea v-model="polecenie" rows="3" class="min-h-0 flex-1 resize-none bg-transparent text-[13px] text-white outline-none placeholder:text-[#8b8e95]" placeholder="Ask for changes" />
      <div class="flex items-center gap-2 pt-2">
        <button type="button" aria-label="Attach" class="flex size-7 items-center justify-center rounded-full text-[#c9ccd2] hover:bg-white/5 hover:text-white"><Plus :size="16" /></button>
        <button type="button" aria-label="Voice conversation" class="ml-auto flex size-7 items-center justify-center rounded-full bg-[#34406a] text-[#8cc8ff] hover:bg-[#3d4b7a]"><Mic :size="14" /></button>
        <button type="button" aria-label="Send" class="flex size-7 items-center justify-center rounded-full" :class="polecenie ? 'bg-[#0d99ff] text-white' : 'bg-[#44474e] text-[#9a9da4]'"><ArrowUp :size="15" /></button>
      </div>
    </div>
  </div>
</template>
