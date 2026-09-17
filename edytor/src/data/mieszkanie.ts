// Dane makiety. Nazwy pokoi, mebli, wersji, materiałów i mechanizmów pochodzą z repo
// (plan/mieszkanie.json, meble/<id>/manifest.json, renderery/webgpu/sterowanie.js).
// Po podłączeniu silnika zastąpią je operacje odczytu z rejestru (scene.describe).

export interface Widok { id: string; nazwa: string; odcien: string }
export const widoki: Widok[] = [
  { id: 'SALON', nazwa: 'Salon', odcien: '#6b5a48' },
  { id: 'KUCHNIA', nazwa: 'Kuchnia', odcien: '#6e3a3f' },
  { id: 'POKOJ-LOZKO', nazwa: 'Pokój z łóżkiem', odcien: '#3d4f78' },
  { id: 'POKOJ-9', nazwa: 'Pokój', odcien: '#56604e' },
  { id: 'PRZEDPOKOJ', nazwa: 'Przedpokój', odcien: '#5b5650' },
  { id: 'LAZIENKA', nazwa: 'Łazienka', odcien: '#4d6468' },
  { id: 'WC', nazwa: 'WC', odcien: '#55585c' }
]

export interface Warstwa { id: string; nazwa: string; widoczna: boolean }
export const warstwy: Warstwa[] = [
  { id: 'mieszkanie', nazwa: 'Apartment', widoczna: true },
  { id: 'meble', nazwa: 'Furniture', widoczna: true },
  { id: 'swiatla', nazwa: 'Lights', widoczna: true },
  { id: 'zaslony', nazwa: 'Curtains', widoczna: true },
  { id: 'otoczenie', nazwa: 'Outdoor trees', widoczna: true }
]

export interface Wezel { id: string; nazwa: string; typ: 'mebel' | 'modul' | 'mechanizm' | 'swiatlo'; dzieci?: Wezel[]; opis?: string }
export const obiekty: Wezel[] = [
  {
    id: 'regal-salon', nazwa: 'Regał w salonie', typ: 'mebel', opis: 'v0006',
    dzieci: [
      { id: 'rs-modul', nazwa: 'Shelf module × 12', typ: 'modul' },
      { id: 'rs-plecy', nazwa: 'Back panel', typ: 'modul' }
    ]
  },
  {
    id: 'kuchnia', nazwa: 'Nowa kuchnia', typ: 'mebel', opis: 'v0002',
    dzieci: [
      { id: 'k-szuflada', nazwa: 'Drawer × 6', typ: 'modul' },
      { id: 'k-lodowka', nazwa: 'Front chłodziarki', typ: 'mechanizm' },
      { id: 'k-zmywarka', nazwa: 'Front zmywarki', typ: 'mechanizm' }
    ]
  },
  {
    id: 'regal-kuchnia', nazwa: 'Regał w kuchni', typ: 'mebel', opis: 'v0002',
    dzieci: [{ id: 'rk-drzwiczki', nazwa: 'Door × 6', typ: 'modul' }]
  },
  { id: 'regal-przy-lozku', nazwa: 'Regał przy łóżku', typ: 'mebel', opis: 'v0020' },
  { id: 'lozko', nazwa: 'Łóżko pod oknem', typ: 'mebel', opis: 'v0018' },
  { id: 'lozko-pokoj-9', nazwa: 'Łóżko w małym pokoju', typ: 'mebel', opis: 'v0002' },
  { id: 'kule', nazwa: 'Kule sufitowe', typ: 'swiatlo' }
]

export const mechanizmy = ['Drzwiczki R1 C1', 'Drzwiczki R1 C2', 'Drzwiczki R1 C3', 'Drzwiczki R6 C1', 'Drzwiczki R6 C2', 'Drzwiczki R6 C3']

export interface Material { id: string; nazwa: string; kolor: string; miniatura?: string }
const polyhaven = (id: string) => `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=160&height=160`
export const materialy: Material[] = [
  { id: 'maple-0375', nazwa: 'Klon 0375', kolor: '#c9a27a' },
  { id: 'oak_veneer_01', nazwa: 'Fornir dębowy 01', kolor: '#b48a5f', miniatura: polyhaven('oak_veneer_01') },
  { id: 'rectangular_parquet', nazwa: 'Parkiet prostokątny', kolor: '#9c7250', miniatura: polyhaven('rectangular_parquet') },
  { id: 'painted_plaster_wall', nazwa: 'Tynk malowany', kolor: '#dcd8d0', miniatura: polyhaven('painted_plaster_wall') },
  { id: 'burgundy', nazwa: 'Burgund mat', kolor: '#6f2230' },
  { id: 'cobalt-matte', nazwa: 'Kobalt mat', kolor: '#2e4fa0' },
  { id: 'cream', nazwa: 'Krem', kolor: '#ece2cf' },
  { id: 'graphite', nazwa: 'Grafit', kolor: '#3a3b3e' },
  { id: 'stainless', nazwa: 'Stal szczotkowana', kolor: '#a9abad' }
]

export interface KolorPalety { rola: string; hex: string }
export interface Paleta { id: string; nazwa: string; kolory: KolorPalety[] }
export const palety: Paleta[] = [
  { id: 'kuchnia-burgund', nazwa: 'Kitchen burgundy', kolory: [
    { rola: 'Carcass', hex: '#ece2cf' }, { rola: 'Front', hex: '#6f2230' }, { rola: 'Top', hex: '#3a3b3e' },
    { rola: 'Handle', hex: '#a9abad' }, { rola: 'Textile', hex: '#c9b79c' }] },
  { id: 'klon-kobalt', nazwa: 'Maple & cobalt', kolory: [
    { rola: 'Carcass', hex: '#c9a27a' }, { rola: 'Front', hex: '#2e4fa0' }, { rola: 'Top', hex: '#f1efe9' },
    { rola: 'Handle', hex: '#1d1d1f' }, { rola: 'Textile', hex: '#e2b5a3' }] },
  { id: 'skandynawska', nazwa: 'Nordic', kolory: [
    { rola: 'Carcass', hex: '#f3f1ec' }, { rola: 'Front', hex: '#d9d4c7' }, { rola: 'Top', hex: '#b48a5f' },
    { rola: 'Handle', hex: '#2b2b2b' }, { rola: 'Textile', hex: '#8a9a86' }] }
]

export const presetySwiatla = {
  lato: ['08:00', '14:00', '20:00'],
  zima: ['08:00', '14:00', '20:00']
}

export interface Kategoria { nazwa: string; liczba: number; dzieci?: Kategoria[] }
export const kategorieBiblioteki: Kategoria[] = [
  { nazwa: 'Furniture', liczba: 7, dzieci: [
    { nazwa: 'Shelving', liczba: 3 }, { nazwa: 'Kitchen', liczba: 1 }, { nazwa: 'Beds', liczba: 2 }, { nazwa: 'Modules', liczba: 1 }] },
  { nazwa: 'Lighting', liczba: 4 },
  { nazwa: 'Textiles', liczba: 3 },
  { nazwa: 'Plants', liczba: 2 }
]
