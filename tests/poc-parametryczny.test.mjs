import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {normalizeFurnitureDocument} from '../renderery/webgpu/furniture-schema-v2.js';

const dokument = () => JSON.parse(readFileSync(new URL('../meble/regal-salon/wersje/v0008-parametric.json', import.meta.url), 'utf8'));

const obrys = parts => {
  const os = i => parts.filter(p => p.type === 'box').flatMap(p => [p.positionMm[i] - p.sizeMm[i] / 2, p.positionMm[i] + p.sizeMm[i] / 2]);
  return [0, 1, 2].map(i => [Math.min(...os(i)), Math.max(...os(i))]);
};

test('POC parametryczny normalizuje się do modelu v1 o zadanym obrysie', () => {
  const {document} = normalizeFurnitureDocument(dokument());
  const parts = document.model.parts;
  assert.ok(parts.length > 40, 'model ma części z generatora');
  const [x, y] = obrys(parts.filter(p => !p.parent));      // sam korpus, bez ruchomych frontów
  assert.deepEqual([Math.round(x[0]), Math.round(x[1])], [-1537, 1537]);
  assert.deepEqual([Math.round(y[0]), Math.round(y[1])], [0, 2430]);
  assert.equal(document.model.joints.length, 8, 'osiem drzwiczek z jednej definicji');
  assert.ok(document.model.joints.every(j => j.type === 'hinge' && parts.some(p => p.id === j.part)));
});

test('nadpisania edytora zmieniają liczbę półek i drzwiczek bez zmiany obrysu', () => {
  const d = dokument();
  d.parametricOverrides = {rows: {count: 3, distribution: 'equal'}, columns: {count: 2}, instances: {drzwi: {count: 2}}};
  const {document} = normalizeFurnitureDocument(d);
  const parts = document.model.parts;
  const [x, y] = obrys(parts.filter(p => !p.parent));
  assert.deepEqual([Math.round(x[0]), Math.round(x[1])], [-1537, 1537]);
  assert.deepEqual([Math.round(y[0]), Math.round(y[1])], [0, 2430]);
  assert.equal(document.model.joints.length, 2);
  assert.equal(parts.filter(p => p.id.startsWith('polka-')).length, 2 * 2);
});
