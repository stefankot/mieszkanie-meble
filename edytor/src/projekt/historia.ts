import { kopiaDokumentu, pustyDokument, takieSame, type DokumentProjektu } from './dokument'

/* Historia zmian dokumentu (Cofnij/Ponów) niezależna od silnika i UI — testowana w vitest.
   `projektuj(przed, po)` nanosi różnicę na scenę ZANIM stan i historia się zmienią (jak w E1: najpierw projekcja).
   Zmiany z tym samym kluczem `scal` w krótkim odstępie (przeciąganie suwaka) tworzą jeden krok historii. */
export interface WpisHistorii { etykieta: string; przed: DokumentProjektu; po: DokumentProjektu; scal?: string; czas: number }

export function utworzHistorie({ projektuj, zmieniono = () => {}, limit = 200, oknoScalania = 1200, zegar = () => Date.now() }: {
  projektuj: (przed: DokumentProjektu, po: DokumentProjektu) => void
  zmieniono?: () => void
  limit?: number
  oknoScalania?: number
  zegar?: () => number
}) {
  let dokument = pustyDokument()
  const cofniecia: WpisHistorii[] = []
  const ponowienia: WpisHistorii[] = []

  function zmien(etykieta: string, mutacja: (d: DokumentProjektu) => void, { scal }: { scal?: string } = {}) {
    const nowy = kopiaDokumentu(dokument)
    mutacja(nowy)
    if (takieSame(nowy, dokument)) return false
    projektuj(dokument, nowy)
    const teraz = zegar()
    const ostatni = cofniecia.at(-1)
    if (scal && ostatni?.scal === scal && teraz - ostatni.czas <= oknoScalania && !ponowienia.length) {
      ostatni.po = kopiaDokumentu(nowy)
      ostatni.czas = teraz
    } else {
      cofniecia.push({ etykieta, przed: kopiaDokumentu(dokument), po: kopiaDokumentu(nowy), scal, czas: teraz })
      if (cofniecia.length > limit) cofniecia.shift()
    }
    ponowienia.length = 0
    dokument = nowy
    zmieniono()
    return true
  }

  function cofnij() {
    const wpis = cofniecia.pop()
    if (!wpis) return false
    projektuj(dokument, wpis.przed)
    dokument = kopiaDokumentu(wpis.przed)
    ponowienia.push(wpis)
    zmieniono()
    return true
  }

  function ponow() {
    const wpis = ponowienia.pop()
    if (!wpis) return false
    projektuj(dokument, wpis.po)
    dokument = kopiaDokumentu(wpis.po)
    cofniecia.push({ ...wpis, czas: 0 })
    zmieniono()
    return true
  }

  /* Wczytanie (szkic, plik, wariant): nowy stan bez kroku historii, historia czyszczona. */
  function wczytaj(nowy: DokumentProjektu) {
    projektuj(dokument, nowy)
    dokument = kopiaDokumentu(nowy)
    cofniecia.length = 0
    ponowienia.length = 0
    zmieniono()
  }

  /* Ponowne naniesienie całego dokumentu (np. po odtworzeniu mebli w silniku). */
  const odswiez = () => projektuj(pustyDokument(), dokument)

  return {
    zmien,
    cofnij,
    ponow,
    wczytaj,
    odswiez,
    get dokument() {
      return kopiaDokumentu(dokument)
    },
    get stan() {
      return { moznaCofnac: cofniecia.length > 0, moznaPonowic: ponowienia.length > 0, cofnij: cofniecia.at(-1)?.etykieta ?? null, ponow: ponowienia.at(-1)?.etykieta ?? null, krokow: cofniecia.length }
    }
  }
}
