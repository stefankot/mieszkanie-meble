<script setup lang="ts">
import { ArrowLeft, Sparkles } from '@lucide/vue'
import { ref } from 'vue'

import { $trybPrawejKolumny } from '@/stan'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* D5: tryb zdjęcia (ikona aparatu) podmienia prawą kolumnę. Sekcja Render AI wg „Plugin X”:
   kanały z renderera + maski obszarów → OpenAI/Gemini → nakładka z kryciem. */
const proporcje = ref('16:9')
const rozdzielczosc = ref('2k')
const fov = ref(42)
const dostawca = ref('openai')
const model = ref('gpt-image-1')
const kanaly = ref(new Set(['obraz', 'albedo', 'glebia', 'normalne', 'maska']))
const maski = ref(new Set(['swiatlo', 'okno']))
const preset = ref('foto')
const krycie = ref(70)
const wszystkieKanaly = [['obraz', 'Obraz'], ['albedo', 'Albedo'], ['glebia', 'Głębia'], ['normalne', 'Normalne'], ['maska', 'Maska']]
const wszystkieMaski = [['swiatlo', 'Światło'], ['okno', 'Widok za oknem'], ['rosliny', 'Rośliny'], ['tekstylia', 'Tekstylia']]
const przelacz = (zbior: Set<string>, id: string) => (zbior.has(id) ? zbior.delete(id) : zbior.add(id))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-line px-2">
      <button type="button" class="flex size-6 items-center justify-center rounded text-muted hover:bg-hover" aria-label="Wróć do edycji" @click="$trybPrawejKolumny.set('edycja')">
        <ArrowLeft :size="14" />
      </button>
      <span class="text-xs font-medium">Zdjęcie</span>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <Sekcja tytul="Kadr">
        <Wiersz etykieta="Proporcje">
          <Segmenty v-model="proporcje" :opcje="['16:9', '4:3', '1:1', '4:5'].map((p) => ({ wartosc: p, etykieta: p }))" />
        </Wiersz>
        <Wiersz etykieta="Rozdzielczość">
          <Segmenty v-model="rozdzielczosc" :opcje="[{ wartosc: '1k', etykieta: '1K' }, { wartosc: '2k', etykieta: '2K' }, { wartosc: '4k', etykieta: '4K' }]" />
        </Wiersz>
        <Wiersz etykieta="Perspektywa"><PoleLiczby v-model="fov" :min="30" :max="60" jednostka="°" pasek /></Wiersz>
      </Sekcja>

      <Sekcja tytul="Render AI">
        <Wiersz etykieta="Dostawca">
          <Segmenty v-model="dostawca" :opcje="[{ wartosc: 'openai', etykieta: 'OpenAI' }, { wartosc: 'gemini', etykieta: 'Gemini' }]" />
        </Wiersz>
        <Wiersz etykieta="Model">
          <Wybor v-model="model" :opcje="dostawca === 'openai' ? [{ wartosc: 'gpt-image-1', etykieta: 'gpt-image-1' }] : [{ wartosc: 'gemini-3-pro-image', etykieta: 'gemini-3-pro-image' }]" />
        </Wiersz>
        <Wiersz etykieta="Kanały" pionowo>
          <div class="flex flex-wrap gap-1">
            <button v-for="[id, nazwa] in wszystkieKanaly" :key="id" type="button" class="h-5 rounded-full px-2 text-2xs" :class="kanaly.has(id) ? 'bg-accent text-white' : 'bg-field text-muted'" @click="przelacz(kanaly, id)">{{ nazwa }}</button>
          </div>
        </Wiersz>
        <Wiersz etykieta="AI zmienia tylko" pionowo>
          <div class="flex flex-wrap gap-1">
            <button v-for="[id, nazwa] in wszystkieMaski" :key="id" type="button" class="h-5 rounded-full px-2 text-2xs" :class="maski.has(id) ? 'bg-accent-soft text-accent ring-1 ring-accent' : 'bg-field text-muted'" @click="przelacz(maski, id)">{{ nazwa }}</button>
          </div>
        </Wiersz>
        <Wiersz etykieta="Styl">
          <Segmenty v-model="preset" :opcje="[{ wartosc: 'foto', etykieta: 'Fotorealizm' }, { wartosc: 'wieczor', etykieta: 'Wieczór' }, { wartosc: 'ludzie', etykieta: 'Ludzie' }]" />
        </Wiersz>
        <textarea rows="3" class="mt-1 w-full resize-none rounded-[5px] bg-field p-2 text-xs text-text outline-none placeholder:text-faint" placeholder="Dodatkowy opis, np. miękkie popołudniowe światło, lniane zasłony" />
        <Wiersz etykieta="Krycie nakładki"><PoleLiczby v-model="krycie" :min="0" :max="100" jednostka="%" pasek /></Wiersz>
        <div class="flex gap-1 pt-1">
          <button type="button" class="h-7 flex-1 rounded-md bg-field text-xs text-text hover:bg-hover">Podgląd miksu</button>
          <button type="button" class="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-accent text-xs text-white"><Sparkles :size="13" /> Generuj AI</button>
        </div>
      </Sekcja>
    </div>
    <div class="shrink-0 border-t border-line p-2">
      <button type="button" class="h-8 w-full rounded-md bg-text text-xs font-medium text-app hover:bg-white">Renderuj zdjęcie</button>
    </div>
  </div>
</template>
