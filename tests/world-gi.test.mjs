import test from 'node:test';
import assert from 'node:assert/strict';
import {wybierzWorldGI,utworzWorldGI,SPEEDBALL_VERSION} from '../renderery/webgpu/world-gi.js';

test('P13 query keeps SSGI baseline and selects only explicit Speedball',()=>{
  assert.equal(wybierzWorldGI(''), 'ssgi');
  assert.equal(wybierzWorldGI('?gi=unknown'), 'ssgi');
  assert.equal(wybierzWorldGI('?gi=speedball'), 'speedball');
  assert.equal(SPEEDBALL_VERSION, '0.7.0');
});

test('P13 Speedball is installed once and enabled only for desktop profile',async()=>{
  const calls=[];
  const handle={
    setEnabled:v=>calls.push(['enabled',v]), update:()=>calls.push(['update']),
    hasData:()=>true, getStats:()=>({probes:12}), dispose:()=>calls.push(['dispose'])
  };
  const gi=await utworzWorldGI({renderer:{},scene:{},camera:{},wariant:'speedball',profil:'srednia',
    loadSpeedball:async()=>({installSpeedballGI:opts=>{calls.push(['install',opts]);return handle;}})});
  assert.equal(gi.odczyt().aktywny,false);
  gi.aktualizuj();
  assert.equal(calls.some(x=>x[0]==='update'),false);
  assert.equal(gi.ustawProfil('wysoka'),true);
  gi.aktualizuj();
  assert.equal(calls.filter(x=>x[0]==='install').length,1);
  assert.equal(calls.filter(x=>x[0]==='update').length,1);
  assert.equal(gi.odczyt().stats.probes,12);
});
