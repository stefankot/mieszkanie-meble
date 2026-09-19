# Konfigurator szafy — przekazanie wątku

Stan na 19.09.2026. Repo `stefankot/mieszkanie-meble`, katalog roboczy
`/Users/milajovovich/Desktop/mieszkanie walkthrough/mieszkanie-edytor`.
Cały konfigurator żyje w `konfigurator/` — poza tym katalogiem nic nie jest ruszone,
`git status` pokazuje tylko `?? konfigurator/` oraz `?? prompty/07-konfigurator-szafy.md`
(ten drugi był nieśledzony przed startem — to brief).

## Jak odpalić

```bash
python3 konfigurator/serwer.py          # http://localhost:8012/konfigurator/szafa.html
```

Nie używaj zwykłego `http.server` — `serwer.py` dokłada dwie rzeczy, bez których część
funkcji nie działa: nagłówek `Cache-Control: no-store` (inaczej przeglądarka serwuje
stare moduły i debugujesz nieistniejące błędy) oraz most do ambientCG.

Kontrole: `…/szafa.html?selftest=1` — **46 kontroli, wszystkie przechodzą**. Wynik ląduje
w DOM **i w `window.__wynik`** (`{przeszlo, razem, bledy, tekst}`), więc model testujący czyta
go jednym zapytaniem. Zakres da się zawęzić: `?selftest=29` albo `?selftest=29-36` — pętla
poprawek kosztuje wtedy jedną kontrolę, nie czterdzieści sześć. Selftest **nie czyta i nie
zapisuje localStorage** — inaczej kasowałby projekt użytkownika.

Gotowy prompt dla modelu testującego leży w **`PROMPT-TESTY.md`**.

## Pliki

Pełna ściąga „co gdzie leży" jest w **`MAPA.md`** — 18 modułów, żaden powyżej 411 linii,
więc jedna zmiana to jeden plik. Skrót:

| Plik | Linie | Za co odpowiada |
|---|---|---|
| `dane.js` | 151 | `stan`, `KONFIG`, stałe, `UKLAD`, paleta, `ZRODLA` |
| `model.js` | 290 | kolumny i rzędy, style, klon dokumentu v2 |
| `wneki.js` | 110 | wnęki i nóżki prętowe |
| `eksport.js` | 57 | eksport JSON, dociąganie do IKEA |
| `siatka.js` | 74 | parser podziałów w składni CSS grid |
| `scena.js` | 274 | three.js, światło, bryła, kamera |
| `materialy.js` | 174 | materiały, słój, tekstury ambientCG |
| `dekor.js` | 111 | przedmioty na półkach, doniczka obok |
| `modele.js` | 60 | doczytywanie `.glb` |
| `nakladka.js` | 132 | rysowanie nakładki i znaczniki mebli |
| `karty.js` | 248 | karty komórki, wnęki i przegrody |
| `wybor.js` | 279 | zaznaczanie, przegrody, wybór mebla |
| `panel.js` | 350 | prawy panel |
| `szafa.js` | 411 | start, historia, `przebuduj()`, mebel fabryczny |
| `sciezki.js` | 57 | pathtracing, **ładowany dynamicznie** |
| `selftest.js` + `kontrole-*.js` | 700 | kontrole 3–38, w tym dwie dymne |
| `serwer.py` | 59 | statyka bez cache + most do ambientCG |
| `tekstury/pobierz.py` | 78 | tekstury CC0 z ambientCG (24 MB w repo) |
| `modele/pobierz.py` | 161 | modele z BlenderKitu (5,4 MB w repo) |

## Moduły jak symbole

Mebel to **drzewo modułów**, nie jedna bryła. Moduł jest samodzielnym bytem z własnym
kompletem parametrów i albo stoi sam, albo **przylega** do innego (`kotwica`: bok, góra, dół),
albo **siedzi w komórce** rodzica (`strona: 'wnetrze'`). Ten ostatni nie ma własnego korpusu —
bierze jedną definicję z dokumentu rodzica i rozwija ją na wymiary komórki, dzięki czemu
biurko i koralowa nisza są osobnymi bytami z własnym kolorem, a nie ustawieniem komórki.

Fabryczny regał przy łóżku to **sześć modułów**: kobaltowy cokół z drzwiami i szufladą, biała
część nad nim, dwa biurka, drewniane skrzydło obrócone o 90° i koralowa nisza na jego czole.

Zachowanie jest z Figmy — to wyraźna decyzja użytkownika, obowiązuje przy każdej wątpliwości:

