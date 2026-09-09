import {MeshPhysicalNodeMaterial} from 'three/webgpu';
/* Odwracalny POC jednego blatu. Wartości projektowe są w pliku JSON. */
export async function przygotujPodglad(s){
 const spec=await fetch(new URL('./P6-stal.json',import.meta.url)).then(r=>r.json());
 const entry=s.biblioteka.meble.get(spec.assetId);
 if(entry?.wersja!==spec.sourceVersion)throw Error('POC wymaga dokładnej wersji źródłowej');
 const mesh=entry.korzen.getObjectByName(spec.assetId+':'+spec.partId);
 if(!mesh?.geometry||Array.isArray(mesh.material))throw Error('Brak pojedynczej powierzchni blatu');
 const oldMaterial=mesh.material,oldGeometry=mesh.geometry;
 const geometry=oldGeometry.clone();
 // RoundedBox jest nieindeksowany. Indeks jeden-do-jednego zachowuje rozcięcia UV i normalne.
 if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
 geometry.computeTangents();
 if(!geometry.attributes.tangent?.array.every(Number.isFinite))throw Error('Niepoprawne tangenty');
 const material=new MeshPhysicalNodeMaterial();material.copy(oldMaterial);
 material.anisotropy=spec.materialOverride.anisotropy;
 material.anisotropyRotation=spec.materialOverride.anisotropyRotationDeg*Math.PI/180;
 return {spec,tangents:geometry.attributes.tangent.count,ustaw(on,rotationDeg=spec.materialOverride.anisotropyRotationDeg){material.anisotropyRotation=rotationDeg*Math.PI/180;mesh.geometry=on?geometry:oldGeometry;mesh.material=on?material:oldMaterial;},dispose(){mesh.geometry=oldGeometry;mesh.material=oldMaterial;geometry.dispose();material.dispose();}};
}
