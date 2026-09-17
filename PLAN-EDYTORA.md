# PLAN-EDYTORA — plan działania i stan przekazania

Plik dla modelu, który przejmuje pracę. Aktualizowany przyrostowo w trakcie prac.
**Ostatnia aktualizacja:** 2026-09-17 — makieta 5 (układ Figma UI3) w toku: szyna + lewy panel AI + zakładki Inspector/Environment działają; pływający pasek i przeniesienie Effect NIEZROBIONE.

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
| Ten worktree: `Desktop/mieszkanie walkthrough/mieszkanie-edytor`, gałąź `edytor-vue` | od origin/main; śledzi `origin/edytor-vue` (push trafia tylko na tę gałąź) |
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
- UI: **Vue 3 + Reka UI + Tailwind 4** (@open-pencil/vue odrzucony 17.09 — blokował build, patrz krok 5).
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

## 6a. Wymagania po pierwszej makiecie (17.09)
- Wygląd kontrolek **1:1 pixel perfect jak D5** (nie „w stylu”); przy niewiadomych dopytać użytkownika.
- **Najważniejsze:** białe kropki (hotspoty) przy aktywnych elementach sceny → otwierają Inspektor lub pływający panel kontekstowy obok kropki. Wzór: D5 3.1 **Interactive Presentation** — białe kółka „3D triggers” (przełączają materiały, światło, warianty) + pływający panel **All Variable Sets** (grupy: Material / Environment / element; opcje jako miniatury „Option A/B/C”, wybrana z jasną ramką i pogrubionym podpisem).
- Tryb prezentacji D5 3.1: lewa lista slajdów z numerami i miniaturami (wybrany = niebieska karta), lewy górny róg „wyjście + Demo”, prawy górny „Settings ▾”, dolny środek pager „◈ ‹ 1/5 ›”.
- D5 3.x (zrzut „Houses on Hare”): nagłówki sekcji z chevronem PO LEWEJ („⌄ Weather”), etykiety NAD polami (Sunlight Intensity → pole 0.4 z wypełnieniem), radio „Follow HDRI / Custom”, checkboxy kwadratowe (Volume Light), zakładka Inspector tylko przy zaznaczeniu, pasek podpowiedzi skrótów na dole sceny („Scroll + RMB Adjust Movement Speed”, „Shift+WSADQE Accelerate”…), kolumny boczne ~178 px przy 1920 px.
- Kontrolki przepisać z @open-pencil/vue na **Reka UI + własny scrub** (decyzja 17.09).
- Ankieta 17.09: nazwy **angielskie 1:1 jak D5**; agent AI = zakładka „Agent” w lewej kolumnie (Spline); kropki przy **ruchomych częściach, meblach, światłach**; klik = panel obok kropki + „More…” otwiera Inspector.
- **Start w trybie spaceru** (bez edycji) z podstawowymi funkcjami jak stary panel renderera bez DEV; panel przepisany w stylu D5 (wzór: D5 3.1 Presentation). Edycja dopiero przyciskiem „Edit”.
- Po zakończeniu etapu: podać użytkownikowi listę komend terminala do samodzielnego scalenia repo z GitHubem.

