# Format biblioteki mebli — wersja 1

Repozytorium: `stefankot/mieszkanie-meble`, gałąź `main`. Pliki są publiczne.

## Model i ustawienie

Każdy mebel ma własny katalog `meble/<assetId>/`. `manifest.json` wskazuje bieżącą wersję i listę wszystkich opublikowanych wersji. Wersje są niezmienne: poprawka zawsze tworzy nowy plik. Nie kasuj starszych wersji. Nazwy plików: `wersje/v0001.json`, `wersje/v0002.json` itd. Numer wynika z aktualnej historii w repozytorium, nie z pamięci rozmowy.

Każdy snapshot ma pola:

- `schemaVersion`: liczba `1`.
- `assetId`: jeden z `lozko`, `regal-salon`, `regal-przy-lozku`, `kuchnia`, `regal-kuchnia`.
- `version`: np. `v0001`.
- `summary`: krótki opis rzeczywistej zmiany, do 500 znaków.
- `placement`: obiekt ustawienia opisany poniżej.
- `model`: kompletny, samodzielny model opisany poniżej. Snapshot nie jest listą różnic.

`placement` zawiera:

- `confirmed: true` — wyłącznie po faktycznej akceptacji rysunku przez użytkownika.
- `roomId`: identyfikator z `plan/mieszkanie.json`.
- `wallId`: pełny identyfikator ściany, np. `SALON-W4`; dla mebla wolnostojącego `WOLNOSTOJACY`.
- `positionMm: [X,Y,Z]`: pozycja lokalnego początku mebla we wspólnym układzie mieszkania; zwykle Y = 0.
- `rotationDeg`: obrót całego mebla wokół pionowej osi Y, od -360 do 360°.
- `confirmationSvg`: ścieżka do niezmiennego, zatwierdzonego SVG w katalogu tego mebla, np. `meble/regal-salon/plany/v0001.svg`.
- `description`: opis słowny ustawienia, odległości i kierunku frontu.

Każda wersja zachowuje własne ustawienie. Zmiana samej geometrii może odziedziczyć poprzednie ustawienie tylko wtedy, gdy nie zmienia zaakceptowanego obrysu, frontu ani odległości od ścian. Przy zmianie obrysu, przesunięciu lub obrocie pokaż nowy plan SVG i poczekaj na akceptację.

## Plan i potwierdzenie SVG

Odczytaj `plan/mieszkanie.json` oraz `plan/mieszkanie.svg`. W JSON jest geometria pomieszczeń, identyfikatory ścian, okna, drzwi i szacht. SVG jest gotową bazą rysunku do rozmowy. Nie rekonstruuj planu z pamięci. Nie zmieniaj geometrii mieszkania.

Jednostki danych i współrzędnych SVG: **mm**. X rośnie w prawo, Z w dół rysunku, Y do góry w 3D. Dodatni obrót mebla wokół osi Y w Three.js odpowiada obrotowi **ujemnemu** na planie SVG: `translate(X Z) rotate(-rotationDeg)`. Dla punktu lokalnego `(x,z)`:

`worldX = X + cos(a)*x + sin(a)*z`

`worldZ = Z - sin(a)*x + cos(a)*z`

Początek lokalny: środek obrysu na poziomie podłogi. Lokalna oś +Z wskazuje front, +X prawą stronę mebla, +Y górę. Części mogą mieć ujemne lokalne X/Z. `positionMm` wskazuje środek obrysu, nie narożnik. Geometria skomplikowanych mebli może mieć rzeczywisty obrys wielokątny; zaznacz jego załamania.

SVG musi zawierać cały plan, wyróżniony obrys mebla w skali, podpis mebla, strzałkę frontu, identyfikator ściany i wymiary odsunięcia od co najmniej dwóch punktów/ścian odniesienia. Sprawdź otwory drzwiowe, okna i szacht. Nie pokazuj jako zmierzonego czegoś, co jest tylko założeniem. Pokaż użytkownikowi obraz rysunku i udostępnij rzeczywisty plik SVG; sam kod SVG nie wystarcza. Jeśli ChatGPT nie wyświetla SVG, pokaż PNG wygenerowany z tego samego SVG i link do oryginalnego SVG. Zapytaj: „Czy to jest właściwe ustawienie mebla?”.

