# P3: krawędzie semantyczne

`edgeRadiusMm` w części box jest długością w mm: jawne 0 daje BoxGeometry, dodatnia wartość RoundedBoxGeometry. Niedozwolona jest wartość >= połowy najmniejszego wymiaru; nie jest po cichu obcinana. Brak pola zachowuje legacy renderer fallback. Segmentacja jest aproksymacją renderera, nie zmianą promienia projektu.

`panelThicknessMm` dokumentuje grubość płyty. `gapMm` i `recessMm` są parametrami projektowymi generatora frontu, nie poleceniem, aby renderer sam zmniejszył już zwymiarowaną część. Kompilator przekazuje je do userData.design. W przypadku ręcznie podanych parts źródłem geometrii są sizeMm/positionMm.

POC z istniejącego regału przy łóżku zachowuje wszystkie wymiary i identyfikatory; jedyną różnicą jest edgeRadiusMm=0. Plik ma placement.confirmed=false, nie ma wpisu w manifeście i nie może być aktywowany automatycznie.

Kontrakt generatora frontu o otworze widthMm × heightMm: sizeMm=[widthMm-2*gapMm,heightMm-2*gapMm,panelThicknessMm]; środek frontu na osi Z to faceZMm-recessMm-panelThicknessMm/2. Kontrola dodatnich wymiarów jest obowiązkowa. Testowany przykład: otwór600×720mm, gap3mm, recess2mm, płyta18mm → front594×714×18mm, z=-11mm przy faceZMm=0. Wszystkie cztery wartości są danymi, nie ukrytymi stałymi renderera.
