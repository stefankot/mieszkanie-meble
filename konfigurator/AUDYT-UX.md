# Audyt UX konfiguratora

Ręczny przegląd: próbowałem wykonać zwykłe zadanie — „wejdź w moduł, zmień siatkę, wstaw
drzwi, przesuń ściankę, cofnij, dołóż kolumnę" — klikając prawdziwymi kliknięciami
w kontrolki, nie wywołaniami z konsoli.

**Nic z tej listy nie jest wdrożone.** Plik był nadpisywany po każdym znalezisku.

Legenda: 🔴 blokuje pracę · 🟠 poważnie spowalnia · 🟡 drobne
Koszt: szacunek w linijkach kodu.

---

## Sedno

Narzędzia edycyjne **istnieją i działają** — przeciąganie przegród, karta komórki, scalanie
we wnękę, cofanie. Są tylko niewidoczne albo wyłączone. Trzy rzeczy (punkty 1–3) odpowiadają
za większość wrażenia „nie da się tego używać", a dwie z nich to poprawki jednolinijkowe.

---

## 1. Uchwyty przegród są wyłączone jedną linią CSS 🔴 · **1 linia**

**Co jest.** `szafa.css:49` — `.olowek{ display:none }`. Cała logika przeciągania
(`wybor.js:73`, `interact('.olowek').draggable`) działa, uchwyty się generują
(`nakladka.js:96`), ale `display:none` wyrzuca je z układu: `getBoundingClientRect()`
daje **0×0 w punkcie (0,0)**.

