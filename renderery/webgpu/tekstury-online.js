/* Wczytywanie tekstur spoza silnika (biblioteki online, pliki użytkownika).
   `.ktx2` idzie przez KTX2Loader — sterownik sam wybiera format GPU (BC7 na desktopie, ASTC/ETC na mobile);
   pozostałe rozszerzenia zwykłym TextureLoaderem. Jedna pamięć podręczna na adres. */
export function utworzTeksturyOnline({THREE, renderer}){
  const pamiec = new Map();
  const gotowe = new Map();
  let ktx2 = null;
  const maxAniso = renderer.capabilities?.getMaxAnisotropy?.() ?? 8;

  async function loaderKtx2(){
    if(!ktx2){
      const {KTX2Loader} = await import('three/addons/loaders/KTX2Loader.js');
      ktx2 = new KTX2Loader()
        .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/basis/')
        .setWorkerLimit(2)
        .detectSupport(renderer);
    }
    return ktx2;
  }

  /* `kolor` = true dla map barwy (sRGB); mapy danych (normalne, ARM, wysokość) zostają liniowe. */
  function wczytaj(url, {kolor = false} = {}){
    const klucz = `${url}|${kolor ? 'srgb' : 'lin'}`;
    if(pamiec.has(klucz)) return pamiec.get(klucz);
    const zadanie = (async () => {
      const tekstura = /\.ktx2(\?|$)/i.test(url)
        ? await (await loaderKtx2()).loadAsync(url)
        : await new THREE.TextureLoader().setCrossOrigin('anonymous').loadAsync(url);
      tekstura.wrapS = tekstura.wrapT = THREE.RepeatWrapping;
      tekstura.anisotropy = maxAniso;
      tekstura.colorSpace = kolor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tekstura.needsUpdate = true;
      gotowe.set(klucz, tekstura);      // ta sama pamięć, z której korzysta budowanie materiału
      return tekstura;
    })();
    pamiec.set(klucz, zadanie);
    return zadanie;
  }

  /* Wersja dla budowania materiału. Tekstura bez pikseli nie może trafić do GPU (WebGPU unieważnia wtedy
     cały potok), więc do czasu wczytania wraca biały piksel, a po wczytaniu wołamy `poWczytaniu`,
     żeby materiał dało się przebudować z prawdziwą mapą. */
  const bialyPiksel = () => {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
  };
  function wczytajOdRazu(url, {kolor = false, poWczytaniu} = {}){
    const klucz = `${url}|${kolor ? 'srgb' : 'lin'}`;
    if(gotowe.has(klucz)) return gotowe.get(klucz);
    wczytaj(url, {kolor}).then(t => { gotowe.set(klucz, t); poWczytaniu?.(t); }).catch(() => {});
    return bialyPiksel();
  }

  const czyGotowa = (url, kolor = false) => gotowe.has(`${url}|${kolor ? 'srgb' : 'lin'}`);
  return {wczytaj, wczytajOdRazu, czyGotowa, get ile(){ return gotowe.size; }};
}
