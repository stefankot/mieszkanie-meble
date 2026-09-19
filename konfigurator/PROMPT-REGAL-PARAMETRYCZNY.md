# Prompt do wklejenia w wątku ChatGPT, który pisał regał przy łóżku

Skopiuj wszystko poniżej linii.

---

Regał przy łóżku (`meble/regal-przy-lozku/wersje/v0020.json`) jest opisany wprost: 81 części
z absolutnymi pozycjami. Chcę wersję **parametryczną** — sekcję `parametric` w schemacie v2,
taką samą jak w `meble/regal-salon/wersje/v0008-parametric.json`. Powód: konfigurator szafy
(`konfigurator/`) buduje geometrię wyłącznie przez `rozwinParametryczny()` z
`renderery/webgpu/parametryczne.js`, więc mebel opisany wprost można w nim tylko obejrzeć,
a nie edytować.

## Co ma powstać

Dwa nowe pliki wersji, bo `carcass` to jedna prostopadłościenna bryła, a regał jest w kształcie L:

- `meble/regal-przy-lozku/wersje/v0021-parametric.json` — **skrzydło główne**
- `meble/regal-przy-lozku/wersje/v0022-parametric-skrzydlo.json` — **skrzydło krótkie**

`v0020.json` zostaje nietknięty. Oba nowe pliki mają komplet obowiązkowych sekcji v2
(`geometry`, `materials`, `lights`, `mechanics`, `interactions`, `states`, `constraints`,
`assets`, `anchors`, `customParameters`, `extensions`, `designTime`, `placement`) plus
`parametric`. Dopisz je do `manifest.json` jako kolejne wersje i ustaw `currentVersion`.

## Kontrakt `parametric` — dokładnie tak, jak czyta go silnik

Jednostki mm. Początek układu: środek obrysu na podłodze, **+Z = front, +Y = góra**.

```json
"parametric": {
  "carcass": {
    "sizeMm": [szerokość, wysokość, głębokość],
    "boardMm": 18,
    "material": "id-materiału",
    "backMm": 8,
    "backMaterial": "id-materiału",
    "shelfMaterial": "id-materiału",
    "plinthMm": 0,
    "plinthRecessMm": 70
  },
  "layout": {
    "columns": {"count": 3, "distribution": "custom", "custom": "582+582+582"},
    "rows":    {"count": 4, "distribution": "custom", "custom": "564+582+585+582"}
  },
  "definitions": { "drzwi": { "label": "...", "parts": [...], "joint": {...} } },
  "instances": [ {"id": "...", "definition": "drzwi", "label": "...", "cells": {...}} ]
}
```

Reguły, które waliduje `sprawdzParametryczny()` — złamanie którejkolwiek wywala model:

- `carcass.sizeMm` to trzy dodatnie liczby; `0 < boardMm < min(sizeMm)/2`; `carcass.material` to string.
- `layout.rows.count` i `layout.columns.count` to liczby całkowite 1–24.
- `distribution` tylko z zestawu `equal` | `fibonacci` | `random` | `custom`.
  Przy `custom` pole `custom` ma postać `"564+582+585"` — same liczby i plusy, bez jednostek.
  To **wagi**, nie milimetry: silnik skaluje je do wnętrza korpusu. Jeśli mają wyjść
  dokładne milimetry, suma wag musi się zgadzać z `wysokość − plinthMm − 2×boardMm − (n−1)×boardMm`.
- Każde ID części pasuje do `^[A-Za-z0-9_.-]{1,60}$`, każda definicja ma niepustą listę `parts`.
- `joint.type` tylko `hinge` albo `slide`.
- Każda instancja wskazuje istniejącą definicję.

Wymiary i pozycje części w definicji mogą odwoływać się do komórki:
`{"cell": "w", "mul": 1, "addMm": -4}`, gdzie `cell` to `w` (szerokość komórki),
`h` (wysokość) albo `d` (głębokość). Liczba to zwykły milimetr.

Wybór komórek w instancji: `"all"`, `{"rows": [1,2], "columns": [1,2,3]}`
albo `{"count": 8, "order": "bottom-up"}`. **Numeracja od 1, rząd 1 jest na dole,
kolumna 1 po lewej.**

## Czego dodatkowo wymaga konfigurator

Konfigurator normalizuje dokument przed użyciem (`konfigurator/model.js`, `normalizujDefinicje`)
i **zakłada, że istnieje definicja o ID `drzwi`, a w niej części o ID `panel` i `uchwyt`**.
Z niej robi sobie szufladę, komodę, półki, kosze i drążek. Bez tej definicji konfigurator
wysypie się na `p.definitions.drzwi.parts`. Wzorzec jest w `v0008-parametric.json` —
przenieś go 1:1 i tylko podmień materiały.

