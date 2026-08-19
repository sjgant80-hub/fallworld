// fallworld · journey.test.mjs — the levelling spine to 10, every rule falsifiable.
// Each core flips on exactly one observable act; the level counts done cores; the next core is
// always the FIRST undone one in the set order; the deep cores judge only what the page can SEE
// (the Duel's ledger, the tally of where runs happened); garbage reads as a fresh start; and the
// nothing-shut invariant is carried in the data, not implied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journey, progress, CORES } from './journey.mjs';

const fresh = () => ({ ran: [], visited: {}, cards: [], slots: [null, null, null, null, null, null], keys: {}, localUp: false });
const seen = () => ({ duelsWon: 0, ownModelRuns: 0, runs: 0, sovereignty: null });

test('A FRESH START IS LEVEL 1, NEWCOMER, AND THE NEXT THING IS THE DIDY', () => {
  const j = journey(fresh(), seen());
  assert.equal(j.level, 1);
  assert.equal(j.title, 'newcomer');
  assert.equal(j.top, false);
  assert.equal(j.next.id, 'didy');
  assert.match(j.next.do, /type a real decision/);
  assert.equal(j.cores.length, 10);
  assert.ok(j.cores.every(c => !c.done));
  assert.equal(j.nothingShut, true, 'the invariant must ride in the data');
});

test('EACH CORE FLIPS ON EXACTLY ITS OWN ACT — one delta, one core, nothing else moves', () => {
  const flip = (mutMe, mutOut) => {
    const a = progress(fresh(), seen());
    const m = fresh(); const o = seen();
    if (mutMe) mutMe(m);
    if (mutOut) mutOut(o);
    const b = progress(m, o);
    return Object.keys(b).filter(k => a[k] !== b[k]);
  };
  assert.deepEqual(flip(m => { m.ran = [{}]; }), ['didy'], 'one run wakes the didy and nothing else');
  assert.deepEqual(flip(m => { m.ran = [{}, {}, {}]; m.visited.learn = true; }), ['didy', 'learn']);
  assert.deepEqual(flip(m => { m.visited.duel = true; }), ['game']);
  assert.deepEqual(flip(m => { m.cards = [{ id: 'card-x' }]; }), ['cards']);
  assert.deepEqual(flip(m => { m.visited.forge = true; }), ['cards'], 'visiting the Forge also opens cards');
  assert.deepEqual(flip(m => { m.slots[2] = 'agora'; }), ['rig']);
  assert.deepEqual(flip(m => { m.keys = { claude: 'k' }; }), ['power']);
  assert.deepEqual(flip(m => { m.localUp = true; }), ['power'], 'your own model powers without a key');
  assert.deepEqual(flip(null, o => { o.duelsWon = 1; }), ['won'], 'one victory in the ledger is a duel won');
  assert.deepEqual(flip(null, o => { o.ownModelRuns = 1; }), ['ownmodel']);
  assert.deepEqual(flip(null, o => { o.runs = 5; o.sovereignty = 0.6; }), ['sovereign']);
  assert.deepEqual(flip(m => { m.visited.mesh = true; }), ['mesh'], 'walking through the mesh door is the step');
  assert.deepEqual(flip(null, o => { o.meshPeers = 1; }), ['mesh'], 'a real peer counts the day the mesh persists one');
});

test('LEARNING NEEDS BOTH HALVES — the visit alone or the runs alone are not the core', () => {
  const m1 = fresh(); m1.visited.learn = true; m1.ran = [{}, {}];
  assert.equal(progress(m1, seen()).learn, false, 'two runs are not three');
  const m2 = fresh(); m2.ran = [{}, {}, {}];
  assert.equal(progress(m2, seen()).learn, false, 'three runs without opening Learn is not learning');
  const m3 = fresh(); m3.visited.learn = true; m3.ran = [{}, {}, {}];
  assert.equal(progress(m3, seen()).learn, true);
});