### Makieta 2 (w toku 17.09) — co zrobiono
- `@open-pencil/*` i `canvaskit-wasm` usunięte; prymitywy na Reka UI (`Sekcja`=Collapsible, `Segmenty`=ToggleGroup, `PoleLiczby`=NumberField+scrub, `Pudelko`=Checkbox, `Radio`=RadioGroup, ⌘K=Listbox+fuse.js). `npx vite build` przechodzi (506 KB).
- Tokeny D5 w `styles/app.css`; kolumny 178 px; górny pasek 32 px.
- Tryb spaceru: `ui/walk/*` (Edit/Views, lista widoków z miniaturami z renderera, Settings ▾, pager ◈ ‹ n/7 ›). Settings steruje UKRYTYM starym panelem renderera przez `silnik/most.ts` (`ustawKontrolke`, `kliknij`) — tymczasowy most do czasu rejestru operacji.
- Kropki: `silnik/hotspoty.ts` (źródła: `__silnik.interakcje.ruchy()` 46 części, `scene.getObjectByName('biblioteka:<id>')` meble, `lampy.zarowki` + `lampySufitowe`; rzut co klatkę, zasłonięcie Raycasterem co ~280 ms; zasięg cm: części 320, meble 900, światła 700). `ui/hotspots/*` — panel „All Variable Sets”; stan drzwi/szuflad działa (`interakcje.ustaw`), uchwyt/paleta/barwa światła to makieta.
- Miniatury widoków: `drawImage` z płótna WebGPU w `requestAnimationFrame` ramki ~1,6 s po teleporcie → localStorage `edytor:miniatury`.

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

### Makieta 2 — weryfikacja (17.09, przeglądarka 1440×900)
- Tryb spaceru: renderer na cały ekran, Views z prawdziwymi miniaturami (Salon, Kuchnia), Settings ▾ czyta i ustawia stary panel (projekt, wersja, pora dnia, ciepło, priorytet), pager, mini-mapa ze stylami, kropka „Regał w salonie” → panel Doors & drawers / Palette → More… przechodzi do Inspectora.
- Tryb edycji: układ D5 (178 px), Environment zgodny ze zrzutem D5 3.x, Inspector (12 akcji, Basic, Parameters, Version, Mechanisms, Material), Assets, ⌘K; `npx vite build` OK.
- Znane ograniczenia: (1) po edycji `silnik/*.ts` w trakcie `npm run dev` HMR tworzy drugą instancję modułu — kropki znikają do pełnego przeładowania strony; (2) miniatura widoku powstaje dopiero po jego odwiedzeniu; (3) warianty uchwytów, palety na kropkach, barwa światła, parametry i materiały w Inspectorze to makieta (bez wpływu na scenę); (4) kropki świateł tylko dla `lampy.zarowki`/`lampySufitowe`, ledy pominięte; (5) porównanie pixel-perfect z D5 zrobione wzrokowo, bez nakładania zrzutów.

### Makieta 3 — metryki D5 (17.09, po uwadze „za małe odległości”)
Pomiary na zrzutach D5 3.x (obraz 2000 px ≈ okno 1920 px) → tokeny CSS w `styles/app.css` (`--pasek`, `--kolumna-lewa` 198, `--kolumna-prawa` 180, `--zakladki` 32, `--naglowek-sekcji` 32, `--pad-x` 12, `--pad-prawy` 14, `--odstep` 6, `--etykieta` 14, `--wys-pola` 21, `--wys-listy` 22, `--wiersz` 18, `--wiersz-ikona` 28, `--wiersz-listy` 25, `--wiersz-sceny` 44), czcionka 10,5 px.
Zweryfikowane w DOM przy 1440×900: grupa etykieta+pole co 47–48 px (D5 50), wiersze z ikoną co 34 (D5 34–35), nagłówek sekcji → pierwszy wiersz 30 (D5 32), Scene List 44 (D5 44), drzewo 25 (D5 25), kolumny 198/180, pasek 32, pole 21.
Zmiany wzorca: Altitude/Azimuth w bloku opcji „Custom” (slot w `Radio.vue`); lista slajdów w trybie spaceru bez podpisów (numer + miniatura, jak D5 3.1); przełącznik transformacji jako jedna lista rozwijana (D5), okno Assets ~632×876.
Otwarte: dokładne kolory i czcionka Windows (Segoe UI) vs Inter na macOS; ikony D5 są własne (tu lucide) — do decyzji, jeśli użytkownik wskaże różnice.

