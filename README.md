# Mieszkanie — biblioteka mebli

Publiczna biblioteka modeli, potwierdzonych położeń i niezależnych wersji renderera.

**Podgląd:** https://stefankot.github.io/mieszkanie-meble/

Plik `index.html` można pobrać i otworzyć w Chrome albo wysłać znajomym. Pobiera publiczną bibliotekę bez logowania. Wymaga internetu.

## Pierwsze uruchomienie

1. Otwórz podgląd mieszkania i pozostaw tę kartę otwartą.
2. W ChatGPT otwórz rozmowę o konkretnym meblu i dodaj wtyczkę GitHub.
3. Wklej właściwy prompt z katalogu `prompty/`.
4. Odpowiedz, gdzie stoi mebel. Model pokaże SVG planu z meblem. Sprawdź i zaakceptuj pozycję.
5. Po zapisaniu plików przez ChatGPT renderer pobierze mebel. Kolejne uzgodnione zmiany mają być zapisywane automatycznie zgodnie z promptem.

## Historia

W panelu „Biblioteka mebli” wybierz wersję każdego mebla osobno. „Najnowsza — automatycznie” śledzi nowe zapisy. Górna lista zmienia wersję renderera niezależnie od mebli.

Odczyt odbywa się co 15 sekund w aktywnej karcie. Dostarczenie nowej wersji może dodatkowo opóźnić pamięć podręczna GitHuba lub połączenie. Nieudany odczyt albo niepoprawny model nie usuwa poprzedniego poprawnego modelu z widoku.

## Pliki

- `plan/mieszkanie.json` — geometria mieszkania w mm, pomieszczenia, ściany i otwory.
- `plan/mieszkanie.svg` — rysunek odniesienia dla rozmów ChatGPT.
- `meble/<id>/manifest.json` — lokalizacja i lista wersji jednego mebla.
- `meble/<id>/wersje/` — niezmienne wersje modeli.
- `meble/<id>/plany/` — zaakceptowane rysunki SVG położenia.
- `renderery/zrodla/` — wersje źródłowe rendererów.
- `renderery/*.html` — wersje z dołączoną synchronizacją; silnik poza sekcją AI niezmieniony.
- `FORMAT-MEBLA.md` — kontrakt dla modeli ChatGPT.

Łóżko z dostarczonego pliku zostało wyodrębnione jako pierwszy mebel. Jego geometria i niestandardowe mechanizmy pozostają w oryginalnym module JavaScript. Cztery pozostałe meble czekają na eksport z właściwych rozmów; biblioteka nie zawiera ich fikcyjnych zamienników.

## Aktualizacja renderera

Dodaj nowy plik HTML pod nową nazwą do `renderery/zrodla/`, zachowując znaczniki `/* AI:START */` oraz `/* AI:END */`. Generator `python3 narzedzia/buduj.py` buduje kopię z synchronizacją i katalog wersji, sprawdzając zgodność obecnego interfejsu. Zachowaj stary plik. Przy WebGPU może być potrzebna aktualizacja adaptera — format danych mebli pozostaje oddzielny.

## Ograniczenia

Sama wtyczka nie uruchamia się w dowolnym starym wątku bez jej udostępnienia temu wątkowi. Masterprompt instruuje model, ale nie gwarantuje wywołania narzędzia ani nie znosi pytań o zgodę ChatGPT. Zapis jest potwierdzony dopiero po otrzymaniu wyniku GitHuba i odczycie zapisanych plików. Podgląd 3D działa w osobnej karcie Chrome; możliwość osadzenia go wewnątrz ChatGPT zależy od narzędzi dostępnych w rozmowie.

Plan został skopiowany z dostarczonego renderera; nie jest nową inwentaryzacją pomiarową. Oryginalny lokalny plik użytkownika nie jest nadpisywany.
