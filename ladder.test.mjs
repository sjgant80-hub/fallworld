// Tests for the rungs.
//
// The failure that matters here is spending somebody's money without telling them. Most of what is
// below is about the cascade refusing to do that — and about the bar never flattering anybody.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUNGS, DEFAULT_PURSE, KEY_MIN, rungOf, reach, route, tally, wouldSave, readout } from './ladder.mjs';

const KEY = { anthropic: 'sk-ant-abcdefghijklmno' };
const nothing = {};
const keyOnly = { keys: KEY };
const localOnly = { localUp: true };
const both = { localUp: true, keys: KEY };

// ─────────────────────────── what you can reach ───────────────────────────

test('THE BOTTOM RUNG IS ALWAYS THERE — it works with no key and no model at all', () => {
  // A tool that demands infrastructure before it does anything never gets past the download.
  assert.equal(reach(nothing).t0, true);
  assert.equal(route('a job', nothing, { mind: 0 }).rung, 't0');
});

test('a model you own but have not started holds nothing, and a key you have not pasted is not a key', () => {
  assert.equal(reach(nothing).t1, false);
  assert.equal(reach({ localUp: 'yes' }).t1, false, 'a truthy string counted as a running model');
  assert.equal(reach({ keys: { anthropic: '' } }).t2, false, 'an empty key counted');
  assert.equal(reach({ keys: { anthropic: 'short' } }).t2, false, 'a stub counted as a key');
  assert.equal(reach(keyOnly).t2, true);
});

test('reading the world survives any nonsense at all', () => {
  for (const junk of [null, undefined, 7, 'state', [], true, { keys: 'sk-ant-x' }, { toString() { throw new Error('no'); } }]) {
    const r = reach(junk);
    assert.equal(r.t0, true);
    assert.ok(Array.isArray(r.keys));
  }
});

// ─────────────────────────── the cascade ───────────────────────────

test('WITH BOTH AVAILABLE IT PREFERS YOUR MACHINE, and only rents what your machine cannot carry', () => {
  // This is the whole product: the same jobs keep working while the bill goes down.
  assert.equal(route('j', both, { mind: 0 }).yours, true);
  assert.equal(route('j', both, { mind: 1 }).yours, true);
  const big = route('j', both, { mind: 2 });
  assert.equal(big.yours, false, 'a job too big for your rig stayed home and would have failed');
  assert.equal(big.rung, 't2');
  assert.match(big.note, /cannot carry a job this size/);
});

test('HAVING A KEY DOES NOT MEAN PAYING FOR EVERYTHING', () => {
  // A job plain deterministic code can do stays free even when a paid model is sitting right there.
  // Routing by "what is available" instead of "what is needed" is how a key quietly becomes a
  // subscription — every trivial thing billed because the expensive option happened to be plugged in.
  const free = route('j', keyOnly, { mind: 0 });
  assert.equal(free.rung, 't0', 'a job needing no model at all was sent to a paid one');
  assert.equal(free.cost, 0);
  assert.equal(free.yours, true);

  // What genuinely needs a model does go out, and says so every single time.
  for (const mind of [1, 2]) {
    const d = route('j', keyOnly, { mind });
    assert.equal(d.rung, 't2');
    assert.equal(d.yours, false);
    assert.equal(d.cost, 1);
    assert.ok(d.note && d.note.length > 10, 'a rented job said nothing about being rented');
  }
});

test('ASKING TO STAY HOME AND NOT GETTING IT IS AN ANSWER, not a reason to spend your money', () => {
  // ⚑ The silent bill. An unattended loop that escalates on its own is an invoice nobody authorised.
  const d = route('j', keyOnly, { mind: 1, insist: 'yours' });
  assert.equal(d.rung, null, 'it escalated to a paid model after being told not to');
  assert.equal(d.cost, 0);
  assert.match(d.refused, /stay on your machine/);
  // The offer is made in words. The caller decides; nothing is charged behind their back.
  assert.equal(d.couldEscalate, true);
});

test('insisting on local when local is running but too small also stops', () => {
  const d = route('j', both, { mind: 2, insist: 'yours' });
  assert.equal(d.rung, null);
  assert.match(d.refused, /more model than yours carries/);
  assert.equal(d.couldEscalate, true, 'it did not even mention that a paid rung could do it');
});

