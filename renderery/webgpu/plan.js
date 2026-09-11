/* Geometria mieszkania z rzut_zp3.svg. Górna i środkowa część planu są
   odbite względem poprzedniej wersji; pokój z łóżkiem pozostaje bez zmian. */
export const APARTMENT_DATA={"height":250,"outer":[[0,0],[1006,0],[1006,514],[504,514],[504,756],[0,756]],"rooms":[{"id":"KUCHNIA","name":"Kuchnia","dimensions":"370 × 224 cm · 8,29 m²","polygon":[[612,15],[982,15],[982,239],[612,239]]},{"id":"WC","name":"WC","dimensions":"78 × 145 cm · 1,13 m²","polygon":[[522,15],[600,15],[600,160],[522,160]]},{"id":"LAZIENKA","name":"Łazienka","dimensions":"145 × 224 cm · 3,25 m²","polygon":[[369,15],[514,15],[514,239],[369,239]]},{"id":"SALON","name":"Salon","dimensions":"333 × 484 cm · 16,12 m²","polygon":[[24,15],[357,15],[357,499],[24,499]]},{"id":"POKOJ-9","name":"Pokój","dimensions":"370 × 245 cm · 9,07 m²","polygon":[[612,254],[982,254],[982,499],[612,499]]},{"id":"PRZEDPOKOJ","name":"Przedpokój","dimensions":"231 × 245 cm + nisza 78 × 94 cm · 6,39 m²","polygon":[[522,160],[600,160],[600,499],[369,499],[369,254],[522,254]]},{"id":"POKOJ-LOZKO","name":"Pokój","dimensions":"465 × 227 cm · 10,56 m²","polygon":[[24,514],[489,514],[489,741],[24,741]]}],"windows":[{"name":"Okno — kuchnia","rect":[982,100,24,136]},{"name":"Okno — pokój 9,07 m²","rect":[982,257,24,165]},{"name":"Okno — pokój 10,56 m²","rect":[0,551,24,138]},{"name":"Okno — salon, część północna","rect":[0,100,24,140],"sill":70,"head":240},{"name":"Okno — salon, część południowa","rect":[0,322,24,98],"sill":70,"head":240}],"doors":[{"name":"Drzwi balkonowe","rect":[0,240,24,82]},{"name":"Drzwi — pokój 10,56 m²","rect":[403,499,78,15]},{"name":"Drzwi wejściowe do mieszkania","rect":[510,499,82,15]},{"name":"Drzwi — kuchnia","rect":[600,158,12,80]},{"name":"Drzwi — pokój 9,07 m²","rect":[600,343,12,79]},{"name":"Drzwi — łazienka","rect":[514,160,8,79]},{"name":"Otwór drzwiowy — WC","rect":[522,150,78,20]},{"name":"Drzwi — salon","rect":[357,341,12,79]}],"shaft":[612,97,55,60],"balcony":[-100,15,100,484],"north":[34.2,-94],"assumptions":{"windowSill":120,"windowHeight":120,"doorHeight":205,"balconyDoorHeight":220,"balconyRailHeight":110,"year":2026}};
export function utworzPlan(THREE){
const APARTMENT=structuredClone(APARTMENT_DATA);
function insidePolygon(x,z,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
function inRect(x,z,r){return x>r[0]&&x<r[0]+r[2]&&z>r[1]&&z<r[1]+r[3];}
function roomAt(x,z){return APARTMENT.rooms.find(r=>insidePolygon(x,z,r.polygon));}
function roomCenter(room){
 const p=room.polygon;return new THREE.Vector3((Math.min(...p.map(a=>a[0]))+Math.max(...p.map(a=>a[0])))/2,0,(Math.min(...p.map(a=>a[1]))+Math.max(...p.map(a=>a[1])))/2);
}
const allOpenings=[...APARTMENT.windows.map(o=>({...o,sill:o.sill??120,head:o.head??240})),...APARTMENT.doors.map(o=>({...o,sill:0,head:o.name==='Drzwi balkonowe'?220:205}))];
const gridXs=new Set(APARTMENT.outer.map(p=>p[0])),gridZs=new Set(APARTMENT.outer.map(p=>p[1]));
for(const r of APARTMENT.rooms)for(const p of r.polygon){gridXs.add(p[0]);gridZs.add(p[1]);}
for(const o of [...allOpenings,{rect:APARTMENT.shaft}]){const [x,z,w,d]=o.rect;gridXs.add(x);gridXs.add(x+w);gridZs.add(z);gridZs.add(z+d);}
const xs=[...gridXs].sort((a,b)=>a-b),zs=[...gridZs].sort((a,b)=>a-b),ys=[...new Set([0,APARTMENT.height,...allOpenings.flatMap(o=>[o.sill,o.head])])].sort((a,b)=>a-b);
const NX=xs.length-1,NZ=zs.length-1,NY=ys.length-1;
const cells=new Uint8Array(NX*NZ*NY),wallBoxes=[];
const cellIndex=(x,y,z)=>(y*NZ+z)*NX+x;
const cellAt=(x,y,z)=>x<0||x>=NX||y<0||y>=NY||z<0||z>=NZ?0:cells[cellIndex(x,y,z)];
for(let j=0;j<NY;j++)for(let k=0;k<NZ;k++)for(let i=0;i<NX;i++){
 const x=(xs[i]+xs[i+1])/2,z=(zs[k]+zs[k+1])/2,y=(ys[j]+ys[j+1])/2;
 let solid=insidePolygon(x,z,APARTMENT.outer)&&!APARTMENT.rooms.some(r=>insidePolygon(x,z,r.polygon));
 if(inRect(x,z,APARTMENT.shaft))solid=true;
 if(allOpenings.some(o=>inRect(x,z,o.rect)&&y>=o.sill&&y<o.head))solid=false;
 if(solid){cells[cellIndex(i,j,k)]=1;wallBoxes.push(new THREE.Box3(new THREE.Vector3(xs[i],ys[j],zs[k]),new THREE.Vector3(xs[i+1],ys[j+1],zs[k+1])));}
}
// Emit only exposed faces of the exact rectilinear union. No internal partitions,
// duplicate coplanar ghost surfaces, or artificial grid edges enter the mesh.
const wallPositions=[];
function quad(a,b,c,d){wallPositions.push(...a,...b,...c,...a,...c,...d);}
for(let j=0;j<NY;j++)for(let k=0;k<NZ;k++)for(let i=0;i<NX;i++)if(cellAt(i,j,k)){
 const x=xs[i],X=xs[i+1],y=ys[j],Y=ys[j+1],z=zs[k],Z=zs[k+1];
 if(!cellAt(i-1,j,k))quad([x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]);
 if(!cellAt(i+1,j,k))quad([X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]);
 if(!cellAt(i,j-1,k))quad([x,y,Z],[x,y,z],[X,y,z],[X,y,Z]);
 if(!cellAt(i,j+1,k))quad([x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z]);
 if(!cellAt(i,j,k-1))quad([X,y,z],[x,y,z],[x,Y,z],[X,Y,z]);
 if(!cellAt(i,j,k+1))quad([x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]);
}
const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wallPositions,3));wallGeometry.computeVertexNormals();wallGeometry.computeBoundingBox();


