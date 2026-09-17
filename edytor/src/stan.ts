import { atom } from 'nanostores'

/* Stan powłoki (tylko UI). Stan sceny przejdzie do silnika przez rejestr operacji. */
export const $tryb = atom<'walk' | 'edit'>('walk')
export const $trybPrawejKolumny = atom<'edycja' | 'zdjecie'>('edycja')
export const $zakladkaPrawa = atom<'inspector' | 'prototype'>('inspector')
export const $panelLewy = atom<'agent' | 'scene' | 'palettes' | 'file' | 'environment'>('agent')
export const $bibliotekaOtwarta = atom(false)
export const $paletaPolecenOtwarta = atom(false)
export const $zaznaczenie = atom<string | null>('regal-salon')
/* Część mebla wskazana kliknięciem w scenie (`<mebel>:<część>`), gdy klik trafił w konkretną formatkę. */
export const $czescZaznaczona = atom<string | null>(null)
export const $aktywnyWidok = atom('SALON')
export const $narzedzie = atom<'zaznacz' | 'przesun' | 'obroc'>('zaznacz')
export const $przyciaganie = atom(true)
export const $kropkiWidoczne = atom(true)
export const $panelWidokow = atom(true)
export const $mapaWidoczna = atom(true)

/* Pływające okno materiału (grupa elementów zaznaczonego mebla). */
export const $oknoMaterialu = atom<{ mebel: string; klucz: string; zakladka: 'custom' | 'libraries' } | null>(null)
