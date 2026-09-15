import * as Core from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const THREE = {...Core, RoundedBoxGeometry};
const ROOT = new URL('../../', import.meta.url);
const ID = 'lozko';
const PIN_KEY = 'mieszkanie-webgpu:wybrane-wersje-mebli:1';
const BROKEN_NATIVE_VERSIONS = new Set(['v0009']);
const V0011_MIGRATION_KEY = 'mieszkanie-webgpu:lozko-v0010-do-v0011:1';
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

function migratedV0011(){
  try{ return localStorage.getItem(V0011_MIGRATION_KEY) === '1'; }
  catch(e){ return true; }
}

function markV0011Migrated(){
  try{ localStorage.setItem(V0011_MIGRATION_KEY, '1'); }
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
  let migrateV0011 = false;
  try{
    const lib = await waitForLibrary();
    const manifest = await fetchManifest();
    const wpis = lib.meble.get(ID);

    let selectedId = wpis?.wersja || manifest.currentVersion;
    if(BROKEN_NATIVE_VERSIONS.has(selectedId) && manifest.currentVersion && manifest.currentVersion !== selectedId){
      // v0009 potrafiła blokować główny wątek. Nie pozostawiamy użytkownika na
      // trwałym pinie do wersji oznaczonej jako uszkodzona — przechodzimy do
      // aktualnej poprawki bez czekania na 15-s okres biblioteki.
      selectedId = manifest.currentVersion;
    }

    // Jednorazowa migracja bieżącej sesji/profilu z v0010 do v0011. P7d nadal
    // zachowuje ręcznie wybrane starsze wersje: po pierwszej udanej migracji
    // znacznik blokuje ponowne wymuszanie v0011, więc użytkownik może później
    // świadomie wrócić do v0010 z selektora wersji.
    if(selectedId === 'v0010' && manifest.currentVersion === 'v0011' && !migratedV0011()){
      selectedId = 'v0011';
      migrateV0011 = true;
    }

    const versionEntry = manifest.versions?.find(v => v.id === selectedId);
    if(!versionEntry?.nativeOverrideFile) return;
    if(wpis?.korzen?.userData?.nativeOverrideVersion === selectedId) return;

    attemptedVersion = selectedId;
    if(failedVersion === selectedId && Date.now() - failedAt < RETRY_AFTER_MS) return;

    const placement = versionEntry.placement || manifest.placement;
    if(!placement?.confirmed) throw new Error(`Wersja ${selectedId} nie ma potwierdzonego placement.`);
    await buildOverride(lib, wpis, versionEntry, placement, manifest);
    if(migrateV0011) markV0011Migrated();
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
