# archiwum — nie czytaj tego katalogu

Materiał historyczny. **Nic tutaj nie jest importowane przez aplikację** — sprawdzone grepem po
`*.js`, `*.ts`, `*.vue`, `*.html`, `*.yml`. Leży tu wyłącznie po to, żeby dało się wrócić do
decyzji z przeszłości.

Katalog został wydzielony dlatego, że siedział w `renderery/webgpu/` i mieszał się z żywym kodem:
`grep` po silniku trafiał w notatki z eksperymentów, a `ZMIANY_webgpu_pareto.md` to 23 tys. tokenów
w katalogu, w którym szuka się modułów renderowania.

| co | skąd | po co zostało |
| --- | --- | --- |
| `experymenty/` | `renderery/webgpu/experymenty/` | notatki i dane z prób P3–P17 |
| `eksperymenty/` | `renderery/webgpu/eksperymenty/` | to samo, druga pisownia |
| `dokumenty/ZMIANY_webgpu_pareto.md` | `renderery/webgpu/` | dziennik zmian portu na WebGPU |
| `dokumenty/ZMIANY_P19_optymalizacja.md` | `renderery/webgpu/` | dziennik optymalizacji P19 |
| `dokumenty/PROMPT-DALSZE-POPRAWKI.md` | `renderery/webgpu/` | stary prompt przekazania |

Jeśli czegoś stąd naprawdę potrzebujesz — wróć z tym do żywego kodu i opisz to w `MAPA.md`
albo w komentarzu przy module, którego to dotyczy.

## Co **nie** trafiło do archiwum, choć leżało obok

Dwie rzeczy z `experymenty/` są używane na żywo i zostały w drzewie:

- `renderery/webgpu/experymenty/P10-ktx2/` — mapy KTX2 wczytywane przez `materialy.js` po
  URL-u względnym (`new URL('./experymenty/P10-ktx2/…', import.meta.url)`). To dane czasu
  działania opublikowanej strony, nie eksperyment.
- `renderery/webgpu/front-parametryczny.js` — ma test (`tests/edge-profiles.test.mjs`),
  więc awansował na zwykły moduł silnika.