### Makieta 4 — meble parametryczne jak komponenty Figmy (17.09)
Wymagania użytkownika: font **Avenir**; kontrolki „drzwiczki” większe; mebel w Inspectorze jak obiekt/grupa/komponent w Figmie (wzór: zrzut panelu Figma UI3 — Position, Auto layout); półki zmieniane suwakiem i ręcznie na ekranie **bez zmiany wielkości mebla**; rozkłady: random, Fibonacci, równe, custom „60+40+20+40”; drzwi = **jeden komponent powtarzany N razy**.
- Zrobione: `meble/rozklad.ts` (+6 testów vitest), `meble/uklad.ts`, prymitywy `ui/figma/*`, `ui/inspector/*`, `ui/viewport/UchwytyPolek.vue`, operacje `furniture.setShelfLayout` i `furniture.setComponent` w rejestrze, ikony komponent/instancja w drzewie, prawa kolumna 240 px (panel Figmy ~235 px), font Avenir Next/Avenir.
- Zweryfikowane w przeglądarce: przeciągnięcie uchwytu na regale w salonie → rozkład Custom (pełne cm) + etykiety wymiarów na scenie i w Inspectorze; stany drzwi regału w kuchni sterowane z listy kopii (silnik `interakcje.ustaw`).
- Naprawiony błąd globalny: rozmiar czcionki był ustawiony na `html`, przez co wszystkie klasy Tailwind w rem (h-6, gap-2…) były ~34% mniejsze; teraz rozmiar tekstu jest na `body`.
- Ograniczenie makiety: geometria modelu jeszcze się nie przebudowuje (linie pokazują docelowy układ). Przebudowa wymaga schematu v2 (`definitions`/`instances`) i generatora — krok 5 planu wdrożenia.

### Makieta 5 — ogólny układ jak Figma UI3 (17.09, ZAKOŃCZONA, commit ae138ed)
Szyna ikon + lewy panel (Agent z sugestiami domyślnie), pływający pasek na dole (`ui/toolbar/*`), Render quality jako osobny popover, prawa kolumna Image + Walk ▶ i zakładki. Sprawdzone w przeglądarce 1440×900: edycja i spacer.

