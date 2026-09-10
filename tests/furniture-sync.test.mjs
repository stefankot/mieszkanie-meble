import test from 'node:test';
import assert from 'node:assert/strict';
import {STATUS_MODELU, odrzucDuplikatyId, sprawdzRozszerzenia,
  wybierzPotwierdzoneUmiejscowienie, utworzBramkePokolen, singleFlight,
  statusPoZbudowaniu, odrzuconyStan} from '../renderery/webgpu/furniture-sync.js';

const approved = {confirmed:true, positionMm:[1258,0,6275], rotationDeg:90};

test('legacy bed inherits approved manifest placement', () => {
  const p = wybierzPotwierdzoneUmiejscowienie({placement:approved},
    {legacy:true, placement:{...approved, confirmed:false}});
  assert.deepEqual(p, approved);
});

test('unconfirmed placement is rejected', () => {
  assert.throws(() => wybierzPotwierdzoneUmiejscowienie(
    {placement:{...approved, confirmed:false}}, {placement:{...approved, confirmed:false}}),
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
  resolve(); assert.equal(await a,'ok'); assert.equal(await b,'ok');
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
