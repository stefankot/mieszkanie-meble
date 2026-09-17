<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

import type { UstawieniaMaterialu } from '@/meble/material'
import GrupaIkonF from '@/ui/figma/GrupaIkonF.vue'
import WyborF from '@/ui/figma/WyborF.vue'

import PoleKoloru from './PoleKoloru.vue'
import PoleTekstury from './PoleTekstury.vue'
import SuwakMaterialu from './SuwakMaterialu.vue'

/* Custom: Base (Solid | Texture | Pattern), Surface, Relief (bump, height field tracing, generatywne wypukłości),
   Imperfections i Mapping. Każda zmiana dotyczy całej grupy elementów. */
const props = defineProps<{ zrodlo?: { map?: unknown; colorNode?: unknown } }>()
const u = defineModel<UstawieniaMaterialu>({ required: true })
const maSkan = !!(props.zrodlo?.map || props.zrodlo?.colorNode)
const WZORY = [
  { wartosc: 'stripes', etykieta: 'Stripes' },
  { wartosc: 'checker', etykieta: 'Checker' },
  { wartosc: 'grid', etykieta: 'Grid' },
  { wartosc: 'dots', etykieta: 'Dots' },
  { wartosc: 'herringbone', etykieta: 'Herringbone' },
  { wartosc: 'terrazzo', etykieta: 'Terrazzo' }
]
</script>

