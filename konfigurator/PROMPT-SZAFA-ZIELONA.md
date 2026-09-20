# Prompt do nowego wątku — zbuduj szafę z zieloną wnęką

Skopiuj całość poniżej jako pierwszą wiadomość.

---

Przejmujesz konfigurator mebli w `konfigurator/`. Katalog roboczy:
`/Users/milajovovich/Desktop/mieszkanie walkthrough/mieszkanie-edytor`, gałąź
`konfigurator-moduly`. Aplikacja działa, zestaw kontroli jest zielony (60/60).

## Zadanie

**Zbuduj od zera, w konfiguratorze, zabudowę ze zdjęcia referencyjnego** (Instagram
`livingetcofficial`). Nie „coś podobnego" — ma się zgadzać układ, oświetlenie, gałki
i wymiary. Buduj **ręcznie, klikając w interfejsie**, nie wywołaniami z konsoli i nie
przez wpisanie gotowego presetu do `szafa.js`. Chodzi o to, żeby po drodze zobaczyć,
co w UI nie działa, i **naprawiać to od razu**.

### Co jest na zdjęciu

Zabudowa ścienna od podłogi do sufitu w salonie.

- **Fronty**: gładkie płyty bez ram, **blado­niebieski szarawy** (~`#A8C4CC`).
- **Gałki**: małe **okrągłe**, **terakota/rdzawe** (~`#C4562F`). Siedzą parami przy
  stykach skrzydeł: na górnych drzwiach przy dolnej krawędzi, na wysokich przy połowie
  wysokości, na szufladach pośrodku.
- **Podział pionowy**: ok. 7 pól. Od lewej: wąski słup, szeroki słup, **strefa wnęki**
  (ok. 3 pola), szeroki słup, wąski słup.
- **Pas górny**: rząd górnych drzwi przez całą szerokość, powyżej ~205 cm.
- **Środek — ZIELONA WNĘKA**, wyraźnie wyłożona, kolor **szałwiowo-zielony**
  (~`#6E9E7C`, w cieniu ciemniej). Wnęka ma dwie kondygnacje:
  - **góra**: rząd **sześciu wąskich otwartych przegródek** (pionowe przegrody), w nich
    książki; wzdłuż górnej krawędzi **taśma LED** świecąca w dół po plecach;
  - **dół**: duża otwarta wnęka na **telewizor** (ciemny ekran wypełnia większość),
    a pod półką nad nim **druga taśma LED**;
  - **spód wnęki**: pozioma półka, na niej wazony i soundbar.
- **Pod wnęką**: trzy niebieskie **szuflady** z gałkami.
- Zabudowa dochodzi do sufitu.

### Wymiary (oszacowane ze zdjęcia — zweryfikuj proporcjami i popraw)

| co | ile |
|---|---|
| wysokość całości | ~265 cm (sufit ~270) |
| szerokość całości | ~410 cm |
| głębokość | ~60 cm |
| wnęka: szerokość | ~165 cm |
| wnęka: dół nad podłogą | ~95 cm |
| wnęka: góra nad podłogą | ~205 cm |
| pas przegródek (góra wnęki) | ~28 cm |
| wnęka TV | ~62 cm |
| pas górnych drzwi | od ~205 cm do sufitu |

### Czego w konfiguratorze BRAKUJE i trzeba dorobić

To jest prawdziwa praca, nie kosmetyka. Sprawdziłem — tego nie ma:

1. **Okrągłe gałki w drugim kolorze.** Fronty mają uchwyty w dokumencie bazowym, ale są
   listwowe i biorą kolor korpusu. Potrzebny wariant „gałka" z własną barwą.
2. **Taśma LED we wnęce.** W dokumencie jest materiał `led-warm`, ale wnęka (`wneki.js`,
   `czesciWnek`) nic z nim nie robi. Potrzebna listwa u góry wnęki i pod półką.
3. **Zawartość wnęki: przegródki i TV.** `WNEKA_TRESC` (`wneki.js:5`) ma tylko
   `pusta / polka / biurko / kuchnia`. Trzeba dodać co najmniej „pigeonholes" (N pionowych
   przegród) i „TV".
4. **Dwukondygnacyjna wnęka.** Na zdjęciu to jedna wyłożona skrzynka z poziomą półką
   w środku. Sprawdź, czy prościej zrobić dwie wnęki jedna nad drugą, czy jedną z półką.

