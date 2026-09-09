/* P5: UV autorstwa modelu, w lokalnych mm. Bez projekcji world-space i losowania.
   Oś słoja tekstury jest jawna (U/V); V odpowiada aktualnemu oak_veneer_01. */
const FACES = [
  {id:'px',u:2,v:1,s:-1},{id:'nx',u:2,v:1,s:1},
  {id:'py',u:0,v:2,s:1},{id:'ny',u:0,v:2,s:-1},
  {id:'pz',u:0,v:1,s:1},{id:'nz',u:0,v:1,s:-1}
];
const axes=['x','y','z'];
export function semantyczneUV(g, spec){
  if(!spec) return false;
  const scale=typeof spec.textureScaleMm==='number'?[spec.textureScaleMm,spec.textureScaleMm]:spec.textureScaleMm;
  const offset=spec.grainOffset ?? [0,0];
  const sourceAxis=spec.textureGrainAxis ?? 'v';
  if(!['u','v'].includes(sourceAxis))throw Error('Niepoprawna oś słoja tekstury');
  if(!axes.includes(spec.grainDirection) || !Array.isArray(scale) || scale.length!==2 || !scale.every(x=>Number.isFinite(x)&&x>0) || !Array.isArray(offset) || offset.length!==2 || !offset.every(Number.isFinite)) throw Error('Niepoprawny kontrakt UV drewna');
  for(const key of ['veneerSheetId','veneerContinuityGroup']) if(spec[key]!==undefined && (typeof spec[key]!=='string'||!spec[key].length))throw Error('Niepoprawne '+key);
  const orientation=spec.faceOrientation ?? {};
  for(const [face,angle] of Object.entries(orientation)) if(!FACES.some(x=>x.id===face)||![0,90,180,270].includes(angle))throw Error('Niepoprawna orientacja ściany');
  if(!g.attributes.position || !g.attributes.uv || !g.groups.length || g.groups.some(x=>!FACES[x.materialIndex]))throw Error('Semantyczne UV wymagają geometrii box z sześcioma ścianami');
  const signature=JSON.stringify(spec);
  if(g.userData.semanticUVSignature===signature)return true;
  g.computeBoundingBox();const min=g.boundingBox.min.toArray().map(x=>x*10),max=g.boundingBox.max.toArray().map(x=>x*10);
  const pos=g.attributes.position,uv=g.attributes.uv;
  for(const group of g.groups){
    const face=FACES[group.materialIndex];
    const degrees=orientation[face.id] ?? ((axes[face.v]===spec.grainDirection)===(sourceAxis==='v')?0:90);
    const angle=degrees*Math.PI/180,c=Math.round(Math.cos(angle)),s=Math.round(Math.sin(angle));
    for(let k=group.start;k<group.start+group.count;k++){
      const i=g.index?g.index.getX(k):k;
      const point=[pos.getX(i)*10,pos.getY(i)*10,pos.getZ(i)*10];
      const u=face.s>0?point[face.u]-min[face.u]:max[face.u]-point[face.u];
      const v=point[face.v]-min[face.v];
      uv.setXY(i,(c*u-s*v+offset[0])/scale[0],(s*u+c*v+offset[1])/scale[1]);
    }
  }
  uv.needsUpdate=true;g.userData.semanticUVSignature=signature;
  g.userData.veneerSheetId=spec.veneerSheetId;g.userData.veneerContinuityGroup=spec.veneerContinuityGroup;
  return true;
}
