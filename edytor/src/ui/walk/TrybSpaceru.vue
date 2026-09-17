<script setup lang="ts">
import { ChevronDown, PanelLeft, PencilRuler, Settings } from '@lucide/vue'
import { useStore } from '@nanostores/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import { $panelWidokow, $tryb } from '@/stan'

import Pager from './Pager.vue'
import PanelWidokow from './PanelWidokow.vue'
import UstawieniaSpaceru from './UstawieniaSpaceru.vue'

/* Tryb startowy — spacer bez edycji. Układ wg D5 3.1 Interactive Presentation:
   lewy górny róg (Edit, lista widoków), lista slajdów, prawy górny „Settings ▾”, dolny pager. */
const panelWidokow = useStore($panelWidokow)
const guzik = 'flex h-[22px] items-center gap-1.5 rounded-d5 bg-[#16181c]/90 px-2 text-[10.5px] text-text shadow-lg hover:bg-[#23262c]'
</script>

<template>
  <div class="absolute left-2 top-2 z-20 flex gap-1">
    <button type="button" :class="guzik" title="Edit mode" @click="$tryb.set('edit')"><PencilRuler :size="12" /> Edit</button>
    <button type="button" :class="[guzik, panelWidokow ? 'text-white' : 'text-muted']" @click="$panelWidokow.set(!panelWidokow)"><PanelLeft :size="12" /> Views</button>
  </div>
  <PanelWidokow v-if="panelWidokow" />

  <div class="absolute right-2 top-2 z-20 flex gap-1">
    <PopoverRoot>
      <PopoverTrigger :class="guzik"><Settings :size="12" /> Settings <ChevronDown :size="11" class="text-muted" /></PopoverTrigger>
      <PopoverPortal>
        <PopoverContent align="end" :side-offset="4" class="z-50 outline-none"><UstawieniaSpaceru /></PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>

  <Pager />
</template>
