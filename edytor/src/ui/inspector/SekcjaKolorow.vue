<script setup lang="ts">
import { Image, Palette } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

import { palety } from '@/data/mieszkanie'
import { $wersjaMaterialow, grupyMaterialow, koloryZaznaczenia, zmienKolor, type KolorZaznaczenia } from '@/silnik/materialyMebla'
import { $silnik } from '@/silnik/most'
import SekcjaF from '@/ui/figma/SekcjaF.vue'
import WyborKoloru from '@/ui/kolor/WyborKoloru.vue'

/* Figma „Selection colors”: wszystkie kolory zaznaczonego mebla. Zmiana koloru obejmuje każdą grupę elementów,
   która go używa (także drugi kolor wzoru). Paleta z projektu przypisuje kolory w kolejności powierzchni grup. */
const props = defineProps<{ mebel: string }>()
const silnik = useStore($silnik)
const wersja = useStore($wersjaMaterialow)
const wszystkie = ref(false)
const kolory = computed(() => (void wersja.value, koloryZaznaczenia(grupyMaterialow(silnik.value, props.mebel))))
const widoczne = computed(() => (wszystkie.value ? kolory.value : kolory.value.slice(0, 5)))

// Podgląd na żywo podczas przeciągania; duża zmiana (miniatury, mapa) dopiero po zatwierdzeniu.
const edytowany = ref<KolorZaznaczenia | null>(null)
function podglad(k: KolorZaznaczenia, hex: string) {
  zmienKolor(silnik.value, props.mebel, edytowany.value ?? k, hex)
  edytowany.value = koloryZaznaczenia(grupyMaterialow(silnik.value, props.mebel)).find((x) => x.hex === hex.toLowerCase()) ?? null
}
function zatwierdz(hex: string) {
  if (edytowany.value) zmienKolor(silnik.value, props.mebel, edytowany.value, hex, { duza: true })
}
function zastosujPalete(id: string) {
  const paleta = palety.find((p) => p.id === id)
  if (!paleta) return
  kolory.value.forEach((k, i) => zmienKolor(silnik.value, props.mebel, k, paleta.kolory[i % paleta.kolory.length].hex, { duza: true }))
}
</script>

<template>
  <SekcjaF tytul="Selection colors">
    <template #akcje>
      <PopoverRoot>
        <PopoverTrigger class="flex size-6 items-center justify-center rounded-[5px] text-[#c9ccd2] outline-none hover:bg-white/5 hover:text-white" title="Apply palette" aria-label="Apply palette">
          <Palette :size="14" />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent side="left" align="start" :side-offset="12" class="z-50 w-[240px] rounded-[13px] bg-[#1e1e1e] p-2 text-white shadow-[0_10px_30px_rgba(0,0,0,.45)] outline-none ring-1 ring-white/10">
            <p class="px-2 pb-2 pt-1 text-[11px] text-[#a4a7ae]">Apply a project palette to this furniture</p>
            <button v-for="p in palety" :key="p.id" type="button" class="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left hover:bg-white/5" @click="zastosujPalete(p.id)">
              <span class="flex h-5 w-20 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-white/10"><i v-for="k in p.kolory" :key="k.rola" class="flex-1" :style="{ background: k.hex }" /></span>
              <span class="truncate text-[12px]">{{ p.nazwa }}</span>
            </button>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </template>
    <p v-if="!kolory.length" class="text-[11px] text-[#a4a7ae]">Waiting for the scene…</p>
    <div v-for="(k, i) in widoczne" :key="i" class="grid h-7 grid-cols-[1fr_auto] items-center gap-2">
      <PopoverRoot @update:open="(o) => (edytowany = o ? k : null)">
        <PopoverTrigger class="flex h-6 min-w-0 items-center gap-2 rounded-[5px] bg-[#2c2e34] pl-1 pr-2 text-left outline-none hover:ring-1 hover:ring-[#44474e] data-[state=open]:ring-1 data-[state=open]:ring-[#0d99ff]">
          <span class="relative size-4 shrink-0 rounded-[3px] ring-1 ring-inset ring-white/15" :style="{ background: k.hex }">
            <Image v-if="k.teksturowy" :size="9" class="absolute -bottom-1 -right-1 rounded-[2px] bg-[#2c2e34] p-px text-white" />
          </span>
          <span class="flex-1 truncate text-[11px] uppercase tabular-nums text-white">{{ k.hex.slice(1) }}</span>
          <span class="text-[11px] tabular-nums text-[#a4a7ae]">100 %</span>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent side="left" align="start" :side-offset="12" class="z-50 outline-none">
            <WyborKoloru :model-value="edytowany?.hex ?? k.hex" @update:model-value="podglad(k, $event)" @koniec="zatwierdz" />
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <span class="w-14 text-right text-[10.5px] tabular-nums text-[#a4a7ae]" :title="`${k.elementy} elements${k.teksturowy ? ' · tints a texture' : ''}`">{{ k.elementy }} el.</span>
    </div>
    <button v-if="kolory.length > 5" type="button" class="h-6 self-start text-[11px] text-[#c9ccd2] hover:text-white" @click="wszystkie = !wszystkie">
      {{ wszystkie ? 'Show fewer' : `See all ${kolory.length} colors` }}
    </button>
  </SekcjaF>
</template>
