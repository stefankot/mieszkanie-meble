# P13 — world-space GI

## Warianty

- `current SSGI` — bez parametru, dotychczasowy baseline.
- `SSGI + Speedball GI 0.7.0` — `?gi=speedball&quality=wysoka`; pakiet jest ładowany dynamicznie i działa tylko w profilu `wysoka`.

Speedball jest instalowany przed pierwszym renderem, używa 12 podziałów, 32 promieni, jednej kaskady, stabilnego jittera `gated` i nie przejmuje odbić. Dzięki temu test mierzy wkład światła pośredniego przy niezmienionym SSGI/SSR/TAAU. Stan i statystyki pilota są dostępne w `window.__silnik.worldGI.odczyt()`.

## Decyzja

Baseline pozostaje bez zmian. Speedball ma koszt dodatkowego BVH, pól próbników i shaderów, a jego przewaga jest zależna od kadru oraz oświetlenia. Statyczny bake/probes został odrzucony dla P13: wymagałby osobnego pipeline'u bake, wersjonowania assetu i walidacji zgodności z dynamicznymi meblami; Speedball już dostarcza uzasadniony wariant world-space bez wprowadzania tego systemu.

## Pomiar pilota

MacBook Apple M2, Chromium/WebGPU, 1280×720, profil `wysoka`, SMAA: instalacja warstwy JS 12,7 ms; pierwsze gotowe dane po 7,99 s; 2197 probes. Renderer zgłosił wszystkie pięć modeli jako `complete` i nie zgłosił błędu Speedball. To jest czas gotowości całego zadania asynchronicznego, nie pomiar GPU ani presented FPS.

Źródła: https://github.com/cl0nazepamm/speedball oraz pakiet `speedball-gi@0.7.0`.
