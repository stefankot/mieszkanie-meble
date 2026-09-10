# Dziennik P19+ — optymalizacja jakości i wydajności

Baza: `origin/main` 7538fd0 (P18). Gałąź lokalna: `webgpu-optymalizacja-p19` (niewysłana).
Podgląd: http://localhost:8123/webgpu/mieszkanie-webgpu-v1.html — katalog `webgpu/` jest kopią
`repo-do-wyslania/renderery/webgpu/` (rsync po każdym punkcie, bez `tekstury/`).

## Jak porównać wersje
- Jeden punkt = jeden commit. Lista: `git log --oneline 7538fd0..webgpu-optymalizacja-p19`; diff punktu: `git show <hash>`.
- A/B bez przełączania wersji: `?bez=<flaga>[,<flaga>]`; `?bez=wszystko` = zachowanie P18.
- Pomiar: `?perf=1` → nakładka FPS/CPU/GPU; w konsoli `await __silnik.perf.probka(5)`.
- Stały kadr do pomiarów: `__silnik.nawigacja.kadrujMebel(__silnik.biblioteka.meble.get('regal-salon').korzen)`.

## Tabela zbiorcza
| Punkt | Flaga | Pliki | Wynik |
|---|---|---|---|
| P19 pomiar + flagi | — | `wydajnosc.js` (nowy), `flagi.js` (nowy), `silnik.js` | infrastruktura |
| P20 anizotropia 16 | `aniso` | `materialy.js` → `maxAniso` | skany: anisotropy 1 → 16 |
| P21 bez łun o mocy 0 | `luny` | `silnik.js` → `const luny` | 2 PointLight mniej w shaderach |
| P22 rysowanie po zmianie | `bezczynnosc` | `silnik.js` → `oznaczZmiane()`, `klatka()`, `RYSUJ_PO_ZMIANIE_MS` | po 2,5 s bez zmian: 1 klatka/s (test: przyrosty 1,0,0,1) |
| P24 tania szyba | — | bez zmian w kodzie | ODRZUCONE: 38,7 → 39,9 FPS (+3%, szum), regał salon, 840×987, wysoka+SMAA — szyba fizyczna zostaje |
| P25 TAAU domyślnie | — | — | CZEKA: pomiar i ocena migotania |
| P26 miękkie bryły tkanin | `miekkie` | `miekkie-bryly.js` (nowy) → `zmiekczTkaniny()`; `silnik.js` → `skalujUVMebli()` | materac i poduchy: zaokrąglenia, wypchanie, lamówka, zagniecenia, wgniecenia, UV, AO w kolorze wierzchołków |
| P23 cień bez przerysowań | `cienstatyczny` | `silnik.js` → gałąź wiatru w `klatka()`, `skalujUVMebli()` (castShadow < 5 cm) | wiatr nie odświeża cienia; drobne części bez cienia |

## P19 — pomiar i przełączniki A/B
- Pliki: `wydajnosc.js` → `PERF`, `utworzPomiar()`; `flagi.js` → `wlaczone(id)`;
  `silnik.js` → importy, `new WebGPURenderer({trackTimestamp: PERF})`, `pomiar.poKlatce()` w `klatka()`.
- Działanie: `?perf=1` włącza timestamp-query (koszt tylko w trybie pomiaru); czas CPU = od początku
  `klatka()` do po `rysujZnacznik()`; czas GPU = `renderer.resolveTimestampsAsync('render')`.
- Pomiar bazowy: patrz wpis „Baseline” niżej.
