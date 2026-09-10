# Dziennik P19–P34 — optymalizacja jakości i wydajności

Baza: `origin/main` 7538fd0 (P18). Gałąź lokalna: `webgpu-optymalizacja-p19` (niewysłana, czeka na zatwierdzenie).
Podgląd: http://localhost:8123/webgpu/mieszkanie-webgpu-v1.html — katalog `webgpu/` jest kopią
`repo-do-wyslania/renderery/webgpu/` (rsync po każdym punkcie, bez `tekstury/`).

## Jak porównać wersje
- Jeden punkt = jeden commit. Lista: `git log --oneline 7538fd0..webgpu-optymalizacja-p19`; diff punktu: `git show <hash>`.
- A/B w przeglądarce bez przełączania wersji: `?bez=<flaga>[,<flaga>]`; `?bez=wszystko` wyłącza wszystkie flagi P19+.
  Uwaga: `?bez=wszystko` nie cofa zmian bez flagi (P25 TAAU → `?aa=smaa`, P33 importmap → domyślnie r185).
- Pomiar: `?perf=1` → nakładka FPS/CPU/GPU; w konsoli `await __silnik.perf.probka(5)`.
  Mierzyć tylko przy WIDOCZNEJ karcie i podtrzymanym rysowaniu: `setInterval(() => __silnik.oznaczZmiane(), 150)`
  (P22 zatrzymuje rysowanie po 2,5 s bez zmian). Czas GPU z timestamp-query bywa zawyżony — wiarygodny jest FPS.
- Stały kadr: `__silnik.nawigacja.kadrujMebel(__silnik.biblioteka.meble.get('regal-salon').korzen)`.
- Pomiary: panel Browser Claude (Chromium, Apple M2), 840×987 lub 1036×987, DPR 2, pixelRatio 1, jakość „wysoka”.

## Tabela zbiorcza
| Punkt | Commit | Flaga / A/B | Pliki → miejsca | Wynik |
|---|---|---|---|---|
| P19 pomiar + flagi | eca30e9, 017aa35 | `?perf=1` | `wydajnosc.js` (nowy) → `utworzPomiar()`; `flagi.js` (nowy) → `wlaczone(id)`; `silnik.js` → `trackTimestamp: PERF`, `pomiar.poKlatce()` | infrastruktura; P19b: czas GPU dzielony przez liczbę klatek od odczytu |
| P20 anizotropia 16 | 81a305b | `aniso` | `materialy.js` → `maxAniso` | 8 skanów: anisotropy 1 → 16 (warunek `hasFeature('anisotropic-filtering')` zawsze false w WebGPU) |
| P21 bez łun o mocy 0 | ee6f2d5 | `luny` | `silnik.js` → `const luny` | PointLight w scenie: 2 → 0 |
| P22 rysowanie po zmianie | 3233c0e | `bezczynnosc` | `silnik.js` → `oznaczZmiane()`, `klatka()`, `RYSUJ_PO_ZMIANIE_MS` | po 2,5 s bez zmian 1 klatka kontrolna/s; test przyrostów klatek 1,0,0,1 |
| P23 cień bez przerysowań | bb7697c | `cienstatyczny` | `silnik.js` → gałąź wiatru w `klatka()`, `skalujUVMebli()` (castShadow gdy promień < 5 cm) | 0 odświeżeń mapy cienia w 16 klatkach z wiatrem; rzucające cień 445 → 417 |
| P24 tania szyba | — | — | bez zmian w kodzie | ODRZUCONE: 38,7 → 39,9 FPS (+3%, szum) |
| P25 TAAU domyślnie | 2e93c0c | `?aa=smaa` | `sterowanie.js` → `<select id="antyaliasing">`, `PROFIL_AA` (jednorazowa migracja zapisu) | SMAA 39,0 FPS → TAAU (wejście 75%) 55,8 FPS (+43%); wyjście 1,5× na Retinie 28,7 FPS — odrzucone |
| P26 miękkie bryły tkanin | 7d93f6f | `miekkie` | `miekkie-bryly.js` (nowy) → `zmiekczTkaniny()`; `silnik.js` → `skalujUVMebli()` | materac 18 tys. wierzch., poduchy 2,8 tys.; wymiary poduch 80,2×40,5×19,7 cm (nominalnie 80,2×40×18); styki wykryte; UV + AO w kolorze wierzchołków |
| P27 tkanina w TSL | — | — | bez zmian w kodzie | POMINIĘTE: po P26/P29 tkanina ma splot, sheen i AO |
| P28 draperia zasłon | 21cf399 | `zaslony2` | `draperia.js` (nowy) → `utworzDraperie()`; `zaslony.js` → tworzenie paneli, `zastosuj()` | 8 unikalnych geometrii (było 2); odsłanianie morfingiem, stała długość łuku |
| P29 (10a) tekstury użytkownika | 3c61b99 | `tekstury10a` | `tekstury-uzytkownika.js` (nowy), `tekstury-uzytkownika/*.jpg`; `silnik.js` → `materialBazowy.metal/wood`, `skalujUVMebli()`, `wczytajSrodowiskoPozniej()` | posadzka kuchni; łazienka i WC podłoga + ściany do sufitu; stal nierdzewna (własna envMap ×2,5); tkanina łóżka; rama łóżka z forniru regału |
| P30 drzewa 3D | d88bf1e | `drzewa3d` | `drzewa.js` (nowy) → `utworzDrzewa()`; `silnik.js` → sekcja WIDOK ZA OKNEM | 24 drzewa, 4 warianty, 35,9 tys. trójkątów, wiatr w positionNode; 36,4 FPS przy łóżku bez zmian |
| P31 tańsze niedoskonałości | 9de0d07 | `szumtani`, `niedoskonalosci` | `niedoskonalosci.js` → `dodajNiedoskonalosci()` | pełny 44,3 FPS / GPU 16,2 ms → tani 49,2 FPS / GPU 14,2 ms (+11%); bez warstwy 53,5 FPS |
| P32 BundleGroup | — | — | bez zmian w kodzie | ODRZUCONE: CPU 4,1 ms przy GPU 14,2 ms, 161 draw calls po cullingu |
| P33 three.js r186 | (ten commit) | `?three=186` | `mieszkanie-webgpu-v1.html` → importmap wstawiany skryptem | r186 bez błędów, obraz identyczny; r185 48,5 FPS / CPU 4,0 ms vs r186 49,6 FPS / CPU 3,5 ms (+2%, szum) — domyślnie r185 |
| P34 KTX2 dla skanów | — | — | bez zmian w kodzie | POMINIĘTE: etapy „Skany PBR” 1–37 ms; start ogranicza kompilacja shaderów |

## Uwagi dla kolejnego modelu
- Model łóżka (moduł legacy z SHA-256) i modele JSON nie są zmieniane — P26/P29 działają na siatkach po zbudowaniu.
- P29 wybiera siatki ramy łóżka po nazwach (`RAMA_LOZKA` w `tekstury-uzytkownika.js`); wymiary próbek tekstur
  (`CM`: płytki 80, stal 60, tkanina 30 cm) są przyjęte, nie zmierzone.
- Skrypty diagnostyczne z `setInterval` muszą sprawdzać, czy `window.__silnik` istnieje — wyjątek w interwale
  uruchamia globalną obsługę błędów strony i pokazuje ekran „Nie udało się uruchomić sceny”.
