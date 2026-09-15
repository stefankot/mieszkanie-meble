import { buildLozkoV0004 } from './v0004-native.js';

export const VERSION = 'v0005';

export const DESIGN_PATCH = Object.freeze({
  boardColor: '#BCC6C2',
  stairs: null,
  steelShelf: {
    side: 'left / perforated-SPF side',
    widthMm: 234,
    depthMm: 1600,
    topMm: 890
  },
  frontLattice: {
    panelWidthMm: 2270,
    panelHeightMm: 800,
    battenWidthMm: 18,
    projectionMm: 30,
    rows: 4,
    clearCellHeightMm: 177.5,
    columns: 20,
    regularClearCellWidthMm: 95,
    regularColumns: 19,
    finalClearCellWidthMm: 87,
    startSide: 'right / side without perforated SPF',
    finalNarrowCellSide: 'left / perforated-SPF side'
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

function materialForBoards(THREE){
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
  m.name='Płyta łóżka #BCC6C2';
  return m;
}

export function buildLozkoV0005({THREE,placement={positionMm:[1258,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0004({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  const boardMat=materialForBoards(THREE);

  // ---------------------------------------------------------------------------
  // 1. USUNIĘCIE SCHODKÓW.
  // ---------------------------------------------------------------------------
  disposeTree(root.getObjectByName('schodek_1_25cm'));
  disposeTree(root.getObjectByName('schodek_2_50cm'));

  // ---------------------------------------------------------------------------
  // 2. ZMIANA KOLORU WSZYSTKICH ZIELONYCH PŁYT ŁÓŻKA NA #BCC6C2.
  //    Nie zmieniamy BABY BLUE, stali, tkanin, dronów, TV ani grzejnika.
  // ---------------------------------------------------------------------------
  root.traverse(o=>{
    if(!o.isMesh || !o.material) return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    const isBedBoard=mats.some(m=>{
      const n=m?.name||'';
      return n==='Zielona płyta łóżka' || n==='Zielona boazeria frontowa' || n==='Płyta łóżka #BCC6C2';
    });
    if(isBedBoard) o.material=boardMat;
  });

  // ---------------------------------------------------------------------------
  // 3. STALOWA PÓŁKA / SCHOWEK 234 MM — PRZENIESIONA Z PRAWEGO NA LEWY KONIEC.
  //    Przywracamy układ: lewy pas 234 mm, materac 2000 mm dosunięty do prawej.
  // ---------------------------------------------------------------------------
  const X_LEFT_IN=-111.7;
  const X_RIGHT_IN=111.7;
  const SIDE_W=23.4;
  const SIDE_CENTER_LEFT=-100.0;
  const DIVIDER_LEFT=-89.2;
  const MAT_CENTER_RIGHT=11.7;

  const sidePivot=root.getObjectByName('os:lozko:sideLift');
  const sideLift=root.getObjectByName('sideLift');
  const sideRuch=built.ruchy?.find(r=>r.id==='lozko:sideLift');
  if(!sidePivot || !sideLift || !sideRuch) throw new Error('v0005: brak mechanizmu sideLift.');

  sidePivot.position.x=X_LEFT_IN;
  sideRuch.bazowaPozycja=sidePivot.position.clone();
  sideRuch.kierunek=[0,0,1];
  sideRuch.etykieta='Lewa półka / schowek';

  const shelfCore=root.getObjectByName('prawa_polka_rdzen');
  const shelfSteelTop=root.getObjectByName('prawa_polka_stal_gora');
  if(shelfCore) shelfCore.position.x=SIDE_W/2;
  if(shelfSteelTop) shelfSteelTop.position.x=SIDE_W/2;

  const shelfSteelFront=root.getObjectByName('prawa_polka_stal_front');
  const shelfFrontExtension=root.getObjectByName('prawa_polka_front_nadstawka');
  const divider=root.getObjectByName('przegroda_prawej_polki');
  if(shelfSteelFront) shelfSteelFront.position.x=SIDE_CENTER_LEFT;
  if(shelfFrontExtension) shelfFrontExtension.position.x=SIDE_CENTER_LEFT;
  if(divider) divider.position.x=DIVIDER_LEFT;

  // Materac i platforma przesuwają się na prawą stronę, żeby zachować 2000 + 234 = 2234 mm.
  const deck=root.getObjectByName('platforma');
  const mattress=root.getObjectByName('materac_bialy');
  const railLeft=root.getObjectByName('listwa_lewa');
  const railRight=root.getObjectByName('listwa_prawa');
  if(deck) deck.position.x=MAT_CENTER_RIGHT;
  if(mattress) mattress.position.x=MAT_CENTER_RIGHT;
  if(railLeft) railLeft.position.x=-86.8;
  if(railRight) railRight.position.x=110.2;

  // ---------------------------------------------------------------------------
  // 4. SIŁOWNIKI — odtwarzamy je względem nowego środka materaca.
  //    Stare były liczone z położenia materaca z v0002.
  // ---------------------------------------------------------------------------
  disposeTree(root.getObjectByName('silowniki'));
  const mainLift=root.getObjectByName('lift');
  if(!mainLift) throw new Error('v0005: brak grupy lift.');

  const gasGroup=new THREE.Group();
  gasGroup.name='silowniki';
  root.add(gasGroup);

  const bodyMat=new THREE.MeshPhysicalMaterial({color:'#697079',roughness:.34,metalness:.92,transparent:false,opacity:1});
  const rodMat=new THREE.MeshPhysicalMaterial({color:'#e0e4e8',roughness:.12,metalness:1,transparent:false,opacity:1});
  const unitGeo=new THREE.CylinderGeometry(1,1,1,18,1);
  const struts=[];
  for(let i=0;i<2;i++){
    const body=new THREE.Mesh(unitGeo,bodyMat);
    const rod=new THREE.Mesh(unitGeo,rodMat);
    body.castShadow=rod.castShadow=true;
    body.receiveShadow=rod.receiveShadow=true;
    gasGroup.add(body); gasGroup.add(rod);
    struts.push({body,rod});
  }
  const dir=new THREE.Vector3(),mid=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function cylinderBetween(o,a,b,r){
    dir.subVectors(b,a);
    const len=dir.length();
    if(len<.01){o.visible=false;return;}
    o.visible=true;
    mid.copy(a).add(b).multiplyScalar(.5);
    o.position.copy(mid);
    o.quaternion.setFromUnitVectors(up,dir.normalize());
    o.scale.set(r,len,r);
  }
  function liftLocalToRoot(v){
    root.updateWorldMatrix(true,true);
    const out=v.clone();
    mainLift.localToWorld(out);
    root.worldToLocal(out);
    return out;
  }
  function updateStruts(){
    const xs=[MAT_CENTER_RIGHT-67,MAT_CENTER_RIGHT+67];
    for(let i=0;i<2;i++){
      const A=new THREE.Vector3(xs[i],25,-47);
      const B=liftLocalToRoot(new THREE.Vector3(xs[i],-3,72));
      cylinderBetween(struts[i].body,A,B,1.0);
      cylinderBetween(struts[i].rod,A,A.clone().lerp(B,.57),.62);
    }
  }
  const baseApply=built.applyDependentState;
  built.applyDependentState=()=>{
    baseApply?.();
    updateStruts();
  };
  built.applyDependentState();

  // ---------------------------------------------------------------------------
  // 5. NOWA BOAZERIA / KRATKA FRONTOWA.
  //    Użytkownik: ~200 mm wysokości × ~100 mm szerokości, 30 mm głębokości.
  //    Zachowujemy listwy 18 mm z poprzedniej decyzji.
  //    W pionie 4 rzędy: (800 - 5×18)/4 = 177.5 mm światła.
  //    W poziomie 20 pól: 19×95 mm + końcowe 87 mm przy SPF;
  //    21 listew ×18 mm daje dokładnie 2270 mm całkowitej szerokości.
  // ---------------------------------------------------------------------------
  disposeTree(root.getObjectByName('boazeria_front_40x40'));

  const lattice=new THREE.Group();
  lattice.name='boazeria_front_10x20';
  root.add(lattice);

  const FRONT_W=227;
  const FRONT_H=80;
  const RAIL=1.8;
  const PROJ=3.0;
  const REGULAR_CLEAR=9.5;
  const FINAL_CLEAR=8.7;
  const RIGHT=FRONT_W/2;
  const LEFT=-FRONT_W/2;
  const FRONT_SURFACE_Z=81.8;
  const Z=FRONT_SURFACE_Z+PROJ/2+.001;

  const cells=[];
  const railCenters=[];
  let cursor=RIGHT;
  railCenters.push(cursor-RAIL/2);
  cursor-=RAIL;

  for(let i=0;i<19;i++){
    const right=cursor;
    const left=cursor-REGULAR_CLEAR;
    cells.push({left,right,width:REGULAR_CLEAR});
    cursor=left;
    railCenters.push(cursor-RAIL/2);
    cursor-=RAIL;
  }

  const finalLeft=LEFT+RAIL;
  const finalWidth=cursor-finalLeft;
  // Numerycznie powinno wyjść 8.7 cm; pozostawiamy wynik z sumy jako source of truth.
  cells.push({left:finalLeft,right:cursor,width:finalWidth});
  railCenters.push(LEFT+RAIL/2);

  railCenters.forEach((x,i)=>addMesh(
    THREE,lattice,new THREE.BoxGeometry(RAIL,FRONT_H,PROJ),boardMat,
    x,FRONT_H/2,Z,`kratka_pion_${String(i+1).padStart(2,'0')}`
  ));

  const clearH=(FRONT_H-5*RAIL)/4;
  const horizontalY=[
    RAIL/2,
    RAIL+clearH+RAIL/2,
    2*(RAIL+clearH)+RAIL/2,
    3*(RAIL+clearH)+RAIL/2,
    FRONT_H-RAIL/2
  ];
  horizontalY.forEach((y,row)=>{
    cells.forEach((cell,col)=>{
      addMesh(
        THREE,lattice,new THREE.BoxGeometry(cell.width,RAIL,PROJ),boardMat,
        (cell.left+cell.right)/2,y,Z,`kratka_poziom_${row+1}_${col+1}`
      );
    });
  });

  lattice.userData.pattern={
    nominalCellMm:[100,200],
    actualRegularClearWidthMm:95,
    actualFinalClearWidthMm:Math.round(finalWidth*10),
    actualClearHeightMm:177.5,
    battenWidthMm:18,
    projectionMm:30,
    columns:20,
    rows:4,
    startSide:'right / no perforated panel',
    finalCellSide:'left / SPF',
    totalWidthMm:2270,
    totalHeightMm:800
  };

  root.userData.design={
    ...(root.userData.design||{}),
    colors:{...(root.userData.design?.colors||{}),bedGreen:DESIGN_PATCH.boardColor,bedBoard:DESIGN_PATCH.boardColor},
    stairs:null,
    steelShelf:{...DESIGN_PATCH.steelShelf},
    frontLattice:{...DESIGN_PATCH.frontLattice}
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    stairs:null,
    sideShelf:{side:'left',width:23.4,depth:160,top:89,steelTop:true,steelRoomSide:true},
    mattressCenterX:11.7,
    frontLattice:{
      panel:[227,80],
      railWidth:1.8,
      projection:3,
      rows:4,
      clearCellHeight:17.75,
      columns:20,
      clearWidths:[...Array(19).fill(9.5),Math.round(finalWidth*1000)/1000],
      startSide:'right'
    },
    boardColor:'#BCC6C2'
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0005};
