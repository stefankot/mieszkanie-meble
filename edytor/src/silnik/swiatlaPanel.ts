import { dokumentProjektu, zmienProjekt } from '@/projekt/projekt'

import { $silnik } from './most'
import { parametrySwiatla, znajdzSwiatlo, type ParametrySwiatla } from './swiatla'

/* Jedno wejście dla panelu przy kropce: światła silnika (lampy pokoi, listwy LED mebli) i światła
   dodane przez użytkownika (`wlasne:<id>`) różnią się źródłem, ale mają te same parametry. */
const wlasne = (id: string) => (id.startsWith('wlasne:') ? id.slice(7) : null)

export function odczytajSwiatlo(id: string): ParametrySwiatla | null {
  const w = wlasne(id)
  if (w) {
    const zapis = dokumentProjektu().swiatlaWlasne?.[w]
    return zapis ? { wlaczone: zapis.wlaczone, lumeny: zapis.lumeny, skupienie: zapis.skupienie, pochylenie: zapis.pochylenie, azymut: zapis.azymut, kelwiny: zapis.kelwiny } : null
  }
  const l = znajdzSwiatlo($silnik.get(), id)
  return l ? parametrySwiatla(l) : null
}

export function zapiszSwiatlo(id: string, p: ParametrySwiatla, etykieta: string) {
  const w = wlasne(id)
  zmienProjekt(`Light · ${etykieta}`, (d) => {
    if (w) {
      const zapis = d.swiatlaWlasne[w]
      if (zapis) d.swiatlaWlasne[w] = { ...zapis, ...p }
    } else d.swiatla[id] = { ...p }
  }, { scal: `swiatlo:${id}` })
}
