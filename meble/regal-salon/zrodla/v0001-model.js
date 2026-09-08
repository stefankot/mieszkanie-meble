/* Extracted verbatim from AI:START…AI:END of regal-salon_source_complete.html */
// Finalny regał 8 × 6, zgodny z projektem ALTARLIDEN-ready.
// Jednostki: cm. Ustawienie: Salon 333 × 484 cm, przy ścianie 333 cm
// na z=15, tej po stronie łazienki. Plecy regału są zlicowane z licem ściany.
const F = {
  name: 'REGAL_ALTARLIDEN_3074x2430',
  size: [307.4, 243, 42.3],
  place: [815.5, 36.3, 0],
  p: [],
  labels: {
    F_C1_B:'C1 · R1+R2', F_C2_B:'C2 · R1+R2', F_C3_B:'C3 · R1+R2', F_C4_B:'C4 · R1+R2',
    F_C5_B:'C5 · R1+R2', F_C6_B:'C6 · R1+R2', F_C7_B:'C7 · R1+R2', F_C8_B:'C8 · R1+R2',
    F_C1_M:'C1 · R3+R4', F_C2_M:'C2 · R3+R4', F_C7_M:'C7 · R3+R4', F_C8_M:'C8 · R3+R4',
    F_C1_T:'C1 · R5+R6', F_C2_T:'C2 · R5+R6', F_C3_T:'C3 · R5+R6', F_C4_T:'C4 · R5+R6',
    F_C5_T:'C5 · R5+R6', F_C6_T:'C6 · R5+R6', F_C7_T:'C7 · R5+R6', F_C8_T:'C8 · R5+R6'
  },
  i: [],

  extra(group, materials) {
    const { THREE, boxGeo, board } = materials;
    const root = group;

    const W = 307.4;
    const H = 243.0;
    const D = 42.0;
    const BACK_T = 0.3;
    const T = 1.8;
    const CLEAR_W = 36.4;
    const CLEAR_H = 38.4;
    const BAY_PITCH = CLEAR_W + T;
    const ROW_PITCH = CLEAR_H + T;
    const FRONT_W = 36.0;
    const FRONT_H = 78.2;
    const FRONT_T = 1.8;
    const FRONT_RECESS = 1.0;
    const FULL_SHELF_D = 42.0;
    const RECESSED_SHELF_D = 37.9;

    const LEFT = -W / 2;
    const BACK = -D / 2;
    const FRONT = D / 2;
    const DOOR_CENTER_Z = FRONT - FRONT_RECESS - FRONT_T / 2;
    const RECESSED_SHELF_Z = BACK + RECESSED_SHELF_D / 2;

    const MAT_BODY = board(0xd7bd98, 243, 42, 3);
    const MAT_EDGE = board(0xd2b58d, 78.2, 36, 5);
    const MAT_BACK = board(0xd9c4a5, 243, 115.5, 8);

    function addBox(parent, w, h, d, x, y, z, mat, name, bevel=0.10) {
      const m = new THREE.Mesh(boxGeo(w, h, d, bevel, 1), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      if (name) m.name = name;
      parent.add(m);
      return m;
    }

    function bayStart(c) { return LEFT + T + c * BAY_PITCH; }
    function bayCenter(c) { return bayStart(c) + CLEAR_W / 2; }
    function boardStartY(r) { return r * ROW_PITCH; }

    const backs = [
      {w:115.5, x:LEFT + 115.5/2, name:'plecy_B1'},
      {w:114.6, x:LEFT + 115.5 + 114.6/2, name:'plecy_B2'},
      {w:77.3,  x:LEFT + 115.5 + 114.6 + 77.3/2, name:'plecy_B3'}
    ];
    for (const b of backs) addBox(root, b.w, H, BACK_T, b.x, H/2, BACK - BACK_T/2, MAT_BACK, b.name, 0.03);

    for (let k=0;k<=8;k++) {
      const x = LEFT + k * BAY_PITCH + T/2;
      if (k === 4) {
        addBox(root, T, 82.2, D, x, 41.1, 0, MAT_BODY, 'pion_C4C5_dol');
        addBox(root, T, 82.2, D, x, 201.9, 0, MAT_BODY, 'pion_C4C5_gora');
      } else {
        addBox(root, T, H, D, x, H/2, 0, MAT_BODY, `pion_${k}`);
      }
    }

    const recessedLevels = new Set([1,3,5]);
    for (let level=0; level<=6; level++) {
      const y0 = boardStartY(level);
      const y = y0 + T/2;
      for (let c=0;c<8;c++) {
        if (level===3 && (c===3 || c===4)) continue;
        const middleOpen = level===3 && (c===2 || c===5);
        const needsRecess = recessedLevels.has(level) && !middleOpen;
        const d = needsRecess ? RECESSED_SHELF_D : FULL_SHELF_D;
        const z = needsRecess ? RECESSED_SHELF_Z : 0;
        addBox(root, CLEAR_W, T, d, bayCenter(c), y, z, MAT_BODY, `poziom_L${level}_C${c+1}`);
      }
    }

    const centralShelf = addBox(root, 20, T, 20, 0, 121.5, BACK + 10, MAT_BODY, 'polka_centralna_200x200');
    centralShelf.userData.mount = '2 ukryte wsporniki Ø8 L150 kotwione w ścianie';

    const MAT_LED = new THREE.MeshStandardMaterial({
      color: 0xfff1cf,
      emissive: 0xffd89c,
      emissiveIntensity: 2.2,
      roughness: 0.28,
      metalness: 0
    });

    function addLedBar(parent, w, d, x, y, z, name) {
      const h = 0.45;
      return addBox(parent, w, h, d, x, y, z, MAT_LED, name, 0.03);
    }

    function addAreaGlow(w, h, x, y, z, intensity, name) {
      const light = new THREE.RectAreaLight(0xffe3b3, intensity, w, h);
      light.position.set(x, y, z);
      light.lookAt(x, y - 12, z);
      light.name = name;
      root.add(light);
      return light;
    }

    const LED_INSET = 1.0;
    const LED_BAR_D = 1.2;
    const LED_BAR_Z = BACK + BACK_T + LED_BAR_D / 2;
    const LIGHT_Z = BACK + BACK_T + 0.9;
    const LIGHT_AIM_Z = FRONT - 3.0;

    function addSingleOpenBayLighting(c, rowTopIndex, idPrefix) {
      const x = bayCenter(c);
      const yTop = boardStartY(rowTopIndex + 1) - 0.55;
      addLedBar(root, CLEAR_W - 2*LED_INSET, LED_BAR_D, x, yTop, LED_BAR_Z, `${idPrefix}_listwa`);
      const light = addAreaGlow(CLEAR_W - 2.6, 9.5, x, yTop - 1.3, LIGHT_Z, 6.2, `${idPrefix}_swiatlo`);
      light.lookAt(x, yTop - 12, LIGHT_AIM_Z);
    }

    addSingleOpenBayLighting(2, 2, 'C3_R4');
    addSingleOpenBayLighting(2, 3, 'C3_R3');
    addSingleOpenBayLighting(5, 2, 'C6_R4');
    addSingleOpenBayLighting(5, 3, 'C6_R3');

    const CENTRAL_W = 74.6;
    const centralLedW = CENTRAL_W - 2*LED_INSET;

    addLedBar(root, centralLedW, 1.3, 0, 80.4 + CLEAR_H + T - 0.55, BACK + BACK_T + 0.65, 'CENTRUM_gorna_listwa');
    const centerTopLight = addAreaGlow(71.8, 10.5, 0, 118.2, LIGHT_Z, 8.8, 'CENTRUM_gorne_swiatlo');
    centerTopLight.lookAt(0, 103.0, LIGHT_AIM_Z);

    addLedBar(root, centralLedW, 1.3, 0, 80.4 + 0.55, BACK + BACK_T + 0.65, 'CENTRUM_dolna_listwa');
    const centerBottomLight = addAreaGlow(71.8, 8.5, 0, 84.8, LIGHT_Z, 5.0, 'CENTRUM_dolne_swiatlo');
    centerBottomLight.lookAt(0, 98.0, LIGHT_AIM_Z);

    function addDoor(id, c, centerY, hingeSide) {
      const x = bayCenter(c);
      const door = addBox(root, FRONT_W, FRONT_H, FRONT_T, x, centerY, DOOR_CENTER_Z, MAT_EDGE, id, 0.08);
      door.userData.insetGap = 0.2;
      door.userData.frontRecess = FRONT_RECESS;
      door.userData.hingeSide = hingeSide;
      const hingeX = x + (hingeSide === 'L' ? -FRONT_W/2 : FRONT_W/2);
      const angle = hingeSide === 'L' ? -105 : 105;
      F.i.push(['h', id, hingeX, centerY, DOOR_CENTER_Z, 0, 1, 0, angle]);
      return door;
    }

    for (let c=0;c<8;c++) {
      const hinge = c % 2 === 0 ? 'L' : 'R';
      addDoor(`F_C${c+1}_B`, c, 41.1, hinge);
      addDoor(`F_C${c+1}_T`, c, 201.9, hinge);
    }
    for (const c of [0,1,6,7]) {
      const hinge = c % 2 === 0 ? 'L' : 'R';
      addDoor(`F_C${c+1}_M`, c, 121.5, hinge);
    }

    root.userData.model = {
      overallCm:[W,H,D+BACK_T],
      carcassDepthCm:D,
      clearCellCm:[CLEAR_W,CLEAR_H],
      centralOpeningCm:[74.6,78.6],
      frontCm:[FRONT_W,FRONT_H,FRONT_T],
      frontRecessCm:FRONT_RECESS,
      material:'Kronospan 0375 Klon / wizualnie zbliżony',
      lighting:'Zintegrowane ciepłe listwy LED przy samych plecach w polach otwartych C3, C6; centralna wnęka 2×2 ma dokładnie dwa źródła: górne i dolne, oba przy plecach',
      placement:'Salon 333×484, ściana z=15 po stronie łazienki; plecy zlicowane z licem ściany'
    };

    return {
      afterPose(progress) {
        root.userData.motion = Object.fromEntries(Object.entries(progress));
      }
    };
  }
};
