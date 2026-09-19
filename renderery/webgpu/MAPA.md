# MAPA — renderery/webgpu (silnik WebGPU)

<!-- PLIK GENEROWANY: `node narzedzia/mapa.mjs`. Nie edytuj ręcznie. -->

Czytaj najpierw tę mapę, potem **tylko** potrzebny moduł.

Silnik działa w ramce `<iframe>` edytora. Wejście: `mieszkanie-webgpu-v1.html` → `silnik/index.js`.
Publicznym API jest obiekt `window.__silnik` (czyta go `edytor/src/silnik/most.ts`).

## Moduły

- `arch-photo.js` · 63 l. · `ARCH_PHOTO`, `ARCH_FOV`, `wybierzTrybKamery`, `poprawnyNamedView`, `utworzArchPhoto`
- `bed-version-migrations.js` · 96 l.
- `biblioteka.js` · 614 l. · `sygnaturaManifestu`, `zastosujRuch`, `zbudujModel`, `uruchomBiblioteke`
- `draperia.js` · 71 l. · `utworzDraperie` — P28 — draperia zasłon: losowe fałdy na panel i stała długość tkaniny.
- `drzewa.js` · 118 l. · `utworzDrzewa` — P30 — drzewa 3D za oknami z wiatrem w shaderze.
- `film.js` · 76 l. · `utworzProfilFilmowy`
- `flagi.js` · 8 l. · `wlaczone` — P19 — przełączniki A/B zmian P19+.
- `front-parametryczny.js` · 9 l. · `frontParametryczny`
- `furniture-schema-v2.js` · 123 l. · `validateFurnitureV2`, `normalizeFurnitureDocument`, `migrateFurnitureV1ToV2`
- `furniture-sync.js` · 101 l. · `STATUS_MODELU`, `odrzucDuplikatyId`, `sprawdzRozszerzenia`, `wybierzPotwierdzoneUmiejscowienie`, `czyWersjaPotwierdzona`, `utworzBramkePokolen`, `singleFlight`, `statusPoZbudowaniu`, `odrzuconyStan`
- `gizmo.js` · 30 l. · `utworzGizmo` — Uchwyt przesuwania i obracania (TransformControls z three/addons) dla edytora.
- `hover-outline.js` · 29 l. · `utworzHoverOutline` — Ekranowy obrys zaznaczenia z oficjalnego OutlineNode Three.js r185.
- `interakcje.js` · 87 l. · `utworzInterakcje`
- `kadrowanie.js` · 132 l. · `utworzKadrowanie`
- `materialy.js` · 346 l. · `wczytajMaterialy`, `wczytajSrodowisko`
- `miekkie-bryly.js` · 265 l. · `zmiekczTkaniny` — P26 — miękkie bryły tkanin (materac, poduchy).
- `mini-mapa.js` · 131 l. · `zbierzMebleMapy`, `utworzMiniMape`
- `model-swiatla-dziennego.mjs` · 20 l. · `modelSwiatlaDziennego`
- `mrt-audit.js` · 30 l. · `MRT_PROFILE_NEEDS`, `audytMrt`
- `native-meble.js` · 329 l.
- `navigation-config.mjs` · 2 l. · `DEFAULT_EYE_HEIGHT_CM`
- `navigation-regression.js` · 118 l. · `NAV_KEY_MAP`, `SHIFT_NAV_KEY_MAP`, `navigationActionForKey`, `classifyTrackpadGesture`, `runNavigationRegression`
- `nawigacja.js` · 1115 l. · `utworzNawigacje`
- `niedoskonalosci.js` · 142 l. · `ustawWariacjeKoloru`, `dodajNiedoskonalosci`, `skrzywFormatki`
- `oswietlenie-mebli.js` · 315 l. · `oswietlWneki`, `odswiezOswietlenieMebli`
- `panel-navigation.js` · 80 l. · `utworzNawigacjePanelu`
- `panel-style.js` · 120 l. · `STYL_PANELU` — Static styles: no animated blur or extra work in the rendering loop.
- `parametryczne.js` · 173 l. · `parsujWlasny`, `rozloz`, `sprawdzParametryczny`, `rozwinParametryczny`
- `photo-path.js` · 24 l. · `PHOTO_PATH_CONTRACT`, `inspectPhotoPathCapability`, `createPhotoPathIntegration`
- `photo-raster.js` · 27 l. · `PHOTO_RASTER_TARGET`, `createPhotoRasterState`, `updatePhotoRasterState`, `photoRasterSlices`
- `plan.js` · 75 l. · `APARTMENT_DATA`, `utworzPlan` — Geometria mieszkania z rzut_zp3.svg.
- `presety-swiatla.mjs` · 21 l. · `PRESSETY_SWIATLA`, `DOMYSLNY_PRESET_SWIATLA`, `dataPresetuSwiatla` — Stałe, deterministyczne pory dla Warszawy.
- `siec.js` · 72 l. · `TERMIN`, `PROBY`, `zTerminem`, `ponow`, `pobierz`, `postep`, `koniecPomiaru`
- `soft-geometry.js` · 74 l. · `SOFT_REALIZER_VERSION`, `kluczMiekkiejGeometrii`, `ograniczMiekkaGeometrie`, `stanyMiekkiejGeometrii`, `realizujMiekkaGeometrie`, `statystykiCacheMiekkiejGeometrii`
- `ssr-variants.js` · 14 l. · `SSR_MODERN`, `SSR_BASELINE`, `SSR_MODERN_SETTINGS`, `wybierzSSR`
- `sterowanie.js` · 686 l. · `utworzSterowanie`
- `suwaki-jakosci.js` · 65 l. · `dodajSuwakiJakosci` — P37 — suwaki parametrów jakości obrazu w zakładce „Jakość”.
- `swiatla-edytora.js` · 97 l. · `kandeleZLumenow`, `katStozka`, `utworzSwiatlaEdytora`
- `tekstury-online.js` · 58 l. · `utworzTeksturyOnline` — Wczytywanie tekstur spoza silnika (biblioteki online, pliki użytkownika).
- `tekstury.js` · 110 l. · `utworzTekstury`
- `trasa.js` · 132 l. · `widac`, `dlugoscTrasy`, `znajdzTrase`
- `uklad-zaslon.mjs` · 37 l. · `wyznaczScianyZaslon`, `wysokoscZaslony` — Wyznacza ścianę zewnętrzną z oknami po aktualnej geometrii planu.
- `uv-drewna.js` · 40 l. · `semantyczneUV` — P5: UV autorstwa modelu, w lokalnych mm.
- `world-gi.js` · 77 l. · `SPEEDBALL_VERSION`, `SPEEDBALL_PARAM`, `wybierzWorldGI`, `utworzWorldGI` — P13 — izolowany pilot światła pośredniego w przestrzeni świata.
- `wydajnosc.js` · 73 l. · `PERF`, `percentyl`, `utworzPomiar` — Pomiar wydajności renderera.
- `zaslony.js` · 185 l. · `utworzZaslony`
- `zasoby-mebli.js` · 63 l. · `przygotujKorzenMebla`, `zwolnijNieUzywaneZasoby`

_Razem: 47 plików, 6673 linii._
