#!/usr/bin/env python3
"""Serwer konfiguratora: pliki statyczne bez cache + most do ambientCG.

    python3 konfigurator/serwer.py            # http://localhost:8012/konfigurator/szafa.html

Przeglądarka nie może sama odpytać ambientCG — ich API i pliki nie odsyłają nagłówka
CORS, więc to nie kwestia User-Agenta, tylko zasady „same origin”. Dlatego pyta nasz
serwer, a ten rozmawia z ambientCG po swojemu i oddaje wynik już z własnej domeny.

    GET /acg/szukaj?q=wood&ile=24   → lista materiałów z miniaturami
    GET /acg/pobierz?id=Wood062     → ściąga paczkę 1K-JPG, zapisuje mapy, dopisuje do katalogu
"""
import http.server, json, os, pathlib, sys, urllib.parse

KORZEN = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KORZEN / 'konfigurator' / 'tekstury'))
import pobierz as acg


class Obsluga(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def odpowiedz(self, dane, kod=200):
        tresc = json.dumps(dane, ensure_ascii=False).encode()
        self.send_response(kod)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(tresc)))
        self.end_headers()
        self.wfile.write(tresc)

    def do_GET(self):
        sciezka = urllib.parse.urlparse(self.path)
        if not sciezka.path.startswith('/acg/'):
            return super().do_GET()
        zapytanie = urllib.parse.parse_qs(sciezka.query)
        try:
            if sciezka.path == '/acg/szukaj':
                fraza = (zapytanie.get('q') or ['wood'])[0]
                ile = min(int((zapytanie.get('ile') or ['24'])[0]), 60)
                return self.odpowiedz({'materialy': acg.szukaj(fraza, ile)})
            if sciezka.path == '/acg/pobierz':
                ident = (zapytanie.get('id') or [''])[0]
                if not ident.isalnum():
                    return self.odpowiedz({'blad': 'niepoprawny identyfikator'}, 400)
                pliki = acg.pobierz(ident)
                if not pliki:
                    return self.odpowiedz({'blad': 'brak mapy koloru w paczce'}, 502)
                katalog = acg.wczytaj_katalog()
                wpisy = {t['id']: t for t in katalog['tekstury']}
                wpisy[ident] = {'id': ident, 'nazwa': ident, 'licencja': 'CC0',
                                'zrodlo': f'https://ambientcg.com/view?id={ident}', 'pliki': pliki}
                katalog['tekstury'] = sorted(wpisy.values(), key=lambda t: t['id'])
                acg.zapisz_katalog(katalog)
                return self.odpowiedz({'tekstura': wpisy[ident], 'katalog': katalog})
        except Exception as blad:                                  # sieć albo ambientCG padło
            return self.odpowiedz({'blad': str(blad)}, 502)
        self.odpowiedz({'blad': 'nieznana ścieżka'}, 404)

    def log_message(self, *a):
        if '/acg/' in (a[1] if len(a) > 1 else ''):
            super().log_message(*a)


if __name__ == '__main__':
    os.chdir(KORZEN)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8012
    print(f'konfigurator: http://localhost:{port}/konfigurator/szafa.html')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Obsluga).serve_forever()
