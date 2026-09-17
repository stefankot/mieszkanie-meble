<script setup lang="ts">
import { Component, Diamond, DoorClosed, DoorOpen, Grid3x3 } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { computed, ref } from 'vue'

import { zmienUklad, type KomponentPowtarzany, type UkladMebla } from '@/meble/uklad'
import { $silnik } from '@/silnik/most'
import GrupaF from '@/ui/figma/GrupaF.vue'
import GrupaIkonF from '@/ui/figma/GrupaIkonF.vue'
import PrzyciskF from '@/ui/figma/PrzyciskF.vue'
import SekcjaF from '@/ui/figma/SekcjaF.vue'
import SuwakF from '@/ui/figma/SuwakF.vue'
import WyborF from '@/ui/figma/WyborF.vue'

/* Komponent powtarzany N razy (jak komponent i instancje w Figmie): właściwości głównej definicji
   (uchwyt, kierunek, szkło) dotyczą wszystkich kopii; lista kopii ma duże kontrolki stanu.
   Stany drzwi pochodzą z silnika (interakcje.ruchy), gdy mebel ma mechanizmy. */
const props = defineProps<{ mebel: string; uklad: UkladMebla; komponent: KomponentPowtarzany }>()
const silnik = useStore($silnik)
const odswiez = ref(0)

const zmienKomponent = (z: Partial<KomponentPowtarzany>) =>
  zmienUklad(props.mebel, { komponenty: props.uklad.komponenty.map((k) => (k.id === props.komponent.id ? { ...k, ...z } : k)) })

const kopie = computed(() => {
  void odswiez.value
  // Kopie drzwi = mechanizmy mebla typu zawias (np. „Drzwiczki R1 C1”); inne mechanizmy (blat, szuflady) nie są drzwiami.
  const ruchy = silnik.value?.interakcje.ruchy().filter((r) => r.mebel === props.mebel && r.ruch.typ === 'hinge' && /drzwi|door/i.test(`${r.ruch.id} ${r.ruch.etykieta}`)) ?? []
  if (ruchy.length && props.komponent.id === 'door')
    return ruchy.map((r) => ({ id: r.ruch.id as string, nazwa: r.ruch.etykieta as string, otwarta: (r.ruch.cel ?? r.ruch.wartosc ?? 0) > 0.5, ruch: r.ruch }))
  return Array.from({ length: props.komponent.ile }, (_, i) => ({ id: `${props.komponent.id}-${i}`, nazwa: `${props.komponent.nazwa} ${i + 1}`, otwarta: false, ruch: null }))
})

function ustawStan(ruch: unknown, otwarta: boolean) {
  if (ruch) silnik.value?.interakcje.ustaw(ruch, otwarta ? 1 : 0)
  setTimeout(() => odswiez.value++, 50)
}
</script>

<template>
  <SekcjaF :tytul="komponent.nazwa">
    <template #akcje>
      <span class="flex h-5 items-center gap-1 rounded-[4px] bg-[#3b2f5e] px-1.5 text-[10.5px] text-[#c9b6ff]"><Component :size="11" /> Component</span>
    </template>

    <GrupaF etykieta="Repeat">
      <SuwakF :model-value="komponent.ile" :min="1" :max="24" prefiks="×" @update:model-value="zmienKomponent({ ile: $event })" />
      <PrzyciskF :ikona="Grid3x3" opis="Follow shelf grid" :aktywny="komponent.uklad === 'siatka'" @click="zmienKomponent({ uklad: komponent.uklad === 'siatka' ? 'wiersze' : 'siatka' })" />
    </GrupaF>

    <div class="grid grid-cols-[72px_1fr] items-center gap-x-2 gap-y-1.5 pt-1">
      <span class="text-[11px] text-[#a4a7ae]">Handle</span>
      <WyborF :model-value="komponent.uchwyt" :opcje="[{ wartosc: 'groove', etykieta: 'Groove' }, { wartosc: 'knob', etykieta: 'Knob' }, { wartosc: 'push', etykieta: 'Push to open' }]" @update:model-value="zmienKomponent({ uchwyt: $event as KomponentPowtarzany['uchwyt'] })" />
      <span class="text-[11px] text-[#a4a7ae]">Opening</span>
      <GrupaIkonF :model-value="komponent.otwieranie" :opcje="[{ wartosc: 'left', etykieta: 'Left', opis: 'Hinge on the left' }, { wartosc: 'right', etykieta: 'Right', opis: 'Hinge on the right' }]" @update:model-value="zmienKomponent({ otwieranie: $event as 'left' | 'right' })" />
      <span class="text-[11px] text-[#a4a7ae]">Glass</span>
      <SwitchRoot :model-value="komponent.szklo" class="flex h-4 w-7 items-center rounded-full bg-[#44474e] px-0.5 outline-none data-[state=checked]:bg-[#0d99ff]" @update:model-value="zmienKomponent({ szklo: $event })">
        <SwitchThumb class="size-3 rounded-full bg-white transition-transform data-[state=checked]:translate-x-3" />
      </SwitchRoot>
    </div>

    <div class="mt-2 flex h-5 items-center justify-between text-[11px] text-[#a4a7ae]">
      <span>Instances</span><span class="tabular-nums">{{ kopie.length }}</span>
    </div>
    <ul class="-mx-[13px] flex flex-col">
      <li v-for="k in kopie" :key="k.id" class="flex h-9 items-center gap-2.5 px-[13px] hover:bg-white/[0.04]">
        <Diamond :size="14" :stroke-width="1.75" class="shrink-0 text-[#a78bfa]" />
        <span class="min-w-0 flex-1 truncate text-[12px] text-white">{{ k.nazwa }}</span>
        <GrupaIkonF
          class="w-[76px] shrink-0"
          :model-value="k.otwarta ? 'open' : 'closed'"
          :opcje="[{ wartosc: 'closed', ikona: DoorClosed, opis: 'Closed' }, { wartosc: 'open', ikona: DoorOpen, opis: 'Open' }]"
          @update:model-value="ustawStan(k.ruch, $event === 'open')"
        />
      </li>
    </ul>
  </SekcjaF>
</template>
