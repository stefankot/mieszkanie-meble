// Wyłącznie jawny podgląd diagnostyczny; nie zapisuje danych ani manifestu.
export async function przygotujPodglad(s){
 const fixture=await fetch(new URL('./P3-regal-przy-lozku.json',import.meta.url)).then(r=>r.json());
 const root=s.biblioteka.meble.get(fixture.assetId)?.korzen;
 if(!root) throw Error('Brak hero mebla');
 const geometrie=[];
 for(const p of fixture.model.parts){
  if(p.type!=='box')continue;
  const o=root.getObjectByName(fixture.assetId+':'+p.id);
  if(!o?.geometry)throw Error('Brak semantic ID '+p.id);
  const old=o.geometry;
  const g=new s.THREE.BoxGeometry(...p.sizeMm.map(x=>x/10));
  const uv=old.userData.uvSkala;
  if(uv){
   const ref=new s.THREE.RoundedBoxGeometry(...p.sizeMm.map(x=>x/10),3,Math.max((p.bevelMm||0)/10,.22));
   if(ref.attributes.uv.count!==old.attributes.uv.count){ref.dispose();g.dispose();throw Error('Niezgodna geometria odniesienia '+p.id);}
   const [su,sv,dir,lu,lv]=uv;const vertical=dir==='pion';
   const project=(u,v)=>[(vertical?v*sv:u*su)*lu,(vertical?u*su:v*sv)*lv];
   const a=project(ref.attributes.uv.getX(0),ref.attributes.uv.getY(0));
   const offset=[old.attributes.uv.getX(0)-a[0],old.attributes.uv.getY(0)-a[1]];
   for(let i=0;i<g.attributes.uv.count;i++){const v=project(g.attributes.uv.getX(i),g.attributes.uv.getY(i));g.attributes.uv.setXY(i,v[0]+offset[0],v[1]+offset[1]);}
   g.attributes.uv.needsUpdate=true;ref.dispose();
  }
  geometrie.push({o,old,g});
 }
 const view=s.nawigacja.kadrujMebel(root);
 return {count:geometrie.length,view,ustaw(on){for(const x of geometrie)x.o.geometry=on?x.g:x.old;s.renderer.shadowMap.needsUpdate=true;s.scene.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.needsUpdate=true;});},dispose(){for(const x of geometrie){x.o.geometry=x.old;x.g.dispose();}}};
}
