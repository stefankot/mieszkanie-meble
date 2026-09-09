# WebGPU — przebudowa, tura „Pareto 20%”

Data: 2026-09-08. Bazuje na `pakiet-materialow-i-technologii-webgpu.md` (§25, §27).

## A. Materiały skanowane — pozycja #1 z pakietu

Nowy moduł `webgpu/materialy.js`.

| Powierzchnia | Skan (Poly Haven, CC0) | Wymiar próbki |
|---|---|---|
| Fornir mebli | `oak_veneer_04` | 100 × 100 cm |
| Ściany i sufit | `painted_plaster_wall` | 200 × 200 cm |
| Podłoga | `rectangular_parquet` | 225 × 225 cm |

- Skala **fizyczna**, nie „na oko”: powtórzenie = wymiar detalu w cm / wymiar próbki w cm.
  Słój ma tę samą gęstość na froncie 60 cm i na boku 240 cm.
- Kierunek słoja wzdłuż dłuższego boku formatki (pionowo na wysokich frontach — jak na referencji 2).
- Kanały `arm`: R = AO, G = roughness, B = metalness. `roughnessMap` czyta G, więc mapa idzie tam wprost.
  `aoMap` pominięty — wymaga drugiego zestawu UV, którego ta geometria nie ma.
- Klon tekstury zmienia tylko opis (repeat/rotation); obraz jest współdzielony, więc nie mnoży pamięci GPU.
- Kremowe fronty (`white`) to lakier MDF: **płaski kolor bez albedo ze skanu**, wiarygodność daje
  tylko bardzo słaby microrelief tynku w normalu (skala 0,06) — zgodnie z §3 pakietu.
- Brak CDN nie wywala sceny: silnik wraca do tekstur proceduralnych i wypisuje to w usterkach.

## B. Środowisko — HDRI zamiast proceduralnego pudełka

- `urban_courtyard_02` 2K przez `RGBELoader` + `PMREMGenerator`, `environmentIntensity = 1,05`.
- Proceduralne pudełko PMREM zostaje wyłącznie jako zapas, gdyby HDRI nie doszło.
- To jest największa pojedyncza zmiana w świetle: obie referencje nie mają jednego ostrego
  źródła, tylko szeroką, równomierną kopułę i delikatny kierunek od okna.

## C. Światło wysokiego klucza

| Parametr | Było | Jest | Powód |
|---|---|---|---|
| Słońce | 9,0 | 2,6 | na referencjach nie ma wypalonej plamy słońca |
| Okna | 1,6 | 3,2 | światło wchodzi oknem, nie górą |
| Półsfera | 0,12 | 0,34 | wypełnienie cieni |
| Kule sufitowe | 100 % | 35 % | obie referencje to światło dzienne |
| Rozproszenie | 0,82 | 0,88 | miękka penumbra |
| Tone mapping | ACES @ 0,85 | **AgX @ 1,15** | ACES przechyla jasne pastele w żółć; AgX trzyma kremowe biele |

## D. Naprawy z tej samej tury

- **Sufit nie zasłaniał słońca** — miał `receiveShadow`, nie miał `castShadow`, więc światło
  wchodziło przez strop zamiast oknami. Doszedł `castShadow` + `shadowSide = DoubleSide`,
  `shadow.bias` złagodzony do −0,0009 i `normalBias = 1,6`.
- **Lampy sufitowe** — port 1:1 z wersji WebGL: na pokój prostokątne źródło (moc skalowana
  odwrotnie do powierzchni, żeby WC 78 cm dostał tyle samo co pokój wzorcowy), punktowa łuna
  na suficie i widoczna świecąca kula.
- **Widok za oknem** — korony drzew z wersji WebGL, tam tylko cieniodajne, tutaj **widoczne**
  (otwory są prawdziwe, więc nie ma portalu ukrywającego zewnętrze) i nadal rzucające cień.
  Doszły pnie, bo widoczna korona bez pnia nie ma sensu. Wiatr: ten sam szum porywów.
- **Widok z lotu ptaka wracał NaN** — `camera.aspect` bywa `0/0`, bo TRAA rozsuwa kadr przez
  `setViewOffset`, a to ustawia `aspect = fullWidth/fullHeight`. Proporcje idą teraz z rozmiaru
  renderera i są sprawdzane na skończoność.

## E. Nawigacja (`webgpu/nawigacja.js`)

Parametry z vr-interior.oaksun.studio: wysokość oczu, czułość 0,0013 rad/px, pochylenie ±60°,
tłumienie 0,92, easeOutQuart na przelotach. Ruch liczony **na sekundę**, nie na klatkę.

- Tryby: spacer (blokada wskaźnika) / orbita / z lotu ptaka.
- Kolizje z tej samej siatki komórek, z której powstają ściany — otwory drzwiowe i okienne
  są przechodnie dokładnie tam, gdzie są w geometrii. Meble blokują przez pudełka otaczające.
- Sprawdzone: zatrzymanie 20 cm od ściany zachodniej, blokada przez regał w salonie,
  przejście drzwiami balkonowymi na balkon i zatrzymanie na jego krawędzi, wyjście drzwiami wejściowymi.
- Ściany przy widoku z góry schodzą do 42 % krycia, sufit znika — domek dla lalek.
- Blokada wskaźnika bywa odrzucona (ramka bez `allow="pointer-lock"`); wtedy działa
  rozglądanie przeciąganiem, a odrzucenie nie trafia do globalnego uchwytu błędów.

## F. Panel sterowania (`webgpu/sterowanie.js`)

Odbudowa zakładek z wersji WebGL: Widok / Światło / Jakość / Pomoc, te same nazwy i wartości
domyślne. Zakładka Pomoc **wypisuje wprost, czego jeszcze nie ma** — bez atrap: suwak, który
nic nie robi, jest gorszy niż jego brak.

## G. Czego NADAL nie ma — stan uczciwy

1. **Interakcje mebli nie działają.** Biblioteka buduje mechanizmy (`ruchy`), ale nic ich nie
   napędza: nie ma obsługi kliknięcia w mebel ani kontrolek ruchomych części. Łóżko dostaje
   `zaczepy`/`afterPose` przy budowie i potem nigdy nie jest pozowane.
2. **Warstwy wykończenia powierzchni** (mikrorelief, plamy makro, relief) są bezczynne —
   wstrzykiwane przez `onBeforeCompile`, którego `NodeMaterial` nie zna. Do przepisania na TSL.
3. **Chodzenie ≠ OAKSUN w szczegółach**: brak teleportu jednym kliknięciem z niebieskim kółkiem,
   ←/→ chodzą bokiem zamiast obracać kamerę, wysokość oczu 160 zamiast 170, brak Wycieczki.
4. Szkło nadal na `opacity`, nie na `transmission`/IOR/thickness.
5. Brak: szczotkowanej stali, LED w niszach, szczelin technologicznych między frontami,
   contact shadows (SSSNode), progresywnej akumulacji i trybu PHOTO.

## H. Weryfikacja

Potwierdzone bez obrazu: brak wyjątków, `usterki` puste, wszystkie 9 map skanów i HDRI wczytane
(`ACAO: *` sprawdzone osobno curl-em), materiał podłogi = „Parkiet”, ścian = „Ściana — tynk”,
`environment` ustawione, tone mapping = AgX, ekspozycja 1,15, 5 mebli w scenie.

**Nie potwierdzone wizualnie.** Panel podglądu jest ukryty (`document.hidden === true`), więc
strona nie składa klatek i zrzuty wychodzą czarne. Odczyt pikseli też jest niedostępny: cel
renderowania wyczyszczony jawnie na pomarańczowy odczytuje się jako same zera, więc to
ograniczenie odczytu, a nie czarna scena. Rozszerzenie Chrome niepodłączone.

---

# POPRAWKA: zawieszenie komputera

## Przyczyna — zmierzona, nie zgadnięta

`MAT.drewno()` jest wołane **na każdą część mebla**, a moja pierwsza wersja klonowała
w nim trzy mapy 2K. W scenie jest **131 siatek z fornirem**, czyli:

```
131 siatek × 3 mapy × 2048² × 4 B × 1,34 (mipmapy) ≈ 8,4 GB
```

Klon tekstury dzieli obraz w JavaScripcie, ale backend zakłada osobną teksturę GPU.
Na MacBooku z 8 GB to nie jest „wolniej” — to jest koniec pamięci.

## Naprawa

| | Było | Jest |
|---|---|---|
| Tekstury forniru | 393 sztuki (klon na część) | **3 współdzielone** |
| Skala wzoru | `texture.repeat` per klon | **UV geometrii**, raz na siatkę |
| Rozdzielczość skanów | 2K | 1K |
| HDRI | 2K | 1K |
| `pixelRatio` | 1,5 | 1,0 |
| Mapa cienia słońca | 4096² (64 MB) | 2048² (16 MB) |

Skala fizyczna wchodzi teraz w UV: panel 200 × 85 cm dostaje uv (2,00 / 0,85), czyli
dokładnie dwie próbki dębu na 200 cm. Sprawdzone na 131 siatkach — żadna nie została pominięta.

**Wynik: 56 tekstur, ~157 MB** zamiast ~8,4 GB.

Przy okazji dwa błędy skali, które wyszły przy przejściu na wspólne tekstury:
- UV ścian były dzielone przez 60, a próbka tynku ma 200 cm → dzielnik poprawiony;
- `ShapeGeometry` stropu wystawia UV w centymetrach obrysu, więc bez podziału wzór
  powtarzałby się tysiąc razy na jednym suficie.

## Zawór bezpieczeństwa

`?lekki=1` wyłącza SSGI i SSR — dwa najdroższe przebiegi. Zostaje pass + bloom + TRAA:
materiały, światło i wygładzanie działają, nie ma tylko światła pośredniego.
Lepiej pokazać scenę bez GI niż zawiesić maszynę.

---

# Tura po pierwszym oglądzie obrazu

Od tego momentu pracuję na zrzutach, nie na domysłach.

## 1. Okna były zamurowane — główna przyczyna „fatalnego światła”

„Rama okienna” była **litą bryłą wielkości całego otworu**:

```js
boxGeo(pionowe ? gr+2 : szer+2, wys+2, pionowe ? szer+2 : gr+2, .8)
```

Czyli w każdy otwór wstawiany był pełny prostopadłościan. Z wnętrza okno było
szarym prostokątem, nie wpadało przez nie światło, nie było widać nieba ani drzew.
Promień puszczony z salonu w stronę okna trafiał w nieprzezroczysty materiał na x = 981.

Teraz rama to **cztery ramiaki** (nadproże, podokiennik, dwa boczne, profil 6 cm),
a otwór jest przelotowy. Ten sam promień przechodzi teraz przez szybę na x = 994
i trafia dopiero w drzewa na x = 1080.

## 2. Słój forniru był niewidoczny

Trzy przyczyny, wszystkie sprawdzone na materiale i na samym pliku tekstury:

- `oak_veneer_04` ma słój ledwo czytelny — obejrzałem pobrany plik. Zmiana na
  **`ash_veneer`**, który pakiet zaleca właśnie do referencji 2.
- Słój w skanie biegnie **poziomo**, a na wysokiej formatce ma biec pionowo.
  Rozwiązane **zamianą składowych UV** tej jednej siatki — obrót tekstury odpadał,
  bo mapa jest współdzielona i obróciłby wszystko naraz.
- `siatka()` w bibliotece nakłada kolor z modelu **po** fabryce materiału, a regał
  w salonie deklaruje `#d8bd99` z czasów tekstury proceduralnej. Mnożąc jasny skan
  gasił go do tektury. Kolory są teraz ściągane w stronę ciepłej bieli (lerp 0,78),
  ze śladem odcienia, żeby celowa różnica między meblami nie zniknęła.

## 3. Mikrofaza krawędzi

