// doors.test.mjs — the human-door queue law, falsifiable. Load-bearing: only doors enter,
// clocks outrank money outranks counsel outranks taste, ties go FIFO, and a sliding
// decision becomes visible at 3 deferrals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOORS, enqueue, nextDecision, decide } from './doors.mjs';

const q = (...items) => items.reduce((acc, it) => enqueue(acc, it).queue, []);

test('ENQUEUE — only doors enter; everything else is refused by name', () => {
  assert.deepEqual(DOORS, ['finance', 'taste', 'counsel']);
  const r = enqueue([], { id: 'a', kind: 'finance', what: 'sign the invoice' });
  assert.deepEqual(r.queue, [{ id: 'a', kind: 'finance', what: 'sign the invoice', clockDays: undefined, deferred: 0 }]);
  assert.match(enqueue([], { id: 'x', kind: 'deploy', what: 'ship it' }).why, /"deploy" is not a human door — the machine handles it/);
  assert.match(enqueue([], { id: '', kind: 'taste', what: 'w' }).why, /id required/);
  assert.match(enqueue([], { id: 'x', kind: 'taste', what: '' }).why, /what is being decided/);
  assert.match(enqueue([], { id: 'x', kind: 'taste', what: 'w', clockDays: -1 }).why, /non-negative integer/);
  assert.match(enqueue([], { id: 'x', kind: 'taste', what: 'w', clockDays: 1.5 }).why, /non-negative integer/);
  assert.match(enqueue('x', { id: 'a', kind: 'taste', what: 'w' }).why, /queue must be a list/);
  assert.match(enqueue([], null).why, /must be an object/);
  assert.match(enqueue([], 7).why, /must be an object/);
  assert.match(enqueue([], []).why, /must be an object/);
  const dup = enqueue(r.queue, { id: 'a', kind: 'taste', what: 'again' });
  assert.match(dup.why, /already queued — one decision, one slot/);
  // immutability
  const before = [];
  enqueue(before, { id: 'z', kind: 'taste', what: 'w' });
  assert.equal(before.length, 0, 'enqueue never mutates');
});

test('NEXT — a statutory clock outranks every class, nearest deadline first', () => {
  const queue = q(
    { id: 'font', kind: 'taste', what: 'pick the font' },
    { id: 'invoice', kind: 'finance', what: 'pay it' },
    { id: 'dsar', kind: 'counsel', what: 'DSAR response', clockDays: 5 },
    { id: 'vat', kind: 'finance', what: 'VAT return', clockDays: 2 },
  );
  const n = nextDecision(queue);
  assert.equal(n.pick, 'vat', 'the nearest clock wins, regardless of class');
  assert.match(n.reason, /statutory clock at 2 day\(s\)\. Clocks outrank money\./);
});

test('NEXT — class order finance → counsel → taste; ties FIFO; clock ties FIFO', () => {
  const noClocks = q(
    { id: 'font', kind: 'taste', what: 'w' },
    { id: 'advice', kind: 'counsel', what: 'w' },
    { id: 'pay1', kind: 'finance', what: 'w' },
    { id: 'pay2', kind: 'finance', what: 'w' },
  );
  assert.equal(nextDecision(noClocks).pick, 'pay1', 'finance first, and FIFO within finance');
  assert.match(nextDecision(noClocks).reason, /nearest finance door, first in/);
  const counselVsTaste = q({ id: 'font', kind: 'taste', what: 'w' }, { id: 'advice', kind: 'counsel', what: 'w' });
  assert.equal(nextDecision(counselVsTaste).pick, 'advice', 'counsel outranks taste');
  const clockTie = q(
    { id: 'first', kind: 'taste', what: 'w', clockDays: 3 },
    { id: 'second', kind: 'finance', what: 'w', clockDays: 3 },
  );
  assert.equal(nextDecision(clockTie).pick, 'first', 'equal clocks: FIFO, not class');
  // clockDays 0 (due today) beats clockDays 1
  const today = q({ id: 'tomorrow', kind: 'taste', what: 'w', clockDays: 1 }, { id: 'today', kind: 'taste', what: 'w', clockDays: 0 });
  assert.equal(nextDecision(today).pick, 'today');
});

test('NEXT — empty is rest, junk is refused', () => {
  assert.match(nextDecision([]).why, /the machine is handling everything\. Rest\./);
  assert.match(nextDecision('x').why, /must be a list/);
  assert.match(nextDecision([null]).why, /malformed/);
  assert.match(nextDecision([7]).why, /malformed/);
});

test('DECIDE — yes/no remove; later re-queues at the BACK and counts; 3 slides get named', () => {
  let queue = q({ id: 'a', kind: 'finance', what: 'w' }, { id: 'b', kind: 'taste', what: 'w' });
  const yes = decide(queue, 'a', 'yes');
  assert.deepEqual(yes.queue.map((x) => x.id), ['b']);
  assert.deepEqual(yes.decision, { id: 'a', verdict: 'yes', kind: 'finance', what: 'w' });
  assert.equal(queue.length, 2, 'decide never mutates');
  let later = decide(queue, 'a', 'later');
  assert.deepEqual(later.queue.map((x) => x.id), ['b', 'a'], 'later goes to the back');
  assert.equal(later.queue[1].deferred, 1);
  assert.equal(later.note, undefined, 'one slide is fine');
  later = decide(later.queue, 'a', 'later');
  later = decide(later.queue, 'a', 'later');
  assert.equal(later.queue.find((x) => x.id === 'a').deferred, 3);
  assert.match(later.note, /slid 3 times — a decision that keeps sliding is a decision being made by default/);
  assert.match(decide(queue, 'ghost', 'yes').why, /not in the queue/);
  assert.match(decide(queue, 'a', 'maybe').why, /"maybe" decides nothing/);
  assert.match(decide(queue, '', 'yes').why, /id required/);
  assert.match(decide('x', 'a', 'yes').why, /must be a list/);
});

test('THE FUZZ — 200 random queues: next always picks a real item obeying the order; decide conserves items', () => {
  let seed = 808;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let t = 0; t < 200; t++) {
    let queue = [];
    const n = 1 + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++) {
      const item = { id: 'i' + i, kind: DOORS[Math.floor(rnd() * 3)], what: 'w' };
      if (rnd() > 0.6) item.clockDays = Math.floor(rnd() * 10);
      queue = enqueue(queue, item).queue;
    }
    const pick = nextDecision(queue);
    assert.ok(pick.ok);
    const picked = queue.find((x) => x.id === pick.pick);
    assert.ok(picked, 'the pick exists');
    const clocks = queue.filter((x) => x.clockDays !== undefined);
    if (clocks.length) {
      assert.notEqual(picked.clockDays, undefined, 'if any clock exists, a clock is picked');
      assert.equal(picked.clockDays, Math.min(...clocks.map((x) => x.clockDays)), 'and it is the nearest');
    }
    const d = decide(queue, pick.pick, rnd() > 0.5 ? 'later' : 'yes');
    assert.ok(d.ok);
    assert.ok(d.queue.length === queue.length || d.queue.length === queue.length - 1, 'later conserves, yes removes exactly one');
  }
});
