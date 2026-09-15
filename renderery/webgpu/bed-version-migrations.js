const ROOT = new URL('../../', import.meta.url);

const TARGETS = [
  {id:'lozko', version:'v0018', key:'mieszkanie-webgpu:lozko-v0017-do-v0018:1'},
  {id:'lozko-pokoj-9', version:'v0002', key:'mieszkanie-webgpu:lozko-pokoj-9-v0001-do-v0002:1'}
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function migrated(key){
  try{ return localStorage.getItem(key) === '1'; }
  catch(e){ return true; }
}

function markMigrated(key){
  try{ localStorage.setItem(key, '1'); }
  catch(e){}
}

async function fetchManifest(id){
  const url = new URL(`meble/${id}/manifest.json?t=${Date.now()}`, ROOT);
  const r = await fetch(url, {cache:'no-store'});
  if(!r.ok) throw new Error(`${id}: manifest HTTP ${r.status}`);
  return r.json();
}

async function waitForLibrary(timeoutMs=30000){
  const end = performance.now()+timeoutMs;
  while(performance.now()<end){
    const lib = window.__silnik?.biblioteka;
    if(lib?.meble && typeof lib.przypnij === 'function') return lib;
    await sleep(100);
  }
  throw new Error('Migracja łóżek: biblioteka nie jest gotowa.');
}

async function waitForEntry(lib,id,timeoutMs=12000){
  const end = performance.now()+timeoutMs;
  while(performance.now()<end){
    const w=lib.meble.get(id);
    if(w) return w;
    await sleep(100);
  }
  return null;
}

async function waitForNativeActivator(timeoutMs=12000){
  const end=performance.now()+timeoutMs;
  while(performance.now()<end){
    if(typeof window.__silnik?.aktywujNatywneMeble === 'function') return window.__silnik.aktywujNatywneMeble;
    await sleep(100);
  }
  return null;
}

async function run(){
  try{
    const lib=await waitForLibrary();

    for(const target of TARGETS){
      const manifest=await fetchManifest(target.id);
      if(manifest.currentVersion!==target.version) continue;

      let wpis=await waitForEntry(lib,target.id);
      if(!wpis){
        // Kopia może jeszcze nie istnieć w mapie podczas pierwszych milisekund.
        // Natywny adapter utworzy ją z bieżącego manifestu; nie oznaczamy wtedy
        // migracji jako zakończonej, dopóki rzeczywiście się nie pojawi.
        continue;
      }

      // native-meble zachowuje manifest w wpisie; odświeżamy go jawnie, aby
      // przypnij() widziało nowo opublikowaną wersję także w już otwartej karcie.
      lib.meble.set(target.id,{...wpis,manifest});
      wpis=lib.meble.get(target.id);

      if(!migrated(target.key)){
        if(wpis.wersja!==target.version || wpis.przypieta!==target.version){
          await lib.przypnij(target.id,target.version);
        }
        const po=lib.meble.get(target.id);
        if(po?.wersja===target.version) markMigrated(target.key);
      }
    }

    const activate=await waitForNativeActivator();
    await activate?.();
    window.__silnik?.oznaczZmiane?.();
  }catch(e){
    console.error('Migracja odbitych łóżek:',e);
    window.__silnik?.usterki?.push?.('Migracja odbitych łóżek: '+(e?.message||e));
  }
}

run();
