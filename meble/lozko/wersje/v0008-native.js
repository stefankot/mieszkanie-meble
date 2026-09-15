import { buildLozkoV0007 } from './v0007-native.js';

export const VERSION = 'v0008';

export const DESIGN_PATCH = Object.freeze({
  placement: {
    previousPositionMm: [1258, 0, 6275],
    positionMm: [1458, 0, 6275],
    rotationDeg: 90,
    shiftTowardRoomCenterMm: 200
  },
  frontFloorReveal: {
    plinthSetbackMm: 100,
    visibleFloorDepthMm: 100,
    removeGroundStrip: true
  },
  rearNiches: {
    fromYmm: 750,
    toYmm: 1200,
    depthMm: 200,
    dividerMm: 18,
    clearHeightMm: 414,
    clearWidthsMmFromSPFToCushions: [100, 155, 209, 256, 296, 330, 362, 400],
    rhythm: 'progressive Fibonacci-derived, normalized to 100→400 mm',
    led: {
      count: 8,
      position: 'rear/top of each niche',
      cctApproxK: 3000,
      emissiveIntensity: 12,
      pointLightIntensity: 85,
      pointLightDistanceMm: 520
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
    color:'#ffffff', roughness:.78, metalness:0,
    transparent:false, opacity:1, depthWrite:true, depthTest:true,
    side:THREE.FrontSide, envMapIntensity:.65
  });
  m.name='Płyta łóżka #FFFFFF';
  return m;
}

function perforatedPanelXY(THREE,width,height,thickness,{holeD=2.2,pitchX=6,pitchY=6}={}){
  const sh=new THREE.Shape();
  sh.moveTo(-width/2,-height/2);
  sh.lineTo(width/2,-height/2);
  sh.lineTo(width/2,height/2);
  sh.lineTo(-width/2,height/2);
  sh.closePath();
  const cols=Math.max(1,Math.floor((width-holeD)/pitchX)+1);
  const rows=Math.max(1,Math.floor((height-holeD)/pitchY)+1);
  const spanX=(cols-1)*pitchX, spanY=(rows-1)*pitchY;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const x=-spanX/2+c*pitchX, y=-spanY/2+r*pitchY;
    const p=new THREE.Path();
    p.absarc(x,y,holeD/2,0,Math.PI*2,false);
    sh.holes.push(p);
  }
  const g=new THREE.ExtrudeGeometry(sh,{depth:thickness,steps:1,bevelEnabled:false,curveSegments:12});
  g.translate(0,0,-thickness/2);
  g.computeVertexNormals();
  return g;
}