Pochodzi z celowej zmiany („ukryto uchwyty do czasu zaprojektowania nowej postaci
wizualnej", LOG_ZMIAN_TESTOW.md), której nigdy nie cofnięto.

**Rozwiązanie.** `display:grid` — reguła ma już `place-items:center`, więc taka była.

**Sprawdzone na żywo.** Po podmianie uchwyty wracają pod mebel, mają 36 px, dają się
złapać, a przeciągnięcie zmieniło kolumny z `58,8 / 58,8 / 58,8` na `43 / 74,6 / 58,8`
i zaktualizowało pole „Columns". **To jest ta brakująca funkcja „przesuwanie ścianek
działowych" — działa w całości, jest tylko schowana.**

---

## 2. Warstwa edycyjna wymaga jednocześnie trzech warunków 🔴 · **~30 linii**

**Co jest.** `nakladka.js:40`:

```js
const front = naOsiCzolowej() && !sciezkiAktywne() && stan.wejscie.length > 0;
siatka.hidden = olowki.hidden = !front;
```

Żeby zobaczyć komórki, uchwyty i przyciski „+40 cm", trzeba **naraz**:
1. być w środku modułu (`stan.wejscie.length > 0`, czyli po dwukliku),
2. mieć kamerę na osi z dokładnością `NA_OSI = 0.08` rad — **±4,6° w pionie, ±6,4°
   w poziomie** (`scena.js:286`),
3. nie mieć pathtracingu.

Po starcie warunek 1 jest fałszywy, więc nie widać żadnego narzędzia. Gdy już wejdziesz
w moduł, minimalny obrót sceny kasuje wszystko **bez słowa wyjaśnienia**. To jest główna
przyczyna „nie umiem tego obsługiwać".

**Rozwiązanie.**
- Rozdzielić warunki i **nazwać brakujący**: zamiast cichego `hidden` pokazać w scenie
  pasek „Obróć na wprost, żeby edytować siatkę · [Ustaw]" albo „Wejdź w moduł · [Wejdź]".
- Podnieść `NA_OSI` do ~0,30 rad (17°). Rzuty komórek liczy `rzutuj()` z macierzy kamery,
  więc są poprawne pod każdym kątem — prostokąt `div`-a rozjeżdża się dopiero przy skosie.
- Docelowo (osobne zadanie): rysować komórki jako czworokąty SVG i znieść warunek kąta.

---

## 3. „Straight-on view" nie przywraca warsztatu 🔴 · **3 linie**

**Co jest.** Kliknięcie lupy (`data-akcja="dopasuj"`) nie zmieniło nic: kamera stała,
`siatka.hidden` zostało `true`. Zmierzyłem — `naOsiCzolowej()` zwracało **true**, czyli
kamera już była na osi; blokował warunek `stan.wejscie.length > 0` z punktu 2.

Przycisk, po który sięga zgubiony użytkownik, nie rozwiązuje jego problemu i nie mówi,
co jest nie tak.

**Rozwiązanie.** `dopasuj` ma wracać na oś **i**, gdy nic nie jest otwarte, wchodzić
w aktywny moduł (`wejdzWModul(stan.meble[stan.aktywny].id)`). Jeden przycisk
„przywróć mi warsztat".

---

## 4. Zaznaczony wiersz drzewa jest niewidoczny 🟠 · **1 linia**

**Co jest.** Wiersz modułu, w którym jesteś, ma naraz `zaznaczony`
(`background: var(--akcent)`, `color:#fff`) i `wejsciowy`
(`background: rgba(13,153,255,.14)`). `.modul.wejsciowy` stoi w CSS **po**
`.modul.zaznaczony`, więc wygrywa tło i zostaje **biały tekst na bladoniebieskim**.
W DOM jest „Szafki dolne · Editing", na ekranie pusty prostokąt.

Ten sam błąd, co naprawiony wcześniej w paskach segmentowych.

**Rozwiązanie.** `.modul.wejsciowy.zaznaczony{ background: var(--akcent); color:#fff }` —
albo nie nakładać obu klas i oznaczać wejście obwódką, nie tłem.

---

## 5. Ikona „Reset" wygląda jak „Cofnij" 🟠 · **~10 linii**

**Co jest.** W szynie jest `rotate-ccw` z podpowiedzią „Reset" — kasuje **cały projekt**.
To dokładnie ta ikona, której wszyscy używają na cofanie. Prawdziwe cofanie istnieje
(`Cmd/Ctrl+Z`, `szafa.js:665`, sprawdzone — działa), ale **nie ma żadnego przycisku**.

Użytkownik szukający „cofnij" trafia w „skasuj wszystko".

**Rozwiązanie.** Dołożyć do szyny parę `undo`/`redo` (`undo-2`, `redo-2`) wpiętą w `skok(-1)`
i `skok(1)`, wyszarzaną na końcach historii. Reset przenieść na dół szyny z ikoną
`trash-2` i wyraźnie odseparować.

---

## 6. Start kadruje jeden moduł, nie mebel 🟠 · **2 linie**

**Co jest.** Po wczytaniu kamera stoi na `stan.aktywny`, czyli pierwszym module listy —
u mebla fabrycznego to kobaltowy cokół. Mebel jest ucięty z góry i z lewej, pół ekranu
zajmuje niebieska płyta. Nie widać, co to za mebel ani ile ma modułów.

**Rozwiązanie.** Pierwsze ujęcie po wczytaniu projektu = kadr całości
(`zaznaczCalyMebel()`), tak jak po utworzeniu mebla z kreatora.

---

## 7. Panel jest wyszarzony i nie wiadomo dlaczego 🟠 · **~25 linii**

**Co jest.** Po starcie wszystkie sekcje mają `.zablokowana` (`opacity:.4`,
`pointer-events:none`). Powód — „Selected, not editing — double-click the module to edit it" —
jest szarym tekstem 10,5 px pod drzewem, poza polem widzenia kogoś, kto właśnie próbuje
ruszyć suwak szerokości.

**Rozwiązanie.** Znieść tryb: klik w moduł od razu go edytuje, dwuklik zostaje tylko
do wchodzenia w moduły zagnieżdżone. W Figmie zaznaczenie od razu daje inspektor i nikt
nie oczekuje dwóch stanów. Jeśli tryb ma zostać — zamiast wyszarzenia jeden wyraźny pasek
„Edytujesz: nic · [Wejdź w moduł]".

---

## 8. Komórki są niewidoczne, dopóki się w nie nie trafi 🟠 · **3 linie**

**Co jest.** `.komorka{ border:1px solid transparent }` — obrys pojawia się dopiero
na `:hover`. W trybie edycji widzisz mebel bez żadnej siatki i nie wiesz, że są tam
klikalne pola ani gdzie przebiegają ich granice.

**Rozwiązanie.** W trybie edycji rysować wszystkie komórki cienką, półprzezroczystą
obwódką (`rgba(13,153,255,.22)`), a `:hover` wzmacniać. Siatka jest mapą tego, co da się
kliknąć — musi być widoczna od razu.

---

## 9. Dwuklik w drzewie startuje zmianę nazwy razem z wejściem 🟠 · **~8 linii**

**Co jest.** Dwuklik w wiersz modułu wchodzi w moduł **i** przełącza wiersz w pole
tekstowe. Kto chciał edytować mebel, dostaje kursor w polu nazwy.

**Rozwiązanie.** Dwuklik = wejście w moduł. Zmiana nazwy pod `F2`, pod powolnym drugim
kliknięciem w już zaznaczony wiersz albo z menu kontekstowego — jak w Finderze i Figmie.

---

## 10. Pusta sekcja „Row height" w karcie komórki 🟠 · **2 linie**

**Co jest.** W karcie komórki jest nagłówek „Row height" i pod nim **nic** (28 px wysokości).
`wysokosciDoWyboru(r)` (`karty.js:49`) zwraca `[]`, gdy moduł ma jeden rząd
(`j = r < h.length ? r : r - 2` daje −1), a nagłówek rysuje się bezwarunkowo.

**Rozwiązanie.** Nie renderować sekcji przy pustej liście, albo wpisać w nią powód:
„Ten moduł ma jeden rząd — dodaj rząd, żeby zmieniać wysokości".

---

## 11. Karta komórki zasłania mebel 🟠 · **~15 linii**

**Co jest.** Karta ma 284 × 554 px i siada nad bryłą — przy scenie 951 px szerokości
zajmuje jej jedną trzecią i zakrywa komórkę, którą właśnie zmieniasz. Nie widać efektu
własnych kliknięć.

**Rozwiązanie.** Karta ma się układać po tej stronie, gdzie jest więcej miejsca
(`karty.js` robi to już dla szerokiej wnęki — rozszerzyć na wszystkie karty) i nigdy
nie zachodzić na prostokąt edytowanej komórki. Alternatywa: przenieść zawartość karty
do prawego panelu jako sekcję „Selected cell".

---

## 12. Piętnaście nieopisanych miniatur układu 🟡 · **~6 linii**

**Co jest.** „MODULE LAYOUT" to 15 ikonek bez podpisów; nazwa („Open", „Door, 1 shelf",
„Built-in oven") jest tylko w `title`, czyli po sekundzie najechania. Wybór wymaga
zgadywania albo omiatania kursorem.

**Rozwiązanie.** Podpis pod każdą miniaturą (10 px), albo stały pasek pod siatką
pokazujący nazwę tej, nad którą jest kursor.

---

## 13. Etykiety modułów zasłaniają mebel 🟡 · **~6 linii**

**Co jest.** Nad każdym modułem wisi biała pigułka z nazwą. Przy sześciu modułach
zasłaniają sporą część bryły także wtedy, gdy nic nie robisz. Przy wąskim kadrze
wystają poza scenę („…koralowa" przyklejone do lewej krawędzi).

**Rozwiązanie.** Pokazywać etykietę tylko dla modułu pod kursorem i dla aktywnego,
resztę wygaszać; przycinać do obszaru sceny.

---

## 14. Dołożenie kolumny wypycha mebel poza kadr 🟡 · **1 linia**

**Co jest.** Przycisk „+40 cm" poszerzył mebel z 176 do 216 cm (sprawdzone — działa
poprawnie), ale kamera nie przekadrowała, więc bryła wyszła poza lewą krawędź widoku.

**Rozwiązanie.** Po zmianie szerokości modułu wywołać `dopasujKamere(null, true)`
(łagodny dolot), tak jak po przełączeniu modułu.

---

## 15. Nazwy stylów gryzą się między panelem a kreatorem 🟡 · **decyzja, nie kod**

**Co jest.** W panelu sekcja „Layout → Style" ma Grid / Pattern / Slant / Mosaic /
Gradient / Pixel / Custom — to rozkład rzędów w jednym module. Kreator ma osobne
„Style" z tymi samymi nazwami, ale znaczą co innego (cały mebel).

**Rozwiązanie.** Przemianować panelowe na to, czym są — „Row rhythm" — i zostawić
„Style" wyłącznie kreatorowi.

---

## Kolejność, którą proponuję

1. **Punkty 1, 4 — trzy linie CSS razem.** Wracają uchwyty przegród i widać, co jest
   zaznaczone. Sama ta zmiana odblokowuje edycję.
2. **Punkty 3, 6, 14 — ~6 linii.** Kamera przestaje gubić mebel i jest jeden przycisk
   ratunkowy.
3. **Punkt 2 — ~30 linii.** Warstwa edycyjna przestaje znikać bez ostrzeżenia.
4. **Punkty 7, 8, 9, 10 — ~40 linii.** Znika tryb „zaznaczone, ale nie edytowane",
   siatka jest widoczna od razu, nazwa nie łapie fokusu.
5. Reszta kosmetyczna.

Razem punkty 1–4 to ok. **80 linii** i po nich konfigurator powinien być obsługiwalny.
