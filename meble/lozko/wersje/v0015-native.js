import { buildLozkoV0013 } from './v0013-native.js';

export const VERSION = 'v0015';

const ROW1_MM = Object.freeze([532, 558, 155, 537, 380]);
const ROW2_MM = Object.freeze([476, 300, 419, 171, 304, 474]);
const DIV_MM = 18;
const BED_W_MM = 2270;

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0013',
  colors: {
    bedBoard: '#D9D1CA',
    mattressAndCushions: '#c34811',
    doors: '#ffffff'
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
  stairs: {
    material: 'polished stainless steel',
    widthAlongBedMm: 300,
    rightWallClearanceMm: 500,
    step1FromRoom: {depthMm: 200, heightMm: 300},
    step2AtBed: {depthMm: 200, heightMm: 500},
    totalProjectionMm: 400,
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

function whiteDoorMaterial(THREE){
  const m=new THREE.MeshPhysicalMaterial({
    color:'#ffffff', roughness:.72, metalness:0,
    transparent:false, opacity:1, depthWrite:true, depthTest:true,
    side:THREE.FrontSide, envMapIntensity:.7
  });
  m.name='Białe drzwiczki wpuszczane #FFFFFF';
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
  if(Math.abs(cursor-W/2)>1e-6) throw new Error(`v0015: row width mismatch ${cursor}`);
  return cells;
}

function addInsetDoor({THREE,root,parent,material,cell,row,bottomY,clearH,frontFaceZ}){
  const GAP=.2;          // 2 mm na każdej krawędzi
  const THICK=1.8;       // 18 mm
  const INSET=2.0;       // lico 20 mm wgłąb wnęki
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

function recolorFabricMesh(THREE,mesh,colorHex){
  if(!mesh?.isMesh || !mesh.material) return false;
  const recolor=m=>{
    const c=m.clone();
    if(c.color) c.color.set(colorHex);
    c.name='Tkanina materac/poduchy #C34811';
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

export function buildLozkoV0015({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  // v0013 daje zatwierdzony układ wnęk bez elementów v0014, które w tej
  // rewizji zmieniamy: zestaw drzwiczek oraz pojedynczy stalowy klocek.
  const built=buildLozkoV0013({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // -------------------------------------------------------------------------
  // 1. Kolor płyt łóżka #D9D1CA. Nie dotykamy BABY BLUE, stali, LED,
  //    grzejnika, TV, dronów ani białych drzwiczek.
  // -------------------------------------------------------------------------
  const boardMat=bedBoardMaterial(THREE);
  const boardMaterialNames=new Set([
    'Płyta łóżka #FFFFFF',
    'Płyta łóżka #fff',
    'Płyta łóżka #BCC6C2',
    'Zielona płyta łóżka',
    'Zielona boazeria frontowa',
    'Płyta łóżka #D9D1CA'
  ]);
  root.traverse(o=>{
    if(!o.isMesh || !o.material) return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    if(mats.some(m=>boardMaterialNames.has(m?.name||''))) o.material=boardMat;
  });

  // -------------------------------------------------------------------------
  // 2. Materac + pozostałe poduchy: #c34811. Zachowujemy proceduralny splot
  //    oraz geometrię miękkich brył z wcześniejszych wersji.
  // -------------------------------------------------------------------------
  const fabricTargets=['materac_bialy','poducha_bok_1','poducha_bok_2'];
  const recolored=[];
  for(const id of fabricTargets){
    const mesh=root.getObjectByName(id);
    if(recolorFabricMesh(THREE,mesh,DESIGN_PATCH.colors.mattressAndCushions)) recolored.push(id);
  }

  // -------------------------------------------------------------------------
  // 3. Drzwiczki tylko w: R1.2, R1.4, R2.3, R2.6. Wszystkie startują
  //    zamknięte, 20 mm wgłąb światła wnęki; góra/tył pozostają bez drzwiczek.
  // -------------------------------------------------------------------------
  const front=root.getObjectByName('wneki_front_v0013');
  if(!front) throw new Error('v0015: brak frontu v0013');

  const doorMat=whiteDoorMaterial(THREE);
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
      THREE,root,parent:front,material:doorMat,cell:c,row:1,
      bottomY:upperBottom,clearH:CLEAR_H,frontFaceZ:FRONT_FACE_Z
    }));
  }
  for(const c of row2){
    if(selectedR2.has(c.index)) doorMotions.push(addInsetDoor({
      THREE,root,parent:front,material:doorMat,cell:c,row:2,
      bottomY:lowerBottom,clearH:CLEAR_H,frontFaceZ:FRONT_FACE_Z
    }));
  }
  built.ruchy=[...(built.ruchy||[]),...doorMotions];
  root.userData.doorIds=doorMotions.map(r=>r.id);

  // -------------------------------------------------------------------------
  // 4. Dwa schodki z polerowanej stali zamiast pojedynczego klocka.
  //    Szerokość 300 mm wzdłuż łóżka. Prawa krawędź pozostaje 500 mm od
  //    prawej ściany jak zaakceptowany poprzedni element.
  //    Stopień 2 przy łóżku: 200D × 300W × 500H mm.
  //    Stopień 1 od pokoju: 200D × 300W × 300H mm.
  // -------------------------------------------------------------------------
  const steelMat=polishedSteelMaterial(THREE);
  const stairW=30;
  const stairD=20;
  const bedRightX=BED_W_MM/20; // 113.5 cm
  const stairRightX=bedRightX-50;
  const stairCenterX=stairRightX-stairW/2; // 48.5 cm
  const bedFrontZ=FRONT_FACE_Z;

  const step2=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,50,stairD),steelMat,
    stairCenterX,25,bedFrontZ+stairD/2,'schodek_2_przy_lozku_50cm'
  );
  const step1=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,30,stairD),steelMat,
    stairCenterX,15,bedFrontZ+stairD+stairD/2,'schodek_1_od_pokoju_30cm'
  );
  step1.userData.sizeMm=[300,300,200];
  step1.userData.role='step 1 / room side';
  step2.userData.sizeMm=[300,500,200];
  step2.userData.role='step 2 / bed side';
  step1.userData.rightWallClearanceMm=step2.userData.rightWallClearanceMm=500;

  root.userData.design={
    ...(root.userData.design||{}),
    colors:{
      ...(root.userData.design?.colors||{}),
      bedGreen:DESIGN_PATCH.colors.bedBoard,
      bedBoard:DESIGN_PATCH.colors.bedBoard,
      mattressAndCushions:DESIGN_PATCH.colors.mattressAndCushions
    },
    insetDoors:{...DESIGN_PATCH.insetDoors},
    stairs:{...DESIGN_PATCH.stairs}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    boardColor:DESIGN_PATCH.colors.bedBoard,
    fabricColor:DESIGN_PATCH.colors.mattressAndCushions,
    recoloredFabricIds:recolored,
    insetDoors:{
      row1:[2,4], row2:[3,6], inset:2, thickness:1.8,
      color:'#ffffff', initialState:'closed', motion:'hinge-left-105deg'
    },
    stairs:{
      width:30,
      totalProjection:40,
      rightWallClearance:50,
      step1:{height:30,depth:20,center:[stairCenterX,15,bedFrontZ+30]},
      step2:{height:50,depth:20,center:[stairCenterX,25,bedFrontZ+10]},
      material:'polished stainless steel'
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0015};
