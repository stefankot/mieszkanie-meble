import { buildLozkoV0003 } from './v0003-native.js';

export const VERSION = 'v0004';

export const DESIGN_PATCH = Object.freeze({
  roomHeightMm: 2600,
  pegboard: {
    widthMm: 1600,
    perforatedPanelHeightMm: 1800,
    topMm: 2600,
    perforatedBottomMm: 800,
    lowerSolidExtensionMm: 50,
    totalBottomMm: 750,
    totalVisualHeightMm: 1850,
    colorName: 'BABY BLUE®',
    pantone: '12-4611 TPG',
    color: '#cee7ef',
    pitchMm: 220,
    sideMarginMm: 250,
    verticalMarginMm: 350,
    columns: 6,
    rows: 6,
    holeCount: 36,
    holeDiameterMm: 20,
    gridFieldMm: [1100, 1100]
  },
  frontLattice: {
    panelWidthMm: 2270,
    panelHeightMm: 800,
    battenWidthMm: 18,
    projectionMm: 20,
    nominalCellWidthMm: 400,
    verticalRows: 2,
    clearCellHeightMm: 373,
    fullWidthCells: 5,
    finalNarrowCellMm: 144,
    startSide: 'right / side without perforated SPF',
    finishSide: 'left / perforated-SPF side'
  }
});

function disposeObject(o){
  if(!o) return;
  o.parent?.remove(o);
  o.geometry?.dispose?.();
}

function perforatedPanelYZ(THREE, width, height, thickness, {holeD,pitch,cols,rows}){
  const sh=new THREE.Shape();
  sh.moveTo(-width/2,-height/2);
  sh.lineTo(width/2,-height/2);
  sh.lineTo(width/2,height/2);
  sh.lineTo(-width/2,height/2);
  sh.closePath();

  const spanX=(cols-1)*pitch;
  const spanY=(rows-1)*pitch;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const x=-spanX/2+c*pitch;
    const y=-spanY/2+r*pitch;
    const hole=new THREE.Path();
    hole.absarc(x,y,holeD/2,0,Math.PI*2,false);
    sh.holes.push(hole);
  }

  const g=new THREE.ExtrudeGeometry(sh,{
    depth:thickness,
    steps:1,
    bevelEnabled:false,
    curveSegments:20
  });
  g.translate(0,0,-thickness/2);
  g.rotateY(Math.PI/2);
  g.computeVertexNormals();
  return g;
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

