<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { computed } from 'vue'

import { obiekty } from '@/data/mieszkanie'
import { $zaznaczenie } from '@/stan'
import InspektorMebla from '@/ui/inspector/InspektorMebla.vue'


/* Inspector: mebel parametryczny (także gdy zaznaczono jego moduł lub mechanizm) → układ Figma UI3
   z kolorami i materiałami zaznaczenia. */
const zaznaczenie = useStore($zaznaczenie)
const mebel = computed(() => {
  const id = zaznaczenie.value
  if (!id) return null
  return obiekty.find((o) => o.id === id || o.dzieci?.some((d) => d.id === id))?.id ?? null
})
</script>

<template>
  <div>
    <InspektorMebla v-if="mebel" :key="mebel" :mebel="mebel" />
    <p v-if="!mebel" class="px-[13px] py-4 text-[11px] text-[#a4a7ae]">Select furniture in the scene or in the layer list.</p>
  </div>
</template>
