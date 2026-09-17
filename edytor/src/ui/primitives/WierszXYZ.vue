<script setup lang="ts">
import PoleLiczby from './PoleLiczby.vue'
import Wiersz from './Wiersz.vue'

/* Trzy powiązane pola w jednym wierszu (D5: Location / Rotation / Size). */
defineProps<{ etykieta: string; jednostka?: string }>()
const xyz = defineModel<[number, number, number]>({ required: true })
</script>

<template>
  <Wiersz :etykieta="etykieta" pionowo>
    <PoleLiczby v-model="xyz[0]" os="X" :jednostka="jednostka" />
    <PoleLiczby v-model="xyz[1]" os="Y" :jednostka="jednostka" />
    <PoleLiczby v-model="xyz[2]" os="Z" :jednostka="jednostka" />
  </Wiersz>
</template>
