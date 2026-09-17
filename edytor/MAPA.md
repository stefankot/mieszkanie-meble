# MAPA — edytor/src (jedna linia na plik)

Czytaj najpierw ten plik, potem tylko potrzebne moduły. Kontekst i decyzje: `../PLAN-EDYTORA.md`.
Nazwy w UI po angielsku (1:1 D5), identyfikatory w kodzie po polsku.

## Wejście i stan
- `main.ts` — montuje aplikację Vue, ładuje style.
- `App.vue` — start w trybie spaceru (scena na cały ekran); tryb edycji = siatka D5 (pasek 32 px, kolumny 198 px i 240 px — tokeny w styles/app.css). Jedna ramka renderera dla obu trybów.
- `stan.ts` — atomy nanostores: tryb walk/edit, zakładki, zaznaczenie, widok, kropki, panele.
- `skroty.ts` — skróty powłoki (tinykeys), rejestrowane też w ramce renderera.
- `styles/app.css` — Tailwind 4, tokeny D5 (kolory, metryki odstępów), font Avenir; rozmiar tekstu na body (rem liczone od html).

## Silnik (most do renderera w ramce)
- `silnik/most.ts` — `$silnik`, teleport do widoku, miniatury widoków z płótna WebGPU, sterowanie ukrytym starym panelem (`ustawKontrolke`, `kliknij`, `opcjeKontrolki`).
- `silnik/hotspoty.ts` — źródła białych kropek (ruchome części, meble `biblioteka:*`, lampy), rzut co klatkę, zasłonięcie Raycasterem → `$kropki`.

## Meble parametryczne
- `meble/rozklad.ts` — rozkład półek przy stałej wielkości: równe / Fibonacci / losowe (ziarno) / własne „60+40+20+40”; zapis własny ze środków półek (pełne cm).
- `meble/rozklad.test.ts` — testy vitest (`npm run test:edytor`).
- `meble/uklad.ts` — stan parametryczny mebli (`$uklady`): przepływ, półki, kolumny, rozkład, płyty, marginesy, komponenty powtarzane N razy.
- `silnik/wymiary.ts` — wymiary i położenie mebla ze sceny (mm).

## Dane i operacje
- `data/mieszkanie.ts` — dane makiety z repo: widoki, warstwy, obiekty, materiały, palety, kategorie Assets.
- `ops/rejestr.ts` — rejestr operacji (zod): `zdefiniuj`, `wykonaj`, `narzedziaAI()` → narzędzia OpenAI.
- `ops/operacje.ts` — pierwsze operacje (kamera, światło, jakość, meble, palety, render AI).

## UI — prymitywy (Reka UI + styl D5)
- `ui/primitives/Sekcja.vue` — zwijana sekcja, chevron po lewej (Collapsible).
- `ui/primitives/Pole.vue` — etykieta NAD kontrolką (wzór D5).
- `ui/primitives/Wiersz.vue` — etykieta po lewej, kontrolka po prawej (przełączniki, UV).
- `ui/primitives/PoleLiczby.vue` — NumberField + scrub przeciąganiem + wypełnienie do wartości.
- `ui/primitives/WierszXYZ.vue` — trzy pola X/Y/Z pod etykietą (Location/Rotation/Size).
- `ui/primitives/Segmenty.vue` — ToggleGroup („Geo and Sky | HDRI”).
- `ui/primitives/Przelacznik.vue` — mały przełącznik D5 20×11.
- `ui/primitives/Pudelko.vue` — kwadratowy checkbox.
- `ui/primitives/Radio.vue` — radio w wierszach („Follow HDRI / Custom”).
- `ui/primitives/Wybor.vue` — lista rozwijana (Select).
- `ui/primitives/PrzyciskIkona.vue` — płaska ikona z tooltipem (atrybuty na <button>).

## UI — prymitywy Figma UI3 (Inspector mebla)
- `ui/figma/SekcjaF.vue` — sekcja: tytuł 12 px, akcje, linia; grupy co 48 px.
- `ui/figma/GrupaF.vue` — etykieta 11 px nad siatką kontrolek (domyślnie 2 kolumny + ikona 24 px).
- `ui/figma/PoleF.vue` — pole 24 px z prefiksem (scrub), jednostką, przyrostkiem („Fixed”).
- `ui/figma/GrupaIkonF.vue` — zespolone przyciski (wybór lub akcja), tooltipy.
- `ui/figma/PrzyciskF.vue` — ikona 24 px, stan aktywny jak przełącznik Auto layout.
- `ui/figma/SuwakF.vue` — suwak Reka + pole liczby.
- `ui/figma/WyborF.vue` — lista 24 px (właściwości komponentu).
- `ui/figma/PudelkoF.vue` — checkbox 16 px z etykietą.

