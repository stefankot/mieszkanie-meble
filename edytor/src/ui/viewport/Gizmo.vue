<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { watch } from 'vue'

import { zmienProjekt } from '@/projekt/projekt'
import { $silnik } from '@/silnik/most'
import { przyciagnijDoSciany } from '@/silnik/przyciaganie'
import { dokumentProjektu } from '@/projekt/projekt'
import { $narzedzie, $przyciaganie, $tryb, $zaznaczenie } from '@/stan'

/* Uchwyt przesuwania i obracania mebla (TransformControls silnika). Pozycję zapisujemy do dokumentu
   dopiero po puszczeniu myszy — jeden krok Cofnij i jedno przyciągnięcie do ściany. */
const silnik = useStore($silnik)
const tryb = useStore($tryb)
const narzedzie = useStore($narzedzie)
const zaznaczenie = useStore($zaznaczenie)

let gizmo: any = null
let odpiecie: (() => void) | null = null

async function odswiez() {
  const s = silnik.value as any
  if (!s?.gizmo) return
  gizmo ??= await s.gizmo()
  const aktywne = tryb.value === 'edit' && zaznaczenie.value && narzedzie.value !== 'zaznacz'
  const korzen = aktywne ? s.scene.getObjectByName(`biblioteka:${zaznaczenie.value}`) : null
  gizmo.dolacz(korzen ?? null)
  if (!korzen) return
  gizmo.ustawTryb(narzedzie.value)
  gizmo.ustawKrok($przyciaganie.get() ? 1 : null, $przyciaganie.get() ? 15 : null)
  if (odpiecie) return
  const koniec = (e: { value: boolean }) => {
    if (e.value || !gizmo.kontrolki.object) return
    const o = gizmo.kontrolki.object
    const id = String(o.name).slice('biblioteka:'.length)
    const wpis = dokumentProjektu().meble?.[id]
    const u = {
      positionMm: [Math.round(o.position.x * 10), Math.round(o.position.y * 10), Math.round(o.position.z * 10)] as [number, number, number],
      rotationDeg: Math.round((o.rotation.y * 180) / Math.PI)
    }
    const cel = $przyciaganie.get() ? przyciagnijDoSciany(silnik.value, id, u) : u
    zmienProjekt(`Move ${id}`, (d) => (d.meble[id] = { asset: wpis?.asset ?? id, ...cel, kopia: wpis?.kopia ?? false }))
  }
  gizmo.kontrolki.addEventListener('dragging-changed', koniec)
  odpiecie = () => gizmo.kontrolki.removeEventListener('dragging-changed', koniec)
}

watch([silnik, tryb, narzedzie, zaznaczenie], odswiez, { immediate: true })
</script>

<template><span class="hidden" /></template>
