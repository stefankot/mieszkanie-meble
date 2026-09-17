<script setup lang="ts">
import { AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, AlignHorizontalSpaceAround, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, FlipHorizontal2, FlipVertical2, Magnet, RotateCw } from '@lucide/vue'
import { ref } from 'vue'

import GrupaF from '@/ui/figma/GrupaF.vue'
import GrupaIkonF from '@/ui/figma/GrupaIkonF.vue'
import PoleF from '@/ui/figma/PoleF.vue'
import PrzyciskF from '@/ui/figma/PrzyciskF.vue'
import SekcjaF from '@/ui/figma/SekcjaF.vue'

/* Figma „Position” przeniesione na plan mieszkania: wyrównanie do ściany, X/Y na planie (mm),
   przyciąganie do ścian, obrót z szybkimi akcjami (90°, odbicia). */
const props = defineProps<{ x: number; y: number; obrot: number }>()
const x = ref(props.x)
const y = ref(props.y)
const obrot = ref(props.obrot)
const przyciaganie = ref(true)
</script>

<template>
  <SekcjaF tytul="Position">
    <GrupaF etykieta="Alignment">
      <GrupaIkonF :opcje="[{ wartosc: 'l', ikona: AlignHorizontalJustifyStart, opis: 'Align to wall start' }, { wartosc: 'c', ikona: AlignHorizontalJustifyCenter, opis: 'Center on wall' }, { wartosc: 'r', ikona: AlignHorizontalJustifyEnd, opis: 'Align to wall end' }]" />
      <GrupaIkonF :opcje="[{ wartosc: 't', ikona: AlignVerticalJustifyStart, opis: 'Against wall' }, { wartosc: 'm', ikona: AlignVerticalJustifyCenter, opis: 'Center in room' }, { wartosc: 'b', ikona: AlignVerticalJustifyEnd, opis: 'Away from wall' }]" />
      <PrzyciskF :ikona="AlignHorizontalSpaceAround" opis="Distribute along wall" />
    </GrupaF>
    <GrupaF etykieta="Position">
      <PoleF v-model="x" prefiks="X" :krok="10" />
      <PoleF v-model="y" prefiks="Y" :krok="10" />
      <PrzyciskF :ikona="Magnet" opis="Snap to walls" :aktywny="przyciaganie" @click="przyciaganie = !przyciaganie" />
    </GrupaF>
    <GrupaF etykieta="Rotation">
      <PoleF v-model="obrot" prefiks="∠" jednostka="°" :min="-360" :max="360" />
      <GrupaIkonF :opcje="[{ wartosc: 'rot', ikona: RotateCw, opis: 'Rotate 90°' }, { wartosc: 'fh', ikona: FlipHorizontal2, opis: 'Flip horizontal' }, { wartosc: 'fv', ikona: FlipVertical2, opis: 'Flip vertical' }]" @akcja="$event === 'rot' && (obrot = (obrot + 90) % 360)" />
      <span />
    </GrupaF>
  </SekcjaF>
</template>
