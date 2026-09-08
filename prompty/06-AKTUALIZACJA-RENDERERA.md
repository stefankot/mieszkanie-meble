# Prompt do rozmowy pracującej nad rendererem

Repozytorium użytkownika: `stefankot/mieszkanie-meble`, gałąź `main`. Modele mebli i renderer mają oddzielne wersje. Odczytaj `README.md`, `FORMAT-MEBLA.md`, `renderery/manifest.json`, aktualne źródło z `renderery/zrodla/` i `narzedzia/buduj.py`.

Pracuj nad silnikiem zgodnie z osobnym zadaniem użytkownika. Zachowaj znaczniki `/* AI:START */` i `/* AI:END */`. Nie umieszczaj geometrii łóżka ani innych mebli w źródle renderera. Łóżko bazowe jest przejściowym modułem w bibliotece i zostaje zastąpione po opublikowaniu wersji JSON. Nie edytuj modeli, ich manifestów ani zatwierdzonych ustawień przy aktualizacji samego renderera.

Każdą gotową, uzgodnioną wersję rendererowego HTML dodaj pod nową nazwą z datą i numerem do `renderery/zrodla/`. Nie nadpisuj poprzedniej wersji. Zapisuj przez wtyczkę GitHub; nie twierdź, że plik zapisano, zanim otrzymasz potwierdzenie narzędzia i odczytasz plik.

GitHub Actions „Zbuduj wersje rendererów” tworzy wersję z synchronizacją i aktualizuje katalog. Sprawdź wynik tej operacji. W razie błędu nie ustawiaj ręcznie nowej wersji jako gotowej. Link do podglądu: `https://stefankot.github.io/mieszkanie-meble/`.

Adapter korzysta obecnie z interfejsu rendererowego Three.js opisanego w `narzedzia/buduj.py` i `narzedzia/synchronizacja.js`. Przy zmianie tego interfejsu albo przejściu na WebGPU przygotuj odpowiednią aktualizację adaptera i test importu, przełączania wersji i otwierania elementów; samo utrzymanie znaczników AI nie gwarantuje kompatybilności. Zachowaj format danych mebli i oddzielne wersjonowanie.
