/* Uchwyt przesuwania i obracania (TransformControls z three/addons) dla edytora.
   Moduł ładowany dopiero przy pierwszym użyciu — spacer bez edycji nie płaci za addon.
   Sterowanie kamerą jest blokowane na czas przeciągania, żeby gest nie obracał widoku. */
export async function utworzGizmo({THREE, camera, renderer, scena, przyZmianie, przyPrzeciaganiu}){
  const {TransformControls} = await import('three/addons/controls/TransformControls.js');
  const kontrolki = new TransformControls(camera, renderer.domElement);
  kontrolki.setSpace('world');
  kontrolki.setSize(0.8);
  const pomocnik = kontrolki.getHelper ? kontrolki.getHelper() : kontrolki;
  pomocnik.visible = false;
  scena.add(pomocnik);
  kontrolki.addEventListener('objectChange', () => przyZmianie?.(kontrolki.object));
  kontrolki.addEventListener('dragging-changed', e => przyPrzeciaganiu?.(e.value));
  return {
    kontrolki, pomocnik,
    dolacz(obiekt){
      if(!obiekt){ kontrolki.detach(); pomocnik.visible = false; return; }
      kontrolki.attach(obiekt);
      pomocnik.visible = true;
    },
    ustawTryb(tryb){ kontrolki.setMode(tryb === 'obroc' ? 'rotate' : 'translate'); },
    /* Przyciąganie: krok przesunięcia w cm sceny i obrotu w stopniach (null = płynnie). */
    ustawKrok(przesuniecie, obrotStopnie){
      kontrolki.translationSnap = przesuniecie ?? null;
      kontrolki.rotationSnap = obrotStopnie == null ? null : THREE.MathUtils.degToRad(obrotStopnie);
    },
    usun(){ kontrolki.detach(); scena.remove(pomocnik); kontrolki.dispose?.(); }
  };
}
