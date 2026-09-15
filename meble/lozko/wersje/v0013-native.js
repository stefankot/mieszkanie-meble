import { buildLozkoV0008 } from './v0008-native.js';

export const VERSION = 'v0013';

// Wartości wejściowe użytkownika były orientacyjne i nie uwzględniały ścianek.
// Zachowujemy ich proporcje, ale normalizujemy światła wnęk do rzeczywistej
// szerokości 2270 mm przy płytach/przegrodach 18 mm.
// Rząd 1: 515+540+150+520+367 mm -> 532+558+155+537+380 mm
// Rząd 2: 460+290+405+165+295+459 mm -> 476+300+419+171+304+474 mm
// Góra:    315+310+585+155+210+499 mm -> 326+320+605+160+217+516 mm
const ROW1_MM = Object.freeze([532, 558, 155, 537, 380]);
const ROW2_MM = Object.freeze([476, 300, 419, 171, 304, 474]);
const TOP_MM  = Object.freeze([326, 320, 605, 160, 217, 516]);
const DIV_MM = 18;
const BED_W_MM = 2270;

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0008',
  removedCushions: ['poducha_okno_1', 'poducha_okno_2'],
  retainedCushions: ['poducha_bok_1', 'poducha_bok_2'],
  frontNiches: {
    totalFaceHeightMm: 800,
    activeNicheTopMm: 726,
    depthMm: 200,
    dividerMm: 18,
    rows: 2,
    row1Position: 'upper',
    row1ClearWidthsMmFromSPF: [...ROW1_MM],
    row2Position: 'lower',
    row2ClearWidthsMmFromSPF: [...ROW2_MM],
    clearHeightMm: 299,
    plinthHeightMm: 74,
    plinthSetbackMm: 100,
    lighting: 'v0008 strong LED: emissive 12 + PointLight 85 / 520 mm'
  },
  rearUpperNiches: {
    fromYmm: 800,
    toYmm: 1200,
    heightMm: 400,
    depthMm: 200,
    dividerMm: 18,
    clearWidthsMmFromSPF: [...TOP_MM],
    clearHeightMm: 364,
    lighting: 'v0008 strong LED: emissive 12 + PointLight 85 / 520 mm'
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

function strongLedMaterial(THREE){
  const m=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffd29a', emissiveIntensity:12,
    roughness:.28, metalness:0, transparent:false, opacity:1
  });
  m.name='LED 3000K · mocny v0008';
  return m;
}

function assertRow(widthsMm){
  const clear=sum(widthsMm);
  const total=clear+(widthsMm.length+1)*DIV_MM;
  if(total!==BED_W_MM) throw new Error(`v0013: row width mismatch ${total} != ${BED_W_MM}`);
}
function sum(a){ return a.reduce((x,y)=>x+y,0); }

function buildVerticalRow({THREE,parent,boardMat,ledMat,widthsMm,bottomY,height,frontZ,backInnerZ,depth,prefix}){
  const W=BED_W_MM/10;
  const T=DIV_MM/10;
  const widths=widthsMm.map(v=>v/10);
  const leftEdge=-W/2;
  const centerZ=(frontZ+backInnerZ)/2;
  let cursor=leftEdge;
  const cells=[];

  // Lewa ścianka skrajna.
  addMesh(THREE,parent,new THREE.BoxGeometry(T,height,depth),boardMat,
    cursor+T/2,bottomY+height/2,centerZ,`${prefix}_pion_01`);
  cursor+=T;

  for(let i=0;i<widths.length;i++){
    const w=widths[i];
    const left=cursor;
    const right=left+w;
    const cx=(left+right)/2;
    cells.push({index:i+1,width:w,cx});
    cursor=right;
    addMesh(THREE,parent,new THREE.BoxGeometry(T,height,depth),boardMat,
      cursor+T/2,bottomY+height/2,centerZ,`${prefix}_pion_${String(i+2).padStart(2,'0')}`);
    cursor+=T;
  }

  if(Math.abs(cursor-W/2)>1e-6) throw new Error(`v0013: ${prefix} cursor mismatch ${cursor}`);

  const ledY=bottomY+height-1.0;
  for(const c of cells){
    const id=String(c.index).padStart(2,'0');
    const ledW=Math.max(2,c.width-1.8);
    addMesh(THREE,parent,new THREE.BoxGeometry(ledW,.65,.8),ledMat,
      c.cx,ledY,backInnerZ+.45,`${prefix}_led_pasek_${id}`);
    const light=new THREE.PointLight(0xffd39f,85,52,1.35);
    light.name=`${prefix}_led_swiatlo_${id}`;
    light.position.set(c.cx,ledY-2.0,backInnerZ+4.5);
    light.castShadow=false;
    parent.add(light);
  }
  return cells;
}