Formatki stykały się matematycznie ostro, więc cała zabudowa czytała się jak jedna
płyta. Renderer narzuca teraz **minimalny promień 1,5 mm** na każdą bryłę mebla
(`boxGeoZFaza`) — tyle, ile realnie zostawia frezarka. Modele mebli są nietknięte:
to decyzja o wykończeniu, nie o projekcie.

## 4. Reszta strojenia

| | Było | Jest |
|---|---|---|
| Niebo w oknie | mnożnik 1,0 | **2,6** — prześwietla się jak w referencji |
| Ściany | `#f0eee8` | `#faf8f4` |
| Słońce / okna | 2,6 / 3,2 | **6,0 / 9,5** |
| HDRI | 1,05 | **0,55** (wypełnienie, nie główne źródło) |
| Ekspozycja AgX | 1,15 | 0,95 |
| normalScale forniru | 0,55 | 1,6 |

## 5. Typ części `light` w formacie mebla

Punkt rozszerzenia zamieniony na działającą implementację: `strip` (RectAreaLight,
listwa LED), `point`, `spot`. Konwencje formatu bez zmian — milimetry, lokalne osie,
+Z jako front. Żaden model jeszcze go nie deklaruje, więc wizualnie nic to nie zmienia,
ale podświetlone wnęki z referencji przestają być zablokowane na poziomie formatu.

## 6. Stan po tej turze — uczciwie

Lepiej, nadal nie na poziomie referencji. Zostaje:
LED w niszach (czeka na deklarację w modelu), drzewa jako płaskie karty na patykach,
fornir wciąż bledszy i mniej złocisty niż na referencji, brak contact shadows,
szkło na `opacity` zamiast `transmission`, brak interakcji mebli.

---

# Tura: kontrast, ton drewna, miękkie cienie, LED-y

## 1. Cienie były ostre, bo `shadow.radius` prawie nic nie robił

`PCFShadowFilter` w r185 bierze **pięć** próbek z dysku Vogela
(`src/nodes/lighting/ShadowFilterNode.js`), więc zwiększanie promienia daje ziarno
i schodki, a nie półcień. Przełączone na **VSM**, które rozmywa mapę głębi naprawdę:

```
renderer.shadowMap.type = VSMShadowMap
shadow.blurSamples = 16
shadow.radius = 2 + 12 · rozproszenie     (suwak steruje wielkością półcienia)
shadow.normalBias 1,6 → 0,8               (VSM potrzebuje mniej niż PCF)
```

## 2. Kolor drewna — `colorNode` po cichu zjadał deklarację z modelu

Ustawienie `material.colorNode` **omija `material.color`**. Regał w salonie deklaruje
`#d8bd99` — dokładnie ton mlecznej kawy — a ta deklaracja przepadała bez śladu
i zostawała goła żółć skanu.

Naprawione, ale odcień wchodzi **znormalizowany do jasności 1**: skan dębu sam jest
brązowy, więc mnożenie przez ciemny odcień liczyło brąz drugi raz i ściągało kanał
niebieski do 0,6 — stąd pomarańcz. Po normalizacji deklaracja wpływa na odcień,
a nie na jasność. Pozostały przechył w żółć ściągany o połowę ku neutralnej,
nasycenie forniru 0,52.

## 3. Kontrast — moja własna gradacja go zabijała

Rozjaśnienie skanu przez `pow(0.66)` podnosi ciemne partie mocniej niż jasne, więc
**spłaszczało słój**. Teraz gamma 0,80 plus przywrócenie kontrastu wokół punktu 0,42.

Do tego gradacja całego obrazu na końcu potoku, **w przestrzeni liniowej przed
tone mappingiem** — ACES dostaje rozciągnięty sygnał i sam go domyka, zamiast
kompresować płaski:

```
kontrast 1,24 wokół szarości 18 %, nasycenie 1,02
```

Proporcja światła: półsfera 0,30 → 0,15, HDRI 0,30 → 0,20. Mniej wypełnienia
to większy rozstrzał między partiami oświetlonymi a zacienionymi.

## 4. LED-y w niszach

Były tuż za frontem i świeciły w pustkę. Teraz przy **tylnej ściance**, na głębokości
liczonej ze zmierzonych promieni (wnęka bywa płytsza niż korpus), moc 48 → 260,
jedna listwa na każde ~78 cm wysokości wnęki.

## 5. Fornir

Wybór użytkownika: **`oak_veneer_01`** (2K). Kierunek słoja sprawdzony w pliku przed
wdrożeniem — pionowy, więc na wysokich frontach nie zamieniamy składowych UV.

## Nadal odstaje od referencji

- Widać samą listwę LED jako jasną kreskę; na referencji źródło jest schowane
  za wieńcem maskującym — wymaga dołożenia geometrii do modelu mebla.
- Wnęki są jaśniejsze pod listwą niż przy dole.
- Brak: szkła na `transmission`, szczotkowanej stali, trybu PHOTO.

---

# Tura: dopasowanie do renderu przez pomiar, nie na oko

Po kilku rundach strojenia „na oko", które za każdym razem chybiały, przeszedłem
na pomiar. Teksturę da się zdekodować w przeglądarce przez canvas 2D (to bufor
WebGPU jest nieodczytywalny, nie canvas 2D), więc barwy są liczone, nie zgadywane.

## 1. Szafa była prawie biała — winna ekspozycja, nie materiał

Pomiar: skan `oak_veneer_01` ma średnią **sRGB (161, 126, 88)**. Po mojej gradacji
albedo wychodzi liniowo **(0,48 / 0,35 / 0,24)** — czyli poprawny jasny dąb.
Bielenie brało się więc z prześwietlenia sceny, a nie z barwy materiału.
Do tego gradacja kontrastu `(x−0,18)·1,24+0,18` podbijała także jasne partie
o 20 %, dokładając przepaleń.

Ekspozycja 0,72 → 0,55, okna 16 → 10, półsfera 0,15 → 0,13.

## 2. Podłoga w tonacji szafy — policzone

| | sRGB skanu | liniowo |
|---|---|---|
| `oak_veneer_01` | (161, 126, 88) | po gradacji (0,477 / 0,350 / 0,243) |
| `rectangular_parquet` | (120, 92, 51) | (0,188 / 0,107 / 0,033) |

Rozwiązanie: gamma **0,55** i wzmocnienia **(1,1966 / 1,1963 / 1,5837)**.
Sprawdzenie: obie powierzchnie lądują na **sRGB (184, 160, 135)**.

## 3. Pora dnia i orientacja — wyszukane, nie dobrane

Salon ma okna wyłącznie od wschodu, więc światła „z lewej" jak na referencji nie
da się uzyskać samą porą dnia. Przeszukane pary (miesiąc, godzina, orientacja)
dla III, IV, V i IX w poszukiwaniu kierunku, przy którym promień wchodzi oknem
wschodnim i biegnie ku północnemu zachodowi:

```
15 września, 16:00, orientacja mieszkania 335°
kierunek (0,694 / 0,418 / 0,586) · słońce 24,7° · odchyłka od celu 1,2°
```

Orientacja to ustawienie **renderera**, nie zmiana planu: `plan.js` jest nietknięty,
a 0° wraca do symbolu N z SVG.

## 4. Wykończenie matowe

Referencja to fornir olejowany. `clearcoat` 0,06 i `envMapIntensity` 1,15 dawały
politurę ze smugą odbicia. Teraz roughness 0,88, clearcoat 0, env 0,75 — i to
wymuszane **po** bibliotece, bo `siatka()` nadpisuje roughness wartością z modelu
(0,58), zadeklarowaną jeszcze pod dawną teksturę proceduralną.

## 5. LED-y

Profil siedzi pod górną krawędzią **otworu**, cofnięty ~9 cm za front — nie przy
tylnej ściance, gdzie świecił w boczne panele i zostawiał jasne kliny. Świeci
w głąb i w pion (skos 1:2), więc tylny panel dostaje gradient zamiast plamy.
Wnęki wyższe niż 45 cm dostają też listwę dolną — na referencji poświata
obrysowuje otwór jak ramka. Moc 260 → 30, pasek 3,5 cm.

## 6. Cień liści wyłączony domyślnie

Korony rzucały cętki na całą zabudowę i to one dominowały obraz; referencja ma
gładką plamę słońca. Widok przez okno zostaje bez zmian — wyłączony jest tylko
udział koron w mapie cienia. Przełącznik „Cień liści (komorebi)" w zakładce Światło.

---

# Tura: teleport, wariacja forniru, miękki komorebi

## Teleport nie działał — trzy błędy w łańcuchu

Zgłoszenie „naciśnięcie touchpada nie teleportuje, tylko pojawia się tryb
z krzyżykiem" miało **trzy niezależne przyczyny**, jedna maskowała drugą:

1. **`podejdz()` ustawiało `tryb = SPACER`** po dolocie. Kolejne kliknięcie
   trafiało więc w gałąź „spacer bez blokady" i zamiast podejść — włączało
   blokadę wskaźnika z krzyżykiem. W demo OAKSUN tryb POINTER zostaje trybem
   POINTER: klik podchodzi, przeciągnięcie rozgląda, a WASD i blokada to
   osobny tryb FPS.
2. **`releasePointerCapture` rzucało wyjątkiem** przy nieznanym `pointerId`
   i przerywało cały uchwyt `pointerup`, zanim doszło do podejścia.
3. **Macierz projekcji kamery przestawała być skończona.** TRAA rozsuwa kadr
   przez `camera.setViewOffset(fullWidth, fullHeight, …)`; przy chwilowo zerowym
   buforze trafia tam 0/0, `aspect` robi się NaN i **każdy promień z kamery
   przepada**. Objaw: kliknięcia nagle przestają cokolwiek robić.
   Doszła `naprawKamere()` — wołana przed każdym promieniem i w każdej klatce.

Sprawdzone: kliknięcie przesuwa kamerę o 182 cm, tryb zostaje `orbita`,
blokada wskaźnika pozostaje wyłączona.

Przy okazji kółko celu działa teraz **także na ścianie i meblu** — układa się do
normalnej trafionej powierzchni, a podejście idzie do najbliższego wolnego
miejsca na podłodze. Wcześniej ograniczenie „tylko podłoga" powodowało, że nad
połową kadru znacznik w ogóle się nie pokazywał.

## Wariacja forniru między formatkami

Dwadzieścia frontów dzieliło jedną teksturę i miało identyczny słój, co
natychmiast zdradzało render. Stolarz kładzie kolejne arkusze z innego miejsca
sztapla i co drugi odwraca książkowo — robimy to samo: losowe przesunięcie UV
po obu osiach i lustrzane odbicie (w poziomie co drugi element, w pionie
rzadziej, bo słój ma trzymać kierunek).

Losowość jest **deterministyczna** — wynika z położenia siatki w meblu — więc
mebel wygląda tak samo po każdym przeładowaniu i po odświeżeniu z biblioteki.

## Cień koron wraca, mocno rozmyty

Promień półcienia VSM 2 + 12·rozproszenie → **6 + 30·rozproszenie** (27,6 przy
ustawieniach domyślnych), próbki rozmycia 16 → 32. Ostre cętki zlewają się
w miękką modulację plamy słońca.

## Kontrast światła z okna

Plama bezpośrednia była o rząd jaśniejsza od reszty i obraz rozpadał się na dwa
światy: słońce 26 → **13**, okna 10 → 13, półsfera 0,13 → 0,26, HDRI 0,20 → 0,34,
gradacja kontrastu 1,24 → 1,08.

## LED-y — jasność wg porównania A/B

Porównanie obok siebie pokazało dwie różnice, nie jedną:

- moc była za niska: **30 → 170**, barwa ocieplona `#ffdcb4` → **`#ffc582`**;
- na referencji profil biegnie **pod spodem każdej półki**, nie tylko przy górnej
  krawędzi otworu — bez tego dolne komory zostawały ciemne i to one najbardziej
  rzucały się w oczy.

Półki znajdowane są w geometrii mebla: bryły cieńsze niż 6 cm w pionie, o rozpiętości
ponad 22 cm, których czoło jest cofnięte za front — czyli leżące wewnątrz wnęki.
Listwa ląduje 1,2 cm pod półką, 7 cm za jej czołem, świecąc w dół i w głąb.

