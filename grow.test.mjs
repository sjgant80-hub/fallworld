import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import G, { EGG, NAMES, stagesFrom, bitsPerWeight, memoryGB, largestHeld, evolve } from './grow.mjs';

const RUNG = (tier, approxParamsB, ids = ['m' + tier]) => ({ tier, band: '~' + approxParamsB + 'B', approxParamsB, runsOn: 'here ' + tier, models: ids.map((id) => ({ id })) });
const LADDER = [RUNG(0, 1, ['a', 'b']), RUNG(1, 3.5), RUNG(2, 7.5), RUNG(3, 13), RUNG(4, 32), RUNG(5, 70), RUNG(6, 141)];

test('the egg and the names', () => {
  assert.deepEqual(EGG, { id: 'egg', name: 'Egg', rung: -1, band: 'no model', paramsB: 0, runsOn: 'nothing at all: the rules engine answers', models: [] });
  assert.ok(Object.isFrozen(EGG) && Object.isFrozen(EGG.models) && Object.isFrozen(NAMES));
  assert.deepEqual(NAMES, ['Hatchling', 'Fledgling', 'Runner', 'Keeper', 'Sage', 'Elder', 'Titan']);
  assert.equal(G.evolve, evolve);
  assert.equal(Object.keys(G).length, 7);
});

test('stagesFrom turns the sizer\'s rungs into stages, egg first', () => {
  const s = stagesFrom(LADDER);
  assert.equal(s.length, 8);
  assert.equal(s[0], EGG);
  assert.deepEqual(s[1], { id: 'hatchling', name: 'Hatchling', rung: 0, band: '~1B', paramsB: 1, runsOn: 'here 0', models: ['a', 'b'] });
  assert.deepEqual(s.map((x) => x.id), ['egg', 'hatchling', 'fledgling', 'runner', 'keeper', 'sage', 'elder', 'titan']);
  assert.deepEqual(s.map((x) => x.paramsB), [0, 1, 3.5, 7.5, 13, 32, 70, 141]);
  assert.ok(Object.isFrozen(s[3]) && Object.isFrozen(s[3].models));
  const odd = LADDER.map((r) => ({ ...r })); odd[2].band = 7; odd[2].runsOn = null;
  assert.equal(stagesFrom(odd)[3].band, '7');
  assert.equal(stagesFrom(odd)[3].runsOn, 'null');
  for (const bad of [null, {}, LADDER.slice(1), [...LADDER, RUNG(7, 300)],
    LADDER.map((r, k) => (k === 3 ? { ...r, tier: 4 } : r)),
    LADDER.map((r, k) => (k === 0 ? { ...r, approxParamsB: 0 } : r)),
    LADDER.map((r, k) => (k === 4 ? { ...r, approxParamsB: 13 } : r)),
    LADDER.map((r, k) => (k === 5 ? { ...r, models: 'x' } : r)),
    LADDER.map((r, k) => (k === 6 ? null : r)),
    LADDER.map((r, k) => (k === 2 ? { ...r, approxParamsB: '7.5' } : r))]) {
    assert.equal(stagesFrom(bad), null);
  }
});

test('the real ladder, vendored from fallforgemint, is the one it names', () => {
  const v = JSON.parse(readFileSync(new URL('./vendor/fallforgemint/ladder.json', import.meta.url), 'utf8'));
  const s = stagesFrom(v.ladder);
  assert.equal(s.length, 8);
  assert.ok(s[1].models.includes('llama3.2:1b') && s[3].models.includes('qwen2.5:7b') && s[4].models.includes('qwen2.5:14b'));
});

test('bitsPerWeight is measured from real files', () => {
  assert.equal(bitsPerWeight([{ bytes: 1e9, paramsB: 2 }]), 4);
  assert.equal(bitsPerWeight([{ bytes: 1e9, paramsB: 2 }, { bytes: 3e9, paramsB: 4 }]), 5);
  for (const bad of [null, [], {}, [{ bytes: 0, paramsB: 1 }], [{ bytes: 1, paramsB: -1 }], [{ bytes: 1, paramsB: 1 }, null], [{ bytes: '1', paramsB: 1 }], [{ bytes: Infinity, paramsB: 1 }]]) {
    assert.equal(bitsPerWeight(bad), null);
  }
});

