// fallworld · journey.test.mjs — the levelling spine, every rule falsifiable.
// Each core flips on exactly one observable act; the level counts done cores; the next core is
// always the FIRST undone one in the set order; garbage state reads as a fresh start; and the
// nothing-shut invariant is carried in the data, not implied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journey, progress, CORES } from './journey.mjs';

const fresh = () => ({ ran: [], visited: {}, cards: [], slots: [null, null, null, null, null, null], keys: {}, localUp: false });

test('A FRESH START IS LEVEL 1, NEWCOMER, AND THE NEXT THING IS THE DIDY', () => {
  const j = journey(fresh());
  assert.equal(j.level, 1);
  assert.equal(j.title, 'newcomer');
  assert.equal(j.top, false);
  assert.equal(j.next.id, 'didy');
  assert.match(j.next.do, /type a real decision/);
  assert.equal(j.cores.length, 6);
  assert.ok(j.cores.every(c => !c.done));
  assert.equal(j.nothingShut, true, 'the invariant must ride in the data');
});

test('EACH CORE FLIPS ON EXACTLY ITS OWN ACT — one delta, one core, nothing else moves', () => {
  const flip = (mutate) => {
    const a = progress(fresh());
    const m = fresh(); mutate(m);
    const b = progress(m);
    const changed = Object.keys(b).filter(k => a[k] !== b[k]);
    return changed;
  };
  assert.deepEqual(flip(m => { m.ran = [{}]; }), ['didy'], 'one run wakes the didy and nothing else');
  assert.deepEqual(flip(m => { m.ran = [{}, {}, {}]; m.visited.learn = true; }), ['didy', 'learn']);
  assert.deepEqual(flip(m => { m.visited.duel = true; }), ['game']);
  assert.deepEqual(flip(m => { m.cards = [{ id: 'card-x' }]; }), ['cards']);
  assert.deepEqual(flip(m => { m.visited.forge = true; }), ['cards'], 'visiting the Forge also opens cards');
  assert.deepEqual(flip(m => { m.slots[2] = 'agora'; }), ['rig']);
  assert.deepEqual(flip(m => { m.keys = { claude: 'k' }; }), ['power']);
  assert.deepEqual(flip(m => { m.localUp = true; }), ['power'], 'your own model powers without a key');
});

test('LEARNING NEEDS BOTH HALVES — the visit alone or the runs alone are not the core', () => {
  const m1 = fresh(); m1.visited.learn = true; m1.ran = [{}, {}];
  assert.equal(progress(m1).learn, false, 'two runs are not three');
  const m2 = fresh(); m2.ran = [{}, {}, {}];
  assert.equal(progress(m2).learn, false, 'three runs without opening Learn is not learning');
  const m3 = fresh(); m3.visited.learn = true; m3.ran = [{}, {}, {}];
  assert.equal(progress(m3).learn, true);
});

test('THE LEVEL COUNTS DONE CORES AND THE NEXT IS ALWAYS THE FIRST UNDONE — the set order holds', () => {
  const m = fresh();
  m.ran = [{}, {}, {}];              // didy done (learn still missing its visit)
  m.visited.duel = true;             // game done OUT OF ORDER
  const j = journey(m);
  assert.equal(j.level, 3, 'two cores done = level 3');
  assert.equal(j.next.id, 'learn', 'the next core is the first UNDONE one, not the one after the last done');
  assert.equal(j.title, 'the game', 'the title is the LAST done core in set order');
});

test('EVERYTHING DONE IS THE WHOLE WORLD — top of the spine, no next', () => {
  const m = fresh();
  m.ran = [{}, {}, {}]; m.visited = { learn: true, duel: true, forge: true };
  m.cards = [{ id: 'c' }]; m.slots[0] = 'agora'; m.localUp = true;
  const j = journey(m);
  assert.equal(j.level, 7);
  assert.equal(j.top, true);
  assert.equal(j.title, 'the whole world');
  assert.strictEqual(j.next, null);
  assert.ok(j.cores.every(c => c.done));
});

test('THE CORE ORDER IS THE ONE SET — didy, learning, game, cards, assembled, powered', () => {
  assert.deepEqual(CORES.map(c => c.id), ['didy', 'learn', 'game', 'cards', 'rig', 'power']);
});

test('FUZZ: garbage state reads as a fresh start, never a crash', () => {
  for (const g of [undefined, null, 0, 'x', [], { ran: 'x', visited: 9, cards: null, slots: 'y', keys: [] },
    { ran: [1], visited: { learn: 'yes' }, slots: [0, false, ''] }]) {
    const j = journey(g);
    assert.ok(j.level >= 1 && j.level <= 7);
    assert.equal(typeof j.title, 'string');
    assert.equal(j.nothingShut, true);
  }
  // visited.learn must be strictly true — a truthy string from tampered storage is not a visit
  const m = fresh(); m.visited.learn = 'yes'; m.ran = [{}, {}, {}];
  assert.equal(progress(m).learn, false);
  // and array-shaped keys are not keys
  const k = fresh(); k.keys = ['a'];
  assert.equal(progress(k).power, false, 'an array of keys is storage damage, not power');
});
