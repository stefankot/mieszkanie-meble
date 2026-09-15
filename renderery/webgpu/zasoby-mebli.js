function materialy(material){
  return Array.isArray(material) ? material.filter(Boolean) : material ? [material] : [];
}

function teksturyMaterialu(material, wynik){
  for(const value of Object.values(material||{})){
    if(value?.isTexture) wynik.add(value);
  }
}

function uzywaneZasoby(scene){
  const geometrie=new Set(), materialySet=new Set(), tekstury=new Set();
  scene?.traverse?.(o=>{
    if(o.geometry) geometrie.add(o.geometry);
    for(const material of materialy(o.material)){
      materialySet.add(material);
      teksturyMaterialu(material,tekstury);
    }
  });
  if(scene?.background?.isTexture) tekstury.add(scene.background);
  if(scene?.environment?.isTexture) tekstury.add(scene.environment);
  return {geometrie,materialy:materialySet,tekstury};
}

export function przygotujKorzenMebla(root){
  const wynik={meshes:0,cullingEnabled:0,boundsComputed:0};
  root?.traverse?.(o=>{
    if(!o.isMesh) return;
    wynik.meshes++;
    if(o.geometry && !o.geometry.boundingSphere){
      o.geometry.computeBoundingSphere?.();
      if(o.geometry.boundingSphere) wynik.boundsComputed++;
    }
    o.frustumCulled=true;
    wynik.cullingEnabled++;
  });
  if(root?.userData) root.userData.resourcePreparation={...wynik};
  return wynik;
}

export function zwolnijNieUzywaneZasoby(root,scene){
  const active=uzywaneZasoby(scene);
  const stareGeometrie=new Set(), stareMaterialy=new Set(), stareTekstury=new Set();
  root?.traverse?.(o=>{
    if(o.geometry) stareGeometrie.add(o.geometry);
    for(const material of materialy(o.material)){
      stareMaterialy.add(material);
      teksturyMaterialu(material,stareTekstury);
    }
  });
  let geometries=0,materials=0,textures=0;
  for(const geometry of stareGeometrie){
    if(!active.geometrie.has(geometry)){ geometry.dispose?.(); geometries++; }
  }
  for(const material of stareMaterialy){
    if(!active.materialy.has(material)){ material.dispose?.(); materials++; }
  }
  for(const texture of stareTekstury){
    if(!active.tekstury.has(texture)){ texture.dispose?.(); textures++; }
  }
  return {geometries,materials,textures};
}