Razem 34 źródła w mieszkaniu: 18 przy krawędziach wnęk, 16 pod półkami.
Licznik jest ograniczony do 40, żeby nowy mebel z gęstym podziałem nie wysadził
budżetu świateł.

---

# Niedoskonałości powierzchni — warstwa generatywna w TSL

Odtworzenie warstwy, która w wersji WebGL wchodziła przez `onBeforeCompile`
i przy przejściu na WebGPU przepadła, bo `NodeMaterial` tego haka nie zna.
Nowy moduł `webgpu/niedoskonalosci.js`.

Wszystko liczone w **przestrzeni świata**, nie w UV. Dzięki temu wzór nie
powtarza się razem z teksturą, sąsiednie formatki dostają inne zabrudzenie mimo
wspólnej tekstury, i działa to na każdej geometrii — także bez sensownych UV.

| Warstwa | Co odwzorowuje | Jak liczona |
|---|---|---|
| Przebarwienia | drewno z różnych partii, farba kładziona w nawrotach | fraktalny szum, skala ~1,7 m |
| Chropowatość | plamy matu i satyny; żadna powierzchnia nie ma jednej wartości | worley (płaty) + drobny fraktal |
| Przybrudzenia | kurz osiada na tym, co zwrócone do góry, i zbiera się przy podłodze | szum × `normalWorld.y` + `smoothstep(120→25 cm)` |
| Wytarcia | pas dotykany dłonią: gładszy i jaśniejszy | `smoothstep` 55–125 cm × pionowość ściany |
| Geometria | fronty poza pionem — tolerancja stolarska, nie CAD | ±0,13° obrotu i ±0,45 mm przesunięcia |

Natężenia są celowo małe — niedoskonałość ma być widoczna dopiero wtedy, gdy się
jej szuka; przesada wygląda jak brud, nie jak realizm. Profile osobno dla drewna,
parkietu, tynku i lakieru (parkiet dostaje najwięcej wytarcia i brudu, tynk
najmniej).

Brud nie tylko przyciemnia, ale też **ściąga barwę ku neutralnej szarości**
i podnosi roughness — sam mnożnik jasności wygląda jak cień, nie jak zabrudzenie.

## Ostre krawędzie

Mikrofaza 1,5 mm przy dwóch segmentach była pojedynczą fasetką i krawędź nadal
czytała się jak matematycznie ostra. **2,2 mm i trzy segmenty** — światło
przesuwa się teraz po załamaniu gradientem.

## Uwaga techniczna

`tynk()` i `lakier()` tworzyły zwykły `MeshPhysicalMaterial`. `colorNode`
i `roughnessNode` działają wyłącznie na wariancie `NodeMaterial`, więc na tych
dwóch cała warstwa zostałaby po cichu zignorowana — skonwertowane.

Sprawdzone: 289 siatek z warstwą niedoskonałości, 367 formatek odchylonych,
brak usterek.

---

# Ładowanie, wydajność, interakcje

## Dlaczego „połowę razy się nie ładuje" — przyczyna była jedna

Pięć pobrań sieciowych, **żadne bez limitu czasu**, a `tekstury.js:60` to
top-level await. Jedno zawieszone połączenie zatrzymywało cały graf modułów
i strona stała pusta, bez błędu i bez końca.

Nowy `siec.js`: każde pobranie ma termin (12–20 s) i dwa ponowienia z narastającą
przerwą. `AbortSignal.timeout` naprawdę przerywa żądanie, więc porzucone pobrania
nie zajmują limitu połączeń. Gdzie loader z three.js nie przyjmuje sygnału
(TextureLoader, RGBELoader), obietnica ściga się z zegarem.

## Skąd naprawdę brał się czas — pomiar, nie domysł

Pytanie „czy nie będzie szybciej z plików lokalnych" ma zmierzoną odpowiedź:

| źródło | żądań | rozmiar | czas |
|---|---|---|---|
| raw.githubusercontent | 11 | ~0 MB | 0,87 s |
| cdn.jsdelivr (three.js) | 20 | 0,81 MB | 0,24 s |
| localhost (moduły) | 10 | 0,15 MB | 0,20 s |
| dl.polyhaven (skany) | 10 | 0 MB (cache) | 0,06 s |

**Łącznie 1,4 s sieci przy 50 s ładowania.** Kopiowanie assetów lokalnie
oszczędziłoby najwyżej sekundę.

Prawdziwy koszt: **341 unikalnych materiałów**. `siatka()` w bibliotece klonuje
materiał na każdą część, więc regał dawał 131 osobnych NodeMaterialów, a kuchnia
155 — każdy z własnym grafem węzłów, czyli własną kompilacją WGSL i własnym
pipeline'em.

Scalanie identycznych wykończeń **w obrębie mebla**: 341 → **43 materiały**,
czas ładowania 50 s → ~11 s. Wariacja słoja nie ginie, bo siedzi w UV geometrii.
Pamięć jest lokalna dla mebla, bo biblioteka przy podmianie wersji zwalnia
materiały swojego korzenia — współdzielenie między meblami zwolniłoby materiał
używany przez sąsiada.

## Ekran ładowania

Pasek, nazwa etapu, licznik czasu i przycisk ponowienia. W HTML, nie w module —
pojawia się natychmiast, także gdy moduł w ogóle się nie wczyta.

Dwie rzeczy, które trzeba było rozwiązać osobno:

- **Kompilacja WGSL blokuje główny wątek**, więc `setInterval` paska zamarza
  dokładnie wtedy, gdy jest najbardziej potrzebny. Przed każdym długim etapem
  oddajemy dwie klatki, żeby komunikat zdążył się narysować.
- `requestAnimationFrame` **nie odpala się na karcie w tle**, więc to oddanie
  klatki musi ścigać się z zegarem — inaczej strona otwarta w nieaktywnej karcie
  stawałaby na zawsze.

Do czasu pierwszego raportu z modułu pasek pełznie sam (maksymalnie do 10 %),
bo pobieranie i parsowanie three.js nie ma żadnego punktu zaczepienia.

## Rozglądanie zamiast orbity

Przeciągnięcie obraca widok **w miejscu**, jak panorama na telefonie; obraz idzie
za palcem. Kółko dojeżdża wzdłuż kierunku patrzenia, z tymi samymi kolizjami co
chodzenie. OrbitControls zostają wyłącznie w widoku z lotu ptaka, gdzie krążenie
wokół mieszkania jest właściwym gestem.

Sprawdzone: po przeciągnięciu kamera przesunięta **0 cm**, widok obrócony o 12°.

## Interakcje mebli — wymóg twardy z briefu, wreszcie zamknięty

Biblioteka od początku budowała mechanizmy i oznaczała siatki przez
`userData.ruchId`, ale **nic ich nie napędzało**. Nowy `interakcje.js`:
klik w ruchomą część otwiera ją i zamyka z easingiem, panel listuje wszystko,
co się rusza, plus „Otwórz wszystko".

Konflikt z Point & Go rozstrzygnięty regułą: klik w część z mechanizmem otwiera
mebel, klik w cokolwiek innego przenosi kamerę. Jeden gest, bez trybu edycji.

**27 ruchomych części** w scenie: drzwiczki, szuflady, opuszczane biurka.
Łóżko ma wpis `legacy` ze sprzężonymi siłownikami — inny mechanizm, świadomie
pominięty do czasu publikacji wersji deklaratywnej.

## Ustawienia między sesjami

Zapisywane są **wszystkie** kontrolki panelu, przez generyczne przejście po
`input`/`select` — kontrolka dodana w przyszłości będzie pamiętana bez dopisywania
czegokolwiek. Do tego otwarta zakładka i stan zwinięcia panelu. Przywracanie idzie
przez wysłanie zdarzeń `input`/`change`, czyli tą samą drogą co ruch suwaka —
nie ma drugiej ścieżki, która mogłaby się rozjechać.

Sprawdzone: 16 pól zapisanych, po przeładowaniu przywrócone, a silnik je stosuje
(ekspozycja 1,4 w polu = 1,4 w rendererze).

## Szkło na transmission (pakiet §19.J)

`opacity: .10` to była półprzezroczysta powłoka bez załamania. Teraz
`transmission: 1`, `ior: 1.52` (szkło sodowe), `thickness: 0.6 cm`, tłumienie
lekko zielonkawe. Transmission to osobny przebieg renderowania — czas ładowania
wzrósł z ~11 s do ~28 s, więc w zakładce Jakość jest przełącznik wracający do
taniej szyby, bez zmiany geometrii okna.

## Nadal niezrobione z pakietu

Szczotkowana stal z anizotropią (§19.10 — w obecnych meblach nie ma stali),
kamera ARCH_PHOTO z przesunięciem osi (§19.4), miękka geometria poduszek,
world-space GI (Speedball), tryb PHOTO z path tracingiem. Pakiet sam stawia
path tracer na końcu: „inaczej pokaże tylko dokładniej obecne błędy materiałów".

---

# Przełącznik jakości

Trzy poziomy dotykają tego, co w tej scenie naprawdę kosztuje, a nie tego, co
ładnie brzmi. Najdroższe pozycje: przebiegi SSGI/SSR, liczba świateł
**obszarowych** (RectAreaLight liczy się per piksel, a jest ich 30), rozdzielczość
bufora i osobny przebieg refrakcji szkła.

| | Minimalna | Średnia (domyślna) | Wysoka |
|---|---|---|---|
| SSGI + SSR + odszumianie | — | ✓ | ✓ |
| Szkło z refrakcją | — | — | ✓ |
| `pixelRatio` | 0,75 | 1,0 | 1,25 |
| Mapa cienia | 1024² | 2048² | 2048² |
| Próbki rozmycia cienia | 8 | 16 | 32 |
| Listwy LED pod półkami | — (14 świateł) | ✓ (30) | ✓ (30) |
| Cień liści | — | ✓ | ✓ |
| Dopracowanie po zatrzymaniu | — | ✓ | ✓ |

**Jak to działa.** Oba grafy kompozytu — pełny i tani — są budowane z góry,
a przełącznik podmienia `potok.outputNode`. Wariant tani zachowuje przebieg
sceny, bloom z bufora emisji, TRAA i gradację; odpadają wyłącznie trzy najdroższe
przebiegi. Dlatego materiały, światło i wygładzanie wyglądają tak samo — znika
okluzja i odbicia, a nie „ładność" obrazu.

Podmiana `outputNode` wymusza rekompilację shaderów, czyli kilka sekund blokady
wątku. Stąd przełącznik, a nie suwak — i komunikat „Przełączanie…" wyświetlany
po oddaniu klatki, żeby zdążył się pojawić przed zamrożeniem.

Mapa cienia jest zwalniana przy zmianie rozmiaru (`shadow.map.dispose()`),
bo inaczej zostałaby zaalokowana w starym.

`?lekki=1` zostaje jako skrót do poziomu minimalnego.

Sprawdzone przełączanie w obie strony: minimalna → `pixelRatio 0,75`, cień 1024²,
14 z 30 świateł, `transmission 0`; wysoka → `pixelRatio 1,25`, 30 świateł.

---

# Optymalizacja — pomiary, nie domysły

## Uwaga metodologiczna

Pierwsze pomiary dawały 0,5 fps i były **fałszywe**: panel podglądu chowa się przy
każdym wywołaniu JS, a wtedy `requestAnimationFrame` staje. Wiarygodny pomiar
wymaga wymuszenia kompozytowania (seria zrzutów) i odczekania, aż scena się
ustabilizuje — pierwsze klatki po przestawieniu kamery zawierają rekompilacje
i zaniżają wynik nawet dziesięciokrotnie.

## Co naprawdę kosztowało

| | przed | po |
|---|---|---|
| Światła obszarowe (RectAreaLight) | **43** | **12** |
| Światła punktowe | 7 | 2 |
| Mapa cienia | co klatkę | na żądanie |
| Rozdzielczość przebiegu w ruchu | 100 % | 55 % |
| Kadr regału | **61 ms** | **17 ms** |
| Kadr pokoju | 37 ms | 17 ms |