Para barw (korpus + wnęka) **już działa**: `wneka.kolor` + `wneka.barwa`, a od niedawna
także `wneka.goly` (scalenie bez wyściółki — tutaj chcesz `goly: false`, czyli wyłożoną).

## Jak pracować

**Najgorszy możliwy wynik to głęboka analiza bez wdrożenia.** Nie pisz raportów. Buduj,
poprawiaj, zatwierdzaj. Jedna diagnoza → jedna poprawka → dalej.

- Klikaj w UI naprawdę (`computer` w panelu podglądu). Gdy coś nie działa — napraw w kodzie
  i klikaj dalej. Nie obchodź UI konsolą; to właśnie w UI są błędy.
- Każdy napotkany błąd UX dopisz **jedną linią** do `konfigurator/AUDYT-UX.md` razem
  z rozwiązaniem, i **od razu wdroż**. Plik ma 21 punktów, wszystkie zamknięte — dopisuj 22+.
- Commituj partiami (3–6 zmian), po polsku, z wyjaśnieniem „dlaczego".

## Uruchomienie i testy — tanio

```bash
python3 konfigurator/serwer.py      # http://localhost:8012/konfigurator/szafa.html
```

Nie używaj zwykłego `http.server`: `serwer.py` wyłącza cache i pośredniczy w ambientCG.

**Testy odpalaj z konsoli, nie z adresu** — panel podglądu gubi `?selftest=1`:

```js
window.__test('1-99').then(t => window.__wynikTekst = t)
```

Trwa ~50 s. `window.__postep` pokazuje, na której kontroli stoi, gdy się zatnie.
**Nie uruchamiaj kompletu po każdej edycji** — tylko po partii. Do jednej rzeczy użyj
zakresu, np. `__test('29-36')`.

Kontrola 27 (FPS) bywa czerwona w panelu podglądu, bo panel zaniża klatki — to nie regresja.

Po dodaniu funkcji **dopisz kontrolę** do `kontrole-kreatora.js` (numeracja od 61) i pokaż
wynik. Nie proś użytkownika o ręczne sprawdzenie.

## Gdzie co jest

Zacznij od `konfigurator/MAPA.md` — jedna linia na plik. Otwieraj **tylko ten plik, który
zmieniasz**. Do tego zadania najważniejsze:

| co | plik |
|---|---|
| wnęki: wyściółka, zawartość, nóżki | `wneki.js` |
| materiały, barwy, słój | `materialy.js` + `model.js` (koniec: definicje materiałów) |
| układy komórek (`UKLAD`), paleta `KOLORY` | `dane.js` |
| karta komórki i karta wnęki | `karty.js` |
| prawy panel | `panel.js` |
| kreator mebli | `kreator.js`, `tylko.js`, `style-tylko.js`, `kuchnia.js` |

Historia decyzji: `AUDYT-UX.md` (błędy UX i ich naprawy), `LOG_ZMIAN_TESTOW.md`
(dziennik), `KATALOG-TYLKO.md` (skąd dane Tylko).

## Zasady, których nie łam

- **Nazwy w kodzie po polsku**, w UI po angielsku. Komentarz mówi „dlaczego", nie „co".
- **Limit ~300 linii na moduł.** `szafa.js` i `panel.js` już go przekraczają — nie
  powiększaj ich, wydziel nowy plik.
- Nie zmieniaj kolejności w `KOLORY` — zapisane projekty trzymają `kolor` jako indeks.
  Nowe barwy **dopisuj na końcu**.
- Nie przerabiaj `edytor/` ani `edytor-app/`. Konfigurator to osobna aplikacja.
- Git wymaga jawnej tożsamości:
  `git -c user.name="Mila Jovovich" -c user.email="milajovovich@MacBook-Air-Mila.local" commit …`

## Stan na dziś

Zielone 60/60. Świeżo naprawione (nie szukaj tego ponownie): uchwyty przegród wróciły
(`.olowek` miało `display:none`), warstwa edycyjna tłumaczy swój stan paskiem w scenie,
kamera nie ucieka przy każdej przebudowie, wejście w moduł nie zależy od tempa klikania
(klik w już aktywny moduł wchodzi w niego), karty nie zasłaniają mebla, scalenie komórek
daje gołe pole zamiast podszafki, kreator pyta przed zastąpieniem projektu.

Zacznij od potwierdzenia `60/60`, potem od razu buduj szafę.
