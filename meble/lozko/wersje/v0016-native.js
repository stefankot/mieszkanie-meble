import { buildLozkoV0013 } from './v0013-native.js';

export const VERSION = 'v0016';

const ROW1_MM = Object.freeze([532, 558, 155, 537, 380]);
const ROW2_MM = Object.freeze([476, 300, 419, 171, 304, 474]);
const DIV_MM = 18;
const BED_W_MM = 2270;

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0013',
  colors: {
    bedBoard: '#D9D1CA',
    mattressAndCushions: '#FFA084',
    doors: '#D9D1CA'
  },
  insetDoors: {
    thicknessMm: 18,
    insetFromFrontMm: 20,
    revealMmPerEdge: 2,
    row1UpperColumnsFromLeft: [2, 4],
    row2LowerColumnsFromLeft: [3, 6],
    opening: 'left hinge / push-to-open, 105 deg',
    initialState: 'closed'
  },
  lighting: {
    mode: '3 continuous horizontal LED strips',
    count: 3,
    widthMm: 2270,
    cctApproxK: 3000,
    note: 'No per-cubby PointLights. Three continuous strips cross the vertical dividers and are exposed through root.userData.lighting to the renderer fixed light pool.'
  },
  stairs: {
    material: 'polished stainless steel',
    maxEnvelopeMm: [600, 600, 600],
    widthAlongBedMm: 600,
    totalProjectionMm: 600,
    totalHeightMm: 600,
    steps: 3,
    treadDepthMm: 200,
    riseMm: 200,
    rightWallClearanceMm: 500,
    positionConfirmedByUser: true
  }
});

function addMesh(THREE,parent,geometry,material,x,y,z,name){
  const m=new THREE.Mesh(geometry,material);
  m.position.set(x,y,z);
  m.castShadow=m.receiveShadow=true;
  m.frustumCulled=false;
  m.name=name;
  parent.add(m);
  return m;
}

function bedBoardMaterial(THREE){
  const m=new THREE.MeshPhysicalMaterial({
    color:DESIGN_PATCH.colors.bedBoard,
    roughness:.78,
    metalness:0,
    transparent:false,
    opacity:1,
    depthWrite:true,
    depthTest:true,
    side:THREE.FrontSide,
    envMapIntensity:.65
  });
  m.name='Płyta łóżka #D9D1CA';
  return m;
}

function polishedSteelMaterial(THREE){
  const m=new THREE.MeshPhysicalMaterial({
    color:'#dfe3e5', roughness:.08, metalness:1,
    clearcoat:.25, clearcoatRoughness:.08,
    transparent:false, opacity:1, depthWrite:true, depthTest:true,
    side:THREE.FrontSide, envMapIntensity:2.2
  });
  m.name='Stal nierdzewna polerowana';
  return m;
}

function rowCells(widthsMm){
  const W=BED_W_MM/10;
  const T=DIV_MM/10;
  const widths=widthsMm.map(v=>v/10);
  let cursor=-W/2+T;
  const cells=[];
  for(let i=0;i<widths.length;i++){
    const w=widths[i];
    const left=cursor;
    const right=left+w;
    cells.push({index:i+1,left,right,width:w,cx:(left+right)/2});
    cursor=right+T;
  }
  if(Math.abs(cursor-W/2)>1e-6) throw new Error(`v0016: row width mismatch ${cursor}`);
  return cells;
}

function addInsetDoor({THREE,root,parent,material,cell,row,bottomY,clearH,frontFaceZ}){
  const GAP=.2;
  const THICK=1.8;
  const INSET=2.0;
  const doorW=cell.width-2*GAP;
  const doorH=clearH-2*GAP;
  const frontSurfaceZ=frontFaceZ-INSET;
  const centerZ=frontSurfaceZ-THICK/2;
  const left=cell.left+GAP;
  const cy=bottomY+clearH/2;

  const pivot=new THREE.Group();
  const id=`lozko:drzwi:r${row}c${cell.index}`;
  pivot.name=`os:${id}`;
  pivot.position.set(left,cy,centerZ);
  parent.add(pivot);

  const door=addMesh(
    THREE,pivot,new THREE.BoxGeometry(doorW,doorH,THICK),material,
    doorW/2,0,0,`drzwi_r${row}_c${String(cell.index).padStart(2,'0')}`
  );
  door.userData.insetMm=20;
  door.userData.pushToOpen=true;
  door.userData.initialState='closed';

  const ruch={
    id, typ:'hinge', os:pivot, kierunek:[0,-1,0], zakres:105,
    bazowaOrientacja:pivot.quaternion.clone(), bazowaPozycja:pivot.position.clone(),
    etykieta:`Drzwiczki R${row}.${cell.index}`, wezel:door, THREE, wartosc:0, cel:0
  };
  door.traverse(n=>n.userData.ruchId=id);
  return ruch;
}

