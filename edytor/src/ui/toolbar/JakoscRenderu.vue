<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { $silnik, opcjeKontrolki, ustawKontrolke, wartoscKontrolki } from '@/silnik/most'
import PoleLiczby from '@/ui/primitives/PoleLiczby.vue'
import Pole from '@/ui/primitives/Pole.vue'
import Przelacznik from '@/ui/primitives/Przelacznik.vue'
import Sekcja from '@/ui/primitives/Sekcja.vue'
import Segmenty from '@/ui/primitives/Segmenty.vue'
import Wiersz from '@/ui/primitives/Wiersz.vue'
import Wybor from '@/ui/primitives/Wybor.vue'

/* Jakość obrazu i renderu (dawna zakładka Effect) — pływające okno z ikony na pasku.
   Image: most do starego panelu renderera. Cinematic Motion: profil filmowy silnika (`__silnik.film`) —
   tempo 25 kl./s, rozmycie ruchu z bufora prędkości, głębia ostrości i ziarno. Global light: makieta. */
const PRIORYTETY: Record<string, string> = { minimalna: 'Smooth', srednia: 'Balanced', wysoka: 'High quality', photo_raster: 'Photo (still)' }
const priorytety = ref<{ wartosc: string; etykieta: string }[]>([])
const priorytet = ref('wysoka')
const ekspozycja = ref(0.72)
const perspektywa = ref('interactive')
const przesuniecie = ref(8)
const gi = ref(true)
const odbicia = ref(true)
const filmowy = ref(false)
const fps = ref('25')
const rozmycie = ref(true)
const silaRozmycia = ref(0.35)
const glebia = ref(true)
const przyslona = ref(2.8)
const ostroscCm = ref(320)
const ziarno = ref(true)
const silaZiarna = ref(0.12)
const lut = ref('warm')

/* Przysłona f/ → głębia ostrości w cm: im mniejsza liczba, tym płytsza ostrość. */
const glebiaZPrzyslony = (f: number) => Math.round(2200 / f)
function wyslijFilm(zmiana: Record<string, unknown> = {}) {
  const s = $silnik.get() as any
  s?.film?.ustaw({
    wlaczony: filmowy.value, fps: Number(fps.value), rozmycieRuchu: rozmycie.value, glebiaOstrosci: glebia.value,
    ziarno: ziarno.value, rozmycie: silaRozmycia.value, ziarnoSila: silaZiarna.value,
    ostroscCm: ostroscCm.value, glebiaCm: glebiaZPrzyslony(przyslona.value), ...zmiana
  })
}
watch([filmowy, fps, rozmycie, silaRozmycia, glebia, przyslona, ostroscCm, ziarno, silaZiarna], () => wyslijFilm())

function odczytaj() {
  priorytety.value = opcjeKontrolki('#jakoscPoziom').map((o) => ({ wartosc: o.wartosc, etykieta: PRIORYTETY[o.wartosc] ?? o.etykieta }))
  priorytet.value = wartoscKontrolki('#jakoscPoziom') || priorytet.value
  ekspozycja.value = Number(wartoscKontrolki('#ekspozycja') || ekspozycja.value)
  perspektywa.value = wartoscKontrolki('#trybKamery') || perspektywa.value
  przesuniecie.value = Number(wartoscKontrolki('#lensShiftY') || przesuniecie.value)
}
let zegar = 0
onMounted(() => {
  odczytaj()
  zegar = window.setInterval(odczytaj, 600)
})
onBeforeUnmount(() => clearInterval(zegar))
const ustaw = (sel: string, v: string | number) => {
  ustawKontrolke(sel, v)
  setTimeout(odczytaj, 60)
}
</script>

<template>
  <div class="max-h-[min(640px,calc(100vh-120px))] w-[250px] overflow-y-auto rounded-[10px] bg-[#1b1d22] pb-1 shadow-2xl ring-1 ring-black/50">
    <div class="flex h-10 items-center px-3 text-[12px] font-semibold text-white">Render quality</div>
    <Sekcja tytul="Image">
      <Pole etykieta="Render Priority"><Wybor :model-value="priorytet" :opcje="priorytety" @update:model-value="ustaw('#jakoscPoziom', $event)" /></Pole>
      <Pole etykieta="Exposure"><PoleLiczby :model-value="ekspozycja" :min="0.35" :max="2.2" :krok="0.01" @update:model-value="ustaw('#ekspozycja', $event)" /></Pole>
      <Pole etykieta="Perspective">
        <Segmenty :model-value="perspektywa" :opcje="[{ wartosc: 'interactive', etykieta: 'Free' }, { wartosc: 'arch_photo', etykieta: 'Straight verticals' }]" @update:model-value="ustaw('#trybKamery', $event)" />
      </Pole>
      <Pole v-if="perspektywa === 'arch_photo'" etykieta="Lens Shift"><PoleLiczby :model-value="przesuniecie" :min="-20" :max="20" jednostka="%" @update:model-value="ustaw('#lensShiftY', $event)" /></Pole>
    </Sekcja>
    <Sekcja tytul="Global Light">
      <Wiersz etykieta="Global Illumination"><Przelacznik v-model="gi" /></Wiersz>
      <Wiersz etykieta="Reflections"><Przelacznik v-model="odbicia" /></Wiersz>
    </Sekcja>
    <Sekcja tytul="Cinematic Motion">
      <Wiersz etykieta="Cinematic profile"><Przelacznik v-model="filmowy" /></Wiersz>
      <Pole etykieta="Target Frame Rate"><Segmenty v-model="fps" :opcje="[{ wartosc: '25', etykieta: '25 FPS' }, { wartosc: '30', etykieta: '30' }, { wartosc: '60', etykieta: '60' }]" /></Pole>
      <Wiersz etykieta="Motion Blur"><Przelacznik v-model="rozmycie" /></Wiersz>
      <Pole v-if="rozmycie" etykieta="Intensity"><PoleLiczby v-model="silaRozmycia" :min="0" :max="1" :krok="0.01" /></Pole>
      <Wiersz etykieta="Depth of Field"><Przelacznik v-model="glebia" /></Wiersz>
      <Pole v-if="glebia" etykieta="Aperture"><PoleLiczby v-model="przyslona" :min="1.4" :max="16" :krok="0.1" os="f/" /></Pole>
      <Pole v-if="glebia" etykieta="Focus distance"><PoleLiczby v-model="ostroscCm" :min="50" :max="1200" :krok="10" jednostka=" cm" /></Pole>
      <Wiersz etykieta="Film Grain"><Przelacznik v-model="ziarno" /></Wiersz>
      <Pole v-if="ziarno" etykieta="Amount"><PoleLiczby v-model="silaZiarna" :min="0" :max="1" :krok="0.01" /></Pole>
      <Pole etykieta="LUT"><Wybor v-model="lut" :opcje="[{ wartosc: 'none', etykieta: 'None' }, { wartosc: 'warm', etykieta: 'Warm Cinema' }, { wartosc: 'cool', etykieta: 'Cool Morning' }]" /></Pole>
    </Sekcja>
  </div>
</template>