- **klik zaznacza, dwuklik wchodzi, Esc wychodzi o poziom**; poza modułem panel parametrów
  i siatka komórek są nieaktywne, a w środku reszta sceny gaśnie do 30 %;
- **Shift-klik** dokłada do zaznaczenia; przy kilku modułach pole o różnych wartościach ma
  znacznik „mixed", a wpisanie czegokolwiek ustawia to wszystkim (`ustawPole`);
- **korzeń listy „Furniture"** zaznacza wszystkie moduły naraz, wychodzi z tego, w którym
  jesteś, i kadruje całą zabudowę (bez doniczki obok). Parametry są czynne po wejściu w moduł
  **albo** przy zaznaczeniu kilku — zaznaczenie to nie wejście, ale też pozwala zmieniać;
- **wzorzec → instancja**: „Create component" robi wzorzec z modułu, a odstępstwo liczy się
  **z różnicy wobec wzorca**, nie z przechwytywania kliknięć (`policzOdstepstwa`). Stąd
  „Reset overrides" na pojedynczym polu i na całej instancji oraz „Detach instance";
- **nowy moduł pyta, gdzie stanąć** — rodzic i strona, zanim cokolwiek powstanie.

`materialKorpusu` pozwala modułowi wziąć korpus wprost z materiału dokumentu i wypisać się
z palety — tak kobaltowy cokół zostaje kobaltowy, choć reszta zabudowy słucha próbnika koloru.

**Moduł osadzony odnosi się do krawędzi, nie do komórki.** `kotwica.wzgledem` wskazuje całą
bryłę gospodarza albo jedną jego komórkę, a `pionowo` i `poziomo` mówią, którą krawędź modułu
zrównać z którą krawędzią odniesienia (`dol`/`srodek`/`gora`, `lewo`/`srodek`/`prawo`), plus
przesunięcia i `wysunMm` przed lico. Dzięki temu „równo do dołu drewnianej części" to dwa
kliknięcia, a nie zgadywanie milimetrów. Dół bryły to spód **korpusu**, nie spód nóżek —
moduł osadzony dziedziczy podniesienie gospodarza (kontrola 36).

**Moduł osadzony dostaje własny materiał z palety** (`modul-<id>`), nie ten zapisany w definicji
dokumentu — bez tego kolor i tekstura nie miałyby na co działać. Jego Inspektor pokazuje tylko
to, co ma sens: Component, Anchor (gospodarz, komórka, wysunięcie przed lico), Material i Scene;
wymiary, siatka i konstrukcja znikają, bo bierze je z komórki gospodarza. Paleta Tylko nie ma
korala, więc nisza startuje najbliższym odcieniem i daje się przemalować.

## Architektura w trzech zdaniach

Geometria pochodzi **wyłącznie** z `rozwinParametryczny()` z
`https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/parametryczne.js` (import wprost
z Pages). `konfigurujModel()` robi `structuredClone` dokumentu bazowego i wpisuje do niego
stan — to jedyne miejsce dotykające JSON-a.

Dokumentów bazowych jest kilka (`ZRODLA` w `dane.js`), a każdy mebel wskazuje swój przez
`stan.zrodlo`; wszystkie wczytują się przy starcie z Pages. Fabrycznie scena startuje
**regałem przy łóżku**: `v0021-parametric.json` (skrzydło główne) i
`v0022-parametric-skrzydlo.json` (krótkie skrzydło, obrócone o 90°). Wyjątki dopisywane po stronie konfiguratora
to wnęki i nóżki: wnęka **wycina** z wyniku silnika półki i tnie piony (`przytnijDoWnek`), a
`czesciWnek()` i `czesciNozek()` dokładają własne części jako `geometry.parts` w eksporcie.

### Wiele mebli

`stan.meble` to lista konfiguracji (pola z `KONFIG`), `stan.aktywny` wskazuje edytowany.
`stan` trzyma pola aktywnego mebla „na wierzchu" — dzięki temu panel i nakładka nie wiedzą
o istnieniu listy. `przebuduj()` iteruje meble, dla każdego robi `wczytajDo(m)`, buduje model
i części, a na końcu wraca do aktywnego.

**Uwaga na kolejność w tej pętli.** `stan.komorki` musi trafić do stanu **zanim** policzysz
wnęki i dekoracje, bo `granicaWneki()` czyta właśnie stąd. Odwrotna kolejność była źródłem
błędu, w którym wyściółka wnęki lądowała w poprzek rzędów sąsiedniego mebla (kontrola 21).

