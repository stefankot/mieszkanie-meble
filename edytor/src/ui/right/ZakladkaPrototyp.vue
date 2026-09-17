<script setup lang="ts">
import { ChevronDown, DoorClosed, DoorOpen, Lamp, LampCeiling, MousePointerClick, Play, X } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger, SwitchRoot, SwitchThumb } from 'reka-ui'
import { computed, ref } from 'vue'

import { obiekty } from '@/data/mieszkanie'
import { $silnik } from '@/silnik/most'
import { zmienProjekt } from '@/projekt/projekt'
import { parametrySwiatla, swiatlaMebli, swiatlaPokoi } from '@/silnik/swiatla'
import { $tryb, $zaznaczenie } from '@/stan'
import GrupaF from '@/ui/figma/GrupaF.vue'
import GrupaIkonF from '@/ui/figma/GrupaIkonF.vue'
import PoleF from '@/ui/figma/PoleF.vue'
import PudelkoF from '@/ui/figma/PudelkoF.vue'
import SekcjaF from '@/ui/figma/SekcjaF.vue'
import WyborF from '@/ui/figma/WyborF.vue'

/* Figma „Prototype” dla mieszkania: interakcje pogrupowane według mebli — ruchy (drzwi, szuflady, klapy)
   i listwy LED danego mebla; na końcu oświetlenie mieszkania (lampy sufitowe pokoi). Stany działają na silniku.
   Wyzwalacz, czas i łagodzenie — makieta ustawień animacji. */
const silnik = useStore($silnik)
const zaznaczenie = useStore($zaznaczenie)
const tylkoZaznaczony = ref(false)
const odswiez = ref(0)
const czas = ref(600)
const lagodzenie = ref('ease-in-out')
const wyzwalacz = ref('click')
const pomoc = ref({ interakcje: true, spacer: true })

type Grupa = { id: string; nazwa: string; ruchy: { id: string; etykieta: string; typ: string; otwarty: boolean; ruch: unknown }[]; swiatla: ReturnType<typeof swiatlaMebli> extends Map<string, infer S> ? S : never }
const grupy = computed(() => {
  void odswiez.value
  const s = silnik.value
  const ledy = swiatlaMebli(s)
  const mapa = new Map<string, Grupa>()
  const grupa = (id: string, nazwa?: string) => {
    if (!mapa.has(id)) mapa.set(id, { id, nazwa: nazwa ?? obiekty.find((o) => o.id === id)?.nazwa ?? id, ruchy: [], swiatla: ledy.get(id) ?? [] })
    return mapa.get(id)!
  }
  for (const r of s?.interakcje.ruchy() ?? []) {
    grupa(r.mebel, r.nazwaMebla).ruchy.push({ id: r.ruch.id, etykieta: r.ruch.etykieta, typ: r.ruch.typ, otwarty: (r.ruch.cel ?? r.ruch.wartosc ?? 0) > 0.5, ruch: r.ruch })
  }
  for (const id of ledy.keys()) grupa(id)
  return [...mapa.values()].filter((g) => !tylkoZaznaczony.value || g.id === zaznaczenie.value)
})
const lampy = computed(() => (void odswiez.value, tylkoZaznaczony.value ? [] : swiatlaPokoi(silnik.value)))
const liczba = computed(() => grupy.value.reduce((a, g) => a + g.ruchy.length + g.swiatla.length, 0) + lampy.value.length)
const przelicz = () => setTimeout(() => odswiez.value++, 60)

function ustaw(ruch: unknown, otwarty: boolean) {
  if (ruch) silnik.value?.interakcje.ustaw(ruch, otwarty ? 1 : 0)
  setTimeout(() => odswiez.value++, 60)
}
function wszystkie(ruchy: { ruch: unknown }[], otwarte: boolean) {
  for (const r of ruchy) silnik.value?.interakcje.ustaw(r.ruch, otwarte ? 1 : 0)
  setTimeout(() => odswiez.value++, 60)
}
function swiatloMebla(sw: Grupa['swiatla'][number], wlaczone: boolean) {
  zmienProjekt(`${wlaczone ? 'Turn on' : 'Turn off'} ${sw.etykieta}`, (d) => (d.swiatla[sw.id] = { ...parametrySwiatla(sw), wlaczone }))
  przelicz()
}
function lampa(l: ReturnType<typeof swiatlaPokoi>[number], wlaczone: boolean) {
  zmienProjekt(`${wlaczone ? 'Turn on' : 'Turn off'} ${l.etykieta}`, (d) => (d.swiatla[l.id] = { ...parametrySwiatla(l), wlaczone }))
  przelicz()
}
</script>