<template>
  <div class="flex flex-col">
    <section class="flex flex-col gap-1.5 border-b border-[#2c2c2c] p-3">
      <h4 class="text-[11px] font-semibold">Base</h4>
      <GrupaIkonF
        :model-value="u.baza"
        :opcje="[{ wartosc: 'solid', etykieta: 'Solid', opis: 'Solid color' }, { wartosc: 'texture', etykieta: 'Texture', opis: 'Texture image' }, { wartosc: 'pattern', etykieta: 'Pattern', opis: 'Procedural pattern' }]"
        @update:model-value="u.baza = $event as UstawieniaMaterialu['baza']"
      />
      <PoleKoloru v-if="u.baza !== 'pattern'" v-model="u.kolor" :etykieta="u.baza === 'texture' ? 'Tint' : 'Color'" />
      <template v-if="u.baza === 'texture'">
        <PoleTekstury v-model:zrodlo="u.tekstura.zrodlo" v-model:url="u.tekstura.url" :ma-skan="maSkan" />
        <SuwakMaterialu v-model="u.tekstura.ekspozycja" etykieta="Exposure" :min="-1" :max="1" />
        <SuwakMaterialu v-model="u.tekstura.kontrast" etykieta="Contrast" :min="-1" :max="1" />
        <SuwakMaterialu v-model="u.tekstura.nasycenie" etykieta="Saturation" :min="-1" :max="1" />
        <SuwakMaterialu v-model="u.tekstura.temperatura" etykieta="Temperature" :min="-1" :max="1" />
        <SuwakMaterialu v-model="u.tekstura.odcien" etykieta="Tint shift" :min="-1" :max="1" />
        <SuwakMaterialu v-model="u.tekstura.swiatla" etykieta="Highlights" :min="-1" :max="1" />
        <SuwakMaterialu v-model="u.tekstura.cienie" etykieta="Shadows" :min="-1" :max="1" />
      </template>
      <template v-if="u.baza === 'pattern'">
        <div class="grid h-7 grid-cols-[76px_1fr] items-center gap-2">
          <span class="text-[11px] text-[#c9ccd2]">Pattern</span>
          <WyborF v-model="u.wzor.rodzaj" :opcje="WZORY" />
        </div>
        <PoleKoloru v-model="u.kolor" etykieta="Color 1" />
        <PoleKoloru v-model="u.wzor.kolor2" etykieta="Color 2" />
        <SuwakMaterialu v-model="u.wzor.proporcja" etykieta="Ratio" :min="0.05" :max="0.95" />
      </template>
    </section>

    <section class="flex flex-col gap-1.5 border-b border-[#2c2c2c] p-3">
      <h4 class="text-[11px] font-semibold">Surface</h4>
      <SuwakMaterialu v-model="u.powierzchnia.chropowatosc" etykieta="Roughness" :min="0" :max="1" jednostka=" %" />
      <SuwakMaterialu v-model="u.powierzchnia.metalicznosc" etykieta="Metallic" :min="0" :max="1" jednostka=" %" />
      <SuwakMaterialu v-model="u.powierzchnia.lakier" etykieta="Clearcoat" :min="0" :max="1" jednostka=" %" />
      <SuwakMaterialu v-model="u.powierzchnia.polysk" etykieta="Sheen" :min="0" :max="1" jednostka=" %" />
    </section>

    <section class="flex flex-col gap-1.5 border-b border-[#2c2c2c] p-3">
      <h4 class="text-[11px] font-semibold">Relief</h4>
      <SuwakMaterialu v-if="u.baza === 'texture'" v-model="u.relief.wypuklosc" etykieta="Bump" :min="0" :max="1" jednostka=" %" />
      <label class="flex h-7 items-center justify-between text-[11px] text-[#c9ccd2]" :title="u.mapowanie.trojplanarne ? 'Works with UV mapping (turn Triplanar off)' : ''">
        Height field tracing
        <SwitchRoot v-model="u.relief.sledzenieWysokosci" :disabled="u.baza !== 'texture'" class="relative h-4 w-7 rounded-full bg-[#3a3d44] outline-none disabled:opacity-40 data-[state=checked]:bg-[#0d99ff]"><SwitchThumb class="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]" /></SwitchRoot>
      </label>
      <SuwakMaterialu v-if="u.relief.sledzenieWysokosci && u.baza === 'texture'" v-model="u.relief.glebokosc" etykieta="Depth" :min="0" :max="1" jednostka=" %" />
      <label class="flex h-7 items-center justify-between text-[11px] text-[#c9ccd2]">
        Generative bumps
        <SwitchRoot v-model="u.relief.generatywne" class="relative h-4 w-7 rounded-full bg-[#3a3d44] outline-none data-[state=checked]:bg-[#0d99ff]"><SwitchThumb class="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]" /></SwitchRoot>
      </label>
      <template v-if="u.relief.generatywne">
        <SuwakMaterialu v-model="u.relief.skalaSzumu" etykieta="Scale" :min="0.2" :max="50" :krok="0.1" :mnoznik="1" jednostka=" cm" />
        <SuwakMaterialu v-model="u.relief.silaSzumu" etykieta="Strength" :min="0" :max="1" jednostka=" %" />
        <SuwakMaterialu v-model="u.relief.ziarno" etykieta="Seed" :min="1" :max="99" :krok="1" :mnoznik="1" />
      </template>
    </section>

    <section class="flex flex-col gap-1.5 border-b border-[#2c2c2c] p-3">
      <label class="flex h-6 items-center justify-between">
        <h4 class="text-[11px] font-semibold">Imperfections</h4>
        <SwitchRoot v-model="u.niedoskonalosci.wlaczone" aria-label="Imperfections" class="relative h-4 w-7 rounded-full bg-[#3a3d44] outline-none data-[state=checked]:bg-[#0d99ff]"><SwitchThumb class="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]" /></SwitchRoot>
      </label>
      <template v-if="u.niedoskonalosci.wlaczone">
        <SuwakMaterialu v-model="u.niedoskonalosci.kurz" etykieta="Dust" :min="0" :max="1" jednostka=" %" />
        <SuwakMaterialu v-model="u.niedoskonalosci.smugi" etykieta="Smudges" :min="0" :max="1" jednostka=" %" />
        <SuwakMaterialu v-model="u.niedoskonalosci.rysy" etykieta="Scratches" :min="0" :max="1" jednostka=" %" />
        <SuwakMaterialu v-model="u.niedoskonalosci.wytarcie" etykieta="Wear" :min="0" :max="1" jednostka=" %" />
      </template>
    </section>

    <section class="flex flex-col gap-1.5 p-3">
      <h4 class="text-[11px] font-semibold">Mapping</h4>
      <SuwakMaterialu v-model="u.mapowanie.skala" etykieta="Scale" :min="1" :max="400" :krok="1" :mnoznik="1" jednostka=" cm" />
      <SuwakMaterialu v-model="u.mapowanie.obrot" etykieta="Rotation" :min="0" :max="180" :krok="1" :mnoznik="1" jednostka="°" />
      <label class="flex h-7 items-center justify-between text-[11px] text-[#c9ccd2]">
        Triplanar
        <SwitchRoot v-model="u.mapowanie.trojplanarne" class="relative h-4 w-7 rounded-full bg-[#3a3d44] outline-none data-[state=checked]:bg-[#0d99ff]"><SwitchThumb class="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]" /></SwitchRoot>
      </label>
    </section>
  </div>
</template>
