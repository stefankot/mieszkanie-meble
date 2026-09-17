# MAPA — edytor/src (jedna linia na plik)

Czytaj najpierw ten plik, potem tylko potrzebne moduły. Kontekst i decyzje: `../PLAN-EDYTORA.md`.

## Wejście i stan
- `main.ts` — montuje aplikację Vue, ładuje style.
- `App.vue` — układ D5: górny pasek, lewa kolumna, scena, prawa kolumna, Biblioteka, ⌘K.
- `stan.ts` — atomy nanostores stanu powłoki (zakładki, tryb Zdjęcie, zaznaczenie, narzędzie).
- `skroty.ts` — skróty klawiszowe powłoki (tinykeys), rejestrowane też w ramce renderera.
- `styles/app.css` — Tailwind 4 i tokeny wyglądu (kolory, fonty, rozmiary).

## Dane i silnik
- `data/mieszkanie.ts` — dane makiety z repo: widoki (pokoje), warstwy, obiekty, materiały, palety, kategorie.
- `silnik/most.ts` — tymczasowy most do renderera w ramce (teleport do pokoju po wyborze widoku).
- `ops/rejestr.ts` — rejestr operacji (zod): `zdefiniuj`, `wykonaj`, `narzedziaAI()` → narzędzia OpenAI.
- `ops/operacje.ts` — definicje pierwszych operacji (kamera, światło, jakość, meble, palety, render AI).

## UI
- `ui/primitives/` — kontrolki: `Sekcja` (PropertySection), `PoleLiczby` (NumberField, scrub + pasek), `Wiersz`, `WierszXYZ`, `Segmenty` (SegmentedControl), `Przelacznik` (Reka Switch), `Wybor` (Reka Select), `PrzyciskIkona` (ikona + tooltip).
- `ui/top-bar/GornyPasek.vue` — menu, Biblioteka, cofnij/ponów; narzędzia na środku; ⌘K, Zdjęcie, Render AI, eksport.
- `ui/left/LewaKolumna.vue` — zakładki Scena (D5) / Agent (Spline).
- `ui/left/ListaWidokow.vue` — D5 Scene List: miniatury widoków = teleport.
- `ui/left/ListaWarstw.vue` — D5 Layer: widoczność grup.
- `ui/left/ListaObiektow.vue` — D5 Object/Imported: szukaj + drzewo mebli, modułów, mechanizmów.
- `ui/left/PanelAgenta.vue` — rozmowa tekst/głos z AI, operacje z przyciskiem Cofnij, stan rozmowy Realtime.
- `ui/viewport/Scena.vue` — ramka z rendererem, nakładki: narzędzia (zaznacz/przesuń/obróć, przyciąganie).
- `ui/viewport/MenuSceny.vue` — przyciski Kamera i Wyświetlanie (D5) z menu.
- `ui/right/PrawaKolumna.vue` — zakładki Otoczenie/Efekty/Inspektor lub panel Zdjęcia.
- `ui/right/ZakladkaInspektor.vue` — obiekt: akcje, Podstawowe XYZ, Parametry (Spline), Wersja, Mechanizmy.
- `ui/right/SekcjaMaterialu.vue` — D5 materiał: szablon, mapa, chropowatość, metaliczność, UV.
- `ui/right/SekcjaPalety.vue` — palety (JSON/SVG), tryb: role / kolejność / ręcznie.
- `ui/right/ZakladkaOtoczenie.vue` — D5 Environment: niebo, tarcza słońca, ciepło, źródła, pogoda.
- `ui/right/TarczaSlonca.vue` — SVG tarczy słońca z godziną.
- `ui/right/ZakladkaEfekty.vue` — D5 Effect: obraz, światło globalne, „W ruchu · filmowo”.
- `ui/render/PanelZdjecia.vue` — tryb Zdjęcie: kadr + Render AI (kanały, maski, dostawca, krycie).
- `ui/assets/OknoBiblioteki.vue` — D5 Assets: pływające okno z kategoriami i siatką.
- `ui/command/PaletaPolecen.vue` — ⌘K z operacjami rejestru (CommandPalette z @open-pencil/vue).