test('SOVEREIGNTY IS EARNED AT THE EXACT EDGES — five runs, and half is enough', () => {
  const at = (runs, sov) => progress(fresh(), { runs, sovereignty: sov }).sovereign;
  assert.equal(at(5, 0.5), true, 'exactly five runs at exactly half must count');
  assert.equal(at(4, 1), false, 'four runs are not five, however sovereign');
  assert.equal(at(5, 0.4999), false);
  assert.equal(at(0, null), false, 'nothing run is NO SCORE, never sovereign');
  assert.equal(at(9, null), false, 'a missing tally cannot count');
});

test('THE DEEP CORES REFUSE GARBAGE OBSERVATIONS — counts must be real finite positives', () => {
  assert.equal(progress(fresh(), { duelsWon: 'yes' }).won, false);
  assert.equal(progress(fresh(), { duelsWon: NaN }).won, false);
  assert.equal(progress(fresh(), { duelsWon: -3 }).won, false);
  assert.equal(progress(fresh(), { ownModelRuns: Infinity }).ownmodel, false);
  assert.equal(progress(fresh(), { runs: 5, sovereignty: 'half' }).sovereign, false);
  assert.equal(progress(fresh(), { runs: 5, sovereignty: Infinity }).sovereign, false, 'an infinite ratio is storage damage, not sovereignty');
});

test('THE LEVEL COUNTS DONE CORES AND THE NEXT IS ALWAYS THE FIRST UNDONE — the set order holds', () => {
  const m = fresh();
  m.ran = [{}, {}, {}];              // didy done (learn still missing its visit)
  m.visited.duel = true;             // game done OUT OF ORDER
  const j = journey(m, { duelsWon: 2 });   // and a duel already won
  assert.equal(j.level, 4, 'three cores done = level 4');
  assert.equal(j.next.id, 'learn', 'the next core is the first UNDONE one, not the one after the last done');
  assert.equal(j.title, 'a duel won', 'the title is the LAST done core in set order');
});

test('EVERYTHING DONE IS THE SUMMIT — meshed, the whole world, together, no next', () => {
  const m = fresh();
  m.ran = [{}, {}, {}]; m.visited = { learn: true, duel: true, forge: true };
  m.cards = [{ id: 'c' }]; m.slots[0] = 'agora'; m.localUp = true;
  m.visited.mesh = true;
  const j = journey(m, { duelsWon: 1, ownModelRuns: 2, runs: 6, sovereignty: 0.8 });
  assert.equal(j.level, 11);
  assert.equal(j.top, true);
  assert.equal(j.title, 'meshed — the whole world, together');
  assert.strictEqual(j.next, null);
  assert.ok(j.cores.every(c => c.done));
});

test('THE CORE ORDER IS THE ONE SET — the shallow six, the deep three, then the mesh', () => {
  assert.deepEqual(CORES.map(c => c.id),
    ['didy', 'learn', 'game', 'cards', 'rig', 'power', 'won', 'ownmodel', 'sovereign', 'mesh']);
});

test('FUZZ: garbage state reads as a fresh start, never a crash — with or without outside', () => {
  for (const g of [undefined, null, 0, 'x', [], { ran: 'x', visited: 9, cards: null, slots: 'y', keys: [] },
    { ran: [1], visited: { learn: 'yes' }, slots: [0, false, ''] }]) {
    for (const o of [undefined, null, 7, 'x', [], { duelsWon: {}, sovereignty: [] }]) {
      const j = journey(g, o);
      assert.ok(j.level >= 1 && j.level <= 11);
      assert.equal(typeof j.title, 'string');
      assert.equal(j.nothingShut, true);
    }
  }
  // visited.learn must be strictly true — a truthy string from tampered storage is not a visit
  const m = fresh(); m.visited.learn = 'yes'; m.ran = [{}, {}, {}];
  assert.equal(progress(m, seen()).learn, false);
  // and array-shaped keys are not keys
  const k = fresh(); k.keys = ['a'];
  assert.equal(progress(k, seen()).power, false, 'an array of keys is storage damage, not power');
});