/* ---------- ZAPYTANIA KOLIZYJNE ----------
   Wyłącznie nowe funkcje odczytu. Dane planu, siatka ścian i kolejność
   wierzchołków nie są tu ruszane — udostępniamy to, co i tak zostało
   policzone wyżej, żeby nawigacja nie musiała powtarzać tej logiki. */
function przedzial(tab, v){
  if(v < tab[0] || v >= tab[tab.length-1]) return -1;
  let lo = 0, hi = tab.length - 2;
  while(lo < hi){ const m = (lo + hi + 1) >> 1; if(tab[m] <= v) lo = m; else hi = m - 1; }
  return lo;
}
/* Czy punkt leży w bryle ściany (z uwzględnieniem otworów okiennych i drzwiowych). */
function czySciana(x, y, z){
  const i = przedzial(xs, x), j = przedzial(ys, y), k = przedzial(zs, z);
  if(i < 0 || j < 0 || k < 0) return false;
  return cells[cellIndex(i, j, k)] === 1;
}
/* Czy nad punktem jest podłoga, po której wolno chodzić (mieszkanie albo balkon). */
function czyPodloga(x, z){
  return insidePolygon(x, z, APARTMENT.outer) || inRect(x, z, APARTMENT.balcony);
}

  return {APARTMENT, wallGeometry, wallPositions, insidePolygon, roomAt, roomCenter,
          czySciana, czyPodloga, wallBoxes};
}
