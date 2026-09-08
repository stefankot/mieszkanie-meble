# Nowa kuchnia — prompt do istniejącej rozmowy

Wklej poniższą treść w całości do rozmowy o tym meblu, z włączoną wtyczką GitHub.

---

Identyfikator mebla w tej rozmowie: `kuchnia`. Nazwa: Nowa kuchnia. Nie twórz nowego identyfikatora i nie edytuj innych mebli.

Włącz w tej rozmowie stałą synchronizację projektowanego mebla z publicznym repozytorium GitHub `stefankot/mieszkanie-meble`, gałąź `main`. Wykonuj zapisy przez rzeczywiste narzędzia wtyczki GitHub. Nie udawaj zapisu i nie zastępuj go samym blokiem kodu.

Najpierw odczytaj z repozytorium `FORMAT-MEBLA.md`, `plan/mieszkanie.json`, `plan/mieszkanie.svg` i manifest właściwego mebla. Jeżeli nie masz dostępu do wtyczki lub nie możesz odczytać plików, napisz krótko, którego kroku połączenia brakuje, i nie twierdź, że synchronizacja działa.

**Zawsze zacznij od pytania o lokalizację:** „W którym pokoju i przy której ścianie ma stać ten mebel? Możesz opisać miejsce zwykłymi słowami, np. przy długiej ścianie salonu od strony łazienki”. Jeżeli użytkownik już podał opis, przedstaw własne rozumienie i poproś o jego potwierdzenie rysunkiem zamiast ponawiać identyczne pytanie. Nie zgaduj brakującego odsunięcia od narożnika, kierunku frontu ani wysokości zawieszenia. Zadaj tylko niezbędne, proste pytania.

Na podstawie prawdziwego planu narysuj **SVG całego mieszkania z tym meblem**: obrys w skali, kolorowe wyróżnienie mebla, strzałka frontu, nazwa pomieszczenia, identyfikator ściany, odległości od ścian/narożników. Uwzględnij drzwi, okna i szacht. Pokaż rysunek jako obraz oraz załącz plik SVG; sam kod nie jest potwierdzeniem. Jeżeli SVG nie wyświetla się bezpośrednio, pokaż PNG wyliczony z tego samego SVG i załącz oryginalny SVG. Zapytaj: „Czy to jest właściwe ustawienie mebla?”. **Przed odpowiedzią nie publikuj modelu z nowym ustawieniem.**

Po akceptacji zapisz model, potwierdzony plan SVG i manifest zgodnie z `FORMAT-MEBLA.md`. Pierwsza wersja ma odtworzyć projekt ustalony w tej rozmowie, w tym wszystkie istniejące części, materiały i mechanizmy obsługiwane przez format. Nie zastępuj projektu demonstracyjnym regałem lub uproszczoną bryłą. Wykorzystaj rzeczywiste ustalone wymiary. O brakujące dane zapytaj; ograniczenia formatu wyjaśnij przed zapisem.

Następnie po każdej ukończonej, uzgodnionej iteracji automatycznie opublikuj nową wersję tego samego mebla, bez wymagania komendy „zapisz” lub „publikuj”. Zawsze odczytaj bieżący manifest i jego SHA przed zapisem. Dodaj niezmienny snapshot, a manifest aktualizuj na końcu. Zachowuj poprzednie wersje. Nie zmieniaj innych mebli ani plików silnika renderowania. Przy konflikcie nie nadpisuj obcej zmiany.

Nowa lokalizacja, obrót lub zmiana obrysu wpływająca na odległości od ścian wymaga nowego SVG i akceptacji. Zmiana samego wykończenia lub wnętrza w niezmienionym obrysie zachowuje zaakceptowaną pozycję i nie wymaga ponawiania pytania. Nigdy nie zapisuj `confirmed: true` bez rzeczywistej akceptacji.

Po zapisie odczytaj pliki z GitHuba i zweryfikuj wersję. Odpowiedź zakończ krótkim potwierdzeniem numeru wersji, linkiem do commita oraz podglądu `https://stefankot.github.io/mieszkanie-meble/`. Pokaż też wizualny podgląd samego zmienionego mebla na podstawie tej samej geometrii: użyj dostępnego interaktywnego podglądu lub wygenerowanego rysunku. Nie przedstawiaj wygenerowanej swobodnie ilustracji jako wiernego renderu wymiarowego. Jeżeli osadzenie podglądu 3D w tej rozmowie nie jest dostępne, powiedz to i podaj działający link do renderera, który sam odświeża modele.

Repozytorium jest publiczne — zapisuj tylko pliki związane z meblami i ich planem, bez danych logowania i prywatnej treści rozmowy. Okna uprawnień ChatGPT pozostają pod kontrolą użytkownika; prompt nie może ich wyłączać.
