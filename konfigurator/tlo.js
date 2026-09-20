/* Tło sceny jak w konfiguratorze Tylko: narożnik pokoju i sylwetka człowieka obok mebla.
   Jedno i drugie jest miarką — bez ściany i podłogi bryła wisi w pustce i nie widać, jak
   głęboko wchodzi w pokój, a bez postaci nie widać, czy szafa sięga do ramienia czy nad głowę. */
import * as THREE from 'three';

export const WZROST_MM = 1800;                         // sylwetka ma dokładnie 180 cm
const MM = 0.001;

/* Sylwetka: rysunek „Human" Pelega Reda z Noun Project (CC BY), przycięty do obrysu
   postaci — `ikony/sylwetka.svg`. Leży na płaskim prostokącie, tak jak kartonowy wycinak
   w konfiguratorze Tylko: obraca się razem ze sceną i nie kradnie uwagi.
   Proporcja obrysu (szerokość ÷ wysokość) jest zmierzona z pliku, więc postać ma dokładnie
   180 cm i nie jest ani rozciągnięta, ani spłaszczona. */
const PROPORCJA = 46.34 / 100.01;

function sylwetka(){
  const siatka = new THREE.Mesh(
    new THREE.PlaneGeometry(WZROST_MM * MM * PROPORCJA, WZROST_MM * MM),
    new THREE.MeshBasicMaterial({transparent: true, color: 0xd6d2cd, opacity: .72,
                                 depthWrite: false, toneMapped: false}));
  /* SVG wchodzi przez zwykły loader obrazka — plik ma jawne width/height, więc rasteryzuje
     się ostro, a nie w domyślnych 300×150. */
  new THREE.TextureLoader().load('ikony/sylwetka.svg', tekstura => {
    tekstura.colorSpace = THREE.SRGBColorSpace;
    siatka.material.map = tekstura;
    siatka.material.needsUpdate = true;
  });
  siatka.renderOrder = -1;                             // zawsze za meblem, nigdy przed
  siatka.name = 'sylwetka';
  return siatka;
}

function plaszczyzna(kolor){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({color: kolor, roughness: .97, metalness: 0}));
  m.receiveShadow = true;
  return m;
}

/* Grupa wraca z metodą `ustaw(pudlo)`: ściany i podłoga dosuwają się do bryły przy każdej
   przebudowie, więc regał 74 cm i zabudowa 4 m dostają ten sam ciasny narożnik. */
export function stworzTlo(){
  const grupa = new THREE.Group();
  grupa.name = 'tlo';
  const podloga = plaszczyzna(0xd6d1cb);
  podloga.rotation.x = -Math.PI / 2;
  const tylna = plaszczyzna(0xeceae7);
  const boczna = plaszczyzna(0xe4e1dd);
  boczna.rotation.y = Math.PI / 2;
  const postac = sylwetka();
  grupa.add(podloga, tylna, boczna, postac);

  grupa.ustaw = pudlo => {
    if(!pudlo || pudlo.isEmpty()) return;
    const r = pudlo.getSize(new THREE.Vector3());
    const wys = Math.max(2.6, r.y + 1);                // ściana zawsze wyższa od mebla
    const szer = Math.max(6, r.x + 6), gleb = Math.max(6, r.z + 6);
    /* Ściany stykają się z plecami i z lewym bokiem zestawu, ale z zapasem na sylwetkę —
       inaczej postać wchodziłaby w ścianę przy wąskim meblu. */
    const zTyl = pudlo.min.z - .01;
    const xLewy = Math.min(pudlo.min.x - 1.1, -1.1);

    podloga.scale.set(szer, gleb, 1);
    podloga.position.set(0, -.002, zTyl + gleb / 2);   // 2 mm niżej: nie walczy z cieniem kontaktowym

    tylna.scale.set(szer, wys, 1);
    tylna.position.set(0, wys / 2, zTyl);

    boczna.scale.set(gleb, wys, 1);
    boczna.position.set(xLewy, wys / 2, zTyl + gleb / 2);

    postac.position.set(xLewy + .55, WZROST_MM * MM / 2, zTyl + .35);
  };
  grupa.sylwetka = postac;
  return grupa;
}
