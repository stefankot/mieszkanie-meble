export const NAV_KEY_MAP=Object.freeze({
  KeyW:'przod', ArrowUp:'przod', KeyS:'tyl', ArrowDown:'tyl',
  KeyA:'lewo', ArrowLeft:'lewo', KeyD:'prawo', ArrowRight:'prawo'
});

export function classifyTrackpadGesture(event){
  return event?.ctrlKey ? 'pinch-drive' : 'two-finger-look';
}

const moved=(a,b,epsilon=.01)=>a.distanceToSquared(b)>epsilon;
const rotated=(a,b)=>Math.abs(a.dot(b))<.999999;

export function runNavigationRegression({nav,camera,controls,canvas,THREE,storage=localStorage}){
  const results={};
  const startPos=camera.position.clone(), startQ=camera.quaternion.clone();
  const startMode=nav.tryb, startCollisions=nav.kolizje;
  const center=()=>({x:Math.max(12,canvas.clientWidth/2),y:Math.max(12,canvas.clientHeight/2)});
  try{
    const collision=nav.sprawdzKolizje();
    results.collisions=collision.outsideBlocked && !collision.currentBlocked;
    let p=camera.position.clone(), q=camera.quaternion.clone();
    canvas.dispatchEvent(new WheelEvent('wheel',{deltaX:24,deltaY:8,bubbles:true,cancelable:true}));
    results.twoFingerLook=rotated(q,camera.quaternion) && !moved(p,camera.position);

    if(nav.kolizje) nav.przelaczKolizje();
    p=camera.position.clone();
    canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-32,ctrlKey:true,bubbles:true,cancelable:true}));
    nav.aktualizuj(1/60);
    results.pinchDrive=moved(p,camera.position);

    q=camera.quaternion.clone(); const c=center();
    canvas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:71,isPrimary:true,button:0,clientX:c.x,clientY:c.y,bubbles:true}));
    canvas.dispatchEvent(new PointerEvent('pointermove',{pointerId:71,isPrimary:true,button:0,clientX:c.x+20,clientY:c.y+10,bubbles:true}));
    canvas.dispatchEvent(new PointerEvent('pointerup',{pointerId:71,isPrimary:true,button:0,clientX:c.x+20,clientY:c.y+10,bubbles:true}));
    results.dragLook=rotated(q,camera.quaternion);

    p=camera.position.clone();
    dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
    for(let i=0;i<20;i++) nav.aktualizuj(1/60);
    dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
    results.wasd=moved(p,camera.position);
    p=camera.position.clone();
    dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true}));
    for(let i=0;i<20;i++) nav.aktualizuj(1/60);
    dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight',bubbles:true}));
    results.arrows=moved(p,camera.position);

    p=camera.position.clone();
    const accepted=nav.podejdz({x:p.x+140,z:p.z+90},120);
    for(let i=0;i<10;i++) nav.aktualizuj(1/60);
    results.pointAndGoEngine=accepted && moved(p,camera.position);

    nav.ustawTryb(nav.TRYBY.PTAK);
    for(let i=0;i<170;i++) nav.aktualizuj(1/60);
    results.topView=nav.tryb===nav.TRYBY.PTAK && camera.position.y>300;

    const target=startPos.clone().add(new THREE.Vector3(0,0,-260).applyQuaternion(startQ));
    nav.ustawWidok(startPos,target); camera.quaternion.copy(startQ); nav.synchronizuj();
    if(nav.kolizje!==startCollisions) nav.przelaczKolizje();
    nav.zapiszStan();
    let saved=null; try{saved=JSON.parse(storage.getItem('mieszkanie-webgpu:kamera:1'));}catch(e){}
    results.stateSave=Array.isArray(saved?.poz) && saved.poz.length===3 && Array.isArray(saved?.obr);
    results.stateRestore=Boolean(nav.wznowiono);
    results.pointAndGo='handler requires visible floor click; engine path passed automatically';
  }catch(error){ results.error=error.message; }
  finally{
    if(nav.kolizje!==startCollisions) nav.przelaczKolizje();
    if(nav.tryb!==startMode && startMode!==nav.TRYBY.PTAK) nav.ustawTryb(startMode,{wymus:true,punkt:startPos});
  }
  results.pass=['twoFingerLook','pinchDrive','dragLook','wasd','arrows','pointAndGoEngine','collisions','topView','stateSave']
    .every(k=>results[k]===true);
  return results;
}
