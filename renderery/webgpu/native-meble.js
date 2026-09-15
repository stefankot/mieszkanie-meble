import * as Core from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const THREE = {...Core, RoundedBoxGeometry};
const ROOT = new URL('../../', import.meta.url);
const ID = 'lozko';
const PIN_KEY = 'mieszkanie-webgpu:wybrane-wersje-mebli:1';
const BROKEN_NATIVE_VERSIONS = new Set(['v0009']);
const V0011_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0010-do-v0011:1';
const V0012_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0011-do-v0012:1';
const V0013_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0012-do-v0013:1';
const V0014_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0013-do-v0014:1';
const V0015_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0014-do-v0015:1';
// v2 naprawia wyścig: poprzedni adapter zapisywał migrację zanim wewnętrzny
// cache wybranej wersji biblioteki został zsynchronizowany. W efekcie v0015
// mogła pojawić się na moment, po czym okresowe odświeżenie przywracało v0014.
const V0015_STABLE_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0014-do-v0015:2';
const V0016_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0015-do-v0016:1';
const V0017_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0016-do-v0017:1';
const RETRY_AFTER_MS = 30000;
let running = false;
let failedVersion = null;
let failedAt = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForLibrary(timeoutMs = 60000){
  const end = performance.now() + timeoutMs;
  while(performance.now() < end){
    const lib = window.__silnik?.biblioteka;
    if(lib?.meble) return lib;
    await sleep(100);
  }
  throw new Error('Biblioteka mebli nie uruchomiła się w wymaganym czasie.');
}

async function fetchManifest(){
  const u = new URL(`meble/${ID}/manifest.json?t=${Date.now()}`, ROOT);
  const r = await fetch(u, {cache:'no-store'});
  if(!r.ok) throw new Error(`manifest ${ID}: HTTP ${r.status}`);
  return r.json();
}

function pinVersion(version){
  try{
    const data = JSON.parse(localStorage.getItem(PIN_KEY) || '{}');
    const safe = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    safe[ID] = version;
    localStorage.setItem(PIN_KEY, JSON.stringify(safe));
  }catch(e){}
}

function migrated(key){
  try{ return localStorage.getItem(key) === '1'; }
  catch(e){ return true; }
}

function markMigrated(key){
  try{ localStorage.setItem(key, '1'); }
  catch(e){}
}

function disposeOldGeometry(root){
  root?.traverse?.(o => o.geometry?.dispose?.());
}

async function buildOverride(lib, wpis, versionEntry, placement, manifest){
  const moduleUrl = new URL(versionEntry.nativeOverrideFile, ROOT);
  moduleUrl.searchParams.set('v', versionEntry.id);
  const mod = await import(moduleUrl.href);
  const builderName = versionEntry.nativeBuilder || 'buildLozkoV0002';
  const builder = mod[builderName] || mod.default?.[builderName];
  if(typeof builder !== 'function') throw new Error(`Brak buildera ${builderName}.`);

  const started = performance.now();
  const built = builder({THREE, placement});
  const buildMs = performance.now() - started;
  if(!built?.korzen) throw new Error('Natywny model nie zwrócił korzenia.');
  built.korzen.userData.version = versionEntry.id;
  built.korzen.userData.nativeOverrideVersion = versionEntry.id;
  built.korzen.userData.nativeBuildMs = Math.round(buildMs);

  const main = built.ruchy?.find(r => r.id === 'lozko:lift');
  if(main && typeof built.applyDependentState === 'function'){
    let progress = Number(main.wartosc) || 0;
    Object.defineProperty(main, 'wartosc', {
      configurable: true,
      enumerable: true,
      get(){ return progress; },
      set(v){ progress = Number(v) || 0; built.applyDependentState(); }
    });
    main.wartosc = progress;
  }

  const oldRoot = wpis?.korzen;
  const scene = oldRoot?.parent || [...lib.meble.values()].map(x => x?.korzen?.parent).find(Boolean);
  if(!scene) throw new Error('Nie znaleziono sceny dla natywnego modelu.');
  if(oldRoot) scene.remove(oldRoot);
  scene.add(built.korzen);
  disposeOldGeometry(oldRoot);

  const next = {
    ...wpis,
    manifest: manifest || wpis?.manifest,
    wersja: versionEntry.id,
    opis: versionEntry.summary || wpis?.opis,
    korzen: built.korzen,
    ruchy: built.ruchy || [],
    pominiete: [],
    przypieta: versionEntry.id,
    umiejscowienie: placement
  };
  lib.meble.set(ID, next);
  lib.ruchy = [...lib.meble.values()].flatMap(x => x.ruchy || []);
  pinVersion(versionEntry.id);

  window.__silnik?.nawigacja?.przeliczMeble?.();
  window.__silnik?.sterowanie?.odswiezMeble?.();
  window.__silnik?.oznaczZmiane?.();
}

