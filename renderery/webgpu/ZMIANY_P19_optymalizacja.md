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

## P19 — pomiar i przełączniki A/B
- Pliki: `wydajnosc.js` → `PERF`, `utworzPomiar()`; `flagi.js` → `wlaczone(id)`;
  `silnik.js` → importy, `new WebGPURenderer({trackTimestamp: PERF})`, `pomiar.poKlatce()` w `klatka()`.
- Działanie: `?perf=1` włącza timestamp-query (koszt tylko w trybie pomiaru); czas CPU = od początku
  `klatka()` do po `rysujZnacznik()`; czas GPU = `renderer.resolveTimestampsAsync('render')`.
- Pomiar bazowy: patrz wpis „Baseline” niżej.
