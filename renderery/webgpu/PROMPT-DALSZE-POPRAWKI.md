# Prompt do dalszych poprawek renderera WebGPU (reguła Pareto)

> Skopiuj całość poniżej do nowej rozmowy z modelem. Repozytorium:
> `stefankot/mieszkanie-meble`, katalog `renderery/webgpu/`.
> Strona: https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/mieszkanie-webgpu-v1.html

---

## Kontekst

Mam fotorealistyczny spacer po mieszkaniu napisany na three.js r185 / WebGPU
(`WebGPURenderer`, TSL, `MeshPhysicalNodeMaterial`, potok: scenePass z MRT →
SSGI → SSR → denoise → bloom → TRAA). Wcześniejsza wersja tego samego mieszkania
działała na WebGL2 i **wyglądała oraz działała lepiej** niż obecna. Celem jest
doprowadzenie wersji WebGPU do jakości załączonych renderów archviz.

Poprzedni model przez wiele tur nie doprowadził tego do stanu używalnego.
**Zastosuj regułę Pareto: napraw najpierw te 20 %, które dają 80 % efektu.
Nie zajmuj się drobiazgami, dopóki nie działa to, co niżej oznaczone jako
BLOKUJĄCE.**

## Zasady pracy (ważne)

1. **Rób po kolei.** Po każdym punkcie napisz, co zrobiłeś, żebym mógł sprawdzić.
   Przechodź dalej dopiero po moim zatwierdzeniu.
2. **Nie zastępuj brakujących modeli atrapami** — oznacz je jako brakujące.
3. **Nie kopiuj na stałe geometrii mebli do renderera.** Meble przychodzą
   z biblioteki (`biblioteka.js`, format opisany w `FORMAT-MEBLA.md`).
4. **Nie zmieniaj projektów mebli ani planu**, pracując nad rendererem.
   Zachowaj `FORMAT-MEBLA.md`, identyfikatory i zatwierdzone pozycje.
5. **Nie nadpisuj historii ani cudzych zmian.**
6. **Nie oznaczaj punktu jako gotowego, jeśli jest błąd.**
7. **Nie proś mnie o token wklejany do rozmowy.**
8. **Przy każdym doborze tekstury pokaż mi kandydatów do wyboru** — nie wybieraj
   sam. Obejrzyj pliki, zanim mi je zaproponujesz (nazwa myli).
9. **Mierz, nie zgaduj.** Jeśli mierzysz FPS w przeglądarce sterowanej
   narzędziem — pamiętaj, że przy ukrytym oknie `requestAnimationFrame` nie
   chodzi i pomiar jest bezwartościowy.

---

## BLOKUJĄCE — bez tego strony nie da się używać

### B1. Strona nie ładuje się w ~9 na 10 prób
Zostaje na pasku postępu. Start jest dwuetapowy (kilka klatek rysowanych wprost
przez `renderer.renderAsync`, potem HDRI → LED-y → potok w asynchronicznym IIFE).
Domyślny poziom jakości to `minimalna`, żeby skrócić kompilację shaderów.
**Mimo to zawiesza się.** To jest priorytet numer jeden — bez tego reszta nie ma
znaczenia. Sprawdź w szczególności: kolejność `await`, obsługę odrzuconych
obietnic w `siec.js` (timeout 12 s, 2 próby), oraz czy pasek postępu nie czeka na
etap, który nigdy nie zgłasza zakończenia.

### B2. Cały obraz mruga
Zgłaszane wielokrotnie, **nadal nie naprawione**. Mruganie widać najmocniej na
zabudowie meblowej (regał w salonie, `regal-salon`, x 662–969, z 15–58).
Sprawdzone i **wykluczone** jako przyczyny: pule świateł (mają próg 50 cm),
odświeżanie mapy cienia, ruch liści.

Ustalone fakty, które warto wykorzystać:
* Drabinka progresywnego dopracowania w `silnik.js` (`dopracuj()`) zmieniała
  `SSGINode.stepCount`. Przy `useScreenSpaceSampling = true` **liczba kroków
  wyznacza dystans, jaki przebiega promień** (`SSGINode.js:594` i `:489`), czyli
  rzeczywisty zasięg okluzji — a nie gęstość próbkowania. 6 → 28 kroków wyraźnie
  przyciemnia całą zabudowę. To parametr WYGLĄDU, nie jakości.
* `DenoiseNode.index` steruje obrotem jądra rozmycia (`index.mod(4)`,
  `DenoiseNode.js:207`) — każda zmiana przestawia wzór odszumiania.
* Liczba plastrów (`sliceCount`) jest normalizowana (`ao.divAssign(ROTATION_COUNT)`,
  `SSGINode.js:630`), więc zmienia tylko ziarno, nie jasność.
