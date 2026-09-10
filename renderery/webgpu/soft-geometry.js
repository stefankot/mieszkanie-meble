export const SOFT_REALIZER_VERSION = 'soft-curtain-1';

const geometrie = new Map();
const stany = new Map();
const round = n => Math.round(n * 1000) / 1000;

export function kluczMiekkiejGeometrii(spec){
  const d=spec.dimensions || {};
  return [spec.sourceVersion, spec.semanticType,
    `${round(d.widthCm)}x${round(d.heightCm)}x${round(d.depthCm)}`,
    String(spec.seed ?? 0), spec.realizerVersion || SOFT_REALIZER_VERSION].join('|');
}

function hash01(seed){
  let h=2166136261;
  for(const c of String(seed)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); }
  return (h>>>0)/4294967295;
}

export function ograniczMiekkaGeometrie(spec){
  const d={...spec.dimensions}, c=spec.constraints || {};
  if(!(d.widthCm>0 && d.heightCm>0 && d.depthCm>0)) throw Error('Soft geometry wymaga dodatnich dimensions w cm.');
  if(Number.isFinite(c.maxWidthCm)) d.widthCm=Math.min(d.widthCm,c.maxWidthCm);
  if(Number.isFinite(c.maxDepthCm)) d.depthCm=Math.min(d.depthCm,c.maxDepthCm);
  const floorYcm=Number.isFinite(c.floorYcm)?c.floorYcm:0;
  return {...spec, dimensions:d, constraints:{...c,floorYcm}};
}

/* Stan jest też cache'owany: wiele paneli o tych samych wymiarach korzysta z
   jednego, niemutowalnego zestawu transformacji open/closed. */
export function stanyMiekkiejGeometrii({closedWidthCm,openWidthCm}){
  if(!(closedWidthCm>0) || !(openWidthCm>=0)) throw Error('Niepoprawne szerokości stanu tkaniny.');
  const key=`${round(closedWidthCm)}|${round(openWidthCm)}`;
  if(!stany.has(key)) stany.set(key,Object.freeze({
    closed:Object.freeze({scaleX:1}),
    open:Object.freeze({scaleX:Math.max(.02,Math.min(1,openWidthCm/closedWidthCm))})
  }));
  return stany.get(key);
}

export function realizujMiekkaGeometrie(THREE, wejscie){
  const spec=ograniczMiekkaGeometrie(wejscie);
  const key=kluczMiekkiejGeometrii(spec);
  if(geometrie.has(key)) return geometrie.get(key);
  if(spec.semanticType!=='curtain') throw Error(`Nieobsługiwany semanticType "${spec.semanticType}".`);
  const {widthCm:w,heightCm:h,depthCm:depth}=spec.dimensions;
  const profile=spec.pleatProfile || {};
  const pleats=Math.max(1,Math.round(profile.count || 9));
  const amplitude=Math.min(depth/2,Math.max(0,profile.amplitudeCm ?? depth/2));
  const sag=Math.max(0,spec.gravitySagCm ?? .8);
  const phase=hash01(spec.seed)*Math.PI*2;
  const g=new THREE.PlaneGeometry(w,h,Math.max(24,pleats*8),12);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const u=(p.getX(i)+w/2)/w, v=(p.getY(i)+h/2)/h;
    const wave=Math.sin(u*Math.PI*2*pleats+phase);
    const lower=1-v;
    p.setZ(i,wave*amplitude*(.78+.22*v));
    /* Góra pozostaje przypięta do szyny. Niższe partie opadają, a clamp
       zatrzymuje je dokładnie na podłodze zamiast przepuszczać przez nią. */
    p.setY(i,Math.max(-h/2,p.getY(i)-sag*lower*(.25+.75*wave*wave)));
  }
  g.computeVertexNormals();
  g.userData={softGeometry:{key,realizerVersion:spec.realizerVersion||SOFT_REALIZER_VERSION,
    sourceVersion:spec.sourceVersion,semanticType:spec.semanticType,seed:spec.seed,
    dimensions:{...spec.dimensions},constraints:{...spec.constraints},pleatProfile:{...profile}}};
  geometrie.set(key,g);
  return g;
}

export function statystykiCacheMiekkiejGeometrii(){
  return {geometries:geometrie.size,states:stany.size,realizerVersion:SOFT_REALIZER_VERSION};
}
