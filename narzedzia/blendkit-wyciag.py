# Wyciąga mapy PBR z materiału Blendkit (.blend) do katalogu wyjściowego.
# Uruchamiane przez `narzedzia/blendkit.mjs`:  blender -b <plik.blend> -P ten_plik -- <katalog_wyjsciowy>
# Blender chodzi bez okna (-b). Obrazy zapisujemy w oryginalnej postaci (bez rekompresji);
# EXR/TIFF przechodzą na PNG 16-bit, bo koder KTX2 czyta tylko PNG/JPG.
# Materiały Blendkit bywają mieszane (PBR + proceduralne), więc obrazu do gniazda nie bierzemy „pierwszego
# z brzegu” — kandydatów punktujemy po przestrzeni barw, nazwie pliku, rodzaju węzła i odległości w grafie.
import bpy, json, os, sys, shutil

wyjscie = sys.argv[sys.argv.index('--') + 1:][0]
os.makedirs(wyjscie, exist_ok=True)

PRZELOTOWE = {'NORMAL_MAP', 'BUMP', 'DISPLACEMENT', 'GAMMA', 'BRIGHTCONTRAST', 'HUE_SAT', 'CURVE_RGB',
              'MAPPING', 'CLAMP', 'VALTORGB', 'MIX_RGB', 'MIX', 'MATH', 'INVERT', 'SEPARATE_COLOR',
              'SEPRGB', 'SEPARATE_RGB', 'REROUTE', 'GROUP', 'NORMAL', 'VECT_MATH', 'COMBINE_COLOR'}
KANALY = {'Red': 'r', 'Green': 'g', 'Blue': 'b', 'R': 'r', 'G': 'g', 'B': 'b'}
SLOWA = {
    'kolor': ('diffuse', 'albedo', 'basecolor', 'base_color', 'color', 'col', 'diff'),
    'chropowatosc': ('rough', 'gloss', 'spec'),
    'metalicznosc': ('metal', 'metallic'),
    'normalna': ('normal', 'nor_', 'nrm', '_nor', 'normalmap'),
    'wysokosc': ('displacement', 'disp', 'height', 'bump'),
    'ao': ('ao', 'occlusion', 'ambient')
}


def kandydaci(gniazdo, stan=None, odwiedzone=None, glebokosc=0):
    """Wstecz po linkach: zwraca wszystkie osiągalne węzły obrazu z kontekstem drogi."""
    stan = stan or {'odwrocona': False, 'kanal': None, 'przezBump': False, 'przezNormalMap': False}
    if glebokosc > 12 or not gniazdo.links:
        return []
    odwiedzone = odwiedzone if odwiedzone is not None else set()
    wynik = []
    for link in gniazdo.links:
        n = link.from_node
        klucz = (n.as_pointer(), glebokosc)
        if klucz in odwiedzone:
            continue
        odwiedzone.add(klucz)
        if n.type == 'TEX_IMAGE' and n.image:
            wynik.append(dict(stan, node=n, glebokosc=glebokosc, nazwa=n.image.name,
                              srgb=n.image.colorspace_settings.name.lower().startswith('srgb')))
            continue
        if n.type not in PRZELOTOWE:
            continue
        nowy = dict(stan)
        if n.type == 'INVERT':
            nowy['odwrocona'] = not nowy['odwrocona']
        if n.type == 'MATH' and n.operation == 'SUBTRACT' and abs(n.inputs[0].default_value - 1.0) < 1e-6:
            nowy['odwrocona'] = not nowy['odwrocona']
        if n.type in ('SEPARATE_COLOR', 'SEPRGB', 'SEPARATE_RGB'):
            nowy['kanal'] = KANALY.get(link.from_socket.name, nowy['kanal'])
        if n.type == 'NORMAL_MAP':
            nowy['przezNormalMap'] = True
        for wejscie in n.inputs:
            if wejscie.type not in ('VALUE', 'RGBA', 'VECTOR'):
                continue
            stanWejscia = dict(nowy, przezBump=nowy['przezBump'] or (n.type == 'BUMP' and wejscie.name == 'Height'))
            wynik += kandydaci(wejscie, stanWejscia, odwiedzone, glebokosc + 1)
    return wynik


def ocena(rodzaj, k):
    nazwa = k['nazwa'].lower()
    punkty = -k['glebokosc']                                  # bliżej gniazda = pewniej
    if any(s in nazwa for s in SLOWA[rodzaj]):
        punkty += 6
    for inny, slowa in SLOWA.items():
        if inny != rodzaj and any(s in nazwa for s in slowa) and not any(s in nazwa for s in SLOWA[rodzaj]):
            punkty -= 5
    punkty += (5 if k['srgb'] else -8) if rodzaj == 'kolor' else (-3 if k['srgb'] else 3)
    if rodzaj == 'wysokosc' and k['przezBump']:
        punkty += 5
    if rodzaj == 'normalna':
        punkty += 5 if k['przezNormalMap'] else -5           # bez węzła Normal Map to raczej bump
    return punkty


