# Dziennik zmian i testów konfiguratora

Plik jest uzupełniany przyrostowo. Każdy wpis opisuje wyłącznie wykonaną zmianę i jej weryfikację.

## 2026-09-20

- Naprawiono usuwanie aktywnego modułu: usunięcie nie nadpisuje już następnego mebla danymi poprzedniego. Dodano kontrolę 50.
- Dodano pola wymiarów w centymetrach obok suwaków, z krokiem 0,1 cm i osobnymi etykietami dostępności. Dodano kontrolę 51.
- Ujednolicono aktywny obiekt i zaznaczenie w nawigatorze; zachowano przy tym edycję wielu zaznaczonych modułów. Dodano kontrolę 52 i poprawiono regresję kontroli 32.
- Dodano pusty projekt startowy oraz presety IKEA LÅDMAKARE i kuchni narożnej.
- Odtworzono układ kuchni: wysoka lewa kolumna, górny pas szaf, koralowa strefa robocza, dolne szafki i prostopadła prawa ściana. Dodano kontrolę 53.
- Przebudowano górę koralowej wnęki: cztery fronty wiszące są częścią jednej wyłożonej wnęki, zamiast osobnego rzędu korpusu.
- Weryfikacja przed ostatnią korektą wnęki: pełny zestaw `53/53 passed`. Po korekcie trwa ponowna kontrola 53 i komplet.
- Ręczna edycja w Safari ujawniła złą orientację prawej zabudowy oraz brak wąskiego prawego słupka; dalsze ustawianie mebla odbywa się kontrolkami, nie przez zmianę opisu presetu.
- Cofnięto cztery koralowe fronty wiszące o 12 cm względem lica ramy, zgodnie z fotografią referencyjną. Kontrola 53 sprawdza odtąd także cofnięcie.
- Ustalono obowiązującą metodę dalszej pracy: konstrukcja i ustawianie mebli wyłącznie kontrolkami w Safari, a weryfikacja wyłącznie przez rzeczywiste działania w UI. Bez modyfikowania mebli przez preset, JSON, stan aplikacji lub funkcje pomocnicze. Kod wolno zmieniać dopiero po ujawnieniu usterki podczas testu na żywo.
- Po cofnięciu górnych frontów ostatni wykonany komplet automatyczny zakończył się wynikiem `53/53 passed`; od kolejnego kroku nie jest już używany jako metoda testowania mebla.
- Test na żywo nawigatora ujawnił, że „Furniture” kadrowało zestaw według frontu aktywnej prawej ściany, przez co główna zabudowa znikała za nią. Kadrowanie całego zestawu używa teraz średniego kierunku frontów wszystkich modułów, dając widok narożny.
- Test na żywo pola „Columns” ujawnił pustą wartość w presetach opartych na `kolumnyWlasne`: Safari zaznaczało placeholder zamiast umożliwić edycję. Pole pokazuje teraz faktyczny bieżący podział, aby można go było zaznaczyć i nadpisać kontrolkami.
- Dwuklik w module nawigatora nie wchodził do edycji, ponieważ pierwszy klik przebudowywał węzeł przed zdarzeniem `dblclick`. Drugi klik jest teraz rozpoznawany przez `MouseEvent.detail`, więc nawigator może odblokować kontrolki modułu.
- Weryfikacja na żywo po poprawkach: klik „Furniture” pokazuje oba ramiona narożnika; dwuklik w drzewie otwiera moduł i odblokowuje Layout.
- Kuchnię poprawiono wyłącznie kontrolkami Safari: kolumny głównej zabudowy ustawiono na `60 + 60 + 60 + 60 + 50 + 30 cm`, a uchwytami wnęki ustawiono zakres `rows 2–3, columns 2–5`. Ostatnia kolumna tworzy prawy słupek 30 cm.
- Prawą ścianę ustawiono kontrolkami na obrót `270°` i wyrównanie `Front`; w widoku całego zestawu cofa się od narożnika i nie zasłania już głównego frontu.
- Ręcznie w Safari dodano fronty `Door` w komórkach `Row 3, column 6` i `Row 2, column 6`. Powstała kompletna wąska kolumna 30 cm po prawej stronie strefy zlewu; licznik wzrósł z 10 do 12 frontów. Widok całego zestawu potwierdził jej położenie przed prostopadłą zabudową prawej ściany.
- Audyt UI w Safari ujawnił, że podczas edycji zagnieżdżonego elementu przygaszany był także jego mebel nadrzędny. Pełny kontrast zachowuje teraz całe aktywnie edytowane ramię, a tylko pozostałe moduły są przezroczyste.
- Rozdzielono wizualnie zaznaczenie od edycji: pojedynczy klik pokazuje `Selected, not editing — double-click…`, a po dwukliku wiersz nawigatora otrzymuje etykietę `Editing` i odblokowuje kontrolki.
- Etykiety nad bryłami używają tych samych stanów co nawigator: zaznaczony moduł ma niebieską obwódkę i podpowiedź dwukliku, a czarna etykieta oraz komunikat `This piece is being edited` występują tylko podczas faktycznej edycji.
- Karta szerokiej wnęki wybiera teraz wolną stronę ekranu; dla kuchni otwiera się po lewej i nie zasłania prawej kolumny 30 cm.
- Ogólne ostrzeżenie o niezgodnych okuciach zastąpiono konkretną informacją `C5 50cm, C6 30cm · made-to-measure fittings`, aby zamierzone nietypowe szerokości nie wyglądały jak błąd całego projektu.
- Weryfikacja na żywo: po wejściu w główną zabudowę pozostaje ona nieprzezroczysta, prawa ściana jest przygaszona, nawigator i etykiety sceny zgodnie rozróżniają zaznaczenie od edycji, karta wnęki nie zakrywa C6, a podsumowanie wymienia dokładne kolumny niestandardowe.
- Kontrolna zmiana ostatniej kolumny i powrót do 30 cm zachowały wnękę `rows 2–3, columns 2–5`; nie potwierdzono osobnej usterki utraty zakresu ani koloru, więc nie zmieniano modelu bez dowodu.
- Dodano po bokach edytowanego mebla lewitujące, okrągłe akcje powiększania o 40 cm; znak plus pochodzi z używanego już w aplikacji zestawu Lucide, a nie z osobnego glifu tekstowego.
- Ukryto dotychczasowe uchwyty przegród bez usuwania ich logiki, aby mogły wrócić po zaprojektowaniu nowej postaci wizualnej.
- Test na żywo ujawnił, że prawa akcja dodawała pełne 4 fronty, a lewa kopiowała puste komórki zajęte wcześniej przez wnękę. Dobór wzorca dla nowej kolumny pomija teraz wnękę i komórki bez jawnego układu.
- Weryfikacja na żywo potwierdziła działanie obu bocznych przycisków, zmianę szerokości o 40 cm oraz zachowanie zakresu wnęki; dodatkowo naprawiono brak klikalności przycisków wynikający z `pointer-events: none` na warstwie nakładki.
- Dodano kreator mebli otwierany przyciskiem na samej górze prawego panelu: trzy kategorie Tylko z ich piktogramami, układy startowe z wymiarami, pola wymiarów i palety linii. Kontrole 54–56.
- Paleta rozszerzona o osiem barw z linii Edge i Tone (dopisane na końcu `KOLORY`, żeby nie przesunąć indeksów w zapisanych projektach). Pary „front + wnętrze" malują korpus jednym kolorem, a półki i plecy drugim. Kontrola 57.
- Dodano import gotowych projektów z katalogu tylko.com (46 sztuk w `tylko-projekty.json`). Ich API jest za Cloudflare, więc katalog jest zrzutem, a nie połączeniem na żywo — sposób odświeżenia opisany w `KATALOG-TYLKO.md`. Kontrola 58.
- Naprawiono kontrolę 30: wejście w moduł osadzony gasiło jego własną grupę sceny, bo `przygasPozostale()` porównywało identyfikator grupy wprost z korzeniem ścieżki. Teraz pełny kontrast zachowuje całe drzewo zawierania aktywnego ramienia.
- Weryfikacja: pełny zestaw `58/58 passed`.
- Kreator pyta, co zrobić z projektem, który już stoi w scenie: zastąpić czy dostawić obok. Dostawianie zmienia identyfikatory razem z kotwicami, więc dwa te same układy nie przyklejają się do siebie. Kontrola 59.
- Ujednolicono marginesy panelu: jeden margines boczny (`--marg`) i jeden rytm pionowy (`--blok`) dla wszystkich bloków. Lista modułów i podsumowanie przylegały wcześniej do krawędzi, reszta miała 13 px.
- Naprawiono nieczytelny stan wybrany w paskach segmentowych — biały tekst na jasnoszarym tle zastąpiono ciemnym tłem.
- Scena dostała narożnik pokoju (podłoga + dwie ściany) i sylwetkę 180 cm jako miarkę, tak jak konfigurator Tylko. Sylwetka znika na czas pathtracingu, bo to płaski wycinak z maską alfa.
- Naprawiono brakujący import `przebuduj` w `materialy.js`: doczytanie tekstury rzucało `ReferenceError` i mebel zostawał w kolorze zastępczym.
- Sześć stylów Original i sześć Edge odtworzonych 1:1 z piktogramów Tylko. Pixel przestał być zestawem losowych drzwiczek — to skrzyżowane słupy i pasy, z obrysem w kształcie kraty. Kontrole 55 i 56.
- Dodano kreator kuchni: kształt (prosta / narożnik / z wyspą), wymiary, wysokość blatu i niszy, para barw i pięć AGD, każde z pozycją albo wyłączone. Kontrola 60.
- Sylwetkę zastąpiono rysunkiem z Noun Project, dopasowanym do dokładnie 180 cm.
- Dopisano trzy lampy z BlenderKit; lampa jest wyborem w panelu, stoi we wnęce, a po świadomym wybraniu także na najwyższej otwartej półce.
- Weryfikacja: pełny zestaw `60/60 passed`.
- Poprawiono Pixel: pierwsza wersja odtwarzała piktogram (dwa słupy i dwa pasy), a nie mebel — wychodził rzadki krzyż zamiast kraty ze zdjęcia. Teraz to gęsta siatka kwadratowych komórek z frontami na większości pól i pojedynczymi skrzynkami wystającymi na cztery strony; liczba komórek wynika z wymiarów, nie z ikony. Kontrola 56 sprawdza gęstość i obrys.
- Kotwica boczna dostała `przesunY`, bez którego skrzynki doklejane z boku zawsze stały na podłodze.
- Weryfikacja: pełny zestaw `60/60 passed`.
- Poprawiono konstrukcję Pixela: cała krata stała na jednej skrzynce pod dolnym rzędem, co jest fizycznie niemożliwe. Korpus jest teraz korzeniem i stoi na podłodze całą szerokością, a skrzynki wiszą na nim. Dolne wcięcie ze zdjęcia to komórka bez frontu, nie osobna noga. Kontrola 56 sprawdza odtąd, że krata nie ma kotwicy, a każda skrzynka jest zakotwiczona w niej.
- Weryfikacja: pełny zestaw `60/60 passed`.
