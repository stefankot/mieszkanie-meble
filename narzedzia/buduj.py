"""Compile integration copies without changing any byte outside the AI section.
Usage: python3 narzedzia/buduj.py
Add a uniquely named trusted source HTML to renderery/zrodla, then run this file.
"""
from pathlib import Path
import hashlib, json, re, html, math

ROOT=Path(__file__).resolve().parents[1]
START=b'/* AI:START */';END=b'/* AI:END */'
def split(source):
    assert source.count(START)==1 and source.count(END)==1, 'Wymagana pojedyncza sekcja AI:START / AI:END.'
    pre,rest=source.split(START,1);ai,post=rest.split(END,1)
    return pre+START,ai,END+post
def write_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sha(b):return hashlib.sha256(b).hexdigest()

sources=sorted((ROOT/'renderery/zrodla').glob('*.html'))
assert sources,'Brak źródła renderera.'
first=sources[0].read_bytes();_,baseline,_=split(first)
adapter=(ROOT/'narzedzia/synchronizacja.js').read_bytes()
required=['const motions=','const motionButtons=','const pbrBindings=','function applyPose(', 'function poseHooks(', 'function cancelCameraMotion(', 'function stopTour(', 'function setWalk(', 'window.__viewer=']
versions=[]
for source in sources:
    original=source.read_bytes();pre,oldai,post=split(original)
    for item in required:
        assert item.encode() in post, f'{source.name}: niezgodny interfejs ({item}); potrzebny adapter, nie zmieniono silnika.'
    boot=b'''\nlet __mebleBootTries=0;\nfunction __mebleBoot(){\n if(!window.__viewer){if(++__mebleBootTries<120)setTimeout(__mebleBoot,500);return;}\n try{startFurnitureSync({THREE,F,furniture,scene,camera,controls,motions,progress,motionButtons,applyPose,poseHooks,finishObject,registerPBRMaterials,pbrBindings,invalidate,baseMaterial,boxGeo,stopTour,cancelCameraMotion,setWalk,isWalk:()=>walk});}\n catch(e){console.error('Biblioteka mebli:',e);const n=document.createElement('p');n.textContent='Biblioteka mebli: '+e.message;n.style='position:fixed;bottom:0;left:0;z-index:10099;background:white;color:red;padding:12px';document.body.append(n);}\n}\nsetTimeout(__mebleBoot,0);\n'''
    built=pre+baseline+b'\n'+adapter+boot+post
    bpre,_,bpost=split(built);assert bpre==pre and bpost==post
    destination=ROOT/'renderery'/source.name;destination.write_bytes(built)
    versions.append({'id':source.stem,'label':source.stem,'file':'renderery/'+source.name,'sha256':sha(built),'source':'renderery/zrodla/'+source.name,'sourceSha256':sha(original),'engineSha256':sha(pre+post),'integration':'mebel-sync/1'})
write_json(ROOT/'renderery/manifest.json',{'schemaVersion':1,'currentVersion':versions[-1]['id'],'versions':list(reversed(versions))})

# Coordinate data are copied from the supplied renderer; no new measurements.
a=json.loads(re.search(rb'const APARTMENT\s*=\s*(\{.*?\});',first,re.S).group(1))
ids=['KUCHNIA','WC','LAZIENKA','SALON','POKOJ-9','PRZEDPOKOJ','POKOJ-LOZKO']
rooms=[]
for room,rid in zip(a['rooms'],ids):
    polygon=[[x*10,z*10]for x,z in room['polygon']];walls=[]
    for i,(p,q)in enumerate(zip(polygon,polygon[1:]+polygon[:1]),1):
        walls.append({'id':f'{rid}-W{i}','fromMm':p,'toMm':q,'lengthMm':round(math.dist(p,q),3)})
    rooms.append({'id':rid,'name':room['name']+(' z łóżkiem' if rid=='POKOJ-LOZKO' else ''),'dimensions':room['dimensions'],'polygonMm':polygon,'walls':walls})
