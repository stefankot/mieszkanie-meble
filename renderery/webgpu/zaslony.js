/* ============================================================
   ZASŁONY I FIRANKI — geometria generatywna, otwierane kliknięciem
   ------------------------------------------------------------
   Modele odpowiadają konkretnym produktom wskazanym przez użytkownika:

   · SALON — 3 pary IKEA MAJGUL: zasłony zaciemniające, nieprzezroczyste,
     w przygaszonym różu ceglanym. Blokują światło, więc mają materiał
     nieprzezroczysty i rzucają cień.
   · POKÓJ Z ŁÓŻKIEM — 1 para IKEA GLASÖRT: firanka, przezroczysta, z pionowym
     przejściem barwnym (biel → żółć → szałwia). Rozprasza światło i nie
     rzuca pełnego cienia.

   Fałdy nie są modelowane wierzchołek po wierzchołku przy każdej zmianie:
   panel powstaje raz, z sinusoidalnym wygięciem w poprzek. Odsłanianie
   zwęża go i przesuwa na bok; głębokość fałd pozostaje stała: 10 cm.
   Animacja nie przelicza geometrii.
   ============================================================ */

import { positionLocal, uv, vec3, vec4, float, mix, smoothstep,
         mx_fractal_noise_float, texture } from 'three/tsl';

const DO_PODLOGI = 0;        // tkanina sięga do podłogi
const FALDY = 9;
const GLEBOKOSC_FALDY = 5;   // amplituda ±5 cm: łącznie 10 cm
const OD_SCIANY = 16;        // odległość osi tkaniny od ściany salonu
const CZAS_MS = 900;

const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;

/* Przekrój jest jednakowy od sufitu do podłogi. Osiem segmentów na fałdę
   zawiera jej ekstrema, więc rzeczywista głębokość siatki wynosi 10 cm. */
function geometriaPanelu(THREE, szer, wys, faldy){
  const g = new THREE.PlaneGeometry(szer, wys, Math.max(24, faldy*8), 10);
  const poz = g.attributes.position;
  for(let i=0;i<poz.count;i++){
    const u=(poz.getX(i)+szer/2)/szer;
    poz.setZ(i,Math.sin(u*Math.PI*2*faldy)*GLEBOKOSC_FALDY);
  }
  g.computeVertexNormals();
  return g;
}

/* --- MATERIAŁY --- */
function materialMajgul(THREE){
  /* Zaciemniająca tkanina: gęsty splot, wysoka chropowatość, delikatny połysk
     nitki (sheen). Kolor zdjęty z fotografii produktu — przygaszony ceglany róż. */
  const m = new THREE.MeshPhysicalNodeMaterial({
    color: 0xc4746a, roughness: .95, metalness: 0,
    sheen: .55, sheenRoughness: .8, sheenColor: new THREE.Color(0xffd9cf),
    side: THREE.DoubleSide
  });
  /* Splot i nierówność barwienia — w przestrzeni lokalnej panelu, więc nie
     zmienia się przy przesuwaniu zasłony. */
  const splot = mx_fractal_noise_float(positionLocal.mul(vec3(2.2, 2.2, 2.2)), 3, 2, .5);
  const smugi = mx_fractal_noise_float(positionLocal.mul(vec3(.04, .012, .04)), 2, 2, .5);
  m.colorNode = vec3(0.77, 0.455, 0.415)
                  .mul(float(1).add(splot.mul(.06)).add(smugi.mul(.10)));
  m.roughnessNode = float(.95).add(splot.mul(.05)).clamp(.6, 1);
  m.name = 'MAJGUL — zasłona zaciemniająca';
  return m;
}

