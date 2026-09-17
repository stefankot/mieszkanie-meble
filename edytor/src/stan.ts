import { atom } from 'nanostores'

/* Stan powłoki (tylko UI). Stan sceny przejdzie do silnika przez rejestr operacji. */
export const $tryb = atom<'walk' | 'edit'>('walk')
export const $trybPrawejKolumny = atom<'edycja' | 'zdjecie'>('edycja')
export const $zakladkaPrawa = atom<'environment' | 'effect' | 'inspector'>('inspector')
export const $zakladkaLewa = atom<'scene' | 'agent'>('scene')
export const $bibliotekaOtwarta = atom(false)
export const $paletaPolecenOtwarta = atom(false)
export const $zaznaczenie = atom<string | null>('regal-kuchnia')
export const $aktywnyWidok = atom('SALON')
export const $narzedzie = atom<'zaznacz' | 'przesun' | 'obroc'>('zaznacz')
export const $przyciaganie = atom(true)
export const $kropkiWidoczne = atom(true)
export const $panelWidokow = atom(true)
