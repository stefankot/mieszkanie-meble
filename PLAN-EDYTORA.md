# PLAN-EDYTORA — plan działania i stan przekazania

Plik dla modelu, który przejmuje pracę. Aktualizowany przyrostowo w trakcie prac.
**Ostatnia aktualizacja:** 2026-09-17 — makieta UI gotowa do oceny (dev działa, build zablokowany przez @open-pencil/vue — patrz krok 5).

## 1. Cel
Edytor aranżacji wnętrz 3D (przeglądarka, WebGPU) na bazie istniejącego renderera
`renderery/webgpu/` (podgląd: https://stefankot.github.io/mieszkanie-meble/).
Użytkownik pracuje sam, na laptopie z gładzikiem. Język UI: polski.

## 2. Zasady nadrzędne (od użytkownika)
1. **Logika i układ UI jak D5 Render.** Czego brak w D5 → wzór **Spline** (edytor 3D). Wygląd: ciemny, gęsty, jak Spline/openpencil.
2. **Library-first**: aktywnie utrzymywane biblioteki npm, aktualizowane automatycznie (Renovate); 0.x dopuszczalne, ale przypięte i aktualizowane po testach.
3. **Oszczędność tokenów**: odpowiedzi zwarte (tabele/punkty); kod w małych plikach (≤ ~300 linii), foldery według funkcji, `MAPA.md` z opisem plików — model czyta tylko potrzebne części.
4. **Pytania doprecyzujące jako interaktywna ankieta** (AskUserQuestion), nie w tekście.
5. **Przy teksturach** zawsze pokazać kandydatów do wyboru, nie wybierać samemu.
6. **Pierwszy krok = sam wygląd UI (makieta)**, nawet jeśli nie działa — od wyglądu zależy reszta.
7. Zmiany mogą trafić do `main` (zgoda 17.09), ale przed pushem pokazać makietę.

## 3. Repozytoria i gałęzie (stan 17.09)
| Miejsce | Stan |
|---|---|
| GitHub `stefankot/mieszkanie-meble` `main` | 83ddb0a (16.09) — źródło prawdy dla renderera |
| Ten worktree: `Desktop/mieszkanie walkthrough/mieszkanie-edytor`, gałąź `edytor-vue` | od origin/main; upstream celowo odpięty (zwykłe `git push` nie trafi na main) |
| `Desktop/mieszkanie walkthrough/repo-do-wyslania` (lokalny `main`) | 163 commity za GitHubem; **nie synchronizować bez zgody** |
| Kopia Codex `Documents/Codex/2026-09-16/prompt-wdro-eniowy-ui-i-edytor/work/repo` | origin/main + 10 commitów (powłoka Calcite) + 19 niezacommitowanych plików (E1: `ui/parametric-document.js`, `document-persistence.js`, `framing-controller.js`, `selection-controller.js`, `keyboard-router.js`). Nic nie wypchnięte. Decyzja: **brać logikę, nie UI Calcite**. |

## 4. Decyzje użytkownika (ankiety 17.09)
- Zakres: parametry mebli; wstawianie z katalogu z **przyciąganiem do ścian** (bez kolizji, CSG, fizyki); własne światła; pora dnia.
- Widok: orbita + spacer; **VR później**. „Spacer jak film” = **filmowa jakość obrazu w ruchu** (25 FPS wystarczy; bez migotania/szumu; rozmycie ruchu + głębia ostrości; tonowanie + ziarno). NIE eksport wideo. Przy przejściach wdrożyć **tylko płynne przejście punkt→punkt bez przechodzenia przez ściany** (siatka nawigacyjna).
- Materiały: wybór z katalogu próbek. Palety kolorów: import JSON/SVG; stosowanie przez **role w meblu + ręcznie per część + kolejność kolorów**.
- Meble: zostają własne JSON-y; nowy **schemat v2 z `definitions` + `instances`** (jedna definicja drzwiczek/szuflady/modułu powtarzana N razy; kopie różnią się **wariantem detalu**: uchwyt, kierunek, przeszklenie); konwerter v1→v2; renderer `BatchedMesh`.
- Parametry mebla: **sekcja w Inspectorze** (pod Basic, wzór Spline).
- AI: dostawcy **OpenAI + Google Gemini**; klucze API **w przeglądarce** (IndexedDB), działa też na GitHub Pages.
- **OpenAI steruje całym rendererem** danymi ustrukturyzowanymi (zod → JSON Schema; tools/structured outputs), JS waliduje; **rozmowa głosowa na żywo** (OpenAI Realtime) ze zmianami sceny w trakcie rozmowy.
- Render AI (wzór „Plugin X” z 3ds Max): wysyłać kanały obraz + albedo + głębia + normalne + maska; **maski obszarów + nakładka z kryciem**; dostawca z ControlNet później.
- Panele: stałe kolumny ze zwijanymi sekcjami + pływające okna (jak D5: Assets) + ⌘K i skróty.
- Budowanie: **Vite + npm + GitHub Actions → Pages + Renovate** (Actions/Renovate w kolejnym PR).
- Duże pliki silnika (`silnik.js` 1807, `nawigacja.js` 1015, `sterowanie.js` 685 linii) dzielić **stopniowo**, przy zmianie danego fragmentu.

## 5. Architektura docelowa
- Silnik: istniejący vanilla JS + three r185 (WebGPU, TSL) — **nie przepisywać**.
- UI: **Vue 3 + @open-pencil/vue 0.15 (headless: NumberField, PropertySection, SegmentedControl, CommandPalette) + Reka UI + Tailwind 4**.
- Stan UI↔silnik: nanostores. Historia/cofnij: logika E1 z kopii Codex.
- **Rejestr operacji** (`edytor/src/ops/`): każda zmiana = operacja {nazwa, opis, schemat zod, wykonanie, cofnięcie}. Z rejestru korzystają: przyciski UI, ⌘K, polecenia tekstowe (structured outputs OpenAI/Gemini) i głos (`@openai/agents-realtime`, narzędzia z `z.toJSONSchema`). Operacje odczytu (`scene.describe`) dają modelowi stan.
- Pozostały stack (wdrażany w kolejnych krokach): three-mesh-bvh (zaznaczanie, przyciąganie), @recast-navigation/three (trasa przejść), tinykeys, fuse.js, culori (palety), idb, dockview (zapisane układy), virtua (siatka assetów), lucide, `ai` + `openai` + `@google/genai`, vitest/Playwright. Efekty filmowe: węzły TSL z three (MotionBlur, DepthOfFieldNode, FilmNode, Lut3DNode, TRAA, RecurrentDenoise).
- Odrzucone: tweakpane/leva (rzadko aktualizowane), theatre, cmdk, three-gpu-pathtracer (tylko WebGL), Next.js, Calcite (wygląd GIS).

## 6. Mapa UI (logika D5, braki → Spline)
| Strefa | Zawartość | Wzór |
|---|---|---|
| Górny pasek | lewo: menu, plik, **Biblioteka** (Assets); środek: narzędzia (światło, wstaw mebel, paleta); prawo: **Zdjęcie** (tryb renderu), Render AI, eksport | D5 |
| Lewa kolumna, zakładka **Scena** | **Widoki** (miniatury = teleport), **Warstwy**, **Obiekty / Zaimportowane** (drzewo + szukaj) | D5 |
| Lewa kolumna, zakładka **Agent** | historia rozmowy z AI, pole polecenia, mikrofon (Realtime) | Spline (Agent) |
| Nad sceną | lewo: zaznacz/przesuń/obróć, przyciąganie do ścian; prawo: **Kamera ▾**, **Wyświetlanie ▾** | D5 |
| Prawa kolumna | zakładki **Otoczenie / Efekty / Inspektor** | D5 |
| Inspektor mebla | nagłówek + akcje; **Podstawowe** (położenie/obrót/rozmiar XYZ); **Parametry**; Wersja; Mechanizmy; **Materiał**; **Paleta** | D5 + Spline (Parametry) |
| Otoczenie | Geo i niebo / HDRI; tarcza słońca (pora roku, godzina); ciepło (gradient); źródła światła | D5 |
| Efekty | priorytet renderowania, ekspozycja, tonowanie, wygładzanie, światło pośrednie, odbicia, **filmowe**: rozmycie ruchu, głębia ostrości, ziarno, LUT | D5 |
| Biblioteka (pływające okno) | Online/Lokalne; Modele/Materiały/Palety; szukaj; Wszystkie/Ostatnie/Ulubione; kategorie z licznikami; siatka miniatur | D5 |
| Tryb Zdjęcie | prawa kolumna zamienia się na ustawienia obrazu + **Render AI** (kanały, maski, dostawca, model, prompt, krycie nakładki) | D5 + Plugin X |
| ⌘K | lista operacji z rejestru | Spline/openpencil |

## 7. Stan prac
### Etap 1–4 (analiza) — ZAKOŃCZONE
Wyniki w historii rozmowy; kluczowe fakty:
- Spline (bundle po zalogowaniu): three r185, WebGPURenderer opcjonalnie, React 19 + Radix, Rapier (physics.wasm), Manifold (CSG), Cloner + BatchedMesh, OpenAI Realtime, Monaco. Framer: React 18.2, zod, immer, virtua, podgląd w izolowanym iframe. openpencil: Vue 3.5 + Reka + Tailwind 4 + @open-pencil/vue (headless), Yjs, AI SDK, tinykeys, pragmatic-dnd, culori.
- Meble v1: 72–97% części to powtórzona geometria (kuchnia 85/119, regał-kuchnia 31/32, regał-salon 84/88, regał-przy-łóżku 61/81); brak instancjonowania.
- Teleport przechodzi przez ściany: `lec()` w `renderery/webgpu/nawigacja.js` interpoluje pozycję po prostej.
- Renderer pobiera meble z `raw.githubusercontent.com/.../main/` → Vite nie psuje publikacji mebli z ChatGPT.

### Krok 5 — makieta UI (W TOKU)
- [x] worktree `edytor-vue`, `package.json` (wersje przypięte), Vite 8 (`root: edytor`), Tailwind 4, Vue 3.5
- [x] serwer dev: `npm run dev` → http://localhost:5173/ ; `renderery/`, `plan/`, `meble/` serwowane surowo (plugin `silnik-bez-transformacji` w `vite.config.ts`)
- [x] komponenty makiety wg mapy z sekcji 6 (dane przykładowe z prawdziwego repo) — `edytor/src/ui/**`
- [x] prawdziwy renderer w ramce w środku (stary panel `#sterowanie` ukryty); `edytor/src/silnik/most.ts` — klik w Widoki teleportuje (`__silnik.nawigacja.teleportujDoPokoju`)
- [x] szkielet rejestru operacji (`edytor/src/ops/rejestr.ts`, `operacje.ts`; zod → `narzedziaAI()`) + ⌘K (`ui/command/PaletaPolecen.vue`)
- Pułapki napotkane: (1) w komentarzu `/* … meble/*/manifest.json … */` sekwencja `*/` zamyka komentarz — używać `//`; (2) prop boolean w Vue bez wartości = `false`, więc `otwarta ?? true` nie działa → `withDefaults`; (3) `PositionControls` z @open-pencil/vue jest związany z edytorem openpencil — XYZ złożone z 3× `NumberField`; (4) `PropertySectionHeader` nie przełącza sam — `@click="actions.toggle()"`.
- [x] przegląd wszystkich stanów w przeglądarce 1440×900 (Inspektor, Otoczenie, Efekty, Agent, Zdjęcie, Biblioteka, ⌘K) + poprawki (XYZ nad polami, zawijanie etykiet, `PrzyciskIkona` z `inheritAttrs:false` — TooltipRoot gubił `@click`, ⌘K także w ramce renderera)
- [x] `edytor/MAPA.md`
- [ ] pokazanie użytkownikowi i akceptacja wyglądu

### ⚠️ Znalezisko: `@open-pencil/vue` 0.15 blokuje build produkcyjny
- `npm run dev` działa; `npx vite build` **nie przechodzi**: `UNRESOLVED_ENTRY node_modules/@open-pencil/core/dist/io/formats/fig/export-worker.ts` i `.../kiwi/fig/session/worker.ts`.
- Przyczyna: prymitywy są w `dist/index2.js`, który importuje `@open-pencil/core/editor` (+ `/color`, `/constants`, `/random`) → cały rdzeń openpencil (3980 modułów, canvaskit, workery `.ts` nieobecne w paczce npm). `exports` pakietu to tylko `"."`, więc nie da się zaimportować samych prymitywów.
- Opcje (decyzja użytkownika): (a) prymitywy z **Reka UI** (Collapsible, ToggleGroup, NumberField, Listbox) + własny scrub ~30 linii — wygląd bez zmian, zero zależności od rdzenia openpencil; (b) plugin Vite podmieniający 2 URL-e workerów — obejście kruche przy aktualizacjach; (c) zgłoszenie błędu w open-pencil i czekanie.
- Dotyczy plików: `ui/primitives/Sekcja.vue`, `PoleLiczby.vue`, `Segmenty.vue`, `ui/command/PaletaPolecen.vue`.

## 8. Jak uruchomić
```
cd "Desktop/mieszkanie walkthrough/mieszkanie-edytor"
npm install
npm run dev          # http://localhost:5173/
npm run test:silnik  # dotychczasowe testy node --test
```
Pomiar FPS tylko na widocznym oknie przeglądarki (ukryta karta daje fałszywe czasy).

## 9. Następne kroki (kolejność po makiecie)
1. Akceptacja wyglądu przez użytkownika → poprawki makiety.
2. Vite build + GitHub Actions (Pages) + Renovate.
3. Płynne przejścia po siatce nawigacyjnej (zamiast `lec()` po prostej).
4. Scalenie logiki z kopii Codex (historia/cofnij, zaznaczanie, klawiatura, kadrowanie).
5. Schemat mebli v2 (definitions/instances) + konwerter + BatchedMesh + nowy FORMAT-MEBLA dla ChatGPT.
6. Podłączenie powłoki do silnika przez rejestr operacji; Inspektor (parametry, materiały, palety).
7. Biblioteka: wstawianie + przyciąganie do ścian + gizmo; własne światła.
8. Profil filmowy 25 FPS (najpierw pomiar).
9. AI: polecenia tekstowe + rozmowa Realtime na rejestrze operacji.
10. Render AI (kanały, maski, nakładka); warianty A/B; eksport JSON projektu.
Później: VR, ControlNet, kolizje, CSG, fizyka.

## 10. Ryzyka
- Fotorealizm w ruchu vs wydajność (ostatni pomiar 10.09: 16,5 FPS „wysoka”, M2).
- @open-pencil/vue 0.x — API może się zmieniać; wymaga peer `@open-pencil/core` + `canvaskit-wasm` (tylko instalacja).
- API OpenAI/Gemini nie gwarantują wierności geometrii w renderze AI.
