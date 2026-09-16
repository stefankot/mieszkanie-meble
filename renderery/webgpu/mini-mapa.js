const SVG_NS = 'http://www.w3.org/2000/svg';

const points = polygon => polygon.map(([x,z]) => `${x},${z}`).join(' ');

/* Lekki rzut z danych planu. To zwykłe SVG i przyciski HTML: nie tworzy
   drugiej sceny, kamery ani przebiegu renderera. */
export function utworzMiniMape({kontener, plan, nawigacja}){
  const mieszkanie = plan.APARTMENT;
  const xs = mieszkanie.outer.map(p => p[0]);
  const zs = mieszkanie.outer.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const width = maxX-minX, height = maxZ-minZ;
  kontener.className = 'mini-mapa';
  kontener.setAttribute('aria-label','Mapa szybkiego przejścia');

  const svg = document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox',`${minX-16} ${minZ-16} ${width+32} ${height+32}`);
  svg.setAttribute('aria-hidden','true');
  const outer = document.createElementNS(SVG_NS,'polygon');
  outer.setAttribute('points',points(mieszkanie.outer));
  outer.setAttribute('class','mini-mapa-obrys');
  svg.append(outer);
  for(const room of mieszkanie.rooms){
    const shape = document.createElementNS(SVG_NS,'polygon');
    shape.setAttribute('points',points(room.polygon));
    shape.setAttribute('class','mini-mapa-pokoj');
    svg.append(shape);
  }
  kontener.append(svg);

  const markers = document.createElement('div');
  markers.className = 'mini-mapa-punkty';
  const mapPoints = nawigacja.punktyMapy();
  mapPoints.forEach(punkt => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mini-mapa-punkt';
    b.style.left = `${(punkt.pozycja.x-minX)/width*100}%`;
    b.style.top = `${(punkt.pozycja.z-minZ)/height*100}%`;
    b.style.setProperty('--kierunek',`${punkt.kat*180/Math.PI}deg`);
    b.innerHTML = '<span aria-hidden="true">➤</span>';
    b.title = `Przejdź: ${punkt.nazwa}`;
    b.setAttribute('aria-label',`Przejdź do pomieszczenia: ${punkt.nazwa}`);
    b.addEventListener('click',event => {
      event.stopPropagation();
      nawigacja.teleportujDoPokoju(punkt.index);
    });
    markers.append(b);
  });
  kontener.append(markers);
  kontener.addEventListener('click', event => {
    if(event.target.closest('.mini-mapa-punkt')) return;
    nawigacja.ustawTryb(nawigacja.TRYBY.PTAK);
  });
  return {liczbaPunktow:mapPoints.length};
}
