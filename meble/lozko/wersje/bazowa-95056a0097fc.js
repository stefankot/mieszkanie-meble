const F = {
  name: 'LOZKO_POD_OKNEM',
  size: [227, 250, 163.6],
  place: [125.8, 627.5, 90],
  p: [],
  labels: {lift:'Materac', sideLift:'Schowek boczny'},
  i: [
    // główna klapa: zawias przy oknie, otwieranie w stronę pokoju
    ['h', 'lift', 0, 76, -80, -1, 0, 0, 54, [0, 0, 52]],

    // schowek boczny przy SPF
    ['h', 'sideLift', -111.7, 81, 0, 0, 0, 1, 78, [0, 0, 0]]
  ],

  extra(group, materials) {
    const { THREE, boxGeo, board, pegMaterial } = materials;
    const root = group;

    // =========================================================
    // WYMIARY GŁÓWNE
    // =========================================================

    const ROOM_H = 250;

    const BED_W = 227;
    const BED_D = 163.6;
    const T = 1.8;

    const RIM_TOP = 81;      // górna krawędź korpusu
    const DECK_TOP = 76;     // góra platformy pod materacem
    const DECK_T = 2.4;

    const MAT_W = 200;
    const MAT_D = 160;
    const MAT_H = 14;
    const MAT_TOP = 90;      // finalny wierzch materaca
    const MAT_RECESS = 5;    // wpuszczenie

    const INNER_W = BED_W - 2 * T;          // 223.4
    const SIDE_ZONE_W = INNER_W - MAT_W;    // 23.4

    const X_LEFT_OUT = -BED_W / 2;
    const X_RIGHT_OUT = BED_W / 2;
    const Z_BACK_OUT = -BED_D / 2;
    const Z_FRONT_OUT = BED_D / 2;

    const X_LEFT_IN = X_LEFT_OUT + T;       // -111.7
    const X_RIGHT_IN = X_RIGHT_OUT - T;     //  111.7
    const Z_BACK_IN = Z_BACK_OUT + T;       //  -80
    const Z_FRONT_IN = Z_FRONT_OUT - T;     //   80

    // materac dosunięty do prawej ściany
    const X_MAT_LEFT = X_RIGHT_IN - MAT_W;  // -88.3
    const X_MAT_CENTER = (X_MAT_LEFT + X_RIGHT_IN) / 2; // 11.7

    // przegroda bocznego schowka
    const X_DIVIDER = X_MAT_LEFT - T / 2;   // -89.2

    const RADIATOR_W = 120;
    const RADIATOR_H = 92;
    const RADIATOR_TOP = 110;

    const TV_CENTER_Y = 140;

    // poduchy
    const CUSH_L = 80;
    const CUSH_H = 40;
    const CUSH_D = 18;
    const CUSH_BASE_Y = MAT_TOP - DECK_TOP; // relative to lift => 14

    // małe odsunięcia, żeby nie było z-fightingu i "przezroczystości"
    const EPS_WALL = 0.6;
    const EPS_SEAM = 0.2;

    // prawa ściana bocznych poduch ma być odsunięta od ściany
    const SIDE_CUSH_X = X_RIGHT_IN - EPS_WALL;

    // poduchy pod oknem mają dojść dokładnie do wewnętrznego lica poduch bocznych
    const WINDOW_CUSH_END_X = SIDE_CUSH_X - CUSH_D;   // x końca układu 2x80
    const WINDOW_CUSH_START_X = WINDOW_CUSH_END_X - 160;
    const WINDOW_CUSH_1_X = WINDOW_CUSH_START_X + 40;
    const WINDOW_CUSH_2_X = WINDOW_CUSH_START_X + 120;

    // =========================================================
    // HELPERY
    // =========================================================

    function add(parent, geometry, material, x, y, z, name) {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      if (name) m.name = name;
      parent.add(m);
      return m;
    }

    function opaqueTextile(colorHex, roughness = 0.96) {
      const m = materials.baseMaterial.fabric(200, 160, '#'+new THREE.Color(colorHex).getHexString());
      Object.assign(m, {roughness, metalness:0, transparent:false, opacity:1,
        side:THREE.FrontSide, depthWrite:true, depthTest:true, polygonOffset:false});
      return m;
    }

    // Closed solid with outward triangles; split vertices retain crisp wedge faces.
    // Positions and dimensions are exactly the supplied ones.
    function finishPrism(g, p, idx) {
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
      let volume=0;
      for(let i=0;i<idx.length;i+=3){
        a.fromArray(p,idx[i]*3);b.fromArray(p,idx[i+1]*3);c.fromArray(p,idx[i+2]*3);
        volume+=a.dot(b.cross(c));
      }
      if(volume<0)for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
      g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);
      const solid=g.toNonIndexed();g.dispose();solid.computeVertexNormals();return solid;
    }

    function darkMetal() {
      return new THREE.MeshStandardMaterial({
        color: 0x15181b,
        roughness: 0.35,
        metalness: 0.25,
        transparent: false,
        opacity: 1
      });
    }

    function woodPegMat() {
      return new THREE.MeshStandardMaterial({
        color: 0xc4ad86,
        roughness: 0.72,
        metalness: 0,
        transparent: false,
        opacity: 1
      });
    }

    function makeTriPrismX(len, depth, height) {
      const L = len / 2;
      const g = new THREE.BufferGeometry();
      const p = [
        -L, 0, 0,
        -L, 0, depth,
        -L, height, 0,

         L, 0, 0,
         L, 0, depth,
         L, height, 0
      ];
      const idx = [
        0, 2, 1,
        3, 4, 5,

        0, 1, 4, 0, 4, 3,
        0, 3, 5, 0, 5, 2,
        1, 2, 5, 1, 5, 4
      ];
      return finishPrism(g, p, idx);
    }

    function makeTriPrismZ(len, depth, height) {
      const L = len / 2;
      const g = new THREE.BufferGeometry();
      const p = [
        0, 0, -L,
        depth, 0, -L,
        0, height, -L,

        0, 0,  L,
        depth, 0,  L,
        0, height,  L
      ];
      const idx = [
        0, 2, 1,
        3, 4, 5,

        0, 1, 4, 0, 4, 3,
        0, 3, 5, 0, 5, 2,
        1, 2, 5, 1, 5, 4
      ];
      return finishPrism(g, p, idx);
    }

    function rightWedgeGeo(len, depth, height) {
      const L = len / 2;
      const g = new THREE.BufferGeometry();
      const p = [
        0, 0, -L,
        -depth, 0, -L,
        0, height, -L,

        0, 0,  L,
        -depth, 0,  L,
        0, height,  L
      ];
      const idx = [
        0, 2, 1,
        3, 4, 5,

        0, 1, 4, 0, 4, 3,
        0, 3, 5, 0, 5, 2,
        1, 2, 5, 1, 5, 4
      ];
      return finishPrism(g, p, idx);
    }

    // =========================================================
    // MATERIAŁY
    // =========================================================

    const MAT_BODY = board(0xdddddd, 227, 130, 0);
    const MAT_BODY_2 = board(0xd6d6d6, 200, 160, 1);
    const MAT_GRAPHITE = board(0x3e4248, 30, 30, 34);

    // Opaque PBR fabric; correct outward normals also agree with the GTAO pass.
    const MAT_MATTRESS = opaqueTextile(0xb7862d, 0.97);
    const MAT_CUSHION = opaqueTextile(0xc18d2f, 0.98);

    const MAT_TV = darkMetal();
    const MAT_PEG = woodPegMat();

    // =========================================================
    // KORPUS STATYCZNY
    // =========================================================

    // dno wewnętrzne
    add(
      root,
      boxGeo(INNER_W, T, MAT_D, 0.12, 1),
      MAT_BODY_2,
      0,
      T / 2,
      0,
      'dno'
    );

    // front od strony pokoju
    add(
      root,
      boxGeo(BED_W, RIM_TOP, T, 0.12, 1),
      MAT_BODY,
      0,
      RIM_TOP / 2,
      Z_FRONT_OUT - T / 2,
      'front'
    );

    // SO przy oknie / grzejniku
    add(
      root,
      boxGeo(BED_W, 130, T, 0.12, 1),
      MAT_BODY,
      0,
      65,
      Z_BACK_OUT + T / 2,
      'SO'
    );

    // prawa ścianka
    add(
      root,
      boxGeo(T, 130, BED_D, 0.12, 1),
      MAT_BODY,
      X_RIGHT_OUT - T / 2,
      65,
      0,
      'prawa_sciana'
    );

    // SPF — wysoka perforowana ścianka do sufitu po lewej
    const spfFace = pegMaterial(BED_D, ROOM_H);
    const spfEdge = board(0xdddddd, ROOM_H, BED_D, 0);

    const spf = new THREE.Mesh(
      boxGeo(T, ROOM_H, BED_D, 0.08, 2),
      [spfFace, spfFace, spfEdge, spfEdge, spfEdge, spfEdge]
    );
    spf.position.set(X_LEFT_OUT + T / 2, ROOM_H / 2, 0);
    spf.castShadow = true;
    spf.receiveShadow = true;
    root.add(spf);

    // perforacja SO tylko w strefie grzejnika
    const soPeg = new THREE.Mesh(
      new THREE.PlaneGeometry(RADIATOR_W, RADIATOR_H),
      pegMaterial(RADIATOR_W, RADIATOR_H)
    );
    soPeg.position.set(
      0,
      RADIATOR_TOP - RADIATOR_H / 2,
      Z_BACK_IN + 0.04
    );
    soPeg.receiveShadow = true;
    root.add(soPeg);

    // przegroda schowka bocznego
    add(
      root,
      boxGeo(T, RIM_TOP, MAT_D, 0.08, 1),
      MAT_BODY,
      X_DIVIDER,
      RIM_TOP / 2,
      0,
      'przegroda_sb'
    );

    // listwy podporowe pod platformę z materacem
    add(root, boxGeo(3, 4, MAT_D - 8, 0.08, 1), MAT_BODY_2, X_MAT_LEFT + 1.5, 71.6, 0, 'listwa_lewa');
    add(root, boxGeo(3, 4, MAT_D - 8, 0.08, 1), MAT_BODY_2, X_RIGHT_IN - 1.5, 71.6, 0, 'listwa_prawa');

    // skośny zagłówek konstrukcyjny przy prawej ścianie
    add(
      root,
      rightWedgeGeo(MAT_D, 8, 40),
      MAT_BODY_2,
      X_RIGHT_IN,
      MAT_TOP,
      0,
      'skosny_zaglowek'
    );

    // =========================================================
    // GŁÓWNA PODNOSZONA CZĘŚĆ
    // =========================================================

    const lift = new THREE.Group();
    lift.name = 'lift';
    lift.position.set(0, DECK_TOP, Z_BACK_IN);
    root.add(lift);

    // platforma pod materacem — tylko pod materacem
    add(
      lift,
      boxGeo(MAT_W, DECK_T, MAT_D, 0.08, 1),
      MAT_BODY_2,
      X_MAT_CENTER,
      -DECK_T / 2,
      MAT_D / 2,
      'platforma_pod_materacem'
    );

    // materac: góra 90 cm, wpuszczony 5 cm
    const mattress = add(
      lift,
      boxGeo(MAT_W, MAT_H, MAT_D, 1.0, 2),
      MAT_MATTRESS,
      X_MAT_CENTER,
      MAT_H / 2,
      MAT_D / 2,
      'materac'
    );
    mattress.userData.recessCm = MAT_RECESS;
    mattress.userData.topCm = MAT_TOP;

    // =========================================================
    // PODUCHY — 4 OPAQUE KLINY 80 × 40
    // =========================================================

    const cushionGroup = new THREE.Group();
    cushionGroup.name = 'poduchy_L';
    lift.add(cushionGroup);

    // pod oknem — dwie sztuki 80 cm
    add(
      cushionGroup,
      makeTriPrismX(CUSH_L + EPS_SEAM, CUSH_D, CUSH_H),
      MAT_CUSHION,
      WINDOW_CUSH_1_X,
      CUSH_BASE_Y,
      EPS_WALL,
      'poducha_okno_1'
    );

    add(
      cushionGroup,
      makeTriPrismX(CUSH_L + EPS_SEAM, CUSH_D, CUSH_H),
      MAT_CUSHION,
      WINDOW_CUSH_2_X,
      CUSH_BASE_Y,
      EPS_WALL,
      'poducha_okno_2'
    );

    // przy prawej ścianie — dwie sztuki 80 cm
    add(
      cushionGroup,
      makeTriPrismZ(CUSH_L + EPS_SEAM, -CUSH_D, CUSH_H),
      MAT_CUSHION,
      SIDE_CUSH_X,
      CUSH_BASE_Y,
      40 - EPS_SEAM / 2,
      'poducha_bok_1'
    );

    add(
      cushionGroup,
      makeTriPrismZ(CUSH_L + EPS_SEAM, -CUSH_D, CUSH_H),
      MAT_CUSHION,
      SIDE_CUSH_X,
      CUSH_BASE_Y,
      120 - EPS_SEAM / 2,
      'poducha_bok_2'
    );

    // =========================================================
    // SCHOWEK BOCZNY
    // =========================================================

    const sideLift = new THREE.Group();
    sideLift.name = 'sideLift';
    sideLift.position.set(X_LEFT_IN, RIM_TOP, 0);
    root.add(sideLift);

    // klapa schowka bocznego
    add(
      sideLift,
      boxGeo(SIDE_ZONE_W, T, MAT_D, 0.08, 1),
      MAT_BODY_2,
      SIDE_ZONE_W / 2,
      -T / 2,
      0,
      'klapa_schowka_bocznego'
    );

    // =========================================================
    // ZAWARTOŚĆ SCHOWKÓW
    // =========================================================

    const mainStore = new THREE.Group();
    root.add(mainStore);

    add(mainStore, boxGeo(58, 24, 44, 0.12, 1), board(0xd4ccc0, 40, 30, 11), 20, 12, -24, 'pak1');
    add(mainStore, boxGeo(44, 28, 52, 0.12, 1), board(0xc8c8c8, 40, 30, 19), 52, 14, 22, 'pak2');
    add(mainStore, boxGeo(34, 18, 36, 0.12, 1), board(0xd9d0c4, 40, 30, 15), -22, 9, 18, 'pak3');
    mainStore.visible = false;

    const sideStore = new THREE.Group();
    root.add(sideStore);

    add(sideStore, boxGeo(SIDE_ZONE_W - 4, 26, 48, 0.12, 1), board(0xd4ccc0, 40, 30, 11), X_LEFT_IN + SIDE_ZONE_W / 2, 13, 20, 'sb_pak1');
    add(sideStore, boxGeo(SIDE_ZONE_W - 4, 22, 38, 0.12, 1), board(0xc8c8c8, 40, 30, 19), X_LEFT_IN + SIDE_ZONE_W / 2, 11, -32, 'sb_pak2');
    sideStore.visible = false;

    // =========================================================
    // TV
    // =========================================================

    const tv = new THREE.Group();
    tv.name = 'telewizor';
    root.add(tv);

    add(tv, boxGeo(2.2, 34, 60, 0.08, 1), MAT_TV, X_LEFT_IN + 2.2, TV_CENTER_Y, -18, 'tv_body');
    add(tv, boxGeo(0.45, 12, 18, 0.06, 1), MAT_TV, X_LEFT_IN + 0.45, TV_CENTER_Y, -18, 'tv_mount');

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(58.5, 32.5),
      new THREE.MeshStandardMaterial({
        color: 0x0a0d10,
        roughness: 0.15,
        metalness: 0,
        transparent: false,
        opacity: 1
      })
    );
    screen.rotation.y = Math.PI / 2;
    screen.position.set(X_LEFT_IN + 3.35, TV_CENTER_Y, -18);
    tv.add(screen);

    // =========================================================
    // KOŁKI / PÓŁKI / GRAFITOWE PUDEŁKA
    // =========================================================

    const pegRodGeo = new THREE.CylinderGeometry(0.9, 0.9, 15, 16, 1);
    pegRodGeo.rotateZ(Math.PI / 2);
    const pegCapGeo = new THREE.SphereGeometry(1.03, 12, 8);

    function peg(y, z) {
      const rod = new THREE.Mesh(pegRodGeo, MAT_PEG);
      rod.position.set(X_LEFT_IN + 7.5, y, z);
      rod.castShadow = true;
      rod.receiveShadow = true;
      root.add(rod);

      const cap = new THREE.Mesh(pegCapGeo, MAT_PEG);
      cap.position.set(X_LEFT_IN + 15, y, z);
      cap.castShadow = true;
      cap.receiveShadow = true;
      root.add(cap);
    }

    function shelf(y, z, w) {
      peg(y, z - w / 2 + 8);
      peg(y, z + w / 2 - 8);
      add(root, boxGeo(16, 2, w, 0.08, 1), MAT_BODY, X_LEFT_IN + 8, y + 2, z, 'polka');
      return y + 3;
    }

    function boxOnShelf(baseY, z, h, d) {
      add(root, boxGeo(12, h, d, 0.08, 1), MAT_GRAPHITE, X_LEFT_IN + 7, baseY + h / 2, z, 'pudelko_grafitowe');
    }

    const s1 = shelf(178, -55, 38);
    boxOnShelf(s1, -64, 14, 16);
    boxOnShelf(s1, -46, 11, 16);

    const s2 = shelf(178, 52, 32);
    boxOnShelf(s2, 52, 13, 22);

    const s3 = shelf(224, 58, 50);
    boxOnShelf(s3, 46, 17, 20);
    boxOnShelf(s3, 70, 12, 20);

    peg(154, 70);
    peg(194, 70);
    peg(164, -74);
    peg(239, 8);

    // =========================================================
    // PODNOŚNIKI GAZOWE
    // =========================================================

    const gasGroup = new THREE.Group();
    root.add(gasGroup);

    const strutGeo = new THREE.CylinderGeometry(1, 1, 1, 18, 1);

    const strutBodyMat = new THREE.MeshStandardMaterial({
      color: 0x697079,
      roughness: 0.34,
      metalness: 0.9
    });

    const strutRodMat = new THREE.MeshStandardMaterial({
      color: 0xe2e6ea,
      roughness: 0.12,
      metalness: 1
    });

    const struts = [];

    for (let i = 0; i < 2; i++) {
      const body = new THREE.Mesh(strutGeo, strutBodyMat);
      const rod = new THREE.Mesh(strutGeo, strutRodMat);
      body.castShadow = rod.castShadow = true;
      body.receiveShadow = rod.receiveShadow = true;
      gasGroup.add(body);
      gasGroup.add(rod);
      struts.push({ body, rod });
    }

    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vdir = new THREE.Vector3();
    const vmid = new THREE.Vector3();
    const vup = new THREE.Vector3(0, 1, 0);

    function placeCylinder(mesh, a, b, r) {
      vdir.subVectors(b, a);
      const len = vdir.length();
      if (len < 0.01) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      vmid.copy(a).add(b).multiplyScalar(0.5);
      mesh.position.copy(vmid);
      mesh.quaternion.setFromUnitVectors(vup, vdir.normalize());
      mesh.scale.set(r, len, r);
    }

    function liftPointToRoot(local, out) {
      root.updateWorldMatrix(true, true);
      out.copy(local);
      lift.localToWorld(out);
      root.worldToLocal(out);
      return out;
    }

    function updateStruts() {
      const xs = [X_MAT_CENTER - 67, X_MAT_CENTER + 67];
      for (let i = 0; i < 2; i++) {
        va.set(xs[i], 25, -47);
        liftPointToRoot(new THREE.Vector3(xs[i], -3, 72), vb);
        const A = va.clone();
        const B = vb.clone();
        placeCylinder(struts[i].body, A, B, 1.0);
        placeCylinder(struts[i].rod, A, A.clone().lerp(B, 0.57), 0.62);
      }
    }

    updateStruts();

    // =========================================================
    // HOOK ANIMACJI
    // =========================================================

    return {
      afterPose(progress) {
        updateStruts();

        mainStore.visible = (progress.lift || 0) > 0.08;
        sideStore.visible = (progress.sideLift || 0) > 0.08;

        root.userData.model = {
          mattressTop: 90,
          mattressRecess: 5,
          rimTop: 81,
          mattress: [200, 160, 14],
          sideStorageGross: [23.4, 160],
          mainMotion: progress.lift || 0,
          sideMotion: progress.sideLift || 0
        };
      }
    };
  }
};
export default F;
