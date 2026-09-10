# P15 — ARCH_PHOTO i tone mapping

`?camera=arch` włącza kamerę poziomą: roll i pitch są zerowane, a pionowy lens shift pozwala zmienić kompozycję bez pochylania kamery. FOV jest ograniczony do 30–60°. Panel zapisuje do 24 nazwanych kadrów w localStorage; są to ustawienia użytkownika, nie dane projektu ani `furniture.json`.

Tone mapping przełącza się niezależnie: baseline ACES bez parametru, `?tone=neutral`, `?tone=agx`. HDR, exposure, światła, white balance i materiały nie są przez przełącznik zmieniane. Ocena pozostaje po stronie użytkownika.

[RUNTIME] Chromium/WebGPU, Apple M2, 1280×720: ARCH_PHOTO uruchomił profil `wysoka` z SMAA, zapisał nazwany kadr i przełączył ACES → Neutral → AgX bez błędu zgłoszonego przez UI. Pięć modeli pozostało `complete`.
