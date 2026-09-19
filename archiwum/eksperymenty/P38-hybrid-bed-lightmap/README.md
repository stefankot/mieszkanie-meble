# P38 — pilot hybrydowej lightmapy łóżka

**Status:** odrzucony jako ustawienie domyślne.

## Zakres próby

- Kadr: łóżko `v0017`, wysoka jakość, bufor 90%, 1082×987 CSS px.
- Dwa statyczne panele pleców wnęk dostały osobne klony materiałów.
- Testowa lightmapa 32×32 RGBA8 zajmowała 4096 B danych źródłowych.
- Drugi kanał UV był kopią istniejącego UV; mapa zawierała ciepły gradient 3000 K o malejącej energii od górnej krawędzi.
- Lightmapa działała wyłącznie w lokalnym wariancie A/B. Nie została włączona w wersji produkcyjnej.

## Wynik

- Odczyt po ustaleniu: 27,5 FPS, 36,3 ms odstępu klatki, 232 wywołania rysowania, 193 tys. trójkątów.
- Porównywalny wariant bez lightmapy osiągał 27,0–27,6 FPS. Różnica mieści się w zmienności krótkiej próby; brak dowodu na zmianę wydajności.
- Kontrola obrazu nie wykazała pewnej poprawy wnęk przy domyślnej ekspozycji.
- Lightmapa dodawała światło do aktywnego SSGI. Bez maski materiałowej oznacza to częściowe podwójne liczenie światła pośredniego.

## Decyzja

Nie utrzymywać testowej mapy ani dodatkowych wariantów materiałów w ścieżce uruchomieniowej. Prawidłowy pilot wymaga:

1. osobnego, niepokrywającego się atlasu UV dla statycznej geometrii;
2. bake'u z wersjonowaniem geometrii, zasłon i ustawień światła;
3. wyłączenia lub maskowania SSGI na powierzchniach objętych bake'em;
4. kalibracji względem referencyjnego zdjęcia oraz porównania ruchu i zmian oświetlenia.

**Pewność:** wysoka dla zgodności technicznej i odczytu testu; średnia dla oceny wizualnej; niska dla potencjału pełnego bake'u, którego ta próba nie implementowała.