`materials.definitions` musi być **mapą** `{"id-materiału": {type, color, roughness, metalness}}`.
Konfigurator podmienia w niej `color` i `roughness`, i traktuje sufiksy specjalnie:
`-back` ściemnia o 12 %, `-front` idzie na fronty. Zachowaj tę konwencję.

## Wymiary odczytane z v0020 — użyj ich jako punktu kontrolnego

**Skrzydło główne** (wszystkie części bez prefiksu `SHORT-WING-`):

- obrys: szerokość 1764, wysokość 2600, głębokość 570 (x −882…882, y 200…2600, z −285…285)
- cokół: części zaczynają się na y = 200 → `plinthMm: 200`
- piony na x = −873, −291, 291, 873 → **3 kolumny po 582 mm**
- płyty poziome: y = 209 (dno), 791 (wierzch dolnych szafek), 809 (płyta pod biurkami),
  1391 (wierzch biurek), 1991 (półka rzędu otwartego), 2591 (wieniec)
  → **4 rzędy**, prześwity kolejno ≈ 564, 582, 585, 582 mm
- rząd 1 (dół): drzwi kobaltowe w kolumnie 1, szuflada 120 cm na kolumnach 2–3
- rząd 2: biurka z opuszczanymi blatami (białe, `DESK-FLAP-*`)
- rząd 3: otwarty, z listwami LED przy plecach
- rząd 4 (góra): troje białych drzwi 560×560
- materiały: `cobalt-matte` #0047AB, `white-matte` #F5F5F2, `maple-0375` #d8bd99,
  `mirror-polished`, `led-warm`

**Skrzydło krótkie** (prefiks `SHORT-WING-`), obrócone o 90°:

- drewniana skrzynia 600 (x) × 1200 (z) × 1774 (y), spód na y = 808, wieniec na y = 2600
- stoi na czterech toczonych białych nóżkach (cylindry, ≈ 400 mm) z płytkami 70×6×70
- lico na x = −891: stała płyta `SHORT-WING-FIXED-FRONT` 1770×578 + jedne drzwi na pełną
  wysokość `SHORT-WING-DOOR-FULL-LEFT` 1770×578
- półka pośrednia na y = 1991
- na czole (z ≈ 915…1115) koralowa nisza `coral-light-matte`: 600 × 582 × 200,
  podzielona pionami na x = −1182 i −1032 oraz półkami na y = 950, 1100, 1250

W wersji parametrycznej to skrzydło opisz jako osobny korpus **1200 × 1792 × 600**
(szerokość biegnie wzdłuż z oryginału), z `plinthMm: 0` — nóżki zostają jako osobne części
poza `parametric`, albo pomiń je i zaznacz to w `summary`.

## Czego się nie da i jak to obejść

`carcass` ma **jeden** materiał korpusu, jeden pleców i jeden półek. Regał ma kobalt na dole,
biel wyżej i drewno w krótkim skrzydle. Rozwiąż to tak:

- korpus skrzydła głównego: `white-matte`,
- kobalt wyłącznie na frontach dolnego rzędu — osobna definicja `drzwi-kobalt` z materiałem
  `cobalt-matte`, instancja tylko na `{"rows": [1]}`,
- drewno: korpus skrzydła krótkiego to `maple-0375`,
- koralowa nisza: osobna definicja `nisza-koral` wstawiana w jedną komórkę,
- LED: zostaw jako części poza `parametric` albo pomiń i napisz o tym w `summary`.

Jeśli uznasz, że któregoś detalu nie da się wyrazić w tym kontrakcie — **nie naciągaj go**.
Wypisz go w `notes` jako świadome odstępstwo.

## Jak sprawdzić, że wyszło

```bash
node -e "
import('./renderery/webgpu/parametryczne.js').then(async m => {
  const fs = await import('node:fs');
  for (const p of ['v0021-parametric.json','v0022-parametric-skrzydlo.json']) {
    const d = JSON.parse(fs.readFileSync('meble/regal-przy-lozku/wersje/' + p));
    m.sprawdzParametryczny(d.parametric);
    const w = m.rozwinParametryczny(d.parametric);
    console.log(p, w.parts.length, 'części,', w.komorki.length, 'komórek');
  }
});
"
```

Musi przejść bez wyjątku, a liczba komórek ma się zgadzać z `columns.count × rows.count`.
Dodatkowo `validateFurnitureV2()` musi zwrócić status `ok` albo `partial` — nie `error`.

W odpowiedzi podaj oba pliki w całości oraz krótką listę rzeczy, których świadomie nie
przeniosłeś z v0020.
