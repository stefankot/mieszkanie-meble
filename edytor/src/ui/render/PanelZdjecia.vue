<script setup lang="ts">
import { ArrowLeft, Sparkles } from '@lucide/vue'
import { ref } from 'vue'

import { $trybPrawejKolumny } from '@/stan'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* D5: ikona Image podmienia prawą kolumnę. Sekcja AI Render wg „Plugin X”:
   kanały renderera + maski obszarów → OpenAI/Gemini → nakładka z kryciem. */
const proporcje = ref('16:9')
const rozdzielczosc = ref('2k')
const fov = ref(42)
const dostawca = ref('openai')
const model = ref('gpt-image-1')
const kanaly = ref(new Set(['beauty', 'albedo', 'depth', 'normal', 'mask']))
const maski = ref(new Set(['light', 'window']))
const styl = ref('photo')
const krycie = ref(0.7)
const przelacz = (zbior: Set<string>, id: string) => (zbior.has(id) ? zbior.delete(id) : zbior.add(id))
const chip = (on: boolean) => (on ? 'bg-accent text-white' : 'bg-field text-muted hover:text-white')
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-(--zakladki) shrink-0 items-center gap-1.5 pl-1.5 pr-(--pad-prawy)">
      <button type="button" aria-label="Back to edit" class="flex size-5 items-center justify-center rounded-d5 text-muted hover:bg-hover hover:text-white" @click="$trybPrawejKolumny.set('edycja')"><ArrowLeft :size="12" /></button>
      <span class="text-xs font-semibold text-white">Image</span>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <Sekcja tytul="Frame">
        <Pole etykieta="Aspect Ratio"><Segmenty v-model="proporcje" :opcje="['16:9', '4:3', '1:1', '4:5'].map((p) => ({ wartosc: p, etykieta: p }))" /></Pole>
        <Pole etykieta="Resolution"><Segmenty v-model="rozdzielczosc" :opcje="[{ wartosc: '1k', etykieta: '1K' }, { wartosc: '2k', etykieta: '2K' }, { wartosc: '4k', etykieta: '4K' }]" /></Pole>
        <Pole etykieta="Field of View"><PoleLiczby v-model="fov" :min="30" :max="60" jednostka="°" /></Pole>
      </Sekcja>
      <Sekcja tytul="AI Render">
        <Pole etykieta="Provider"><Segmenty v-model="dostawca" :opcje="[{ wartosc: 'openai', etykieta: 'OpenAI' }, { wartosc: 'gemini', etykieta: 'Gemini' }]" /></Pole>
        <Pole etykieta="Model">
          <Wybor v-model="model" :opcje="dostawca === 'openai' ? [{ wartosc: 'gpt-image-1', etykieta: 'gpt-image-1' }] : [{ wartosc: 'gemini-3-pro-image', etykieta: 'gemini-3-pro-image' }]" />
        </Pole>
        <Pole etykieta="Channels">
          <div class="flex flex-wrap gap-1">
            <button v-for="[id, nazwa] in [['beauty', 'Beauty'], ['albedo', 'Albedo'], ['depth', 'Depth'], ['normal', 'Normal'], ['mask', 'Mask']]" :key="id" type="button" class="h-[18px] rounded-d5 px-1.5 text-2xs" :class="chip(kanaly.has(id))" @click="przelacz(kanaly, id)">{{ nazwa }}</button>
          </div>
        </Pole>
        <Pole etykieta="AI Changes Only">
          <div class="flex flex-wrap gap-1">
            <button v-for="[id, nazwa] in [['light', 'Light'], ['window', 'Window view'], ['plants', 'Plants'], ['textiles', 'Textiles']]" :key="id" type="button" class="h-[18px] rounded-d5 px-1.5 text-2xs" :class="chip(maski.has(id))" @click="przelacz(maski, id)">{{ nazwa }}</button>
          </div>
        </Pole>
        <Pole etykieta="Style"><Segmenty v-model="styl" :opcje="[{ wartosc: 'photo', etykieta: 'Photoreal' }, { wartosc: 'evening', etykieta: 'Evening' }, { wartosc: 'people', etykieta: 'People' }]" /></Pole>
        <Pole etykieta="Custom Prompt"><textarea rows="3" class="w-full resize-none rounded-d5 bg-field p-1.5 text-xs text-text outline-none placeholder:text-faint" placeholder="Soft afternoon light, linen curtains" /></Pole>
        <Pole etykieta="Overlay Opacity"><PoleLiczby v-model="krycie" :min="0" :max="1" :krok="0.01" /></Pole>
        <div class="grid grid-cols-2 gap-1 pt-0.5">
          <button type="button" class="h-[22px] rounded-d5 bg-field text-2xs text-text hover:bg-hover">Preview Mix</button>
          <button type="button" class="flex h-[22px] items-center justify-center gap-1 rounded-d5 bg-accent text-2xs text-white"><Sparkles :size="11" /> Generate</button>
        </div>
      </Sekcja>
    </div>
    <div class="shrink-0 pb-3 pl-(--pad-x) pr-(--pad-prawy) pt-2"><button type="button" class="h-7 w-full rounded-d5 bg-accent text-xs font-medium text-white">Render</button></div>
  </div>
</template>