### Makieta 6 — zgłoszenia 17.09 (W TOKU)
Kolejność wg użytkownika („po zakończeniu layoutu z Figmy”):
1. ✅ Environment pod Assets w szynie (panel lewy). ✅ Prawa kolumna: **Inspector | Prototype** (Environment usunięte z prawej).
2. ✅ Prototype: ruchy wg mebli + **światła mebli pod meblami** (LED po wnękach) + **Apartment lighting** (lampy sufitowe pokoi); przełączniki działają na silniku (`silnik/swiatla.ts`, drobna zmiana `oswietlenie-mebli.js`: `wylaczone`, `mnoznik`, `aktualizuj(kamera, wymus)`).
3. ✅ Kopie komponentu (pojedyncze drzwiczki) jako rozwijana lista.
4. ✅ Miniatury scen: render poza ekranem z punktu widoku, **5 s po dużej zmianie mebla** (decyzja użytkownika: bez cyklicznego odświeżania); kadry skierowane w ścianę (WC, łazienka) zastąpione najdłuższym wolnym widokiem (także przy teleporcie).
5. ✅ Błąd: `useStore($silnik)` dawał readonly proxy Vue na obiektach three.js (zapisy nie działały, tysiące ostrzeżeń) → `markRaw`.
6. ✅ (293fa45) Inspector: **Selection colors** (ładniejsza paleta, wzór Figma Selection colors + color picker Custom/Libraries) PRZED Door; **materiały jako presety** („Burgund mat”) z **kulką 3D** jak D5; edycja całej grupy elementów o tych samych właściwościach w meblu (jak Figma) — grupy po współdzielonym materiale (uuid).
7. ✅ (293fa45) Pływające okno presetu/custom (`ui/material/*`, TSL w `silnik/budowaMaterialu.ts`, kulki `silnik/kulki.ts`): kolor, tekstura (upload, generowanie AI, suwaki Exposure/Contrast/Saturation/Temperature/Tint/Highlights/Shadows), **Pattern**, **height field tracing / bump**, **generatywne wypukłości i niedoskonałości**.
8. ✅ Panel światła przy kropce: **lumeny** (nominalnie lampa 1600 lm, LED 300 lm/100 cm), **skupienie %** (światło obszarowe nie ma stożka → mniejsza powierzchnia przy tym samym strumieniu), **kierunek** na tarczy (`TarczaKierunku.vue`: środek = w dół), barwa K dla lamp. Kropki świateł = lampy pokoi + LED mebli (przebudowa kotwic, gdy silnik odtworzy LED).
9. ✅ Top view na pasku w obu trybach (sprawdzone: tryb `ptak`; ponowne kliknięcie wraca do orbity — zachowanie `#widokToggle` silnika).
10. ✅ Mapa (`ui/viewport/MiniMapa.vue`, `silnik/rzutZGory.ts`): rzut ortograficzny pod sufitem co minutę i po dużej zmianie; małe znaczniki mebli (klik = kadr), pokoje (klik = scena), pozycja + stożek patrzenia ~15 Hz. Użytkownik: **bez ramki** — maska obrysu mieszkania (pokoje + ściany) i cień od kształtu.
11. ✅ Render AI (`ai/kadr.ts`, `ai/render.ts`, `ui/render/PanelZdjecia.vue`, `NakladkaAI.vue`) — **przetestowany przez użytkownika: „świetny render”** (17.09, `gpt-image-2.5-sunburst-2026-09-08` jako Latest). Ten model **nie obsługuje `input_fidelity`** (400) → render sam powtarza bez parametru, model zapamiętany w przeglądarce, przełącznik wyłączony z opisem. Zakres: (Model: najnowszy automatycznie, Size & orientation, Quality, Number of images) + opcje przeciw zniekształceniom (input fidelity high, krawędzie, maska chroniąca meble, nakładka z kryciem i A/B) + **generowanie tekstur przez AI**.
12. Klucz OpenAI: użytkownik: „Na razie używaj tokena w kodzie lokalnie, przed publikacją… w pamięci przeglądarki i pliku”. Realizacja: `.env.local` (gitignored, `VITE_OPENAI_API_KEY`, tylko DEV) — wpisuje użytkownik; pole w ustawieniach zapisuje w przeglądarce. **Nigdy nie commitować klucza** (repo publiczne). Klucz wklejony w czacie — zalecono rotację.

13. ✅ (do sprawdzenia wizualnie — panel przeglądarki był ukryty) Uwaga użytkownika 17.09: **render AI z kadru całego ekranu, jakby nie było paneli, a nawet szerszy; wynik ma pokrywać cały ekran**. `ai/kadr.ts`: na czas przechwycenia ramka dostaje proporcje obrazu wyjściowego, kąt kamery obejmuje ostrosłup okna +10% (Arch Photo może przyciąć do 60° — ułamki liczone z faktycznego kąta); maska rzutowana kamerą kadru. `NakladkaAI.vue` w `App.vue`: podgląd pełnoekranowy ponad panelami, część kadru odpowiadająca oknu wypełnia ekran; pod spodem ten sam kadr silnika (A/B, krycie, Luminosity), Esc zamyka.

## 8a. Zadania zgłoszone na „po UI”
- ✅ **Znacznik Point & Go** (`renderery/webgpu/nawigacja.js`): dysk tylko na podłodze (normalna w górę, y < 15 cm); na ścianach i meblach kursor „idź” (SVG: pierścień + strzałka), na obiektach interaktywnych `pointer`; klik nadal prowadzi do celu. Sprawdzone promieniami w przedpokoju i pokoju.
- ✅ Testy silnika: skrypt `test:silnik` naprawiony (Node 22 nie przyjmuje katalogu → wzorzec `tests/**/*.test.mjs`, `THREE_TEST_ROOT`), `three@0.185.0` w devDependencies; 64/64.