export function buildLozkoV0008({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0007({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  const boardMat=whiteBoardMaterial(THREE);

  // ---------------------------------------------------------------------------
  // 1. PRZESUNIĘCIE ŁÓŻKA O 200 MM W STRONĘ CENTRUM POKOJU.
  //    Przy obrocie 90° lokalne +Z odpowiada world +X, dlatego manifest przesuwa
  //    pozycję X z 1258 do 1458 mm. Grzejnik jest elementem pomieszczenia, nie
  //    łóżka, więc kompensujemy jego lokalne Z o -200 mm, aby pozostał przy ścianie.
  // ---------------------------------------------------------------------------
  const radiator=root.getObjectByName('grzejnik_1200');
  if(radiator) radiator.position.z-=20;

  // ---------------------------------------------------------------------------
  // 2. DÓŁ FRONTU: bez listwy/płyty na podłodze w 100-mm cofnięciu cokołu.
  //    Zachowujemy cofnięty pionowy cokół z v0007, ale skracamy dno korpusu od
  //    strony pokoju tak, aby między licem frontu Z=81.8 a cokołem Z=71.8 cm
  //    było dokładnie 100 mm prawdziwej, widocznej podłogi.
  //    Stary zakres dna: -80…+80 cm. Nowy: -80…+71.8 cm.
  // ---------------------------------------------------------------------------
  const floor=root.getObjectByName('dno');
  if(floor?.isMesh){
    floor.geometry?.dispose?.();
    floor.geometry=new THREE.BoxGeometry(223.4,1.8,151.8);
    floor.position.z=-4.1;
    floor.userData.frontFloorRevealMm=100;
  }

  // ---------------------------------------------------------------------------
  // 3. TYLNA ŚCIANA: wnęki od podstawy materaca (750 mm) do 1200 mm.
  //    Głębokość 200 mm idzie ZA łóżko, w przestrzeń uzyskaną po przesunięciu
  //    korpusu o 200 mm. Otwór wnęk jest na wewnętrznym licu tylnej ściany
  //    Z=-80 cm, a plecy na Z=-100 cm. Po przesunięciu nadal zostaje ok. 200 mm
  //    między plecami wnęk a ścianą pokoju; grzejnik pozostaje przy ścianie.
  // ---------------------------------------------------------------------------
  ['SO_lewy_slup','SO_prawy_slup','SO_dol','SO_gora','SO_perforacja_grzejnik'].forEach(
    id=>disposeTree(root.getObjectByName(id))
  );

  const BED_W=227;
  const T=1.8;
  const REAR_CENTER_Z=-80.9;
  const MATTRESS_BASE_Y=75;
  const REAR_TOP_Y=120;
  const RADIATOR_W=120;
  const LOWER_H=MATTRESS_BASE_Y;
  const SIDE_STILE_W=(BED_W-RADIATOR_W)/2;

  // Dolna część tylnej ściany pozostaje do wysokości podstawy materaca.
  // Zachowujemy wentylację grzejnika w dostępnej dolnej strefie 180…750 mm.
  addMesh(THREE,root,new THREE.BoxGeometry(SIDE_STILE_W,LOWER_H,T),boardMat,
    -(RADIATOR_W/2+SIDE_STILE_W/2),LOWER_H/2,REAR_CENTER_Z,'SO_v0008_lewy_dolny_slup');
  addMesh(THREE,root,new THREE.BoxGeometry(SIDE_STILE_W,LOWER_H,T),boardMat,
    +(RADIATOR_W/2+SIDE_STILE_W/2),LOWER_H/2,REAR_CENTER_Z,'SO_v0008_prawy_dolny_slup');
  addMesh(THREE,root,new THREE.BoxGeometry(RADIATOR_W,18,T),boardMat,
    0,9,REAR_CENTER_Z,'SO_v0008_dol_pod_grzejnikiem');
  addMesh(THREE,root,perforatedPanelXY(THREE,RADIATOR_W,57,T,{holeD:2.2,pitchX:6,pitchY:6}),boardMat,
    0,46.5,REAR_CENTER_Z,'SO_v0008_perforacja_grzejnik_18_75');

  const rear=new THREE.Group();
  rear.name='wneki_tyl_fibonacci';
  root.add(rear);

  const OPEN_Z=-80;
  const DEPTH=20;
  const BACK_INNER_Z=OPEN_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-T/2;
  const INTERNAL_CENTER_Z=(OPEN_Z+BACK_INNER_Z)/2;
  const clearWidths=[10,15.5,20.9,25.6,29.6,33.0,36.2,40.0]; // SPF -> poduszki
  const nicheH=REAR_TOP_Y-MATTRESS_BASE_Y; // 45 cm
  const clearH=nicheH-2*T;                 // 41.4 cm
  const leftEdge=-BED_W/2;

  // Plecy, dół i góra wnęk.
  addMesh(THREE,rear,new THREE.BoxGeometry(BED_W,nicheH,T),boardMat,
    0,MATTRESS_BASE_Y+nicheH/2,BACK_PANEL_Z,'wneki_tyl_plecy');
  addMesh(THREE,rear,new THREE.BoxGeometry(BED_W,T,DEPTH),boardMat,
    0,MATTRESS_BASE_Y+T/2,INTERNAL_CENTER_Z,'wneki_tyl_dol');
  addMesh(THREE,rear,new THREE.BoxGeometry(BED_W,T,DEPTH),boardMat,
    0,REAR_TOP_Y-T/2,INTERNAL_CENTER_Z,'wneki_tyl_gora');

  // 9 pionowych przegród dla 8 progresywnych pól.
  const cells=[];
  let cursor=leftEdge;
  const dividerCenters=[];
  dividerCenters.push(cursor+T/2);
  cursor+=T;
  for(let i=0;i<clearWidths.length;i++){
    const w=clearWidths[i];
    const cellLeft=cursor;
    const cellRight=cursor+w;
    const cx=(cellLeft+cellRight)/2;
    cells.push({index:i+1,left:cellLeft,right:cellRight,width:w,cx});
    cursor=cellRight;
    dividerCenters.push(cursor+T/2);
    cursor+=T;
  }
  // Suma: 210.8 cm światła + 9×1.8 cm = 227 cm dokładnie.
  dividerCenters.forEach((x,i)=>addMesh(
    THREE,rear,new THREE.BoxGeometry(T,nicheH,DEPTH),boardMat,
    x,MATTRESS_BASE_Y+nicheH/2,INTERNAL_CENTER_Z,`wneka_tyl_pion_${String(i+1).padStart(2,'0')}`
  ));

  // LED identycznie mocne jak we wnękach frontowych v0007.
  const ledMat=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffd29a', emissiveIntensity:12,
    roughness:.28, metalness:0, transparent:false, opacity:1
  });
  ledMat.name='LED 3000K · mocny';

  const clearTop=REAR_TOP_Y-T;
  const ledY=clearTop-1.0;
  for(const c of cells){
    const ledW=Math.max(2,c.width-1.8);
    const id=String(c.index).padStart(2,'0');
    addMesh(THREE,rear,new THREE.BoxGeometry(ledW,.65,.8),ledMat,
      c.cx,ledY,BACK_INNER_Z+.45,`led_tyl_pasek_${id}`);
    const light=new THREE.PointLight(0xffd39f,85,52,1.35);
    light.name=`led_tyl_swiatlo_${id}`;
    light.position.set(c.cx,ledY-2.0,BACK_INNER_Z+4.5);
    light.castShadow=false;
    rear.add(light);
  }

  rear.userData.pattern={
    axis:'horizontal progression across rear wall',
    direction:'SPF -> cushions',
    source:'Fibonacci-derived progressive rhythm normalized to exact endpoints',
    clearWidthsMm:clearWidths.map(v=>Math.round(v*10)),
    clearHeightMm:Math.round(clearH*10),
    depthMm:200,
    dividerMm:18,
    fromYmm:750,
    toYmm:1200,
    ledPerNiche:true,
    ledCctApproxK:3000,
    ledEmissiveIntensity:12,
    ledPointLightIntensity:85
  };

  root.userData.design={
    ...(root.userData.design||{}),
    placement:{...DESIGN_PATCH.placement},
    frontFloorReveal:{...DESIGN_PATCH.frontFloorReveal},
    rearNiches:{...DESIGN_PATCH.rearNiches}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    placementMm:[1458,0,6275],
    frontFloorRevealMm:100,
    rearNiches:{
      y:[75,120],
      depth:20,
      divider:1.8,
      clearHeight:clearH,
      clearWidths:[...clearWidths],
      direction:'SPF -> cushions',
      ledCount:8,
      ledPosition:'rear/top',
      ledEmissiveIntensity:12,
      ledPointLightIntensity:85
    },
    radiatorCompensationLocalZ:-20
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0008};