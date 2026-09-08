# `regal-salon` — publikacja źródłowa

Ten katalog przechowuje pełne źródło modelu, którego obecny `FORMAT-MEBLA.md` v1 nie potrafi jeszcze odtworzyć bez strat.

## v0001
- model: `v0001-model.js`
- metadane i zatwierdzona lokalizacja: `v0001-source-meta.json`
- plan potwierdzenia: `../plany/v0001.svg`
- ograniczenia formatu: `v0001-FORMAT-MEBLA-braki.md`
- inwentarz tekstur: `v0001-texture-assets.json`

`meble/regal-salon/manifest.json` pozostaje bez `currentVersion`. Jest to celowe: nie publikować uproszczonego modelu deklaratywnego jako pełnej lub domyślnej wersji. Gdy format/rendering biblioteki będzie obsługiwał oświetlenie, emisyjne materiały, proceduralne tekstury i pozostałe funkcje wymienione w pliku ograniczeń, źródło może zostać przeniesione do właściwej wersji renderera bez utraty projektu.