## 1. RectAreaLight liczy się PER PIKSEL

Każdy oświetlony fragment przechodzi transformację LTC dla **każdego** źródła
w scenie. Trzydzieści listew LED w meblach plus lampy i okna dawały 43 źródła.

`ClusteredLightsNode` z r185 tego nie ratuje — sprawdzone w źródle: klasteryzuje
wyłącznie `isPointLight` bez cienia.

Rozwiązanie rozdziela to, co wcześniej robiło jedno światło:

- **widoczna poświata** → cienki pasek z materiałem emisyjnym w każdym z 30 gniazd;
  jedno wywołanie rysowania, zero kosztu na piksel, a bloom i SSGI i tak roznoszą
  emisję po sąsiednich powierzchniach;
- **rzeczywiste światło** → **stała** pula 4 źródeł, wędrujących do gniazd
  najbliższych kamerze.

Stała liczba jest warunkiem koniecznym: dodanie albo usunięcie światła unieważnia
materiały i wymusza rekompilację shaderów, więc gaszenie co klatkę byłoby
lekarstwem gorszym od choroby.

Tak samo lampy sufitowe: 7 → 2 (kule emisyjne zostają w każdym pokoju, bo to one
są widoczne). Łuny punktowe 7 → 2.

**Okien NIE poolowałem** — próba zeszła z 6 na 3, oszczędziła trzy światła
i odebrała połowę światła dziennego; obraz zrobił się ciemny i zaszumiony, bo SSGI
musiało go wyciągać z niczego. Oszczędność w złym miejscu, cofnięta.

## 2. Mapa cienia odświeżała się w każdej klatce

`shadowMap.autoUpdate = true` przy VSM to przerysowanie 458 siatek do bufora
2048² plus przebieg rozmycia — czyli **drugi pełny render sceny co klatkę**.
Teraz `autoUpdate = false` i odświeżanie na żądanie: zmiana światła, otwarcie
mebla, podmiana modelu, zmiana jakości. Cień liści odświeża się co ósmą klatkę —
wiatr pozostaje płynny, bo rozmyta plama i tak nie pokazuje różnicy.

Sama ta zmiana dała **37 ms → 20 ms**.

## 3. Adaptacyjna rozdzielczość (jak w Lumenie)

`PassNode.setResolutionScale()` — w ruchu 55 %, po zatrzymaniu 75 %, potem 100 %,
razem z rosnącą liczbą próbek SSGI (2×6 → 8×28). Skalowanie przebiegu jest dużo
tańsze niż zmiana `pixelRatio` całego renderera, bo nie realokuje łańcucha buforów
post-processingu.

## 4. Martwa strefa prędkości

Tłumienie geometryczne nigdy nie zeruje się dokładnie, więc kamera pełzła
w nieskończoność, detektor bezruchu uznawał scenę za wiecznie ruchomą i obraz
**nigdy nie dochodził do pełnej jakości**. Wykryte pomiarem: `bezRuchu` resetowało
się co klatkę.

## 5. Ruch przepisany ze źródła demo

Z funkcji `Jn()`: działa w obu trybach, strzałki to krok w bok (nie obrót),
kierunek z kolumn macierzy kamery, prędkość akumulowana i tłumiona — nie ustawiana
wprost. Prędkość końcowa to `maxSpeed/(1−dampening)` = 0,4/0,08 = 5 cm na klatkę,
czyli ~3 m/s; dlatego `maxSpeed 0,4` wygląda absurdalnie mało, a chodzi się normalnie.

Przy okazji: `camera.lookAt()` przestało działać, bo `krok()` co klatkę odtwarza
orientację z własnych pól. Doszło `ustawWidok(pozycja, cel)` i kadrowanie mebla
w panelu korzysta teraz z niego.

## Stan obrazu — uczciwie

Wydajność jest, ale obraz stracił na jakości: wnętrze pociemniało, a wnęki mają
brązowe plamy. Część to szum SSGI, który przy 26 zabranych światłach ma więcej
pracy; wnętrza wnęk były zaszumione już wcześniej i nie zostało to naprawione.
Do wyrównania w osobnym przejściu.

---

# Nawigacja przepisana 1:1 z demo OAKSUN

Wyciągnięte z bundla i odtworzone: `Jn()` (ruch), `mi()` (patrzenie), `qt()`
(znacznik), `dt()` (podejście), `Nt()`/`$t()` (klawisze).

## Czego wcześniej nie zauważyłem

**W demo funkcja ruchu NIE DOTYKA kwaternionu kamery.** Orientację zmienia
wyłącznie `mi()`. Mój `krok()` odtwarzał ją co klatkę z własnych pól `yaw/pitch`
i przez to kasował każde przeciągnięcie myszą — stąd „panorama nie działa".
Pola `yaw/pitch` zniknęły: orientacja mieszka teraz w kwaternionie kamery,
osobno trzymane jest tylko pochylenie (`de` w demo), bo jego ogranicznik
potrzebuje bieżącej wartości.

## Odtworzone wiernie

| element | zachowanie z demo |
|---|---|
| Strzałki | **to samo co WSAD** — ←/→ to krok w bok, nie obrót |
| Kierunek ruchu | z kolumn macierzy kamery (2 = przód, 0 = bok) |
| Prędkość | akumulowana i tłumiona, nie ustawiana wprost |
| Patrzenie przy blokadzie | `movementX/Y`, znak **odejmowany** |
| Patrzenie przeciąganiem | różnica pozycji, znak **dodawany** (obraz idzie za palcem) |
| Znacznik | promień we **wszystko**, kładzie się na normalnej powierzchni |
| Znacznik znika | gdy cel bliżej niż 1 m (u nas 100 cm) |
| Podejście | zdarzenie `click`, tylko gdy nie wciśnięty ANI przesunięty |
| Podejście — ruch | 1 s, easeOutCubic, **tylko pozycja**, orientacja nietknięta |
| Podejście — cel | 80 cm przed wskazanym punktem, na wysokości oczu |

Dołożone jest wyłącznie to, czego demo nie potrzebuje, bo nie ma ścian:
kolizje rozdzielone na osie (ślizganie po ścianie) i sprowadzenie celu podejścia
do najbliższego wolnego miejsca na podłodze.

Prędkość końcowa to `maxSpeed/(1−dampening)` = 0,4/0,08 = 5 cm na klatkę,
czyli ~3 m/s — dlatego `maxSpeed 0,4` wygląda absurdalnie mało, a chodzi się normalnie.

**Zmierzone:** przeciągnięcie → obrót 10°, przesunięcie **0 cm**; strzałka w przód
327 cm; strzałka w bok 149 cm; kółko 12 cm; kliknięcie → 275 cm, wysokość 170,
**zmiana orientacji 0°**.

# Kąt świecenia LED

Listwy świeciły pod 63° od poziomu (`przod −20, gora ±40`), czyli prawie pionowo
w dół — stąd jasna plama tuż pod profilem zamiast równego mycia tylnego panelu.
Teraz **22°** (40 : 16, bo tan 22° ≈ 0,404), głównie w głąb wnęki.

# Zasłony i firanki

Nowy moduł `webgpu/zaslony.js`. Cztery pary, dobrane po pomieszczeniu:

- **SALON — 3 pary IKEA MAJGUL**: zaciemniające, nieprzezroczyste, przygaszony
  róż ceglany. Rzucają pełny cień. Dwa okna plus drzwi balkonowe.
- **POKÓJ Z ŁÓŻKIEM — 1 para IKEA GLASÖRT**: firanka przezroczysta z pionowym
  przejściem barwnym (biel → żółć → szałwia), krycie ~0,42. Nie rzuca pełnego
  cienia.

**Fałdy nie są przeliczane przy każdej zmianie.** Panel powstaje raz, z
sinusoidalnym wygięciem w poprzek (9 fałd, głębokość 4,5 cm, zanikające przy
karniszu, gdzie tkanina siedzi w taśmie marszczącej). Otwieranie to **zmiana
skali**: węższy panel to gęstsze fałdy, a `scale.z` pogłębia je tak, jak
gęstnieje tkanina ściągana na bok. Animacja nie dotyka geometrii.

Splot i nierówność barwienia liczone w przestrzeni **lokalnej panelu**, więc
nie pełzną przy rozsuwaniu.

Klik w tkaninę otwiera i zamyka daną parę. Kolejność rozpoznawania kliknięcia:
tkanina → mechanizm mebla → podejście kamery.

**Firanka nie używa `transmission`** — dla tkaniny wystarczy przezroczystość
z rozpraszaniem, a transmission kosztowałoby osobny przebieg renderowania.

---

# BŁĄD KRYTYCZNY: potok był nieprawidłowy w każdej klatce

Konsola była zalana błędami walidacji WebGPU — 232 sztuki w buforze:

```
Copy origin and size (704×396) does not cover the entire subresource (1280×720)
of Texture Depth24Plus. The entire subresource must be copied when the format
is a depth/stencil format.
```

Przyczyną było **moje własne skalowanie rozdzielczości przebiegu**.
`PassNode.setResolutionScale()` zmienia rozmiar bufora koloru, ale **nie**
tekstury głębi, którą dalsze węzły kopiują w całości. Rozmiary z komunikatu
(704×396 i 960×540) to dokładnie moje stopnie 0,55 i 0,75.

Skutki, które przez to zobaczyłem i błędnie zdiagnozowałem:

- obraz klatkował, bo **cały potok był odrzucany** przy każdym zgłoszeniu;
- znacznik podejścia miał `visible = true`, ale **nie było go widać** —
  kompozyt nie dochodził do ekranu;
- **wcześniejsze pomiary 50–68 fps były bezwartościowe**: mierzyły potok, który
  nie wykonywał pracy, bo był odrzucany przez walidację.

Skalowanie usunięte. Dopracowanie po zatrzymaniu zostaje, ale wyłącznie przez
liczbę próbek SSGI (2×6 → 8×28), bez ruszania rozdzielczości.

## Wydajność na POPRAWNYM potoku — liczby uczciwe

| poziom | koszt klatki | fps | błędy WebGPU |
|---|---|---|---|
| minimalna | **4 ms** | **235** | 0 |
| średnia | 42–56 ms | 18–24 | 0 |
| wysoka | ~69 ms | 14 | 0 |

Poziom średni rozdzielony na osobny wariant potoku: zostawia okluzję i światło
pośrednie, odpuszcza odbicia ekranowe i cienie kontaktowe (to dało 69 → 42 ms).

Dwie próby dalszej optymalizacji **nie dały mierzalnego zysku** i zostały cofnięte:
SSGI w połowie rozdzielczości (50 ms) i usunięcie odszumiania (56 ms) — obie
mieszczą się w rozrzucie pomiaru ±10 ms, a druga wyraźnie psuła obraz. Koszt
siedzi w samym marszu promieni SSGI, nie w rozdzielczości ani w filtrze.

## Weryfikacja nawigacji prawdziwym kursorem

Poprzednie testy używały syntetycznych zdarzeń i dlatego „przechodziły", mimo że
u użytkownika nic nie działało. Test najechaniem prawdziwym kursorem: **niebieskie
kółko pojawia się na podłodze**, zero błędów WebGPU.

---

# Ładowanie: 16,1 s → 8,0 s (pierwsze wejście), 6,6 s (kolejne)

Zgłoszenie „9 na 10 razy zostaje na pasku postępu". Zamiast zgadywać, dodałem
**pomiar czasu każdego etapu** (`siec.js` → `globalThis.__czasy`, wystawiane jako
`__silnik.czasyEtapow`). Pomiar od razu pokazał, że etykieta na pasku myliła:
etap podpisany „Pobieranie skanów PBR" trwał 94 ms, bo wszystko szło z cache,
a czas siedział zupełnie gdzie indziej.