## 9. Następne kroki (kolejność po makiecie)
1. Akceptacja wyglądu przez użytkownika → poprawki makiety.
2. ✅ Build + CI + aktualizacje: `.github/workflows/edytor.yml` (na każdej gałęzi/PR: `test:silnik`, `test:edytor`, build; na main zapisuje build do `edytor-app/`, bo Pages działa w trybie legacy z gałęzi main — jak `renderery.yml`; adres po scaleniu: `/mieszkanie-meble/edytor-app/`). **Dependabot zamiast Renovate** — działa bez instalowania aplikacji w ustawieniach konta; grupy zależności, `three` wykluczony (musi zgadzać się z importmap r185). `openai` ładowany leniwie (osobny fragment 270 kB).
3. ✅ Płynne przejścia po trasie: `renderery/webgpu/trasa.js` (A* na siatce 15 cm funkcji kolizji gracza — plan, ściany, pudełka mebli, promień 20 cm; uproszczenie po linii widoczności; testy `tests/trasa.test.mjs`). `nawigacja.js`: `lecPoTrasie` (CatmullRom centripetal, 160 cm/s, wzrok: kierunek marszu → cel), używane w `podejdz`/`doPokoju`, w Point & Go gdy cel za przeszkodą, nowe `przejdzDo(pozycja, cel)` — edytor zmienia scenę przejściem (start aplikacji: cięcie). Sprawdzone krokowaniem `aktualizuj(1/60)` na scenie: 3 trasy, prosta przecinała ściany, trasa 0 przecięć, koniec w celu.
4. ✅ Logika z kopii Codex przeniesiona do Vue (tylko odczyt kopii, bez UI Calcite): `projekt/dokument.ts` (zod: uklady, materialy `mebel/klucz`, swiatla, widocznosc), `projekt/historia.ts` (Cofnij/Ponów, scalanie przeciągnięć `scal`, najpierw projekcja; 5 testów vitest), `projekt/projekt.ts` (rzutowanie na silnik z bazą „bez nadpisań”, autozapis szkicu IndexedDB przez `idb-keyval`, Open/Export JSON, wersje). Wszystkie zmiany UI (układ półek, kolory, materiały, światła, przełączniki Prototype) idą przez `zmienProjekt`. Klucze grup materiałów stabilne (`nazwa@pierwsza siatka`). `silnik/zaznaczanie.ts` — klik w scenie w trybie edycji zaznacza mebel i część, obrys `hoverOutline.ustawTrwaly` (zmiana `hover-outline.js`). `skroty.ts`: ⌘Z/⇧⌘Z, V/G/R, F (kadr), Esc (okno materiału → odznacz); litery ignorowane w polach. Panel File: Undo/Redo z etykietami, stan szkicu, Open/Export, Version history. Sprawdzone na żywo: zaznaczenie `regal-salon` + część `B2` + obrys; scalanie i cofanie układu; materiał po przeładowaniu i powrót do oryginału. Pominięte świadomie: safe-rect i framing-controller Calcite (nasza scena nie jest zasłaniana panelami).
5. ✅ Meble parametryczne: `renderery/webgpu/parametryczne.js` (sekcja `parametric`: korpus o stałym rozmiarze, siatka kolumny×rzędy z rozkładem equal/fibonacci/random/custom, `definitions` z wymiarami względem komórki i mechanizmem, `instances` z wyborem komórek), rozwijanie w `normalizeFurnitureDocument` (+ `parametricOverrides`), `biblioteka.przebudujParametryczny` (podmiana korzenia, nadpisania przeżywają odświeżanie), edytor: układ z Inspektora przebudowuje bryłę (debounce 220 ms) i ponownie nanosi materiały grup. Wspólny algorytm rozkładu z edytorem (`meble/rozklad.ts`). POC `meble/regal-salon/wersje/v0008-parametric.json` + wpis w manifeście (nieaktywny, `currentVersion` bez zmian), ramka dostaje parametry adresu. Testy: 75/75 (w tym normalizacja POC i nadpisania). Sprawdzone na scenie: 44 siatki, 8 drzwiczek z jednej definicji, zmiana półek 20 → 6 → 20 bez zmiany obrysu.
   **BatchedMesh — odrzucone po pomiarze** (17.09, scena salonu): 75 wywołań rysowania i 59 tys. trójkątów na klatkę przy 585 siatkach w scenie (467 w meblach, 59 materiałów) — odcinanie niewidocznego już załatwia koszt, a łączenie siatek zabrałoby zaznaczanie części, podmianę materiału grupy i wykrywanie listew LED. Wrócić tylko, jeśli pomiar pokaże wąskie gardło w wywołaniach rysowania.
   `FORMAT-MEBLA-V2.md` — opis v2 i sekcji `parametric` dla ChatGPT (odnośnik dodany w `FORMAT-MEBLA.md`).
