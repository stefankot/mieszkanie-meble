<script setup lang="ts">
import { useStore } from '@nanostores/vue'

import { $panelWidokow } from '@/stan'

import PanelWidokow from './PanelWidokow.vue'

/* Tryb startowy — spacer bez edycji (wzór D5 3.1 Interactive Presentation). Lista widoków po lewej;
   Edit, pager, kropki, ustawienia i jakość renderu są na pływającym pasku (`ui/toolbar/PasekNarzedzi.vue`). */
const panelWidokow = useStore($panelWidokow)
</script>

<template>
  <PanelWidokow v-if="panelWidokow" />
</template>
