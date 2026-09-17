/* Ekranowy obrys zaznaczenia z oficjalnego OutlineNode Three.js r185.
   Maska scala wszystkie siatki ruchomej części, więc widać wyłącznie jej
   sylwetkę — bez triangulacji i wewnętrznych krawędzi EdgesGeometry. */
export function utworzHoverOutline({outline, uniform, scena, camera}){
  const zaznaczone = [];
  const wezel = outline(scena, camera, {
    selectedObjects: zaznaczone,
    edgeThickness: uniform(3),
    edgeGlow: uniform(0),
    downSampleRatio: 1
  });
  let aktywny = null, trwaly = null;

  /* Najechanie ma pierwszeństwo; bez niego obrys zostaje na obiekcie zaznaczonym w edytorze (`ustawTrwaly`). */
  function ustaw(obiekt){
    const cel = obiekt || trwaly;
    if(cel === aktywny) return false;
    zaznaczone.length = 0;
    aktywny = cel || null;
    if(aktywny) zaznaczone.push(aktywny);
    return true;
  }
  function wyczysc(){ return ustaw(null); }
  function ustawTrwaly(obiekt){ trwaly = obiekt || null; return ustaw(null); }

  return {wezel, zaznaczone, ustaw, wyczysc, ustawTrwaly,
          get aktywny(){ return aktywny; }};
}
