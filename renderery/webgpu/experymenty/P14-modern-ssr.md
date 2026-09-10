# P14 — modern SSR w Three.js r185

Porównanie jest izolowane przez przeładowanie strony. Baseline: `?quality=wysoka&aa=smaa`. Wariant: `?ssr=modern&quality=wysoka&aa=smaa`. Kontrolka usuwa `gi=speedball`, więc oba przebiegi zachowują bieżące SSGI i SMAA.

Wariant modern używa wyłącznie API z tagu r185: stochastic GGX SSR, `TemporalReproject`, `RecurrentDenoise`, `setHistory` oraz zewnętrzną historię denoisera. Surowa equirectangularna mapa HDR pozostaje dostępna do `setEnvMap`, ponieważ PMREM nie spełnia kontraktu environment miss SSRNode. Resize, zmiana profilu i skok kamery zerują rozmiar historii, wymuszając jej bezpieczne ponowne zasianie.

Baseline pozostaje aktywny. Ocena jakości odbić jest estetyczna, a wariant modern ma dodatkowe bufory i przebiegi temporalne.

[RUNTIME] Chromium/WebGPU, Apple M2, 1280×720, profil `wysoka`, SMAA: oba warianty ukończyły rozruch, załadowały pięć modeli jako `complete` i wyrenderowały obraz bez błędu walidacji zgłoszonego w UI. Brak GPU timing; nie deklarujemy przewagi wydajnościowej.

Źródła r185: https://github.com/mrdoob/three.js/blob/r185/examples/webgpu_postprocessing_ssr_denoise.html oraz katalog `examples/jsm/tsl/display` tego samego tagu.
