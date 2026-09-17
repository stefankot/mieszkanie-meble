import { kluczUstawien, type UstawieniaMaterialu } from '@/meble/material'

import { zbudujMaterial } from './budowaMaterialu'
import type { Silnik } from './most'
import { doObrazu, renderujDoObrazu } from './tonowanie'

/* Kulka materiału jak w D5: kula 30 cm (wzory w cm wyglądają jak na meblu) w oświetleniu studyjnym
   z mapą otoczenia sceny. Renderowane po kolei, zapamiętane wg ustawień i źródła. */
const pamiec = new Map<string, Promise<string | null>>()
let kolejka: Promise<unknown> = Promise.resolve()
let studio: { scena: any; kamera: any; kula: any } | null = null

function przygotuj(s: Silnik) {
  if (studio) return studio
  const T = s.THREE
  const scena = new T.Scene()
  scena.environment = s.scene.environment
  const klucz = new T.DirectionalLight(0xffffff, 2.4)
  klucz.position.set(-40, 60, 80)
  const kontra = new T.DirectionalLight(0xdfe8ff, 0.8)
  kontra.position.set(60, 20, -60)
  scena.add(klucz, kontra, new T.HemisphereLight(0xffffff, 0x3a3b3e, 0.5))
  const kula = new T.Mesh(new T.SphereGeometry(15, 96, 48))
  scena.add(kula)
  const kamera = new T.PerspectiveCamera(30, 1, 1, 400)
  kamera.position.set(0, 0, 62)
  kamera.lookAt(0, 0, 0)
  studio = { scena, kamera, kula }
  return studio
}

export function kulka(s: Silnik | null, u: UstawieniaMaterialu, zrodlo?: any): Promise<string | null> {
  if (!s) return Promise.resolve(null)
  const klucz = `${kluczUstawien(u)}|${zrodlo?.uuid ?? ''}`
  if (!pamiec.has(klucz)) {
    const zadanie = kolejka.then(async () => {
      const { scena, kamera, kula } = przygotuj(s)
      const m = zbudujMaterial(s, u, zrodlo)
      kula.material = m
      try {
        const piksele = await renderujDoObrazu(s, scena, kamera, 192, 192, true)
        return doObrazu(piksele, 192, 192, s.renderer.toneMappingExposure ?? 1, { szer: 96, wys: 96, typ: 'image/png' })
      } catch (e) {
        console.warn('Kulka materiału nie powstała', e)
        return null
      } finally {
        m.dispose()
      }
    })
    kolejka = zadanie
    pamiec.set(klucz, zadanie)
    if (pamiec.size > 200) pamiec.delete(pamiec.keys().next().value!)
  }
  return pamiec.get(klucz)!
}
