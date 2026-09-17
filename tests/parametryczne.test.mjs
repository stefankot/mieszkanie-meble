import test from 'node:test';
import assert from 'node:assert/strict';

import {rozloz, rozwinParametryczny, sprawdzParametryczny} from '../renderery/webgpu/parametryczne.js';

const regal = () => ({
  carcass: {sizeMm: [1200, 2000, 400], boardMm: 18, material: 'korpus', backMm: 8},
  layout: {rows: {count: 4, distribution: 'equal'}, columns: {count: 3, distribution: 'equal'}},
  definitions: {
    drzwi: {label: 'Drzwi', parts: [{id: 'panel', type: 'box', sizeMm: [{cell: 'w', addMm: -4}, {cell: 'h', addMm: -4}, 18], positionMm: [0, 0, 9], material: 'front'}],
            joint: {type: 'hinge', pivotMm: [{cell: 'w', mul: -.5}, 0, 0], axis: [0, 1, 0], angleDeg: 100}}
  },
  instances: [{id: 'drzwi', definition: 'drzwi', cells: {count: 3, order: 'bottom-up'}}]
});

test('rozkład zachowuje wnętrze: przegrody + płyty = wnętrze, Fibonacci maleje ku górze', () => {
  const r = rozloz(1000, 18, 4, {distribution: 'fibonacci'});
  assert.equal(Math.round(r.dlugosci.reduce((a, b) => a + b, 0) + 3 * 18), 1000);
  assert.ok(r.dlugosci[0] > r.dlugosci[3]);
  const w = rozloz(1000, 18, 3, {distribution: 'custom', custom: '60+40+20'});
  assert.ok(Math.abs(w.dlugosci[0] / w.dlugosci[2] - 3) < 1e-9);
});

test('rozwinięcie daje korpus o stałym rozmiarze i półki w każdej kolumnie', () => {
  const {parts, komorki} = rozwinParametryczny(regal());
  assert.equal(komorki.length, 12);
  assert.equal(parts.filter(p => p.id.startsWith('polka-')).length, 3 * 3);
  assert.equal(parts.filter(p => p.id.startsWith('pion-')).length, 2);
  const boki = parts.filter(p => p.id.startsWith('bok-'));
  assert.deepEqual(boki.map(b => b.positionMm[0]), [-591, 591]);
  const xs = parts.filter(p => p.type === 'box').flatMap(p => [p.positionMm[0] - p.sizeMm[0] / 2, p.positionMm[0] + p.sizeMm[0] / 2]);
  assert.equal(Math.min(...xs), -600);
  assert.equal(Math.max(...xs), 600);
});

test('komponent drzwi powtarza się N razy, wymiary z komórki, zawias na lewej krawędzi', () => {
  const {parts, joints, komorki} = rozwinParametryczny(regal(), {instances: {drzwi: {count: 5}}});
  const grupy = parts.filter(p => p.type === 'group');
  assert.equal(grupy.length, 5);
  assert.equal(joints.length, 5);
  const k = komorki.find(x => x.r === 1 && x.c === 1);
  const panel = parts.find(p => p.id === 'drzwi-r1c1-panel');
  assert.equal(panel.parent, 'drzwi-r1c1');
  assert.ok(Math.abs(panel.sizeMm[0] - (k.w - 4)) < 1e-9);
  assert.ok(Math.abs(joints[0].pivotMm[0] - (k.x - k.w / 2)) < 1e-9);
});

test('nadpisania z edytora zmieniają liczbę półek bez zmiany rozmiaru mebla', () => {
  const a = rozwinParametryczny(regal());
  const b = rozwinParametryczny(regal(), {rows: {count: 6, distribution: 'fibonacci'}});
  const wysokosc = parts => Math.max(...parts.filter(p => p.type === 'box').map(p => p.positionMm[1] + p.sizeMm[1] / 2));
  assert.equal(wysokosc(a.parts), 2000);
  assert.equal(wysokosc(b.parts), 2000);
  assert.equal(b.parts.filter(p => p.id.startsWith('polka-')).length, 3 * 5);
});

test('walidacja odrzuca brakującą definicję i zły rozkład', () => {
  const zla = regal(); zla.instances[0].definition = 'szuflada';
  assert.throws(() => sprawdzParametryczny(zla), /brakującą definicję/);
  const rozklad = regal(); rozklad.layout.rows.distribution = 'spiral';
  assert.throws(() => sprawdzParametryczny(rozklad), /distribution/);
});
