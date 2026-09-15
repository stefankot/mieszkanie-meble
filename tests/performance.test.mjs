import test from 'node:test';
import assert from 'node:assert/strict';
import {percentyl,utworzPomiar} from '../renderery/webgpu/wydajnosc.js';

test('percentyl uses nearest-rank and ignores non-finite values',()=>{
  assert.equal(percentyl([40,10,30,20,NaN],.50),20);
  assert.equal(percentyl([40,10,30,20],.95),40);
  assert.equal(percentyl([],.99),null);
});

test('GPU duration from r185 is recorded once without division by frame count',async()=>{
  let now=0;
  const renderer={info:{render:{drawCalls:7,triangles:99},memory:{textures:3}},
    resolveTimestampsAsync:async()=>48,
    getDrawingBufferSize:o=>Object.assign(o,{width:1280,height:800}),getPixelRatio:()=>1};
  const pomiar=utworzPomiar(renderer,{wlaczony:true,dokument:null,zegar:{now:()=>now}});
  pomiar.poKlatce(4,{faza:'ruch'});await Promise.resolve();await Promise.resolve();
  now=600;pomiar.poKlatce(6,{faza:'ruch'});
  assert.equal(pomiar.stan.gpuMs,48);
  assert.equal(pomiar.stan.frameMs,600);
  assert.equal(pomiar.stan.faza,'ruch');
});
