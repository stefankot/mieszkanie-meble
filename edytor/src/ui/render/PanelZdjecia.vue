<script setup lang="ts">
import { ArrowLeft, LoaderCircle, Sparkles } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, SwitchRoot, SwitchThumb } from 'reka-ui'
import { computed, ref, watch } from 'vue'

import type { Orientacja } from '@/ai/kadr'
import { modeleObrazow, najnowszyModelObrazow } from '@/ai/klient'
import { $kluczOpenAI } from '@/ai/klucz'
import { $modeleBezWiernosci, $nakladkaAI, $wynikiAI, renderujAI } from '@/ai/render'
import { $silnik } from '@/silnik/most'
import { $trybPrawejKolumny, $zaznaczenie } from '@/stan'
import SekcjaF from '@/ui/figma/SekcjaF.vue'
import WyborF from '@/ui/figma/WyborF.vue'
import SuwakMaterialu from '@/ui/material/SuwakMaterialu.vue'

import KluczAPI from './KluczAPI.vue'

/* Image: render AI z bieżącego kadru (układ jak panel ustawień obrazu: Model, Size & orientation, Quality,
   Number of images). Model „Latest” = najnowszy gpt-image-* z konta. Kadr = cały ekran bez paneli + margines.
   Sekcja Accuracy — opcje przeciw zniekształceniom; wynik jako podgląd pełnoekranowy (krycie, mieszanie, A/B). */
const klucz = useStore($kluczOpenAI)
const zaznaczenie = useStore($zaznaczenie)
const wyniki = useStore($wynikiAI)
const nakladka = useStore($nakladkaAI)
const bezWiernosci = useStore($modeleBezWiernosci)
const model = ref('latest')
const modele = ref<string[]>([])
const najnowszy = ref('')
const orientacja = ref<Orientacja>('landscape')
const jakosc = ref<'low' | 'medium' | 'high' | 'auto'>('high')
const ile = ref(1)
const opis = ref('')
const wiernosc = ref(true)
const krawedzie = ref(true)
const chron = ref(false)
const trwa = ref(false)
const blad = ref('')

watch(klucz, (k) => {
  if (!k) return
  modeleObrazow().then((l) => (modele.value = l)).catch(() => {})
  najnowszyModelObrazow().then((m) => (najnowszy.value = m))
}, { immediate: true })

const opcjeModelu = computed(() => [{ wartosc: 'latest', etykieta: `Latest${najnowszy.value ? ` · ${najnowszy.value}` : ''}` }, ...modele.value.map((m) => ({ wartosc: m, etykieta: m }))])
// Wybrany model (także „Latest”) nie obsługuje input_fidelity — przełącznik jest wtedy nieaktywny.
const wybranyModel = computed(() => (model.value === 'latest' ? najnowszy.value : model.value))
const wiernoscNiedostepna = computed(() => bezWiernosci.value.includes(wybranyModel.value))
const STYLE = ['Soft daylight', 'Golden hour', 'Evening lamps', 'Overcast']

