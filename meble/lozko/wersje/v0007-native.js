import { buildLozkoV0006 } from './v0006-native.js';
import { zmiekczTkaniny } from '../../../renderery/webgpu/miekkie-bryly.js';

export const VERSION = 'v0007';

export const DESIGN_PATCH = Object.freeze({
  frontNiches: {
    panelWidthMm: 2270,
    frontHeightMm: 800,
    depthMm: 200,
    dividerMm: 18,
    columns: 10,
    rows: 2,
    plinthHeightMm: 74,
    plinthSetbackMm: 100,
    clearWidthMm: 207.2,
    clearHeightMm: 299,
    led: {
      count: 20,
      position: 'rear/top of each niche',
      cctApproxK: 3000,
      emissiveIntensity: 12,
      pointLightIntensity: 85,
      pointLightDistanceMm: 520
    }
  },
  cushions: {
    ids: ['poducha_okno_1','poducha_okno_2','poducha_bok_1','poducha_bok_2'],
    rendererDeformation: 'renderery/webgpu/miekkie-bryly.js::zmiekczTkaniny',
    radiusMm: 22,
    bulgeMm: 18,
    note: 'Parametryzacja jak w rendererze v1/P26: zaokrąglenie, wypchanie, lamówka, zagniecenia, szum i docisk.'
  }
});

function disposeTree(o){
  if(!o) return;
  o.traverse?.(n => n.geometry?.dispose?.());
  o.parent?.remove(o);
}

function addMesh(THREE,parent,geometry,material,x,y,z,name){
  const m=new THREE.Mesh(geometry,material);
  m.position.set(x,y,z);
  m.castShadow=m.receiveShadow=true;
  m.frustumCulled=false;
  m.name=name;
  parent.add(m);
  return m;
}

function whiteBoardMaterial(THREE){
  const m=new THREE.MeshPhysicalMaterial({
    color:'#ffffff', roughness:.78, metalness:0,
    transparent:false, opacity:1, depthWrite:true, depthTest:true,
    side:THREE.FrontSide, envMapIntensity:.65
  });
  m.name='Płyta łóżka #FFFFFF';
  return m;
}

