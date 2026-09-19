# P6 — szczotkowana stal, pojedyncza powierzchnia

POC: kuchnia v0001, blat_stalowy. Parametry w P6-stal.json, poza manifestem: anisotropy 0.65, anisotropyRotationDeg 0. Import przygotujPodglad(s) z P6-preview.js zwraca ustaw(true/false, opcjonalnyKątStopnie) oraz dispose(). Podgląd nie zapisuje wersji ani stanu mebla. Brak automatycznego włączenia.

[OFFICIAL] Dokładny r185: https://github.com/mrdoob/three.js/blob/r185/src/materials/nodes/MeshPhysicalNodeMaterial.js — anizotropia korzysta z TBNViewMatrix. POC tworzy MeshPhysicalNodeMaterial i kopiuje dotychczasowy materiał, zachowując jego kolor, roughness i węzły. Dla geometrii RoundedBox tworzy indeks jeden-do-jednego i computeTangents(), zachowując rozcięcia UV. Kontrola skończonych wartości: 1764 tangenty. Kierunek 0° jest względem tangentu UV, nie świata. Obrót 90° jest osobnym porównaniem.

[RUNTIME] A/B, Chrome, widoczna karta, kamera [220,145,130], target [165,90,50], viewport i buffer 1657×924, DPR urządzenia 2, ratio 1, wysoka, exposure 0.55, SSGI 28/6, SSR range 1, to samo urban_courtyard_02 environment. P2 jest wcześniej dostępne jako opcjonalny wariant tła; w tym porównaniu nie zmieniano środowiska ani słońca. Lokalnie zamrożono aktualizację nawigacji w obu wariantach.

Po 5 s rozgrzewki, 10 s odstępów rAF: A n=143 p50/p95/p99 66.7/83.4/84.3 ms; B n=149 66.7/83.3/84.2 ms. To pojedyncze krótkie próby, nie GPU time, CPU frame ani present interval. NO GPU TIMING. Nie deklarujemy poprawy wydajności. Events=[] w obu wariantach.

B pokazuje szerszy, jaśniejszy refleks na blacie. Bez tekstury mikrorys nie odtwarza szczegółowego wykończenia fabrycznego. Zachowano domyślny materiał; POC wymaga dalszej oceny w szerszym zestawie kadrów. Rollback podglądu: ustaw(false) lub dispose(); rollback publikacji: cofnięcie tego commitu, bez zmian danych aktywnych modeli.

[RUNTIME] Obrót 90° zmienia rozmieszczenie refleksu na tej samej powierzchni; kierunkowość jest widoczna. Pozostaje niezależną próbą, nie wybranym nowym ustawieniem domyślnym.
