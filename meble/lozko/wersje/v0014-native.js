import { buildLozkoV0013 } from './v0013-native.js';

export const VERSION = 'v0014';

const ROW1_MM = Object.freeze([532, 558, 155, 537, 380]);
const ROW2_MM = Object.freeze([476, 300, 419, 171, 304, 474]);
const DIV_MM = 18;
const BED_W_MM = 2270;

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0013',
  insetDoors: {
    color: '#ffffff',
    thicknessMm: 18,
    insetFromFrontMm: 20,
    revealMmPerEdge: 2,
    row1UpperColumnsFromLeft: [2, 3],
    row2LowerColumnsFromLeft: [2, 3, 6],
    opening: 'left hinge / push-to-open, 105 deg'
  },
  polishedSteelBlock: {
    sizeMm: [400, 400, 200],
    order: ['widthAlongBed', 'height', 'depthFromBed'],
    frontAttachment: 'rear face flush to bed front',
    clearanceFromRightWallMm: 500,
    material: 'polished stainless steel'
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
  if(Math.abs(cursor-W/2)>1e-6) throw new Error(`v0014: row width mismatch ${cursor}`);
  return cells;
}

function addInsetDoor({THREE,root,parent,material,cell,row,bottomY,clearH,frontFaceZ}){
  const GAP=.2;          // 2 mm na każdej krawędzi
  const THICK=1.8;       // 18 mm płyta
  const INSET=2.0;       // lico 20 mm w głąb wnęki
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

  const ruch={
    id, typ:'hinge', os:pivot, kierunek:[0,-1,0], zakres:105,
    bazowaOrientacja:pivot.quaternion.clone(), bazowaPozycja:pivot.position.clone(),
    etykieta:`Drzwiczki R${row}.${cell.index}`, wezel:door, THREE, wartosc:0, cel:0
  };
  door.traverse(n=>n.userData.ruchId=id);
  root.userData.doorIds=[...(root.userData.doorIds||[]),id];
  return ruch;
}

export function buildLozkoV0014({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0013({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  const front=root.getObjectByName('wneki_front_v0013');
  if(!front) throw new Error('v0014: brak frontu v0013');

  const doorMat=whiteDoorMaterial(THREE);
  const FRONT_FACE_Z=81.8;
  const PLINTH_H=7.4;
  const T=1.8;
  const DECK_BOTTOM_Y=72.6;
  const CLEAR_H=(DECK_BOTTOM_Y-PLINTH_H-3*T)/2; // 29.9 cm
  const lowerBottom=PLINTH_H+T;                  // R2
  const upperBottom=PLINTH_H+2*T+CLEAR_H;        // R1

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

  // Klocek: 400 mm szerokości wzdłuż łóżka, 400 mm wysokości, 200 mm głębokości.
  // Lokalny +X to projektowa prawa strona łóżka, lokalny +Z to przód pokoju.
  // Prawa krawędź łóżka jest przy ścianie; prawa krawędź klocka zostaje 500 mm od niej.
  const blockW=40, blockH=40, blockD=20;
  const bedRightX=BED_W_MM/20; // 113.5 cm
  const blockRightX=bedRightX-50;
  const blockCenterX=blockRightX-blockW/2; // 43.5 cm
  const blockBackZ=FRONT_FACE_Z;
  const blockCenterZ=blockBackZ+blockD/2;
  const steelMat=polishedSteelMaterial(THREE);
  const block=addMesh(
    THREE,root,new THREE.BoxGeometry(blockW,blockH,blockD),steelMat,
    blockCenterX,blockH/2,blockCenterZ,'klocek_stal_polerowana_40x40x20'
  );
  block.userData.sizeMm=[400,400,200];
  block.userData.clearanceFromRightWallMm=500;
  block.userData.attachedToBedFront=true;

  root.userData.design={
    ...(root.userData.design||{}),
    baseVersion:'v0013',
    insetDoors:{...DESIGN_PATCH.insetDoors},
    polishedSteelBlock:{...DESIGN_PATCH.polishedSteelBlock}
  };
  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    insetDoors:{
      row1:[2,3], row2:[2,3,6], inset:2, thickness:1.8,
      color:'#ffffff', motion:'hinge-left-105deg'
    },
    polishedSteelBlock:{
      size:[40,40,20], center:[blockCenterX,20,blockCenterZ],
      rightWallClearance:50, material:'polished stainless steel'
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0014};