export function buildLozkoV0007({THREE,placement={positionMm:[1258,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0006({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  const boardMat=whiteBoardMaterial(THREE);

  // ---------------------------------------------------------------------------
  // 1. WNĘKI + COKÓŁ.
  //    Usuwamy konstrukcję v0006 razem ze zbyt słabymi światłami.
  //    Dawny pełny pas 74 mm nad wnękami przechodzi na dół jako cokół,
  //    cofnięty o 100 mm od lica frontu.
  //
  //    Spód platformy pozostaje na Y=726 mm. Po odjęciu cokołu 74 mm i
  //    trzech poziomych płyt 18 mm zostaje 2 × 299 mm światła.
  //    To jest maksymalna wysokość dwóch rzędów bez wejścia w platformę.
  // ---------------------------------------------------------------------------
  disposeTree(root.getObjectByName('wneki_front_20x40x20'));

  const niches=new THREE.Group();
  niches.name='wneki_front_20x40x20';
  root.add(niches);

  const FRONT_W=227;
  const FRONT_H=80;
  const DIV=1.8;
  const DEPTH=20;
  const PLINTH_H=7.4;
  const PLINTH_SETBACK=10;
  const FRONT_FACE_Z=81.8;
  const BACK_INNER_Z=FRONT_FACE_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-DIV/2;
  const INTERNAL_CENTER_Z=(FRONT_FACE_Z+BACK_INNER_Z)/2;
  const DECK_BOTTOM_Y=72.6;
  const CLEAR_W=(FRONT_W-11*DIV)/10;
  const CLEAR_H=(DECK_BOTTOM_Y-PLINTH_H-3*DIV)/2;
  const leftEdge=-FRONT_W/2;

  // Cokół: 74 mm wysokości, cofnięty dokładnie o 100 mm od zewnętrznego lica.
  const plinthFrontZ=FRONT_FACE_Z-PLINTH_SETBACK;
  addMesh(
    THREE,niches,new THREE.BoxGeometry(FRONT_W,PLINTH_H,DIV),boardMat,
    0,PLINTH_H/2,plinthFrontZ-DIV/2,'wneki_cokol_74mm_cofniety_100mm'
  );

  // Plecy wnęk od poziomu cokołu do spodu platformy.
  const nicheBodyH=DECK_BOTTOM_Y-PLINTH_H;
  addMesh(
    THREE,niches,new THREE.BoxGeometry(FRONT_W,nicheBodyH,DIV),boardMat,
    0,PLINTH_H+nicheBodyH/2,BACK_PANEL_Z,'wneki_plecy'
  );

  // Pionowe ścianki: 11 sztuk, tylko w strefie wnęk nad cokołem.
  for(let i=0;i<=10;i++){
    const x=leftEdge+DIV/2+i*(CLEAR_W+DIV);
    addMesh(
      THREE,niches,new THREE.BoxGeometry(DIV,nicheBodyH,DEPTH),boardMat,
      x,PLINTH_H+nicheBodyH/2,INTERNAL_CENTER_Z,`wneka_pion_${String(i+1).padStart(2,'0')}`
    );
  }

  // Dół wnęk, półka środkowa i sufit wnęk.
  const shelfCentersY=[
    PLINTH_H+DIV/2,
    PLINTH_H+DIV+CLEAR_H+DIV/2,
    DECK_BOTTOM_Y-DIV/2
  ];
  shelfCentersY.forEach((y,i)=>addMesh(
    THREE,niches,new THREE.BoxGeometry(FRONT_W,DIV,DEPTH),boardMat,
    0,y,INTERNAL_CENTER_Z,`wneka_poziom_${i+1}`
  ));

  // ---------------------------------------------------------------------------
  // 2. LED — znacznie mocniejsze niż w v0006.
  //    EmissiveIntensity 12 + PointLight 85 / 52 cm zasięgu.
  //    Pasek nadal znajduje się z tyłu, tuż pod górą każdej wnęki.
  // ---------------------------------------------------------------------------
  const ledMat=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffd29a', emissiveIntensity:12,
    roughness:.28, metalness:0, transparent:false, opacity:1
  });
  ledMat.name='LED 3000K · mocny';

  const rowBottoms=[PLINTH_H+DIV, PLINTH_H+2*DIV+CLEAR_H];
  const cells=[];
  for(let col=0;col<10;col++){
    const leftInner=leftEdge+DIV+col*(CLEAR_W+DIV);
    const cx=leftInner+CLEAR_W/2;
    for(let row=0;row<2;row++){
      const clearBottom=rowBottoms[row];
      const clearTop=clearBottom+CLEAR_H;
      const ledY=clearTop-1.0;
      const ledZ=BACK_INNER_Z+.45;
      const ledW=Math.max(2,CLEAR_W-1.8);
      const id=`${row+1}_${String(col+1).padStart(2,'0')}`;

      addMesh(
        THREE,niches,new THREE.BoxGeometry(ledW,.65,.8),ledMat,
        cx,ledY,ledZ,`led_pasek_${id}`
      );

      const light=new THREE.PointLight(0xffd39f,85,52,1.35);
      light.name=`led_swiatlo_${id}`;
      light.position.set(cx,ledY-2.0,BACK_INNER_Z+4.5);
      light.castShadow=false;
      niches.add(light);

      cells.push({
        id:`wneka_${id}`,
        clearMm:[Math.round(CLEAR_W*10),Math.round(CLEAR_H*10),200]
      });
    }
  }

  niches.userData.pattern={
    columns:10,
    rows:2,
    clearSizeMm:[Math.round(CLEAR_W*10),Math.round(CLEAR_H*10),200],
    dividerMm:18,
    plinthHeightMm:74,
    plinthSetbackMm:100,
    ledPerNiche:true,
    ledLocation:'rear/top',
    ledCctApproxK:3000,
    ledEmissiveIntensity:12,
    ledPointLightIntensity:85,
    cells
  };

  // ---------------------------------------------------------------------------
  // 3. PODUCHY — wymuszamy dokładnie rendererową parametryzację miękkich brył.
  //    To nie jest nowy „zaokrąglony graniastosłup”. Punktem startowym pozostaje
  //    klin, ale moduł miekkie-bryly.js zagęszcza i deformuje go jak poduszkę:
  //    radius 22 mm, wypchanie 18 mm, lamówka, zagniecenia, szum i docisk.
  // ---------------------------------------------------------------------------
  let cushionsPrepared=0;
  for(const id of DESIGN_PATCH.cushions.ids){
    const c=root.getObjectByName(id);
    if(!c || !c.isMesh) continue;
    if(c.material){
      c.material.userData={...(c.material.userData||{}),surface:'fabric',coarseWeave:true};
      c.material.transparent=false;
      c.material.opacity=1;
      if('transmission' in c.material) c.material.transmission=0;
      c.material.needsUpdate=true;
    }
    delete c.userData.miekkie;
    cushionsPrepared++;
  }
  const mattress=root.getObjectByName('materac_bialy');
  if(mattress?.material){
    mattress.material.userData={...(mattress.material.userData||{}),surface:'fabric',coarseWeave:true};
    delete mattress.userData.miekkie;
  }

  const softenedCount=zmiekczTkaniny(root,THREE);
  root.userData.softGeometry={
    source:'renderery/webgpu/miekkie-bryly.js',
    preparedCushions:cushionsPrepared,
    softenedMeshes:softenedCount,
    cushionIds:[...DESIGN_PATCH.cushions.ids]
  };

  root.userData.design={
    ...(root.userData.design||{}),
    frontNiches:{...DESIGN_PATCH.frontNiches},
    cushions:{...(root.userData.design?.cushions||{}),...DESIGN_PATCH.cushions}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    frontNiches:{
      panel:[227,80], depth:20, divider:1.8,
      columns:10, rows:2,
      clearWidth:Math.round(CLEAR_W*1000)/1000,
      clearHeight:Math.round(CLEAR_H*1000)/1000,
      plinthHeight:7.4,
      plinthSetback:10,
      ledCount:20,
      ledPosition:'rear/top',
      ledEmissiveIntensity:12,
      ledPointLightIntensity:85
    },
    cushionRendererDeformation:true,
    cushionIds:[...DESIGN_PATCH.cushions.ids]
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0007};
