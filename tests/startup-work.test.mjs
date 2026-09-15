import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sygnaturaManifestu} from '../renderery/webgpu/biblioteka.js';

test('manifest signature changes only for renderer-relevant version fields',()=>{
  const a={currentVersion:'v1',versions:[{id:'v1',file:'v1.json',sha256:'abc'}]};
  assert.equal(sygnaturaManifestu(a),sygnaturaManifestu({...a,updatedAt:'later'}));
  assert.notEqual(sygnaturaManifestu(a),sygnaturaManifestu({...a,currentVersion:'v2'}));
  assert.notEqual(sygnaturaManifestu(a),sygnaturaManifestu({currentVersion:'v1',versions:[{...a.versions[0],sha256:'def'}]}));
});

test('user textures start loading before their later scene integration',async()=>{
  const source=await readFile('renderery/webgpu/silnik.js','utf8');
  const start=source.indexOf('const obietnicaTeksturUzytkownika=');
  const integration=source.indexOf('const wynikTU=await obietnicaTeksturUzytkownika');
  assert.ok(start>0 && integration>start);
  assert.match(source,/queueMicrotask\(\(\)=>window\.__silnik\.aktywujNatywneMeble/);
});