6. ✅ Rejestr operacji podłączony do silnika i dokumentu (25 operacji: scena/kamera, meble, materiały i palety, światła, obraz, projekt). `wykonaj` zwraca wynik i pisze do `$dziennikOperacji` (dla agenta), operacje z danymi domyślnymi (zaznaczenie, bieżący widok) uruchamia ⌘K jednym kliknięciem, reszta czeka na argumenty od AI. Sprawdzone na scenie: opis (6 mebli, 7 lamp pokoi, 15 grup LED), preset materiału, paleta, zapalenie 7 lamp, cofnięcie.
7. ✅ Biblioteka, gizmo i własne światła:
   - Silnik: `gizmo.js` (TransformControls z addons, ładowane leniwie, `nawigacja.ustawBlokade` wyłącza kamerę i Point & Go na czas przeciągania), `biblioteka.wstawKopie/usunMebel/ustawUmiejscowienie` (kopia dostaje własny `assetId`, więc części, LED-y i interakcje są unikalne), `plan` wystawiony dla przyciągania, `swiatla-edytora.js` (punktowe i stożkowe + znacznik, lumeny → kandele).
   - Edytor: dokument zna `meble` (przesunięcia i kopie) oraz `swiatlaWlasne`; `silnik/przyciaganie.ts` dosuwa mebel plecami do najbliższej ściany (zasięg 30 cm) i obraca do jej płaszczyzny; `ui/viewport/Gizmo.vue` zapisuje położenie dopiero po puszczeniu myszy (jeden krok Cofnij); okno Assets wstawia mebel (Insert / podwójny klik), materiał i paletę; operacje `furniture.insert/place/remove`, `light.add/remove`; przycisk żarówki na pasku dodaje światło.
   - Panel przy kropce obsługuje światła silnika i własne przez `silnik/swiatlaPanel.ts`.
   - Sprawdzone na scenie: wstawienie kopii regału (przyciągnięcie do ściany), gizmo, przeniesienie, usunięcie i cofnięcie; własne światło (SpotLight, zmiana lumenów i skupienia, usunięcie, cofnięcie).
   - Kalibracja jasności (pomiar w kadrze salonu): tło 0,230; lampa silnika +0,028; własne 1600 lm bez kalibracji +1,399 → stała 1/6,3 daje +0,225, czyli podwojenie jasności w pobliżu.
8. Profil filmowy 25 FPS (najpierw pomiar).
9. AI: polecenia tekstowe + rozmowa Realtime na rejestrze operacji.
10. Render AI (kanały, maski, nakładka); warianty A/B; eksport JSON projektu.
Później: VR, ControlNet, kolizje, CSG, fizyka.

## 10. Ryzyka
- Fotorealizm w ruchu vs wydajność (ostatni pomiar 10.09: 16,5 FPS „wysoka”, M2).
- @open-pencil/vue 0.x — API może się zmieniać; wymaga peer `@open-pencil/core` + `canvaskit-wasm` (tylko instalacja).
- API OpenAI/Gemini nie gwarantują wierności geometrii w renderze AI.
