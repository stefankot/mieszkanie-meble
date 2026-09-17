<script setup lang="ts">
import { Pipette } from '@lucide/vue'
import { ColorAreaArea, ColorAreaRoot, ColorAreaThumb, ColorSliderRoot, ColorSliderThumb, ColorSliderTrack, TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { ref, watch } from 'vue'

import { palety } from '@/data/mieszkanie'

/* Figma UI3 color picker: Custom (pole nasycenie × jasność, odcień, pipeta, HEX) i Libraries (palety projektu).
   `koniec` — zatwierdzona zmiana (puszczenie suwaka, wpisany HEX, kolor z palety). */
const kolor = defineModel<string>({ required: true })
const emit = defineEmits<{ koniec: [string] }>()
const hex = ref('')
watch(kolor, (v) => (hex.value = v.replace('#', '').toUpperCase()), { immediate: true })
const pipetaDostepna = 'EyeDropper' in window

function ustaw(v: string) {
  kolor.value = v.toLowerCase()
  emit('koniec', kolor.value)
}
function wpisz() {
  const v = hex.value.trim().replace('#', '')
  const pelny = v.length === 3 ? [...v].map((c) => c + c).join('') : v
  if (/^[0-9a-f]{6}$/i.test(pelny)) ustaw(`#${pelny}`)
  else hex.value = kolor.value.replace('#', '').toUpperCase()
}
async function pipeta() {
  try {
    const { sRGBHex } = await new (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper().open()
    ustaw(sRGBHex)
  } catch {
    /* anulowano */
  }
}
</script>

<template>
  <TabsRoot default-value="custom" class="w-[240px] overflow-hidden rounded-[13px] bg-[#1e1e1e] text-white shadow-[0_10px_30px_rgba(0,0,0,.45)] ring-1 ring-white/10">
    <div class="flex h-10 items-center border-b border-[#2c2c2c] px-2">
      <TabsList class="flex gap-1">
        <TabsTrigger v-for="z in ['custom', 'libraries']" :key="z" :value="z" class="h-6 rounded-[5px] px-2 text-[11px] capitalize text-[#a4a7ae] outline-none data-[state=active]:bg-[#2c2e34] data-[state=active]:font-semibold data-[state=active]:text-white">{{ z }}</TabsTrigger>
      </TabsList>
      <slot name="naglowek" />
    </div>
    <TabsContent value="custom" class="flex flex-col gap-3 p-3 outline-none">
      <ColorAreaRoot v-slot="{ style }" v-model="kolor" color-space="hsb" x-channel="saturation" y-channel="brightness" @change-end="emit('koniec', kolor)">
        <ColorAreaArea class="relative h-[200px] w-full rounded-[4px]" :style="style">
          <ColorAreaThumb class="block size-3.5 rounded-full shadow-[0_0_0_2px_#fff,0_1px_4px_rgba(0,0,0,.5)] outline-none" />
        </ColorAreaArea>
      </ColorAreaRoot>
      <div class="flex items-center gap-2">
        <button type="button" title="Pick color from screen" aria-label="Pick color from screen" :disabled="!pipetaDostepna" class="flex size-6 shrink-0 items-center justify-center rounded-[5px] text-[#c9ccd2] hover:bg-white/5 disabled:opacity-40" @click="pipeta">
          <Pipette :size="14" />
        </button>
        <ColorSliderRoot v-model="kolor" channel="hue" color-space="hsb" class="relative flex h-3 flex-1 touch-none items-center" @change-end="emit('koniec', kolor)">
          <ColorSliderTrack class="h-3 w-full rounded-full" />
          <ColorSliderThumb class="block size-3.5 rounded-full shadow-[0_0_0_2px_#fff,0_1px_4px_rgba(0,0,0,.5)] outline-none" />
        </ColorSliderRoot>
      </div>
      <div class="grid grid-cols-[52px_1fr_48px] gap-1">
        <span class="flex h-6 items-center rounded-[5px] bg-[#2c2e34] px-2 text-[11px] text-[#c9ccd2]">Hex</span>
        <input v-model="hex" aria-label="Hex" class="h-6 rounded-[5px] bg-[#2c2e34] px-2 text-[11px] uppercase tabular-nums outline-none focus:ring-1 focus:ring-[#0d99ff]" @keydown.enter="wpisz" @blur="wpisz" />
        <span class="flex h-6 items-center justify-end rounded-[5px] bg-[#2c2e34] px-2 text-[11px] tabular-nums text-[#c9ccd2]">100 %</span>
      </div>
    </TabsContent>
    <TabsContent value="libraries" class="flex max-h-[320px] flex-col gap-3 overflow-y-auto p-3 outline-none">
      <p class="text-[11px] text-[#a4a7ae]">Project palettes</p>
      <div v-for="p in palety" :key="p.id">
        <p class="mb-1.5 text-[11px] font-medium">{{ p.nazwa }}</p>
        <div class="grid grid-cols-8 gap-1.5">
          <button
            v-for="k in p.kolory"
            :key="k.rola"
            type="button"
            :title="`${k.rola} · ${k.hex.toUpperCase()}`"
            :aria-label="`${k.rola} ${k.hex}`"
            class="size-6 rounded-[4px] ring-1 ring-inset ring-white/10 hover:ring-2 hover:ring-white"
            :class="k.hex.toLowerCase() === kolor.toLowerCase() ? 'ring-2 ring-[#0d99ff]' : ''"
            :style="{ background: k.hex }"
            @click="ustaw(k.hex)"
          />
        </div>
      </div>
    </TabsContent>
  </TabsRoot>
</template>
