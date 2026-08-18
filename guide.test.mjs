// Tests for the guide.
//
// The failure here is quiet: a beat that opens a panel nobody answers to unlocks nothing, forever,
// and looks exactly like somebody who has not got there yet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEATS, standing, where, isOpen, locked, speak } from './guide.mjs';

const fresh = {};
const ran = (n, rung = 't0') => ({ ran: Array.from({ length: n }, () => ({ rung })) });

test('EVERY BEAT OPENS PANELS THAT ACTUALLY EXIST', () => {
  // A name no panel answers to is an unlock that never happens and never reports itself.
  const real = new Set(['didy', 'keys', 'store', 'bags', 'sandbox', 'learn']);
  for (const b of BEATS) {
    for (const o of b.opens) assert.ok(real.has(o), `beat "${b.id}" opens "${o}", which is not a panel`);
  }
});

test('a brand new arrival has exactly one thing open, and it is the one that works with nothing', () => {
  const w = where(fresh);
  assert.deepEqual(w.open, ['didy']);
  assert.equal(w.beat.id, 'arrive');
  assert.equal(isOpen(fresh, 'store'), false);
  assert.equal(isOpen(fresh, 'keys'), false);
});

test('THE FIRST MOVE CANNOT FAIL — the opening beat asks for nothing anybody has to set up', () => {
  const b = BEATS[0];
  assert.match(b.aside, /No account, no key/);
  assert.ok(!b.reached.length || b.reached(standing(fresh)), 'the first beat is not reachable from nothing');
});

test('doing things moves you along, and nothing that opened ever shuts again', () => {
  const steps = [fresh, ran(1), { ...ran(1), picked: 1 }, { ...ran(1), picked: 1, bags: ['x'] },
    { ...ran(1), picked: 1, bags: ['x'], slots: ['x'] }, { ...ran(1), picked: 1, bags: ['x'], slots: ['x'], keys: { a: 'sk-ant-abcdefghij' } }];
  let last = [];
  for (const s of steps) {
    const open = where(s).open;
    for (const had of last) assert.ok(open.includes(had), `"${had}" closed again after opening`);
    last = open;
  }
  assert.ok(last.includes('keys'), 'having a key never opened the key panel');
});

test('the beat is read from what was DONE, so a refresh never rewinds anybody', () => {
  const s = { ...ran(3, 't2'), picked: 2, keys: { a: 'sk-ant-abcdefghij' }, localUp: true, slots: [] };
  assert.equal(where(s).beat.id, where(s).beat.id);
  assert.equal(where(s).beat.id, 'local', 'a player who has done everything up to local was put somewhere else');
  assert.ok(where(s).open.includes('store'));
});

test('THE GUIDE CAN ALWAYS BE DISMISSED, and dismissing it does not lock anything', () => {
  const s = { ...ran(1), guideOff: true };
  assert.equal(speak(s), null, 'a dismissed guide still spoke');
  assert.ok(where(s).open.includes('didy'), 'dismissing the guide took a panel away');
});

test('nothing shut is ever mysterious — each one says what would open it', () => {
  const l = locked(fresh);
  assert.ok(l.shut.length > 0);
  for (const p of l.shut) assert.ok(l.opener[p] && l.opener[p].length > 5, `${p} is shut with no way named to open it`);
});

test('the guide says what happened and never congratulates anybody', () => {
  for (const b of BEATS) {
    assert.ok(b.says.length > 60, `${b.id} says almost nothing`);
    assert.ok(b.next.length > 10, `${b.id} does not say what to do next`);
    assert.doesNotMatch(b.says, /well done|great|nice work|congratulations|amazing|perfect/i, `${b.id} congratulates`);
  }
});

test('the walk is finite and says where you are in it', () => {
  const line = speak(fresh);
  assert.equal(line.step, 1);
  assert.equal(line.of, BEATS.length);
  assert.equal(line.last, false);
  const done = speak({ ...ran(2, 't2'), picked: 1, keys: { a: 'sk-ant-abcdefghij' }, localUp: true, bags: ['x'], slots: ['x'] });
  assert.equal(done.last, true, 'the final beat did not know it was the last');
});

test('reading a player state survives anything at all', () => {
  for (const junk of [null, undefined, 7, 'state', [], true, { ran: 'lots' }, { toString() { throw new Error('no'); } }]) {
    assert.doesNotThrow(() => where(junk));
    assert.doesNotThrow(() => speak(junk));
    assert.doesNotThrow(() => locked(junk));
    assert.deepEqual(where(junk).open, ['didy'], 'junk unlocked something');
  }
});