Przykład opisu ściany: `SALON-W4` to lewa długa ściana salonu po stronie łazienki i przedpokoju. Ma otwór drzwiowy. Jest przeciwległa do `SALON-W2` z oknami i drzwiami balkonowymi. Określenia „górna/lewa” odnoszą się do rysunku, nie są nazwami kierunków geograficznych.

## Geometria modelu

`model` ma pola `name`, `units: "mm"`, `materials`, `parts`, `joints` oraz opcjonalnie `notes`. Nie używaj JavaScriptu, HTML, zewnętrznych URL, shaderów ani wykonywalnych skryptów w modelu JSON. Maksymalnie 1500 części, 100 materiałów i około 180 000 trójkątów. Nie upraszczaj bez informowania użytkownika. Jeżeli format nie odtwarza istotnego mechanizmu, zgłoś ograniczenie przed zapisem zamiast twierdzić, że go zachowano.

`materials` to słownik własnych identyfikatorów. Materiał: `type` (`wood`, `white`, `graphite`, `fabric`, `metal`, `black`, `glass`), opcjonalnie `color` w postaci `#rrggbb`, `roughness` i `metalness` w zakresie 0–1. Renderer korzysta ze swojego istniejącego systemu materiałów.

Każda część ma unikalne `id`, `type`, opcjonalne `parent` wskazujące grupę, `positionMm: [x,y,z]`, `rotationDeg: [rx,ry,rz]` (Euler XYZ, stopnie), `material` dla siatek i opcjonalne `label`. Pozycja i obrót części są względem rodzica, a bez rodzica względem początku całego mebla. Maksymalnie 12 poziomów zagnieżdżenia, bez cykli.

Obsługiwane typy części:

| Typ | Wymagane parametry | Uwagi |
|---|---|---|
| `group` | brak geometrii | Grupa części, nie potrzebuje materiału |
| `box` | `sizeMm: [szerokość,wysokość,głębokość]` | Środek bryły w `positionMm`; opcjonalnie `bevelMm` |
| `cylinder` | `radiusTopMm`, `radiusBottomMm`, `heightMm` | Oś Y, środek bryły; opcjonalnie `segments` 8–64 |
| `sphere` | `radiusMm` | Opcjonalnie `segments` 8–48, `rings` 4–32 |
| `extrude` | `profileMm: [[x,y],...]`, `depthMm` | Profil w XY, wytłoczenie symetrycznie od -depth/2 do +depth/2 na Z; opcjonalnie `bevelMm` |
| `mesh` | `verticesMm: [x,y,z,...]`, `indices: [i,j,k,...]` | Indeksy od 0, kolejność przeciwnie do wskazówek zegara od strony zewnętrznej; opcjonalnie `uv` |

Wymiary brył muszą być dodatnie. Zaokrąglenie `box` nie przekracza połowy najmniejszego wymiaru. Profil `extrude` 3–100 punktów; siatka do 30 000 wierzchołków i 30 000 trójkątów. Nie zapisuj `NaN`, `Infinity` ani tekstu zamiast liczb.

`joints` to lista mechanizmów:

- Zawias: `part`, `type: "hinge"`, `pivotMm: [x,y,z]`, `axis: [x,y,z]`, `angleDeg`, `label`.
- Wysuw: `part`, `type: "slide"`, `axis: [x,y,z]`, `travelMm`, `label`.

`pivotMm` i `axis` są w układzie całego mebla. Oś musi być niezerowa. Jedna część może mieć jeden mechanizm; ruchomych grup nie można zagnieżdżać w innych ruchomych grupach. Wszystkie części publikuj w pozycji zamkniętej. Renderer daje przyciski otwierania i klikanie ruchomych części.

## Publikowanie przez wtyczkę GitHub

