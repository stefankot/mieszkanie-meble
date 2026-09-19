# Mieszkanie — meble, silnik, edytor

Aplikacja na żywo: <https://stefankot.github.io/mieszkanie-meble/edytor-app/> (budowana z `edytor/` przez
`.github/workflows/edytor.yml`, publikowana na `main`). Edytor Vue trzyma silnik w `<iframe>`.

## Zasada numer jeden: czytaj mapę, nie katalog

Każdy katalog z kodem ma `MAPA.md` — jedna linia na plik: rozmiar, eksporty, jedno zdanie opisu.
**Zacznij od mapy, potem otwórz tylko ten jeden moduł, który zmieniasz.** Mapy są generowane:

```bash
node narzedzia/mapa.mjs
```

| mapa | co opisuje |
| --- | --- |
| `edytor/MAPA.md` | powłoka Vue (`edytor/src`) — pisana ręcznie, pogrupowana tematycznie |
| `renderery/webgpu/MAPA.md` | silnik WebGPU |
| `renderery/webgpu/silnik/MAPA.md` | moduły rozruchu silnika |
| `konfigurator/MAPA.md` | konfigurator szafy |
| `narzedzia/MAPA.md` | skrypty poza aplikacją |

## Układ repozytorium

- `edytor/src/` — powłoka Vue 3 + Tailwind (nanostores, reka-ui). To jest UI aplikacji.
- `renderery/webgpu/` — silnik WebGPU (three.js r185 z CDN, TSL). Wejście: `mieszkanie-webgpu-v1.html`
  → `silnik/index.js`. Publiczne API silnika to `window.__silnik`; edytor czyta je przez
  `edytor/src/silnik/most.ts`. **To jest jedyna granica między powłoką a silnikiem.**
- `meble/<id>/` — biblioteka mebli: `manifest.json` + `wersje/*.js|json`. Silnik nie zna geometrii
  żadnego mebla, wszystko przychodzi stąd.
- `plan/` — plan mieszkania (SVG + `mieszkanie.json`), źródło geometrii dla `renderery/webgpu/plan.js`.
- `konfigurator/` — osobna aplikacja (konfigurator szafy), nie wchodzi do edytora.
- `tests/` — testy silnika (`node --test`), `edytor/src/**/*.test.ts` — testy edytora (vitest).
- `narzedzia/` — skrypty (generator map, Blendkit, budowanie rendererów).
- `archiwum/` — **nie czytaj.** Nieużywany kod historyczny i eksperymenty, patrz `archiwum/README.md`.

## Polecenia

```bash
npm run dev          # serwer dev na :5173 (w tym repo: .claude/launch.json → :5174)
npm run test:silnik  # testy silnika, Node + three r185
npm run test:edytor  # testy edytora, vitest
npm run build        # build Vite do dist-edytor/
node narzedzia/mapa.mjs --sprawdz   # czy MAPA.md są aktualne
```

## Konwencje

- **Nazwy w kodzie po polsku**, nazwy w UI po angielsku (1:1 z D5). Komentarze po polsku.
- **Komentarz wyjaśnia „dlaczego", nie „co".** Ten kod jest gęsty od decyzji renderingowych —
  utrzymuj ten poziom, nie dopisuj komentarzy opisujących składnię.
- **Limit 300 linii na moduł.** Plik, który rośnie ponad to, dzielimy — nie dlatego, że tak ładniej,
  tylko dlatego, że każda edycja takiego pliku kosztuje kilkadziesiąt tysięcy tokenów na otwarcie.
  Sprawdzenie: `node narzedzia/rozmiar.mjs`.
- **Jedna odpowiedzialność na plik**, nazwa pliku mówi którą. Nowy moduł silnika dostaje kontekst
  argumentem i zwraca swoje API (`utworz*({...}) → {...}`) — tak jak wszystkie istniejące.
- Po dodaniu/usunięciu modułu albo zmianie eksportów: `node narzedzia/mapa.mjs`.

## Czego nie ruszać bez potrzeby

- `renderery/zrodla/2026-09-08-v1.html` — mimo że to stary silnik WebGL, `renderery/webgpu/tekstury.js`
  pobiera z niego tekstury po URL-u z GitHuba. Plik jest duży (69 tys. tokenów) i prawie nigdy
  nie jest potrzebny do czytania.
- `edytor-app/`, `dist-edytor/` — wynik builda. Zmieniaj `edytor/src/`, nie build.
- `meble/*/wersje/` — historia wersji mebli; pojedynczy plik potrafi mieć 12 tys. tokenów.
  Aktualna wersja mebla jest wskazana w jego `manifest.json`.