* W kodzie jest już próba poprawki (stała liczba kroków = 8, drabinka tylko na
  plastrach 2→3→4→6, histereza 3 klatek, zejście po jednym szczeblu).
  **Nie wystarczyła — mruga nadal.** Pozostali podejrzani, których NIE zbadano:
  TRAA (`TRAANode`), `SSRNode` przy `resolutionScale = .9`, oraz błędy walidacji
  z punktu B3.

### B3. W konsoli lecą błędy walidacji WebGPU
```
Copy origin ... and size ([Extent3D width:704, height:396]) does not cover the
entire subresource (1280x720) of Texture Depth24Plus — the entire subresource
must be copied
```
Pojawiają się przy rozmiarach 704×396 i 960×540 wobec bufora 1280×720. Każdy taki
błąd **unieważnia cały bufor poleceń**, więc klatka nie jest rysowana. To już raz
zepsuło pomiary i obraz — wtedy winne było `PassNode.setResolutionScale()` (zmienia
bufor przebiegu, ale nie teksturę głębi, którą dalsze węzły kopiują w całości) i
zostało usunięte. **Wraca z innego miejsca — nie ustalono, z którego.**
Podejrzani: `odbicia.resolutionScale = .9` (SSR), nadpisane `gi.setSize`
(skalowanie SSGI ×0,5), zmiana `renderer.setPixelRatio` przy przełączaniu jakości
bez przebudowania tekstur głębi. **To bardzo prawdopodobnie jest przyczyna B2.**

### B4. Nawigacja
Miała działać **1:1 jak na https://vr-interior.oaksun.studio/** (mam pozwolenie na
skopiowanie stamtąd kodu). Prosiłem o to 6 razy i nadal nie działa jak trzeba:
oglądanie sceny kursorem, chodzenie strzałkami, gesty gładzika (jak oglądanie
panoramy VR w telefonie), teleportacja kliknięciem. Potrzebny jest też skrót do
widoku z lotu ptaka, a przy widoku z góry ściany mają się robić półprzezroczyste
(to działało w wersji WebGL2).

Co ustalono: w oryginalnym bundlu funkcja ruchu (`Jn()`) **nigdy nie dotyka
kwaternionu kamery** — robi to wyłącznie funkcja patrzenia (`mi()`). Parametry:
`maxSpeed .4, acceleration .4, deceleration .35, dampening .92`, pochylenie
ograniczone do ±60°.

---

## ZLECONE, NIEZROBIONE

### Z1. Kadrowanie mebli wyrzuca kamerę poza mieszkanie
Żadne kadrowanie z menu nawigacyjnego nie działa poprawnie.
(Podłoga: x ∈ [−897, 1903], z ∈ [−922, 1678], jednostki = cm.)
Dodatkowo: zapisana między sesjami pozycja kamery potrafi wskazywać punkt poza
mieszkaniem i wtedy po wejściu widać szary ekran — trzeba to walidować przy
odczycie z `localStorage`.

### Z2. Zasłony
Są generatywne (`zaslony.js`): 3 pary IKEA MAJGUL (zaciemniające, salon) i 1 para
IKEA GLASÖRT (firana, sypialnia). **Renderują się na zewnątrz mieszkania, nie
reagują na odsłanianie/zasłanianie.** Mają być NA CAŁEJ SZEROKOŚCI ŚCIANY,
WEWNĄTRZ POKOJU, a w panelu sterowania ma być ich odsłanianie i zasłanianie.

### Z3. Wygląd wnęk LED niezgodny z renderem referencyjnym
Światła mają być **przy samych plecach wnęki, w KAŻDEJ wnęce**:
* mniejsze wnęki — tylko na górze, pod plecami,
* największa wnęka — na górze **i na dole**.
Ma być **widoczny gradient**, a nie równomierne oświetlenie całej wnęki.
Obecnie listwy świecą przy przedniej krawędzi, a wnętrza wnęk są cętkowane.
Mechanizm: `oswietlenie-mebli.js` wykrywa wnęki siatką promieni (krok 14 cm),
zwraca „gniazda", do których wędruje **stała pula 4 RectAreaLightów** (stała
liczność jest konieczna — zmiana liczby świateł unieważnia materiały i wymusza
rekompilację shaderów). Do tego paski emisyjne (`emissiveIntensity 1.9`).

### Z4. Pointer nawigacyjny
Niebieski znacznik ma się pojawiać **tylko wtedy, gdy da się go użyć**, a nie
wisieć cały czas jako kursor.

