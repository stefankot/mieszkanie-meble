/* Biały obrys jest tworzony tylko dla aktualnie wskazanego elementu.
   Geometrie krawędzi są cache'owane według współdzielonego BufferGeometry. */
export function utworzHoverOutline({THREE}){
  const cache = new WeakMap();
  const material = new THREE.LineBasicMaterial({color:0xffffff, transparent:true,
    opacity:.96, depthTest:false, depthWrite:false, toneMapped:false});
  let aktywny = null, linie = [];

  function wyczysc(){
    for(const linia of linie) linia.removeFromParent();
    linie = []; aktywny = null;
  }
  function ustaw(obiekt){
    if(obiekt === aktywny) return;
    wyczysc();
    if(!obiekt) return;
    aktywny = obiekt;
    obiekt.traverse?.(mesh => {
      if(!mesh.isMesh || !mesh.geometry || mesh.userData?.interactiveHoverOutline) return;
      let geo = cache.get(mesh.geometry);
      if(!geo){ geo = new THREE.EdgesGeometry(mesh.geometry, 24); cache.set(mesh.geometry, geo); }
      const linia = new THREE.LineSegments(geo, material);
      linia.name = 'Obrys interakcji';
      linia.userData.interactiveHoverOutline = true;
      linia.renderOrder = 10000;
      linia.scale.setScalar(1.002);
      mesh.add(linia); linie.push(linia);
    });
  }
  return {ustaw, wyczysc, get aktywny(){ return aktywny; }};
}