function recolorFabricMesh(mesh,colorHex){
  if(!mesh?.isMesh || !mesh.material) return false;
  const recolor=m=>{
    const c=m.clone();
    if(c.color) c.color.set(colorHex);
    c.name='Tkanina materac/poduchy #FFA084';
    c.userData={...(m.userData||{}),surface:'fabric',coarseWeave:true,colorOverride:colorHex};
    c.transparent=false;
    c.opacity=1;
    if('transmission' in c) c.transmission=0;
    c.needsUpdate=true;
    return c;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(recolor):recolor(mesh.material);
  return true;
}

function removePerCubbyLights(root){
  const remove=[];
  root.traverse(o=>{
    const n=o.name||'';
    if(o.isLight && n.includes('_led_swiatlo_')) remove.push(o);
    else if(o.isMesh && n.includes('_led_pasek_')) remove.push(o);
  });
  for(const o of remove){
    o.parent?.remove(o);
    o.geometry?.dispose?.();
  }
  return remove.length;
}

function setContinuousLighting(root){
  // Współrzędne lokalne modelu, w mm. Każdy pasek ma pełne 2270 mm szerokości,
  // więc przechodzi ciągle przez wszystkie pionowe ścianki wnęk.
  root.userData.lighting={
    units:'mm',
    coordinateSystem:'model-local',
    recesses:[
      {
        id:'front-row-2-lower',
        ledStrips:[{
          id:'lozko-led-front-lower-continuous',
          positionMm:[0,381,738],
          targetMm:[0,221,338],
          widthMm:2270,
          heightMm:35
        }]
      },
      {
        id:'front-row-1-upper',
        ledStrips:[{
          id:'lozko-led-front-upper-continuous',
          positionMm:[0,698,738],
          targetMm:[0,538,338],
          widthMm:2270,
          heightMm:35
        }]
      },
      {
        id:'rear-upper',
        ledStrips:[{
          id:'lozko-led-rear-upper-continuous',
          positionMm:[0,1172,-880],
          targetMm:[0,1012,-1280],
          widthMm:2270,
          heightMm:35
        }]
      }
    ]
  };
}

export function buildLozkoV0016({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0013({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // 1. Rama i wszystkie płyty łóżka: #D9D1CA.
  const boardMat=bedBoardMaterial(THREE);
  const boardMaterialNames=new Set([
    'Płyta łóżka #FFFFFF','Płyta łóżka #fff','Płyta łóżka #BCC6C2',
    'Zielona płyta łóżka','Zielona boazeria frontowa','Płyta łóżka #D9D1CA'
  ]);
  root.traverse(o=>{
    if(!o.isMesh || !o.material) return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    if(mats.some(m=>boardMaterialNames.has(m?.name||''))) o.material=boardMat;
  });

  // 2. Materac i pozostałe dwie poduchy: #FFA084, bez utraty tekstury/splotu.
  const fabricTargets=['materac_bialy','poducha_bok_1','poducha_bok_2'];
  const recolored=[];
  for(const id of fabricTargets){
    const mesh=root.getObjectByName(id);
    if(recolorFabricMesh(mesh,DESIGN_PATCH.colors.mattressAndCushions)) recolored.push(id);
  }

  // 3. Oświetlenie: usuń 17 źródeł punktowych / odcinków per wnęka z v0013.
  //    Renderer dostaje dokładnie trzy ciągłe poziome pasy i obsługuje je przez
  //    własną stałą pulę świateł obszarowych, więc liczba źródeł nie rośnie wraz
  //    z liczbą kubików i nie destabilizuje animacji.
  const removedPerCubbyLightObjects=removePerCubbyLights(root);
  setContinuousLighting(root);

  // 4. Drzwiczki: R1.2, R1.4, R2.3, R2.6; kolor dokładnie taki jak rama.
  const front=root.getObjectByName('wneki_front_v0013');
  if(!front) throw new Error('v0016: brak frontu v0013');

  const FRONT_FACE_Z=81.8;
  const PLINTH_H=7.4;
  const T=1.8;
  const DECK_BOTTOM_Y=72.6;
  const CLEAR_H=(DECK_BOTTOM_Y-PLINTH_H-3*T)/2;
  const lowerBottom=PLINTH_H+T;
  const upperBottom=PLINTH_H+2*T+CLEAR_H;
  const row1=rowCells(ROW1_MM);
  const row2=rowCells(ROW2_MM);
  const selectedR1=new Set(DESIGN_PATCH.insetDoors.row1UpperColumnsFromLeft);
  const selectedR2=new Set(DESIGN_PATCH.insetDoors.row2LowerColumnsFromLeft);
  const doorMotions=[];
  for(const c of row1){
    if(selectedR1.has(c.index)) doorMotions.push(addInsetDoor({
      THREE,root,parent:front,material:boardMat,cell:c,row:1,
      bottomY:upperBottom,clearH:CLEAR_H,frontFaceZ:FRONT_FACE_Z
    }));
  }
  for(const c of row2){
    if(selectedR2.has(c.index)) doorMotions.push(addInsetDoor({
      THREE,root,parent:front,material:boardMat,cell:c,row:2,
      bottomY:lowerBottom,clearH:CLEAR_H,frontFaceZ:FRONT_FACE_Z
    }));
  }
  built.ruchy=[...(built.ruchy||[]),...doorMotions];
  root.userData.doorIds=doorMotions.map(r=>r.id);

  // 5. Schodek jak na referencji: trzy stopnie w jednej bryle obwiedniowej
  //    600 W × 600 D × 600 H mm. Każdy stopień: 200 mm głębokości i 200 mm
  //    przyrostu wysokości. Prawa krawędź pozostaje 500 mm od prawej ściany.
  const steelMat=polishedSteelMaterial(THREE);
  const stairW=60;
  const treadD=20;
  const bedRightX=BED_W_MM/20;
  const stairRightX=bedRightX-50;
  const stairCenterX=stairRightX-stairW/2; // 33.5 cm
  const bedFrontZ=FRONT_FACE_Z;

  const step3=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,60,treadD),steelMat,
    stairCenterX,30,bedFrontZ+treadD/2,'schodek_3_przy_lozku_60cm'
  );
  const step2=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,40,treadD),steelMat,
    stairCenterX,20,bedFrontZ+treadD+treadD/2,'schodek_2_srodkowy_40cm'
  );
  const step1=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,20,treadD),steelMat,
    stairCenterX,10,bedFrontZ+2*treadD+treadD/2,'schodek_1_od_pokoju_20cm'
  );
  [step1,step2,step3].forEach((s,i)=>{
    s.userData.rightWallClearanceMm=500;
    s.userData.treadDepthMm=200;
    s.userData.widthMm=600;
    s.userData.stepIndex=i+1;
  });

  root.userData.design={
    ...(root.userData.design||{}),
    colors:{
      ...(root.userData.design?.colors||{}),
      bedGreen:DESIGN_PATCH.colors.bedBoard,
      bedBoard:DESIGN_PATCH.colors.bedBoard,
      mattressAndCushions:DESIGN_PATCH.colors.mattressAndCushions,
      doors:DESIGN_PATCH.colors.doors
    },
    insetDoors:{...DESIGN_PATCH.insetDoors},
    lighting:{...DESIGN_PATCH.lighting},
    stairs:{...DESIGN_PATCH.stairs}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    boardColor:DESIGN_PATCH.colors.bedBoard,
    fabricColor:DESIGN_PATCH.colors.mattressAndCushions,
    recoloredFabricIds:recolored,
    insetDoors:{
      row1:[2,4], row2:[3,6], inset:2, thickness:1.8,
      color:DESIGN_PATCH.colors.doors, initialState:'closed', motion:'hinge-left-105deg'
    },
    lighting:{
      directPerCubbyLights:0,
      removedObjects:removedPerCubbyLightObjects,
      continuousStripCount:3,
      stripWidthMm:2270,
      renderer:'root.userData.lighting -> fixed RectAreaLight pool'
    },
    stairs:{
      envelope:[60,60,60],
      steps:3,
      treadDepth:20,
      rise:20,
      width:60,
      rightWallClearance:50,
      centers:[
        [stairCenterX,10,bedFrontZ+50],
        [stairCenterX,20,bedFrontZ+30],
        [stairCenterX,30,bedFrontZ+10]
      ],
      material:'polished stainless steel'
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0016};