| etap | przed | po |
|---|---|---|
| Kod tekstur + inicjalizacja WebGPU | 4530 ms | 700 ms* |
| Ściany, stropy i okna | 1720 ms | 1400 ms |
| Blok po ostatnim meblu | **6521 ms** | **612 ms** |
| Kompilacja shaderów | 530 ms | 900 ms |
| Pierwsza klatka | 1796 ms | 1700 ms |
| **razem** | **16,1 s** | **8,0 s / 6,6 s\*** |

\* przy kolejnym wejściu, z pamięci podręcznej

## Cztery przyczyny

**1. Trzy potoki zamiast jednego.** Dodając poziomy jakości zacząłem budować
wszystkie trzy warianty kompozytu przy starcie — a każdy zawiera własne TRAA,
które alokuje bufory historii w pełnej rozdzielczości i kompiluje osobny zestaw
shaderów. Teraz graf powstaje **na żądanie**, tylko dla aktywnego poziomu,
i jest zapamiętywany.

**2. Wykrywanie wnęk pod LED-y — 6,5 s.** Siatka promieni co 6 cm po froncie
mebla: dla regału 307 × 243 cm to ~2000 promieni, każdy przez 131 siatek.
Siatka zmieniona na 14 cm (najmniejsza wnęka ma 18 cm, więc nadal jest
wykrywana) — trzynaście razy mniej promieni. Do tego całe wykrywanie przeniesione
**za pierwszą klatkę**. Efekt: 6521 → 612 ms, gniazd wykrytych 30 → 29.

**3. HDRI blokowało start.** Pobranie RGBE i wygenerowanie PMREM to kilka sekund,
a bez nich scena jest tylko płaska — nie ma powodu trzymać przez ten czas pustego
ekranu. Przeniesione za pierwszą klatkę.

**4. Kod tekstur pobierany za każdym razem.** Zweryfikowany blok trafia teraz do
`localStorage` pod kluczem zawierającym jego sumę kontrolną — przy kolejnym
wejściu nie ma ani pobrania, ani liczenia SHA-256. Klucz zawiera sumę, więc
zmiana zatwierdzonego źródła unieważnia zapis sama z siebie.

## Uruchomienie dwuetapowe

Scena pojawia się teraz **przed** kompilacją potoku: kilka pierwszych klatek jest
rysowanych wprost (`renderer.renderAsync`), zasłona znika, a dopiero potem
dochodzą środowisko, oświetlenie mebli i efekty. Zamiast kilkunastu sekund
pustego paska na 94 % jest widok mieszkania i jednorazowe zacięcie.

Start ustawiony na jakość **minimalną** — to ona decyduje, ile shaderów trzeba
skompilować przed pierwszą klatką. Wyższą włącza się w panelu, gdy scena stoi;
wybór zapisuje się między sesjami.

---

# Punkt 2 — mruganie przy szafie

Zgłoszenie: *„obraz nadal skacze — gdy patrzę na szafę jest szybkie mruganie"*.

## Co to naprawdę było

Nie TRAA i nie cienie. Drabinka progresywnego dopracowania zmieniała trzy rzeczy
naraz i **dwie z nich zmieniały wygląd, nie jakość**.

**1. Liczba kroków SSGI.** Scena ma `useScreenSpaceSampling = true`, a w tej
gałęzi długość kroku jest stała (`SSGINode.js:594`), natomiast promień rośnie
liniowo z indeksem pętli (`SSGINode.js:489`). Liczba kroków wyznacza więc
**dystans, jaki przebiega promień** — czyli rzeczywisty zasięg okluzji — a nie
gęstość próbkowania. Drabinka jeździła 6 → 28 kroków, czyli promieniem prawie
pięć razy dłuższym.

Sprawdzone zrzutami przy nieruchomej kamerze na regale w salonie:

| co zmieniane | obraz |
|---|---|
| 6 vs 28 kroków, plastry stałe | **wyraźnie inny** — cała zabudowa ciemnieje, wnęki gasną |
| 2 vs 6 plastrów, kroki stałe | **taki sam** — różni się wyłącznie ziarno |

To drugie jest oczekiwane: SSGINode dzieli wynik przez liczbę plastrów
(`ao.divAssign(ROTATION_COUNT)`, `SSGINode.js:630`), więc plastry to czysta
redukcja szumu przy tej samej jasności.

**2. `DenoiseNode.index`.** Drabinka przestawiała go 0 → 1 → 2 → 3. To indeks
**obrotu jądra rozmycia** (`index.mod(4)`, `DenoiseNode.js:207`) — każda zmiana
przestawia cały wzór odszumiania. Widać to dokładnie tam, gdzie obraz niesie GI.

**3. Detektor ruchu bez histerezy.** Próg zero-jedynkowy, a przy jego
przekroczeniu zejście od razu na najniższy szczebel. Gładzik daje mikroruchy co
kilka klatek, więc obraz cyklicznie leciał w dół i wracał trzema skokami. Na
szafie widać to najmocniej, bo jej wnęki są najciemniejszym i najbardziej
zależnym od GI miejscem sceny.

## Poprawka

* Liczba kroków **stała na 8** — to parametr wyglądu, nie jakości, i 8 jest
  wartością skalibrowaną w konfiguracji bazowej.
* Drabinka reguluje **wyłącznie liczbę plastrów**: 2 → 3 → 4 → 6.
* Indeks odszumiania **nie jest już ruszany**.
* **Histereza**: dopiero trzecia z rzędu klatka z ruchem zbija jakość.
* **Zejście po jednym szczeblu**, nie na samo dno.
* Pule świateł przestawiają się przy każdym drgnięciu (mają własny próg pół
  metra, więc to tylko porównanie kwadratu odległości).

Budżet próbek na piksel w spoczynku: **448 → 96**, czyli 4,7 × mniej, przy
obrazie zgodnym z konfiguracją bazową. W ruchu 24 → 32.

## Przy okazji: dławienie cienia było martwym kodem

`renderer.shadowMap.autoUpdate` i `renderer.shadowMap.needsUpdate` **nie mają
żadnego znaczenia w ścieżce WebGPU**. ShadowNode pyta o zgodę wyłącznie światła:

```
let needsUpdate = shadow.needsUpdate || shadow.autoUpdate;   // three.webgpu.js:45484
```

`light.shadow.autoUpdate` zostawał domyślnym `true`, więc mapa cienia VSM była
przerysowywana **w każdej klatce** — drugi pełny render 458 siatek do bufora
2048² plus przebieg rozmycia. Dziesięć miejsc w kodzie „prosiło" o odświeżenie
cienia i żadne nic nie robiło.

Flaga ustawiana jest teraz na świetle, a wszystkie żądania idą przez jedną
funkcję `odswiezCien()`. Pomiar po zmianie: **26 klatek → 3 przerysowania mapy**
(co ósma klatka, na ruch liści), zamiast 26. Cień słońca na zrzucie bez zmian.


---

# Z0 — przywrócenie stałych 28 kroków SSGI, 2026-09-09

Status: zmiana kodu wdrożona lokalnie; zgodność wyglądu czeka na ocenę użytkownika.

## Zmiana

Jedna linia w każdej z dwóch identycznych kopii `silnik.js`, linia 1122:
`const KROKI_SSGI = 8;` → `const KROKI_SSGI = 28;`.

Pliki:
- `/Users/milajovovich/Desktop/mieszkanie walkthrough/webgpu/silnik.js`
- `/Users/milajovovich/Desktop/mieszkanie walkthrough/repo-do-wyslania/renderery/webgpu/silnik.js`

Drabinka plastrów pozostaje bez zmian. Nie zmieniono modeli, planu, materiałów, pozycji ani formatu biblioteki. Nie wykonano commitu ani publikacji.

## Weryfikacja

- Przed zmianą repozytorium było czyste, HEAD: `956e1e3`.
- Kopie silnika przed zmianą były identyczne; zachowano ich kopie robocze.
- Kontrola składni: `node --input-type=module --check` — poprawna.
- `git diff --check` — poprawny.
- Porównanie bajtów potwierdza wyłącznie zmianę wskazanej stałej w obu kopiach.
- Chrome: strona otworzyła się przed zmianą i po przeładowaniu po zmianie. Po ręcznym wybraniu poziomu „Średnia” pojawił się obraz z wnękami regału i okluzją. To kontrola uruchomienia, nie test niezawodności B1.
- Odczyt przechwyconych logów kategorii error po tej próbie zwrócił pustą listę. W logach bazowych były ostrzeżenia o brakującym atrybucie UV. Nie dowodzi to rozwiązania B2/B3.
- Nie mierzono FPS.

## Założenia i luki

Brak wiarygodnego porównania A/B 8 i 28 przy identycznym aktywnym poziomie SSGI: obraz bazowy był w potoku startowym minimalnym. Kod wymusza na starcie poziom minimalny, choć panel pokazywał zapisane „Średnia”; podczas kontroli wybrano ten poziom ręcznie. Nie potwierdzono więc powrotu historycznie zatwierdzonego wyglądu. Współczynnik 28/8 = 3,5 dotyczy liczby kroków, nie zmierzonego kosztu całej klatki.

Starszy komentarz nad stałą nadal opisuje budżet dla 8 kroków; zachowano zakres jednej linii kodu zgodnie ze zleceniem. Niniejszy wpis koryguje stan aktualny: stała wynosi 28. Wstępna inicjalizacja `gi.stepCount.value = 8` na linii 924 zostaje nadpisana przez `ustawJakosc()`; nie została zmieniona.

Źródła: lokalny kod i diff oraz kontrola podglądu `http://localhost:8123/webgpu/mieszkanie-webgpu-v1.html` w tej sesji. Pewność zmiany kodu: wysoka. Zgodność z zatwierdzonym wyglądem: niepotwierdzona.


---

# B2 — mruganie wnęki i krawędzi drzwiczek, 2026-09-09

Zmiana wdrożona lokalnie; wymaga oceny użytkownika. Stałe próbkowanie SSGI i SMAA zastępują zmienne próbkowanie SSGI i TRAA. W kontrolowanych próbach nieruchomego kadru końcowy wariant nie wykazał zmian pikseli w badanych fragmentach.

## Zakres

- `silnik.js`: `gi.useTemporalFiltering = false`; import i wywołanie SMAA zamiast TRAA.
- `sterowanie.js`: opis panelu dostosowany do aktualnego działania wygładzania.
- Stałe `KROKI_SSGI = 28`, intensywności GI/AO, materiały, geometria, mikrofaza, niedoskonałości, biblioteka i pozycje mebli zostały zachowane. Drabinka plastrów nadal działa.
- Zmieniono obie lokalne kopie: `webgpu/` oraz `repo-do-wyslania/renderery/webgpu/` w `/Users/milajovovich/Desktop/mieszkanie walkthrough/`.
- Nie wykonano commitu, push ani publikacji GitHub Pages.

## Metoda i wyniki

Chrome, widoczna karta; kamera `[815,150,385]` cm skierowana na `[815,130,35]`. Animację zieleni zatrzymano identycznie we wszystkich próbach porównawczych, tylko w podglądzie diagnostycznym. Poziom średni: 1657 × 868 px, 28 kroków, 6 plastrów.

Odczyt bezpośrednio z końcowego bufora GPU przez `readRenderTargetPixelsAsync`, po 24 próbki obrazu na wariant. Luminancja liniowego HDR: `0.2126 R + 0.7152 G + 0.0722 B`. Zmienność to średnia bezwzględna różnica między kolejnymi pobranymi próbkami, podzielona przez średnią luminancję regionu. To nie jest procent migających pikseli ani miara percepcyjna. Odczyty GPU mogą pomijać wyświetlone klatki; czas próby nie jest pomiarem FPS.

| Wariant | Wnęka: zmienność | Krawędź frontów: zmienność |
|---|---:|---:|
| Bazowy: zmienne SSGI + TRAA | 5,0667% | 2,8793% |
| Stałe SSGI + zwykłe TRAA | 0,6512% | 2,2147% |
| Zmienne SSGI + zatrzymany jitter TRAA | 5,0041% | nie mierzono |
| Stałe SSGI + zatrzymany jitter TRAA | nie mierzono | 0,0000000559% |
| **Stałe SSGI + SMAA — wdrożone** | **0%** | **0%** |

