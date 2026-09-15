import { buildLozkoV0008 } from './v0008-native.js';

export const VERSION = 'v0010';

export const DESIGN_PATCH = Object.freeze({
  removedCushions: ['poducha_okno_1', 'poducha_okno_2'],
  retainedCushions: ['poducha_bok_1', 'poducha_bok_2'],
  rearNiches: {
    fromYmm: 750,
    toYmm: 1200,
    depthMm: 200,
    dividerMm: 18,
    count: 7,
    clearHeightMm: 414,
    clearWidthsMmFromSPFToSideCushions: [200, 240, 276, 308, 337, 365, 400],
    rhythm: 'Fibonacci/golden-ratio-derived progressive rhythm, normalized to exact 200→400 mm endpoints and exact 2270 mm total width',
    led: {
      count: 7,
      position: 'rear/top of each niche',
      cctApproxK: 3000,
      emissiveIntensity: 8,
      rendererLighting: 'fixed pool via root.userData.lighting',
      directPointLights: 0
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

export function buildLozkoV0010({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  // Ostatnia sprawdzona baza: v0008. Nie uruchamiamy wadliwego buildera v0009.
  const built=buildLozkoV0008({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // Usuń dwie poduchy wzdłuż okna; boczne pozostają bez zmian.
  for(const id of DESIGN_PATCH.removedCushions) disposeTree(root.getObjectByName(id));
  if(root.userData.softGeometry){
    root.userData.softGeometry.cushionIds=[...DESIGN_PATCH.retainedCushions];
    root.userData.softGeometry.removedCushionIds=[...DESIGN_PATCH.removedCushions];
  }

  // Zastąp tylny ciąg v0008 wersją 200→400 mm. Usunięcie grupy usuwa też
  // osiem starych PointLightów v0008; v0010 nie tworzy nowych PointLightów.
  disposeTree(root.getObjectByName('wneki_tyl_fibonacci'));

  const boardMat=whiteBoardMaterial(THREE);
  const rear=new THREE.Group();
  rear.name='wneki_tyl_fibonacci';
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
  const clearWidths=[20.0,24.0,27.6,30.8,33.7,36.5,40.0];
  const nicheH=REAR_TOP_Y-MATTRESS_BASE_Y;
  const clearH=nicheH-2*T;
  const leftEdge=-BED_W/2;

  const clearTotal=clearWidths.reduce((a,b)=>a+b,0);
  const total=clearTotal+(clearWidths.length+1)*T;
  if(Math.abs(total-BED_W)>1e-6) throw new Error(`v0010: rear niches width mismatch ${total} != ${BED_W}`);

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

  // Widoczne paski są emisyjne, ale NIE są osobnymi światłami. Rzeczywiste
  // światło obsługuje wspólna, stała pula renderera przez userData.lighting.
  const ledMat=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffd29a', emissiveIntensity:8,
    roughness:.28, metalness:0, transparent:false, opacity:1
  });
  ledMat.name='LED 3000K · emisja';

  const clearTop=REAR_TOP_Y-T;
  const ledY=clearTop-1.0;
  const recesses=[];
  for(const c of cells){
    const ledW=Math.max(2,c.width-1.8);
    const id=String(c.index).padStart(2,'0');
    const ledZ=BACK_INNER_Z+.45;
    addMesh(THREE,rear,new THREE.BoxGeometry(ledW,.65,.8),ledMat,
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

  // Jawny opis eliminuje kosztowne automatyczne raycastowanie wnęk łóżka.
  // Renderer utrzymuje stałą pulę kilku rzeczywistych źródeł, zamiast dokładać
  // kolejne PointLighty do każdego pola.
  root.userData.lighting={
    units:'mm',
    coordinateSystem:'model-local',
    recesses
  };

  rear.userData.pattern={
    axis:'horizontal progression across rear wall',
    direction:'SPF -> side cushions',
    source:'Fibonacci/golden-ratio-derived progressive rhythm, normalized to 200→400 mm and exact total width',
    clearWidthsMm:clearWidths.map(v=>Math.round(v*10)),
    clearHeightMm:Math.round(clearH*10),
    depthMm:200,
    dividerMm:18,
    fromYmm:750,
    toYmm:1200,
    ledPerNiche:true,
    ledCctApproxK:3000,
    directPointLights:0,
    rendererLighting:'fixed-pool'
  };

  root.userData.design={
    ...(root.userData.design||{}),
    rearNiches:{...DESIGN_PATCH.rearNiches},
    cushions:{
      ...(root.userData.design?.cushions||{}),
      removed:[...DESIGN_PATCH.removedCushions],
      retained:[...DESIGN_PATCH.retainedCushions]
    }
  };

  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    rearNiches:{
      y:[75,120], depth:20, divider:1.8, clearHeight:clearH,
      clearWidths:[...clearWidths], direction:'SPF -> side cushions',
      ledCount:7, ledPosition:'rear/top', directPointLights:0,
      rendererLighting:'fixed-pool'
    },
    removedCushions:[...DESIGN_PATCH.removedCushions],
    retainedCushions:[...DESIGN_PATCH.retainedCushions]
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0010};