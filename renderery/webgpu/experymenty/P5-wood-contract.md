# Semantyczne UV forniru — POC

`grainDirection` to lokalna oś części x/y/z, wzdłuż której biegnie słój skanu (oś słoja skanu określa textureGrainAxis: u/v; domyślne v odpowiada używanemu oak_veneer_01). `textureScaleMm` to dodatnia długość powtórzenia [U,V] w mm, również może być skalarem. `grainOffset` to [U,V] w mm w układzie arkusza, po obrocie ściany. `faceOrientation` przypisuje px/nx/py/ny/pz/nz kąt0/90/180/270°, nadpisując kierunek domyślny danej ściany.

`veneerSheetId` identyfikuje arkusz, `veneerContinuityGroup` grupę układanych razem części. Nie powodują losowania ani automatycznego doboru arkusza. Ciągłość wynika z jawnych offsetów: POC sąsiednich frontów F16/F17 uwzględnia rozstaw382mm (szerokość360mm plus przerwa22mm). Nie sugeruje fizycznego istnienia arkusza z takim nadrukiem; to próbka kontraktu.

UV są zapisywane w geometrii z lokalnych pozycji, a nie z pozycji świata. Ruch mebla i odświeżenie tej samej specyfikacji nie zmieniają wzoru. Brak metadanych zachowuje dotychczasowe UV. To mapowanie ścian box, nie globalny triplanar. Tekstura czoła drewna/end grain wymaga osobnego assetu; nie jest imitowana obrotem tej samej mapy.

Dane próbki mają confirmed=false i nie są aktywną wersją mebla. P5-preview.js jest odwracalnym podglądem UV dwóch części, zachowującym geometrię, materiały i mechanizmy. Nie zapisuje runtime state do danych.
