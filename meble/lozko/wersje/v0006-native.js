import { buildLozkoV0005 } from './v0005-native.js';

export const VERSION = 'v0006';

export const DESIGN_PATCH = Object.freeze({
  boardColor: '#ffffff',
  frontNiches: {
    panelWidthMm: 2270,
    panelHeightMm: 800,
    depthMm: 200,
    dividerMm: 18,
    columns: 10,
    rows: 2,
    clearWidthMm: 207.2,
    clearHeightMm: 336,
    topStructuralBandMm: 74,
    led: {
      count: 20,
      position: 'rear/top of each niche',
      cctApproxK: 3000,
      emissiveColor: '#ffd9a3'
    }
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
    color:DESIGN_PATCH.boardColor,
    roughness:.78,
    metalness:0,
    transparent:false,
    opacity:1,
    depthWrite:true,
    depthTest:true,
    side:THREE.FrontSide,
    envMapIntensity:.65
  });
  m.name='Płyta łóżka #FFFFFF';
  return m;
}

export function buildLozkoV0006({THREE,placement={positionMm:[1258,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0005({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  const boardMat=whiteBoardMaterial(THREE);

  // ---------------------------------------------------------------------------
  // 1. Kolor wszystkich płyt łóżka: #fff.
  //    BABY BLUE, stal, tkanina, TV, drony, grzejnik i LED pozostają osobne.
  // ---------------------------------------------------------------------------
  root.traverse(o=>{
    if(!o.isMesh || !o.material) return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    const isBedBoard=mats.some(m=>{
      const n=m?.name||'';
      return n==='Płyta łóżka #BCC6C2' ||
             n==='Zielona płyta łóżka' ||
             n==='Zielona boazeria frontowa' ||
             n==='Płyta łóżka #FFFFFF';
    });
    if(isBedBoard) o.material=boardMat;
  });

  // ---------------------------------------------------------------------------
  // 2. Front: usuwamy płytę pełną i kratkę v0005, budujemy 20 prawdziwych wnęk.
  //    Ograniczenie konstrukcyjne: platforma zaczyna się na Y=726 mm (spód decku),
  //    więc wnęki nie mogą wejść w jej objętość. Dwa rzędy mają dlatego po
  //    336 mm światła; to najbliższy bezkolizyjny podział do ~400 mm.
  //
  //    Szerokość: 10 kolumn. 11 przegród ×18 mm zostawia 2072 mm światła,
  //    czyli dokładnie 207.2 mm na każdą wnękę (~200 mm).
  //    Głębokość światła: 200 mm od lica frontu do wewnętrznej powierzchni pleców.
  // ---------------------------------------------------------------------------
  disposeTree(root.getObjectByName('boazeria_front_10x20'));
  disposeTree(root.getObjectByName('front_80cm'));

  const niches=new THREE.Group();
  niches.name='wneki_front_20x40x20';
  root.add(niches);

  const FRONT_W=227;           // 2270 mm
  const FRONT_H=80;            // 800 mm
  const DIV=1.8;               // 18 mm
  const DEPTH=20;              // 200 mm clear depth
  const FRONT_FACE_Z=81.8;     // front outer plane
  const BACK_INNER_Z=FRONT_FACE_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-DIV/2;
  const INTERNAL_CENTER_Z=(FRONT_FACE_Z+BACK_INNER_Z)/2;

  const DECK_BOTTOM_Y=72.6;    // deck top 75 cm, thickness 2.4 cm
  const TOP_BAND_H=FRONT_H-DECK_BOTTOM_Y; // 7.4 cm = 74 mm
  const CLEAR_H=(DECK_BOTTOM_Y-3*DIV)/2; // 33.6 cm = 336 mm
  const CLEAR_W=(FRONT_W-11*DIV)/10;     // 20.72 cm = 207.2 mm

  // Plecy wnęk: kończą się dokładnie pod platformą.
  addMesh(
    THREE,niches,new THREE.BoxGeometry(FRONT_W,DECK_BOTTOM_Y,DIV),boardMat,
    0,DECK_BOTTOM_Y/2,BACK_PANEL_Z,'wneki_plecy'
  );

  // Górny pełny pas 74 mm na samym froncie — nie wchodzi pod platformę.
  addMesh(
    THREE,niches,new THREE.BoxGeometry(FRONT_W,TOP_BAND_H,DIV),boardMat,
    0,DECK_BOTTOM_Y+TOP_BAND_H/2,FRONT_FACE_Z-DIV/2,'wneki_pas_gorny_74mm'
  );

  // Pionowe ściany: 11 sztuk, od dołu do spodu platformy.
  const leftEdge=-FRONT_W/2;
  const dividerCenters=[];
  for(let i=0;i<=10;i++){
    const x=leftEdge+DIV/2+i*(CLEAR_W+DIV);
    dividerCenters.push(x);
    addMesh(
      THREE,niches,new THREE.BoxGeometry(DIV,DECK_BOTTOM_Y,DEPTH),boardMat,
      x,DECK_BOTTOM_Y/2,INTERNAL_CENTER_Z,`wneka_pion_${String(i+1).padStart(2,'0')}`
    );
  }

  // Dół, półka środkowa i sufit wnęk. Sufit kończy się na Y=726 mm,
  // więc nie przecina platformy.
  const shelfCentersY=[DIV/2, DIV+CLEAR_H+DIV/2, DECK_BOTTOM_Y-DIV/2];
  shelfCentersY.forEach((y,i)=>addMesh(
    THREE,niches,new THREE.BoxGeometry(FRONT_W,DIV,DEPTH),boardMat,
    0,y,INTERNAL_CENTER_Z,`wneka_poziom_${i+1}`
  ));

  // ---------------------------------------------------------------------------
  // 3. LED: pasek na tylnej ścianie, tuż pod górą każdej wnęki.
  //    Każdy pasek ma własne delikatne źródło światła, żeby wnęka była realnie
  //    oświetlona, a nie tylko miała materiał emissive.
  // ---------------------------------------------------------------------------
  const ledMat=new THREE.MeshStandardMaterial({
    color:'#fff4df',
    emissive:DESIGN_PATCH.frontNiches.led.emissiveColor,
    emissiveIntensity:3.0,
    roughness:.35,
    metalness:0,
    transparent:false,
    opacity:1
  });
  ledMat.name='LED 3000K';

  const rowBottoms=[DIV, 2*DIV+CLEAR_H];
  const cellCenters=[];
  for(let col=0;col<10;col++){
    const leftInner=leftEdge+DIV+col*(CLEAR_W+DIV);
    const cx=leftInner+CLEAR_W/2;
    for(let row=0;row<2;row++){
      const clearBottom=rowBottoms[row];
      const clearTop=clearBottom+CLEAR_H;
      const ledY=clearTop-1.2;
      const ledZ=BACK_INNER_Z+.35;
      const ledW=Math.max(2,CLEAR_W-2.0);
      const id=`${row+1}_${String(col+1).padStart(2,'0')}`;

      addMesh(
        THREE,niches,new THREE.BoxGeometry(ledW,.6,.6),ledMat,
        cx,ledY,ledZ,`led_pasek_${id}`
      );

      const light=new THREE.PointLight(0xffd9a3,10,36,2);
      light.name=`led_swiatlo_${id}`;
      light.position.set(cx,ledY-2.2,BACK_INNER_Z+3.5);
      light.castShadow=false;
      niches.add(light);

      cellCenters.push({
        id:`wneka_${id}`,
        centerCm:[cx,(clearBottom+clearTop)/2,(FRONT_FACE_Z+BACK_INNER_Z)/2],
        clearMm:[Math.round(CLEAR_W*10),Math.round(CLEAR_H*10),200]
      });
    }
  }

  niches.userData.pattern={
    columns:10,
    rows:2,
    clearSizeMm:[Math.round(CLEAR_W*10),Math.round(CLEAR_H*10),200],
    dividerMm:18,
    topStructuralBandMm:74,
    totalNiches:20,
    ledPerNiche:true,
    ledLocation:'rear/top',
    ledCctApproxK:3000,
    cells:cellCenters
  };

  root.userData.design={
    ...(root.userData.design||{}),
    colors:{
      ...(root.userData.design?.colors||{}),
      bedGreen:'#ffffff',
      bedBoard:'#ffffff'
    },
    frontLattice:null,
    frontNiches:{...DESIGN_PATCH.frontNiches}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    boardColor:'#ffffff',
    frontLattice:null,
    frontNiches:{
      panel:[227,80],
      depth:20,
      divider:1.8,
      columns:10,
      rows:2,
      clearWidth:Math.round(CLEAR_W*1000)/1000,
      clearHeight:Math.round(CLEAR_H*1000)/1000,
      topStructuralBand:7.4,
      ledCount:20,
      ledPosition:'rear/top',
      ledCctApproxK:3000
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0006};
