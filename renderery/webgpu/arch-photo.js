export const ARCH_PHOTO = 'arch_photo';
export const ARCH_FOV = Object.freeze({min:30,max:60,default:42});

export function wybierzTrybKamery(search=globalThis.location?.search||''){
  return new URLSearchParams(search).get('camera') === 'arch' ? ARCH_PHOTO : 'interactive';
}

export function poprawnyNamedView(v){
  const vec=(x,n)=>Array.isArray(x)&&x.length===n&&x.every(Number.isFinite);
  return Boolean(v&&typeof v.name==='string'&&v.name.trim()&&vec(v.position,3)&&vec(v.target,3)
    &&Number.isFinite(v.fov)&&v.fov>=ARCH_FOV.min&&v.fov<=ARCH_FOV.max
    &&Number.isFinite(v.shiftX)&&Math.abs(v.shiftX)<=.2
    &&Number.isFinite(v.shiftY)&&Math.abs(v.shiftY)<=.2);
}

export function utworzArchPhoto({THREE,camera,nawigacja,przyZmianie=()=>{}}){
  const KLUCZ='mieszkanie-webgpu:arch-photo:1';
  const euler=new THREE.Euler(0,0,0,'YXZ');
  let tryb=wybierzTrybKamery(),shiftX=0,shiftY=.08;
  let kadry=[];
  try{const d=JSON.parse(localStorage.getItem(KLUCZ)||'[]');if(Array.isArray(d))kadry=d.filter(poprawnyNamedView).slice(0,24);}catch{}
  const zapiszPamiec=()=>{try{localStorage.setItem(KLUCZ,JSON.stringify(kadry));}catch{}};
  function projekcja(){
    if(tryb!==ARCH_PHOTO)return;
    camera.fov=THREE.MathUtils.clamp(camera.fov,ARCH_FOV.min,ARCH_FOV.max);
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8]=shiftX;camera.projectionMatrix.elements[9]=shiftY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  function aktualizuj(){
    if(tryb!==ARCH_PHOTO)return;
    euler.setFromQuaternion(camera.quaternion,'YXZ');euler.x=0;euler.z=0;camera.quaternion.setFromEuler(euler);
    camera.updateMatrixWorld();projekcja();
  }
  function ustaw(nowy){
    tryb=nowy===ARCH_PHOTO?ARCH_PHOTO:'interactive';
    if(tryb!==ARCH_PHOTO){shiftX=shiftY=0;camera.updateProjectionMatrix();}
    aktualizuj();przyZmianie('arch-photo-mode');return tryb;
  }
  function ustawParametry(p={}){
    if(Number.isFinite(p.fov))camera.fov=THREE.MathUtils.clamp(p.fov,ARCH_FOV.min,ARCH_FOV.max);
    if(Number.isFinite(p.shiftX))shiftX=THREE.MathUtils.clamp(p.shiftX,-.2,.2);
    if(Number.isFinite(p.shiftY))shiftY=THREE.MathUtils.clamp(p.shiftY,-.2,.2);
    projekcja();przyZmianie('arch-photo-lens');
  }
  function zapiszKadr(name){
    const n=String(name||'').trim().slice(0,48);if(!n)return false;
    const target=camera.position.clone().add(new THREE.Vector3(0,0,-300).applyQuaternion(camera.quaternion));
    const v={name:n,position:camera.position.toArray(),target:target.toArray(),fov:camera.fov,shiftX,shiftY};
    const i=kadry.findIndex(x=>x.name===n);if(i>=0)kadry[i]=v;else kadry.push(v);
    kadry=kadry.slice(-24);zapiszPamiec();return true;
  }
  function zastosujKadr(name){
    const v=kadry.find(x=>x.name===name);if(!v)return false;
    ustaw(ARCH_PHOTO);ustawParametry(v);
    const ok=nawigacja.ustawWidok(new THREE.Vector3().fromArray(v.position),new THREE.Vector3().fromArray(v.target));
    aktualizuj();return ok;
  }
  function usunKadr(name){const n=kadry.length;kadry=kadry.filter(x=>x.name!==name);zapiszPamiec();return kadry.length<n;}
  return {aktualizuj,ustaw,ustawParametry,zapiszKadr,zastosujKadr,usunKadr,
    get tryb(){return tryb;},get shift(){return {x:shiftX,y:shiftY};},get kadry(){return kadry.map(x=>({...x}));}};
}