### Z5. Boks z informacjami
Usunąć `#hud` albo wciągnąć go do zwijanego panelu nawigacyjnego.

### Z6. Wydajność
Ma być jak w wersji WebGL2 albo jak na https://vr-interior.oaksun.studio/ —
**podczas ruchu niższa jakość, ale różnica ledwo widoczna**. Tamta scena jest
dużo bardziej złożona, a chodzi płynnie. Powód: **ona jest wypieczona** — używa
atlasów tekstur ze WPALONYM światłem (w atlasie szafy widać wprost poświatę LED),
jeden obraz na obiekt. To nie są powtarzalne materiały PBR. Warto rozważyć
wypiekanie zamiast liczenia GI w czasie rzeczywistym.

Ustalona, ale **niezweryfikowana po zmianie** pułapka: `renderer.shadowMap.autoUpdate`
i `renderer.shadowMap.needsUpdate` **nie mają żadnego znaczenia w ścieżce WebGPU**.
`ShadowNode` pyta wyłącznie światła:
`let needsUpdate = shadow.needsUpdate || shadow.autoUpdate;` (`three.webgpu.js:45484`).
Dopóki `light.shadow.autoUpdate` zostaje domyślnym `true`, mapa cienia VSM jest
przerysowywana w każdej klatce.

### Z7. Tekstura drewna
Wzór drewna nadal nie wygląda jak na renderach. Obecnie `oak_veneer_01` (Poly
Haven, 1K, `slojPionowy: true`), gradacja w TSL: `GAMMA .66`, `GAIN [1.04,1.04,1.05]`,
`KONTRAST_SLOJA 1.38`, `NASYCENIE_DREWNA .44`. Podłoga jest przeliczona tak, żeby
trafić w ten sam ton co szafa (obie lądują na sRGB 184,160,135).

Próba wycięcia forniru z atlasu OAKSUN została **wycofana na moje polecenie** —
nie wracaj do niej bez pytania. **KTX2 nie da się na tej maszynie wyprodukować**
(brak `toktx`, `basisu`, `ktx` i PIL).

### Z8. Z pakietu referencyjnego niewdrożone
Szczotkowana stal z anizotropią, kamera ARCH_PHOTO, miękka geometria poduszek,
GI w przestrzeni świata, ścieżka path tracingu (PHOTO).

---

## Co działa i czego NIE psuć

* Biblioteka mebli i format (`FORMAT-MEBLA.md`): milimetry (÷10 → cm),
  `positionMm` = środek rzutu na podłodze, lokalne +Z = przód, `rotationDeg` wokół Y.
* Deduplikacja materiałów per mebel (341 → 43 materiały).
* Mikrofaza na krawędziach (`FAZA_MIN 0.22`, 3 segmenty).
* Generatywne niedoskonałości (`niedoskonalosci.js`): pięć warstw TSL w przestrzeni
  świata — przebarwienia, chropowatość, przybrudzenia, wytarcia — plus
  `skrzywFormatki()` (±0,13°, ±0,45 mm, deterministycznie).
* Wariacja forniru między formatkami: `skalujUV()` wpieka skalę fizyczną oraz
  deterministyczne przesunięcie i odbicie lustrzane w UV geometrii.
  **Uwaga: nie klonuj tekstur per siatka** — to raz zjadło 8,4 GB RAM i zawiesiło
  maszynę.
* Zapisywanie WSZYSTKICH ustawień i pozycji kamery między sesjami (`localStorage`).
* Przełącznik jakości: minimalna / średnia / wysoka.
* Słońce skalibrowane: orientacja mieszkania 335°, domyślnie 15 września 16:00,
  ekspozycja ACES 0,72.
* `RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())` jest wymagane.
* `ClusteredLightsNode` **nie pomoże** — klasteryzuje wyłącznie `isPointLight`
  bez cienia (sprawdzone w źródle), więc dla RectAreaLight jest bezużyteczny.
* `material.colorNode` **po cichu omija** `material.color`.
* `camera.aspect` robi się NaN, gdy TRAA dostanie `setViewOffset` z 0/0 (ukryte
  okno) — wtedy padają wszystkie raycasty. W `nawigacja.js` jest `naprawKamere()`.

## Pliki

`renderery/webgpu/`: `mieszkanie-webgpu-v1.html`, `silnik.js` (główny),
`nawigacja.js`, `sterowanie.js` (panel), `materialy.js`, `oswietlenie-mebli.js`,
`zaslony.js`, `interakcje.js`, `niedoskonalosci.js`, `biblioteka.js`, `plan.js`,
`tekstury.js`, `siec.js`.
Dziennik zmian z pomiarami: `ZMIANY_webgpu_pareto.md`.