test('an unknown panel name is shut, so a typo cannot open the whole app', () => {
  assert.equal(isOpen({ ...ran(9), picked: 9, localUp: true, bags: ['a'] }, 'nonsense'), false);
});


test('THE SHOP OPENS BEFORE ANYTHING TECHNICAL DOES', () => {
  // Buying a tool and dragging it in is the core loop. Locking it behind running your own model
  // means a normal person never reaches the thing the whole product is about.
  const justPicked = { ...ran(1), picked: 1 };
  assert.ok(isOpen(justPicked, 'store'), 'the shop was shut to somebody who had already used it once');
  assert.equal(isOpen(justPicked, 'keys'), false, 'the key panel arrived before there was any reason for it');
});

test('fitting a tool is its own beat, and it opens the key panel', () => {
  const fittedOne = { ...ran(1), picked: 1, bags: ['x'], slots: ['x'] };
  assert.equal(where(fittedOne).beat.id, 'fitted');
  assert.ok(isOpen(fittedOne, 'keys'), 'nothing ever offered a real model');
  assert.match(where(fittedOne).beat.says, /the more you fit, the more it does/i);
});


// ─── the boundaries the mutation gate proved nothing was holding ───

test('ONE OF A THING IS ENOUGH TO REACH ITS BEAT', () => {
  // Every one of these is a `>= 1`. Off by one and somebody who has plainly done the thing is told
  // they have not, and the panel that should have opened stays shut with no way to find out why.
  assert.equal(where({ ran: [{ rung: 't0' }] }).beat.id, 'thought', 'one run did not count as a run');
  assert.equal(where({ ran: [{ rung: 't0' }], picked: 1 }).beat.id, 'chose', 'one choice did not count');
  assert.equal(where({ ran: [{ rung: 't0' }], picked: 1, bags: ['a'] }).beat.id, 'bought', 'one purchase did not count');
  assert.equal(where({ ran: [{ rung: 't0' }], picked: 1, bags: ['a'], slots: ['a'] }).beat.id, 'fitted', 'one fitted tool did not count');
  const keyed = { ran: [{ rung: 't0' }], picked: 1, bags: ['a'], slots: ['a'], keys: { anthropic: 'sk-ant-abcdefghij' } };
  assert.equal(where(keyed).beat.id, 'keyed', 'one key did not count');
  assert.equal(where({ ...keyed, ran: [{ rung: 't2' }] }).beat.id, 'rented', 'one rented run did not count');
});

test('and none of a thing is not enough', () => {
  assert.equal(where({ ran: [] }).beat.id, 'arrive');
  assert.equal(where({ ran: [{ rung: 't0' }], picked: 0 }).beat.id, 'thought');
  assert.equal(where({ ran: [{ rung: 't0' }], picked: 1, bags: [] }).beat.id, 'chose');
  assert.equal(where({ ran: [{ rung: 't0' }], picked: 1, bags: ['a'], slots: [] }).beat.id, 'bought');
});

test('A KEY IS ONLY A KEY IF SOMEBODY REALLY PASTED ONE', () => {
  // An empty box, a stub, or a bag that is not a bag must never open the beat that assumes you can
  // reach a paid model — the next thing it tells you to do would then be impossible.
  const base = { ran: [{ rung: 't0' }], picked: 1, bags: ['a'], slots: ['a'] };
  assert.equal(standing({ ...base, keys: { anthropic: 'x'.repeat(9) } }).keys, 1, 'a key of exactly nine was rejected');
  assert.equal(standing({ ...base, keys: { anthropic: 'x'.repeat(8) } }).keys, 0, 'eight characters counted as a key');
  assert.equal(standing({ ...base, keys: { anthropic: '   ' } }).keys, 0, 'whitespace counted as a key');
  assert.equal(standing({ ...base, keys: { anthropic: 12345678901 } }).keys, 0, 'a number counted as a key');
  for (const bad of [null, 'sk-ant-abcdefghij', 7, true, []]) {
    assert.equal(standing({ ...base, keys: bad }).keys, 0, 'keys:' + JSON.stringify(bad) + ' counted');
  }
  assert.equal(standing({ ...base, keys: { a: 'x'.repeat(20), b: 'y'.repeat(20) } }).keys, 2, 'two keys counted as one');
});
