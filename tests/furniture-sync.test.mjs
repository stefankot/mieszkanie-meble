import test from 'node:test';
import assert from 'node:assert/strict';
import {STATUS_MODELU, odrzucDuplikatyId, sprawdzRozszerzenia,
  wybierzPotwierdzoneUmiejscowienie, utworzBramkePokolen, singleFlight,
  statusPoZbudowaniu, odrzuconyStan} from '../renderery/webgpu/furniture-sync.js?p7reload1';
import {uruchomBiblioteke} from '../renderery/webgpu/biblioteka.js';
import {pathToFileURL} from 'node:url';

const approved = {confirmed:true, positionMm:[1258,0,6275], rotationDeg:90};

test('legacy bed inherits approved manifest placement', () => {
  const p = wybierzPotwierdzoneUmiejscowienie({assetId:'lozko', placement:approved},
    {id:'bazowa', legacy:true, placement:{...approved, confirmed:false}});
  assert.deepEqual(p, approved);
});

test('unconfirmed placement is rejected', () => {
  assert.throws(() => wybierzPotwierdzoneUmiejscowienie(
    {placement:{...approved, confirmed:false}}, {placement:{...approved, confirmed:false}}),
    /placement\.confirmed=true/);
});

test('ordinary unconfirmed version cannot inherit approved manifest placement', () => {
  assert.throws(() => wybierzPotwierdzoneUmiejscowienie(
    {assetId:'hero', placement:approved}, {id:'draft', placement:{...approved, confirmed:false}}),
    /placement\.confirmed=true/);
});

test('legacy bed inheritance requires the exact approved transform', () => {
  assert.throws(() => wybierzPotwierdzoneUmiejscowienie(
    {assetId:'lozko', placement:approved},
    {id:'bazowa', legacy:true, placement:{...approved, confirmed:false, rotationDeg:0}}),
    /placement\.confirmed=true/);
});

test('duplicate semantic part ID rejects the complete model', () => {
  assert.throws(() => odrzucDuplikatyId({parts:[{id:'front'},{id:'front'}]}), /front/);
});

test('optional unknown extension is partial; required unknown extension rejects', () => {
  const omitted = sprawdzRozszerzenia({extensions:{'vendor:soft':{required:false}}});
  assert.equal(statusPoZbudowaniu(omitted), STATUS_MODELU.PARTIAL);
  assert.throws(() => sprawdzRozszerzenia({extensions:{'vendor:required':{required:true}}}), /Wymagane/);
});

test('refresh is single-flight while a slow manifest is pending', async () => {
  let resolve, calls=0;
  const pending = new Promise(r => { resolve=r; });
  const refresh = singleFlight(async () => { calls++; await pending; return 'ok'; });
  const a=refresh(), b=refresh();
  assert.equal(a,b); assert.equal(calls,0);
  await Promise.resolve(); assert.equal(calls,1);
  assert.equal(refresh.aktywne,a);
  resolve(); assert.equal(await a,'ok'); assert.equal(await b,'ok');
  assert.equal(refresh.aktywne,null);
});

test('library checks versions at startup, force reloads the same version and switches only to approved versions', async () => {
  const threeRoot=process.env.THREE_TEST_ROOT;
  const THREE=await import(threeRoot ? pathToFileURL(threeRoot+'/build/three.webgpu.js').href : 'three/webgpu');
  const scene=new THREE.Scene(); let modelReads=0, manifestReads=0;
  const placement={confirmed:true,positionMm:[0,0,0],rotationDeg:0};
  const manifest={assetId:'hero',currentVersion:'v1',placement,versions:[
    {id:'v1',file:'v1.json'}, {id:'v2',file:'v2.json'},
    {id:'v3',file:'v3.json',placement:{...placement,confirmed:false}}
  ]};
  const documentFor=version=>({schemaVersion:1,assetId:'hero',version,model:{units:'mm',
    materials:{white:{type:'white'}},parts:[{id:'box',type:'box',sizeMm:[100,100,100],material:'white'}]}});
  const storage=new Map([['mieszkanie-webgpu:znane-wersje-mebli:1',JSON.stringify({hero:'v0'})]]);
  const previousStorage=globalThis.localStorage;
  globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  try{
    const library=await uruchomBiblioteke({THREE,scena:scene,meble:[['hero','Hero']],okresMs:0,
      boxGeo:(...size)=>new THREE.BoxGeometry(...size.slice(0,3)),
      materialBazowy:{white:()=>new THREE.MeshPhysicalMaterial()},
      pobierzJSON:async path=>{
        if(path.endsWith('manifest.json')){ manifestReads++; return structuredClone(manifest); }
        modelReads++; return documentFor(path.replace('.json',''));
      }});
    assert.equal(manifestReads,1); assert.equal(modelReads,1);
    assert.deepEqual(library.kontrola.noweWersje,[{id:'hero',poprzednia:'v0',nowa:'v1'}]);
    const first=library.meble.get('hero').korzen;
    await library.odswiez(); assert.equal(modelReads,1);
    await library.wymusPrzeladowanie('hero');
    assert.equal(modelReads,2); assert.notEqual(library.meble.get('hero').korzen,first);
    assert.equal(library.kontrola.powod,'wymuszone');
    assert.equal(library.dostepneWersje('hero').find(v=>v.id==='v3').confirmed,false);
    await library.przypnij('hero','v2'); assert.equal(library.meble.get('hero').wersja,'v2');
    const approvedRoot=library.meble.get('hero').korzen;
    await assert.rejects(()=>library.przypnij('hero','v3'),/nie ma zatwierdzonego/);
    assert.equal(library.meble.get('hero').korzen,approvedRoot);
    library.stop();
  }finally{ globalThis.localStorage=previousStorage; }
});

test('generation token prevents a stale async version from winning', async () => {
  const gate=utworzBramkePokolen(); const applied=[];
  let release;
  const oldToken=gate.rozpocznij('hero');
  const old=(async()=>{ await new Promise(r=>{release=r;}); if(gate.aktualne('hero',oldToken)) applied.push('old'); })();
  const newToken=gate.rozpocznij('hero');
  if(gate.aktualne('hero',newToken)) applied.push('new');
  release(); await old;
  assert.deepEqual(applied,['new']);
});

test('404/rejection preserves the previous valid model and marks rejected', () => {
  const root={name:'previous'};
  const s=odrzuconyStan({korzen:root, status:STATUS_MODELU.COMPLETE, wersja:'v1'}, {}, 'HTTP 404');
  assert.equal(s.korzen,root); assert.equal(s.wersja,'v1');
  assert.equal(s.status,STATUS_MODELU.REJECTED); assert.equal(s.aktywnyStatus,STATUS_MODELU.COMPLETE);
  assert.equal(s.zachowanyPoprzedni,true);
});
