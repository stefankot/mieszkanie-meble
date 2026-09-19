import {semantyczneUV} from '../uv-drewna.js';
export async function przygotujPodglad(s){
 const spec=await fetch(new URL('./P5-wood-uv.json',import.meta.url)).then(r=>r.json());
 const entry=s.biblioteka.meble.get(spec.assetId);
 if(entry?.wersja!==spec.sourceVersion)throw Error('POC wymaga dokładnej wersji źródłowej');
 const parts=Object.entries(spec.parts).map(([id,uv])=>{
  const mesh=entry.korzen.getObjectByName(spec.assetId+':'+id);if(!mesh?.geometry)throw Error('Brak części '+id);
  const g=mesh.geometry.clone();semantyczneUV(g,uv);return {mesh,old:mesh.geometry,g};
 });
 return {parts:parts.length,ustaw(on){for(const p of parts)p.mesh.geometry=on?p.g:p.old;},dispose(){for(const p of parts){p.mesh.geometry=p.old;p.g.dispose();}}};
}
