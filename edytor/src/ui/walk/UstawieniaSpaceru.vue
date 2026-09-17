<script setup lang="ts">
import { Blinds, DoorOpen, Map, RefreshCw, Scan } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { kliknij, kontrolka, opcjeKontrolki, ustawKontrolke, wartoscKontrolki, wcisniety } from '@/silnik/most'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* Podstawowe funkcje renderera (tryb bez DEV) w wyglądzie D5. Źródło prawdy: ukryty stary panel
   renderera (#sterowanie) — odczyt co 500 ms, zapis zdarzeniami input/change/click. */
const stan = ref({
  projekty: [] as { wartosc: string; etykieta: string }[],
  wersje: [] as { wartosc: string; etykieta: string }[],
  projekt: '', wersja: '', drzwi: false, zaslony: false, gora: false,
  preset: 'lato-14', cieplo: 45, rozproszenie: 90,
  priorytety: [] as { wartosc: string; etykieta: string }[], priorytet: 'wysoka', ekspozycja: 0.72,
  perspektywa: 'interactive', przesuniecie: 8, mapa: true
})
const pora = ref('lato')

/* Stary panel ma polskie etykiety opcji; UI jest po angielsku jak D5. */
const PRIORYTETY: Record<string, string> = { minimalna: 'Smooth', srednia: 'Balanced', wysoka: 'High quality', photo_raster: 'Photo (still)' }
const poAngielsku = (o: { wartosc: string; etykieta: string }) => ({
  wartosc: o.wartosc,
  etykieta: PRIORYTETY[o.wartosc] ?? o.etykieta.replace('najnowsza', 'latest').replace('w scenie', 'in scene').replace('przypięta', 'pinned')
})

function odczytaj() {
  const s = stan.value
  s.projekty = opcjeKontrolki('#mebelWybor')
  s.wersje = opcjeKontrolki('#mebelWersja').map(poAngielsku)
  s.projekt = wartoscKontrolki('#mebelWybor')
  s.wersja = wartoscKontrolki('#mebelWersja')
  s.drzwi = wcisniety('#drzwiMebla')
  s.zaslony = wcisniety('#zaslonyToggle')
  s.gora = wcisniety('#widokToggle')
  const preset = wartoscKontrolki('#presetSwiatla') || s.preset
  // Porę roku synchronizujemy tylko przy zmianie presetu — wybór Summer/Winter przed kliknięciem godziny zostaje.
  if (preset !== s.preset || !s.projekty.length) pora.value = preset.split('-')[0]
  s.preset = preset
  s.cieplo = Number(wartoscKontrolki('#cieplo') || s.cieplo)
  s.rozproszenie = Number(wartoscKontrolki('#rozproszenie') || s.rozproszenie)
  s.priorytety = opcjeKontrolki('#jakoscPoziom').map(poAngielsku)
  s.priorytet = wartoscKontrolki('#jakoscPoziom') || s.priorytet
  s.ekspozycja = Number(wartoscKontrolki('#ekspozycja') || s.ekspozycja)
  s.perspektywa = wartoscKontrolki('#trybKamery') || s.perspektywa
  s.przesuniecie = Number(wartoscKontrolki('#lensShiftY') || s.przesuniecie)
  s.mapa = kontrolka<HTMLElement>('#miniMapa')?.dataset.edytorWidoczna !== 'nie'
}
let zegar = 0
onMounted(() => {
  odczytaj()
  zegar = window.setInterval(odczytaj, 500)
})
onBeforeUnmount(() => clearInterval(zegar))

const ustaw = (sel: string, v: string | number) => {
  ustawKontrolke(sel, v)
  setTimeout(odczytaj, 60)
}
const nacisnij = (sel: string) => {
  kliknij(sel)
  setTimeout(odczytaj, 60)
}
const godzina = (h: string) => nacisnij(`[data-preset-swiatla="${pora.value}-${h}"]`)
function przelaczMape() {
  const el = kontrolka<HTMLElement>('#miniMapa')
  if (el) el.dataset.edytorWidoczna = el.dataset.edytorWidoczna === 'nie' ? 'tak' : 'nie'
  odczytaj()
}
const przycisk = 'flex h-[22px] items-center justify-center gap-1.5 rounded-d5 px-2 text-[10.5px]'
</script>

<template>
  <div class="max-h-[calc(100vh-80px)] w-[220px] overflow-y-auto rounded-[4px] bg-[#16181c] pb-1 shadow-2xl ring-1 ring-white/5">
    <Sekcja tytul="Furniture">
      <Pole etykieta="Project"><Wybor :model-value="stan.projekt" :opcje="stan.projekty" @update:model-value="ustaw('#mebelWybor', $event)" /></Pole>
      <Pole etykieta="Version">
        <Wybor :model-value="stan.wersja" :opcje="stan.wersje" @update:model-value="ustaw('#mebelWersja', $event)" />
        <button type="button" aria-label="Check for new versions" :class="przycisk" class="bg-field text-muted hover:text-white" @click="nacisnij('#sprawdzWersje')"><RefreshCw :size="11" /></button>
      </Pole>
      <div class="grid grid-cols-2 gap-1">
        <button type="button" :class="[przycisk, 'bg-field text-text hover:bg-hover']" @click="nacisnij('#kadrMebel')"><Scan :size="12" /> Show</button>
        <button type="button" :class="[przycisk, stan.drzwi ? 'bg-accent text-white' : 'bg-field text-text hover:bg-hover']" @click="nacisnij('#drzwiMebla')"><DoorOpen :size="12" /> Doors</button>
      </div>
    </Sekcja>

    <Sekcja tytul="Light">
      <Pole etykieta="Time of day">
        <Segmenty v-model="pora" :opcje="[{ wartosc: 'lato', etykieta: 'Summer' }, { wartosc: 'zima', etykieta: 'Winter' }]" />
      </Pole>
      <div class="grid grid-cols-3 gap-1">
        <button v-for="h in ['08', '14', '20']" :key="h" type="button" :class="[przycisk, stan.preset === `${pora}-${h}` ? 'bg-accent text-white' : 'bg-field text-text hover:bg-hover']" @click="godzina(h)">{{ Number(h) }}:00</button>
      </div>
      <Pole etykieta="Warmth"><PoleLiczby :model-value="stan.cieplo" :min="0" :max="100" jednostka="%" @update:model-value="ustaw('#cieplo', $event)" /></Pole>
      <Pole etykieta="Diffusion"><PoleLiczby :model-value="stan.rozproszenie" :min="0" :max="100" jednostka="%" @update:model-value="ustaw('#rozproszenie', $event)" /></Pole>
      <button type="button" :class="[przycisk, stan.zaslony ? 'bg-accent text-white' : 'bg-field text-text hover:bg-hover']" @click="nacisnij('#zaslonyToggle')"><Blinds :size="12" /> Close curtains</button>
    </Sekcja>

    <Sekcja tytul="Image">
      <Pole etykieta="Render priority"><Wybor :model-value="stan.priorytet" :opcje="stan.priorytety" @update:model-value="ustaw('#jakoscPoziom', $event)" /></Pole>
      <Pole etykieta="Exposure"><PoleLiczby :model-value="stan.ekspozycja" :min="0.35" :max="2.2" :krok="0.01" @update:model-value="ustaw('#ekspozycja', $event)" /></Pole>
      <Pole etykieta="Perspective">
        <Segmenty :model-value="stan.perspektywa" :opcje="[{ wartosc: 'interactive', etykieta: 'Free' }, { wartosc: 'arch_photo', etykieta: 'Straight verticals' }]" @update:model-value="ustaw('#trybKamery', $event)" />
      </Pole>
      <Pole v-if="stan.perspektywa === 'arch_photo'" etykieta="Lens shift"><PoleLiczby :model-value="stan.przesuniecie" :min="-20" :max="20" jednostka="%" @update:model-value="ustaw('#lensShiftY', $event)" /></Pole>
      <div class="grid grid-cols-2 gap-1">
        <button type="button" :class="[przycisk, stan.gora ? 'bg-accent text-white' : 'bg-field text-text hover:bg-hover']" @click="nacisnij('#widokToggle')">Top view</button>
        <button type="button" :class="[przycisk, stan.mapa ? 'bg-accent text-white' : 'bg-field text-text hover:bg-hover']" @click="przelaczMape"><Map :size="12" /> Map</button>
      </div>
    </Sekcja>
  </div>
</template>