def zapisz(obraz, nazwaDocelowa):
    """Zapis bez utraty danych; formaty spoza PNG/JPG idą przez Blendera na PNG 16-bit."""
    rozszerzenie = os.path.splitext(bpy.path.basename(obraz.filepath_raw or obraz.name))[1].lower()
    if rozszerzenie in ('.png', '.jpg', '.jpeg'):
        sciezka = os.path.join(wyjscie, nazwaDocelowa + rozszerzenie)
        if obraz.packed_file:
            with open(sciezka, 'wb') as f:
                f.write(obraz.packed_file.data)
            return os.path.basename(sciezka)
        zrodlo = bpy.path.abspath(obraz.filepath_raw)
        if os.path.exists(zrodlo):
            shutil.copyfile(zrodlo, sciezka)
            return os.path.basename(sciezka)
    sciezka = os.path.join(wyjscie, nazwaDocelowa + '.png')
    scena = bpy.context.scene
    scena.view_settings.view_transform = 'Standard'
    scena.view_settings.look = 'None'
    scena.view_settings.exposure = 0
    scena.view_settings.gamma = 1
    scena.render.image_settings.file_format = 'PNG'
    scena.render.image_settings.color_mode = 'RGB'
    scena.render.image_settings.color_depth = '16'
    try:
        obraz.save_render(filepath=sciezka, scene=scena)
        return os.path.basename(sciezka)
    except Exception as e:
        print('BLAD zapisu', obraz.name, e)
        return None


def materialGlowny():
    kandydaty = [m for m in bpy.data.materials if m.use_nodes and m.node_tree]
    if not kandydaty:
        return None
    return max(kandydaty, key=lambda m: sum(1 for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image))


mat = materialGlowny()
raport = {'material': mat.name if mat else None, 'mapy': {}, 'pominiete': [], 'ostrzezenia': []}
if mat:
    drzewo = mat.node_tree
    pbsdf = next((n for n in drzewo.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    wyjscieMat = next((n for n in drzewo.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    gniazda = []
    if pbsdf:
        for wejscie, rodzaj in (('Base Color', 'kolor'), ('Roughness', 'chropowatosc'),
                                ('Metallic', 'metalicznosc'), ('Normal', 'normalna')):
            if wejscie in pbsdf.inputs:
                gniazda.append((rodzaj, pbsdf.inputs[wejscie]))
    if wyjscieMat and 'Displacement' in wyjscieMat.inputs:
        gniazda.append(('wysokosc', wyjscieMat.inputs['Displacement']))

    # Normalna bez węzła Normal Map to w praktyce bump — wtedy ten sam obraz próbujemy jako wysokość.
    propozycje = []
    for rodzaj, gniazdo in gniazda:
        for k in kandydaci(gniazdo):
            propozycje.append((ocena(rodzaj, k), rodzaj, k))
        if rodzaj == 'kolor':
            for k in kandydaci(gniazdo):
                propozycje.append((ocena('ao', k) - 2, 'ao', k))      # AO bywa mnożone w barwę
        if rodzaj == 'normalna':
            for k in kandydaci(gniazdo):
                propozycje.append((ocena('wysokosc', k), 'wysokosc', k))

    zajete_rodzaje, zajete_obrazy = set(), set()
    for punkty, rodzaj, k in sorted(propozycje, key=lambda p: -p[0]):
        if rodzaj in zajete_rodzaje or punkty < 0:
            continue
        odcisk = (k['nazwa'], k['kanal'])
        if odcisk in zajete_obrazy:
            continue
        plik = zapisz(k['node'].image, rodzaj)
        if not plik:
            continue
        zajete_rodzaje.add(rodzaj)
        zajete_obrazy.add(odcisk)
        raport['mapy'][rodzaj] = {'plik': plik, 'odwrocona': k['odwrocona'], 'kanal': k['kanal'],
                                  'rozmiar': list(k['node'].image.size), 'zrodlo': k['nazwa'], 'punkty': punkty}
    uzyte = {w['zrodlo'] for w in raport['mapy'].values()}
    raport['pominiete'] = sorted({n.image.name for n in drzewo.nodes if n.type == 'TEX_IMAGE' and n.image} - uzyte)
    if 'kolor' not in raport['mapy']:
        raport['ostrzezenia'].append('brak wiarygodnej mapy barwy (materiał proceduralny albo nietypowy graf)')

print('###RAPORT###' + json.dumps(raport))
