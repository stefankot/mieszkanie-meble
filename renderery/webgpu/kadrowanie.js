/* Wyłącznie odczyt planu i biblioteki; pozycje/meble pozostają bez zmian. */
export function utworzKadrowanie({THREE, plan, biblioteka}){
  const promien = 20;
  const obrys = [[0,0],[20,0],[-20,0],[0,20],[0,-20],[14,14],[14,-14],[-14,14],[-14,-14]];
  const xs=plan.APARTMENT.outer.map(p=>p[0]), zs=plan.APARTMENT.outer.map(p=>p[1]);
  const granice={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
  const maxOczy=Math.min(230,plan.APARTMENT.height-20);
  let bryly=[];
  function odswiez(){
    bryly=[];
    for(const {korzen} of biblioteka?.meble?.values() || []){
      if(!korzen || !korzen.visible) continue;
      korzen.updateWorldMatrix(true,true);
      const b=new THREE.Box3().setFromObject(korzen);
      if(!b.isEmpty() && [...b.min.toArray(),...b.max.toArray()].every(Number.isFinite)) bryly.push({b,korzen});
    }
  }
  function wolne(p){
    if(!p || ![p.x,p.y,p.z].every(Number.isFinite) || p.y<60 || p.y>maxOczy) return false;
    for(const [dx,dz] of obrys){
      if(!plan.czyPodloga(p.x+dx,p.z+dz)) return false;
      for(const y of [28,98,p.y]) if(plan.czySciana(p.x+dx,y,p.z+dz)) return false;
    }
    if(plan.wallBoxes?.some(b=>{
      if(b.max.y<=28 || b.min.y>=p.y) return false;
      const dx=p.x-THREE.MathUtils.clamp(p.x,b.min.x,b.max.x);
      const dz=p.z-THREE.MathUtils.clamp(p.z,b.min.z,b.max.z);
      return dx*dx+dz*dz<promien*promien;
    })) return false;
    return !bryly.some(({b})=> b.max.y>28 && b.min.y<p.y &&
      p.x+promien>b.min.x && p.x-promien<b.max.x && p.z+promien>b.min.z && p.z-promien<b.max.z);
  }
  function bezpiecznyStart(preferowany){
    if(wolne(preferowany)) return preferowany.clone();
    const ref=preferowany && [preferowany.x,preferowany.z].every(Number.isFinite)
      ? preferowany : new THREE.Vector3((granice.minX+granice.maxX)/2,170,(granice.minZ+granice.maxZ)/2);
    let naj=null, dystans=Infinity;
    for(let x=granice.minX+promien;x<granice.maxX;x+=10)
      for(let z=granice.minZ+promien;z<granice.maxZ;z+=10){
        const d=(x-ref.x)**2+(z-ref.z)**2;
        if(d>=dystans) continue;
        const p=new THREE.Vector3(x,Math.min(170,maxOczy),z);
        if(wolne(p)){naj=p;dystans=d;}
      }
    return naj;
  }
  function widocznyCel(p,c,korzen){
    const wektor=c.clone().sub(p),dlugosc=wektor.length();
    const kroki=Math.ceil(dlugosc/4);
    for(let i=1;i<kroki;i++){
      const t=i/kroki;
      if(plan.czySciana(p.x+wektor.x*t,p.y+wektor.y*t,p.z+wektor.z*t)) return false;
    }
    const ray=new THREE.Ray(p,wektor.normalize());
    return !bryly.some(({b,korzen:k})=>{
      if(k===korzen) return false;
      const traf=ray.intersectBox(b,new THREE.Vector3());
      return traf && traf.distanceTo(p)<dlugosc;
    });
  }
  function kadruj(korzen,camera){
    odswiez();
    const b=bryly.find(w=>w.korzen===korzen)?.b;
    if(!b) return {ok:false,powod:'Brak geometrii wybranego mebla.'};
    const c=b.getCenter(new THREE.Vector3());
    const pokoj=plan.roomAt?.(c.x,c.z);
    const q=korzen.getWorldQuaternion(new THREE.Quaternion());
    const front=new THREE.Vector3(0,0,1).applyQuaternion(q).setY(0).normalize();
    const rogi=[];
    for(const x of [b.min.x,b.max.x]) for(const y of [b.min.y,b.max.y]) for(const z of [b.min.z,b.max.z]) rogi.push(new THREE.Vector3(x,y,z));
    const probna=new THREE.PerspectiveCamera(camera.fov,
      Number.isFinite(camera.aspect)&&camera.aspect>0?camera.aspect:16/9,camera.near,camera.far);
    probna.zoom=camera.zoom;probna.updateProjectionMatrix();
    const zasieg=Math.hypot(granice.maxX-granice.minX,granice.maxZ-granice.minZ);
    let najlepszy=null;
    // Najpierw front, następnie niewielkie odchylenia; nie kadruj przez ścianę.
    for(const kat of [0,-15,15,-30,30,-45,45,-60,60]){
      const kier=front.clone().applyAxisAngle(new THREE.Vector3(0,1,0),kat*Math.PI/180);
      for(let d=30;d<=zasieg;d+=10){
        const p=c.clone().addScaledVector(kier,d);p.y=THREE.MathUtils.clamp(c.y,60,maxOczy);
        if(pokoj && plan.roomAt(p.x,p.z)!==pokoj) continue;
        if(!wolne(p) || !widocznyCel(p,c,korzen)) continue;
        probna.position.copy(p);probna.lookAt(c);probna.updateMatrixWorld(true);
        let rozmiar=0;
        for(const rog of rogi){
          const v=rog.clone().project(probna);
          if(v.z< -1 || v.z>1){rozmiar=Infinity;break;}
          rozmiar=Math.max(rozmiar,Math.abs(v.x),Math.abs(v.y));
        }
        if(!Number.isFinite(rozmiar)) continue;
        const caly=rozmiar<=.92;
        const ocena=(caly?0:1000+rozmiar*100)+Math.abs(kat)*.15+(caly?Math.abs(.92-rozmiar)*10:0);
        if(!najlepszy || ocena<najlepszy.ocena) najlepszy={ok:true,pozycja:p,cel:c.clone(),caly,ocena};
      }
    }
    return najlepszy || {ok:false,powod:'Brak wolnego miejsca przed meblem z widokiem niezasłoniętym ścianą.'};
  }
  odswiez();
  return {odswiez,wolne,bezpiecznyStart,kadruj,granice};
}
