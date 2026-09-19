# Moduły jak symbole — plan przebudowy

Ustalenia z rozmowy 19.09.2026. Budujemy **w aplikacji Vue** (`edytor/src`), rdzeń jako czysty
TypeScript, żeby iframe-renderer mógł go zaimportować bez Vue.

## Model

**Moduł** to samodzielny byt z własnym kompletem parametrów — wymiary, siatka, kolory, tekstury,
materiały, światło. Moduły tworzą drzewo: korpus, w nim nisze, obok inne korpusy przylegające
bokiem, górą albo dołem.

**Nisza** jest dzieckiem rodzica. Wysokość i szerokość bierze z komórki, na której siedzi;
głębokość ma własną i może wystawać przed front. Znika razem z rodzicem.

**Wzorzec → instancja** działa jak komponent w Figmie. Zmiana wzorca idzie do wszystkich
instancji. Zmiana parametru w instancji odczepia **ten jeden parametr**; reszta dalej słucha
wzorca. Panel oznacza odczepione parametry i daje „przywróć ze wzorca" oraz „odczep instancję".
Wzorce mieszkają w dwóch miejscach: globalnie w `meble/` (wersjonowane w repo, widoczne w każdym
projekcie) i lokalnie w dokumencie projektu, z poleceniem „wypchnij do biblioteki".

## Zachowanie

Klik zaznacza. **Dwuklik wchodzi**, Esc wychodzi o poziom. Po wejściu Inspektor przełącza się na
ten konkretny moduł, a pozostałe moduły gasną do 30 %. Shift-klik i ramka zaznaczają wiele;
przy różnych wartościach pole pokazuje „mieszane", a wpisanie ustawia wszystkim.

Moduł przylega **licem do lica**, obroty co 90°, z przesuwem wzdłuż ściany styku i przyciąganiem
do krawędzi i osi sąsiada. Nowy moduł pyta o umiejscowienie i daje się dociągnąć.

Lista modułów siedzi nad albo pod Inspektorem (nie zabiera całej prawej kolumny) i wygląda jak
panel „Object" z D5: ikona wzorca przy meblach, ikona instancji przy powtórzeniach zwiniętych do
`× 12`, szukajka, zmiana nazwy, kolejność, ukrywanie i blokowanie.

Migracja jest **ręczna**: polecenie „rozbij na moduły" dla wskazanego mebla. Nic nie przestawia
się samo.

## Reguła rozstrzygania

**Przy każdej wątpliwości: tak, jak robi to Figma.** To dotyczy też rzeczy, o których nie było
mowy wprost — a które z tej zasady wynikają i trafiają do zakresu:

- klik zaznacza najwyższy moduł, dwuklik schodzi poziom niżej, Esc wraca w górę;
- Shift-klik dokłada do zaznaczenia, ramka zaznacza wszystko, co przecina;
- odstępstwo dotyczy pojedynczego parametru, nie całej instancji; jest „przywróć ze wzorca"
  na parametrze i na całej instancji, oraz „odczep instancję";
- zmiana nazwy w liście, zmiana kolejności przeciąganiem, ukrywanie i blokowanie modułu;
- kopiuj-wklej i duplikat z przesunięciem, wklejenie w miejscu przy wejściu w moduł;
- prowadnice wyrównania i odstępu przy przesuwaniu, z podświetleniem celu;
- wszystko przez rejestr operacji, więc wszystko cofalne jednym Ctrl+Z.

## Przesuwanie ścianek

Obowiązuje wzorzec z `ui/viewport/UchwytyPolek.vue`, który już jest w edytorze: przerywana linia
`#0d99ff` rzutowana na lico zwrócone do kamery, biała pastylka 28 × 10 z niebieską obwódką na
środku linii, wymiar przegrody w niebieskim znaczniku obok osi uchwytów. Przeciągnięcie przełącza
rozkład na „własny" i idzie przez `zmienProjekt`, więc jest jednym krokiem w historii.

Do dopisania:

- **uchwyty pionowe** — dziś komponent liczy tylko `srodkiPolek` i ciągnie w pionie; kolumn nie
  da się przesuwać, choć `UkladMebla` ma pole `kolumny`. Ten sam wzorzec, `cursor-ew-resize`.