export function buildLozkoV0013({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  assertRow(ROW1_MM);
  assertRow(ROW2_MM);
  assertRow(TOP_MM);

  // v0008 pozostaje bazą ze względu na poprawną geometrię, jasność LED i placement.
  const built=buildLozkoV0008({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // Zachowaj późniejszą decyzję projektową: brak dwóch poduch wzdłuż okna.
  for(const id of DESIGN_PATCH.removedCushions) disposeTree(root.getObjectByName(id));
  if(root.userData.softGeometry){
    root.userData.softGeometry.cushionIds=[...DESIGN_PATCH.retainedCushions];
    root.userData.softGeometry.removedCushionIds=[...DESIGN_PATCH.removedCushions];
  }

  const boardMat=whiteBoardMaterial(THREE);
  const ledMat=strongLedMaterial(THREE);

  // -------------------------------------------------------------------------
  // FRONT — zachowujemy konstrukcyjną wysokość wnęk z v0008 (do spodu decku
  // 726 mm), ale każdy z dwóch rzędów ma własny układ przegród pionowych.
  // Rząd 1 = górny, Rząd 2 = dolny. Cokół/floor reveal pozostaje jak w v0008.
  // -------------------------------------------------------------------------
  disposeTree(root.getObjectByName('wneki_front_20x40x20'));

  const front=new THREE.Group();
  front.name='wneki_front_v0013';
  root.add(front);

  const FRONT_W=227;
  const T=1.8;
  const DEPTH=20;
  const PLINTH_H=7.4;
  const PLINTH_SETBACK=10;
  const FRONT_FACE_Z=81.8;
  const BACK_INNER_Z=FRONT_FACE_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-T/2;
  const INTERNAL_CENTER_Z=(FRONT_FACE_Z+BACK_INNER_Z)/2;
  const DECK_BOTTOM_Y=72.6;
  const CLEAR_H=(DECK_BOTTOM_Y-PLINTH_H-3*T)/2; // 29.9 cm

  // Cofnięty cokół jak w v0008; strefa 100 mm przed nim pozostaje odsłoniętą podłogą.
  const plinthFrontZ=FRONT_FACE_Z-PLINTH_SETBACK;
  addMesh(THREE,front,new THREE.BoxGeometry(FRONT_W,PLINTH_H,T),boardMat,
    0,PLINTH_H/2,plinthFrontZ-T/2,'wneki_cokol_74mm_cofniety_100mm');

  const nicheBodyH=DECK_BOTTOM_Y-PLINTH_H;
  addMesh(THREE,front,new THREE.BoxGeometry(FRONT_W,nicheBodyH,T),boardMat,
    0,PLINTH_H+nicheBodyH/2,BACK_PANEL_Z,'wneki_plecy');

  const shelfCentersY=[
    PLINTH_H+T/2,
    PLINTH_H+T+CLEAR_H+T/2,
    DECK_BOTTOM_Y-T/2
  ];
  shelfCentersY.forEach((y,i)=>addMesh(
    THREE,front,new THREE.BoxGeometry(FRONT_W,T,DEPTH),boardMat,
    0,y,INTERNAL_CENTER_Z,`wneka_poziom_${i+1}`
  ));

  const lowerBottom=PLINTH_H+T;
  const upperBottom=PLINTH_H+2*T+CLEAR_H;
  const lowerCells=buildVerticalRow({
    THREE,parent:front,boardMat,ledMat,widthsMm:ROW2_MM,
    bottomY:lowerBottom,height:CLEAR_H,frontZ:FRONT_FACE_Z,backInnerZ:BACK_INNER_Z,depth:DEPTH,prefix:'front_rzad2'
  });
  const upperCells=buildVerticalRow({
    THREE,parent:front,boardMat,ledMat,widthsMm:ROW1_MM,
    bottomY:upperBottom,height:CLEAR_H,frontZ:FRONT_FACE_Z,backInnerZ:BACK_INNER_Z,depth:DEPTH,prefix:'front_rzad1'
  });

  front.userData.pattern={
    direction:'SPF -> opposite side',
    row1Position:'upper',
    row1ClearWidthsMm:[...ROW1_MM],
    row2Position:'lower',
    row2ClearWidthsMm:[...ROW2_MM],
    clearHeightMm:Math.round(CLEAR_H*10),
    depthMm:200,
    dividerMm:18,
    led:'v0008 emissive12 + PointLight85/520mm'
  };

  // -------------------------------------------------------------------------
  // TYŁ — dolną wentylowaną część v0008 przy grzejniku zachowujemy. Zmieniamy
  // górny pas wnęk na dokładnie 400 mm wysokości: 800–1200 mm.
  // Krótki pas 750–800 mm domyka przejście ponad dolną częścią tylnej ściany.
  // -------------------------------------------------------------------------
  disposeTree(root.getObjectByName('wneki_tyl_fibonacci'));

  const rear=new THREE.Group();
  rear.name='wneki_tyl_v0013';
  root.add(rear);

  const REAR_OPEN_Z=-80;
  const REAR_BACK_INNER_Z=REAR_OPEN_Z-DEPTH;
  const REAR_BACK_PANEL_Z=REAR_BACK_INNER_Z-T/2;
  const REAR_CENTER_Z=(REAR_OPEN_Z+REAR_BACK_INNER_Z)/2;
  const REAR_FROM_Y=80;
  const REAR_TO_Y=120;
  const REAR_H=REAR_TO_Y-REAR_FROM_Y; // 40 cm
  const REAR_CLEAR_H=REAR_H-2*T;      // 36.4 cm

  // 50-mm pełny pas między istniejącym dołem (do 750 mm) a górą od 800 mm.
  addMesh(THREE,rear,new THREE.BoxGeometry(FRONT_W,5,T),boardMat,
    0,77.5,-80.9,'SO_v0013_pas_750_800');

  addMesh(THREE,rear,new THREE.BoxGeometry(FRONT_W,REAR_H,T),boardMat,
    0,REAR_FROM_Y+REAR_H/2,REAR_BACK_PANEL_Z,'wneki_tyl_plecy');
  addMesh(THREE,rear,new THREE.BoxGeometry(FRONT_W,T,DEPTH),boardMat,
    0,REAR_FROM_Y+T/2,REAR_CENTER_Z,'wneki_tyl_dol');
  addMesh(THREE,rear,new THREE.BoxGeometry(FRONT_W,T,DEPTH),boardMat,
    0,REAR_TO_Y-T/2,REAR_CENTER_Z,'wneki_tyl_gora');

  const topCells=buildVerticalRow({
    THREE,parent:rear,boardMat,ledMat,widthsMm:TOP_MM,
    bottomY:REAR_FROM_Y+T,height:REAR_CLEAR_H,
    frontZ:REAR_OPEN_Z,backInnerZ:REAR_BACK_INNER_Z,depth:DEPTH,prefix:'tyl_gora'
  });

  rear.userData.pattern={
    direction:'SPF -> opposite side',
    clearWidthsMm:[...TOP_MM],
    fromYmm:800,
    toYmm:1200,
    clearHeightMm:364,
    depthMm:200,
    dividerMm:18,
    led:'v0008 emissive12 + PointLight85/520mm'
  };

  root.userData.design={
    ...(root.userData.design||{}),
    baseVersion:'v0008',
    frontNiches:{...DESIGN_PATCH.frontNiches},
    rearUpperNiches:{...DESIGN_PATCH.rearUpperNiches},
    cushions:{
      ...(root.userData.design?.cushions||{}),
      removed:[...DESIGN_PATCH.removedCushions],
      retained:[...DESIGN_PATCH.retainedCushions]
    }
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    baseVersion:'v0008',
    frontNiches:{
      row1ClearWidthsMm:[...ROW1_MM], row2ClearWidthsMm:[...ROW2_MM],
      row1Position:'upper', row2Position:'lower', clearHeightMm:299,
      depthMm:200, dividerMm:18, ledCount:upperCells.length+lowerCells.length
    },
    rearUpperNiches:{
      clearWidthsMm:[...TOP_MM], fromYmm:800, toYmm:1200,
      clearHeightMm:364, depthMm:200, dividerMm:18, ledCount:topCells.length
    },
    removedCushions:[...DESIGN_PATCH.removedCushions],
    retainedCushions:[...DESIGN_PATCH.retainedCushions]
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0013};
