import { buildLozkoV0010 } from './v0010-native.js';

export const VERSION = 'v0011';

// 7 pól na pełnej szerokości 2270 mm. 8 przegród × 18 mm = 144 mm,
// więc na światło zostaje dokładnie 2126 mm. Rytm maleje od 600 do 100 mm.
// Wartości są zaokrągloną, znormalizowaną krzywą Fibonacci/golden-ratio,
// z zachowaniem obu końców i dokładnej sumy konstrukcyjnej.
const CLEAR_WIDTHS_MM = Object.freeze([600, 475, 364, 268, 189, 130, 100]);
const CLEAR_WIDTHS_CM = Object.freeze(CLEAR_WIDTHS_MM.map(v => v / 10));
const DIV_MM = 18;
const BED_W_MM = 2270;
const LED = Object.freeze({
  cctApproxK: 3000,
  emissiveIntensity: 12,
  rendererLighting: 'fixed pool via root.userData.lighting',
  directPointLights: 0
});

export const DESIGN_PATCH = Object.freeze({
  fibonacciWidthsMmFromSPF: [...CLEAR_WIDTHS_MM],
  frontNiches: {
    columns: 7,
    rows: 2,
    dividerMm: DIV_MM,
    depthMm: 200,
    clearWidthsMmFromSPF: [...CLEAR_WIDTHS_MM],
    clearHeightMm: 299,
    led: {...LED, count: 14}
  },
  rearNiches: {
    columns: 7,
    rows: 1,
    fromYmm: 750,
    toYmm: 1200,
    dividerMm: DIV_MM,
    depthMm: 200,
    clearWidthsMmFromSPF: [...CLEAR_WIDTHS_MM],
    clearHeightMm: 414,
    led: {...LED, count: 7}
  },
  lightingParity: {
    frontAndRearUseSameEmissiveIntensity: 12,
    frontAndRearUseSameRendererPool: true,
    directPointLightsRemoved: true
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

function ledMaterial(THREE){
  const m=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffd29a', emissiveIntensity:LED.emissiveIntensity,
    roughness:.28, metalness:0, transparent:false, opacity:1
  });
  m.name='LED 3000K · wspólna jasność front/tył';
  return m;
}

function verifyWidths(){
  const clearTotal=CLEAR_WIDTHS_MM.reduce((a,b)=>a+b,0);
  const total=clearTotal+(CLEAR_WIDTHS_MM.length+1)*DIV_MM;
  if(total!==BED_W_MM) throw new Error(`v0011: widths mismatch ${total} != ${BED_W_MM}`);
}

function buildFront({THREE,root,boardMat,ledMat,recesses}){
  disposeTree(root.getObjectByName('wneki_front_20x40x20'));

  const group=new THREE.Group();
  group.name='wneki_front_20x40x20';
  root.add(group);

  const FRONT_W=227;
  const DIV=1.8;
  const DEPTH=20;
  const PLINTH_H=7.4;
  const PLINTH_SETBACK=10;
  const FRONT_FACE_Z=81.8;
  const BACK_INNER_Z=FRONT_FACE_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-DIV/2;
  const INTERNAL_CENTER_Z=(FRONT_FACE_Z+BACK_INNER_Z)/2;
  const DECK_BOTTOM_Y=72.6;
  const CLEAR_H=(DECK_BOTTOM_Y-PLINTH_H-3*DIV)/2;
  const leftEdge=-FRONT_W/2;

  const plinthFrontZ=FRONT_FACE_Z-PLINTH_SETBACK;
  addMesh(THREE,group,new THREE.BoxGeometry(FRONT_W,PLINTH_H,DIV),boardMat,
    0,PLINTH_H/2,plinthFrontZ-DIV/2,'wneki_cokol_74mm_cofniety_100mm');

  const nicheBodyH=DECK_BOTTOM_Y-PLINTH_H;
  addMesh(THREE,group,new THREE.BoxGeometry(FRONT_W,nicheBodyH,DIV),boardMat,
    0,PLINTH_H+nicheBodyH/2,BACK_PANEL_Z,'wneki_plecy');

  const cells=[];
  const dividerCenters=[];
  let cursor=leftEdge;
  dividerCenters.push(cursor+DIV/2);
  cursor+=DIV;
  for(let i=0;i<CLEAR_WIDTHS_CM.length;i++){
    const width=CLEAR_WIDTHS_CM[i];
    const left=cursor;
    const right=left+width;
    const cx=(left+right)/2;
    cells.push({index:i+1,left,right,width,cx});
    cursor=right;
    dividerCenters.push(cursor+DIV/2);
    cursor+=DIV;
  }

  dividerCenters.forEach((x,i)=>addMesh(
    THREE,group,new THREE.BoxGeometry(DIV,nicheBodyH,DEPTH),boardMat,
    x,PLINTH_H+nicheBodyH/2,INTERNAL_CENTER_Z,`wneka_pion_${String(i+1).padStart(2,'0')}`
  ));

  const shelfCentersY=[
    PLINTH_H+DIV/2,
    PLINTH_H+DIV+CLEAR_H+DIV/2,
    DECK_BOTTOM_Y-DIV/2
  ];
  shelfCentersY.forEach((y,i)=>addMesh(
    THREE,group,new THREE.BoxGeometry(FRONT_W,DIV,DEPTH),boardMat,
    0,y,INTERNAL_CENTER_Z,`wneka_poziom_${i+1}`
  ));

  const rowBottoms=[PLINTH_H+DIV, PLINTH_H+2*DIV+CLEAR_H];
  const patternCells=[];
  for(const c of cells){
    for(let row=0;row<2;row++){
      const clearBottom=rowBottoms[row];
      const clearTop=clearBottom+CLEAR_H;
      const ledY=clearTop-1.0;
      const ledZ=BACK_INNER_Z+.45;
      const ledW=Math.max(2,c.width-1.8);
      const id=`${row+1}_${String(c.index).padStart(2,'0')}`;
      addMesh(THREE,group,new THREE.BoxGeometry(ledW,.65,.8),ledMat,
        c.cx,ledY,ledZ,`led_pasek_${id}`);

      const rid=`front_${id}`;
      recesses.push({
        id:`wneka_${rid}`,
        ledStrips:[{
          id:`led_${rid}`,
          positionMm:[Math.round(c.cx*10),Math.round(ledY*10),Math.round(ledZ*10)],
          targetMm:[Math.round(c.cx*10),Math.round((ledY-12)*10),Math.round((FRONT_FACE_Z-2)*10)],
          widthMm:Math.round(ledW*10),
          heightMm:22
        }]
      });
      patternCells.push({id:`wneka_${id}`,clearMm:[Math.round(c.width*10),Math.round(CLEAR_H*10),200]});
    }
  }

  group.userData.pattern={
    columns:7,
    rows:2,
    clearWidthsMm:[...CLEAR_WIDTHS_MM],
    direction:'SPF -> opposite side',
    dividerMm:18,
    clearHeightMm:Math.round(CLEAR_H*10),
    depthMm:200,
    plinthHeightMm:74,
    plinthSetbackMm:100,
    ledPerNiche:true,
    ledCctApproxK:LED.cctApproxK,
    ledEmissiveIntensity:LED.emissiveIntensity,
    directPointLights:0,
    rendererLighting:'fixed-pool',
    cells:patternCells
  };

  return {clearHeightMm:Math.round(CLEAR_H*10),ledCount:14};
}

function buildRear({THREE,root,boardMat,ledMat,recesses}){
  disposeTree(root.getObjectByName('wneki_tyl_fibonacci'));

  const group=new THREE.Group();
  group.name='wneki_tyl_fibonacci';
  root.add(group);

  const BED_W=227;
  const DIV=1.8;
  const DEPTH=20;
  const MATTRESS_BASE_Y=75;
  const REAR_TOP_Y=120;
  const OPEN_Z=-80;
  const BACK_INNER_Z=OPEN_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-DIV/2;
  const INTERNAL_CENTER_Z=(OPEN_Z+BACK_INNER_Z)/2;
  const nicheH=REAR_TOP_Y-MATTRESS_BASE_Y;
  const clearH=nicheH-2*DIV;
  const leftEdge=-BED_W/2;

  addMesh(THREE,group,new THREE.BoxGeometry(BED_W,nicheH,DIV),boardMat,
    0,MATTRESS_BASE_Y+nicheH/2,BACK_PANEL_Z,'wneki_tyl_plecy');
  addMesh(THREE,group,new THREE.BoxGeometry(BED_W,DIV,DEPTH),boardMat,
    0,MATTRESS_BASE_Y+DIV/2,INTERNAL_CENTER_Z,'wneki_tyl_dol');
  addMesh(THREE,group,new THREE.BoxGeometry(BED_W,DIV,DEPTH),boardMat,
    0,REAR_TOP_Y-DIV/2,INTERNAL_CENTER_Z,'wneki_tyl_gora');

  const cells=[];
  const dividerCenters=[];
  let cursor=leftEdge;
  dividerCenters.push(cursor+DIV/2);
  cursor+=DIV;
  for(let i=0;i<CLEAR_WIDTHS_CM.length;i++){
    const width=CLEAR_WIDTHS_CM[i];
    const left=cursor;
    const right=left+width;
    const cx=(left+right)/2;
    cells.push({index:i+1,left,right,width,cx});
    cursor=right;
    dividerCenters.push(cursor+DIV/2);
    cursor+=DIV;
  }

  dividerCenters.forEach((x,i)=>addMesh(
    THREE,group,new THREE.BoxGeometry(DIV,nicheH,DEPTH),boardMat,
    x,MATTRESS_BASE_Y+nicheH/2,INTERNAL_CENTER_Z,`wneka_tyl_pion_${String(i+1).padStart(2,'0')}`
  ));

  const clearTop=REAR_TOP_Y-DIV;
  const ledY=clearTop-1.0;
  for(const c of cells){
    const ledW=Math.max(2,c.width-1.8);
    const id=String(c.index).padStart(2,'0');
    const ledZ=BACK_INNER_Z+.45;
    addMesh(THREE,group,new THREE.BoxGeometry(ledW,.65,.8),ledMat,
      c.cx,ledY,ledZ,`led_tyl_pasek_${id}`);

    recesses.push({
      id:`wneka_tyl_${id}`,
      ledStrips:[{
        id:`led_tyl_${id}`,
        positionMm:[Math.round(c.cx*10),Math.round(ledY*10),Math.round(ledZ*10)],
        targetMm:[Math.round(c.cx*10),Math.round((ledY-12)*10),Math.round((OPEN_Z-2)*10)],
        widthMm:Math.round(ledW*10),
        heightMm:22
      }]
    });
  }

  group.userData.pattern={
    columns:7,
    rows:1,
    axis:'horizontal progression across rear wall',
    direction:'SPF -> side cushions',
    source:'Fibonacci/golden-ratio-derived descending rhythm normalized to 600→100 mm and exact 2270 mm total width',
    clearWidthsMm:[...CLEAR_WIDTHS_MM],
    clearHeightMm:Math.round(clearH*10),
    depthMm:200,
    dividerMm:18,
    fromYmm:750,
    toYmm:1200,
    ledPerNiche:true,
    ledCctApproxK:LED.cctApproxK,
    ledEmissiveIntensity:LED.emissiveIntensity,
    directPointLights:0,
    rendererLighting:'fixed-pool'
  };

  return {clearHeightMm:Math.round(clearH*10),ledCount:7};
}

export function buildLozkoV0011({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  verifyWidths();
  const built=buildLozkoV0010({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  const boardMat=whiteBoardMaterial(THREE);
  const ledMat=ledMaterial(THREE);
  const recesses=[];

  const front=buildFront({THREE,root,boardMat,ledMat,recesses});
  const rear=buildRear({THREE,root,boardMat,ledMat,recesses});

  // Jedna definicja oświetlenia dla wnęk POD i NAD materacem. Renderer tworzy
  // tę samą stałą pulę rzeczywistych źródeł dla obu stref, a wszystkie paski
  // mają identyczną emisję. Nie wracamy do dziesiątek PointLightów z v0009.
  root.userData.lighting={
    units:'mm',
    coordinateSystem:'model-local',
    recesses
  };

  root.userData.design={
    ...(root.userData.design||{}),
    frontNiches:{
      ...(root.userData.design?.frontNiches||{}),
      columns:7,
      rows:2,
      clearWidthsMm:[...CLEAR_WIDTHS_MM],
      clearHeightMm:front.clearHeightMm,
      dividerMm:18,
      led:{...LED,count:front.ledCount}
    },
    rearNiches:{
      ...(root.userData.design?.rearNiches||{}),
      columns:7,
      rows:1,
      clearWidthsMm:[...CLEAR_WIDTHS_MM],
      clearHeightMm:rear.clearHeightMm,
      dividerMm:18,
      led:{...LED,count:rear.ledCount}
    },
    lightingParity:{...DESIGN_PATCH.lightingParity}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    frontNiches:{
      ...(root.userData.nativeModel?.frontNiches||{}),
      columns:7,
      rows:2,
      clearWidths:CLEAR_WIDTHS_CM,
      clearHeight:front.clearHeightMm/10,
      divider:1.8,
      ledCount:front.ledCount,
      directPointLights:0,
      rendererLighting:'fixed-pool'
    },
    rearNiches:{
      ...(root.userData.nativeModel?.rearNiches||{}),
      clearWidths:CLEAR_WIDTHS_CM,
      clearHeight:rear.clearHeightMm/10,
      divider:1.8,
      ledCount:rear.ledCount,
      directPointLights:0,
      rendererLighting:'fixed-pool'
    },
    lightingParity:true
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0011};
