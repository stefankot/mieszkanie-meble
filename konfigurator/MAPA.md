# Gdzie co siedzi

Ściąga do edycji: znajdź wiersz, otwórz jeden plik. Poza `szafa.js`, `panel.js`
i `kontrole-meble.js` żaden nie przekracza ~350 linii, więc nie trzeba czytać całego konfiguratora, żeby zmienić
jedną rzecz.

| Chcesz zmienić | Plik | Linie |
|---|---|---|
| stan, stałe, `UKLAD`, paleta, źródła dokumentów, wzorce i edycja zbiorcza | `dane.js` | 234 |
| drzewo modułów, kotwice, moduły osadzone w komórce rodzica | `moduly.js` | 193 |
| podział na kolumny i rzędy, style, klon dokumentu v2, definicje drzwi/półek | `model.js` | 348 |
| wnęki (scalone komórki, wyściółka, zawartość) i nóżki prętowe | `wneki.js` | 123 |
| eksport JSON i dociąganie wymiarów do IKEA LASTARE | `eksport.js` | 58 |
| parser siatki wpisywanej ręcznie (styl Custom, składnia CSS grid) | `siatka.js` | 74 |
| scena three.js, światło, otoczenie, budowa bryły, kamera i przelot | `scena.js` | 330 |
| tło sceny: narożnik pokoju i sylwetka 180 cm jako miarka | `tlo.js` | 76 |
| materiały, proceduralny słój, tekstury z ambientCG, bryłki bazowe | `materialy.js` | 177 |
| co i ile stoi na półkach, doniczka obok mebla | `dekor.js` | 142 |
| doczytywanie modeli `.glb` z `modele/` | `modele.js` | 94 |
| rysowanie nakładki: komórki, wnęki, wymiary, znaczniki mebli | `nakladka.js` | 149 |
| karty edycji: komórka, wnęka, przegroda | `karty.js` | 254 |
| zaznaczanie, przeciąganie przegród, wybór edytowanego mebla | `wybor.js` | 340 |
| kreator mebli: kategoria → linia → styl → wymiary → barwa, katalog i kuchnia | `kreator.js` | 310 |
| dane z tylko.com: kategorie, linie, palety i przeliczanie ich gotowych projektów | `tylko.js` | 172 |
| sześć stylów Original i sześć Edge — generatory geometrii z ich piktogramów | `style-tylko.js` | 210 |
| kreator kuchni: kształt, wymiary, nisza, AGD, para barw | `kuchnia.js` | 167 |
| prawy panel: suwaki, próbniki, pola siatki, biblioteka ambientCG | `panel.js` | 636 |
| start, historia, `przebuduj()`, zapis lokalny, import JSON, mebel fabryczny | `szafa.js` | 693 |
| pathtracing (doczytywany dopiero po włączeniu trybu) | `sciezki.js` | 57 |
| kontrole 3–12: kontrolki, przegrody, przemiatanie wymiarów, karty | `kontrole-podstawy.js` | 136 |
| kontrole 13–36: moduły, wzorce, wnęki, siatka Custom, przedmioty, wydajność | `kontrole-meble.js` | 568 |
| kontrola 37: przeklikanie całego panelu i sprawdzenie, czy wynik jest poprawny | `kontrole-panelu.js` | 96 |
| kontrola 38: prawdziwe kliknięcia w widok 3D — zaznaczanie, wchodzenie, karty | `kontrole-sceny.js` | 104 |
| kontrole 54–60: kreator mebli, style Tylko i kreator kuchni | `kontrole-kreatora.js` | 151 |
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
ich piktogramy kategorii, `ikony/styl-*.svg` — ich piktogramy stylów. Nic z tego nie da się
pobierać na żywo: API i CDN Tylko odrzucają żądania spoza ich strony. Skąd się wzięły
i jak je odświeżyć — `KATALOG-TYLKO.md`.

`ikony/sylwetka.svg` — rysunek „Human" Pelega Reda z Noun Project (CC BY), przycięty do
obrysu postaci. `modele/katalog.json` + `modele/*.glb` — modele z BlenderKit, pobierane
przez `modele/pobierz.py` (role: `polka`, `podloga`, `lampa`).