test('memoryGB is a floor, rounded up to a tenth', () => {
  assert.equal(memoryGB(8, 4, 0), 4);
  assert.equal(memoryGB(8, 4, 0.25), 5);
  assert.equal(memoryGB(10, 5, 0.2), 7.5);
  assert.equal(memoryGB(1, 4.9, 0.2), 0.8);
  assert.equal(memoryGB(0, 4, 0.2), 0);
  assert.equal(memoryGB(1.21, 8, 0), 1.3);
  for (const [p, b, o] of [[-1, 4, 0], [NaN, 4, 0], ['8', 4, 0], [8, 0, 0], [8, -4, 0], [8, '4', 0], [8, 4, -0.1], [8, 4, '0.2'], [Infinity, 4, 0], [8, 4, Infinity], [8, 4, NaN], [8, Infinity, 0]]) {
    assert.equal(memoryGB(p, b, o), null);
  }
});

test('largestHeld: the biggest stage that fits, the egg always', () => {
  const s = stagesFrom(LADDER);
  assert.equal(largestHeld(s, 16, 4.9, 0.2).id, 'keeper');
  assert.equal(largestHeld(s, 0, 4.9, 0.2).id, 'egg');
  assert.equal(largestHeld(s, 0.8, 4.9, 0.2).id, 'hatchling');
  assert.equal(largestHeld(s, 0.7, 4.9, 0.2).id, 'egg');
  assert.equal(largestHeld(s, 1000, 4.9, 0.2).id, 'titan');
  assert.equal(largestHeld([s[1], s[0]], 100, 4.9, 0.2).id, 'egg');
  assert.equal(largestHeld([s[2], s[1]], 1, 4.9, 0.2), null);
  assert.equal(largestHeld([s[0], { paramsB: 'x' }, s[1]], 100, 4.9, 0.2).id, 'egg');
  assert.equal(largestHeld([s[0], null, s[1]], 100, 4.9, 0.2).id, 'egg');
  for (const [st, ram, b, o] of [[null, 16, 4.9, 0.2], [[], 16, 4.9, 0.2], [s, -1, 4.9, 0.2], [s, NaN, 4.9, 0.2], [s, 16, 0, 0.2], [s, 16, 4.9, -1]]) {
    assert.equal(largestHeld(st, ram, b, o), null);
  }
});

test('evolve: the smallest stage that clears the bar, up or down', () => {
  const s = stagesFrom(LADDER);
  assert.deepEqual(evolve(s, 'hatchling', { hatchling: 30, runner: 58, keeper: 60 }, 57),
    { move: 'grow', to: 'runner', why: 'Runner is the smallest stage that clears the bar (58 against 57)' });
  assert.deepEqual(evolve(s, 'keeper', { hatchling: 30, runner: 57, keeper: 60 }, 57),
    { move: 'shrink', to: 'runner', why: 'Runner is the smallest stage that clears the bar (57 against 57)' });
  assert.deepEqual(evolve(s, 'runner', { hatchling: 30, runner: 58 }, 57),
    { move: 'stay', to: 'runner', why: 'Runner clears the bar, and nothing smaller measured does' });
  assert.deepEqual(evolve(s, 'hatchling', { hatchling: 30, runner: 50 }, 57),
    { move: 'try', to: 'keeper', why: 'nothing measured clears 57; Keeper is the next stage to measure' });
  assert.deepEqual(evolve(s, 'egg', {}, 57),
    { move: 'try', to: 'hatchling', why: 'nothing measured clears 57; Hatchling is the next stage to measure' });
  assert.deepEqual(evolve(s, 'sage', { hatchling: 3 }, 57),
    { move: 'try', to: 'elder', why: 'nothing measured clears 57; Elder is the next stage to measure' });
  assert.deepEqual(evolve(s, 'titan', { titan: 3 }, 57),
    { move: 'stay', to: 'titan', why: 'no stage clears 57, and there is no larger stage to try' });
  assert.equal(evolve(s, 'egg', { runner: 57.5, keeper: 'x', sage: 60 }, 57).to, 'sage');
  assert.equal(evolve(s, 'egg', { egg: 60 }, 57).move, 'stay');
  for (const [st, at, m, bar] of [[null, 'egg', {}, 57], [s, 'dragon', {}, 57], [s, 'egg', null, 57], [s, 'egg', [], 57], [s, 'egg', {}, 0], [s, 'egg', {}, 5.5], [[null, ...s], 'x', {}, 57]]) {
    assert.equal(evolve(st, at, m, bar), null);
  }
  assert.equal(evolve([null, ...s], 'egg', {}, 57).to, 'hatchling');
  assert.deepEqual(evolve(s, 'egg', { hatchling: 1 }, 1), { move: 'grow', to: 'hatchling', why: 'Hatchling is the smallest stage that clears the bar (1 against 1)' });
});
