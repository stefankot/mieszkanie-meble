<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'

/* D5 Direction: „◯ Follow HDRI / ◉ Custom” — bloki na tle pola, wiersz 26 px, skok 28 px, kółko 12 px od lewej.
   Wybrana opcja może mieć parametry (slot o nazwie wartości), rysowane w tym samym bloku zaraz pod wierszem
   (D5: Custom → Altitude 19 px niżej). */
defineProps<{ opcje: { wartosc: string; etykieta: string }[] }>()
const wybrana = defineModel<string>({ required: true })
</script>

<template>
  <RadioGroupRoot v-model="wybrana" class="flex flex-1 flex-col gap-[2px]">
    <div v-for="o in opcje" :key="o.wartosc" class="rounded-d5 bg-[#202227]">
      <label class="flex h-[26px] items-center gap-[7px] pl-3 text-xs text-text">
        <RadioGroupItem :value="o.wartosc" class="flex size-3 items-center justify-center rounded-full ring-1 ring-[#9a9ea6] outline-none data-[state=checked]:ring-accent">
          <RadioGroupIndicator class="size-[6px] rounded-full bg-accent" />
        </RadioGroupItem>
        {{ o.etykieta }}
      </label>
      <div v-if="$slots[o.wartosc] && wybrana === o.wartosc" class="flex flex-col gap-(--odstep) px-2 pb-2.5">
        <slot :name="o.wartosc" />
      </div>
    </div>
  </RadioGroupRoot>
</template>