1. Odczytaj aktualny `meble/<assetId>/manifest.json` i zapamiętaj SHA jego treści zwrócone przez narzędzie. Odczytaj najnowszy snapshot. W przypadku istniejącego łóżka pierwsza wersja `bazowa` jest wydzielonym oryginalnym modułem JS; nie przepisuj jej automatycznie na uproszczone pudełka.
2. Przygotuj nowy, kompletny snapshot oraz SVG jeśli wymagane jest nowe potwierdzenie ustawienia. Sprawdź spójność wymiarów, części i mechanizmów. Nie zapisuj `confirmed: true` bez odpowiedzi użytkownika.
3. Użyj `Create file` do dodania nowego SVG i nowego snapshotu pod nieużywanymi ścieżkami. Pliki wersji są niezmienne. Jeżeli zapis przerwał się, odczytaj istniejący plik i porównaj treść; nie nadpisuj innej treści pod tą samą wersją.
4. **Na końcu** użyj `Update file` dla manifestu, z wymaganym aktualnym `content_sha`. Zachowaj całą dotychczasową tablicę `versions`, dopisz wpis `{id,file,summary,createdAt,placement}` i ustaw `currentVersion` oraz `placement`. `createdAt` ma format ISO 8601. Tylko aktualizacja manifestu publikuje wersję rendererowi.
5. Przy konflikcie SHA ponownie odczytaj stan. Nie stosuj wymuszonego zapisu. Jeżeli zmieniono ten sam mebel, uwzględnij nową wersję lub wyjaśnij konflikt. Nie nadpisuj zmian innego wątku. Nie zmieniaj manifestów innych mebli ani silnika.
6. Odczytaj zapisany manifest i snapshot, sprawdź numer wersji oraz treść. Dopiero wtedy napisz „Zapisano”, podając link do konkretnego commita i podglądu. W razie błędu nie twierdź, że renderer już się zmienił.

Manifest ma pola `schemaVersion: 1`, `assetId`, `name`, `placement`, `currentVersion` i `versions`. Nowy katalog może mieć `placement: null`, `currentVersion: null`, `versions: []`. Nie wpisuj przykładowych modeli do produkcyjnej biblioteki. Specjalny wpis łóżka `{id:"bazowa",legacy:true,summary:...}` oznacza oryginalny model wydzielony z renderera.

## Automatyczność i podgląd

Po jednorazowym uruchomieniu synchronizacji w danym wątku i potwierdzeniu położenia zapisuj każdą ukończoną, uzgodnioną iterację bez proszenia użytkownika o komendę „publikuj”. Nie zapisuj luźnych rozważań ani odrzuconych propozycji. Gdy zmiana wymaga decyzji, najpierw pokaż ją użytkownikowi. Nie omijaj ewentualnych okien zgody samego ChatGPT.

Podgląd: `https://stefankot.github.io/mieszkanie-meble/`. Plik `index.html` można pobrać i otworzyć w Chrome; pobiera tę samą bibliotekę. Modele są sprawdzane co 15 sekund w aktywnej karcie; pamięć podręczna GitHuba i połączenie mogą opóźnić udostępnienie zapisu. Nie obiecuj aktualizacji przed faktycznym zapisem w GitHubie. Wersję historyczną można przypiąć w panelu; wybór „Najnowsza” wznawia aktualizacje.

## Renderer i istniejące łóżko

Renderer jest wersjonowany oddzielnie w `renderery/`. Obecne łóżko ma niezmieniony kod i mechanizmy w `meble/lozko/wersje/bazowa-95056a0097fc.js`. To jednorazowy, zaufany eksport dostarczonego modelu. Nowe modele przesyłane z rozmów są deklaratywnym JSON. Zmiany istniejącego natywnego łóżka wymagają zachowania jego mechanizmów; model nie może twierdzić, że ogólny JSON obsługuje sprzężone siłowniki i złożone ścieżki ruchu, których nie obsługuje.

Silnik renderowania poza sekcją AI jest zachowany bajt w bajt. Nową wersję źródła dodaje się pod nową nazwą w `renderery/zrodla/`; `narzedzia/buduj.py` tworzy wersję z synchronizacją i sprawdza zgodność interfejsu. Migracja do WebGPU może wymagać nowego adaptera, nie wymaga zmiany układu plików mebli.
