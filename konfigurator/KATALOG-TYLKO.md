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