function materialGlasort(THREE){
  /* Firanka: przezroczysta, z pionowym przejściem barwnym. Nie używamy
     transmission — dla tkaniny wystarczy przezroczystość z rozpraszaniem,
     a transmission kosztowałoby osobny przebieg renderowania. */
  const m = new THREE.MeshPhysicalNodeMaterial({
    color: 0xffffff, roughness: 1, metalness: 0,
    transparent: true, opacity: .42, depthWrite: false,
    sheen: .8, sheenRoughness: .95, sheenColor: new THREE.Color(0xffffff),
    side: THREE.DoubleSide
  });
  /* Gradient wzdłuż wysokości panelu: u góry biel, w środku żółć, u dołu
     szałwia — jak na zdjęciu produktu. */
  const v = uv().y;
  const gora = vec3(0.96, 0.96, 0.94);
  const srodek = vec3(0.93, 0.87, 0.55);
  const dol = vec3(0.79, 0.86, 0.80);
  const splot = mx_fractal_noise_float(positionLocal.mul(vec3(3.2, 3.2, 3.2)), 2, 2, .5);
  m.colorNode = mix(mix(dol, srodek, smoothstep(float(0), float(.55), v)),
                    gora, smoothstep(float(.55), float(1), v))
                  .mul(float(1).add(splot.mul(.05)));
  /* Splot przepuszcza światło nierówno — stąd delikatna zmienność krycia. */
  m.opacityNode = float(.42).add(splot.mul(.10)).clamp(.24, .62);
  m.name = 'GLASÖRT — firanka';
  return m;
}

/* Odczyt zatwierdzonego planu: szerokość to cała wewnętrzna ściana pokoju.
   Zewnętrzne końce otworów wyznaczają dokładne pasy parkowania tkaniny. */
export function wyznaczScianyZaslon(plan){
  const {APARTMENT:a}=plan;
  const otwory=[...a.windows,...a.doors.filter(o=>o.name==='Drzwi balkonowe')];
  const wynik=[];
  for(const pokoj of a.rooms){
    const salon=pokoj.name==='Salon';
    const sypialnia=pokoj.name==='Pokój' && Math.min(...pokoj.polygon.map(p=>p[1]))>500;
    if(!salon && !sypialnia) continue;
    const xs=pokoj.polygon.map(p=>p[0]),zs=pokoj.polygon.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),od=Math.min(...zs),doZ=Math.max(...zs);
    const xSciany=salon?maxX:minX;
    const pasujace=otwory.filter(o=>{
      const [x,z,w,h]=o.rect;
      return w<h && Math.min(Math.abs(x-xSciany),Math.abs(x+w-xSciany))<.01 && z>=od && z+h<=doZ;
    }).sort((a,b)=>a.rect[1]-b.rect[1]);
    if(!pasujace.length) continue;
    const poczatek=Math.min(...pasujace.map(o=>o.rect[1]));
    const koniec=Math.max(...pasujace.map(o=>o.rect[1]+o.rect[3]));
    wynik.push({id:salon?'salon':'sypialnia',nazwa:salon?'Salon':'Sypialnia',
      rodzaj:salon?'MAJGUL':'GLASÖRT',pary:salon?3:1,
      x:xSciany+(salon?-OD_SCIANY:8),xSciany,od,do:doZ,
      szerokosc:doZ-od,pasStart:poczatek-od,pasKoniec:doZ-koniec,otwory:pasujace});
  }
  return wynik;
}

