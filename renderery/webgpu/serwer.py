#!/usr/bin/env python3
"""Serwer podglądu z wyłączonym cache.

python3 -m http.server wysyła tylko Last-Modified, bez Cache-Control. Przeglądarka
stosuje wtedy cache heurystyczny i potrafi wziąć moduł ES z pamięci bez pytania
serwera. Ponieważ silnik.js importuje './nawigacja.js' bez numeru wersji, po
zmianie pliku strona dalej uruchamiała STARY moduł — zmiany wyglądały na niewdrożone.
"""
import functools, http.server, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123

class BezCache(http.server.SimpleHTTPRequestHandler):
    """Serwer deweloperski: bez cache + zapis plików przez POST.

    POST /zapisz?sciezka=webgpu/tekstury/plik.png z ciałem base64 zapisuje plik.
    Służy do wyciągania obrazów przetworzonych w przeglądarce (canvas potrafi
    kadrować, korygować i kodować, a Python tutaj nie ma biblioteki graficznej).
    Ograniczone do katalogu projektu i do rozszerzeń obrazów.
    """

    DOZWOLONE = ('.png', '.jpg', '.jpeg', '.webp', '.ktx2')

    def do_POST(self):
        import base64, os, urllib.parse
        rozbior = urllib.parse.urlparse(self.path)
        if rozbior.path != '/zapisz':
            self.send_error(404); return
        pyt = urllib.parse.parse_qs(rozbior.query)
        wzgl = (pyt.get('sciezka') or [''])[0]
        korzen = os.path.realpath(os.getcwd())
        cel = os.path.realpath(os.path.join(korzen, wzgl))
        if not cel.startswith(korzen + os.sep) or not cel.lower().endswith(self.DOZWOLONE):
            self.send_error(400, 'niedozwolona sciezka'); return
        dlugosc = int(self.headers.get('Content-Length') or 0)
        dane = self.rfile.read(dlugosc)
        if b',' in dane[:64] and dane[:5] == b'data:':
            dane = dane.split(b',', 1)[1]
        try:
            bajty = base64.b64decode(dane, validate=False)
        except Exception as e:
            self.send_error(400, 'zly base64'); return
        os.makedirs(os.path.dirname(cel), exist_ok=True)
        with open(cel, 'wb') as f:
            f.write(bajty)
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(('zapisano %d B -> %s' % (len(bajty), wzgl)).encode())

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass   # cisza w konsoli

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), BezCache) as s:
        print(f'Podgląd bez cache: http://localhost:{PORT}/webgpu/mieszkanie-webgpu-v1.html')
        s.serve_forever()
