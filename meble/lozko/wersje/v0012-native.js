import { buildLozkoV0008 } from './v0008-native.js';

export const VERSION = 'v0012';

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0008',
  removedCushions: ['poducha_okno_1', 'poducha_okno_2'],
  retainedCushions: ['poducha_bok_1', 'poducha_bok_2'],
  frontNiches: {
    source: 'unchanged from v0008/v0007',
    columns: 10,
    rows: 2,
    depthMm: 200,
    dividerMm: 18,
    clearWidthMm: 207.2,
    clearHeightMm: 299,
    lighting: 'unchanged v0008 strong LED: emissive 12 + PointLight 85 / 520 mm'
  },
  rearNiches: {
    fromYmm: 750,
    toYmm: 1200,
    depthMm: 200,
    dividerMm: 18,
    columns: 5,
    clearHeightMm: 414,
    clearWidthsMmFromSPF: [600, 390.5, 390.5, 390.5, 390.5],
    lighting: {
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

export function buildLozkoV0012({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  // Świadomie wracamy do v0008 jako bazy: użytkownik wskazał tę wersję jako
  // poprawną pod względem frontowych przegród i jasności LED nad/pod materacem.
  const built=buildLozkoV0008({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // Zachowujemy decyzję z v0009+: brak dwóch poduch wzdłuż okna.
  for(const id of DESIGN_PATCH.removedCushions) disposeTree(root.getObjectByName(id));
  if(root.userData.softGeometry){
    root.userData.softGeometry.cushionIds=[...DESIGN_PATCH.retainedCushions];
    root.userData.softGeometry.removedCushionIds=[...DESIGN_PATCH.removedCushions];
  }

  // Front pod materacem pozostaje DOKŁADNIE taki jak w v0008:
  // 10 równych kolumn × 2 rzędy oraz mocne paski + PointLight 85.
  // Zmieniamy wyłącznie tylny/górny ciąg wnęk.
  disposeTree(root.getObjectByName('wneki_tyl_fibonacci'));

  const boardMat=whiteBoardMaterial(THREE);
  const rear=new THREE.Group();
  rear.name='wneki_tyl_regularne';
  root.add(rear);

  const BED_W=227;
  const T=1.8;
  const MATTRESS_BASE_Y=75;
  const REAR_TOP_Y=120;
  const OPEN_Z=-80;
  const DEPTH=20;
  const BACK_INNER_Z=OPEN_Z-DEPTH;
  const BACK_PANEL_Z=BACK_INNER_Z-T/2;
  const INTERNAL_CENTER_Z=(OPEN_Z+BACK_INNER_Z)/2;
  const clearWidths=[60,39.05,39.05,39.05,39.05]; // SPF -> drugi koniec
  const nicheH=REAR_TOP_Y-MATTRESS_BASE_Y;
  const clearH=nicheH-2*T;
  const leftEdge=-BED_W/2;

  const clearTotal=clearWidths.reduce((a,b)=>a+b,0);
  const total=clearTotal+(clearWidths.length+1)*T;
  if(Math.abs(total-BED_W)>1e-6) throw new Error(`v0012: rear niches width mismatch ${total} != ${BED_W}`);

  addMesh(THREE,rear,new THREE.BoxGeometry(BED_W,nicheH,T),boardMat,
    0,MATTRESS_BASE_Y+nicheH/2,BACK_PANEL_Z,'wneki_tyl_plecy');
  addMesh(THREE,rear,new THREE.BoxGeometry(BED_W,T,DEPTH),boardMat,
    0,MATTRESS_BASE_Y+T/2,INTERNAL_CENTER_Z,'wneki_tyl_dol');
  addMesh(THREE,rear,new THREE.BoxGeometry(BED_W,T,DEPTH),boardMat,
    0,REAR_TOP_Y-T/2,INTERNAL_CENTER_Z,'wneki_tyl_gora');

  const cells=[];
  let cursor=leftEdge;
  const dividerCenters=[cursor+T/2];
  cursor+=T;
  for(let i=0;i<clearWidths.length;i++){
    const width=clearWidths[i];
    const left=cursor;
    const right=left+width;
    const cx=(left+right)/2;
    cells.push({index:i+1,left,right,width,cx});
    cursor=right;
    dividerCenters.push(cursor+T/2);
    cursor+=T;
  }

  dividerCenters.forEach((x,i)=>addMesh(
    THREE,rear,new THREE.BoxGeometry(T,nicheH,DEPTH),boardMat,
    x,MATTRESS_BASE_Y+nicheH/2,INTERNAL_CENTER_Z,`wneka_tyl_pion_${String(i+1).padStart(2,'0')}`
  ));

  // Dokładnie ta sama recepta świetlna co w v0008: dzięki temu górne wnęki
  // nie są słabsze od frontowych wnęk pod materacem.
  const ledMat=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffd29a', emissiveIntensity:12,
    roughness:.28, metalness:0, transparent:false, opacity:1
  });
  ledMat.name='LED 3000K · mocny v0008';

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
    axis:'horizontal across rear wall',
    direction:'SPF -> opposite side',
    source:'regular rhythm: first bay wider, remaining bays equal',
    clearWidthsMm:[600,390.5,390.5,390.5,390.5],
    clearHeightMm:Math.round(clearH*10),
    depthMm:200,
    dividerMm:18,
    fromYmm:750,
    toYmm:1200,
    ledPerNiche:true,
    ledCctApproxK:3000,
    ledEmissiveIntensity:12,
    ledPointLightIntensity:85,
    ledPointLightDistanceMm:520
  };

  root.userData.design={
    ...(root.userData.design||{}),
    baseVersion:'v0008',
    rearNiches:{...DESIGN_PATCH.rearNiches},
    frontNiches:{...DESIGN_PATCH.frontNiches},
    cushions:{
      ...(root.userData.design?.cushions||{}),
      removed:[...DESIGN_PATCH.removedCushions],
      retained:[...DESIGN_PATCH.retainedCushions]
    }
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    baseVersion:'v0008',
    rearNiches:{
      y:[75,120], depth:20, divider:1.8, clearHeight:clearH,
      clearWidths:[...clearWidths], direction:'SPF -> opposite side',
      ledCount:5, ledPosition:'rear/top',
      ledEmissiveIntensity:12, ledPointLightIntensity:85, ledPointLightDistance:52
    },
    frontNichesRestoredFromV0008:true,
    removedCushions:[...DESIGN_PATCH.removedCushions],
    retainedCushions:[...DESIGN_PATCH.retainedCushions]
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0012};