async function syncNativeBed(){
  if(running) return;
  running = true;
  let attemptedVersion = null;
  let migrationKey = null;
  try{
    const lib = await waitForLibrary();
    const manifest = await fetchManifest();
    let wpis = lib.meble.get(ID);

    let selectedId = wpis?.wersja || manifest.currentVersion;
    if(BROKEN_NATIVE_VERSIONS.has(selectedId) && manifest.currentVersion && manifest.currentVersion !== selectedId){
      selectedId = manifest.currentVersion;
    }

    // Zachowujemy ręczne wybory wersji, ale bieżący profil użytkownika dostaje
    // jednorazowo kolejne jawnie opublikowane rewizje projektu.
    if(selectedId === 'v0010' && manifest.currentVersion === 'v0011' && !migrated(V0011_MIGRATION_KEY)){
      selectedId = 'v0011';
      migrationKey = V0011_MIGRATION_KEY;
    }
    if((selectedId === 'v0010' || selectedId === 'v0011') && manifest.currentVersion === 'v0012' && !migrated(V0012_MIGRATION_KEY)){
      selectedId = 'v0012';
      migrationKey = V0012_MIGRATION_KEY;
    }
    if((selectedId === 'v0010' || selectedId === 'v0011' || selectedId === 'v0012') && manifest.currentVersion === 'v0013' && !migrated(V0013_MIGRATION_KEY)){
      selectedId = 'v0013';
      migrationKey = V0013_MIGRATION_KEY;
    }
    if((selectedId === 'v0010' || selectedId === 'v0011' || selectedId === 'v0012' || selectedId === 'v0013') && manifest.currentVersion === 'v0014' && !migrated(V0014_MIGRATION_KEY)){
      selectedId = 'v0014';
      migrationKey = V0014_MIGRATION_KEY;
    }
    if((selectedId === 'v0010' || selectedId === 'v0011' || selectedId === 'v0012' || selectedId === 'v0013' || selectedId === 'v0014') && manifest.currentVersion === 'v0015' && !migrated(V0015_MIGRATION_KEY)){
      selectedId = 'v0015';
      migrationKey = V0015_MIGRATION_KEY;
    }

    // Naprawa publikacji v0015: stary klucz mógł już zostać oznaczony mimo że
    // biblioteka nadal pamiętała v0014 w swoim wewnętrznym cache. Używamy
    // nowego klucza i — kluczowe — przeprowadzamy wybór przez publiczne API
    // biblioteki, aby zsynchronizować stan, localStorage i bramkę pokoleń.
    if(manifest.currentVersion === 'v0015' && !migrated(V0015_STABLE_MIGRATION_KEY)){
      const moznaMigrowac = ['v0010','v0011','v0012','v0013','v0014','v0015'].includes(selectedId);
      if(moznaMigrowac){
        selectedId = 'v0015';
        migrationKey = V0015_STABLE_MIGRATION_KEY;
      }
    }

    // v0016 jest publikowana jako kolejna zaakceptowana rewizja. Przechodzimy
    // przez biblioteka.przypnij(), aby nie wrócił wcześniejszy wyścig stanu.
    if(manifest.currentVersion === 'v0016' && !migrated(V0016_MIGRATION_KEY)){
      const moznaMigrowac = ['v0010','v0011','v0012','v0013','v0014','v0015','v0016'].includes(selectedId);
      if(moznaMigrowac){
        selectedId = 'v0016';
        migrationKey = V0016_MIGRATION_KEY;
      }
    }

    // v0017: naprawa oświetlenia i przesunięcie schodów do ściany. Jak przy
    // poprzednich publikacjach przechodzimy przez przypnij(), żeby utrwalić
    // wersję w wewnętrznym stanie biblioteki i localStorage.
    if(manifest.currentVersion === 'v0017' && !migrated(V0017_MIGRATION_KEY)){
      const moznaMigrowac = ['v0010','v0011','v0012','v0013','v0014','v0015','v0016','v0017'].includes(selectedId);
      if(moznaMigrowac){
        selectedId = 'v0017';
        migrationKey = V0017_MIGRATION_KEY;
      }
    }

    if(migrationKey && typeof lib.przypnij === 'function' &&
       (wpis?.wersja !== selectedId || wpis?.przypieta !== selectedId)){
      await lib.przypnij(ID, selectedId);
      wpis = lib.meble.get(ID);
    }

    const versionEntry = manifest.versions?.find(v => v.id === selectedId);
    if(!versionEntry?.nativeOverrideFile) return;
    if(wpis?.korzen?.userData?.nativeOverrideVersion === selectedId){
      if(migrationKey) markMigrated(migrationKey);
      return;
    }

    attemptedVersion = selectedId;
    if(failedVersion === selectedId && Date.now() - failedAt < RETRY_AFTER_MS) return;

    const placement = versionEntry.placement || manifest.placement;
    if(!placement?.confirmed) throw new Error(`Wersja ${selectedId} nie ma potwierdzonego placement.`);
    await buildOverride(lib, wpis, versionEntry, placement, manifest);
    if(migrationKey) markMigrated(migrationKey);
    failedVersion = null;
    failedAt = 0;
  }catch(e){
    if(attemptedVersion){ failedVersion = attemptedVersion; failedAt = Date.now(); }
    console.error('Natywny model łóżka:', e);
    window.__silnik?.usterki?.push?.('Natywny model łóżka: ' + (e?.message || e));
  }finally{
    running = false;
  }
}

syncNativeBed();
setInterval(() => {
  if(window.__silnik) window.__silnik.aktywujNatywneMeble = syncNativeBed;
  syncNativeBed();
}, 2000);