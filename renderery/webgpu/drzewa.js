/* P30 — drzewa 3D za oknami z wiatrem w shaderze.
   Zastępują płaskie, nieoświetlone karty (MeshBasicMaterial + alphaTest) i ośmiokątne pnie.
   · 4 warianty generowane deterministycznie: stożkowe gałęzie (rekurencja) + kępy liści,
   · tekstura kępy liści rysowana w kodzie (bez zewnętrznego pliku),
   · materiały oświetlone; liście z lekkim prześwitem (stała emisja ≈ światło przechodzące),
   · wiatr w positionNode: kołysanie rośnie z wysokością, liście drgają z własną fazą,
     faza drzewa z jego pozycji w świecie — zero pracy CPU, każde drzewo inne.
   Pozycje drzew = pozycje dotychczasowych kart (ilustracyjne, jak wcześniej). */
import { attribute, positionLocal, modelPosition, time, sin, vec3, float } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function losowe(ziarno){ let a = ziarno >>> 0 || 1; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return ((a >>> 0) % 100000) / 100000; }; }

function teksturaLisci(THREE){
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), los = losowe(90210);
  for(let k = 0; k < 70; k++){
    const kat = los()*Math.PI*2, r = Math.sqrt(los())*190, x = 256 + Math.cos(kat)*r, y = 256 + Math.sin(kat)*r;
    const dl = 34 + los()*26, sz = dl*(.38 + los()*.12), obrot = los()*Math.PI*2;
    const h = 88 + los()*34, s = 38 + los()*22, l = 24 + los()*18;
    g.save(); g.translate(x, y); g.rotate(obrot);
    g.fillStyle = `hsl(${h},${s}%,${l}%)`;
    g.beginPath(); g.moveTo(-dl/2, 0);
    g.quadraticCurveTo(0, -sz, dl/2, 0); g.quadraticCurveTo(0, sz, -dl/2, 0); g.fill();
    g.strokeStyle = `hsla(${h},${s}%,${l + 14}%,.55)`; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-dl/2, 0); g.lineTo(dl/2, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* Jeden wariant: [geometria kory, geometria liści], wysokość drzewa. */
function wariant(THREE, ziarno){
  const los = losowe(ziarno), kora = [], liscie = [];
  const WYS = 470 + los()*130;
  const gora = new THREE.Vector3(0, 1, 0), tmp = new THREE.Object3D();
  function galaz(start, kier, dl, r, gleb){
    const g = new THREE.CylinderGeometry(r*.62, r, dl, 6, 1, true);
    tmp.position.copy(start).addScaledVector(kier, dl/2);
    tmp.quaternion.setFromUnitVectors(gora, kier); tmp.scale.set(1, 1, 1); tmp.updateMatrix();   // skala z kępy liści nie może przejść na gałąź
    g.applyMatrix4(tmp.matrix); kora.push(g);
    const koniec = start.clone().addScaledVector(kier, dl);
    if(gleb === 0 || r < .8){
      for(let k = 0; k < 12; k++){   // gęsta korona: przy 7 małych kępach dominowały gołe gałęzie
        const p = new THREE.PlaneGeometry(1, 1), s = 60 + los()*35;
        tmp.position.copy(koniec).add(new THREE.Vector3(los()-.5, los()-.3, los()-.5).multiplyScalar(60));
        tmp.rotation.set(los()*Math.PI, los()*Math.PI, los()*Math.PI); tmp.scale.setScalar(s); tmp.updateMatrix();
        p.applyMatrix4(tmp.matrix);
        const faza = los(), odc = .75 + los()*.4;
        p.setAttribute('faza', new THREE.Float32BufferAttribute([faza, faza, faza, faza], 1));
        p.setAttribute('color', new THREE.Float32BufferAttribute([odc, odc*1.02, odc*.9, odc, odc*1.02, odc*.9, odc, odc*1.02, odc*.9, odc, odc*1.02, odc*.9], 3));
        liscie.push(p);
      }
      return;
    }
    const dzieci = 2 + Math.floor(los()*1.8);   // 2–3: ok. 1,3 tys. trójkątów na drzewo
    for(let k = 0; k < dzieci; k++){
      const t = .45 + los()*.5, p = start.clone().addScaledVector(kier, dl*t);
      const bok = new THREE.Vector3(los()-.5, 0, los()-.5).normalize();
      const nowy = kier.clone().applyAxisAngle(bok.cross(kier).normalize().lengthSq() ? bok : new THREE.Vector3(1,0,0), (.4 + los()*.5)*(los() < .5 ? 1 : -1));
      nowy.y = Math.max(.15, nowy.y); nowy.normalize();
      galaz(p, nowy, dl*(.6 + los()*.15), r*.58, gleb - 1);
    }
  }
  galaz(new THREE.Vector3(0, 0, 0), new THREE.Vector3((los()-.5)*.12, 1, (los()-.5)*.12).normalize(), WYS*.42, 12 + los()*4, 4);
  const wagi = g => {
    const p = g.attributes.position, w = new Float32Array(p.count);
    for(let k = 0; k < p.count; k++) w[k] = Math.min(1, Math.max(0, p.getY(k)/WYS));
    g.setAttribute('wiatr', new THREE.BufferAttribute(w, 1));
    return g;
  };
  const scal = (lista, bez) => { for(const g of lista) for(const a of bez) g.deleteAttribute(a); return wagi(mergeGeometries(lista)); };
  return [scal(kora, []), scal(liscie, []), WYS];
}

function wiatr(lisc){
  const w = attribute('wiatr', 'float');
  const faza = modelPosition.x.mul(.013).add(modelPosition.z.mul(.017));
  const poryw = sin(time.mul(.37).add(faza)).mul(.6).add(sin(time.mul(.83).add(faza.mul(1.7))).mul(.4));
  const kolys = poryw.mul(w.mul(w)).mul(16);
  let przes = vec3(kolys, 0, kolys.mul(.45));
  if(lisc){
    const drg = sin(time.mul(4.1).add(attribute('faza', 'float').mul(6.283))).mul(w).mul(1.6);
    przes = przes.add(vec3(drg.mul(.3), drg, drg.mul(.6)));
  }
  return positionLocal.add(przes);
}

export function utworzDrzewa(THREE, otwory){
  const warianty = [0, 1, 2, 3].map(k => wariant(THREE, 7919*(k + 3)));
  const kora = new THREE.MeshStandardNodeMaterial({color: 0x4a4034, roughness: .95, metalness: 0});
  kora.positionNode = wiatr(false); kora.name = 'Kora (P30)';
  const lisc = new THREE.MeshStandardNodeMaterial({map: teksturaLisci(THREE), alphaTest: .5, side: THREE.DoubleSide,
    roughness: .78, metalness: 0, vertexColors: true, emissive: new THREE.Color(0x14200c)});
  lisc.positionNode = wiatr(true); lisc.name = 'Liście (P30)';
  const grupa = new THREE.Group(); grupa.name = 'Drzewa 3D (P30)';
  const los = losowe(6102026);
  for(const [nr, o] of otwory.entries()){
    const [x, z, w, d] = o.rect, naZewnatrz = x < 500 ? -1 : 1;
    for(let i = 0; i < 4; i++){
      const [gk, gl] = warianty[(nr + i) % 4];
      const drzewo = new THREE.Group();
      drzewo.position.set(x + w/2 + naZewnatrz*(300 + i*70), 0, z + d/2 + (i - 1.5)*95);
      drzewo.rotation.y = los()*Math.PI*2;
      drzewo.scale.setScalar(.85 + los()*.3);
      for(const [g, m] of [[gk, kora], [gl, lisc]]){
        const siatka = new THREE.Mesh(g, m);
        siatka.castShadow = true; siatka.receiveShadow = true;
        drzewo.add(siatka);
      }
      grupa.add(drzewo);
    }
  }
  return grupa;
}