- **geometria ma nadążać** — komponent mówi o sobie „makieta: geometria modelu jeszcze się nie
  zmienia", bo `meble/uklad.ts` jest makietą stanu. Po podmianie na prawdziwy model v2
  (z konfiguratora) przeciągnięcie ma przebudowywać bryłę w rendererze.

Rozkład liczą obie aplikacje tą samą funkcją `rozloz` z `renderery/webgpu/parametryczne.js`,
więc podgląd w edytorze i geometria silnika nie mogą się rozjechać.

## Co już jest i czego nie piszemy

| Jest w `edytor/src` | Do czego użyjemy |
|---|---|
| `ui/figma/` (Suwak, Pole, Wybór, Sekcja, Grupa) | wszystkie kontrolki Inspektora modułu |
| `ui/left/ListaWarstw.vue` | wzorzec wiersza i nagłówka listy modułów |
| `ui/inspector/SekcjaKomponentu.vue` | punkt zaczepienia dla wzorców i instancji |
| `ops/operacje.ts` (412 linii) | rejestr operacji — dokładamy operacje modułów |
| `projekt/historia.ts` | cofanie bez pisania czegokolwiek |
| `silnik/most.ts` | rozmowa z rendererem w iframie |
| `silnik/zaznaczanie.ts` | rozszerzamy o zbiór zaznaczeń i wejście w moduł |
| `silnik/przyciaganie.ts` | dziś tylko ściany — dokładamy lico do lica |
| three.js r185: `TransformControls`, `SelectionBox`, `OBB` | gizmo, ramka zaznaczania, kolizje |

Z konfiguratora przenosimy to, czego w edytorze nie ma: siatkę parametryczną z niszami, składnię
Custom (`60 + 40`, `1/3 2/3`, `repeat(4, 45)`), pobieracz BlenderKitu, przedmioty na półkach
i dociąganie do LASTARE. Panel, historia i zapis zostają po stronie Vue — konfigurator po
przeniesieniu gasimy.

## Szacunek

| Warstwa | Plik | Linie |
|---|---|---|
| rdzeń TS | `meble/moduly.ts` — schemat, drzewo, wzorce, odstępstwa | 200 |
| | `meble/kotwice.ts` — kotwice i rozwiązywanie pozycji | 150 |
| | `silnik/przyleganie.ts` — OBB, najbliższe lico, prowadnice | 160 |
| | `meble/rozwiniecieModulu.ts` — z drzewa na części v2 | 140 |
| | `meble/siatka.ts` + `meble/nisze.ts` — port z konfiguratora | 205 |
| dokument | `projekt/dokument.ts` — sekcja `moduly`, migracja | 80 |
| | `ops/operacje.ts` — operacje modułów | 180 |
| | `stan.ts` — zbiór zaznaczeń, ścieżka modułu | 25 |
| Vue | `ui/left/ListaModulow.vue` | 120 |
| | `ui/inspector/InspektorModulu.vue` + `SekcjaModulu.vue` | 200 |
| | `ui/modules/OknoWstawiania.vue` | 100 |
| | `ui/viewport/PrzyciaganieWskazniki.vue` | 70 |
| | zmiany w `PrawaKolumna`, `Scena`, `skroty.ts` | 120 |
| Vue | `ui/viewport/UchwytyPolek.vue` — uchwyty pionowe + przebudowa bryły | 60 |
| testy | vitest | 200 |
| **razem** | | **~2010** |

Z tego ~205 linii to gotowy port. Podmiana makiety `meble/uklad.ts` na prawdziwy model v2
mieści się w pozycji `rozwiniecieModulu.ts`. Wcześniej mówiłem o 1300 — urosło, bo doszła lista modułów,
okno wstawiania, prowadnice przyciągania i polecenie „rozbij na moduły".

## Etapy

1. **Rdzeń i dokument** — model, kotwice, migracja, testy w vitest. Bez UI.
2. **Widok i wybór** — dwuklik, ścieżka, 30 % przezroczystości, lista modułów.
3. **Ustawianie** — przyleganie licem, przesuw wzdłuż styku, prowadnice, okno wstawiania.
4. **Wzorce i edycja zbiorcza** — odstępstwa, biblioteka lokalna i globalna, „mieszane",
   przeniesienie siatki, nisz i BlenderKitu z konfiguratora.
