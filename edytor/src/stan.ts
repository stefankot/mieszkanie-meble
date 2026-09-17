import { atom } from 'nanostores'

/* Stan powłoki (tylko UI). Stan sceny przejdzie do silnika przez rejestr operacji. */
export const $trybPrawejKolumny = atom<'edycja' | 'zdjecie'>('edycja')
export const $zakladkaPrawa = atom<'otoczenie' | 'efekty' | 'inspektor'>('inspektor')
export const $zakladkaLewa = atom<'scena' | 'agent'>('scena')
export const $bibliotekaOtwarta = atom(false)
export const $paletaPolecenOtwarta = atom(false)
export const $zaznaczenie = atom('regal-kuchnia')
export const $aktywnyWidok = atom('KUCHNIA')
export const $narzedzie = atom<'zaznacz' | 'przesun' | 'obroc'>('zaznacz')
export const $przyciaganie = atom(true)
