import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateFurnitureV1ToV2,normalizeFurnitureDocument,validateFurnitureV2} from '../renderery/webgpu/furniture-schema-v2.js';

const v1=JSON.parse(fs.readFileSync('meble/regal-salon/wersje/v0004.json'));
const migrated=migrateFurnitureV1ToV2(v1);
assert.equal(validateFurnitureV2(migrated).parts.size,v1.model.parts.length);
const normalized=normalizeFurnitureDocument(migrated);
assert.equal(normalized.document.model.parts[0].id,v1.model.parts[0].id);
assert.equal(normalized.document.model.units,'mm');
const duplicate=structuredClone(migrated);duplicate.geometry.parts.push(structuredClone(duplicate.geometry.parts[0]));
assert.throws(()=>validateFurnitureV2(duplicate),/powtórzone ID/);
const badRef=structuredClone(migrated);badRef.geometry.parts[0].material='missing';
assert.throws(()=>validateFurnitureV2(badRef),/brakujący materiał/);
const runtime=structuredClone(migrated);runtime.runtimeState={open:1};
assert.throws(()=>validateFurnitureV2(runtime),/runtimeState/);
const poc=JSON.parse(fs.readFileSync('meble/regal-salon/wersje/v0005-poc-v2.json'));
assert.equal(normalizeFurnitureDocument(poc).document.model.lighting.recesses.length,5);
console.log('furniture-schema-v2: 7 assertions passed');
