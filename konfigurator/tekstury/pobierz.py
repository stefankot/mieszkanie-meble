#!/usr/bin/env python3
"""Pobiera tekstury z ambientCG (wszystkie na licencji CC0) do konfiguratora.

    python3 pobierz.py --szukaj wood           # pokaż, co jest do wzięcia
    python3 pobierz.py Wood062 Wood051         # pobierz wskazane materiały
    python3 pobierz.py --szukaj "wood veneer" --ile 3 --pobierz   # pobierz trzy pierwsze trafienia

Z paczki 1K-JPG wyjmuję kolor, chropowatość i mapę normalnych, resztę pomijam.
Wynik ląduje w tym katalogu, a `katalog.json` jest tym, co czyta konfigurator.
"""
import argparse, io, json, pathlib, sys, urllib.parse, urllib.request, zipfile

KATALOG = pathlib.Path(__file__).parent
API = 'https://ambientcg.com/api/v2/full_json'
# ambientCG odrzuca domyślne „Python-urllib”, więc podajemy się za przeglądarkę.
NAGLOWKI = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}


def otworz(adres):
    return urllib.request.urlopen(urllib.request.Request(adres, headers=NAGLOWKI))
MAPY = {'Color': 'kolor', 'Roughness': 'chropowatosc', 'NormalGL': 'normalne',
        'Metalness': 'metalicznosc'}   # metale bez tej mapy wychodzą matowe


def pobierz_json(parametry):
    with otworz(f'{API}?{urllib.parse.urlencode(parametry)}') as odp:
        return json.load(odp)


def szukaj(fraza, ile):
    dane = pobierz_json({'q': fraza, 'type': 'Material', 'limit': ile, 'include': 'imageData'})
    return [{'id': a['assetId'], 'nazwa': a.get('displayName') or a['assetId'],
             'podglad': (a.get('previewImage') or {}).get('256-PNG', '')} for a in dane.get('foundAssets', [])]


def pobierz(identyfikator):
    adres = f'https://ambientcg.com/get?file={identyfikator}_1K-JPG.zip'
    print(f'  pobieram {identyfikator} …', end=' ', flush=True)
    with otworz(adres) as odp:
        paczka = zipfile.ZipFile(io.BytesIO(odp.read()))
    pliki = {}
    for nazwa in paczka.namelist():
        for mapa, etykieta in MAPY.items():
            if nazwa.endswith(f'_{mapa}.jpg'):
                cel = KATALOG / f'{identyfikator}_{etykieta}.jpg'
                cel.write_bytes(paczka.read(nazwa))
                pliki[etykieta] = cel.name
    if 'kolor' not in pliki:
        print('brak mapy koloru — pomijam')
        return None
    print(', '.join(f'{k} {(KATALOG / v).stat().st_size // 1024} kB' for k, v in pliki.items()))
    return pliki


def wczytaj_katalog():
    plik = KATALOG / 'katalog.json'
    return json.loads(plik.read_text()) if plik.exists() else {'wersja': 1, 'tekstury': []}


def zapisz_katalog(katalog):
    (KATALOG / 'katalog.json').write_text(json.dumps(katalog, indent=2, ensure_ascii=False) + '\n')


def main():
    p = argparse.ArgumentParser(description='Tekstury CC0 z ambientCG')
    p.add_argument('identyfikatory', nargs='*', help='np. Wood062 Wood051')
    p.add_argument('--szukaj', help='fraza do wyszukania w ambientCG')
    p.add_argument('--ile', type=int, default=10)
    p.add_argument('--pobierz', action='store_true', help='pobierz znalezione, nie tylko wypisz')
    args = p.parse_args()

    znalezione = szukaj(args.szukaj, args.ile) if args.szukaj else []
    if args.szukaj and not args.pobierz:
        for z in znalezione:
            print(f"  {z['id']:<16} {z['nazwa']}")
        print('\nDodaj --pobierz, żeby je ściągnąć.')
        return

    do_pobrania = args.identyfikatory or [z['id'] for z in znalezione]
    if not do_pobrania:
        p.error('podaj identyfikatory albo --szukaj')

    nazwy = {z['id']: z['nazwa'] for z in znalezione}
    katalog = wczytaj_katalog()
    istniejace = {t['id']: t for t in katalog['tekstury']}
    for ident in do_pobrania:
        pliki = pobierz(ident)
        if not pliki:
            continue
        istniejace[ident] = {'id': ident, 'nazwa': nazwy.get(ident, ident),
                             'zrodlo': f'https://ambientcg.com/view?id={ident}',
                             'licencja': 'CC0', 'pliki': pliki}
    katalog['tekstury'] = sorted(istniejace.values(), key=lambda t: t['id'])
    zapisz_katalog(katalog)
    print(f"\nkatalog.json: {len(katalog['tekstury'])} tekstur")


if __name__ == '__main__':
    sys.exit(main())