test('nothing at all, and a job that needs a model, is refused in words that say what to do', () => {
  const d = route('j', nothing, { mind: 1 });
  assert.equal(d.rung, null);
  assert.match(d.refused, /not running.*no key|no key.*not running/);
  assert.equal(d.couldEscalate, false);
});

test('AN EMPTY PURSE STOPS A PAID RUNG, and says so in the router own words', () => {
  const d = route('j', keyOnly, { mind: 2, purse: 0 });
  assert.equal(d.rung, null, 'it spent from an empty purse');
  assert.ok(d.refused.length > 20);
  // And a purse that can afford it lets it through, so the guard is the purse and not a blanket no.
  assert.equal(route('j', keyOnly, { mind: 2, purse: 5 }).rung, 't2');
});

test('the purse must be a real number — infinity is not a budget', () => {
  // fall-os refuses an infinite purse outright, and passing one made EVERY route unaffordable,
  // including the free one. The default has to be finite or the cascade routes nothing at all.
  assert.ok(Number.isFinite(DEFAULT_PURSE) && DEFAULT_PURSE > 0);
  assert.equal(route('j', both, { mind: 0, purse: Infinity }).rung, 't0',
    'an infinite purse was passed straight through and broke the routing');
  assert.equal(route('j', both, { mind: 0, purse: 'lots' }).rung, 't0');
});

test('an unknown job size falls back to a real one rather than routing on nonsense', () => {
  for (const bad of [null, undefined, 9, -1, 'big', {}]) {
    const d = route('j', both, { mind: bad });
    assert.ok(d.rung || d.refused, 'mind ' + String(bad) + ' produced neither a rung nor a refusal');
  }
});

test('routing is total and repeatable', () => {
  for (const st of [null, undefined, 7, 'state', {}, both]) {
    for (const o of [null, undefined, 'opts', 7, {}]) {
      const d = route('j', st, o);
      assert.equal(typeof readout(d), 'string');
    }
  }
  assert.deepEqual(route('j', both, { mind: 1 }), route('j', both, { mind: 1 }));
});

// ─────────────────────────── the bar ───────────────────────────

test('NOTHING RUN IS NO SCORE — an untouched client is not 100% sovereign', () => {
  // It would read best on the day you had done nothing at all. That is a badge that cannot fail.
  for (const empty of [[], null, undefined, 'runs', [null, 7, {}, { rung: 'made-up' }]]) {
    const t = tally(empty);
    assert.equal(t.sovereignty, null, 'an empty ledger scored ' + t.sovereignty);
    assert.match(t.verdict, /nothing to be sovereign about/);
  }
});

test('the bar counts what actually ran, on the rung it really ran on', () => {
  const ran = [{ rung: 't0', cost: 0 }, { rung: 't1', cost: 0 }, { rung: 't2', cost: 1 }, { rung: 't2', cost: 1 }];
  const t = tally(ran);
  assert.equal(t.runs, 4);
  assert.equal(t.yours, 2);
  assert.equal(t.rented, 2);
  assert.equal(t.spent, 2);
  assert.equal(t.sovereignty, 0.5);
  assert.deepEqual(t.byRung, { t0: 1, t1: 1, t2: 2 });
});

test('a run on a rung nobody has heard of is not counted as yours', () => {
  assert.equal(tally([{ rung: 'magic', cost: 0 }]).sovereignty, null, 'an invented rung was counted');
});

test('WHAT THE NEXT RUNG WOULD SAVE IS READ OFF WHAT YOU REALLY RAN, never promised', () => {
  const ran = [{ rung: 't2', cost: 1, mind: 1 }, { rung: 't2', cost: 1, mind: 2 }, { rung: 't0', cost: 0, mind: 0 }];
  const w = wouldSave(ran, 't1');
  assert.equal(w.runs, 1, 'it promised to reclaim a job too big for that rung');
  assert.equal(w.spent, 1);
  assert.match(w.say, /1 of the 2/);
  assert.match(wouldSave([], 't1').say, /Nothing you have run/);
  assert.match(wouldSave(ran, 't2').say, /not yours to build/, 'it offered to sell you the rented rung');
});