rooms[3]['walls'][3]['description']='Lewa długa ściana salonu: od strony łazienki i przedpokoju. Zawiera drzwi do salonu; sprawdź otwory w planie.'
rooms[3]['walls'][1]['description']='Prawa długa ściana salonu: okna i drzwi balkonowe.'
rooms[3]['walls'][0]['description']='Górna krótka ściana salonu na tym rysunku.'
rooms[3]['walls'][2]['description']='Dolna krótka ściana salonu na tym rysunku.'
plan={'schemaVersion':1,'units':'mm','coordinateSystem':'RH_Y_UP','svgAxes':'SVG x = scene X; SVG y = scene Z. Wysokość = scene Y. Dodatni obrót wokół Y odpowiada rotate(-rotationDeg) w SVG.','source':'Geometria APARTMENT z dostarczonego renderera. Nie jest nową inwentaryzacją pomiarową.','ceilingHeightMm':a['height']*10,'outerMm':[[x*10,z*10]for x,z in a['outer']],'rooms':rooms,'windows':[{'name':w['name'],'rectMm':[v*10 for v in w['rect']]}for w in a['windows']],'doors':[{'name':d['name'],'rectMm':[v*10 for v in d['rect']]}for d in a['doors']],'shaftRectMm':[v*10 for v in a['shaft']],'balconyRectMm':[v*10 for v in a['balcony']],'northVector':a['north']}
write_json(ROOT/'plan/mieszkanie.json',plan)
pol=lambda pts:' '.join(f'{x},{z}'for x,z in pts)
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="-600 -500 12200 8800" role="img" aria-labelledby="title desc">','<title id="title">Plan mieszkania — pomieszczenia i ściany</title>','<desc id="desc">Plan pochodzi z dostarczonego renderera. Jednostki współrzędnych: milimetry. Niebieskie otwory to okna, pomarańczowe to drzwi.</desc>','<rect x="-600" y="-500" width="12200" height="8800" fill="#f7f6f0"/>',f'<polygon points="{pol(plan["outerMm"])}" fill="#888a81"/>']
colors=['#e4edde','#f0e8dd','#dde9ed','#ede8d7','#e5e0ec','#e7e6df','#e6eada']
for room,color in zip(rooms,colors):
    pts=room['polygonMm'];xs=[p[0]for p in pts];zs=[p[1]for p in pts];cx=(min(xs)+max(xs))/2;cz=(min(zs)+max(zs))/2
    svg.append(f'<polygon points="{pol(pts)}" fill="{color}" stroke="#454b42" stroke-width="14"/>')
    svg.append(f'<text x="{cx}" y="{cz-45}" text-anchor="middle" font-family="sans-serif" font-size="130" font-weight="bold">{html.escape(room["name"])}</text>')
    svg.append(f'<text x="{cx}" y="{cz+115}" text-anchor="middle" font-family="sans-serif" font-size="90">{room["id"]}</text>')
    for wall in room['walls']:
        p,q=wall['fromMm'],wall['toMm'];x=(p[0]+q[0])/2;z=(p[1]+q[1])/2
        # Keep labels on the room side of the edge.
        dx,dz=q[0]-p[0],q[1]-p[1];length=math.hypot(dx,dz);x-=dz/length*125;z+=dx/length*125
        svg.append(f'<text x="{x}" y="{z}" text-anchor="middle" dominant-baseline="middle" fill="#4d5548" font-family="sans-serif" font-size="88">W{wall["id"].split("-W")[-1]}</text>')
for key,color in [('windows','#3e92b6'),('doors','#c68c47')]:
    for hole in plan[key]:
        x,z,w,h=hole['rectMm'];svg.append(f'<rect x="{x}" y="{z}" width="{w}" height="{h}" fill="{color}"><title>{html.escape(hole["name"])}</title></rect>')
x,z,w,h=plan['shaftRectMm'];svg.append(f'<rect x="{x}" y="{z}" width="{w}" height="{h}" fill="#888a81"/><text x="{x+w/2}" y="{z+h/2}" text-anchor="middle" font-family="sans-serif" font-size="80">SZACHT</text>')
svg.extend(['<g font-family="sans-serif" font-size="105" fill="#354235"><text x="-300" y="-220" font-size="165" font-weight="bold">Plan odniesienia do ustawiania mebli</text><text x="5400" y="5600">SALON-W4: długa ściana od strony</text><text x="5400" y="5780">łazienki i przedpokoju.</text><text x="5400" y="6180">Niebieski: okna · Pomarańczowy: drzwi</text><text x="5400" y="6460">SVG: X w prawo, Z w dół; Y = wysokość.</text><text x="5400" y="6740">Współrzędne w mm. Skala zgodna z rendererem.</text><text x="5400" y="7020">Nie zastępuje pomiaru mieszkania.</text></g>','<!-- FURNITURE_OVERLAY: wstaw tu grupę mebla, strzałkę frontu i wymiary przed potwierdzeniem. -->','</svg>'])
(ROOT/'plan/mieszkanie.svg').write_text('\n'.join(svg)+'\n')
print(json.dumps({'renderers':len(versions),'source_and_engine_preserved':True,'rooms':len(rooms),'walls':sum(len(r['walls'])for r in rooms)},ensure_ascii=False))
