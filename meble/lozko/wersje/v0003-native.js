import { buildLozkoV0002 } from './v0002-native.js';

export const VERSION = 'v0003';

export const DESIGN_PATCH = Object.freeze({
  pegboard: {
    widthMm: 1600,
    heightMm: 1800,
    topMm: 2500,
    bottomMm: 700,
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
  cushions: {
    source: 'bazowa-95056a0097fc.js',
    restoredIds: [
      'poducha_okno_1',
      'poducha_okno_2',
      'poducha_bok_1',
      'poducha_bok_2'
    ],
    geometry: 'closed triangular prisms from pre-v0002 model'
  }
});

function disposeObject(o){
  if(!o) return;
  o.parent?.remove(o);
  o.geometry?.dispose?.();
  // Nie zwalniamy materiału: tkanina jest współdzielona z materacem.
}

function finishPrism(THREE, g, p, idx){
  // Dokładnie ta sama logika co w bazowej wersji sprzed modyfikacji v0002:
  // domknięta bryła, kontrola orientacji trójkątów, potem rozdzielenie wierzchołków
  // dla ostrych, nieprzezroczystych ścian klina.
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
  let volume=0;
  for(let i=0;i<idx.length;i+=3){
    a.fromArray(p,idx[i]*3);
    b.fromArray(p,idx[i+1]*3);
    c.fromArray(p,idx[i+2]*3);
    volume += a.dot(b.cross(c));
  }
  if(volume<0){
    for(let i=0;i<idx.length;i+=3){
      [idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
    }
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setIndex(idx);
  const solid=g.toNonIndexed();
  g.dispose();
  solid.computeVertexNormals();
  return solid;
}

function makeTriPrismX(THREE, len, depth, height){
  const L=len/2;
  const p=[
    -L,0,0, -L,0,depth, -L,height,0,
     L,0,0,  L,0,depth,  L,height,0
  ];
  const idx=[
    0,2,1, 3,4,5,
    0,1,4, 0,4,3,
    0,3,5, 0,5,2,
    1,2,5, 1,5,4
  ];
  return finishPrism(THREE,new THREE.BufferGeometry(),p,idx);
}

function makeTriPrismZ(THREE, len, depth, height){
  const L=len/2;
  const p=[
    0,0,-L, depth,0,-L, 0,height,-L,
    0,0, L, depth,0, L, 0,height, L
  ];
  const idx=[
    0,2,1, 3,4,5,
    0,1,4, 0,4,3,
    0,3,5, 0,5,2,
    1,2,5, 1,5,4
  ];
  return finishPrism(THREE,new THREE.BufferGeometry(),p,idx);
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

export function buildLozkoV0003({THREE,placement={positionMm:[1258,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0002({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // ---------------------------------------------------------------------------
  // 1. SPF — dokładne nowe parametry wykonawcze użytkownika.
  // Panel ma 1600 × 1800 mm i dochodzi do sufitu 2500 mm, więc dolna krawędź
  // wypada na 700 mm. Pole 6×6 przy kroku 220 mm ma dokładnie 1100×1100 mm:
  // margines 250 mm po bokach i 350 mm góra/dół.
  // ---------------------------------------------------------------------------
  const oldPanel=root.getObjectByName('SPF_blekit_8x8');
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
    160,
    0,
    'SPF_baby_blue_6x6'
  );

  // ---------------------------------------------------------------------------
  // 2. PODUCHY — przywrócenie geometrii i ID z bazowej wersji sprzed v0002.
  // Usuwamy cztery wadliwe siatki v0002 i odtwarzamy dokładny closed-solid wedge.
  // Materiał pozostaje biały, o grubym splocie, zgodnie z aktualną decyzją.
  // ---------------------------------------------------------------------------
  const currentCushionNames=['poducha_tyl_1','poducha_tyl_2','poducha_prawa_1','poducha_prawa_2'];
  const sample=currentCushionNames.map(n=>root.getObjectByName(n)).find(Boolean);
  const cushionMaterial=sample?.material?.clone?.() || new THREE.MeshPhysicalMaterial({
    color:'#f3f1ea',roughness:.98,metalness:0,transparent:false,opacity:1,transmission:0,
    side:THREE.FrontSide,depthWrite:true,depthTest:true
  });
  cushionMaterial.name='Biała tkanina — gruby splot / poduchy';
  cushionMaterial.transparent=false;
  cushionMaterial.opacity=1;
  if('transmission' in cushionMaterial) cushionMaterial.transmission=0;
  cushionMaterial.side=THREE.FrontSide;
  cushionMaterial.depthWrite=true;
  cushionMaterial.depthTest=true;
  cushionMaterial.needsUpdate=true;

  for(const n of currentCushionNames) disposeObject(root.getObjectByName(n));

  const lift=root.getObjectByName('lift');
  if(!lift) throw new Error('v0003: brak grupy lift do odtworzenia poduch.');

  const cushionGroup=new THREE.Group();
  cushionGroup.name='poduchy_L';
  lift.add(cushionGroup);

  // Wartości i ID z wersji bazowej:
  const CUSH_L=80, CUSH_H=40, CUSH_D=18;
  const EPS_WALL=.6, EPS_SEAM=.2;
  const CUSH_BASE_Y=14;               // materac 75→89 cm, więc poduchy startują na 89 cm
  const X_RIGHT_IN=111.7;
  const SIDE_CUSH_X=X_RIGHT_IN-EPS_WALL; // 111.1
  const WINDOW_CUSH_END_X=SIDE_CUSH_X-CUSH_D;
  const WINDOW_CUSH_START_X=WINDOW_CUSH_END_X-160;
  const WINDOW_CUSH_1_X=WINDOW_CUSH_START_X+40;
  const WINDOW_CUSH_2_X=WINDOW_CUSH_START_X+120;

  addMesh(THREE,cushionGroup,makeTriPrismX(THREE,CUSH_L+EPS_SEAM,CUSH_D,CUSH_H),cushionMaterial,
    WINDOW_CUSH_1_X,CUSH_BASE_Y,EPS_WALL,'poducha_okno_1');
  addMesh(THREE,cushionGroup,makeTriPrismX(THREE,CUSH_L+EPS_SEAM,CUSH_D,CUSH_H),cushionMaterial,
    WINDOW_CUSH_2_X,CUSH_BASE_Y,EPS_WALL,'poducha_okno_2');
  addMesh(THREE,cushionGroup,makeTriPrismZ(THREE,CUSH_L+EPS_SEAM,-CUSH_D,CUSH_H),cushionMaterial,
    SIDE_CUSH_X,CUSH_BASE_Y,40-EPS_SEAM/2,'poducha_bok_1');
  addMesh(THREE,cushionGroup,makeTriPrismZ(THREE,CUSH_L+EPS_SEAM,-CUSH_D,CUSH_H),cushionMaterial,
    SIDE_CUSH_X,CUSH_BASE_Y,120-EPS_SEAM/2,'poducha_bok_2');

  // Ponownie przypisz interakcję głównego liftu do nowych potomków.
  cushionGroup.traverse(n=>{ n.userData.ruchId='lozko:lift'; });

  root.userData.design={
    ...(root.userData.design||{}),
    colors:{...(root.userData.design?.colors||{}),pegboardBlue:DESIGN_PATCH.pegboard.color},
    spf:{
      widthMm:1600,
      heightMm:1800,
      lowerEdgeMm:700,
      upperEdgeMm:2500,
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
    cushions:{...DESIGN_PATCH.cushions}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    pegboard:{
      width:160,
      height:180,
      bottom:70,
      top:250,
      holes:[6,6],
      pitch:22,
      holeDiameter:2,
      sideMargin:25,
      verticalMargin:35,
      field:[110,110],
      color:'#cee7ef',
      pantone:'12-4611 TPG'
    },
    cushionIds:['poducha_okno_1','poducha_okno_2','poducha_bok_1','poducha_bok_2']
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0003};
