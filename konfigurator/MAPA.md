# Gdzie co siedzi

Ściąga do edycji: znajdź wiersz, otwórz jeden plik. Żaden nie przekracza ~530 linii,
więc nie trzeba czytać całego konfiguratora, żeby zmienić jedną rzecz.

| Chcesz zmienić | Plik | Linie |
|---|---|---|
| stan, stałe, `UKLAD`, paleta, źródła dokumentów, wzorce i edycja zbiorcza | `dane.js` | 224 |
| drzewo modułów, kotwice, moduły osadzone w komórce rodzica | `moduly.js` | 138 |
| podział na kolumny i rzędy, style, klon dokumentu v2, definicje drzwi/półek | `model.js` | 300 |
| wnęki (scalone komórki, wyściółka, zawartość) i nóżki prętowe | `wneki.js` | 110 |
| eksport JSON i dociąganie wymiarów do IKEA LASTARE | `eksport.js` | 58 |
| parser siatki wpisywanej ręcznie (styl Custom, składnia CSS grid) | `siatka.js` | 74 |
| scena three.js, światło, otoczenie, budowa bryły, kamera i przelot | `scena.js` | 306 |
| materiały, proceduralny słój, tekstury z ambientCG, bryłki bazowe | `materialy.js` | 174 |
| co i ile stoi na półkach, doniczka obok mebla | `dekor.js` | 125 |
| doczytywanie modeli `.glb` z `modele/` | `modele.js` | 94 |
| rysowanie nakładki: komórki, wnęki, wymiary, znaczniki mebli | `nakladka.js` | 140 |
| karty edycji: komórka, wnęka, przegroda | `karty.js` | 248 |
| zaznaczanie, przeciąganie przegród, wybór edytowanego mebla | `wybor.js` | 291 |
| prawy panel: suwaki, próbniki, pola siatki, biblioteka ambientCG | `panel.js` | 525 |
| start, historia, `przebuduj()`, zapis lokalny, import JSON, mebel fabryczny | `szafa.js` | 511 |
| pathtracing (doczytywany dopiero po włączeniu trybu) | `sciezki.js` | 57 |
| kontrole 3–12: kontrolki, przegrody, przemiatanie wymiarów, karty | `kontrole-podstawy.js` | 131 |
| kontrole 13–36: moduły, wzorce, wnęki, siatka Custom, przedmioty, wydajność | `kontrole-meble.js` | 470 |
| kontrola 37: przeklikanie całego panelu i sprawdzenie, czy wynik jest poprawny | `kontrole-panelu.js` | 96 |
| kontrola 38: prawdziwe kliknięcia w widok 3D — zaznaczanie, wchodzenie, karty | `kontrole-sceny.js` | 103 |
| uruchamianie kontroli, zakres `?selftest=29-36`, wynik w `window.__wynik` | `selftest.js` | 46 |

## Zależności, o których warto wiedzieć

`szafa.js` jest punktem wejścia i spina resztę. Moduły tworzą cykle (`szafa ↔ scena`,
`nakladka ↔ wybor ↔ karty`) — to działa, bo wszystko wywołuje się dopiero w czasie pracy,
a deklaracje `function` są hoistowane. **Nie zamieniaj eksportowanej funkcji na `const`**,
jeśli ktoś woła ją z drugiej strony cyklu.

Stan dzielony między plikami jest wyłącznie w `dane.js` (`stan`) i w dwóch miejscach:
`nakladka.js` trzyma prostokąty komórek w pikselach i wydaje je przez `komorkiEkranu()`,
a `wybor.js` trzyma bieżące zaznaczenie. Nic innego nie pisze po cudzym module.
