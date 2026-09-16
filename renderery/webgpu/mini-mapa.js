const SVG_NS = 'http://www.w3.org/2000/svg';

const points = polygon => polygon.map(([x,z]) => `${x},${z}`).join(' ');
const finiteBox = b => !b.isEmpty() && [...b.min.toArray(),...b.max.toArray()].every(Number.isFinite);

function widoczny(korzen){
  for(let o=korzen;o;o=o.parent) if(o.visible===false) return false;
  return true;
}

function krotkaNazwa(nazwa){
  const slowa=String(nazwa || 'Mebel').trim().split(/\s+/);
  if(['nowa','nowy','nowe'].includes(slowa[0]?.toLowerCase())) slowa.shift();
  return slowa[0] || 'Mebel';
}

/* Jedno źródło danych dla obrysu i przycisku: wpis biblioteki mebli. Pokoje
   służą tylko jako tło, więc puste pomieszczenie nie dostaje znacznika. */
export function zbierzMebleMapy({THREE,biblioteka,nawigacja,pamiecKadrow}){
  const wynik=[];
  for(const [id,wpis] of biblioteka?.meble || []){
    const korzen=wpis?.korzen;
    if(!korzen || !widoczny(korzen)) continue;
    korzen.updateWorldMatrix(true,true);
    const obrys=new THREE.Box3().setFromObject(korzen);
    if(!finiteBox(obrys)) continue;
    let kadr=pamiecKadrow?.get(korzen);
    if(!kadr){
      kadr=nawigacja.znajdzKadrMebla(korzen);
      pamiecKadrow?.set(korzen,kadr);
    }
    wynik.push({id,nazwa:wpis.nazwa || id,korzen,obrys,kadr});
  }
  return wynik;
}

/* Lekki rzut z danych planu i rzeczywistych obwiedni mebli. To zwykłe SVG
   i przyciski HTML: nie tworzy drugiej sceny, kamery ani pętli renderowania. */
export function utworzMiniMape({THREE,kontener,plan,nawigacja,biblioteka,przyWyborze}){
  const mieszkanie=plan.APARTMENT;
  const xs=mieszkanie.outer.map(p=>p[0]);
  const zs=mieszkanie.outer.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs);
  const minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const margines=16;
  const viewMinX=minX-margines,viewMinZ=minZ-margines;
  const viewWidth=maxX-minX+margines*2,viewHeight=maxZ-minZ+margines*2;
  kontener.className='mini-mapa';
  kontener.setAttribute('aria-label','Mapa mebli i szybkiego przejścia');

  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox',`${viewMinX} ${viewMinZ} ${viewWidth} ${viewHeight}`);
  svg.setAttribute('aria-hidden','true');
  const outer=document.createElementNS(SVG_NS,'polygon');
  outer.setAttribute('points',points(mieszkanie.outer));
  outer.setAttribute('class','mini-mapa-obrys');
  svg.append(outer);
  for(const room of mieszkanie.rooms){
    const shape=document.createElementNS(SVG_NS,'polygon');
    shape.setAttribute('points',points(room.polygon));
    shape.setAttribute('class','mini-mapa-pokoj');
    svg.append(shape);
  }
  const furnitureLayer=document.createElementNS(SVG_NS,'g');
  furnitureLayer.setAttribute('class','mini-mapa-meble');
  svg.append(furnitureLayer);
  kontener.append(svg);

  const markers=document.createElement('div');
  markers.className='mini-mapa-punkty';
  kontener.append(markers);
  const pamiecKadrow=new WeakMap();

  function odswiez(){
    furnitureLayer.replaceChildren();
    markers.replaceChildren();
    const meble=zbierzMebleMapy({THREE,biblioteka,nawigacja,pamiecKadrow});
    for(const mebel of meble){
      const {min,max}=mebel.obrys;
      const shape=document.createElementNS(SVG_NS,'rect');
      shape.setAttribute('x',min.x);
      shape.setAttribute('y',min.z);
      shape.setAttribute('width',Math.max(2,max.x-min.x));
      shape.setAttribute('height',Math.max(2,max.z-min.z));
      shape.setAttribute('rx','4');
      shape.setAttribute('class',`mini-mapa-mebel${mebel.kadr.ok?'':' bez-kadru'}`);
      const title=document.createElementNS(SVG_NS,'title');
      title.textContent=mebel.nazwa;
      shape.append(title);
      furnitureLayer.append(shape);

      const label=document.createElementNS(SVG_NS,'text');
      label.setAttribute('x',(min.x+max.x)/2);
      label.setAttribute('y',(min.z+max.z)/2);
      label.setAttribute('class','mini-mapa-etykieta');
      label.textContent=krotkaNazwa(mebel.nazwa);
      furnitureLayer.append(label);

      /* Brak przycisku oznacza brak bezpiecznego miejsca, zamiast pozornie
         działającego znacznika. Obrys mebla pozostaje widoczny na rzucie. */
      if(!mebel.kadr.ok) continue;
      const {pozycja,cel}=mebel.kadr;
      const b=document.createElement('button');
      b.type='button';b.className='mini-mapa-punkt';
      b.style.left=`${(pozycja.x-viewMinX)/viewWidth*100}%`;
      b.style.top=`${(pozycja.z-viewMinZ)/viewHeight*100}%`;
      b.style.setProperty('--kierunek',`${Math.atan2(cel.z-pozycja.z,cel.x-pozycja.x)*180/Math.PI}deg`);
      b.innerHTML='<span aria-hidden="true">➤</span>';
      b.title=`Pokaż: ${mebel.nazwa}`;
      b.setAttribute('aria-label',`Pokaż mebel: ${mebel.nazwa}`);
      b.addEventListener('click',event=>{
        event.stopPropagation();
        przyWyborze?.(mebel.id);
        /* Kadr został już policzony i zweryfikowany przy budowie mapy. Dzięki
           temu klik jest natychmiastowy; ponowne szukanie uruchamiamy tylko,
           jeśli pozycję zajęła w międzyczasie ruchoma część mebla. */
        if(!nawigacja.ustawWidok(pozycja,cel)) nawigacja.kadrujMebel(mebel.korzen);
      });
      markers.append(b);
    }
    return meble;
  }

  let meble=odswiez();
  kontener.addEventListener('click',event=>{
    if(event.target.closest('.mini-mapa-punkt')) return;
    nawigacja.ustawTryb(nawigacja.TRYBY.PTAK);
  });
  return {odswiez(){meble=odswiez();return meble;},get liczbaPunktow(){return meble.filter(x=>x.kadr.ok).length;}};
}