## UI — Inspector mebla (Figma: komponenty, Auto layout)
- `ui/inspector/InspektorMebla.vue` — nagłówek komponentu + sekcje; wymiary ze sceny.
- `ui/inspector/SekcjaPozycji.vue` — Position: wyrównanie do ściany, X/Y, przyciąganie, obrót i odbicia.
- `ui/inspector/SekcjaUkladuPolek.vue` — Shelf Layout: Flow, Shelves/Columns (suwaki), Distribution, Custom, Resizing Fixed, Board, Padding.
- `ui/inspector/PodgladRozkladu.vue` — podgląd frontu z przeciągalnymi liniami półek.
- `ui/inspector/SekcjaKomponentu.vue` — komponent powtarzany N razy: Repeat, Handle/Opening/Glass, lista kopii (stany drzwi z silnika).

## UI — tryb spaceru (D5 3.1 Presentation)
- `ui/walk/TrybSpaceru.vue` — nakładki: Edit, Views, Settings ▾, pager.
- `ui/walk/PanelWidokow.vue` — lista widoków z numerami i miniaturami.
- `ui/walk/UstawieniaSpaceru.vue` — podstawowe funkcje renderera (Furniture, Light, Image) przez most do starego panelu.
- `ui/walk/Pager.vue` — ◈ (kropki) ‹ n/7 ›.

## UI — kropki
- `ui/hotspots/Kropki.vue` — białe kółka nad elementami; klik otwiera panel.
- `ui/hotspots/PanelKontekstowy.vue` — panel „All Variable Sets” obok kropki; stan drzwi działa; „More…” → Inspector.
- `ui/hotspots/Kafelek.vue` — kafelek opcji (miniatura + podpis).

## UI — tryb edycji (D5)
- `ui/top-bar/GornyPasek.vue` — menu, projekt, Assets; narzędzia na środku; Walk, eksport, Image, AI render, wideo.
- `ui/left/LewaKolumna.vue` — zakładki Scene (D5) / Agent (Spline).
- `ui/left/ListaWidokow.vue` — Scene List (miniatura, nazwa, ikona monitora).
- `ui/left/ListaWarstw.vue` — Layer („✓ ⊜ nazwa”).
- `ui/left/ListaObiektow.vue` — Object/Imported: szukaj + drzewo.
- `ui/left/PanelAgenta.vue` — rozmowa tekst/głos, operacje z Undo.
- `ui/viewport/Scena.vue` — ramka renderera, CSS ukrywający stary panel, przeniesienie mini-mapy, nakładki narzędzi.
- `ui/viewport/MenuSceny.vue` — Camera ▾ / Display ▾.
- `ui/viewport/PasekSkrotow.vue` — pasek podpowiedzi skrótów na dole sceny.
- `ui/viewport/UchwytyPolek.vue` — linie i uchwyty półek na froncie zaznaczonego mebla, wymiary przegród; przeciąganie → Custom.
- `ui/right/PrawaKolumna.vue` — Environment / Effect / Inspector (tylko przy zaznaczeniu) lub panel Image.
- `ui/right/ZakladkaOtoczenie.vue` — Sky Light, Sun, Light Character, Light Sources, Weather.
- `ui/right/TarczaSlonca.vue` — tarcza słońca z godziną.
- `ui/right/ZakladkaEfekty.vue` — Image + Cinematic Motion.
- `ui/right/ZakladkaInspektor.vue` — mebel (także przy zaznaczeniu jego modułu) → `InspektorMebla`; pod spodem Material i Palette.
- `ui/right/SekcjaMaterialu.vue` — Material: szablon, mapy, Color Space, UV, Triplanar, Advanced.
- `ui/right/SekcjaPalety.vue` — Color Palette: import JSON/SVG, Apply By (Roles/Order/Manual).
- `ui/render/PanelZdjecia.vue` — Image: Frame + AI Render.
- `ui/assets/OknoBiblioteki.vue` — pływające okno Assets.
- `ui/command/PaletaPolecen.vue` — ⌘K: Reka Listbox + fuse.js nad rejestrem operacji.
