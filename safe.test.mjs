// Tests for reading things that might not be there.
//
// These four helpers are the reason every kernel in this repo survives a half-written save or a feed
// written by somebody else. They were copy-pasted into six files until the structural assessor
// caught it; a single copy is only better than six if this file actually holds it to the contract.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { text, num, nonneg, list, field, reader, isThing, oneOf } from './safe.mjs';

const toxic = { get boom() { throw new Error('no'); }, toString() { throw new Error('no'); } };

test('READING A VALUE MUST NEVER BE THE THING THAT FAILS', () => {
  // An object that refuses to become text is not exotic — it arrives from files, URLs and older
  // versions of this same program, and it used to take whole screens down.
  assert.equal(text(toxic), '');
  assert.equal(text(null), '');
  assert.equal(text(undefined), '');
  assert.equal(text(0), '0');
  assert.equal(text(false), 'false');
  assert.equal(text('x'), 'x');
});

test('a field whose getter throws comes back as nothing, not as an exception', () => {
  assert.equal(field(toxic, 'boom'), undefined);
  assert.equal(field(null, 'x'), undefined);
  assert.equal(field(7, 'x'), undefined);
  assert.equal(field({ a: 1 }, 'a'), 1);
  assert.equal(field({ a: 0 }, 'a'), 0, 'a real zero was thrown away');
});

test('a reader bound to one object behaves exactly like field', () => {
  const r = reader({ a: 1, get bad() { throw new Error('no'); } });
  assert.equal(r('a'), 1);
  assert.equal(r('bad'), undefined);
  assert.equal(reader(null)('x'), undefined);
});

test('NaN AND INFINITY ARE NOT NUMBERS YOU CAN ACT ON', () => {
  // Letting either through is how a budget becomes unlimited and a bar reads as a hole.
  for (const bad of [NaN, Infinity, -Infinity, '5', null, undefined, {}, []]) {
    assert.equal(num(bad, 7), 7, String(bad) + ' was accepted as a number');
  }
  assert.equal(num(0, 7), 0, 'a real zero was replaced by the fallback');
  assert.equal(num(-3, 7), -3, 'a negative number is still a number');
  assert.equal(num(1.5), 1.5);
  assert.equal(num(undefined), 0, 'the default fallback is zero');
});

test('nonneg refuses below zero, and zero itself is fine', () => {
  assert.equal(nonneg(0, 9), 0, 'zero was treated as missing');
  assert.equal(nonneg(-1, 9), 9);
  assert.equal(nonneg(NaN, 9), 9);
  assert.equal(nonneg(4, 9), 4);
});

test('a list is always an array of real strings, from anything at all', () => {
  assert.deepEqual(list(['a', '', null, 7, toxic, 'b']), ['a', '7', 'b'],
    'empties and unreadables were not dropped');
  for (const bad of [null, undefined, 'abc', 7, {}, true]) assert.deepEqual(list(bad), []);
});

test('isThing means a real object — not null, not an array, not a string', () => {
  assert.equal(isThing({}), true);
  assert.equal(isThing({ a: 1 }), true);
  for (const bad of [null, undefined, [], 'x', 7, true]) {
    assert.equal(isThing(bad), false, String(bad) + ' passed as a thing');
  }
});

test('AN UNKNOWN NAME IS REFUSED, not passed through', () => {
  // A typo silently becoming a real value is how a tier, a rarity or a rung stops meaning anything.
  assert.equal(oneOf('b', ['a', 'b', 'c']), 'b');
  assert.equal(oneOf('z', ['a', 'b', 'c']), 'a', 'an unknown name was not defaulted');
  assert.equal(oneOf('z', ['a', 'b'], 'b'), 'b', 'the stated default was ignored');
  assert.equal(oneOf(undefined, ['a', 'b']), 'a');
  assert.equal(oneOf('A', ['a', 'b']), 'a', 'a case-different name slipped through');
});

test('every helper is repeatable — the same input always gives the same answer', () => {
  const inputs = [null, undefined, 0, '', 'x', NaN, {}, [], toxic];
  for (const i of inputs) {
    assert.equal(text(i), text(i));
    assert.equal(num(i, 3), num(i, 3));
    assert.deepEqual(list(i), list(i));
    assert.equal(isThing(i), isThing(i));
  }
});
