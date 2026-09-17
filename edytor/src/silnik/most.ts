import { $aktywnyWidok } from '@/stan'

/* Tymczasowy most do renderera w ramce (ten sam origin). Docelowo zastąpią go operacje
   z rejestru wywołujące moduły silnika bezpośrednio. Makieta używa tylko teleportu do pokoju. */
interface Silnik {
  gotowy: boolean
  nawigacja: { pokoje: { id: string }[]; teleportujDoPokoju(i: number): boolean }
}

let silnik: Silnik | null = null

function teleportuj(id: string) {
  const i = silnik?.nawigacja.pokoje.findIndex((p) => p.id === id) ?? -1
  if (i >= 0) silnik!.nawigacja.teleportujDoPokoju(i)
}

export function podlaczRamke(ramka: HTMLIFrameElement) {
  const okno = ramka.contentWindow as (Window & { __silnik?: Silnik }) | null
  const czekaj = setInterval(() => {
    if (!okno?.__silnik?.gotowy) return
    clearInterval(czekaj)
    silnik = okno.__silnik
    teleportuj($aktywnyWidok.get())
  }, 250)
}

$aktywnyWidok.listen(teleportuj)
