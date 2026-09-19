#!/usr/bin/env python3
"""Pobiera modele z BlenderKit (wolne assety) i przygotowuje je dla konfiguratora.

    python3 pobierz.py --szukaj plant --ile 24        # pokaż, co jest do wzięcia
    python3 pobierz.py fafdbaf8-70f0-4965-a76d-5f096a22b7d5 --rola podloga
    python3 pobierz.py --szukaj vase --ile 6 --pobierz

API wyszukiwania jest publiczne, a link do pliku wydaje endpoint `downloads/<uuid>/`
po podaniu dowolnego `scene_uuid` — konto nie jest potrzebne. Część assetów ma gotowy
wariant glTF, reszta tylko `.blend`; ten drugi przechodzi przez Blendera.

Tak czy siak każdy model przechodzi przez Blendera jeszcze raz: skany po 70–300 tys.
trójkątów i tekstury 2K na półce, gdzie przedmiot zajmuje 30 pikseli, to czysty koszt.
Decymacja do budżetu i zmniejszenie tekstur zbijają jedno i drugie o rząd wielkości.
"""
import argparse, json, pathlib, subprocess, sys, urllib.parse, urllib.request, uuid

KATALOG = pathlib.Path(__file__).parent
API = 'https://www.blenderkit.com/api/v1'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
NAGLOWKI = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}
BUDZET = {'podloga': (40000, 1024), 'polka': (6000, 512)}      # (trójkąty, bok tekstury)

SKRYPT = r'''
import bpy, sys
wejscie, wyjscie, limit, tekstura = sys.argv[-4:]
limit, tekstura = int(limit), int(tekstura)
if wejscie.endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=wejscie)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=wejscie)
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'EMPTY'):
        bpy.data.objects.remove(o, do_unlink=True)      # kamery i światła assetu tylko przeszkadzają
siatki = [o for o in bpy.data.objects if o.type == 'MESH']
# Subdivision potrafi pomnożyć siatkę przy eksporcie, więc najpierw ją przycinam,
# a trójkąty liczę na siatce PO modyfikatorach — inaczej decymacja liczy z sufitu.
for o in siatki:
    for m in o.modifiers:
        if m.type == 'SUBSURF':
            m.levels = m.render_levels = min(m.render_levels, 1)
def policz():
    dg = bpy.context.evaluated_depsgraph_get()
    razem = 0
    for o in siatki:
        siatka = o.evaluated_get(dg).to_mesh()
        siatka.calc_loop_triangles()
        razem += len(siatka.loop_triangles)
        o.evaluated_get(dg).to_mesh_clear()
    return razem
trojkaty = policz()
if trojkaty > limit:
    for o in siatki:
        o.modifiers.new('decymacja', 'DECIMATE').ratio = max(0.02, limit / trojkaty)
    print('PO DECYMACJI', policz())
for obraz in bpy.data.images:
    if obraz.size[0] > tekstura:
        obraz.scale(tekstura, max(1, int(obraz.size[1] * tekstura / obraz.size[0])))
bpy.ops.export_scene.gltf(filepath=wyjscie, export_format='GLB', export_apply=True,
                          export_image_format='JPEG', export_jpeg_quality=82)
print('TROJKATY', trojkaty)
'''


def otworz(adres):
    return urllib.request.urlopen(urllib.request.Request(adres, headers=NAGLOWKI), timeout=180)


def pobierz_json(adres):
    with otworz(adres) as odp:
        return json.load(odp)


def szukaj(zapytanie, ile):
    adres = f'{API}/search/?query={urllib.parse.quote(zapytanie)}&page_size={ile}'
    return pobierz_json(adres).get('results', [])


def opis(asset):
    p = asset.get('dictParameters') or {}
    wymiary = [round((p.get(f'boundBoxMax{o}', 0) - p.get(f'boundBoxMin{o}', 0)) * 1000)
               for o in 'XYZ']
    return {'id': asset['assetBaseId'], 'nazwa': asset.get('name', '').strip(),
            'autor': (asset.get('author') or {}).get('fullName', ''),
            'licencja': asset.get('license', ''), 'zrodlo': f"https://www.blenderkit.com/asset-gallery-detail/{asset['assetBaseId']}/",
            'wymiaryMm': wymiary, 'trojkatyZrodla': p.get('faceCountRender') or p.get('faceCount') or 0,
            'podglad': asset.get('thumbnailMiddleUrl') or asset.get('thumbnailSmallUrl') or ''}


