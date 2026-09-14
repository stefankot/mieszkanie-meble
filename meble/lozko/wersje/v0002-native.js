/* Łóżko pod oknem — kandydat v0002 (pełny model natywny)
   Jednostka sceny: cm. Placement z manifestu pozostaje [1258,0,6275] mm / 90°.
   Zmiana obrysu: schodki 500 × 600 mm wysunięte przed prawy narożnik.
   Wymiary schodków inne niż wysokość 500 mm są wyprowadzone z referencji i wymagają potwierdzenia planu.
*/

export const VERSION = 'v0002-candidate';

export const DESIGN = Object.freeze({
  colors: {
    bedGreen: '#808e71',
    pegboardBlue: '#97a6b6',
    fabricWhite: '#f3f1ea',
    steel: '#b7bcc0',
    graphite: '#31343a'
  },
  bedBodyMm: [2270, 1636],
  frontHeightMm: 800,
  rearHeightMm: 1200,
  mattressMm: [2000, 140, 1600],
  mattressTopMm: 890,
  mattressRecessMm: 50,
  rightShelfWidthMm: 234,
  rightShelfTopMm: 890,
  stairs: {
    totalHeightMm: 500,
    widthMm: 500,
    projectionMm: 600,
    count: 2,
    riseMm: 250,
    treadMm: 300,
    inferredFromReference: true
  },
  spf: {
    lowerEdgeMm: 890,
    upperEdgeMm: 2500,
    holeDiameterMm: 22,
    pitchMm: 200,
    columns: 8,
    rows: 8,
    sideMarginMm: 118,
    verticalMarginMm: 105
  }
});

