<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { ref, watchEffect } from 'vue'

import type { UstawieniaMaterialu } from '@/meble/material'
import { kulka } from '@/silnik/kulki'
import { $silnik } from '@/silnik/most'

/* Kulka materiału (D5): render z silnika; do czasu renderu — kula CSS w kolorze bazowym. */
const props = withDefaults(defineProps<{ ustawienia: UstawieniaMaterialu; zrodlo?: unknown; rozmiar?: number }>(), { rozmiar: 28 })
const silnik = useStore($silnik)
const obraz = ref<string | null>(null)
watchEffect((onCleanup) => {
  let aktualne = true
  onCleanup(() => (aktualne = false))
  kulka(silnik.value, props.ustawienia, props.zrodlo).then((url) => aktualne && url && (obraz.value = url))
})
</script>

<template>
  <span class="relative block shrink-0 rounded-full" :style="{ width: `${rozmiar}px`, height: `${rozmiar}px` }">
    <img v-if="obraz" :src="obraz" alt="" class="size-full" draggable="false" />
    <span v-else class="block size-full rounded-full" :style="{ background: `radial-gradient(circle at 35% 30%, #fff8 0, ${ustawienia.kolor} 38%, #000c 100%)` }" />
  </span>
</template>
