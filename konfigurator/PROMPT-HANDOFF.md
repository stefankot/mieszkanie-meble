# Prompt do wklejenia w nowym wątku

Poniższy tekst jest samowystarczalny — skopiuj go w całości jako pierwszą wiadomość.

---

Przejmujesz gotowy projekt: konfigurator szafy w stylu Tylko, zbudowany na silniku
parametrycznym z repo `mieszkanie-meble`. Katalog roboczy:
`/Users/milajovovich/Desktop/mieszkanie walkthrough/mieszkanie-edytor`, cały kod
konfiguratora siedzi w `konfigurator/`.

**Zanim cokolwiek zmienisz, przeczytaj `konfigurator/PRZEKAZANIE.md`** — jest tam architektura,
lista plików, decyzje produktowe, których nie wolno cofać, i lista pułapek, na które poprzedni
wątek już się nadział. Potem obejrzyj `dane.js` (115 linii — cały model stanu) i `szafa.js`
(324 linie — punkt wejścia i pętla przebudowy). Reszty nie czytaj na zapas, bierz plik dopiero
gdy w nim pracujesz; `nakladka.js` i `scena.js` to po ~500 linii.

Odpalenie i weryfikacja:

```bash
python3 konfigurator/serwer.py
```

potem `http://localhost:8012/konfigurator/szafa.html`, a testy przez
`http://localhost:8012/konfigurator/szafa.html?selftest=1` — **29 kontroli, na starcie wszystkie
przechodzą**. Nie uruchamiaj zwykłego `http.server`: `serwer.py` wyłącza cache (inaczej
przeglądarka serwuje stare moduły) i pośredniczy w pobieraniu tekstur z ambientCG, którego nie
da się wołać wprost z powodu CORS. Jeśli coś zmieniasz, dopisz kontrolę do `selftest.js` i
pokaż wynik — nie proś użytkownika, żeby sprawdził ręcznie.

Zasady pracy ustalone z użytkownikiem:

- Pisz i komentuj po polsku, nazwy funkcji też są polskie — trzymaj tę konwencję.
- Działasz autonomicznie: użytkownik bywa z dala od komputera. Rób kolejne kroki bez pytania,
  raportuj skrótowo, co zrobione i jak zweryfikowane.
- Nigdy nie wybieraj tekstury za użytkownika — pokaż kandydatów i daj wybrać.
- Pytania po większych etapach zadawaj jako interaktywną ankietę (AskUserQuestion), nie jako
  listę w tekście.
- Zmiany geometrii weryfikuj w przeglądarce (panel podglądu), nie na oko z kodu.

Czego nie ruszać bez wyraźnej prośby — pełna lista jest w PRZEKAZANIU, tu skrót: z IKEA
(LASTARE/ALTARLIDEN) pochodzi **wyłącznie wyposażenie wnęki**, korpus i fronty są na wymiar i
nie mają informacji o zgodności; komunikaty o niezgodnych wymiarach idą w kartę, nigdy w alert;
przeciąganie po meblu obraca scenę, a wnęki robi się tylko z popupu; kolor solid i tekstura
wykluczają się nawzajem; pathtracing ma się doładowywać dopiero po przełączeniu trybu i
kontrola 20 tego pilnuje.

Stan na dziś: działa wiele mebli z obrotem i przelotem kamery, wnęki z wyściółką i zawartością,
nóżki prętowe, tekstury CC0, pathtracing z HDRI, zapis w localStorage, import/eksport JSON.
Nierozwiązane: biblioteka ambientCG padnie po wrzuceniu na GitHub Pages (brak mostu), style
Pattern/Slant/Mosaic nie łamią jeszcze pionów tak jak Tylko, nie ma szafki wiszącej LASTARE.

Zacznij od potwierdzenia, że selftest daje 29/29, i zapytaj użytkownika, co robimy dalej.
