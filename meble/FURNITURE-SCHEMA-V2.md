# Furniture Schema v2

Kontrakt v2 przechowuje dane projektu w milimetrach. Renderer normalizuje v1 i v2 do tego
samego wewnętrznego modelu, więc semantic part IDs pozostają stabilne. Aktywne wersje v1
nie zostały zmigrowane. POC `regal-salon:v0005-poc-v2` jest wersją nieaktywną.

## Warstwy stanu

- `designTime` wybiera jawny named state zapisany przez projektanta.
- `states.named` zawiera jedyne stany, które wolno trwale zapisać.
- `runtimeState` jest zabroniony; bieżące otwarcie, kamera i akumulacja pozostają w pamięci runtime.
- `rendererDefaults` podaje neutralne wartości startowe.
- `rendererOverrides` zawiera jawne, wersjonowane odstępstwa konkretnego backendu.

## Sekcje

`geometry`, `materials`, `lights`, `mechanics`, `interactions`, `states`, `constraints`,
`assets`, `anchors`, `customParameters` i `extensions` są obowiązkowe. Walidator odrzuca
duplikaty ID, brakujące materiały, rodziców, części mechanizmów, anchory constraintów,
assety materiałów i domyślny named state. Nieznane rozszerzenie z `required:true` odrzuca model;
opcjonalne daje status `partial`.

## Wymagania wynikające z P7–P18

- P7: wersja, zatwierdzone placement, stabilne ID, rozszerzenia wymagane/opcjonalne i transakcyjna podmiana.
- P9: parametry soft geometry, seed, stan nazwany i realizer version muszą należeć do danych projektu.
- P10: asset deklaruje URI, encoding i color space; materiał odwołuje się do niego przez ID.
- P11–P14: attachmenty i historie pozostają renderer defaults/overrides, poza semantyką materiału.
- P15: named furniture states są oddzielone od zapisanych widoków kamery.
- P16–P17: tryby jakości i liczba próbek są renderer overrides, nie runtime furniture state.
- P18: placement/anchors/constraints zasilają kolizje; stan kamery nie trafia do mebla.

## Migracja

`migrateFurnitureV1ToV2()` przenosi `model.parts/materials/joints/lighting` bez zmiany ID,
dodaje pusty, jawny kontrakt pozostałych sekcji i named state `default`. Wynik trzeba uzupełnić
o trwałe parametry projektu przed zatwierdzeniem nowej wersji. `normalizeFurnitureDocument()`
obsługuje oba formaty. Masowa automatyczna aktywacja migracji jest celowo wyłączona.

Test lokalny:

`?furnitureSource=local&furnitureV2=regal-salon:v0005-poc-v2&quality=minimalna`