test('every rung explains itself in a sentence somebody could disagree with', () => {
  for (const r of RUNGS) {
    assert.ok(r.blurb.length > 40, r.id + ' explains itself in a shrug');
    assert.equal(typeof r.yours, 'boolean');
    assert.ok(Number.isFinite(r.holds) && Number.isFinite(r.price));
    assert.equal(rungOf(r.id).id, r.id);
  }
  assert.equal(rungOf('nope'), null);
  // The paid rung is the only one that is not yours, and it is the only one with a price.
  assert.deepEqual(RUNGS.filter(r => !r.yours).map(r => r.id), ['t2']);
  assert.deepEqual(RUNGS.filter(r => r.price > 0).map(r => r.id), ['t2']);
});

test('the readout never hides what a job cost', () => {
  assert.match(readout(route('j', both, { mind: 0 })), /your machine/);
  assert.match(readout(route('j', keyOnly, { mind: 2 })), /rented|paid|anthropic/);
  assert.match(readout(route('j', nothing, { mind: 2 })), /refused/);
  assert.equal(typeof readout(null), 'string');
});


// ─── the boundaries the mutation gate proved nothing was holding ───

test('a key must be long enough to be a key, and the line is exact', () => {
  const at = 'x'.repeat(KEY_MIN), under = 'x'.repeat(KEY_MIN - 1);
  assert.equal(reach({ keys: { a: at } }).t2, true, 'a key of exactly the minimum was rejected');
  assert.equal(reach({ keys: { a: under } }).t2, false, 'one character under counted as a key');
  assert.equal(reach({ keys: { a: '  ' + at + '  ' } }).t2, true, 'a key with spaces round it was rejected');
  assert.equal(reach({ keys: { a: '   ' } }).t2, false, 'whitespace counted as a key');
});

test('a keys bag that is not a bag does not take the client down', () => {
  for (const bad of [null, 'sk-ant-x', 7, true]) {
    assert.deepEqual(reach({ keys: bad }).keys, [], 'keys:' + JSON.stringify(bad) + ' produced something');
    assert.equal(reach({ keys: bad }).t2, false);
  }
  assert.deepEqual(reach({ keys: { b: 'x'.repeat(20), a: 'y'.repeat(20) } }).keys, ['a', 'b'],
    'two keys came back in an unstable order, so the provider shown would change between runs');
});

test('the refusal names the actual sizes, so you can see what to build', () => {
  const d = route('j', { localUp: true }, { mind: 2 });
  assert.match(d.refused, /2 > 1/, 'the refusal did not say how big the gap is: ' + d.refused);
  const i = route('j', both, { mind: 2, insist: 'yours' });
  assert.match(i.refused, /2 > 1/, 'the insist refusal hid the gap: ' + i.refused);
});

test('"all of it on your own machine" is only said when all of it was', () => {
  assert.match(tally([{ rung: 't0', cost: 0 }, { rung: 't1', cost: 0 }]).verdict, /^All 2 ran/);
  const mixed = tally([{ rung: 't0', cost: 0 }, { rung: 't2', cost: 1 }]).verdict;
  assert.doesNotMatch(mixed, /^All /, 'a part-rented run claimed it all stayed home: ' + mixed);
  assert.match(mixed, /1 of 2/);
});

test('a rented job always names who it went to', () => {
  const d = route('j', keyOnly, { mind: 2 });
  assert.equal(d.provider, 'anthropic', 'a rented job did not say whose model it used');
  assert.equal(route('j', both, { mind: 0 }).provider, null, 'a local job named a provider');
});


test('the readout falls back to plain words when a rented run has no provider or note', () => {
  // A hand-built decision, or one from an older save, must not print "ran on undefined".
  const bare = { rung: 't2', yours: false, name: 'a frontier model' };
  const line = readout(bare);
  assert.doesNotMatch(line, /undefined|null/, 'the readout printed a hole: ' + line);
  assert.match(line, /a paid model/);
  assert.match(line, /rented/);
  // And a real one names the provider and the reason instead of the fallbacks.
  const real = readout(route('j', keyOnly, { mind: 2 }));
  assert.match(real, /anthropic/);
  assert.doesNotMatch(real, /a paid model/, 'a run that knew its provider still said the generic thing');
});