**I na to, co zostaje po pętli.** `konfigurujModel()` każdego mebla nadpisuje `stan.kolumny`,
`stan.rzedy` i `stan.polkiWyliczone`, więc po pętli trzymały one siatkę **ostatniego** mebla,
a czytają je panel, wymiarowanie i przeciąganie przegród. Siatka aktywnego mebla jedzie teraz
w `aktywne` i wraca do stanu razem z komórkami (kontrola 25).

Ta sama pułapka dotyczy **materiałów**: powstają w `zbudujBryle()` już po pętli, więc
wykończenie i tekstura jadą w opisie grupy (`g.wykonczenie`, `g.drewno`), a nie ze `stan`.

## Decyzje użytkownika, których nie wolno cofnąć

- **Z IKEA bierzemy tylko wyposażenie wnęki** (ALTARLIDEN z systemu LASTARE: półka, kosz,
  drążek). Korpus, drzwi i fronty robimy na wymiar — przy nich **żadnych informacji o
  zgodności z IKEA**. Wymiary LASTARE: szerokości 40/60/80, głębokości 30/32/42/62,
  wysokości 100/200 + nadstawka 36, szafka wisząca 60.
- **Komunikaty o niezgodności w karcie, nigdy w dialogu.** Agresywny alert został odrzucony.
- Wnęka to **druga warstwa płyty** pełnej grubości (plecy + cztery lica), a przed lico mebla
  wysuwa się **wyłącznie ta wyściółka**, nie skrzynka z płyty korpusu.
- **Przeciąganie po meblu obraca scenę.** Scalanie komórek wyłącznie z popupu (strzałki
  ← → ↑ ↓) albo za uchwyty w rogach zaznaczenia.
- **Kolor solid i tekstura wykluczają się** — wybór jednego gasi drugie.
- **Pathtracing ładuje się dopiero po włączeniu** (kontrola 20 pilnuje zera zasobów w
  normalnej sesji). Nie wolno dodać statycznego importu `sciezki.js`.
- **Skórka jest ta sama co w edytorze mieszkania** (`edytor-app`): ciemne panele, jasny widok
  sceny, akcent `#0d99ff`, panel 300 px. Nazwy zmiennych CSS zostały stare (`--biel`, `--tor`),
  zmieniła się tylko paleta — dzięki temu nie trzeba było przepisywać 250 reguł. Shoelace jedzie
  na motywie `dark` z klasą `sl-theme-dark` na `<html>`.
- **Panel jest podzielony na sekcje** w kolejności z Figmy: Size & position → Layout → Material
  → Components → Construction → Scene. Dwie ostatnie startują zwinięte. Wcześniej było
  dwadzieścia wierszy jeden pod drugim.
- Style: Grid, Pattern, Slant, Mosaic, Gradient, Pixel oraz **Custom** — podziały wpisywane ręcznie.
- **Konfigurator zostaje osobną aplikacją** z własnym, szybszym rendererem; do edytora mieszkania
  ma się podpinać jako nakładka do edycji mebli. Edytor nie dostaje kontrolek do budowania mebli.
- **Widok nigdy nie wraca sam na oś.** Autopowrót po 10 s został usunięty; kamera zostaje
  tam, gdzie ją zostawisz, a nakładka z komórkami sama chowa się poza osią i wraca na niej.
- **Przedmioty na półkach to suwak 0–100 %**, nie przełącznik. Pole `stan.dodatki` niesie
  procent, ale starsze zapisy mają tam `true`/`false` — czytaj przez `ileDodatkow()`.
- **Moduł osadzony (`strona: 'wnetrze'`) nie ma własnego korpusu** — liczy się go w układzie
  rodzica, więc jego pozycja to pozycja rodzica, a części biorą środek z komórki. Komórki
  silnika nie mają współrzędnej Z; użycie `komorka.z` wpycha całą bryłę w NaN.
- **Paleta przemalowuje tylko materiały korpusu.** Wszystko, czego nazwa nie zaczyna się od
  `carcass.material`, dostaje flagę `autorskie` i zostaje takie, jak zaprojektowano: kobalt
  na frontach regału przy łóżku, koral w niszy, LED, lustro. Bez tego pierwszy klik w kolor
  robił z regału jednobarwną bryłę (kontrola 28).

## Styl Custom: podziały wpisywane ręcznie

Dwa pola tekstowe („Columns", „Rows") przyjmują składnię CSS grid przeliczoną na centymetry:
`60 + 40`, `60 cm + 40 cm`, `1/3 2/3`, `40% 60%`, `80 + 1fr`, `repeat(4, 45)`, `auto`.
Parser siedzi w `siatka.js` i jest czysty — da się go odpalić Node'em bez przeglądarki.