export function buildLozkoV0004({THREE,placement={positionMm:[1258,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0003({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // ---------------------------------------------------------------------------
  // 1. SPF: mieszkanie ma 2600 mm wysokości.
  //    Płyta perforowana 1600 × 1800 mm jest dosunięta do sufitu:
  //    800..2600 mm. Pod nią dokładamy 50 mm pełnej płyty bez otworów,
  //    aby błękitna powierzchnia dochodziła do poziomu platformy 750 mm.
  // ---------------------------------------------------------------------------
  const oldPanel=root.getObjectByName('SPF_baby_blue_6x6');
  const oldX=oldPanel?.position.x ?? -112.6;
  disposeObject(oldPanel);

  const babyBlue=new THREE.MeshPhysicalMaterial({
    color:DESIGN_PATCH.pegboard.color,
    roughness:.82,
    metalness:0,
    transparent:false,
    opacity:1,
    depthWrite:true,
    depthTest:true,
    side:THREE.FrontSide,
    envMapIntensity:.65
  });
  babyBlue.name='BABY BLUE® · Pantone 12-4611 TPG';

  addMesh(
    THREE,
    root,
    perforatedPanelYZ(THREE,160,180,1.8,{holeD:2,pitch:22,cols:6,rows:6}),
    babyBlue,
    oldX,
    170,
    0,
    'SPF_baby_blue_6x6'
  );

  addMesh(
    THREE,
    root,
    new THREE.BoxGeometry(1.8,5,160),
    babyBlue,
    oldX,
    77.5,
    0,
    'SPF_baby_blue_dol_pelny_50mm'
  );

  // ---------------------------------------------------------------------------
  // 2. BOAZERIA NA FRONCIE.
  //    Listwy 18 mm szerokości, 20 mm projekcji. Dwa rzędy po 373 mm światła
  //    (wariant A zaakceptowany przez użytkownika): 18 + 373 + 18 + 373 + 18 = 800.
  //    Poziomo zaczynamy od prawej strony, tj. strony bez perforowanego SPF.
  //    Pięć pełnych pól ma po 400 mm światła; ostatnie przy SPF ma 144 mm,
  //    dzięki czemu wzór kończy się dokładnie na 2270 mm szerokości frontu.
  // ---------------------------------------------------------------------------
  const front=root.getObjectByName('front_80cm');
  if(!front) throw new Error('v0004: brak front_80cm do wykonania boazerii.');

  const lattice=new THREE.Group();
  lattice.name='boazeria_front_40x40';
  root.add(lattice);

  const green=front.material.clone();
  green.name='Zielona boazeria frontowa';
  green.transparent=false;
  green.opacity=1;
  green.depthWrite=true;
  green.depthTest=true;

  const FRONT_W=227;
  const FRONT_H=80;
  const RAIL=1.8;
  const PROJ=2.0;
  const STANDARD_CLEAR=40;
  const RIGHT=FRONT_W/2;
  const LEFT=-FRONT_W/2;
  const FRONT_SURFACE_Z=81.8;
  const Z=FRONT_SURFACE_Z + PROJ/2 + .001;

  const cells=[];
  const railCenters=[];
  let cursor=RIGHT;

  // prawa listwa brzegowa — start od strony bez SPF
  railCenters.push(cursor-RAIL/2);
  cursor-=RAIL;

  // pięć pełnych pól po 400 mm
  for(let i=0;i<5;i++){
    const right=cursor;
    const left=cursor-STANDARD_CLEAR;
    cells.push({left,right,width:STANDARD_CLEAR});
    cursor=left;
    railCenters.push(cursor-RAIL/2);
    cursor-=RAIL;
  }

  // końcowe węższe pole przy perforowanym SPF
  const lastLeft=LEFT+RAIL;
  const lastWidth=cursor-lastLeft;
  cells.push({left:lastLeft,right:cursor,width:lastWidth});
  railCenters.push(LEFT+RAIL/2);

  // listwy pionowe są ciągłe na pełne 800 mm
  railCenters.forEach((x,i)=>addMesh(
    THREE,lattice,new THREE.BoxGeometry(RAIL,FRONT_H,PROJ),green,
    x,FRONT_H/2,Z,`boazeria_pion_${String(i+1).padStart(2,'0')}`
  ));

  // poziome listwy: dół, środek, góra. Segmentowane pomiędzy pionowymi,
  // żeby nie nakładać identycznych powierzchni w punktach przecięcia.
  const horizontalY=[RAIL/2, FRONT_H/2, FRONT_H-RAIL/2];
  horizontalY.forEach((y,row)=>{
    cells.forEach((cell,col)=>{
      const cx=(cell.left+cell.right)/2;
      addMesh(
        THREE,lattice,new THREE.BoxGeometry(cell.width,RAIL,PROJ),green,
        cx,y,Z,`boazeria_poziom_${row+1}_${col+1}`
      );
    });
  });

  lattice.userData.pattern={
    nominalCellMm:[400,400],
    actualClearCellHeightMm:373,
    battenWidthMm:18,
    projectionMm:20,
    columns:6,
    rows:2,
    clearWidthsMm:cells.map(c=>Math.round(c.width*10)),
    startSide:'right / no perforated panel',
    finalCellSide:'left / SPF',
    totalWidthMm:2270,
    totalHeightMm:800
  };

  root.userData.design={
    ...(root.userData.design||{}),
    roomHeightMm:2600,
    spf:{
      widthMm:1600,
      perforatedPanelHeightMm:1800,
      lowerEdgeMm:800,
      upperEdgeMm:2600,
      lowerSolidExtensionMm:50,
      totalBottomMm:750,
      totalVisualHeightMm:1850,
      holeDiameterMm:20,
      pitchMm:220,
      columns:6,
      rows:6,
      sideMarginMm:250,
      verticalMarginMm:350,
      gridFieldMm:[1100,1100],
      pantone:'12-4611 TPG',
      color:'#cee7ef'
    },
    frontLattice:{...DESIGN_PATCH.frontLattice}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    roomHeight:260,
    pegboard:{
      width:160,
      perforatedHeight:180,
      bottom:80,
      top:260,
      lowerSolidExtension:5,
      totalBottom:75,
      holes:[6,6],
      pitch:22,
      holeDiameter:2,
      sideMargin:25,
      verticalMargin:35,
      field:[110,110],
      color:'#cee7ef',
      pantone:'12-4611 TPG'
    },
    frontLattice:{
      panel:[227,80],
      railWidth:1.8,
      projection:2,
      rows:2,
      clearCellHeight:37.3,
      clearWidths:[40,40,40,40,40,14.4],
      startSide:'right'
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0004};