export function utworzZaslony({THREE, scena, plan, przyZmianie}){
  const majgul=materialMajgul(THREE),glasort=materialGlasort(THREE);
  const zestawy=[],sciany=[],obserwatorzy=new Set();
  const KLUCZ='mieszkanie-webgpu:zaslony:1';
  let zapis={};
  try{ const d=JSON.parse(localStorage.getItem(KLUCZ)||'null');if(d && typeof d==='object') zapis=d; }catch(e){}
  const wysTkaniny=plan.APARTMENT.height-DO_PODLOGI;
  for(const uklad of wyznaczScianyZaslon(plan)){
    const grupa=new THREE.Group();
    grupa.name='Zasłony · '+uklad.nazwa;
    grupa.position.set(uklad.x,0,(uklad.od+uklad.do)/2);
    grupa.rotation.y=-Math.PI/2; // lokalne +X biegnie wzdłuż światowego +Z
    scena.add(grupa);
    const cel=Number.isFinite(zapis[uklad.id]) && zapis[uklad.id]>=0 && zapis[uklad.id]<=1 ? zapis[uklad.id] : 1;
    const sciana={...uklad,grupa,zestawy:[],otwarcie:cel,cel,odOtwarcia:cel,start:0,ruch:false};
    const n=uklad.pary*2,szerPanelu=uklad.szerokosc/n;
    const panele=[];
    for(let i=0;i<n;i++){
      const lewy=i<uklad.pary;
      const szerOtwarty=(lewy?uklad.pasStart:uklad.pasKoniec)/uklad.pary;
      const odOtwarty=lewy?-uklad.szerokosc/2+i*szerOtwarty
        :uklad.szerokosc/2-uklad.pasKoniec+(i-uklad.pary)*szerOtwarty;
      const p=new THREE.Mesh(geometriaPanelu(THREE,szerPanelu,wysTkaniny,FALDY),uklad.id==='salon'?majgul:glasort);
      p.name=uklad.rodzaj+' · panel '+(i+1);
      p.position.y=DO_PODLOGI+wysTkaniny/2;
      p.castShadow=uklad.id==='salon';p.receiveShadow=true;
      Object.assign(p.userData,{zaslona:true,szerPanelu,
        xZamkniety:-uklad.szerokosc/2+(i+.5)*szerPanelu,
        xOtwarty:odOtwarty+szerOtwarty/2,skalaOtwarta:szerOtwarty/szerPanelu});
      grupa.add(p);panele.push(p);
    }
    for(let i=0;i<uklad.pary;i++){
      const z={nazwa:uklad.otwory[i]?.name||uklad.nazwa,rodzaj:uklad.rodzaj,grupa,
        panele:[panele[i],panele[n-1-i]],sciana,otwarcie:cel,cel};
      zestawy.push(z);sciana.zestawy.push(z);
    }
    sciany.push(sciana);zastosuj(sciana,cel);
  }
  function zastosuj(sciana,t){
    for(const z of sciana.zestawy){
      for(const p of z.panele){
        p.scale.x=1+(p.userData.skalaOtwarta-1)*t;
        p.scale.z=1; // głębokość 10 cm w każdym stanie odsłonięcia
        p.position.x=p.userData.xZamkniety+(p.userData.xOtwarty-p.userData.xZamkniety)*t;
      }
      z.otwarcie=t;z.cel=sciana.cel;
    }
    sciana.otwarcie=t;
  }
  function powiadom(){
    try{localStorage.setItem(KLUCZ,JSON.stringify(Object.fromEntries(sciany.map(s=>[s.id,s.cel]))));}catch(e){}
    przyZmianie?.();for(const fn of obserwatorzy) fn();
  }
  function ustaw(z,cel){
    const s=z?.sciana||z;
    if(!sciany.includes(s) || !Number.isFinite(cel)) return false;
    cel=Math.max(0,Math.min(1,cel));
    if(s.cel===cel) return false;
    s.odOtwarcia=s.otwarcie;s.cel=cel;s.start=performance.now();s.ruch=true;
    for(const para of s.zestawy) para.cel=cel;
    powiadom();return true;
  }
  function przelacz(z){ const s=z?.sciana||z;return ustaw(s,(s?.cel??1)>.5?0:1); }
  function kliknij(obiekt){
    let o=obiekt;while(o && !o.userData?.zaslona) o=o.parent;
    const z=zestawy.find(z=>z.panele.includes(o));
    if(!z) return false;
    przelacz(z);return true;
  }
  function wszystkie(otwarte){
    let ile=0;for(const s of sciany) if(ustaw(s,otwarte?1:0)) ile+=s.pary;return ile;
  }
  function aktualizuj(teraz=performance.now()){
    let ruch=false;
    for(const s of sciany){
      if(!s.ruch) continue;
      const t=Math.max(0,Math.min(1,(teraz-s.start)/CZAS_MS));
      zastosuj(s,t===1?s.cel:s.odOtwarcia+(s.cel-s.odOtwarcia)*easeInOut(t));
      if(t===1) s.ruch=false;
      ruch=true;
    }
    return ruch;
  }
  return {zestawy,sciany,kliknij,przelacz,ustaw,wszystkie,aktualizuj,
    obserwuj(fn){obserwatorzy.add(fn);return ()=>obserwatorzy.delete(fn);},
    ile:zestawy.length,get opis(){return zestawy.map(z=>z.rodzaj+' · '+z.nazwa);}};
}
