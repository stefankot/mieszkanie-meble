# P17 — PHOTO_PATH integration gate

Three.js **0.185.0** nie eksportuje path tracera WebGPU w core ani w `examples/jsm/Addons.js`.
Repo nie ma też wersjonowanego path tracera lub denoisera zgodnego z jego materiałami TSL.
Dlatego `?quality=photo_path` uruchamia jawnie opisany `PHOTO_RASTER` fallback i nigdy nie
podmienia produkcyjnego renderera.

Izolowany kontrakt w `photo-path.js` blokuje adaptery dla innej rewizji Three, niepełnego API
lub niezgodnej wersji. Przyszły adapter musi przyjąć istniejącą scenę i kamerę, resetować
akumulację po zmianie kadru oraz samodzielnie zwalniać bufory. Dopiero wtedy tryb może
przejść z `photo_raster_fallback` do `experimental`.

Źródła weryfikacji:

- https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/Addons.js
- https://github.com/mrdoob/three.js/releases/tag/r185
