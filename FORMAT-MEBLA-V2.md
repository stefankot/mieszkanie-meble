# Format biblioteki mebli — wersja 2 (z meblem parametrycznym)

Uzupełnienie [FORMAT-MEBLA.md](FORMAT-MEBLA.md). Zasady katalogów, wersji, manifestu, planu, SVG
i publikacji przez wtyczkę GitHub są **takie same**. Zmienia się tylko treść pliku wersji.
Renderer obsługuje równolegle `schemaVersion: 1` i `2`; wersje v1 zostają bez zmian.

## Kiedy używać v2

- Mebel ma dane projektowe, które mają przetrwać (nazwane stany, parametry, anchory, constrainty).
- Mebel jest **parametryczny**: półki, kolumny i powtarzalne komponenty mają wynikać z ustawień,
  a nie z ręcznie wypisanych części.

## Szkielet pliku v2

```json
{
  "schemaVersion": 2, "assetId": "regal-salon", "version": "v0008-parametric",
  "name": "Regał w salonie", "summary": "…", "units": "mm",
  "placement": { "confirmed": true, "roomId": "SALON", "wallId": "SALON-W1",
                 "positionMm": [2033, 0, 361.5], "rotationDeg": 0,
                 "confirmationSvg": "plan/…svg", "description": "…" },
  "geometry": { "parts": [] },
  "materials": { "definitions": { "maple-0375": { "type": "wood", "color": "#d8bd99", "roughness": 0.58 } } },
  "lights": { "recesses": [] },
  "mechanics": [], "interactions": [], "states": { "default": "installed", "named": [{ "id": "installed", "mechanics": {} }] },
  "constraints": [], "assets": [], "anchors": [], "customParameters": {}, "extensions": {},
  "designTime": { "activeNamedState": "installed" },
  "runtimeStatePolicy": { "persist": "named-states-only" },
  "rendererDefaults": {}, "rendererOverrides": {}, "notes": []
}
```

Wszystkie wymienione sekcje są obowiązkowe (mogą być puste). `runtimeState` jest zabroniony:
bieżące otwarcie drzwiczek, kamera i jakość to stan chwilowy renderera, nie dane mebla.

## Sekcja `parametric` (nowość)

Opcjonalna. Gdy jest, renderer liczy z niej części i mechanizmy, a `geometry.parts` zostaje dla
elementów nietypowych. Rozmiar zewnętrzny mebla jest **stały** — zmiana liczby półek nie zmienia bryły.

```json
"parametric": {
  "carcass": { "sizeMm": [3074, 2430, 423], "boardMm": 18, "material": "maple-0375",
               "backMm": 8, "backMaterial": "maple-0375-back", "shelfMaterial": "maple-0375",
               "plinthMm": 0, "plinthRecessMm": 30 },
  "layout": {
    "rows":    { "count": 6, "distribution": "fibonacci", "reverse": false },
    "columns": { "count": 4, "distribution": "equal" }
  },
  "definitions": {
    "drzwi": {
      "label": "Drzwiczki",
      "parts": [
        { "id": "panel", "type": "box", "material": "maple-0375-front",
          "sizeMm": [{ "cell": "w", "addMm": -4 }, { "cell": "h", "addMm": -4 }, 18],
          "positionMm": [0, 0, 9] }
      ],
      "joint": { "type": "hinge", "pivotMm": [{ "cell": "w", "mul": -0.5 }, 0, 0],
                 "axis": [0, 1, 0], "angleDeg": 100 }
    }
  },
  "instances": [
    { "id": "drzwi", "definition": "drzwi", "label": "Drzwiczki", "cells": { "count": 8, "order": "bottom-up" } }
  ]
}
```

- `rows` to **przegrody poziome** (liczba półek = `count − 1`), `columns` to pionowe.
- `distribution`: `equal`, `fibonacci` (największa przegroda na dole / z lewej), `random` (z `seed`),
  `custom` (`"custom": "60+40+20+40"` — proporcje, nie milimetry; liczba liczb wyznacza liczbę przegród).
- `reverse` odwraca kolejność przegród.
- Wymiar części definicji: liczba w mm albo odwołanie do komórki:
  `{ "cell": "w" | "h" | "d", "mul": 1, "addMm": 0 }` (szerokość, wysokość, głębokość komórki).
- `cells`: `"all"` albo `{ "rows": [1,2], "columns": [3] }` albo `{ "count": 8, "order": "bottom-up" | "top-down" }`.
  Numeracja rzędów i kolumn zaczyna się od 1, rzędy liczone od dołu.
- `joint` w definicji: `hinge` (`pivotMm`, `axis`, `angleDeg`) albo `slide` (`axis`, `travelMm`).
  Mechanizm powtarza się razem z komponentem; ID części i mechanizmów mają postać
  `<instancja>-r<rząd>c<kolumna>-<część>`, więc są stabilne między przebudowami.

Generator dokłada sam: boki, wieniec dolny i górny, piony między kolumnami, półki w każdej kolumnie,
opcjonalne plecy i cokół. Nie wypisuj ich ręcznie.

### Co robi edytor

Suwaki w Inspektorze wysyłają `parametricOverrides` o tej samej budowie co `layout` plus
`instances: { "<id>": { "count": N } }`. To jest stan sesji edycji; **do pliku wersji trafia dopiero
świadoma publikacja**. Wersje POC (np. `v0008-parametric`) zostają nieaktywne: manifest ma je na
liście, ale `currentVersion` wskazuje wersję zatwierdzoną przez użytkownika.

## Migracja i zgodność

- `migrateFurnitureV1ToV2()` przenosi `model.parts/materials/joints/lighting` bez zmiany ID.
- `normalizeFurnitureDocument()` sprowadza v1 i v2 (także `parametric`) do jednego modelu wewnętrznego.
- Semantyczne ID części nie mogą się zmieniać między wersjami — na nich opiera się zaznaczanie,
  widoczność i materiały w edytorze.

## Limity

Do 1500 części po rozwinięciu, 100 materiałów, ~180 000 trójkątów. `rows.count` i `columns.count`
w zakresie 1–24. Bez JavaScriptu, HTML, zewnętrznych URL i shaderów w pliku mebla.

## Podgląd

`https://stefankot.github.io/mieszkanie-meble/` — renderer; edytor po scaleniu: `…/edytor-app/`.
Wersję nieaktywną można obejrzeć adresem `?furnitureV2=regal-salon:v0008-parametric`
(lokalnie dodatkowo `&furnitureSource=local`).