Reguła, której nie warto łamać: **wpis z samych centymetrów ustawia też wymiar mebla**
(kto pisze 60+40, chce 60 i 40 cm, a nie ich proporcji), a wpis z `%`, ułamkami albo `fr`
mieści się w tym, co już jest. W trybie Custom półki nie dokładają się same — co wpiszesz,
to dostajesz. Przeciągnięcie przegrody przepisuje pole, żeby tekst zgadzał się z myszką.

## Przedmioty na półkach

Modele z BlenderKitu leżą w `modele/` jako pojedyncze `.glb` i doczytują się w tle po
pierwszym renderze — scena ma stanąć przed nimi, nie po. Gdy komplet dojdzie, jedna
przebudowa wymienia zastępcze bryłki na prawdziwe doniczki. Duża doniczka
(`rola: "podloga"`) stoi na podłodze przy krawędzi zestawu i nie należy do żadnego mebla.

**API BlenderKitu jest publiczne.** Wyszukiwanie idzie bez żadnego klucza, a link do pliku
wydaje `api/v1/downloads/<uuid>/?scene_uuid=<cokolwiek>` — konto nie jest potrzebne, wbrew
temu, co sugeruje strona. Część assetów ma gotowy wariant glTF, reszta tylko `.blend`;
ten drugi przechodzi przez Blendera (`/Applications/Blender.app`).

Każdy model i tak przechodzi przez Blendera drugi raz: decymacja do budżetu (6 tys. trójkątów
na półkę, 40 tys. na doniczkę), tekstury do 512/1024 px, eksport jako jeden `.glb`.
Ze 297 tys. trójkątów robi się 6 tys., z 11 MB — 2 MB, a komplet rzeczy na trzech
pięciometrowych meblach renderuje się w 5,5 ms (kontrola 27).

**Poly Haven jest spalone** — użytkownik odrzucił te assety jako słabej jakości
i poprosił, żeby do nich nie wracać.

## Regał przy łóżku

Fabryczny mebel to odtworzenie `regal-przy-lozku:v0020` w języku konfiguratora — dwa meble
w scenie, oba w pełni edytowalne:

- **skrzydło główne** 176,4 × 251 × 57 cm, styl Custom, kolumny `58.2 × 3`, rzędy
  `56.4 + 58.2 + 58.2 + 58.2` → prześwity 564 i 582 mm, co do milimetra jak w v0020;
  kobaltowe drzwi i szeroka szuflada w rzędzie 1, biurka z opuszczanym blatem w rzędzie 2,
  troje białych drzwi w rzędzie 4,
- **krótkie skrzydło** 120 × 179,2 × 60 cm, obrócone o 90°, drewniane, z koralową niszą.

Układy `drzwiK`, `szufl120`, `biurko`, `biurko2`, `drzwiP`, `panelS` i `koral` w `UKLAD` mają
pole `wymaga` — pokazują się w karcie komórki tylko wtedy, gdy dokument bazowy tego mebla
naprawdę ma taką definicję. Inaczej silnik wywala się na „instancja wskazuje brakującą definicję".

Świadome odstępstwa: cokół wychodzi 11 cm zamiast 20 (konfigurator ma jedną stałą wysokość
cokołu), nóżki krótkiego skrzydła i listwy LED nie są przeniesione, a koralowa nisza siedzi
na licu skrzydła, nie na jego czole. Sam dokument wymienia swoje odstępstwa w `notes`.

## Co działa

Wielokrotne meble z obrotem co 90° stykające się krawędzią bez nachodzenia · przelot kamery
800 ms na front edytowanego mebla · wnęki scalające prostokąt komórek, z zawartością (półka,
biurko z klapą), wysunięciem i własnym kolorem · nóżki prętowe ⌀15 mm do 100 cm · tekstury
CC0 z ambientCG z biblioteką w oknie · pathtracing z HDRI wieczornego nieba · zapis projektu
w localStorage · import i eksport JSON (pełny stan edytora jedzie w
`customParameters.konfigurator`, dokument zostaje poprawnym v2) · wymiarowanie z oznaczaniem
wymiarów spoza siatki IKEA · dociąganie wszystkiego do rozmiarów LASTARE.

## Otwarte i warte uwagi

1. **Lokalna kopia repozytorium jest za `origin/main`** — `v0021`/`v0022` są na GitHubie
   i na Pages, ale nie w tym worktree. Konfigurator i tak czyta je z Pages, więc działa;
   przed pracą nad rendererem trzeba jednak porównać `HEAD..origin/main`.