export function buildLozkoV0002({ THREE, placement = {positionMm:[1258,0,6275], rotationDeg:90} }) {
  const C = v => v / 10;
  const root = new THREE.Group();
  root.name = 'biblioteka:lozko';
  root.userData.version = VERSION;
  root.userData.design = DESIGN;
  root.position.set(...placement.positionMm.map(C));
  root.rotation.y = THREE.MathUtils.degToRad(placement.rotationDeg || 0);

  const ROOM_H = 250;
  const BED_W = 227;
  const BED_D = 163.6;
  const T = 1.8;
  const FRONT_H = 80;
  const BACK_H = 120;
  const DECK_TOP = 75;
  const DECK_T = 2.4;
  const MAT_W = 200;
  const MAT_D = 160;
  const MAT_H = 14;
  const MAT_TOP = 89;
  const INNER_W = BED_W - 2*T;
  const SIDE_W = INNER_W - MAT_W;
  const X_LEFT_OUT = -BED_W/2;
  const X_RIGHT_OUT = BED_W/2;
  const X_LEFT_IN = X_LEFT_OUT + T;
  const X_RIGHT_IN = X_RIGHT_OUT - T;
  const Z_BACK_IN = -BED_D/2 + T;
  const X_MAT_LEFT = X_LEFT_IN;
  const X_MAT_RIGHT = X_MAT_LEFT + MAT_W;
  const X_MAT_CENTER = (X_MAT_LEFT + X_MAT_RIGHT)/2;
  const X_DIVIDER = X_MAT_RIGHT + T/2;
  const X_SHELF_CENTER = (X_MAT_RIGHT + X_RIGHT_IN)/2;
  const CUSH_H = 40, CUSH_D = 18, CUSH_L = 80;
  const CUSH_BASE = MAT_TOP - DECK_TOP;

  const add = (parent, geometry, material, x,y,z,name) => {
    const o = new THREE.Mesh(geometry, material);
    o.position.set(x,y,z); o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
    if(name) o.name = name;
    parent.add(o); return o;
  };
  const box = (w,h,d) => new THREE.BoxGeometry(w,h,d);
  const rounded = (w,h,d,r=.25) => new THREE.RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2));

  function solid(color, roughness=.8, metalness=0){
    return new THREE.MeshPhysicalMaterial({
      color, roughness, metalness, transparent:false, opacity:1,
      depthWrite:true, depthTest:true, side:THREE.FrontSide,
      clearcoat: metalness > .5 ? .08 : 0,
      clearcoatRoughness: .6,
      envMapIntensity: metalness > .5 ? 1.2 : .65
    });
  }

  function canvasTexture(canvas, colorSpace=true){
    const t = new THREE.CanvasTexture(canvas);
    if(colorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }

  function coarseWeaveMaterial(hex){
    const c = document.createElement('canvas'); c.width=c.height=96;
    const g = c.getContext('2d');
    g.fillStyle = '#f7f5ef'; g.fillRect(0,0,96,96);
    for(let i=0;i<96;i+=12){
      g.fillStyle = 'rgba(190,186,176,.20)'; g.fillRect(i,0,5,96);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(i+5,0,2,96);
    }
    for(let i=0;i<96;i+=12){
      g.fillStyle = 'rgba(178,174,165,.16)'; g.fillRect(0,i,96,5);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0,i+5,96,2);
    }
    const map=canvasTexture(c,true); map.repeat.set(18,14);
    const m = new THREE.MeshPhysicalMaterial({
      color:hex, map, roughness:.98, metalness:0, sheen:.32,
      sheenColor:new THREE.Color('#ffffff'), sheenRoughness:.92,
      transparent:false, opacity:1, transmission:0, depthWrite:true,
      side:THREE.FrontSide, envMapIntensity:.45
    });
    m.userData.surface='fabric'; m.userData.coarseWeave=true;
    return m;
  }

  function triangularPrismX(len,depth,height){
    const L=len/2;
    const p=[-L,0,0,-L,0,depth,-L,height,0, L,0,0,L,0,depth,L,height,0];
    const idx=[0,2,1,3,4,5,0,1,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,4];
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); g.setIndex(idx);
    const n=g.toNonIndexed(); g.dispose(); n.computeVertexNormals(); return n;
  }
  function triangularPrismZ(len,depth,height){
    const L=len/2;
    const p=[0,0,-L,depth,0,-L,0,height,-L, 0,0,L,depth,0,L,0,height,L];
    const idx=[0,2,1,3,4,5,0,1,4,0,4,3,0,3,5,0,5,2,1,5,2,1,4,5];
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); g.setIndex(idx);
    const n=g.toNonIndexed(); g.dispose(); n.computeVertexNormals(); return n;
  }

  function perforatedPanelYZ(width,height,thickness,{holeD,pitchX,pitchY,cols,rows}){
    const sh=new THREE.Shape();
    sh.moveTo(-width/2,-height/2); sh.lineTo(width/2,-height/2); sh.lineTo(width/2,height/2); sh.lineTo(-width/2,height/2); sh.closePath();
    const spanX=(cols-1)*pitchX, spanY=(rows-1)*pitchY;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const x=-spanX/2+c*pitchX, y=-spanY/2+r*pitchY;
      const p=new THREE.Path(); p.absarc(x,y,holeD/2,0,Math.PI*2,false); sh.holes.push(p);
    }
    const g=new THREE.ExtrudeGeometry(sh,{depth:thickness,steps:1,bevelEnabled:false,curveSegments:16});
    g.translate(0,0,-thickness/2); g.rotateY(Math.PI/2); g.computeVertexNormals(); return g;
  }

  function perforatedPanelXY(width,height,thickness,{holeD,pitchX,pitchY}){
    const sh=new THREE.Shape();
    sh.moveTo(-width/2,-height/2); sh.lineTo(width/2,-height/2); sh.lineTo(width/2,height/2); sh.lineTo(-width/2,height/2); sh.closePath();
    const cols=Math.floor((width-holeD)/pitchX)+1, rows=Math.floor((height-holeD)/pitchY)+1;
    const spanX=(cols-1)*pitchX, spanY=(rows-1)*pitchY;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const x=-spanX/2+c*pitchX, y=-spanY/2+r*pitchY;
      const p=new THREE.Path(); p.absarc(x,y,holeD/2,0,Math.PI*2,false); sh.holes.push(p);
    }
    const g=new THREE.ExtrudeGeometry(sh,{depth:thickness,steps:1,bevelEnabled:false,curveSegments:12});
    g.translate(0,0,-thickness/2); g.computeVertexNormals(); return g;
  }

  const green = solid(DESIGN.colors.bedGreen,.78,0); green.name='Zielona płyta łóżka';
  const blue = solid(DESIGN.colors.pegboardBlue,.82,0); blue.name='Błękitna płyta perforowana';
  const steel = solid(DESIGN.colors.steel,.28,.96); steel.name='Stal szczotkowana';
  const graphite = solid(DESIGN.colors.graphite,.65,.08);
  const fabric = coarseWeaveMaterial(DESIGN.colors.fabricWhite); fabric.name='Biała tkanina — gruby splot';
  const radiatorMat=solid('#d9dde0',.72,.18);

  add(root,box(INNER_W,T,MAT_D),green,0,T/2,0,'dno');
  add(root,box(BED_W,FRONT_H,T),green,0,FRONT_H/2,BED_D/2-T/2,'front_80cm');

  const rearZ=-BED_D/2+T/2;
  const openingW=120, openingH=92, openingBottom=18, openingTop=110;
  const stileW=(BED_W-openingW)/2;
  add(root,box(stileW,BACK_H,T),green,-(openingW/2+stileW/2),BACK_H/2,rearZ,'SO_lewy_slup');
  add(root,box(stileW,BACK_H,T),green, +(openingW/2+stileW/2),BACK_H/2,rearZ,'SO_prawy_slup');
  add(root,box(openingW,openingBottom,T),green,0,openingBottom/2,rearZ,'SO_dol');
  add(root,box(openingW,BACK_H-openingTop,T),green,0,(openingTop+BACK_H)/2,rearZ,'SO_gora');
  add(root,perforatedPanelXY(openingW,openingH,T,{holeD:2.2,pitchX:6,pitchY:6}),green,0,(openingBottom+openingTop)/2,rearZ,'SO_perforacja_grzejnik');
  add(root,box(T,BACK_H,BED_D),green,X_RIGHT_OUT-T/2,BACK_H/2,0,'prawa_sciana_120cm');

  const pegLow=MAT_TOP, pegH=ROOM_H-pegLow;
  add(root,perforatedPanelYZ(BED_D,pegH,T,{holeD:2.2,pitchX:20,pitchY:20,cols:8,rows:8}),blue,X_LEFT_OUT+T/2,pegLow+pegH/2,0,'SPF_blekit_8x8');

  add(root,box(T,MAT_TOP,MAT_D),green,X_DIVIDER,MAT_TOP/2,0,'przegroda_prawej_polki');
  const railY=(DECK_TOP-DECK_T)-2;
  add(root,box(3,4,MAT_D-8),green,X_MAT_LEFT+1.5,railY,0,'listwa_lewa');
  add(root,box(3,4,MAT_D-8),green,X_MAT_RIGHT-1.5,railY,0,'listwa_prawa');

  const sideLift=new THREE.Group(); sideLift.name='sideLift'; sideLift.position.set(X_RIGHT_IN,MAT_TOP,0); root.add(sideLift);
  add(sideLift,box(SIDE_W,1.8,MAT_D),green,-SIDE_W/2,-1.1,0,'prawa_polka_rdzen');
  add(sideLift,box(SIDE_W,.2,MAT_D),steel,-SIDE_W/2,-.1,0,'prawa_polka_stal_gora');
  add(root,box(SIDE_W,MAT_TOP,.2),steel,X_SHELF_CENTER,MAT_TOP/2,BED_D/2+.1,'prawa_polka_stal_front');
  add(root,box(SIDE_W,MAT_TOP-FRONT_H,T),green,X_SHELF_CENTER,FRONT_H+(MAT_TOP-FRONT_H)/2,BED_D/2-T/2,'prawa_polka_front_nadstawka');

  const radiator=new THREE.Group(); radiator.name='grzejnik_1200'; root.add(radiator);
  add(radiator,rounded(120,92,10,.5),radiatorMat,0,64,-91.8,'grzejnik_korpus');
  for(let x=-54;x<=54;x+=9) add(radiator,box(2.4,84,1.2),radiatorMat,x,64,-86.4,'grzejnik_zeberko');

  const mainLift=new THREE.Group(); mainLift.name='lift'; mainLift.position.set(0,DECK_TOP,Z_BACK_IN); root.add(mainLift);
  add(mainLift,box(MAT_W,DECK_T,MAT_D),green,X_MAT_CENTER,-DECK_T/2,MAT_D/2,'platforma');
  add(mainLift,rounded(MAT_W,MAT_H,MAT_D,1.2),fabric,X_MAT_CENTER,MAT_H/2,MAT_D/2,'materac_bialy');

  const sideCushX=X_RIGHT_IN-.6;
  const rearEnd=sideCushX-CUSH_D;
  const rearStart=rearEnd-2*CUSH_L;
  add(mainLift,triangularPrismX(CUSH_L,CUSH_D,CUSH_H),fabric,rearStart+CUSH_L/2,CUSH_BASE,.6,'poducha_tyl_1');
  add(mainLift,triangularPrismX(CUSH_L,CUSH_D,CUSH_H),fabric,rearStart+1.5*CUSH_L,CUSH_BASE,.6,'poducha_tyl_2');
  add(mainLift,triangularPrismZ(CUSH_L,-CUSH_D,CUSH_H),fabric,sideCushX,CUSH_BASE,40,'poducha_prawa_1');
  add(mainLift,triangularPrismZ(CUSH_L,-CUSH_D,CUSH_H),fabric,sideCushX,CUSH_BASE,120,'poducha_prawa_2');

  const stairW=50, tread=30, stairRight=X_RIGHT_OUT;
  const stairX=stairRight-stairW/2;
  const frontOuter=BED_D/2;
  add(root,box(stairW,25,tread),steel,stairX,12.5,frontOuter+tread*1.5,'schodek_1_25cm');
  add(root,box(stairW,50,tread),steel,stairX,25,frontOuter+tread*.5,'schodek_2_50cm');

  const panelFace=X_LEFT_IN;
  const pegMat=solid('#7f604a',.74,0);
  const pegGeo=new THREE.CylinderGeometry(.9,.9,15,16,1); pegGeo.rotateZ(Math.PI/2);
  const capGeo=new THREE.SphereGeometry(1.03,12,8);
  function peg(y,z){
    const rod=new THREE.Mesh(pegGeo,pegMat); rod.position.set(panelFace+7.5,y,z); rod.castShadow=rod.receiveShadow=true; root.add(rod);
    const cap=new THREE.Mesh(capGeo,pegMat); cap.position.set(panelFace+15,y,z); cap.castShadow=true; root.add(cap);
  }
  function shelf(y,z,w){ peg(y,z-w/2+8); peg(y,z+w/2-8); add(root,box(16,2,w),green,panelFace+8,y+2,z,'polka'); return y+3; }
  function boxOnShelf(baseY,z,h,d){ add(root,rounded(12,h,d,.25),graphite,panelFace+7,baseY+h/2,z,'pudelko_grafitowe'); }
  shelf(178,-55,38);
  const s2=shelf(178,52,32); boxOnShelf(s2,52,13,22);
  const s3=shelf(224,58,50); boxOnShelf(s3,46,17,20); boxOnShelf(s3,70,12,20);

  const tvMat=solid('#111418',.25,.18);
  add(root,rounded(2.2,34,60,.25),tvMat,panelFace+2.2,140,-18,'telewizor');

  function drone(name,y,z,scale=1){
    const g=new THREE.Group(); g.name=name; g.position.set(panelFace+10,y,z); root.add(g);
    const dm=solid('#262a2f',.48,.18), accent=solid('#50555b',.36,.42);
    add(g,rounded(5*scale,8*scale,13*scale,1),dm,0,0,0,name+'_body');
    const armGeo=box(3*scale,2*scale,34*scale);
    for(const a of [Math.PI/4,-Math.PI/4]){
      const arm=new THREE.Mesh(armGeo,accent); arm.rotation.x=a; arm.castShadow=arm.receiveShadow=true; g.add(arm);
    }
    const rr=12*scale;
    for(const [yy,zz] of [[rr,rr],[rr,-rr],[-rr,rr],[-rr,-rr]]){
      const rotor=new THREE.Mesh(new THREE.TorusGeometry(5.5*scale,.65*scale,8,24),accent);
      rotor.rotation.y=Math.PI/2; rotor.position.set(0,yy,zz); rotor.castShadow=true; g.add(rotor);
    }
    const hookGeo=new THREE.CylinderGeometry(.65,.65,7,12); hookGeo.rotateZ(Math.PI/2);
    for(const zz of [-7*scale,7*scale]){ const h=new THREE.Mesh(hookGeo,pegMat); h.position.set(-6,0,zz); h.castShadow=true; g.add(h); }
  }
  drone('dron_1',162,-55,1.0);
  drone('dron_2',207,45,.86);

  const gasGroup=new THREE.Group(); gasGroup.name='silowniki'; root.add(gasGroup);
  const bodyMat=solid('#697079',.34,.92), rodMat=solid('#e0e4e8',.12,1);
  const unitGeo=new THREE.CylinderGeometry(1,1,1,18,1);
  const struts=[];
  for(let i=0;i<2;i++){
    const body=new THREE.Mesh(unitGeo,bodyMat), rod=new THREE.Mesh(unitGeo,rodMat);
    body.castShadow=rod.castShadow=true; body.receiveShadow=rod.receiveShadow=true;
    gasGroup.add(body); gasGroup.add(rod); struts.push({body,rod});
  }
  const dir=new THREE.Vector3(),mid=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function cylinderBetween(o,a,b,r){
    dir.subVectors(b,a); const len=dir.length(); if(len<.01){o.visible=false;return;} o.visible=true;
    mid.copy(a).add(b).multiplyScalar(.5); o.position.copy(mid); o.quaternion.setFromUnitVectors(up,dir.normalize()); o.scale.set(r,len,r);
  }
  function liftLocalToRoot(v){ root.updateWorldMatrix(true,true); const out=v.clone(); mainLift.localToWorld(out); root.worldToLocal(out); return out; }
  function updateStruts(){
    const xs=[X_MAT_CENTER-67,X_MAT_CENTER+67];
    for(let i=0;i<2;i++){
      const A=new THREE.Vector3(xs[i],25,-47);
      const B=liftLocalToRoot(new THREE.Vector3(xs[i],-3,72));
      cylinderBetween(struts[i].body,A,B,1.0);
      cylinderBetween(struts[i].rod,A,A.clone().lerp(B,.57),.62);
    }
  }

  const mainPivot=new THREE.Group(); mainPivot.name='os:lozko:lift'; root.add(mainPivot); mainPivot.position.set(0,DECK_TOP,Z_BACK_IN);
  mainPivot.updateWorldMatrix(true,false); mainPivot.attach(mainLift);
  const sidePivot=new THREE.Group(); sidePivot.name='os:lozko:sideLift'; root.add(sidePivot); sidePivot.position.set(X_RIGHT_IN,MAT_TOP,0);
  sidePivot.updateWorldMatrix(true,false); sidePivot.attach(sideLift);

  const mainRuch={
    id:'lozko:lift', typ:'hinge', os:mainPivot, kierunek:[-1,0,0], zakres:54,
    bazowaOrientacja:mainPivot.quaternion.clone(), bazowaPozycja:mainPivot.position.clone(),
    etykieta:'Główny schowek', wezel:mainLift, THREE, wartosc:0, cel:0
  };
  const sideRuch={
    id:'lozko:sideLift', typ:'hinge', os:sidePivot, kierunek:[0,0,-1], zakres:78,
    bazowaOrientacja:sidePivot.quaternion.clone(), bazowaPozycja:sidePivot.position.clone(),
    etykieta:'Prawa półka / schowek', wezel:sideLift, THREE, wartosc:0, cel:0
  };
  mainLift.traverse(n=>n.userData.ruchId=mainRuch.id);
  sideLift.traverse(n=>n.userData.ruchId=sideRuch.id);

  function applyDependentState(){
    const t=mainRuch.wartosc||0;
    mainPivot.position.copy(mainRuch.bazowaPozycja).addScaledVector(new THREE.Vector3(0,0,52),t);
    updateStruts();
  }
  applyDependentState();

  root.userData.nativeModel={
    body:[227,163.6], frontHeight:80, rearHeight:120,
    deckTop:75, mattressTop:89, mattressRecess:5,
    rightShelfWidth:23.4, rightShelfTop:89,
    stairs:{width:50,projection:60,totalHeight:50,treads:2},
    pegboard:{bottom:89,top:250,holes:[8,8],pitch:20,holeDiameter:2.2}
  };

  return {korzen:root, ruchy:[mainRuch,sideRuch], applyDependentState};
}

export default { VERSION, DESIGN, buildLozkoV0002 };
