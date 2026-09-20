# Skąd biorą się dane Tylko i jak je odświeżyć

`tylko-projekty.json` to zrzut ich katalogu, a nie połączenie na żywo. Powód jest prosty:
`tylko.com/api/...` siedzi za Cloudflare i każde żądanie spoza przeglądarki dostaje
`403 Just a moment…`. Nie pomoże ani `curl` z podmienionym User-Agentem, ani most w
`serwer.py` — wyzwanie rozwiązuje się JavaScriptem, więc przejdzie tylko prawdziwa karta.
Dlatego katalog jest wożony w repo, a odświeża się go ręcznie, z konsoli ich strony.

## Odświeżenie katalogu

1. Otwórz `https://tylko.com/en-pl/furniture-c/wardrobe/` (albo `/bookcase/`, `/wallstorage/`).
2. Wklej do konsoli:

```js
const zbierz = async (sciezka, kat, limit = 26) => {
  const html = await fetch(sciezka).then(r => r.text());
  const ids = [...new Set([...html.matchAll(/furniture\/[a-z_-]+\/(\d+)/g)].map(m => m[1]))].slice(0, limit);
  const out = [];
  for(const id of ids){
    try{
      const r = await fetch('/api/v1/watty_configurator/' + id + '/').then(x => x.json());
      const p = r.configurator_params || {};
      if(!p.width || !r.components?.length) continue;
      const cs = [...r.components].sort((a, b) => a.x1 - b.x1);
      out.push({id: +id, kat, w: p.width, h: p.height, d: p.depth, m: p.material, c: r.color_name,
        l: p.additional_parameters?.collection_type || '',
        kol: cs.map(c => Math.round(c.x2 - c.x1)),
        sl: cs.map(c => [c.compartments_count || 1,
          (c.doors_left_count || 0) + (c.doors_right_count || 0) + (c.doors_pair_count || 0),
          c.drawers_ext_count || 0, c.drawers_int_count || 0, c.bars_count || 0, c.doors_coverage || ''])});
    }catch(e){ /* nie każdy kafelek PLP to mebel watty */ }
  }
  return out;
};
const wszystko = [
  ...await zbierz('/en-pl/furniture-c/wardrobe/', 'wardrobe'),
  ...await zbierz('/en-pl/furniture-c/bookcase/', 'bookcase'),
  ...await zbierz('/en-pl/furniture-c/wallstorage/', 'wallstorage')
];
copy(JSON.stringify(wszystko));           // ląduje w schowku
```

3. Wklej zawartość schowka jako `projekty` w `tylko-projekty.json` i popraw datę w `pobrano`.

## Barwy

Nazwa koloru przychodzi tekstem (`"Cashmere Beige + Antique Pink"`), a `tylko.js` mapuje ją
na indeksy w `KOLORY`. Same wartości pochodzą z ich plików SVG, nie z odczytu z ekranu:

- linia Edge: `res.cloudinary.com/cstm/image/upload/v1/configurator/color-swatches/T03-<nazwa>.svg`
- linia Tone: `tylko.com/r_static/products-list/color-swatches/T03-<nazwa>.svg`
- pary front + wnętrze widać w nazwach plików `media.tylko.com/cloudinary/common/swatch/t03_2023-05-24/<front>+<wnetrze>/small/A.svg`
  — trzy fronty (white, cashmere-beige, graphite-grey) razy pięć wnętrz.

Gdyby doszedł kolor spoza `KOLORY`, dopisuj go **na końcu** listy w `dane.js`: zapisane
projekty trzymają `kolor` jako indeks, więc przestawienie przemalowałoby stare meble.

## Czego w ich API nie ma

Wysokości półek. `components` niosą prawdziwe szerokości słupków i liczniki zawartości
(`compartments_count`, `doors_coverage`, `drawers_ext_count`, `bars_count`), ale rozkład
rzędów leży dopiero w `api/v1/furniture_dna/` — 840 kB na jeden typ mebla. Dlatego
`siatkaProjektu()` odtwarza rytm rzędów z liczby komór najgęstszego słupka, a kreator
mówi o tym wprost pod listą projektów.

## Piktogramy

`ikony/tylko-*.webp` to przeskalowane do 144 px miniatury z
`media.tylko.com/cloudinary/common/menu/categories/<kategoria>/A.webp`. Leżą lokalnie,
bo ich CDN odrzuca żądania spoza tylko.com — odwołanie po URL-u dałoby puste kafelki.

## Style

Sześć stylów każdej linii to ich piktogramy „Available styles" z kroku 2 kreatora:
`media.tylko.com/cloudinary/comparison-page/geometry-icons/high/Original*.svg` (linie
Original Classic i Modern) oraz `Edge*.svg` (Edge i Tone). Kopie leżą w `ikony/styl-*.svg`.

Proporcje w `style-tylko.js` są odczytane wprost z tych plików: ikona rysuje korpus
w prostokącie x 4.75–43.25 i y 2.75–45.25, więc ułamek od lewej to (x−4.75)/38.5,
a od dołu (45.25−y)/42.5.

Linia Original zmienia GEOMETRIĘ, a przy Slant i Pixel także obrys bryły — takiego mebla
nie da się zapisać jedną prostokątną siatką, więc styl zwraca kilka modułów zakotwiczonych
w sobie. Linia Edge zmienia tylko ROZKŁAD FRONTÓW na zwykłej siatce.

**Uwaga o Pixelu.** Ikona `Original-5` ma tylko dwa słupy i dwa pasy, bo to schemat 48 px.
Wzięta dosłownie daje rzadki krzyż z wielkimi dziurami w narożnikach — nie mebel. Prawdziwy
regał w tym układzie (zdjęcie referencyjne użytkownika) to GĘSTA KRATA kwadratowych komórek
z frontami na większości pól, a poszarpany obrys robią pojedyncze skrzynki wystające o jeden
moduł nad korpus, pod niego i na boki. Liczba komórek wynika z zamówionych wymiarów (komórka
~43 cm), nie z liczby kresek na ikonie. Korpus stoi na podłodze całą szerokością —
skrzynki są doczepione do niego, a nie on do nich.

## Sylwetka i modele

`ikony/sylwetka.svg` — „Human" Pelega Reda z Noun Project, licencja CC BY. Plik przycięty
do obrysu postaci; atrybucja siedzi w `<desc>` pliku i tutaj, bo napis wyrenderowany
w scenie 3D wisiałby w powietrzu obok mebla.

Modele na półki, podłogę i lampy pobiera `modele/pobierz.py` z BlenderKit (assety
royalty-free). Rola `lampa` dostaje w katalogu blok `swiatlo` i naprawdę świeci —
punktowe światło siada na 4/5 wysokości bryły, a klosz dostaje emisję.

