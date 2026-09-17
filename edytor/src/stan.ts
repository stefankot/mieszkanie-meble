import { atom } from 'nanostores'

/* Stan powłoki (tylko UI). Stan sceny przejdzie do silnika przez rejestr operacji. */
export const $tryb = atom<'walk' | 'edit'>('walk')
export const $trybPrawejKolumny = atom<'edycja' | 'zdjecie'>('edycja')
export const $zakladkaPrawa = atom<'inspector' | 'environment'>('inspector')
export const $panelLewy = atom<'agent' | 'scene' | 'palettes' | 'file'>('agent')
export const $bibliotekaOtwarta = atom(false)
export const $paletaPolecenOtwarta = atom(false)
export const $zaznaczenie = atom<string | null>('regal-salon')
export const $aktywnyWidok = atom('SALON')
export const $narzedzie = atom<'zaznacz' | 'przesun' | 'obroc'>('zaznacz')
export const $przyciaganie = atom(true)
export const $kropkiWidoczne = atom(true)
export const $panelWidokow = atom(true)
