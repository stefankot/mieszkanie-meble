# Prompt dla modelu testującego konfigurator

Skopiuj wszystko poniżej linii jako pierwszą wiadomość.

---

Testujesz konfigurator mebli w `konfigurator/`. Twoim zadaniem jest **znajdować i naprawiać
usterki**, a nie opisywać kod. Zależy mi na małym zużyciu tokenów, więc trzymaj się poniższej
pętli — ona jest tak pomyślana, żeby jedno uruchomienie kosztowało jedno wywołanie narzędzia.

## Uruchomienie

```bash
python3 konfigurator/serwer.py
```

Nie używaj zwykłego `http.server`: `serwer.py` wyłącza cache (inaczej przeglądarka poda stare
moduły i będziesz ścigać błędy, których już nie ma) i pośredniczy w pobieraniu tekstur.

## Pętla, której się trzymaj

1. Otwórz `http://localhost:8012/konfigurator/szafa.html?selftest=1`.
2. Odczytaj wynik **jednym** zapytaniem:

```js
let n = 0; while (!window.__wynik && n++ < 90) await new Promise(r => setTimeout(r, 500));
window.__wynik.tekst
```

   Dostaniesz `46/46 passed` albo listę linii `FAIL <nr>: <opis> — <szczegóły>`. Nie czytaj DOM-u,
   nie zrzucaj ekranu, nie przeglądaj kodu „na wszelki wypadek".
3. Napraw **jedną** usterkę. Gdzie szukać — patrz `konfigurator/MAPA.md`: tabela „chcesz zmienić X
   → otwórz plik Y". Otwórz ten jeden plik, nie całość.
4. Sprawdź poprawkę **samą tą kontrolą**: `?selftest=29` albo zakresem `?selftest=29-36`.
   To kosztuje sekundy zamiast minuty i nie zaśmieca kontekstu.
5. Dopiero gdy zakres świeci na zielono, puść komplet `?selftest=1`.

## Co jest już sprawdzane

Kontrole 3–36 to logika: siatka, wnęki, wzorce, kotwice, eksport, wydajność. Dwie ostatnie są
dymne i to one najczęściej łapią zepsute akcje użytkownika:

- **37** przeklikuje każdą widoczną kontrolkę panelu i sprawdza, czy zmieniła dokument **i czy
  wynik jest nadal poprawny** (walidacja silnika, brak NaN, każdy moduł ma geometrię);
- **38** wysyła prawdziwe zdarzenia wskaźnika do widoku 3D: klik zaznacza, dwuklik wchodzi,
  Esc wychodzi, klik w komórkę otwiera jej kartę, klik w uchwyt przegrody otwiera kartę przegrody.

Jeśli znajdziesz usterkę, której żadna kontrola nie łapie — **dopisz kontrolę**, zanim naprawisz.
Inaczej wróci. Kontrole leżą w `kontrole-podstawy.js`, `kontrole-meble.js`, `kontrole-panelu.js`
i `kontrole-sceny.js`; numeruj kolejno.

## Zasady

- Nie ruszaj katalogu `edytor/` — to osobna aplikacja Vue.
- Komentarze i nazwy po polsku, jak w istniejącym kodzie. Komentuj **dlaczego**, nie co.
- Każda poprawka kończy się zielonym kompletem. Nie zostawiaj „naprawię później".
- Przy wątpliwości, jak coś ma się zachować: **tak jak w Figmie**. To decyzja właściciela projektu.
- Nie commituj bez polecenia.

## Pułapki, na które już się nadziano

- **Podmiana tekstu po `s.index()`** bez sprawdzenia, że trafienie jest jedno, wycięła raz pół
  pliku, a raz zduplikowała funkcję. Zawsze licz wystąpienia przed podmianą.
- **`element.hidden = true` samo nic nie ukrywa**, gdy autor dał `display:flex`. W `szafa.css`
  stoi `[hidden]{display:none !important}` — nie usuwaj tego.
- **Bufor konsoli bywa nieaktualny** — potrafi odtworzyć błąd sprzed poprawki, z numerami linii
  sprzed edycji. Weryfikuj przez `window.__wynik`, nie przez konsolę.
- **Panel przeglądarki bywa ukryty** — wtedy `requestAnimationFrame` stoi i pomiary czasu klatki
  kłamią. Kontrola 27 mierzy jawnymi wywołaniami `render()`, więc jej to nie dotyczy.
- **Syntetyczne `PointerEvent` nie ruszą interact.js** (przeciąganie przegród) i wywalają
  `setPointerCapture` w OrbitControls — dlatego w kontroli 38 wszystko jest w `try/catch`,
  a samo przesunięcie przegrody sprawdzają kontrole 4 i 10 przez `przesunPrzegrode()`.
- **`stan` to pola aktywnego modułu „na wierzchu"**, a `stan.meble` to lista. Zmiana
  `stan.meble[i].pole` przepada, bo `przebuduj()` zaczyna od `zapiszAktywny()`. Pisz do `stan`
  albo przez `ustawPole()`.

## Zgłaszanie

Na koniec podaj: co było zepsute, jak to widać było w kontroli, co zmieniłeś i w którym pliku.
Bez streszczania kodu, który się nie zmienił.