<template>
  <div>
    <SekcjaF tytul="Interactions">
      <template #akcje><span class="text-[11px] tabular-nums text-[#a4a7ae]">{{ liczba }}</span></template>
      <PudelkoF v-model="tylkoZaznaczony" etykieta="Selected furniture only" />
      <p v-if="!grupy.length" class="text-[11px] text-[#a4a7ae]">No moving parts{{ tylkoZaznaczony ? ' in the selection' : '' }}.</p>
      <CollapsibleRoot v-for="g in grupy" :key="g.id" v-slot="{ open }" :default-open="g.id === zaznaczenie || grupy.length === 1" class="-mx-[13px] border-t border-[#2a2c31]">
        <div class="flex h-9 items-center gap-2 px-[13px]">
          <CollapsibleTrigger class="flex min-w-0 flex-1 items-center gap-2 text-left outline-none">
            <ChevronDown :size="12" class="shrink-0 text-[#a4a7ae] transition-transform" :class="open ? '' : '-rotate-90'" />
            <span class="truncate text-[12px] font-medium text-white">{{ g.nazwa }}</span>
            <span class="text-[11px] text-[#a4a7ae]">{{ g.ruchy.length + g.swiatla.length }}</span>
          </CollapsibleTrigger>
          <template v-if="g.ruchy.length">
          <button type="button" title="Close all" aria-label="Close all" class="flex size-6 items-center justify-center rounded-[5px] text-[#c9ccd2] hover:bg-white/5 hover:text-white" @click="wszystkie(g.ruchy, false)"><DoorClosed :size="13" /></button>
          <button type="button" title="Open all" aria-label="Open all" class="flex size-6 items-center justify-center rounded-[5px] text-[#c9ccd2] hover:bg-white/5 hover:text-white" @click="wszystkie(g.ruchy, true)"><DoorOpen :size="13" /></button>
          </template>
        </div>
        <CollapsibleContent>
          <div v-for="r in g.ruchy" :key="r.id" class="flex h-10 items-center gap-2.5 pl-[33px] pr-[13px] hover:bg-white/[0.03]">
            <MousePointerClick :size="13" class="shrink-0 text-[#8cc8ff]" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[12px] text-white">{{ r.etykieta }}</span>
              <span class="block text-[10.5px] text-[#a4a7ae]">On click → {{ r.typ === 'slide' ? 'Slide out' : 'Swing open' }}</span>
            </span>
            <GrupaIkonF
              class="w-[76px] shrink-0"
              :model-value="r.otwarty ? 'open' : 'closed'"
              :opcje="[{ wartosc: 'closed', ikona: DoorClosed, opis: 'Closed' }, { wartosc: 'open', ikona: DoorOpen, opis: 'Open' }]"
              @update:model-value="ustaw(r.ruch, $event === 'open')"
            />
          </div>
          <div v-for="sw in g.swiatla" :key="sw.id" class="flex h-10 items-center gap-2.5 pl-[33px] pr-[13px] hover:bg-white/[0.03]">
            <Lamp :size="13" class="shrink-0 text-[#ffc582]" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[12px] text-white">{{ sw.etykieta }}</span>
              <span class="block text-[10.5px] text-[#a4a7ae]">{{ sw.gniazda.length }} strip{{ sw.gniazda.length > 1 ? 's' : '' }} · On click → Toggle</span>
            </span>
            <SwitchRoot :model-value="sw.wlaczone" :aria-label="sw.etykieta" class="relative h-4 w-7 shrink-0 rounded-full bg-[#3a3d44] outline-none data-[state=checked]:bg-[#0d99ff]" @update:model-value="swiatloMebla(sw, $event)">
              <SwitchThumb class="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]" />
            </SwitchRoot>
          </div>
        </CollapsibleContent>
      </CollapsibleRoot>
      <CollapsibleRoot v-if="lampy.length" v-slot="{ open }" :default-open="true" class="-mx-[13px] border-t border-[#2a2c31]">
        <CollapsibleTrigger class="flex h-9 w-full items-center gap-2 px-[13px] text-left outline-none">
          <ChevronDown :size="12" class="shrink-0 text-[#a4a7ae] transition-transform" :class="open ? '' : '-rotate-90'" />
          <span class="flex-1 truncate text-[12px] font-medium text-white">Apartment lighting</span>
          <span class="text-[11px] text-[#a4a7ae]">{{ lampy.length }}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div v-for="l in lampy" :key="l.id" class="flex h-10 items-center gap-2.5 pl-[33px] pr-[13px] hover:bg-white/[0.03]">
            <LampCeiling :size="13" class="shrink-0 text-[#ffc582]" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[12px] text-white">{{ l.etykieta }}</span>
              <span class="block text-[10.5px] text-[#a4a7ae]">Ceiling light · On click → Toggle</span>
            </span>
            <SwitchRoot :model-value="l.wlaczone" :aria-label="l.etykieta" class="relative h-4 w-7 shrink-0 rounded-full bg-[#3a3d44] outline-none data-[state=checked]:bg-[#0d99ff]" @update:model-value="lampa(l, $event)">
              <SwitchThumb class="block size-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px]" />
            </SwitchRoot>
          </div>
        </CollapsibleContent>
      </CollapsibleRoot>
    </SekcjaF>

    <SekcjaF tytul="Animation">
      <div class="grid grid-cols-[72px_1fr] items-center gap-x-2 gap-y-1.5">
        <span class="text-[11px] text-[#a4a7ae]">Trigger</span>
        <WyborF v-model="wyzwalacz" :opcje="[{ wartosc: 'click', etykieta: 'On click' }, { wartosc: 'hover', etykieta: 'While hovering' }, { wartosc: 'dot', etykieta: 'White dot only' }]" />
        <span class="text-[11px] text-[#a4a7ae]">Easing</span>
        <WyborF v-model="lagodzenie" :opcje="[{ wartosc: 'ease-in-out', etykieta: 'Ease in and out' }, { wartosc: 'ease-out', etykieta: 'Ease out' }, { wartosc: 'spring', etykieta: 'Gentle spring' }]" />
      </div>
      <GrupaF etykieta="Duration" kolumny="grid-cols-[1fr_24px]">
        <PoleF v-model="czas" prefiks="⏱" jednostka="ms" :min="100" :max="3000" :krok="50" />
        <span />
      </GrupaF>
    </SekcjaF>

    <section v-if="pomoc.interakcje" class="border-b border-[#34363c] px-[13px] pb-4">
      <div class="flex h-10 items-center"><h3 class="flex-1 text-[12px] font-semibold text-white">Creating an interaction</h3><button type="button" aria-label="Dismiss" class="text-[#c9ccd2] hover:text-white" @click="pomoc.interakcje = false"><X :size="14" /></button></div>
      <p class="flex gap-3 text-[12px] leading-relaxed text-[#c9ccd2]"><MousePointerClick :size="18" class="mt-0.5 shrink-0" />Every door, drawer and flap is an interaction. Set its state here or click the white dot next to it in the scene.</p>
    </section>
    <section v-if="pomoc.spacer" class="px-[13px] pb-4">
      <div class="flex h-10 items-center"><h3 class="flex-1 text-[12px] font-semibold text-white">Walking through</h3><button type="button" aria-label="Dismiss" class="text-[#c9ccd2] hover:text-white" @click="pomoc.spacer = false"><X :size="14" /></button></div>
      <p class="flex gap-3 text-[12px] leading-relaxed text-[#c9ccd2]"><Play :size="18" class="mt-0.5 shrink-0" />Use Walk to play the apartment: interactions respond to clicks and white dots, without editing tools.</p>
      <button type="button" class="mt-3 h-8 w-full rounded-[6px] ring-1 ring-[#4a4d55] text-[12px] text-white hover:bg-white/5" @click="$tryb.set('walk')">Start walk</button>
    </section>
  </div>
</template>