def plik_assetu(asset):
    """Najtańsze źródło: gotowy glTF, a gdy go nie ma — najlżejszy .blend."""
    kolejnosc = ['gltf', 'resolution_0_5K', 'resolution_1K', 'blend']
    pliki = {f['fileType']: f for f in asset.get('files', [])}
    for rodzaj in kolejnosc:
        if rodzaj in pliki:
            adres = pobierz_json(f"{pliki[rodzaj]['downloadUrl']}?scene_uuid={uuid.uuid4()}")
            return rodzaj, adres['filePath']
    return None, None


def pobierz(identyfikator, rola):
    wyniki = szukaj(f'asset_base_id:{identyfikator} asset_type:model', 1)
    if not wyniki:
        print(f'  {identyfikator}: nic takiego nie ma')
        return None
    asset = wyniki[0]
    wpis = opis(asset)
    rodzaj, adres = plik_assetu(asset)
    if not adres:
        print(f"  {wpis['nazwa']}: brak pliku do pobrania")
        return None
    surowy = KATALOG / ('.surowy.glb' if rodzaj == 'gltf' else '.surowy.blend')
    with otworz(adres) as odp:
        surowy.write_bytes(odp.read())
    limit, tekstura = BUDZET[rola]
    cel = KATALOG / f'{identyfikator}.glb'
    skrypt = KATALOG / '.blender.py'
    skrypt.write_text(SKRYPT)
    wynik = subprocess.run([BLENDER, '-b', '--factory-startup', '-noaudio', '-P', str(skrypt), '--',
                            str(surowy), str(cel), str(limit), str(tekstura)], capture_output=True, text=True)
    surowy.unlink(missing_ok=True)
    skrypt.unlink(missing_ok=True)
    if not cel.exists():
        print(f"  {wpis['nazwa']}: Blender nie wypluł pliku\n{wynik.stderr[-500:]}")
        return None
    if wpis['podglad']:
        try:
            with otworz(wpis['podglad']) as odp:
                (KATALOG / f'{identyfikator}.jpg').write_bytes(odp.read())
            wpis['podglad'] = f'{identyfikator}.jpg'
        except Exception:
            wpis['podglad'] = ''
    wpis.update({'plik': cel.name, 'rola': rola, 'budzetTrojkatow': limit, 'zrodloPliku': rodzaj})
    w = wpis['wymiaryMm']
    print(f"  {wpis['nazwa']}: {cel.stat().st_size // 1024} kB, {w[0]}×{w[1]}×{w[2]} mm, rola {rola}")
    return wpis


def main():
    p = argparse.ArgumentParser(description='Modele z BlenderKit')
    p.add_argument('identyfikatory', nargs='*', help='assetBaseId, np. fafdbaf8-70f0-4965-a76d-5f096a22b7d5')
    p.add_argument('--szukaj', help='fraza do wyszukania w BlenderKit')
    p.add_argument('--ile', type=int, default=20)
    p.add_argument('--rola', choices=['polka', 'podloga'], default='polka')
    p.add_argument('--pobierz', action='store_true', help='pobierz znalezione, nie tylko wypisz')
    args = p.parse_args()

    znalezione = szukaj(f'{args.szukaj} asset_type:model is_free:True', args.ile) if args.szukaj else []
    if args.szukaj and not args.pobierz:
        for a in znalezione:
            o = opis(a)
            w = o['wymiaryMm']
            print(f"  {o['id']}  {o['nazwa'][:34]:36} {w[0]}×{w[1]}×{w[2]} mm  {o['trojkatyZrodla']} tri  {o['licencja']}")
        print('\nDodaj --pobierz, żeby je ściągnąć.')
        return

    do_pobrania = args.identyfikatory or [a['assetBaseId'] for a in znalezione]
    if not do_pobrania:
        p.error('podaj identyfikatory albo --szukaj')

    plik = KATALOG / 'katalog.json'
    katalog = json.loads(plik.read_text()) if plik.exists() else {'wersja': 2, 'modele': []}
    istniejace = {m['id']: m for m in katalog['modele']}
    for ident in do_pobrania:
        wpis = pobierz(ident, args.rola)
        if wpis:
            istniejace[ident] = wpis
    katalog['modele'] = sorted(istniejace.values(), key=lambda m: (m['rola'], m['nazwa']))
    plik.write_text(json.dumps(katalog, indent=2, ensure_ascii=False) + '\n')
    print(f"\nkatalog.json: {len(katalog['modele'])} modeli")


if __name__ == '__main__':
    sys.exit(main())