async function generuj() {
  const s = $silnik.get()
  if (!s || trwa.value) return
  trwa.value = true
  blad.value = ''
  try {
    await renderujAI(s, { model: model.value, orientacja: orientacja.value, jakosc: jakosc.value, ile: ile.value, opis: opis.value, wiernosc: wiernosc.value, krawedzie: krawedzie.value, chronMebel: chron.value ? zaznaczenie.value : null })
  } catch (e) {
    blad.value = e instanceof Error ? e.message : String(e)
  } finally {
    trwa.value = false
  }
}
const zmienNakladke = (zmiana: Partial<NonNullable<typeof nakladka.value>>) => nakladka.value && $nakladkaAI.set({ ...nakladka.value, ...zmiana })
const przelacznik = 'relative h-4 w-7 shrink-0 rounded-full bg-[#3a3d44] outline-none data-[state=checked]:bg-[#0d99ff] disabled:opacity-40'
const kciuk = 'block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]'
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-10 shrink-0 items-center gap-1.5 px-2">
      <button type="button" aria-label="Back to edit" class="flex size-6 items-center justify-center rounded-[5px] text-[#c9ccd2] hover:bg-white/5 hover:text-white" @click="$trybPrawejKolumny.set('edycja')"><ArrowLeft :size="13" /></button>
      <span class="text-[12px] font-semibold text-white">Image</span>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <SekcjaF tytul="Image settings">
        <div class="grid grid-cols-[1fr] gap-1">
          <span class="text-[11px] text-[#a4a7ae]">Model</span>
          <WyborF v-model="model" :opcje="opcjeModelu" />
        </div>
        <div class="grid gap-1">
          <span class="text-[11px] text-[#a4a7ae]">Size & orientation</span>
          <div class="grid grid-cols-3 gap-1 rounded-[6px] bg-[#2c2e34] p-0.5">
            <button v-for="[o, n] in [['landscape', 'Landscape'], ['square', 'Square'], ['portrait', 'Portrait']]" :key="o" type="button" class="h-6 rounded-[5px] text-[11px]" :class="orientacja === o ? 'bg-[#44474e] font-semibold text-white' : 'text-[#c9ccd2]'" @click="orientacja = o as Orientacja">{{ n }}</button>
          </div>
        </div>
        <div class="grid gap-1">
          <span class="text-[11px] text-[#a4a7ae]">Quality</span>
          <WyborF :model-value="jakosc" :opcje="[{ wartosc: 'high', etykieta: 'High' }, { wartosc: 'medium', etykieta: 'Medium' }, { wartosc: 'low', etykieta: 'Low' }, { wartosc: 'auto', etykieta: 'Auto' }]" @update:model-value="jakosc = $event as typeof jakosc" />
        </div>
        <div class="grid gap-1">
          <span class="text-[11px] text-[#a4a7ae]">Number of images</span>
          <div class="grid grid-cols-[1fr_32px] items-center gap-2">
            <SliderRoot :model-value="[ile]" :min="1" :max="4" :step="1" class="relative flex h-5 touch-none items-center" @update:model-value="(v) => v && (ile = v[0])">
              <SliderTrack class="relative h-[3px] grow rounded-full bg-[#3a3d44]"><SliderRange class="absolute h-full rounded-full bg-[#0d99ff]" /></SliderTrack>
              <SliderThumb class="block size-3.5 rounded-full bg-white shadow outline-none" aria-label="Number of images" />
            </SliderRoot>
            <span class="text-right text-[11px] tabular-nums text-white">{{ ile }}</span>
          </div>
        </div>
      </SekcjaF>

      <SekcjaF tytul="Accuracy">
        <label class="flex h-7 items-center justify-between gap-2 text-[11px] text-[#c9ccd2]" title="Keeps details of the input image (input_fidelity: high)">High input fidelity<SwitchRoot :model-value="wiernosc && !wiernoscNiedostepna" :disabled="wiernoscNiedostepna" :class="przelacznik" @update:model-value="wiernosc = $event"><SwitchThumb :class="kciuk" /></SwitchRoot></label>
        <p v-if="wiernoscNiedostepna" class="-mt-1 text-[10.5px] leading-snug text-[#a4a7ae]">Not supported by {{ wybranyModel }} — renders without it; Edge guide still keeps geometry.</p>
        <label class="flex h-7 items-center justify-between gap-2 text-[11px] text-[#c9ccd2]" title="Sends an edge map of the view as a second reference image">Edge guide<SwitchRoot v-model="krawedzie" :class="przelacznik"><SwitchThumb :class="kciuk" /></SwitchRoot></label>
        <label class="flex h-7 items-center justify-between gap-2 text-[11px] text-[#c9ccd2]" title="Masks the selected furniture so the model leaves it unchanged">Protect selected furniture<SwitchRoot v-model="chron" :disabled="!zaznaczenie" :class="przelacznik"><SwitchThumb :class="kciuk" /></SwitchRoot></label>
      </SekcjaF>

      <SekcjaF tytul="Prompt">
        <textarea v-model="opis" rows="3" placeholder="Soft afternoon light, linen curtains" class="w-full resize-none rounded-[6px] bg-[#2c2e34] p-2 text-[11px] text-white outline-none placeholder:text-[#7b7f87] focus:ring-1 focus:ring-[#0d99ff]" />
        <div class="flex flex-wrap gap-1">
          <button v-for="st in STYLE" :key="st" type="button" class="h-6 rounded-full bg-[#2c2e34] px-2 text-[10.5px] text-[#c9ccd2] hover:text-white" @click="opis = opis ? `${opis}, ${st.toLowerCase()}` : st">{{ st }}</button>
        </div>
        <KluczAPI />
        <button type="button" :disabled="trwa || !klucz" class="mt-1 flex h-8 items-center justify-center gap-1.5 rounded-[6px] bg-[#0d99ff] text-[12px] font-medium text-white hover:bg-[#2aa5ff] disabled:bg-[#3a3d44] disabled:text-[#8b8f97]" @click="generuj">
          <LoaderCircle v-if="trwa" :size="14" class="animate-spin" /><Sparkles v-else :size="14" />{{ trwa ? 'Rendering…' : 'Render with AI' }}
        </button>
        <p v-if="blad" class="text-[10.5px] leading-snug text-[#ff8a80]">{{ blad }}</p>
      </SekcjaF>

      <SekcjaF v-if="wyniki.length" tytul="Results">
        <div class="grid grid-cols-2 gap-1.5">
          <button v-for="w in wyniki" :key="w.id" type="button" class="overflow-hidden rounded-[6px] ring-1" :class="nakladka?.id === w.id ? 'ring-2 ring-[#0d99ff]' : 'ring-white/10 hover:ring-white/40'" :title="`${w.model} · ${new Date(w.czas).toLocaleTimeString()}`" @click="$nakladkaAI.set({ id: w.id, krycie: nakladka?.krycie ?? 1, mieszanie: nakladka?.mieszanie ?? 'normal', porownanie: nakladka?.porownanie ?? true, podzial: nakladka?.podzial ?? 0.5 })">
            <img :src="w.url" alt="AI render" class="block w-full" />
          </button>
        </div>
        <template v-if="nakladka">
          <SuwakMaterialu :model-value="nakladka.krycie" etykieta="Opacity" :min="0" :max="1" jednostka=" %" @update:model-value="zmienNakladke({ krycie: $event })" />
          <div class="grid h-7 grid-cols-[76px_1fr] items-center gap-2">
            <span class="text-[11px] text-[#c9ccd2]">Blend</span>
            <WyborF :model-value="nakladka.mieszanie" :opcje="[{ wartosc: 'normal', etykieta: 'Normal' }, { wartosc: 'luminosity', etykieta: 'Luminosity' }]" @update:model-value="zmienNakladke({ mieszanie: $event as 'normal' | 'luminosity' })" />
          </div>
          <label class="flex h-7 items-center justify-between text-[11px] text-[#c9ccd2]">Compare A/B<SwitchRoot :model-value="nakladka.porownanie" :class="przelacznik" @update:model-value="zmienNakladke({ porownanie: $event })"><SwitchThumb :class="kciuk" /></SwitchRoot></label>
          <div class="grid grid-cols-2 gap-1">
            <a :href="wyniki.find((w) => w.id === nakladka?.id)?.url" download="ai-render.png" class="flex h-7 items-center justify-center rounded-[6px] bg-[#2c2e34] text-[11px] text-white hover:bg-[#3a3d44]">Download</a>
            <button type="button" class="h-7 rounded-[6px] bg-[#2c2e34] text-[11px] text-white hover:bg-[#3a3d44]" @click="$nakladkaAI.set(null)">Close preview</button>
          </div>
        </template>
      </SekcjaF>
    </div>
  </div>
</template>