Regiony 192 × 192 px: wnęka `(732,338)`, górne fronty z krawędzią `(732,147)`. Przy SMAA maksymalna różnica pojedynczego piksela w obu próbach również wyniosła zero. Średnia luminancja wnęki zmieniła się względem bazowej o −0,22%, regionu krawędzi o +6,85%: nie twierdzimy, że wygląd jest identyczny.

Wysoka jakość z SMAA: bufor 2071 × 1085 px, region `(939,207,192,192)`, 24 próbki, średnia i maksymalna różnica zero. Przełączenia minimalna → średnia → wysoka oraz przeciągnięcie kamery zakończyły się renderowaniem sceny bez przechwyconych błędów GPU. Kontrola ruchu była funkcjonalna, nie stanowi pełnej oceny jakości podczas spaceru.

## B3: walidacja głębi

Przed poprawką instrumentacja zarejestrowała 3636 kopii głębi podczas pracy i przełączenia minimalna → średnia: brak wykrytych niezgodności rozmiarów CPU/GPU, brak zdarzeń `uncapturederror`. Mruganie udało się zmierzyć bez tych błędów. Nie odtworzono historycznych błędów 704 × 396 / 1280 × 720 i nie ustalono ich wcześniejszej przyczyny.

SMAA nie używa historii głębi TRAA; w wariancie testowym licznik tych kopii wynosił zero, także na wysokiej jakości. Nie zmieniano skalowania SSR ani SSGI na podstawie samego podejrzenia.

## Kontrola i źródła