2. **Na GitHub Pages przestanie działać biblioteka ambientCG** — Pages to statyka, nie ma
   mostu, a ambientCG nie wysyła CORS. Zostaną tekstury wgrane do repo (dziś 7 sztuk, 19 MB).
   Do wyboru: więcej tekstur w repo, funkcja bezserwerowa jako most, albo GitHub Action.
3. **Style Pattern/Slant/Mosaic** różnicują kolumny i dokładają półki w komórkach, ale w Tylko
   piony bywają przerwane (wiązanie cegłowe w Pixelu). Maszyneria do tego już jest — to ta sama
   funkcja, która tnie piony pod wnęki.
4. **Szafka wisząca LASTARE 60×32×60** nie jest zrobiona — to osobny produkt na ścianie, nie
   komora w korpusie. Wymagałaby drugiego trybu mebla.
5. **Budżet z briefu (≤700 linii JS) dawno przekroczony** — użytkownik świadomie go zdjął.

## Pułapki, na które już się nadziałem

- **Panel przeglądarki bywa ukryty** — wtedy `requestAnimationFrame` stoi, pętla renderowania
  nie chodzi i pomiary kamery kłamią (`renderer.info.render.frame` nie rośnie). Zrzuty też się
  nie udają. Sprawdzaj `document.visibilityState`, zanim uznasz animację za zepsutą.
- **Bufor konsoli w narzędziu bywa nieaktualny** — potrafi odtwarzać błędy sprzed poprawki,
  z numerami linii sprzed edycji. Weryfikuj przez `performance.getEntriesByType('resource')`
  albo przesunięcie pliku o kilka linii.
- **Podmiany tekstu typu `replace("function petla(){", …)`** łapią też `export function petla(){`
  i kradną `export`. Dwa razy wywaliło to cały moduł.
- **Nie komentuj linii ciągnącej się dalej** — komentarz zjadł kiedyś `nadstawka, uklady, wneki,
  obrot` z definicji `stan` i `stan.wneki` było `undefined`.
- **ambientCG odrzuca `Python-urllib`** (403) — `pobierz.py` przedstawia się jako Chrome.
- **Syntetyczne `PointerEvent` wywalają `setPointerCapture`** w OrbitControls; w testach
  wszystkie takie wywołania są w `try/catch`.
- **`element.hidden = true` samo z siebie nic nie ukrywa**, jeśli autor dał elementowi
  `display:flex` — reguła autora bije `[hidden]{display:none}` przeglądarki. Cały panel miał
  z tego powodu widoczne wiersze, które kod uważał za ukryte, m.in. pola siatki przy stylu
  innym niż Custom i strony kotwicy przy module osadzonym. W `szafa.css` stoi teraz
  `[hidden]{display:none !important}` (kontrola 35).
- **Moduł z `definicja` jest osadzony z definicji** — `wSrodku()` pyta o nią, a nie o
  `kotwica.strona`. Inaczej klik w „Top" wyprowadzał niszę poza komórkę gospodarza i liczył
  dla niej korpus, którego ona nie ma.
- **Klik w środek wnęki potrafił nie trafić w nic** — środek wnęki 2×2 wypada dokładnie na styku
  czterech komórek, a test trafienia wymagał wnętrza komórki. Nakładka odkłada teraz prostokąty
  wnęk osobno (`wnekiEkranu()`) i `zaznaczWPunkcie` pyta najpierw o nie. Wyszło dopiero przy
  zmianie szerokości panelu — wcześniej trzymało się przypadkiem.

## Jak dokładać modele

```bash
python3 konfigurator/modele/pobierz.py --szukaj "ceramic vase" --ile 10
python3 konfigurator/modele/pobierz.py 04465836-20e1-495a-878e-07da34c1080a --rola polka
```

Identyfikator to `assetBaseId` z adresu asseta na blendkit.com. `--rola podloga` daje większy
budżet trójkątów i tekstur oraz wpuszcza model do wyboru doniczki w panelu. Skrypt pobiera
też miniaturę, z której panel robi próbnik.

## Jak dokładać tekstury

```bash
python3 konfigurator/tekstury/pobierz.py --szukaj wood --ile 20
python3 konfigurator/tekstury/pobierz.py Wood062 Metal034
```

Bierze paczkę 1K-JPG, wyjmuje kolor, chropowatość, mapę normalnych i metaliczności
(bez niej metal wychodzi matowy), dopisuje wpis do `katalog.json`. Konfigurator czyta ten
katalog przy starcie. Wszystko CC0.
