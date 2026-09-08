# `regal-salon` — funkcje nieobsługiwane przez obecny `FORMAT-MEBLA.md`

Poniższych elementów **nie wolno zastępować uproszczonym JSON-em i przedstawiać go jako pełnej wersji modelu**.

1. **Źródła światła Three.js**
   - `RectAreaLight`
   - `PointLight`
   - pozycja, kierunek/target, zasięg i natężenie światła
   - w centralnej wnęce są dokładnie dwa źródła: górne i dolne, oba przy plecach

2. **Emisyjne materiały listew LED**
   - `emissive`
   - `emissiveIntensity`
   - rzeczywista relacja materiału świecącego z oświetleniem sceny

3. **Pełny system materiałów PBR**
   - `MeshPhysicalMaterial`
   - `clearcoat`
   - `clearcoatRoughness`
   - `envMapIntensity`
   - `normalScale`
   - dodatkowe właściwości spoza `type/color/roughness/metalness`

4. **Proceduralne tekstury generowane w źródle**
   - `CanvasTexture`
   - proceduralny albedo/height/normal/roughness płyty
   - proceduralne mapy mikrobumpu i makrowariancji
   - te zasoby nie istnieją jako osobne pliki bitmapowe: są generowane przez kod źródłowy

5. **Niestandardowe shadery i wykończenia powierzchni**
   - `onBeforeCompile`
   - dodatkowa warstwa mikrobumpu
   - triplanarna makrowariancja
   - niestandardowe perturbacje chropowatości i koloru

6. **Dynamiczna biblioteka zewnętrznych map PBR**
   - asynchroniczne ładowanie map
   - wybór 2K/4K/8K
   - logika fallback
   - neutralizacja mapy tkaniny i ponowne kafelkowanie zgodnie z fizycznym rozmiarem

7. **Push-to-open jako mechanizm**
   - format ma `hinge` i `slide`, ale nie ma osobnego typu mechanizmu dla zatrzasku/push-to-open

8. **Logika materiałowo-renderingowa zależna od całego viewer-a**
   - automatyczna klasyfikacja powierzchni
   - nakładanie finishów i proceduralnych niedoskonałości
   - rejestracja PBR po zbudowaniu modelu

9. **Efekty renderera wpływające na wygląd modelu**
   - GTAO
   - SSGI
   - bloom
   - progresywna akumulacja
   - jitter kamery/światła
   - DoF
   - fotograficzny post-processing

10. **Dowolny kod zachowania poza prostymi `hinge` / `slide`**
    - obecny format deklaratywny nie przenosi funkcji JavaScript ani hooków modelu

## Konsekwencja

Dopóki format lub renderer biblioteki nie obsłuży tych funkcji albo nie powstanie dedykowany adapter pełnego źródła, **nie należy ustawiać deklaratywnego JSON-u jako pełnej/domyslnej wersji `regal-salon`**.