- Kontrola składni obu modułów oraz `git diff --check`: poprawne.
- Obie lokalne kopie zmienionych modułów są identyczne. Zachowano kopie sprzed B2 i sprawdzono je przed zapisem, aby nie nadpisać zmian równoległych.
- Dane liczbowe: `B2-pomiary.json`; patch względem stanu po Z0: `B2-stabilne-SSGI-SMAA.patch`.
- [SSGINode r185](https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/tsl/display/SSGINode.js): `useTemporalFiltering` domyślnie włączone; cyklicznie zmienia obrót i przesunięcie próbek. Źródło wskazuje możliwość niestabilności temporalnej oraz potrzebę odszumiania po wyłączeniu. Istniejący DenoiseNode dla GI zachowano.
- [TRAANode r185](https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/tsl/display/TRAANode.js): przesuwa projekcję kamery i kopiuje głębię do historii.
- [Oficjalny przykład SMAA r185](https://github.com/mrdoob/three.js/blob/r185/examples/webgpu_postprocessing_smaa.html): zastosowanie `smaa()` w RenderPipeline.

## Assumptions and gaps

Pewność udziału SSGI w pulsowaniu wnęki i jittera TRAA w mruganiu badanych krawędzi: wysoka dla tego kadru, na podstawie izolowanych prób A/B. Nie jest to dowód wykluczający wszystkie problemy geometrii lub cieni w całym mieszkaniu.

Statyczne ziarno wciąż jest widoczne, szczególnie w AO; SMAA nie akumuluje informacji z poprzednich klatek. Pozostały do oceny drobne detale i wygląd podczas ruchu. Nie mierzono FPS ani pełnej niezawodności startu. Na nowych podglądach diagnostycznych dwukrotnie wystąpiło oczekiwanie ponad 30 s na biblioteki/kod tekstur, po którym przeładowanie umożliwiło start; B1 nie jest zamknięte.

Korekta przekazanego uzasadnienia Z0: pobrany SSGINode r185 po obliczeniu `stepRadius` wykonuje także `stepRadius.divAssign(float(STEP_COUNT).add(1))`. Z samej zmiany 6 → 28 kroków nie wynika więc niemal pięciokrotny wzrost zasięgu. Wartość 28 pozostawiono zgodnie z żądaniem użytkownika; diagnoza B2 opiera się na pomiarach, nie na tej wcześniejszej interpretacji.


---

# B4 — nawigacja, 9 września 2026

Status: poprawka lokalna, oczekuje na ocenę użytkownika. Poprzednie błędy użytkownik uznał za naprawione przed rozpoczęciem B4.

## Zmiany

- OrbitControls działa tylko w widoku z góry. Rozglądanie po starcie i wznowieniu sesji ma jeden mechanizm obsługi.
- Przeciąganie i przesuwanie dwoma palcami obraca kamerę; pochylenie ograniczone do ±60°. Strzałki przesuwają bez zmiany kierunku patrzenia. Szczypanie dojeżdża wzdłuż kierunku patrzenia i sprawdza przeszkody co najwyżej co 10 cm.
- Ruch ma stały krok symulacji 60 Hz. Zachowano parametry przyspieszania i tłumienia OAKSUN.
- Kliknięcie wyznacza cel również bez wcześniejszego ruchu kursora; próg 3 px rozdziela kliknięcie od przeciągnięcia. Anulowany gest nie teleportuje. Znacznik pokazuje się dla sprawdzonej trasy i ma poprawną orientację względem powierzchni.
- B przełącza widok z góry i powrót do zapamiętanej pozycji oraz kierunku. Zapis obejmuje pozycję sprzed widoku z góry. Przelot liczy kierunek jak kamera (lokalne −Z), co usuwa odwrócenie patrzenia.
- Utrata fokusu zatrzymuje ruch; kliknięcie sceny przywraca obsługę klawiatury po użyciu formularza. Zapis uwzględnia również samo rozglądanie.

Zmodyfikowano tylko nawigacja.js i sterowanie.js w obu lokalnych kopiach oraz dzienniki. Zachowano wcześniejsze poprawki B2. Bez publikacji na GitHub.

## Weryfikacja automatyczna

17/17 testów Node przeszło. Użyto rzeczywistych klas kamer, geometrii i raycastów three.js r185 oraz symulowanego DOM. W pierwszych 15 testach stara wersja nie przeszła 14; poprawiona przeszła wszystkie 15. Następnie dodano dwa testy szczypania i fokusu: łącznie 17/17.

Przytrzymanie strzałki przez 1 s: 223,4554 cm przy 15, 30, 60 i 120 aktualizacjach/s. To test niezależności symulacji od częstotliwości aktualizacji, nie pomiar FPS przeglądarki.

Testy obejmują m.in. limity obrotu, brak obrotu przy chodzeniu, przeciwnych kierunków, teleportację, przeszkody, orientację znacznika, zapis samego obrotu, B/powrót i wznowienie sesji w widoku z góry. Callback przezroczystości otrzymał .42 w widoku z góry i 1 po powrocie; test nie potwierdza wizualnego wyglądu ścian na GPU.

Źródła: lokalny kod przed/po zmianie, zapis wyników B4-testy.txt, [kod OAKSUN](https://vr-interior.oaksun.studio/_astro/script.DxojOA-B.js), [three.js r185](https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.core.js).

## Kontrola użytkownika

Po odświeżeniu lokalnego podglądu:
1. Przeciągnij scenę i przesuń dwoma palcami: rozglądanie bez przesunięcia kamery.
2. Przytrzymaj strzałki: chodzenie; lewo/prawo przesuwają bokiem.
3. Kliknij osiągalny punkt: podejście bez obrotu; przeciągnięcie nie wywołuje podejścia.
4. Naciśnij B, poczekaj na koniec przelotu, naciśnij B ponownie: widok z góry z półprzezroczystymi ścianami, potem powrót do poprzedniego kadru.

## Assumptions and gaps

Pewność wyników logicznych: wysoka w zakresie tych testów. Zgodnie z prośbą użytkownika testowanie ręczne pozostawiono użytkownikowi. Brak nowego testu w przeglądarce dla B4: płynność, fizyczny gładzik, rzeczywisty pointer capture/lock, kolizje w pełnym mieszkaniu i wygląd przezroczystości wymagają oceny. Nie deklaruję pełnej zgodności odczucia sterowania 1:1 z OAKSUN. Kadrowanie mebli i pełna walidacja zapisanych pozycji pozostają osobnym punktem Z1.


---

# Z1 — kadrowanie i zapis pozycji kamery

9 września 2026. Status: poprawka lokalna; oczekuje na ocenę wizualną użytkownika. B4 zostało zatwierdzone po otwarciu aktualnego podglądu na porcie 8123.

## Przyczyna i zmiana

Poprzedni przycisk Kadruj obliczał odległość z największego wymiaru mebla i pionowego FOV, mnożąc wynik przez 1,9. Nie sprawdzał granic planu, ścian, mebli ani szerokości okna. Odczyt zapisanej pozycji dopuszczał współrzędne do ±9000 cm, mimo że właściwe mieszkanie ma obrys L w zakresie x 0–1006 cm, z 0–756 cm. Duża prostokątna płaszczyzna podłogi nie określa dostępnego wnętrza.

Nowy moduł kadrowanie.js odczytuje istniejący plan i aktualne obiekty biblioteki. Szuka miejsca po stronie frontu (+Z w układzie mebla), w tym samym pomieszczeniu, z wolnym miejscem na kamerę i widokiem na środek mebla. Uwzględnia proporcje okna i rzut ośmiu narożników obwiedni. W przypadku braku miejsca na cały mebel ustawia widok częściowy i pokazuje komunikat. Jeśli nie znajduje legalnego miejsca, pozostawia kamerę i zgłasza powód.

Pozycja zapisana poza planem, w ścianie/meblu, pod podłogą lub z błędnym obrotem nie jest przywracana. Zostaje zastąpiona sprawdzonym miejscem startowym i zapis zostaje poprawiony. Walidacja działa także przy wyłączonym przełączniku kolizji. Widok z góry ma osobną walidację; jego powrót do wnętrza również wymaga legalnej pozycji. Kadrowanie podczas widoku z góry anuluje przelot i przełącza na rozglądanie.

Zmiany: kadrowanie.js (nowy), nawigacja.js, sterowanie.js i dzienniki w obu lokalnych kopiach. Nie zmieniono planu, FORMAT-MEBLA.md, modeli, ich identyfikatorów ani umiejscowień. Nie publikowano na GitHub.

## Weryfikacja

40/40 testów automatycznych przeszło. Zestaw obejmuje 18 wcześniejszych testów nawigacji, 7 przypadków walidacji/powrotu/ustawiania kamery, 10 kadrów pięciu modeli przy proporcjach 16:9 i 9:16 oraz 5 testów granic, przeszkód i braku geometrii. Sprawdzono także brak zmiany transformacji mebli podczas kadrowania.

Testy modeli używają lokalnego kodu budowy biblioteki i czterech aktywnych snapshotów JSON oraz oryginalnego modułu łóżka legacy. Materiały testowe są proste; geometrie pudełek nie mają mikrofazy. Rzeczywisty plan i matematyka three.js r185 pozostają użyte. Nie jest to render GPU.

Dla regału w salonie, 16:9: kamera x=815,5 cm, y=121,5 cm, z=406,15 cm; cała obwiednia mieści się w kadrze z marginesem. Dla 9:16: z=476,15 cm i kadr częściowy. Pozostałe cztery meble w obu proporcjach wymagają kadru częściowego przy zachowaniu obecnego FOV i położenia kamery wewnątrz pokoju. Szukanie miejsca w tych testach trwało około 1–12 ms; nie jest to pomiar FPS ani czasu klatki w przeglądarce.

Źródła dowodów: Z1-testy.txt, Z1-kadrowanie.patch; lokalne plan.js, biblioteka.js, FORMAT-MEBLA.md i aktywne wersje modeli. Kontrola składni trzech modułów zakończyła się powodzeniem.

## Test użytkownika

Otwórz http://localhost:8123/webgpu/mieszkanie-webgpu-v1.html i odśwież stronę. Wybierz kolejno meble i kliknij Kadruj. Kamera ma pozostawać w pokoju i patrzeć na wybrany mebel. Komunikat o częściowym kadrze jest oczekiwany w ciasnych pomieszczeniach. Po odświeżeniu prawidłowy kadr powinien wrócić. Dodatkowo sprawdź Kadruj po wejściu w widok B.

## Assumptions and gaps

Pewność: wysoka dla sprawdzonych obliczeń i walidacji. Ocena wizualna pozostaje po stronie użytkownika zgodnie z jego prośbą. Przeszkody meblowe są sprawdzane konserwatywnie przez obwiednie, więc prześwit pod meblem może być traktowany jako zajęty. Sprawdzenie widoczności dotyczy środka mebla, nie gwarantuje braku każdej częściowej przesłony. Algorytm sprawdza skończony zbiór pozycji, więc komunikat o częściowym kadrze nie jest matematycznym dowodem, że nie istnieje inny pełny kadr. Nie poszerzano automatycznie FOV.


---

# Z2 — zasłony na całej ścianie

9 września 2026. Status: poprawka lokalna, oczekuje na ocenę użytkownika. Z1 zostało zatwierdzone. Układ poniżej użytkownik zatwierdził przed wdrożeniem.

## Rozmieszczenie

| Pokój | Wewnętrzna szerokość ściany | Pas przy początku Z | Pas przy końcu Z | Panele po odsłonięciu |
|---|---:|---:|---:|---|
| Salon | 484 cm | 85 cm | 79 cm | Po 3 panele MAJGUL na pas |
| Sypialnia | 227 cm | 37 cm | 52 cm | Po 1 panelu GLASÖRT na pas |

Łącznie zachowano 3 pary MAJGUL i 1 parę GLASÖRT. Salon: obszar otworów, łącznie z drzwiami balkonowymi, z=100–420 cm; krawędzie ściany z=15–499 cm. Sypialnia: okno z=551–689 cm; krawędzie ściany z=514–741 cm. Wymiary są odczytywane z istniejącego plan.js.

Domyślnie zasłony są całkowicie odsłonięte. Ich krawędzie kończą się na krawędziach otworów; każdy boczny pas jest przykryty na całej szerokości. Po zasłonięciu tkanina pokrywa całą wewnętrzną szerokość ściany. Trzy pary w salonie poruszają się razem, na jednym karniszu, bez paneli pozostających pośrodku otworów.

Karnisze przeniesiono na wewnętrzną stronę ścian: salon x=966 cm, sypialnia x=32 cm. Oś karnisza jest na wysokości 245 cm, górny brzeg tkaniny 243 cm, dolny 6 cm. Firanka ma płytsze fałdy, aby mieściła się między ścianą a tyłem istniejącego łóżka. Nie zmieniono położenia łóżka ani materiałów tkanin.

## Sterowanie i zapis

W panelu Widok dodano sekcję Zasłony z przyciskami Odsłoń/Zasłoń osobno dla salonu i sypialni. Kliknięcie tkaniny przełącza całą zasłonę danej ściany. Stan przycisków reaguje również na kliknięcie tkaniny.

Stan zapisuje się od razu po poleceniu w osobnym kluczu localStorage. Przy kolejnych wejściach wraca ostatni wybór. Bez zapisanego wyboru, przy błędnym wpisie lub niedostępnej pamięci domyślnym stanem jest odsłonięcie. Animacja trwa 900 ms, daje się odwrócić w trakcie i kończy się dokładnie na zadanej pozycji.

## Weryfikacja

16/16 testów automatycznych przeszło. Użyto rzeczywistego planu, geometrii Three.js i transformacji paneli; wyłącznie materiały TSL zastąpiono prostymi materiałami w kopii testowej. Testy potwierdzają:

- 8 paneli, 4 pary i dokładne szerokości zatwierdzonych pasów;
- brak poziomego nachodzenia odsłoniętych paneli na okna i drzwi;
- ciągłe pokrycie całej ściany po zasłonięciu;
- położenie tkanin i karniszy wewnątrz pokoju, nad podłogą i pod sufitem;
- wspólne sterowanie trzema parami salonu, niezależne sterowanie sypialnią;
- zapis i odczyt stanu, brak awarii bez localStorage;
- odwrócenie animacji i dokładne zakończenie ruchu;
- działanie kodu przycisków panelu z symulowanym DOM oraz aktualizację po kliknięciu tkaniny;
- zachowanie danych planu.

Kontrola składni trzech modułów przeszła. Materiały MAJGUL i GLASÖRT zachowano bez zmian; nie wybierano nowych tekstur. Źródła: zatwierdzenie użytkownika, lokalny plan.js, kod przed/po zmianie w Z2-zaslony.patch i wyniki Z2-testy.txt.

Zmieniono wyłącznie zaslony.js, sterowanie.js, przekazanie API zasłon do panelu w silnik.js oraz dzienniki w obu lokalnych kopiach. Bez publikacji na GitHub.

## Test użytkownika

Odśwież http://localhost:8123/webgpu/mieszkanie-webgpu-v1.html. Sprawdź odsłonięte okna i drzwi w salonie oraz okno w sypialni. W panelu Widok → Zasłony przetestuj Zasłoń i Odsłoń dla obu pokoi. Po zmianie stanu odśwież stronę — powinien zostać zachowany.

## Assumptions and gaps

Pewność: wysoka dla wymiarów i zachowania objętego testami. Nie wykonano nowego renderu GPU ani ręcznej oceny wyglądu; zgodnie z prośbą użytkownika ta kontrola pozostaje po jego stronie. Model tkaniny używa skalowania i przesuwania generatywnych paneli, nie symulacji fizycznej. Test umieszczenia firanki przy łóżku sprawdza dostępny pas x=24–44 cm, nie pełną symulację kontaktu tkaniny z wyposażeniem.


---

# Z2 — korekta wysokości i głębokości zasłon

9 września 2026. Zgodnie z kolejnym poleceniem użytkownika:

- usunięto geometrię karniszy;
- tkanina sięga od podłogi (y=0) do sufitu (y=250 cm);
- przekrój poziomy jest identyczny na każdej wysokości, bez wygaszania fałd u góry;
- łączna głębokość wynosi 10 cm (amplituda ±5 cm) w każdym stanie odsłonięcia;
- zachowano zatwierdzone szerokości bocznych pasów, materiały, sterowanie i pamięć stanu.

17/17 testów automatycznych przeszło. Testy używają rzeczywistych siatek i transformacji Three.js z uproszczonymi materiałami w kopii testowej. Sprawdzono głębokość i wysokość podczas animacji, równość przekrojów na wszystkich rzędach wierzchołków, brak karniszy oraz dotychczasowe zachowanie zasłon. Kontrola składni przeszła.

Źródła: żądanie użytkownika, lokalny plan, patch Z2-zaslony-sufit-podloga.patch i zapis Z2-zaslony-sufit-podloga-testy.txt.

Pewność obliczeń: wysoka w zakresie testów. Ocenę wyglądu na GPU pozostawiono użytkownikowi. Zmieniono tylko zaslony.js i dzienniki w obu lokalnych kopiach. Bez publikacji.


---

# Regał w salonie — opublikowane ustawienie v0003

Przesunięcie o 128 mm w lewo, zatwierdzone przez użytkownika. Pozycja środka [8027, 0, 361,5] mm, obrót 0°. Lewy bok przy SALON-W4, plecy nadal przy SALON-W1. Od prawego boku do ściany z zasłonami: 256 mm; do najbliższej krawędzi fałd: 46 mm.

Model w v0003 jest identyczny z aktywnym wcześniej v0001. Nie zmieniono geometrii, materiałów, identyfikatorów części ani planu mieszkania. Istniejący nieaktywny eksport v0002 zachowano; z tego powodu zatwierdzony projekt otrzymał numer v0003.

Opublikowano zatwierdzony SVG i snapshot JSON, następnie aktywowano v0003 w manifeście z kontrolą SHA. Odczyt przez API GitHuba oraz publiczny adres raw używany przez renderer potwierdził aktywną v0003 i nowe współrzędne. Lokalna kopia trzech plików biblioteki została zsynchronizowana bez nadpisywania zmian renderera. Nie wykonano ręcznej kontroli sceny; użytkownik preferuje samodzielne testy wizualne.

Zapis: https://github.com/stefankot/mieszkanie-meble/commit/3eeeae45c3d42ea8141150369ecf35fbcf2655af


## Z3 — odczyt jawnych LED z v0004

Biblioteka przekazuje model.lighting do korzenia mebla. Renderer czyta recesses/ledStrips w lokalnych mm i przelicza je na światowe cm, pomijając automatyczne wykrywanie dla modeli z metadanymi. Poprawiono orientację RectAreaLight przez bezpośrednie lookAt celu. Stała pula 4 świateł i moc pozostają zachowane. Model mebla niezmieniony.

Kontrola obliczeń na pobranej z GitHuba v0004: 5 wnęk, 6 pasków, 5 kierunków w dół i 1 w górę, środki listew 0,6 cm przed plecami. Potwierdzono poprawną oś świecenia -Z oraz ponowne użycie tej samej puli przy odświeżeniu. Składnia poprawna. Ocena gradientu i jasności na GPU pozostaje do ręcznego sprawdzenia przez użytkownika; strojenia mocy nie wykonywano. Zmiana wyłącznie lokalnego renderera, bez publikacji.


Z3 — szybka korekta prawej strony: 6 jawnych listew konkurowało o 4 światła. Ustawiono stałą pulę 6, tworzoną tylko przy starcie, oraz pierwszeństwo jawnych opisów biblioteki przed automatycznie wykrytymi gniazdami. Pozycje, kierunki i moc bez zmian. Wymaga odświeżenia strony.


### Z3a — światło i okna salonu (lokalnie, do oceny wizualnej)
Poprawiono kierunek emisji RectAreaLight okien i lamp sufitowych (−Z zamiast +Z); wyłączono dodatkową punktową łunę sufitu. Profil: 15.09.2026 16:30, ciepło 45%, rozproszenie 90%, kule 30%, bazy słońce/okno 6/6, hemi 0,32. Jednorazowa migracja tylko ustawień światła; pozostałe preferencje zachowane. LED-y wnęk bez zmian.
Za zgodą użytkownika okno przy regale rozszerzono do z=57,3 cm (szerokość 182,7 cm). Parapety obu okien salonu: orientacyjnie 70 cm, góra 240 cm. Zasłony automatycznie parkują na pasach 42,3 i 79 cm. Kontrola składni oraz geometrii otworów, pasów zasłon, kierunku źródeł i wartości panelu: PASS. Test wizualny wykonuje użytkownik na localhost:8123; bez publikacji.


### Z4–Z5 — znacznik i informacje (lokalnie, do testu użytkownika)
Znacznik rysowany po efektach w osobnej scenie, bez zapisu głębi i udziału w GI/SSR/bloom. Normalna powierzchni liczona macierzą normalnych; dysk równoległy do powierzchni. Ukrywanie nad elementami interaktywnymi, przy niedostępnej drodze i zmianie kamery. HUD przeniesiony do zwiniętej sekcji „Informacje” panelu; zachowany element statusu i komunikaty błędów. Pięć krótkich kontroli logiki nawigacji oraz składnia i serwowane moduły: PASS. Bez testu GPU i bez publikacji.


### Z4 — poprawka regresji czarnego ekranu
Po teście użytkownika usunięto dodatkowe renderer.render dla znacznika. Teraz dysk jest nakładką SVG projektowaną z pozycji i orientacji w 3D, bez dostępu do bufora WebGPU. Każda aktualizacja zastępuje obrys; brak dopisywania śladów. Kontrola składni, brak wywołań GPU podczas ruchu znacznika, ukrywanie oraz zachowanie teleportacji: PASS. Test wizualny użytkownika pozostaje do wykonania.


### Z6 — wykrywanie ruchu i pomiar A/B (lokalnie, do pomiaru użytkownika)
Wykrywanie ruchu sumuje drobne zmiany pozycji/obrotu i utrzymuje ruch przez krótkie przerwy między zdarzeniami. Pozostają 28 kroków SSGI i dotychczasowa drabinka 2→3→4→6 plastrów. Test powolnego obrotu przy 30/60/120 klatkach symulacji: stary detektor 6 plastrów, nowy 2; po zatrzymaniu wraca 6. To test logiki, nie pomiar GPU/FPS.
W Informacjach dodano „Porównaj płynność — 20 s”: 10 s starego i 10 s nowego detektora, średnie FPS pętli oraz liczba/udział odstępów między klatkami >50 ms. Obie próby rozpoczynają się od tych samych ustawień GI. Ukrycie karty, zmiana jakości/rozmiaru anuluje pomiar; poprawiona logika zawsze wraca po końcu/anulowaniu. Cztery kontrole logiki i pomiaru oraz składnia i HTTP: PASS. Rzeczywiste wyniki i ocena obrazu pozostają do wykonania przez użytkownika. Bez konwersji tekstur i publikacji.


### Z6 — GI 50% przy wysokiej jakości (do oceny użytkownika)
Wysoka jakość: ssgiSkala 1 → 0,5; pozostałe parametry presetu i 28 kroków bez zmian. Istniejący pomiar A/B porównuje teraz wyłącznie GI 100% z GI 50%, z poprawionym wykrywaniem ruchu w obu próbach. Po zakończeniu/anulowaniu wraca skala aktualnego presetu. Kontrola składni, zakresu zmiany i logiki pomiaru: PASS. FPS i wygląd do weryfikacji przez użytkownika; brak publikacji.


### Z6 — SSR 50% (do pomiaru użytkownika)
Rozdzielczość odbić SSR: 0,9 → 0,5. GI 50%, wykrywanie ruchu i pozostałe parametry bez zmian. Pomiar porównuje SSR 90% i 50%; po zakończeniu/anulowaniu przywraca 50%. Źródło używanego SSRNode odczytuje resolutionScale i rozmiar własnych buforów w każdej klatce. Kontrole składni, zakresu zmiany i pomiaru: PASS. Test GPU oraz rzeczywiste FPS pozostają do oceny użytkownika. Lokalnie, bez publikacji.


### Z6 — skala obrazu 1,0 przy wysokiej jakości (do oceny użytkownika)
Wysoka jakość: pixelRatio 1,25 → 1,0, z zachowaniem limitu devicePixelRatio. GI 50%, SSR 50%, światło i materiały bez zmian. Istniejący pomiar porównuje wyłącznie skalę całego obrazu; celowe przeskalowanie aktualizuje oczekiwaną sygnaturę bufora, a zewnętrzna zmiana okna/jakości nadal anuluje próbę. Zakończenie/anulowanie przywraca skalę aktualnego presetu. Kontrole składni, zakresu zmiany, pomiaru i przywracania: PASS. FPS i ostrość do oceny użytkownika. Lokalnie, bez publikacji.


### Zamknięcie iteracji i zgoda na publikację
Użytkownik zatwierdził wszystkie zmiany i polecił zapis oraz synchronizację GitHuba. Pozostawiono: GI 50%, SSR 50%, skala wysokiej jakości 1,0 i poprawiony detektor ruchu. Ostatni pomiar użytkownika (skala 1,25 → 1,0): 10,2 → 16,5 FPS, klatki >50 ms: 97,1% → 93,3%. Wcześniej SSR 90% → 50%: 14,0 → 14,8 FPS. Wydajność nadal nie zapewnia płynnego spaceru; dalsze strojenie zakończono na polecenie użytkownika.

## P1 — jawne jednostki i kontrolowany SSR A/B — 2026-09-09

Scena pozostaje w cm, dane mebli w mm. Dodano helpery cm/m w konfiguracji długości SSGI, SSR i SSS; wszystkie wartości liczbowe zachowane. Standardowy SSR r185 ogranicza odległość punkt–płaszczyzna, nie stałą długość promienia. Składnia Node i git diff --check: PASS.

[RUNTIME] Chrome152/M2, wysoka jakość, stały kadr metalowego blatu, bufor1657×924, pixel ratio1, ACES0,55, GI28/6. Przeprowadzono off (intensity0, koszt SSR pozostaje),1cm,50cm,100cm,200cm oraz powrót do1cm. 5s rozgrzewki +10s rAF na próbę; 0 zarejestrowanych błędów GPU/rejection. **NO GPU TIMING.** rAF p50/p95/p99 w ms:1cm66,7/83,4/83,8;50cm83,3/84,2/100;100cm83,2/84,1/84,3;200cm67,5/83,4/83,9. Wyniki krótkie i niemonotoniczne; nie stanowią pomiaru GPU ani dowodu skalowania kosztu.

Większy próg przywraca odbicie baterii i ściany, ale wprowadza poszarpaną granicę trafień. Zmianę domyślnego zasięgu odrzucono na tym etapie; pozostaje1cm. P14 wymaga osobnego testu odszumiania/rekonstrukcji. Rollback: revert tej zmiany jednostek. Żaden model/manifest nie został zmieniony ani aktywowany. Publikacja zatwierdzona zbiorczą instrukcją użytkownika.

## P2 — kontrolowany wariant zgodnego HDRI — 2026-09-09

Dodano opt-in `?environment=hdri`: ten sam urban_courtyard_02 1K trafia do tła i PMREM environment, wspólna rotacja; backgroundIntensity odpowiada environmentIntensity0,34. Proceduralna kula jest ukrywana dopiero po udanym pobraniu HDRI. Bez parametru obraz i cykl zwalniania HDR pozostają dotychczasowe. Słońce SunCalc, światła, materiały i ekspozycja niezmienione.

[RUNTIME] Porównano ten sam kadr okna salonu, kamera[840,150,265]cm, cel[1000,165,250]cm, wysoka jakość i ekspozycja0,55. Oba obroty[0,0,0]. 0 zarejestrowanych błędów GPU/rejection podczas podmiany środowiska. Wariant jest kierunkowo zgodny ze źródłem odbić, lecz 1K wyraźnie rozmywa tło, ciemny dziedziniec i szkło uwidaczniają szum. Nie zmienia się domyślnego środowiska. **NO GPU TIMING**; brak porównawczego pomiaru kosztu. Dodatkowy koszt opt-in obejmuje zachowanie źródłowego HDR na potrzeby tła; nie oszacowano go jako zmierzonego VRAM. Node --check i diff --check: PASS. Rollback: usunięcie query parametru, ewentualnie revert P2. Dalsza zgodność SunCalc i HDRI jest osobnym zagadnieniem; P2 jej nie udaje.

## P3 — semantyczne krawędzie, jeden POC — 2026-09-09

Box z jawnym edgeRadiusMm omija globalne minimum2,2mm. 0mm pozostaje ostrym BoxGeometry; dodatnia wartość daje RoundedBoxGeometry z kontrolą promienia. Brak pola zachowuje dotychczasowy fallback. Nie ma migracji aktywnych modeli. POC regału przy łóżku zachowuje89 części box, ich rozmiary, pozycje i semantic IDs; fixture ma confirmed=false i nie jest wskazany przez manifest. Generator frontu liczy gapMm/recessMm/panelThicknessMm do gotowej geometrii; importer nie odejmuje tych odstępów ponownie.

5 testów Node na Three0.185.0: PASS — zero, fallback, dodatni promień, odrzucenie błędnego promienia, jednorazowe wyliczenie szczeliny/cofnięcia. [RUNTIME] Lokalny A/B89 geometrii regału, zachowane materiały i transformacje, oświetlenie/ekspozycja. Ostre krawędzie dają cieńszą, bardziej zdecydowaną granicę półek. Nie potraktowano tego jako automatycznej poprawy estetycznej całego mieszkania; jest to dowód respektowania danych. 0 błędów w rejestrze GPU/rejection. Po porównaniu przywrócono oryginalne geometrie. Podgląd diagnostyczny P3-preview.js nie zapisuje ani nie aktywuje wersji. **NO GPU TIMING**; brak porównawczego benchmarku. Rollback: revert P3; aktywne modele pozostają niezmienione.

## P4 — A/B koloru niedoskonałości — 2026-09-09

Dodano uniform i ustawWariacjeKoloru(boolean), opcjonalnie `?imperfections=color-off`. Wyłączenie usuwa wyłącznie proceduralną zmianę albedo (przebarwienia/brud/wytarcia koloru); roughnessNode, geometria, gradacja forniru, światła i ekspozycja pozostają te same. Domyślnie wariacja koloru jest nadal włączona.

[RUNTIME] Ten sam kadr regału salonu, kamera[820,145,220]cm, cel[820,140,40]cm, wysoka jakość, pixel ratio1, bufor1657×924, ekspozycja0,55, 5s warm-up +10s pomiaru. Bez wariacji koloru zmiana jest subtelna; fornir pozostaje czytelny. Nie stwierdzono wystarczającego zysku obrazu, aby automatycznie zmieniać domyślny wygląd. rAF on:p50/p95/p99=100,0/117,7/133,8ms, n96; off:116,6/133,3/134,3ms,n91. To krótkie obserwacje, nie dowód kosztu samej zmiany koloru. **NO GPU TIMING.** Uniform nie usuwa obliczeń warstwy i nie jest optymalizacją shaderów. 0 zarejestrowanych błędów GPU/rejection. Składnia/diff: PASS. Rollback: true w przełączniku/usunięcie parametru albo revert P4. Słabsza gradacja oak odłożona, aby nie mieszać dwóch zmian.


## P5 — semantyczne UV forniru (2026-09-09)

[CURRENT CODE] Dodano lokalne UV w milimetrach: grainDirection, textureGrainAxis, textureScaleMm, grainOffset, veneerSheetId, veneerContinuityGroup i orientację ścian. Istniejące modele bez pól zachowują dotychczasowe UV. Brak globalnego triplanar.

POC dotyczy tylko F16/F17 regału salon v0004. Fixture nie jest zatwierdzonym modelem ani wpisem manifestu. Podgląd zamienia jedynie geometrię UV i przywraca oryginały. Przesunięcie arkusza wynosi 382 mm, wliczając odstęp między frontami.

[RUNTIME] Chrome, widoczna karta; A/B kamera [820,145,400], target [820,140,40], viewport 1657×924, buffer 1242×693, DPR urządzenia 2, ratio renderera 0.75, profil minimalna, exposure 0.55. Identyczne parametry obu wariantów, events=[]; pionowy słój pozostaje pionowy, drugi front otrzymuje inną część arkusza. Pierwszy próbny wariant odrzucono: błędnie zakładał oś U skanu; oak_veneer_01 ma słój w osi V. Powtórzono po korekcie i zablokowaniu kamery tylko w lokalnym narzędziu testowym.

[REPO] 11/11 testów geometrii P3 i UV P5 przechodzi na three 0.185.0. [NO DATA] NO GPU TIMING; brak benchmarku wydajności i brak deklarowanego przyspieszenia. Początkowe błędy połączeń lokalnego serwera ustąpiły po przeładowaniu; nie klasyfikowano ich jako błędów GPU.

Rollback: usunąć pola UV z nowego modelu albo cofnąć ten commit. Nie zmieniono aktywnych wersji, materiałów, światła ani domyślnego obrazu. Publikacja obejmuje adapter i nieaktywny POC.


## P6 — szczotkowana stal (2026-09-09)

Nieaktywny POC jednego blatu kuchni v0001: MeshPhysicalNodeMaterial r185, 1764 skończone tangenty, anizotropia 0.65 w danych JSON, kierunki 0°/90°. [RUNTIME] Widoczne poszerzenie i zmiana kierunku refleksu. A/B wysoka, buffer 1657×924, ratio1, ACES0.55; 5s rozgrzewki +10s rAF. A p50/p95/p99 66.7/83.4/84.3ms; B 66.7/83.3/84.2ms; events=[]. NO GPU TIMING. Brak deklarowanego przyspieszenia. Domyślny materiał zachowany, model i manifest bez zmian. Szczegóły, warunki oraz rollback w experymenty/P6-stal.md.
