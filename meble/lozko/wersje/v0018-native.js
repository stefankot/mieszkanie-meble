import { buildLozkoV0017 } from './v0017-native.js';

export const VERSION = 'v0018';

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0017',
  transform: 'horizontal mirror across local YZ plane (X -> -X)',
  note: 'Pełne odbicie lewo-prawo: strona poduszek i strona płyty perforowanej zamieniają się miejscami razem z elementami logicznie przypisanymi do stron. Pozycja korpusu, obrót, kolory, wnęki, drzwiczki, LED i mechanizmy pozostają bez zmian.'
});

function mirrorHorizontal({THREE, root}){
  const mirror = new THREE.Group();
  mirror.name = 'odbicie_poziome_v0018';
  mirror.scale.set(-1, 1, 1);

  // RectAreaLighty pozostają bezpośrednio pod rootem. Są wycentrowane w X=0,
  // więc po odbiciu ich pozycja się nie zmienia, a brak ujemnej skali na samym
  // świetle zachowuje jego kierunek i stabilność WebGPU.
  const children = [...root.children];
  root.add(mirror);
  for(const child of children){
    if(child === mirror || child.isLight) continue;
    mirror.add(child);
  }

  root.updateMatrixWorld(true);
  return mirror;
}

export function buildLozkoV0018({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  const built = buildLozkoV0017({THREE,placement});
  const root = built.korzen;

  mirrorHorizontal({THREE, root});

  root.userData.version = VERSION;
  root.userData.nativeOverrideVersion = VERSION;
  root.userData.design = {
    ...(root.userData.design || {}),
    horizontalMirror: {...DESIGN_PATCH}
  };
  root.userData.nativeModel = {
    ...(root.userData.nativeModel || {}),
    horizontalMirror: {
      axis: 'local X',
      matrix: 'scale(-1,1,1)',
      cushionsSideSwappedWithPegboard: true,
      lightsKeptUnmirroredAtRootBecauseCenteredX0: true
    },
    stairs: {
      ...(root.userData.nativeModel?.stairs || {}),
      wall: 'POKOJ-LOZKO-W3',
      wallClearance: 0,
      worldFootprintMm: {x:[2276,2876], z:[6810,7410]}
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0018};
