# Gdzie co siedzi

Ściąga do edycji: znajdź wiersz, otwórz jeden plik. Poza `szafa.js` i `panel.js` żaden
nie przekracza ~350 linii, więc nie trzeba czytać całego konfiguratora, żeby zmienić
jedną rzecz.

| Chcesz zmienić | Plik | Linie |
|---|---|---|
| stan, stałe, `UKLAD`, paleta, źródła dokumentów, wzorce i edycja zbiorcza | `dane.js` | 233 |
| drzewo modułów, kotwice, moduły osadzone w komórce rodzica | `moduly.js` | 193 |
| podział na kolumny i rzędy, style, klon dokumentu v2, definicje drzwi/półek | `model.js` | 345 |
| wnęki (scalone komórki, wyściółka, zawartość) i nóżki prętowe | `wneki.js` | 123 |
| eksport JSON i dociąganie wymiarów do IKEA LASTARE | `eksport.js` | 58 |
| parser siatki wpisywanej ręcznie (styl Custom, składnia CSS grid) | `siatka.js` | 74 |
| scena three.js, światło, otoczenie, budowa bryły, kamera i przelot | `scena.js` | 321 |
| materiały, proceduralny słój, tekstury z ambientCG, bryłki bazowe | `materialy.js` | 174 |
| co i ile stoi na półkach, doniczka obok mebla | `dekor.js` | 125 |
| doczytywanie modeli `.glb` z `modele/` | `modele.js` | 94 |
| rysowanie nakładki: komórki, wnęki, wymiary, znaczniki mebli | `nakladka.js` | 149 |
| karty edycji: komórka, wnęka, przegroda | `karty.js` | 254 |
| zaznaczanie, przeciąganie przegród, wybór edytowanego mebla | `wybor.js` | 340 |
| kreator mebli: kategorie, układy startowe, wymiary, barwy, katalog Tylko | `kreator.js` | 209 |
| dane z tylko.com: kategorie, linie, palety, układy i przeliczanie ich projektów | `tylko.js` | 236 |
| prawy panel: suwaki, próbniki, pola siatki, biblioteka ambientCG | `panel.js` | 612 |
| start, historia, `przebuduj()`, zapis lokalny, import JSON, mebel fabryczny | `szafa.js` | 657 |
| pathtracing (doczytywany dopiero po włączeniu trybu) | `sciezki.js` | 57 |
| kontrole 3–12: kontrolki, przegrody, przemiatanie wymiarów, karty | `kontrole-podstawy.js` | 136 |
| kontrole 13–36: moduły, wzorce, wnęki, siatka Custom, przedmioty, wydajność | `kontrole-meble.js` | 568 |
| kontrola 37: przeklikanie całego panelu i sprawdzenie, czy wynik jest poprawny | `kontrole-panelu.js` | 96 |
| kontrola 38: prawdziwe kliknięcia w widok 3D — zaznaczanie, wchodzenie, karty | `kontrole-sceny.js` | 104 |
| kontrole 54–58: kreator mebli i dane przepisane z tylko.com | `kontrole-kreatora.js` | 111 |
| uruchamianie kontroli, zakres `?selftest=29-36`, wynik w `window.__wynik` | `selftest.js` | 55 |

## Zależności, o których warto wiedzieć

`szafa.js` jest punktem wejścia i spina resztę. Moduły tworzą cykle (`szafa ↔ scena`,
`nakladka ↔ wybor ↔ karty`, `szafa → panel → kreator → szafa`) — to działa, bo wszystko wywołuje się dopiero w czasie pracy,
a deklaracje `function` są hoistowane. **Nie zamieniaj eksportowanej funkcji na `const`**,
jeśli ktoś woła ją z drugiej strony cyklu.

Stan dzielony między plikami jest wyłącznie w `dane.js` (`stan`) i w dwóch miejscach:
`nakladka.js` trzyma prostokąty komórek w pikselach i wydaje je przez `komorkiEkranu()`,
a `wybor.js` trzyma bieżące zaznaczenie. Nic innego nie pisze po cudzym module.

## Dane spoza kodu

`tylko-projekty.json` — zrzut katalogu tylko.com (46 projektów), `ikony/tylko-*.webp` —
ich piktogramy kategorii. Obu nie da się pobierać na żywo: API i CDN Tylko odrzucają
żądania spoza ich strony. Skąd się wzięły i jak je odświeżyć — `KATALOG-TYLKO.md`.
