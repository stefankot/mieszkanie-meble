import { buildLozkoV0016 } from './v0016-native.js';

export const VERSION = 'v0017';

export const DESIGN_PATCH = Object.freeze({
  baseVersion: 'v0016',
  lighting: {
    mode: '3 embedded continuous horizontal LED strips',
    count: 3,
    widthMm: 2270,
    cctApproxK: 3000,
    emissiveIntensity: 12,
    rectAreaIntensity: 170,
    note: 'Three actual RectAreaLights live in the native bed root. No per-cubby PointLights and no dependency on a post-swap renderer LED refresh.'
  },
  stairs: {
    material: 'polished stainless steel',
    maxEnvelopeMm: [600, 600, 600],
    widthAlongBedMm: 600,
    totalProjectionMm: 600,
    totalHeightMm: 600,
    steps: 3,
    treadDepthMm: 200,
    riseMm: 200,
    wallClearanceMm: 0,
    position: 'same front position, shifted laterally flush to room wall W1'
  }
});

function removeObject(o){
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

function fallbackSteelMaterial(THREE){
  const m=new THREE.MeshPhysicalMaterial({
    color:'#dfe3e5', roughness:.08, metalness:1,
    clearcoat:.25, clearcoatRoughness:.08,
    transparent:false, opacity:1, depthWrite:true, depthTest:true,
    side:THREE.FrontSide, envMapIntensity:2.2
  });
  m.name='Stal nierdzewna polerowana';
  return m;
}

function ledMaterial(THREE){
  const m=new THREE.MeshStandardMaterial({
    color:'#fff7e8', emissive:'#ffc582', emissiveIntensity:12,
    roughness:.28, metalness:0, transparent:false, opacity:1,
    toneMapped:true
  });
  m.name='LED 3000K · ciągły v0017';
  return m;
}

function addContinuousStrip({THREE,root,material,id,position,target}){
  // Widoczny, ciągły profil o pełnej szerokości łóżka. Geometria przechodzi
  // przez pionowe ścianki — dokładnie jeden profil na poziom, nie per kubik.
  const strip=addMesh(
    THREE,root,new THREE.BoxGeometry(227,.65,.8),material,
    position[0],position[1],position[2],`${id}_profil`
  );
  strip.castShadow=strip.receiveShadow=false;

  // Rzeczywiste światło: jeden RectAreaLight na cały poziom. Trzy poziomy =
  // dokładnie trzy źródła niezależnie od liczby wnęk.
  const light=new THREE.RectAreaLight(0xffc582,170,227,3.5);
  light.name=`${id}_RectAreaLight`;
  light.position.set(...position);
  const helper=new THREE.Object3D();
  helper.position.set(...position);
  helper.lookAt(new THREE.Vector3(...target));
  light.quaternion.copy(helper.quaternion);
  root.add(light);
  return {strip,light};
}

export function buildLozkoV0017({THREE,placement={positionMm:[1458,0,6275],rotationDeg:90}}){
  const built=buildLozkoV0016({THREE,placement});
  const root=built.korzen;
  root.userData.version=VERSION;
  root.userData.nativeOverrideVersion=VERSION;

  // -----------------------------------------------------------------------
  // 1. OŚWIETLENIE — v0016 miała poprawny opis 3 pasów, ale natywny adapter
  //    podmienia korzeń już po jednorazowym odświeżeniu LED renderera. Opis
  //    root.userData.lighting nie tworzył więc faktycznych świateł po swapie.
  //    v0017 montuje trzy rzeczywiste RectAreaLight bezpośrednio w modelu.
  // -----------------------------------------------------------------------
  root.userData.lighting={units:'mm',coordinateSystem:'model-local',recesses:[]};
  const matLed=ledMaterial(THREE);
  const direct=[];
  direct.push(addContinuousStrip({
    THREE,root,material:matLed,id:'lozko_led_front_dolny_ciagly',
    position:[0,38.1,73.8], target:[0,22.1,33.8]
  }));
  direct.push(addContinuousStrip({
    THREE,root,material:matLed,id:'lozko_led_front_gorny_ciagly',
    position:[0,69.8,73.8], target:[0,53.8,33.8]
  }));
  direct.push(addContinuousStrip({
    THREE,root,material:matLed,id:'lozko_led_tyl_gorny_ciagly',
    position:[0,117.2,-88], target:[0,101.2,-128]
  }));

  // -----------------------------------------------------------------------
  // 2. SCHODY — geometria bez zmian względem v0016 (600×600×600, 3 stopnie),
  //    tylko przesunięcie poprzeczne o 500 mm: prawa krawędź jest teraz równo
  //    z projektowym +X łóżka, czyli przy ścianie W1 (0 mm luzu).
  // -----------------------------------------------------------------------
  const old3=root.getObjectByName('schodek_3_przy_lozku_60cm');
  const steelMat=old3?.material || fallbackSteelMaterial(THREE);
  removeObject(root.getObjectByName('schodek_1_od_pokoju_20cm'));
  removeObject(root.getObjectByName('schodek_2_srodkowy_40cm'));
  removeObject(old3);

  const BED_W_MM=2270;
  const stairW=60;
  const treadD=20;
  const bedRightX=BED_W_MM/20;       // +113.5 cm = ściana W1 przy obecnym placement
  const stairRightX=bedRightX;       // 0 mm luzu od ściany
  const stairCenterX=stairRightX-stairW/2; // 83.5 cm
  const bedFrontZ=81.8;

  const step3=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,60,treadD),steelMat,
    stairCenterX,30,bedFrontZ+treadD/2,'schodek_3_przy_scianie_60cm'
  );
  const step2=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,40,treadD),steelMat,
    stairCenterX,20,bedFrontZ+treadD+treadD/2,'schodek_2_przy_scianie_40cm'
  );
  const step1=addMesh(
    THREE,root,new THREE.BoxGeometry(stairW,20,treadD),steelMat,
    stairCenterX,10,bedFrontZ+2*treadD+treadD/2,'schodek_1_przy_scianie_20cm'
  );
  [step1,step2,step3].forEach((s,i)=>{
    s.userData.wallClearanceMm=0;
    s.userData.treadDepthMm=200;
    s.userData.widthMm=600;
    s.userData.stepIndex=i+1;
  });

  root.userData.design={
    ...(root.userData.design||{}),
    lighting:{...DESIGN_PATCH.lighting},
    stairs:{...DESIGN_PATCH.stairs}
  };
  root.userData.nativeModel={
    ...(root.userData.nativeModel||{}),
    lighting:{
      directPerCubbyLights:0,
      continuousStripCount:3,
      embeddedRectAreaLightCount:3,
      stripWidthMm:2270,
      emissiveIntensity:12,
      rectAreaIntensity:170,
      rendererAutoNicheLightingDisabled:true
    },
    stairs:{
      envelope:[60,60,60], steps:3, treadDepth:20, rise:20, width:60,
      wallClearance:0,
      centers:[
        [stairCenterX,10,bedFrontZ+50],
        [stairCenterX,20,bedFrontZ+30],
        [stairCenterX,30,bedFrontZ+10]
      ],
      worldFootprintMm:{x:[2276,2876],z:[5140,5740]},
      material:'polished stainless steel'
    }
  };

  return built;
}

export default {VERSION,DESIGN_PATCH,buildLozkoV0017};
