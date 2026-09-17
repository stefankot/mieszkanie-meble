<script setup lang="ts">
/* Figma UI3: sekcja panelu — tytuł 12 px pogrubiony (wiersz 40 px), akcje po prawej, linia na dole.
   Grupy wewnątrz co 48 px (etykieta 16 + 2 + kontrolka 24 + 6). */
defineProps<{ tytul: string }>()
</script>

<template>
  <section class="border-b border-[#34363c] px-[13px] pb-3.5">
    <div class="flex h-10 items-center gap-2">
      <h3 class="flex-1 text-[12px] font-semibold text-white">{{ tytul }}</h3>
      <slot name="akcje" />
    </div>
    <div class="flex flex-col gap-1.5"><slot /></div>
  </section>
</template>
